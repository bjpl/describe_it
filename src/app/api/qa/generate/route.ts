import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const qaRequestSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
});

export const runtime = 'nodejs';

// Mock implementation - replace with actual AI service
const generateAnswer = async (imageUrl: string, question: string): Promise<{ answer: string; confidence: number }> => {
  // This is a mock implementation
  // In production, you would integrate with OpenAI Vision API, Claude, or similar service
  
  // Simulate different types of questions and responses
  const questionLower = question.toLowerCase();
  
  let answer = "I can see the image, but I need more specific information to provide a detailed answer to your question.";
  let confidence = 0.7;
  
  // Mock responses based on question type
  if (questionLower.includes('color') || questionLower.includes('colour')) {
    answer = "The dominant colors in this image are warm tones including oranges, yellows, and browns, with some cooler blue accents in the background.";
    confidence = 0.9;
  } else if (questionLower.includes('people') || questionLower.includes('person')) {
    answer = "I can see several people in the image, appearing to be engaged in marketplace activities. They seem to be browsing and purchasing items.";
    confidence = 0.85;
  } else if (questionLower.includes('what is') || questionLower.includes('what are')) {
    answer = "This appears to be a marketplace or bazaar scene with vendors selling fresh produce, fruits, and vegetables to customers.";
    confidence = 0.88;
  } else if (questionLower.includes('where') || questionLower.includes('location')) {
    answer = "Based on the visual elements, this appears to be an outdoor marketplace, possibly in a Mediterranean or Middle Eastern setting, though I cannot determine the exact location.";
    confidence = 0.75;
  } else if (questionLower.includes('time') || questionLower.includes('when')) {
    answer = "The lighting and shadows suggest this photo was taken during daytime hours, likely mid-morning to early afternoon when markets are typically most active.";
    confidence = 0.8;
  } else if (questionLower.includes('food') || questionLower.includes('fruit') || questionLower.includes('vegetable')) {
    answer = "The image shows various fresh produce including what appears to be fruits and vegetables displayed in wooden crates and baskets, typical of a traditional marketplace.";
    confidence = 0.9;
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
  
  return { answer, confidence };
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    const { imageUrl, question } = qaRequestSchema.parse(body);
    
    // Generate answer
    const { answer, confidence } = await generateAnswer(imageUrl, question);
    
    // Create Q&A object
    const questionAnswer = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageId: imageUrl, // In production, this would be a proper image ID
      question,
      answer,
      confidence,
      createdAt: new Date()
    };
    
    const responseTime = performance.now() - startTime;
    
    return NextResponse.json(questionAnswer, {
      headers: {
        'Cache-Control': 'private, no-cache',
        'X-Response-Time': `${responseTime}ms`
      }
    });
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { 
          status: 400,
          headers: {
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
    
    console.error('Q&A generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate answer',
        message: 'An error occurred while processing your question. Please try again.',
        timestamp: new Date().toISOString(),
        retry: true
      },
      { 
        status: 500,
        headers: {
          'Retry-After': '30',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}