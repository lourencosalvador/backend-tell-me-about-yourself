import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { randomUUID } from "crypto"
import { pipeline } from "stream"
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { promisify } from "util"


const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.post('/upload', async (req, reply) => {
        console.log("📥 Recebendo requisição de upload...")

        const data = await req.file()
        if  (!data) {
            console.error("❌ Nenhum arquivo enviado!")
            return reply.status(400).send({ error: "Nenhum arquivo enviado" }) 
        } 

        console.log("📂 Arquivo recebido:", data.filename) 

        const videoId = randomUUID()
        const videoPath = path.resolve(__dirname, `../../uploads/${videoId}.mp4`)
        const audioPath = path.resolve(__dirname, `../../uploads/${videoId}.mp3`)

        console.log(`📌 Gerando IDs: videoId=${videoId}`)
        console.log(`📍 Caminhos definidos -> Vídeo: ${videoPath}, Áudio: ${audioPath}`)

        // Salva o vídeo localmente
        try {
            console.log("💾 Salvando vídeo...")
            await pump(data.file, fs.createWriteStream(videoPath))
            console.log("✅ Vídeo salvo com sucesso!")
        } catch (error) {
            console.error("❌ Erro ao salvar o vídeo:", error)
            return reply.status(500).send({ error: "Erro ao salvar o vídeo" })
        }

        try {
            console.log("🎵 Convertendo vídeo para áudio...")
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .toFormat("mp3")
                    .on("end", () => {
                        console.log("✅ Conversão concluída!")
                        resolve(null)
                    })
                    .on("error", (err) => {
                        console.error("❌ Erro na conversão de áudio:", err)
                        reject(err)
                    })
                    .save(audioPath)
            })
        } catch (error) {
            console.error("❌ Falha na conversão do vídeo para áudio:", error)
            return reply.status(500).send({ error: "Erro ao converter vídeo para áudio" })
        }

        try {
            console.log("🗄 Salvando caminho do áudio no banco...")
            const audio = await prisma.audio.create({
                data: {
                    id: videoId,
                    path: audioPath
                }
            })
            console.log("✅ Áudio salvo no banco com ID:", audio.id)

            return { audioId: audio.id }
        } catch (error) {
            console.error("❌ Erro ao salvar no banco:", error)
            return reply.status(500).send({ error: "Erro ao salvar áudio no banco de dados" })
        }
    })
}
