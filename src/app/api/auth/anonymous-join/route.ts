import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, tableNumber } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Geçersiz kod' }, { status: 400 });
    }

    if (!tableNumber) {
      return NextResponse.json({ error: 'Masa numarası gereklidir' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Find the active session with this code
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('table_sessions')
      .select('*, tables ( number )')
      .eq('session_code', code)
      .is('ended_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Aktif masa oturumu bulunamadı veya kod geçersiz.' }, { status: 404 });
    }

    if (String(session.tables?.number) !== String(tableNumber)) {
      return NextResponse.json({ error: 'Masa numarası ile kod eşleşmiyor. Lütfen kontrol ediniz.' }, { status: 403 });
    }

    // 2. Prevent using code for MEMBER sessions to avoid leaking credentials
    if (session.kind === 'MEMBER') {
      return NextResponse.json({ error: 'Bu masada zaten kayıtlı bir üye oturumu var. Üye girişi yapmalısınız.' }, { status: 403 });
    }

    const deterministicEmail = `anon_${session.id}@adeks.local`;
    const deterministicPassword = `Anon-${session.id}`;
    const fullName = `Misafir (Masa ${session.tables?.number || '?'})`;

    let finalUserId = session.user_id;

    // 3. If the session doesn't have a user attached yet (first person to scan)
    if (!finalUserId) {
      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: deterministicEmail,
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (userError) {
        // If user already exists somehow (e.g. they recreated a session with the same ID? impossible due to UUID), we just fetch them
        if (userError.message.includes('already exists')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email === deterministicEmail);
          if (existingUser) {
            finalUserId = existingUser.id;
          }
        } else {
          console.error('Create anonymous user error:', userError);
          return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 });
        }
      } else {
        finalUserId = userData.user.id;
      }

      if (finalUserId) {
        // Upsert Profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: finalUserId,
          full_name: fullName,
          email: deterministicEmail,
          role: 'customer',
          email_verified: true,
        }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          return NextResponse.json({ error: 'Profil oluşturulamadı: ' + profileError.message }, { status: 500 });
        }

        // Link to session
        const { error: updateError } = await supabaseAdmin.from('table_sessions').update({ user_id: finalUserId }).eq('id', session.id);
        
        if (updateError) {
          console.error('Session update error:', updateError);
          return NextResponse.json({ error: 'Oturum güncellenemedi: ' + updateError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      email: deterministicEmail,
      password: deterministicPassword
    });

  } catch (err: any) {
    console.error('Anonymous join error:', err);
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 });
  }
}
