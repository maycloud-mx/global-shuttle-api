# Deploy en Hostinger

## Crear el ZIP

```bash
npm run package:hostinger
```

El archivo se genera en `deploy/global-shuttle-api-hostinger-runtime-fix.zip`. No contiene
`.env`, `.git`, `node_modules`, `dist`, pruebas, cobertura ni configuracion del editor.
Hostinger instalara las dependencias y compilara el codigo fuente.

## Configuracion en hPanel

En **Websites > Add Website > Deploy Web App > Upload your files**, sube el ZIP
y utiliza:

| Opcion | Valor |
| --- | --- |
| Framework | NestJS (o `Other` si no se detecta) |
| Node.js | 22.x |
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm run start:prod` |
| Output directory | `dist` |
| Entry file, si se solicita | `main.js` |

No fijes manualmente un puerto en hPanel ni en el codigo. Hostinger proporciona
`PORT` y la aplicacion escucha ese valor en `0.0.0.0`.

## Variables de entorno

Configuralas en el paso **Environment variables**; no subas el archivo `.env`:

```dotenv
NODE_ENV=production
CORS_ORIGINS=https://tu-dominio.com
DB_HOST=host-de-mysql
DB_PORT=3306
DB_DATABASE=nombre-base
DB_USERNAME=usuario-base
DB_PASSWORD=contrasena-base
JWT_SECRET=secreto-aleatorio-largo
JWT_EXPIRES_IN_SECONDS=28800
```

Hostinger asigna `PORT`, por lo que no es necesario declararlo. Si importas un
`.env`, elimina `PORT` antes de importarlo.

## Base de datos

La aplicacion actual espera una base MySQL con las tablas descritas en
`prisma/schema.prisma`. Si se agregan migraciones a `prisma/migrations`, pueden
aplicarse con `npm run db:migrate:deploy` usando las mismas variables de entorno.

Tras desplegar, verifica:

```text
GET https://tu-dominio.com/api/v1
GET https://tu-dominio.com/api/v1/health/database
```
