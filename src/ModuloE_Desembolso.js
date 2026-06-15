// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO E — DESEMBOLSO Y ACTIVACIÓN DEL CRÉDITO
// Archivo: src/ModuloE.js
// Acceso: Administrador únicamente
// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCCIONES DE INTEGRACIÓN:
// 1. Copiar a src/ModuloE.js
// 2. En App.js agregar: import ModuloE from './ModuloE';
// 3. En Admin agregar estado: const [moduloE, setModuloE] = useState(null);
// 4. En Admin agregar render: if(moduloE) return <ModuloE sol={moduloE} user={user} onVolver={()=>setModuloE(null)} onActualizar={cargar}/>;
// 5. En la tabla de solicitudes del Admin, botón para solicitudes firmadas:
//    <Btn onClick={()=>setModuloE(s)}>DESEMBOLSAR</Btn>
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
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

// ── Cálculo del plan de pagos ─────────────────────────────────────────────────
function generarPlanPagos(monto, tna, seguro, comisiones, gastos, plazo, fechaPrimeracuota) {
  const tm = (tna/100/12) * IVA;
  const tseg = (seguro/100) * IVA;
  const tcom = (comisiones/100) * IVA;

  // Cuota de capital e intereses (sistema francés)
  const cuotaK = tm === 0
    ? monto / plazo
    : (monto * tm * Math.pow(1+tm, plazo)) / (Math.pow(1+tm, plazo) - 1);

  let saldo = monto;
  const cuotas = [];
  const fecha = new Date(fechaPrimeracuota);

  for (let i = 1; i <= plazo; i++) {
    const interes = saldo * tm;
    const capital = cuotaK - interes;
    const seg = saldo * tseg;
    const com = saldo * tcom;
    const total = capital + interes + seg + com;

    cuotas.push({
      id: `CTA-${Date.now()}-${i}`,
      numero: i,
      fecha_vencimiento: new Date(fecha).toISOString().split('T')[0],
      monto_total: Math.round(total),
      capital: Math.round(capital),
      intereses: Math.round(interes),
      seguro: Math.round(seg),
      comisiones: Math.round(com),
      estado: 'pendiente',
    });

    saldo -= capital;
    fecha.setMonth(fecha.getMonth() + 1);
  }

  return cuotas;
}

export default function ModuloE({ sol, user, onVolver, onActualizar }) {
  const cli = sol?.cliente || {};
  const [fechaDesembolso, setFechaDesembolso] = useState(new Date().toISOString().split('T')[0]);
  const [comprobante, setComprobante] = useState('');
  const [obs, setObs] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(false);
  const [creditoId, setCreditoId] = useState(null);

  // Calcular fecha primera cuota (30 días desde desembolso)
  const fechaPrimeraCuota = new Date(fechaDesembolso);
  fechaPrimeraCuota.setDate(fechaPrimeraCuota.getDate() + 30);
  const fechaPrimeraCuotaStr = fechaPrimeraCuota.toISOString().split('T')[0];

  // Calcular desembolso real (descontando gastos)
  const gastos = sol?.gastos || 0;
  const montoDesembolso = sol?.monto - (sol?.monto * (gastos/100) * IVA);

  // Preview del plan de pagos (primeras 3 cuotas)
  const planPreview = generarPlanPagos(
    sol?.monto || 0,
    sol?.tna || 0,
    sol?.seguro || 0,
    sol?.comisiones || 0,
    sol?.gastos || 0,
    sol?.plazo || 0,
    fechaPrimeraCuotaStr
  );

  async function confirmarDesembolso() {
    if (!comprobante) {
      alert('Ingresá el número de comprobante de transferencia');
      return;
    }
    setProcesando(true);
    try {
      const id = `CRED-${Date.now()}`;
      
      // 1. Crear el crédito
      const { error: errCred } = await db.supabase.from('creditos').insert({
        id,
        solicitud_id: sol.id,
        cliente_nombre: `${cli.nombre} ${cli.apellido}`,
        cliente_dni: cli.dni,
        cliente_cuil: cli.cuil,
        cliente_email: cli.email,
        cliente_tel: cli.tel,
        cliente_cbu: cli.cbu,
        linea_nombre: sol.linea_nombre,
        monto: sol.monto,
        plazo: sol.plazo,
        tna: sol.tna,
        seguro: sol.seguro || 0,
        comisiones: sol.comisiones || 0,
        gastos: sol.gastos || 0,
        cuota: sol.cuota,
        fecha_desembolso: fechaDesembolso,
        fecha_primera_cuota: fechaPrimeraCuotaStr,
        estado: 'activo',
        emb_nombre: sol.emb_nombre,
        analista: sol.analista || user.nombre,
      });
      if (errCred) throw errCred;

      // 2. Generar plan de pagos completo
      const plan = generarPlanPagos(
        sol.monto, sol.tna, sol.seguro||0, sol.comisiones||0,
        sol.gastos||0, sol.plazo, fechaPrimeraCuotaStr
      );
      const cuotasConCredito = plan.map(c => ({ ...c, credito_id: id }));
      const { error: errCuotas } = await db.supabase.from('cuotas').insert(cuotasConCredito);
      if (errCuotas) throw errCuotas;

      // 3. Registrar movimiento de desembolso
      await db.supabase.from('movimientos').insert({
        id: `MOV-${Date.now()}`,
        credito_id: id,
        tipo: 'desembolso',
        concepto: `Desembolso préstamo ${sol.linea_nombre} — Comprobante ${comprobante}${obs ? ' — ' + obs : ''}`,
        monto: montoDesembolso,
        fecha: fechaDesembolso,
        usuario: user.nombre,
      });

      // 4. Actualizar estado de la solicitud
      await db.updateSolicitud(sol.id, {
        estado: 'aprobado',
        estado_texto: 'DESEMBOLSADO — CRÉDITO ACTIVO',
        credito_id: id,
        fecha_desembolso: fechaDesembolso,
      });

      setCreditoId(id);
      setExito(true);
      onActualizar();
    } catch(e) {
      alert('Error al procesar el desembolso. Verificá la conexión e intentá de nuevo.');
      console.error(e);
    }
    setProcesando(false);
  }

  if (exito) return (
    <div style={{minHeight:'100vh',background:C.bg2,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:480,padding:40}}>
        <div style={{fontSize:56,marginBottom:16}}>✅</div>
        <div style={{fontSize:20,fontWeight:900,color:C.green,marginBottom:8,letterSpacing:'0.06em',textTransform:'uppercase'}}>CRÉDITO ACTIVADO</div>
        <div style={{fontSize:13,color:C.text2,marginBottom:6}}>Préstamo {creditoId} activo</div>
        <div style={{fontSize:13,color:C.text2,marginBottom:24}}>Plan de {sol.plazo} cuotas generado · Primera cuota: {fechaPrimeraCuotaStr}</div>
        <div style={{background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:10,padding:18,marginBottom:24,fontSize:12,color:C.text2,textAlign:'left'}}>
          <div style={{fontWeight:700,color:C.green,marginBottom:8}}>RESUMEN DEL DESEMBOLSO</div>
          {[
            ['Cliente', `${cli.nombre} ${cli.apellido}`],
            ['Monto desembolsado', fmt(montoDesembolso)],
            ['CBU/CVU destino', cli.cbu],
            ['Comprobante', comprobante],
            ['Fecha desembolso', fechaDesembolso],
            ['Primera cuota', fechaPrimeraCuotaStr],
          ].map(([l,v]) => (
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${C.greenB}`,fontSize:11}}>
              <span style={{color:C.text2}}>{l}</span>
              <span style={{color:C.text,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onVolver} style={{background:'transparent',color:C.gold,border:`1.5px solid ${C.gold}`,padding:'10px 28px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.08em',textTransform:'uppercase'}}>
          VOLVER AL PANEL
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg2,fontFamily:'system-ui,Arial,sans-serif'}}>
      {/* Header */}
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <svg width={30} height={30} viewBox="0 0 44 44" fill="none">
            <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
            <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
            <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text>
          </svg>
          <div>
            <div style={{color:C.text,fontWeight:900,fontSize:15,letterSpacing:'0.1em',textTransform:'uppercase'}}>MÓDULO E — DESEMBOLSO</div>
            <div style={{color:C.text3,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',marginTop:1}}>{cli.nombre} {cli.apellido} · {sol.id}</div>
          </div>
        </div>
        <button onClick={onVolver} style={{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'9px 16px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          ← VOLVER
        </button>
      </div>

      <div style={{padding:28,maxWidth:960,margin:'0 auto'}}>

        {/* Datos del préstamo */}
        <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>RESUMEN DEL PRÉSTAMO A DESEMBOLSAR</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
            {[
              ['CLIENTE', `${cli.nombre} ${cli.apellido}`],
              ['DNI', cli.dni],
              ['LÍNEA', sol.linea_nombre],
              ['TNA', `${sol.tna}%`],
              ['MONTO PRÉSTAMO', fmt(sol.monto)],
              ['GASTOS ORIGEN', `${sol.gastos||0}% + IVA`],
              ['CLIENTE RECIBE', fmt(montoDesembolso), C.gold],
              ['CBU/CVU', cli.cbu],
            ].map(([l,v,color]) => (
              <div key={l} style={{background:C.bg3,borderRadius:8,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,fontWeight:900,color:color||C.text,wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.goldL,border:`1px solid ${C.goldB}`,borderRadius:8,padding:'10px 14px',fontSize:11,color:C.gold,fontWeight:700}}>
            ⚠️ Verificá que el CBU/CVU sea correcto antes de confirmar el desembolso. La transferencia es irreversible.
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

          {/* Formulario de desembolso */}
          <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
            <div style={{fontSize:13,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:20}}>CONFIRMAR DESEMBOLSO</div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>FECHA DE DESEMBOLSO *</label>
              <input type="date" value={fechaDesembolso} onChange={e=>setFechaDesembolso(e.target.value)}
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>N° COMPROBANTE DE TRANSFERENCIA *</label>
              <input type="text" value={comprobante} onChange={e=>setComprobante(e.target.value)} placeholder="Ej: TRF-2024-00123456"
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${comprobante?C.gold:C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
              <div style={{fontSize:10,color:C.text3,marginTop:4}}>Número de transferencia del banco o CVU</div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>OBSERVACIONES</label>
              <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Notas adicionales sobre el desembolso..."
                style={{width:'100%',minHeight:70,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/>
            </div>

            <div style={{background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:10,padding:16,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>AL CONFIRMAR SE EJECUTARÁ:</div>
              {[
                '✓ Alta del crédito en la base de datos',
                '✓ Generación del plan de ' + sol.plazo + ' cuotas',
                '✓ Creación de la cuenta corriente del cliente',
                '✓ Registro del movimiento de desembolso',
                '✓ Actualización del estado de la solicitud',
              ].map((item,i) => (
                <div key={i} style={{fontSize:11,color:C.text2,padding:'3px 0'}}>{item}</div>
              ))}
            </div>

            <button onClick={confirmarDesembolso} disabled={procesando||!comprobante}
              style={{width:'100%',background:(!comprobante||procesando)?'rgba(26,107,60,0.4)':'#1A6B3C',color:'#fff',border:'none',padding:'14px',borderRadius:8,fontSize:13,fontWeight:700,cursor:(!comprobante||procesando)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.08em',textTransform:'uppercase',opacity:(!comprobante||procesando)?0.6:1}}>
              {procesando ? 'PROCESANDO...' : `✓ CONFIRMAR DESEMBOLSO — ${fmt(montoDesembolso)}`}
            </button>
          </div>

          {/* Preview plan de pagos */}
          <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:24}}>
            <div style={{fontSize:13,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>PLAN DE PAGOS</div>
            <div style={{fontSize:11,color:C.text3,marginBottom:16,fontWeight:400}}>Primera cuota: {fechaPrimeraCuotaStr} · {sol.plazo} cuotas</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>
                    {['N°','VENCIMIENTO','CAPITAL','INTERESES','SEG+COM','TOTAL'].map(h=>(
                      <th key={h} style={{background:C.bg3,color:C.text2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',padding:'8px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planPreview.map((c,i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'rgba(255,255,255,0.02)':'transparent'}}>
                      <td style={{padding:'8px 10px',color:C.text3,fontWeight:700,textAlign:'right'}}>{c.numero}</td>
                      <td style={{padding:'8px 10px',color:C.text2,textAlign:'right'}}>{c.fecha_vencimiento}</td>
                      <td style={{padding:'8px 10px',color:C.text,textAlign:'right'}}>{fmt(c.capital)}</td>
                      <td style={{padding:'8px 10px',color:C.blue,textAlign:'right'}}>{fmt(c.intereses)}</td>
                      <td style={{padding:'8px 10px',color:C.text2,textAlign:'right'}}>{fmt(c.seguro+c.comisiones)}</td>
                      <td style={{padding:'8px 10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(c.monto_total)}</td>
                    </tr>
                  ))}
                  {planPreview.length < sol.plazo && (
                    <tr>
                      <td colSpan={6} style={{padding:'8px 10px',color:C.text3,textAlign:'center',fontSize:10,fontStyle:'italic'}}>
                        ... {sol.plazo - planPreview.length} cuotas más
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{background:C.bg3}}>
                    <td colSpan={2} style={{padding:'10px',color:C.text2,fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.04em'}}>TOTALES</td>
                    <td style={{padding:'10px',color:C.text,fontWeight:900,textAlign:'right'}}>{fmt(planPreview.reduce((a,c)=>a+c.capital,0))}</td>
                    <td style={{padding:'10px',color:C.blue,fontWeight:900,textAlign:'right'}}>{fmt(planPreview.reduce((a,c)=>a+c.intereses,0))}</td>
                    <td style={{padding:'10px',color:C.text2,fontWeight:900,textAlign:'right'}}>{fmt(planPreview.reduce((a,c)=>a+c.seguro+c.comisiones,0))}</td>
                    <td style={{padding:'10px',color:C.gold,fontWeight:900,textAlign:'right'}}>{fmt(planPreview.reduce((a,c)=>a+c.monto_total,0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
