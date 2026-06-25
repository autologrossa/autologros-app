// ══════════════════════════════════════════════════════════════════════════════
// PORTAL DE FIRMA DIGITAL — CLIENTE
// Archivo: src/pages/Firma.jsx  (o src/FirmaCliente.jsx)
// Ruta Vercel: /firma/:token
// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCCIONES DE INTEGRACIÓN:
// 1. Instalar: npm install react-router-dom crypto-js
// 2. En src/main.jsx o index.jsx envolver App con <BrowserRouter>
// 3. Agregar ruta en App.jsx:
//    import { Routes, Route } from 'react-router-dom'
//    import FirmaCliente from './FirmaCliente'
//    <Routes>
//      <Route path="/" element={<AppPrincipal/>} />
//      <Route path="/firma/:token" element={<FirmaCliente/>} />
//    </Routes>
// 4. En supabase.js agregar los métodos: getSolicitudByToken, saveFirmaCliente
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generarTokenSesion() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Canvas firma ──────────────────────────────────────────────────────────────
function CanvasFirma({ onFirma, label }) {
  const canvasRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    setDibujando(true);
    setLastPos(pos);
  }

  function draw(e) {
    e.preventDefault();
    if (!dibujando) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setLastPos(pos);
    setTieneFirma(true);
  }

  function endDraw(e) {
    e.preventDefault();
    setDibujando(false);
    if (tieneFirma) {
      const canvas = canvasRef.current;
      onFirma(canvas.toDataURL('image/png'));
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
    onFirma(null);
  }

  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>{label}</div>
      <div style={{position:'relative',borderRadius:10,border:`1.5px solid ${tieneFirma?C.gold:C.border2}`,overflow:'hidden',background:'rgba(255,255,255,0.03)',touchAction:'none'}}>
        <canvas ref={canvasRef} width={600} height={160}
          style={{display:'block',width:'100%',height:160,cursor:'crosshair',touchAction:'none'}}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        {!tieneFirma && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{fontSize:12,color:C.text3,fontWeight:400}}>Dibuje su firma aquí</div>
          </div>
        )}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
        <button onClick={limpiar} style={{background:'none',border:'none',color:C.text3,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
          BORRAR Y VOLVER A FIRMAR
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function FirmaCliente() {
  const { token } = useParams();
  const [paso, setPaso] = useState('cargando'); 
  // cargando | invalido | expirado | ya_firmado | leyendo_mutuo | leyendo_pagare | firmando | selfie | completado | error
  const [sol, setSol] = useState(null);
  const [firmaMutuo, setFirmaMutuo] = useState(null);
  const [firmaPagare, setFirmaPagare] = useState(null);
  const [aclaracion, setAclaracion] = useState('');
  const [dniConfirmado, setDniConfirmado] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [geo, setGeo] = useState(null);
  const [userAgent] = useState(navigator.userAgent);
  const [sessionToken] = useState(generarTokenSesion());
  const [procesando, setProcesando] = useState(false);
  const videoRef = useRef(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => { cargarSolicitud(); }, [token]);

  async function cargarSolicitud() {
    try {
      // Obtener IP pública
      let ip = 'N/D';
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const d = await r.json();
        ip = d.ip;
      } catch {}
      
      const s = await db.getSolicitudByToken(token);
      if (!s) { setPaso('invalido'); return; }
      
      // Verificar expiración (48hs)
      const creacion = new Date(s.fecha_token_generado || s.fecha_envio_contrato_iso || new Date());
      const ahora = new Date();
      const diffHs = (ahora - creacion) / (1000 * 60 * 60);
      if (diffHs > 48) { setPaso('expirado'); return; }
      
      // Verificar si ya firmó
      if (s.firma_cliente_completada) { setPaso('ya_firmado'); return; }
      
      setSol({ ...s, ip_cliente: ip });
      
      // Obtener geolocalización
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => setGeo(null)
        );
      }
      
      setPaso('bienvenida');
    } catch(e) {
      setPaso('error');
    }
  }

  async function abrirCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setCamaraActiva(true);
    } catch {
      alert('No se pudo acceder a la cámara. Por favor permita el acceso e intente nuevamente.');
    }
  }

  function tomarFoto() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSelfie(canvas.toDataURL('image/jpeg', 0.85));
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCamaraActiva(false);
  }

  function rehacerSelfie() {
    setSelfie(null);
    setCamaraActiva(false);
  }

  async function completarFirma() {
    if (!firmaMutuo || !firmaPagare || !aclaracion || !dniConfirmado || !selfie) return;
    if (dniConfirmado !== sol.cliente?.dni) {
      alert('El DNI ingresado no coincide con el registrado en la solicitud.');
      return;
    }
    
    setProcesando(true);
    try {
      const ahora = new Date();
      const timestamp = ahora.toISOString();
      const timestampAR = ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'long' });
      
      // Hash del contrato
      const textoContrato = `SOLICITUD:${sol.id}|CLIENTE:${sol.cliente?.cuil}|MONTO:${sol.monto}|PLAZO:${sol.plazo}|TNA:${sol.tna}|TIMESTAMP:${timestamp}`;
      const hashDocumento = await sha256(textoContrato);
      
      const metadataFirma = {
        timestamp_utc: timestamp,
        timestamp_ar: timestampAR,
        ip_cliente: sol.ip_cliente || 'N/D',
        user_agent: userAgent,
        geolocalizacion: geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)} (±${Math.round(geo.accuracy)}m)` : 'No disponible',
        hash_documento: hashDocumento,
        token_sesion: sessionToken,
        aclaracion_firmante: aclaracion,
        dni_confirmado: dniConfirmado,
        firma_mutuo_png: firmaMutuo,
        firma_pagare_png: firmaPagare,
        selfie_png: selfie,
      };

      await db.saveFirmaCliente(sol.id, metadataFirma);
      setPaso('completado');
    } catch(e) {
      alert('Error al guardar la firma. Por favor intente nuevamente.');
    }
    setProcesando(false);
  }

  // ── Pantallas de estado ───────────────────────────────────────────────────
  const Pantalla = ({ emoji, titulo, texto, color }) => (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:52,marginBottom:16}}>{emoji}</div>
        <div style={{fontSize:18,fontWeight:900,color:color||C.text,marginBottom:8,letterSpacing:'0.04em',textTransform:'uppercase'}}>{titulo}</div>
        <div style={{fontSize:13,color:C.text2,fontWeight:400,lineHeight:1.6}}>{texto}</div>
        <div style={{marginTop:24,fontSize:11,color:C.text3}}>{EMPRESA.nombre} · CUIT {EMPRESA.cuit}</div>
      </div>
    </div>
  );

  if (paso === 'cargando') return <Pantalla emoji="⏳" titulo="Cargando..." texto="Verificando su enlace de firma." />;
  if (paso === 'invalido') return <Pantalla emoji="❌" titulo="Enlace inválido" texto="Este enlace de firma no existe o no es válido. Comuníquese con AUTOLOGROS S.A." color={C.red} />;
  if (paso === 'expirado') return <Pantalla emoji="⏰" titulo="Enlace expirado" texto="Este enlace de firma ha vencido (48 horas). Comuníquese con AUTOLOGROS S.A. para recibir un nuevo enlace." color={C.gold} />;
  if (paso === 'ya_firmado') return <Pantalla emoji="✅" titulo="Documentos ya firmados" texto="Ya completó el proceso de firma digital. Sus documentos han sido registrados correctamente." color={C.green} />;
  if (paso === 'error') return <Pantalla emoji="⚠️" titulo="Error de conexión" texto="No se pudo cargar su información. Por favor intente nuevamente o comuníquese con AUTOLOGROS S.A." color={C.red} />;
  if (paso === 'completado') return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:480}}>
        <div style={{fontSize:56,marginBottom:16}}>✅</div>
        <div style={{fontSize:20,fontWeight:900,color:C.green,marginBottom:12,letterSpacing:'0.04em',textTransform:'uppercase'}}>Firma completada</div>
        <div style={{fontSize:13,color:C.text2,fontWeight:400,lineHeight:1.8,marginBottom:20}}>
          Sus documentos han sido firmados y registrados correctamente.<br/>
          En breve {EMPRESA.nombre} procesará su préstamo y recibirá la confirmación del desembolso.
        </div>
        <div style={{background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:10,padding:18,fontSize:11,color:C.text2,textAlign:'left',lineHeight:1.8}}>
          <strong style={{color:C.green}}>Registro de firma:</strong><br/>
          Solicitante: {sol?.cliente?.nombre} {sol?.cliente?.apellido}<br/>
          Solicitud: {sol?.id}<br/>
          Fecha y hora: {new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}<br/>
          IP: {sol?.ip_cliente}
        </div>
        <div style={{marginTop:20,fontSize:11,color:C.text3}}>{EMPRESA.nombre} · CUIT {EMPRESA.cuit}</div>
      </div>
    </div>
  );

  const cli = sol?.cliente || {};

  // ── Layout principal ──────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`,fontFamily:'system-ui,Arial,sans-serif'}}>
      
      {/* Header */}
      <div style={{background:'rgba(6,23,46,0.95)',borderBottom:`1px solid ${C.border}`,padding:'14px 20px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:100}}>
        <svg width={30} height={30} viewBox="0 0 44 44" fill="none">
          <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
          <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
          <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text>
        </svg>
        <div>
          <div style={{color:C.text,fontWeight:900,fontSize:14,letterSpacing:'0.1em',textTransform:'uppercase'}}>AUTOLOGROS S.A.</div>
          <div style={{color:C.text3,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase'}}>FIRMA DIGITAL SEGURA · CUIT {EMPRESA.cuit}</div>
        </div>
        <div style={{marginLeft:'auto',background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:20,padding:'4px 12px',fontSize:10,color:C.green,fontWeight:700,letterSpacing:'0.06em'}}>
          🔒 CONEXIÓN SEGURA
        </div>
      </div>

      <div style={{padding:'24px 20px',maxWidth:680,margin:'0 auto'}}>

        {/* ── BIENVENIDA ── */}
        {paso === 'bienvenida' && (
          <div>
            <div style={{textAlign:'center',marginBottom:28}}>
              <div style={{fontSize:32,marginBottom:12}}>📋</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:8}}>Hola, {cli.nombre}</div>
              <div style={{fontSize:13,color:C.text2,fontWeight:400,lineHeight:1.7}}>
                Su solicitud de préstamo fue pre-aprobada.<br/>
                A continuación deberá leer y firmar digitalmente los documentos.
              </div>
            </div>

            {/* Resumen del préstamo */}
            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>RESUMEN DE SU PRÉSTAMO</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['Monto',fmt(sol.monto)],['Cuota mensual',fmt(sol.cuota)],['Plazo',`${sol.plazo} meses`],['TNA',`${sol.tna}%`]].map(([l,v])=>(
                  <div key={l} style={{background:C.bg3,borderRadius:8,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:10,color:C.text3,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:900,color:C.text}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pasos */}
            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>PASOS A SEGUIR</div>
              {[
                ['1','Leer el Contrato de Mutuo y firmarlo'],
                ['2','Leer el Pagaré y firmarlo'],
                ['3','Tomar una selfie para verificar su identidad'],
              ].map(([n,l])=>(
                <div key={n} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:C.goldL,border:`1.5px solid ${C.goldB}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:C.gold,flexShrink:0}}>{n}</div>
                  <div style={{fontSize:13,color:C.text2}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Aviso legal */}
            <div style={{background:C.goldL,border:`1px solid ${C.goldB}`,borderRadius:8,padding:'12px 16px',marginBottom:24,fontSize:11,color:C.text2,lineHeight:1.6}}>
              <strong style={{color:C.gold}}>Aviso legal:</strong> Al firmar estos documentos, usted acepta los términos del préstamo en forma expresa. La firma digital tiene plena validez jurídica conforme a la Ley 25.506 de Firma Digital de la República Argentina. Se registrarán su dirección IP, geolocalización y datos del dispositivo como constancia de la operación.
            </div>

            <button onClick={()=>setPaso('leyendo_mutuo')}
              style={{width:'100%',background:C.gold,color:'#fff',border:'none',padding:'16px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              COMENZAR →
            </button>
          </div>
        )}

        {/* ── LECTURA MUTUO ── */}
        {paso === 'leyendo_mutuo' && (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:4,fontWeight:400}}>PASO 1 DE 3</div>
              <div style={{fontSize:16,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.04em'}}>Contrato de Mutuo con Interés</div>
              <div style={{fontSize:12,color:C.text2,marginTop:4,fontWeight:400}}>Lea el documento completo antes de firmar</div>
            </div>

            {/* Texto del contrato */}
            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20,maxHeight:320,overflowY:'auto'}}>
              <pre style={{fontSize:11,color:C.text2,fontFamily:'monospace',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>
{`CONTRATO DE MUTUO CON INTERÉS
Ley 25.065 y CCyCN Arts. 1525-1532

Fecha: ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}

MUTUANTE: ${EMPRESA.nombre}, CUIT ${EMPRESA.cuit}
Domicilio: ${EMPRESA.domicilio}
Representante: ${EMPRESA.representante}, ${EMPRESA.cargo}

MUTUARIO: ${cli.nombre} ${cli.apellido}
DNI: ${cli.dni} · CUIL: ${cli.cuil}
Email: ${cli.email} · Tel: ${cli.tel}
Empleador: ${cli.emp} · Antigüedad: ${cli.antig}

─────────────────────────────────────
PRIMERA — OBJETO
${EMPRESA.nombre} entrega en préstamo a ${cli.nombre} ${cli.apellido} la suma de ${fmt(sol.monto)}, acreditada en la cuenta CBU/CVU N° ${cli.cbu}.

SEGUNDA — DESTINO DE LOS FONDOS
Uso personal del MUTUARIO. El cliente declara que los fondos no provienen ni serán destinados a actividades ilícitas.

TERCERA — PLAZO Y DEVOLUCIÓN
El préstamo se devolverá en ${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)}, incluyendo capital, intereses e IVA. Primera cuota: 30 días corridos desde la acreditación.

CUARTA — TASA DE INTERÉS
TNA: ${sol.tna}% con capitalización mensual + IVA 21%.
TEA resultante: ${(((Math.pow(1+(sol?.tna/100/12)*1.21,12)-1)*100)).toFixed(2)}% (incluye IVA sobre intereses).

QUINTA — INTERESES MORATORIOS
En caso de mora: ${(sol?.tna*1.5).toFixed(2)}% TNA (150% de la tasa pactada) + IVA, desde el vencimiento hasta el pago efectivo. Mora automática sin interpelación previa (Art. 886 CCyCN).

SEXTA — FORMA DE PAGO
Débito automático en CBU/CVU N° ${cli.cbu}. El cliente se compromete a mantener saldo suficiente con 48hs de anticipación al vencimiento.

SÉPTIMA — CANCELACIÓN ANTICIPADA
Permitida en cualquier momento abonando capital adeudado + intereses devengados. Sin penalidades (Art. 1388 CCyCN).

OCTAVA — DATOS PERSONALES
El cliente autoriza la consulta y reporte ante BCRA, Nosis y similares, y el tratamiento de datos conforme Ley 25.326.

NOVENA — DOMICILIOS
Empresa: ${EMPRESA.domicilio}
Cliente: domicilio declarado, email ${cli.email}, tel ${cli.tel}.

DÉCIMA — JURISDICCIÓN
Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.

DÉCIMO PRIMERA — FIRMA DIGITAL
Suscripto mediante firma digital conforme Ley 25.506. La aceptación electrónica tiene plena validez jurídica.`}
              </pre>
            </div>

            {/* Campos de firma */}
            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>FIRMA DEL CONTRATO DE MUTUO</div>
              
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>ACLARACIÓN (nombre y apellido completo)</div>
                <input value={aclaracion} onChange={e=>setAclaracion(e.target.value)} placeholder={`${cli.nombre} ${cli.apellido}`}
                  style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${aclaracion?C.gold:C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>CONFIRMAR NÚMERO DE DNI</div>
                <input value={dniConfirmado} onChange={e=>setDniConfirmado(e.target.value)} placeholder="Ingrese su DNI"
                  style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${dniConfirmado?C.gold:C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',fontFamily:'inherit',fontWeight:700,boxSizing:'border-box',outline:'none'}}/>
                {dniConfirmado && dniConfirmado !== cli.dni && (
                  <div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:700}}>⚠️ El DNI no coincide con el registrado</div>
                )}
              </div>

              <CanvasFirma onFirma={setFirmaMutuo} label="FIRMA OLÓGRAFA DIGITAL"/>
            </div>

            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setPaso('bienvenida')} style={{flex:1,background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                ← ATRÁS
              </button>
              <button onClick={()=>setPaso('leyendo_pagare')}
                disabled={!firmaMutuo||!aclaracion||dniConfirmado!==cli.dni}
                style={{flex:2,background:(!firmaMutuo||!aclaracion||dniConfirmado!==cli.dni)?'rgba(200,146,42,0.3)':C.gold,color:'#fff',border:'none',padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:(!firmaMutuo||!aclaracion||dniConfirmado!==cli.dni)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!firmaMutuo||!aclaracion||dniConfirmado!==cli.dni)?0.5:1}}>
                CONTINUAR → FIRMAR PAGARÉ
              </button>
            </div>
          </div>
        )}

        {/* ── LECTURA PAGARÉ ── */}
        {paso === 'leyendo_pagare' && (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:4,fontWeight:400}}>PASO 2 DE 3</div>
              <div style={{fontSize:16,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.04em'}}>Pagaré Sin Protesto</div>
              <div style={{fontSize:12,color:C.text2,marginTop:4,fontWeight:400}}>Lea el documento completo antes de firmar</div>
            </div>

            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20,maxHeight:320,overflowY:'auto'}}>
              <pre style={{fontSize:11,color:C.text2,fontFamily:'monospace',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>
{`PAGARÉ SIN PROTESTO
Decreto-Ley 5965/63 — Ley Cambiaria Argentina

Lugar de emisión: Ciudad Autónoma de Buenos Aires
Fecha: ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
Monto total: ${fmt(sol.cuota * sol.plazo)}

─────────────────────────────────────

Yo, ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil}, me obligo a pagar INCONDICIONALMENTE y SIN PROTESTO a la orden de ${EMPRESA.nombre}, CUIT ${EMPRESA.cuit}, en el domicilio sito en ${EMPRESA.domicilio}, la suma de ${fmt(sol.cuota * sol.plazo)}, correspondiente al total de capital e intereses del préstamo otorgado.

FORMA DE PAGO: ${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)}, venciendo la primera a los 30 días corridos de la acreditación del préstamo.

TASA DE INTERÉS: TNA ${sol.tna}% + IVA 21%.

CLÁUSULA SIN PROTESTO: Conforme Art. 50 del Decreto-Ley 5965/63, eximiendo al portador de efectuar el protesto por falta de pago para conservar las acciones cambiarias.

LUGAR DE PAGO: ${EMPRESA.domicilio}, Ciudad Autónoma de Buenos Aires.

JURISDICCIÓN: Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.

Este título tiene fuerza ejecutiva conforme Art. 520 y concordantes del CPCCN.

─────────────────────────────────────
Emisor: ${cli.nombre} ${cli.apellido} · DNI ${cli.dni}`}
              </pre>
            </div>

            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>FIRMA DEL PAGARÉ</div>
              <CanvasFirma onFirma={setFirmaPagare} label="FIRMA OLÓGRAFA DIGITAL"/>
              <div style={{marginTop:12,padding:'10px 14px',background:C.goldL,borderRadius:8,border:`1px solid ${C.goldB}`,fontSize:11,color:C.gold,fontWeight:400}}>
                La aclaración y DNI ya fueron registrados en el paso anterior.
              </div>
            </div>

            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setPaso('leyendo_mutuo')} style={{flex:1,background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                ← ATRÁS
              </button>
              <button onClick={()=>setPaso('selfie')} disabled={!firmaPagare}
                style={{flex:2,background:!firmaPagare?'rgba(200,146,42,0.3)':C.gold,color:'#fff',border:'none',padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:!firmaPagare?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:!firmaPagare?0.5:1}}>
                CONTINUAR → VERIFICACIÓN DE IDENTIDAD
              </button>
            </div>
          </div>
        )}

        {/* ── SELFIE ── */}
        {paso === 'selfie' && (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:4,fontWeight:400}}>PASO 3 DE 3</div>
              <div style={{fontSize:16,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.04em'}}>Verificación de identidad</div>
              <div style={{fontSize:12,color:C.text2,marginTop:4,fontWeight:400}}>Tome una selfie sosteniendo su DNI abierto junto a su rostro</div>
            </div>

            <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>INSTRUCCIONES</div>
              {['Sostenga su DNI abierto mostrando su foto','Asegúrese de que su rostro y el DNI sean claramente visibles','Use buena iluminación','La foto debe tomarse en este momento'].map((i,n)=>(
                <div key={n} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:C.goldL,border:`1px solid ${C.goldB}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:C.gold,flexShrink:0,marginTop:1}}>{n+1}</div>
                  <div style={{fontSize:12,color:C.text2}}>{i}</div>
                </div>
              ))}
            </div>

            {!selfie ? (
              <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,padding:20,marginBottom:20}}>
                {!camaraActiva ? (
                  <div style={{textAlign:'center',padding:'20px 0'}}>
                    <div style={{fontSize:40,marginBottom:12}}>📷</div>
                    <div style={{fontSize:12,color:C.text2,marginBottom:20,fontWeight:400}}>Presione el botón para activar la cámara</div>
                    <button onClick={abrirCamara} style={{background:C.gold,color:'#fff',border:'none',padding:'12px 32px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                      ACTIVAR CÁMARA
                    </button>
                  </div>
                ) : (
                  <div style={{textAlign:'center'}}>
                    <video ref={videoRef} style={{width:'100%',borderRadius:8,marginBottom:12,background:'#000'}} autoPlay playsInline muted/>
                    <button onClick={tomarFoto} style={{background:C.green,color:'#000',border:'none',padding:'12px 32px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                      📸 TOMAR FOTO
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.greenB}`,padding:20,marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>✓ FOTO TOMADA</div>
                <img src={selfie} alt="Selfie" style={{width:'100%',borderRadius:8,marginBottom:12}}/>
                <button onClick={rehacerSelfie} style={{background:'none',border:'none',color:C.text3,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  VOLVER A TOMAR
                </button>
              </div>
            )}

            <div style={{background:C.bg3,borderRadius:8,border:`1px solid ${C.border}`,padding:'12px 16px',marginBottom:20,fontSize:11,color:C.text3,lineHeight:1.6}}>
              Al presionar "FIRMAR Y FINALIZAR" usted confirma haber leído y aceptado el Contrato de Mutuo y el Pagaré. Se registrarán: IP {sol?.ip_cliente||'N/D'} · {geo?`Ubicación: ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`:'Ubicación: no disponible'} · {new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}
            </div>

            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setPaso('leyendo_pagare')} style={{flex:1,background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`,padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
                ← ATRÁS
              </button>
              <button onClick={completarFirma} disabled={!selfie||procesando}
                style={{flex:2,background:(!selfie||procesando)?'rgba(26,107,60,0.4)':'#1A6B3C',color:'#fff',border:'none',padding:'12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:(!selfie||procesando)?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase',opacity:(!selfie||procesando)?0.6:1}}>
                {procesando?'PROCESANDO...':'✓ FIRMAR Y FINALIZAR'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
