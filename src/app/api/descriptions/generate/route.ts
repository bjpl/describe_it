import { NextRequest, NextResponse } from 'next/server'
import { openAIService } from '@/lib/api/openai'
import { supabaseService } from '@/lib/api/supabase'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'

const generateSchema = z.object({
  imageUrl: z.string().url(),
  style: z.enum(['narrativo', 'poetico', 'academico', 'conversacional', 'infantil']),
  language: z.enum(['es', 'en']).default('es'),
  maxLength: z.number().int().min(100).max(1000).default(300),
  customPrompt: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    const body = await request.json()
    const params = generateSchema.parse(body)
    
    // Generate description using OpenAI
    const description = await openAIService.generateDescription(params)
    
    // Save to database if user is authenticated
    if (session?.user) {
      await supabaseService.saveDescription({
        ...description,
        userId: session.user.id,
        imageUrl: params.imageUrl,
      })
    }
    
    return NextResponse.json(description)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Description generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}