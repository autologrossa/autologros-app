import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const db = {
  async getLineas() {
    const { data, error } = await supabase.from('lineas').select('*').order('created_at');
    if (error) throw error;
    return data.map(l => ({
      id: l.id, nombre: l.nombre, descripcion: l.descripcion, activa: l.activa,
      montoMin: l.monto_min, montoMax: l.monto_max, plazos: l.plazos,
      tna: l.tna, tea: l.tea, cft: l.cft, docsReq: l.docs_req, docsOpc: l.docs_opc
    }));
  },
  async saveLinea(linea) {
    const row = {
      id: linea.id, nombre: linea.nombre, descripcion: linea.descripcion, activa: linea.activa,
      monto_min: linea.montoMin, monto_max: linea.montoMax, plazos: linea.plazos,
      tna: linea.tna, tea: linea.tea, cft: linea.cft, docs_req: linea.docsReq, docs_opc: linea.docsOpc
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
  async getSolicitudes(embCod) {
    let q = supabase.from('solicitudes').select('*').order('created_at', { ascending: false });
    if (embCod) q = q.eq('emb_cod', embCod);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveSolicitud(sol) {
    const row = {
      id: sol.id, fecha: sol.fecha, emb_cod: sol.embCod, emb_nombre: sol.embNombre,
      linea_id: sol.lineaId, linea_nombre: sol.lineaNombre, plazo: sol.plazo,
      monto: sol.monto, tna: sol.tna, cuota: sol.cuota, prom_sueldo: sol.promSueldo,
      cliente: sol.cli, docs: sol.docs, estado: sol.estado, estado_texto: sol.estadoTexto,
      obs: sol.obs || '', analista: sol.analista || null, fecha_res: sol.fechaRes || null
    };
    const { error } = await supabase.from('solicitudes').upsert(row);
    if (error) throw error;
  },
  async updateSolicitud(id, updates) {
    const { error } = await supabase.from('solicitudes').update(updates).eq('id', id);
    if (error) throw error;
  }
};
