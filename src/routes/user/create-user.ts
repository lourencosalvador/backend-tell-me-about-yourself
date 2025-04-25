import { FastifyInstance } from "fastify";
import { z } from "zod";
import { hash } from "bcrypt";
import { prisma } from "../../lib/prisma";


export async function createUser(app: FastifyInstance) {
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
}