export const RESERVATION_PERMISSIONS = {
  QUOTE: 'reservations:create',
  CREATE: 'reservations:create',
  CREATE_TRANSFER: 'reservations:create',

  LIST: 'reservations:list',
  VIEW: 'reservations:view',

  UPDATE: 'reservations:update',
  SEND_QUOTE_EMAIL: 'reservations:update',
  CANCEL: 'reservations:update',
} as const;
