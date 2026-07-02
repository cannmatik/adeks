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

function wrapEmailBody(title: string, bodyContent: string, isOtp = false, otpCode = '', validityDuration = '10 dakika') {
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
      <td align="center" style="padding: 48px 0;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e5e7eb;">
          <tr>
            <td align="center" style="padding: 40px 0 0 0;">
              <div style="font-weight: 800; font-size: 26px; color: #dc2626; font-family: 'Montserrat', sans-serif;">ADEKS</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 48px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">${title}</h1>
              ${isOtp ? `
              <div style="margin: 0 0 32px 0; color: #4b5563; text-align: center; font-size: 16px;">${bodyContent}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #111827; border-radius: 12px; padding: 20px 0; width: 100%; text-align: center; border: 1px solid #dc2626;">
                      <span style="font-family: Helvetica, Arial, sans-serif; font-size: 36px; font-weight: 700; color: #ef4444; letter-spacing: 4px;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563; text-align: center;">
                Bu kod <strong>${validityDuration}</strong> süreyle geçerlidir. Kimseyle paylaşmayın.
              </p>
              ` : `<div style="color: #4b5563; font-size: 16px; line-height: 1.6;">${bodyContent}</div>`}
              <div style="border-top: 1px solid #e5e7eb; margin: 24px 0; width: 100%;"></div>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                ADEKS Internet Kafe
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ADEKS. Tüm hakları saklıdır.
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
    otp
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
