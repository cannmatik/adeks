import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH: session bitir (ended_at + amount_charged hesapla)
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
  if (!['admin', 'super_admin'].includes(profile?.role)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { end, notes, needs_support } = body;

  if (end) {
    const { data: existing } = await supabase
      .from('table_sessions')
      .select('started_at, hourly_rate_snapshot')
      .eq('id', id)
      .single();

    let amount: number | null = null;
    if (existing?.started_at && existing.hourly_rate_snapshot) {
      const hours = (Date.now() - new Date(existing.started_at).getTime()) / 3_600_000;
      amount = Math.round(hours * Number(existing.hourly_rate_snapshot) * 100) / 100;
    }

    const { data, error } = await supabase
      .from('table_sessions')
      .update({
        ended_at: new Date().toISOString(),
        amount_charged: amount,
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq('id', id)
      .is('ended_at', null)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ session: data });
  }

  const updatePayload: any = {};
  if (notes !== undefined) updatePayload.notes = notes;
  if (needs_support !== undefined) updatePayload.needs_support = needs_support;

  const { data, error } = await supabase
    .from('table_sessions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: data });
}
