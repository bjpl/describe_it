import { VocabularyItem, VocabularyList } from "@/types/database";

// Sample vocabulary data for development/fallback
const sampleVocabularyItems: VocabularyItem[] = [
  {
    id: "1",
    spanish_text: "casa",
    english_translation: "house",
    category: "home",
    difficulty_level: 1,
    part_of_speech: "noun",
    frequency_score: 95,
    context_sentence_spanish: "Mi casa es muy grande.",
    context_sentence_english: "My house is very big.",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    spanish_text: "perro",
    english_translation: "dog",
    category: "animals",
    difficulty_level: 1,
    part_of_speech: "noun",
    frequency_score: 88,
    context_sentence_spanish: "El perro está corriendo en el parque.",
    context_sentence_english: "The dog is running in the park.",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    spanish_text: "comer",
    english_translation: "to eat",
    category: "food_drink",
    difficulty_level: 2,
    part_of_speech: "verb",
    frequency_score: 92,
    context_sentence_spanish: "Voy a comer una pizza.",
    context_sentence_english: "I am going to eat a pizza.",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    spanish_text: "hermoso",
    english_translation: "beautiful",
    category: "emotions",
    difficulty_level: 3,
    part_of_speech: "adjective",
    frequency_score: 76,
    context_sentence_spanish: "Qué día tan hermoso.",
    context_sentence_english: "What a beautiful day.",
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    spanish_text: "rápidamente",
    english_translation: "quickly",
    category: "abstract",
    difficulty_level: 4,
    part_of_speech: "adverb",
    frequency_score: 65,
    context_sentence_spanish: "Corrió rápidamente hacia la escuela.",
    context_sentence_english: "He ran quickly towards the school.",
    created_at: new Date().toISOString(),
  },
];

const sampleVocabularyLists: VocabularyList[] = [
  {
    id: "1",
    name: "Basic Spanish",
    description: "Essential words for beginners",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Home and Family",
    description: "Words related to home and family life",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class VocabularyService {
  private isConnectedToDatabase = false;

  async testConnection(): Promise<boolean> {
    try {
      // Try to connect to Supabase or your database
      // For now, we'll simulate this
      this.isConnectedToDatabase = false; // Set to false for demo
      return this.isConnectedToDatabase;
    } catch (error) {
      console.error("Database connection failed:", error);
      return false;
    }
  }

  async getAllVocabularyItems(): Promise<VocabularyItem[]> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database query
        // const { data, error } = await supabase.from('vocabulary_items').select('*');
        // if (error) throw error;
        // return data;
        return [];
      } else {
        // Return sample data as fallback
        return sampleVocabularyItems;
      }
    } catch (error) {
      console.error("Error fetching vocabulary items:", error);
      // Return sample data on error
      return sampleVocabularyItems;
    }
  }

  async getVocabularyItems(listId: string): Promise<VocabularyItem[]> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database query
        // const { data, error } = await supabase
        //   .from('vocabulary_items')
        //   .select('*')
        //   .eq('list_id', listId);
        // if (error) throw error;
        // return data;
        return [];
      } else {
        // Filter sample data by a mock list ID
        return sampleVocabularyItems.filter((item) =>
          listId === "1" ? item.difficulty_level <= 2 : true,
        );
      }
    } catch (error) {
      console.error("Error fetching vocabulary items for list:", error);
      return sampleVocabularyItems;
    }
  }

  async getVocabularyLists(): Promise<VocabularyList[]> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database query
        // const { data, error } = await supabase.from('vocabulary_lists').select('*');
        // if (error) throw error;
        // return data;
        return [];
      } else {
        return sampleVocabularyLists;
      }
    } catch (error) {
      console.error("Error fetching vocabulary lists:", error);
      return sampleVocabularyLists;
    }
  }

  async searchVocabulary(query: string): Promise<VocabularyItem[]> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database search
        // const { data, error } = await supabase
        //   .from('vocabulary_items')
        //   .select('*')
        //   .or(`spanish_text.ilike.%${query}%,english_translation.ilike.%${query}%`);
        // if (error) throw error;
        // return data;
        return [];
      } else {
        const searchTerm = query.toLowerCase();
        return sampleVocabularyItems.filter(
          (item) =>
            item.spanish_text.toLowerCase().includes(searchTerm) ||
            item.english_translation.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm),
        );
      }
    } catch (error) {
      console.error("Error searching vocabulary:", error);
      return sampleVocabularyItems;
    }
  }

  async addVocabularyItem(
    itemData: Omit<VocabularyItem, "id" | "created_at">,
  ): Promise<VocabularyItem | null> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database insertion
        // const { data, error } = await supabase
        //   .from('vocabulary_items')
        //   .insert([itemData])
        //   .select()
        //   .single();
        // if (error) throw error;
        // return data;
        return null;
      } else {
        // For demo purposes, just return the item with a mock ID
        const newItem: VocabularyItem = {
          ...itemData,
          id: `mock_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        return newItem;
      }
    } catch (error) {
      console.error("Error adding vocabulary item:", error);
      return null;
    }
  }

  async createVocabularyList(
    listData: Omit<VocabularyList, "id" | "created_at" | "updated_at">,
  ): Promise<VocabularyList | null> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database insertion
        // const { data, error } = await supabase
        //   .from('vocabulary_lists')
        //   .insert([{
        //     ...listData,
        //     created_at: new Date().toISOString(),
        //     updated_at: new Date().toISOString()
        //   }])
        //   .select()
        //   .single();
        // if (error) throw error;
        // return data;
        return null;
      } else {
        // For demo purposes, return the list with a mock ID
        const newList: VocabularyList = {
          ...listData,
          id: `mock_list_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return newList;
      }
    } catch (error) {
      console.error("Error creating vocabulary list:", error);
      return null;
    }
  }

  async updateVocabularyItem(
    id: string,
    updates: Partial<VocabularyItem>,
  ): Promise<VocabularyItem | null> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database update
        // const { data, error } = await supabase
        //   .from('vocabulary_items')
        //   .update(updates)
        //   .eq('id', id)
        //   .select()
        //   .single();
        // if (error) throw error;
        // return data;
        return null;
      } else {
        // For demo purposes, just return null since we can't persist changes
        return null;
      }
    } catch (error) {
      console.error("Error updating vocabulary item:", error);
      return null;
    }
  }

  async deleteVocabularyItem(id: string): Promise<boolean> {
    try {
      if (this.isConnectedToDatabase) {
        // TODO: Replace with actual database deletion
        // const { error } = await supabase
        //   .from('vocabulary_items')
        //   .delete()
        //   .eq('id', id);
        // if (error) throw error;
        // return true;
        return false;
      } else {
        // For demo purposes, return false since we can't persist changes
        return false;
      }
    } catch (error) {
      console.error("Error deleting vocabulary item:", error);
      return false;
    }
  }
}

export const vocabularyService = new VocabularyService();
export { VocabularyService };
export default vocabularyService;
