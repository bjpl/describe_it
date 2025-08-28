import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/api';

class SupabaseService {
  private client: SupabaseClient<Database>;
  private url: string;
  private anonKey: string;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!this.url || !this.anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required');
    }

    this.client = createClient<Database>(this.url, this.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Save an image to the database
   */
  async saveImage(imageData: Database['public']['Tables']['images']['Insert']) {
    try {
      const { data, error } = await this.client
        .from('images')
        .insert(imageData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  /**
   * Get image by Unsplash ID
   */
  async getImageByUnsplashId(unsplashId: string) {
    try {
      const { data, error } = await this.client
        .from('images')
        .select('*')
        .eq('unsplash_id', unsplashId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to get image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting image:', error);
      throw error;
    }
  }

  /**
   * Save a description to the database
   */
  async saveDescription(descriptionData: Database['public']['Tables']['descriptions']['Insert']) {
    try {
      const { data, error } = await this.client
        .from('descriptions')
        .insert(descriptionData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save description: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error saving description:', error);
      throw error;
    }
  }

  /**
   * Get descriptions for an image
   */
  async getDescriptions(imageId: string) {
    try {
      const { data, error } = await this.client
        .from('descriptions')
        .select('*')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get descriptions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting descriptions:', error);
      throw error;
    }
  }

  /**
   * Get description by style for an image
   */
  async getDescriptionByStyle(imageId: string, style: Database['public']['Enums']['description_style']) {
    try {
      const { data, error } = await this.client
        .from('descriptions')
        .select('*')
        .eq('image_id', imageId)
        .eq('style', style)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to get description: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting description:', error);
      throw error;
    }
  }

  /**
   * Update image data
   */
  async updateImage(id: string, updates: Database['public']['Tables']['images']['Update']) {
    try {
      const { data, error } = await this.client
        .from('images')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating image:', error);
      throw error;
    }
  }

  /**
   * Delete an image and its descriptions
   */
  async deleteImage(id: string) {
    try {
      // First delete related descriptions
      const { error: descriptionsError } = await this.client
        .from('descriptions')
        .delete()
        .eq('image_id', id);

      if (descriptionsError) {
        throw new Error(`Failed to delete descriptions: ${descriptionsError.message}`);
      }

      // Then delete the image
      const { error: imageError } = await this.client
        .from('images')
        .delete()
        .eq('id', id);

      if (imageError) {
        throw new Error(`Failed to delete image: ${imageError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Search images by query
   */
  async searchImages(query: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await this.client
        .from('images')
        .select('*')
        .or(`description.ilike.%${query}%,alt_description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to search images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching images:', error);
      throw error;
    }
  }

  /**
   * Get recent images
   */
  async getRecentImages(limit = 20) {
    try {
      const { data, error } = await this.client
        .from('images')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get recent images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent images:', error);
      throw error;
    }
  }

  /**
   * Get image with descriptions
   */
  async getImageWithDescriptions(id: string) {
    try {
      const { data, error } = await this.client
        .from('images')
        .select(`
          *,
          descriptions (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to get image with descriptions: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting image with descriptions:', error);
      throw error;
    }
  }

  /**
   * Bulk insert images
   */
  async bulkInsertImages(images: Database['public']['Tables']['images']['Insert'][]) {
    try {
      const { data, error } = await this.client
        .from('images')
        .insert(images)
        .select();

      if (error) {
        throw new Error(`Failed to bulk insert images: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error bulk inserting images:', error);
      throw error;
    }
  }

  /**
   * Get statistics about stored data
   */
  async getStats() {
    try {
      const [imagesResponse, descriptionsResponse] = await Promise.all([
        this.client.from('images').select('id', { count: 'exact', head: true }),
        this.client.from('descriptions').select('id', { count: 'exact', head: true }),
      ]);

      if (imagesResponse.error) {
        throw new Error(`Failed to get images count: ${imagesResponse.error.message}`);
      }

      if (descriptionsResponse.error) {
        throw new Error(`Failed to get descriptions count: ${descriptionsResponse.error.message}`);
      }

      return {
        totalImages: imagesResponse.count || 0,
        totalDescriptions: descriptionsResponse.count || 0,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('images').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Set up real-time subscription for images
   */
  subscribeToImages(callback: (payload: any) => void) {
    return this.client
      .channel('images_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'images',
        },
        callback
      )
      .subscribe();
  }

  /**
   * Set up real-time subscription for descriptions
   */
  subscribeToDescriptions(imageId: string, callback: (payload: any) => void) {
    return this.client
      .channel(`descriptions_${imageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'descriptions',
          filter: `image_id=eq.${imageId}`,
        },
        callback
      )
      .subscribe();
  }

  /**
   * Clean up old cache entries or temporary data
   */
  async cleanup(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // This would depend on your specific cleanup needs
      // For example, you might want to clean up old temporary images
      console.log(`Cleanup would remove data older than ${cutoffDate.toISOString()}`);
      
      // Implementation would depend on your specific requirements
      return true;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

// Also export the client for direct access if needed
export { supabaseService as default };