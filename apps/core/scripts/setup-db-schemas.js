#!/usr/bin/env node
/**
 * Script para crear automáticamente todos los schemas de Postgres
 * necesarios para los diferentes contextos de Prisma
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuración: mapeo de contexto -> schema de Postgres
const SCHEMAS = [
  { name: 'usuarios', path: './prisma/usuarios/schema.prisma' },
  { name: 'datos_maestros', path: './prisma/datos-maestros/schema.prisma' },
  { name: 'templates', path: './prisma/templates/schema.prisma' },
  { name: 'documentos', path: './prisma/documentos/schema.prisma' },
  { name: 'ebf_portal_sync', path: './prisma/extensions/ebf-portal/schema.prisma' },
  // Agregar más según sea necesario
];

function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} - Completado`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Error:`, error.message);
    return false;
  }
}

function createSchema(schemaName, schemaPath) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📦 Procesando schema: ${schemaName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // 1. Crear el schema de Postgres
  const sqlFile = path.join(path.dirname(schemaPath), 'create_schema.sql');
  const createSql = `CREATE SCHEMA IF NOT EXISTS ${schemaName};`;

  // Escribir SQL temporal
  require('fs').writeFileSync(sqlFile, createSql);

  // 2. Ejecutar el SQL
  // NOTA: 'prisma db execute' no soporta --schema, por lo que pasamos el contexto via ENV para que prisma.config.ts lo recoja.
  const executeCmd = `npx prisma db execute --file=${sqlFile}`;

  // Usamos una versión modificada de runCommand que inyecta el ENV
  if (!runCommandWithEnv(executeCmd, `Crear schema '${schemaName}' en Postgres`, { PRISMA_SCHEMA_CONTEXT: schemaName })) {
    return false;
  }

  return true;
}

function runCommandWithEnv(command, description, envVars) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, ...envVars }
    });
    console.log(`✅ ${description} - Completado`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Error:`, error.message);
    return false;
  }
}

function migrateSchema(schemaName, schemaPath) {
  // 3. Ejecutar migraciones
  const migrateCmd = `npx prisma migrate deploy --schema=${schemaPath}`;
  return runCommand(migrateCmd, `Aplicar migraciones para '${schemaName}'`);
}

function generateClient(schemaName, schemaPath) {
  // 4. Generar cliente Prisma
  const generateCmd = `npx prisma generate --schema=${schemaPath}`;
  return runCommand(generateCmd, `Generar Prisma Client para '${schemaName}'`);
}

async function main() {
  console.log('🚀 Iniciando setup de schemas de base de datos...\n');

  let successCount = 0;
  let failCount = 0;

  for (const { name, path: schemaPath } of SCHEMAS) {
    try {
      // Crear schema
      if (!createSchema(name, schemaPath)) {
        failCount++;
        continue;
      }

      // Generar cliente (las migraciones ya se ejecutaron con migrate dev)
      if (!generateClient(name, schemaPath)) {
        failCount++;
        continue;
      }
      if (!migrateSchema(name, schemaPath)) {
        failCount++;
        continue;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error procesando ${name}:`, error.message);
      failCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Resumen:');
  console.log(`  ✅ Exitosos: ${successCount}`);
  console.log(`  ❌ Fallidos: ${failCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failCount > 0) {
    console.error('⚠️  Se encontraron errores en el setup de schemas.');
    console.error('    Revise los logs arriba para ver el error de migración.');
    if (process.env.KEEP_ALIVE_ON_ERROR === 'true') {
      // Solo en dev/debug: mantener el container vivo para inspeccionar via `docker exec`.
      // En producción exit 1 para que el `api` (que depende con service_completed_successfully)
      // no quede colgado en `Created` esperando a un db-setup que nunca termina.
      console.error('    KEEP_ALIVE_ON_ERROR=true — manteniendo proceso vivo para depuración.');
      setInterval(() => { }, 1000);
      return;
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
