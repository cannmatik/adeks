const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // try to fetch a reservation
  const { data: res } = await supabase.from('reservations').select('id, admin_notes').limit(1).single();
  if (!res) return console.log('No reservations');
  
  // try to update it
  const { data, error } = await supabase.from('reservations').update({ admin_notes: 'TEST NOTU' }).eq('id', res.id).select().single();
  
  console.log('Update Data:', data);
  console.log('Update Error:', error);
}

main();
