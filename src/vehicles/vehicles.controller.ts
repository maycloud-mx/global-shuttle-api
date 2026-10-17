import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { ChangeVehicleStatusDto } from './dto/change-vehicle-status.dto.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesDto } from './dto/list-vehicles.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VEHICLE_PERMISSIONS } from './vehicle-permissions.js';
import { VehiclesService } from './vehicles.service.js';

const VEHICLE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_VEHICLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const vehicleImageInterceptor = () =>
  FileInterceptor('image', {
    limits: { fileSize: VEHICLE_IMAGE_MAX_SIZE },
    fileFilter: (_request, file, callback) => {
      if (!ALLOWED_VEHICLE_IMAGE_TYPES.has(file.mimetype)) {
        callback(
          new BadRequestException('Image must be a JPEG, PNG, or WebP file'),
          false,
        );
        return;
      }

      callback(null, true);
    },
  });

@Controller('admin/vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseInterceptors(vehicleImageInterceptor())
  @RequirePermissions(VEHICLE_PERMISSIONS.CREATE)
  @ApiMessage('Vehicle created successfully')
  create(
    @Body() dto: CreateVehicleDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.vehiclesService.create(dto, image);
  }

  @Get()
  @RequirePermissions(VEHICLE_PERMISSIONS.LIST)
  @ApiMessage('Vehicles retrieved successfully')
  findAll(@Query() query: ListVehiclesDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(VEHICLE_PERMISSIONS.VIEW)
  @ApiMessage('Vehicle retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(vehicleImageInterceptor())
  @RequirePermissions(VEHICLE_PERMISSIONS.UPDATE)
  @ApiMessage('Vehicle updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.vehiclesService.update(id, dto, image);
  }

  @Patch(':id/status')
  @RequirePermissions(VEHICLE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Vehicle status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeVehicleStatusDto,
  ) {
    return this.vehiclesService.changeStatus(id, dto);
  }
}
