import { useState, useEffect } from 'react';
import { db } from './supabase';

function calcCuota(monto, tna, meses) {
  const tm = tna / 100 / 12;
  if (tm === 0) return monto / meses;
  return (monto * tm * Math.pow(1 + tm, meses)) / (Math.pow(1 + tm, meses) - 1);
}
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const fmtN = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);

function Card({ children, style, onClick }) {
  return <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }} onClick={onClick}>{children}</div>;
}
function Inp({ label, type = 'text', value, onChange, placeholder, req, min, max, step }) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}{req && <span style={{ color: '#DC3545', marginLeft: 3 }}>*</span>}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, color: '#111827', background: '#FAFAFA', boxSizing: 'border-box' }} /></div>;
}
function Sel({ label, value, onChange, options, req }) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}{req && <span style={{ color: '#DC3545', marginLeft: 3 }}>*</span>}</label><select value={value} onChange={onChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, color: '#111827', background: '#FAFAFA', boxSizing: 'border-box' }}><option value=''>Seleccionar...</option>{options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>;
}
function Btn({ onClick, children, variant = 'primary', disabled, style }) {
  const v = { primary: { background: '#185FA5', color: '#fff', border: 'none' }, success: { background: '#0F6E56', color: '#fff', border: 'none' }, danger: { background: '#C0392B', color: '#fff', border: 'none' }, secondary: { background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }, outline: { background: '#fff', color: '#185FA5', border: '1px solid #185FA5' }, warning: { background: '#D97706', color: '#fff', border: 'none' } };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>;
}
function Badge({ text, type }) {
  const c = { pendiente: ['#FFF3CD', '#7B5700', '#F0C040'], aprobado: ['#D4EDDA', '#155724', '#28A745'], rechazado: ['#F8D7DA', '#721C24', '#DC3545'], activa: ['#D4EDDA', '#155724', '#28A745'], inactiva: ['#F3F4F6', '#6B7280', '#D1D5DB'] }[type] || ['#F3F4F6', '#374151', '#D1D5DB'];
  return <span style={{ background: c[0], color: c[1], border: `1px solid ${c[2]}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{text}</span>;
}
function Hdr({ title, user, onLogout, color = '#1a3a6b' }) {
  return <div style={{ background: color, color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><span style={{ fontWeight: 800, fontSize: 18 }}>AUTOLOGROS</span><span style={{ marginLeft: 12, fontSize: 13, opacity: 0.7 }}>{title}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span style={{ fontSize: 13, opacity: 0.9 }}>{user.nombre}</span><Btn onClick={onLogout} variant='secondary' style={{ padding: '6px 14px', fontSize: 12 }}>Salir</Btn></div></div>;
}
function Sec({ title, children }) {
  return <div style={{ marginBottom: 20 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #F3F4F6' }}>{title}</div>{children}</div>;
}
function G2({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>{children}</div>; }
function I({ l, v, hi }) { return <div style={{ padding: '6px 0' }}><div style={{ fontSize: 11, color: '#9CA3AF' }}>{l}</div><div style={{ fontSize: 14, fontWeight: hi ? 700 : 500, color: hi ? '#0F6E56' : '#111827' }}>{v}</div></div>; }

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [cod, setCod] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true); setErr('');
    try {
      const u = await db.getUsuario(cod.toUpperCase(), pw);
      if (u) onLogin(u); else setErr('Código o contraseña incorrectos.');
    } catch { setErr('Error de conexión. Intentá de nuevo.'); }
    setLoading(false);
  }
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a3a6b,#185FA5 60%,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Card style={{ width: '100%', maxWidth: 400, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1a3a6b', letterSpacing: -1 }}>AUTOLOGROS</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Sistema Operativo Integral</div>
        </div>
        <Inp label='Código de usuario' value={cod} onChange={e => setCod(e.target.value)} placeholder='EMB001 · ADM001 · SUP001' req />
        <Inp label='Contraseña' type='password' value={pw} onChange={e => setPw(e.target.value)} placeholder='••••••••' req />
        {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{err}</div>}
        <Btn onClick={go} disabled={loading || !cod || !pw} style={{ width: '100%' }}>{loading ? 'Verificando...' : 'Ingresar'}</Btn>
      </Card>
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function Admin({ user, onLogout }) {
  const [lineas, setLineas] = useState([]); const [editando, setEditando] = useState(null); const [nueva, setNueva] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { cargar(); }, []);
  async function cargar() { setLoading(true); setLineas(await db.getLineas()); setLoading(false); }
  async function guardar(linea) { await db.saveLinea(linea); await cargar(); setEditando(null); setNueva(false); }
  async function toggleActiva(linea) { await db.saveLinea({ ...linea, activa: !linea.activa }); await cargar(); }
  async function eliminar(id) { if (!window.confirm('¿Eliminar esta línea?')) return; await db.deleteLinea(id); await cargar(); }
  if (editando || nueva) return <FormLinea linea={editando} onGuardar={guardar} onCancelar={() => { setEditando(null); setNueva(false); }} user={user} onLogout={onLogout} />;
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Hdr title='Panel Administrador' user={user} onLogout={onLogout} color='#2D1B69' />
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Líneas de crédito</div><div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{lineas.filter(l => l.activa).length} activas · {lineas.filter(l => !l.activa).length} inactivas</div></div>
          <Btn onClick={() => setNueva(true)} variant='success'>+ Nueva línea</Btn>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Cargando...</div> : lineas.map(linea => (
          <Card key={linea.id} style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}><span style={{ fontSize: 18, fontWeight: 700 }}>{linea.nombre}</span><Badge text={linea.activa ? 'Activa' : 'Inactiva'} type={linea.activa ? 'activa' : 'inactiva'} /></div><div style={{ fontSize: 13, color: '#6B7280' }}>{linea.descripcion}</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => toggleActiva(linea)} variant={linea.activa ? 'warning' : 'success'} style={{ padding: '7px 14px', fontSize: 12 }}>{linea.activa ? 'Desactivar' : 'Activar'}</Btn>
                <Btn onClick={() => setEditando(linea)} variant='outline' style={{ padding: '7px 14px', fontSize: 12 }}>Editar</Btn>
                <Btn onClick={() => eliminar(linea.id)} variant='danger' style={{ padding: '7px 14px', fontSize: 12 }}>Eliminar</Btn>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['Monto mín.', fmt(linea.montoMin)], ['Monto máx.', fmt(linea.montoMax)], ['TNA', `${linea.tna}%`], ['TEA', `${linea.tea}%`], ['CFT', `${linea.cft}%`], ['Plazos', (linea.plazos || []).join(', ') + ' meses']].map(([l, v]) => (
                <div key={l} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Docs requeridos:</span>
              {(linea.docsReq || []).map(d => <span key={d} style={{ fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '2px 8px', border: '1px solid #BFDBFE' }}>{d}</span>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FormLinea({ linea, onGuardar, onCancelar, user, onLogout }) {
  const nuevo = !linea;
  const [f, setF] = useState(linea ? { ...linea, plazosStr: (linea.plazos || []).join(', '), docsReqStr: (linea.docsReq || []).join('\n'), docsOpcStr: (linea.docsOpc || []).join('\n') } : { id: `linea-${Date.now()}`, nombre: '', descripcion: '', activa: true, montoMin: '', montoMax: '', tna: '', tea: '', cft: '', plazosStr: '', docsReqStr: '', docsOpcStr: '' });
  function toLinea() { return { ...f, montoMin: parseFloat(f.montoMin), montoMax: parseFloat(f.montoMax), tna: parseFloat(f.tna), tea: parseFloat(f.tea), cft: parseFloat(f.cft), plazos: f.plazosStr.split(',').map(x => parseInt(x.trim())).filter(Boolean), docsReq: f.docsReqStr.split('\n').map(x => x.trim()).filter(Boolean), docsOpc: f.docsOpcStr.split('\n').map(x => x.trim()).filter(Boolean) }; }
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Hdr title='Panel Administrador' user={user} onLogout={onLogout} color='#2D1B69' />
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onCancelar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}>←</button>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{nuevo ? 'Nueva línea' : 'Editar: ' + f.nombre}</div>
        </div>
        <Card style={{ padding: 28 }}>
          <Inp label='Nombre' value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} req />
          <Inp label='Descripción' value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type='checkbox' checked={f.activa} onChange={e => setF({ ...f, activa: e.target.checked })} style={{ width: 18, height: 18 }} /><span style={{ fontSize: 13, fontWeight: 600, color: f.activa ? '#0F6E56' : '#6B7280' }}>{f.activa ? 'Activa — visible para embajadores' : 'Inactiva'}</span></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Inp label='Monto mínimo ($)' type='number' value={f.montoMin} onChange={e => setF({ ...f, montoMin: e.target.value })} req />
            <Inp label='Monto máximo ($)' type='number' value={f.montoMax} onChange={e => setF({ ...f, montoMax: e.target.value })} req />
            <Inp label='TNA (%)' type='number' step='0.1' value={f.tna} onChange={e => setF({ ...f, tna: e.target.value })} req />
            <Inp label='TEA (%)' type='number' step='0.1' value={f.tea} onChange={e => setF({ ...f, tea: e.target.value })} req />
            <Inp label='CFT (%)' type='number' step='0.1' value={f.cft} onChange={e => setF({ ...f, cft: e.target.value })} req />
            <Inp label='Plazos (meses, separados por coma)' value={f.plazosStr} onChange={e => setF({ ...f, plazosStr: e.target.value })} placeholder='6, 12, 18, 24, 36' req />
          </div>
          <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Documentos obligatorios *</label><textarea value={f.docsReqStr} onChange={e => setF({ ...f, docsReqStr: e.target.value })} placeholder={'DNI frente y dorso\nÚltimos 3 recibos de sueldo\nCBU / CVU propio'} style={{ width: '100%', minHeight: 100, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} /><div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Un documento por línea</div></div>
          <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Documentos opcionales</label><textarea value={f.docsOpcStr} onChange={e => setF({ ...f, docsOpcStr: e.target.value })} placeholder='Factura de servicios' style={{ width: '100%', minHeight: 70, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Btn onClick={onCancelar} variant='secondary'>Cancelar</Btn>
            <Btn onClick={() => onGuardar(toLinea())} variant='success' disabled={!f.nombre || !f.montoMin || !f.montoMax || !f.tna || !f.plazosStr}>{nuevo ? 'Crear línea' : 'Guardar cambios'}</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── ANALISTA ──────────────────────────────────────────────────────────────────
function Analista({ user, onLogout }) {
  const [sols, setSols] = useState([]); const [detalle, setDetalle] = useState(null); const [filtro, setFiltro] = useState('pendiente'); const [loading, setLoading] = useState(true);
  useEffect(() => { cargar(); const interval = setInterval(cargar, 15000); return () => clearInterval(interval); }, []);
  async function cargar() { setSols(await db.getSolicitudes()); setLoading(false); }
  async function resolver(id, estado, obs) {
    await db.updateSolicitud(id, { estado, estado_texto: estado === 'aprobado' ? 'Aprobado — pendiente firma' : 'Rechazado', obs, analista: user.nombre, fecha_res: new Date().toLocaleDateString('es-AR') });
    await cargar(); setDetalle(null);
  }
  const list = sols.filter(s => filtro === 'todas' || s.estado === filtro);
  const cnt = { p: sols.filter(s => s.estado === 'pendiente').length, a: sols.filter(s => s.estado === 'aprobado').length, r: sols.filter(s => s.estado === 'rechazado').length };
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Hdr title='Panel de Análisis' user={user} onLogout={onLogout} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '24px 24px 0', maxWidth: 860, margin: '0 auto' }}>
        {[['Pendientes', cnt.p, '#FEF3C7', '#92400E'], ['Aprobadas', cnt.a, '#D4EDDA', '#065F46'], ['Rechazadas', cnt.r, '#FEE2E2', '#991B1B']].map(([l, n, bg, c]) => (
          <Card key={l} style={{ padding: 20, background: bg, border: 'none' }}><div style={{ fontSize: 32, fontWeight: 800, color: c }}>{n}</div><div style={{ fontSize: 13, color: c }}>{l}</div></Card>
        ))}
      </div>
      <div style={{ padding: '16px 24px 0', maxWidth: 860, margin: '0 auto', display: 'flex', gap: 8 }}>
        {[['pendiente', 'Pendientes'], ['aprobado', 'Aprobadas'], ['rechazado', 'Rechazadas'], ['todas', 'Todas']].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{ padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: filtro === k ? 700 : 400, background: filtro === k ? '#185FA5' : '#F3F4F6', color: filtro === k ? '#fff' : '#374151', border: 'none', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: '16px 24px 24px', maxWidth: 860, margin: '0 auto' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Cargando...</div> : !list.length ? <Card style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No hay solicitudes en esta categoría.</Card> : list.map(s => (
          <Card key={s.id} style={{ padding: 20, marginBottom: 12, cursor: 'pointer', borderLeft: `4px solid ${s.estado === 'pendiente' ? '#F59E0B' : s.estado === 'aprobado' ? '#10B981' : '#EF4444'}` }} onClick={() => setDetalle(s)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{s.cliente?.nombre} {s.cliente?.apellido} <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 13 }}>· DNI {s.cliente?.dni}</span></div><div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{s.linea_nombre} · {fmt(s.monto)} · {s.plazo} meses · Cuota {fmt(s.cuota)}</div><div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Embajador: {s.emb_nombre} · {s.fecha}</div></div>
              <Badge text={s.estado_texto} type={s.estado} />
            </div>
          </Card>
        ))}
      </div>
      {detalle && <Modal sol={detalle} onClose={() => setDetalle(null)} onResolver={resolver} />}
    </div>
  );
}

// ── EMBAJADOR ─────────────────────────────────────────────────────────────────
function Embajador({ user, onLogout }) {
  const [tab, setTab] = useState('nueva'); const [lineas, setLineas] = useState([]); const [sols, setSols] = useState([]); const [detalle, setDetalle] = useState(null);
  useEffect(() => { init(); }, []);
  async function init() { const l = await db.getLineas(); setLineas(l.filter(x => x.activa)); const s = await db.getSolicitudes(user.codigo); setSols(s); }
  async function cargarSols() { setSols(await db.getSolicitudes(user.codigo)); }
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Hdr title='Portal Embajador' user={user} onLogout={onLogout} />
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px' }}>
        {[['nueva', 'Nueva solicitud'], ['mis', 'Mis solicitudes']].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); if (k === 'mis') cargarSols(); }} style={{ background: 'none', border: 'none', padding: '14px 20px', fontSize: 14, fontWeight: tab === k ? 700 : 400, color: tab === k ? '#185FA5' : '#6B7280', borderBottom: tab === k ? '3px solid #185FA5' : '3px solid transparent', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
        {tab === 'nueva' && <NuevaSol user={user} lineas={lineas} onEnviada={() => { cargarSols(); setTab('mis'); }} />}
        {tab === 'mis' && (sols.length === 0 ? <Card style={{ padding: 48, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><div style={{ color: '#6B7280' }}>Todavía no cargaste solicitudes.</div></Card> : sols.map(s => (
          <Card key={s.id} style={{ padding: 20, marginBottom: 12, cursor: 'pointer', borderLeft: `4px solid ${s.estado === 'pendiente' ? '#F59E0B' : s.estado === 'aprobado' ? '#10B981' : '#EF4444'}` }} onClick={() => setDetalle(s)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{s.cliente?.nombre} {s.cliente?.apellido}</div><div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{s.linea_nombre} · {fmt(s.monto)} · {s.plazo} meses · cuota {fmt(s.cuota)}</div><div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{s.id} · {s.fecha}</div></div>
              <Badge text={s.estado_texto} type={s.estado} />
            </div>
          </Card>
        )))}
      </div>
      {detalle && <Modal sol={detalle} onClose={() => setDetalle(null)} readOnly />}
    </div>
  );
}

// ── NUEVA SOLICITUD ───────────────────────────────────────────────────────────
function NuevaSol({ user, lineas, onEnviada }) {
  const [paso, setPaso] = useState(1); const [lid, setLid] = useState(''); const [plazo, setPlazo] = useState(''); const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [s3, setS3] = useState(''); const [monto, setMonto] = useState(''); const [f, setF] = useState({ nombre: '', apellido: '', dni: '', cuil: '', email: '', tel: '', emp: '', antig: '', cbu: '' }); const [docs, setDocs] = useState({}); const [env, setEnv] = useState(false); const [ok, setOk] = useState(false);
  const linea = lineas.find(l => l.id === lid);
  const prom = s1 && s2 && s3 ? (parseFloat(s1) + parseFloat(s2) + parseFloat(s3)) / 3 : 0;
  const cmax = prom * 0.30;
  const cuota = linea && monto && plazo ? calcCuota(parseFloat(monto), linea.tna, parseInt(plazo)) : 0;
  const capOK = cmax > 0 && cuota > 0 && cuota <= cmax;
  async function enviar() {
    setEnv(true);
    const sol = { id: `SOL-${Date.now()}`, fecha: new Date().toLocaleDateString('es-AR'), embCod: user.codigo, embNombre: user.nombre, lineaId: lid, lineaNombre: linea.nombre, plazo: parseInt(plazo), monto: parseFloat(monto), tna: linea.tna, cuota: Math.round(cuota), promSueldo: Math.round(prom), cli: { ...f }, docs: Object.keys(docs), estado: 'pendiente', estadoTexto: 'Pendiente de análisis' };
    await db.saveSolicitud(sol);
    setEnv(false); setOk(true);
  }
  const reset = () => { setOk(false); setPaso(1); setLid(''); setPlazo(''); setS1(''); setS2(''); setS3(''); setMonto(''); setF({ nombre: '', apellido: '', dni: '', cuil: '', email: '', tel: '', emp: '', antig: '', cbu: '' }); setDocs({}); };
  if (ok) return <Card style={{ padding: 48, textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>✅</div><div style={{ fontSize: 22, fontWeight: 700, color: '#0F6E56', marginBottom: 8 }}>Solicitud enviada</div><div style={{ color: '#6B7280', marginBottom: 24 }}>Enviada al equipo de análisis.</div><Btn onClick={reset} variant='outline'>Cargar otra</Btn></Card>;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {['Línea y simulación', 'Datos del cliente', 'Documentación', 'Confirmar'].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: paso > i + 1 ? '#0F6E56' : paso === i + 1 ? '#185FA5' : '#E5E7EB', color: paso >= i + 1 ? '#fff' : '#9CA3AF', fontWeight: 700, fontSize: 14 }}>{paso > i + 1 ? '✓' : i + 1}</div>
              <div style={{ fontSize: 11, color: paso === i + 1 ? '#185FA5' : '#9CA3AF', marginTop: 4, textAlign: 'center' }}>{l}</div>
            </div>
            {i < 3 && <div style={{ height: 2, width: 16, background: paso > i + 1 ? '#0F6E56' : '#E5E7EB', marginBottom: 18 }} />}
          </div>
        ))}
      </div>
      {paso === 1 && <Card style={{ padding: 28 }}>
        <h3 style={{ margin: '0 0 20px', color: '#1a3a6b', fontSize: 17 }}>Línea de crédito y simulación</h3>
        {lineas.length === 0 ? <div style={{ padding: 20, background: '#FEF3C7', borderRadius: 8, color: '#92400E', fontSize: 13 }}>No hay líneas activas. Contactá al administrador.</div> : <>
          <Sel label='Línea de crédito' value={lid} onChange={e => { setLid(e.target.value); setPlazo(''); }} options={lineas.map(l => ({ v: l.id, l: l.nombre }))} req />
          {linea && <div style={{ background: '#F0F9FF', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#0369A1' }}><strong>{linea.nombre}</strong> · TNA {linea.tna}% · TEA {linea.tea}% · CFT {linea.cft}%<br />Rango: {fmt(linea.montoMin)} — {fmt(linea.montoMax)}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Inp label='Recibo 1 (más antiguo)' type='number' value={s1} onChange={e => setS1(e.target.value)} placeholder='0' req />
            <Inp label='Recibo 2' type='number' value={s2} onChange={e => setS2(e.target.value)} placeholder='0' req />
            <Inp label='Recibo 3 (más reciente)' type='number' value={s3} onChange={e => setS3(e.target.value)} placeholder='0' req />
          </div>
          {prom > 0 && <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 14, marginBottom: 16 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}><div><span style={{ color: '#6B7280' }}>Promedio neto:</span> <strong>{fmt(prom)}</strong></div><div><span style={{ color: '#6B7280' }}>Cuota máxima 30%:</span> <strong style={{ color: '#0F6E56' }}>{fmt(cmax)}</strong></div></div></div>}
          {linea && <><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Inp label='Monto solicitado ($)' type='number' value={monto} onChange={e => setMonto(e.target.value)} placeholder={`${fmtN(linea.montoMin)} — ${fmtN(linea.montoMax)}`} req /><Sel label='Plazo' value={plazo} onChange={e => setPlazo(e.target.value)} options={(linea.plazos || []).map(p => ({ v: p, l: `${p} meses` }))} req /></div>{cuota > 0 && <div style={{ borderRadius: 12, padding: 20, background: capOK ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${capOK ? '#86EFAC' : '#FECACA'}` }}><div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Cuota mensual estimada</div><div style={{ fontSize: 36, fontWeight: 800, color: capOK ? '#0F6E56' : '#DC3545' }}>{fmt(cuota)}</div>{!capOK && prom > 0 && <div style={{ fontSize: 12, color: '#DC3545', marginTop: 6 }}>⚠️ Supera el 30% del sueldo. Reducí el monto o ampliá el plazo.</div>}{capOK && <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 6 }}>✓ Dentro de la capacidad de pago.</div>}</div>}</>}
        </>}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}><Btn onClick={() => setPaso(2)} disabled={!linea || !monto || !plazo || !s1 || !s2 || !s3 || !capOK}>Continuar →</Btn></div>
      </Card>}
      {paso === 2 && <Card style={{ padding: 28 }}><h3 style={{ margin: '0 0 20px', color: '#1a3a6b', fontSize: 17 }}>Datos del cliente</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}><Inp label='Nombre' value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} req /><Inp label='Apellido' value={f.apellido} onChange={e => setF({ ...f, apellido: e.target.value })} req /><Inp label='DNI' value={f.dni} onChange={e => setF({ ...f, dni: e.target.value })} placeholder='12345678' req /><Inp label='CUIL' value={f.cuil} onChange={e => setF({ ...f, cuil: e.target.value })} placeholder='20-12345678-9' req /><Inp label='Email' type='email' value={f.email} onChange={e => setF({ ...f, email: e.target.value })} req /><Inp label='Teléfono' value={f.tel} onChange={e => setF({ ...f, tel: e.target.value })} placeholder='+54 9 11 ...' req /><Inp label='Empleador' value={f.emp} onChange={e => setF({ ...f, emp: e.target.value })} req /><Inp label='Antigüedad' value={f.antig} onChange={e => setF({ ...f, antig: e.target.value })} placeholder='2 años 3 meses' req /><Inp label='CBU / CVU' value={f.cbu} onChange={e => setF({ ...f, cbu: e.target.value })} placeholder='22 dígitos' req /></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}><Btn onClick={() => setPaso(1)} variant='secondary'>← Atrás</Btn><Btn onClick={() => setPaso(3)} disabled={!f.nombre || !f.apellido || !f.dni || !f.cuil || !f.email || !f.tel || !f.emp || !f.cbu}>Continuar →</Btn></div></Card>}
      {paso === 3 && linea && <Card style={{ padding: 28 }}><h3 style={{ margin: '0 0 20px', color: '#1a3a6b', fontSize: 17 }}>Documentación</h3><h4 style={{ color: '#374151', fontSize: 14, margin: '0 0 12px' }}>Obligatorios</h4>{(linea.docsReq || []).map(d => <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, marginBottom: 8, border: `1px solid ${docs[d] ? '#86EFAC' : '#E5E7EB'}`, background: docs[d] ? '#F0FDF4' : '#FAFAFA' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span>{docs[d] ? '✅' : '📄'}</span><span style={{ fontSize: 13 }}>{d}</span><span style={{ fontSize: 11, color: '#DC3545' }}>*</span></div><label style={{ cursor: 'pointer' }}><span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600, background: docs[d] ? '#D1FAE5' : '#EFF6FF', color: docs[d] ? '#065F46' : '#1D4ED8', border: `1px solid ${docs[d] ? '#6EE7B7' : '#BFDBFE'}` }}>{docs[d] ? 'Cambiar' : 'Adjuntar'}</span><input type='file' accept='image/*,.pdf' style={{ display: 'none' }} onChange={e => e.target.files[0] && setDocs({ ...docs, [d]: e.target.files[0].name })} /></label></div>)}{(linea.docsOpc || []).length > 0 && <><h4 style={{ color: '#374151', fontSize: 14, margin: '16px 0 12px' }}>Opcionales</h4>{(linea.docsOpc || []).map(d => <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, marginBottom: 8, border: `1px solid ${docs[d] ? '#86EFAC' : '#E5E7EB'}`, background: docs[d] ? '#F0FDF4' : '#FAFAFA' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span>{docs[d] ? '✅' : '📄'}</span><span style={{ fontSize: 13 }}>{d}</span></div><label style={{ cursor: 'pointer' }}><span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600, background: docs[d] ? '#D1FAE5' : '#F9FAFB', color: docs[d] ? '#065F46' : '#6B7280', border: `1px solid ${docs[d] ? '#6EE7B7' : '#E5E7EB'}` }}>{docs[d] ? 'Cambiar' : 'Adjuntar'}</span><input type='file' accept='image/*,.pdf' style={{ display: 'none' }} onChange={e => e.target.files[0] && setDocs({ ...docs, [d]: e.target.files[0].name })} /></label></div>)}</>}{(linea.docsReq || []).some(d => !docs[d]) && <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: 12, fontSize: 12, color: '#92400E', marginTop: 12 }}>Faltan: {(linea.docsReq || []).filter(d => !docs[d]).join(', ')}</div>}<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}><Btn onClick={() => setPaso(2)} variant='secondary'>← Atrás</Btn><Btn onClick={() => setPaso(4)} disabled={(linea.docsReq || []).some(d => !docs[d])}>Continuar →</Btn></div></Card>}
      {paso === 4 && linea && <Card style={{ padding: 28 }}><h3 style={{ margin: '0 0 20px', color: '#1a3a6b', fontSize: 17 }}>Resumen y confirmación</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}><div style={{ background: '#F0F9FF', borderRadius: 10, padding: 16 }}><div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Crédito</div><div style={{ fontSize: 13 }}><strong>{linea.nombre}</strong></div><div style={{ fontSize: 13 }}>Monto: <strong>{fmt(parseFloat(monto))}</strong></div><div style={{ fontSize: 13 }}>Plazo: <strong>{plazo} meses</strong></div><div style={{ fontSize: 16, fontWeight: 800, color: '#0F6E56', marginTop: 6 }}>Cuota: {fmt(cuota)}</div><div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>TNA {linea.tna}% · CFT {linea.cft}%</div></div><div style={{ background: '#F9FAFB', borderRadius: 10, padding: 16 }}><div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Cliente</div><div style={{ fontSize: 14, fontWeight: 700 }}>{f.nombre} {f.apellido}</div><div style={{ fontSize: 13, color: '#6B7280' }}>DNI {f.dni} · CUIL {f.cuil}</div><div style={{ fontSize: 13, color: '#6B7280' }}>{f.email}</div><div style={{ fontSize: 13, color: '#6B7280' }}>{f.emp} · {f.antig}</div></div></div><div style={{ background: '#F0FDF4', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13 }}><strong>Documentos:</strong> {Object.keys(docs).join(', ')}</div><div style={{ display: 'flex', justifyContent: 'space-between' }}><Btn onClick={() => setPaso(3)} variant='secondary'>← Atrás</Btn><Btn onClick={enviar} variant='success' disabled={env}>{env ? 'Enviando...' : '✓ Enviar solicitud'}</Btn></div></Card>}
    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ sol: s, onClose, onResolver, readOnly }) {
  const [obs, setObs] = useState(s.obs || ''); const [conf, setConf] = useState(null);
  const cli = s.cliente || {};
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontWeight: 700, fontSize: 16 }}>{s.id}</div><div style={{ fontSize: 13, color: '#6B7280' }}>{s.fecha} · {s.emb_nombre}</div></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <Sec title='Crédito'><G2><I l='Línea' v={s.linea_nombre} /><I l='Monto' v={fmt(s.monto)} /><I l='Plazo' v={`${s.plazo} meses`} /><I l='Cuota' v={fmt(s.cuota)} hi /><I l='TNA' v={`${s.tna}%`} /><I l='Sueldo promedio' v={fmt(s.prom_sueldo)} /></G2><div style={{ marginTop: 10, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#065F46' }}>Cuota/sueldo: {((s.cuota / s.prom_sueldo) * 100).toFixed(1)}% (máx. 30%)</div></Sec>
          <Sec title='Cliente'><G2><I l='Nombre' v={`${cli.nombre} ${cli.apellido}`} /><I l='DNI' v={cli.dni} /><I l='CUIL' v={cli.cuil} /><I l='Email' v={cli.email} /><I l='Teléfono' v={cli.tel} /><I l='Empleador' v={cli.emp} /><I l='Antigüedad' v={cli.antig} /><I l='CBU/CVU' v={cli.cbu} /></G2></Sec>
          <Sec title='Documentación'><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{(s.docs || []).map(d => <span key={d} style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '4px 10px', fontSize: 12, border: '1px solid #BFDBFE' }}>📎 {d}</span>)}</div></Sec>
          {!readOnly && s.estado === 'pendiente' && <Sec title='Resolución'><div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Observaciones</label><textarea value={obs} onChange={e => setObs(e.target.value)} style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} placeholder='Fundamento del análisis...' /></div>{!conf ? <div style={{ display: 'flex', gap: 12 }}><Btn onClick={() => setConf('aprobado')} variant='success' style={{ flex: 1 }}>✓ Aprobar</Btn><Btn onClick={() => setConf('rechazado')} variant='danger' style={{ flex: 1 }}>✕ Rechazar</Btn></div> : <div style={{ background: conf === 'aprobado' ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 16 }}><div style={{ fontWeight: 600, marginBottom: 10, color: conf === 'aprobado' ? '#065F46' : '#991B1B' }}>¿Confirmar {conf === 'aprobado' ? 'aprobación' : 'rechazo'}?</div><div style={{ display: 'flex', gap: 10 }}><Btn onClick={() => onResolver(s.id, conf, obs)} variant={conf === 'aprobado' ? 'success' : 'danger'} style={{ flex: 1 }}>Confirmar</Btn><Btn onClick={() => setConf(null)} variant='secondary' style={{ flex: 1 }}>Cancelar</Btn></div></div>}</Sec>}
          {s.estado !== 'pendiente' && <div style={{ marginTop: 16, padding: '12px 16px', background: s.estado === 'aprobado' ? '#D1FAE5' : '#FEE2E2', borderRadius: 10 }}><div style={{ fontWeight: 600, color: s.estado === 'aprobado' ? '#065F46' : '#991B1B', marginBottom: 4 }}>{s.estado === 'aprobado' ? '✓ Aprobado' : '✕ Rechazado'} · {s.fecha_res}</div>{s.obs && <div style={{ fontSize: 13, color: '#374151' }}>{s.obs}</div>}</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  if (!user) return <Login onLogin={setUser} />;
  if (user.rol === 'admin') return <Admin user={user} onLogout={() => setUser(null)} />;
  if (user.rol === 'analista') return <Analista user={user} onLogout={() => setUser(null)} />;
  return <Embajador user={user} onLogout={() => setUser(null)} />;
}
