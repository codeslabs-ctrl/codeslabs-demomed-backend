-- Añadir campos mpps y cm a la tabla medicos
ALTER TABLE public.medicos 
ADD COLUMN IF NOT EXISTS mpps character varying(50) NULL,
ADD COLUMN IF NOT EXISTS cm character varying(50) NULL;

-- Comentarios para documentar los campos
COMMENT ON COLUMN public.medicos.mpps IS 'Número MPPS del médico';
COMMENT ON COLUMN public.medicos.cm IS 'Número CM (Colegio de Médicos) del médico';
