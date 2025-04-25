import { FastifyInstance } from "fastify";
import { z } from "zod";
import { hash } from "bcrypt";
import { prisma } from "../../lib/prisma";

export async function updateUser(app: FastifyInstance) {
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
}