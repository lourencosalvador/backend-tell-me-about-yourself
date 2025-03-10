import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { openai } from "../lib/openai";
import { prisma } from "../lib/prisma";

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post('/audio/:audioId/transcription', async (req, reply) => {
        
        console.log("📝 Recebendo requisição para transcrição...");

        const paramsSchema = z.object({
            audioId: z.string().uuid(),
        });

        const { audioId } = paramsSchema.parse(req.params);

        console.log("📌 Audio ID recebido:", audioId);

        const bodySchema = z.object({
            prompt: z.string()
        });

        const { prompt } = bodySchema.parse(req.body);

        console.log("📜 Prompt recebido:", prompt);

        console.log("🔍 Buscando áudio no banco de dados...");

        const audio = await prisma.audio.findUnique({
            where: { id: audioId }
        });

        if (!audio) {
            console.error("❌ Áudio não encontrado no banco de dados!");
            return reply.status(404).send({ error: "Áudio não encontrado" });
        }

        console.log("✅ Áudio encontrado:", audio.path);

        const audioReadStream = createReadStream(audio.path);

        console.log("🎙️ Enviando áudio para transcrição...");
        const response = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'json',
            temperature: 0,
            prompt
        });

        console.log("✅ Transcrição concluída!");

        await prisma.transcription.create({
            data: {
                audioId: audio.id,
                text: response.text,
            }
        });
        
        console.log("✅ Transcrição salva no banco!");
        return { transcription: response.text };
    });
}
