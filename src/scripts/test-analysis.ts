import { sendToAnalysis } from "../services/analysis-service";
import { transcriptionsMock } from "../constants/transcription-mocks";

async function testAnalysis() {
    const result = await sendToAnalysis(transcriptionsMock);
    console.log("\n📢 **Análise do Perfil do Estudante:**");
    console.log(result);
}

testAnalysis();