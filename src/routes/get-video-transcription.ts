import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function getVideoTranscriptionRoute(app: FastifyInstance) {
  // Buscar vídeo específico com transcrição
  app.get('/videos/:videoId/transcription', async (req, reply) => {
    const paramsSchema = z.object({ 
      videoId: z.string().uuid() 
    })

    try {
      const { videoId } = paramsSchema.parse(req.params)
      
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: {
            include: {
              transcription: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!video) {
        return reply.status(404).send({ error: "Vídeo não encontrado" })
      }

      return reply.send({ 
        video: {
          id: video.id,
          url: video.path,
          createdAt: video.createdAt,
          user: video.user,
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
      })
    } catch (error) {
      console.error("❌ Erro ao buscar vídeo:", error)
      return reply.status(500).send({ error: "Erro ao buscar vídeo" })
    }
  })

  // Buscar apenas a transcrição de um vídeo
  app.get('/videos/:videoId/transcription/text', async (req, reply) => {
    const paramsSchema = z.object({ 
      videoId: z.string().uuid() 
    })

    try {
      const { videoId } = paramsSchema.parse(req.params)
      
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: {
            include: {
              transcription: true
            }
          }
        }
      })

      if (!video) {
        return reply.status(404).send({ error: "Vídeo não encontrado" })
      }

      if (!video.audio?.transcription) {
        return reply.status(404).send({ error: "Transcrição não encontrada" })
      }

      return reply.send({ 
        transcription: {
          text: video.audio.transcription.text,
          status: video.audio.transcription.status,
          createdAt: video.audio.transcription.createdAt
        }
      })
    } catch (error) {
      console.error("❌ Erro ao buscar transcrição:", error)
      return reply.status(500).send({ error: "Erro ao buscar transcrição" })
    }
  })
} 