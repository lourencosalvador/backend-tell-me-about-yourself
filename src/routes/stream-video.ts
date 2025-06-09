import { FastifyInstance } from "fastify"
import fs from "fs"
import path from "path"
import { prisma } from "../lib/prisma"
import { r2Client, R2_BUCKET_NAME } from "../lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { z } from "zod"

export async function streamVideo(app: FastifyInstance) {
  app.get('/videos/:id/stream', async (req, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(req.params)

    const video = await prisma.video.findUnique({
      where: { id }
    })

    if (!video) {
      return reply.status(404).send({ error: "Vídeo não encontrado" })
    }

    // Primeiro tentar arquivo local
    const localVideoPath = path.resolve(__dirname, '../../uploads', video.path)

    if (fs.existsSync(localVideoPath)) {
      // Servir arquivo local (método original)
      const stat = fs.statSync(localVideoPath)
    const fileSize = stat.size
    const range = req.headers.range

    if (!range) {
      reply.header("Content-Type", "video/mp4")
      reply.header("Content-Length", fileSize)
        const stream = fs.createReadStream(localVideoPath)
      return reply.send(stream)
    }

    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = (end - start) + 1
      const stream = fs.createReadStream(localVideoPath, { start, end })

    reply
      .code(206)
      .header("Content-Range", `bytes ${start}-${end}/${fileSize}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", chunkSize)
      .header("Content-Type", "video/mp4")

    return reply.send(stream)
    } else {
      // Arquivo não existe localmente, buscar do R2 e fazer proxy
      try {
        console.log(`📥 Fazendo proxy do R2 para vídeo: ${id}`)
        
        // Extrair chave do R2
        const videoKey = video.path.includes('videos/') 
          ? video.path.split('/').slice(-3).join('/') 
          : `videos/${video.userId}/${video.id}.mp4`

        const command = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: videoKey,
        })

        const response = await r2Client.send(command)
        
        if (!response.Body) {
          return reply.status(404).send({ error: "Vídeo não encontrado no R2" })
        }

        // Configurar headers para streaming
        reply.header("Content-Type", "video/mp4")
        reply.header("Accept-Ranges", "bytes")
        reply.header("Cache-Control", "public, max-age=3600")
        
        if (response.ContentLength) {
          reply.header("Content-Length", response.ContentLength)
        }

        // Fazer stream direto do R2
        console.log(`✅ Streaming do R2 para vídeo: ${id}`)
        return reply.send(response.Body)
        
      } catch (error) {
        console.error(`❌ Erro ao buscar vídeo do R2: ${id}`, error)
        return reply.status(500).send({ error: "Erro ao buscar vídeo do R2" })
      }
    }
  })
}
