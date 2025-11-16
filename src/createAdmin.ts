// backend/src/createAdmin.ts
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const admins = [];

  // Collect admin data from environment variables
  for (let i = 1;; i++) {
    const username = process.env[`ADMIN_USERNAME_${i}`];
    const email = process.env[`ADMIN_EMAIL_${i}`];
    const plainPassword = process.env[`ADMIN_PASSWORD_${i}`];

    if (!username || !email || !plainPassword) break; // No more admins

    const password_hash = await bcrypt.hash(plainPassword, 10);

    admins.push({ username, email, password_hash });
  }

  // Fallback to single variables if indexed ones not found
  if (admins.length === 0) {
    const username = process.env.ADMIN_USERNAME || 'DrBushraMirza';
    const email = process.env.ADMIN_EMAIL || 'drbushra@example.com';
    const plainPassword = process.env.ADMIN_PASSWORD || '12345';
    const password_hash = await bcrypt.hash(plainPassword, 10);
    admins.push({ username, email, password_hash });
  }

  const { error } = await supabase.from('admins').insert(admins);

  if (error) {
    console.error('❌ Insert failed:', error.message || error);
    process.exit(1);
  }
  console.log(`✅ ${admins.length} admin(s) inserted successfully.`);
}

main().catch((err) => {
  console.error('❌ Script error:', err)
  process.exit(1)
})
