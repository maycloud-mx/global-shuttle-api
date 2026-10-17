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
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
          <td style="padding:16px 0;border-top:1px solid #e5e7eb;">
            <strong style="color:#111827;">${index === 0 ? 'Traslado de salida' : 'Traslado de regreso'}</strong><br>
            <span>${escapeHtml(transfer.origin)} → ${escapeHtml(transfer.destination)}</span><br>
            <span>Servicio: ${formatDate(transfer.serviceDate)}, ${formatTime(transfer.serviceTime)}</span><br>
            <span>Recogida: ${formatDate(transfer.pickupDate)}, ${formatTime(transfer.pickupTime)}</span><br>
            <span>Vehículo: ${escapeHtml(transfer.vehicle)} · ${transfer.passengers} pasajero${transfer.passengers === 1 ? '' : 's'}</span>
          </td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#374151;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f3f4f6;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:#0f172a;color:#ffffff;">
                <div style="font-size:24px;font-weight:bold;">Global Shuttle</div>
                <div style="margin-top:6px;color:#cbd5e1;">Cotización ${escapeHtml(data.folio)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Hola, ${escapeHtml(data.customerName)}</h1>
                <p style="margin:0 0 24px;line-height:1.6;">Preparamos la siguiente cotización para tu servicio de traslado.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${transfers}
                </table>
                <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:8px;text-align:right;">
                  <div style="font-size:13px;color:#64748b;">Total de la cotización</div>
                  <div style="margin-top:4px;font-size:26px;font-weight:bold;color:#0f172a;">${escapeHtml(data.currencyCode)} ${escapeHtml(data.total)}</div>
                </div>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">Esta cotización está sujeta a disponibilidad hasta que la reservación sea confirmada.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
