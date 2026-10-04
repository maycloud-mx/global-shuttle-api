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
npm run db:studio     # interfaz visual para los datos
```

`GET /api/v1` comprueba el proceso HTTP y `GET /api/v1/health/database`
comprueba la conexion MySQL. La integracion usa Prisma con su motor MySQL nativo.
Las credenciales se guardan en `.env`, nunca en el repositorio.

## Autenticacion

Las contrasenas deben almacenarse como hashes bcrypt en `users.password_hash`.
En desarrollo puedes generar o restablecer el usuario generico con:

```http
POST /api/v1/auth/dev-user
```

La respuesta contiene el correo, usuario y una nueva `temporaryPassword`. Guarda
esa contrasena: cada llamada vuelve a generarla e invalida la anterior. El
endpoint responde `404` cuando `NODE_ENV=production` y el rol `DEMO` se crea sin
permisos, ya que esta cuenta existe unicamente para probar el inicio de sesion.

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
