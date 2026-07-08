import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = await createClient();
  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const { session_id, message } = body;

  if (!session_id || !message?.trim()) {
    return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
  }

  // 1. Get Session
  const { data: session } = await supabase
    .from('table_sessions')
    .select('*, tables:table_id(number)')
    .eq('id', session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
  }

  if (user) {
    try {
      let convQuery = supabase.from('conversations').select('id');
      if (session.reservation_id) {
        convQuery = convQuery.eq('reservation_id', session.reservation_id);
      } else {
        convQuery = convQuery.eq('user_id', user.id).is('reservation_id', null);
      }
      
      let { data: conversation } = await convQuery.maybeSingle();

      if (!conversation) {
        const { data: newConv } = await supabase.from('conversations').insert({
          user_id: user.id,
          reservation_id: session.reservation_id || null
        }).select().single();
        conversation = newConv;
      }

      if (conversation) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Masa ${session.tables?.number || session.table_id} (Destek Talebi): ${message.trim()}`
        });
        
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }
    } catch (chatErr) {
      console.error('Chat message creation failed:', chatErr);
      // We don't fail the whole request just because chat integration failed.
    }
  }

  try {
    // Set needs_support and support_message on the session using admin client
    await adminAuthClient
      .from('table_sessions')
      .update({ needs_support: true, support_message: message.trim() })
      .eq('id', session.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to send support message:', err);
    return NextResponse.json({ error: 'Destek talebi gönderilemedi' }, { status: 500 });
  }
}
