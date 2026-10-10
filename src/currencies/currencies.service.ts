import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangeCurrencyStatusDto } from './dto/change-currency-status.dto.js';
import type { CreateCurrencyDto } from './dto/create-currency.dto.js';
import type { ListCurrenciesDto } from './dto/list-currencies.dto.js';
import type { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCurrencyDto) {
    try {
      return await this.prisma.currency.create({
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

  async findAll(query: ListCurrenciesDto) {
    const search = query.search?.trim();
    const where: Prisma.CurrencyWhereInput = {
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
      this.prisma.currency.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.currency.count({ where }),
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
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async update(id: number, dto: UpdateCurrencyDto) {
    await this.ensureCurrencyExists(id);
    try {
      return await this.prisma.currency.update({
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

  async changeStatus(id: number, dto: ChangeCurrencyStatusDto) {
    await this.ensureCurrencyExists(id);
    return this.prisma.currency.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async ensureCurrencyExists(id: number): Promise<void> {
    const currency = await this.prisma.currency.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!currency) throw new NotFoundException('Currency not found');
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Currency name or code is already in use');
    }
  }
}
