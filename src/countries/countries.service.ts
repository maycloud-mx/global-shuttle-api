import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { ChangeCountryStatusDto } from './dto/change-country-status.dto.js';
import type { CreateCountryDto } from './dto/create-country.dto.js';
import type { ListCountriesDto } from './dto/list-country.dto.js';
import type { UpdateCountryDto } from './dto/update-country.dto.js';

@Injectable()
export class CountriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCountryDto) {
    try {
      return await this.prisma.country.create({
        data: {
          name: dto.name.trim(),
          iso2: dto.iso2.trim().toUpperCase(),
          phoneCode: dto.phoneCode.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(query: ListCountriesDto) {
    const search = query.search?.trim();

    const where: Prisma.CountryWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { iso2: { contains: search } },
              { phoneCode: { contains: search } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.country.findMany({
        where,
        orderBy: [
          { name: 'asc' },
          { id: 'asc' },
        ],
        skip,
        take: query.limit,
      }),
      this.prisma.country.count({ where }),
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
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async update(id: number, dto: UpdateCountryDto) {
    await this.ensureCountryExists(id);

    try {
      return await this.prisma.country.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          iso2: dto.iso2?.trim().toUpperCase(),
          phoneCode: dto.phoneCode?.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async changeStatus(
    id: number,
    dto: ChangeCountryStatusDto,
  ) {
    await this.ensureCountryExists(id);

    return this.prisma.country.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  private async ensureCountryExists(
    id: number,
  ): Promise<void> {
    const country = await this.prisma.country.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Country name or ISO2 code is already in use',
      );
    }
  }
}