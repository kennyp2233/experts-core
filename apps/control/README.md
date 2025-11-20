# Docker Compose Setup for Experts Control App

Esta configuración de Docker Compose permite ejecutar la aplicación NestJS de control de asistencia junto con PostgreSQL en contenedores.

## Servicios

### PostgreSQL Database
- **Imagen**: `postgres:16-alpine`
- **Puerto**: `5432` (expuesto localmente)
- **Base de datos**: `experts_control`
- **Usuario/Contraseña**: `postgres` / `postgres`
- **Volumen**: `postgres_data` para persistencia de datos

### Control App (NestJS)
- **Build**: Desde el Dockerfile local
- **Puerto**: `3000` (expuesto localmente)
- **Variables de entorno**:
  - `DATABASE_URL`: Conexión a PostgreSQL
  - `PORT`: 3000
- **Volumen**: `./uploads` montado en `/app/uploads` para archivos subidos
- **Health Check**: Verifica el endpoint `/health`
- **EntryPoint**: Ejecuta migraciones de Prisma automáticamente al iniciar

### Database Seeder (Opcional)
- **Build**: Desde el Dockerfile local
- **Comando**: Ejecuta el script de seed de Prisma
- **Perfil**: `seed` (no se ejecuta por defecto)
- **Dependencias**: Espera a que `control-app` esté listo

## Uso

### Prerrequisitos
- Docker y Docker Compose instalados
- Puerto 5432 libre (PostgreSQL)
- Puerto 3000 libre (Aplicación)

### Levantar la aplicación completa
```bash
docker compose up --build
```
Esto construirá la imagen de la app, levantará PostgreSQL y la aplicación. Las migraciones se ejecutarán automáticamente.

### Levantar en segundo plano
```bash
docker compose up -d --build
```

### Ejecutar solo la base de datos
```bash
docker compose up postgres
```

### Ejecutar el seeder (después de que la app esté corriendo)
```bash
docker compose --profile seed up
```
Esto poblará la base de datos con datos iniciales.

### Detener los servicios
```bash
docker compose down
```

### Ver logs
```bash
# Todos los servicios
docker compose logs

# Servicio específico
docker compose logs control-app
docker compose logs postgres
```

### Acceder a la base de datos
Desde el host, puedes conectar a PostgreSQL en `localhost:5432` con las credenciales arriba mencionadas.

### Volúmenes
- `postgres_data`: Persiste los datos de PostgreSQL entre reinicios
- `./uploads`: Directorio local para archivos subidos por la app

### Troubleshooting
- Si hay errores de build, asegúrate de que el Dockerfile esté correcto
- Para reiniciar con cambios en el código: `docker compose up --build --force-recreate`
- Para limpiar todo: `docker compose down -v` (elimina volúmenes)

### Notas
- La aplicación ejecuta `prisma migrate deploy` al iniciar, asegurando que el esquema esté actualizado
- El seeder es opcional y debe ejecutarse manualmente cuando sea necesario
- Los health checks aseguran que PostgreSQL esté listo antes de iniciar la app</content>
<parameter name="filePath">z:\Proyectos EXPERTS\nuevo\experts-core\apps\control\README.md