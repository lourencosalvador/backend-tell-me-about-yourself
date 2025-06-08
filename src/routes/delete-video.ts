import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function deleteVideo(app: FastifyInstance) {
  app.delete('/videos/:videoId', async (req, reply) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid()
    });

    try {
      const { videoId } = paramsSchema.parse(req.params);

      await prisma.video.delete({
        where: { id: videoId }
      });

      return reply.send({ success: true });
    } catch (error) {
      console.error("Erro ao deletar vídeo:", error);
      return reply.status(400).send({ error: "Erro ao deletar vídeo" });
    }
  });
}
