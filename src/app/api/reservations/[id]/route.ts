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
  const { status, notes, admin_notes, start_time, end_time, contact_phone } = body;

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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
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
