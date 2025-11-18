import { supabase, postgresPool } from '../config/database.js';
import { USE_POSTGRES } from '../config/database-config.js';

export class FinalizarConsultaController {
  
  // POST /api/v1/consultas/:id/finalizar - Finalizar consulta
  async finalizarConsulta(req: any, res: any) {
    try {
      const { id } = req.params;
      const { servicios } = req.body;
      
      console.log('🔍 Finalizando consulta ID:', id);
      console.log('🔍 Servicios recibidos:', servicios);
      
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
      
      if (USE_POSTGRES) {
        // PostgreSQL implementation
        const client = await postgresPool.connect();
        try {
          await client.query('BEGIN');
          
          // 1. Verificar que la consulta existe y está en estado correcto
          const consultaQuery = `
            SELECT 
              cp.*,
              m.especialidad_id
            FROM consultas_pacientes cp
            LEFT JOIN medicos m ON cp.medico_id = m.id
            WHERE cp.id = $1
          `;
          
          const consultaResult = await client.query(consultaQuery, [parseInt(id)]);
          
          if (consultaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Consulta no encontrada' });
          }
          
          const consulta = consultaResult.rows[0];
          
          // Verificar que solo secretaria y administrador pueden finalizar
          const user = (req as any).user;
          if (user && user.rol !== 'secretaria' && user.rol !== 'administrador') {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
              success: false, 
              error: 'Solo secretaria y administrador pueden finalizar consultas' 
            });
          }

          // Verificar que la consulta está en estado "completada" (no "finalizada")
          if (consulta.estado_consulta === 'finalizada') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'La consulta ya está finalizada' });
          }

          if (consulta.estado_consulta !== 'completada') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: 'Solo se pueden finalizar consultas en estado "completada"' 
            });
          }
          
          // Obtener especialidad_id
          const especialidadId = consulta.especialidad_id;
          
          if (!especialidadId) {
            await client.query('ROLLBACK');
            console.error('❌ No se pudo determinar especialidad_id. Consulta:', JSON.stringify(consulta, null, 2));
            return res.status(400).json({ success: false, error: 'No se pudo determinar la especialidad de la consulta' });
          }
          
          // 2. Obtener tipo de cambio actual
          const tipoCambioQuery = `
            SELECT usd_to_ves 
            FROM tipos_cambio 
            WHERE fecha = CURRENT_DATE 
              AND activo = true 
            LIMIT 1
          `;
          const tipoCambioResult = await client.query(tipoCambioQuery);
          const tipoCambioActual = tipoCambioResult.rows[0]?.usd_to_ves || 36.50;
          
          // 3. Procesar servicios: manejar servicio predeterminado (ID -1)
          const serviciosProcesados: any[] = [];
          
          for (const servicio of servicios) {
            let servicioIdReal = servicio.servicio_id;
            
            // Si el servicio_id es -1, es un servicio predeterminado "Consulta"
            if (servicio.servicio_id === -1 || servicio.servicio_id === 0) {
              console.log('📝 Detectado servicio predeterminado (ID: -1), buscando o creando servicio "Consulta"');
              
              // Buscar si ya existe un servicio "Consulta" para esta especialidad
              const servicioExistenteQuery = `
                SELECT id, nombre_servicio, monto_base, moneda 
                FROM servicios 
                WHERE nombre_servicio = 'Consulta' 
                  AND especialidad_id = $1 
                  AND activo = true 
                LIMIT 1
              `;
              const servicioExistenteResult = await client.query(servicioExistenteQuery, [especialidadId]);
              
              if (servicioExistenteResult.rows.length > 0) {
                // Usar el servicio existente
                console.log('✅ Servicio "Consulta" encontrado:', servicioExistenteResult.rows[0].id);
                servicioIdReal = servicioExistenteResult.rows[0].id;
              } else {
                // Crear el servicio "Consulta" si no existe
                console.log('📝 Creando nuevo servicio "Consulta" para especialidad:', especialidadId);
                const nuevoServicioQuery = `
                  INSERT INTO servicios (nombre_servicio, especialidad_id, monto_base, moneda, activo)
                  VALUES ('Consulta', $1, 80, $2, true)
                  RETURNING id, nombre_servicio, monto_base, moneda
                `;
                const nuevoServicioResult = await client.query(nuevoServicioQuery, [
                  especialidadId,
                  servicio.moneda || 'USD'
                ]);
                
                if (nuevoServicioResult.rows.length === 0) {
                  await client.query('ROLLBACK');
                  return res.status(500).json({ 
                    success: false, 
                    error: 'Error al crear servicio predeterminado'
                  });
                }
                
                console.log('✅ Servicio "Consulta" creado exitosamente:', nuevoServicioResult.rows[0].id);
                servicioIdReal = nuevoServicioResult.rows[0].id;
              }
            }
            
            serviciosProcesados.push({
              ...servicio,
              servicio_id: servicioIdReal
            });
          }
          
          // Validar que todos los servicios procesados existen
          const servicioIdsReales = serviciosProcesados.map((s: any) => s.servicio_id);
          const serviciosValidosQuery = `
            SELECT id, nombre_servicio, monto_base, moneda 
            FROM servicios 
            WHERE id = ANY($1::int[]) 
              AND activo = true
          `;
          const serviciosValidosResult = await client.query(serviciosValidosQuery, [servicioIdsReales]);
          
          if (serviciosValidosResult.rows.length !== servicioIdsReales.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: 'Uno o más servicios seleccionados no son válidos' 
            });
          }
          
          // 4. Validar montos y monedas
          for (const servicio of serviciosProcesados) {
            if (!servicio.monto_pagado || servicio.monto_pagado <= 0) {
              await client.query('ROLLBACK');
              return res.status(400).json({ 
                success: false, 
                error: `El monto para el servicio ${servicio.servicio_id} debe ser mayor a 0` 
              });
            }
            
            if (!['USD', 'VES'].includes(servicio.moneda)) {
              await client.query('ROLLBACK');
              return res.status(400).json({ 
                success: false, 
                error: `La moneda para el servicio ${servicio.servicio_id} debe ser USD o VES` 
              });
            }
          }
          
          // 5. Verificar si ya existen servicios para esta consulta
          const serviciosExistentesQuery = 'SELECT id FROM servicios_consulta WHERE consulta_id = $1';
          const serviciosExistentesResult = await client.query(serviciosExistentesQuery, [parseInt(id)]);
          
          if (serviciosExistentesResult.rows.length > 0) {
            console.log('⚠️ Ya existen servicios para esta consulta, eliminando anteriores...');
            await client.query('DELETE FROM servicios_consulta WHERE consulta_id = $1', [parseInt(id)]);
          }
          
          // 6. Insertar servicios de la consulta
          const serviciosInsertados: any[] = [];
          for (const servicio of serviciosProcesados) {
            const insertQuery = `
              INSERT INTO servicios_consulta (consulta_id, servicio_id, monto_pagado, moneda_pago, tipo_cambio, observaciones)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, monto_pagado, moneda_pago, tipo_cambio, observaciones
            `;
            const insertResult = await client.query(insertQuery, [
              parseInt(id),
              parseInt(servicio.servicio_id),
              parseFloat(servicio.monto_pagado),
              servicio.moneda,
              tipoCambioActual,
              servicio.observaciones || null
            ]);
            
            // Obtener datos del servicio asociado
            const servicioDataQuery = `
              SELECT id, nombre_servicio, monto_base, moneda 
              FROM servicios 
              WHERE id = $1
            `;
            const servicioDataResult = await client.query(servicioDataQuery, [parseInt(servicio.servicio_id)]);
            
            serviciosInsertados.push({
              ...insertResult.rows[0],
              servicios: servicioDataResult.rows[0]
            });
          }
          
          // 7. Actualizar estado de la consulta
          console.log('🔍 Actualizando estado de consulta a "finalizada"...');
          const updateQuery = `
            UPDATE consultas_pacientes 
            SET estado_consulta = 'finalizada',
                fecha_culminacion = CURRENT_TIMESTAMP,
                fecha_pago = CURRENT_DATE,
                metodo_pago = 'Efectivo',
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
          `;
          await client.query(updateQuery, [parseInt(id)]);
          
          // 8. Calcular totales
          console.log('🔍 Calculando totales de la consulta...');
          const totalesQuery = `
            SELECT 
              COUNT(*) as cantidad_servicios,
              SUM(CASE WHEN moneda_pago = 'USD' THEN monto_pagado ELSE 0 END) as total_usd,
              SUM(CASE WHEN moneda_pago = 'VES' THEN monto_pagado ELSE 0 END) as total_ves
            FROM servicios_consulta
            WHERE consulta_id = $1
          `;
          const totalesResult = await client.query(totalesQuery, [parseInt(id)]);
          const totales = totalesResult.rows[0] || { total_usd: 0, total_ves: 0, cantidad_servicios: 0 };
          
          await client.query('COMMIT');
          
          console.log('✅ Consulta finalizada exitosamente');
          res.json({ 
            success: true, 
            data: {
              consulta_id: parseInt(id),
              servicios: serviciosInsertados,
              totales: totales,
              mensaje: 'Consulta finalizada exitosamente'
            }
          });
        } catch (dbError) {
          await client.query('ROLLBACK');
          console.error('❌ PostgreSQL error finalizing consulta:', dbError);
          res.status(500).json({ 
            success: false, 
            error: 'Error al finalizar consulta' 
          });
        } finally {
          client.release();
        }
      } else {
        // Supabase implementation (original code)
        // Verificar que la consulta existe y está en estado correcto
        const { data: consulta, error: consultaError } = await supabase
          .from('consultas_pacientes')
          .select(`
            *,
            medicos!fk_consultas_medico(
              id,
              especialidad_id
            )
          `)
          .eq('id', id)
          .single();
        
        if (consultaError || !consulta) {
          console.error('❌ Error obteniendo consulta:', consultaError);
          return res.status(404).json({ success: false, error: 'Consulta no encontrada' });
        }
        
        // Verificar que solo secretaria y administrador pueden finalizar
        const user = (req as any).user;
        if (user && user.rol !== 'secretaria' && user.rol !== 'administrador') {
          return res.status(403).json({ 
            success: false, 
            error: 'Solo secretaria y administrador pueden finalizar consultas' 
          });
        }

        // Verificar que la consulta está en estado "completada" (no "finalizada")
        if (consulta.estado_consulta === 'finalizada') {
          return res.status(400).json({ success: false, error: 'La consulta ya está finalizada' });
        }

        if (consulta.estado_consulta !== 'completada') {
          return res.status(400).json({ 
            success: false, 
            error: 'Solo se pueden finalizar consultas en estado "completada"' 
          });
        }
        
        // Obtener especialidad_id: puede estar directamente en la consulta o en medicos
        let especialidadId: number | undefined;
        
        if (consulta.especialidad_id) {
          especialidadId = consulta.especialidad_id;
          console.log('✅ Especialidad obtenida directamente de consulta:', especialidadId);
        } else if (consulta.medicos && typeof consulta.medicos === 'object') {
          // Manejar si medicos es un objeto o array
          const medico = Array.isArray(consulta.medicos) ? consulta.medicos[0] : consulta.medicos;
          especialidadId = (medico as any)?.especialidad_id;
          console.log('✅ Especialidad obtenida de médico:', especialidadId);
        }
        
        if (!especialidadId) {
          console.error('❌ No se pudo determinar especialidad_id. Consulta:', JSON.stringify(consulta, null, 2));
          return res.status(400).json({ success: false, error: 'No se pudo determinar la especialidad de la consulta' });
        }
        
        // 2. Obtener tipo de cambio actual
        const { data: tipoCambio } = await supabase
          .from('tipos_cambio')
          .select('usd_to_ves')
          .eq('fecha', new Date().toISOString().split('T')[0])
          .eq('activo', true)
          .single();
        
        const tipoCambioActual = tipoCambio?.usd_to_ves || 36.50;
        
        // 3. Procesar servicios: manejar servicio predeterminado (ID -1)
        const serviciosProcesados: any[] = [];
        
        for (const servicio of servicios) {
          let servicioIdReal = servicio.servicio_id;
          
          // Si el servicio_id es -1, es un servicio predeterminado "Consulta"
          if (servicio.servicio_id === -1 || servicio.servicio_id === 0) {
            console.log('📝 Detectado servicio predeterminado (ID: -1), buscando o creando servicio "Consulta"');
            
            // Buscar si ya existe un servicio "Consulta" para esta especialidad
            const { data: servicioExistente } = await supabase
              .from('servicios')
              .select('id, nombre_servicio, monto_base, moneda')
              .eq('nombre_servicio', 'Consulta')
              .eq('especialidad_id', especialidadId)
              .eq('activo', true)
              .single();
            
            if (servicioExistente) {
              // Usar el servicio existente
              console.log('✅ Servicio "Consulta" encontrado:', servicioExistente.id);
              servicioIdReal = servicioExistente.id;
            } else {
              // Crear el servicio "Consulta" si no existe
              console.log('📝 Creando nuevo servicio "Consulta" para especialidad:', especialidadId);
              const { data: nuevoServicio, error: crearError } = await supabase
                .from('servicios')
                .insert({
                  nombre_servicio: 'Consulta',
                  especialidad_id: especialidadId,
                  monto_base: 80,
                  moneda: servicio.moneda || 'USD',
                  activo: true
                })
                .select('id, nombre_servicio, monto_base, moneda')
                .single();
              
              if (crearError || !nuevoServicio) {
                console.error('❌ Error creando servicio "Consulta":', crearError);
                return res.status(500).json({ 
                  success: false, 
                  error: 'Error al crear servicio predeterminado: ' + (crearError?.message || 'Error desconocido')
                });
              }
              
              console.log('✅ Servicio "Consulta" creado exitosamente:', nuevoServicio.id);
              servicioIdReal = nuevoServicio.id;
            }
          }
          
          serviciosProcesados.push({
            ...servicio,
            servicio_id: servicioIdReal
          });
        }
        
        // Validar que todos los servicios procesados existen
        const servicioIdsReales = serviciosProcesados.map((s: any) => s.servicio_id);
        const { data: serviciosValidos, error: serviciosError } = await supabase
          .from('servicios')
          .select('id, nombre_servicio, monto_base, moneda')
          .in('id', servicioIdsReales)
          .eq('activo', true);
        
        if (serviciosError || !serviciosValidos || serviciosValidos.length !== servicioIdsReales.length) {
          return res.status(400).json({ 
            success: false, 
            error: 'Uno o más servicios seleccionados no son válidos' 
          });
        }
        
        // 4. Validar montos y monedas
        for (const servicio of serviciosProcesados) {
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
        const serviciosData = serviciosProcesados.map((servicio: any) => ({
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
        const updateData: any = {
          estado_consulta: 'finalizada',
          fecha_culminacion: new Date().toISOString(),
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Efectivo'
        };
        
        const { error: updateError } = await supabase
          .from('consultas_pacientes')
          .update(updateData)
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
      }
      
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
          medicos!fk_consultas_medico(
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
