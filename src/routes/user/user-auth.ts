import { FastifyInstance } from "fastify";
import { z } from "zod";
import { compare } from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../../lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function authUser(app: FastifyInstance) {
    app.post('/users/auth', async (req, reply) => {
      const authSchema = z.object({
        email: z.string().email(),
        password: z.string(),
      });
  
      try {
        const { email, password } = authSchema.parse(req.body);
        
        const user = await prisma.user.findUnique({
          where: { email }
        });
  
        if (!user) {
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }
  
        const passwordMatch = await compare(password, user.password);
  
        if (!passwordMatch) {
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }
        
        // Gerar token de sessão (simples)
        // Em produção, use JWT ou outro método mais seguro
        const sessionToken = randomUUID();
  
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            class: user.class,
            photoUrl: user.photoUrl,
            recommendation: user.recommendation,
            streak: user.streak
          },
          token: sessionToken
        };
      } catch (error) {
        return reply.status(400).send({ error: "Dados inválidos" });
      }
    });

    // Novo endpoint para verificar streak atual
    app.get('/users/:userId/streak', async (req, reply) => {
      const paramsSchema = z.object({
        userId: z.string().uuid()
      });

      try {
        const { userId } = paramsSchema.parse(req.params);
        
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            streak: true, 
            lastStreakDate: true 
          }
        });

        if (!user) {
          return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        // Verificar se conquistou streak hoje
        const hoje = new Date();
        const lastStreakDate = user.lastStreakDate;
        
        const streakConquistadoHoje = lastStreakDate && 
          lastStreakDate.getDate() === hoje.getDate() &&
          lastStreakDate.getMonth() === hoje.getMonth() &&
          lastStreakDate.getFullYear() === hoje.getFullYear();

        return {
          streak: user.streak,
          streakConquistadoHoje: !!streakConquistadoHoje,
          lastStreakDate: user.lastStreakDate
        };
      } catch (error) {
        return reply.status(400).send({ error: "Parâmetros inválidos" });
      }
    });

    // Novo endpoint para atualizar perfil do usuário
    app.patch('/users/:userId/profile', async (req, reply) => {
      const paramsSchema = z.object({
        userId: z.string().uuid()
      });

      const bodySchema = z.object({
        name: z.string().min(1).optional(),
        photoUrl: z.string().url().optional(),
      });

      try {
        const { userId } = paramsSchema.parse(req.params);
        const updateData = bodySchema.parse(req.body);
        
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            class: true,
            photoUrl: true,
            recommendation: true,
            streak: true
          }
        });

        console.log(`✅ Perfil atualizado para usuário ${userId}:`, updateData);

        return {
          user: updatedUser,
          message: "Perfil atualizado com sucesso"
        };
      } catch (error) {
        console.error("❌ Erro ao atualizar perfil:", error);
        return reply.status(400).send({ error: "Dados inválidos" });
      }
    });

    // Endpoint para upload de foto de perfil
    app.post('/users/:userId/upload-photo', async (req, reply) => {
      const paramsSchema = z.object({
        userId: z.string().uuid()
      });

      try {
        const { userId } = paramsSchema.parse(req.params);
        
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        const data = await req.file();
        if (!data) {
          return reply.status(400).send({ error: "Nenhuma imagem enviada" });
        }

        // Validar tipo de arquivo
        if (!data.mimetype.startsWith('image/')) {
          return reply.status(400).send({ error: "Apenas imagens são aceitas" });
        }

        const photoId = randomUUID();
        const photoKey = `profile-photos/${userId}/${photoId}.jpg`;
        
        // Converter stream para buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload para R2
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: photoKey,
          Body: buffer,
          ContentType: data.mimetype,
        }));

        // Gerar URL pública
        const photoUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${photoKey}` : photoKey;

        // Atualizar usuário no banco
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { photoUrl },
          select: {
            id: true,
            name: true,
            email: true,
            class: true,
            photoUrl: true,
            recommendation: true,
            streak: true
          }
        });

        console.log(`📸 Foto de perfil atualizada para usuário ${userId}: ${photoUrl}`);

        return {
          user: updatedUser,
          photoUrl,
          message: "Foto de perfil atualizada com sucesso"
        };
      } catch (error) {
        console.error("❌ Erro ao fazer upload da foto:", error);
        return reply.status(500).send({ 
          error: "Erro ao processar upload da foto",
          details: error instanceof Error ? error.message : "Erro desconhecido"
        });
      }
    });
}