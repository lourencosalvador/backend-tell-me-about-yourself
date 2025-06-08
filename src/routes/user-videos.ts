import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function userVideos(app: FastifyInstance) {

    app.get('/users/:userId/videos', async (req, reply) => {
        const paramsSchema = z.object({ userId: z.string().uuid() })
    
        try {
          const { userId } = paramsSchema.parse(req.params)
    
          const videos = await prisma.video.findMany({
            where: { userId },
            include: {
              audio: {
                include: { transcription: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          })
    
          const formattedVideos = videos.map(video => ({
            id: video.id,
            createdAt: video.createdAt,
            transcription: video.audio?.transcription?.text || null
          }))
    
          return reply.send({ videos: formattedVideos })
        } catch (error) {
          console.error("Erro ao listar vídeos:", error)
          return reply.status(400).send({ error: "Erro ao listar vídeos" })
        }
      })
}