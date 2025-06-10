import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { r2Client, R2_BUCKET_NAME } from "../lib/r2"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { z } from "zod"

export async function deleteVideo(app: FastifyInstance) {
  app.delete('/videos/:videoId', async (req, reply) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid() 
    });

    try {
      const { videoId } = paramsSchema.parse(req.params);

      // Primeiro, buscar o vídeo e áudio relacionado para obter as chaves do R2
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: true
        }
      });

      if (!video) {
        return reply.status(404).send({ error: "Vídeo não encontrado" });
      }

      console.log(`🗑️ Iniciando deleção completa do vídeo: ${videoId}`);

      // Deletar arquivos do Cloudflare R2
      const deletePromises: Promise<any>[] = [];

      // Deletar vídeo do R2
      if (video.path) {
        // Extrair chave do R2 baseada no path armazenado
        let videoKey = '';
        if (video.path.includes('videos/')) {
          // Se já tem o formato correto (videos/userId/videoId.mp4)
          videoKey = video.path.replace(/^https?:\/\/[^\/]+\//, '');
        } else {
          // Construir chave baseada no userId e videoId
          videoKey = `videos/${video.userId}/${videoId}.mp4`;
        }

        console.log(`🗑️ Deletando vídeo do R2: ${videoKey}`);
        
        deletePromises.push(
          r2Client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: videoKey,
          })).catch(error => {
            console.error(`❌ Erro ao deletar vídeo do R2: ${videoKey}`, error);
            // Não falhar a operação se o arquivo não existir no R2
          })
        );
      }

      // Deletar áudio do R2 se existir
      if (video.audio?.path) {
        let audioKey = '';
        if (video.audio.path.includes('audios/')) {
          audioKey = video.audio.path.replace(/^https?:\/\/[^\/]+\//, '');
        } else {
          audioKey = `audios/${video.userId}/${videoId}.mp3`;
        }

        console.log(`🗑️ Deletando áudio do R2: ${audioKey}`);
        
        deletePromises.push(
          r2Client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: audioKey,
          })).catch(error => {
            console.error(`❌ Erro ao deletar áudio do R2: ${audioKey}`, error);
            // Não falhar a operação se o arquivo não existir no R2
          })
        );
      }

      // Aguardar deleção dos arquivos do R2 (com timeout)
      await Promise.allSettled(deletePromises);

      // Deletar registros do banco de dados
      // O Prisma vai deletar automaticamente registros relacionados devido às foreign keys
      console.log(`🗑️ Deletando registros do banco de dados para vídeo: ${videoId}`);
      
      await prisma.video.delete({
        where: { id: videoId }
      });

      console.log(`✅ Vídeo ${videoId} deletado completamente (R2 + banco)`);

      return reply.send({ 
        success: true, 
        message: "Vídeo deletado completamente do sistema e armazenamento" 
      });

    } catch (error) {
      console.error("❌ Erro ao deletar vídeo:", error);
      return reply.status(500).send({ 
        error: "Erro ao deletar vídeo",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}
