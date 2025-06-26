import { FastifyInstance } from "fastify"
import { MultipartFile } from "@fastify/multipart"
import { prisma } from "../lib/prisma"
import { randomUUID } from "crypto"
import { z } from "zod"
import axios from "axios"
import path from 'path'
import fs from 'fs'

// URL do microserviço Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001"

export async function uploadVideoPythonRoute(app: FastifyInstance) {
  
  // Upload de vídeo via microserviço Python
  app.post('/videos/upload-python', async (req, reply) => {
    const querySchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = querySchema.parse(req.query)
      const userInfo = await prisma.user.findUnique({ where: { id: userId } })
      if (!userInfo) return reply.status(404).send({ error: "Usuário não encontrado" })

      const data: MultipartFile | undefined = await req.file()
      if (!data) return reply.status(400).send({ error: "Nenhum arquivo enviado" })

      console.log(`📤 Upload Python para usuário: ${userInfo.name}`)

      // Preparar FormData para envio
      const formData = new FormData()
      
      // Converter stream para buffer
      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const fileBuffer = Buffer.concat(chunks)
      
      // Criar Blob para FormData
      const fileBlob = new Blob([fileBuffer], { type: data.mimetype })
      
      formData.append('user_id', userId)
      formData.append('file', fileBlob, data.filename || 'video.mp4')

      // Enviar para microserviço Python
      const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!pythonResponse.ok) {
        throw new Error(`Python service error: ${pythonResponse.status}`)
      }

      const uploadResult = await pythonResponse.json()
      console.log(`✅ Upload Python iniciado:`, uploadResult)

      // Aguardar conclusão do upload para salvar no banco
      const uploadId = uploadResult.video_id
      
      // Polling para aguardar conclusão
      let attempts = 0
      const maxAttempts = 30 // 30 segundos
      let uploadCompleted = false
      let finalProgress: any = null

      while (attempts < maxAttempts && !uploadCompleted) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1 segundo
        
        try {
          const progressResponse = await fetch(`${PYTHON_SERVICE_URL}/progress/${uploadId}`)
          if (progressResponse.ok) {
            const progress = await progressResponse.json()
            
            if (progress.status === "completed" && progress.video_url && progress.audio_url) {
              finalProgress = progress
              uploadCompleted = true
            } else if (progress.status === "error") {
              throw new Error(`Upload failed: ${progress.message}`)
            }
          }
        } catch (error) {
          console.log(`⏳ Verificando progresso... tentativa ${attempts + 1}`)
        }
        
        attempts++
      }

      if (!uploadCompleted) {
        // Upload ainda em progresso, retornar sem salvar no banco ainda
        return reply.send({
          success: true,
          uploadId: uploadResult.video_id,
          message: "Upload iniciado. Use o endpoint de progresso para acompanhar.",
          progressEndpoint: `/videos/python-progress/${uploadResult.video_id}`,
          status: "processing"
        })
      }

      // Upload concluído, salvar no banco de dados
      console.log(`💾 Salvando vídeo no banco de dados...`)
      
      const video = await prisma.video.create({
        data: {
          id: uploadId,
          userId: userId,
          path: `http://localhost:8001/stream/${finalProgress.video_id}`, // URL do streaming via path
        }
      })

      // Criar registro de áudio associado
      const audio = await prisma.audio.create({
        data: {
          id: randomUUID(),
          videoId: video.id,
          userId: userId,
          path: `${finalProgress.audio_url}`, // Usar URL direto do Google Drive para transcrição
          status: "COMPLETED"
        }
      })

      // NOVO: Incrementar streak do usuário
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      
      const userStreak = await prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, lastStreakDate: true }
      })

      let novoStreak = 1
      let streakMessage = "🔥 Primeira streak iniciada!"

      if (userStreak?.lastStreakDate) {
        const ultimaStreakDate = new Date(userStreak.lastStreakDate)
        const ultimaStreakInicio = new Date(ultimaStreakDate.getFullYear(), ultimaStreakDate.getMonth(), ultimaStreakDate.getDate())
        
        // Se foi ontem, continua a streak
        const ontem = new Date(inicioHoje)
        ontem.setDate(ontem.getDate() - 1)
        
        if (ultimaStreakInicio.getTime() === ontem.getTime()) {
          novoStreak = (userStreak.streak || 0) + 1
          streakMessage = `🔥 Streak mantida! ${novoStreak} dias consecutivos!`
        }
        // Se foi hoje, não incrementa (já uploadou hoje)
        else if (ultimaStreakInicio.getTime() === inicioHoje.getTime()) {
          novoStreak = userStreak.streak || 1
          streakMessage = `✅ Upload adicional de hoje! Streak atual: ${novoStreak} dias`
        }
        // Se foi há mais de 1 dia, reinicia streak
        else {
          novoStreak = 1
          streakMessage = "🔥 Nova streak iniciada!"
        }
      }

      // Atualizar streak do usuário
      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: novoStreak,
          lastStreakDate: hoje
        }
      })

      console.log(`✅ Vídeo e áudio salvos no banco: ${video.id}`)
      console.log(`🔥 ${streakMessage}`)

      return reply.send({
        success: true,
        uploadId: uploadId,
        videoId: video.id,
        audioId: audio.id,
        message: "Upload concluído e salvo no banco de dados!",
        streak: {
          current: novoStreak,
          message: streakMessage
        },
        video: {
          id: video.id,
          url: video.path,
          createdAt: video.createdAt
        },
        audio: {
          id: audio.id,
          url: audio.path,
          status: audio.status
        }
      })

    } catch (error) {
      console.error(`❌ Erro no upload Python:`, error)
      
      return reply.status(500).send({ 
        error: "Erro ao processar upload via Python",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      })
    }
  })

  // Verificar progresso do upload Python
  app.get('/videos/python-progress/:uploadId', async (req, reply) => {
    const paramsSchema = z.object({ uploadId: z.string().uuid() })

    try {
      const { uploadId } = paramsSchema.parse(req.params)
      
      const progressResponse = await fetch(`${PYTHON_SERVICE_URL}/progress/${uploadId}`)
      
      if (!progressResponse.ok) {
        throw new Error(`Progress check failed: ${progressResponse.status}`)
      }
      
      const progress = await progressResponse.json()
      
      return reply.send(progress)
      
    } catch (error) {
      console.error(`❌ Erro ao verificar progresso:`, error)
      
      return reply.status(500).send({ 
        error: "Erro ao verificar progresso"
      })
    }
  })

  // Health check do microserviço Python
  app.get('/python-service/health', async (req, reply) => {
    try {
      const healthResponse = await fetch(`${PYTHON_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`)
      }
      
      const healthData = await healthResponse.json()
      
      return reply.send({
        pythonService: "online",
        details: healthData
      })
      
    } catch (error) {
      return reply.status(503).send({
        pythonService: "offline",
        error: error instanceof Error ? error.message : "Microserviço não responsivo"
      })
    }
  })

  // Buscar vídeos do usuário via Google Drive
  app.get('/videos/:userId/google-drive', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      // Buscar vídeos no microserviço Python
      const response = await fetch(`${PYTHON_SERVICE_URL}/videos/${userId}`)
      
      if (!response.ok) {
        throw new Error(`Python service error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return reply.send({
        success: true,
        userId: userId,
        totalVideos: data.total_videos,
        videos: data.videos.map((video: any) => ({
          id: video.id,
          name: video.name,
          videoUrl: video.video_url,
          audioUrl: video.audio_url,
          downloadUrl: video.download_url,
          size: video.size,
          createdAt: video.created_at,
          mimeType: video.mime_type
        }))
      })
      
    } catch (error) {
      console.error(`❌ Erro ao buscar vídeos do Google Drive:`, error)
      
      return reply.status(500).send({ 
        error: "Erro ao buscar vídeos",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      })
    }
  })

  // Servir template HTML de upload
  app.get('/upload-template', async (req, reply) => {
    try {
      const templatePath = path.join(process.cwd(), 'templates', 'upload.html')
      
      if (!fs.existsSync(templatePath)) {
        return reply.status(404).send({ error: 'Template não encontrado' })
      }
      
      const templateContent = fs.readFileSync(templatePath, 'utf-8')
      
      return reply
        .type('text/html')
        .send(templateContent)
        
    } catch (error) {
      console.error(`❌ Erro ao servir template:`, error)
      return reply.status(500).send({ error: "Erro interno do servidor" })
    }
  })

  // Criar transcrição para vídeo do Google Drive
  app.post('/videos/:videoId/create-transcription', async (req, reply) => {
    const paramsSchema = z.object({ videoId: z.string().uuid() })

    try {
      const { videoId } = paramsSchema.parse(req.params)
      
      // Buscar vídeo e áudio
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: {
            include: { transcription: true }
          },
          user: true
        }
      })

      if (!video) {
        return reply.status(404).send({ error: "Vídeo não encontrado" })
      }

      if (!video.audio) {
        return reply.status(400).send({ error: "Áudio não encontrado para este vídeo" })
      }

      if (video.audio.transcription) {
        return reply.status(400).send({ error: "Transcrição já existe para este vídeo" })
      }

      console.log(`🎤 Iniciando transcrição para vídeo: ${videoId}`)

      // Buscar o file ID do áudio no Google Drive via microserviço Python
      const googleDriveVideosResponse = await fetch(`${PYTHON_SERVICE_URL}/videos/${video.userId}`)
      
      if (!googleDriveVideosResponse.ok) {
        throw new Error(`Falha ao buscar vídeos no Google Drive: ${googleDriveVideosResponse.status}`)
      }

      const googleDriveData = await googleDriveVideosResponse.json()
      const videoData = googleDriveData.videos.find((v: any) => v.id === videoId)
      
      if (!videoData || !videoData.audio_url) {
        throw new Error("Áudio não encontrado no Google Drive")
      }

      // Extrair file ID do áudio
      const audioFileIdMatch = videoData.audio_url.match(/\/d\/([a-zA-Z0-9-_]+)/)
      if (!audioFileIdMatch) {
        throw new Error("ID do áudio não encontrado na URL do Google Drive")
      }
      
      const audioFileId = audioFileIdMatch[1]
      console.log(`🎵 File ID do áudio: ${audioFileId}`)

      // Baixar áudio via microserviço Python
      const audioResponse = await fetch(`${PYTHON_SERVICE_URL}/stream/${audioFileId}`)
      
      if (!audioResponse.ok) {
        throw new Error(`Falha ao baixar áudio: ${audioResponse.status}`)
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      
      // Criar File object para OpenAI
      const audioFile = new File([audioBuffer], `${videoId}.mp3`, { type: 'audio/mpeg' })

      // Usar OpenAI Whisper para transcrição
      const { openai } = await import('../lib/openai')
      
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'json',
        temperature: 0
      })

      // Salvar transcrição no banco
      const transcription = await prisma.transcription.create({
        data: {
          audioId: video.audio.id,
          text: transcriptionResponse.text,
          status: "COMPLETED"
        }
      })

      console.log(`✅ Transcrição criada para vídeo: ${videoId}`)

      return reply.send({
        success: true,
        transcription: {
          id: transcription.id,
          text: transcription.text,
          status: transcription.status,
          createdAt: transcription.createdAt
        },
        video: {
          id: video.id,
          user: video.user?.name
        }
      })

    } catch (error) {
      console.error(`❌ Erro ao criar transcrição:`, error)
      
      return reply.status(500).send({ 
        error: "Erro ao criar transcrição",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      })
    }
  })

  // Limpar todos os dados de um usuário (para testes)
  app.delete('/users/:userId/cleanup', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      console.log(`🗑️ Limpando dados do usuário: ${userId}`)

      // Buscar vídeos do usuário
      const videos = await prisma.video.findMany({
        where: { userId },
        include: {
          audio: {
            include: { transcription: true }
          }
        }
      })

      let deletedCount = {
        transcriptions: 0,
        audios: 0,
        videos: 0,
        skills: 0,
        googleDriveVideos: 0,
        googleDriveAudios: 0
      }

      // Deletar transcrições
      for (const video of videos) {
        if (video.audio?.transcription) {
          await prisma.transcription.delete({
            where: { id: video.audio.transcription.id }
          })
          deletedCount.transcriptions++
        }
      }

      // Deletar áudios
      await prisma.audio.deleteMany({
        where: { userId }
      })
      deletedCount.audios = videos.filter(v => v.audio).length

      // Deletar skills
      const skillsDeleted = await prisma.skill.deleteMany({
        where: { userId }
      })
      deletedCount.skills = skillsDeleted.count

      // Deletar vídeos
      await prisma.video.deleteMany({
        where: { userId }
      })
      deletedCount.videos = videos.length

      // Limpar recomendação do usuário
      await prisma.user.update({
        where: { id: userId },
        data: { 
          recommendation: null,
          updatedAt: new Date('2020-01-01') // Data antiga para permitir nova geração
        }
      })

      // NOVO: Limpar arquivos do Google Drive via microserviço Python
      try {
        console.log(`🗑️ Limpando arquivos do Google Drive...`)
        
        const googleDriveCleanupResponse = await fetch(`${PYTHON_SERVICE_URL}/videos/${userId}`, {
          method: 'DELETE'
        })
        
        if (googleDriveCleanupResponse.ok) {
          const googleDriveResult = await googleDriveCleanupResponse.json()
          deletedCount.googleDriveVideos = googleDriveResult.deleted.videos
          deletedCount.googleDriveAudios = googleDriveResult.deleted.audios
          console.log(`✅ Google Drive limpo: ${googleDriveResult.message}`)
        } else {
          console.log(`⚠️ Aviso: Não foi possível limpar Google Drive: ${googleDriveCleanupResponse.status}`)
        }
      } catch (googleDriveError) {
        console.log(`⚠️ Aviso: Erro ao limpar Google Drive: ${googleDriveError}`)
      }

      console.log(`✅ Limpeza concluída para usuário: ${userId}`)

      return reply.send({
        success: true,
        message: "Dados do usuário limpos com sucesso (banco + Google Drive)",
        deleted: deletedCount
      })

    } catch (error) {
      console.error(`❌ Erro ao limpar dados:`, error)
      
      return reply.status(500).send({ 
        error: "Erro ao limpar dados do usuário",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      })
    }
  })
}