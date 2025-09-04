import { supabase } from '@/lib/supabase'
import { VocabularyList, VocabularyItem } from '@/types/database'
import { SAMPLE_VOCABULARY_DATA } from '@/types/database'

interface VocabularyServiceOptions {
  useDatabase?: boolean
  fallbackToSample?: boolean
}

export class VocabularyService {
  private useDatabase: boolean
  private fallbackToSample: boolean

  constructor(options: VocabularyServiceOptions = {}) {
    this.useDatabase = options.useDatabase ?? true
    this.fallbackToSample = options.fallbackToSample ?? true
  }

  async getVocabularyLists(): Promise<VocabularyList[]> {
    if (this.useDatabase) {
      try {
        const { data, error } = await supabase
          .from('vocabulary_lists')
          .select('*')
          .eq('is_active', true)
          .order('difficulty_level', { ascending: true })

        if (!error && data) {
          return data
        }

        console.warn('Database query failed, falling back to sample data:', error?.message)
      } catch (error) {
        console.warn('Database connection failed, falling back to sample data:', error)
      }
    }

    // Fallback to sample data
    if (this.fallbackToSample) {
      return this.getSampleVocabularyLists()
    }

    return []
  }

  async getVocabularyItems(listId?: string): Promise<VocabularyItem[]> {
    if (this.useDatabase && listId) {
      try {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .select('*')
          .eq('vocabulary_list_id', listId)
          .order('difficulty_level', { ascending: true })

        if (!error && data) {
          return data
        }

        console.warn('Database query failed, falling back to sample data:', error?.message)
      } catch (error) {
        console.warn('Database connection failed, falling back to sample data:', error)
      }
    }

    // Fallback to sample data
    if (this.fallbackToSample) {
      return this.getSampleVocabularyItems()
    }

    return []
  }

  async getAllVocabularyItems(): Promise<VocabularyItem[]> {
    if (this.useDatabase) {
      try {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .select(`
            *,
            vocabulary_lists!inner(
              name,
              category,
              is_active
            )
          `)
          .eq('vocabulary_lists.is_active', true)
          .order('difficulty_level', { ascending: true })

        if (!error && data) {
          return data
        }

        console.warn('Database query failed, falling back to sample data:', error?.message)
      } catch (error) {
        console.warn('Database connection failed, falling back to sample data:', error)
      }
    }

    // Fallback to sample data
    if (this.fallbackToSample) {
      return this.getSampleVocabularyItems()
    }

    return []
  }

  async createVocabularyList(listData: Omit<VocabularyList, 'id' | 'created_at' | 'updated_at'>): Promise<VocabularyList | null> {
    if (!this.useDatabase) {
      console.warn('Database not enabled, cannot create vocabulary list')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary_lists')
        .insert([listData])
        .select()
        .single()

      if (error) {
        console.error('Error creating vocabulary list:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Database error creating vocabulary list:', error)
      return null
    }
  }

  async addVocabularyItem(itemData: Omit<VocabularyItem, 'id' | 'created_at'>): Promise<VocabularyItem | null> {
    if (!this.useDatabase) {
      console.warn('Database not enabled, cannot add vocabulary item')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary_items')
        .insert([itemData])
        .select()
        .single()

      if (error) {
        console.error('Error adding vocabulary item:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Database error adding vocabulary item:', error)
      return null
    }
  }

  async searchVocabulary(query: string): Promise<VocabularyItem[]> {
    if (this.useDatabase) {
      try {
        const { data, error } = await supabase
          .from('vocabulary_items')
          .select(`
            *,
            vocabulary_lists!inner(is_active)
          `)
          .eq('vocabulary_lists.is_active', true)
          .or(`spanish_text.ilike.%${query}%,english_translation.ilike.%${query}%`)
          .order('frequency_score', { ascending: false })
          .limit(20)

        if (!error && data) {
          return data
        }

        console.warn('Database search failed, falling back to sample data:', error?.message)
      } catch (error) {
        console.warn('Database connection failed during search:', error)
      }
    }

    // Fallback to sample data search
    if (this.fallbackToSample) {
      const allItems = this.getSampleVocabularyItems()
      return allItems.filter(item => 
        item.spanish_text.toLowerCase().includes(query.toLowerCase()) ||
        item.english_translation.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    }

    return []
  }

  async testConnection(): Promise<boolean> {
    if (!this.useDatabase) {
      return false
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary_lists')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.warn('Database connection test failed:', error)
      return false
    }
  }

  // Sample data methods
  private getSampleVocabularyLists(): VocabularyList[] {
    const now = new Date().toISOString()
    
    return [
      {
        id: 'basic-list',
        name: 'Vocabulario Básico',
        description: 'Essential Spanish words for beginners',
        category: 'basic',
        difficulty_level: 1,
        total_words: SAMPLE_VOCABULARY_DATA.basic.length,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'intermediate-list',
        name: 'Vocabulario Intermedio',
        description: 'Intermediate Spanish vocabulary',
        category: 'intermediate',
        difficulty_level: 5,
        total_words: SAMPLE_VOCABULARY_DATA.intermediate.length,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'advanced-list',
        name: 'Vocabulario Avanzado',
        description: 'Advanced Spanish vocabulary',
        category: 'advanced',
        difficulty_level: 8,
        total_words: SAMPLE_VOCABULARY_DATA.advanced.length,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]
  }

  private getSampleVocabularyItems(): VocabularyItem[] {
    const now = new Date().toISOString()
    const items: VocabularyItem[] = []
    
    // Basic vocabulary
    SAMPLE_VOCABULARY_DATA.basic.forEach((item, index) => {
      items.push({
        id: `basic-${index}`,
        vocabulary_list_id: 'basic-list',
        ...item,
        created_at: now
      })
    })

    // Intermediate vocabulary
    SAMPLE_VOCABULARY_DATA.intermediate.forEach((item, index) => {
      items.push({
        id: `intermediate-${index}`,
        vocabulary_list_id: 'intermediate-list',
        ...item,
        created_at: now
      })
    })

    // Advanced vocabulary
    SAMPLE_VOCABULARY_DATA.advanced.forEach((item, index) => {
      items.push({
        id: `advanced-${index}`,
        vocabulary_list_id: 'advanced-list',
        ...item,
        created_at: now
      })
    })

    return items
  }

  // Statistics methods
  async getVocabularyStats(): Promise<{
    total_items: number
    by_difficulty: Record<string, number>
    by_category: Record<string, number>
    database_connected: boolean
  }> {
    const isConnected = await this.testConnection()
    const items = await this.getAllVocabularyItems()
    
    const stats = {
      total_items: items.length,
      by_difficulty: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      database_connected: isConnected
    }

    items.forEach(item => {
      // Count by difficulty
      const difficulty = item.difficulty_level.toString()
      stats.by_difficulty[difficulty] = (stats.by_difficulty[difficulty] || 0) + 1

      // Count by category
      stats.by_category[item.category] = (stats.by_category[item.category] || 0) + 1
    })

    return stats
  }

  // Utility methods
  getAvailableCategories(): string[] {
    return ['greetings', 'home', 'food_drink', 'colors', 'family', 'emotions', 'weather', 'travel', 'abstract', 'academic', 'business', 'environment']
  }

  getDifficultyLevels(): Array<{ value: number, label: string }> {
    return [
      { value: 1, label: 'Beginner' },
      { value: 2, label: 'Elementary' },
      { value: 3, label: 'Pre-Intermediate' },
      { value: 4, label: 'Intermediate' },
      { value: 5, label: 'Upper-Intermediate' },
      { value: 6, label: 'Advanced' },
      { value: 7, label: 'Proficient' },
      { value: 8, label: 'Expert' },
      { value: 9, label: 'Master' },
      { value: 10, label: 'Native' }
    ]
  }
}

// Export singleton instance
export const vocabularyService = new VocabularyService({
  useDatabase: true,
  fallbackToSample: true
})

export default vocabularyService