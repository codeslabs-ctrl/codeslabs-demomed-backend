const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixConsultaView() {
  console.log('🔧 Corrigiendo vista_consultas_hoy para incluir especialidad_id...\n');

  try {
    // 1. Eliminar la vista existente
    console.log('📋 1. Eliminando vista existente...');
    const { error: dropError } = await supabase
      .rpc('exec', { sql: 'DROP VIEW IF EXISTS public.vista_consultas_hoy' });
    
    if (dropError) {
      console.log('⚠️  Error eliminando vista (puede que no exista):', dropError.message);
    } else {
      console.log('✅ Vista eliminada exitosamente');
    }

    // 2. Crear la vista corregida
    console.log('📋 2. Creando vista corregida...');
    
    const createViewSQL = `
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
        AND cp.estado_consulta IN ('agendada', 'reagendada', 'en_progreso')
    `;

    const { error: createError } = await supabase
      .rpc('exec', { sql: createViewSQL });
    
    if (createError) {
      console.log('❌ Error creando vista:', createError.message);
      return;
    }

    console.log('✅ Vista creada exitosamente');

    // 3. Verificar que la vista funciona
    console.log('📋 3. Verificando vista corregida...');
    
    const { data: consultas, error: testError } = await supabase
      .from('vista_consultas_hoy')
      .select('id, paciente_nombre, medico_nombre, especialidad_id, especialidad_nombre')
      .limit(1);
    
    if (testError) {
      console.log('❌ Error probando vista:', testError.message);
      return;
    }

    console.log(`✅ Vista funcionando: ${consultas.length} registros`);
    if (consultas.length > 0) {
      const consulta = consultas[0];
      console.log('📋 Datos de prueba:');
      console.log(`   - ID: ${consulta.id}`);
      console.log(`   - Paciente: ${consulta.paciente_nombre}`);
      console.log(`   - Médico: ${consulta.medico_nombre}`);
      console.log(`   - Especialidad ID: ${consulta.especialidad_id}`);
      console.log(`   - Especialidad Nombre: ${consulta.especialidad_nombre}`);
    }

    console.log('\n🎉 Vista corregida exitosamente. El modal ahora debería mostrar servicios.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixConsultaView();


