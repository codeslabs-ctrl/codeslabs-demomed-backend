# API Endpoints - Vistas y Funciones de Base de Datos

## 📋 Descripción General

Este documento describe los endpoints para acceder a las vistas y funciones de la base de datos de FemiMed, incluyendo la función `obtener_historico_filtrado` y las vistas especializadas.

## 🔗 Base URL
```
http://localhost:3000/api/v1/views
```

---

## 📊 Endpoints Disponibles

### 1. **Historial Filtrado por Médico y/o Paciente**

**Endpoint:** `GET /views/historico-filtrado`

**Descripción:** Obtiene el historial médico usando la función `obtener_historico_filtrado` con filtros opcionales.

**Parámetros de Query:**
- `medico_id` (opcional): ID del médico para filtrar
- `paciente_id` (opcional): ID del paciente para filtrar

**Ejemplos de Uso:**

```bash
# Obtener todos los pacientes de un médico específico
GET /views/historico-filtrado?medico_id=1

# Obtener historial completo de un paciente específico
GET /views/historico-filtrado?paciente_id=2

# Obtener historial de un paciente con un médico específico
GET /views/historico-filtrado?medico_id=1&paciente_id=2

# Obtener todo el historial (sin filtros)
GET /views/historico-filtrado
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "motivo_consulta": "Consulta de rutina",
      "diagnostico": "Estado de salud normal",
      "conclusiones": "Paciente en buen estado",
      "plan": "Seguimiento en 6 meses",
      "fecha_consulta": "2024-01-15T10:30:00Z",
      "paciente_id": 1,
      "medico_id": 1,
      "nombre_paciente": "María González",
      "nombres_paciente": "María",
      "apellidos_paciente": "González",
      "edad": 35,
      "sexo": "Femenino",
      "email_paciente": "maria@email.com",
      "telefono_paciente": "+58-412-1234567",
      "nombre_medico": "Dr. Ana Rodríguez",
      "nombres_medico": "Ana",
      "apellidos_medico": "Rodríguez",
      "cedula_medico": "V-87654321",
      "email_medico": "ana.rodriguez@femimed.com",
      "telefono_medico": "+58-414-2345678",
      "especialidad_id": 2,
      "nombre_especialidad": "Ginecología y obstetricia",
      "fecha_creacion": "2024-01-15T10:30:00Z",
      "fecha_actualizacion": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 2. **Vista Médicos Completa**

**Endpoint:** `GET /views/medicos-completa`

**Descripción:** Obtiene la vista completa de médicos con información de especialidad.

**Parámetros de Query:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 10)
- `especialidad_id` (opcional): Filtrar por especialidad
- `activo` (opcional): Filtrar por estado activo (true/false)

**Ejemplo:**
```bash
GET /views/medicos-completa?page=1&limit=10&especialidad_id=2&activo=true
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombres": "María",
      "apellidos": "González",
      "cedula": "V-12345678",
      "email": "maria.gonzalez@femimed.com",
      "telefono": "+58-412-1234567",
      "especialidad_id": 1,
      "nombre_especialidad": "Medicina estética y regenerativa",
      "activo": true,
      "fecha_creacion": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 3. **Estadísticas por Especialidad**

**Endpoint:** `GET /views/estadisticas-especialidad`

**Descripción:** Obtiene estadísticas de consultas por especialidad.

**Parámetros de Query:**
- `especialidad_id` (opcional): Filtrar por especialidad específica

**Ejemplo:**
```bash
GET /views/estadisticas-especialidad?especialidad_id=2
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "especialidad_id": 2,
      "nombre_especialidad": "Ginecología y obstetricia",
      "total_consultas": 150,
      "pacientes_atendidos": 75,
      "medicos_activos": 3,
      "primera_consulta": "2024-01-01T00:00:00Z",
      "ultima_consulta": "2024-12-31T23:59:59Z"
    }
  ]
}
```

---

### 4. **Historial Completo (Vista)**

**Endpoint:** `GET /views/historico-completo`

**Descripción:** Obtiene el historial completo con filtros adicionales.

**Parámetros de Query:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 10)
- `medico_id` (opcional): Filtrar por médico
- `paciente_id` (opcional): Filtrar por paciente
- `especialidad_id` (opcional): Filtrar por especialidad
- `fecha_desde` (opcional): Fecha desde (YYYY-MM-DD)
- `fecha_hasta` (opcional): Fecha hasta (YYYY-MM-DD)
- `sexo` (opcional): Filtrar por sexo del paciente

**Ejemplo:**
```bash
GET /views/historico-completo?medico_id=1&fecha_desde=2024-01-01&fecha_hasta=2024-12-31&sexo=Femenino
```

---

### 5. **Estadísticas de Médico Específico**

**Endpoint:** `GET /views/medico-estadisticas/:medico_id`

**Descripción:** Obtiene estadísticas detalladas de un médico específico.

**Parámetros de Ruta:**
- `medico_id`: ID del médico

**Ejemplo:**
```bash
GET /views/medico-estadisticas/1
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "medico": {
      "id": 1,
      "nombres": "María",
      "apellidos": "González",
      "cedula": "V-12345678",
      "email": "maria.gonzalez@femimed.com",
      "telefono": "+58-412-1234567",
      "especialidad_id": 1,
      "nombre_especialidad": "Medicina estética y regenerativa",
      "activo": true,
      "fecha_creacion": "2024-01-01T00:00:00Z"
    },
    "estadisticas": {
      "total_consultas": 45,
      "pacientes_unicos": 30,
      "primera_consulta": "2024-01-15T10:30:00Z",
      "ultima_consulta": "2024-12-15T14:20:00Z"
    },
    "historico": [
      // Array con todos los registros del historial
    ]
  }
}
```

---

### 6. **Estadísticas de Paciente Específico**

**Endpoint:** `GET /views/paciente-estadisticas/:paciente_id`

**Descripción:** Obtiene estadísticas detalladas de un paciente específico.

**Parámetros de Ruta:**
- `paciente_id`: ID del paciente

**Ejemplo:**
```bash
GET /views/paciente-estadisticas/2
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "paciente": {
      "id": 2,
      "nombres": "Ana",
      "apellidos": "Martínez",
      "edad": 28,
      "sexo": "Femenino",
      "email": "ana.martinez@email.com",
      "telefono": "+58-414-9876543",
      "activo": true,
      "fecha_creacion": "2024-02-01T00:00:00Z"
    },
    "estadisticas": {
      "total_consultas": 8,
      "medicos_unicos": 3,
      "especialidades_unicas": 2,
      "primera_consulta": "2024-02-15T09:00:00Z",
      "ultima_consulta": "2024-11-20T16:30:00Z"
    },
    "historial": [
      // Array con todo el historial del paciente
    ]
  }
}
```

---

## 🔧 Códigos de Estado HTTP

- **200 OK**: Solicitud exitosa
- **400 Bad Request**: Parámetros inválidos o error en la consulta
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error interno del servidor

---

## 📝 Notas de Implementación

1. **Paginación**: Los endpoints que soportan paginación devuelven información de paginación en la respuesta.

2. **Filtros**: Todos los filtros son opcionales y se pueden combinar según sea necesario.

3. **Ordenamiento**: Los resultados se ordenan por fecha de consulta descendente por defecto.

4. **Validación**: Los IDs se validan como números enteros.

5. **Fechas**: Las fechas se manejan en formato ISO 8601.

---

## 🚀 Ejemplos de Uso en Frontend

### JavaScript/TypeScript

```typescript
// Obtener pacientes de un médico específico
const getMedicoPacientes = async (medicoId: number) => {
  const response = await fetch(`/api/v1/views/historico-filtrado?medico_id=${medicoId}`);
  const data = await response.json();
  return data.data;
};

// Obtener estadísticas de un médico
const getMedicoEstadisticas = async (medicoId: number) => {
  const response = await fetch(`/api/v1/views/medico-estadisticas/${medicoId}`);
  const data = await response.json();
  return data.data;
};

// Obtener historial de un paciente
const getPacienteHistorial = async (pacienteId: number) => {
  const response = await fetch(`/api/v1/views/historico-filtrado?paciente_id=${pacienteId}`);
  const data = await response.json();
  return data.data;
};
```

### Angular Service

```typescript
@Injectable()
export class ViewsService {
  private apiUrl = 'http://localhost:3000/api/v1/views';

  getHistoricoFiltrado(medicoId?: number, pacienteId?: number) {
    let url = `${this.apiUrl}/historico-filtrado?`;
    if (medicoId) url += `medico_id=${medicoId}&`;
    if (pacienteId) url += `paciente_id=${pacienteId}&`;
    return this.http.get(url);
  }

  getMedicoEstadisticas(medicoId: number) {
    return this.http.get(`${this.apiUrl}/medico-estadisticas/${medicoId}`);
  }

  getPacienteEstadisticas(pacienteId: number) {
    return this.http.get(`${this.apiUrl}/paciente-estadisticas/${pacienteId}`);
  }
}
```
