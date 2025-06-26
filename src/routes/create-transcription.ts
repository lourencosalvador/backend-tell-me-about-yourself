import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { openai } from "../lib/openai";
import { prisma } from "../lib/prisma";

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post('/audio/transcription', async (req, reply) => {
        console.log("📝 Recebendo requisição para transcrição...");

        const formData = req.body;
        const audio = formData.file; // Recebe o arquivo enviado do frontend

        if (!audio) {
            console.error("❌ Nenhum arquivo de áudio enviado");
            return reply.status(400).send({ error: "Arquivo de áudio não enviado" });
        }

        try {
            const audioReadStream = createReadStream(audio.tempFilePath);  // Caminho temporário onde o áudio foi salvo
            
            // Envia o áudio para transcrição com Whisper
            const response = await openai.audio.transcriptions.create({
                file: audioReadStream,
                model: 'whisper-1',
                language: 'pt',
                response_format: 'json',
                temperature: 0
            });

            console.log("✅ Transcrição concluída!");

            // Salvar a transcrição no banco de dados
            await prisma.transcription.create({
                data: {
                    audioId: audio.id,  // Se o áudio for armazenado no banco
                    text: response.text,
                }
            });

            return { transcription: response.text };
        } catch (error) {
            console.error("Erro na transcrição:", error);
            return reply.status(500).send({ error: "Erro ao processar transcrição" });
        }
    });
}
