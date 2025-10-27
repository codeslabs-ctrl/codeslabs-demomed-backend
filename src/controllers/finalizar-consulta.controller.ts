import { supabase } from '../config/database.js';

export class FinalizarConsultaController {
  
  // POST /api/v1/consultas/:id/finalizar - Finalizar consulta
  async finalizarConsulta(req: any, res: any) {
    try {
      const { id } = req.params;
      const { servicios, observaciones } = req.body;
      
      // Validaciones
      if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Debe seleccionar al menos un servicio' 
        });
      }
      
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
      
      // 5. Insertar servicios de la consulta
      const clinicaAlias = process.env['CLINICA_ALIAS'];
      const serviciosData = servicios.map((servicio: any) => ({
        consulta_id: parseInt(id),
        servicio_id: parseInt(servicio.servicio_id),
        monto_pagado: parseFloat(servicio.monto_pagado),
        moneda_pago: servicio.moneda,
        tipo_cambio: tipoCambioActual,
        observaciones: servicio.observaciones || null,
        clinica_alias: clinicaAlias
      }));
      
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
      
      if (serviciosInsertError) {
        return res.status(400).json({ success: false, error: serviciosInsertError.message });
      }
      
      // 6. Actualizar estado de la consulta
      const { error: updateError } = await supabase
        .from('consultas_pacientes')
        .update({ 
          estado: 'completada',
          observaciones: observaciones || null,
          fecha_finalizacion: new Date().toISOString(),
          fecha_pago: new Date().toISOString(),  // Marcar como pagada automáticamente
          metodo_pago: 'Efectivo'  // Método por defecto al finalizar
        })
        .eq('id', id);
      
      if (updateError) {
        return res.status(400).json({ success: false, error: updateError.message });
      }
      
      // 7. Calcular totales
      const { data: totales } = await supabase
        .rpc('calcular_total_consulta', { p_consulta_id: parseInt(id) });
      
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
