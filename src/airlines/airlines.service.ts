import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { ChangeAirlineStatusDto } from './dto/change-airline-status.dto.js';
import type { CreateAirlineDto } from './dto/create-airline.dto.js';
import type { ListAirlinesDto } from './dto/list-airlines.dto.js';
import type { UpdateAirlineDto } from './dto/update-airline.dto.js';

@Injectable()
export class AirlinesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAirlineDto) {
    try {
      return await this.prisma.airline.create({
        data: {
          name: dto.name.trim(),
          iataCode: dto.iataCode.trim().toUpperCase(),
          icaoCode: dto.icaoCode.trim().toUpperCase(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListAirlinesDto) {
    const search = query.search?.trim();

    const where: Prisma.AirlineWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { iataCode: { contains: search } },
              { icaoCode: { contains: search } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.airline.findMany({
        where,
        orderBy: [
          { name: 'asc' },
          { id: 'asc' },
        ],
        skip,
        take: query.limit,
      }),
      this.prisma.airline.count({ where }),
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
    const airline = await this.prisma.airline.findUnique({
      where: { id },
    });

    if (!airline) {
      throw new NotFoundException('Airline not found');
    }

    return airline;
  }

  findOptions() {
    return this.prisma.airline.findMany({
      where: { status: true },
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async update(id: number, dto: UpdateAirlineDto) {
    await this.ensureAirlineExists(id);

    try {
      return await this.prisma.airline.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          iataCode: dto.iataCode?.trim().toUpperCase(),
          icaoCode: dto.icaoCode?.trim().toUpperCase(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(
    id: number,
    dto: ChangeAirlineStatusDto,
  ) {
    await this.ensureAirlineExists(id);

    return this.prisma.airline.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  private async ensureAirlineExists(
    id: number,
  ): Promise<void> {
    const airline = await this.prisma.airline.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!airline) {
      throw new NotFoundException('Airline not found');
    }
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Airline IATA or ICAO code is already in use',
      );
    }
  }
}
