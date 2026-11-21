// ─── StudySquad AI Transactional Email Helper ────────────────────────────────
// Zero-dependency HTTPS email delivery via Resend (RESEND_API_KEY) or Brevo (BREVO_API_KEY).
// Uses HTTPS APIs instead of raw SMTP so it works reliably on Render Free Tier.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROD_URL = 'https://studysquadai.com';
const DEFAULT_DEV_URL = 'http://localhost:5173';

export const resolvePublicAppUrl = () => {
  const candidates = [
    process.env.APP_URL,
    ...(process.env.CLIENT_URL || '').split(','),
    process.env.RENDER_EXTERNAL_URL,
  ];

  for (const raw of candidates) {
    const val = String(raw || '').trim().replace(/\/$/, '');
    if (val && val !== '*' && (val.startsWith('https://') || val.startsWith('http://'))) {
      return val;
    }
  }

  return process.env.NODE_ENV === 'production' ? DEFAULT_PROD_URL : DEFAULT_DEV_URL;
};

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const parseFromAddress = (rawFrom) => {
  const cleaned = String(rawFrom || '').trim();
  const match = cleaned.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() };
  }
  return { name: 'StudySquad AI', email: cleaned || 'noreply@studysquadai.com' };
};

export const isEmailProviderConfigured = () =>
  Boolean((process.env.RESEND_API_KEY || '').trim() || (process.env.BREVO_API_KEY || '').trim());

export async function sendPasswordResetEmail({ to, name, resetLink, rawToken }) {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();

  if (!resendKey && !brevoKey) {
    return { sent: false, provider: null, reason: 'no_provider_configured' };
  }

  const safeName = escapeHtml(name || 'Student');
  const safeLink = escapeHtml(resetLink);
  const safeToken = escapeHtml(rawToken);
  const subject = 'Reset your StudySquad AI password';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a; background: #ffffff;">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 6px 12px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;">STUDYSQUAD AI</span>
      </div>
      <h2 style="margin: 0 0 12px; font-size: 22px; color: #0f172a;">Reset your password</h2>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
        Hi ${safeName}, we received a request to reset the password for your StudySquad AI account. Click the button below within the next <strong>1 hour</strong>:
      </p>
      <div style="margin: 24px 0;">
        <a href="${safeLink}" style="display: inline-block; padding: 12px 24px; border-radius: 12px; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px;">
          Reset Password &rarr;
        </a>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
        Or paste this reset code in the StudySquad reset box:
      </p>
      <div style="padding: 12px 14px; border-radius: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; font-family: monospace; font-size: 12px; word-break: break-all; color: #0f172a; margin-bottom: 18px;">
        ${safeToken}
      </div>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
        If you didn't request this reset, you can safely ignore this email — your password won't change. You can also sign in anytime with <strong>Continue with Google</strong> at studysquadai.com.
      </p>
    </div>
  `;

  const text = [
    `Hi ${name || 'Student'},`,
    '',
    'We received a request to reset your StudySquad AI password (valid for 1 hour):',
    resetLink,
    '',
    `Reset code: ${rawToken}`,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    if (resendKey) {
      const from = (process.env.EMAIL_FROM || 'StudySquad AI <onboarding@resend.dev>').trim();
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error(`[Mailer/Resend] HTTP ${resp.status}:`, errBody.slice(0, 300));
        return { sent: false, provider: 'resend', reason: `http_${resp.status}` };
      }
      return { sent: true, provider: 'resend' };
    }

    if (brevoKey) {
      const sender = parseFromAddress(process.env.EMAIL_FROM);
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to, name: name || 'Student' }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error(`[Mailer/Brevo] HTTP ${resp.status}:`, errBody.slice(0, 300));
        return { sent: false, provider: 'brevo', reason: `http_${resp.status}` };
      }
      return { sent: true, provider: 'brevo' };
    }

    return { sent: false, provider: null, reason: 'no_provider_configured' };
  } catch (err) {
    console.error('[Mailer] Email delivery failed:', err?.message || err);
    return { sent: false, provider: resendKey ? 'resend' : 'brevo', reason: 'network_error' };
  } finally {
    clearTimeout(timeoutId);
  }
}
