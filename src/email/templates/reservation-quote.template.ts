interface QuoteTransferTemplateData {
  origin: string;
  destination: string;
  serviceDate: Date;
  serviceTime: Date;
  pickupDate: Date;
  pickupTime: Date;
  passengers: number;
  vehicle: string;
}

const GLOBAL_SHUTTLE_LOGO_URL =
  'https://res.cloudinary.com/cwq9jx7i/image/upload/e_trim:10/c_pad,w_150,h_90,b_white/q_auto/v1791934562/LOGO_GLOBAL_SHUTTLE.png';

export interface ReservationQuoteTemplateData {
  folio: string;
  customerName: string;
  currencyCode: string;
  total: string;
  transfers: QuoteTransferTemplateData[];
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(value);
}

export function renderReservationQuoteEmail(
  data: ReservationQuoteTemplateData,
): string {
  const transfers = data.transfers
    .map(
      (transfer, index) => `
        <tr>
          <td style="padding:0 0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dbe5ec;border-radius:10px;background:#ffffff;">
              <tr>
                <td style="width:5px;background:${index === 0 ? '#0284c7' : '#e11d48'};border-radius:10px 0 0 10px;"></td>
                <td style="padding:20px 22px;">
                  <div style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#0284c7;">${index === 0 ? 'Outbound transfer' : 'Return transfer'}</div>
                  <div style="font-size:17px;font-weight:700;line-height:1.45;color:#0b2940;">${escapeHtml(transfer.origin)} <span style="color:#0284c7;">&rarr;</span> ${escapeHtml(transfer.destination)}</div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;font-size:14px;line-height:1.65;color:#52677a;">
                    <tr><td style="width:92px;font-weight:700;color:#29465b;">Service</td><td>${formatDate(transfer.serviceDate)} at ${formatTime(transfer.serviceTime)}</td></tr>
                    <tr><td style="font-weight:700;color:#29465b;">Pickup</td><td>${formatDate(transfer.pickupDate)} at ${formatTime(transfer.pickupTime)}</td></tr>
                    <tr><td style="font-weight:700;color:#29465b;">Vehicle</td><td>${escapeHtml(transfer.vehicle)}</td></tr>
                    <tr><td style="font-weight:700;color:#29465b;">Passengers</td><td>${transfer.passengers}</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Global Shuttle Quote ${escapeHtml(data.folio)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#29465b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Global Shuttle transportation quote ${escapeHtml(data.folio)} is ready.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe5ec;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(7,59,92,.08);">
            <tr><td style="height:5px;background:#e11d48;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:24px 32px;background:#ffffff;border-bottom:1px solid #e7eef3;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <img src="${GLOBAL_SHUTTLE_LOGO_URL}" width="150" height="90" alt="Global Shuttle Cancun" style="display:block;width:150px;height:90px;border:0;outline:none;text-decoration:none;">
                    </td>
                    <td align="right"><span style="display:inline-block;padding:8px 12px;border-radius:18px;background:#e8f5fc;font-size:11px;font-weight:700;letter-spacing:.7px;color:#0277b5;">QUOTE</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 24px;background:#073b5c;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#7dd3fc;">Transportation quote</div>
                <h1 style="margin:10px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#ffffff;">Your journey starts here</h1>
                <div style="font-size:14px;color:#c8dce8;">Reference ${escapeHtml(data.folio)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0b2940;">Hello, ${escapeHtml(data.customerName)}</h2>
                <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:#5f7384;">Thank you for considering Global Shuttle. We prepared the following transportation quote for you.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${transfers}</table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-radius:10px;background:#eef7fc;">
                  <tr>
                    <td style="padding:22px 24px;font-size:13px;color:#52677a;">Quote total</td>
                    <td align="right" style="padding:22px 24px;font-size:27px;font-weight:700;color:#073b5c;">${escapeHtml(data.currencyCode)} ${escapeHtml(data.total)}</td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7f90;">This quote is subject to availability until your reservation is confirmed. If you have any questions, simply reply to this email and our team will be happy to assist you.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background:#f7fafc;border-top:1px solid #e7eef3;text-align:center;font-size:12px;line-height:1.6;color:#7890a1;">Global Shuttle Cancun<br>Reliable transportation for every journey</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderReservationQuoteText(
  data: ReservationQuoteTemplateData,
): string {
  const transfers = data.transfers
    .map(
      (transfer, index) => `${index === 0 ? 'OUTBOUND TRANSFER' : 'RETURN TRANSFER'}
${transfer.origin} -> ${transfer.destination}
Service: ${formatDate(transfer.serviceDate)} at ${formatTime(transfer.serviceTime)}
Pickup: ${formatDate(transfer.pickupDate)} at ${formatTime(transfer.pickupTime)}
Vehicle: ${transfer.vehicle}
Passengers: ${transfer.passengers}`,
    )
    .join('\n\n');

  return `GLOBAL SHUTTLE CANCUN

TRANSPORTATION QUOTE
Reference: ${data.folio}

Hello, ${data.customerName}

Thank you for considering Global Shuttle. We prepared the following transportation quote for you.

${transfers}

QUOTE TOTAL: ${data.currencyCode} ${data.total}

This quote is subject to availability until your reservation is confirmed. If you have any questions, simply reply to this email and our team will be happy to assist you.

Global Shuttle Cancun
Reliable transportation for every journey`;
}
