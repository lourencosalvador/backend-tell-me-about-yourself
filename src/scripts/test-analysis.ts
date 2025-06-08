import { prisma } from "../lib/prisma";
import { sendToAnalysis } from "../services/analysis-service";
import { transcriptionsMock } from "../constants/transcription-mocks";

async function testAnalysisAndUpdateRecommendation(userId: string) {
    try {
        const analysisResult = await sendToAnalysis(transcriptionsMock);

        console.log("\n📢 **Análise do Perfil do Estudante:**");
        console.log(analysisResult);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { recommendation: JSON.stringify(analysisResult) }
        });
        console.log(`✅ Usuário com ID ${userId} atualizado com a recomendação.`);
        return updatedUser;
    } catch (error) {
        console.error("Erro ao realizar análise ou atualizar o usuário:", error);
        throw new Error("Falha na análise ou atualização do usuário.");
    }
}

testAnalysisAndUpdateRecommendation("e40d5be4-bbed-483a-b63a-5555e8ce9257");
