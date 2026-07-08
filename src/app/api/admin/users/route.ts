import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Auth gerekli', status: 401 };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (!['admin', 'super_admin'].includes(profile?.role)) {
    return { error: 'Yetkisiz', status: 403 };
  }
  return { success: true, role: profile?.role as string };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = createAdminClient();
  // Fetch profiles. Include created_at if it exists, otherwise just omit it. We'll order by full_name.
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, is_banned, created_at')
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { userId, role, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı ID zorunludur' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (action === 'ban' || action === 'unban') {
      // Check target user's role
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (
        auth.role !== 'super_admin' && 
        ['admin', 'super_admin'].includes(targetProfile?.role)
      ) {
        return NextResponse.json({ error: 'Normal yöneticiler sadece müşterileri banlayabilir.' }, { status: 403 });
      }

      const isBanned = action === 'ban';
      
      // Update Supabase Auth ban duration
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: isBanned ? '876000h' : 'none'
      });
      if (authError) throw authError;

      // Update profiles
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ is_banned: isBanned })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, user: data });
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Sadece Süper Yöneticiler yetki değiştirebilir.' }, { status: 403 });
    }

    if (!role || !['admin', 'super_admin', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bir hata oluştu' }, { status: 500 });
  }
}
