import { Resend } from 'resend'

export function generateOTP(): string {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < 6; i += 1) {
    otp += digits.charAt(Math.floor(Math.random() * 10))
  }
  return otp
}

const FROM = process.env.RESEND_FROM_EMAIL || 'ADEKS Internet Cafe <onboarding@resend.dev>'

export async function sendVerificationOTP(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY yok. ${email} icin OTP: ${otp}`)
    return
  }

  const resend = new Resend(apiKey)
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0A0E14;color:#F4F4F5;border-radius:16px;">
      <h2 style="color:#00D4FF;margin:0 0 16px;">ADEKS Internet Kafe</h2>
      <p style="color:#A1A1AA;margin:0 0 24px;">E-posta dogrulama kodunuz:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#141A22;padding:16px;text-align:center;border-radius:12px;border:1px solid rgba(0,212,255,0.2);">${otp}</div>
      <p style="color:#71717A;font-size:12px;margin-top:24px;">Bu kod 10 dakika gecerlidir. Sizin disinizda biri kayit oluyorsa bu e-postayi yok sayabilirsiniz.</p>
    </div>`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'ADEKS — E-posta Dogrulama Kodunuz',
    html,
  })
}
