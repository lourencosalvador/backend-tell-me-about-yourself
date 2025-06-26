import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { openai } from "../lib/openai"
import { z } from "zod"
import process from "process"

export async function recommendationsRoute(app: FastifyInstance) {
  
  // Buscar recomendação existente do usuário
  app.get('/users/:userId/recommendation', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true, 
          recommendation: true,
          updatedAt: true
        }
      })

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" })
      }

      if (!user.recommendation) {
        return reply.send({ 
          hasRecommendation: false,
          message: "Nenhuma recomendação gerada ainda" 
        })
      }

      let recommendation = null
      try {
        recommendation = JSON.parse(user.recommendation)
      } catch {
        recommendation = { 
          area_recomendada: "Análise anterior", 
          justificativa: user.recommendation 
        }
      }

      return reply.send({
        hasRecommendation: true,
        recommendation,
        generatedAt: user.updatedAt,
        user: {
          id: user.id,
          name: user.name
        }
      })
    } catch (error) {
      console.error("❌ Erro ao buscar recomendação:", error)
      return reply.status(500).send({ error: "Erro ao buscar recomendação" })
    }
  })

  // Gerar nova recomendação baseada nas transcrições
  app.post('/users/:userId/recommendation/generate', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      // Verificar se usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true, 
          class: true,
          updatedAt: true
        }
      })

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" })
      }

      // Verificar se já foi gerada recomendação hoje
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      
      if (user.updatedAt >= inicioHoje) {
        return reply.status(429).send({ 
          error: "Recomendação já foi gerada hoje. Tente novamente amanhã.",
          nextAllowedAt: new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000)
        })
      }

      console.log(`🔍 Buscando transcrições para usuário: ${user.name}`)

      // Buscar todas as transcrições do usuário
      const videos = await prisma.video.findMany({
        where: { userId },
        include: {
          audio: {
            include: {
              transcription: {
                where: {
                  status: "COMPLETED",
                  text: { not: "" }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Extrair transcrições válidas
      const transcricoes = videos
        .map(video => video.audio?.transcription)
        .filter(transcription => transcription && transcription.text.trim().length > 50)
        .map(transcription => ({
          text: transcription!.text,
          data: transcription!.createdAt
        }))

      if (transcricoes.length === 0) {
        return reply.status(400).send({ 
          error: "Não há transcrições suficientes para gerar uma recomendação. Grave mais vídeos primeiro." 
        })
      }

      if (transcricoes.length < 2) {
        return reply.status(400).send({ 
          error: `Você precisa de pelo menos 2 vídeos com transcrições para gerar uma recomendação. Você tem ${transcricoes.length} vídeo(s). Grave mais 1 vídeo e tente novamente.`,
          currentVideos: transcricoes.length,
          requiredVideos: 2,
          missingVideos: 2 - transcricoes.length
        })
      }

      console.log(`📚 Analisando ${transcricoes.length} transcrições para recomendação robusta...`)

      // Preparar o texto combinado das transcrições
      const textoCompleto = transcricoes
        .map((t, index) => `\n=== VÍDEO ${index + 1} (${t.data.toLocaleDateString('pt-BR')}) ===\n${t.text}`)
        .join('\n\n')

      // Prompt robusto e detalhado para análise
      const promptSistema = `Você é um especialista em orientação acadêmica e profissional na área de tecnologia e informática. 

Sua missão é analisar profundamente as transcrições de vídeos de um estudante brasileiro da ${user.class} classe do ensino médio e fornecer uma recomendação personalizada e precisa sobre qual área da informática seria mais adequada para ele seguir.

INSTRUÇÕES IMPORTANTES:
1. Analise TODOS os aspectos das transcrições: temas discutidos, linguagem utilizada, profundidade técnica, interesses demonstrados, padrões de pensamento
2. Identifique padrões consistentes ao longo das transcrições
3. Considere o nível acadêmico do estudante (ensino médio)
4. Foque em UMA área específica da informática que seja mais adequada
5. Justifique detalhadamente sua escolha
6. Seja encorajador mas realista
7. Fale DIRETAMENTE com o estudante (use "você", "seu", etc.)

ÁREAS POSSÍVEIS (mas não se limite a estas):
- Desenvolvimento Web (Frontend/Backend)
- Desenvolvimento Mobile
- Inteligência Artificial e Machine Learning
- Ciência de Dados e Analytics
- Segurança da Informação (Cibersegurança)
- Engenharia de Software
- Desenvolvimento de Jogos
- UI/UX Design
- Arquitetura de Sistemas
- DevOps e Cloud Computing
- Internet das Coisas (IoT)
- Realidade Virtual/Aumentada

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido no formato:
{
  "area_recomendada": "Nome específico da área",
  "justificativa": "Explicação detalhada e personalizada dirigida ao estudante"
}`

      const promptUsuario = `Analise as seguintes transcrições de vídeos deste estudante:

${textoCompleto}

Com base na análise completa dessas transcrições, identifique a área da informática mais adequada para este estudante e forneça uma justificativa detalhada e personalizada.`

      console.log("🤖 Enviando para análise OpenAI...")

      // Chamar OpenAI para análise
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptSistema },
          { role: "user", content: promptUsuario }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Baixa temperatura para respostas mais consistentes
        max_tokens: 1000
      })

      const resultado = JSON.parse(response.choices[0].message.content || '{}')
      
      if (!resultado.area_recomendada || !resultado.justificativa) {
        throw new Error("Resposta da IA inválida")
      }

      console.log(`✅ Recomendação gerada: ${resultado.area_recomendada}`)

      // Salvar recomendação no banco
      await prisma.user.update({
        where: { id: userId },
        data: { 
          recommendation: JSON.stringify(resultado),
          updatedAt: new Date()
        }
      })

      return reply.send({
        success: true,
        recommendation: resultado,
        transcriptionsAnalyzed: transcricoes.length,
        generatedAt: new Date(),
        user: {
          id: user.id,
          name: user.name
        }
      })

    } catch (error) {
      console.error("❌ Erro ao gerar recomendação:", error)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      if (errorMessage.includes('API')) {
        return reply.status(503).send({ 
          error: "Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos." 
        })
      }
      
      return reply.status(500).send({ 
        error: "Erro interno ao gerar recomendação",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      })
    }
  })

  // Forçar regeneração de recomendação (para testes/admin)
  app.post('/users/:userId/recommendation/regenerate', async (req, reply) => {
    const paramsSchema = z.object({ userId: z.string().uuid() })

    try {
      const { userId } = paramsSchema.parse(req.params)
      
      // Resetar o updatedAt para permitir nova geração
      await prisma.user.update({
        where: { id: userId },
        data: { 
          recommendation: null,
          updatedAt: new Date('2020-01-01') // Data antiga para permitir regeneração
        }
      })

      return reply.send({ 
        success: true, 
        message: "Recomendação resetada. Agora você pode gerar uma nova." 
      })
    } catch (error) {
      console.error("❌ Erro ao resetar recomendação:", error)
      return reply.status(500).send({ error: "Erro ao resetar recomendação" })
    }
  })
} 