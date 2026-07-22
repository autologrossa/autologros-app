// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO H — REPORTES, DASHBOARD Y FACTURACIÓN
// Archivo: src/ModuloH.js
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

const IVA = 1.21;
const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n||0);
const fmtN = n => new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n||0);

function Card({children,style}){ return <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,...style}}>{children}</div>; }

function KPI({label,valor,color,bg,border,sub}){
  return (
    <div style={{background:bg||C.bg4,borderRadius:12,padding:20,border:`1px solid ${border||C.border}`}}>
      <div style={{fontSize:22,fontWeight:900,color:color||C.text,lineHeight:1,marginBottom:6}}>{valor}</div>
      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:color||C.text2}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:C.text3,marginTop:4,fontWeight:400}}>{sub}</div>}
    </div>
  );
}

export default function ModuloH({ user }) {
  const [tab, setTab] = useState('dashboard');
  const [creditos, setCreditos] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros para facturación
  const [mesDesde, setMesDesde] = useState(new Date().toISOString().slice(0,7));
  const [mesHasta, setMesHasta] = useState(new Date().toISOString().slice(0,7));

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const [{ data: cred }, { data: cuot }, { data: sols }] = await Promise.all([
      db.supabase.from('creditos').select('*'),
      db.supabase.from('cuotas').select('*'),
      db.supabase.from('solicitudes').select('*'),
    ]);
    setCreditos(cred || []);
    setCuotas(cuot || []);
    setSolicitudes(sols || []);
    setLoading(false);
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const hoy = new Date().toISOString().split('T')[0];
  const creditosActivos = creditos.filter(c => c.estado === 'activo');
  const capitalActivo = creditosActivos.reduce((a,c) => a+c.monto, 0);

  const cuotasPagas = cuotas.filter(c => c.estado === 'pagada');
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente');
  const cuotasVencidas = cuotasPendientes.filter(c => c.fecha_vencimiento < hoy);
  const cuotasProx7dias = cuotasPendientes.filter(c => {
    const d = new Date(c.fecha_vencimiento);
    const diff = (d - new Date()) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  });

  const totalCobrado = cuotasPagas.reduce((a,c) => a+c.monto_pagado, 0);
  const totalInteresesCobrados = cuotasPagas.reduce((a,c) => a+c.intereses+(c.seguro||0)+(c.comisiones||0), 0);
  const totalMoraCobrada = cuotasPagas.reduce((a,c) => a+(c.interes_mora||0), 0);
  const capitalEnMora = cuotasVencidas.reduce((a,c) => a+c.capital, 0);

  // Tasa de mora
  const tasaMora = creditosActivos.length > 0
    ? (new Set(cuotasVencidas.map(c=>c.credito_id)).size / creditosActivos.length * 100).toFixed(1)
    : 0;

  // Proyección próximos 30 días
  const proyeccion30 = cuotasPendientes
    .filter(c => { const d = new Date(c.fecha_vencimiento); return d >= new Date() && d <= new Date(Date.now()+30*24*60*60*1000); })
    .reduce((a,c) => a+c.monto_total, 0);

  // Originaciones por embajador
  const porEmbajador = creditosActivos.reduce((acc, c) => {
    if (!acc[c.emb_nombre]) acc[c.emb_nombre] = { cantidad: 0, monto: 0 };
    acc[c.emb_nombre].cantidad++;
    acc[c.emb_nombre].monto += c.monto;
    return acc;
  }, {});

  // Originaciones por mes (últimos 6 meses)
  const originacionesPorMes = creditos.reduce((acc, c) => {
    const mes = c.fecha_desembolso?.slice(0,7);
    if (!mes) return acc;
    if (!acc[mes]) acc[mes] = { cantidad: 0, monto: 0 };
    acc[mes].cantidad++;
    acc[mes].monto += c.monto;
    return acc;
  }, {});

  // ── Cuotas cobradas para facturación ─────────────────────────────────────
  const cuotasParaFacturar = cuotasPagas.filter(c => {
    const mes = c.fecha_pago?.slice(0,7);
    return mes >= mesDesde && mes <= mesHasta;
  });

  const totalNetoFacturar = cuotasParaFacturar.reduce((a,c) => a+(c.intereses+(c.seguro||0)+(c.comisiones||0)), 0);
  const ivaFacturar = totalNetoFacturar * 0.21;
  const totalConIvaFacturar = totalNetoFacturar + ivaFacturar;

  function imprimirReporteFacturacion() {
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Informe de Facturación — AUTOLOGROS S.A.</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:0;padding:24px}
      h1{font-size:16px;color:#C8922A;margin-bottom:4px}
      h2{font-size:13px;margin-bottom:12px;color:#333}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#f0f0f0;padding:8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #C8922A}
      td{padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:10px}
      .total{font-weight:900;background:#fff8e1}
      .resumen{background:#f0f7f0;border:2px solid #1a6b3c;border-radius:8px;padding:16px;margin-bottom:24px}
      .resumen h3{color:#1a6b3c;margin:0 0 12px 0}
      .fila{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #c8e6c9;font-size:11px}
    </style></head><body>
    <h1>AUTOLOGROS S.A. · CUIT 30-71934732-7</h1>
    <h2>INFORME DE FACTURACIÓN — Período ${mesDesde} al ${mesHasta}</h2>
    <div class="resumen">
      <h3>RESUMEN DEL PERÍODO</h3>
      <div class="fila"><span>Cuotas cobradas</span><strong>${cuotasParaFacturar.length}</strong></div>
      <div class="fila"><span>Neto facturable (intereses + seg + com)</span><strong>${fmt(totalNetoFacturar)}</strong></div>
      <div class="fila"><span>IVA 21%</span><strong>${fmt(ivaFacturar)}</strong></div>
      <div class="fila"><span style="font-weight:900">TOTAL CON IVA</span><strong style="color:#1a6b3c;font-size:14px">${fmt(totalConIvaFacturar)}</strong></div>
    </div>
    <table>
      <thead><tr>
        <th>Crédito</th><th>Cliente</th><th>Cuota N°</th><th>Fecha Pago</th>
        <th>Capital</th><th>Intereses</th><th>Seg+Com</th><th>Neto Fact.</th><th>IVA 21%</th><th>Total</th>
      </tr></thead>
      <tbody>
        ${cuotasParaFacturar.map(c => {
          const cred = creditos.find(cr => cr.id === c.credito_id) || {};
          const neto = c.intereses + (c.seguro||0) + (c.comisiones||0);
          const iva = neto * 0.21;
          return `<tr>
            <td>${c.credito_id}</td>
            <td>${cred.cliente_nombre||'—'}</td>
            <td>${c.numero}/${cred.plazo||'—'}</td>
            <td>${c.fecha_pago||'—'}</td>
            <td style="text-align:right">${fmt(c.capital)}</td>
            <td style="text-align:right">${fmt(c.intereses)}</td>
            <td style="text-align:right">${fmt((c.seguro||0)+(c.comisiones||0))}</td>
            <td style="text-align:right;font-weight:700">${fmt(neto)}</td>
            <td style="text-align:right">${fmt(iva)}</td>
            <td style="text-align:right;font-weight:900;color:#1a6b3c">${fmt(neto+iva)}</td>
          </tr>`;
        }).join('')}
        <tr class="total">
          <td colspan="7" style="text-align:right;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">TOTALES</td>
          <td style="text-align:right;font-weight:900">${fmt(totalNetoFacturar)}</td>
          <td style="text-align:right;font-weight:900">${fmt(ivaFacturar)}</td>
          <td style="text-align:right;font-weight:900;color:#1a6b3c;font-size:13px">${fmt(totalConIvaFacturar)}</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size:9px;color:#888;margin-top:16px;border-top:1px solid #e0e0e0;padding-top:8px">
      Generado el ${new Date().toLocaleString('es-AR')} por ${user.nombre} · AUTOLOGROS S.A. · Lavalle 1390, Piso 3, Of. B, CABA<br>
      Este informe es para uso interno. Las facturas deben emitirse a través de AFIP Facturador en Línea.
    </div>
    </body></html>`);
    ventana.document.close();
    setTimeout(() => ventana.print(), 500);
  }

  const Tabs = [
    ['dashboard','DASHBOARD'],
    ['cartera','CARTERA'],
    ['mora','MORA'],
    ['comercializadores','COMERCIALIZADORES'],
    ['facturacion','FACTURACIÓN'],
    ['proyeccion','PROYECCIÓN'],
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,flexWrap:'wrap'}}>
        {Tabs.map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:'8px 16px',borderRadius:20,fontSize:10,fontWeight:700,background:tab===k?C.gold:'rgba(255,255,255,0.05)',color:tab===k?'#fff':C.text2,border:`1px solid ${tab===k?C.gold:C.border}`,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
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
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>DASHBOARD GENERAL</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <KPI label="Capital activo" valor={fmt(capitalActivo)} color={C.gold} bg={C.goldL} border={C.goldB}/>
            <KPI label="Créditos activos" valor={creditosActivos.length} color={C.green} bg={C.greenL} border={C.greenB}/>
            <KPI label="Total cobrado" valor={fmt(totalCobrado)} color={C.blue} bg="rgba(74,154,224,0.08)" border="rgba(74,154,224,0.25)"/>
            <KPI label="Tasa de mora" valor={`${tasaMora}%`} color={parseFloat(tasaMora)>5?C.red:C.green} bg={parseFloat(tasaMora)>5?C.redL:C.greenL} border={parseFloat(tasaMora)>5?C.redB:C.greenB}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <KPI label="Cuotas cobradas" valor={cuotasPagas.length} color={C.green}/>
            <KPI label="Cuotas pendientes" valor={cuotasPendientes.length} color={C.gold}/>
            <KPI label="Cuotas en mora" valor={cuotasVencidas.length} color={cuotasVencidas.length>0?C.red:C.green}/>
            <KPI label="Vencen en 7 días" valor={cuotasProx7dias.length} color={cuotasProx7dias.length>0?C.gold:C.text2} sub="⚠️ Próximos vencimientos"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            <KPI label="Intereses cobrados" valor={fmt(totalInteresesCobrados)} color={C.blue}/>
            <KPI label="Intereses de mora" valor={fmt(totalMoraCobrada)} color={C.red}/>
            <KPI label="Proyección 30 días" valor={fmt(proyeccion30)} color={C.gold} sub="Cuotas a vencer próx. 30 días"/>
          </div>
        </div>
      )}

      {/* ── CARTERA ── */}
      {tab==='cartera'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>COMPOSICIÓN DE CARTERA</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <Card style={{padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>CRÉDITOS POR LÍNEA</div>
              {Object.entries(creditosActivos.reduce((acc,c)=>{
                if(!acc[c.linea_nombre])acc[c.linea_nombre]={cant:0,monto:0};
                acc[c.linea_nombre].cant++;acc[c.linea_nombre].monto+=c.monto;
                return acc;
              },{})).map(([linea,d])=>(
                <div key={linea} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{linea}</div>
                    <div style={{fontSize:10,color:C.text3}}>{d.cant} crédito(s)</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:C.gold}}>{fmt(d.monto)}</div>
                </div>
              ))}
              {creditosActivos.length===0&&<div style={{fontSize:12,color:C.text3,fontStyle:'italic'}}>Sin créditos activos</div>}
            </Card>
            <Card style={{padding:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>ORIGINACIONES POR MES</div>
              {Object.entries(originacionesPorMes).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6).map(([mes,d])=>(
                <div key={mes} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{mes}</div>
                    <div style={{fontSize:10,color:C.text3}}>{d.cantidad} originación(es)</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:C.gold}}>{fmt(d.monto)}</div>
                </div>
              ))}
              {Object.keys(originacionesPorMes).length===0&&<div style={{fontSize:12,color:C.text3,fontStyle:'italic'}}>Sin originaciones registradas</div>}
            </Card>
          </div>
        </div>
      )}

      {/* ── MORA ── */}
      {tab==='mora'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>GESTIÓN DE MORA</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
            <KPI label="Cuotas vencidas" valor={cuotasVencidas.length} color={C.red} bg={C.redL} border={C.redB}/>
            <KPI label="Capital en mora" valor={fmt(capitalEnMora)} color={C.red} bg={C.redL} border={C.redB}/>
            <KPI label="Tasa de mora" valor={`${tasaMora}%`} color={parseFloat(tasaMora)>5?C.red:C.green}/>
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.red,textTransform:'uppercase',letterSpacing:'0.06em'}}>CUOTAS VENCIDAS SIN PAGAR</div>
            </div>
            {cuotasVencidas.length===0?(
              <div style={{padding:40,textAlign:'center',color:C.green,fontSize:13,fontWeight:700}}>✓ SIN CUOTAS EN MORA</div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr>{['CRÉDITO','CLIENTE','CUOTA N°','VENCIMIENTO','DÍAS MORA','CAPITAL','INTERESES','TOTAL','INT. MORA'].map(h=>(
                      <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {cuotasVencidas.map(c=>{
                      const cred = creditos.find(cr=>cr.id===c.credito_id)||{};
                      const dias = Math.floor((new Date()-new Date(c.fecha_vencimiento))/(1000*60*60*24));
                      const intMora = Math.round(c.monto_total*(cred.tna*1.5/100/365)*dias);
                      return (
                        <tr key={c.id} style={{background:C.redL,borderBottom:`1px solid ${C.redB}`}}>
                          <td style={{padding:'8px 10px',color:C.text,fontWeight:700,textAlign:'right'}}>{c.credito_id}</td>
                          <td style={{padding:'8px 10px',color:C.text,textAlign:'right'}}>{cred.cliente_nombre||'—'}</td>
                          <td style={{padding:'8px 10px',color:C.text2,textAlign:'right'}}>{c.numero}/{cred.plazo||'—'}</td>
                          <td style={{padding:'8px 10px',color:C.red,fontWeight:700,textAlign:'right'}}>{c.fecha_vencimiento}</td>
                          <td style={{padding:'8px 10px',color:C.red,fontWeight:900,textAlign:'right'}}>{dias}d</td>
                          <td style={{padding:'8px 10px',color:C.text,textAlign:'right'}}>{fmt(c.capital)}</td>
                          <td style={{padding:'8px 10px',color:C.blue,textAlign:'right'}}>{fmt(c.intereses)}</td>
                          <td style={{padding:'8px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(c.monto_total)}</td>
                          <td style={{padding:'8px 10px',color:C.red,fontWeight:700,textAlign:'right'}}>{fmt(intMora)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Próximos vencimientos */}
          <Card style={{padding:0,overflow:'hidden',marginTop:20}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.gold,textTransform:'uppercase',letterSpacing:'0.06em'}}>⚠️ PRÓXIMOS VENCIMIENTOS — 7 DÍAS</div>
            </div>
            {cuotasProx7dias.length===0?(
              <div style={{padding:30,textAlign:'center',color:C.text3,fontSize:12}}>Sin vencimientos en los próximos 7 días</div>
            ):(
              <div>
                {cuotasProx7dias.map(c=>{
                  const cred = creditos.find(cr=>cr.id===c.credito_id)||{};
                  const dias = Math.ceil((new Date(c.fecha_vencimiento)-new Date())/(1000*60*60*24));
                  return (
                    <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:dias<=2?C.goldL:'transparent'}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{cred.cliente_nombre||'—'} · {cred.cliente_tel||'—'}</div>
                        <div style={{fontSize:10,color:C.text3}}>{c.credito_id} · Cuota {c.numero}/{cred.plazo||'—'} · Vence: {c.fecha_vencimiento}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:14,fontWeight:900,color:C.gold}}>{fmt(c.monto_total)}</div>
                        <div style={{fontSize:10,color:dias<=2?C.red:C.gold,fontWeight:700}}>en {dias} día(s)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── COMERCIALIZADORES ── */}
      {tab==='comercializadores'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>RANKING DE COMERCIALIZADORES</div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>{['POSICIÓN','COMERCIALIZADOR','CRÉDITOS','CAPITAL ORIGINADO','CUOTA PROM.'].map(h=>(
                  <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'12px 16px',textAlign:h==='EMBAJADOR'?'left':'right',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {Object.entries(porEmbajador).sort((a,b)=>b[1].monto-a[1].monto).map(([emb,d],i)=>(
                  <tr key={emb} style={{borderBottom:`1px solid ${C.border}`,background:i===0?C.goldL:'transparent'}}>
                    <td style={{padding:'12px 16px',textAlign:'right'}}>
                      <span style={{fontSize:16,fontWeight:900,color:i===0?C.gold:i===1?C.text:C.text3}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span>
                    </td>
                    <td style={{padding:'12px 16px',fontWeight:700,color:C.text}}>{emb}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:C.green,fontWeight:900}}>{d.cantidad}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:C.gold,fontWeight:900}}>{fmt(d.monto)}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:C.text2}}>{fmt(d.monto/d.cantidad)}</td>
                  </tr>
                ))}
                {Object.keys(porEmbajador).length===0&&(
                  <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:C.text3,fontSize:12}}>Sin datos de comercializadores</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── FACTURACIÓN ── */}
      {tab==='facturacion'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>INFORME DE FACTURACIÓN</div>
          <div style={{fontSize:11,color:C.text3,marginBottom:20,fontWeight:400}}>Cuotas cobradas en el período seleccionado · Factura B — Responsable Inscripto</div>

          {/* Selector de período */}
          <Card style={{padding:20,marginBottom:20}}>
            <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>DESDE (MES)</label>
                <input type="month" value={mesDesde} onChange={e=>setMesDesde(e.target.value)}
                  style={{padding:'8px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',outline:'none'}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>HASTA (MES)</label>
                <input type="month" value={mesHasta} onChange={e=>setMesHasta(e.target.value)}
                  style={{padding:'8px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',outline:'none'}}/>
              </div>
              <button onClick={imprimirReporteFacturacion}
                style={{background:C.gold,color:'#fff',border:'none',padding:'10px 24px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',marginTop:22}}>
                🖨️ IMPRIMIR / PDF
              </button>
            </div>
          </Card>

          {/* Resumen */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <KPI label="Cuotas cobradas" valor={cuotasParaFacturar.length} color={C.green} bg={C.greenL} border={C.greenB}/>
            <KPI label="Neto facturable" valor={fmt(totalNetoFacturar)} color={C.blue}/>
            <KPI label="IVA 21%" valor={fmt(ivaFacturar)} color={C.text2}/>
            <KPI label="Total con IVA" valor={fmt(totalConIvaFacturar)} color={C.gold} bg={C.goldL} border={C.goldB}/>
          </div>

          {/* Aviso */}
          <div style={{background:C.goldL,border:`1px solid ${C.goldB}`,borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:11,color:C.gold,fontWeight:700}}>
            💡 Este informe es de uso interno. Las facturas se emiten manualmente en AFIP Facturador en Línea. El administrador decide cuáles cuotas facturar y cuándo.
          </div>

          {/* Tabla de cuotas */}
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>{['CRÉDITO','CLIENTE','CUOTA','FECHA PAGO','CAPITAL','INTERESES','SEG+COM','NETO FACT.','IVA 21%','TOTAL FACT.'].map(h=>(
                    <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {cuotasParaFacturar.length===0?(
                    <tr><td colSpan={10} style={{padding:40,textAlign:'center',color:C.text3,fontSize:12}}>Sin cuotas cobradas en el período seleccionado</td></tr>
                  ):cuotasParaFacturar.map(c=>{
                    const cred = creditos.find(cr=>cr.id===c.credito_id)||{};
                    const neto = c.intereses+(c.seguro||0)+(c.comisiones||0);
                    const iva = neto*0.21;
                    return (
                      <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'7px 10px',color:C.text,fontWeight:700,textAlign:'right'}}>{c.credito_id}</td>
                        <td style={{padding:'7px 10px',color:C.text2,textAlign:'right',whiteSpace:'nowrap'}}>{cred.cliente_nombre||'—'}</td>
                        <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{c.numero}/{cred.plazo||'—'}</td>
                        <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{c.fecha_pago}</td>
                        <td style={{padding:'7px 10px',color:C.text,textAlign:'right'}}>{fmt(c.capital)}</td>
                        <td style={{padding:'7px 10px',color:C.blue,textAlign:'right'}}>{fmt(c.intereses)}</td>
                        <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{fmt((c.seguro||0)+(c.comisiones||0))}</td>
                        <td style={{padding:'7px 10px',color:C.text,fontWeight:700,textAlign:'right'}}>{fmt(neto)}</td>
                        <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{fmt(iva)}</td>
                        <td style={{padding:'7px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(neto+iva)}</td>
                      </tr>
                    );
                  })}
                  {cuotasParaFacturar.length>0&&(
                    <tr style={{background:C.bg3}}>
                      <td colSpan={7} style={{padding:'10px',color:C.text2,fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.04em',textAlign:'right'}}>TOTALES</td>
                      <td style={{padding:'10px',color:C.text,fontWeight:900,textAlign:'right'}}>{fmt(totalNetoFacturar)}</td>
                      <td style={{padding:'10px',color:C.text2,fontWeight:900,textAlign:'right'}}>{fmt(ivaFacturar)}</td>
                      <td style={{padding:'10px',color:C.gold,fontWeight:900,fontSize:13,textAlign:'right'}}>{fmt(totalConIvaFacturar)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── PROYECCIÓN ── */}
      {tab==='proyeccion'&&(
        <div>
          <div style={{fontSize:14,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>PROYECCIÓN DE COBROS</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
            {[7,15,30].map(dias=>{
              const total = cuotasPendientes
                .filter(c=>{const d=new Date(c.fecha_vencimiento);return d>=new Date()&&d<=new Date(Date.now()+dias*24*60*60*1000);})
                .reduce((a,c)=>a+c.monto_total,0);
              const cant = cuotasPendientes
                .filter(c=>{const d=new Date(c.fecha_vencimiento);return d>=new Date()&&d<=new Date(Date.now()+dias*24*60*60*1000);}).length;
              return <KPI key={dias} label={`Próximos ${dias} días`} valor={fmt(total)} color={C.gold} sub={`${cant} cuota(s)`}/>;
            })}
          </div>
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>PRÓXIMAS CUOTAS A VENCER</div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>{['VENCIMIENTO','DÍAS','CRÉDITO','CLIENTE','TELÉFONO','CUOTA N°','TOTAL','CAPITAL','INTERESES'].map(h=>(
                    <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {cuotasPendientes
                    .filter(c=>new Date(c.fecha_vencimiento)>=new Date())
                    .sort((a,b)=>a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
                    .slice(0,30)
                    .map(c=>{
                      const cred=creditos.find(cr=>cr.id===c.credito_id)||{};
                      const dias=Math.ceil((new Date(c.fecha_vencimiento)-new Date())/(1000*60*60*24));
                      return (
                        <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,background:dias<=3?C.goldL:'transparent'}}>
                          <td style={{padding:'7px 10px',color:dias<=3?C.gold:C.text,fontWeight:dias<=3?700:400,textAlign:'right'}}>{c.fecha_vencimiento}</td>
                          <td style={{padding:'7px 10px',color:dias<=3?C.gold:C.text3,fontWeight:700,textAlign:'right'}}>{dias}d</td>
                          <td style={{padding:'7px 10px',color:C.text,fontWeight:700,textAlign:'right'}}>{c.credito_id}</td>
                          <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{cred.cliente_nombre||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text3,textAlign:'right'}}>{cred.cliente_tel||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.text2,textAlign:'right'}}>{c.numero}/{cred.plazo||'—'}</td>
                          <td style={{padding:'7px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(c.monto_total)}</td>
                          <td style={{padding:'7px 10px',color:C.text,textAlign:'right'}}>{fmt(c.capital)}</td>
                          <td style={{padding:'7px 10px',color:C.blue,textAlign:'right'}}>{fmt(c.intereses)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      </>}
    </div>
  );
}
