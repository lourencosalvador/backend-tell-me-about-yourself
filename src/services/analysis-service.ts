import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

export async function sendToAnalysis(transcriptions: { text: string }[]) {
  if (transcriptions.length === 0) {
    console.log("⚠️ Nenhuma transcrição disponível para análise.");
    return;
  }

  const combinedText = transcriptions.map(t => t.text).join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: "Você é um especialista em análise de perfis acadêmicos e profissionais." },
      { role: "user", content: `
        Estas são transcrições de um estudante. Com base nelas, analise os padrões de pensamento,
        interesses e habilidades demonstradas. Escolha **apenas uma área** da informática onde ele pode se destacar,
        e explique detalhadamente **por que** essa área é a mais adequada para ele.

        **Saída esperada:**  
        Retorne um JSON no seguinte formato:
        {
          "area_recomendada": "Nome da Área",
          "justificativa": "Explicação detalhada"
        }

        **Transcrições:**  
        ${combinedText}
      ` }
    ],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  console.log("\n📢 **Análise do Perfil do Estudante:**", result);
  return result;
}
