-- =====================================================
-- ESTRATEGIA: SISTEMA DE SERVICIOS Y FINALIZACIÓN
-- Sistema FemiMed - Base de datos
-- =====================================================

-- 1. TABLA SERVICIOS
CREATE TABLE IF NOT EXISTS public.servicios (
    id SERIAL PRIMARY KEY,
    nombre_servicio VARCHAR(100) NOT NULL,
    especialidad_id INTEGER NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
    monto_base DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'VES', -- VES (Bolívares) o USD (Dólares)
    activo BOOLEAN DEFAULT TRUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABLA SERVICIOS_CONSULTA (Relación many-to-many)
CREATE TABLE IF NOT EXISTS public.servicios_consulta (
    id SERIAL PRIMARY KEY,
    consulta_id INTEGER NOT NULL REFERENCES public.consultas_pacientes(id) ON DELETE CASCADE,
    servicio_id INTEGER NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
    monto_pagado DECIMAL(10,2) NOT NULL,
    moneda_pago VARCHAR(3) NOT NULL, -- VES o USD
    tipo_cambio DECIMAL(10,4) DEFAULT 1.0, -- Para conversión USD/VES
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLA TIPOS_CAMBIO (Para conversión de monedas)
CREATE TABLE IF NOT EXISTS public.tipos_cambio (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    usd_to_ves DECIMAL(10,4) NOT NULL,
    ves_to_usd DECIMAL(10,4) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_servicios_especialidad ON public.servicios(especialidad_id);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON public.servicios(activo);
CREATE INDEX IF NOT EXISTS idx_servicios_consulta_consulta ON public.servicios_consulta(consulta_id);
CREATE INDEX IF NOT EXISTS idx_servicios_consulta_servicio ON public.servicios_consulta(servicio_id);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_fecha ON public.tipos_cambio(fecha);

-- 5. INSERTAR SERVICIOS BÁSICOS
INSERT INTO public.servicios (nombre_servicio, especialidad_id, monto_base, moneda, descripcion) VALUES
-- Servicios de Medicina Estética (ID: 1)
('Consulta Medicina Estética', 1, 60.00, 'USD', 'Consulta médica estética'),
('Tratamiento Facial', 1, 120.00, 'USD', 'Tratamiento facial rejuvenecimiento'),
('Botox', 1, 200.00, 'USD', 'Aplicación de toxina botulínica'),
('Rellenos', 1, 300.00, 'USD', 'Rellenos dérmicos'),

-- Servicios de Ginecología y Obstetricia (ID: 2)
('Consulta Ginecológica', 2, 50.00, 'USD', 'Consulta médica ginecológica'),
('Ecografía Transvaginal', 2, 80.00, 'USD', 'Ecografía ginecológica'),
('Papanicolaou', 2, 25.00, 'USD', 'Citología cervical'),
('Control Prenatal', 2, 40.00, 'USD', 'Control médico prenatal'),

-- Servicios de Medicina Interna (ID: 3)
('Consulta Medicina Interna', 3, 40.00, 'USD', 'Consulta médica interna'),
('Electrocardiograma', 3, 25.00, 'USD', 'ECG'),
('Análisis de Laboratorio', 3, 20.00, 'USD', 'Análisis básicos'),
('Consulta de Seguimiento', 3, 30.00, 'USD', 'Consulta de seguimiento')

ON CONFLICT DO NOTHING;

-- 6. INSERTAR TIPO DE CAMBIO ACTUAL
INSERT INTO public.tipos_cambio (fecha, usd_to_ves, ves_to_usd) VALUES
(CURRENT_DATE, 36.50, 0.0274)
ON CONFLICT DO NOTHING;

-- 7. VISTA PARA SERVICIOS CON ESPECIALIDAD
CREATE OR REPLACE VIEW public.v_servicios_completos AS
SELECT 
    s.id,
    s.nombre_servicio,
    s.monto_base,
    s.moneda,
    s.descripcion,
    s.activo,
    e.nombre_especialidad as especialidad_nombre,
    e.descripcion as especialidad_descripcion
FROM public.servicios s
JOIN public.especialidades e ON s.especialidad_id = e.id
WHERE s.activo = TRUE;

-- 8. FUNCIÓN PARA OBTENER SERVICIOS POR ESPECIALIDAD
CREATE OR REPLACE FUNCTION public.obtener_servicios_por_especialidad(p_especialidad_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    nombre_servicio VARCHAR(100),
    monto_base DECIMAL(10,2),
    moneda VARCHAR(3),
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.nombre_servicio,
        s.monto_base,
        s.moneda,
        s.descripcion
    FROM public.servicios s
    WHERE s.especialidad_id = p_especialidad_id
    AND s.activo = TRUE
    ORDER BY s.nombre_servicio;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN PARA CALCULAR TOTAL DE CONSULTA
CREATE OR REPLACE FUNCTION public.calcular_total_consulta(p_consulta_id INTEGER)
RETURNS TABLE (
    total_usd DECIMAL(10,2),
    total_ves DECIMAL(10,2),
    cantidad_servicios INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN sc.moneda_pago = 'USD' THEN sc.monto_pagado ELSE sc.monto_pagado / tc.usd_to_ves END), 0) as total_usd,
        COALESCE(SUM(CASE WHEN sc.moneda_pago = 'VES' THEN sc.monto_pagado ELSE sc.monto_pagado * tc.usd_to_ves END), 0) as total_ves,
        COUNT(sc.id)::INTEGER as cantidad_servicios
    FROM public.servicios_consulta sc
    LEFT JOIN public.tipos_cambio tc ON DATE(sc.created_at) = tc.fecha
    WHERE sc.consulta_id = p_consulta_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RESUMEN DE TABLAS CREADAS:
-- =====================================================
-- ✅ servicios: Catálogo de servicios médicos
-- ✅ servicios_consulta: Servicios aplicados a consultas
-- ✅ tipos_cambio: Conversión de monedas
-- ✅ v_servicios_completos: Vista con información completa
-- ✅ Funciones: Para consultas y cálculos
-- =====================================================
