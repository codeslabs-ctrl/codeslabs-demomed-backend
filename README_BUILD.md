# Configuración de Base de Datos en Tiempo de Build

## ✅ Implementación Completada

La aplicación ahora permite configurar qué sistema de base de datos usar **en tiempo de build**, no en tiempo de ejecución. La decisión se compila directamente en el código.

## 🚀 Comandos de Build

### Build con PostgreSQL

```bash
npm run build:postgres
```

Compila el código para usar PostgreSQL directo. El valor `USE_POSTGRES = true` se compila en el código.

### Build con Supabase

```bash
npm run build:supabase
```

Compila el código para usar Supabase. El valor `USE_POSTGRES = false` se compila en el código.

### Build por defecto

```bash
npm run build
```

Por defecto usará Supabase (si no se especifica `USE_POSTGRES`).

## 🔧 Cómo Funciona

1. **Antes del build**: El script `prebuild` ejecuta `generate-db-config.js`
2. **Generación**: Se crea/actualiza `src/config/database-config.ts` con el valor correcto
3. **Compilación**: TypeScript compila el código con la constante ya definida
4. **Resultado**: El código compilado tiene la decisión "quemada" en el código

## 📝 Verificación

Después del build, puedes verificar en `dist/config/database-config.js`:

```javascript
// Build con PostgreSQL:
exports.USE_POSTGRES = true;

// Build con Supabase:
exports.USE_POSTGRES = false;
```

## ⚠️ Notas Importantes

1. **Una vez compilado, no puedes cambiar el sistema de BD sin recompilar**
2. **Las credenciales** (host, user, password) siguen leyéndose de `config.env` en tiempo de ejecución
3. **Solo la decisión** de qué sistema usar se compila en tiempo de build

## 🎯 Ventajas

- ✅ **Mejor rendimiento**: No hay que leer configuración en cada import
- ✅ **Más seguro**: La decisión está en el código compilado
- ✅ **Tree shaking**: TypeScript puede eliminar código no usado
- ✅ **Mejor para CI/CD**: Puedes crear builds diferentes para diferentes entornos

## 📚 Documentación Completa

Ver `docs/BUILD_TIME_CONFIG.md` para más detalles.

