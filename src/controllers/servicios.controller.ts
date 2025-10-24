import { supabase } from '../config/database.js';

export class ServiciosController {
  
  // GET /api/v1/servicios - Listar servicios
  async getServicios(req: any, res: any) {
    try {
      const { especialidad_id, activo } = req.query;
      
      let query = supabase.from('servicios').select(`
        id,
        nombre_servicio,
        monto_base,
        moneda,
        descripcion,
        activo,
        especialidades!inner(
          id,
          nombre_especialidad,
          descripcion
        )
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
    } catch (error) {
      console.error('Error obteniendo servicios:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // POST /api/v1/servicios - Crear servicio
  async createServicio(req: any, res: any) {
    try {
      const { nombre_servicio, especialidad_id, monto_base, moneda, descripcion } = req.body;
      
      // Validaciones
      if (!nombre_servicio || !especialidad_id || !monto_base || !moneda) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan campos requeridos: nombre_servicio, especialidad_id, monto_base, moneda' 
        });
      }
      
      if (!['USD', 'VES'].includes(moneda)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Moneda debe ser USD o VES' 
        });
      }
      
      const clinicaAlias = process.env['CLINICA_ALIAS'];
      const { data, error } = await supabase
        .from('servicios')
        .insert({
          nombre_servicio,
          especialidad_id: parseInt(especialidad_id),
          monto_base: parseFloat(monto_base),
          moneda,
          descripcion,
          clinica_alias: clinicaAlias
        })
        .select(`
          id,
          nombre_servicio,
          monto_base,
          moneda,
          descripcion,
          activo,
          especialidades!inner(
            id,
            nombre_especialidad
          )
        `)
        .single();
      
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('Error creando servicio:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // PUT /api/v1/servicios/:id - Actualizar servicio
  async updateServicio(req: any, res: any) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validar que el servicio existe
      const { data: existingService, error: checkError } = await supabase
        .from('servicios')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError || !existingService) {
        return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
      }
      
      const { data, error } = await supabase
        .from('servicios')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          nombre_servicio,
          monto_base,
          moneda,
          descripcion,
          activo,
          especialidades!inner(
            id,
            nombre_especialidad
          )
        `)
        .single();
      
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error actualizando servicio:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // DELETE /api/v1/servicios/:id - Eliminar servicio
  async deleteServicio(req: any, res: any) {
    try {
      const { id } = req.params;
      
      // Verificar que el servicio existe
      const { data: existingService, error: checkError } = await supabase
        .from('servicios')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError || !existingService) {
        return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
      }
      
      // Verificar si el servicio está siendo usado en consultas
      const { data: serviciosEnUso, error: usoError } = await supabase
        .from('servicios_consulta')
        .select('id')
        .eq('servicio_id', id)
        .limit(1);
      
      if (usoError) {
        return res.status(500).json({ success: false, error: 'Error verificando uso del servicio' });
      }
      
      if (serviciosEnUso && serviciosEnUso.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No se puede eliminar el servicio porque está siendo usado en consultas' 
        });
      }
      
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);
      
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      res.json({ success: true, message: 'Servicio eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // GET /api/v1/servicios/por-especialidad/:especialidad_id
  async getServiciosPorEspecialidad(req: any, res: any) {
    try {
      const { especialidad_id } = req.params;
      
      const { data, error } = await supabase
        .rpc('obtener_servicios_por_especialidad', { p_especialidad_id: parseInt(especialidad_id) });
      
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error obteniendo servicios por especialidad:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  // GET /api/v1/servicios/:id - Obtener servicio por ID
  async getServicioById(req: any, res: any) {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('servicios')
        .select(`
          id,
          nombre_servicio,
          monto_base,
          moneda,
          descripcion,
          activo,
          especialidades!inner(
            id,
            nombre_especialidad,
            descripcion
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error obteniendo servicio:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

export default new ServiciosController();