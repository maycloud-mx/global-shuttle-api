const GLOBAL_SHUTTLE_LOGO_URL =
  'https://res.cloudinary.com/cwq9jx7i/image/upload/e_trim:10/c_pad,w_150,h_90,b_white/q_auto/v1791934562/LOGO_GLOBAL_SHUTTLE.png';

export interface PasswordResetTemplateData {
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

function escapeHtml(value: string): string {
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

function formatExpiration(value: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Cancun',
  }).format(value);
}

export function renderPasswordResetEmail(
  data: PasswordResetTemplateData,
): string {
  const firstName = escapeHtml(data.firstName);
  const resetUrl = escapeHtml(data.resetUrl);
  const expiration = escapeHtml(formatExpiration(data.expiresAt));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Restablecer contraseña - Global Shuttle Cancún</title>
</head>

<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#29465b;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Recibimos una solicitud para restablecer la contraseña de su cuenta.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;">
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
                    <span style="display:inline-block;padding:8px 12px;border-radius:18px;background:#e8f5fc;font-size:11px;font-weight:700;letter-spacing:.7px;color:#0277b5;">
                      SEGURIDAD
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
                Seguridad de su cuenta
              </div>

              <h1 style="margin:10px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#ffffff;">
                Restablezca su contraseña
              </h1>

              <p style="margin:0;font-size:14px;line-height:1.65;color:#c8dce8;">
                Proteja el acceso a su cuenta administrativa.
              </p>

            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:32px;">

              <h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0b2940;">
                Hola, ${firstName}
              </h2>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#5f7384;">
                Recibimos una solicitud para restablecer la contraseña
                de su cuenta en el sistema administrativo de
                <strong>Global Shuttle Cancún</strong>.
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
                Para establecer una nueva contraseña, haga clic en el
                siguiente botón.
              </p>

              <!-- Botón -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
                <tr>
                  <td align="center">

                    <a href="${resetUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
                      Restablecer contraseña
                    </a>

                  </td>
                </tr>
              </table>

              <!-- Expiración -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="margin-top:30px;background:#eef7fc;border-radius:10px;">

                <tr>
                  <td style="padding:18px 20px;">

                    <p style="margin:0;font-size:13px;line-height:1.7;color:#52677a;">
                      <strong style="color:#073b5c;">Enlace temporal</strong>
                      <br>
                      Por seguridad, este enlace tiene una vigencia de
                      <strong>30 minutos</strong> y vencerá el
                      <strong>${expiration}</strong>
                      (hora de Cancún).
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Enlace alternativo -->
              <p style="margin:28px 0 10px;font-size:13px;line-height:1.65;color:#6b7f90;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:
              </p>

              <p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;">
                <a href="${resetUrl}" style="color:#0284c7;text-decoration:underline;">
                  ${resetUrl}
                </a>
              </p>

              <!-- Seguridad -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="margin-top:28px;border:1px solid #f3d5d8;border-radius:10px;background:#fff8f8;">

                <tr>
                  <td style="padding:18px 20px;">

                    <p style="margin:0;font-size:13px;line-height:1.7;color:#8b4550;">
                      <strong>¿No solicitó este cambio?</strong>
                      <br>
                      Puede ignorar este correo. Su contraseña actual
                      permanecerá sin modificaciones mientras no complete
                      el proceso de recuperación.
                    </p>

                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#7890a1;">
                Por seguridad, no comparta este enlace con otras personas.
                El enlace solo puede utilizarse una vez.
              </p>

            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding:22px 32px;background:#f7fafc;border-top:1px solid #e7eef3;text-align:center;font-size:12px;line-height:1.7;color:#7890a1;">
              <strong>Global Shuttle Cancún</strong>
              <br>
              Seguridad del sistema administrativo
              <br>
              Este es un correo automático relacionado con su cuenta.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function renderPasswordResetText(
  data: PasswordResetTemplateData,
): string {
  return `GLOBAL SHUTTLE CANCÚN

RESTABLECIMIENTO DE CONTRASEÑA

Hola, ${data.firstName}

Recibimos una solicitud para restablecer la contraseña de su cuenta en el sistema administrativo de Global Shuttle Cancún.

Para establecer una nueva contraseña, abra el siguiente enlace:

${data.resetUrl}

VIGENCIA DEL ENLACE

Este enlace tiene una vigencia de 30 minutos.

Fecha de vencimiento:
${formatExpiration(data.expiresAt)} (hora de Cancún).

¿NO SOLICITÓ ESTE CAMBIO?

Puede ignorar este correo. Su contraseña actual permanecerá sin modificaciones mientras no complete el proceso de recuperación.

Por seguridad, no comparta este enlace con otras personas.

Global Shuttle Cancún
Seguridad del sistema administrativo`;
}
