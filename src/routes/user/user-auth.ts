import { FastifyInstance } from "fastify";
import { z } from "zod";
import { compare } from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";

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
            recommendation: user.recommendation
          },
          token: sessionToken
        };
      } catch (error) {
        return reply.status(400).send({ error: "Dados inválidos" });
      }
    });
}