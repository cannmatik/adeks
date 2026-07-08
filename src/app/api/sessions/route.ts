import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Auth gerekli', status: 401 as const };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!['admin', 'super_admin'].includes(profile?.role)) return { error: 'Yetkisiz', status: 403 as const };
  return { supabase, userId: user.id } as const;
}

// GET: aktif veya geçmiş sessionlar (admin)
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get('active') === '1';

  let query = auth.supabase
    .from('table_sessions')
    .select(
      `id, table_id, kind, user_id, anonymous_label, reservation_id, started_at, ended_at,
       hourly_rate_snapshot, amount_charged, notes,
       table:tables(id, number, category, status),
       user:profiles!table_sessions_user_id_fkey(id, full_name, email),
       created_by_profile:profiles!table_sessions_created_by_fkey(id, full_name, email)`,
    )
    .order('started_at', { ascending: false });

  if (onlyActive) query = query.is('ended_at', null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// POST: yeni session başlat (admin)
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { table_id, kind, user_id, anonymous_label, reservation_id, notes } = body;

  if (!table_id || !kind) {
    return NextResponse.json({ error: 'table_id ve kind zorunlu' }, { status: 400 });
  }
  if (kind === 'MEMBER' && !user_id) {
    return NextResponse.json({ error: 'MEMBER için user_id zorunlu' }, { status: 400 });
  }
  if (kind === 'ANONYMOUS' && user_id) {
    return NextResponse.json({ error: 'ANONYMOUS için user_id verme' }, { status: 400 });
  }

  // hourly_rate snapshot
  const { data: tableRow } = await auth.supabase
    .from('tables')
    .select('category')
    .eq('id', table_id)
    .single();

  const { data: categoryRow } = await auth.supabase
    .from('categories')
    .select('hourly_rate')
    .eq('name', tableRow?.category)
    .single();

  const { data, error } = await auth.supabase
    .from('table_sessions')
    .insert({
      table_id,
      kind,
      user_id: kind === 'MEMBER' ? user_id : null,
      anonymous_label: kind === 'ANONYMOUS' ? anonymous_label ?? 'Misafir' : null,
      reservation_id: reservation_id ?? null,
      hourly_rate_snapshot: categoryRow?.hourly_rate ?? null,
      notes: notes ?? null,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: data });
}
