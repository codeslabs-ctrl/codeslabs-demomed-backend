-- Script para agregar columna clinica_alias a la tabla medicos
-- Ejecutar este script después de limpiar los datos

-- 1. Agregar columna clinica_alias a medicos
ALTER TABLE public.medicos 
ADD COLUMN clinica_alias VARCHAR(50);

-- 2. Crear índice para medicos por clínica
CREATE INDEX idx_medicos_clinica ON public.medicos(clinica_alias);

-- 3. Actualizar medicos existentes con un valor por defecto (opcional)
-- UPDATE public.medicos 
-- SET clinica_alias = 'clinica_a' 
-- WHERE clinica_alias IS NULL;

-- 4. Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'medicos' 
AND column_name = 'clinica_alias';
