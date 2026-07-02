import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
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

  return NextResponse.json({ data, error });
}
