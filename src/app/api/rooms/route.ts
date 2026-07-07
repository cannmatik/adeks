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
  if (profile?.role !== 'admin') return { error: 'Yetkisiz', status: 403 as const };
  return { supabase, userId: user.id } as const;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rooms: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { name, description, display_order, color, floor, floor_col, floor_row, col_span, row_span, category, short_code } = await req.json();
  if (!name) return NextResponse.json({ error: 'name zorunlu' }, { status: 400 });
  const { data, error } = await auth.supabase
    .from('rooms')
    .insert({
      name,
      description: description ?? null,
      display_order: display_order ?? 0,
      color: color ?? null,
      floor: floor ?? '1',
      floor_col: floor_col ?? 0,
      floor_row: floor_row ?? 0,
      col_span: col_span ?? 4,
      row_span: row_span ?? 3,
      category: category ?? null,
      short_code: short_code ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ room: data });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });
  const { data, error } = await auth.supabase.from('rooms').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ room: data });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });
  const { error } = await auth.supabase.from('rooms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
