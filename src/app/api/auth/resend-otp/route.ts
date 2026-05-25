import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendVerificationOTP, generateOTP } from '@/lib/email';

const GENERIC_MESSAGE = 'Eğer bu e-postaya kayıtlı ve doğrulanmamış bir hesap varsa, yeni kod gönderildi.';

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'E-posta gereklidir' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email_verified, verification_otp_expires')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Resend OTP profile lookup error:', profileError);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    if (!profile || profile.email_verified) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    if (profile.verification_otp_expires) {
      const lastSentAt = new Date(
        new Date(profile.verification_otp_expires).getTime() - 10 * 60 * 1000,
      );
      const diffMinutes = (Date.now() - lastSentAt.getTime()) / 1000 / 60;
      if (diffMinutes < 2) {
        const waitSeconds = Math.ceil((2 - diffMinutes) * 60);
        return NextResponse.json(
          { error: `Lütfen ${waitSeconds} saniye sonra tekrar deneyin.` },
          { status: 429 },
        );
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_otp: otp,
        verification_otp_expires: expiresAt,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Resend OTP update error:', updateError);
      return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }

    try {
      await sendVerificationOTP(email, otp);
    } catch (emailErr) {
      console.warn('Email sending failed:', emailErr);
      return NextResponse.json({ error: 'E-posta gönderilemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
