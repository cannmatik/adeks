import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: reservationId verilmişse o rezervasyonun conversation + mesajlarını döndür
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
  const reservationId = searchParams.get('reservationId');

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId zorunlu' }, { status: 400 });
  }

  // Yetki kontrolü: admin veya rezervasyon sahibi/katılımcısı olmalı
  if (profile?.role !== 'admin') {
    const [ownedRes, participantRes] = await Promise.all([
      supabase.from('reservations').select('id').eq('id', reservationId).eq('user_id', user.id).maybeSingle(),
      supabase.from('reservation_participants').select('reservation_id').eq('reservation_id', reservationId).eq('user_id', user.id).maybeSingle(),
    ]);
    if (!ownedRes.data && !participantRes.data) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
  }

  // Rezervasyona ait conversation'ı bul
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  if (!conversation) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadMessageIds = messages
    ?.filter((m) => !m.is_read && m.sender_id !== user.id)
    .map((m) => m.id) ?? [];

  if (unreadMessageIds.length > 0) {
    await supabase.from('messages').update({ is_read: true }).in('id', unreadMessageIds);
  }

  // Rezervasyon detaylarını da çek
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*, owner:profiles!user_id(full_name, email), tables:reservation_tables(table:tables(number))')
    .eq('id', reservationId)
    .single();

  if (reservation && profile?.role !== 'admin') {
    delete (reservation as any).admin_notes;
  }

  return NextResponse.json({ conversationId: conversation.id, messages: messages ?? [], reservation });
}

// POST: mesaj gönder
export async function POST(req: Request) {
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

  const body = await req.json();
  const { reservationId, content } = body;
  if (!reservationId || !content?.trim()) {
    return NextResponse.json({ error: 'reservationId ve content zorunlu' }, { status: 400 });
  }

  // Yetki kontrolü
  if (profile?.role !== 'admin') {
    const [ownedRes, participantRes] = await Promise.all([
      supabase.from('reservations').select('id').eq('id', reservationId).eq('user_id', user.id).maybeSingle(),
      supabase.from('reservation_participants').select('reservation_id').eq('reservation_id', reservationId).eq('user_id', user.id).maybeSingle(),
    ]);
    if (!ownedRes.data && !participantRes.data) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
  }

  // Rezervasyona ait conversation'ı bul
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: 'Conversation bulunamadı' }, { status: 404 });

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id);

  return NextResponse.json({ message: data });
}
