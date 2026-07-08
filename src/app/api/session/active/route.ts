import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('table_sessions')
    .select(`
      *,
      tables:table_id (
        id,
        number
      ),
      orders (
        id,
        total_amount,
        status,
        created_at,
        order_items (
          quantity,
          unit_price,
          cafe_menu_items (
            name
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching active session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({ session: data });
}
