import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const [tablesRes, ratesRes] = await Promise.all([
    supabase
      .from('tables')
      .select('id, number, category, status, position_x, position_y, notes, shape, room:rooms(id, name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)')
      .order('number', { ascending: true }),
    supabase.from('categories').select('name, hourly_rate'),
  ]);

  if (tablesRes.error) return NextResponse.json({ error: tablesRes.error.message }, { status: 500 });

  const rateMap: Record<string, number> = {};
  for (const r of ratesRes.data ?? []) rateMap[(r as any).name] = Number((r as any).hourly_rate);

  const tables = (tablesRes.data ?? []).map((t: any) => ({
    ...t,
    hourly_rate: rateMap[t.category] ?? null,
  }));

  return NextResponse.json({ tables });
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Auth gerekli', status: 401 } as const;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { error: 'Yetkisiz', status: 403 } as const;
  return { supabase } as const;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { number, category, status, notes, room_id, position_x, position_y, pc_id, shape } = body;

  if (!number || !category) {
    return NextResponse.json({ error: 'number ve category zorunlu' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('tables')
    .insert({
      number,
      category,
      status: status ?? 'AVAILABLE',
      notes: notes ?? null,
      room_id: room_id ?? null,
      position_x: position_x ?? 0,
      position_y: position_y ?? 0,
      pc_id: pc_id ?? null,
      shape: shape ?? 'SQUARE',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ table: data });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });

  const { data, error } = await auth.supabase
    .from('tables')
    .update(rest)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ table: data });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });

  const { error } = await auth.supabase.from('tables').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
