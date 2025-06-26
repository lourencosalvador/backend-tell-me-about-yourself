import { FastifyInstance } from "fastify"
import { MultipartFile } from "@fastify/multipart"
import { prisma } from "../lib/prisma"
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, getSignedVideoUrl } from "../lib/r2"
import { openai } from "../lib/openai"
import { FileUtils } from "../lib/file-utils"
import { SkillsAnalyzer } from "../services/skillsAnalyzer"
import { AIEnhancedAnalyzer } from "../services/aiEnhancedAnalyzer"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"
import { pipeline } from "stream"
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { promisify } from "util"
import { z } from "zod"

const pump = promisify(pipeline)
const TEMP_DIR = path.resolve(__dirname, "../../temp")

// Garantir diretório temporário
FileUtils.ensureDirectory(TEMP_DIR)

// Função para verificar e atualizar streak
async function checkAndUpdateStreak(userId: string) {
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimHoje = new Date(inicioHoje)
  fimHoje.setDate(fimHoje.getDate() + 1)

  // Contar vídeos de hoje
  const videosHoje = await prisma.video.count({
    where: {
      userId,
      createdAt: {
        gte: inicioHoje,
        lt: fimHoje
      }
    }
  })

  console.log(`📊 Usuário ${userId} tem ${videosHoje} vídeos hoje`)

  // Se é o 1º vídeo do dia, incrementa o streak (mudado para teste)
  if (videosHoje >= 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, lastStreakDate: true }
    })

    if (!user) return false

    // Verificar se já foi contabilizado o streak hoje
    const lastStreakDate = user.lastStreakDate
    const streakJaContabilizado = lastStreakDate && 
      lastStreakDate.getDate() === hoje.getDate() &&
      lastStreakDate.getMonth() === hoje.getMonth() &&
      lastStreakDate.getFullYear() === hoje.getFullYear()

    if (!streakJaContabilizado) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: user.streak + 1,
          lastStreakDate: hoje
        }
      })

      console.log(`🔥 STREAK! Usuário ${userId} conseguiu streak ${user.streak + 1}`)
      return true // Indica que conquistou um novo streak
    }
  }

  return false
}

export async function uploadVideoRoute(app: FastifyInstance) {
  // Upload de vídeo para Cloudflare R2 e transcrição automática
  app.post('/videos/upload', async (req, reply) => {
    const querySchema = z.object({ userId: z.string().uuid() })
    let tempVideoPath = ""
    let tempAudioPath = ""

    try {
      const { userId } = querySchema.parse(req.query)
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return reply.status(404).send({ error: "Usuário não encontrado" })

      const data: MultipartFile | undefined = await req.file()
      if (!data) return reply.status(400).send({ error: "Nenhum arquivo enviado" })

      // Validar tipo de arquivo
      if (!data.mimetype.startsWith('video/')) {
        return reply.status(400).send({ error: "Apenas arquivos de vídeo são aceitos" })
      }

      const videoId = randomUUID()
      tempVideoPath = path.join(TEMP_DIR, `${videoId}.mp4`)
      tempAudioPath = path.join(TEMP_DIR, `${videoId}.mp3`)

      console.log(`📤 Iniciando upload para usuário: ${user.name}`)

      // Salvar arquivo temporário
      await pump(data.file, fs.createWriteStream(tempVideoPath)) 
      
      // Validar se o arquivo foi salvo corretamente
      if (!FileUtils.isValidFile(tempVideoPath)) { 
        throw new Error("Falha ao salvar arquivo temporário")
      }

      console.log(`🎵 Extraindo áudio do vídeo: ${videoId}`)

      // Extrair áudio do vídeo
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .toFormat("mp3")
          .audioQuality(2) // Qualidade do áudio
          .on("end", () => {
            console.log(`✅ Áudio extraído com sucesso: ${videoId}`)
            resolve(null)
          })
          .on("error", (error) => {
            console.error(`❌ Erro na extração de áudio: ${error.message}`)
            reject(error)
          })
          .save(tempAudioPath)
      })

      // Validar se o áudio foi extraído corretamente
      if (!FileUtils.isValidFile(tempAudioPath)) {
        throw new Error("Falha na extração do áudio")
      }

      console.log(`☁️ Fazendo upload para Cloudflare R2: ${videoId}`)

      // Upload do vídeo para R2
      const videoBuffer = fs.readFileSync(tempVideoPath)
      const videoKey = `videos/${userId}/${videoId}.mp4`
      
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: videoKey,
        Body: videoBuffer,
        ContentType: data.mimetype,
      }))

      // Upload do áudio para R2
      const audioBuffer = fs.readFileSync(tempAudioPath)
      const audioKey = `audios/${userId}/${videoId}.mp3`
      
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: 'audio/mpeg',
      }))

      // Gerar URLs (usando chave para URL pressinada depois)
      const videoUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${videoKey}` : videoKey
      const audioUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${audioKey}` : audioKey

      console.log(`💾 Salvando registros no banco: ${videoId}`)

      // Criar registros no banco
      const video = await prisma.video.create({
        data: { 
          id: videoId, 
          path: videoUrl, // URL ou chave do R2
          userId 
        }
      })

      const audio = await prisma.audio.create({
        data: { 
          id: randomUUID(), 
          path: audioUrl, // URL ou chave do R2
          userId, 
          videoId: video.id,
          status: "PROCESSING"
        }
      })

      // Verificar streak APÓS criar o vídeo
      const conquistouStreak = await checkAndUpdateStreak(userId)

      console.log(`🎤 Iniciando transcrição: ${videoId}`)

      // Fazer transcrição
      try {
        const audioReadStream = fs.createReadStream(tempAudioPath)
        
        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: audioReadStream,
          model: 'whisper-1',
          language: 'pt',
          response_format: 'json',
          temperature: 0
        })

        // Salvar transcrição no banco
        await prisma.transcription.create({
          data: {
            audioId: audio.id,
            text: transcriptionResponse.text,
            status: "COMPLETED"
          }
        })

        // Atualizar status do áudio
        await prisma.audio.update({
          where: { id: audio.id },
          data: { status: "COMPLETED" }
        })

        console.log(`✅ Transcrição concluída para vídeo: ${videoId}`)

        // 🧠 ANÁLISE DE SKILLS - Processar transcrição para extrair competências
        try {
          console.log(`🔍 Analisando skills do vídeo: ${videoId}`)
          
          // Análise de skills
          console.log('🔍 Analisando skills...');
          
          const skillsAnalyzer = new SkillsAnalyzer();
          const skillsResult = skillsAnalyzer.analyzeTranscription(transcriptionResponse.text);

          // Salvar Hard Skills no banco
          if (skillsResult.hardSkills.length > 0) {
            const hardSkillsData = skillsResult.hardSkills.map(skill => ({
              id: randomUUID(),
              videoId: video.id,
              userId: userId,
              skillName: skill.name,
              skillCategory: skill.category,
              confidence: skill.confidence,
              mentions: skill.mentions,
              context: JSON.stringify(skill.context),
              type: 'HARD' as const
            }))

            await prisma.skill.createMany({
              data: hardSkillsData,
              skipDuplicates: true
            })

            console.log(`💪 ${skillsResult.hardSkills.length} Hard Skills detectadas`)
          }

          // Salvar Soft Skills no banco
          if (skillsResult.softSkills.length > 0) {
            const softSkillsData = skillsResult.softSkills.map(skill => ({
              id: randomUUID(),
              videoId: video.id,
              userId: userId,
              skillName: skill.name,
              skillCategory: skill.category,
              confidence: skill.score / 100, // Converter score para confidence
              mentions: skill.indicators.length,
              context: JSON.stringify({
                indicators: skill.indicators,
                examples: skill.examples
              }),
              type: 'SOFT' as const
            }))

            await prisma.skill.createMany({
              data: softSkillsData,
              skipDuplicates: true
            })

            console.log(`🤝 ${skillsResult.softSkills.length} Soft Skills detectadas`)
          }

          // Atualizar perfil do usuário se houver sugestões
          if (skillsResult.overallProfile && skillsResult.careerSuggestions.length > 0) {
            await prisma.userProfile.upsert({
              where: { userId: userId },
              update: {
                profileDescription: skillsResult.overallProfile,
                careerSuggestions: JSON.stringify(skillsResult.careerSuggestions),
                lastAnalyzedAt: new Date()
              },
              create: {
                id: randomUUID(),
                userId: userId,
                profileDescription: skillsResult.overallProfile,
                careerSuggestions: JSON.stringify(skillsResult.careerSuggestions),
                lastAnalyzedAt: new Date()
              }
            })

            console.log(`👤 Perfil atualizado: ${skillsResult.overallProfile}`)
          }

        } catch (skillsError) {
          console.error(`❌ Erro na análise de skills: ${skillsError}`)
          // Não falhar o upload por erro na análise de skills
        }

      } catch (transcriptionError) {
        console.error(`❌ Erro na transcrição: ${transcriptionError}`)
        
        // Marcar como erro mas não falhar o upload
        await prisma.audio.update({
          where: { id: audio.id },
          data: { status: "ERROR" }
        })
      }

      // Limpar arquivos temporários
      FileUtils.safeRemoveFiles([tempVideoPath, tempAudioPath])

      console.log(`🎉 Upload completo para R2: ${videoId}`)

      return reply.send({ 
        videoId: video.id, 
        audioId: audio.id,
        videoUrl: videoUrl,
        conquistouStreak, // Novo campo indicando se conquistou streak
        message: "Upload realizado com sucesso para Cloudflare R2 e transcrição processada"
      })
    } catch (error) {
      console.error(`❌ Erro no upload para R2:`, error)
      
      // Limpar arquivos temporários em caso de erro
      FileUtils.safeRemoveFiles([tempVideoPath, tempAudioPath])
      
      return reply.status(500).send({ 
        error: "Erro ao processar upload para R2",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      })
    }
  })

  // Buscar vídeos do usuário COM URLs pressinadas
  app.get('/videos/:userId', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      const videos = await prisma.video.findMany({
        where: { userId },
        include: {
          audio: {
            include: {
              transcription: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Gerar URLs pressinadas para cada vídeo
      const videosWithSignedUrls = await Promise.all(
        videos.map(async (video) => {
          try {
            // Extrair a chave do caminho (se for URL completa, pegar só a chave)
            const videoKey = video.path.includes('videos/') 
              ? video.path.split('/').slice(-3).join('/') // videos/userId/videoId.mp4
              : `videos/${userId}/${video.id}.mp4`
            
            // Gerar URL pressinada que sempre funciona
            const signedUrl = await getSignedVideoUrl(videoKey)
            
            return {
              id: video.id,
              url: signedUrl, // URL pressinada que funciona por 1 hora
              createdAt: video.createdAt,
              audio: video.audio ? {
                id: video.audio.id,
                url: video.audio.path,
                status: video.audio.status,
                transcription: video.audio.transcription ? {
                  id: video.audio.transcription.id,
                  text: video.audio.transcription.text,
                  status: video.audio.transcription.status,
                  createdAt: video.audio.transcription.createdAt
                } : null
              } : null
            }
          } catch (error) {
            console.error(`❌ Erro ao gerar URL pressinada para vídeo ${video.id}:`, error)
            return {
              id: video.id,
              url: video.path, // Fallback para URL original
              createdAt: video.createdAt,
              audio: video.audio ? {
                id: video.audio.id,
                url: video.audio.path,
                status: video.audio.status,
                transcription: video.audio.transcription ? {
                  id: video.audio.transcription.id,
                  text: video.audio.transcription.text,
                  status: video.audio.transcription.status,
                  createdAt: video.audio.transcription.createdAt
                } : null
              } : null
            }
          }
        })
      )

      return reply.send({ 
        videos: videosWithSignedUrls
      })
    } catch (error) {
      console.error("❌ Erro ao buscar vídeos:", error)
      return reply.status(500).send({ error: "Erro ao buscar vídeos" })
    }
  })
}
