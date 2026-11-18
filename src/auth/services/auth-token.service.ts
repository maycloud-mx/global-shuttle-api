import { BadRequestException, Injectable } from '@nestjs/common';

import { createHash, randomBytes } from 'node:crypto';

import { Prisma, UserTokenType } from '../../generated/prisma/index.js';

import { PrismaService } from '../../prisma/prisma.service.js';

// =========================================================
// CONFIGURATION
// =========================================================

const TOKEN_EXPIRATION_MINUTES = {
  [UserTokenType.ACCOUNT_ACTIVATION]: 24 * 60,
  [UserTokenType.PASSWORD_RESET]: 30,
} as const;

const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

type TransactionClient = Prisma.TransactionClient;

export interface GeneratedAuthToken {
  token: string;
  expiresAt: Date;
}

// =========================================================
// SERVICE
// =========================================================

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // GENERATE TOKEN
  // =========================================================

  /**
   * Genera un token temporal.
   *
   * - Verifica que el usuario pueda recibirlo.
   * - Bloquea el registro del usuario durante
   *   la transacción para serializar generaciones.
   * - Invalida los tokens anteriores del mismo tipo.
   * - Guarda únicamente el hash SHA-256.
   * - Devuelve el token original para enviarlo
   *   por correo electrónico.
   */
  async generate(
    userId: number,
    type: UserTokenType,
  ): Promise<GeneratedAuthToken> {
    const expirationMinutes = this.getExpirationMinutes(type);

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      // Bloqueamos el usuario para evitar que dos
      // solicitudes generen tokens simultáneamente.
      await this.lockUser(tx, userId);

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          emailVerifiedAt: true,
          passwordHash: true,
          role: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!user || !this.canUseTokenType(user, type)) {
        throw new BadRequestException('User cannot receive this token');
      }

      const now = new Date();

      // Invalidar tokens anteriores del mismo tipo.
      await tx.userToken.updateMany({
        where: {
          userId,
          type,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });

      // Crear el nuevo token.
      await tx.userToken.create({
        data: {
          userId,
          type,
          tokenHash,
          expiresAt,
        },
      });
    });

    return {
      token,
      expiresAt,
    };
  }

  // =========================================================
  // VALIDATE TOKEN
  // =========================================================

  /**
   * Verifica un token sin consumirlo.
   *
   * Comprueba:
   * - Formato.
   * - Tipo.
   * - Existencia.
   * - Expiración.
   * - Uso previo.
   * - Estado del usuario.
   * - Estado del rol.
   * - Condiciones de activación o recuperación.
   *
   * Retorna false cuando el enlace no puede
   * utilizarse.
   */
  async validate(token: string, type: UserTokenType): Promise<boolean> {
    if (!this.isValidTokenFormat(token) || !this.isValidTokenType(type)) {
      return false;
    }

    const tokenHash = this.hashToken(token);

    const record = await this.prisma.userToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        type: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            isActive: true,
            emailVerifiedAt: true,
            passwordHash: true,
            role: {
              select: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      return false;
    }

    if (record.type !== type) {
      return false;
    }

    if (record.usedAt !== null) {
      return false;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      return false;
    }

    if (!this.canUseTokenType(record.user, type)) {
      return false;
    }

    return true;
  }

  // =========================================================
  // CONSUME TOKEN
  // =========================================================

  /**
   * Consume un token dentro de una transacción.
   *
   * IMPORTANTE:
   *
   * Debe utilizarse dentro de la misma
   * transacción que modifica la contraseña.
   *
   * - Valida el token.
   * - Bloquea el usuario.
   * - Verifica nuevamente el token.
   * - Verifica las condiciones del usuario.
   * - Marca el token como utilizado.
   *
   * Devuelve el ID del usuario.
   */
  async consume(
    tx: TransactionClient,
    token: string,
    type: UserTokenType,
  ): Promise<number> {
    if (!this.isValidTokenFormat(token) || !this.isValidTokenType(type)) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const tokenHash = this.hashToken(token);

    // Primera consulta para identificar
    // el usuario propietario del token.
    const record = await tx.userToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        type: true,
      },
    });

    if (!record || record.type !== type) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    // Mantenemos el mismo orden de bloqueo que
    // generate(): primero usuario, después token.
    await this.lockUser(tx, record.userId);

    // Verificar nuevamente la información después
    // de adquirir el bloqueo del usuario.
    const currentToken = await tx.userToken.findUnique({
      where: {
        id: record.id,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (
      !currentToken ||
      currentToken.userId !== record.userId ||
      currentToken.type !== type ||
      currentToken.usedAt !== null ||
      currentToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const user = await tx.user.findUnique({
      where: {
        id: record.userId,
      },
      select: {
        id: true,
        isActive: true,
        emailVerifiedAt: true,
        passwordHash: true,
        role: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!user || !this.canUseTokenType(user, type)) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const now = new Date();

    // Actualización condicional:
    // garantiza que un token no sea consumido
    // exitosamente dos veces.
    const updated = await tx.userToken.updateMany({
      where: {
        id: currentToken.id,
        userId: record.userId,
        type,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    return record.userId;
  }

  // =========================================================
  // INVALIDATE TOKENS
  // =========================================================

  /**
   * Invalida todos los tokens pendientes
   * de un usuario para un tipo determinado.
   *
   * Puede ejecutarse directamente o dentro
   * de una transacción existente.
   */
  async invalidate(
    userId: number,
    type: UserTokenType,
    tx?: TransactionClient,
  ): Promise<void> {
    if (!this.isValidTokenType(type)) {
      throw new BadRequestException('Invalid token type');
    }

    if (tx) {
      await this.lockUser(tx, userId);

      await tx.userToken.updateMany({
        where: {
          userId,
          type,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.lockUser(transaction, userId);

      await transaction.userToken.updateMany({
        where: {
          userId,
          type,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });
  }

  // =========================================================
  // USER VALIDATION
  // =========================================================

  /**
   * Determina si el usuario puede utilizar
   * un token del tipo solicitado.
   */
  private canUseTokenType(
    user: {
      isActive: boolean;
      emailVerifiedAt: Date | null;
      passwordHash: string | null;
      role: {
        isActive: boolean;
      };
    },
    type: UserTokenType,
  ): boolean {
    if (!user.isActive || !user.role.isActive) {
      return false;
    }

    switch (type) {
      case UserTokenType.ACCOUNT_ACTIVATION:
        return user.emailVerifiedAt === null && user.passwordHash === null;

      case UserTokenType.PASSWORD_RESET:
        return user.emailVerifiedAt !== null && user.passwordHash !== null;

      default:
        return false;
    }
  }

  // =========================================================
  // USER ROW LOCK
  // =========================================================

  /**
   * Bloquea la fila del usuario con SELECT FOR UPDATE.
   *
   * MySQL mantiene este bloqueo hasta finalizar
   * la transacción.
   *
   * Esto serializa las operaciones de tokens
   * correspondientes al mismo usuario.
   */
  private async lockUser(tx: TransactionClient, userId: number): Promise<void> {
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM users
      WHERE id = ${userId}
      FOR UPDATE
    `;

    if (rows.length !== 1) {
      throw new BadRequestException('User not found');
    }
  }

  // =========================================================
  // EXPIRATION
  // =========================================================

  private getExpirationMinutes(type: UserTokenType): number {
    if (!this.isValidTokenType(type)) {
      throw new BadRequestException('Invalid token type');
    }

    return TOKEN_EXPIRATION_MINUTES[type];
  }

  // =========================================================
  // TOKEN TYPE VALIDATION
  // =========================================================

  private isValidTokenType(type: UserTokenType): boolean {
    return (
      type === UserTokenType.ACCOUNT_ACTIVATION ||
      type === UserTokenType.PASSWORD_RESET
    );
  }

  // =========================================================
  // TOKEN HASH
  // =========================================================

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // =========================================================
  // TOKEN FORMAT
  // =========================================================

  private isValidTokenFormat(token: string): boolean {
    return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
  }
}
