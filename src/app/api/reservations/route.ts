import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');

  let reservationIds: string[] | null = null;
  if (profile?.role !== 'admin' || scope === 'mine') {
    const [ownedRes, participantRes] = await Promise.all([
      supabase.from('reservations').select('id').eq('user_id', user.id),
      supabase.from('reservation_participants').select('reservation_id').eq('user_id', user.id),
    ]);
    const ids = new Set<string>();
    (ownedRes.data ?? []).forEach((r: any) => ids.add(r.id));
    (participantRes.data ?? []).forEach((r: any) => ids.add(r.reservation_id));
    reservationIds = Array.from(ids);
    if (reservationIds.length === 0) return NextResponse.json({ reservations: [] });
  }

  let query = supabase
    .from('reservations')
    .select(
      `id, start_time, end_time, status, notes, user_id, created_at,
       owner:profiles!reservations_user_id_fkey(id, full_name, email),
       tables:reservation_tables(table:tables(id, number, category)),
       contact_phone,
       participants:reservation_participants(user:profiles(id, full_name, email))`,
    )
    .order('start_time', { ascending: false });

  if (reservationIds) {
    query = query.in('id', reservationIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reservations: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const body = await req.json();
  const { table_ids, start_time, end_time, notes, contact_phone } = body as {
    table_ids: string[];
    start_time: string;
    end_time: string;
    notes?: string | null;
    contact_phone?: string | null;
  };

  if (!Array.isArray(table_ids) || table_ids.length === 0 || !start_time || !end_time) {
    return NextResponse.json(
      { error: 'table_ids (en az 1), start_time ve end_time zorunlu' },
      { status: 400 },
    );
  }
  if (!contact_phone || contact_phone.trim().length < 10) {
    return NextResponse.json(
      { error: 'Geçerli bir iletişim telefonu zorunlu' },
      { status: 400 },
    );
  }

  // Çakışma kontrolü — masaların hiçbiri seçilen aralıkta HOLD veya CONFIRMED olmamalı
  const { data: overlapping, error: conflictError } = await supabase
    .from('reservations')
    .select('id, reservation_tables(table_id)')
    .in('status', ['HOLD', 'CONFIRMED'])
    .lt('start_time', end_time)
    .gt('end_time', start_time);

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 500 });
  }
  const busy = new Set<string>();
  for (const r of overlapping ?? []) {
    for (const rt of (r as any).reservation_tables ?? []) busy.add(rt.table_id);
  }
  if (table_ids.some((tid) => busy.has(tid))) {
    return NextResponse.json(
      { error: 'Seçilen masalardan en az biri bu zaman aralığında dolu.' },
      { status: 409 },
    );
  }

  // Rezervasyonu HOLD olarak oluştur
  const { data: reservation, error: rError } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      start_time,
      end_time,
      status: 'HOLD',
      notes: notes ?? null,
      contact_phone: contact_phone.trim(),
    })
    .select()
    .single();
  if (rError) return NextResponse.json({ error: rError.message }, { status: 400 });

  // Masaları bağla
  const { error: tablesError } = await supabase
    .from('reservation_tables')
    .insert(table_ids.map((tid) => ({ reservation_id: reservation.id, table_id: tid })));
  if (tablesError) {
    await supabase.from('reservations').delete().eq('id', reservation.id);
    return NextResponse.json({ error: tablesError.message }, { status: 500 });
  }

  // Sahibi katılımcı olarak ekle
  const { error: participantError } = await supabase
    .from('reservation_participants')
    .insert({ reservation_id: reservation.id, user_id: user.id });

  if (participantError) {
    console.error('Reservation participant insert error:', participantError);
  }

  // Rezervasyon için conversation oluştur
  const { error: convError } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, reservation_id: reservation.id });

  if (convError) {
    console.error('Conversation insert error:', convError);
  }

  return NextResponse.json({ reservation });
}
