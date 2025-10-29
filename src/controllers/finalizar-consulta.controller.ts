import { supabase } from '../config/database.js';

export class FinalizarConsultaController {
  
  // POST /api/v1/consultas/:id/finalizar - Finalizar consulta
  async finalizarConsulta(req: any, res: any) {
    try {
      const { id } = req.params;
      const { servicios, observaciones } = req.body;
      
      console.log('🔍 Finalizando consulta ID:', id);
      console.log('🔍 Servicios recibidos:', servicios);
      console.log('🔍 Observaciones:', observaciones);
      
      // Validaciones
      console.log('🔍 Validando servicios...');
      if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        console.log('❌ Error: No hay servicios seleccionados');
        return res.status(400).json({ 
          success: false, 
          error: 'Debe seleccionar al menos un servicio' 
        });
      }
      console.log('✅ Servicios válidos:', servicios.length);
      
      // 1. Verificar que la consulta existe y está en estado correcto
      const { data: consulta, error: consultaError } = await supabase
        .from('consultas_pacientes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (consultaError || !consulta) {
        return res.status(404).json({ success: false, error: 'Consulta no encontrada' });
      }
      
      if (consulta.estado === 'completada') {
        return res.status(400).json({ success: false, error: 'La consulta ya está completada' });
      }
      
      // 2. Obtener tipo de cambio actual
      const { data: tipoCambio } = await supabase
        .from('tipos_cambio')
        .select('usd_to_ves')
        .eq('fecha', new Date().toISOString().split('T')[0])
        .eq('activo', true)
        .single();
      
      const tipoCambioActual = tipoCambio?.usd_to_ves || 36.50;
      
      // 3. Validar servicios seleccionados
      const servicioIds = servicios.map((s: any) => s.servicio_id);
      const { data: serviciosValidos, error: serviciosError } = await supabase
        .from('servicios')
        .select('id, nombre_servicio, monto_base, moneda')
        .in('id', servicioIds)
        .eq('activo', true);
      
      if (serviciosError || !serviciosValidos || serviciosValidos.length !== servicioIds.length) {
        return res.status(400).json({ 
          success: false, 
          error: 'Uno o más servicios seleccionados no son válidos' 
        });
      }
      
      // 4. Validar montos y monedas
      for (const servicio of servicios) {
        if (!servicio.monto_pagado || servicio.monto_pagado <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: `El monto para el servicio ${servicio.servicio_id} debe ser mayor a 0` 
          });
        }
        
        if (!['USD', 'VES'].includes(servicio.moneda)) {
          return res.status(400).json({ 
            success: false, 
            error: `La moneda para el servicio ${servicio.servicio_id} debe ser USD o VES` 
          });
        }
      }
      
      // 5. Verificar si ya existen servicios para esta consulta
      const { data: serviciosExistentes, error: checkError } = await supabase
        .from('servicios_consulta')
        .select('id')
        .eq('consulta_id', parseInt(id));
      
      if (checkError) {
        console.log('❌ Error verificando servicios existentes:', checkError);
        return res.status(400).json({ success: false, error: checkError.message });
      }
      
      if (serviciosExistentes && serviciosExistentes.length > 0) {
        console.log('⚠️ Ya existen servicios para esta consulta, eliminando anteriores...');
        const { error: deleteError } = await supabase
          .from('servicios_consulta')
          .delete()
          .eq('consulta_id', parseInt(id));
        
        if (deleteError) {
          console.log('❌ Error eliminando servicios anteriores:', deleteError);
          return res.status(400).json({ success: false, error: deleteError.message });
        }
      }
      
      // 6. Insertar servicios de la consulta
      const serviciosData = servicios.map((servicio: any) => ({
        consulta_id: parseInt(id),
        servicio_id: parseInt(servicio.servicio_id),
        monto_pagado: parseFloat(servicio.monto_pagado),
        moneda_pago: servicio.moneda,
        tipo_cambio: tipoCambioActual,
        observaciones: servicio.observaciones || null
      }));
      
      console.log('🔍 Datos de servicios a insertar:', serviciosData);
      console.log('🔍 Insertando en tabla servicios_consulta...');
      
      const { data: serviciosInsertados, error: serviciosInsertError } = await supabase
        .from('servicios_consulta')
        .insert(serviciosData)
        .select(`
          id,
          monto_pagado,
          moneda_pago,
          observaciones,
          servicios!inner(
            id,
            nombre_servicio,
            monto_base,
            moneda
          )
        `);
      
      console.log('🔍 Resultado inserción servicios:', { serviciosInsertados, serviciosInsertError });
      
      if (serviciosInsertError) {
        console.log('❌ Error insertando servicios:', serviciosInsertError);
        return res.status(400).json({ success: false, error: serviciosInsertError.message });
      }
      
      // 7. Actualizar estado de la consulta
      console.log('🔍 Actualizando estado de consulta a "finalizada"...');
      const { error: updateError } = await supabase
        .from('consultas_pacientes')
        .update({ 
          estado_consulta: 'finalizada',
          observaciones: observaciones || null,
          fecha_culminacion: new Date().toISOString(),  // Usar fecha_culminacion en lugar de fecha_finalizacion
          fecha_pago: new Date().toISOString().split('T')[0],  // Solo la fecha (YYYY-MM-DD)
          metodo_pago: 'Efectivo'  // Método por defecto al finalizar
        })
        .eq('id', id);
      
      console.log('🔍 Resultado actualización consulta:', { updateError });
      
      if (updateError) {
        console.log('❌ Error actualizando consulta, haciendo rollback de servicios...');
        // Rollback: eliminar los servicios que acabamos de insertar
        const { error: rollbackError } = await supabase
          .from('servicios_consulta')
          .delete()
          .eq('consulta_id', parseInt(id));
        
        if (rollbackError) {
          console.log('❌ Error en rollback:', rollbackError);
        } else {
          console.log('✅ Rollback exitoso: servicios eliminados');
        }
        
        return res.status(400).json({ success: false, error: updateError.message });
      }
      
      // 8. Calcular totales
      console.log('🔍 Calculando totales de la consulta...');
      const { data: totales, error: totalesError } = await supabase
        .rpc('calcular_total_consulta', { p_consulta_id: parseInt(id) });
      
      if (totalesError) {
        console.log('❌ Error calculando totales, haciendo rollback...');
        // Rollback: eliminar los servicios y revertir el estado de la consulta
        const { error: rollbackError1 } = await supabase
          .from('servicios_consulta')
          .delete()
          .eq('consulta_id', parseInt(id));
        
        const { error: rollbackError2 } = await supabase
          .from('consultas_pacientes')
          .update({ 
            estado_consulta: 'agendada',  // Revertir al estado anterior
            observaciones: null,
            fecha_culminacion: null,
            fecha_pago: null,
            metodo_pago: null
          })
          .eq('id', id);
        
        if (rollbackError1 || rollbackError2) {
          console.log('❌ Error en rollback completo:', { rollbackError1, rollbackError2 });
        } else {
          console.log('✅ Rollback completo exitoso');
        }
        
        return res.status(400).json({ success: false, error: totalesError.message });
      }
      
      console.log('✅ Consulta finalizada exitosamente');
      res.json({ 
        success: true, 
        data: {
          consulta_id: parseInt(id),
          servicios: serviciosInsertados,
          totales: totales?.[0] || { total_usd: 0, total_ves: 0, cantidad_servicios: 0 },
          mensaje: 'Consulta finalizada exitosamente'
        }
      });
      
    } catch (error) {
      console.error('Error finalizando consulta:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // GET /api/v1/consultas/:id/servicios - Obtener servicios de una consulta
  async getServiciosConsulta(req: any, res: any) {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('servicios_consulta')
        .select(`
          id,
          monto_pagado,
          moneda_pago,
          tipo_cambio,
          observaciones,
          created_at,
          servicios!inner(
            id,
            nombre_servicio,
            monto_base,
            moneda,
            descripcion
          )
        `)
        .eq('consulta_id', id)
        .order('created_at', { ascending: true });
      
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error obteniendo servicios de consulta:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // GET /api/v1/consultas/:id/totales - Obtener totales de una consulta
  async getTotalesConsulta(req: any, res: any) {
    try {
      const { id } = req.params;
      
      const { data: totales, error } = await supabase
        .rpc('calcular_total_consulta', { p_consulta_id: parseInt(id) });
      
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      
      res.json({ success: true, data: totales?.[0] || { total_usd: 0, total_ves: 0, cantidad_servicios: 0 } });
    } catch (error) {
      console.error('Error calculando totales:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // GET /api/v1/consultas/:id/detalle-finalizacion - Obtener detalle completo de finalización
  async getDetalleFinalizacion(req: any, res: any) {
    try {
      const { id } = req.params;
      
      // Obtener información de la consulta
      const { data: consulta, error: consultaError } = await supabase
        .from('consultas_pacientes')
        .select(`
          id,
          estado,
          fecha_consulta,
          fecha_finalizacion,
          observaciones,
          pacientes!inner(
            id,
            nombres,
            apellidos,
            cedula
          ),
          medicos!inner(
            id,
            nombres,
            apellidos,
            especialidad_id
          )
        `)
        .eq('id', id)
        .single();
      
      if (consultaError || !consulta) {
        return res.status(404).json({ success: false, error: 'Consulta no encontrada' });
      }
      
      // Obtener servicios de la consulta
      const { data: servicios, error: serviciosError } = await supabase
        .from('servicios_consulta')
        .select(`
          id,
          monto_pagado,
          moneda_pago,
          tipo_cambio,
          observaciones,
          created_at,
          servicios!inner(
            id,
            nombre_servicio,
            monto_base,
            moneda,
            descripcion
          )
        `)
        .eq('consulta_id', id)
        .order('created_at', { ascending: true });
      
      if (serviciosError) {
        return res.status(500).json({ success: false, error: serviciosError.message });
      }
      
      // Calcular totales
      const { data: totales } = await supabase
        .rpc('calcular_total_consulta', { p_consulta_id: parseInt(id) });
      
      res.json({ 
        success: true, 
        data: {
          consulta,
          servicios: servicios || [],
          totales: totales?.[0] || { total_usd: 0, total_ves: 0, cantidad_servicios: 0 }
        }
      });
    } catch (error) {
      console.error('Error obteniendo detalle de finalización:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

export default new FinalizarConsultaController();
