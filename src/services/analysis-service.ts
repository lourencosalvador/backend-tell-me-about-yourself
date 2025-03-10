import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
});

export async function sendToAnalysis(transcriptions: { text: string }[]) {
    if (transcriptions.length === 0) {
        console.log("⚠️ Nenhuma transcrição disponível para análise.");
        return;
    }

    const combinedText = transcriptions.map(t => t.text).join("\n\n");

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Você é um especialista em análise de perfis acadêmicos e profissionais." },
            { role: "user", content: `
                Estas são transcrições de um estudante. Com base nelas, analise os padrões de pensamento,
                interesses e habilidades demonstradas. Indique quais áreas da informática ele pode ter um bom desempenho
                e justifique sua resposta.
                
                **Transcrições:**  
                ${combinedText}
            ` }
        ]
    });

    console.log("📊 Resultado da análise:", response.choices[0].message.content);
    return response.choices[0].message.content;
}
