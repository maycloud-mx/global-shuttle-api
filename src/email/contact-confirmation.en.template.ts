import {
  escapeHtml,
  renderContactEmailLayout,
} from './contact-email-layout.js';

const GLOBAL_SHUTTLE_WEBSITE = 'https://globalshuttlecancun.com/';

export const CONTACT_CONFIRMATION_EN_SUBJECT =
  'We received your message - Global Shuttle Cancún';

export interface ContactConfirmationTemplateData {
  name: string;
}

export function renderContactConfirmationEmailEn(
  data: ContactConfirmationTemplateData,
): string {
  const name = escapeHtml(data.name);

  const content = `

    <h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0b2940;">
      Hello, ${name}
    </h2>

    <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#5f7384;">
      Thank you for contacting
      <strong>Global Shuttle Cancún</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
      We received your message. Our team will review your request and get back to you as soon as possible.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="background:#eef8f2;border:1px solid #d4ebdf;border-radius:10px;">

      <tr>
        <td style="padding:22px;">

          <div style="margin:0 0 8px;font-size:14px;font-weight:700;color:#167347;">
            Message received
          </div>

          <p style="margin:0;font-size:13px;line-height:1.7;color:#466b57;">
            Our customer service team will review your request.
          </p>

        </td>
      </tr>
    </table>

    <p style="margin:26px 0 0;font-size:15px;line-height:1.75;color:#5f7384;">
      In the meantime, you can explore our transportation services on our website.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:28px;">
      <tr>
        <td align="center">

          <a href="${GLOBAL_SHUTTLE_WEBSITE}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
            Visit our website
          </a>

        </td>
      </tr>
    </table>

    <p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #e7eef3;font-size:14px;line-height:1.75;color:#5f7384;">
      Thank you for your interest. We look forward to helping you.
    </p>

    <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#073b5c;">
      Best regards,
      <br>
      <strong>The Global Shuttle Cancún Team</strong>
    </p>
  `;

  return renderContactEmailLayout({
    language: 'en',
    title: 'Message received - Global Shuttle Cancún',
    preheader: 'We received your message and will be in touch soon.',
    badge: 'MESSAGE RECEIVED',
    badgeBackground: '#e8f7ee',
    badgeColor: '#167347',
    category: 'Customer service',
    heading: 'Thank you for contacting us',
    description: 'We received your message.',
    content,
    footer: 'Customer service',
  });
}

export function renderContactConfirmationTextEn(
  data: ContactConfirmationTemplateData,
): string {
  return `GLOBAL SHUTTLE CANCÚN

THANK YOU FOR CONTACTING US

Hello, ${data.name}

Thank you for contacting Global Shuttle Cancún.

We received your message. Our team will review your request and get back to you as soon as possible.

MESSAGE RECEIVED

Our customer service team will review your request.

In the meantime, you can explore our transportation services on our website:

${GLOBAL_SHUTTLE_WEBSITE}

Thank you for your interest. We look forward to helping you.

Best regards,
The Global Shuttle Cancún Team

This email was generated automatically.`;
}
