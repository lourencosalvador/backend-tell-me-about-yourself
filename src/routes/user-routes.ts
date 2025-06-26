import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hash, compare } from "bcrypt";
import { randomUUID } from "crypto";

export async function userRoutes(app: FastifyInstance) {

  // Criar um novo usuário
  app.post('/users', async (req, reply) => {
    const createUserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string(),
      class: z.string(),
      photoUrl: z.string().url().optional(),
    });

    try {
      const { name, email, password, class: userClass, photoUrl } = createUserSchema.parse(req.body);
      
      const userExists = await prisma.user.findUnique({
        where: { email }
      });

      if (userExists) {
        return reply.status(400).send({ error: "Email já cadastrado" });
      }

      const hashedPassword = await hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          class: userClass,
          photoUrl,
        }
      });

      return reply.status(201).send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          class: user.class,
          photoUrl: user.photoUrl,
        }
      });
    } catch (error) {
        console.log("Error", error)
      return reply.status(400).send({ error: "Dados inválidos"});
    }
  });

  // Autenticar usuário (login)
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
        },
        token: sessionToken
      };
    } catch (error) {
      return reply.status(400).send({ error: "Dados inválidos" });
    }
  });

  // Obter usuário por ID
  app.get('/users/:userId', async (req, reply) => {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
    });

    try {
      const { userId } = paramsSchema.parse(req.params);
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        class: user.class,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
      };
    } catch (error) {
      return reply.status(400).send({ error: "ID inválido" });
    }
  });

  // Atualizar usuário
  app.put('/users/:userId', async (req, reply) => {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
    });

    const updateUserSchema = z.object({
      name: z.string().min(3).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      class: z.string().optional(),
      photoUrl: z.string().url().optional(),
    });

    try {
      const { userId } = paramsSchema.parse(req.params);
      const updateData = updateUserSchema.parse(req.body);
      
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!userExists) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      // Se estiver atualizando o email, verifica se já existe
      if (updateData.email && updateData.email !== userExists.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        });

        if (emailExists) {
          return reply.status(400).send({ error: "Email já cadastrado" });
        }
      }

      // Se estiver atualizando a senha, faz o hash
      if (updateData.password) {
        updateData.password = await hash(updateData.password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        class: updatedUser.class,
        photoUrl: updatedUser.photoUrl,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      return reply.status(400).send({ error: "Dados inválidos" });
    }
  });

  // Deletar usuário
  app.delete('/users/:userId', async (req, reply) => {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
    });

    try {
      const { userId } = paramsSchema.parse(req.params);
      
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!userExists) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      await prisma.user.delete({
        where: { id: userId }
      });

      return reply.status(204).send();
    } catch (error) {
      return reply.status(400).send({ error: "ID inválido" });
    }
  });
}