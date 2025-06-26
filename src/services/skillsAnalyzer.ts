import { AdvancedNLPAnalyzer } from './advancedNLP';

/**
 * Analisador de habilidades que processa transcrições para identificar
 * competências técnicas e comportamentais do usuário
 */

interface HardSkill {
  name: string;
  category: string;
  confidence: number;
  mentions: number;
  context: string[];
}

interface SoftSkill {
  name: string;
  category: string;
  score: number;
  indicators: string[];
  examples: string[];
}

interface SkillsAnalysisResult {
  hardSkills: HardSkill[];
  softSkills: SoftSkill[];
  overallProfile: string;
  careerSuggestions: string[];
}

class SkillsAnalyzer {
  private hardSkillsDatabase = {
    // Frontend
    frontend: [
      'react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'scss',
      'jsx', 'tailwind', 'bootstrap', 'jquery', 'webpack', 'vite', 'next.js', 'nuxt',
      'react native', 'flutter', 'ionic', 'cordova', 'electron'
    ],
    // Backend
    backend: [
      'node.js', 'express', 'fastify', 'nest.js', 'python', 'django', 'flask', 'java',
      'spring', 'php', 'laravel', 'c#', 'asp.net', 'ruby', 'rails', 'go', 'rust'
    ],
    // Banco de Dados
    database: [
      'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'sql server',
      'firebase', 'supabase', 'prisma', 'sequelize', 'mongoose', 'typeorm'
    ],
    // DevOps
    devops: [
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify',
      'ci/cd', 'jenkins', 'github actions', 'gitlab', 'terraform', 'ansible'
    ],
    // Ferramentas Tech
    tools: [
      'git', 'github', 'gitlab', 'vscode', 'figma', 'photoshop', 'postman', 'insomnia',
      'jira', 'trello', 'slack', 'discord', 'teams', 'notion'
    ],
    // Mobile
    mobile: [
      'android', 'ios', 'swift', 'kotlin', 'java mobile', 'xamarin', 'phonegap'
    ],
    // Data Science
    data: [
      'python data', 'pandas', 'numpy', 'matplotlib', 'tensorflow', 'pytorch',
      'machine learning', 'deep learning', 'data analysis', 'jupyter', 'r'
    ],
    // MECÂNICA E AUTOMÓVEIS
    mecanica: [
      'motor', 'transmissão', 'freios', 'suspensão', 'direção', 'chassi', 'carroceria',
      'injeção eletrônica', 'turbo', 'compressor', 'diferencial', 'embreagem',
      'escapamento', 'radiador', 'bomba dagua', 'alternador', 'bateria',
      'velas', 'filtros', 'óleo', 'pneus', 'rodas', 'amortecedores'
    ],
    // ELÉTRICA E ELETRÔNICA
    eletrica: [
      'circuitos', 'resistores', 'capacitores', 'transistores', 'diodos',
      'transformadores', 'motores elétricos', 'geradores', 'painéis elétricos',
      'automação', 'plc', 'arduino', 'raspberry pi', 'sensores', 'atuadores',
      'instalações elétricas', 'alta tensão', 'baixa tensão'
    ],
    // CONSTRUÇÃO CIVIL
    construcao: [
      'concreto', 'aço', 'madeira', 'alvenaria', 'fundações', 'estruturas',
      'hidráulica', 'saneamento', 'tubulações', 'soldas', 'revestimentos',
      'pisos', 'telhados', 'esquadrias', 'pintura', 'acabamentos',
      'autocad', 'projeto estrutural', 'orçamento de obra'
    ],
    // SAÚDE E ENFERMAGEM
    saude: [
      'anatomia', 'fisiologia', 'farmacologia', 'patologia', 'microbiologia',
      'primeiros socorros', 'curativos', 'medicamentos', 'injeções',
      'pressão arterial', 'glicemia', 'eletrocardiograma', 'raio-x',
      'esterilização', 'biossegurança', 'prontuário', 'sus'
    ],
    // ADMINISTRAÇÃO E NEGÓCIOS
    administracao: [
      'gestão', 'liderança', 'planejamento', 'organização', 'controle',
      'recursos humanos', 'marketing', 'vendas', 'finanças', 'contabilidade',
      'excel', 'word', 'powerpoint', 'erp', 'crm', 'logística',
      'estoque', 'compras', 'qualidade', 'processos'
    ],
    // DESIGN E CRIATIVIDADE
    design: [
      'photoshop', 'illustrator', 'indesign', 'corel draw', 'figma', 'sketch',
      'after effects', 'premiere', 'blender', '3ds max', 'maya',
      'tipografia', 'cores', 'composição', 'branding', 'logotipos',
      'ui design', 'ux design', 'prototipagem', 'wireframes'
    ],
    // CULINÁRIA E GASTRONOMIA
    culinaria: [
      'técnicas culinárias', 'cortes', 'temperos', 'molhos', 'massas',
      'carnes', 'peixes', 'vegetais', 'sobremesas', 'panificação',
      'confeitaria', 'decoração', 'apresentação', 'higiene', 'haccp',
      'custos', 'cardápio', 'fornecedores', 'equipamentos'
    ],
    // EDUCAÇÃO E PEDAGOGIA
    educacao: [
      'didática', 'pedagogia', 'psicologia educacional', 'metodologias',
      'avaliação', 'planejamento de aulas', 'gestão de sala',
      'tecnologias educacionais', 'inclusão', 'diversidade',
      'bncc', 'ldb', 'ppp', 'regimento escolar'
    ],
    // AGRICULTURA E AGROPECUÁRIA
    agricultura: [
      'plantio', 'colheita', 'irrigação', 'fertilizantes', 'defensivos',
      'solo', 'sementes', 'pragas', 'doenças', 'criação animal',
      'pastagem', 'nutrição animal', 'veterinária', 'zootecnia',
      'máquinas agrícolas', 'trator', 'arado', 'plantadeira'
    ],
    // ESTÉTICA E BELEZA
    estetica: [
      'cortes de cabelo', 'coloração', 'escova', 'tratamentos capilares',
      'manicure', 'pedicure', 'design de sobrancelhas', 'depilação',
      'limpeza de pele', 'hidratação', 'massagem', 'drenagem',
      'maquiagem', 'cílios', 'micropigmentação', 'laser'
    ],
    // VENDAS E COMERCIAL
    vendas: [
      'prospecção', 'abordagem', 'apresentação', 'objeções', 'fechamento',
      'pós-venda', 'relacionamento', 'crm', 'metas', 'comissão',
      'negociação', 'produtos', 'serviços', 'mercado', 'concorrência',
      'telemarketing', 'vendas online', 'e-commerce'
    ],
    // LOGÍSTICA E TRANSPORTE
    logistica: [
      'armazenagem', 'estoque', 'inventário', 'expedição', 'recebimento',
      'separação', 'conferência', 'embalagem', 'transporte',
      'distribuição', 'rota', 'frota', 'combustível', 'manutenção',
      'wms', 'código de barras', 'nf-e', 'sped'
    ]
  };

  private softSkillsPatterns = {
    comunicacao: {
      patterns: [
        'explicar', 'demonstrar', 'ensinar', 'mostrar', 'clarificar', 'apresentar',
        'passo a passo', 'de forma simples', 'vou mostrar', 'deixe-me explicar',
        'como vocês podem ver', 'é importante entender', 'vamos ver juntos'
      ],
      negativeWords: ['confuso', 'complicado', 'difícil de explicar']
    },
    lideranca: {
      patterns: [
        'experiência', 'recomendo', 'dica', 'orientação', 'coordenar', 'liderar',
        'melhores práticas', 'evitem', 'cuidado com', 'na minha experiência',
        'sempre faço assim', 'gerenciar', 'responsabilidade', 'tomar decisão'
      ],
      negativeWords: ['inseguro', 'não sei bem']
    },
    pensamentoCritico: {
      patterns: [
        'alternativa', 'comparando', 'analisando', 'avaliando', 'considerando',
        'prós e contras', 'vantagens', 'desvantagens', 'por outro lado',
        'seria melhor', 'mais eficiente', 'otimizar', 'refatorar'
      ],
      negativeWords: ['sempre uso', 'só conheço']
    },
    resolucaoProblemas: {
      patterns: [
        'problema', 'solução', 'debugging', 'erro', 'bug', 'investigar',
        'testar', 'corrigir', 'resolver', 'encontrar', 'identificar',
        'raiz do problema', 'causa', 'diagnóstico', 'troubleshooting'
      ],
      negativeWords: ['desisto', 'não consegui']
    },
    colaboracao: {
      patterns: [
        'equipe', 'time', 'colaborar', 'trabalhar junto', 'compartilhar',
        'ajudar', 'contribuir', 'feedback', 'sugestões', 'code review',
        'pair programming', 'reunião', 'alinhamento', 'brainstorm'
      ],
      negativeWords: ['sozinho sempre', 'não gosto de equipe']
    },
    adaptabilidade: {
      patterns: [
        'aprender', 'estudar', 'novo', 'mudança', 'adaptar', 'flexível',
        'tecnologia nova', 'framework novo', 'migrar', 'atualizar',
        'curso', 'tutorial', 'documentação', 'research', 'experimentar'
      ],
      negativeWords: ['resistente a mudança', 'prefiro o antigo']
    },
    organizacao: {
      patterns: [
        'planejar', 'organizar', 'estruturar', 'metodologia', 'processo',
        'cronograma', 'prazo', 'agenda', 'documentar', 'padronizar',
        'clean code', 'boas práticas', 'arquitetura', 'design pattern'
      ],
      negativeWords: ['bagunçado', 'desorganizado']
    },
    criatividade: {
      patterns: [
        'criativo', 'inovador', 'ideia', 'solução criativa', 'diferente',
        'abordagem nova', 'fora da caixa', 'design', 'interface',
        'experiência do usuário', 'ux', 'ui', 'wireframe', 'protótipo'
      ],
      negativeWords: ['sempre igual', 'sem criatividade']
    }
  };

  private coursePatterns = {
    // Tecnologia
    'curso técnico': ['frontend', 'backend', 'database'],
    'engenharia': ['backend', 'devops', 'database'],
    'design': ['frontend', 'tools', 'design'],
    'ciência da computação': ['backend', 'data', 'devops'],
    'análise de sistemas': ['backend', 'database', 'devops'],
    'informática': ['frontend', 'backend', 'tools'],
    
    // Outras Áreas
    'mecânica': ['mecanica', 'tools'],
    'automóveis': ['mecanica', 'eletrica'],
    'elétrica': ['eletrica', 'tools'],
    'eletrônica': ['eletrica', 'tools'],
    'construção civil': ['construcao', 'tools'],
    'engenharia civil': ['construcao', 'tools'],
    'enfermagem': ['saude', 'tools'],
    'medicina': ['saude', 'tools'],
    'administração': ['administracao', 'tools'],
    'gestão': ['administracao', 'tools'],
    'marketing': ['administracao', 'design'],
    'gastronomia': ['culinaria', 'tools'],
    'culinária': ['culinaria', 'tools'],
    'pedagogia': ['educacao', 'tools'],
    'educação': ['educacao', 'tools'],
    'agricultura': ['agricultura', 'tools'],
    'agropecuária': ['agricultura', 'tools'],
    'estética': ['estetica', 'tools'],
    'beleza': ['estetica', 'tools'],
    'vendas': ['vendas', 'administracao'],
    'comercial': ['vendas', 'administracao'],
    'logística': ['logistica', 'administracao']
  };

  private nlpAnalyzer: AdvancedNLPAnalyzer;

  constructor() {
    this.nlpAnalyzer = new AdvancedNLPAnalyzer();
  }

  /**
   * Analisa o texto usando NLP avançado para identificar competências
   * e gerar recomendações personalizadas baseadas no contexto
   */
  public analyzeTranscription(transcription: string): SkillsAnalysisResult {
    const text = transcription.toLowerCase();
    
    const hardSkills = this.extractHardSkills(text);
    
    // 🧠 USAR NLP AVANÇADO PARA SOFT SKILLS
    const advancedSoftSkills = this.nlpAnalyzer.analyzeAdvancedSoftSkills(transcription);
    const softSkills = this.convertAdvancedSoftSkills(advancedSoftSkills);
    
    const profile = this.generateProfile(hardSkills, softSkills);
    const suggestions = this.generateCareerSuggestions(hardSkills, softSkills);

    return {
      hardSkills,
      softSkills,
      overallProfile: profile,
      careerSuggestions: suggestions
    };
  }

  /**
   * Extrai hard skills do texto com análise contextual
   * para determinar o nível de confiança na identificação
   */
  private extractHardSkills(text: string): HardSkill[] {
    const skills: Map<string, HardSkill> = new Map();

    // Analisar cada categoria de hard skills
    Object.entries(this.hardSkillsDatabase).forEach(([category, skillsList]) => {
      skillsList.forEach(skill => {
        const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        
        if (matches) {
          const confidence = this.calculateHardSkillConfidence(skill, text);
          const context = this.extractContext(skill, text);
          
          if (confidence > 0.3) { // Só inclui se tem confiança mínima
            skills.set(skill, {
              name: skill.charAt(0).toUpperCase() + skill.slice(1),
              category: category,
              confidence: confidence,
              mentions: matches.length,
              context: context
            });
          }
        }
      });
    });

    // Analisar cursos mencionados para inferir skills
    this.inferSkillsFromCourses(text, skills);

    return Array.from(skills.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15); // Top 15 skills mais relevantes
  }

  private calculateHardSkillConfidence(skill: string, text: string): number {
    let confidence = 0;

    // Contextos que aumentam confiança
    const positiveContexts = [
      `estudo ${skill}`, `aprendo ${skill}`, `uso ${skill}`, `trabalho com ${skill}`,
      `projeto em ${skill}`, `experiência com ${skill}`, `curso de ${skill}`,
      `especialista em ${skill}`, `desenvolvedor ${skill}`
    ];

    const negativeContexts = [
      `não sei ${skill}`, `difícil ${skill}`, `nunca usei ${skill}`,
      `não entendo ${skill}`, `complicado ${skill}`
    ];

    // Calcular score baseado no contexto
    positiveContexts.forEach(context => {
      if (text.includes(context)) confidence += 0.3;
    });

    negativeContexts.forEach(context => {
      if (text.includes(context)) confidence -= 0.2;
    });

    // Score base por menção
    const mentions = (text.match(new RegExp(skill, 'gi')) || []).length;
    confidence += mentions * 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  private extractContext(skill: string, text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    const contexts: string[] = [];

    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes(skill.toLowerCase())) {
        contexts.push(sentence.trim());
      }
    });

    return contexts.slice(0, 3); // Top 3 contextos
  }

  private inferSkillsFromCourses(text: string, existingSkills: Map<string, HardSkill>): void {
    Object.entries(this.coursePatterns).forEach(([course, categories]) => {
      if (text.includes(course)) {
        categories.forEach(category => {
          const categorySkills = this.hardSkillsDatabase[category as keyof typeof this.hardSkillsDatabase];
          
          // Adiciona skills básicas da categoria se o curso for mencionado
          categorySkills.slice(0, 3).forEach(skill => {
            if (!existingSkills.has(skill)) {
              existingSkills.set(skill, {
                name: skill.charAt(0).toUpperCase() + skill.slice(1),
                category: category,
                confidence: 0.6, // Confiança média baseada no curso
                mentions: 1,
                context: [`Inferido de: ${course}`]
              });
            }
          });
        });
      }
    });
  }

  private formatSoftSkillName(skillKey: string): string {
    const names: Record<string, string> = {
      comunicacao: 'Comunicação',
      lideranca: 'Liderança',
      pensamentoCritico: 'Pensamento Crítico',
      resolucaoProblemas: 'Resolução de Problemas',
      colaboracao: 'Colaboração',
      adaptabilidade: 'Adaptabilidade',
      organizacao: 'Organização',
      criatividade: 'Criatividade'
    };

    return names[skillKey] || skillKey;
  }

  /**
   * Gera perfil e sugestões de carreira baseados
   * na análise combinada de hard skills e soft skills
   */
  private generateProfile(hardSkills: HardSkill[], softSkills: SoftSkill[]): string {
    const topHardSkill = hardSkills[0];
    const topSoftSkill = softSkills[0];

    if (!topHardSkill || !topSoftSkill) {
      return "Desenvolvedor em crescimento com potencial técnico e interpessoal.";
    }

    const profiles = [
      `Desenvolvedor ${topHardSkill.category} com forte ${topSoftSkill.name.toLowerCase()}.`,
      `Profissional técnico especializado em ${topHardSkill.name} e ${topSoftSkill.name.toLowerCase()}.`,
      `Desenvolvedor com expertise em ${topHardSkill.category} e excelente ${topSoftSkill.name.toLowerCase()}.`
    ];

    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  private generateCareerSuggestions(hardSkills: HardSkill[], softSkills: SoftSkill[]): string[] {
    const suggestions: string[] = [];
    
    // Baseado nas hard skills dominantes
    const categories = hardSkills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCategory) {
      const categoryMap: Record<string, string> = {
        // Tecnologia
        frontend: "Desenvolvedor Frontend Sênior",
        backend: "Engenheiro Backend",
        mobile: "Desenvolvedor Mobile",
        devops: "Engenheiro DevOps",
        data: "Cientista de Dados",
        database: "Arquiteto de Dados",
        tools: "Analista de Sistemas",
        
        // Outras Áreas
        mecanica: "Técnico em Mecânica Automotiva",
        eletrica: "Eletricista Industrial",
        construcao: "Engenheiro Civil",
        saude: "Técnico em Enfermagem",
        administracao: "Analista Administrativo",
        design: "Designer Gráfico",
        culinaria: "Chef de Cozinha",
        educacao: "Coordenador Pedagógico",
        agricultura: "Técnico Agrícola",
        estetica: "Esteticista Profissional",
        vendas: "Consultor de Vendas",
        logistica: "Analista de Logística"
      };

      suggestions.push(categoryMap[topCategory[0]] || "Profissional Especializado");
    }

    // Baseado nas soft skills
    const topSoftSkill = softSkills[0];
    if (topSoftSkill) {
      const softSkillMap: Record<string, string> = {
        'Liderança': "Coordenador de Equipe",
        'Comunicação': "Instrutor/Palestrante",
        'Pensamento Crítico': "Analista Estratégico", 
        'Resolução de Problemas': "Consultor Técnico",
        'Criatividade': "Designer/Criativo",
        'Colaboração': "Gestor de Projetos",
        'Adaptabilidade': "Especialista em Inovação",
        'Organização': "Supervisor de Processos"
      };

      const suggestion = softSkillMap[topSoftSkill.name];
      if (suggestion) suggestions.push(suggestion);
    }

    // Combinações interessantes por área
    if (hardSkills.some(s => s.category === 'mecanica') && 
        softSkills.some(s => s.name === 'Liderança')) {
      suggestions.push("Supervisor de Oficina");
    }
    
    if (hardSkills.some(s => s.category === 'saude') && 
        softSkills.some(s => s.name === 'Comunicação')) {
      suggestions.push("Educador em Saúde");
    }
    
    if (hardSkills.some(s => s.category === 'culinaria') && 
        softSkills.some(s => s.name === 'Criatividade')) {
      suggestions.push("Chef Criativo");
    }
    
    if (hardSkills.some(s => s.category === 'vendas') && 
        softSkills.some(s => s.name === 'Comunicação')) {
      suggestions.push("Gerente Comercial");
    }

    if (hardSkills.some(s => s.category === 'frontend') && 
        softSkills.some(s => s.name === 'Criatividade')) {
      suggestions.push("UI/UX Designer");
    }

    return [...new Set(suggestions)].slice(0, 3);
  }

  // 🔄 CONVERTER SOFT SKILLS AVANÇADAS PARA FORMATO PADRÃO
  private convertAdvancedSoftSkills(advancedSkills: any[]): SoftSkill[] {
    return advancedSkills.map(skill => ({
      name: skill.name,
      category: 'soft_skill',
      score: skill.score,
      indicators: skill.linguisticEvidence,
      examples: skill.behavioralIndicators.concat(skill.improvementSuggestions)
    }));
  }
}

export { SkillsAnalyzer, type SkillsAnalysisResult, type HardSkill, type SoftSkill }; 