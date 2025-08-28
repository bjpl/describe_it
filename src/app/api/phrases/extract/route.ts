import { NextRequest, NextResponse } from 'next/server'
import { openAIService } from '@/lib/api/openai'
import { supabaseService } from '@/lib/api/supabase'
import { z } from 'zod'

const extractSchema = z.object({
  text: z.string().min(10),
  descriptionId: z.string().optional(),
  categories: z.array(z.enum(['sustantivos', 'verbos', 'adjetivos', 'adverbios', 'frases_clave'])).optional(),
  maxPhrases: z.number().int().min(5).max(50).default(20),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = extractSchema.parse(body)
    
    // Extract phrases using OpenAI
    const phrases = await openAIService.extractPhrases(params)
    
    // Save to database if descriptionId provided
    if (params.descriptionId) {
      const savedPhrases = await Promise.all(
        phrases.phrases.map(phrase =>
          supabaseService.savePhrase({
            ...phrase,
            descriptionId: params.descriptionId!,
          })
        )
      )
      
      return NextResponse.json({ phrases: savedPhrases })
    }
    
    return NextResponse.json({ phrases: phrases.phrases })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Phrase extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract phrases' },
      { status: 500 }
    )
  }
}