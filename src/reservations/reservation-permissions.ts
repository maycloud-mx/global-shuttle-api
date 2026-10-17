export const RESERVATION_PERMISSIONS = {
  QUOTE: 'reservations:create',
  CREATE: 'reservations:create',
  LIST: 'reservations:list',
  VIEW: 'reservations:view',
  UPDATE: 'reservations:update',
  REQUOTE: 'reservations:update',
  SEND_QUOTE_EMAIL: 'reservations:update',
  CANCEL: 'reservations:update',
} as const;
