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
| `JWT_SECRET` | Requerido | Secreto aleatorio y exclusivo del entorno |
| `JWT_EXPIRES_IN_SECONDS` | `28800` | Duracion del token en segundos |

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
npm run db:migrate:deploy # aplica migraciones existentes en produccion
npm run db:seed:admin # asigna todos los permisos al rol del usuario admin
npm run db:studio     # interfaz visual para los datos
npm run package:hostinger # genera el ZIP de despliegue
```

Para desplegar el proyecto mediante ZIP consulta `HOSTINGER_DEPLOY.md`.

`GET /api/v1` comprueba el proceso HTTP y `GET /api/v1/health/database`
comprueba la conexion MySQL. La integracion usa Prisma con su motor MySQL nativo.
Las credenciales se guardan en `.env`, nunca en el repositorio.

## Autenticacion

Las contrasenas deben almacenarse como hashes bcrypt en `users.password_hash`.
Cuando la tabla de usuarios esta vacia, genera el primer usuario con:

```http
POST /api/v1/auth/bootstrap-user
```

La respuesta contiene el correo, usuario y una `temporaryPassword`. Guardala en
ese momento porque no vuelve a mostrarse. El endpoint funciona en produccion,
pero se bloquea con `409 Conflict` tan pronto existe un usuario. El rol `DEMO`
se crea sin permisos y posteriormente puede configurarse desde la base de datos.

En desarrollo, despues de registrar los catalogos de menus y acciones, asigna
todas sus combinaciones al rol del usuario con `username` igual a `admin`:

```bash
npm run db:seed:admin
```

El seed es idempotente y puede ejecutarse nuevamente cuando se agreguen menus o
acciones. Los permisos se asignan al rol del administrador, por lo que tambien
los reciben los demas usuarios que compartan ese rol. No ejecutes este seed en
produccion.

El login acepta correo o nombre de usuario:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "admin@example.com",
  "password": "your-password"
}
```

Para consultar el usuario, rol y permisos de la sesion:

```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

Usa `JwtAuthGuard` en endpoints protegidos. Para exigir permisos agrega tambien
`PermissionsGuard` y `@RequirePermissions('menu-code:action-code')`. El usuario,
rol y permisos se consultan en cada peticion autenticada, por lo que los cambios
de autorizacion se aplican inmediatamente.

Todas las respuestas HTTP tienen una envoltura comun con `success`,
`statusCode`, `message`, `timestamp` y `path`. Las respuestas exitosas agregan
`data`; los errores de validacion pueden agregar `errors`.
