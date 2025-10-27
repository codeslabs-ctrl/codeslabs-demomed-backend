-- =====================================================
-- AGREGAR CAMPOS FINANCIEROS A CONSULTAS_PACIENTES
-- Sistema FemiMed - Base de datos
-- =====================================================

-- Agregar campos financieros a la tabla consultas_pacientes
ALTER TABLE public.consultas_pacientes 
ADD COLUMN IF NOT EXISTS fecha_pago DATE,
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50),
ADD COLUMN IF NOT EXISTS observaciones_financieras TEXT;

-- Crear índices para mejorar rendimiento en consultas financieras
CREATE INDEX IF NOT EXISTS idx_consultas_fecha_pago ON public.consultas_pacientes(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_consultas_metodo_pago ON public.consultas_pacientes(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha_pautada ON public.consultas_pacientes(fecha_pautada);

-- Agregar comentarios a los nuevos campos
COMMENT ON COLUMN public.consultas_pacientes.fecha_pago IS 'Fecha en que se realizó el pago de la consulta';
COMMENT ON COLUMN public.consultas_pacientes.metodo_pago IS 'Método de pago utilizado (efectivo, transferencia, tarjeta, etc.)';
COMMENT ON COLUMN public.consultas_pacientes.observaciones_financieras IS 'Observaciones adicionales sobre el pago';

-- Crear vista para consultas financieras completas
CREATE OR REPLACE VIEW public.v_consultas_financieras AS
SELECT 
    cp.id,
    cp.fecha_pautada,
    cp.hora_pautada,
    cp.estado_consulta,
    cp.fecha_pago,
    cp.metodo_pago,
    cp.observaciones_financieras,
    p.nombres as paciente_nombre,
    p.apellidos as paciente_apellidos,
    p.cedula as paciente_cedula,
    m.nombres as medico_nombre,
    m.apellidos as medico_apellidos,
    e.nombre_especialidad as especialidad_nombre,
    CASE 
        WHEN cp.fecha_pago IS NOT NULL THEN 'pagado'
        ELSE 'pendiente'
    END as estado_pago
FROM public.consultas_pacientes cp
JOIN public.pacientes p ON cp.paciente_id = p.id
JOIN public.medicos m ON cp.medico_id = m.id
JOIN public.especialidades e ON m.especialidad_id = e.id;

-- Función para obtener total de servicios por consulta
CREATE OR REPLACE FUNCTION public.obtener_total_servicios_consulta(p_consulta_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(sc.monto_pagado), 0)
    INTO total
    FROM public.servicios_consulta sc
    WHERE sc.consulta_id = p_consulta_id;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar consulta como pagada
CREATE OR REPLACE FUNCTION public.marcar_consulta_pagada(
    p_consulta_id INTEGER,
    p_fecha_pago DATE,
    p_metodo_pago VARCHAR(50),
    p_observaciones TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.consultas_pacientes 
    SET 
        fecha_pago = p_fecha_pago,
        metodo_pago = p_metodo_pago,
        observaciones_financieras = p_observaciones,
        updated_at = NOW()
    WHERE id = p_consulta_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RESUMEN DE CAMBIOS:
-- =====================================================
-- ✅ Campos agregados a consultas_pacientes:
--    - fecha_pago (DATE)
--    - metodo_pago (VARCHAR(50))
--    - observaciones_financieras (TEXT)
-- ✅ Índices creados para rendimiento
-- ✅ Vista v_consultas_financieras creada
-- ✅ Funciones auxiliares para cálculos
-- =====================================================

