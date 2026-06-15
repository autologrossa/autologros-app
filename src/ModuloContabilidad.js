// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO CONTABILIDAD — Plan de Cuentas, Asientos, Libro Diario, Mayor, Balance
// Archivo: src/ModuloContabilidad.js
// Acceso: Administrador únicamente
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { db } from './supabase';

const C = {
  bg0:'#030F1E', bg1:'#06172E', bg2:'#071829', bg3:'#0A1F3A', bg4:'#0D2540',
  border:'rgba(255,255,255,0.08)', border2:'rgba(255,255,255,0.12)',
  text:'#FFFFFF', text2:'rgba(255,255,255,0.55)', text3:'rgba(255,255,255,0.35)',
  gold:'#C8922A', goldL:'rgba(200,146,42,0.15)', goldB:'rgba(200,146,42,0.25)',
  blue:'#4A9AE0', green:'#4AE08A', greenL:'rgba(74,224,138,0.08)', greenB:'rgba(74,224,138,0.15)',
  red:'#E05050', redL:'rgba(224,80,80,0.08)', redB:'rgba(224,80,80,0.15)',
};

const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n||0);
const hoy = () => new Date().toISOString().split('T')[0];

function Card({children,style}){ return <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,...style}}>{children}</div>; }

const TIPO_COLORS = {
  activo: C.blue,
  pasivo: C.red,
  patrimonio: C.gold,
  ingreso: C.green,
  egreso: C.red,
};

const TIPO_LABELS = {
  activo: 'ACTIVO',
  pasivo: 'PASIVO',
  patrimonio: 'PATRIMONIO NETO',
  ingreso: 'INGRESOS',
  egreso: 'EGRESOS',
};

export default function ModuloContabilidad({ user }) {
  const [tab, setTab] = useState('dashboard');
  const [cuentas, setCuentas] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para nuevo asiento
  const [nuevoAsiento, setNuevoAsiento] = useState(false);
  const [asientoFecha, setAsientoFecha] = useState(hoy());
  const [asientoDesc, setAsientoDesc] = useState('');
  const [asientoRef, setAsientoRef] = useState('');
  const [asientoLineas, setAsientoLineas] = useState([
    { cuenta_id: '', debe: '', haber: '' },
    { cuenta_id: '', debe: '', haber: '' },
  ]);
  const [guardando, setGuardando] = useState(false);
  const [editandoAsiento, setEditandoAsiento] = useState(null);
  const [editLineas, setEditLineas] = useState([]);
  const [editDesc, setEditDesc] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editRef, setEditRef] = useState('');

  // Estados para nueva cuenta
  const [nuevaCuenta, setNuevaCuenta] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ codigo: '', nombre: '', tipo: '', categoria: '' });

  // Filtros
  const [filtroMayor, setFiltroMayor] = useState('');
  const [filtroDiarioDesde, setFiltroDiarioDesde] = useState('');
  const [filtroDiarioHasta, setFiltroDiarioHasta] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [{ data: c }, { data: a }, { data: l }] = await Promise.all([
      db.supabase.from('plan_cuentas').select('*').order('codigo'),
      db.supabase.from('asientos').select('*').order('fecha', { ascending: false }),
      db.supabase.from('asiento_lineas').select('*'),
    ]);
    setCuentas(c || []);
    setAsientos(a || []);
    setLineas(l || []);
    setLoading(false);
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  function saldoCuenta(cuentaId) {
    const cuenta = cuentas.find(c => c.id === cuentaId);
    if (!cuenta) return 0;
    const ls = lineas.filter(l => l.cuenta_id === cuentaId);
    const totalDebe = ls.reduce((a, l) => a + (l.debe || 0), 0);
    const totalHaber = ls.reduce((a, l) => a + (l.haber || 0), 0);
    // Activo/Egreso: saldo deudor (debe - haber)
    // Pasivo/Patrimonio/Ingreso: saldo acreedor (haber - debe)
    if (cuenta.tipo === 'activo' || cuenta.tipo === 'egreso') return totalDebe - totalHaber;
    return totalHaber - totalDebe;
  }

  function totalTipo(tipo) {
    return cuentas.filter(c => c.tipo === tipo).reduce((a, c) => a + saldoCuenta(c.id), 0);
  }

  const totalActivo = totalTipo('activo');
  const totalPasivo = totalTipo('pasivo');
  const totalPatrimonio = totalTipo('patrimonio');
  const totalIngresos = totalTipo('ingreso');
  const totalEgresos = totalTipo('egreso');
  const resultadoEjercicio = totalIngresos - totalEgresos;

  // ── Guardar asiento ───────────────────────────────────────────────────────
  async function guardarAsiento() {
    const lineasValidas = asientoLineas.filter(l => l.cuenta_id && (parseFloat(l.debe) > 0 || parseFloat(l.haber) > 0));
    const totalDebe = lineasValidas.reduce((a, l) => a + (parseFloat(l.debe) || 0), 0);
    const totalHaber = lineasValidas.reduce((a, l) => a + (parseFloat(l.haber) || 0), 0);

    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      alert(`El asiento no está balanceado. Debe: ${fmt(totalDebe)} / Haber: ${fmt(totalHaber)}`);
      return;
    }
    if (lineasValidas.length < 2) {
      alert('El asiento debe tener al menos 2 líneas');
      return;
    }

    setGuardando(true);
    try {
      const id = `AST-${Date.now()}`;
      await db.supabase.from('asientos').insert({
        id,
        fecha: asientoFecha,
        descripcion: asientoDesc,
        referencia: asientoRef || null,
        tipo: 'manual',
        usuario: user.nombre,
      });

      const lineasInsert = lineasValidas.map((l, i) => ({
        id: `LIN-${Date.now()}-${i}`,
        asiento_id: id,
        cuenta_id: l.cuenta_id,
        debe: parseFloat(l.debe) || 0,
        haber: parseFloat(l.haber) || 0,
      }));
      await db.supabase.from('asiento_lineas').insert(lineasInsert);

      setNuevoAsiento(false);
      setAsientoDesc('');
      setAsientoRef('');
      setAsientoLineas([{ cuenta_id: '', debe: '', haber: '' }, { cuenta_id: '', debe: '', haber: '' }]);
      await cargar();
    } catch(e) {
      alert('Error al guardar el asiento');
    }
    setGuardando(false);
  }

  // ── Eliminar asiento ─────────────────────────────────────────────────────
  async function eliminarAsiento(id) {
    if (!window.confirm('¿ELIMINAR ESTE ASIENTO? Esta acción no se puede deshacer.')) return;
    await db.supabase.from('asiento_lineas').delete().eq('asiento_id', id);
    await db.supabase.from('asientos').delete().eq('id', id);
    await cargar();
  }

  // ── Editar asiento ────────────────────────────────────────────────────────
  function abrirEdicion(a) {
    const ls = lineas.filter(l => l.asiento_id === a.id);
    setEditandoAsiento(a);
    setEditDesc(a.descripcion);
    setEditFecha(a.fecha);
    setEditRef(a.referencia || '');
    setEditLineas(ls.map(l => ({ ...l, debe: l.debe || '', haber: l.haber || '' })));
  }

  async function guardarEdicion() {
    if (!editDesc) return;
    const lineasValidas = editLineas.filter(l => l.cuenta_id && (parseFloat(l.debe) > 0 || parseFloat(l.haber) > 0));
    const totalDebe = lineasValidas.reduce((a,l) => a+(parseFloat(l.debe)||0), 0);
    const totalHaber = lineasValidas.reduce((a,l) => a+(parseFloat(l.haber)||0), 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      alert(`Asiento desbalanceado. Debe: ${totalDebe} / Haber: ${totalHaber}`);
      return;
    }
    // Actualizar cabecera
    await db.supabase.from('asientos').update({
      fecha: editFecha,
      descripcion: editDesc,
      referencia: editRef || null,
    }).eq('id', editandoAsiento.id);
    // Borrar líneas viejas y reinsertar
    await db.supabase.from('asiento_lineas').delete().eq('asiento_id', editandoAsiento.id);
    await db.supabase.from('asiento_lineas').insert(
      lineasValidas.map((l, i) => ({
        id: `LIN-EDIT-${Date.now()}-${i}`,
        asiento_id: editandoAsiento.id,
        cuenta_id: l.cuenta_id,
        debe: parseFloat(l.debe) || 0,
        haber: parseFloat(l.haber) || 0,
      }))
    );
    setEditandoAsiento(null);
    await cargar();
  }

  // ── Guardar cuenta ────────────────────────────────────────────────────────
  async function guardarCuenta() {
    const id = `cta-${Date.now()}`;
    await db.supabase.from('plan_cuentas').insert({
      id,
      codigo: cuentaForm.codigo,
      nombre: cuentaForm.nombre,
      tipo: cuentaForm.tipo,
      categoria: cuentaForm.categoria || 'corriente',
      activa: true,
    });
    setNuevaCuenta(false);
    setCuentaForm({ codigo: '', nombre: '', tipo: '', categoria: '' });
    await cargar();
  }

  // ── Imprimir ──────────────────────────────────────────────────────────────
  function imprimirBalance() {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Balance de Sumas y Saldos — AUTOLOGROS S.A.</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
      h1{font-size:16px;color:#C8922A;margin-bottom:4px}
      h2{font-size:12px;color:#333;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f0f0f0;padding:8px;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #C8922A;text-align:right}
      th:first-child,th:nth-child(2){text-align:left}
      td{padding:6px 8px;border-bottom:1px solid #e0e0e0;font-size:10px;text-align:right}
      td:first-child{text-align:left;font-weight:700;color:#8B6914}
      td:nth-child(2){text-align:left}
      .subtotal{background:#fff8e1;font-weight:900}
      .total{background:#f0f7f0;font-weight:900;font-size:11px}
      .pie{margin-top:24px;font-size:9px;color:#888;border-top:1px solid #e0e0e0;padding-top:8px;text-align:center}
    </style></head><body>
    <h1>AUTOLOGROS S.A. · CUIT 30-71934732-7</h1>
    <h2>BALANCE DE SUMAS Y SALDOS · Al ${new Date().toLocaleDateString('es-AR')}</h2>
    <table>
      <thead><tr>
        <th>Código</th><th>Cuenta</th><th>Tipo</th>
        <th>Total Debe</th><th>Total Haber</th><th>Saldo</th>
      </tr></thead>
      <tbody>
        ${['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo => {
          const cuentasTipo = cuentas.filter(c => c.tipo === tipo);
          if (!cuentasTipo.length) return '';
          const rows = cuentasTipo.map(c => {
            const ls = lineas.filter(l => l.cuenta_id === c.id);
            const td = ls.reduce((a,l) => a+(l.debe||0), 0);
            const th = ls.reduce((a,l) => a+(l.haber||0), 0);
            const saldo = saldoCuenta(c.id);
            return `<tr>
              <td>${c.codigo}</td>
              <td>${c.nombre}</td>
              <td style="text-align:center">${TIPO_LABELS[tipo]}</td>
              <td>${fmt(td)}</td>
              <td>${fmt(th)}</td>
              <td style="font-weight:900;color:${saldo>=0?'#1a6b3c':'#8b0000'}">${fmt(saldo)}</td>
            </tr>`;
          }).join('');
          const total = totalTipo(tipo);
          return rows + `<tr class="subtotal">
            <td colspan="5" style="text-align:right">SUBTOTAL ${TIPO_LABELS[tipo]}</td>
            <td style="color:${total>=0?'#1a6b3c':'#8b0000'}">${fmt(total)}</td>
          </tr>`;
        }).join('')}
        <tr class="total">
          <td colspan="5" style="text-align:right">RESULTADO DEL EJERCICIO</td>
          <td style="color:${resultadoEjercicio>=0?'#1a6b3c':'#8b0000'};font-size:13px">${fmt(resultadoEjercicio)}</td>
        </tr>
      </tbody>
    </table>
    <div class="pie">Generado el ${new Date().toLocaleString('es-AR')} por ${user.nombre} · AUTOLOGROS S.A. · Lavalle 1390, Piso 3, Of. B, CABA</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  function imprimirDiario() {
    const asientosFiltrados = asientos.filter(a => {
      if (filtroDiarioDesde && a.fecha < filtroDiarioDesde) return false;
      if (filtroDiarioHasta && a.fecha > filtroDiarioHasta) return false;
      return true;
    });
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Libro Diario — AUTOLOGROS S.A.</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
      h1{font-size:16px;color:#C8922A;margin-bottom:4px}
      h2{font-size:12px;color:#333;margin-bottom:16px}
      .asiento{margin-bottom:20px;page-break-inside:avoid;border:1px solid #e0e0e0;border-radius:6px;padding:12px}
      .asiento-header{display:flex;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e0e0e0}
      .asiento-id{font-weight:900;color:#C8922A}
      table{width:100%;border-collapse:collapse}
      th{font-size:9px;text-transform:uppercase;letter-spacing:0.06em;padding:5px 8px;text-align:right;border-bottom:1px solid #C8922A;color:#888}
      th:first-child,th:nth-child(2){text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:10px;text-align:right}
      td:first-child{text-align:left;color:#8B6914;font-weight:700}
      td:nth-child(2){text-align:left}
      .total-row{font-weight:900;background:#f8f8f8}
      .pie{margin-top:24px;font-size:9px;color:#888;border-top:1px solid #e0e0e0;padding-top:8px;text-align:center}
    </style></head><body>
    <h1>AUTOLOGROS S.A. · CUIT 30-71934732-7</h1>
    <h2>LIBRO DIARIO · ${filtroDiarioDesde||'Inicio'} al ${filtroDiarioHasta||new Date().toLocaleDateString('es-AR')}</h2>
    ${asientosFiltrados.map(a => {
      const ls = lineas.filter(l => l.asiento_id === a.id);
      const totalD = ls.reduce((x,l) => x+(l.debe||0), 0);
      const totalH = ls.reduce((x,l) => x+(l.haber||0), 0);
      return `<div class="asiento">
        <div class="asiento-header">
          <div><span class="asiento-id">${a.id}</span> · ${a.fecha} · ${a.descripcion}</div>
          <div style="font-size:10px;color:#888">${a.referencia||''} · ${a.usuario||''}</div>
        </div>
        <table>
          <thead><tr><th>Código</th><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead>
          <tbody>
            ${ls.map(l => {
              const c = cuentas.find(x => x.id === l.cuenta_id) || {};
              return `<tr>
                <td>${c.codigo||'—'}</td>
                <td>${c.nombre||'—'}</td>
                <td>${l.debe > 0 ? fmt(l.debe) : ''}</td>
                <td>${l.haber > 0 ? fmt(l.haber) : ''}</td>
              </tr>`;
            }).join('')}
            <tr class="total-row">
              <td colspan="2" style="text-align:right">TOTALES</td>
              <td>${fmt(totalD)}</td>
              <td>${fmt(totalH)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
    }).join('')}
    <div class="pie">Generado el ${new Date().toLocaleString('es-AR')} por ${user.nombre} · AUTOLOGROS S.A.</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const tabs = [
    ['dashboard','DASHBOARD'],
    ['plan','PLAN DE CUENTAS'],
    ['asientos','ASIENTOS'],
    ['diario','LIBRO DIARIO'],
    ['mayor','LIBRO MAYOR'],
    ['balance','BALANCE'],
  ];

  const cuentaSeleccionada = cuentas.find(c => c.id === filtroMayor);

  // ── Modal edición asiento ─────────────────────────────────────────────────
  if (editandoAsiento) return (
    <div style={{minHeight:'100vh',background:C.bg2,fontFamily:'system-ui,Arial,sans-serif',padding:28}}>
      <div style={{maxWidth:860,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
          <button onClick={()=>setEditandoAsiento(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3}}>←</button>
          <div style={{fontSize:16,fontWeight:900,color:C.gold,textTransform:'uppercase',letterSpacing:'0.06em'}}>
            EDITAR ASIENTO N° {String(editandoAsiento.numero||0).padStart(4,'0')}
          </div>
        </div>
        <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:28}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:'0 16px',marginBottom:20}}>
            {[['FECHA',editFecha,setEditFecha,'date'],['DESCRIPCIÓN',editDesc,setEditDesc,'text'],['REFERENCIA',editRef,setEditRef,'text']].map(([lbl,val,set,type])=>(
              <div key={lbl}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{lbl}</label>
                <input type={type} value={val} onChange={e=>set(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
              </div>
            ))}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:14}}>
            <thead>
              <tr>{['CUENTA','DEBE','HABER',''].map(h=><th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'8px 12px',textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {editLineas.map((l,i)=>(
                <tr key={i}>
                  <td style={{padding:'6px 8px'}}>
                    <select value={l.cuenta_id} onChange={e=>{const nl=[...editLineas];nl[i]={...nl[i],cuenta_id:e.target.value};setEditLineas(nl);}}
                      style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:12,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none'}}>
                      <option value="">SELECCIONAR...</option>
                      {['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo=>(
                        <optgroup key={tipo} label={TIPO_LABELS[tipo]}>
                          {cuentas.filter(c=>c.tipo===tipo&&c.activa).map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td style={{padding:'6px 8px'}}>
                    <input type="number" value={l.debe} onChange={e=>{const nl=[...editLineas];nl[i]={...nl[i],debe:e.target.value};setEditLineas(nl);}} placeholder="0.00"
                      style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:13,color:C.blue,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                  </td>
                  <td style={{padding:'6px 8px'}}>
                    <input type="number" value={l.haber} onChange={e=>{const nl=[...editLineas];nl[i]={...nl[i],haber:e.target.value};setEditLineas(nl);}} placeholder="0.00"
                      style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:13,color:C.gold,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                  </td>
                  <td style={{padding:'6px 8px',textAlign:'center'}}>
                    {editLineas.length > 2 && <button onClick={()=>setEditLineas(editLineas.filter((_,j)=>j!==i))} style={{background:C.redL,color:C.red,border:`1px solid ${C.redB}`,borderRadius:6,padding:'6px 10px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(()=>{
            const td=editLineas.reduce((a,l)=>a+(parseFloat(l.debe)||0),0);
            const th=editLineas.reduce((a,l)=>a+(parseFloat(l.haber)||0),0);
            const bal=Math.abs(td-th)<0.01;
            return td>0||th>0?<div style={{padding:'8px 14px',borderRadius:8,marginBottom:14,background:bal?C.greenL:C.redL,border:`1px solid ${bal?C.greenB:C.redB}`,fontSize:11,fontWeight:700,color:bal?C.green:C.red}}>{bal?'✓ ASIENTO BALANCEADO':`⚠️ DIFERENCIA: $${Math.abs(td-th).toFixed(2)}`}</div>:null;
          })()}
          <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
            <button onClick={()=>setEditLineas([...editLineas,{cuenta_id:'',debe:'',haber:''}])} style={{background:'rgba(255,255,255,0.05)',color:C.text2,border:`1px solid ${C.border}`,padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>+ LÍNEA</button>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditandoAsiento(null)} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>CANCELAR</button>
              <button onClick={guardarEdicion} style={{background:'#1A6B3C',color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>✓ GUARDAR CAMBIOS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,flexWrap:'wrap'}}>
        {tabs.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{padding:'8px 16px',borderRadius:20,fontSize:10,fontWeight:700,
              background:tab===k?C.gold:'rgba(255,255,255,0.05)',
              color:tab===k?'#fff':C.text2,
              border:`1px solid ${tab===k?C.gold:C.border}`,
              cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            {l}
          </button>
        ))}
        <button onClick={cargar} style={{padding:'8px 14px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.04)',color:C.text3,border:`1px solid ${C.border}`,cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>
          ↻ ACTUALIZAR
        </button>
      </div>

      {loading ? <div style={{textAlign:'center',padding:60,color:C.text3}}>CARGANDO...</div> : <>

      {/* ── DASHBOARD ── */}
      {tab==='dashboard'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>RESUMEN CONTABLE</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
            {[
              ['ACTIVO TOTAL', fmt(totalActivo), C.blue, 'rgba(74,154,224,0.08)', 'rgba(74,154,224,0.25)'],
              ['PASIVO TOTAL', fmt(totalPasivo), C.red, C.redL, C.redB],
              ['PATRIMONIO NETO', fmt(totalPatrimonio), C.gold, C.goldL, C.goldB],
              ['INGRESOS', fmt(totalIngresos), C.green, C.greenL, C.greenB],
              ['EGRESOS', fmt(totalEgresos), C.red, C.redL, C.redB],
              ['RESULTADO EJERCICIO', fmt(resultadoEjercicio), resultadoEjercicio>=0?C.green:C.red, resultadoEjercicio>=0?C.greenL:C.redL, resultadoEjercicio>=0?C.greenB:C.redB],
            ].map(([l,v,color,bg,border]) => (
              <div key={l} style={{background:bg,borderRadius:12,padding:20,border:`1px solid ${border}`}}>
                <div style={{fontSize:18,fontWeight:900,color,lineHeight:1,marginBottom:6}}>{v}</div>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Ecuación contable */}
          <Card style={{padding:20,marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>ECUACIÓN CONTABLE</div>
            <div style={{display:'flex',alignItems:'center',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
              {[
                ['ACTIVO', fmt(totalActivo), C.blue],
                ['=', null, C.text3],
                ['PASIVO', fmt(totalPasivo), C.red],
                ['+', null, C.text3],
                ['PATRIMONIO', fmt(totalPatrimonio), C.gold],
                ['+', null, C.text3],
                ['RESULTADO', fmt(resultadoEjercicio), resultadoEjercicio>=0?C.green:C.red],
              ].map(([l,v,color],i) => v===null ? (
                <span key={i} style={{fontSize:24,color,fontWeight:900}}>{l}</span>
              ) : (
                <div key={i} style={{textAlign:'center',background:C.bg3,borderRadius:10,padding:'12px 20px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:14,fontWeight:900,color}}>{v}</div>
                  <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:14,fontSize:11,color:Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1?C.green:C.red,fontWeight:700}}>
              {Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1 ? '✓ ECUACIÓN BALANCEADA' : '⚠️ ECUACIÓN DESBALANCEADA — REVISAR ASIENTOS'}
            </div>
          </Card>

          {/* Últimos asientos */}
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:12,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>ÚLTIMOS ASIENTOS</div>
            </div>
            {asientos.slice(0,5).map(a => {
              const ls = lineas.filter(l => l.asiento_id === a.id);
              const total = ls.reduce((x,l) => x+(l.debe||0), 0);
              return (
                <div key={a.id} style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{a.descripcion}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>N° {String(a.numero||0).padStart(4,'0')} · {a.id} · {a.fecha} · {a.usuario}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:C.gold}}>{fmt(total)}</div>
                </div>
              );
            })}
            {!asientos.length && <div style={{padding:30,textAlign:'center',color:C.text3,fontSize:12}}>Sin asientos registrados</div>}
          </Card>
        </div>
      )}

      {/* ── PLAN DE CUENTAS ── */}
      {tab==='plan'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>PLAN DE CUENTAS</div>
            <button onClick={()=>setNuevaCuenta(true)} style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              + NUEVA CUENTA
            </button>
          </div>

          {nuevaCuenta && (
            <Card style={{padding:24,marginBottom:20,border:`1px solid ${C.goldB}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.gold,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>NUEVA CUENTA</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0 16px'}}>
                {[
                  ['CÓDIGO', 'codigo', 'text', '1.6'],
                  ['NOMBRE', 'nombre', 'text', 'Ej: Gastos de Administración'],
                ].map(([lbl, key, type, ph]) => (
                  <div key={key} style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{lbl} *</label>
                    <input type={type} value={cuentaForm[key]} onChange={e=>setCuentaForm({...cuentaForm,[key]:e.target.value})} placeholder={ph}
                      style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
                  </div>
                ))}
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>TIPO *</label>
                  <select value={cuentaForm.tipo} onChange={e=>setCuentaForm({...cuentaForm,tipo:e.target.value})}
                    style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}>
                    <option value="">SELECCIONAR...</option>
                    {['activo','pasivo','patrimonio','ingreso','egreso'].map(t=><option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>CATEGORÍA</label>
                  <select value={cuentaForm.categoria} onChange={e=>setCuentaForm({...cuentaForm,categoria:e.target.value})}
                    style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}>
                    <option value="corriente">CORRIENTE</option>
                    <option value="neto">NETO</option>
                    <option value="resultado">RESULTADO</option>
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button onClick={()=>setNuevaCuenta(false)} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>CANCELAR</button>
                <button onClick={guardarCuenta} disabled={!cuentaForm.codigo||!cuentaForm.nombre||!cuentaForm.tipo}
                  style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!cuentaForm.codigo||!cuentaForm.nombre||!cuentaForm.tipo)?0.5:1}}>
                  GUARDAR CUENTA
                </button>
              </div>
            </Card>
          )}

          {['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo => {
            const cuentasTipo = cuentas.filter(c => c.tipo === tipo);
            if (!cuentasTipo.length) return null;
            return (
              <div key={tipo} style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:900,color:TIPO_COLORS[tipo],textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10,paddingBottom:6,borderBottom:`2px solid ${TIPO_COLORS[tipo]}`}}>
                  {TIPO_LABELS[tipo]}
                </div>
                {cuentasTipo.map(c => {
                  const saldo = saldoCuenta(c.id);
                  const ls = lineas.filter(l => l.cuenta_id === c.id);
                  const totalD = ls.reduce((a,l) => a+(l.debe||0), 0);
                  const totalH = ls.reduce((a,l) => a+(l.haber||0), 0);
                  return (
                    <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',marginBottom:6,background:C.bg3,borderRadius:8,border:`1px solid ${C.border}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <span style={{fontSize:11,fontWeight:900,color:TIPO_COLORS[tipo],minWidth:30}}>{c.codigo}</span>
                        <span style={{fontSize:12,fontWeight:700,color:C.text}}>{c.nombre}</span>
                        {!c.activa && <span style={{fontSize:9,color:C.text3,background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'2px 8px',border:`1px solid ${C.border}`}}>INACTIVA</span>}
                      </div>
                      <div style={{display:'flex',gap:20,alignItems:'center'}}>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>DEBE</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.text}}>{fmt(totalD)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>HABER</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.text}}>{fmt(totalH)}</div>
                        </div>
                        <div style={{textAlign:'right',minWidth:100}}>
                          <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>SALDO</div>
                          <div style={{fontSize:13,fontWeight:900,color:saldo>=0?TIPO_COLORS[tipo]:C.red}}>{fmt(saldo)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{display:'flex',justifyContent:'flex-end',padding:'6px 16px',fontSize:11,fontWeight:900,color:TIPO_COLORS[tipo]}}>
                  SUBTOTAL: {fmt(totalTipo(tipo))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ASIENTOS ── */}
      {tab==='asientos'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>ASIENTOS CONTABLES</div>
            <button onClick={()=>setNuevoAsiento(true)} style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              + NUEVO ASIENTO
            </button>
          </div>

          {nuevoAsiento && (
            <Card style={{padding:24,marginBottom:24,border:`1px solid ${C.goldB}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.gold,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>NUEVO ASIENTO MANUAL</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:'0 16px',marginBottom:16}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>FECHA *</label>
                  <input type="date" value={asientoFecha} onChange={e=>setAsientoFecha(e.target.value)}
                    style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>DESCRIPCIÓN *</label>
                  <input type="text" value={asientoDesc} onChange={e=>setAsientoDesc(e.target.value)} placeholder="Concepto del asiento..."
                    style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>REFERENCIA</label>
                  <input type="text" value={asientoRef} onChange={e=>setAsientoRef(e.target.value)} placeholder="N° factura, comprobante..."
                    style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
                </div>
              </div>

              <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
                <thead>
                  <tr>
                    {['CUENTA','DEBE','HABER',''].map(h=>(
                      <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'8px 12px',textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asientoLineas.map((l, i) => (
                    <tr key={i}>
                      <td style={{padding:'6px 8px'}}>
                        <select value={l.cuenta_id} onChange={e=>{const nl=[...asientoLineas];nl[i]={...nl[i],cuenta_id:e.target.value};setAsientoLineas(nl);}}
                          style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:12,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none'}}>
                          <option value="">SELECCIONAR CUENTA...</option>
                          {['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo => (
                            <optgroup key={tipo} label={TIPO_LABELS[tipo]}>
                              {cuentas.filter(c=>c.tipo===tipo&&c.activa).map(c=>(
                                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td style={{padding:'6px 8px'}}>
                        <input type="number" value={l.debe} onChange={e=>{const nl=[...asientoLineas];nl[i]={...nl[i],debe:e.target.value,haber:e.target.value?'':nl[i].haber};setAsientoLineas(nl);}} placeholder="0.00"
                          style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:13,color:C.blue,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                      </td>
                      <td style={{padding:'6px 8px'}}>
                        <input type="number" value={l.haber} onChange={e=>{const nl=[...asientoLineas];nl[i]={...nl[i],haber:e.target.value,debe:e.target.value?'':nl[i].debe};setAsientoLineas(nl);}} placeholder="0.00"
                          style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border2}`,borderRadius:6,fontSize:13,color:C.gold,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                      </td>
                      <td style={{padding:'6px 8px',textAlign:'center'}}>
                        {asientoLineas.length > 2 && (
                          <button onClick={()=>setAsientoLineas(asientoLineas.filter((_,j)=>j!==i))}
                            style={{background:C.redL,color:C.red,border:`1px solid ${C.redB}`,borderRadius:6,padding:'6px 10px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:C.bg3}}>
                    <td style={{padding:'8px 12px',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase'}}>TOTALES</td>
                    <td style={{padding:'8px 12px',fontSize:13,fontWeight:900,color:C.blue}}>
                      {fmt(asientoLineas.reduce((a,l)=>a+(parseFloat(l.debe)||0),0))}
                    </td>
                    <td style={{padding:'8px 12px',fontSize:13,fontWeight:900,color:C.gold}}>
                      {fmt(asientoLineas.reduce((a,l)=>a+(parseFloat(l.haber)||0),0))}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>

              {(() => {
                const td = asientoLineas.reduce((a,l)=>a+(parseFloat(l.debe)||0),0);
                const th = asientoLineas.reduce((a,l)=>a+(parseFloat(l.haber)||0),0);
                const bal = Math.abs(td-th) < 0.01;
                return td > 0 || th > 0 ? (
                  <div style={{padding:'8px 14px',borderRadius:8,marginBottom:12,background:bal?C.greenL:C.redL,border:`1px solid ${bal?C.greenB:C.redB}`,fontSize:11,fontWeight:700,color:bal?C.green:C.red}}>
                    {bal ? '✓ ASIENTO BALANCEADO' : `⚠️ DIFERENCIA: ${fmt(Math.abs(td-th))} — El debe debe igualar al haber`}
                  </div>
                ) : null;
              })()}

              <div style={{display:'flex',gap:10,justifyContent:'space-between',alignItems:'center'}}>
                <button onClick={()=>setAsientoLineas([...asientoLineas,{cuenta_id:'',debe:'',haber:''}])}
                  style={{background:'rgba(255,255,255,0.05)',color:C.text2,border:`1px solid ${C.border}`,padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                  + AGREGAR LÍNEA
                </button>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>setNuevoAsiento(false)} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>CANCELAR</button>
                  <button onClick={guardarAsiento} disabled={guardando||!asientoDesc}
                    style={{background:(!asientoDesc||guardando)?'rgba(26,107,60,0.4)':'#1A6B3C',color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:(!asientoDesc||guardando)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!asientoDesc||guardando)?0.6:1}}>
                    {guardando?'GUARDANDO...':'✓ GUARDAR ASIENTO'}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Lista de asientos */}
          {!asientos.length ? (
            <Card style={{padding:60,textAlign:'center'}}>
              <div style={{fontSize:36,marginBottom:12}}>📒</div>
              <div style={{color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>SIN ASIENTOS REGISTRADOS</div>
              <div style={{color:C.text3,fontSize:11,marginTop:8}}>Los asientos automáticos se generan con cada desembolso y cobro de cuota.</div>
            </Card>
          ) : asientos.map(a => {
            const ls = lineas.filter(l => l.asiento_id === a.id);
            const total = ls.reduce((x,l) => x+(l.debe||0), 0);
            return (
              <Card key={a.id} style={{padding:0,overflow:'hidden',marginBottom:12}}>
                <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.bg3}}>
                  <div>
                    <span style={{fontSize:11,fontWeight:900,color:C.gold,marginRight:12}}>N° {String(a.numero||0).padStart(4,'0')}</span>
                    <span style={{fontSize:12,fontWeight:700,color:C.text}}>{a.descripcion}</span>
                  </div>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    <span style={{fontSize:10,color:C.text3}}>{a.fecha} · {a.usuario}</span>
                    {a.referencia && <span style={{fontSize:10,color:C.text2,background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'2px 8px'}}>{a.referencia}</span>}
                    <span style={{fontSize:13,fontWeight:900,color:C.gold}}>{fmt(total)}</span>
                  </div>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <tbody>
                    {ls.map((l,i) => {
                      const c = cuentas.find(x => x.id === l.cuenta_id) || {};
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'8px 18px',color:TIPO_COLORS[c.tipo]||C.text2,fontWeight:700,fontSize:11,width:60}}>{c.codigo||'—'}</td>
                          <td style={{padding:'8px 12px',color:C.text,fontSize:12,fontWeight:700}}>{c.nombre||'—'}</td>
                          <td style={{padding:'8px 12px',textAlign:'right',color:C.blue,fontWeight:900,fontSize:12}}>{l.debe > 0 ? fmt(l.debe) : ''}</td>
                          <td style={{padding:'8px 18px',textAlign:'right',color:C.gold,fontWeight:900,fontSize:12}}>{l.haber > 0 ? fmt(l.haber) : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LIBRO DIARIO ── */}
      {tab==='diario'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>LIBRO DIARIO</div>
            <button onClick={imprimirDiario} style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              🖨️ IMPRIMIR / PDF
            </button>
          </div>

          <Card style={{padding:20,marginBottom:20}}>
            <div style={{display:'flex',gap:16,alignItems:'flex-end'}}>
              {[['DESDE',filtroDiarioDesde,setFiltroDiarioDesde],['HASTA',filtroDiarioHasta,setFiltroDiarioHasta]].map(([lbl,val,set])=>(
                <div key={lbl}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{lbl}</label>
                  <input type="date" value={val} onChange={e=>set(e.target.value)}
                    style={{padding:'8px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',outline:'none'}}/>
                </div>
              ))}
            </div>
          </Card>

          {asientos.filter(a => {
            if (filtroDiarioDesde && a.fecha < filtroDiarioDesde) return false;
            if (filtroDiarioHasta && a.fecha > filtroDiarioHasta) return false;
            return true;
          }).map(a => {
            const ls = lineas.filter(l => l.asiento_id === a.id);
            const totalD = ls.reduce((x,l) => x+(l.debe||0), 0);
            const totalH = ls.reduce((x,l) => x+(l.haber||0), 0);
            return (
              <Card key={a.id} style={{padding:0,overflow:'hidden',marginBottom:12}}>
                <div style={{padding:'10px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg3,display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:11,fontWeight:900,color:C.gold}}>N° {String(a.numero||0).padStart(4,'0')}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>{a.descripcion}</span>
                  <span style={{fontSize:10,color:C.text3}}>{a.fecha}{a.referencia?` · ${a.referencia}`:''}</span>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>{['CÓD.','CUENTA','DEBE','HABER'].map(h=><th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'6px 12px',textAlign:h==='DEBE'||h==='HABER'?'right':'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ls.map((l,i) => {
                      const c = cuentas.find(x=>x.id===l.cuenta_id)||{};
                      return <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'7px 12px',color:TIPO_COLORS[c.tipo]||C.text2,fontWeight:700,fontSize:11}}>{c.codigo||'—'}</td>
                        <td style={{padding:'7px 12px',color:C.text,fontSize:12}}>{c.nombre||'—'}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',color:C.blue,fontWeight:700,fontSize:12}}>{l.debe>0?fmt(l.debe):''}</td>
                        <td style={{padding:'7px 12px',textAlign:'right',color:C.gold,fontWeight:700,fontSize:12}}>{l.haber>0?fmt(l.haber):''}</td>
                      </tr>;
                    })}
                    <tr style={{background:C.bg3}}>
                      <td colSpan={2} style={{padding:'7px 12px',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase'}}>TOTALES</td>
                      <td style={{padding:'7px 12px',textAlign:'right',fontWeight:900,color:C.blue}}>{fmt(totalD)}</td>
                      <td style={{padding:'7px 12px',textAlign:'right',fontWeight:900,color:C.gold}}>{fmt(totalH)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LIBRO MAYOR ── */}
      {tab==='mayor'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>LIBRO MAYOR</div>
          <Card style={{padding:20,marginBottom:20}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>SELECCIONAR CUENTA</label>
            <select value={filtroMayor} onChange={e=>setFiltroMayor(e.target.value)}
              style={{width:'100%',maxWidth:400,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none'}}>
              <option value="">SELECCIONAR CUENTA...</option>
              {['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo=>(
                <optgroup key={tipo} label={TIPO_LABELS[tipo]}>
                  {cuentas.filter(c=>c.tipo===tipo).map(c=>(
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Card>

          {cuentaSeleccionada && (()=>{
            const ls = lineas.filter(l => l.cuenta_id === filtroMayor);
            const asientosConLinea = ls.map(l => ({
              ...l,
              asiento: asientos.find(a => a.id === l.asiento_id) || {}
            })).sort((a,b) => a.asiento.fecha?.localeCompare(b.asiento.fecha));
            let saldoAcum = 0;
            const totalD = ls.reduce((a,l)=>a+(l.debe||0),0);
            const totalH = ls.reduce((a,l)=>a+(l.haber||0),0);
            const saldoFinal = saldoCuenta(filtroMayor);
            return (
              <Card style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg3,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:900,color:TIPO_COLORS[cuentaSeleccionada.tipo],marginRight:10}}>{cuentaSeleccionada.codigo}</span>
                    <span style={{fontSize:14,fontWeight:900,color:C.text}}>{cuentaSeleccionada.nombre}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:900,color:saldoFinal>=0?C.green:C.red}}>SALDO: {fmt(saldoFinal)}</span>
                </div>
                {!asientosConLinea.length ? (
                  <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:12}}>Sin movimientos en esta cuenta</div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>{['FECHA','ASIENTO','DESCRIPCIÓN','DEBE','HABER','SALDO'].map(h=><th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'8px 12px',textAlign:['DEBE','HABER','SALDO'].includes(h)?'right':'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {asientosConLinea.map((l,i)=>{
                        const esDeb = l.debe > 0;
                        if (cuentaSeleccionada.tipo==='activo'||cuentaSeleccionada.tipo==='egreso') {
                          saldoAcum += (l.debe||0) - (l.haber||0);
                        } else {
                          saldoAcum += (l.haber||0) - (l.debe||0);
                        }
                        return <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                          <td style={{padding:'8px 12px',color:C.text2,fontSize:11}}>{l.asiento.fecha||'—'}</td>
                          <td style={{padding:'8px 12px',color:C.gold,fontWeight:700,fontSize:11}}>{l.asiento_id}</td>
                          <td style={{padding:'8px 12px',color:C.text,fontSize:11}}>{l.asiento.descripcion||'—'}</td>
                          <td style={{padding:'8px 12px',textAlign:'right',color:C.blue,fontWeight:700,fontSize:12}}>{l.debe>0?fmt(l.debe):''}</td>
                          <td style={{padding:'8px 12px',textAlign:'right',color:C.gold,fontWeight:700,fontSize:12}}>{l.haber>0?fmt(l.haber):''}</td>
                          <td style={{padding:'8px 12px',textAlign:'right',fontWeight:900,fontSize:12,color:saldoAcum>=0?C.green:C.red}}>{fmt(saldoAcum)}</td>
                        </tr>;
                      })}
                      <tr style={{background:C.bg3}}>
                        <td colSpan={3} style={{padding:'10px 12px',fontWeight:700,fontSize:10,color:C.text2,textTransform:'uppercase'}}>TOTALES</td>
                        <td style={{padding:'10px 12px',textAlign:'right',fontWeight:900,color:C.blue}}>{fmt(totalD)}</td>
                        <td style={{padding:'10px 12px',textAlign:'right',fontWeight:900,color:C.gold}}>{fmt(totalH)}</td>
                        <td style={{padding:'10px 12px',textAlign:'right',fontWeight:900,color:saldoFinal>=0?C.green:C.red,fontSize:13}}>{fmt(saldoFinal)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })()}
        </div>
      )}

      {/* ── BALANCE ── */}
      {tab==='balance'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>BALANCE DE SUMAS Y SALDOS</div>
            <button onClick={imprimirBalance} style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              🖨️ IMPRIMIR / PDF
            </button>
          </div>

          <Card style={{padding:0,overflow:'hidden',marginBottom:20}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>{['CÓD.','CUENTA','TIPO','TOTAL DEBE','TOTAL HABER','SALDO'].map(h=>(
                  <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 14px',textAlign:['TOTAL DEBE','TOTAL HABER','SALDO'].includes(h)?'right':'left',borderBottom:`2px solid ${C.gold}`}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {['activo','pasivo','patrimonio','ingreso','egreso'].map(tipo => {
                  const cuentasTipo = cuentas.filter(c => c.tipo === tipo);
                  if (!cuentasTipo.length) return null;
                  const subtotal = totalTipo(tipo);
                  return [
                    ...cuentasTipo.map((c,i) => {
                      const ls = lineas.filter(l => l.cuenta_id === c.id);
                      const td = ls.reduce((a,l)=>a+(l.debe||0),0);
                      const th = ls.reduce((a,l)=>a+(l.haber||0),0);
                      const saldo = saldoCuenta(c.id);
                      return <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                        <td style={{padding:'8px 14px',color:TIPO_COLORS[tipo],fontWeight:700,fontSize:11}}>{c.codigo}</td>
                        <td style={{padding:'8px 14px',color:C.text,fontSize:12,fontWeight:700}}>{c.nombre}</td>
                        <td style={{padding:'8px 14px',fontSize:10,fontWeight:700,color:TIPO_COLORS[tipo]}}>{TIPO_LABELS[tipo]}</td>
                        <td style={{padding:'8px 14px',textAlign:'right',color:C.blue,fontWeight:700,fontSize:12}}>{fmt(td)}</td>
                        <td style={{padding:'8px 14px',textAlign:'right',color:C.gold,fontWeight:700,fontSize:12}}>{fmt(th)}</td>
                        <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,fontSize:13,color:saldo>=0?TIPO_COLORS[tipo]:C.red}}>{fmt(saldo)}</td>
                      </tr>;
                    }),
                    <tr key={`sub-${tipo}`} style={{background:TIPO_COLORS[tipo]+'15',borderBottom:`2px solid ${TIPO_COLORS[tipo]}`}}>
                      <td colSpan={5} style={{padding:'8px 14px',fontWeight:900,fontSize:10,color:TIPO_COLORS[tipo],textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'right'}}>SUBTOTAL {TIPO_LABELS[tipo]}</td>
                      <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,fontSize:14,color:TIPO_COLORS[tipo]}}>{fmt(subtotal)}</td>
                    </tr>
                  ];
                })}
                <tr style={{background:resultadoEjercicio>=0?C.greenL:C.redL,border:`2px solid ${resultadoEjercicio>=0?C.greenB:C.redB}`}}>
                  <td colSpan={5} style={{padding:'12px 14px',fontWeight:900,fontSize:12,color:resultadoEjercicio>=0?C.green:C.red,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'right'}}>
                    RESULTADO DEL EJERCICIO ({resultadoEjercicio>=0?'GANANCIA':'PÉRDIDA'})
                  </td>
                  <td style={{padding:'12px 14px',textAlign:'right',fontWeight:900,fontSize:16,color:resultadoEjercicio>=0?C.green:C.red}}>{fmt(resultadoEjercicio)}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Verificación ecuación */}
          <Card style={{padding:18,background:Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1?C.greenL:C.redL,border:`1px solid ${Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1?C.greenB:C.redB}`}}>
            <div style={{fontSize:12,fontWeight:900,color:Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1?C.green:C.red,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
              {Math.abs(totalActivo-(totalPasivo+totalPatrimonio+resultadoEjercicio))<1 ? '✓ BALANCE CUADRADO' : '⚠️ BALANCE DESCUADRADO'}
            </div>
            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              {[['ACTIVO',totalActivo,C.blue],['PASIVO + PN + RESULTADO',totalPasivo+totalPatrimonio+resultadoEjercicio,C.gold]].map(([l,v,color])=>(
                <div key={l}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:900,color}}>{fmt(v)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      </>}
    </div>
  );
}
