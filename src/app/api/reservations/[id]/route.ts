import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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
  const isAdmin = profile?.role === 'admin';

  const body = await req.json();
  const { status, notes, admin_notes, start_time, end_time, contact_phone, table_ids } = body;

  if (table_ids !== undefined && (!Array.isArray(table_ids) || table_ids.length === 0)) {
    return NextResponse.json({ error: 'En az bir masa seçilmeli' }, { status: 400 });
  }

  if (admin_notes !== undefined && !isAdmin) {
    return NextResponse.json({ error: 'Admin notu için yetki gerekli' }, { status: 403 });
  }

  if (status !== undefined && !isAdmin && status !== 'CANCELLED') {
    return NextResponse.json({ error: 'Bu durum değişikliği için yetki gerekli' }, { status: 403 });
  }

  if (!isAdmin) {
    const [ownedRes, participantRes] = await Promise.all([
      supabase.from('reservations').select('id').eq('id', id).eq('user_id', user.id).maybeSingle(),
      supabase
        .from('reservation_participants')
        .select('reservation_id')
        .eq('reservation_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!ownedRes.data && !participantRes.data) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
  }

  if (start_time !== undefined || end_time !== undefined || table_ids !== undefined) {
    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('status, start_time, end_time, reservation_tables(table_id)')
      .eq('id', id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: 'Rezervasyon bulunamadı' }, { status: 404 });
    }

    if (current.status !== 'HOLD') {
      return NextResponse.json(
        { error: 'Onaylanmış rezervasyonun zamanı veya masaları değiştirilemez' },
        { status: 403 },
      );
    }

    const newStart = start_time ?? current.start_time;
    const newEnd = end_time ?? current.end_time;
    const tableIds: string[] = table_ids ?? (current.reservation_tables ?? []).map((rt: any) => rt.table_id);

    // Çakışma kontrolü — yeni zaman aralığında masalardan biri dolu olmamalı
    const { data: overlapping, error: conflictError } = await supabase
      .from('reservations')
      .select('id, reservation_tables(table_id)')
      .in('status', ['HOLD', 'CONFIRMED'])
      .neq('id', id)
      .lt('start_time', newEnd)
      .gt('end_time', newStart);

    if (conflictError) {
      return NextResponse.json({ error: conflictError.message }, { status: 500 });
    }
    const busy = new Set<string>();
    for (const r of overlapping ?? []) {
      for (const rt of (r as any).reservation_tables ?? []) busy.add(rt.table_id);
    }
    if (tableIds.some((tid: string) => busy.has(tid))) {
      return NextResponse.json(
        { error: 'Seçilen masalardan en az biri bu zaman aralığında dolu.' },
        { status: 409 },
      );
    }
  }

  const update: Record<string, unknown> = {};
  if (status) {
    update.status = status;
    if (status === 'CANCELLED' || status === 'COMPLETED') {
      update.contact_phone = null;
    }
  }
  if (notes !== undefined) update.notes = notes;
  if (admin_notes !== undefined) update.admin_notes = admin_notes;
  if (start_time) update.start_time = start_time;
  if (end_time) update.end_time = end_time;
  if (contact_phone !== undefined && update.contact_phone !== null) {
    update.contact_phone = contact_phone.trim() || null;
  }

  if (Object.keys(update).length === 0 && table_ids === undefined) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }

  let data: any = null;
  if (Object.keys(update).length > 0) {
    const res = await supabase.from('reservations').update(update).eq('id', id).select().single();
    if (res.error) {
      console.error('PATCH ERROR:', res.error);
      return NextResponse.json({ error: res.error.message }, { status: 400 });
    }
    data = res.data;
  }

  if (table_ids !== undefined) {
    const { error: delErr } = await supabase.from('reservation_tables').delete().eq('reservation_id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const { error: insErr } = await supabase
      .from('reservation_tables')
      .insert(table_ids.map((tid: string) => ({ reservation_id: id, table_id: tid })));
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  if (!data) {
    const res = await supabase.from('reservations').select().eq('id', id).single();
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
    data = res.data;
  }

  return NextResponse.json({ reservation: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
