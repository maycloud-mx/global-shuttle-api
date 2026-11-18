const GLOBAL_SHUTTLE_LOGO_URL =
  'https://res.cloudinary.com/cwq9jx7i/image/upload/e_trim:10/c_pad,w_150,h_90,b_white/q_auto/v1791934562/LOGO_GLOBAL_SHUTTLE.png';

export interface AccountActivationTemplateData {
  firstName: string;
  username: string;
  activationUrl: string;
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
    timeZoneName: 'short',
  }).format(value);
}

export function renderAccountActivationEmail(
  data: AccountActivationTemplateData,
): string {
  const firstName = escapeHtml(data.firstName);
  const username = escapeHtml(data.username);
  const activationUrl = escapeHtml(data.activationUrl);
  const expiration = escapeHtml(formatExpiration(data.expiresAt));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Active su cuenta - Global Shuttle Cancún</title>
</head>

<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#29465b;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Su cuenta administrativa de Global Shuttle está lista para activarse.
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
                      NUEVA CUENTA
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
                Portal administrativo
              </div>

              <h1 style="margin:10px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#ffffff;">
                Bienvenido a Global Shuttle
              </h1>

              <p style="margin:0;font-size:14px;line-height:1.65;color:#c8dce8;">
                Su cuenta está lista para configurarse.
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
                Se ha creado una cuenta para usted en el sistema administrativo de
                <strong>Global Shuttle Cancún</strong>.
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
                Para comenzar, confirme su cuenta y establezca una contraseña segura
                utilizando el siguiente botón.
              </p>

              <!-- Datos del usuario -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background:#f7fafc;border:1px solid #e7eef3;border-radius:10px;">

                <tr>
                  <td style="padding:20px 22px;">

                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:8px;">
                      Nombre de usuario
                    </div>

                    <div style="font-size:17px;font-weight:700;color:#073b5c;">
                      ${username}
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Botón -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
                <tr>
                  <td align="center">

                    <a href="${activationUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
                      Activar mi cuenta
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
                      <strong style="color:#073b5c;">Vigencia del enlace</strong>
                      <br>
                      Este enlace estará disponible durante 24 horas y vencerá el
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
                <a href="${activationUrl}" style="color:#0284c7;text-decoration:underline;">
                  ${activationUrl}
                </a>
              </p>

              <!-- Seguridad -->
              <p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e7eef3;font-size:13px;line-height:1.7;color:#7890a1;">
                Si no esperaba recibir esta invitación, puede ignorar este mensaje.
                No comparta el enlace de activación con otras personas.
              </p>

            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding:22px 32px;background:#f7fafc;border-top:1px solid #e7eef3;text-align:center;font-size:12px;line-height:1.7;color:#7890a1;">
              <strong>Global Shuttle Cancún</strong>
              <br>
              Acceso al sistema administrativo
              <br>
              Este es un correo automático relacionado con la seguridad de su cuenta.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function renderAccountActivationText(
  data: AccountActivationTemplateData,
): string {
  return `GLOBAL SHUTTLE CANCÚN

ACTIVACIÓN DE CUENTA

Hola, ${data.firstName}

Se ha creado una cuenta para usted en el sistema administrativo de Global Shuttle Cancún.

Nombre de usuario: ${data.username}

Para confirmar su cuenta y establecer su contraseña, abra el siguiente enlace:

${data.activationUrl}

VIGENCIA DEL ENLACE

Este enlace estará disponible durante 24 horas.

Fecha de vencimiento:
${formatExpiration(data.expiresAt)} (hora de Cancún).

Si no esperaba recibir esta invitación, puede ignorar este mensaje.

Por seguridad, no comparta el enlace de activación con otras personas.

Global Shuttle Cancún
Acceso al sistema administrativo`;
}
