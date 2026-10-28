import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { CurrenciesModule } from './currencies/currencies.module.js';
import { ServiceTypesModule } from './service-types/service-types.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { ZonesModule } from './zones/zones.module.js';
import { TransferPointsModule } from './transfer-points/transfer-points.module.js';
import { RatesModule } from './rates/rates.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { MediaModule } from './media/media.module.js';
import { CountriesModule } from './countries/countries.module.js';
import { AirlinesModule } from './airlines/airlines.module.js';
import { EmailModule } from './email/email.module.js';
import { PublicModule } from './public/public.module.js';

@Module({
  imports: [
    PrismaModule,
    MediaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CurrenciesModule,
    ServiceTypesModule,
    VehiclesModule,
    ZonesModule,
    TransferPointsModule,
    RatesModule,
    ReservationsModule,
    CountriesModule,
    AirlinesModule,
    EmailModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
