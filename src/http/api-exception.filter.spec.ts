import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ApiExceptionFilter } from './api-exception.filter.js';

function createHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ originalUrl: '/api/v1/admin/rates/import/preview' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('ApiExceptionFilter', () => {
  it('preserves structured validation errors from an HTTP exception', () => {
    const { host, status, json } = createHost();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new BadRequestException({
        message: 'Excel validation failed',
        errors: ['Row 2: invalid or missing values'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Excel validation failed',
        errors: ['Row 2: invalid or missing values'],
      }),
    );
  });

  it('preserves the expected columns for invalid Excel headers', () => {
    const { host, json } = createHost();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new BadRequestException({
        message: 'Invalid Excel columns',
        expectedColumns: ['Zona origen', 'Zona destino'],
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid Excel columns',
        expectedColumns: ['Zona origen', 'Zona destino'],
      }),
    );
  });
});
