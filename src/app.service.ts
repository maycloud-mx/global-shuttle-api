import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'global-shuttle-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
