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
  return { supabase } as const;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('floor_objects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ objects: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { floor, kind, label, floor_col, floor_row, col_span, row_span } = await req.json();
  if (!floor || !kind) {
    return NextResponse.json({ error: 'floor ve kind zorunlu' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('floor_objects')
    .insert({
      floor,
      kind,
      label: label?.trim() || null,
      floor_col: floor_col ?? 0,
      floor_row: floor_row ?? 0,
      col_span: Math.max(1, col_span ?? 2),
      row_span: Math.max(1, row_span ?? 2),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ object: data });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });

  const { data, error } = await auth.supabase
    .from('floor_objects')
    .update(rest)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ object: data });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });

  const { error } = await auth.supabase.from('floor_objects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
