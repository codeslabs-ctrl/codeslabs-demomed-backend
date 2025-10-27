-- =====================================================
-- FIX: Agregar especialidad_id a vista_consultas_hoy
-- =====================================================

-- 1. Eliminar la vista existente
DROP VIEW IF EXISTS public.vista_consultas_hoy;

-- 2. Crear la vista corregida con especialidad_id
CREATE VIEW public.vista_consultas_hoy AS
SELECT 
    cp.id,
    cp.paciente_id,
    cp.medico_id,
    cp.medico_remitente_id,
    cp.motivo_consulta,
    cp.tipo_consulta,
    cp.fecha_pautada,
    cp.hora_pautada,
    cp.fecha_culminacion,
    cp.duracion_estimada,
    cp.estado_consulta,
    cp.prioridad,
    cp.diagnostico_preliminar,
    cp.observaciones,
    cp.notas_internas,
    cp.recordatorio_enviado,
    cp.fecha_recordatorio,
    cp.metodo_recordatorio,
    cp.motivo_cancelacion,
    cp.fecha_cancelacion,
    cp.cancelado_por,
    cp.fecha_creacion,
    cp.fecha_actualizacion,
    cp.creado_por,
    cp.actualizado_por,
    
    -- Datos del paciente
    p.nombres as paciente_nombre,
    p.apellidos as paciente_apellidos,
    p.telefono as paciente_telefono,
    p.cedula as paciente_cedula,
    
    -- Datos del médico
    m.nombres as medico_nombre,
    m.apellidos as medico_apellidos,
    m.especialidad_id,
    
    -- Datos de la especialidad
    e.nombre_especialidad as especialidad_nombre,
    e.descripcion as especialidad_descripcion
    
FROM public.consultas_pacientes cp
LEFT JOIN public.pacientes p ON cp.paciente_id = p.id
LEFT JOIN public.medicos m ON cp.medico_id = m.id
LEFT JOIN public.especialidades e ON m.especialidad_id = e.id
WHERE cp.fecha_pautada = CURRENT_DATE
  AND cp.estado_consulta IN ('agendada', 'reagendada', 'en_progreso');

-- 3. Verificar que la vista funciona
SELECT 'Vista creada exitosamente' as resultado;


