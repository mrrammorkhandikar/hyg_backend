import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addImageUrlColumn() {
  try {
    console.log('🔄 Checking current tags table structure...')
    
    // First, let's check if the tags table exists and what columns it has
    const { data: existingTags, error: selectError } = await supabase
      .from('tags')
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.error('❌ Error checking tags table:', selectError.message)
      console.log('📝 The tags table might not exist yet. Let me try to create it...')
      
      // Try to create the tags table with all necessary columns
      console.log('🔄 Creating tags table with all required columns...')
      
      // Since we can't execute DDL directly, let's try to insert a test record to see what columns exist
      const testTag = {
        name: 'Test Tag',
        slug: 'test-tag',
        description: 'Test description',
        tag_type: 'regular',
        image_url: null,
        category_id: null
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('tags')
        .insert([testTag])
        .select()
      
      if (insertError) {
        console.error('❌ Error inserting test tag:', insertError.message)
        
        if (insertError.message.includes('image_url')) {
          console.log('✅ The image_url column is missing, which confirms our issue!')
          console.log('📝 Please run the following SQL in your Supabase SQL editor:')
          console.log('')
          console.log('ALTER TABLE tags ADD COLUMN IF NOT EXISTS image_url text;')
          console.log('ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_type text CHECK (tag_type IN (\'regular\', \'cloud\', \'seo\')) DEFAULT \'regular\';')
          console.log('UPDATE tags SET tag_type = \'regular\' WHERE tag_type IS NULL;')
          console.log('ALTER TABLE tags ALTER COLUMN tag_type SET NOT NULL;')
          console.log('')
          console.log('After running these commands, try creating tags again.')
        } else {
          console.log('❌ Different error occurred:', insertError.message)
        }
      } else {
        console.log('✅ Test tag inserted successfully! The table structure seems correct.')
        
        // Clean up the test tag
        if (insertData && insertData[0]) {
          await supabase.from('tags').delete().eq('id', insertData[0].id)
          console.log('🧹 Cleaned up test tag')
        }
      }
    } else {
      console.log('✅ Tags table exists and is accessible')
      console.log('📊 Sample tag structure:', existingTags?.[0] || 'No existing tags')
      
      // Try to insert a test tag to see if image_url column exists
      const testTag = {
        name: 'Test Tag ' + Date.now(),
        slug: 'test-tag-' + Date.now(),
        description: 'Test description',
        tag_type: 'regular',
        image_url: 'https://example.com/test.jpg'
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('tags')
        .insert([testTag])
        .select()
      
      if (insertError) {
        console.error('❌ Error inserting test tag:', insertError.message)
        
        if (insertError.message.includes('image_url') || insertError.message.includes('tag_type')) {
          console.log('📝 Missing columns detected. Please run the following SQL in your Supabase SQL editor:')
          console.log('')
          console.log('-- Add missing columns')
          console.log('ALTER TABLE tags ADD COLUMN IF NOT EXISTS image_url text;')
          console.log('ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_type text CHECK (tag_type IN (\'regular\', \'cloud\', \'seo\')) DEFAULT \'regular\';')
          console.log('')
          console.log('-- Update existing records')
          console.log('UPDATE tags SET tag_type = \'regular\' WHERE tag_type IS NULL;')
          console.log('ALTER TABLE tags ALTER COLUMN tag_type SET NOT NULL;')
          console.log('')
          console.log('-- Make slug nullable for cloud/seo tags')
          console.log('ALTER TABLE tags ALTER COLUMN slug DROP NOT NULL;')
          console.log('')
          console.log('-- Add conditional constraints')
          console.log('ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_slug_key;')
          console.log('CREATE UNIQUE INDEX IF NOT EXISTS tags_slug_unique_regular ON tags (slug) WHERE tag_type = \'regular\' AND slug IS NOT NULL;')
          console.log('')
          console.log('After running these commands, the tags system should work correctly.')
        }
      } else {
        console.log('✅ Test tag inserted successfully! All columns exist.')
        
        // Clean up the test tag
        if (insertData && insertData[0]) {
          await supabase.from('tags').delete().eq('id', insertData[0].id)
          console.log('🧹 Cleaned up test tag')
        }
        
        console.log('✅ Database schema appears to be correct!')
      }
    }
    
  } catch (err) {
    console.error('❌ Script error:', err)
    process.exit(1)
  }
}

addImageUrlColumn().catch((err) => {
  console.error('❌ Migration script error:', err)
  process.exit(1)
})