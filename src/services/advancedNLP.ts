interface LinguisticFeatures {
  sentimentScore: number;        // -1 a 1 (negativo a positivo)
  confidenceLevel: number;       // 0 a 1 (incerto a muito confiante)
  complexityScore: number;       // 0 a 1 (simples a complexo)
  formalityLevel: number;        // 0 a 1 (informal a formal)
  enthusiasmLevel: number;       // 0 a 1 (apático a entusiasmado)
  clarityScore: number;          // 0 a 1 (confuso a claro)
  leadershipTone: number;        // 0 a 1 (seguidor a líder)
  collaborationSignals: number;  // 0 a 1 (individual a colaborativo)
}

interface SoftSkillAdvanced {
  name: string;
  score: number;                 // 0 a 100
  confidence: number;            // 0 a 100
  linguisticEvidence: string[];
  behavioralIndicators: string[];
  improvementSuggestions: string[];
}

class AdvancedNLPAnalyzer {
  
  // 🎯 ANÁLISE DE SENTIMENTOS E EMOÇÕES
  private analyzeSentiment(text: string): number {
    const positiveWords = [
      'excelente', 'ótimo', 'bom', 'gosto', 'adoro', 'amo', 'incrível', 'fantástico',
      'maravilhoso', 'perfeito', 'legal', 'bacana', 'interessante', 'empolgante',
      'motivado', 'feliz', 'satisfeito', 'orgulhoso', 'confiante', 'otimista'
    ];

    const negativeWords = [
      'ruim', 'péssimo', 'odeio', 'detesto', 'difícil', 'complicado', 'confuso',
      'frustrante', 'irritante', 'chato', 'entediante', 'desanimado', 'triste',
      'preocupado', 'nervoso', 'estressado', 'cansado', 'desapontado'
    ];

    let sentiment = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) sentiment += 1;
      if (negativeWords.includes(word)) sentiment -= 1;
    });

    // Normalizar entre -1 e 1
    return Math.max(-1, Math.min(1, sentiment / Math.max(words.length / 10, 1)));
  }

  // 🔍 ANÁLISE DE CONFIANÇA LINGUÍSTICA
  private analyzeConfidence(text: string): number {
    const confidentPhrases = [
      'tenho certeza', 'sei que', 'com certeza', 'definitivamente', 'claramente',
      'obviamente', 'sempre', 'nunca', 'sempre faço', 'minha experiência',
      'já fiz muitas vezes', 'domino', 'sou especialista', 'conheco bem'
    ];

    const uncertainPhrases = [
      'talvez', 'acho que', 'não sei', 'incerto', 'confuso', 'dúvida',
      'não tenho certeza', 'possivelmente', 'pode ser', 'não sei bem',
      'meio que', 'tipo assim', 'sei lá', 'não sei explicar'
    ];

    let confidenceScore = 0.5; // Base neutra
    const lowerText = text.toLowerCase();

    confidentPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) confidenceScore += 0.1;
    });

    uncertainPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) confidenceScore -= 0.15;
    });

    return Math.max(0, Math.min(1, confidenceScore));
  }

  // 📚 ANÁLISE DE COMPLEXIDADE LINGUÍSTICA
  private analyzeComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    
    // Métricas de complexidade
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const longWords = words.filter(word => word.length > 6).length;
    const longWordRatio = longWords / words.length;
    
    const technicalTerms = [
      'implementação', 'funcionalidade', 'algoritmo', 'arquitetura', 'metodologia',
      'otimização', 'performance', 'escalabilidade', 'manutenibilidade', 'eficiência',
      'paradigma', 'framework', 'biblioteca', 'infraestrutura', 'deploy'
    ];

    const technicalCount = technicalTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length;

    // Score composto
    const complexity = (
      (avgWordsPerSentence / 20) * 0.3 +     // Sentenças mais longas
      longWordRatio * 0.4 +                   // Palavras mais complexas
      (technicalCount / 10) * 0.3            // Termos técnicos
    );

    return Math.min(1, complexity);
  }

  // 👑 ANÁLISE DE TOM DE LIDERANÇA
  private analyzeLeadershipTone(text: string): number {
    const leadershipIndicators = [
      // Direcionamento e Orientação
      'recomendo', 'sugiro', 'aconselho', 'orienta', 'indica', 'dica',
      'melhores práticas', 'devemos', 'precisamos', 'importante fazer',
      
      // Experiência e Autoridade
      'na minha experiência', 'já vi', 'já passei por', 'aprendi que',
      'posso garantir', 'sei por experiência', 'sempre faço assim',
      
      // Tomada de Decisão
      'decidi', 'escolhi', 'optei por', 'determinei', 'estabeleci',
      'defini', 'priorizei', 'organizei', 'coordenei', 'gerenciei',
      
      // Responsabilidade
      'responsável por', 'encarregado de', 'liderando', 'coordenando',
      'gerenciando', 'supervisionando', 'orientando', 'guiando'
    ];

    const followerIndicators = [
      'não sei', 'inseguro', 'talvez', 'não tenho certeza',
      'sigo orientação', 'faço o que mandam', 'apenas executo',
      'não tomo decisões', 'sempre pergunto', 'preciso de ajuda'
    ];

    let leadershipScore = 0.5; // Base neutra
    const lowerText = text.toLowerCase();

    leadershipIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) leadershipScore += 0.08;
    });

    followerIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) leadershipScore -= 0.12;
    });

    return Math.max(0, Math.min(1, leadershipScore));
  }

  // 🤝 ANÁLISE DE COLABORAÇÃO
  private analyzeCollaboration(text: string): number {
    const collaborationSignals = [
      // Trabalho em Equipe
      'equipe', 'time', 'grupo', 'colegas', 'parceiros', 'juntos',
      'trabalhamos juntos', 'fizemos em grupo', 'colaboramos',
      
      // Comunicação e Feedback
      'feedback', 'sugestões', 'opiniões', 'conversamos', 'discutimos',
      'alinhamos', 'reunimos', 'brainstorm', 'ideias compartilhadas',
      
      // Suporte e Ajuda
      'ajudo', 'apoio', 'contribuo', 'compartilho', 'ensino',
      'aprendo com outros', 'code review', 'pair programming',
      
      // Inclusão e Diversidade
      'todos', 'cada um', 'diferentes perspectivas', 'respeitamos',
      'valorizamos', 'incluímos', 'diversidade', 'todos participam'
    ];

    const individualisticSignals = [
      'sozinho', 'individual', 'apenas eu', 'faço tudo', 'não preciso de ajuda',
      'prefiro trabalhar sozinho', 'não gosto de equipe', 'independente',
      'melhor sozinho', 'sem interferência'
    ];

    let collaborationScore = 0.5;
    const lowerText = text.toLowerCase();

    collaborationSignals.forEach(signal => {
      if (lowerText.includes(signal)) collaborationScore += 0.06;
    });

    individualisticSignals.forEach(signal => {
      if (lowerText.includes(signal)) collaborationScore -= 0.15;
    });

    return Math.max(0, Math.min(1, collaborationScore));
  }

  // 🧠 ANÁLISE DE PENSAMENTO CRÍTICO
  private analyzeCriticalThinking(text: string): number {
    const criticalThinkingMarkers = [
      // Análise Comparativa
      'comparando', 'versus', 'diferença entre', 'vantagens', 'desvantagens',
      'prós e contras', 'por outro lado', 'em contrapartida', 'alternativa',
      
      // Avaliação e Julgamento
      'analisando', 'avaliando', 'considerando', 'examinando', 'investigando',
      'questionando', 'duvidando', 'verificando', 'testando',
      
      // Síntese e Conclusões
      'portanto', 'assim', 'logo', 'consequentemente', 'resultando em',
      'concluindo', 'inferindo', 'deduzindo', 'baseado nisso',
      
      // Eficiência e Otimização
      'melhor forma', 'mais eficiente', 'otimizar', 'aprimorar',
      'refatorar', 'reorganizar', 'reestruturar', 'melhorar'
    ];

    const uncriticalMarkers = [
      'sempre uso', 'só conheço', 'nunca pensei', 'aceito assim',
      'não questiono', 'faço igual', 'copio', 'sigo cegamente',
      'não analiso', 'primeiro que aparece'
    ];

    let criticalScore = 0.4;
    const lowerText = text.toLowerCase();

    criticalThinkingMarkers.forEach(marker => {
      if (lowerText.includes(marker)) criticalScore += 0.08;
    });

    uncriticalMarkers.forEach(marker => {
      if (lowerText.includes(marker)) criticalScore -= 0.12;
    });

    return Math.max(0, Math.min(1, criticalScore));
  }

  // 🎯 ANÁLISE PRINCIPAL DE SOFT SKILLS AVANÇADA
  public analyzeAdvancedSoftSkills(text: string): SoftSkillAdvanced[] {
    const features = this.extractLinguisticFeatures(text);
    const softSkills: SoftSkillAdvanced[] = [];

    // 🗣️ COMUNICAÇÃO (baseada em clareza, estrutura e didática)
    const communicationScore = this.calculateCommunicationSkill(text, features);
    if (communicationScore.score > 40) {
      softSkills.push(communicationScore);
    }

    // 👑 LIDERANÇA (baseada em tom assertivo e direcionamento)
    const leadershipScore = this.calculateLeadershipSkill(text, features);
    if (leadershipScore.score > 35) {
      softSkills.push(leadershipScore);
    }

    // 🧠 PENSAMENTO CRÍTICO (baseada em análise e comparação)
    const criticalThinkingScore = this.calculateCriticalThinkingSkill(text, features);
    if (criticalThinkingScore.score > 40) {
      softSkills.push(criticalThinkingScore);
    }

    // 🤝 COLABORAÇÃO (baseada em linguagem inclusiva)
    const collaborationScore = this.calculateCollaborationSkill(text, features);
    if (collaborationScore.score > 35) {
      softSkills.push(collaborationScore);
    }

    // 📚 ADAPTABILIDADE (baseada em abertura a mudanças)
    const adaptabilityScore = this.calculateAdaptabilitySkill(text, features);
    if (adaptabilityScore.score > 30) {
      softSkills.push(adaptabilityScore);
    }

    return softSkills.sort((a, b) => b.score - a.score);
  }

  private extractLinguisticFeatures(text: string): LinguisticFeatures {
    return {
      sentimentScore: this.analyzeSentiment(text),
      confidenceLevel: this.analyzeConfidence(text),
      complexityScore: this.analyzeComplexity(text),
      formalityLevel: this.analyzeFormalityLevel(text),
      enthusiasmLevel: this.analyzeEnthusiasm(text),
      clarityScore: this.analyzeClarityScore(text),
      leadershipTone: this.analyzeLeadershipTone(text),
      collaborationSignals: this.analyzeCollaboration(text)
    };
  }

  private analyzeFormalityLevel(text: string): number {
    const formalWords = ['implementar', 'utilizar', 'desenvolver', 'estabelecer', 'realizar'];
    const informalWords = ['fazer', 'usar', 'dar uma olhada', 'tipo assim', 'né', 'cara'];
    
    const words = text.toLowerCase().split(/\s+/);
    let formalityScore = 0.5;
    
    words.forEach(word => {
      if (formalWords.includes(word)) formalityScore += 0.05;
      if (informalWords.includes(word)) formalityScore -= 0.05;
    });
    
    return Math.max(0, Math.min(1, formalityScore));
  }

  private analyzeEnthusiasm(text: string): number {
    const enthusiasticMarkers = ['!', 'incrível', 'fantástico', 'adoro', 'amo', 'empolgante'];
    let enthusiasm = 0;
    
    enthusiasticMarkers.forEach(marker => {
      enthusiasm += (text.match(new RegExp(marker, 'gi')) || []).length;
    });
    
    return Math.min(1, enthusiasm / 5);
  }

  private analyzeClarityScore(text: string): number {
    const clarityMarkers = ['primeiro', 'segundo', 'depois', 'então', 'por exemplo', 'ou seja'];
    const confusionMarkers = ['meio que', 'tipo assim', 'sei lá', 'confuso'];
    
    let clarity = 0.5;
    const lowerText = text.toLowerCase();
    
    clarityMarkers.forEach(marker => {
      if (lowerText.includes(marker)) clarity += 0.1;
    });
    
    confusionMarkers.forEach(marker => {
      if (lowerText.includes(marker)) clarity -= 0.15;
    });
    
    return Math.max(0, Math.min(1, clarity));
  }

  private calculateCommunicationSkill(text: string, features: LinguisticFeatures): SoftSkillAdvanced {
    const score = Math.round(
      (features.clarityScore * 0.4 +
       features.confidenceLevel * 0.3 +
       features.formalityLevel * 0.2 +
       (1 - features.complexityScore) * 0.1) * 100
    );

    return {
      name: 'Comunicação',
      score,
      confidence: Math.round((features.confidenceLevel + features.clarityScore) * 50),
      linguisticEvidence: [
        `Clareza: ${Math.round(features.clarityScore * 100)}%`,
        `Confiança: ${Math.round(features.confidenceLevel * 100)}%`,
        `Formalidade: ${Math.round(features.formalityLevel * 100)}%`
      ],
      behavioralIndicators: [
        'Estrutura organizada de explicação',
        'Uso de exemplos e analogias',
        'Linguagem clara e acessível'
      ],
      improvementSuggestions: score < 70 ? [
        'Use mais exemplos práticos',
        'Estruture melhor as explicações',
        'Seja mais confiante nas afirmações'
      ] : ['Continue desenvolvendo a didática']
    };
  }

  private calculateLeadershipSkill(text: string, features: LinguisticFeatures): SoftSkillAdvanced {
    const score = Math.round(
      (features.leadershipTone * 0.5 +
       features.confidenceLevel * 0.3 +
       features.formalityLevel * 0.2) * 100
    );

    return {
      name: 'Liderança',
      score,
      confidence: Math.round((features.leadershipTone + features.confidenceLevel) * 50),
      linguisticEvidence: [
        `Tom de liderança: ${Math.round(features.leadershipTone * 100)}%`,
        `Assertividade: ${Math.round(features.confidenceLevel * 100)}%`
      ],
      behavioralIndicators: [
        'Fornece direcionamentos claros',
        'Compartilha experiências pessoais',
        'Toma posições definidas'
      ],
      improvementSuggestions: score < 60 ? [
        'Seja mais assertivo nas recomendações',
        'Compartilhe mais experiências pessoais',
        'Use linguagem mais direcionadora'
      ] : ['Desenvolva habilidades de mentoria']
    };
  }

  private calculateCriticalThinkingSkill(text: string, features: LinguisticFeatures): SoftSkillAdvanced {
    const criticalScore = this.analyzeCriticalThinking(text);
    const score = Math.round(
      (criticalScore * 0.6 +
       features.complexityScore * 0.3 +
       features.confidenceLevel * 0.1) * 100
    );

    return {
      name: 'Pensamento Crítico',
      score,
      confidence: Math.round((criticalScore + features.complexityScore) * 50),
      linguisticEvidence: [
        `Análise comparativa: ${Math.round(criticalScore * 100)}%`,
        `Complexidade de raciocínio: ${Math.round(features.complexityScore * 100)}%`
      ],
      behavioralIndicators: [
        'Compara alternativas',
        'Avalia prós e contras',
        'Questiona abordagens'
      ],
      improvementSuggestions: score < 60 ? [
        'Compare mais alternativas',
        'Analise prós e contras',
        'Questione soluções existentes'
      ] : ['Desenvolva análises mais profundas']
    };
  }

  private calculateCollaborationSkill(text: string, features: LinguisticFeatures): SoftSkillAdvanced {
    const score = Math.round(
      (features.collaborationSignals * 0.7 +
       features.sentimentScore * 0.2 +
       (1 - features.complexityScore) * 0.1) * 100
    );

    return {
      name: 'Colaboração',
      score,
      confidence: Math.round((features.collaborationSignals + (features.sentimentScore + 1) / 2) * 50),
      linguisticEvidence: [
        `Sinais de colaboração: ${Math.round(features.collaborationSignals * 100)}%`,
        `Tom positivo: ${Math.round((features.sentimentScore + 1) * 50)}%`
      ],
      behavioralIndicators: [
        'Menciona trabalho em equipe',
        'Valoriza diferentes perspectivas',
        'Linguagem inclusiva'
      ],
      improvementSuggestions: score < 50 ? [
        'Mencione mais trabalho em equipe',
        'Use linguagem mais inclusiva',
        'Valorize contribuições de outros'
      ] : ['Continue promovendo colaboração']
    };
  }

  private calculateAdaptabilitySkill(text: string, features: LinguisticFeatures): SoftSkillAdvanced {
    const adaptabilityMarkers = [
      'aprender', 'novo', 'mudança', 'adaptar', 'atualizar', 'migrar',
      'experimentar', 'testar', 'pesquisar', 'estudar', 'curso'
    ];

    let adaptabilityScore = 0;
    const lowerText = text.toLowerCase();
    
    adaptabilityMarkers.forEach(marker => {
      if (lowerText.includes(marker)) adaptabilityScore += 0.1;
    });

    const score = Math.round(
      (Math.min(1, adaptabilityScore) * 0.6 +
       features.enthusiasmLevel * 0.3 +
       features.sentimentScore * 0.1) * 100
    );

    return {
      name: 'Adaptabilidade',
      score,
      confidence: Math.round((Math.min(1, adaptabilityScore) + features.enthusiasmLevel) * 50),
      linguisticEvidence: [
        `Abertura a mudanças: ${Math.round(Math.min(1, adaptabilityScore) * 100)}%`,
        `Entusiasmo: ${Math.round(features.enthusiasmLevel * 100)}%`
      ],
      behavioralIndicators: [
        'Interesse em aprender',
        'Abertura a novas tecnologias',
        'Mentalidade de crescimento'
      ],
      improvementSuggestions: score < 50 ? [
        'Demonstre mais interesse em aprender',
        'Mencione cursos e atualizações',
        'Mostre abertura a mudanças'
      ] : ['Continue se mantendo atualizado']
    };
  }
}

export { AdvancedNLPAnalyzer, type SoftSkillAdvanced, type LinguisticFeatures }; 