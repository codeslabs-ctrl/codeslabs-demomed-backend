# FemiMed Backend API

Un backend moderno construido con Node.js, Express y Supabase que proporciona una API RESTful completa con autenticación y operaciones CRUD.

## 🚀 Características

- **Node.js 18+** con ES6 modules
- **Express.js** con middleware moderno
- **Supabase** para base de datos y autenticación
- **Variables de entorno** para configuración dinámica
- **Rate limiting** y seguridad
- **Validación de datos** con Joi
- **Manejo de errores** centralizado
- **CORS** configurado
- **Compresión** y logging

## 📋 Prerrequisitos

- Node.js 18.0.0 o superior
- npm o yarn
- Cuenta de Supabase

## 🛠️ Instalación

1. **Clona el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd femimed-backend
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   
   Copia el archivo de configuración:
   ```bash
   cp config.env .env
   ```
   
   Edita el archivo `.env` con tus valores:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Supabase Configuration
   SUPABASE_URL=https://snxiprwaaxaobjppqnxw.supabase.co
   SUPABASE_ANON_KEY=tu_clave_anonima_aqui

   # API Configuration
   API_VERSION=v1
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   CORS_CREDENTIALS=true
   ```

4. **Inicia el servidor**
   ```bash
   # Desarrollo
   npm run dev

   # Producción
   npm start
   ```

## 📚 API Endpoints

### Autenticación (`/api/v1/auth`)

- `POST /signup` - Registro de usuario
- `POST /signin` - Inicio de sesión
- `POST /signout` - Cerrar sesión
- `GET /user` - Obtener usuario actual
- `POST /reset-password` - Restablecer contraseña
- `PUT /user` - Actualizar usuario

### Datos (`/api/v1/data`)

#### Operaciones CRUD genéricas para cualquier tabla:

- `GET /users` - Listar usuarios (con paginación)
- `GET /users/:id` - Obtener usuario por ID
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

#### Endpoints especiales:

- `GET /info` - Información de la base de datos
- `POST /query` - Consulta personalizada

### Utilidades

- `GET /health` - Estado del servidor

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | 3000 |
| `NODE_ENV` | Entorno de ejecución | development |
| `SUPABASE_URL` | URL de tu proyecto Supabase | - |
| `SUPABASE_ANON_KEY` | Clave anónima de Supabase | - |
| `API_VERSION` | Versión de la API | v1 |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limiting (ms) | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requests por ventana | 100 |
| `CORS_ORIGIN` | Origen permitido para CORS | http://localhost:3000 |
| `CORS_CREDENTIALS` | Permitir credenciales en CORS | true |

## 📝 Ejemplos de Uso

### Registro de Usuario

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "password123",
    "user_metadata": {
      "first_name": "Juan",
      "last_name": "Pérez"
    }
  }'
```

### Inicio de Sesión

```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "password123"
  }'
```

### Obtener Usuarios con Paginación

```bash
curl "http://localhost:3000/api/v1/data/users?page=1&limit=10&sort=desc"
```

### Crear un Producto

```bash
curl -X POST http://localhost:3000/api/v1/data/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Producto Ejemplo",
    "description": "Descripción del producto",
    "price": 29.99
  }'
```

### Consulta Personalizada

```bash
curl -X POST http://localhost:3000/api/v1/data/query \
  -H "Content-Type: application/json" \
  -d '{
    "table": "products",
    "select": "id, name, price",
    "filters": {"active": true},
    "orderBy": {"column": "created_at", "ascending": false},
    "limit": 20
  }'
```

## 🏗️ Estructura del Proyecto

```
src/
├── config/
│   ├── database.js      # Configuración de Supabase
│   └── environment.js   # Variables de entorno
├── middleware/
│   ├── errorHandler.js  # Manejo de errores
│   └── validation.js    # Validación de datos
├── routes/
│   ├── index.js         # Rutas principales
│   ├── auth.js          # Rutas de autenticación
│   └── data.js          # Rutas de datos
└── server.js            # Servidor principal
```

## 🔒 Seguridad

- **Helmet** para headers de seguridad
- **Rate limiting** para prevenir abuso
- **CORS** configurado
- **Validación** de datos de entrada
- **Manejo seguro** de errores

## 🚀 Despliegue

### Variables de Entorno para Producción

```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://tu-dominio.com
RATE_LIMIT_MAX_REQUESTS=1000
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 📊 Monitoreo

El servidor incluye:

- **Health check** en `/health`
- **Logging** con Morgan
- **Manejo de errores** centralizado
- **Graceful shutdown**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación de [Supabase](https://supabase.com/docs)
2. Verifica las variables de entorno
3. Revisa los logs del servidor
4. Abre un issue en GitHub

---

**¡Desarrollado con ❤️ para FemiMed!**

