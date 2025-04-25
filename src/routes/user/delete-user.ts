import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";



export async function deleteUser(app: FastifyInstance) {
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