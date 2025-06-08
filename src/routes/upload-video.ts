import { FastifyInstance } from "fastify"
import { MultipartFile } from "@fastify/multipart"
import { prisma } from "../lib/prisma"
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../lib/r2"
import { openai } from "../lib/openai"
import { FileUtils } from "../lib/file-utils"
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

      // Gerar URLs públicas
      const videoUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${videoKey}` : `https://${R2_BUCKET_NAME}.r2.dev/${videoKey}`
      const audioUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${audioKey}` : `https://${R2_BUCKET_NAME}.r2.dev/${audioKey}`

      console.log(`💾 Salvando registros no banco: ${videoId}`)

      // Criar registros no banco
      const video = await prisma.video.create({
        data: { 
          id: videoId, 
          path: videoUrl, // URL do R2
          userId 
        }
      })

      const audio = await prisma.audio.create({
        data: { 
          id: randomUUID(), 
          path: audioUrl, // URL do R2
          userId, 
          videoId: video.id,
          status: "PROCESSING"
        }
      })

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

  // Buscar vídeos do usuário
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

      return reply.send({ 
        videos: videos.map(video => ({
          id: video.id,
          url: video.path,
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
        }))
      })
    } catch (error) {
      console.error("❌ Erro ao buscar vídeos:", error)
      return reply.status(500).send({ error: "Erro ao buscar vídeos" })
    }
  })
}
