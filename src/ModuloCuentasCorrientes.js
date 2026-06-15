// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO CUENTAS CORRIENTES — Banco + Clientes + Dashboard integrado
// Archivo: src/ModuloCuentasCorrientes.js
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

// ── Cuenta Corriente Banco ────────────────────────────────────────────────────
function CuentaBanco({ user }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoMov, setNuevoMov] = useState(false);
  const [form, setForm] = useState({ fecha: hoy(), tipo: 'ingreso', concepto: '', referencia: '', monto: '' });
  const [guardando, setGuardando] = useState(false);
  const [editandoInicial, setEditandoInicial] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await db.supabase.from('cuenta_banco').select('*').order('fecha', { ascending: true }).order('created_at', { ascending: true });
    setMovimientos(data || []);
    setLoading(false);
  }

  // Calcular saldo corrido
  function calcularSaldos(movs) {
    let saldo = 0;
    return movs.map(m => {
      const anterior = saldo;
      if (m.tipo === 'ingreso') saldo += m.monto;
      else saldo -= m.monto;
      return { ...m, saldo_calc: saldo, saldo_ant_calc: anterior };
    });
  }

  const movsConSaldo = calcularSaldos(movimientos);
  const saldoActual = movsConSaldo.length > 0 ? movsConSaldo[movsConSaldo.length - 1].saldo_calc : 0;

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);

  async function guardarMovimiento() {
    if (!form.concepto || !form.monto) return;
    setGuardando(true);
    try {
      const id = `MOV-${Date.now()}`;
      await db.supabase.from('cuenta_banco').insert({
        id,
        fecha: form.fecha,
        tipo: form.tipo,
        concepto: form.concepto.toUpperCase(),
        referencia: form.referencia || null,
        monto: parseFloat(form.monto),
        origen: 'manual',
        usuario: user.nombre,
      });
      setNuevoMov(false);
      setForm({ fecha: hoy(), tipo: 'ingreso', concepto: '', referencia: '', monto: '' });
      await cargar();
    } catch(e) { alert('Error al guardar el movimiento'); }
    setGuardando(false);
  }

  async function actualizarSaldoInicial() {
    await db.supabase.from('cuenta_banco').update({
      monto: parseFloat(saldoInicial) || 0,
      tipo: 'ingreso',
      concepto: 'SALDO INICIAL — BANCO SANTANDER',
    }).eq('id', 'MOV-INICIAL');
    setEditandoInicial(false);
    await cargar();
  }

  async function eliminarMovimiento(id) {
    if (id === 'MOV-INICIAL') return;
    if (!window.confirm('¿ELIMINAR ESTE MOVIMIENTO?')) return;
    await db.supabase.from('cuenta_banco').delete().eq('id', id);
    await cargar();
  }

  function imprimir() {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Cuenta Corriente Banco Santander — AUTOLOGROS S.A.</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
      h1{font-size:16px;color:#C8922A;margin-bottom:4px}
      h2{font-size:12px;color:#333;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#f0f0f0;padding:8px;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #C8922A;text-align:right}
      th:first-child,th:nth-child(2),th:nth-child(3){text-align:left}
      td{padding:6px 8px;border-bottom:1px solid #e0e0e0;font-size:10px;text-align:right}
      td:first-child,td:nth-child(2),td:nth-child(3){text-align:left}
      .ingreso{color:#1a6b3c}
      .egreso{color:#8b0000}
      .total{background:#f8f8f8;font-weight:900}
      .pie{margin-top:24px;font-size:9px;color:#888;border-top:1px solid #e0e0e0;padding-top:8px;text-align:center}
    </style></head><body>
    <h1>AUTOLOGROS S.A. · CUIT 30-71934732-7</h1>
    <h2>CUENTA CORRIENTE — BANCO SANTANDER · Al ${new Date().toLocaleDateString('es-AR')}</h2>
    <table>
      <thead><tr>
        <th>Fecha</th><th>Concepto</th><th>Referencia</th>
        <th>Ingreso</th><th>Egreso</th><th>Saldo</th>
      </tr></thead>
      <tbody>
        ${movsConSaldo.map(m => `<tr>
          <td>${m.fecha}</td>
          <td>${m.concepto}</td>
          <td>${m.referencia||'—'}</td>
          <td class="ingreso">${m.tipo==='ingreso'?fmt(m.monto):''}</td>
          <td class="egreso">${m.tipo==='egreso'?fmt(m.monto):''}</td>
          <td style="font-weight:700;color:${m.saldo_calc>=0?'#1a6b3c':'#8b0000'}">${fmt(m.saldo_calc)}</td>
        </tr>`).join('')}
        <tr class="total">
          <td colspan="3" style="text-align:right">TOTALES</td>
          <td class="ingreso">${fmt(totalIngresos)}</td>
          <td class="egreso">${fmt(totalEgresos)}</td>
          <td style="font-weight:900;color:${saldoActual>=0?'#1a6b3c':'#8b0000'};font-size:13px">${fmt(saldoActual)}</td>
        </tr>
      </tbody>
    </table>
    <div class="pie">Generado el ${new Date().toLocaleString('es-AR')} por ${user.nombre} · AUTOLOGROS S.A.</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>CUENTA CORRIENTE BANCARIA</div>
          <div style={{fontSize:11,color:C.text3,marginTop:3}}>Banco Santander — CBU operativo AUTOLOGROS S.A.</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={imprimir} style={{background:C.gold,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            🖨️ EXTRACTO PDF
          </button>
          <button onClick={()=>setNuevoMov(true)} style={{background:'#1A6B3C',color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            + NUEVO MOVIMIENTO
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          ['SALDO ACTUAL', fmt(saldoActual), saldoActual>=0?C.green:C.red, saldoActual>=0?C.greenL:C.redL, saldoActual>=0?C.greenB:C.redB],
          ['TOTAL INGRESOS', fmt(totalIngresos), C.green, C.greenL, C.greenB],
          ['TOTAL EGRESOS', fmt(totalEgresos), C.red, C.redL, C.redB],
          ['MOVIMIENTOS', movimientos.length, C.gold, C.goldL, C.goldB],
        ].map(([l,v,color,bg,border]) => (
          <div key={l} style={{background:bg,borderRadius:12,padding:18,border:`1px solid ${border}`}}>
            <div style={{fontSize:18,fontWeight:900,color,lineHeight:1,marginBottom:6}}>{v}</div>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Saldo inicial */}
      <Card style={{padding:16,marginBottom:16,border:`1px solid ${C.goldB}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.06em'}}>SALDO INICIAL</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>Configurá el saldo inicial de la cuenta bancaria</div>
          </div>
          {!editandoInicial ? (
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:16,fontWeight:900,color:C.gold}}>{fmt(movimientos.find(m=>m.id==='MOV-INICIAL')?.monto||0)}</div>
              <button onClick={()=>{setSaldoInicial(movimientos.find(m=>m.id==='MOV-INICIAL')?.monto||'');setEditandoInicial(true);}}
                style={{background:C.goldL,color:C.gold,border:`1px solid ${C.goldB}`,padding:'7px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                EDITAR
              </button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="number" value={saldoInicial} onChange={e=>setSaldoInicial(e.target.value)} placeholder="0.00"
                style={{padding:'8px 12px',border:`1.5px solid ${C.goldB}`,borderRadius:8,fontSize:14,color:C.gold,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:900,width:160,outline:'none'}}/>
              <button onClick={actualizarSaldoInicial} style={{background:'#1A6B3C',color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>GUARDAR</button>
              <button onClick={()=>setEditandoInicial(false)} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'8px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>CANCELAR</button>
            </div>
          )}
        </div>
      </Card>

      {/* Formulario nuevo movimiento */}
      {nuevoMov && (
        <Card style={{padding:24,marginBottom:20,border:`1px solid ${C.greenB}`}}>
          <div style={{fontSize:12,fontWeight:900,color:C.green,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>NUEVO MOVIMIENTO BANCARIO</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0 16px',marginBottom:16}}>
            {[
              ['FECHA','fecha','date'],
              ['CONCEPTO','concepto','text'],
              ['REFERENCIA','referencia','text'],
              ['MONTO ($)','monto','number'],
            ].map(([lbl,key,type]) => (
              <div key={key}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{lbl} {key!=='referencia'?'*':''}</label>
                <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                  placeholder={key==='concepto'?'Ej: Cobro cuota SOL-123':key==='referencia'?'N° comprobante':''}
                  style={{width:'100%',padding:'9px 12px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
              </div>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>TIPO *</label>
            <div style={{display:'flex',gap:10}}>
              {[['ingreso','INGRESO ↓',C.green,C.greenL,C.greenB],['egreso','EGRESO ↑',C.red,C.redL,C.redB]].map(([val,lbl,color,bg,border])=>(
                <button key={val} onClick={()=>setForm({...form,tipo:val})}
                  style={{flex:1,padding:'10px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',border:`1.5px solid ${form.tipo===val?border:C.border}`,background:form.tipo===val?bg:'rgba(255,255,255,0.02)',color:form.tipo===val?color:C.text2}}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setNuevoMov(false)} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>CANCELAR</button>
            <button onClick={guardarMovimiento} disabled={guardando||!form.concepto||!form.monto}
              style={{background:(!form.concepto||!form.monto||guardando)?'rgba(26,107,60,0.4)':'#1A6B3C',color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:(!form.concepto||!form.monto||guardando)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!form.concepto||!form.monto||guardando)?0.6:1}}>
              {guardando?'GUARDANDO...':'✓ GUARDAR'}
            </button>
          </div>
        </Card>
      )}

      {/* Tabla de movimientos */}
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>{['FECHA','CONCEPTO','REFERENCIA','TIPO','INGRESO','EGRESO','SALDO',''].map(h=>(
                <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'10px 14px',textAlign:['INGRESO','EGRESO','SALDO'].includes(h)?'right':'left',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{padding:40,textAlign:'center',color:C.text3}}>CARGANDO...</td></tr>
              ) : movsConSaldo.map((m,i) => (
                <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                  <td style={{padding:'9px 14px',color:C.text2,fontSize:11,whiteSpace:'nowrap'}}>{m.fecha}</td>
                  <td style={{padding:'9px 14px',color:C.text,fontSize:12,fontWeight:700}}>{m.concepto}</td>
                  <td style={{padding:'9px 14px',color:C.text3,fontSize:11}}>{m.referencia||'—'}</td>
                  <td style={{padding:'9px 14px'}}>
                    <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',color:m.tipo==='ingreso'?C.green:C.red,background:m.tipo==='ingreso'?C.greenL:C.redL,border:`1px solid ${m.tipo==='ingreso'?C.greenB:C.redB}`,borderRadius:20,padding:'3px 10px'}}>
                      {m.tipo==='ingreso'?'INGRESO':'EGRESO'}
                    </span>
                  </td>
                  <td style={{padding:'9px 14px',textAlign:'right',color:C.green,fontWeight:700,fontSize:12}}>{m.tipo==='ingreso'?fmt(m.monto):''}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',color:C.red,fontWeight:700,fontSize:12}}>{m.tipo==='egreso'?fmt(m.monto):''}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontWeight:900,fontSize:13,color:m.saldo_calc>=0?C.green:C.red}}>{fmt(m.saldo_calc)}</td>
                  <td style={{padding:'9px 14px',textAlign:'center'}}>
                    {m.id !== 'MOV-INICIAL' && m.origen === 'manual' && (
                      <button onClick={()=>eliminarMovimiento(m.id)} style={{background:C.redL,color:C.red,border:`1px solid ${C.redB}`,borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>×</button>
                    )}
                    {m.origen !== 'manual' && <span style={{fontSize:9,color:C.text3,fontStyle:'italic'}}>AUTO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            {movsConSaldo.length > 0 && (
              <tfoot>
                <tr style={{background:C.bg3}}>
                  <td colSpan={4} style={{padding:'10px 14px',fontWeight:700,fontSize:10,color:C.text2,textTransform:'uppercase',letterSpacing:'0.04em'}}>TOTALES</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontWeight:900,color:C.green,fontSize:13}}>{fmt(totalIngresos)}</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontWeight:900,color:C.red,fontSize:13}}>{fmt(totalEgresos)}</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontWeight:900,fontSize:14,color:saldoActual>=0?C.green:C.red}}>{fmt(saldoActual)}</td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Cuenta Corriente Clientes ─────────────────────────────────────────────────
function CuentaClientes({ user }) {
  const [creditos, setCreditos] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSel, setClienteSel] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [{ data: cr }, { data: cu }, { data: mv }] = await Promise.all([
      db.supabase.from('creditos').select('*').order('created_at', { ascending: false }),
      db.supabase.from('cuotas').select('*').order('numero'),
      db.supabase.from('movimientos').select('*').order('created_at', { ascending: false }),
    ]);
    setCreditos(cr || []);
    setCuotas(cu || []);
    setMovimientos(mv || []);
    setLoading(false);
  }

  // Agrupar por cliente (por DNI)
  const clientesMap = creditos.reduce((acc, c) => {
    const key = c.cliente_dni || c.cliente_nombre;
    if (!acc[key]) acc[key] = { nombre: c.cliente_nombre, dni: c.cliente_dni, cuil: c.cliente_cuil, email: c.cliente_email, tel: c.cliente_tel, creditos: [] };
    acc[key].creditos.push(c);
    return acc;
  }, {});

  const clientes = Object.values(clientesMap).filter(c =>
    !busqueda || c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || c.dni?.includes(busqueda)
  );

  function resumenCliente(cliente) {
    const creditosIds = cliente.creditos.map(c => c.id);
    const cuotasCliente = cuotas.filter(cu => creditosIds.includes(cu.credito_id));
    const totalPrestado = cliente.creditos.reduce((a, c) => a + c.monto, 0);
    const totalPagado = cuotasCliente.filter(cu => cu.estado === 'pagada').reduce((a, cu) => a + (cu.monto_pagado || 0), 0);
    const cuotasPend = cuotasCliente.filter(cu => cu.estado === 'pendiente');
    const saldoCapital = cuotasPend.reduce((a, cu) => a + cu.capital, 0);
    const enMora = cuotasPend.filter(cu => cu.fecha_vencimiento < new Date().toISOString().split('T')[0]).length;
    return { totalPrestado, totalPagado, saldoCapital, enMora, cuotasPend: cuotasPend.length };
  }

  if (clienteSel) {
    const creditosIds = clienteSel.creditos.map(c => c.id);
    const cuotasCliente = cuotas.filter(cu => creditosIds.includes(cu.credito_id)).sort((a,b) => a.fecha_vencimiento?.localeCompare(b.fecha_vencimiento));
    const movsCliente = movimientos.filter(m => creditosIds.includes(m.credito_id)).sort((a,b) => a.fecha?.localeCompare(b.fecha));
    const res = resumenCliente(clienteSel);

    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <button onClick={()=>setClienteSel(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3}}>←</button>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:C.text,textTransform:'uppercase'}}>{clienteSel.nombre}</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2}}>DNI {clienteSel.dni} · CUIL {clienteSel.cuil} · {clienteSel.email} · {clienteSel.tel}</div>
          </div>
        </div>

        {/* KPIs cliente */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[
            ['TOTAL PRESTADO', fmt(res.totalPrestado), C.gold, C.goldL, C.goldB],
            ['TOTAL PAGADO', fmt(res.totalPagado), C.green, C.greenL, C.greenB],
            ['SALDO CAPITAL', fmt(res.saldoCapital), C.blue, 'rgba(74,154,224,0.08)', 'rgba(74,154,224,0.25)'],
            ['CUOTAS PEND.', res.cuotasPend, C.text2, 'rgba(255,255,255,0.05)', C.border],
            ['EN MORA', res.enMora, res.enMora>0?C.red:C.green, res.enMora>0?C.redL:C.greenL, res.enMora>0?C.redB:C.greenB],
          ].map(([l,v,color,bg,border]) => (
            <div key={l} style={{background:bg,borderRadius:10,padding:14,border:`1px solid ${border}`}}>
              <div style={{fontSize:16,fontWeight:900,color,lineHeight:1,marginBottom:4}}>{v}</div>
              <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Créditos */}
        <div style={{fontSize:12,fontWeight:900,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>CRÉDITOS</div>
        {clienteSel.creditos.map(c => (
          <Card key={c.id} style={{padding:16,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:12,fontWeight:900,color:C.gold}}>{c.id}</div>
                <div style={{fontSize:11,color:C.text2,marginTop:2}}>{c.linea_nombre} · {fmt(c.monto)} · {c.plazo} cuotas · TNA {c.tna}%</div>
                <div style={{fontSize:10,color:C.text3,marginTop:2}}>Desembolso: {c.fecha_desembolso} · Primera cuota: {c.fecha_primera_cuota}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:14,fontWeight:900,color:C.gold}}>{fmt(c.monto)}</div>
                <div style={{fontSize:10,color:C.text3}}>MONTO ORIGINAL</div>
              </div>
            </div>
          </Card>
        ))}

        {/* Plan de cuotas unificado */}
        <div style={{fontSize:12,fontWeight:900,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',margin:'16px 0 10px'}}>PLAN DE CUOTAS UNIFICADO</div>
        <Card style={{padding:0,overflow:'hidden',marginBottom:16}}>
          <div style={{overflowX:'auto',maxHeight:400,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead style={{position:'sticky',top:0}}>
                <tr>{['CRÉDITO','N°','VENC.','CAPITAL','INTERESES','TOTAL','MORA','ESTADO','PAGADO'].map(h=>(
                  <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {cuotasCliente.map(cu => {
                  const hoyStr = new Date().toISOString().split('T')[0];
                  const mora = cu.estado==='pendiente' && cu.fecha_vencimiento < hoyStr ? Math.floor((new Date()-new Date(cu.fecha_vencimiento))/(1000*60*60*24)) : cu.dias_mora||0;
                  const enMora = cu.estado==='pendiente' && mora > 0;
                  return (
                    <tr key={cu.id} style={{background:cu.estado==='pagada'?C.greenL:enMora?C.redL:'transparent',borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'7px 10px',color:C.gold,fontWeight:700,textAlign:'right',fontSize:10}}>{cu.credito_id}</td>
                      <td style={{padding:'7px 10px',color:C.text3,textAlign:'right'}}>{cu.numero}</td>
                      <td style={{padding:'7px 10px',color:enMora?C.red:C.text2,textAlign:'right',whiteSpace:'nowrap'}}>{cu.fecha_vencimiento}</td>
                      <td style={{padding:'7px 10px',color:C.text,textAlign:'right'}}>{fmt(cu.capital)}</td>
                      <td style={{padding:'7px 10px',color:C.blue,textAlign:'right'}}>{fmt(cu.intereses)}</td>
                      <td style={{padding:'7px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(cu.monto_total)}</td>
                      <td style={{padding:'7px 10px',color:mora>0?C.red:C.text3,textAlign:'right',fontWeight:mora>0?700:400}}>{mora>0?`${mora}d`:'—'}</td>
                      <td style={{padding:'7px 10px',textAlign:'right'}}>
                        <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:cu.estado==='pagada'?C.green:enMora?C.red:C.gold}}>
                          {cu.estado==='pagada'?'PAGADA':enMora?'MORA':'PENDIENTE'}
                        </span>
                      </td>
                      <td style={{padding:'7px 10px',color:C.green,fontWeight:700,textAlign:'right'}}>{cu.monto_pagado?fmt(cu.monto_pagado):''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Historial de movimientos */}
        <div style={{fontSize:12,fontWeight:900,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',margin:'16px 0 10px'}}>HISTORIAL DE MOVIMIENTOS</div>
        <Card style={{padding:0,overflow:'hidden'}}>
          {!movsCliente.length ? (
            <div style={{padding:30,textAlign:'center',color:C.text3,fontSize:12}}>Sin movimientos registrados</div>
          ) : movsCliente.map(m => (
            <div key={m.id} style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:m.tipo==='pago'?C.green:m.tipo==='desembolso'?C.gold:C.text,textTransform:'uppercase'}}>{m.tipo==='pago'?'💰':m.tipo==='desembolso'?'🏦':'📋'} {m.tipo}</div>
                <div style={{fontSize:11,color:C.text2,marginTop:2}}>{m.concepto}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:1}}>{m.fecha} · {m.usuario}</div>
              </div>
              <div style={{fontSize:14,fontWeight:900,color:m.tipo==='pago'?C.green:C.gold}}>{fmt(m.monto)}</div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>CUENTAS CORRIENTES — CLIENTES</div>

      <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre o DNI..."
        style={{width:'100%',maxWidth:400,padding:'10px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',outline:'none',marginBottom:20,boxSizing:'border-box'}}/>

      {loading ? <div style={{textAlign:'center',padding:60,color:C.text3}}>CARGANDO...</div> :
       !clientes.length ? (
        <Card style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>👤</div>
          <div style={{color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>SIN CLIENTES CON CRÉDITOS ACTIVOS</div>
        </Card>
      ) : clientes.map(cliente => {
        const res = resumenCliente(cliente);
        return (
          <Card key={cliente.dni} onClick={()=>setClienteSel(cliente)} style={{padding:18,marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${res.enMora>0?C.red:C.green}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{fontSize:24}}>{res.enMora>0?'⚠️':'👤'}</div>
                <div>
                  <div style={{fontWeight:900,fontSize:14,color:C.text,textTransform:'uppercase'}}>{cliente.nombre}</div>
                  <div style={{fontSize:11,color:C.text2,marginTop:3}}>DNI {cliente.dni} · {cliente.creditos.length} crédito(s) · {cliente.email}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:20,alignItems:'center'}}>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>SALDO CAPITAL</div>
                  <div style={{fontSize:14,fontWeight:900,color:C.gold}}>{fmt(res.saldoCapital)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>TOTAL PAGADO</div>
                  <div style={{fontSize:13,fontWeight:900,color:C.green}}>{fmt(res.totalPagado)}</div>
                </div>
                {res.enMora > 0 && (
                  <span style={{fontSize:10,fontWeight:700,color:C.red,background:C.redL,border:`1px solid ${C.redB}`,borderRadius:20,padding:'3px 12px',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                    {res.enMora} EN MORA
                  </span>
                )}
                <span style={{color:C.text3,fontSize:18}}>›</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ModuloCuentasCorrientes({ user }) {
  const [tab, setTab] = useState('banco');

  return (
    <div>
      <div style={{display:'flex',gap:4,marginBottom:24}}>
        {[['banco','BANCO SANTANDER'],['clientes','CLIENTES']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:'8px 20px',borderRadius:20,fontSize:10,fontWeight:700,
              background:tab===k?C.gold:'rgba(255,255,255,0.05)',
              color:tab===k?'#fff':C.text2,
              border:`1px solid ${tab===k?C.gold:C.border}`,
              cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='banco' && <CuentaBanco user={user}/>}
      {tab==='clientes' && <CuentaClientes user={user}/>}
    </div>
  );
}
