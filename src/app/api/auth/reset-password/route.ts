import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const INVALID_CODE_MESSAGE = 'Geçersiz veya süresi dolmuş kod.';

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp: rawOtp, newPassword } = await req.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, reset_otp, reset_otp_expires')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Reset password profile lookup error:', profileError);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    if (
      !profile?.reset_otp ||
      profile.reset_otp !== otp ||
      !profile.reset_otp_expires ||
      new Date(profile.reset_otp_expires) < new Date()
    ) {
      return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword },
    );

    if (updateAuthError) {
      console.error('Reset password auth update error:', updateAuthError);
      return NextResponse.json({ error: 'Şifre güncellenemedi' }, { status: 500 });
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ reset_otp: null, reset_otp_expires: null })
      .eq('id', profile.id);

    if (profileUpdateError) {
      console.error('Reset password profile update error:', profileUpdateError);
    }

    return NextResponse.json({ success: true, message: 'Şifreniz güncellendi.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
