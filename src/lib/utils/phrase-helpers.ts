import { CategorizedPhrase } from "@/types/api";

export function createCategorizedPhrase(params: {
  phrase: string;
  category: string;
  partOfSpeech: string;
  definition: string;
  difficulty: string;
  context: string;
  imageUrl: string;
  index: number;
  gender?: "masculino" | "femenino" | "neutro";
  article?: string;
  conjugation?: string;
}): CategorizedPhrase {
  return {
    id: `phrase_${Date.now()}_${params.index}_${Math.random().toString(36).substr(2, 9)}`,
    phrase: params.phrase,
    definition: params.definition,
    category: params.category,
    partOfSpeech: params.partOfSpeech,
    difficulty: params.difficulty as "beginner" | "intermediate" | "advanced",
    context: params.context,
    sortKey: createSortKey(params.phrase),
    saved: false,
    gender: params.gender,
    article: params.article,
    conjugation: params.conjugation,
    createdAt: new Date(),
  };
}

export function createSortKey(phrase: string): string {
  // Remove articles and prepositions for alphabetical sorting
  const articlesRegex =
    /^(el |la |los |las |un |una |de |del |al |por |para |con |sin |sobre |bajo |entre |durante |según |hasta |desde |hacia |ante |tras )/i;
  return phrase.replace(articlesRegex, "").toLowerCase().trim();
}

export function inferGender(
  phrase: string,
): "masculino" | "femenino" | "neutro" {
  // Spanish gender inference based on common endings
  const lowerPhrase = phrase.toLowerCase();

  // Feminine endings
  if (
    lowerPhrase.endsWith("a") ||
    lowerPhrase.endsWith("ción") ||
    lowerPhrase.endsWith("sión") ||
    lowerPhrase.endsWith("dad") ||
    lowerPhrase.endsWith("tad") ||
    lowerPhrase.endsWith("tud") ||
    lowerPhrase.endsWith("ez") ||
    lowerPhrase.endsWith("eza")
  ) {
    return "femenino";
  }

  // Masculine endings
  if (
    lowerPhrase.endsWith("o") ||
    lowerPhrase.endsWith("or") ||
    lowerPhrase.endsWith("án") ||
    lowerPhrase.endsWith("ón") ||
    lowerPhrase.endsWith("ín") ||
    lowerPhrase.endsWith("és")
  ) {
    return "masculino";
  }

  // Special cases
  const feminineWords = ["mano", "foto", "moto"];
  const masculineWords = ["día", "mapa", "problema", "sistema", "tema"];

  if (feminineWords.some((word) => lowerPhrase.includes(word))) {
    return "femenino";
  }

  if (masculineWords.some((word) => lowerPhrase.includes(word))) {
    return "masculino";
  }

  return "neutro";
}

export function inferArticle(phrase: string): string {
  const gender = inferGender(phrase);
  const isPlural = phrase.endsWith("s") && !phrase.endsWith("és");

  if (gender === "femenino") {
    return isPlural ? "las" : "la";
  }
  if (gender === "masculino") {
    return isPlural ? "los" : "el";
  }
  return "el"; // default
}

export function inferInfinitive(phrase: string): string {
  // Common Spanish verb conjugations to infinitive
  const conjugations: Record<string, string> = {
    // Present tense (3rd person singular)
    está: "estar",
    es: "ser",
    tiene: "tener",
    hace: "hacer",
    ve: "ver",
    come: "comer",
    bebe: "beber",
    camina: "caminar",
    corre: "correr",
    salta: "saltar",
    habla: "hablar",
    escucha: "escuchar",
    mira: "mirar",
    toca: "tocar",
    juega: "jugar",
    lee: "leer",
    escribe: "escribir",
    vive: "vivir",
    abre: "abrir",
    cierra: "cerrar",
    piensa: "pensar",
    siente: "sentir",
    duerme: "dormir",
    puede: "poder",
    quiere: "querer",
    debe: "deber",
    va: "ir",
    viene: "venir",
    dice: "decir",
    da: "dar",
    pone: "poner",
    sale: "salir",
    entra: "entrar",
    llega: "llegar",
    busca: "buscar",
    encuentra: "encontrar",
    compra: "comprar",
    vende: "vender",
    trabaja: "trabajar",
    estudia: "estudiar",
    aprende: "aprender",
    enseña: "enseñar",
  };

  const lowerPhrase = phrase.toLowerCase();
  return conjugations[lowerPhrase] || phrase;
}

export function inferCategory(partOfSpeech: string): string {
  const lower = partOfSpeech.toLowerCase();

  if (lower.includes("sustantivo") || lower.includes("noun")) {
    return "sustantivos";
  }
  if (lower.includes("verbo") || lower.includes("verb")) {
    return "verbos";
  }
  if (lower.includes("adjetivo") || lower.includes("adjective")) {
    return "adjetivos";
  }
  if (lower.includes("adverbio") || lower.includes("adverb")) {
    return "adverbios";
  }

  return "frasesClaves";
}

export function generateContext(phrase: string, description: string): string {
  // Extract relevant context from description
  const sentences = description.split(/[.!?]+/);
  const relevantSentence = sentences.find((sentence) =>
    sentence.toLowerCase().includes(phrase.toLowerCase()),
  );

  if (relevantSentence) {
    return relevantSentence.trim();
  }

  // Generate contextual sentence if not found directly
  const contextStart = description.substring(0, 100);
  return `En el contexto de la imagen: "${phrase}" se relaciona con ${contextStart}...`;
}

export function sortPhrasesByCategory(
  phrases: CategorizedPhrase[],
): Record<string, CategorizedPhrase[]> {
  const categorized: Record<string, CategorizedPhrase[]> = {
    sustantivos: [],
    verbos: [],
    adjetivos: [],
    adverbios: [],
    frasesClaves: [],
  };

  phrases.forEach((phrase) => {
    if (categorized[phrase.category]) {
      categorized[phrase.category].push(phrase);
    } else {
      categorized.frasesClaves.push(phrase);
    }
  });

  // Sort each category alphabetically by sortKey
  Object.keys(categorized).forEach((category) => {
    categorized[category].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  });

  return categorized;
}

export function getDifficultyColor(level: string): string {
  switch (level) {
    case "beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
    case "advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
  }
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case "sustantivos":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    case "verbos":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    case "adjetivos":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
    case "adverbios":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
    case "frasesClaves":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
  }
}

/**
 * Extract key phrases from text
 */
export function extractKeyPhrases(
  text: string,
  maxPhrases: number = 10
): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Simple extraction based on common patterns
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const phrases: string[] = [];
  
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/).filter(w => w.length > 2);
    
    // Extract noun phrases (basic pattern matching)
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words.slice(i, i + 2).join(' ').toLowerCase();
      if (phrase.length > 4 && !phrases.includes(phrase)) {
        phrases.push(phrase);
      }
    }
    
    // Extract longer phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
      if (phrase.length > 8 && !phrases.includes(phrase)) {
        phrases.push(phrase);
      }
    }
  });
  
  return phrases.slice(0, maxPhrases);
}

/**
 * Analyze sentiment of text (basic implementation)
 */
export function analyzeSentiment(
  text: string
): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  if (!text || typeof text !== 'string') {
    return { score: 0, label: 'neutral' };
  }

  const positiveWords = [
    'bueno', 'bien', 'excelente', 'fantástico', 'perfecto', 'increíble',
    'hermoso', 'maravilloso', 'genial', 'feliz', 'alegre', 'contento'
  ];
  
  const negativeWords = [
    'malo', 'terrible', 'horrible', 'triste', 'enojado', 'molesto',
    'difícil', 'problemático', 'feo', 'desagradable', 'aburrido'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) {
      score += 1;
    } else if (negativeWords.includes(word)) {
      score -= 1;
    }
  });
  
  // Normalize score
  const normalizedScore = Math.max(-1, Math.min(1, score / words.length * 10));
  
  let label: 'positive' | 'negative' | 'neutral';
  if (normalizedScore > 0.1) {
    label = 'positive';
  } else if (normalizedScore < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  return { score: normalizedScore, label };
}

/**
 * Get difficulty level based on word characteristics
 */
export function getDifficultyLevel(
  phrase: string,
  context?: string
): 'beginner' | 'intermediate' | 'advanced' {
  if (!phrase || typeof phrase !== 'string') {
    return 'beginner';
  }
  
  const words = phrase.split(/\s+/);
  let difficultyScore = 0;
  
  // Length factor
  if (words.length > 3) difficultyScore += 1;
  if (phrase.length > 15) difficultyScore += 1;
  
  // Common beginnerWords
  const beginnerWords = [
    'el', 'la', 'y', 'de', 'que', 'a', 'en', 'un', 'es', 'se',
    'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para',
    'casa', 'gato', 'perro', 'agua', 'comida', 'familia', 'amigo'
  ];
  
  // Check for beginner words
  const hasBeginnerWords = words.some(word => 
    beginnerWords.includes(word.toLowerCase())
  );
  
  if (!hasBeginnerWords) difficultyScore += 2;
  
  // Complex grammar patterns
  if (phrase.includes('que') && phrase.includes('se')) difficultyScore += 1;
  if (phrase.includes('habría') || phrase.includes('hubiera')) difficultyScore += 2;
  
  // Context complexity
  if (context && context.length > 100) difficultyScore += 1;
  
  if (difficultyScore >= 4) return 'advanced';
  if (difficultyScore >= 2) return 'intermediate';
  return 'beginner';
}

/**
 * Generate context sentence for a phrase
 */
export function generateContextSentence(
  phrase: string,
  baseContext?: string
): string {
  if (!phrase || typeof phrase !== 'string') {
    return '';
  }
  
  // If we have base context, try to extract a relevant sentence
  if (baseContext) {
    const sentences = baseContext.split(/[.!?]+/);
    const relevantSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (relevantSentence && relevantSentence.trim().length > 0) {
      return relevantSentence.trim();
    }
  }
  
  // Generate a basic context sentence
  const templates = [
    `En esta imagen podemos ver ${phrase}.`,
    `La imagen muestra ${phrase} claramente.`,
    `Se puede observar ${phrase} en la fotografía.`,
    `${phrase} aparece en la imagen.`,
    `La foto presenta ${phrase} de manera evidente.`
  ];
  
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate;
}

/**
 * Categorize phrase based on its characteristics
 */
export function categorizePhrase(
  phrase: string,
  partOfSpeech?: string
): string {
  if (!phrase || typeof phrase !== 'string') {
    return 'frasesClaves';
  }
  
  // Use part of speech if provided
  if (partOfSpeech) {
    return inferCategory(partOfSpeech);
  }
  
  // Basic categorization based on phrase structure
  const lower = phrase.toLowerCase().trim();
  
  // Check for verb patterns
  const verbEndings = ['ar', 'er', 'ir', 'ando', 'iendo', 'ado', 'ido'];
  const hasVerbEnding = verbEndings.some(ending => 
    lower.endsWith(ending) || lower.includes(` ${ending}`)
  );
  
  if (hasVerbEnding || lower.includes('se ') || lower.startsWith('es ') || lower.startsWith('está ')) {
    return 'verbos';
  }
  
  // Check for adjective patterns
  if (lower.includes('muy ') || lower.includes('más ') || lower.includes('menos ')) {
    return 'adjetivos';
  }
  
  // Check for adverb patterns
  if (lower.endsWith('mente') || lower.includes('muy') || lower.includes('bien') || lower.includes('mal')) {
    return 'adverbios';
  }
  
  // Check for noun patterns (articles)
  if (lower.startsWith('el ') || lower.startsWith('la ') || 
      lower.startsWith('los ') || lower.startsWith('las ') ||
      lower.startsWith('un ') || lower.startsWith('una ')) {
    return 'sustantivos';
  }
  
  // Default to key phrases
  return 'frasesClaves';
}
