import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { session_id, items, notes } = body;

  if (!session_id || !items || items.length === 0) {
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

  // 2. Get Menu Items to calculate total and verify prices
  const itemIds = items.map((i: any) => i.menu_item_id);
  const { data: menuItems } = await supabase
    .from('cafe_menu_items')
    .select('*')
    .in('id', itemIds);

  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({ error: 'Geçersiz menü ürünleri' }, { status: 400 });
  }

  let total_amount = 0;
  const orderItemsData = items.map((clientItem: any) => {
    const dbItem = menuItems.find(m => m.id === clientItem.menu_item_id);
    if (!dbItem) throw new Error('Ürün bulunamadı');
    
    const quantity = parseInt(clientItem.quantity, 10);
    const unit_price = parseFloat(dbItem.price);
    total_amount += quantity * unit_price;

    return {
      menu_item_id: dbItem.id,
      quantity,
      unit_price
    };
  });

  // 3. Insert Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      session_id: session.id,
      table_id: session.table_id,
      user_id: user.id,
      total_amount,
      notes,
      status: 'PENDING'
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Sipariş oluşturulamadı' }, { status: 500 });
  }

  // 4. Insert Order Items
  const orderItemsInsert = orderItemsData.map((item: any) => ({
    ...item,
    order_id: order.id
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsInsert);

  if (itemsError) {
    return NextResponse.json({ error: 'Sipariş detayları kaydedilemedi' }, { status: 500 });
  }

  // 5. Send Notification Message
  try {
    // Try to find conversation by reservation_id if session has one, or by user_id
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
        content: `Masa ${session.tables?.number || session.table_id} sipariş verdi: ${orderItemsData.length} çeşit ürün (Toplam: ₺${total_amount}). Lütfen Siparişler sekmesini kontrol edin.`
      });
    }
  } catch (err) {
    console.error('Failed to send order notification message:', err);
  }

  return NextResponse.json({ order });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

  let query = supabase
    .from('orders')
    .select(`
      *,
      tables ( number ),
      profiles:user_id ( full_name ),
      order_items (
        quantity,
        unit_price,
        cafe_menu_items ( name )
      )
    `)
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    // Regular users can only see their own orders
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { order_id, status } = body;

  if (!order_id || !status) {
    return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', order_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
