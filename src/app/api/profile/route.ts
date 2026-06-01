import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const body = await req.json();
  const { full_name, adeks_member_no } = body;

  const update: Record<string, unknown> = {};
  if (full_name !== undefined) update.full_name = full_name?.trim() || null;
  if (adeks_member_no !== undefined) update.adeks_member_no = adeks_member_no?.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('id, full_name, email, adeks_member_no')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
