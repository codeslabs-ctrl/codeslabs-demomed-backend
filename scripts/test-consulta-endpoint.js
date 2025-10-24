const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConsultaEndpoint() {
  console.log('🔍 Probando endpoint de consultas del día...\n');

  try {
    // 1. Probar la consulta directa que está usando el controlador
    console.log('📋 1. Probando consulta directa...');
    
    const { data: consultas, error } = await supabase
      .from('consultas_pacientes')
      .select(`
        id,
        paciente_id,
        medico_id,
        medico_remitente_id,
        motivo_consulta,
        tipo_consulta,
        fecha_pautada,
        hora_pautada,
        fecha_culminacion,
        duracion_estimada,
        estado_consulta,
        prioridad,
        diagnostico_preliminar,
        observaciones,
        notas_internas,
        recordatorio_enviado,
        fecha_recordatorio,
        metodo_recordatorio,
        motivo_cancelacion,
        fecha_cancelacion,
        cancelado_por,
        fecha_creacion,
        fecha_actualizacion,
        creado_por,
        actualizado_por,
        pacientes!inner(
          nombres,
          apellidos,
          telefono,
          cedula
        ),
        medicos!consultas_pacientes_medico_id_fkey(
          nombres,
          apellidos,
          especialidad_id,
          especialidades!medicos_especialidad_id_fkey(
            nombre_especialidad,
            descripcion
          )
        )
      `)
      .eq('fecha_pautada', new Date().toISOString().split('T')[0])
      .in('estado_consulta', ['agendada', 'reagendada', 'en_progreso'])
      .order('hora_pautada', { ascending: true });

    if (error) {
      console.log('❌ Error en consulta directa:', error.message);
      return;
    }

    console.log(`✅ Consulta directa: ${consultas.length} registros`);
    
    if (consultas.length > 0) {
      const consulta = consultas[0];
      console.log('📋 Primera consulta (datos originales):');
      console.log('   - ID:', consulta.id);
      console.log('   - Médico ID:', consulta.medico_id);
      console.log('   - Especialidad ID (médico):', consulta.medicos?.especialidad_id);
      console.log('   - Especialidad Nombre:', consulta.medicos?.especialidades?.nombre_especialidad);
      
      // 2. Procesar datos como lo hace el controlador
      console.log('\n📋 2. Procesando datos como el controlador...');
      
      const consultaProcesada = {
        ...consulta,
        paciente_nombre: consulta.pacientes?.nombres || '',
        paciente_apellidos: consulta.pacientes?.apellidos || '',
        paciente_telefono: consulta.pacientes?.telefono || '',
        paciente_cedula: consulta.pacientes?.cedula || '',
        medico_nombre: consulta.medicos?.nombres || '',
        medico_apellidos: consulta.medicos?.apellidos || '',
        especialidad_id: consulta.medicos?.especialidad_id || null,
        especialidad_nombre: consulta.medicos?.especialidades?.nombre_especialidad || '',
        especialidad_descripcion: consulta.medicos?.especialidades?.descripcion || ''
      };
      
      console.log('📋 Consulta procesada:');
      console.log('   - especialidad_id:', consultaProcesada.especialidad_id);
      console.log('   - especialidad_nombre:', consultaProcesada.especialidad_nombre);
      
      if (consultaProcesada.especialidad_id) {
        console.log('✅ especialidad_id está presente en los datos procesados');
        
        // 3. Probar obtener servicios para esta especialidad
        console.log('\n📋 3. Probando servicios para especialidad:', consultaProcesada.especialidad_id);
        
        const { data: servicios, error: serviciosError } = await supabase
          .from('servicios')
          .select('id, nombre_servicio, monto_base, moneda')
          .eq('especialidad_id', consultaProcesada.especialidad_id)
          .eq('activo', true);
        
        if (serviciosError) {
          console.log('❌ Error obteniendo servicios:', serviciosError.message);
        } else {
          console.log(`✅ Servicios encontrados: ${servicios.length}`);
          servicios.forEach(servicio => {
            console.log(`   - ${servicio.nombre_servicio}: $${servicio.monto_base} ${servicio.moneda}`);
          });
        }
      } else {
        console.log('❌ especialidad_id es null o undefined en datos procesados');
      }
    } else {
      console.log('⚠️  No hay consultas para hoy');
    }

    console.log('\n🎉 Prueba completada.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testConsultaEndpoint();
