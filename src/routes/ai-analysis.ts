import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AIEnhancedAnalyzer } from '../services/aiEnhancedAnalyzer';
import { randomUUID } from 'crypto';

const aiAnalysisBodySchema = z.object({
  videoId: z.string().uuid(),
});

export async function aiAnalysisRoutes(fastify: FastifyInstance) {
  // POST /ai-analysis - Executar análise híbrida em um vídeo existente
  fastify.post('/ai-analysis', async (request, reply) => {
    try {
      const { videoId } = aiAnalysisBodySchema.parse(request.body);

      // Buscar vídeo com seu áudio
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: {
            include: {
              transcription: true
            }
          }
        }
      });

      if (!video) {
        return reply.status(404).send({ error: 'Vídeo não encontrado' });
      }

      if (!video.audio?.transcription) {
        return reply.status(400).send({ error: 'Vídeo ainda não possui transcrição' });
      }

      console.log(`🤖 Iniciando análise AI para vídeo: ${videoId}`);

      // Executar análise híbrida
      const aiAnalyzer = new AIEnhancedAnalyzer();
      const aiResult = await aiAnalyzer.analyzeWithAI(video.audio.transcription.text);

      console.log(`🚀 Análise AI completa:
      - ${aiResult.hardSkills.length} hard skills (${aiResult.hybridScores.hardSkillsAccuracy}% precisão)
      - ${aiResult.softSkills.length} soft skills (${aiResult.hybridScores.softSkillsAccuracy}% precisão)
      - Confiabilidade geral: ${aiResult.hybridScores.overallReliability}%`);

      // Limpar skills antigas (para evitar duplicatas)
      await prisma.skill.deleteMany({
        where: { videoId: videoId }
      });

      // Salvar Hard Skills refinadas
      if (aiResult.hardSkills.length > 0) {
        const hardSkillsData = aiResult.hardSkills.map(skill => ({
          id: randomUUID(),
          videoId: videoId,
          userId: video.userId!,
          skillName: skill.name,
          skillCategory: skill.category,
          confidence: Math.round(skill.confidence * 100),
          mentions: skill.mentions,
          context: JSON.stringify(skill.context),
          type: 'HARD' as const
        }));

        await prisma.skill.createMany({
          data: hardSkillsData
        });

        console.log(`💪 ${aiResult.hardSkills.length} Hard Skills refinadas salvas`);
      }

      // Salvar Soft Skills refinadas
      if (aiResult.softSkills.length > 0) {
        const softSkillsData = aiResult.softSkills.map(skill => ({
          id: randomUUID(),
          videoId: videoId,
          userId: video.userId!,
          skillName: skill.name,
          skillCategory: skill.category,
          confidence: skill.score,
          mentions: 1,
          context: JSON.stringify(skill.examples),
          type: 'SOFT' as const
        }));

        await prisma.skill.createMany({
          data: softSkillsData
        });

        console.log(`🤝 ${aiResult.softSkills.length} Soft Skills refinadas salvas`);
      }

      // Atualizar/criar perfil com insights AI
      const enhancedProfile = `${aiResult.overallProfile} | ${aiResult.aiInsights.personalityProfile}`;
      const enhancedSuggestions = [
        ...aiResult.careerSuggestions,
        `Conselho AI: ${aiResult.aiInsights.careerAdvice}`
      ];

      await prisma.userProfile.upsert({
        where: { userId: video.userId! },
        update: {
          profileDescription: enhancedProfile,
          careerSuggestions: JSON.stringify(enhancedSuggestions),
          lastAnalyzedAt: new Date()
        },
        create: {
          id: randomUUID(),
          userId: video.userId!,
          profileDescription: enhancedProfile,
          careerSuggestions: JSON.stringify(enhancedSuggestions),
          lastAnalyzedAt: new Date()
        }
      });

      console.log(`🧠 Perfil atualizado com insights AI`);

      return reply.status(200).send({
        success: true,
        message: 'Análise AI concluída com sucesso',
        data: {
          hardSkills: aiResult.hardSkills.length,
          softSkills: aiResult.softSkills.length,
          hybridScores: aiResult.hybridScores,
          aiInsights: aiResult.aiInsights,
          profileUpdated: true
        }
      });

    } catch (error) {
      console.error('❌ Erro na análise AI:', error);
      return reply.status(500).send({ 
        error: 'Erro interno do servidor na análise AI',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /ai-analysis/:videoId - Verificar se vídeo já tem análise AI
  fastify.get('/ai-analysis/:videoId', async (request, reply) => {
    try {
      const { videoId } = z.object({
        videoId: z.string().uuid()
      }).parse(request.params);

      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          audio: {
            include: {
              transcription: true
            }
          }
        }
      });

      if (!video) {
        return reply.status(404).send({ error: 'Vídeo não encontrado' });
      }

      const skills = await prisma.skill.findMany({
        where: { videoId: videoId }
      });

      const hasAIAnalysis = skills.some(skill => 
        skill.context.includes('AI detectou') || 
        skill.context.includes('AI:')
      );

      return reply.status(200).send({
        hasAIAnalysis,
        skillsCount: skills.length,
        isEligibleForAI: !!video.audio?.transcription
      });

    } catch (error) {
      console.error('❌ Erro ao verificar análise AI:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
} 