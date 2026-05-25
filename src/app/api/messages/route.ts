import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: kullanıcının (veya conversation_id verilmişse admin için) conversation + mesajları
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
  const conversationIdParam = searchParams.get('conversationId');

  let conversationId = conversationIdParam;

  if (!conversationId) {
    // customer: kendi conversation'ı; yoksa oluştur
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
      conversationId = created.id;
    }
  } else if (profile?.role !== 'admin') {
    // customer admin değilse sadece kendi conversation'ına erişebilir
    const { data: own } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!own) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversationId, messages: messages ?? [] });
}

// POST: mesaj gönder
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const body = await req.json();
  const { conversationId, content } = body;
  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: 'conversationId ve content zorunlu' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return NextResponse.json({ message: data });
}
