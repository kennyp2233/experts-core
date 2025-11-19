# 🐘 MIGRACIÓN A POSTGRESQL

Guía completa para migrar la aplicación de SQLite a PostgreSQL.

---

## 📋 PRERREQUISITOS

- Docker y Docker Compose instalados
- Node.js 18+ instalado
- Acceso a terminal

---

## 🚀 PASO 1: LEVANTAR POSTGRESQL CON DOCKER

### Opción A: Solo PostgreSQL

```bash
docker-compose up -d postgres
```

### Opción B: PostgreSQL + PgAdmin (UI)

```bash
docker-compose --profile admin up -d
```

**PgAdmin estará disponible en**: `http://localhost:5050`
- Email: `admin@experts.com`
- Password: `admin`

---

## 🔐 PASO 2: CONFIGURAR VARIABLES DE ENTORNO

### 1. Copiar archivo de ejemplo

```bash
cp .env.example .env
```

### 2. Editar `.env` con tus valores

```env
# Base de datos PostgreSQL (default para docker-compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/experts_control?schema=public"

# JWT Secrets (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET="tu-super-secreto-admin-jwt"
WORKER_JWT_SECRET="tu-super-secreto-worker-jwt"

# Otros...
PORT=3000
NODE_ENV=development
```

**⚠️ IMPORTANTE**: En producción, usa secretos seguros generados con:
```bash
openssl rand -base64 32
```

---

## 📦 PASO 3: INSTALAR DEPENDENCIAS

```bash
npm install
```

---

## 🔄 PASO 4: MIGRAR SCHEMA DE PRISMA

El schema ya está actualizado para usar PostgreSQL. Ahora generamos y aplicamos las migraciones:

### 1. Generar migraciones

```bash
npx prisma migrate dev --name init_postgres
```

Esto:
- ✅ Crea la estructura de tablas en PostgreSQL
- ✅ Aplica todas las migraciones
- ✅ Genera el Prisma Client actualizado

### 2. Verificar migraciones

```bash
npx prisma migrate status
```

Deberías ver todas las migraciones aplicadas.

---

## 📊 PASO 5: (OPCIONAL) MIGRAR DATOS DE SQLITE

Si tienes datos en SQLite que quieres migrar:

### Opción A: Script de Migración (Recomendado)

```bash
# Crear script de migración
npm run migrate:sqlite-to-postgres
```

### Opción B: Exportar/Importar Manual

1. **Exportar desde SQLite**:
   ```bash
   sqlite3 prisma/dev.db .dump > backup.sql
   ```

2. **Convertir SQL** (SQLite → PostgreSQL):
   - Cambiar `INTEGER PRIMARY KEY` → `SERIAL PRIMARY KEY`
   - Cambiar tipos de datos
   - Ajustar sintaxis

3. **Importar a PostgreSQL**:
   ```bash
   psql -U postgres -d experts_control -f backup_converted.sql
   ```

---

## ✅ PASO 6: VERIFICAR INSTALACIÓN

### 1. Verificar conexión a PostgreSQL

```bash
npx prisma db pull
```

### 2. Ver schema en Prisma Studio

```bash
npx prisma studio
```

Esto abre una UI en `http://localhost:5555` para ver/editar datos.

### 3. Ejecutar seeds (opcional)

```bash
npm run seed
```

---

## 🏃 PASO 7: INICIAR APLICACIÓN

```bash
npm run start:dev
```

La aplicación debería:
- ✅ Conectarse a PostgreSQL
- ✅ Cargar todos los módulos
- ✅ Estar lista en `http://localhost:3000`

---

## 🛠️ COMANDOS ÚTILES

### Prisma

```bash
# Ver schema actual
npx prisma db pull

# Generar Prisma Client
npx prisma generate

# Crear nueva migración
npx prisma migrate dev --name <nombre>

# Aplicar migraciones en producción
npx prisma migrate deploy

# Reset database (⚠️ BORRA TODO)
npx prisma migrate reset

# Ver datos en UI
npx prisma studio
```

### Docker

```bash
# Ver logs de PostgreSQL
docker logs -f experts-control-db

# Entrar a PostgreSQL CLI
docker exec -it experts-control-db psql -U postgres -d experts_control

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ BORRA DATOS)
docker-compose down -v

# Reiniciar servicios
docker-compose restart
```

### PostgreSQL CLI (dentro del container)

```bash
# Conectar
docker exec -it experts-control-db psql -U postgres -d experts_control

# Comandos útiles
\l              # Listar bases de datos
\dt             # Listar tablas
\d table_name   # Describir tabla
\q              # Salir
```

---

## 🔍 TROUBLESHOOTING

### Error: "Connection refused"

**Problema**: No puede conectar a PostgreSQL.

**Solución**:
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Ver logs
docker logs experts-control-db

# Reiniciar container
docker-compose restart postgres
```

---

### Error: "P2002: Unique constraint failed"

**Problema**: Datos duplicados en migraciones.

**Solución**:
```bash
# Reset database
npx prisma migrate reset

# Volver a migrar
npx prisma migrate dev
```

---

### Error: "Schema not in sync"

**Problema**: Prisma Client desactualizado.

**Solución**:
```bash
# Regenerar Prisma Client
npx prisma generate

# Reiniciar aplicación
npm run start:dev
```

---

### Error: "Cannot find module '@prisma/client'"

**Problema**: Prisma Client no instalado.

**Solución**:
```bash
npm install
npx prisma generate
```

---

## 🔒 PRODUCCIÓN

### 1. Variables de entorno

```env
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&sslmode=require"
NODE_ENV=production
```

### 2. Migrar en producción

```bash
# Solo aplicar migraciones (no crear nuevas)
npx prisma migrate deploy
```

### 3. SSL/TLS

Para conexiones seguras, agregar a DATABASE_URL:
```
?sslmode=require
?sslcert=./cert.pem&sslkey=./key.pem
```

---

## 📚 DIFERENCIAS SQLite vs PostgreSQL

| Característica | SQLite | PostgreSQL |
|----------------|--------|------------|
| **Enums** | Strings | Native ENUMs |
| **Auto-increment** | INTEGER PRIMARY KEY | SERIAL/BIGSERIAL |
| **Timestamps** | DATETIME | TIMESTAMP |
| **JSON** | TEXT | JSONB (mejor performance) |
| **Full-text Search** | Limitado | Potente con tsvector |
| **Concurrencia** | File locking | MVCC |
| **Performance** | Rápido para lecturas simples | Rápido para cargas complejas |

---

## 🎯 VENTAJAS DE POSTGRESQL

✅ **Mejor rendimiento** con grandes volúmenes de datos
✅ **Concurrencia** superior (múltiples escrituras simultáneas)
✅ **Tipos de datos avanzados** (JSONB, Arrays, UUID)
✅ **Full-text search** nativo
✅ **Replicación y HA** para producción
✅ **Extensiones** (PostGIS para geolocation)
✅ **ACID compliance** robusto
✅ **Mejor para equipos** (múltiples desarrolladores)

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisar logs: `docker logs experts-control-db`
2. Verificar conexión: `psql -U postgres -h localhost`
3. Consultar documentación Prisma: https://www.prisma.io/docs

---

**¡Listo!** Tu aplicación ahora usa PostgreSQL 🎉
