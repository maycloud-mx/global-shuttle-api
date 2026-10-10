import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeVehicleStatusDto } from './dto/change-vehicle-status.dto.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { ListVehiclesDto } from './dto/list-vehicles.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    this.validatePassengerRange(dto.minPax, dto.maxPax);
    try {
      return await this.prisma.vehicle.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          minPax: dto.minPax,
          maxPax: dto.maxPax,
          luggageCapacity: dto.luggageCapacity,
          descriptionEs: dto.descriptionEs?.trim(),
          descriptionEn: dto.descriptionEn?.trim(),
          image: dto.image?.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListVehiclesDto) {
    const search = query.search?.trim();
    const where: Prisma.VehicleWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    const current = await this.findOne(id);
    this.validatePassengerRange(
      dto.minPax ?? current.minPax,
      dto.maxPax ?? current.maxPax,
    );

    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          minPax: dto.minPax,
          maxPax: dto.maxPax,
          luggageCapacity: dto.luggageCapacity,
          descriptionEs: dto.descriptionEs?.trim(),
          descriptionEn: dto.descriptionEn?.trim(),
          image: dto.image?.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(id: number, dto: ChangeVehicleStatusDto) {
    await this.ensureVehicleExists(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async ensureVehicleExists(id: number): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
  }

  private validatePassengerRange(minPax: number, maxPax: number): void {
    if (maxPax < minPax) {
      throw new BadRequestException(
        'Maximum passengers must be greater than or equal to minimum passengers',
      );
    }
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Vehicle name or code is already in use');
    }
  }
}
