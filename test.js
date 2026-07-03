const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
       id, start_time, end_time, status, notes, admin_notes, user_id, created_at,
       owner:profiles!reservations_user_id_fkey(id, full_name, email),
       tables:reservation_tables(table:tables(id, number, category)),
       contact_phone,
       participants:reservation_participants(user:profiles(id, full_name, email)),
       conversation:conversations(id, messages(id, is_read, sender_id))
    `)
    .limit(1);

  console.log('Error:', error);
}

main();
