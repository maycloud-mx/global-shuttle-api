import {
  escapeHtml,
  formatContactDateTime,
  renderContactEmailLayout,
} from './contact-email-layout.js';

const GLOBAL_SHUTTLE_ADMIN_URL = 'https://admin.globalshuttlecancun.com/';

export const CONTACT_NOTIFICATION_SUBJECT =
  'Nueva solicitud de contacto - Global Shuttle Cancún';

export interface ContactNotificationTemplateData {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  comment: string;
  createdAt: Date;
}

export function renderContactNotificationEmail(
  data: ContactNotificationTemplateData,
): string {
  const id = escapeHtml(String(data.id));
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);

  const phone = escapeHtml(data.phone?.trim() || 'No proporcionado');

  const comment = escapeHtml(data.comment).replace(/\r\n|\r|\n/g, '<br>');

  const createdAt = escapeHtml(formatContactDateTime(data.createdAt));

  const content = `

    <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
      Se ha recibido una nueva solicitud de contacto a través
      del sitio web de <strong>Global Shuttle Cancún</strong>.
      A continuación, se presenta la información proporcionada
      por el cliente.
    </p>

    <!-- Datos del contacto -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="background:#f7fafc;border:1px solid #e7eef3;border-radius:10px;">

      <!-- Identificador -->
      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Identificador del mensaje
          </div>

          <div style="font-size:15px;font-weight:700;color:#073b5c;">
            #${id}
          </div>

        </td>
      </tr>

      <!-- Nombre -->
      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Nombre completo
          </div>

          <div style="font-size:15px;font-weight:700;color:#073b5c;overflow-wrap:anywhere;">
            ${name}
          </div>

        </td>
      </tr>

      <!-- Correo electrónico -->
      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Correo electrónico
          </div>

          <div style="font-size:15px;color:#073b5c;overflow-wrap:anywhere;word-break:break-word;">
            ${email}
          </div>

        </td>
      </tr>

      <!-- Teléfono -->
      <tr>
        <td style="padding:18px 22px;border-bottom:1px solid #e7eef3;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Teléfono
          </div>

          <div style="font-size:15px;color:#073b5c;">
            ${phone}
          </div>

        </td>
      </tr>

      <!-- Fecha de recepción -->
      <tr>
        <td style="padding:18px 22px;">

          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7890a1;margin-bottom:7px;">
            Fecha y hora de recepción
          </div>

          <div style="font-size:15px;color:#073b5c;">
            ${createdAt}
          </div>

          <div style="margin-top:6px;font-size:12px;color:#7890a1;">
            Hora de Cancún, Quintana Roo
          </div>

        </td>
      </tr>

    </table>

    <!-- Mensaje -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:24px;background:#eef7fc;border:1px solid #dcecf5;border-radius:10px;">

      <tr>
        <td style="padding:22px;">

          <div style="margin-bottom:12px;font-size:14px;font-weight:700;color:#073b5c;">
            Mensaje del cliente
          </div>

          <div style="margin:0;font-size:14px;line-height:1.75;color:#52677a;overflow-wrap:anywhere;word-break:break-word;">
            ${comment}
          </div>

        </td>
      </tr>
    </table>

    <!-- Instrucciones -->
    <p style="margin:26px 0 0;font-size:14px;line-height:1.75;color:#5f7384;">
      Ingrese al panel administrativo para consultar la solicitud
      y dar seguimiento al mensaje recibido.
    </p>

    <!-- Botón -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:28px;">
      <tr>
        <td align="center">

          <a href="${GLOBAL_SHUTTLE_ADMIN_URL}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
            Ir al panel administrativo
          </a>

        </td>
      </tr>
    </table>

    <!-- Nota final -->
    <p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e7eef3;font-size:13px;line-height:1.7;color:#7890a1;">
      Este mensaje fue registrado automáticamente desde el
      formulario de contacto del sitio web.
    </p>
  `;

  return renderContactEmailLayout({
    title: 'Nueva solicitud de contacto - Global Shuttle Cancún',
    preheader:
      'Se ha recibido una nueva solicitud de contacto desde el sitio web.',
    badge: 'NUEVO MENSAJE',
    badgeBackground: '#e8f5fc',
    badgeColor: '#0277b5',
    category: 'Portal administrativo',
    heading: 'Nueva solicitud de contacto',
    description: 'Se ha recibido un mensaje desde el sitio web.',
    content,
    footer: 'Notificaciones administrativas',
  });
}

export function renderContactNotificationText(
  data: ContactNotificationTemplateData,
): string {
  const phone = data.phone?.trim() || 'No proporcionado';

  return `GLOBAL SHUTTLE CANCÚN

NUEVA SOLICITUD DE CONTACTO

Se ha recibido una nueva solicitud de contacto a través del sitio web de Global Shuttle Cancún.

DATOS DEL CLIENTE

Identificador del mensaje: #${data.id}
Nombre completo: ${data.name}
Correo electrónico: ${data.email}
Teléfono: ${phone}

FECHA Y HORA DE RECEPCIÓN

${formatContactDateTime(data.createdAt)}
Hora de Cancún, Quintana Roo.

MENSAJE DEL CLIENTE

${data.comment}

Ingrese al panel administrativo para consultar la solicitud y dar seguimiento al mensaje recibido:

${GLOBAL_SHUTTLE_ADMIN_URL}

Global Shuttle Cancún
Notificaciones administrativas

Este es un correo generado automáticamente.`;
}
