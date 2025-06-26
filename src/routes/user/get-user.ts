import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";


export async function getUser(app: FastifyInstance) {
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
}