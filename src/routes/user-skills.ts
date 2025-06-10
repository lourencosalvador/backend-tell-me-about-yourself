import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function userSkillsRoute(app: FastifyInstance) {
  // Buscar skills do usuário
  app.get('/users/:userId/skills', async (req, reply) => {
    const paramsSchema = z.object({
      userId: z.string().uuid()
    });

    try {
      const { userId } = paramsSchema.parse(req.params);

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      // Buscar todas as skills do usuário
      const skills = await prisma.skill.findMany({
        where: { userId },
        orderBy: [
          { confidence: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      // Buscar perfil do usuário
      const profile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      // Separar hard skills e soft skills
      const hardSkills = skills.filter(skill => skill.type === 'HARD');
      const softSkills = skills.filter(skill => skill.type === 'SOFT');

      // Agrupar skills por categoria para estatísticas
      const hardSkillsByCategory = hardSkills.reduce((acc, skill) => {
        if (!acc[skill.skillCategory]) {
          acc[skill.skillCategory] = [];
        }
        acc[skill.skillCategory].push(skill);
        return acc;
      }, {} as Record<string, typeof hardSkills>);

      const softSkillsByCategory = softSkills.reduce((acc, skill) => {
        if (!acc[skill.skillCategory]) {
          acc[skill.skillCategory] = [];
        }
        acc[skill.skillCategory].push(skill);
        return acc;
      }, {} as Record<string, typeof softSkills>);

      // Calcular estatísticas
      const stats = {
        totalSkills: skills.length,
        hardSkillsCount: hardSkills.length,
        softSkillsCount: softSkills.length,
        averageConfidence: skills.length > 0 
          ? skills.reduce((sum, skill) => sum + skill.confidence, 0) / skills.length
          : 0,
        topHardSkills: hardSkills.slice(0, 5).map(skill => ({
          name: skill.skillName,
          category: skill.skillCategory,
          confidence: Math.round(skill.confidence * 100),
          mentions: skill.mentions
        })),
        topSoftSkills: softSkills.slice(0, 5).map(skill => ({
          name: skill.skillName,
          category: skill.skillCategory,
          score: Math.round(skill.confidence * 100),
          mentions: skill.mentions
        })),
        categoriesDistribution: {
          hardSkills: Object.keys(hardSkillsByCategory).map(category => ({
            category,
            count: hardSkillsByCategory[category].length,
            avgConfidence: Math.round(
              hardSkillsByCategory[category].reduce((sum, skill) => sum + skill.confidence, 0) / 
              hardSkillsByCategory[category].length * 100
            )
          })),
          softSkills: Object.keys(softSkillsByCategory).map(category => ({
            category,
            count: softSkillsByCategory[category].length,
            avgScore: Math.round(
              softSkillsByCategory[category].reduce((sum, skill) => sum + skill.confidence, 0) / 
              softSkillsByCategory[category].length * 100
            )
          }))
        }
      };

      return reply.send({
        success: true,
        data: {
          hardSkills: hardSkills.map(skill => ({
            id: skill.id,
            name: skill.skillName,
            category: skill.skillCategory,
            confidence: Math.round(skill.confidence * 100),
            mentions: skill.mentions,
            context: JSON.parse(skill.context),
            createdAt: skill.createdAt
          })),
          softSkills: softSkills.map(skill => ({
            id: skill.id,
            name: skill.skillName,
            category: skill.skillCategory,
            score: Math.round(skill.confidence * 100),
            mentions: skill.mentions,
            context: JSON.parse(skill.context),
            createdAt: skill.createdAt
          })),
          profile: profile ? {
            description: profile.profileDescription,
            careerSuggestions: profile.careerSuggestions ? JSON.parse(profile.careerSuggestions) : [],
            lastAnalyzedAt: profile.lastAnalyzedAt
          } : null,
          stats
        }
      });

    } catch (error) {
      console.error("❌ Erro ao buscar skills do usuário:", error);
      return reply.status(500).send({ 
        error: "Erro ao buscar skills do usuário",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Buscar evolução das skills ao longo do tempo
  app.get('/users/:userId/skills/evolution', async (req, reply) => {
    const paramsSchema = z.object({
      userId: z.string().uuid()
    });

    const querySchema = z.object({
      days: z.string().transform(val => parseInt(val)).default('30')
    });

    try {
      const { userId } = paramsSchema.parse(req.params);
      const { days } = querySchema.parse(req.query);

      // Data limite
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Buscar skills criadas no período
      const skills = await prisma.skill.findMany({
        where: {
          userId,
          createdAt: {
            gte: dateLimit
          }
        },
        include: {
          video: {
            select: {
              id: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Agrupar por data
      const evolutionData = skills.reduce((acc, skill) => {
        const date = skill.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!acc[date]) {
          acc[date] = {
            date,
            hardSkills: [],
            softSkills: [],
            totalSkills: 0
          };
        }

        if (skill.type === 'HARD') {
          acc[date].hardSkills.push({
            name: skill.skillName,
            category: skill.skillCategory,
            confidence: skill.confidence
          });
        } else {
          acc[date].softSkills.push({
            name: skill.skillName,
            category: skill.skillCategory,
            score: skill.confidence
          });
        }

        acc[date].totalSkills++;
        return acc;
      }, {} as Record<string, any>);

      const evolution = Object.values(evolutionData).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return reply.send({
        success: true,
        data: {
          period: `${days} dias`,
          evolution,
          summary: {
            totalDaysWithActivity: evolution.length,
            totalSkillsDetected: skills.length,
            averageSkillsPerDay: evolution.length > 0 ? skills.length / evolution.length : 0
          }
        }
      });

    } catch (error) {
      console.error("❌ Erro ao buscar evolução das skills:", error);
      return reply.status(500).send({ 
        error: "Erro ao buscar evolução das skills",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
} 