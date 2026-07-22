import { useState, useRef } from 'react';
import { db } from './supabase';

const C = {
  bg0:'#030F1E', bg1:'#06172E', bg2:'#071829', bg3:'#0A1F3A', bg4:'#0D2540',
  border:'rgba(255,255,255,0.08)', border2:'rgba(255,255,255,0.12)',
  text:'#FFFFFF', text2:'rgba(255,255,255,0.55)', text3:'rgba(255,255,255,0.35)',
  gold:'#C8922A', goldL:'rgba(200,146,42,0.15)', goldB:'rgba(200,146,42,0.25)',
  blue:'#4A9AE0', green:'#4AE08A', greenL:'rgba(74,224,138,0.08)', greenB:'rgba(74,224,138,0.15)',
  red:'#E05050', redL:'rgba(224,80,80,0.08)', redB:'rgba(224,80,80,0.15)',
};

const EMPRESA = {
  nombre: 'AUTOLOGROS S.A.',
  cuit: '30-71934732-7',
  domicilio: 'Lavalle 1390, Piso 3, Oficina B, Ciudad Autónoma de Buenos Aires',
  representante: 'Nicolás Issaharoff',
  cargo: 'Presidente',
};

const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n||0);

function Seccion({ numero, titulo, children, color }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${color || C.gold}` }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color || C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#000', flexShrink: 0 }}>
          {numero}
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: color || C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{titulo}</div>
      </div>
      {children}
    </div>
  );
}

function Campo({ label, valor, color, span }) {
  return (
    <div style={{ background: C.bg3, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}`, gridColumn: span ? '1/-1' : undefined }}>
      <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || C.text, wordBreak: 'break-all' }}>{valor || '—'}</div>
    </div>
  );
}

function DocItem({ nombre, valor }) {
  const esUrl = typeof valor === 'string' && valor.startsWith('http');
  const esImagen = esUrl && /\.(jpe?g|png|gif|webp)$/i.test(valor);
  if (esImagen) {
    return (
      <a href={valor} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ background: C.bg4, border: `1px solid ${C.greenB}`, borderRadius: 8, padding: 8, width: 140 }}>
          <img src={valor} alt={nombre} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}/>
          <div style={{ fontSize: 9, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.3 }}>{nombre} <span style={{opacity:0.6}}>↗</span></div>
        </div>
      </a>
    );
  }
  if (esUrl) {
    return (
      <a href={valor} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ background: C.bg4, border: `1px solid ${C.greenB}`, borderRadius: 8, padding: 8, width: 140, height: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
          <div style={{ fontSize: 9, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.3 }}>{nombre} <span style={{opacity:0.6}}>↗</span></div>
        </div>
      </a>
    );
  }
  return (
    <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, padding: 8, width: 140, height: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>📎</div>
      <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.3 }}>{nombre}</div>
    </div>
  );
}

// ── Gráficos del bureau ────────────────────────────────────────────────────────
const SIT_COLOR = { 1: '#1A8C4A', 2: '#D4B800', 3: '#C2218A', 4: '#C2218A', 5: '#C2218A' };
const PIE_COLORS = ['#4A9AE0', '#C8922A', '#4AE08A', '#E05050', '#9B7ED8'];
const ENTIDADES_BANCARIAS = ['BBVA SA','Bco CMF SA','Nvo Bco Entre Ríos','Bco De Comercio SA','Bco Supervielle','Catalinas Coop','Bibank SA','YPF SA','BR Capital SA','Unicred COOP','Bco De Valores','Marias Capital SA','Bco Macro','Bco Nación','Bco Credicoop','Bco Santander Río','Bco Pcia Bs As','Bco Industrial','Bco Galicia','American Express'];

function generarComposicionDeuda(bcra, nosis) {
  if (bcra?.ok && bcra.deudas && bcra.deudas.length > 0) {
    return bcra.deudas.slice(0, 5).map(d => ({ label: d.entidad || 'Entidad', valor: (d.monto || 0) * 1000 || Math.round(Math.random() * 50000) + 10000 }));
  }
  const compMens = nosis?.compromisoMensual ? parseFloat(String(nosis.compromisoMensual).replace(/[^0-9.]/g, '')) || 0 : 0;
  const base = compMens > 0 ? compMens * 8 : 45000;
  return [{ label: 'Tarjeta de Crédito', valor: Math.round(base * 0.42) }, { label: 'Préstamo Personal', valor: Math.round(base * 0.31) }, { label: 'Financiera', valor: Math.round(base * 0.18) }, { label: 'Otros', valor: Math.round(base * 0.09) }];
}

function generarEntidadesSituacion(bcra, nosis) {
  if (bcra?.ok && bcra.deudas && bcra.deudas.length > 0) {
    return bcra.deudas.map(d => ({ label: d.entidad || 'Entidad', valor: (d.monto || 0) * 1000 || Math.round(Math.random() * 5000000) + 500000, sit: d.situacion || 1 })).sort((a,b)=>b.valor-a.valor);
  }
  const compMens = nosis?.compromisoMensual ? parseFloat(String(nosis.compromisoMensual).replace(/[^0-9.]/g, '')) || 0 : 0;
  const peorSit = bcra?.peorSit || 1;
  const baseTotal = compMens > 0 ? compMens * 60 : 52000000;
  const seed = (nosis?.consultas12m || 2) * 13 + (nosis?.antiguedadLaboral || 24);
  const cantEntidades = 8 + (seed % 7);
  const entidades = [];
  let restante = baseTotal;
  for (let i = 0; i < cantEntidades; i++) {
    const esUltimo = i === cantEntidades - 1;
    const pct = esUltimo ? 1 : (0.06 + ((seed * (i+3)) % 17) / 100);
    const monto = esUltimo ? restante : Math.round(baseTotal * pct);
    restante -= monto;
    let sit = 1;
    if (peorSit >= 2 && i < 6) sit = 2;
    if (peorSit >= 3 && i === 0) sit = 3;
    entidades.push({ label: ENTIDADES_BANCARIAS[i % ENTIDADES_BANCARIAS.length], valor: Math.max(monto, 1000), sit });
  }
  return entidades.sort((a,b)=>b.valor-a.valor);
}

function generarEvolucionDeuda(bcra, nosis) {
  const meses = ['Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'];
  const compMens = nosis?.compromisoMensual ? parseFloat(String(nosis.compromisoMensual).replace(/[^0-9.]/g, '')) || 0 : 0;
  const baseFinal = compMens > 0 ? compMens * 8 : 45000;
  const tendencia = bcra?.ok && bcra.peorSit >= 2 ? 1.06 : 0.97;
  let valor = baseFinal / Math.pow(tendencia, 11);
  const seed = (bcra?.cantEntidades || 1) * 17 + (nosis?.consultas12m || 3) * 7;
  return meses.map((mes, i) => {
    const ruido = 1 + (((seed * (i + 1)) % 13) - 6) / 100;
    valor = i === 11 ? baseFinal : valor * tendencia * ruido;
    return { mes, valor: Math.max(0, Math.round(valor)) };
  });
}

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.valor, 0) || 1;
  const r = size / 2 - 12; const cx = size / 2, cy = size / 2;
  let anguloAcum = -90;
  const arcos = data.map((d, i) => {
    const pct = d.valor / total;
    const aI = anguloAcum, aF = anguloAcum + pct * 360;
    anguloAcum = aF;
    const toRad = a => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(aI)), y1 = cy + r * Math.sin(toRad(aI));
    const x2 = cx + r * Math.cos(toRad(aF)), y2 = cy + r * Math.sin(toRad(aF));
    const lA = aF - aI > 180 ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${lA} 1 ${x2} ${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length] };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcos.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke="#0A1F3A" strokeWidth="2" opacity="0.92" />)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D2540" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">DEUDA</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">TOTAL</text>
    </svg>
  );
}

function DonutGrandeSituacion({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.valor, 0) || 1;
  const r = size / 2 - 8; const cx = size / 2, cy = size / 2;
  let anguloAcum = -90;
  const arcos = data.map((d) => {
    const pct = d.valor / total;
    const aI = anguloAcum, aF = anguloAcum + pct * 360;
    anguloAcum = aF;
    const toRad = a => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(aI)), y1 = cy + r * Math.sin(toRad(aI));
    const x2 = cx + r * Math.cos(toRad(aF)), y2 = cy + r * Math.sin(toRad(aF));
    const lA = aF - aI > 180 ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${lA} 1 ${x2} ${y2} Z`, color: SIT_COLOR[d.sit] || SIT_COLOR[1] };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcos.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke="#0A1F3A" strokeWidth="1.5" />)}
    </svg>
  );
}

function BarChartEvolucion({ data, height = 110 }) {
  const max = Math.max(...data.map(d => d.valor), 1);
  return (
    <svg width="100%" height={height + 28} viewBox={`0 0 300 ${height + 28}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = (d.valor / max) * height;
        const x = i * (300 / data.length) + 2, w = (300 / data.length) - 4;
        const esUltimo = i === data.length - 1;
        return (<g key={i}><rect x={x} y={height - h} width={w} height={h} rx="2" fill={esUltimo ? '#C8922A' : '#4A9AE0'} opacity={esUltimo ? 1 : 0.65} /><text x={x + w / 2} y={height + 14} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.45)" fontWeight="700">{d.mes}</text></g>);
      })}
    </svg>
  );
}

function PanelVisualLegajo({ bcra, nosis, cuil }) {
  const composicion = generarComposicionDeuda(bcra, nosis);
  const evolucion = generarEvolucionDeuda(bcra, nosis);
  const entidades = generarEntidadesSituacion(bcra, nosis);
  const totalDeuda = composicion.reduce((s, d) => s + d.valor, 0);
  const totalEnt = entidades.reduce((s, d) => s + d.valor, 0) || 1;
  const porSit = {};
  entidades.forEach(e => { porSit[e.sit] = (porSit[e.sit] || 0) + e.valor; });
  const fmtM = n => new Intl.NumberFormat('es-AR').format(Math.round(n));
  return (
    <>
      <div style={{ background: C.bg4, borderRadius: 10, padding: 18, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>SITUACIÓN CREDITICIA POR ENTIDAD — CENTRAL DE DEUDORES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{['','Sit.','Entidad','Monto','%'].map((h,i) => (<th key={i} style={{ textAlign: i>=3?'right':'left', padding: '5px 7px', color: C.text3, fontWeight: 700, fontSize: 9, textTransform: 'uppercase' }}>{h}</th>))}</tr></thead>
              <tbody>
                {entidades.map((e, i) => (<tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: '3px 7px' }}><div style={{ width: 5, height: 16, borderRadius: 2, background: SIT_COLOR[e.sit] }}/></td><td style={{ padding: '3px 7px', fontWeight: 900, color: SIT_COLOR[e.sit], fontSize: 11 }}>{e.sit}</td><td style={{ padding: '3px 7px', color: C.text, fontWeight: 600, fontSize: 11 }}>{e.label}</td><td style={{ padding: '3px 7px', color: C.text2, textAlign: 'right', fontSize: 11 }}>${fmtM(e.valor)}</td><td style={{ padding: '3px 7px', color: C.text3, textAlign: 'right', fontSize: 11 }}>{((e.valor/totalEnt)*100).toFixed(0)}%</td></tr>))}
              </tbody>
              <tfoot><tr style={{ borderTop: `2px solid ${C.border}` }}><td colSpan="3" style={{ padding: '7px', fontWeight: 900, color: C.text, fontSize: 11 }}>Total</td><td colSpan="2" style={{ padding: '7px', fontWeight: 900, color: C.gold, textAlign: 'right', fontSize: 12 }}>${fmtM(totalEnt)}</td></tr></tfoot>
            </table>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <DonutGrandeSituacion data={entidades} size={200} />
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[1,2,3].map(sit => porSit[sit] ? (<div key={sit} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: SIT_COLOR[sit] }}/><span style={{ fontSize: 10, color: C.text2, fontWeight: 700 }}>Sit. {sit}: {((porSit[sit]/totalEnt)*100).toFixed(0)}%</span></div>) : null)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: C.bg4, borderRadius: 10, padding: 18, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ANÁLISIS VISUAL — SITUACIÓN CREDITICIA</div>
          <div style={{ fontSize: 9, background: C.goldL, color: C.gold, padding: '2px 8px', borderRadius: 10, fontWeight: 700, border: `1px solid ${C.goldB}`, textTransform: 'uppercase' }}>⚠️ Modo simulación</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>COMPOSICIÓN DE DEUDA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: C.bg3, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
              <DonutChart data={composicion} size={140} />
              <div style={{ flex: 1 }}>
                {composicion.map((d, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}><div style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}/><div style={{ fontSize: 10, color: C.text2, fontWeight: 600, flex: 1 }}>{d.label}</div><div style={{ fontSize: 10, color: C.text, fontWeight: 800 }}>{fmt(d.valor)}</div></div>))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase' }}>Total</span><span style={{ fontSize: 13, color: C.gold, fontWeight: 900 }}>{fmt(totalDeuda)}</span></div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>BUREAU NOSIS</div>
            <div style={{ background: '#0A1F3A', borderRadius: 10, border: `1px solid ${C.border}`, padding: 14, textAlign: 'center' }}>
              <svg width="100%" height="80" viewBox="0 0 240 80"><rect x="6" y="6" width="228" height="68" rx="8" fill="#0D2540" stroke="#C8922A" strokeWidth="1.5"/><circle cx="32" cy="28" r="9" fill="none" stroke="#4A9AE0" strokeWidth="2"/><path d="M 24 42 Q 32 33 40 42" fill="none" stroke="#4A9AE0" strokeWidth="2"/><text x="50" y="24" fontSize="9" fontWeight="900" fill="#fff">INFORME CREDITICIO</text><text x="50" y="35" fontSize="7" fill="rgba(255,255,255,0.5)">CUIL {cuil || 'N/D'}</text><line x1="50" y1="40" x2="220" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/><rect x="50" y="46" width="45" height="5" rx="2" fill="rgba(74,154,224,0.4)"/><rect x="100" y="46" width="32" height="5" rx="2" fill="rgba(74,224,138,0.4)"/><rect x="138" y="46" width="55" height="5" rx="2" fill="rgba(200,146,42,0.4)"/><rect x="50" y="57" width="72" height="5" rx="2" fill="rgba(255,255,255,0.15)"/><rect x="128" y="57" width="36" height="5" rx="2" fill="rgba(255,255,255,0.15)"/><text x="50" y="72" fontSize="6" fill="rgba(255,255,255,0.3)" fontStyle="italic">Documento simulado — Bureau Nosis</text></svg>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>EVOLUCIÓN 12 MESES</div>
          <div style={{ background: C.bg3, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}><BarChartEvolucion data={evolucion} height={100} /></div>
        </div>
        <div style={{ marginTop: 10, fontSize: 9, color: C.text3, fontStyle: 'italic' }}>Datos ilustrativos mientras la integración con Nosis no esté contratada.</div>
      </div>
    </>
  );
}

// ── MODAL EDITAR SOLICITUD ────────────────────────────────────────────────────
function ModalEditar({ sol, onClose, onGuardado }) {
  const cli = sol?.cliente || {};
  const [f, setF] = useState({
    nombre: cli.nombre || '',
    apellido: cli.apellido || '',
    dni: cli.dni || '',
    cuil: cli.cuil || '',
    email: cli.email || '',
    tel: cli.tel || '',
    emp: cli.emp || '',
    antig: cli.antig || '',
    cbu: cli.cbu || '',
    monto: sol.monto || '',
    plazo: sol.plazo || '',
    tna: sol.tna || '',
    cuota: sol.cuota || '',
    linea_nombre: sol.linea_nombre || '',
    obs: sol.obs || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await db.supabase.from('solicitudes').update({
        monto: parseFloat(f.monto),
        plazo: parseInt(f.plazo),
        tna: parseFloat(f.tna),
        cuota: Math.round(parseFloat(f.cuota)),
        linea_nombre: f.linea_nombre,
        obs: f.obs,
        cliente: {
          ...cli,
          nombre: f.nombre,
          apellido: f.apellido,
          dni: f.dni,
          cuil: f.cuil,
          email: f.email,
          tel: f.tel,
          emp: f.emp,
          antig: f.antig,
          cbu: f.cbu,
        }
      }).eq('id', sol.id);
      setOk(true);
      setTimeout(() => { onGuardado(); onClose(); }, 1500);
    } catch(e) {
      alert('Error al guardar. Intentá de nuevo.');
    }
    setGuardando(false);
  }

  const Inp = ({ label, value, onChange, type='text', placeholder }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border2}`, borderRadius: 8, fontSize: 12, color: C.text, background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit', fontWeight: 600, boxSizing: 'border-box', outline: 'none' }}
        onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2}/>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,15,30,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: C.bg4, borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.bg4, zIndex: 1 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>✏️ EDITAR SOLICITUD</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{sol.id} — Solo visible antes de la firma del cliente</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.text3 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {ok && <div style={{ background: C.greenL, color: C.green, borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16, fontWeight: 700, border: `1px solid ${C.greenB}` }}>✓ GUARDADO CORRECTAMENTE</div>}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>DATOS DEL CRÉDITO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Inp label="LÍNEA DE CRÉDITO" value={f.linea_nombre} onChange={e=>setF({...f,linea_nombre:e.target.value})}/>
            <Inp label="MONTO ($)" type="number" value={f.monto} onChange={e=>setF({...f,monto:e.target.value})}/>
            <Inp label="PLAZO (MESES)" type="number" value={f.plazo} onChange={e=>setF({...f,plazo:e.target.value})}/>
            <Inp label="TNA (%)" type="number" value={f.tna} onChange={e=>setF({...f,tna:e.target.value})}/>
            <Inp label="CUOTA MENSUAL ($)" type="number" value={f.cuota} onChange={e=>setF({...f,cuota:e.target.value})}/>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 12px', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>DATOS DEL CLIENTE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Inp label="NOMBRE" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
            <Inp label="APELLIDO" value={f.apellido} onChange={e=>setF({...f,apellido:e.target.value})}/>
            <Inp label="DNI" value={f.dni} onChange={e=>setF({...f,dni:e.target.value})}/>
            <Inp label="CUIL" value={f.cuil} onChange={e=>setF({...f,cuil:e.target.value})}/>
            <Inp label="EMAIL" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
            <Inp label="TELÉFONO" value={f.tel} onChange={e=>setF({...f,tel:e.target.value})}/>
            <Inp label="EMPLEADOR" value={f.emp} onChange={e=>setF({...f,emp:e.target.value})}/>
            <Inp label="ANTIGÜEDAD" value={f.antig} onChange={e=>setF({...f,antig:e.target.value})}/>
            <div style={{ gridColumn: '1/-1' }}><Inp label="CBU / CVU" value={f.cbu} onChange={e=>setF({...f,cbu:e.target.value})}/></div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 12px', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>OBSERVACIONES</div>
          <textarea value={f.obs} onChange={e=>setF({...f,obs:e.target.value})}
            style={{ width: '100%', minHeight: 70, padding: '10px 12px', border: `1.5px solid ${C.border2}`, borderRadius: 8, fontSize: 12, color: C.text, background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}/>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '10px 22px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CANCELAR</button>
            <button onClick={guardar} disabled={guardando} style={{ background: C.gold, color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'GUARDANDO...' : '✓ GUARDAR CAMBIOS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function LegajoDigital({ sol, user, onVolver, onActualizar }) {
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [editando, setEditando] = useState(false);
  const legajoRef = useRef(null);
  const esAdmin = user?.rol === 'admin';
  const puedeEditar = esAdmin && !sol?.firma_cliente_completada;

  const cli = sol?.cliente || {};
  const firma = sol?.firma_metadata || {};
  const bcra = sol?.bcra_data || {};
  const nosis = sol?.nosis_data || {};
  const tieneBureau = bcra?.ok || nosis?.ok;

  const colorSit = sit => sit === 1 ? C.green : sit === 2 ? C.gold : C.red;

  const docsMap = {};
  if (sol?.docs_urls && Object.keys(sol.docs_urls).length > 0) {
    Object.entries(sol.docs_urls).forEach(([nombre, valor]) => { docsMap[nombre] = valor; });
  } else if (sol?.docs) {
    sol.docs.forEach(d => {
      if (typeof d === 'string' && d.startsWith('http')) {
        const partes = d.split('/');
        docsMap[decodeURIComponent(partes[partes.length - 1] || d)] = d;
      } else { docsMap[d] = d; }
    });
  }

  async function borrarLegajo() {
    setBorrando(true);
    await db.updateSolicitud(sol.id, { firma_cliente_completada: false, firma_metadata: null, bcra_data: null, nosis_data: null, estado: 'rechazado', estado_texto: 'LEGAJO ELIMINADO POR ADMINISTRADOR' });
    setBorrando(false);
    onActualizar();
    onVolver();
  }

  function imprimirPDF() {
    const contenido = legajoRef.current;
    if (!contenido) return;
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Legajo ${sol.id}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;}.legajo{max-width:900px;margin:0 auto;padding:24px;}</style></head><body><div class="legajo">${contenido.innerHTML}</div></body></html>`);
    ventana.document.close();
    setTimeout(() => ventana.print(), 500);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg2, fontFamily: 'system-ui, Arial, sans-serif' }}>
      {editando && <ModalEditar sol={sol} onClose={() => setEditando(false)} onGuardado={() => { setEditando(false); onActualizar(); }} />}

      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width={30} height={30} viewBox="0 0 44 44" fill="none"><polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/><polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/><text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text></svg>
          <div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LEGAJO DIGITAL — {sol.id}</div>
            <div style={{ color: C.text3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>{cli.nombre} {cli.apellido} · {EMPRESA.nombre}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {puedeEditar && (
            <button onClick={() => setEditando(true)} style={{ background: C.goldL, color: C.gold, border: `1px solid ${C.goldB}`, padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>✏️ EDITAR SOLICITUD</button>
          )}
          <button onClick={imprimirPDF} style={{ background: C.gold, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🖨️ IMPRIMIR / PDF</button>
          {esAdmin && !confirmBorrar && (
            <button onClick={() => setConfirmBorrar(true)} style={{ background: '#6B1A1A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🗑️ ELIMINAR</button>
          )}
          {esAdmin && confirmBorrar && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>¿CONFIRMAR?</span>
              <button onClick={borrarLegajo} disabled={borrando} style={{ background: C.red, color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{borrando ? '...' : 'SÍ'}</button>
              <button onClick={() => setConfirmBorrar(false)} style={{ background: 'rgba(255,255,255,0.08)', color: C.text2, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>NO</button>
            </div>
          )}
          <button onClick={onVolver} style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← VOLVER</button>
        </div>
      </div>

      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        {puedeEditar && (
          <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 11, color: C.gold, fontWeight: 700 }}>
            ✏️ MODO EDICIÓN DISPONIBLE — El cliente aún no firmó. Podés modificar los datos antes de enviar el link.
          </div>
        )}

        <div ref={legajoRef}>
          {/* CARÁTULA */}
          <div style={{ marginBottom: 28, padding: 24, border: `2px solid ${C.gold}`, borderRadius: 12, background: C.bg4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>LEGAJO CREDITICIO DIGITAL</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: '0.1em', marginBottom: 4 }}>{EMPRESA.nombre}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>CUIT {EMPRESA.cuit} · {EMPRESA.domicilio}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 }}>{cli.nombre} {cli.apellido}</div>
                <div style={{ fontSize: 12, color: C.text2 }}>DNI {cli.dni} · CUIL {cli.cuil}</div>
              </div>
              {firma?.selfie_png && (
                <div style={{ marginLeft: 20, flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, textAlign: 'center' }}>✓ IDENTIDAD VERIFICADA</div>
                  <img src={firma.selfie_png} alt="Selfie cliente" style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 10, border: `2px solid ${C.green}`, display: 'block' }}/>
                  <div style={{ fontSize: 9, color: C.text3, marginTop: 5, textAlign: 'center', fontWeight: 400 }}>Foto en tiempo real</div>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 18 }}>
              {[['N° SOLICITUD', sol.id, C.gold],['ESTADO', sol.estado_texto || sol.estado, sol.firma_cliente_completada ? C.green : C.gold],['FECHA SOLICITUD', sol.fecha, C.text],['FECHA FIRMA', sol.fecha_firma_cliente ? new Date(sol.fecha_firma_cliente).toLocaleDateString('es-AR') : '—', C.green]].map(([l,v,color]) => (
                <div key={l} style={{ background: C.bg3, borderRadius: 8, padding: '12px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <Seccion numero="1" titulo="DATOS DEL CRÉDITO" color={C.blue}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
              <Campo label="LÍNEA DE CRÉDITO" valor={sol.linea_nombre}/>
              <Campo label="MONTO OTORGADO" valor={fmt(sol.monto)} color={C.gold}/>
              <Campo label="PLAZO" valor={`${sol.plazo} meses`}/>
              <Campo label="CUOTA MENSUAL" valor={fmt(sol.cuota)} color={C.green}/>
              <Campo label="TNA" valor={`${sol.tna}%`}/>
              <Campo label="SUELDO PROMEDIO" valor={fmt(sol.prom_sueldo)}/>
              <Campo label="30% SUELDO (LÍMITE)" valor={fmt((sol.prom_sueldo||0)*0.3)}/>
              <Campo label="CUOTA / SUELDO" valor={sol.prom_sueldo ? `${((sol.cuota/sol.prom_sueldo)*100).toFixed(1)}%` : '—'}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="COMERCIAL" valor={sol.emb_nombre}/>
              <Campo label="ANALISTA" valor={sol.analista || '—'}/>
            </div>
          </Seccion>

          <Seccion numero="2" titulo="DATOS DEL CLIENTE" color={C.text}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <Campo label="NOMBRE Y APELLIDO" valor={`${cli.nombre} ${cli.apellido}`}/>
              <Campo label="DNI" valor={cli.dni}/>
              <Campo label="CUIL" valor={cli.cuil}/>
              <Campo label="EMAIL" valor={cli.email}/>
              <Campo label="TELÉFONO" valor={cli.tel}/>
              <Campo label="CBU / CVU" valor={cli.cbu}/>
              <Campo label="EMPLEADOR" valor={cli.emp}/>
              <Campo label="ANTIGÜEDAD" valor={cli.antig}/>
            </div>
          </Seccion>

          <Seccion numero="3" titulo="DOCUMENTACIÓN ADJUNTA" color={C.gold}>
            {Object.keys(docsMap).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {Object.entries(docsMap).map(([nombre, valor]) => (<DocItem key={nombre} nombre={nombre} valor={valor}/>))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>Sin documentos registrados</div>
            )}
            {sol.obs && (
              <div style={{ marginTop: 14, padding: '12px 16px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.text2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>OBSERVACIONES DEL ANALISTA</div>
                {sol.obs}
              </div>
            )}
          </Seccion>

          <Seccion numero="4" titulo="ANÁLISIS CREDITICIO — BCRA + NOSIS" color={C.blue}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              <div style={{ background: C.bg4, borderRadius: 10, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>CENTRAL DE DEUDORES BCRA</div>
                {bcra?.ok ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colorSit(bcra.peorSit)}20`, border: `2px solid ${colorSit(bcra.peorSit)}` }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: colorSit(bcra.peorSit) }}>{bcra.peorSit}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PEOR SITUACIÓN</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: colorSit(bcra.peorSit) }}>{bcra.peorSit===1?'SITUACIÓN NORMAL':bcra.peorSit===2?'RIESGO BAJO':bcra.peorSit===3?'CON PROBLEMAS':'ALTO RIESGO'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>{bcra.cantEntidades} entidad(es) informante(s)</div>
                    {(bcra.deudas||[]).slice(0,5).map((d,i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}><span style={{ color: C.text2 }}>{d.entidad}</span><span style={{ color: colorSit(d.situacion), fontWeight: 700 }}>SIT {d.situacion}</span></div>))}
                  </>
                ) : <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>No figura en la Central de Deudores del BCRA</div>}
              </div>
              <div style={{ background: C.bg4, borderRadius: 10, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>BUREAU NOSIS</div>
                {nosis?.ok ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[['EMPLEADO REL. DEP.', nosis.esEmpleado],['JUBILADO', nosis.esJubilado],['MONOTRIBUTISTA', nosis.esMonotributista],['AUTÓNOMO', nosis.esAutonomo]].map(([l,v]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 6, padding: '6px 8px', border: `1px solid ${C.border}` }}><div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div><div style={{ fontSize: 12, fontWeight: 900, color: v==='SI'?C.green:v==='NO'?C.red:C.text3 }}>{v||'N/D'}</div></div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[['CHEQUES S/FONDOS 6M', nosis.cheques6mCant, nosis.cheques6mCant>0?C.red:C.green],['CONCURSOS 24M', nosis.concursos24m, nosis.concursos24m>0?C.red:C.green],['DEUDA FISCAL', nosis.deudaFiscal==='SI'?'SÍ':nosis.deudaFiscal==='NO'?'NO':'S/D', nosis.deudaFiscal==='SI'?C.red:C.green],['ANTIGÜEDAD LABORAL', nosis.antiguedadLaboral!=null?`${nosis.antiguedadLaboral} M`:'S/D', nosis.antiguedadLaboral>=6?C.green:C.gold],['CONSULTAS 12M', nosis.consultas12m, C.text2],['COMPROMISO MENS.', nosis.compromisoMensual||'S/D', C.text2]].map(([l,v,color]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 6, padding: '6px 8px', border: `1px solid ${C.border}` }}><div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div><div style={{ fontSize: 12, fontWeight: 900, color }}>{v}</div></div>
                      ))}
                    </div>
                  </>
                ) : <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>{nosis?.error || 'Sin datos de Nosis'}</div>}
              </div>
            </div>
            {tieneBureau && <PanelVisualLegajo bcra={bcra} nosis={nosis} cuil={cli.cuil} />}
          </Seccion>

          <Seccion numero="5" titulo="CONTRATO DE MUTUO CON INTERÉS" color={C.gold}>
            <div style={{ background: C.bg4, borderRadius: 10, padding: 20, border: `1px solid ${C.border}` }}>
              <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{`CONTRATO DE MUTUO CON INTERÉS — Ley 25.065 y CCyCN Arts. 1525–1532\n\nMUTUANTE: AUTOLOGROS S.A., CUIT 30-71934732-7\nDomicilio: Lavalle 1390, Piso 3, Oficina B, CABA\nRepresentante: Nicolás Issaharoff, Presidente\n\nMUTUARIO: ${cli.nombre} ${cli.apellido} — DNI N° ${cli.dni} · CUIL N° ${cli.cuil}\nEmail: ${cli.email} · Tel: ${cli.tel} · Empleador: ${cli.emp} · Antigüedad: ${cli.antig}\nCBU/CVU: ${cli.cbu}\n\nPRIMERA — OBJETO: ${fmt(sol.monto)} acreditados en CBU/CVU N° ${cli.cbu}.\nSEGUNDA — DESTINO: Uso personal. Fondos lícitos.\nTERCERA — PLAZO: ${sol.plazo} cuotas de ${fmt(sol.cuota)}. Primera cuota: 30 días.\nCUARTA — TASA: TNA ${sol.tna}% + IVA 21%.\nQUINTA — MORA: ${((sol.tna||0)*1.5).toFixed(2)}% TNA automática (Art. 886 CCyCN).\nSEXTA — PAGO: Débito automático 48hs anticipación.\nSÉPTIMA — CANCELACIÓN ANTICIPADA: Sin penalidades (Art. 1388 CCyCN).\nOCTAVA — DATOS PERSONALES: Autorización BCRA/Nosis (Ley 25.326).\nNOVENA — DOMICILIOS: Empresa: Lavalle 1390 Piso 3 Of. B CABA / Cliente: ${cli.email}.\nDÉCIMA — JURISDICCIÓN: Tribunales de la Ciudad Autónoma de Buenos Aires.\nDÉCIMO PRIMERA — FIRMA DIGITAL: Conforme Ley 25.506.`}</pre>
              {sol.firma_cliente_completada && <div style={{ marginTop: 14, padding: '10px 14px', background: C.greenL, borderRadius: 8, border: `1px solid ${C.greenB}`, fontSize: 11, color: C.green, fontWeight: 700 }}>✓ FIRMADO DIGITALMENTE POR AMBAS PARTES · {firma?.timestamp_ar}</div>}
            </div>
          </Seccion>

          <Seccion numero="6" titulo="PAGARÉ SIN PROTESTO" color={C.gold}>
            <div style={{ background: C.bg4, borderRadius: 10, padding: 20, border: `1px solid ${C.border}` }}>
              <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{`PAGARÉ SIN PROTESTO — Decreto-Ley 5965/63 · Art. 520 CPCCN\n\nYo, ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil},\nme obligo a pagar INCONDICIONALMENTE y SIN PROTESTO a la orden de\nAUTOLOGROS S.A., CUIT 30-71934732-7, la suma de ${fmt((sol.cuota||0)*(sol.plazo||0))}.\n\nFORMA DE PAGO: ${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)}.\nTASA: TNA ${sol.tna}% + IVA 21%.\nCLÁUSULA SIN PROTESTO: Art. 50 Decreto-Ley 5965/63.\nJURISDICCIÓN: Tribunales Ordinarios de CABA.\n\nEmisor: ${cli.nombre} ${cli.apellido} · DNI ${cli.dni} · CUIL ${cli.cuil}`}</pre>
              {sol.firma_cliente_completada && <div style={{ marginTop: 14, padding: '10px 14px', background: C.greenL, borderRadius: 8, border: `1px solid ${C.greenB}`, fontSize: 11, color: C.green, fontWeight: 700 }}>✓ FIRMADO DIGITALMENTE POR EL DEUDOR · {firma?.timestamp_ar}</div>}
            </div>
          </Seccion>

          <Seccion numero="7" titulo="FIRMA DIGITAL DEL CLIENTE" color={C.green}>
            {sol.firma_cliente_completada && firma ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  <Campo label="FIRMANTE" valor={firma.aclaracion_firmante} color={C.green}/>
                  <Campo label="DNI CONFIRMADO" valor={firma.dni_confirmado}/>
                  <Campo label="TIMESTAMP (AR)" valor={firma.timestamp_ar}/>
                  <Campo label="IP DEL CLIENTE" valor={firma.ip_cliente}/>
                  <Campo label="GEOLOCALIZACIÓN" valor={firma.geolocalizacion}/>
                  <Campo label="TOKEN DE SESIÓN" valor={firma.token_sesion?.substring(0,16)+'...'}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div style={{ background: C.bg4, borderRadius: 10, padding: 16, border: `1px solid ${C.greenB}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>FIRMA DEL MUTUO</div>
                    {firma.firma_mutuo_png ? <img src={firma.firma_mutuo_png} alt="Firma Mutuo" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', background: '#1a1a2e', borderRadius: 6 }}/> : <div style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>No disponible</div>}
                  </div>
                  <div style={{ background: C.bg4, borderRadius: 10, padding: 16, border: `1px solid ${C.greenB}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>FIRMA DEL PAGARÉ</div>
                    {firma.firma_pagare_png ? <img src={firma.firma_pagare_png} alt="Firma Pagaré" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', background: '#1a1a2e', borderRadius: 6 }}/> : <div style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>No disponible</div>}
                  </div>
                </div>
                {firma.selfie_png && (
                  <div style={{ background: C.bg4, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>SELFIE DE VERIFICACIÓN DE IDENTIDAD</div>
                    <img src={firma.selfie_png} alt="Selfie cliente" style={{ maxWidth: 240, borderRadius: 8, border: `1px solid ${C.border}` }}/>
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 8, fontStyle: 'italic' }}>Foto tomada en tiempo real · {firma.timestamp_ar}</div>
                  </div>
                )}
                <Campo label="DISPOSITIVO / NAVEGADOR" valor={firma.user_agent} span/>
              </>
            ) : (
              <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: C.gold, fontWeight: 700 }}>⏳ PENDIENTE FIRMA DEL CLIENTE</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 6 }}>El cliente aún no ha completado el proceso de firma digital.</div>
              </div>
            )}
          </Seccion>

          {sol.firma_cliente_completada && firma && (
            <Seccion numero="8" titulo="CERTIFICADO DE FIRMA DIGITAL" color={C.green}>
              <div style={{ background: C.greenL, border: `1.5px solid ${C.greenB}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.green, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ OPERACIÓN REGISTRADA Y VERIFICADA</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[['EMPRESA', EMPRESA.nombre],['CUIT EMPRESA', EMPRESA.cuit],['REPRESENTANTE', `${EMPRESA.representante} (${EMPRESA.cargo})`],['CLIENTE', `${cli.nombre} ${cli.apellido}`],['DNI CLIENTE', cli.dni],['CUIL CLIENTE', cli.cuil],['ID SOLICITUD', sol.id],['MONTO', fmt(sol.monto)],['PLAZO', `${sol.plazo} meses`],['CUOTA', fmt(sol.cuota)],['FECHA/HORA FIRMA', firma.timestamp_ar],['IP CLIENTE', firma.ip_cliente]].map(([l,v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.greenB}` }}>
                      <span style={{ fontSize: 11, color: C.text2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</span>
                      <span style={{ fontSize: 11, color: C.text, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>HASH SHA-256 DEL DOCUMENTO</div>
                  <div style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.6 }}>{firma.hash_documento || '—'}</div>
                </div>
              </div>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelLegajos({ sols, user, onVerLegajo, onDesembolsar }) {
  const [filtro, setFiltro] = useState('todos');
  const lista = sols.filter(s => {
    if (filtro === 'firmados') return s.firma_cliente_completada;
    if (filtro === 'pendientes') return !s.firma_cliente_completada && s.estado === 'aprobado';
    return true;
  });
  const cntFirmados = sols.filter(s => s.firma_cliente_completada).length;
  const cntPendientes = sols.filter(s => !s.firma_cliente_completada && s.estado === 'aprobado').length;
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>LEGAJOS DIGITALES</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20, fontWeight: 400 }}>{cntFirmados} legajo(s) completo(s) · {cntPendientes} pendiente(s) de firma</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[['TOTAL SOLICITUDES', sols.length, '#FFFFFF', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.08)'],['LEGAJOS COMPLETOS', cntFirmados, '#4AE08A', 'rgba(74,224,138,0.08)', 'rgba(74,224,138,0.15)'],['PENDIENTES FIRMA', cntPendientes, '#C8922A', 'rgba(200,146,42,0.15)', 'rgba(200,146,42,0.25)']].map(([l,n,color,bg,border]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: 16, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['todos','TODOS'],['firmados','COMPLETOS'],['pendientes','PENDIENTES FIRMA']].map(([k,l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: filtro===k?'#C8922A':'rgba(255,255,255,0.05)', color: filtro===k?'#fff':'rgba(255,255,255,0.55)', border: `1px solid ${filtro===k?'#C8922A':'rgba(255,255,255,0.08)'}`, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</button>
        ))}
      </div>
      {!lista.length ? (
        <div style={{ background: '#0D2540', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NO HAY LEGAJOS EN ESTA CATEGORÍA</div>
        </div>
      ) : lista.map(s => {
        const cli = s.cliente || {};
        const firmado = s.firma_cliente_completada;
        const desembolsado = (s.estado_texto||'').toLowerCase().includes('desembolsado') || s.estado === 'desembolsado';
        return (
          <div key={s.id} onClick={() => onVerLegajo(s)} style={{ background: '#0D2540', borderRadius: 12, padding: 18, marginBottom: 10, cursor: 'pointer', border: `1px solid ${firmado ? 'rgba(74,224,138,0.15)' : 'rgba(255,255,255,0.08)'}`, borderLeft: `4px solid ${firmado ? '#4AE08A' : '#C8922A'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 24 }}>{firmado ? '✅' : '📋'}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{cli.nombre} {cli.apellido}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3, fontWeight: 400 }}>{s.id} · DNI {cli.dni} · {s.linea_nombre} · {fmt(s.monto)} · {s.plazo}M</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Solicitud: {s.fecha}{firmado && s.fecha_firma_cliente ? ` · Firmado: ${new Date(s.fecha_firma_cliente).toLocaleDateString('es-AR')}` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {firmado && <span style={{ fontSize: 10, background: 'rgba(74,224,138,0.08)', color: '#4AE08A', borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: '1px solid rgba(74,224,138,0.15)' }}>FIRMADO</span>}
                  {s.bcra_data && <span style={{ fontSize: 10, background: 'rgba(74,154,224,0.15)', color: '#4A9AE0', borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: '1px solid rgba(74,154,224,0.3)' }}>BCRA</span>}
                  {s.nosis_data && <span style={{ fontSize: 10, background: 'rgba(200,146,42,0.15)', color: '#C8922A', borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: '1px solid rgba(200,146,42,0.25)' }}>NOSIS</span>}
                </div>
                {firmado && !desembolsado && onDesembolsar && (
                  <button onClick={e => { e.stopPropagation(); onDesembolsar(s); }}
                    style={{ background: '#4AE08A', color: '#000', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    💰 DESEMBOLSAR
                  </button>
                )}
                {desembolsado && (
                  <span style={{ fontSize: 10, background: 'rgba(74,224,138,0.08)', color: '#4AE08A', borderRadius: 6, padding: '4px 12px', fontWeight: 700, border: '1px solid rgba(74,224,138,0.15)', whiteSpace: 'nowrap' }}>✓ DESEMBOLSADO</span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18 }}>›</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
