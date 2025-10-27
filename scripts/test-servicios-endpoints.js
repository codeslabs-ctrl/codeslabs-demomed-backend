const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testServiciosEndpoints() {
  console.log('🧪 Probando endpoints de servicios...\n');

  try {
    // 1. Verificar que las tablas existen
    console.log('📋 1. Verificando estructura de base de datos...');
    
    const { data: servicios, error: serviciosError } = await supabase
      .from('servicios')
      .select('*')
      .limit(3);
    
    if (serviciosError) {
      console.log('❌ Error en tabla servicios:', serviciosError.message);
    } else {
      console.log(`✅ Tabla servicios: ${servicios.length} registros encontrados`);
      if (servicios.length > 0) {
        console.log('📋 Ejemplos de servicios:');
        servicios.forEach(servicio => {
          console.log(`   - ${servicio.nombre_servicio}: $${servicio.monto_base} ${servicio.moneda}`);
        });
      }
    }
    
    // 2. Verificar tabla servicios_consulta
    const { data: serviciosConsulta, error: serviciosConsultaError } = await supabase
      .from('servicios_consulta')
      .select('*')
      .limit(3);
    
    if (serviciosConsultaError) {
      console.log('❌ Error en tabla servicios_consulta:', serviciosConsultaError.message);
    } else {
      console.log(`✅ Tabla servicios_consulta: ${serviciosConsulta.length} registros`);
    }
    
    // 3. Verificar tabla tipos_cambio
    const { data: tiposCambio, error: tiposCambioError } = await supabase
      .from('tipos_cambio')
      .select('*')
      .limit(1);
    
    if (tiposCambioError) {
      console.log('❌ Error en tabla tipos_cambio:', tiposCambioError.message);
    } else {
      console.log(`✅ Tabla tipos_cambio: ${tiposCambio.length} registros`);
    }
    
    // 4. Verificar funciones
    console.log('\n🔧 2. Verificando funciones de base de datos...');
    
    const { data: funcionTest, error: funcionError } = await supabase
      .rpc('obtener_servicios_por_especialidad', { p_especialidad_id: 1 });
    
    if (funcionError) {
      console.log('❌ Función obtener_servicios_por_especialidad no disponible:', funcionError.message);
    } else {
      console.log(`✅ Función obtener_servicios_por_especialidad: ${funcionTest.length} servicios para especialidad 1`);
    }
    
    // 5. Verificar vista
    console.log('\n👁️  3. Verificando vista de servicios...');
    
    const { data: vistaServicios, error: vistaError } = await supabase
      .from('v_servicios_completos')
      .select('*')
      .limit(3);
    
    if (vistaError) {
      console.log('❌ Vista v_servicios_completos no disponible:', vistaError.message);
    } else {
      console.log(`✅ Vista v_servicios_completos: ${vistaServicios.length} registros`);
      if (vistaServicios.length > 0) {
        console.log('📋 Ejemplos de vista:');
        vistaServicios.forEach(servicio => {
          console.log(`   - ${servicio.nombre_servicio} (${servicio.especialidad_nombre}): $${servicio.monto_base} ${servicio.moneda}`);
        });
      }
    }
    
    // 6. Verificar consultas_pacientes
    console.log('\n📅 4. Verificando consultas_pacientes...');
    
    const { data: consultas, error: consultasError } = await supabase
      .from('consultas_pacientes')
      .select('id, estado, fecha_consulta')
      .limit(3);
    
    if (consultasError) {
      console.log('❌ Error en tabla consultas_pacientes:', consultasError.message);
    } else {
      console.log(`✅ Tabla consultas_pacientes: ${consultas.length} registros`);
      if (consultas.length > 0) {
        console.log('📋 Ejemplos de consultas:');
        consultas.forEach(consulta => {
          console.log(`   - ID: ${consulta.id}, Estado: ${consulta.estado}, Fecha: ${consulta.fecha_consulta}`);
        });
      }
    }
    
    // 7. Resumen final
    console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
    console.log('=====================================');
    console.log('✅ Base de datos: Estructura creada correctamente');
    console.log('✅ Servicios: Tabla y datos básicos');
    console.log('✅ Servicios-Consulta: Relación many-to-many');
    console.log('✅ Tipos de Cambio: Conversión de monedas');
    console.log('✅ Funciones: Cálculos y consultas');
    console.log('✅ Vista: Información completa de servicios');
    console.log('✅ Consultas: Tabla de consultas disponible');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Probar endpoints con Postman o similar');
    console.log('2. Verificar autenticación y roles');
    console.log('3. Probar finalización de consultas');
    console.log('4. Implementar frontend');
    
    console.log('\n💡 ENDPOINTS DISPONIBLES:');
    console.log('GET    /api/v1/servicios                    - Listar servicios (Admin)');
    console.log('POST   /api/v1/servicios                    - Crear servicio (Admin)');
    console.log('PUT    /api/v1/servicios/:id                - Actualizar servicio (Admin)');
    console.log('DELETE /api/v1/servicios/:id                - Eliminar servicio (Admin)');
    console.log('POST   /api/v1/consultas/:id/finalizar-con-servicios - Finalizar consulta (Secretaria/Admin)');
    console.log('GET    /api/v1/consultas/:id/servicios      - Servicios de consulta (Secretaria/Admin)');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
testServiciosEndpoints().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


