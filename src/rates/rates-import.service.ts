import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import ExcelJS from 'exceljs';

import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_IMPORT_ROWS = 1000;
const LOOKUP_BATCH_SIZE = 100;

const REQUIRED_HEADERS = [
  'originZoneId',
  'destinationZoneId',
  'vehicleId',
  'currencyId',
  'serviceTypeId',
  'price',
] as const;

type ImportRateRow = {
  rowNumber: number;
  originZoneId: number;
  destinationZoneId: number;
  vehicleId: number;
  currencyId: number;
  serviceTypeId: number;
  price: number;
};

type RateCombination = Omit<ImportRateRow, 'rowNumber' | 'price'>;

@Injectable()
export class RatesImportService {
  constructor(private readonly prisma: PrismaService) {}

  private createKey(row: RateCombination): string {
    return [
      row.originZoneId,
      row.destinationZoneId,
      row.vehicleId,
      row.currencyId,
      row.serviceTypeId,
    ].join(':');
  }

  private parsePositiveInteger(value: ExcelJS.CellValue): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
      return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }

  private parsePrice(value: ExcelJS.CellValue): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const text = String(value).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      return null;
    }

    const number = Number(text);

    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  private async parseFile(file: Express.Multer.File): Promise<ImportRateRow[]> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('An Excel file is required');
    }

    if (!file.originalname?.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are supported');
    }

    const workbook = new ExcelJS.Workbook();

    try {
      const excelBuffer = new ArrayBuffer(file.buffer.byteLength);

      new Uint8Array(excelBuffer).set(file.buffer);

      await workbook.xlsx.load(excelBuffer);
    } catch {
      throw new BadRequestException('The Excel file is invalid or corrupted');
    }

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException(
        'The Excel file does not contain a worksheet',
      );
    }

    const headerRow = worksheet.getRow(1);

    const actualHeaders = Array.from(
      {
        length: Math.max(headerRow.cellCount, REQUIRED_HEADERS.length),
      },
      (_, index) => String(headerRow.getCell(index + 1).value ?? '').trim(),
    );

    const validHeaders =
      actualHeaders.length === REQUIRED_HEADERS.length &&
      REQUIRED_HEADERS.every(
        (header, index) => actualHeaders[index] === header,
      );

    if (!validHeaders) {
      throw new BadRequestException({
        message: 'Invalid Excel columns',
        expectedColumns: [...REQUIRED_HEADERS],
      });
    }

    const rows: ImportRateRow[] = [];
    const errors: string[] = [];
    const combinations = new Set<string>();

    let processedRows = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const hasValues = row.hasValues;

      if (!hasValues) {
        return;
      }

      processedRows++;

      // Evitar procesar más filas de las permitidas.
      if (processedRows > MAX_IMPORT_ROWS) {
        return;
      }

      const originZoneId = this.parsePositiveInteger(row.getCell(1).value);

      const destinationZoneId = this.parsePositiveInteger(row.getCell(2).value);

      const vehicleId = this.parsePositiveInteger(row.getCell(3).value);

      const currencyId = this.parsePositiveInteger(row.getCell(4).value);

      const serviceTypeId = this.parsePositiveInteger(row.getCell(5).value);

      const price = this.parsePrice(row.getCell(6).value);

      if (
        originZoneId === null ||
        destinationZoneId === null ||
        vehicleId === null ||
        currencyId === null ||
        serviceTypeId === null ||
        price === null ||
        row.getCell(7).value != null
      ) {
        errors.push(`Row ${rowNumber}: invalid or missing values`);
        return;
      }

      const item: ImportRateRow = {
        rowNumber,
        originZoneId,
        destinationZoneId,
        vehicleId,
        currencyId,
        serviceTypeId,
        price,
      };

      const key = this.createKey(item);

      if (combinations.has(key)) {
        errors.push(`Row ${rowNumber}: duplicate rate combination`);
        return;
      }

      combinations.add(key);
      rows.push(item);
    });

    if (processedRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `The file exceeds the limit of ${MAX_IMPORT_ROWS} rates`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Excel validation failed',
        errors,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('The Excel file does not contain rates');
    }

    return rows;
  }

  private async validateReferences(rows: ImportRateRow[]): Promise<void> {
    const zoneIds = [
      ...new Set(
        rows.flatMap((row) => [row.originZoneId, row.destinationZoneId]),
      ),
    ];

    const vehicleIds = [...new Set(rows.map((row) => row.vehicleId))];

    const currencyIds = [...new Set(rows.map((row) => row.currencyId))];

    const serviceTypeIds = [...new Set(rows.map((row) => row.serviceTypeId))];

    const [zones, vehicles, currencies, serviceTypes] = await Promise.all([
      this.prisma.zone.findMany({
        where: {
          id: { in: zoneIds },
          status: true,
        },
        select: { id: true },
      }),

      this.prisma.vehicle.findMany({
        where: {
          id: { in: vehicleIds },
          status: true,
        },
        select: { id: true },
      }),

      this.prisma.currency.findMany({
        where: {
          id: { in: currencyIds },
          status: true,
        },
        select: { id: true },
      }),

      this.prisma.serviceType.findMany({
        where: {
          id: { in: serviceTypeIds },
          status: true,
        },
        select: { id: true },
      }),
    ]);

    const activeZones = new Set(zones.map((item) => item.id));

    const activeVehicles = new Set(vehicles.map((item) => item.id));

    const activeCurrencies = new Set(currencies.map((item) => item.id));

    const activeServices = new Set(serviceTypes.map((item) => item.id));

    const errors: string[] = [];

    for (const row of rows) {
      if (!activeZones.has(row.originZoneId)) {
        errors.push(`Row ${row.rowNumber}: origin zone not found or inactive`);
      }

      if (!activeZones.has(row.destinationZoneId)) {
        errors.push(
          `Row ${row.rowNumber}: destination zone not found or inactive`,
        );
      }

      if (!activeVehicles.has(row.vehicleId)) {
        errors.push(`Row ${row.rowNumber}: vehicle not found or inactive`);
      }

      if (!activeCurrencies.has(row.currencyId)) {
        errors.push(`Row ${row.rowNumber}: currency not found or inactive`);
      }

      if (!activeServices.has(row.serviceTypeId)) {
        errors.push(`Row ${row.rowNumber}: service type not found or inactive`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid catalog references',
        errors,
      });
    }
  }

  private async findExistingKeys(rows: ImportRateRow[]): Promise<Set<string>> {
    const keys = new Set<string>();

    for (let index = 0; index < rows.length; index += LOOKUP_BATCH_SIZE) {
      const batch = rows.slice(index, index + LOOKUP_BATCH_SIZE);

      const existing = await this.prisma.rate.findMany({
        where: {
          OR: batch.map((row) => ({
            originZoneId: row.originZoneId,
            destinationZoneId: row.destinationZoneId,
            vehicleId: row.vehicleId,
            currencyId: row.currencyId,
            serviceTypeId: row.serviceTypeId,
          })),
        },
        select: {
          originZoneId: true,
          destinationZoneId: true,
          vehicleId: true,
          currencyId: true,
          serviceTypeId: true,
        },
      });

      for (const rate of existing) {
        keys.add(this.createKey(rate));
      }
    }

    return keys;
  }

  private async inspect(file: Express.Multer.File) {
    const rows = await this.parseFile(file);

    await this.validateReferences(rows);

    const existingKeys = await this.findExistingKeys(rows);

    return {
      rows,
      existingKeys,
    };
  }

  async preview(file: Express.Multer.File) {
    const { rows, existingKeys } = await this.inspect(file);

    let created = 0;
    let updated = 0;

    const items = rows.map((row) => {
      const exists = existingKeys.has(this.createKey(row));

      if (exists) {
        updated++;
      } else {
        created++;
      }

      return {
        ...row,
        action: exists ? 'UPDATE' : 'CREATE',
      };
    });

    return {
      summary: {
        total: rows.length,
        created,
        updated,
      },
      items,
    };
  }

  async apply(file: Express.Multer.File, userId: number) {
    const { rows } = await this.inspect(file);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let created = 0;
          let updated = 0;

          for (const row of rows) {
            const { rowNumber: _rowNumber, ...combination } = row;

            const key = {
              originZoneId: combination.originZoneId,
              destinationZoneId: combination.destinationZoneId,
              vehicleId: combination.vehicleId,
              currencyId: combination.currencyId,
              serviceTypeId: combination.serviceTypeId,
            };

            const existing = await tx.rate.findUnique({
              where: {
                originZoneId_destinationZoneId_vehicleId_currencyId_serviceTypeId:
                  key,
              },
              select: {
                id: true,
              },
            });

            await tx.rate.upsert({
              where: {
                originZoneId_destinationZoneId_vehicleId_currencyId_serviceTypeId:
                  key,
              },

              create: {
                ...combination,
                status: true,
                createdById: userId,
                updatedById: userId,
              },

              update: {
                price: combination.price,
                updatedById: userId,
              },
            });

            if (existing) {
              updated++;
            } else {
              created++;
            }
          }

          return {
            summary: {
              total: rows.length,
              created,
              updated,
            },
          };
        },
        {
          maxWait: 5000,
          timeout: 120000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') {
          throw new ConflictException(
            'A concurrent operation affected the rates. Please retry the import.',
          );
        }

        if (error.code === 'P2002') {
          throw new ConflictException(
            'A duplicate rate combination was detected',
          );
        }

        if (error.code === 'P2003') {
          throw new BadRequestException(
            'One or more catalog references are invalid',
          );
        }
      }

      throw error;
    }
  }
}
