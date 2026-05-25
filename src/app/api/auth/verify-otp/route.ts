import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const INVALID_CODE_MESSAGE = 'Geçersiz veya süresi dolmuş kod.';

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp: rawOtp } = await req.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email_verified, verification_otp, verification_otp_expires')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Verify OTP profile lookup error:', profileError);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    if (profile?.email_verified) {
      return NextResponse.json({ success: true, message: 'E-posta adresiniz doğrulandı.' });
    }

    if (
      !profile?.verification_otp ||
      profile.verification_otp !== otp ||
      !profile.verification_otp_expires ||
      new Date(profile.verification_otp_expires) < new Date()
    ) {
      return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { email_confirm: true },
    );

    if (updateError) {
      console.error('Supabase confirm error:', updateError);
      return NextResponse.json({ error: 'E-posta doğrulama hatası' }, { status: 500 });
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email_verified: true,
        verification_otp: null,
        verification_otp_expires: null,
      })
      .eq('id', profile.id);

    if (profileUpdateError) {
      console.error('Verify OTP profile update error:', profileUpdateError);
      return NextResponse.json({ error: 'E-posta doğrulama hatası' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'E-posta adresiniz doğrulandı.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
