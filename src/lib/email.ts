import { Resend } from 'resend';

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
}

function wrapEmailBody(
  title: string,
  bodyContent: string,
  isOtp = false,
  otpCode = '',
  validityDuration = '10 dakika',
  icon = '📨',
) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ADEKS</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #e5e7eb;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); border-bottom: 3px solid #dc2626; padding: 32px 0;">
              <div style="font-weight: 800; font-size: 28px; color: #ffffff; letter-spacing: 1px;">ADEKS</div>
              <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px; margin-top: 4px;">Internet Kafe</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <div style="text-align: center; font-size: 34px; line-height: 1; margin-bottom: 12px;">${icon}</div>
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">${title}</h1>
              ${isOtp ? `
              <div style="margin: 0 0 28px 0; color: #4b5563; text-align: center; font-size: 15px; line-height: 1.6;">${bodyContent}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #111827; border-radius: 12px; padding: 22px 0; width: 100%; text-align: center; border: 1px solid #c9a227;">
                      <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Doğrulama Kodu</div>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #ffffff; letter-spacing: 8px;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; text-align: center;">
                Bu kod <strong style="color: #dc2626;">${validityDuration}</strong> süreyle geçerlidir.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #9ca3af; text-align: center;">
                Bu işlemi siz başlatmadıysanız, bu e-postayı yok sayabilirsiniz.
              </p>
              ` : `<div style="color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">${bodyContent}</div>`}
              <div style="border-top: 1px solid #e5e7eb; margin: 8px 0 0 0; width: 100%;"></div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ADEKS Internet Kafe. Tüm hakları saklıdır.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(to: string, subject: string, title: string, bodyContent: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set');
    return;
  }

  const html = wrapEmailBody(title, bodyContent);

  const { data, error } = await getResend().emails.send({
    from: SENDER_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(error.message);
  }

  console.log(`Email sent to ${to}, id: ${data?.id}`);
}

export async function sendVerificationOTP(email: string, otp: string, _referenceCode?: string | null) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set');
    return;
  }

  const html = wrapEmailBody(
    'E-posta Doğrulama',
    'ADEKS\'e kayıt olduğunuz için teşekkürler! Kaydınızı tamamlamak için aşağıdaki doğrulama kodunu kullanın.',
    true,
    otp,
    '10 dakika',
    '✅',
  );

  const { data, error } = await getResend().emails.send({
    from: SENDER_EMAIL,
    to: email,
    subject: 'ADEKS — E-posta Doğrulama Kodunuz',
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(error.message);
  }

  console.log(`OTP sent to ${email}, id: ${data?.id}`);
}

export async function sendPasswordResetOTP(email: string, otp: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set');
    return;
  }

  const html = wrapEmailBody(
    'Şifre Sıfırlama',
    'ADEKS hesabınız için şifre sıfırlama talebinde bulundunuz. Devam etmek için aşağıdaki kodu kullanın.',
    true,
    otp,
    '10 dakika',
    '🔐',
  );

  const { data, error } = await getResend().emails.send({
    from: SENDER_EMAIL,
    to: email,
    subject: 'ADEKS — Şifre Sıfırlama Kodunuz',
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(error.message);
  }

  console.log(`Password reset OTP sent to ${email}, id: ${data?.id}`);
}
