import { CategorizedPhrase } from '@/types/api';

export function createCategorizedPhrase(params: {
  phrase: string;
  category: string;
  partOfSpeech: string;
  definition: string;
  difficulty: string;
  context: string;
  imageUrl: string;
  index: number;
  gender?: 'masculino' | 'femenino' | 'neutro';
  article?: string;
  conjugation?: string;
}): CategorizedPhrase {
  return {
    id: `phrase_${Date.now()}_${params.index}_${Math.random().toString(36).substr(2, 9)}`,
    phrase: params.phrase,
    definition: params.definition,
    category: params.category,
    partOfSpeech: params.partOfSpeech,
    difficulty: params.difficulty as 'beginner' | 'intermediate' | 'advanced',
    context: params.context,
    sortKey: createSortKey(params.phrase),
    saved: false,
    gender: params.gender,
    article: params.article,
    conjugation: params.conjugation,
    createdAt: new Date()
  };
}

export function createSortKey(phrase: string): string {
  // Remove articles and prepositions for alphabetical sorting
  const articlesRegex = /^(el |la |los |las |un |una |de |del |al |por |para |con |sin |sobre |bajo |entre |durante |según |hasta |desde |hacia |ante |tras )/i;
  return phrase.replace(articlesRegex, '').toLowerCase().trim();
}

export function inferGender(phrase: string): 'masculino' | 'femenino' | 'neutro' {
  // Spanish gender inference based on common endings
  const lowerPhrase = phrase.toLowerCase();
  
  // Feminine endings
  if (lowerPhrase.endsWith('a') || 
      lowerPhrase.endsWith('ción') || 
      lowerPhrase.endsWith('sión') || 
      lowerPhrase.endsWith('dad') ||
      lowerPhrase.endsWith('tad') ||
      lowerPhrase.endsWith('tud') ||
      lowerPhrase.endsWith('ez') ||
      lowerPhrase.endsWith('eza')) {
    return 'femenino';
  }
  
  // Masculine endings
  if (lowerPhrase.endsWith('o') || 
      lowerPhrase.endsWith('or') || 
      lowerPhrase.endsWith('án') ||
      lowerPhrase.endsWith('ón') ||
      lowerPhrase.endsWith('ín') ||
      lowerPhrase.endsWith('és')) {
    return 'masculino';
  }
  
  // Special cases
  const feminineWords = ['mano', 'foto', 'moto'];
  const masculineWords = ['día', 'mapa', 'problema', 'sistema', 'tema'];
  
  if (feminineWords.some(word => lowerPhrase.includes(word))) {
    return 'femenino';
  }
  
  if (masculineWords.some(word => lowerPhrase.includes(word))) {
    return 'masculino';
  }
  
  return 'neutro';
}

export function inferArticle(phrase: string): string {
  const gender = inferGender(phrase);
  const isPlural = phrase.endsWith('s') && !phrase.endsWith('és');
  
  if (gender === 'femenino') {
    return isPlural ? 'las' : 'la';
  }
  if (gender === 'masculino') {
    return isPlural ? 'los' : 'el';
  }
  return 'el'; // default
}

export function inferInfinitive(phrase: string): string {
  // Common Spanish verb conjugations to infinitive
  const conjugations: Record<string, string> = {
    // Present tense (3rd person singular)
    'está': 'estar',
    'es': 'ser',
    'tiene': 'tener',
    'hace': 'hacer',
    've': 'ver',
    'come': 'comer',
    'bebe': 'beber',
    'camina': 'caminar',
    'corre': 'correr',
    'salta': 'saltar',
    'habla': 'hablar',
    'escucha': 'escuchar',
    'mira': 'mirar',
    'toca': 'tocar',
    'juega': 'jugar',
    'lee': 'leer',
    'escribe': 'escribir',
    'vive': 'vivir',
    'abre': 'abrir',
    'cierra': 'cerrar',
    'piensa': 'pensar',
    'siente': 'sentir',
    'duerme': 'dormir',
    'puede': 'poder',
    'quiere': 'querer',
    'debe': 'deber',
    'va': 'ir',
    'viene': 'venir',
    'dice': 'decir',
    'da': 'dar',
    'pone': 'poner',
    'sale': 'salir',
    'entra': 'entrar',
    'llega': 'llegar',
    'busca': 'buscar',
    'encuentra': 'encontrar',
    'compra': 'comprar',
    'vende': 'vender',
    'trabaja': 'trabajar',
    'estudia': 'estudiar',
    'aprende': 'aprender',
    'enseña': 'enseñar'
  };
  
  const lowerPhrase = phrase.toLowerCase();
  return conjugations[lowerPhrase] || phrase;
}

export function inferCategory(partOfSpeech: string): string {
  const lower = partOfSpeech.toLowerCase();
  
  if (lower.includes('sustantivo') || lower.includes('noun')) {
    return 'sustantivos';
  }
  if (lower.includes('verbo') || lower.includes('verb')) {
    return 'verbos';
  }
  if (lower.includes('adjetivo') || lower.includes('adjective')) {
    return 'adjetivos';
  }
  if (lower.includes('adverbio') || lower.includes('adverb')) {
    return 'adverbios';
  }
  
  return 'frasesClaves';
}

export function generateContext(phrase: string, description: string): string {
  // Extract relevant context from description
  const sentences = description.split(/[.!?]+/);
  const relevantSentence = sentences.find(sentence => 
    sentence.toLowerCase().includes(phrase.toLowerCase())
  );
  
  if (relevantSentence) {
    return relevantSentence.trim();
  }
  
  // Generate contextual sentence if not found directly
  const contextStart = description.substring(0, 100);
  return `En el contexto de la imagen: "${phrase}" se relaciona con ${contextStart}...`;
}

export function sortPhrasesByCategory(phrases: CategorizedPhrase[]): Record<string, CategorizedPhrase[]> {
  const categorized: Record<string, CategorizedPhrase[]> = {
    sustantivos: [],
    verbos: [],
    adjetivos: [],
    adverbios: [],
    frasesClaves: []
  };
  
  phrases.forEach(phrase => {
    if (categorized[phrase.category]) {
      categorized[phrase.category].push(phrase);
    } else {
      categorized.frasesClaves.push(phrase);
    }
  });
  
  // Sort each category alphabetically by sortKey
  Object.keys(categorized).forEach(category => {
    categorized[category].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  });
  
  return categorized;
}

export function getDifficultyColor(level: string): string {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'advanced':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'sustantivos':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'verbos':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'adjetivos':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'adverbios':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    case 'frasesClaves':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}