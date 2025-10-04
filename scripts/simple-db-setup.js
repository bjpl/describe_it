/**
 * Simple Database Setup Script
 * Creates tables one by one using Supabase client
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function createTables() {
  console.log('🔧 Creating database tables...')
  
  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          username TEXT UNIQUE,
          full_name TEXT,
          avatar_url TEXT,
          spanish_level TEXT DEFAULT 'beginner' CHECK (spanish_level IN ('beginner', 'intermediate', 'advanced')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    },
    {
      name: 'vocabulary_lists',
      sql: `
        CREATE TABLE IF NOT EXISTS public.vocabulary_lists (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'basic' CHECK (category IN ('basic', 'intermediate', 'advanced', 'custom')),
          difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
          total_words INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    },
    {
      name: 'vocabulary_items',
      sql: `
        CREATE TABLE IF NOT EXISTS public.vocabulary_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          vocabulary_list_id UUID NOT NULL,
          spanish_text TEXT NOT NULL,
          english_translation TEXT NOT NULL,
          part_of_speech TEXT DEFAULT 'other' CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'other')),
          difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
          category TEXT NOT NULL DEFAULT 'general',
          context_sentence_spanish TEXT,
          context_sentence_english TEXT,
          pronunciation_ipa TEXT,
          usage_notes TEXT,
          frequency_score INTEGER DEFAULT 50 CHECK (frequency_score >= 1 AND frequency_score <= 100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    },
    {
      name: 'sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID,
          session_type TEXT DEFAULT 'mixed' CHECK (session_type IN ('description', 'qa', 'vocabulary', 'mixed')),
          started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          ended_at TIMESTAMP WITH TIME ZONE,
          duration_minutes INTEGER,
          images_processed INTEGER DEFAULT 0,
          descriptions_generated INTEGER DEFAULT 0,
          qa_attempts INTEGER DEFAULT 0,
          qa_correct INTEGER DEFAULT 0,
          vocabulary_learned INTEGER DEFAULT 0,
          session_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    },
    {
      name: 'saved_descriptions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.saved_descriptions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID,
          session_id UUID,
          image_id TEXT NOT NULL,
          image_url TEXT NOT NULL,
          english_description TEXT NOT NULL,
          spanish_description TEXT NOT NULL,
          description_style TEXT DEFAULT 'conversacional' CHECK (description_style IN ('conversacional', 'académico', 'creativo', 'técnico', 'narrativo')),
          generated_vocabulary JSONB DEFAULT '[]'::jsonb,
          qa_pairs JSONB DEFAULT '[]'::jsonb,
          is_favorite BOOLEAN DEFAULT false,
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    },
    {
      name: 'learning_progress',
      sql: `
        CREATE TABLE IF NOT EXISTS public.learning_progress (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID,
          vocabulary_item_id UUID,
          session_id UUID,
          mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
          review_count INTEGER DEFAULT 0,
          correct_count INTEGER DEFAULT 0,
          last_reviewed TIMESTAMP WITH TIME ZONE,
          next_review TIMESTAMP WITH TIME ZONE,
          difficulty_adjustment INTEGER DEFAULT 0,
          learning_phase TEXT DEFAULT 'new' CHECK (learning_phase IN ('new', 'learning', 'review', 'mastered')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    }
  ]
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}`)
      const result = await supabase.rpc('exec_sql', { 
        query: table.sql 
      })
      
      if (result.error) {
        console.error(`Error creating ${table.name}:`, result.error)
      } else {
        console.log(`✅ Table ${table.name} created successfully`)
      }
    } catch (error) {
      console.error(`Error creating ${table.name}:`, error.message)
    }
  }
}

async function insertSampleData() {
  console.log('📚 Inserting sample vocabulary data...')
  
  try {
    // Insert vocabulary lists
    const { data: basicList, error: basicError } = await supabase
      .from('vocabulary_lists')
      .insert({
        name: 'Vocabulario Básico',
        description: 'Essential Spanish words for beginners',
        category: 'basic',
        difficulty_level: 1
      })
      .select()
      .single()
    
    if (basicError) {
      console.error('Error creating basic vocabulary list:', basicError)
      return
    }
    
    console.log('✅ Created basic vocabulary list')
    
    // Insert sample vocabulary items
    const vocabularyItems = [
      {
        vocabulary_list_id: basicList.id,
        spanish_text: 'hola',
        english_translation: 'hello',
        part_of_speech: 'other',
        category: 'greetings',
        context_sentence_spanish: 'Hola, ¿cómo estás?',
        context_sentence_english: 'Hello, how are you?',
        frequency_score: 95
      },
      {
        vocabulary_list_id: basicList.id,
        spanish_text: 'casa',
        english_translation: 'house',
        part_of_speech: 'noun',
        category: 'home',
        context_sentence_spanish: 'Mi casa es azul.',
        context_sentence_english: 'My house is blue.',
        frequency_score: 90
      },
      {
        vocabulary_list_id: basicList.id,
        spanish_text: 'agua',
        english_translation: 'water',
        part_of_speech: 'noun',
        category: 'food_drink',
        context_sentence_spanish: 'Necesito agua.',
        context_sentence_english: 'I need water.',
        frequency_score: 95
      },
      {
        vocabulary_list_id: basicList.id,
        spanish_text: 'comer',
        english_translation: 'to eat',
        part_of_speech: 'verb',
        category: 'food_drink',
        context_sentence_spanish: 'Me gusta comer frutas.',
        context_sentence_english: 'I like to eat fruits.',
        frequency_score: 90
      },
      {
        vocabulary_list_id: basicList.id,
        spanish_text: 'rojo',
        english_translation: 'red',
        part_of_speech: 'adjective',
        category: 'colors',
        context_sentence_spanish: 'El coche es rojo.',
        context_sentence_english: 'The car is red.',
        frequency_score: 85
      }
    ]
    
    const { data: items, error: itemsError } = await supabase
      .from('vocabulary_items')
      .insert(vocabularyItems)
      .select()
    
    if (itemsError) {
      console.error('Error inserting vocabulary items:', itemsError)
    } else {
      console.log(`✅ Inserted ${items.length} vocabulary items`)
    }
    
  } catch (error) {
    console.error('Error inserting sample data:', error)
  }
}

async function testTables() {
  console.log('🔍 Testing created tables...')
  
  const testTables = ['users', 'vocabulary_lists', 'vocabulary_items', 'sessions', 'saved_descriptions', 'learning_progress']
  
  for (const tableName of testTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Table ${tableName}: ${error.message}`)
      } else {
        console.log(`✅ Table ${tableName}: Working`)
      }
    } catch (error) {
      console.log(`❌ Table ${tableName}: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🚀 Starting Supabase Database Setup')
  console.log('===================================')
  
  try {
    await createTables()
    console.log('\n📊 Testing tables...')
    await testTables()
    console.log('\n📚 Adding sample data...')
    await insertSampleData()
    
    console.log('\n🎉 Database setup complete!')
    console.log('\nNext steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Visit: http://localhost:3000')
    console.log('3. Test the vocabulary features')
    
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

if (require.main === module) {
  main()
}

module.exports = { createTables, insertSampleData, testTables }