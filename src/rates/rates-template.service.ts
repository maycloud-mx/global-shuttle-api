import { BadRequestException, Injectable } from '@nestjs/common';

import ExcelJS from 'exceljs';

import { PrismaService } from '../prisma/prisma.service.js';

const MAX_TEMPLATE_ROWS = 1000;

type CatalogItem = {
  id: number;
  name: string;
  code?: string | null;
};

@Injectable()
export class RatesTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  private formatOption(item: CatalogItem): string {
    return `${item.id} - ${item.name}`;
  }

  private addCatalog(
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
    column: string,
    name: string,
    items: CatalogItem[],
  ): void {
    items.forEach((item, index) => {
      const cell = worksheet.getCell(`${column}${index + 2}`);

      cell.value = this.formatOption(item);
      cell.alignment = {
        vertical: 'middle',
      };
    });

    const lastRow = items.length + 1;

    workbook.definedNames.add(
      `Catalogos!$${column}$2:$${column}$${lastRow}`,
      name,
    );
  }

  private configureDropdown(
    worksheet: ExcelJS.Worksheet,
    column: string,
    listName: string,
  ): void {
    for (let rowNumber = 2; rowNumber <= MAX_TEMPLATE_ROWS + 1; rowNumber++) {
      worksheet.getCell(`${column}${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`${listName}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Valor no válido',
        error: 'Seleccione un valor de la lista desplegable.',
      };
    }
  }

  async generate(): Promise<Buffer> {
    const [zones, vehicles, currencies, serviceTypes] = await Promise.all([
      this.prisma.zone.findMany({
        where: { status: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: 'asc' },
      }),

      this.prisma.vehicle.findMany({
        where: { status: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),

      this.prisma.currency.findMany({
        where: { status: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { id: 'asc' },
      }),

      this.prisma.serviceType.findMany({
        where: { status: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    if (
      zones.length === 0 ||
      vehicles.length === 0 ||
      currencies.length === 0 ||
      serviceTypes.length === 0
    ) {
      throw new BadRequestException(
        'All rate catalogs must contain active records',
      );
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Global Shuttle';
    workbook.title = 'Plantilla de tarifas';
    workbook.subject = 'Importación de tarifas';
    workbook.created = new Date();

    // ============================================
    // HOJA 1: TARIFAS
    // ============================================

    const ratesSheet = workbook.addWorksheet('Tarifas', {
      views: [
        {
          state: 'frozen',
          ySplit: 1,
        },
      ],
    });

    ratesSheet.columns = [
      {
        header: 'Zona origen',
        key: 'originZone',
        width: 44,
      },
      {
        header: 'Zona destino',
        key: 'destinationZone',
        width: 44,
      },
      {
        header: 'Vehículo',
        key: 'vehicle',
        width: 34,
      },
      {
        header: 'Moneda',
        key: 'currency',
        width: 28,
      },
      {
        header: 'Tipo de servicio',
        key: 'serviceType',
        width: 34,
      },
      {
        header: 'Precio',
        key: 'price',
        width: 20,
        style: {
          numFmt: '#,##0.00',
        },
      },
    ];

    ratesSheet.autoFilter = {
      from: 'A1',
      to: 'F1',
    };

    const header = ratesSheet.getRow(1);

    header.height = 30;

    header.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF17365D',
        },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
    });

    // Listas desplegables vinculadas a catálogos.
    this.configureDropdown(ratesSheet, 'A', 'ActiveZones');

    this.configureDropdown(ratesSheet, 'B', 'ActiveZones');

    this.configureDropdown(ratesSheet, 'C', 'ActiveVehicles');

    this.configureDropdown(ratesSheet, 'D', 'ActiveCurrencies');

    this.configureDropdown(ratesSheet, 'E', 'ActiveServiceTypes');

    // Validar que el precio sea no negativo.
    for (let rowNumber = 2; rowNumber <= MAX_TEMPLATE_ROWS + 1; rowNumber++) {
      ratesSheet.getCell(`F${rowNumber}`).dataValidation = {
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        formulae: [0],
        allowBlank: false,
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Precio no válido',
        error: 'Ingrese un precio mayor o igual a cero.',
      };
    }

    // Aplicar formato a las filas de captura.
    for (let rowNumber = 2; rowNumber <= MAX_TEMPLATE_ROWS + 1; rowNumber++) {
      const row = ratesSheet.getRow(rowNumber);

      row.height = 22;

      for (let columnNumber = 1; columnNumber <= 6; columnNumber++) {
        const cell = row.getCell(columnNumber);

        cell.alignment = {
          vertical: 'middle',
        };

        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FFF3F7FB',
            },
          };
        }

        if (columnNumber === 6) {
          cell.numFmt = '#,##0.00';
        }
      }
    }

    // ============================================
    // HOJA 2: CATALOGOS
    // ============================================

    const catalogSheet = workbook.addWorksheet('Catalogos', {
      views: [
        {
          state: 'frozen',
          ySplit: 1,
        },
      ],
    });

    catalogSheet.columns = [
      {
        header: 'Zonas',
        width: 48,
      },
      {
        header: 'Vehículos',
        width: 38,
      },
      {
        header: 'Monedas',
        width: 32,
      },
      {
        header: 'Tipos de servicio',
        width: 38,
      },
    ];

    const catalogHeader = catalogSheet.getRow(1);

    catalogHeader.height = 28;

    catalogHeader.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF245C85',
        },
      };

      cell.alignment = {
        vertical: 'middle',
      };
    });

    this.addCatalog(workbook, catalogSheet, 'A', 'ActiveZones', zones);

    this.addCatalog(workbook, catalogSheet, 'B', 'ActiveVehicles', vehicles);

    this.addCatalog(
      workbook,
      catalogSheet,
      'C',
      'ActiveCurrencies',
      currencies,
    );

    this.addCatalog(
      workbook,
      catalogSheet,
      'D',
      'ActiveServiceTypes',
      serviceTypes,
    );

    // ============================================
    // HOJA 3: INSTRUCCIONES
    // ============================================

    const instructionsSheet = workbook.addWorksheet('Instrucciones');

    instructionsSheet.getColumn(1).width = 110;

    const instructions = [
      'GLOBAL SHUTTLE - IMPORTACIÓN DE TARIFAS',
      '',
      '1. Abra la hoja Tarifas.',
      '2. Seleccione la zona de origen.',
      '3. Seleccione la zona de destino.',
      '4. Seleccione el vehículo.',
      '5. Seleccione la moneda.',
      '6. Seleccione el tipo de servicio.',
      '7. Capture el precio correspondiente.',
      '8. Repita el proceso para cada combinación.',
      '9. No registre combinaciones duplicadas.',
      '10. No modifique los encabezados.',
      '11. Guarde el archivo en formato .xlsx.',
      '12. Cargue el archivo en el panel administrativo.',
      '',
      'REGLAS IMPORTANTES',
      '',
      'Las tarifas existentes actualizarán su precio.',
      'Las tarifas faltantes serán creadas.',
      'Las tarifas inactivas conservarán su estado.',
      'Cada fila debe tener todos los campos completos.',
      'El máximo permitido es de 1000 tarifas.',
      'Los catálogos deben permanecer activos.',
    ];

    instructions.forEach((instruction, index) => {
      const cell = instructionsSheet.getCell(index + 1, 1);

      cell.value = instruction;
      cell.alignment = {
        vertical: 'middle',
        wrapText: true,
      };
    });

    const titleCell = instructionsSheet.getCell('A1');

    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: 'FF17365D' },
    };

    const rulesCell = instructionsSheet.getCell('A16');

    rulesCell.font = {
      bold: true,
      size: 12,
      color: { argb: 'FF17365D' },
    };

    // Abrir inicialmente la hoja Tarifas.
    workbook.views = [
      {
        activeTab: 0,
        firstSheet: 0,
        visibility: 'visible',
        x: 0,
        y: 0,
        width: 12000,
        height: 20000,
      },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer as unknown as Uint8Array);
  }
}
