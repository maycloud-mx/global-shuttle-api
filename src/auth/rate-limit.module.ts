import { Global, Module } from '@nestjs/common';
import { minutes, ThrottlerModule } from '@nestjs/throttler';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        limit: 60,
        ttl: minutes(1),
      },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
