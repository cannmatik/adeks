import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetOTP, generateOTP } from '@/lib/email';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('reset_otp_expires')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Change password OTP lookup error:', profileError);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }

  if (profile?.reset_otp_expires) {
    const lastSentAt = new Date(
      new Date(profile.reset_otp_expires).getTime() - 10 * 60 * 1000,
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
    .update({ reset_otp: otp, reset_otp_expires: expiresAt })
    .eq('id', user.id);

  if (updateError) {
    console.error('Change password OTP update error:', updateError);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }

  try {
    await sendPasswordResetOTP(user.email, otp);
  } catch (emailErr) {
    console.warn('Email sending failed:', emailErr);
    return NextResponse.json({ error: 'E-posta gönderilemedi' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
