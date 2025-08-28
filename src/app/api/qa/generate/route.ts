import { NextRequest, NextResponse } from 'next/server'
import { openAIService } from '@/lib/api/openai'
import { supabaseService } from '@/lib/api/supabase'
import { z } from 'zod'

const qaSchema = z.object({
  descriptionId: z.string(),
  descriptionText: z.string(),
  count: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate'),
  style: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = qaSchema.parse(body)
    
    // Generate Q&A using OpenAI
    const qa = await openAIService.generateQA({
      text: params.descriptionText,
      count: params.count,
      difficulty: params.difficulty,
    })
    
    // Save to database
    const savedQuestions = await Promise.all(
      qa.questions.map(q => 
        supabaseService.saveQuestion({
          ...q,
          descriptionId: params.descriptionId,
        })
      )
    )
    
    return NextResponse.json({ questions: savedQuestions })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Q&A generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}