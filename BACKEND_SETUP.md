# Global Shuttle API

Backend de Global Shuttle construido con NestJS y TypeScript.

## Requisitos y configuracion

- Node.js 22.22.3 o superior
- npm 10 o superior

```bash
npm install
copy .env.example .env
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api/v1`.

## Variables de entorno

| Variable | Predeterminado | Descripcion |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `PORT` | `3000` | Puerto HTTP entre 1 y 65535 |
| `CORS_ORIGINS` | `*` | Origenes permitidos separados por comas |
| `DB_HOST` | Requerido | Servidor MySQL |
| `DB_PORT` | `3306` | Puerto MySQL |
| `DB_DATABASE` | Requerido | Nombre de la base de datos |
| `DB_USERNAME` | Requerido | Usuario de la base de datos |
| `DB_PASSWORD` | Requerido | Contrasena de la base de datos |

En produccion define dominios explicitos en `CORS_ORIGINS`; no uses `*`.

## Comandos

```bash
npm run start:dev  # desarrollo con recarga
npm run build      # compilacion de produccion
npm run start:prod # ejecuta dist/main
npm run lint       # analisis estatico
npm run test       # pruebas unitarias
npm run test:e2e   # pruebas HTTP
npm run db:generate   # regenera Prisma Client
npm run db:introspect # importa el esquema de una base existente
npm run db:migrate    # crea/aplica migraciones en desarrollo
npm run db:studio     # interfaz visual para los datos
```

`GET /api/v1` comprueba el proceso HTTP y `GET /api/v1/health/database`
comprueba la conexion MySQL. La integracion usa Prisma con su motor MySQL nativo.
Las credenciales se guardan en `.env`, nunca en el repositorio.
