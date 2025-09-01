# Worker Auth Module - Sistema de Autenticación por QR para Trabajadores

## Arquitectura DDD Lite

El módulo está estructurado siguiendo principios de Domain-Driven Design (DDD) con capas claras:

### Estructura de Directorios
```
worker-auth/
├── application/
│   ├── dto/
│   ├── services/
│   └── use-cases/
├── domain/
│   ├── entities/
│   ├── enums/
│   ├── repositories/
│   ├── services/
│   └── value-objects/
├── infrastructure/
│   └── repositories/
├── guards/
├── worker-auth.controller.ts
└── worker-auth.module.ts
```

## Funcionalidades Implementadas

### 1. Flujo de Administrador (Generación de QR)
- **POST** `/worker-auth/admin/generate-qr` - Genera código QR único para login de trabajador

### 2. Flujo de Trabajador (Autenticación)
- **POST** `/worker-auth/worker/login` - Login usando código QR escaneado
- **POST** `/worker-auth/worker/refresh` - Refresca token de sesión
- **GET** `/worker-auth/worker/session` - Información de sesión actual
- **POST** `/worker-auth/worker/logout` - Cerrar sesión

## Casos de Uso (Use Cases)

### 1. GenerateWorkerLoginQRUseCase
- Genera tokens únicos para QR de login
- Configura expiración y estado
- Retorna datos para generar código QR

### 2. AuthenticateWorkerUseCase
- Valida token QR escaneado
- Autentica trabajador
- Genera sesión con JWT

### 3. RefreshSessionUseCase
- Valida token de refresh
- Genera nuevos tokens de sesión
- Mantiene sesión activa

### 4. LogoutWorkerUseCase
- Invalida sesión actual
- Limpia tokens de refresh

## Entidades de Dominio

### LoginQREntity
- Gestiona códigos QR de login
- Estados: PENDING, USED, EXPIRED
- Métodos de validación y uso

### WorkerSessionEntity
- Maneja sesiones de trabajadores
- Control de expiración
- Gestión de refresh tokens

## Value Objects

### QRLoginToken
- Encapsula token único para QR
- Validación de formato
- Generación segura

### SessionToken
- JWT token para sesiones
- Validación y parseo
- Datos de trabajador encriptados

## Servicios de Dominio

### SessionValidatorDomainService
- Validaciones complejas de sesión
- Reglas de negocio para tokens
- Control de expiración

## Guards

### WorkerAuthGuard
- Protege rutas que requieren autenticación de trabajador
- Valida JWT tokens
- Inyecta datos de trabajador en request

## Configuración de Base de Datos

Asegúrate de que tu esquema Prisma incluya las siguientes tablas:

```prisma
model Worker {
  id        String   @id @default(cuid())
  dni       String   @unique
  name      String
  email     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones con autenticación
  loginQRs      LoginQR[]
  sessions      WorkerSession[]
}

model LoginQR {
  id        String         @id @default(cuid())
  token     String         @unique
  workerId  String
  status    LoginQRStatus  @default(PENDING)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime       @default(now())

  worker    Worker         @relation(fields: [workerId], references: [id])
}

model WorkerSession {
  id           String        @id @default(cuid())
  workerId     String
  refreshToken String        @unique
  status       SessionStatus @default(ACTIVE)
  expiresAt    DateTime
  createdAt    DateTime      @default(now())
  lastUsedAt   DateTime      @default(now())

  worker       Worker        @relation(fields: [workerId], references: [id])
}

enum LoginQRStatus {
  PENDING
  USED
  EXPIRED
}

enum SessionStatus {
  ACTIVE
  EXPIRED
  REVOKED
}
```

## Uso del Módulo

### 1. Proteger Rutas
```typescript
@UseGuards(WorkerAuthGuard)
@Get('protected-route')
async protectedRoute(@Request() req) {
  // req.worker contiene los datos del trabajador autenticado
  return { worker: req.worker };
}
```

### 2. Generar QR para Login (Administrador)
```typescript
// El admin llama a este endpoint para generar QR
const qrData = await this.workerAuthService.generateLoginQR(workerId);
// qrData.token se usa para generar el código QR visual
```

### 3. Login de Trabajador
```typescript
// El trabajador escanea QR y envía el token
const session = await this.workerAuthService.authenticateWorker(qrToken);
// session contiene accessToken y refreshToken
```

## Variables de Entorno Requeridas

```env
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
QR_TOKEN_EXPIRES_IN=5m
```

## Integración con Frontend

### Flujo Completo
1. **Admin**: Selecciona trabajador → Genera QR → Muestra código QR
2. **Worker**: Escanea QR → Envía token → Recibe tokens de sesión
3. **Worker**: Usa accessToken para requests autenticados
4. **Worker**: Refresca token cuando expira
5. **Worker**: Logout cuando termina jornada

### Ejemplo de Integración
```javascript
// Escanear QR y extraer token
const qrToken = extractTokenFromQR(scannedData);

// Login
const response = await fetch('/worker-auth/worker/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: qrToken })
});

const { accessToken, refreshToken } = await response.json();

// Guardar tokens para requests posteriores
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

## Seguridad

- ✅ Tokens QR con expiración corta (5 minutos)
- ✅ JWT con firma segura
- ✅ Refresh tokens únicos por sesión
- ✅ Validación de estado de trabajador
- ✅ Control de sesiones activas
- ✅ Logout seguro con invalidación

## Testing

El módulo está listo para testing unitario e integración:
- Use Cases aislados para testing unitario
- Repositorio con interfaz para mocking
- Guards independientes para testing de autorización
- DTOs con validación para testing de entrada
