import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendVerificationOTP, generateOTP } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, fullName, phone } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'E-posta, şifre ve ad soyad zorunludur' },
        { status: 400 },
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email_verified, verification_otp_expires')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.email_verified) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kayıtlı' },
        { status: 400 },
      );
    }

    let userId: string;

    if (existingProfile) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
          password,
          email_confirm: false,
          user_metadata: { full_name: fullName },
        });

      if (userError || !userData.user) {
        return NextResponse.json(
          { error: userError?.message || 'Kullanıcı güncellenemedi' },
          { status: 400 },
        );
      }

      userId = userData.user.id;
    } else {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: { full_name: fullName },
        });

      if (userError || !userData.user) {
        return NextResponse.json(
          { error: userError?.message || 'Kullanıcı oluşturulamadı' },
          { status: 400 },
        );
      }

      userId = userData.user.id;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email,
          phone: phone || null,
          role: 'customer',
          email_verified: false,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return NextResponse.json({ error: 'Profil kaydedilemedi' }, { status: 500 });
    }

    if (existingProfile?.verification_otp_expires) {
      const lastSentAt = new Date(
        new Date(existingProfile.verification_otp_expires).getTime() - 10 * 60 * 1000,
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

    const { error: otpError } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_otp: otp,
        verification_otp_expires: expiresAt,
      })
      .eq('id', userId);

    if (otpError) throw otpError;

    try {
      await sendVerificationOTP(email, otp);
    } catch (emailErr) {
      console.warn('Email sending failed (non-fatal):', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi.',
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Sunucu hatası' },
      { status: 500 },
    );
  }
}
