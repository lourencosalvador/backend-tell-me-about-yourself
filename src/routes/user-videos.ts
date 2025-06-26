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
    
          console.log(`📹 Encontrados ${videos.length} vídeos para usuário ${userId}`);
    
          // Usar rota de streaming proxy em vez de URLs pressinadas
          const formattedVideos = videos.map(video => {
            // URL do streaming proxy que funciona com R2 e arquivos locais
            const videoUrl = `${req.protocol}://${req.headers.host}/videos/${video.id}/stream`;
            
            console.log(`🎬 Criando URL de streaming para vídeo ${video.id}: ${videoUrl}`);
            
            return {
            id: video.id,
              url: videoUrl, // URL do proxy de streaming
              fileName: video.path.split('/').pop() || 'video.mp4',
            createdAt: video.createdAt,
              updatedAt: video.createdAt,
            transcription: video.audio?.transcription?.text || null
            }
          })
    
          console.log(`📹 Retornando ${formattedVideos.length} vídeos com URLs de streaming`);
    
          return reply.send({ videos: formattedVideos })
        } catch (error) {
          console.error("❌ Erro ao listar vídeos:", error)
          return reply.status(400).send({ error: "Erro ao listar vídeos" })
        }
      })
}