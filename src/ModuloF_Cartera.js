// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO F — CARTERA ACTIVA + CUENTA CORRIENTE + GESTIÓN DE CUOTAS
// Archivo: src/ModuloF.js
// Acceso: Administrador y Analista (solo lectura para analista)
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

const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n||0);
const hoy = () => new Date().toISOString().split('T')[0];

function diasMora(fechaVenc) {
  const hoyDate = new Date();
  const venc = new Date(fechaVenc);
  if (hoyDate <= venc) return 0;
  return Math.floor((hoyDate - venc) / (1000*60*60*24));
}

function Card({children,style}){ return <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,...style}}>{children}</div>; }

// ── Cuenta Corriente del cliente ──────────────────────────────────────────────
function CuentaCorriente({ credito, user, onVolver, onActualizar }) {
  const [cuotas, setCuotas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPago, setModalPago] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [fechaPago, setFechaPago] = useState(hoy());
  const [compPago, setCompPago] = useState('');
  const [procesando, setProcesando] = useState(false);
  const esAdmin = user?.rol === 'admin';

  useEffect(() => { cargar(); }, [credito.id]);

  async function cargar() {
    setLoading(true);
    const { data: c } = await db.supabase.from('cuotas').select('*').eq('credito_id', credito.id).order('numero');
    const { data: m } = await db.supabase.from('movimientos').select('*').eq('credito_id', credito.id).order('created_at', { ascending: false });
    setCuotas(c || []);
    setMovimientos(m || []);
    setLoading(false);
  }

  async function registrarPago() {
    if (!montoPago || !compPago) return;
    setProcesando(true);
    try {
      const cuota = modalPago;
      const mora = diasMora(cuota.fecha_vencimiento);
      const interesM = mora > 0 ? Math.round(cuota.monto_total * (credito.tna * 1.5 / 100 / 365) * mora) : 0;
      const totalPagar = cuota.monto_total + interesM;

      // Actualizar cuota
      await db.supabase.from('cuotas').update({
        estado: 'pagada',
        fecha_pago: fechaPago,
        monto_pagado: parseFloat(montoPago),
        dias_mora: mora,
        interes_mora: interesM,
      }).eq('id', cuota.id);

      // Registrar movimiento
      await db.supabase.from('movimientos').insert({
        id: `MOV-${Date.now()}`,
        credito_id: credito.id,
        tipo: 'pago',
        concepto: `Pago cuota N° ${cuota.numero}/${credito.plazo}${mora > 0 ? ` (${mora} días de mora — interés mora: ${fmt(interesM)})` : ''} — Comp: ${compPago}`,
        monto: parseFloat(montoPago),
        fecha: fechaPago,
        usuario: user.nombre,
      });

      // Asiento contable automático — COBRO DE CUOTA
      const astIdPago = `AST-PAG-${cuota.id}-${Date.now()}`;
      const netoCuota = cuota.intereses + (cuota.seguro||0) + (cuota.comisiones||0);
      const ivaCuota = Math.round(netoCuota * 0.21 / 1.21); // IVA incluido en los importes
      await db.supabase.from('asientos').insert({
        id: astIdPago,
        fecha: fechaPago,
        descripcion: `Cobro cuota ${cuota.numero}/${credito.plazo} — ${credito.cliente_nombre}${mora > 0 ? ` (mora ${mora}d)` : ''}`,
        referencia: compPago,
        tipo: 'automatico',
        usuario: user.nombre,
      });
      const lineasPago = [
        { id: `LIN-PAG-1-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-11', debe: parseFloat(montoPago), haber: 0 },
        { id: `LIN-PAG-2-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-13', debe: 0, haber: cuota.capital },
        { id: `LIN-PAG-3-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-41', debe: 0, haber: cuota.intereses },
      ];
      if ((cuota.comisiones||0) > 0) lineasPago.push({ id: `LIN-PAG-4-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-42', debe: 0, haber: cuota.comisiones });
      if ((cuota.seguro||0) > 0) lineasPago.push({ id: `LIN-PAG-5-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-43', debe: 0, haber: cuota.seguro });
      if (mora > 0 && interesM > 0) lineasPago.push({ id: `LIN-PAG-6-${cuota.id}`, asiento_id: astIdPago, cuenta_id: 'cta-44', debe: 0, haber: interesM });
      await db.supabase.from('asiento_lineas').insert(lineasPago);

      // Movimiento en cuenta corriente banco
      await db.supabase.from('cuenta_banco').insert({
        id: `CB-PAG-${cuota.id}`,
        fecha: fechaPago,
        tipo: 'ingreso',
        concepto: `COBRO CUOTA ${cuota.numero}/${credito.plazo} — ${credito.cliente_nombre}${mora > 0 ? ` (mora ${mora}d)` : ''}`,
        referencia: compPago,
        monto: parseFloat(montoPago),
        origen: 'automatico',
        credito_id: credito.id,
        usuario: user.nombre,
      });

      setModalPago(null);
      setMontoPago('');
      setCompPago('');
      await cargar();
      onActualizar();
    } catch(e) {
      alert('Error al registrar el pago');
    }
    setProcesando(false);
  }

  const cuotasPagas = cuotas.filter(c => c.estado === 'pagada').length;
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente').length;
  const cuotasMora = cuotas.filter(c => c.estado === 'pendiente' && diasMora(c.fecha_vencimiento) > 0).length;
  const saldoCapital = cuotas.filter(c => c.estado === 'pendiente').reduce((a,c) => a + c.capital, 0);
  const proximaCuota = cuotas.find(c => c.estado === 'pendiente');

  return (
    <div style={{minHeight:'100vh',background:C.bg2,fontFamily:'system-ui,Arial,sans-serif'}}>
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div>
          <div style={{color:C.text,fontWeight:900,fontSize:15,letterSpacing:'0.08em',textTransform:'uppercase'}}>CUENTA CORRIENTE — {credito.cliente_nombre}</div>
          <div style={{color:C.text3,fontSize:10,marginTop:2}}>{credito.id} · DNI {credito.cliente_dni} · {credito.linea_nombre}</div>
        </div>
        <button onClick={onVolver} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          ← VOLVER
        </button>
      </div>

      <div style={{padding:28,maxWidth:1100,margin:'0 auto'}}>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24}}>
          {[
            ['MONTO ORIGINAL', fmt(credito.monto), C.text],
            ['SALDO CAPITAL', fmt(saldoCapital), C.gold],
            ['CUOTAS PAGAS', `${cuotasPagas}/${credito.plazo}`, C.green],
            ['CUOTAS PEND.', cuotasPendientes, C.text2],
            ['EN MORA', cuotasMora, cuotasMora>0?C.red:C.green],
            ['PRÓX. VENC.', proximaCuota?.fecha_vencimiento||'—', diasMora(proximaCuota?.fecha_vencimiento)>0?C.red:C.gold],
          ].map(([l,v,color]) => (
            <Card key={l} style={{padding:'14px'}}>
              <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{l}</div>
              <div style={{fontSize:14,fontWeight:900,color}}>{v}</div>
            </Card>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:20}}>

          {/* Plan de cuotas */}
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:12,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>PLAN DE CUOTAS</div>
              {!esAdmin && <span style={{fontSize:10,color:C.gold,fontWeight:700}}>🔒 SOLO LECTURA</span>}
            </div>
            {loading ? <div style={{padding:40,textAlign:'center',color:C.text3}}>CARGANDO...</div> : (
              <div style={{overflowX:'auto',maxHeight:520,overflowY:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead style={{position:'sticky',top:0}}>
                    <tr>
                      {['N°','VENC.','CAPITAL','INTERES','SEG+COM','TOTAL','MORA','ESTADO',''].map(h=>(
                        <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 10px',textAlign:h===''?'center':'right',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cuotas.map(c => {
                      const mora = c.estado === 'pendiente' ? diasMora(c.fecha_vencimiento) : c.dias_mora || 0;
                      const enMora = c.estado === 'pendiente' && mora > 0;
                      const pagada = c.estado === 'pagada';
                      return (
                        <tr key={c.id} style={{background:pagada?C.greenL:enMora?C.redL:'transparent',borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'8px 10px',color:C.text3,fontWeight:700,textAlign:'right'}}>{c.numero}</td>
                          <td style={{padding:'8px 10px',color:enMora?C.red:C.text2,textAlign:'right',whiteSpace:'nowrap'}}>{c.fecha_vencimiento}</td>
                          <td style={{padding:'8px 10px',color:C.text,textAlign:'right'}}>{fmt(c.capital)}</td>
                          <td style={{padding:'8px 10px',color:C.blue,textAlign:'right'}}>{fmt(c.intereses)}</td>
                          <td style={{padding:'8px 10px',color:C.text2,textAlign:'right'}}>{fmt((c.seguro||0)+(c.comisiones||0))}</td>
                          <td style={{padding:'8px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(c.monto_total)}</td>
                          <td style={{padding:'8px 10px',color:mora>0?C.red:C.text3,textAlign:'right',fontWeight:mora>0?700:400}}>{mora>0?`${mora}d`:'—'}</td>
                          <td style={{padding:'8px 10px',textAlign:'right'}}>
                            <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',color:pagada?C.green:enMora?C.red:C.gold}}>
                              {pagada?'PAGADA':enMora?'MORA':'PENDIENTE'}
                            </span>
                          </td>
                          <td style={{padding:'8px 10px',textAlign:'center'}}>
                            {esAdmin && c.estado==='pendiente' && (
                              <button onClick={()=>{setModalPago(c);setMontoPago(String(c.monto_total));}}
                                style={{background:C.goldL,color:C.gold,border:`1px solid ${C.goldB}`,borderRadius:6,padding:'4px 10px',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>
                                COBRAR
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Movimientos */}
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>MOVIMIENTOS</div>
            </div>
            <div style={{maxHeight:520,overflowY:'auto'}}>
              {movimientos.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:12}}>Sin movimientos registrados</div>
              ) : movimientos.map(m => (
                <div key={m.id} style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:m.tipo==='pago'?C.green:m.tipo==='mora'?C.red:C.gold,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:3}}>
                      {m.tipo==='pago'?'💰':m.tipo==='desembolso'?'🏦':'📋'} {m.tipo.toUpperCase()}
                    </div>
                    <div style={{fontSize:11,color:C.text2,fontWeight:400,lineHeight:1.4}}>{m.concepto}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:3}}>{m.fecha} · {m.usuario}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:m.tipo==='pago'?C.green:m.tipo==='desembolso'?C.gold:C.text,whiteSpace:'nowrap'}}>
                    {m.tipo==='pago'?'+':''}{fmt(m.monto)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de pago */}
      {modalPago && (
        <div style={{position:'fixed',inset:0,background:'rgba(3,15,30,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <Card style={{width:'100%',maxWidth:480,padding:32}}>
            <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>
              REGISTRAR PAGO — CUOTA {modalPago.numero}/{credito.plazo}
            </div>

            {diasMora(modalPago.fecha_vencimiento) > 0 && (
              <div style={{background:C.redL,border:`1px solid ${C.redB}`,borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:11,color:C.red,fontWeight:700}}>
                ⚠️ {diasMora(modalPago.fecha_vencimiento)} DÍAS DE MORA · Interés extra: {fmt(Math.round(modalPago.monto_total * (credito.tna * 1.5 / 100 / 365) * diasMora(modalPago.fecha_vencimiento)))}
              </div>
            )}

            <div style={{background:C.bg3,borderRadius:8,padding:14,marginBottom:20,border:`1px solid ${C.border}`}}>
              {[
                ['Cuota', `N° ${modalPago.numero} — Venc. ${modalPago.fecha_vencimiento}`],
                ['Monto original cuota', fmt(modalPago.monto_total)],
                ['Capital', fmt(modalPago.capital)],
                ['Intereses + IVA', fmt(modalPago.intereses)],
                ['Seguro + Comisiones', fmt((modalPago.seguro||0)+(modalPago.comisiones||0))],
              ].map(([l,v]) => (
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                  <span style={{color:C.text2}}>{l}</span>
                  <span style={{color:C.text,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>MONTO COBRADO *</label>
              <input type="number" value={montoPago} onChange={e=>setMontoPago(e.target.value)}
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.goldB}`,borderRadius:8,fontSize:14,color:C.gold,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:900,boxSizing:'border-box',outline:'none'}}/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>FECHA DE PAGO *</label>
              <input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)}
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>N° COMPROBANTE *</label>
              <input type="text" value={compPago} onChange={e=>setCompPago(e.target.value)} placeholder="N° recibo / transferencia"
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
            </div>

            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setModalPago(null)} style={{flex:1,background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                CANCELAR
              </button>
              <button onClick={registrarPago} disabled={procesando||!montoPago||!compPago}
                style={{flex:2,background:(!montoPago||!compPago||procesando)?'rgba(26,107,60,0.4)':'#1A6B3C',color:'#fff',border:'none',padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:(!montoPago||!compPago||procesando)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!montoPago||!compPago||procesando)?0.6:1}}>
                {procesando?'PROCESANDO...':'✓ REGISTRAR PAGO'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Panel Cartera Activa ──────────────────────────────────────────────────────
export default function ModuloF({ user, onVerCuenta }) {
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('activos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await db.supabase.from('creditos').select('*').order('created_at', { ascending: false });
    setCreditos(data || []);
    setLoading(false);
  }

  const lista = creditos.filter(c => {
    const matchFiltro = filtro === 'todos' || c.estado === filtro;
    const matchBusq = !busqueda || c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) || c.cliente_dni?.includes(busqueda) || c.id?.includes(busqueda);
    return matchFiltro && matchBusq;
  });

  const totActivos = creditos.filter(c=>c.estado==='activo').length;
  const totCapital = creditos.filter(c=>c.estado==='activo').reduce((a,c)=>a+c.monto,0);

  return (
    <div>
      <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>CARTERA ACTIVA</div>
      <div style={{fontSize:11,color:C.text3,marginBottom:20,fontWeight:400}}>{totActivos} crédito(s) activo(s) · Capital total: {fmt(totCapital)}</div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[
          ['CRÉDITOS ACTIVOS', totActivos, C.green, C.greenL, C.greenB],
          ['CAPITAL PRESTADO', fmt(totCapital), C.gold, C.goldL, C.goldB],
          ['CANCELADOS', creditos.filter(c=>c.estado==='cancelado').length, C.text2, 'rgba(255,255,255,0.05)', C.border],
        ].map(([l,v,color,bg,border]) => (
          <div key={l} style={{background:bg,borderRadius:12,padding:18,border:`1px solid ${border}`}}>
            <div style={{fontSize:24,fontWeight:900,color,lineHeight:1,marginBottom:6}}>{v}</div>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <div style={{display:'flex',gap:10,marginBottom:18,alignItems:'center'}}>
        <div style={{display:'flex',gap:8}}>
          {[['activos','ACTIVOS'],['cancelado','CANCELADOS'],['todos','TODOS']].map(([k,l]) => (
            <button key={k} onClick={()=>setFiltro(k)}
              style={{padding:'8px 14px',borderRadius:20,fontSize:10,fontWeight:700,background:filtro===k?C.gold:'rgba(255,255,255,0.05)',color:filtro===k?'#fff':C.text2,border:`1px solid ${filtro===k?C.gold:C.border}`,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              {l}
            </button>
          ))}
        </div>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre, DNI o ID..."
          style={{flex:1,padding:'8px 14px',border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',outline:'none'}}/>
      </div>

      {/* Lista de créditos */}
      {loading ? <div style={{textAlign:'center',padding:60,color:C.text3}}>CARGANDO...</div> :
       !lista.length ? (
        <Card style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>💳</div>
          <div style={{color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>NO HAY CRÉDITOS EN ESTA CATEGORÍA</div>
        </Card>
      ) : lista.map(c => (
        <Card key={c.id} onClick={()=>onVerCuenta(c)} style={{padding:18,marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${c.estado==='activo'?C.green:C.text3}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:22}}>💳</div>
              <div>
                <div style={{fontWeight:900,fontSize:14,color:C.text,textTransform:'uppercase',letterSpacing:'0.03em'}}>{c.cliente_nombre}</div>
                <div style={{fontSize:11,color:C.text2,marginTop:3}}>{c.id} · DNI {c.cliente_dni} · {c.linea_nombre}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:2}}>Desembolso: {c.fecha_desembolso} · Primera cuota: {c.fecha_primera_cuota}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:900,color:C.gold}}>{fmt(c.monto)}</div>
                <div style={{fontSize:10,color:C.text3}}>{c.plazo} cuotas · TNA {c.tna}%</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:c.estado==='activo'?C.green:C.text3,background:c.estado==='activo'?C.greenL:'rgba(255,255,255,0.05)',border:`1px solid ${c.estado==='activo'?C.greenB:C.border}`,borderRadius:20,padding:'3px 12px'}}>
                {c.estado.toUpperCase()}
              </span>
              <span style={{color:C.text3,fontSize:18}}>›</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export { CuentaCorriente };
