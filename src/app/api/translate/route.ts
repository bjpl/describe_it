import { NextRequest, NextResponse } from 'next/server';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

interface TranslationRequest {
  text: string;
  context?: string;
  targetLanguage: string;
  sourceLanguage: string;
}

interface TranslationResponse {
  translation: string;
  confidence: number;
  detectedLanguage?: string;
}

/**
 * Translation API Endpoint - Agent Gamma-3 Integration
 * Provides automatic translation for vocabulary phrases
 */
export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json();
    const { text, targetLanguage, sourceLanguage, context } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required for translation' },
        { status: 400 }
      );
    }

    if (!targetLanguage || !sourceLanguage) {
      return NextResponse.json(
        { error: 'Both source and target languages are required' },
        { status: 400 }
      );
    }

    // Validate language codes
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];
    if (!supportedLanguages.includes(targetLanguage) || !supportedLanguages.includes(sourceLanguage)) {
      return NextResponse.json(
        { error: 'Unsupported language code' },
        { status: 400 }
      );
    }

    // For development, use OpenAI for translation if available
    // Otherwise, provide intelligent mock translations
    let translation: string;
    let confidence: number = 0.95;

    if (process.env.OPENAI_API_KEY) {
      try {
        translation = await translateWithOpenAI(text, sourceLanguage, targetLanguage, context);
      } catch (error) {
        logger.warn('OpenAI translation error, falling back to mock', {
          error: error instanceof Error ? error.message : String(error),
          component: 'translate-api',
          sourceLanguage,
          targetLanguage,
          textLength: text.length
        });
        translation = await getMockTranslation(text, sourceLanguage, targetLanguage);
        confidence = 0.85;
      }
    } else {
      translation = await getMockTranslation(text, sourceLanguage, targetLanguage);
      confidence = 0.85;
    }

    const response: TranslationResponse = {
      translation,
      confidence,
      detectedLanguage: sourceLanguage
    };

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Translation API error', error instanceof Error ? error : new Error(String(error)), {
      component: 'translate-api',
      sourceLanguage: 'unknown',
      targetLanguage: 'unknown',
      textLength: 0
    });
    
    logApiResponse('POST', '/api/translate', 500);
    return NextResponse.json(
      { 
        error: 'Internal server error during translation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Translate using OpenAI GPT
 */
async function translateWithOpenAI(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context?: string
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const languageMap: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese'
  };

  const sourceLang = languageMap[sourceLanguage] || sourceLanguage;
  const targetLang = languageMap[targetLanguage] || targetLanguage;

  let prompt = `Translate the following ${sourceLang} text to ${targetLang}: "${text}"`;
  
  if (context) {
    prompt += `\n\nContext: ${context}`;
    prompt += `\n\nProvide a natural, contextually appropriate translation. If this is a vocabulary word or phrase, provide the most common translation.`;
  }

  prompt += `\n\nOnly return the translation, no explanations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in vocabulary and phrase translation. Provide accurate, natural translations that preserve meaning and context.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || text;
}

/**
 * Provide intelligent mock translations
 * This is used when OpenAI is not available or as fallback
 */
async function getMockTranslation(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));

  // Spanish to English translations (most common for this app)
  const spanishToEnglishDict: Record<string, string> = {
    // Common nouns
    'casa': 'house',
    'gato': 'cat',
    'perro': 'dog',
    'agua': 'water',
    'libro': 'book',
    'mesa': 'table',
    'silla': 'chair',
    'árbol': 'tree',
    'flor': 'flower',
    'sol': 'sun',
    'luna': 'moon',
    'estrella': 'star',
    'ciudad': 'city',
    'pueblo': 'town',
    'montaña': 'mountain',
    'mar': 'sea',
    'río': 'river',
    'lago': 'lake',
    'bosque': 'forest',
    'jardín': 'garden',
    'coche': 'car',
    'avión': 'airplane',
    'tren': 'train',
    'bicicleta': 'bicycle',
    
    // Common verbs
    'ser': 'to be',
    'estar': 'to be',
    'tener': 'to have',
    'hacer': 'to do/make',
    'ir': 'to go',
    'venir': 'to come',
    'ver': 'to see',
    'decir': 'to say',
    'hablar': 'to speak',
    'comer': 'to eat',
    'beber': 'to drink',
    'dormir': 'to sleep',
    'caminar': 'to walk',
    'correr': 'to run',
    'saltar': 'to jump',
    'leer': 'to read',
    'escribir': 'to write',
    'estudiar': 'to study',
    'trabajar': 'to work',
    'jugar': 'to play',
    'cantar': 'to sing',
    'bailar': 'to dance',
    'cocinar': 'to cook',
    'limpiar': 'to clean',
    'comprar': 'to buy',
    'vender': 'to sell',
    
    // Common adjectives
    'grande': 'big/large',
    'pequeño': 'small',
    'alto': 'tall/high',
    'bajo': 'short/low',
    'gordo': 'fat',
    'delgado': 'thin',
    'bonito': 'pretty',
    'feo': 'ugly',
    'bueno': 'good',
    'malo': 'bad',
    'nuevo': 'new',
    'viejo': 'old',
    'joven': 'young',
    'rápido': 'fast',
    'lento': 'slow',
    'fácil': 'easy',
    'difícil': 'difficult',
    'importante': 'important',
    'interesante': 'interesting',
    'aburrido': 'boring',
    
    // Common adverbs
    'muy': 'very',
    'bien': 'well',
    'mal': 'badly',
    'aquí': 'here',
    'allí': 'there',
    'ahora': 'now',
    'después': 'after/later',
    'antes': 'before',
    'siempre': 'always',
    'nunca': 'never',
    'también': 'also',
    'solo': 'only',
    'mucho': 'much/a lot',
    'poco': 'little',
    'más': 'more',
    'menos': 'less',
    'rápidamente': 'quickly',
    'lentamente': 'slowly',
    
    // Common phrases
    'buenos días': 'good morning',
    'buenas tardes': 'good afternoon',
    'buenas noches': 'good night',
    'por favor': 'please',
    'muchas gracias': 'thank you very much',
    'de nada': 'you\'re welcome',
    '¿cómo estás?': 'how are you?',
    'muy bien': 'very well',
    '¿cuánto cuesta?': 'how much does it cost?',
    '¿dónde está?': 'where is it?',
    'no entiendo': 'I don\'t understand',
    'habla más despacio': 'speak more slowly',
    'hasta luego': 'see you later',
    'hasta mañana': 'see you tomorrow',
    'lo siento': 'I\'m sorry',
    'con permiso': 'excuse me',
    'por supuesto': 'of course',
    'tal vez': 'maybe',
    'sin embargo': 'however',
    'por lo tanto': 'therefore',
    'en cuanto a': 'regarding',
    'a partir de': 'starting from',
    'no obstante': 'nevertheless'
  };

  // English to Spanish translations
  const englishToSpanishDict: Record<string, string> = {};
  Object.entries(spanishToEnglishDict).forEach(([spanish, english]) => {
    englishToSpanishDict[english] = spanish;
  });

  const lowerText = text.toLowerCase();

  // Try direct dictionary lookup first
  if (sourceLanguage === 'es' && targetLanguage === 'en') {
    if (spanishToEnglishDict[lowerText]) {
      return spanishToEnglishDict[lowerText];
    }
  } else if (sourceLanguage === 'en' && targetLanguage === 'es') {
    if (englishToSpanishDict[lowerText]) {
      return englishToSpanishDict[lowerText];
    }
  }

  // Try partial matches for compound words or phrases
  if (sourceLanguage === 'es' && targetLanguage === 'en') {
    for (const [spanish, english] of Object.entries(spanishToEnglishDict)) {
      if (lowerText.includes(spanish) || spanish.includes(lowerText)) {
        return english;
      }
    }
  }

  // Fallback: Basic word transformation patterns
  if (sourceLanguage === 'es' && targetLanguage === 'en') {
    // Common Spanish to English patterns
    if (lowerText.endsWith('ción')) {
      return lowerText.replace('ción', 'tion');
    }
    if (lowerText.endsWith('dad')) {
      return lowerText.replace('dad', 'ty');
    }
    if (lowerText.endsWith('mente')) {
      return lowerText.replace('mente', 'ly');
    }
  }

  // If no translation found, return the original text with a note
  return `${text} [translation not available]`;
}

/**
 * GET endpoint for health check and supported languages
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    supportedLanguages: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' }
    ],
    features: [
      'vocabulary_translation',
      'contextual_translation',
      'phrase_translation',
      'openai_integration'
    ],
    agent: 'gamma-3-translation-service'
  });
}