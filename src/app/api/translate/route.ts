import { NextRequest, NextResponse } from 'next/server';
import { translatorService, TranslationRequest, BatchTranslationRequest } from '@/lib/api/translator';
import { APIError } from '@/types/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    
    console.log('Translation request received', {
      requestId,
      hasText: !!body.text,
      hasTexts: !!body.texts,
      fromLanguage: body.fromLanguage,
      toLanguage: body.toLanguage,
      isBatch: Array.isArray(body.texts)
    });

    // Validate request body
    if (!body.fromLanguage || !body.toLanguage) {
      throw new APIError({
        code: 'MISSING_LANGUAGES',
        message: 'Both fromLanguage and toLanguage are required',
        status: 400
      });
    }

    // Check if language pair is supported
    if (!translatorService.isLanguagePairSupported(body.fromLanguage, body.toLanguage)) {
      throw new APIError({
        code: 'UNSUPPORTED_LANGUAGE_PAIR',
        message: `Language pair ${body.fromLanguage} -> ${body.toLanguage} is not supported`,
        status: 400
      });
    }

    let result;

    // Handle batch translation
    if (body.texts && Array.isArray(body.texts)) {
      if (body.texts.length === 0) {
        throw new APIError({
          code: 'EMPTY_BATCH',
          message: 'Batch translation requires at least one text',
          status: 400
        });
      }

      if (body.texts.length > 50) {
        throw new APIError({
          code: 'BATCH_TOO_LARGE',
          message: 'Batch translation limited to 50 texts maximum',
          status: 400
        });
      }

      const batchRequest: BatchTranslationRequest = {
        texts: body.texts,
        fromLanguage: body.fromLanguage,
        toLanguage: body.toLanguage,
        context: body.context
      };

      result = await translatorService.batchTranslate(batchRequest);
      
      console.log('Batch translation completed', {
        requestId,
        totalTexts: body.texts.length,
        successfulTranslations: result.translations.length,
        failedTranslations: result.failed.length,
        duration: Date.now() - startTime
      });

    } else if (body.text) {
      // Handle single translation
      if (typeof body.text !== 'string' || body.text.trim().length === 0) {
        throw new APIError({
          code: 'INVALID_TEXT',
          message: 'Text must be a non-empty string',
          status: 400
        });
      }

      if (body.text.length > 5000) {
        throw new APIError({
          code: 'TEXT_TOO_LONG',
          message: 'Text limited to 5000 characters',
          status: 400
        });
      }

      const translationRequest: TranslationRequest = {
        text: body.text,
        fromLanguage: body.fromLanguage,
        toLanguage: body.toLanguage,
        context: body.context
      };

      result = await translatorService.translateText(translationRequest);
      
      console.log('Single translation completed', {
        requestId,
        originalLength: body.text.length,
        translatedLength: result.translatedText.length,
        confidence: result.confidence,
        duration: Date.now() - startTime
      });

    } else {
      throw new APIError({
        code: 'MISSING_TEXT',
        message: 'Either text (string) or texts (array) is required',
        status: 400
      });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Translation-Service': 'openai-with-fallbacks',
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof APIError) {
      console.error('Translation request failed', {
        requestId,
        error: error.code,
        message: error.message,
        status: error.status,
        duration
      });

      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          details: error.details
        },
        { 
          status: error.status,
          headers: {
            'X-Request-ID': requestId
          }
        }
      );
    }

    console.error('Unexpected translation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during translation'
      },
      { 
        status: 500,
        headers: {
          'X-Request-ID': requestId
        }
      }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'languages':
        return NextResponse.json({
          supportedLanguages: translatorService.getSupportedLanguages()
        });

      case 'stats':
        const stats = await translatorService.getTranslationStats();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({
          service: 'Translation API',
          version: '1.0.0',
          supportedLanguages: translatorService.getSupportedLanguages(),
          endpoints: {
            'POST /': 'Translate text or batch of texts',
            'GET /?action=languages': 'Get supported languages',
            'GET /?action=stats': 'Get translation statistics'
          }
        });
    }

  } catch (error) {
    console.error('Translation GET request failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process GET request'
      },
      { status: 500 }
    );
  }
}