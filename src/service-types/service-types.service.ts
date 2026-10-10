import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeServiceTypeStatusDto } from './dto/change-service-type-status.dto.js';
import type { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import type { ListServiceTypesDto } from './dto/list-service-types.dto.js';
import type { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';

@Injectable()
export class ServiceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceTypeDto) {
    try {
      return await this.prisma.serviceType.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListServiceTypesDto) {
    const search = query.search?.trim();
    const where: Prisma.ServiceTypeWhereInput = {
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
      this.prisma.serviceType.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.serviceType.count({ where }),
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
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id },
    });
    if (!serviceType) throw new NotFoundException('Service type not found');
    return serviceType;
  }

  async update(id: number, dto: UpdateServiceTypeDto) {
    await this.ensureServiceTypeExists(id);
    try {
      return await this.prisma.serviceType.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(id: number, dto: ChangeServiceTypeStatusDto) {
    await this.ensureServiceTypeExists(id);
    return this.prisma.serviceType.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async ensureServiceTypeExists(id: number): Promise<void> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!serviceType) throw new NotFoundException('Service type not found');
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Service type name or code is already in use',
      );
    }
  }
}
