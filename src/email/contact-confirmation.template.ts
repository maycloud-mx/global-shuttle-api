import {
  escapeHtml,
  renderContactEmailLayout,
} from './contact-email-layout.js';

const GLOBAL_SHUTTLE_WEBSITE =
  'https://globalshuttlecancun.com/';

export const CONTACT_CONFIRMATION_SUBJECT =
  'Hemos recibido su mensaje - Global Shuttle Cancún';

export interface ContactConfirmationTemplateData {
  name: string;
}

export function renderContactConfirmationEmail(
  data: ContactConfirmationTemplateData,
): string {
  const name = escapeHtml(data.name);

  const content = `

    <h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0b2940;">
      Hola, ${name}
    </h2>

    <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#5f7384;">
      Gracias por ponerse en contacto con
      <strong>Global Shuttle Cancún</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#5f7384;">
      Hemos recibido su mensaje correctamente. Nuestro equipo
      revisará su solicitud y se pondrá en contacto con usted
      lo antes posible.
    </p>

    <!-- Confirmación -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="background:#eef8f2;border:1px solid #d4ebdf;border-radius:10px;">

      <tr>
        <td style="padding:22px;">

          <div style="margin:0 0 8px;font-size:14px;font-weight:700;color:#167347;">
            Mensaje recibido correctamente
          </div>

          <p style="margin:0;font-size:13px;line-height:1.7;color:#466b57;">
            Su solicitud ha sido registrada y se encuentra
            pendiente de revisión por nuestro equipo de atención al cliente.
          </p>

        </td>
      </tr>
    </table>

    <p style="margin:26px 0 0;font-size:15px;line-height:1.75;color:#5f7384;">
      Mientras tanto, le invitamos a conocer nuestros servicios
      de transportación a través de nuestro sitio web.
    </p>

    <!-- Botón -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="margin-top:28px;">
      <tr>
        <td align="center">

          <a href="${GLOBAL_SHUTTLE_WEBSITE}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-block;padding:16px 32px;background:#0284c7;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">
            Visitar nuestro sitio web
          </a>

        </td>
      </tr>
    </table>

    <!-- Despedida -->
    <p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #e7eef3;font-size:14px;line-height:1.75;color:#5f7384;">
      Agradecemos su interés y esperamos tener la oportunidad de atenderle.
    </p>

    <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#073b5c;">
      Atentamente,
      <br>
      <strong>Equipo de Global Shuttle Cancún</strong>
    </p>
  `;

  return renderContactEmailLayout({
    title: 'Mensaje recibido - Global Shuttle Cancún',
    preheader:
      'Hemos recibido su mensaje. Nuestro equipo se pondrá en contacto con usted.',
    badge: 'MENSAJE RECIBIDO',
    badgeBackground: '#e8f7ee',
    badgeColor: '#167347',
    category: 'Atención al cliente',
    heading: 'Gracias por contactarnos',
    description: 'Hemos recibido su mensaje correctamente.',
    content,
    footer: 'Atención al cliente',
  });
}

export function renderContactConfirmationText(
  data: ContactConfirmationTemplateData,
): string {
  return `GLOBAL SHUTTLE CANCÚN

GRACIAS POR CONTACTARNOS

Hola, ${data.name}

Gracias por ponerse en contacto con Global Shuttle Cancún.

Hemos recibido su mensaje correctamente. Nuestro equipo revisará su solicitud y se pondrá en contacto con usted lo antes posible.

MENSAJE RECIBIDO CORRECTAMENTE

Su solicitud ha sido registrada y se encuentra pendiente de revisión por nuestro equipo de atención al cliente.

Mientras tanto, le invitamos a conocer nuestros servicios de transportación a través de nuestro sitio web:

${GLOBAL_SHUTTLE_WEBSITE}

Agradecemos su interés y esperamos tener la oportunidad de atenderle.

Atentamente,
Equipo de Global Shuttle Cancún

Este es un correo generado automáticamente.`;
}