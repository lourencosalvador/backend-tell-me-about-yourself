import { FastifyInstance } from "fastify"
import fs from "fs"
import path from "path"
import { prisma } from "../lib/prisma"
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

    const videoPath = path.resolve(__dirname, '../../uploads', video.path)

    if (!fs.existsSync(videoPath)) {
      return reply.status(404).send({ error: "Arquivo de vídeo não encontrado no disco" })
    }

    const stat = fs.statSync(videoPath)
    const fileSize = stat.size
    const range = req.headers.range

    if (!range) {
      reply.header("Content-Type", "video/mp4")
      reply.header("Content-Length", fileSize)
      const stream = fs.createReadStream(videoPath)
      return reply.send(stream)
    }

    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = (end - start) + 1
    const stream = fs.createReadStream(videoPath, { start, end })

    reply
      .code(206)
      .header("Content-Range", `bytes ${start}-${end}/${fileSize}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", chunkSize)
      .header("Content-Type", "video/mp4")

    return reply.send(stream)
  })
}
