# 🔄 RESETEAR MIGRACIONES - POSTGRESQL

Comandos para empezar desde cero con PostgreSQL y el schema optimizado.

---

## 🚀 PASO A PASO

### 1️⃣ Levantar PostgreSQL (si no está corriendo)

```bash
cd /home/user/experts-core/apps/control
docker-compose up -d postgres
```

Verifica que esté corriendo:
```bash
docker ps | grep postgres
# Deberías ver: experts-control-db
```

---

### 2️⃣ Borrar migraciones viejas de SQLite

```bash
# Borrar directorio de migraciones anterior
rm -rf prisma/migrations

# Borrar base de datos SQLite anterior (si existe)
rm -f prisma/dev.db
rm -f prisma/dev.db-journal
```

---

### 3️⃣ Configurar variable de entorno

```bash
# Copiar .env de ejemplo (si no tienes uno)
cp .env.example .env

# O crear uno nuevo
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/experts_control?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET="tu-super-secreto-admin-jwt-change-this"
WORKER_JWT_SECRET="tu-super-secreto-worker-jwt-change-this"
EOF
```

**⚠️ IMPORTANTE**: Si ya tienes un `.env`, solo verifica que `DATABASE_URL` esté configurado correctamente.

---

### 4️⃣ Generar Prisma Client actualizado

```bash
npx prisma generate
```

Esto genera el cliente con todos los nuevos ENUMs y tipos de PostgreSQL.

---

### 5️⃣ Crear migración inicial desde cero

```bash
npx prisma migrate dev --name init
```

Esto:
- ✅ Crea la primera migración con todo el schema
- ✅ Aplica la migración a PostgreSQL
- ✅ Genera el Prisma Client actualizado

**Salida esperada**:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "experts_control" at "localhost:5432"

PostgreSQL database experts_control created at localhost:5432

Applying migration `20250119_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250119_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

---

### 6️⃣ Verificar la migración

```bash
# Ver estado de migraciones
npx prisma migrate status

# Ver schema en Prisma Studio
npx prisma studio
```

Prisma Studio abrirá en `http://localhost:5555` donde podrás ver todas las tablas creadas.

---

## 🎯 COMANDOS RÁPIDOS (COPY-PASTE)

```bash
# Todo en uno (desde el directorio /apps/control)
cd /home/user/experts-core/apps/control && \
docker-compose up -d postgres && \
rm -rf prisma/migrations && \
rm -f prisma/dev.db prisma/dev.db-journal && \
npx prisma generate && \
npx prisma migrate dev --name init && \
npx prisma studio
```

---

## ✅ VERIFICACIÓN

### 1. Verificar ENUMs creados

```bash
# Conectar a PostgreSQL
docker exec -it experts-control-db psql -U postgres -d experts_control

# Listar ENUMs
\dT+

# Deberías ver:
# AdminRole
# WorkerStatus
# DeviceStatus
# AttendanceType
# RecordStatus
# LoginQRStatus
# ExceptionCodeStatus
# ConfigLevel
# ExceptionReason

# Salir
\q
```

### 2. Verificar tablas creadas

```bash
docker exec -it experts-control-db psql -U postgres -d experts_control -c "\dt"
```

Deberías ver **16 tablas**:
- admins
- attendance_qr_codes
- attendance_records
- attendances
- devices
- depots
- exception_codes
- feature_flags
- fraud_validation_configs
- fraud_weight_configs
- schedule_exceptions
- work_schedules
- worker_login_qrs
- worker_schedule_assignments
- workers

### 3. Verificar índices

```bash
docker exec -it experts-control-db psql -U postgres -d experts_control -c "\di"
```

Deberías ver múltiples índices para optimización de queries.

---

## 🆘 TROUBLESHOOTING

### Error: "Port 5432 already in use"

**Problema**: Ya hay un PostgreSQL corriendo.

**Solución**:
```bash
# Detener el otro PostgreSQL
sudo systemctl stop postgresql
# O cambiar puerto en docker-compose.yml
```

---

### Error: "Database already exists"

**Problema**: La base de datos ya existe y quieres empezar limpio.

**Solución**:
```bash
# Opción 1: Drop y recrear
docker exec -it experts-control-db psql -U postgres -c "DROP DATABASE IF EXISTS experts_control;"
docker exec -it experts-control-db psql -U postgres -c "CREATE DATABASE experts_control;"

# Opción 2: Detener y eliminar volúmenes
docker-compose down -v
docker-compose up -d postgres
```

---

### Error: "Environment variable not found: DATABASE_URL"

**Problema**: No hay archivo `.env`.

**Solución**:
```bash
cp .env.example .env
# Editar valores si es necesario
```

---

### Error: "Migration failed to apply"

**Problema**: Hay datos o estructura previa.

**Solución**:
```bash
# Reset completo de database
npx prisma migrate reset --force

# Esto borra TODO y vuelve a aplicar migraciones
```

---

## 📊 DIFERENCIAS CLAVE CON SQLITE

| Característica | SQLite (Antes) | PostgreSQL (Ahora) |
|----------------|----------------|---------------------|
| **ENUMs** | Strings | ENUMs nativos |
| **IDs** | cuid() | uuid() |
| **JSON** | String | JSONB (indexable) |
| **GPS** | Float | Decimal(10,8) |
| **Timestamps** | DateTime | Timestamptz(3) |
| **Cascading** | Limitado | Completo |
| **Indexes** | Básicos | Optimizados |

---

## 🎉 ¡LISTO!

Tu base de datos PostgreSQL está configurada y optimizada. Puedes empezar a:
- ✅ Crear seeds de datos
- ✅ Ejecutar la aplicación: `npm run start:dev`
- ✅ Hacer requests a la API
- ✅ Ver datos en Prisma Studio

---

**Siguiente paso**: Revisar `README_POSTGRES_MIGRATION.md` para más detalles sobre producción y mantenimiento.
