import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const schema = 'prisma/schema.prisma';
const migrations = 'prisma/migrations';
const require = createRequire(import.meta.url);

function createMigration() {
  const [name, ...extra] = process.argv.slice(2);
  if (!name || extra.length || !/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
    throw new Error('Uso: npm run db:migrate:create -- nombre_del_cambio');
  }

  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  if (git('status', '--porcelain', '--untracked-files=all', '--', migrations).trim()) {
    throw new Error('Guarda en un commit la migración anterior junto con su schema.prisma antes de generar otra.');
  }

  const baseline = git('show', `HEAD:${schema}`);
  const prismaCli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
  const temp = mkdtempSync(join(tmpdir(), 'prisma-migration-'));
  let sql;
  try {
    const before = join(temp, 'before.prisma');
    writeFileSync(before, baseline, 'utf8');
    sql = execFileSync(process.execPath, [
      prismaCli, 'migrate', 'diff',
      '--from-schema-datamodel', before,
      '--to-schema-datamodel', schema,
      '--script',
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }

  if (!sql.split(/\r?\n/).some(line => line.trim() && !line.trimStart().startsWith('--'))) {
    console.log('No hay cambios de base de datos respecto a HEAD.');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/\D/g, '');
  const folder = `${timestamp}_${name}`;
  const existing = readdirSync(join(root, migrations), { withFileTypes: true });
  if (existing.some(entry => entry.isDirectory() && entry.name.slice(0, 14) >= timestamp)) {
    throw new Error('La fecha UTC debe ser posterior a la última migración. Revisa el reloj antes de reintentar.');
  }

  const directory = join(root, migrations, folder);
  mkdirSync(directory);
  try {
    writeFileSync(join(directory, 'migration.sql'), `${sql.trimEnd()}\n`, { flag: 'wx' });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  console.log(`Migración creada en ${migrations}/${folder}/migration.sql`);
}

try {
  createMigration();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
