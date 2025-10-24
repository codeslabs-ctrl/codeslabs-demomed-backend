const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debugConsultaData() {
  console.log('🔍 Verificando datos de consultas...\n');

  try {
    // 1. Verificar la vista vista_consultas_hoy
    console.log('📋 1. Verificando vista_consultas_hoy...');
    
    const { data: consultasHoy, error: consultasError } = await supabase
      .from('vista_consultas_hoy')
      .select('*')
      .limit(3);
    
    if (consultasError) {
      console.log('❌ Error en vista_consultas_hoy:', consultasError.message);
    } else {
      console.log(`✅ Vista vista_consultas_hoy: ${consultasHoy.length} registros`);
      if (consultasHoy.length > 0) {
        console.log('📋 Campos disponibles en la primera consulta:');
        const primeraConsulta = consultasHoy[0];
        Object.keys(primeraConsulta).forEach(campo => {
          console.log(`   - ${campo}: ${primeraConsulta[campo]}`);
        });
        
        // Verificar si tiene especialidad_id
        if (primeraConsulta.especialidad_id) {
          console.log(`✅ especialidad_id encontrado: ${primeraConsulta.especialidad_id}`);
        } else {
          console.log('❌ especialidad_id NO encontrado en la vista');
        }
      }
    }

    // 2. Verificar tabla consultas_pacientes directamente
    console.log('\n📋 2. Verificando tabla consultas_pacientes...');
    
    const { data: consultasDirectas, error: consultasDirectasError } = await supabase
      .from('consultas_pacientes')
      .select(`
        id,
        paciente_id,
        medico_id,
        fecha_pautada,
        hora_pautada,
        estado_consulta,
        medicos!inner(
          id,
          nombres,
          apellidos,
          especialidad_id
        )
      `)
      .limit(3);
    
    if (consultasDirectasError) {
      console.log('❌ Error en consultas_pacientes:', consultasDirectasError.message);
    } else {
      console.log(`✅ Tabla consultas_pacientes: ${consultasDirectas.length} registros`);
      if (consultasDirectas.length > 0) {
        console.log('📋 Primera consulta directa:');
        const primeraDirecta = consultasDirectas[0];
        console.log(`   - ID: ${primeraDirecta.id}`);
        console.log(`   - Médico ID: ${primeraDirecta.medico_id}`);
        console.log(`   - Especialidad ID: ${primeraDirecta.medicos?.especialidad_id}`);
      }
    }

    // 3. Verificar servicios por especialidad
    console.log('\n📋 3. Verificando servicios por especialidad...');
    
    const { data: especialidades, error: especialidadesError } = await supabase
      .from('especialidades')
      .select('id, nombre_especialidad')
      .limit(5);
    
    if (especialidadesError) {
      console.log('❌ Error obteniendo especialidades:', especialidadesError.message);
    } else {
      console.log(`✅ Especialidades encontradas: ${especialidades.length}`);
      especialidades.forEach(esp => {
        console.log(`   - ID ${esp.id}: ${esp.nombre_especialidad}`);
      });

      // Verificar servicios para cada especialidad
      for (const especialidad of especialidades) {
        const { data: servicios, error: serviciosError } = await supabase
          .from('servicios')
          .select('id, nombre_servicio, monto_base, moneda')
          .eq('especialidad_id', especialidad.id)
          .eq('activo', true);
        
        if (serviciosError) {
          console.log(`❌ Error obteniendo servicios para especialidad ${especialidad.id}:`, serviciosError.message);
        } else {
          console.log(`📋 Servicios para ${especialidad.nombre_especialidad} (ID ${especialidad.id}): ${servicios.length}`);
          servicios.forEach(servicio => {
            console.log(`   - ${servicio.nombre_servicio}: $${servicio.monto_base} ${servicio.moneda}`);
          });
        }
      }
    }

    console.log('\n🎉 Verificación completada.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugConsultaData();

