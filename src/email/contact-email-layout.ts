const GLOBAL_SHUTTLE_LOGO_URL =
  'https://res.cloudinary.com/cwq9jx7i/image/upload/e_trim:10/c_pad,w_150,h_90,b_white/q_auto/v1791934562/LOGO_GLOBAL_SHUTTLE.png';

interface ContactEmailLayoutData {
  language?: 'es' | 'en';
  title: string;
  preheader: string;
  badge: string;
  badgeBackground: string;
  badgeColor: string;
  category: string;
  heading: string;
  description: string;
  content: string;
  footer: string;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;',
      })[character]!,
  );
}

export function formatContactDateTime(
  value: Date,
  language: 'es' | 'en' = 'es',
): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Cancun',
  }).format(value);
}

export function renderContactEmailLayout(data: ContactEmailLayoutData): string {
  return `<!doctype html>
<html lang="${data.language ?? 'es'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(data.title)}</title>
</head>

<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#29465b;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(data.preheader)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="background:#f3f7fb;">
    <tr>
      <td align="center" style="padding:32px 14px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:640px;background:#ffffff;border:1px solid #dbe5ec;border-radius:14px;overflow:hidden;">

          <!-- Barra superior -->
          <tr>
            <td style="height:5px;background:#e11d48;font-size:0;line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- Logotipo -->
          <tr>
            <td style="padding:24px 32px;background:#ffffff;border-bottom:1px solid #e7eef3;">

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img
                      src="${GLOBAL_SHUTTLE_LOGO_URL}"
                      width="150"
                      height="90"
                      alt="Global Shuttle Cancún"
                      style="display:block;width:150px;height:90px;border:0;outline:none;text-decoration:none;"
                    >
                  </td>

                  <td align="right">
                    <span style="display:inline-block;padding:8px 12px;border-radius:18px;background:${data.badgeBackground};font-size:11px;font-weight:700;letter-spacing:.7px;color:${data.badgeColor};">
                      ${escapeHtml(data.badge)}
                    </span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Encabezado -->
          <tr>
            <td style="padding:34px 32px 30px;background:#073b5c;color:#ffffff;">

              <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#7dd3fc;">
                ${escapeHtml(data.category)}
              </div>

              <h1 style="margin:10px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#ffffff;">
                ${escapeHtml(data.heading)}
              </h1>

              <p style="margin:0;font-size:14px;line-height:1.65;color:#c8dce8;">
                ${escapeHtml(data.description)}
              </p>

            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:32px;">
              ${data.content}
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding:22px 32px;background:#f7fafc;border-top:1px solid #e7eef3;text-align:center;font-size:12px;line-height:1.7;color:#7890a1;">

              <strong>Global Shuttle Cancún</strong>
              <br>
              ${escapeHtml(data.footer)}
              <br>
              ${data.language === 'en' ? 'This email was generated automatically.' : 'Este es un correo generado automáticamente.'}

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
