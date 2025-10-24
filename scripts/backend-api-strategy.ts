// =====================================================
// ESTRATEGIA: BACKEND API ENDPOINTS
// Sistema FemiMed - Servicios y Finalización
// =====================================================

// 1. CONTROLADOR DE SERVICIOS (Solo Admin)
export class ServiciosController {
  
  // GET /api/v1/servicios - Listar servicios
  async getServicios(req: any, res: any) {
    const { especialidad_id, activo } = req.query;
    
    let query = supabase.from('servicios').select(`
      id,
      nombre_servicio,
      monto_base,
      moneda,
      descripcion,
      activo,
      especialidades!inner(nombre, descripcion)
    `);
    
    if (especialidad_id) {
      query = query.eq('especialidad_id', especialidad_id);
    }
    
    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }
    
    const { data, error } = await query.order('nombre_servicio');
    
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, data });
  }
  
  // POST /api/v1/servicios - Crear servicio
  async createServicio(req: any, res: any) {
    const { nombre_servicio, especialidad_id, monto_base, moneda, descripcion } = req.body;
    
    const { data, error } = await supabase
      .from('servicios')
      .insert({
        nombre_servicio,
        especialidad_id,
        monto_base,
        moneda,
        descripcion
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    res.status(201).json({ success: true, data });
  }
  
  // PUT /api/v1/servicios/:id - Actualizar servicio
  async updateServicio(req: any, res: any) {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data, error } = await supabase
      .from('servicios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, data });
  }
  
  // DELETE /api/v1/servicios/:id - Eliminar servicio
  async deleteServicio(req: any, res: any) {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, message: 'Servicio eliminado' });
  }
  
  // GET /api/v1/servicios/por-especialidad/:especialidad_id
  async getServiciosPorEspecialidad(req: any, res: any) {
    const { especialidad_id } = req.params;
    
    const { data, error } = await supabase
      .rpc('obtener_servicios_por_especialidad', { p_especialidad_id: especialidad_id });
    
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, data });
  }
}

// 2. CONTROLADOR DE FINALIZACIÓN DE CONSULTAS
export class FinalizarConsultaController {
  
  // POST /api/v1/consultas/:id/finalizar - Finalizar consulta
  async finalizarConsulta(req: any, res: any) {
    const { id } = req.params;
    const { servicios, observaciones } = req.body;
    
    try {
      // 1. Verificar que la consulta existe y está en estado correcto
      const { data: consulta, error: consultaError } = await supabase
        .from('consultas')
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
      
      // 3. Insertar servicios de la consulta
      const serviciosData = servicios.map((servicio: any) => ({
        consulta_id: id,
        servicio_id: servicio.servicio_id,
        monto_pagado: servicio.monto_pagado,
        moneda_pago: servicio.moneda_pago,
        tipo_cambio: tipoCambioActual,
        observaciones: servicio.observaciones
      }));
      
      const { data: serviciosInsertados, error: serviciosError } = await supabase
        .from('servicios_consulta')
        .insert(serviciosData)
        .select();
      
      if (serviciosError) {
        return res.status(400).json({ success: false, error: serviciosError.message });
      }
      
      // 4. Actualizar estado de la consulta
      const { error: updateError } = await supabase
        .from('consultas')
        .update({ 
          estado: 'completada',
          observaciones: observaciones,
          fecha_finalizacion: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        return res.status(400).json({ success: false, error: updateError.message });
      }
      
      // 5. Calcular totales
      const { data: totales } = await supabase
        .rpc('calcular_total_consulta', { p_consulta_id: id });
      
      res.json({ 
        success: true, 
        data: {
          consulta_id: id,
          servicios: serviciosInsertados,
          totales: totales[0],
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
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('servicios_consulta')
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
      `)
      .eq('consulta_id', id);
    
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, data });
  }
}

// 3. RUTAS CON MIDDLEWARE DE ROLES
export const serviciosRoutes = (router: any) => {
  // Rutas de servicios (solo admin)
  router.get('/servicios', adminSecurityMiddleware, ServiciosController.getServicios);
  router.post('/servicios', adminSecurityMiddleware, ServiciosController.createServicio);
  router.put('/servicios/:id', adminSecurityMiddleware, ServiciosController.updateServicio);
  router.delete('/servicios/:id', adminSecurityMiddleware, ServiciosController.deleteServicio);
  router.get('/servicios/por-especialidad/:especialidad_id', adminSecurityMiddleware, ServiciosController.getServiciosPorEspecialidad);
  
  // Rutas de finalización (secretaria y admin)
  router.post('/consultas/:id/finalizar', secretariaSecurityMiddleware, FinalizarConsultaController.finalizarConsulta);
  router.get('/consultas/:id/servicios', secretariaSecurityMiddleware, FinalizarConsultaController.getServiciosConsulta);
};

// =====================================================
// RESUMEN DE ENDPOINTS:
// =====================================================
// GET    /api/v1/servicios                    - Listar servicios (Admin)
// POST   /api/v1/servicios                    - Crear servicio (Admin)
// PUT    /api/v1/servicios/:id                - Actualizar servicio (Admin)
// DELETE /api/v1/servicios/:id                - Eliminar servicio (Admin)
// GET    /api/v1/servicios/por-especialidad/:id - Servicios por especialidad (Admin)
// POST   /api/v1/consultas/:id/finalizar      - Finalizar consulta (Secretaria/Admin)
// GET    /api/v1/consultas/:id/servicios      - Servicios de consulta (Secretaria/Admin)
// =====================================================

