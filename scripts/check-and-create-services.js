const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkAndCreateServices() {
  console.log('🔍 Verificando servicios en la base de datos...\n');

  try {
    // 1. Verificar si hay servicios
    const { data: servicios, error: serviciosError } = await supabase
      .from('servicios')
      .select('*')
      .limit(5);
    
    if (serviciosError) {
      console.log('❌ Error accediendo a la tabla servicios:', serviciosError.message);
      return;
    }

    console.log(`📊 Servicios encontrados: ${servicios.length}`);
    
    if (servicios.length === 0) {
      console.log('⚠️  No hay servicios en la base de datos. Creando servicios de prueba...\n');
      
      // 2. Verificar especialidades disponibles
      const { data: especialidades, error: especialidadesError } = await supabase
        .from('especialidades')
        .select('id, nombre_especialidad')
        .limit(10);
      
      if (especialidadesError) {
        console.log('❌ Error obteniendo especialidades:', especialidadesError.message);
        return;
      }

      console.log('📋 Especialidades disponibles:');
      especialidades.forEach(esp => {
        console.log(`   - ID ${esp.id}: ${esp.nombre_especialidad}`);
      });

      // 3. Crear servicios de prueba
      const serviciosPrueba = [
        {
          nombre_servicio: 'Consulta General',
          especialidad_id: especialidades[0]?.id || 1,
          monto_base: 50.00,
          moneda: 'USD',
          descripcion: 'Consulta médica general',
          activo: true
        },
        {
          nombre_servicio: 'Consulta de Seguimiento',
          especialidad_id: especialidades[0]?.id || 1,
          monto_base: 30.00,
          moneda: 'USD',
          descripcion: 'Consulta de seguimiento médico',
          activo: true
        },
        {
          nombre_servicio: 'Examen Físico',
          especialidad_id: especialidades[0]?.id || 1,
          monto_base: 25.00,
          moneda: 'USD',
          descripcion: 'Examen físico completo',
          activo: true
        }
      ];

      const { data: serviciosCreados, error: crearError } = await supabase
        .from('servicios')
        .insert(serviciosPrueba)
        .select();

      if (crearError) {
        console.log('❌ Error creando servicios:', crearError.message);
        return;
      }

      console.log('✅ Servicios de prueba creados exitosamente:');
      serviciosCreados.forEach(servicio => {
        console.log(`   - ${servicio.nombre_servicio}: $${servicio.monto_base} ${servicio.moneda}`);
      });

    } else {
      console.log('✅ Servicios existentes:');
      servicios.forEach(servicio => {
        console.log(`   - ${servicio.nombre_servicio}: $${servicio.monto_base} ${servicio.moneda} (Especialidad: ${servicio.especialidad_id})`);
      });
    }

    // 4. Verificar tipo de cambio
    const { data: tipoCambio, error: tipoCambioError } = await supabase
      .from('tipos_cambio')
      .select('*')
      .eq('fecha', new Date().toISOString().split('T')[0])
      .eq('activo', true)
      .single();

    if (tipoCambioError || !tipoCambio) {
      console.log('⚠️  No hay tipo de cambio para hoy. Creando...');
      
      const { error: crearTipoCambioError } = await supabase
        .from('tipos_cambio')
        .insert({
          fecha: new Date().toISOString().split('T')[0],
          usd_to_ves: 36.50,
          ves_to_usd: 0.0274,
          activo: true
        });

      if (crearTipoCambioError) {
        console.log('❌ Error creando tipo de cambio:', crearTipoCambioError.message);
      } else {
        console.log('✅ Tipo de cambio creado: 1 USD = 36.50 VES');
      }
    } else {
      console.log(`✅ Tipo de cambio actual: 1 USD = ${tipoCambio.usd_to_ves} VES`);
    }

    console.log('\n🎉 Verificación completada. El sistema de servicios está listo.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkAndCreateServices();


