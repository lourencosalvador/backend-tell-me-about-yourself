import { FastifyInstance } from "fastify"
import { r2Client, R2_BUCKET_NAME } from "../lib/r2"
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3"

export async function cleanupR2(app: FastifyInstance) {
  app.post('/cleanup/orphaned-files', async (req, reply) => {
    try {
      console.log('🧹 Iniciando limpeza de arquivos órfãos do Cloudflare R2...');

      // Listar todos os objetos no bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
      });

      const response = await r2Client.send(listCommand);
      const objects = response.Contents || [];

      if (objects.length === 0) {
        console.log('✅ Nenhum arquivo encontrado no bucket R2');
        return reply.send({ 
          success: true, 
          message: 'Nenhum arquivo encontrado no bucket R2',
          deletedCount: 0
        });
      }

      console.log(`📁 Encontrados ${objects.length} arquivos no bucket R2`);

      // Deletar todos os objetos
      const deletePromises = objects.map(async (object) => {
        if (object.Key) {
          console.log(`🗑️ Deletando: ${object.Key}`);
          
          try {
            await r2Client.send(new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: object.Key,
            }));
            return { key: object.Key, success: true };
          } catch (error) {
            console.error(`❌ Erro ao deletar ${object.Key}:`, error);
            return { key: object.Key, success: false, error };
          }
        }
        return null;
      });

      const results = await Promise.allSettled(deletePromises);
      const deletedCount = results.filter(result => 
        result.status === 'fulfilled' && result.value?.success
      ).length;

      console.log(`✅ Limpeza concluída! ${deletedCount} arquivos deletados`);

      return reply.send({ 
        success: true, 
        message: `Limpeza concluída! ${deletedCount} arquivos deletados do Cloudflare R2`,
        deletedCount,
        totalFound: objects.length
      });

    } catch (error) {
      console.error("❌ Erro durante limpeza do R2:", error);
      return reply.status(500).send({ 
        error: "Erro durante limpeza do Cloudflare R2",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
} 