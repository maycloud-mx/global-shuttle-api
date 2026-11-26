import {
  escapeHtml,
  formatContactDateTime,
  renderContactEmailLayout,
} from './contact-email-layout.js';

const GLOBAL_SHUTTLE_ADMIN_URL = 'https://admin.globalshuttlecancun.com/';

export const CONTACT_NOTIFICATION_EN_SUBJECT =
  'New contact request - Global Shuttle Cancún';

export interface ContactNotificationTemplateData {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  comment: string;
  createdAt: Date;
}

export function renderContactNotificationEmailEn(
  data: ContactNotificationTemplateData,
): string {
  const id = escapeHtml(String(data.id));
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);

  const phone = escapeHtml(data.phone?.trim() || 'Not provided');

  const comment = escapeHtml(data.comment).replace(/\r\n|\r|\n/g, '<br>');

  const createdAt = escapeHtml(formatContactDateTime(data.createdAt, 'en'));

  const content = `

    <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
      A new contact request was submitted through the <strong>Global Shuttle Cancún</strong> website.
      The customer provided the details below.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="background:#f7fafc;border:1px solid #e7eef3;border-radius:10px;">

      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Message ID
          </div>

          <div style="font-size:15px;font-weight:700;color:#073b5c;">
            #${id}
          </div>

        </td>
      </tr>

      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Full name
          </div>

          <div style="font-size:15px;font-weight:700;color:#073b5c;overflow-wrap:anywhere;">
            ${name}
          </div>

        </td>
      </tr>

      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Email address
          </div>

          <div style="font-size:15px;color:#073b5c;overflow-wrap:anywhere;word-break:break-word;">
            ${email}
          </div>

        </td>
      </tr>

      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Phone number
          </div>

          <div style="font-size:15px;color:#073b5c;">
            ${phone}
          </div>

        </td>
      </tr>

      <tr>
        <td style="padding:18px 22px;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Date and time received
          </div>

          <div style="font-size:15px;color:#073b5c;">
            ${createdAt}
          </div>

          <div style="margin-top:6px;font-size:12px;color:#7890a1;">
            Cancún, Quintana Roo local time
          </div>

        </td>
      </tr>

    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:24px;background:#eef7fc;border:1px solid #dcecf5;border-radius:10px;">

      <tr>
        <td style="padding:22px;">

          <div style="margin-bottom:12px;font-size:14px;font-weight:700;color:#073b5c;">
            Customer message
          </div>

          <div style="margin:0;font-size:14px;line-height:1.75;color:#52677a;overflow-wrap:anywhere;word-break:break-word;">
            ${comment}
          </div>

        </td>
      </tr>
    </table>

    <p style="margin:26px 0 0;font-size:14px;line-height:1.75;color:#5f7384;">
      Open the admin dashboard to review and follow up on this request.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:28px;">
      <tr>
        <td align="center">

          <a href="${GLOBAL_SHUTTLE_ADMIN_URL}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
            Open the admin dashboard
          </a>

        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e7eef3;font-size:13px;line-height:1.7;color:#7890a1;">
      This message was recorded automatically from the website contact form.
    </p>
  `;

  return renderContactEmailLayout({
    language: 'en',
    title: 'New contact request - Global Shuttle Cancún',
    preheader: 'A new contact request was submitted through the website.',
    badge: 'NEW MESSAGE',
    badgeBackground: '#e8f5fc',
    badgeColor: '#0277b5',
    category: 'Admin dashboard',
    heading: 'New contact request',
    description: 'A message was submitted through the website.',
    content,
    footer: 'Admin notifications',
  });
}

export function renderContactNotificationTextEn(
  data: ContactNotificationTemplateData,
): string {
  const phone = data.phone?.trim() || 'Not provided';

  return `GLOBAL SHUTTLE CANCÚN

NEW CONTACT REQUEST

A new contact request was submitted through the Global Shuttle Cancún website.

CUSTOMER DETAILS

Message ID: #${data.id}
Full name: ${data.name}
Email address: ${data.email}
Phone number: ${phone}

DATE AND TIME RECEIVED

${formatContactDateTime(data.createdAt, 'en')}
Cancún, Quintana Roo local time.

CUSTOMER MESSAGE

${data.comment}

Open the admin dashboard to review and follow up on this request:

${GLOBAL_SHUTTLE_ADMIN_URL}

Global Shuttle Cancún
Admin notifications

This email was generated automatically.`;
}
