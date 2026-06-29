import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
 
export const db = {
  supabase,
  async getLineas() {
    const { data, error } = await supabase.from('lineas').select('*').order('created_at');
    if (error) throw error;
    return data.map(l => ({
      id: l.id, nombre: l.nombre, descripcion: l.descripcion, activa: l.activa,
      montoMin: l.monto_min, montoMax: l.monto_max, plazos: l.plazos,
      tna: l.tna, seguro: l.seguro||0, comisiones: l.comisiones||0, gastos: l.gastos||0,
      docsReq: l.docs_req, docsOpc: l.docs_opc
    }));
  },
  async saveLinea(linea) {
    const row = {
      id: linea.id, nombre: linea.nombre, descripcion: linea.descripcion, activa: linea.activa,
      monto_min: linea.montoMin, monto_max: linea.montoMax, plazos: linea.plazos,
      tna: linea.tna, seguro: linea.seguro||0, comisiones: linea.comisiones||0, gastos: linea.gastos||0,
      docs_req: linea.docsReq, docs_opc: linea.docsOpc
    };
    const { error } = await supabase.from('lineas').upsert(row);
    if (error) throw error;
  },
  async deleteLinea(id) {
    const { error } = await supabase.from('lineas').delete().eq('id', id);
    if (error) throw error;
  },
  async getUsuario(codigo, password) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('codigo', codigo).eq('password', password).single();
    if (error) return null;
    return data;
  },
  async getEmbajadores() {
    const { data, error } = await supabase.from('usuarios').select('*').eq('rol', 'embajador').eq('activo', true);
    if (error) throw error;
    return data;
  },
  async saveEmbajador(emb) {
    const { error } = await supabase.from('usuarios').upsert({
      codigo: emb.codigo, password: emb.password, nombre: emb.nombre,
      zona: emb.zona||null, rol: 'embajador', activo: true
    });
    if (error) throw error;
  },
  async deleteEmbajador(codigo) {
    const { error } = await supabase.from('usuarios').delete().eq('codigo', codigo);
    if (error) throw error;
  },
  async getSolicitudes(embCod) {
    let q = supabase.from('solicitudes').select('*').order('created_at', { ascending: false });
    if (embCod) q = q.eq('emb_cod', embCod);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveSolicitud(sol) {
    const { error } = await supabase.from('solicitudes').upsert({
      id: sol.id, fecha: sol.fecha, emb_cod: sol.embCod, emb_nombre: sol.embNombre,
      linea_id: sol.lineaId, linea_nombre: sol.lineaNombre, plazo: sol.plazo,
      monto: sol.monto, tna: sol.tna, cuota: sol.cuota, prom_sueldo: sol.promSueldo,
      cliente: sol.cli, docs: sol.docs, estado: sol.estado,
      estado_texto: sol.estadoTexto, obs: '',
token_firma: sol.tokenFirma || sol.id,
fecha_token_generado: sol.fechaTokenGenerado || new Date().toISOString(),docs_urls: sol.docsUrls || {}
    });
    if (error) throw error;
  },
  async updateSolicitud(id, updates) {
    const { error } = await supabase.from('solicitudes').update(updates).eq('id', id);
    if (error) throw error;
  },
  async getSolicitudByToken(token) {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('token_firma', token)
      .single();
    if (error) return null;
    return data;
  },
  async saveFirmaCliente(solicitudId, metadataFirma) {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        firma_cliente_completada: true,
        firma_metadata: metadataFirma,
        estado: 'aprobado',
        estado_texto: 'FIRMADO — PENDIENTE DESEMBOLSO',
        fecha_firma_cliente: new Date().toISOString(),
      })
      .eq('id', solicitudId);
    if (error) throw error;
    return true;
  },
 async uploadDocumento(solicitudId, nombreDoc, archivo) {
    const ext = archivo.name.split('.').pop();
    const path = `${solicitudId}/${nombreDoc.replace(/\s+/g,'_')}.${ext}`;
    const { error } = await supabase.storage.from('documentos').upload(path, archivo, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('documentos').getPublicUrl(path);
    return data.publicUrl;
  },
  async getDocumentos(solicitudId) {
    const { data, error } = await supabase.storage.from('documentos').list(solicitudId);
    if (error) return [];
    return data.map(f => ({
      nombre: f.name,
      url: supabase.storage.from('documentos').getPublicUrl(`${solicitudId}/${f.name}`).data.publicUrl
    }));
  },
};
