import cron from "node-cron";
import { sendToAnalysis } from "../services/analysis-service";
import { prisma } from "../lib/prisma";

async function processTranscriptions() {
    console.log("📅 Buscando transcrições da última semana...");

    const lastWeekTranscriptions = await prisma.transcription.findMany({
        where: {
            createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            }
        }
    });

    if (lastWeekTranscriptions.length === 0) {
        console.log("⚠️ Nenhuma transcrição nova para análise.");
        return;
    }

    console.log(`📤 Enviando ${lastWeekTranscriptions.length} transcrições para análise...`);
    await sendToAnalysis(lastWeekTranscriptions);
}

cron.schedule("0 0 * * 7", async () => { 
    console.log("⏳ Executando análise automática...");
    await processTranscriptions();
});

export { processTranscriptions };
