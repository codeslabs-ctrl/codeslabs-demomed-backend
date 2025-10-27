-- Función para crear remisiones con soporte para clinica_alias
-- Esta función actualiza la función existente para incluir clinica_alias

-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS crear_remision(INTEGER, INTEGER, INTEGER, TEXT, TEXT);

-- Crear la nueva función con clinica_alias
CREATE OR REPLACE FUNCTION crear_remision(
    p_paciente_id INTEGER,
    p_medico_remitente_id INTEGER,
    p_medico_remitido_id INTEGER,
    p_motivo_remision TEXT,
    p_observaciones TEXT DEFAULT NULL,
    p_clinica_alias VARCHAR(50) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_especialidad_remitente_id INTEGER;
    v_especialidad_remitida_id INTEGER;
    v_remision_id INTEGER;
    v_clinica_alias VARCHAR(50);
BEGIN
    -- Validar que el clinica_alias no esté vacío
    IF p_clinica_alias IS NULL OR TRIM(p_clinica_alias) = '' THEN
        RAISE EXCEPTION 'clinica_alias no puede estar vacío';
    END IF;
    
    v_clinica_alias := TRIM(p_clinica_alias);
    
    -- Validar que los médicos existen y obtener sus especialidades
    SELECT especialidad_id INTO v_especialidad_remitente_id
    FROM medicos 
    WHERE id = p_medico_remitente_id AND activo = true;
    
    IF v_especialidad_remitente_id IS NULL THEN
        RAISE EXCEPTION 'El médico remitente no existe o está inactivo';
    END IF;
    
    SELECT especialidad_id INTO v_especialidad_remitida_id
    FROM medicos 
    WHERE id = p_medico_remitido_id AND activo = true;
    
    IF v_especialidad_remitida_id IS NULL THEN
        RAISE EXCEPTION 'El médico remitido no existe o está inactivo';
    END IF;
    
    -- Validar que no es la misma especialidad
    IF v_especialidad_remitente_id = v_especialidad_remitida_id THEN
        RAISE EXCEPTION 'No se puede remitir a la misma especialidad';
    END IF;
    
    -- Validar que no es el mismo médico
    IF p_medico_remitente_id = p_medico_remitido_id THEN
        RAISE EXCEPTION 'No se puede remitir al mismo médico';
    END IF;
    
    -- Validar que el paciente existe
    IF NOT EXISTS (SELECT 1 FROM pacientes WHERE id = p_paciente_id AND activo = true) THEN
        RAISE EXCEPTION 'El paciente no existe o está inactivo';
    END IF;
    
    -- Crear la remisión con clinica_alias
    INSERT INTO remisiones (
        paciente_id,
        medico_remitente_id,
        medico_remitido_id,
        motivo_remision,
        observaciones,
        estado_remision,
        clinica_alias
    ) VALUES (
        p_paciente_id,
        p_medico_remitente_id,
        p_medico_remitido_id,
        p_motivo_remision,
        p_observaciones,
        'Pendiente',
        v_clinica_alias
    ) RETURNING id INTO v_remision_id;
    
    RETURN v_remision_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios sobre la función
COMMENT ON FUNCTION crear_remision IS 'Crea una nueva remisión con validaciones y soporte para clinica_alias';
