# ADR-002: AI Integration Strategy

## Status
Accepted

## Date
2024-01-15

## Context

The core functionality of Describe It relies heavily on AI-powered content generation. We needed to decide on:

1. Which AI provider(s) to use for different tasks
2. How to handle API failures and rate limits
3. How to implement fallback mechanisms
4. How to manage costs and usage
5. How to ensure content quality and safety

## Decision

We decided to implement a multi-layered AI integration strategy:

### Primary AI Provider: OpenAI
- **GPT-4 Turbo**: Primary model for high-quality content generation
- **GPT-3.5 Turbo**: Fallback model for cost optimization
- **Use Cases**: 
  - Image description generation (5 different styles)
  - Q&A pair generation
  - Vocabulary translation
  - Content analysis and extraction

### Fallback Strategy
1. **Intelligent Demo Mode**: High-quality pre-generated content when APIs are unavailable
2. **Progressive Degradation**: Graceful fallback from GPT-4 → GPT-3.5 → Demo content
3. **Context-Aware Responses**: Fallback content matches user's request context

### Cost Management
- **Model Selection**: Use GPT-3.5 for simple tasks, GPT-4 for complex generation
- **Request Optimization**: Batch multiple requests when possible
- **Caching Strategy**: Cache common responses to reduce API calls
- **Usage Monitoring**: Track API usage and costs in real-time

## Architecture

### AI Service Layer
```typescript
interface AIService {
  generateDescription(params: DescriptionParams): Promise<Description>
  generateQA(description: string, language: string, count: number): Promise<QAGeneration[]>
  translateText(text: string, from: string, to: string, context?: string): Promise<Translation>
  extractVocabulary(text: string, language: string): Promise<VocabularyPhrase[]>
}

class OpenAIService implements AIService {
  private primaryModel = 'gpt-4-turbo-preview'
  private fallbackModel = 'gpt-3.5-turbo'
  private demoService = new DemoAIService()
  
  async generateDescription(params: DescriptionParams): Promise<Description> {
    try {
      return await this.callOpenAI(this.primaryModel, params)
    } catch (error) {
      if (this.isRateLimit(error)) {
        return await this.callOpenAI(this.fallbackModel, params)
      }
      return await this.demoService.generateDescription(params)
    }
  }
}
```

### Prompt Engineering Strategy

#### 1. Description Generation
```typescript
const STYLE_PROMPTS = {
  narrativo: `Create a narrative description that tells a story about this image. 
              Focus on what might be happening, the emotions conveyed, and the story behind the scene.
              Use vivid imagery and engaging storytelling techniques.`,
              
  poetico: `Write a poetic description that captures the beauty and emotion of this image.
            Use metaphors, imagery, and lyrical language.
            Focus on feelings and artistic interpretation rather than literal description.`,
            
  academico: `Provide an analytical, academic description of this image.
              Focus on composition, technique, historical context, and artistic elements.
              Use formal, educational language appropriate for an art history textbook.`,
              
  conversacional: `Describe this image as if you're talking to a friend.
                   Use casual, friendly language and focus on interesting details
                   that would make for good conversation.`,
                   
  infantil: `Describe this image in simple, fun language that a child would understand.
             Use basic vocabulary, short sentences, and focus on colors, shapes,
             and fun elements that would capture a child's imagination.`
}
```

#### 2. Q&A Generation
```typescript
const QA_PROMPT_TEMPLATE = `
Based on the following image description in ${language}, generate ${count} educational questions and answers 
that will help Spanish language learners improve their comprehension.

Description: "${description}"

Requirements:
- Questions should test comprehension, vocabulary, and cultural understanding
- Vary difficulty levels (beginner, intermediate, advanced)
- Include different question types (factual, inferential, analytical)
- Answers should be educational and help reinforce learning
- Use natural, conversational ${language}

Format as JSON array with this structure:
{
  "question": "¿Qué colores predominan en la imagen?",
  "answer": "Los colores predominantes son el azul del cielo y el dorado del atardecer",
  "difficulty": "beginner",
  "category": "comprehension",
  "confidence": 0.95
}
`
```

### Error Handling & Resilience

#### 1. Circuit Breaker Pattern
```typescript
class AICircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute
  
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open')
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout
  }
}
```

#### 2. Retry Strategy
```typescript
class RetryStrategy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) break
        
        // Exponential backoff with jitter
        const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}
```

### Demo Mode Implementation

#### High-Quality Fallback Content
```typescript
class DemoAIService implements AIService {
  private readonly demoDescriptions = {
    narrativo: [
      {
        keywords: ['sunset', 'ocean', 'beach'],
        content: 'El sol se despide lentamente del día, pintando el cielo con tonos dorados y naranjas que se reflejan en las tranquilas aguas del océano. Las olas susurran secretos a la orilla mientras las gaviotas danzan en la brisa vespertina, creando una sinfonía natural que invita a la contemplación.'
      },
      // ... more high-quality demo content
    ]
  }
  
  async generateDescription(params: DescriptionParams): Promise<Description> {
    // Analyze image URL or keywords to select appropriate demo content
    const keywords = this.extractKeywords(params.imageUrl)
    const demoContent = this.findBestMatch(keywords, params.style)
    
    return {
      id: `demo_${Date.now()}`,
      content: demoContent,
      style: params.style,
      language: 'spanish',
      createdAt: new Date().toISOString()
    }
  }
}
```

### Content Safety & Quality

#### 1. Content Filtering
```typescript
class ContentSafetyFilter {
  private readonly blockedTerms = [
    // Inappropriate content filters
  ]
  
  private readonly qualityChecks = [
    (content: string) => content.length >= 50, // Minimum length
    (content: string) => content.length <= 2000, // Maximum length
    (content: string) => !this.containsBlockedTerms(content),
    (content: string) => this.hasProperStructure(content)
  ]
  
  validate(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    
    for (const check of this.qualityChecks) {
      if (!check(content)) {
        issues.push('Content quality check failed')
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}
```

#### 2. Educational Value Assessment
```typescript
class EducationalQualityAssessor {
  assessDescription(description: string, style: string): QualityScore {
    return {
      vocabulary_richness: this.assessVocabularyRichness(description),
      cultural_relevance: this.assessCulturalRelevance(description),
      grammatical_complexity: this.assessGrammaticalComplexity(description),
      learning_value: this.assessLearningValue(description, style),
      overall_score: 0.0 // Calculated from above metrics
    }
  }
}
```

### Monitoring & Analytics

#### 1. Usage Tracking
```typescript
interface AIUsageMetrics {
  model: string
  endpoint: string
  tokens_used: number
  response_time_ms: number
  cost_usd: number
  success: boolean
  error_type?: string
  timestamp: string
}

class AIUsageTracker {
  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    // Send to analytics service
    await fetch('/api/analytics/ai-usage', {
      method: 'POST',
      body: JSON.stringify(metrics)
    })
    
    // Update real-time dashboard
    this.updateDashboard(metrics)
  }
}
```

#### 2. Quality Monitoring
```typescript
class AIQualityMonitor {
  async monitorResponse(request: any, response: any): Promise<void> {
    const quality = await this.assessQuality(response)
    
    if (quality.score < 0.7) {
      await this.alertLowQuality({
        request,
        response,
        quality,
        timestamp: new Date().toISOString()
      })
    }
  }
}
```

## Cost Optimization

### 1. Model Selection Strategy
```typescript
const MODEL_SELECTION_RULES = {
  description_generation: {
    simple_styles: ['conversacional', 'infantil'], // Use GPT-3.5
    complex_styles: ['poetico', 'academico', 'narrativo'] // Use GPT-4
  },
  qa_generation: {
    beginner_level: 'gpt-3.5-turbo',
    advanced_level: 'gpt-4-turbo-preview'
  },
  translation: {
    common_phrases: 'gpt-3.5-turbo', // Fast and cheap
    complex_context: 'gpt-4-turbo-preview' // Better understanding
  }
}
```

### 2. Caching Strategy
```typescript
class AIResponseCache {
  private cache = new Map<string, CachedResponse>()
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours
  
  async get(key: string): Promise<any> {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.response
    }
    return null
  }
  
  async set(key: string, response: any): Promise<void> {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    })
    
    // Also cache in Redis for production
    await this.cacheInRedis(key, response)
  }
}
```

## Consequences

### Positive
1. **High Availability**: Multiple fallback layers ensure app always works
2. **Cost Control**: Smart model selection and caching reduce expenses
3. **Quality Assurance**: Content filtering and quality assessment ensure educational value
4. **Performance**: Caching and optimization provide fast response times
5. **User Experience**: Demo mode provides excellent UX even without API keys

### Negative
1. **Complexity**: Multiple fallback layers increase system complexity
2. **Maintenance**: Prompt engineering requires ongoing optimization
3. **Monitoring Overhead**: Extensive tracking adds operational complexity
4. **API Dependency**: Still fundamentally dependent on external AI services

### Risks & Mitigations
1. **API Changes**: Monitor OpenAI announcements and maintain version compatibility
2. **Cost Spikes**: Implement circuit breakers and daily spending limits
3. **Quality Degradation**: Continuous monitoring and quality assessment
4. **Content Safety**: Regular review and updating of safety filters

## Future Considerations

1. **Multi-Provider Strategy**: Consider adding Anthropic Claude or Google Gemini as alternatives
2. **On-Premise Models**: Evaluate local model deployment for cost reduction
3. **Custom Fine-Tuning**: Train specialized models for Spanish language education
4. **Real-Time Learning**: Implement feedback loops to improve prompt effectiveness

## Review Schedule

This AI integration strategy will be reviewed:
- **Monthly**: Cost and usage analysis
- **Quarterly**: Model performance and quality metrics
- **Semi-annually**: Provider evaluation and strategy updates
- **As needed**: When new AI capabilities become available