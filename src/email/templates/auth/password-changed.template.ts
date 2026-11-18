const GLOBAL_SHUTTLE_LOGO_URL =
  'https://res.cloudinary.com/cwq9jx7i/image/upload/e_trim:10/c_pad,w_150,h_90,b_white/q_auto/v1791934562/LOGO_GLOBAL_SHUTTLE.png';

export interface PasswordChangedTemplateData {
  firstName: string;
  changedAt: Date;
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

function formatDateTime(value: Date): string {
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

export function renderPasswordChangedEmail(
  data: PasswordChangedTemplateData,
): string {
  const firstName = escapeHtml(data.firstName);
  const changedAt = escapeHtml(formatDateTime(data.changedAt));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Contraseña actualizada - Global Shuttle Cancún</title>
</head>

<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#29465b;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    La contraseña de su cuenta de Global Shuttle Cancún ha sido actualizada.
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
                    <span style="display:inline-block;padding:8px 12px;border-radius:18px;background:#e8f7ee;font-size:11px;font-weight:700;letter-spacing:.7px;color:#167347;">
                      CONTRASEÑA ACTUALIZADA
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
                Su contraseña fue actualizada
              </h1>

              <p style="margin:0;font-size:14px;line-height:1.65;color:#c8dce8;">
                Confirmación de cambio de credenciales.
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
                Le confirmamos que la contraseña de su cuenta en el
                sistema administrativo de
                <strong>Global Shuttle Cancún</strong>
                se ha actualizado correctamente.
              </p>

              <!-- Confirmación -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background:#eef8f2;border:1px solid #d4ebdf;border-radius:10px;">

                <tr>
                  <td style="padding:22px;">

                    <div style="margin:0 0 8px;font-size:14px;font-weight:700;color:#167347;">
                      Cambio realizado correctamente
                    </div>

                    <p style="margin:0;font-size:13px;line-height:1.7;color:#466b57;">
                      Su nueva contraseña ya se encuentra registrada
                      y podrá utilizarla en su próximo inicio de sesión.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Fecha -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="margin-top:24px;background:#f7fafc;border:1px solid #e7eef3;border-radius:10px;">

                <tr>
                  <td style="padding:20px 22px;">

                    <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:8px;">
                      Fecha y hora del cambio
                    </div>

                    <div style="font-size:15px;font-weight:700;color:#073b5c;">
                      ${changedAt}
                    </div>

                    <div style="margin-top:6px;font-size:12px;color:#7890a1;">
                      Hora de Cancún, Quintana Roo
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Advertencia -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="margin-top:28px;background:#fff8f8;border:1px solid #f3d5d8;border-radius:10px;">

                <tr>
                  <td style="padding:20px 22px;">

                    <div style="margin-bottom:9px;font-size:14px;font-weight:700;color:#8b4550;">
                      ¿Usted no realizó este cambio?
                    </div>

                    <p style="margin:0;font-size:13px;line-height:1.75;color:#8b4550;">
                      Si no reconoce esta actividad, comuníquese
                      inmediatamente con el administrador del sistema
                      para revisar y proteger su cuenta.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Nota final -->
              <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#7890a1;">
                Por seguridad, Global Shuttle Cancún nunca le solicitará
                compartir su contraseña por correo electrónico.
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

export function renderPasswordChangedText(
  data: PasswordChangedTemplateData,
): string {
  return `GLOBAL SHUTTLE CANCÚN

CONTRASEÑA ACTUALIZADA

Hola, ${data.firstName}

Le confirmamos que la contraseña de su cuenta en el sistema administrativo de Global Shuttle Cancún se ha actualizado correctamente.

CAMBIO REALIZADO CORRECTAMENTE

Su nueva contraseña ya se encuentra registrada y podrá utilizarla en su próximo inicio de sesión.

FECHA Y HORA DEL CAMBIO

${formatDateTime(data.changedAt)}
Hora de Cancún, Quintana Roo.

¿USTED NO REALIZÓ ESTE CAMBIO?

Si no reconoce esta actividad, comuníquese inmediatamente con el administrador del sistema para revisar y proteger su cuenta.

Por seguridad, Global Shuttle Cancún nunca le solicitará compartir su contraseña por correo electrónico.

Global Shuttle Cancún
Seguridad del sistema administrativo`;
}
