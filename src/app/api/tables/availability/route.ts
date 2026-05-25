import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/tables/availability?start=ISO&end=ISO&category=GOLD
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const category = searchParams.get('category');

  if (!start || !end) {
    return NextResponse.json({ error: 'start ve end zorunlu' }, { status: 400 });
  }
  if (new Date(end) <= new Date(start)) {
    return NextResponse.json({ error: 'Bitiş başlangıçtan sonra olmalı' }, { status: 400 });
  }

  // 1) Çakışan rezervasyonları bul
  const { data: overlapping, error: oErr } = await supabase
    .from('reservations')
    .select('id, reservation_tables(table_id)')
    .in('status', ['HOLD', 'CONFIRMED'])
    .lt('start_time', end)
    .gt('end_time', start);

  if (oErr) {
    console.error('availability overlap error:', oErr);
    return NextResponse.json({ error: oErr.message }, { status: 500 });
  }

  const busy = new Set<string>();
  for (const r of overlapping ?? []) {
    const rts = (r as any).reservation_tables ?? [];
    for (const rt of rts) busy.add(rt.table_id);
  }

  // 2) Adaylar — oda ve kategori fiyatı ile birlikte
  let q = supabase
    .from('tables')
    .select('id, number, category, status, position_x, position_y, notes, room:rooms(id, name, description, color, display_order)')
    .neq('status', 'MAINTENANCE')
    .order('number', { ascending: true });
  if (category) q = q.eq('category', category);

  const { data: tables, error: tErr } = await q;
  if (tErr) {
    console.error('availability tables error:', tErr);
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const { data: rates } = await supabase.from('categories').select('name, hourly_rate');
  const rateMap: Record<string, number> = {};
  for (const r of rates ?? []) rateMap[(r as any).name] = Number((r as any).hourly_rate);

  const available = (tables ?? [])
    .filter((t: any) => !busy.has(t.id))
    .map((t: any) => ({ ...t, hourly_rate: rateMap[t.category] ?? null }));

  return NextResponse.json({ tables: available });
}
