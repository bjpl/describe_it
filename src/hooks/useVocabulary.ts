import { useState, useEffect, useMemo } from 'react'
import { VocabularyItem, VocabularyList } from '@/types/database'
import { vocabularyService } from '@/lib/services/vocabularyService'

interface UseVocabularyOptions {
  autoLoad?: boolean
  listId?: string
}

interface VocabularyFilters {
  search?: string
  category?: string
  difficulty?: string
  partOfSpeech?: string
}

interface VocabularyStats {
  total: number
  byCategory: Record<string, number>
  byDifficulty: Record<string, number>
  byPartOfSpeech: Record<string, number>
  averageDifficulty: number
  averageFrequency: number
}

export function useVocabulary(options: UseVocabularyOptions = {}) {
  const [items, setItems] = useState<VocabularyItem[]>([])
  const [lists, setLists] = useState<VocabularyList[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VocabularyFilters>({})
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')

  // Load vocabulary data
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Test connection first
      const isConnected = await vocabularyService.testConnection()
      setConnectionStatus(isConnected ? 'connected' : 'disconnected')

      // Load lists and items
      const [listsData, itemsData] = await Promise.all([
        vocabularyService.getVocabularyLists(),
        options.listId 
          ? vocabularyService.getVocabularyItems(options.listId)
          : vocabularyService.getAllVocabularyItems()
      ])

      setLists(listsData)
      setItems(itemsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vocabulary data'
      setError(errorMessage)
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  // Auto-load data on mount
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadData()
    }
  }, [options.listId])

  // Filter vocabulary items
  const filteredItems = useMemo(() => {
    let filtered = [...items]

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.spanish_text.toLowerCase().includes(search) ||
        item.english_translation.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      )
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      const difficultyNum = parseInt(filters.difficulty)
      filtered = filtered.filter(item => item.difficulty_level === difficultyNum)
    }

    if (filters.partOfSpeech && filters.partOfSpeech !== 'all') {
      filtered = filtered.filter(item => item.part_of_speech === filters.partOfSpeech)
    }

    return filtered
  }, [items, filters])

  // Calculate statistics
  const stats: VocabularyStats = useMemo(() => {
    const total = filteredItems.length
    const byCategory: Record<string, number> = {}
    const byDifficulty: Record<string, number> = {}
    const byPartOfSpeech: Record<string, number> = {}
    
    let totalDifficulty = 0
    let totalFrequency = 0
    let frequencyCount = 0

    filteredItems.forEach(item => {
      // Category stats
      byCategory[item.category] = (byCategory[item.category] || 0) + 1

      // Difficulty stats
      const difficultyKey = item.difficulty_level.toString()
      byDifficulty[difficultyKey] = (byDifficulty[difficultyKey] || 0) + 1
      totalDifficulty += item.difficulty_level

      // Part of speech stats
      byPartOfSpeech[item.part_of_speech] = (byPartOfSpeech[item.part_of_speech] || 0) + 1

      // Frequency stats
      if (item.frequency_score) {
        totalFrequency += item.frequency_score
        frequencyCount++
      }
    })

    return {
      total,
      byCategory,
      byDifficulty,
      byPartOfSpeech,
      averageDifficulty: total > 0 ? Math.round((totalDifficulty / total) * 10) / 10 : 0,
      averageFrequency: frequencyCount > 0 ? Math.round((totalFrequency / frequencyCount) * 10) / 10 : 0
    }
  }, [filteredItems])

  // Search functionality
  const search = async (query: string) => {
    if (!query.trim()) {
      setFilters(prev => ({ ...prev, search: '' }))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await vocabularyService.searchVocabulary(query)
      setItems(results)
      setFilters(prev => ({ ...prev, search: query }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Add new vocabulary item
  const addItem = async (itemData: Omit<VocabularyItem, 'id' | 'created_at'>) => {
    setLoading(true)
    setError(null)

    try {
      const newItem = await vocabularyService.addVocabularyItem(itemData)
      if (newItem) {
        setItems(prev => [...prev, newItem])
        return newItem
      } else {
        throw new Error('Failed to add vocabulary item')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Create new vocabulary list
  const addList = async (listData: Omit<VocabularyList, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    setError(null)

    try {
      const newList = await vocabularyService.createVocabularyList(listData)
      if (newList) {
        setLists(prev => [...prev, newList])
        return newList
      } else {
        throw new Error('Failed to create vocabulary list')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create list'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Filter helpers
  const setFilter = (key: keyof VocabularyFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  // Get unique values for filters
  const getUniqueCategories = () => {
    const categories = new Set(items.map(item => item.category))
    return Array.from(categories).sort()
  }

  const getUniqueDifficulties = () => {
    const difficulties = new Set(items.map(item => item.difficulty_level))
    return Array.from(difficulties).sort((a, b) => a - b)
  }

  const getUniquePartsOfSpeech = () => {
    const parts = new Set(items.map(item => item.part_of_speech))
    return Array.from(parts).sort()
  }

  return {
    // Data
    items: filteredItems,
    allItems: items,
    lists,
    stats,
    
    // State
    loading,
    error,
    connectionStatus,
    filters,
    
    // Actions
    loadData,
    search,
    addItem,
    addList,
    setFilter,
    clearFilters,
    
    // Helpers
    getUniqueCategories,
    getUniqueDifficulties,
    getUniquePartsOfSpeech,
    
    // Metadata
    isConnected: connectionStatus === 'connected',
    isEmpty: filteredItems.length === 0,
    hasFilters: Object.values(filters).some(value => value && value.trim() !== ''),
  }
}

export default useVocabulary