# DemoMed Backend - Configuración

## Resumen

Este es el backend independiente para **DemoMed** (`demomed.codes-labs.com`), completamente separado de FemiMed.

## Configuración Actual

### Puerto del Servidor
- **Puerto**: `3001`
- **URL**: `http://localhost:3001`

### Frontend
- **Producción**: `https://demomed.codes-labs.com`
- **Desarrollo**: `http://localhost:4200`

### CORS
Solo acepta requests desde:
- `https://demomed.codes-labs.com`
- `https://www.demomed.codes-labs.com`
- `http://localhost:4200` (desarrollo)

### Clínica
- **Alias**: `demomed`
- **Nombre**: `DemoMed - Centro Médico de Demostración`
- **Descripción**: Centro médico de demostración para pruebas y desarrollo

### Base de Datos
- **PostgreSQL**: `69.164.244.24:5432`
- **Base de datos**: `demomed_db`
- **Usuario**: `demomed_user`

## Configuración de Apache

Ver `scripts/apache-demomed-config.conf` para la configuración completa de Apache.

### Características
- Puerto **443 (HTTPS)**
- Proxy para `/api` → `http://localhost:3001/api`
- Proxy para `/health` → `http://localhost:3001/health`
- Redirección HTTP → HTTPS automática

## Comandos

### Desarrollo
```bash
npm run dev
```

### Build
```bash
# Build con Supabase (por defecto)
npm run build

# Build con PostgreSQL
npm run build:postgres
```

### Producción
```bash
npm start
```

## Estructura Independiente

Este backend es **completamente independiente** de FemiMed:
- ✅ Puerto diferente (3001 vs 3000)
- ✅ CORS configurado solo para demomed.codes-labs.com
- ✅ Configuración de clínica específica para DemoMed
- ✅ Base de datos separada (demomed_db)

## Archivos de Configuración

- `config.env` - Producción
- `config.dev.env` - Desarrollo
- `scripts/apache-demomed-config.conf` - Configuración de Apache
- `scripts/APACHE_SETUP.md` - Guía de configuración

