# Database Schemas Setup

Este proyecto usa **múltiples Postgres schemas** para separar contextos bounded (usuarios, productos, guías, documentos, etc.).

## Automatización de Schemas

### Setup inicial (una sola vez)

```bash
npm run db:setup
```

Este comando:
1. ✅ Crea todos los schemas de Postgres necesarios (`usuarios`, `productos`, etc.)
2. ✅ Genera todos los Prisma Clients

### Desarrollo diario

Cuando modifiques un `schema.prisma`:

```bash
# Opción 1: Migración individual
npx prisma migrate dev --schema=./prisma/usuarios/schema.prisma --name tu_cambio

# Opción 2: Solo generar clientes (sin migrar)
npm run prisma:generate
```

### Configuración de URLs

Cada contexto tiene su propia variable de entorno en `.env`:

```env
DATABASE_URL_USUARIOS="postgresql://postgres:password@localhost:5432/experts_core?schema=usuarios"
DATABASE_URL_PRODUCTOS="postgresql://postgres:password@localhost:5432/experts_core?schema=productos"
```

## Estructura

```
prisma/
├── usuarios/
│   ├── schema.prisma          # datasource usa DATABASE_URL_USUARIOS
│   ├── migrations/
│   └── create_schema.sql
├── datos-maestros/
│   └── productos/
│       ├── schema.prisma      # datasource usa DATABASE_URL_PRODUCTOS
│       ├── migrations/
│       └── create_schema.sql
└── ...
```

## Ventajas

- ✅ Migraciones independientes por contexto
- ✅ Clientes Prisma separados (type-safe)
- ✅ Evita conflictos entre bounded contexts
- ✅ Permite CI/CD granular (migrar solo lo que cambió)
