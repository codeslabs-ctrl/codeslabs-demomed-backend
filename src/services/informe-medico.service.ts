import { supabase, postgresPool } from '../config/database';
import { USE_POSTGRES } from '../config/database-config.js';

export interface InformeMedico {
  id?: number;
  numero_informe: string;
  titulo: string;
  tipo_informe: string;
  contenido: string;
  paciente_id: number;
  medico_id: number;
  template_id?: number;
  estado: 'borrador' | 'finalizado' | 'firmado' | 'enviado';
  fecha_emision: Date;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  fecha_envio?: Date | string;
  clinica_alias: string;
  observaciones?: string;
  numero_secuencial?: number;
  creado_por: number;
}

export interface TemplateInforme {
  id?: number;
  nombre: string;
  descripcion: string;
  tipo_informe: string;
  contenido_template: string;
  especialidad_id?: number;
  activo: boolean;
  fecha_creacion: Date;
  clinica_alias: string;
}

export interface AnexoInforme {
  id?: number;
  informe_id: number;
  nombre_archivo: string;
  tipo_archivo: string;
  tamaño_archivo: number;
  ruta_archivo: string;
  fecha_subida: Date;
  descripcion?: string;
}

export interface EnvioInforme {
  id?: number;
  informe_id: number;
  paciente_id: number;
  metodo_envio: 'email' | 'sms' | 'whatsapp' | 'presencial';
  estado_envio: 'pendiente' | 'enviado' | 'fallido' | 'entregado';
  fecha_envio: Date;
  fecha_entrega?: Date;
  observaciones?: string;
  destinatario: string;
}

export class InformeMedicoService {
  // =====================================================
  // INFORMES MÉDICOS
  // =====================================================

  async crearInforme(informe: Omit<InformeMedico, 'id' | 'fecha_creacion' | 'fecha_actualizacion' | 'numero_informe' | 'numero_secuencial' | 'creado_por'>): Promise<InformeMedico> {
    const maxIntentos = 3;
    
    for (let intentos = 0; intentos < maxIntentos; intentos++) {
      try {
        console.log(`🔄 Creando informe (intento ${intentos + 1}/${maxIntentos})`);
        
        // Obtener el siguiente número secuencial
        const { data: config, error: configError } = await supabase
          .from('configuracion_informes')
          .select('*')
          .eq('clinica_alias', informe.clinica_alias)
          .single();

        if (configError) {
          throw new Error(`Error obteniendo configuración: ${configError.message}`);
        }

        // Generar número de informe
        const numeroSecuencial = (config.contador_actual || 0) + 1;
        const numeroInforme = `${config.prefijo_numero || 'INF'}-${numeroSecuencial.toString().padStart(6, '0')}`;
        
        console.log(`📋 Generando número de informe: ${numeroInforme} (secuencial: ${numeroSecuencial})`);

        // ACTUALIZAR CONFIGURACIÓN ANTES de insertar (para evitar duplicados)
        const { error: updateError } = await supabase
          .from('configuracion_informes')
          .update({ contador_actual: numeroSecuencial })
          .eq('clinica_alias', informe.clinica_alias);

        if (updateError) {
          throw new Error(`Error actualizando configuración: ${updateError.message}`);
        }

        console.log(`✅ Configuración actualizada: contador_actual = ${numeroSecuencial}`);

        // Crear el informe
        const { data, error } = await supabase
          .from('informes_medicos')
          .insert({
            ...informe,
            numero_informe: numeroInforme,
            creado_por: informe.medico_id
          })
          .select()
          .single();

        if (error) {
          // Verificar si es error de clave duplicada
          if (error.message.includes('duplicate key') && error.message.includes('numero_informe')) {
            console.log(`⚠️ Número de informe duplicado: ${numeroInforme}. Reintentando...`);
            
            // Si es el último intento, lanzar error
            if (intentos >= maxIntentos - 1) {
              throw new Error(`Error creando informe: ${error.message}`);
            }
            
            // Esperar un poco antes de reintentar (backoff exponencial)
            const delay = 100 * Math.pow(2, intentos); // 100ms, 200ms, 400ms
            console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`Error creando informe: ${error.message}`);
        }

        console.log(`✅ Informe creado exitosamente: ${numeroInforme}`);
        return data;
        
      } catch (error) {
        console.error(`❌ Error en crearInforme (intento ${intentos + 1}):`, error);
        throw error;
      }
    }
    
    // Si llegamos aquí, agotamos todos los intentos
    throw new Error('No se pudo crear el informe después de múltiples intentos');
  }

  async obtenerInformes(filtros: {
    clinica_alias: string;
    medico_id?: number;
    paciente_id?: number;
    estado?: string;
    tipo_informe?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    busqueda?: string;
  }): Promise<InformeMedico[]> {
    try {
      if (USE_POSTGRES) {
        const client = await postgresPool.connect();
        try {
          let sqlQuery = `
            SELECT 
              im.*,
              json_build_object(
                'id', p.id,
                'nombres', p.nombres,
                'apellidos', p.apellidos,
                'cedula', p.cedula
              ) as pacientes,
              json_build_object(
                'id', m.id,
                'nombres', m.nombres,
                'apellidos', m.apellidos,
                'especialidad_id', m.especialidad_id
              ) as medicos,
              json_build_object(
                'id', t.id,
                'nombre', t.nombre,
                'descripcion', t.descripcion
              ) as templates_informes
            FROM informes_medicos im
            LEFT JOIN pacientes p ON im.paciente_id = p.id
            LEFT JOIN medicos m ON im.medico_id = m.id
            LEFT JOIN templates_informes t ON im.template_id = t.id
            WHERE im.clinica_alias = $1
          `;
          
          const params: any[] = [filtros.clinica_alias];
          let paramIndex = 2;

          // Aplicar filtros
          if (filtros.medico_id) {
            sqlQuery += ` AND im.medico_id = $${paramIndex}`;
            params.push(filtros.medico_id);
            paramIndex++;
          }
          if (filtros.paciente_id) {
            sqlQuery += ` AND im.paciente_id = $${paramIndex}`;
            params.push(filtros.paciente_id);
            paramIndex++;
          }
          if (filtros.estado) {
            sqlQuery += ` AND im.estado = $${paramIndex}`;
            params.push(filtros.estado);
            paramIndex++;
          }
          if (filtros.tipo_informe) {
            sqlQuery += ` AND im.tipo_informe = $${paramIndex}`;
            params.push(filtros.tipo_informe);
            paramIndex++;
          }
          if (filtros.fecha_desde) {
            sqlQuery += ` AND im.fecha_emision >= $${paramIndex}`;
            params.push(filtros.fecha_desde);
            paramIndex++;
          }
          if (filtros.fecha_hasta) {
            sqlQuery += ` AND im.fecha_emision <= $${paramIndex}`;
            params.push(filtros.fecha_hasta);
            paramIndex++;
          }
          if (filtros.busqueda) {
            sqlQuery += ` AND (im.titulo ILIKE $${paramIndex} OR im.numero_informe ILIKE $${paramIndex})`;
            params.push(`%${filtros.busqueda}%`);
            paramIndex++;
          }

          sqlQuery += ` ORDER BY im.fecha_creacion DESC`;

          const result = await client.query(sqlQuery, params);
          
          // Transformar los resultados para que coincidan con el formato esperado
          return result.rows.map((row: any) => ({
            ...row,
            pacientes: row.pacientes,
            medicos: row.medicos,
            templates_informes: row.templates_informes
          }));
        } finally {
          client.release();
        }
      } else {
        // Código original de Supabase
        let query = supabase
          .from('informes_medicos')
          .select(`
            *,
            pacientes (id, nombres, apellidos, cedula),
            medicos (id, nombres, apellidos, especialidad_id),
            templates_informes (id, nombre, descripcion)
          `)
          .eq('clinica_alias', filtros.clinica_alias)
          .order('fecha_creacion', { ascending: false });

        // Aplicar filtros
        if (filtros.medico_id) {
          query = query.eq('medico_id', filtros.medico_id);
        }
        if (filtros.paciente_id) {
          query = query.eq('paciente_id', filtros.paciente_id);
        }
        if (filtros.estado) {
          query = query.eq('estado', filtros.estado);
        }
        if (filtros.tipo_informe) {
          query = query.eq('tipo_informe', filtros.tipo_informe);
        }
        if (filtros.fecha_desde) {
          query = query.gte('fecha_emision', filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
          query = query.lte('fecha_emision', filtros.fecha_hasta);
        }
        if (filtros.busqueda) {
          query = query.or(`titulo.ilike.%${filtros.busqueda}%,numero_informe.ilike.%${filtros.busqueda}%`);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(`Error obteniendo informes: ${error.message}`);
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error en obtenerInformes:', error);
      throw error;
    }
  }

  async obtenerInformePorId(id: number): Promise<InformeMedico | null> {
    try {
      const { data, error } = await supabase
        .from('informes_medicos')
        .select(`
          *,
          pacientes (id, nombres, apellidos, cedula, email, telefono),
          medicos (id, nombres, apellidos, especialidad_id),
          templates_informes (id, nombre, descripcion, contenido_template)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Error obteniendo informe: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerInformePorId:', error);
      throw error;
    }
  }

  async actualizarInforme(id: number, informe: Partial<InformeMedico>): Promise<InformeMedico> {
    try {
      const { data, error } = await supabase
        .from('informes_medicos')
        .update({
          ...informe,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando informe: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en actualizarInforme:', error);
      throw error;
    }
  }

  async eliminarInforme(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('informes_medicos')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Error eliminando informe: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error en eliminarInforme:', error);
      throw error;
    }
  }

  // =====================================================
  // TEMPLATES DE INFORMES
  // =====================================================

  async obtenerTemplates(filtros: {
    clinica_alias: string;
    especialidad_id?: number;
    tipo_informe?: string;
    activo?: boolean;
  }): Promise<TemplateInforme[]> {
    try {
      let query = supabase
        .from('templates_informes')
        .select('*')
        .eq('clinica_alias', filtros.clinica_alias)
        .order('nombre');

      if (filtros.especialidad_id) {
        query = query.eq('especialidad_id', filtros.especialidad_id);
      }
      if (filtros.tipo_informe) {
        query = query.eq('tipo_informe', filtros.tipo_informe);
      }
      if (filtros.activo !== undefined) {
        query = query.eq('activo', filtros.activo);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error obteniendo templates: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerTemplates:', error);
      throw error;
    }
  }

  async crearTemplate(template: Omit<TemplateInforme, 'id' | 'fecha_creacion' | 'clinica_alias'>): Promise<TemplateInforme> {
    try {
      // Agregar clinica_alias desde variable de entorno
      const templateWithClinic = {
        ...template,
        clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
      };

      const { data, error } = await supabase
        .from('templates_informes')
        .insert(templateWithClinic)
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando template: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en crearTemplate:', error);
      throw error;
    }
  }

  async obtenerTemplate(id: number): Promise<TemplateInforme> {
    try {
      const { data, error } = await supabase
        .from('templates_informes')
        .select('*')
        .eq('id', id)
        .eq('clinica_alias', process.env['CLINICA_ALIAS'] || 'femimed')
        .single();

      if (error) {
        throw new Error(`Error obteniendo template: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en obtenerTemplate:', error);
      throw error;
    }
  }

  async actualizarTemplate(id: number, template: Omit<TemplateInforme, 'id' | 'fecha_creacion' | 'clinica_alias'>): Promise<TemplateInforme> {
    try {
      // Agregar clinica_alias desde variable de entorno
      const templateWithClinic = {
        ...template,
        clinica_alias: process.env['CLINICA_ALIAS'] || 'femimed'
      };

      const { data, error } = await supabase
        .from('templates_informes')
        .update(templateWithClinic)
        .eq('id', id)
        .eq('clinica_alias', process.env['CLINICA_ALIAS'] || 'femimed')
        .select()
        .single();

      if (error) {
        throw new Error(`Error actualizando template: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en actualizarTemplate:', error);
      throw error;
    }
  }

  async eliminarTemplate(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('templates_informes')
        .delete()
        .eq('id', id)
        .eq('clinica_alias', process.env['CLINICA_ALIAS'] || 'femimed');

      if (error) {
        throw new Error(`Error eliminando template: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error en eliminarTemplate:', error);
      throw error;
    }
  }

  // =====================================================
  // ANEXOS
  // =====================================================

  async obtenerAnexosPorInforme(informeId: number): Promise<AnexoInforme[]> {
    try {
      const { data, error } = await supabase
        .from('anexos_informes')
        .select('*')
        .eq('informe_id', informeId)
        .order('fecha_subida', { ascending: false });

      if (error) {
        throw new Error(`Error obteniendo anexos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerAnexosPorInforme:', error);
      throw error;
    }
  }

  async agregarAnexo(anexo: Omit<AnexoInforme, 'id' | 'fecha_subida'>): Promise<AnexoInforme> {
    try {
      const { data, error } = await supabase
        .from('anexos_informes')
        .insert(anexo)
        .select()
        .single();

      if (error) {
        throw new Error(`Error agregando anexo: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error en agregarAnexo:', error);
      throw error;
    }
  }

  async eliminarAnexo(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anexos_informes')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Error eliminando anexo: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error en eliminarAnexo:', error);
      throw error;
    }
  }

  // =====================================================
  // ENVÍOS
  // =====================================================

  async obtenerEnviosPorInforme(informeId: number): Promise<EnvioInforme[]> {
    try {
      const { data, error } = await supabase
        .from('envios_informes')
        .select(`
          *,
          pacientes (id, nombres, apellidos, email, telefono)
        `)
        .eq('informe_id', informeId)
        .order('fecha_envio', { ascending: false });

      if (error) {
        throw new Error(`Error obteniendo envíos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerEnviosPorInforme:', error);
      throw error;
    }
  }

  async enviarInforme(envio: Omit<EnvioInforme, 'id' | 'fecha_envio'>): Promise<EnvioInforme> {
    try {
      const { data, error } = await supabase
        .from('envios_informes')
        .insert(envio)
        .select()
        .single();

      if (error) {
        throw new Error(`Error enviando informe: ${error.message}`);
      }

      // Actualizar estado del informe
      await supabase
        .from('informes_medicos')
        .update({ estado: 'enviado' })
        .eq('id', envio.informe_id);

      return data;
    } catch (error) {
      console.error('Error en enviarInforme:', error);
      throw error;
    }
  }

  // =====================================================
  // FIRMA DIGITAL
  // =====================================================

  async firmarInforme(informeId: number, medicoId: number, certificadoDigital: string, ipFirma?: string, userAgent?: string): Promise<boolean> {
    try {
      // Obtener contenido del informe
      const informe = await this.obtenerInformePorId(informeId);
      if (!informe) {
        throw new Error('Informe no encontrado');
      }

      // Generar hash del documento
      const crypto = require('crypto');
      const hashDocumento = crypto.createHash('sha256').update(informe.contenido).digest('hex');

      // Insertar firma digital
      const { error } = await supabase
        .from('firmas_digitales')
        .insert({
          informe_id: informeId,
          medico_id: medicoId,
          firma_hash: hashDocumento,
          certificado_digital: certificadoDigital,
          ip_firma: ipFirma,
          user_agent: userAgent
        });

      if (error) {
        throw new Error(`Error firmando informe: ${error.message}`);
      }

      // Actualizar estado del informe
      await supabase
        .from('informes_medicos')
        .update({ estado: 'firmado' })
        .eq('id', informeId);

      return true;
    } catch (error) {
      console.error('Error en firmarInforme:', error);
      throw error;
    }
  }

  async verificarFirmaDigital(informeId: number): Promise<{
    valida: boolean;
    firma_hash: string;
    fecha_firma: Date;
    certificado_digital: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('verificar_firma_digital_actual', { informe_id_param: informeId });

      if (error) {
        throw new Error(`Error verificando firma: ${error.message}`);
      }

      return data[0] || { valida: false, firma_hash: '', fecha_firma: new Date(), certificado_digital: '' };
    } catch (error) {
      console.error('Error en verificarFirmaDigital:', error);
      throw error;
    }
  }

  // =====================================================
  // ESTADÍSTICAS
  // =====================================================

  async obtenerEstadisticas(_clinicaAlias: string): Promise<{
    total_informes: number;
    informes_firmados: number;
    informes_sin_firma: number;
    porcentaje_firmados: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_firmas');

      if (error) {
        throw new Error(`Error obteniendo estadísticas: ${error.message}`);
      }

      return data[0] || { total_informes: 0, informes_firmados: 0, informes_sin_firma: 0, porcentaje_firmados: 0 };
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      throw error;
    }
  }

  async obtenerEstadisticasPorMedico(_clinicaAlias: string, medicoId: number): Promise<{
    medico_id: number;
    medico_nombres: string;
    medico_apellidos: string;
    total_informes: number;
    informes_firmados: number;
    informes_sin_firma: number;
    porcentaje_firmados: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_medico', { medico_id_param: medicoId });

      if (error) {
        throw new Error(`Error obteniendo estadísticas del médico: ${error.message}`);
      }

      return data[0] || { 
        medico_id: medicoId, 
        medico_nombres: '', 
        medico_apellidos: '', 
        total_informes: 0, 
        informes_firmados: 0, 
        informes_sin_firma: 0, 
        porcentaje_firmados: 0 
      };
    } catch (error) {
      console.error('Error en obtenerEstadisticasPorMedico:', error);
      throw error;
    }
  }

  async obtenerEstadisticasTodosMedicos(_clinicaAlias: string): Promise<Array<{
    medico_id: number;
    medico_nombres: string;
    medico_apellidos: string;
    total_informes: number;
    informes_firmados: number;
    informes_sin_firma: number;
    porcentaje_firmados: number;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_todos_medicos');

      if (error) {
        throw new Error(`Error obteniendo estadísticas de todos los médicos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error en obtenerEstadisticasTodosMedicos:', error);
      throw error;
    }
  }
}

export default new InformeMedicoService();
