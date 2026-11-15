import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';

import { ListRatesGridDto } from './dto/list-rates-grid.dto.js';
import { UpsertRatesGridDto } from './dto/upsert-rates-grid.dto.js';
import { ListRateCoverageZonesDto } from './dto/list-rate-coverage-zones.dto.js';
import { BulkUpsertRatesDto } from './dto/bulk-upsert-rates.dto.js';

import { RATE_PERMISSIONS } from './rate-permissions.js';

import { RatesService } from './rates.service.js';
import { RatesBulkService } from './rates-bulk.service.js';
import { RatesImportService } from './rates-import.service.js';
import { RatesTemplateService } from './rates-template.service.js';
import { RatesCoverageService } from './rates-coverage.service.js';

@Controller('admin/rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RatesController {
  constructor(
    private readonly ratesService: RatesService,
    private readonly ratesBulkService: RatesBulkService,
    private readonly ratesImportService: RatesImportService,
    private readonly ratesTemplateService: RatesTemplateService,
    private readonly ratesCoverageService: RatesCoverageService,
  ) {}

  // ============================================
  // GRID
  // ============================================

  @Get('grid')
  @RequirePermissions(RATE_PERMISSIONS.LIST)
  @ApiMessage('Rate grid retrieved successfully')
  getGrid(@Query() query: ListRatesGridDto) {
    return this.ratesService.getGrid(query);
  }

  @Put('grid')
  @RequirePermissions(RATE_PERMISSIONS.UPDATE)
  @ApiMessage('Rates saved successfully')
  saveGrid(
    @Body() dto: UpsertRatesGridDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratesService.saveGrid(dto, user.id);
  }

  // ============================================
  // BULK UPSERT
  // ============================================

  @Post('bulk')
  @RequirePermissions(RATE_PERMISSIONS.UPDATE)
  @ApiMessage('Bulk rates saved successfully')
  upsertBulk(
    @Body() dto: BulkUpsertRatesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratesBulkService.upsertBulk(dto, user.id);
  }

  // ============================================
  // EXCEL TEMPLATE
  // ============================================

  @Get('import/template')
  @RequirePermissions(RATE_PERMISSIONS.LIST)
  async downloadImportTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.ratesTemplateService.generate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_tarifas_global_shuttle.xlsx"',
    );

    res.setHeader('Content-Length', buffer.length.toString());

    return new StreamableFile(buffer);
  }

  // ============================================
  // EXCEL IMPORT - PREVIEW
  // ============================================

  @Post('import/preview')
  @RequirePermissions(RATE_PERMISSIONS.UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiMessage('Rate import preview retrieved successfully')
  previewImport(@UploadedFile() file: Express.Multer.File) {
    return this.ratesImportService.preview(file);
  }

  // ============================================
  // EXCEL IMPORT - APPLY
  // ============================================

  @Post('import/apply')
  @RequirePermissions(RATE_PERMISSIONS.UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiMessage('Rates imported successfully')
  applyImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratesImportService.apply(file, user.id);
  }

  // ============================================
  // RATE COVERAGE
  // ============================================

  @Get('coverage')
  @RequirePermissions(RATE_PERMISSIONS.LIST)
  @ApiMessage('Rate coverage retrieved successfully')
  getCoverage() {
    return this.ratesCoverageService.getSummary();
  }

  @Get('coverage/zones')
  @RequirePermissions(RATE_PERMISSIONS.LIST)
  @ApiMessage('Incomplete rate zones retrieved successfully')
  getIncompleteZones(@Query() query: ListRateCoverageZonesDto) {
    return this.ratesCoverageService.getIncompleteZones(query);
  }
}
