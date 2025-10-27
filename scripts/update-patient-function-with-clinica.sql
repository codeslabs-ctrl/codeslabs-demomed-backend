-- Script para actualizar la función existente create_patient_with_history
-- para incluir clinica_alias en las inserciones

-- Primero, eliminar la función existente
DROP FUNCTION IF EXISTS create_patient_with_history(JSONB, JSONB);

-- Recrear la función con clinica_alias incluido
CREATE OR REPLACE FUNCTION create_patient_with_history(
  patient_data JSONB,
  medical_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_patient_id INTEGER;
  new_historico_id INTEGER;
  result JSONB;
BEGIN
  -- Iniciar la transacción implícitamente con el bloque PL/pgSQL

  -- 1. Insertar en la tabla de pacientes (incluyendo clinica_alias)
  INSERT INTO pacientes (
    nombres,
    apellidos,
    cedula,
    edad,
    sexo,
    email,
    telefono,
    clinica_alias
  ) VALUES (
    patient_data->>'nombres',
    patient_data->>'apellidos',
    patient_data->>'cedula',
    (patient_data->>'edad')::INTEGER,
    (patient_data->>'sexo')::TEXT,
    patient_data->>'email',
    patient_data->>'telefono',
    patient_data->>'clinica_alias'
  ) RETURNING id INTO new_patient_id;

  -- 2. Insertar en la tabla historico_pacientes si hay datos médicos y un medico_id válido
  -- (incluyendo clinica_alias)
  IF (
    (medical_data->>'motivo_consulta') IS NOT NULL OR
    (medical_data->>'diagnostico') IS NOT NULL OR
    (medical_data->>'conclusiones') IS NOT NULL OR
    (medical_data->>'plan') IS NOT NULL
  ) THEN
    -- Solo crear historial si hay un medico_id válido
    IF (medical_data->>'medico_id') IS NOT NULL THEN
      INSERT INTO historico_pacientes (
        paciente_id,
        medico_id,
        motivo_consulta,
        diagnostico,
        conclusiones,
        plan,
        fecha_consulta,
        fecha_creacion,
        fecha_actualizacion,
        clinica_alias
      ) VALUES (
        new_patient_id,
        (medical_data->>'medico_id')::INTEGER,
        (medical_data->>'motivo_consulta')::TEXT,
        (medical_data->>'diagnostico')::TEXT,
        (medical_data->>'conclusiones')::TEXT,
        (medical_data->>'plan')::TEXT,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        medical_data->>'clinica_alias'
      ) RETURNING id INTO new_historico_id;
    END IF;
  END IF;

  -- Obtener el paciente creado con todos sus datos
  SELECT to_jsonb(p.*) INTO result
  FROM pacientes p
  WHERE p.id = new_patient_id;

  -- Agregar información del historial si se creó
  IF new_historico_id IS NOT NULL THEN
    result := result || jsonb_build_object('historico_id', new_historico_id);
  END IF;
  
  -- Agregar información adicional
  result := result || jsonb_build_object(
    'message', 'Patient created successfully',
    'has_medical_history', (new_historico_id IS NOT NULL)
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, hacer rollback automático
    RAISE EXCEPTION 'Error creating patient: %', SQLERRM;
END;
$$;

-- Comentario sobre la función actualizada
COMMENT ON FUNCTION create_patient_with_history(JSONB, JSONB) IS 
'Crea un paciente con su historial médico inicial, incluyendo clinica_alias en ambos registros. Función actualizada para soporte multi-clínica.';

-- Verificar que la función se creó correctamente
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'create_patient_with_history';
