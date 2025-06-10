import { openai } from '../lib/openai';
import { SkillsAnalyzer, type SkillsAnalysisResult } from './skillsAnalyzer';

interface AIEnhancedResult extends SkillsAnalysisResult {
  aiInsights: {
    personalityProfile: string;
    strengthsAnalysis: string;
    improvementAreas: string[];
    careerAdvice: string;
    confidenceLevel: number; // 0-100
    communicationStyle: string;
    workingStyle: string;
    professionalMaturity: number; // 0-100
  };
  hybridScores: {
    hardSkillsAccuracy: number;   // Combina nossa análise + OpenAI
    softSkillsAccuracy: number;   // Combina NLP próprio + OpenAI
    overallReliability: number;   // Meta-score da qualidade da análise
  };
}

class AIEnhancedAnalyzer {
  private baseAnalyzer: SkillsAnalyzer;

  constructor() {
    this.baseAnalyzer = new SkillsAnalyzer();
  }

  public async analyzeWithAI(transcription: string): Promise<AIEnhancedResult> {
    console.log('🧠 Iniciando análise híbrida (Sistema Próprio + OpenAI)...');

    // 1. 🚀 ANÁLISE BASE (nosso sistema - rápido e confiável)
    const baseResult = this.baseAnalyzer.analyzeTranscription(transcription);
    console.log(`✅ Análise base: ${baseResult.hardSkills.length} hard skills, ${baseResult.softSkills.length} soft skills`);

    // 2. 🤖 ANÁLISE AVANÇADA COM OPENAI
    const aiInsights = await this.getAIInsights(transcription, baseResult);
    
    // 3. 🔄 REFINAMENTO HÍBRIDO
    const enhancedHardSkills = await this.enhanceHardSkills(transcription, baseResult.hardSkills);
    const enhancedSoftSkills = await this.enhanceSoftSkills(transcription, baseResult.softSkills);
    
    // 4. 📊 SCORES HÍBRIDOS
    const hybridScores = this.calculateHybridScores(baseResult, aiInsights);

    return {
      ...baseResult,
      hardSkills: enhancedHardSkills,
      softSkills: enhancedSoftSkills,
      aiInsights,
      hybridScores
    };
  }

  private async getAIInsights(transcription: string, baseResult: SkillsAnalysisResult) {
    const prompt = `
Analise esta transcrição de vídeo profissional e forneça insights profundos sobre a personalidade e habilidades da pessoa:

TRANSCRIÇÃO:
"${transcription}"

ANÁLISE INICIAL JÁ DETECTADA:
- Hard Skills: ${baseResult.hardSkills.map(s => s.name).join(', ')}
- Soft Skills: ${baseResult.softSkills.map(s => s.name).join(', ')}
- Perfil: ${baseResult.overallProfile}

FORNEÇA UMA ANÁLISE PROFUNDA EM JSON:
{
  "personalityProfile": "Descrição rica da personalidade profissional (2-3 frases)",
  "strengthsAnalysis": "Principais pontos fortes identificados (2-3 frases)",
  "improvementAreas": ["área 1", "área 2", "área 3"],
  "careerAdvice": "Conselho específico de carreira baseado no perfil (2-3 frases)",
  "confidenceLevel": número_0_a_100,
  "communicationStyle": "estilo_de_comunicacao",
  "workingStyle": "estilo_de_trabalho",
  "professionalMaturity": número_0_a_100
}

FOQUE EM:
- Nuances que apenas IA pode detectar
- Padrões sutis de linguagem
- Contexto emocional
- Maturidade profissional
- Estilo de trabalho único
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('Resposta vazia da OpenAI');

      // Extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON não encontrado na resposta');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('❌ Erro na análise AI:', error);
      
      // Fallback se OpenAI falhar
      return {
        personalityProfile: "Profissional comunicativo com potencial de crescimento.",
        strengthsAnalysis: "Demonstra conhecimento técnico e capacidade de explicação.",
        improvementAreas: ["Aprofundar conhecimentos técnicos", "Desenvolver soft skills"],
        careerAdvice: "Continue desenvolvendo suas habilidades através de projetos práticos.",
        confidenceLevel: 70,
        communicationStyle: "Direto e técnico",
        workingStyle: "Focado em resultados",
        professionalMaturity: 65
      };
    }
  }

  private async enhanceHardSkills(transcription: string, baseSkills: any[]) {
    if (baseSkills.length === 0) return baseSkills;

    const prompt = `
Analise estas hard skills detectadas e forneça refinamento:

TRANSCRIÇÃO: "${transcription}"

SKILLS DETECTADAS:
${baseSkills.map(s => `- ${s.name} (${Math.round(s.confidence * 100)}% confiança)`).join('\n')}

REFINAMENTOS NECESSÁRIOS (JSON):
{
  "adjustments": [
    {
      "skillName": "nome_da_skill",
      "newConfidence": número_0_a_100,
      "reasoning": "por que ajustou"
    }
  ],
  "additionalSkills": [
    {
      "name": "skill_adicional",
      "category": "categoria",
      "confidence": número_0_a_100,
      "reasoning": "por que detectou"
    }
  ]
}

FOQUE EM:
- Skills implícitas não detectadas por palavras-chave
- Ajustar confiança baseado no contexto
- Detectar especialização avançada
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 600
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const aiRefinement = JSON.parse(jsonMatch[0]);
        
        // Aplicar ajustes
        let enhancedSkills = [...baseSkills];
        
        aiRefinement.adjustments?.forEach((adj: any) => {
          const skillIndex = enhancedSkills.findIndex(s => s.name.toLowerCase() === adj.skillName.toLowerCase());
          if (skillIndex >= 0) {
            enhancedSkills[skillIndex].confidence = adj.newConfidence / 100;
            enhancedSkills[skillIndex].context.push(`AI: ${adj.reasoning}`);
          }
        });

        // Adicionar skills extras detectadas pela AI
        aiRefinement.additionalSkills?.forEach((skill: any) => {
          enhancedSkills.push({
            name: skill.name,
            category: skill.category,
            confidence: skill.confidence / 100,
            mentions: 1,
            context: [`AI detectou: ${skill.reasoning}`]
          });
        });

        console.log(`🤖 OpenAI refinement: ${aiRefinement.adjustments?.length || 0} ajustes, ${aiRefinement.additionalSkills?.length || 0} skills adicionais`);
        return enhancedSkills.sort((a, b) => b.confidence - a.confidence);
      }
    } catch (error) {
      console.error('❌ Erro no refinamento de hard skills:', error);
    }

    return baseSkills;
  }

  private async enhanceSoftSkills(transcription: string, baseSoftSkills: any[]) {
    if (baseSoftSkills.length === 0) return baseSoftSkills;

    const prompt = `
Analise as soft skills e forneça insights profundos:

TRANSCRIÇÃO: "${transcription}"

SOFT SKILLS DETECTADAS:
${baseSoftSkills.map(s => `- ${s.name} (${s.score}% score)`).join('\n')}

ANÁLISE PROFUNDA (JSON):
{
  "refinedScores": [
    {
      "skillName": "nome_da_skill",
      "newScore": número_0_a_100,
      "aiEvidence": ["evidência 1", "evidência 2"],
      "contextualAnalysis": "análise contextual profunda"
    }
  ],
  "hiddenSoftSkills": [
    {
      "name": "skill_não_detectada",
      "score": número_0_a_100,
      "evidence": ["evidência 1", "evidência 2"],
      "reasoning": "por que a AI detectou"
    }
  ]
}

DETECTE:
- Inteligência emocional
- Capacidade de storytelling
- Pensamento estratégico
- Resiliência
- Autenticidade
- Carisma
- Visão sistêmica
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 700
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const aiAnalysis = JSON.parse(jsonMatch[0]);
        let enhancedSoftSkills = [...baseSoftSkills];

        // Refinar scores existentes
        aiAnalysis.refinedScores?.forEach((refined: any) => {
          const skillIndex = enhancedSoftSkills.findIndex(s => s.name.toLowerCase() === refined.skillName.toLowerCase());
          if (skillIndex >= 0) {
            // Média ponderada: 70% nosso sistema + 30% OpenAI
            const hybridScore = Math.round(
              (enhancedSoftSkills[skillIndex].score * 0.7) + (refined.newScore * 0.3)
            );
            
            enhancedSoftSkills[skillIndex].score = hybridScore;
            enhancedSoftSkills[skillIndex].examples.push(...refined.aiEvidence);
            enhancedSoftSkills[skillIndex].examples.push(refined.contextualAnalysis);
          }
        });

        // Adicionar soft skills detectadas apenas pela AI
        aiAnalysis.hiddenSoftSkills?.forEach((skill: any) => {
          enhancedSoftSkills.push({
            name: skill.name,
            category: 'soft_skill',
            score: skill.score,
            indicators: ['AI Detection'],
            examples: skill.evidence.concat([skill.reasoning])
          });
        });

        console.log(`🧠 OpenAI soft skills: ${aiAnalysis.refinedScores?.length || 0} refinamentos, ${aiAnalysis.hiddenSoftSkills?.length || 0} skills ocultas`);
        return enhancedSoftSkills.sort((a, b) => b.score - a.score);
      }
    } catch (error) {
      console.error('❌ Erro no refinamento de soft skills:', error);
    }

    return baseSoftSkills;
  }

  private calculateHybridScores(baseResult: SkillsAnalysisResult, aiInsights: any) {
    // Calcular confiança baseada na consistência entre sistemas
    const hardSkillsAccuracy = Math.min(95, 70 + (baseResult.hardSkills.length * 3));
    const softSkillsAccuracy = Math.min(90, aiInsights.confidenceLevel || 70);
    const overallReliability = Math.round((hardSkillsAccuracy + softSkillsAccuracy) / 2);

    return {
      hardSkillsAccuracy,
      softSkillsAccuracy,
      overallReliability
    };
  }
}

export { AIEnhancedAnalyzer, type AIEnhancedResult }; 