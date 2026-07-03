import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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

// ── Barra de progreso ─────────────────────────────────────────────────────────
function BarraProgreso({ pasoActual }) {
  const pasos = [
    { key: 'leyendo_mutuo', label: 'Mutuo' },
    { key: 'leyendo_pagare', label: 'Pagaré' },
    { key: 'selfie', label: 'Identidad' },
  ];
  const idx = pasos.findIndex(p => p.key === pasoActual);
  if (idx < 0) return null;

  return (
    <div style={{ padding: '12px 20px 0', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {pasos.map((p, i) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i < idx ? C.green : i === idx ? C.gold : 'rgba(255,255,255,0.1)',
                border: `2px solid ${i < idx ? C.green : i === idx ? C.gold : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900,
                color: i <= idx ? '#000' : C.text3,
                transition: 'all 0.3s',
              }}>
                {i < idx ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 9, color: i === idx ? C.gold : i < idx ? C.green : C.text3, marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {p.label}
              </div>
            </div>
            {i < pasos.length - 1 && (
              <div style={{ height: 2, flex: 1, background: i < idx ? C.green : C.border, margin: '0 4px', marginBottom: 18, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Canvas de firma ────────────────────────────────────────────────────────────
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
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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
    ctx.lineWidth = 2.8;
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
      <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{
        position: 'relative', borderRadius: 12,
        border: `2px solid ${tieneFirma ? C.gold : C.border2}`,
        overflow: 'hidden', background: 'rgba(255,255,255,0.03)',
        touchAction: 'none',
        transition: 'border-color 0.2s',
      }}>
        <canvas
          ref={canvasRef} width={600} height={180}
          style={{ display: 'block', width: '100%', height: 180, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        {!tieneFirma && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 22, opacity: 0.3 }}>✍️</div>
            <div style={{ fontSize: 12, color: C.text3, fontWeight: 400 }}>Dibuje su firma aquí</div>
          </div>
        )}
        {tieneFirma && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 6, padding: '2px 8px', fontSize: 9, color: C.gold, fontWeight: 700 }}>✓ FIRMADO</div>
        )}
      </div>
      <button onClick={limpiar} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6, padding: '4px 0' }}>
        ↺ BORRAR Y VOLVER A FIRMAR
      </button>
    </div>
  );
}

// ── Pantalla de estado ─────────────────────────────────────────────────────────
const Pantalla = ({ emoji, titulo, texto, color, sub }) => (
  <div style={{ minHeight: '100vh', background: `linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color || C.text, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.3 }}>{titulo}</div>
      <div style={{ fontSize: 14, color: C.text2, fontWeight: 400, lineHeight: 1.7 }}>{texto}</div>
      {sub && <div style={{ marginTop: 20, fontSize: 12, color: C.text3, lineHeight: 1.6 }}>{sub}</div>}
      <div style={{ marginTop: 28, fontSize: 11, color: C.text3 }}>{EMPRESA.nombre} · CUIT {EMPRESA.cuit}</div>
    </div>
  </div>
);

// ── Componente principal ───────────────────────────────────────────────────────
export default function FirmaCliente() {
  const { token } = useParams();
  const [paso, setPaso] = useState('cargando');
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

  // Cámara en vivo
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camaraError, setCamaraError] = useState('');
  const [camaraLista, setCamaraLista] = useState(false);

  useEffect(() => { cargarSolicitud(); }, [token]);

  // Detener cámara al salir del paso selfie
  useEffect(() => {
    if (paso !== 'selfie') {
      detenerCamara();
    }
  }, [paso]);

  function detenerCamara() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamaraActiva(false);
    setCamaraLista(false);
  }

  async function cargarSolicitud() {
    try {
      let ip = 'N/D';
      try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip; } catch {}
      const s = await db.getSolicitudByToken(token);
      if (!s) { setPaso('invalido'); return; }
      const creacion = new Date(s.fecha_token_generado || new Date());
      const diffHs = (new Date() - creacion) / (1000 * 60 * 60);
      if (diffHs > 48) { setPaso('expirado'); return; }
      if (s.firma_cliente_completada) { setPaso('ya_firmado'); return; }
      setSol({ ...s, ip_cliente: ip });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => setGeo(null)
        );
      }
      setPaso('bienvenida');
    } catch(e) { setPaso('error'); }
  }

  async function abrirCamara() {
    setCamaraError('');
    setCamaraLista(false);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCamaraActiva(true); // primero activar para que el <video> se monte en el DOM
    } catch(err) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isIOS) {
        setCamaraError('En iPhone: Configuración → Safari → Cámara → Permitir. Luego recargue la página.');
      } else if (isAndroid) {
        setCamaraError('En Android: toque el candado en la barra de dirección → Permisos → Cámara → Permitir. Luego recargue.');
      } else {
        setCamaraError('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
      }
    }
  }

  // Conectar el stream al <video> una vez que está montado en el DOM
  useEffect(() => {
    if (camaraActiva && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play()
        .then(() => setCamaraLista(true))
        .catch(() => setCamaraLista(true)); // algunos browsers no necesitan await
    }
  }, [camaraActiva]);

  function tomarFoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    // Espejado (selfie): voltear horizontalmente
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setSelfie(canvas.toDataURL('image/jpeg', 0.88));
    detenerCamara();
  }

  function rehacerSelfie() {
    setSelfie(null);
    detenerCamara();
  }

  async function completarFirma() {
    if (!firmaMutuo || !firmaPagare || !aclaracion || !dniConfirmado || !selfie) return;
    if (dniConfirmado !== sol.cliente?.dni) { alert('El DNI ingresado no coincide con el registrado.'); return; }
    setProcesando(true);
    try {
      const ahora = new Date();
      const timestamp = ahora.toISOString();
      const timestampAR = ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'long' });
      const textoContrato = `SOLICITUD:${sol.id}|CLIENTE:${sol.cliente?.cuil}|MONTO:${sol.monto}|PLAZO:${sol.plazo}|TNA:${sol.tna}|TIMESTAMP:${timestamp}`;
      const hashDocumento = await sha256(textoContrato);
      const metadataFirma = {
        timestamp_utc: timestamp, timestamp_ar: timestampAR,
        ip_cliente: sol.ip_cliente || 'N/D', user_agent: userAgent,
        geolocalizacion: geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)} (±${Math.round(geo.accuracy)}m)` : 'No disponible',
        hash_documento: hashDocumento, token_sesion: sessionToken,
        aclaracion_firmante: aclaracion, dni_confirmado: dniConfirmado,
        firma_mutuo_png: firmaMutuo, firma_pagare_png: firmaPagare, selfie_png: selfie,
      };
      await db.saveFirmaCliente(sol.id, metadataFirma);
      setPaso('completado');
    } catch(e) {
      alert('Error al guardar la firma. Por favor intente nuevamente.');
    }
    setProcesando(false);
  }

  // ── Pantallas de estado ───────────────────────────────────────────────────
  if (paso === 'cargando') return <Pantalla emoji="⏳" titulo="Cargando..." texto="Verificando su enlace de firma." />;
  if (paso === 'invalido') return <Pantalla emoji="❌" titulo="Enlace inválido" texto="Este enlace de firma no existe o no es válido." sub={`Comuníquese con ${EMPRESA.nombre}`} color={C.red} />;
  if (paso === 'expirado') return <Pantalla emoji="⏰" titulo="Enlace expirado" texto="Este enlace venció (válido por 48 horas)." sub={`Comuníquese con ${EMPRESA.nombre} para recibir un nuevo enlace.`} color={C.gold} />;
  if (paso === 'ya_firmado') return <Pantalla emoji="✅" titulo="Documentos ya firmados" texto="Ya completó el proceso de firma digital. Sus documentos han sido registrados." color={C.green} />;
  if (paso === 'error') return <Pantalla emoji="⚠️" titulo="Error de conexión" texto="No se pudo cargar su información. Por favor intente nuevamente." color={C.red} />;

  if (paso === 'completado') return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.green, marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>¡Firma completada!</div>
        <div style={{ fontSize: 14, color: C.text2, fontWeight: 400, lineHeight: 1.8, marginBottom: 24 }}>
          Sus documentos han sido firmados y registrados correctamente.<br/>
          {EMPRESA.nombre} procesará su préstamo a la brevedad.
        </div>
        <div style={{ background: C.greenL, border: `1px solid ${C.greenB}`, borderRadius: 12, padding: 20, fontSize: 12, color: C.text2, textAlign: 'left', lineHeight: 1.9 }}>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registro de firma</div>
          <div><strong style={{ color: C.text }}>Solicitante:</strong> {sol?.cliente?.nombre} {sol?.cliente?.apellido}</div>
          <div><strong style={{ color: C.text }}>Solicitud:</strong> {sol?.id}</div>
          <div><strong style={{ color: C.text }}>Fecha:</strong> {new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</div>
          <div><strong style={{ color: C.text }}>IP:</strong> {sol?.ip_cliente}</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 11, color: C.text3 }}>{EMPRESA.nombre} · CUIT {EMPRESA.cuit}</div>
      </div>
    </div>
  );

  const cli = sol?.cliente || {};

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 100%)`, fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }}>

      {/* Header sticky */}
      <div style={{ background: 'rgba(6,23,46,0.97)', borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(8px)' }}>
        <svg width={28} height={28} viewBox="0 0 44 44" fill="none">
          <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
          <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
          <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AUTOLOGROS S.A.</div>
          <div style={{ color: C.text3, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>FIRMA DIGITAL SEGURA</div>
        </div>
        <div style={{ background: C.greenL, border: `1px solid ${C.greenB}`, borderRadius: 20, padding: '4px 10px', fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          🔒 SEGURO
        </div>
      </div>

      {/* Barra de progreso */}
      <BarraProgreso pasoActual={paso} />

      <div style={{ padding: '20px 20px 40px', maxWidth: 680, margin: '0 auto' }}>

        {/* ── BIENVENIDA ─────────────────────────────────────────────────── */}
        {paso === 'bienvenida' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28, paddingTop: 8 }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>👋</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>Hola, {cli.nombre}</div>
              <div style={{ fontSize: 14, color: C.text2, fontWeight: 400, lineHeight: 1.7 }}>
                Su préstamo fue pre-aprobado.<br/>Lea y firme los documentos para continuar.
              </div>
            </div>

            {/* Resumen del préstamo */}
            <div style={{ background: C.bg4, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>RESUMEN DE SU PRÉSTAMO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Monto', fmt(sol.monto), C.gold], ['Cuota mensual', fmt(sol.cuota), C.green], ['Plazo', `${sol.plazo} meses`, C.text], ['TNA', `${sol.tna}%`, C.text]].map(([l,v,color]) => (
                  <div key={l} style={{ background: C.bg3, borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.text3, marginBottom: 4, fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 17, fontWeight: 900, color }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pasos */}
            <div style={{ background: C.bg4, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>PASOS A SEGUIR</div>
              {[
                ['1', '📄', 'Firmar el Contrato de Mutuo'],
                ['2', '📝', 'Firmar el Pagaré'],
                ['3', '🤳', 'Selfie en vivo con su DNI'],
              ].map(([n,emoji,l]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.goldL, border: `1.5px solid ${C.goldB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{emoji}</div>
                  <div style={{ fontSize: 14, color: C.text2, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 12, padding: '14px 16px', marginBottom: 24, fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
              <strong style={{ color: C.gold }}>Aviso legal:</strong> Al firmar, acepta los términos del préstamo. La firma digital tiene plena validez jurídica conforme a la <strong style={{ color: C.text }}>Ley 25.506</strong>.
            </div>

            <button onClick={() => setPaso('leyendo_mutuo')} style={{ width: '100%', background: C.gold, color: '#fff', border: 'none', padding: '18px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: `0 4px 20px rgba(200,146,42,0.35)` }}>
              COMENZAR →
            </button>
          </div>
        )}

        {/* ── MUTUO ──────────────────────────────────────────────────────── */}
        {paso === 'leyendo_mutuo' && (
          <div>
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PASO 1 DE 3</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: C.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>Contrato de Mutuo</div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 6, fontWeight: 400 }}>Lea el documento completo antes de firmar</div>
            </div>

            <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CONTRATO DE MUTUO CON INTERÉS — LEY 25.065
              </div>
              <div style={{ padding: 16, maxHeight: 280, overflowY: 'auto' }}>
                <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>{`Fecha: ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}

MUTUANTE: ${EMPRESA.nombre}, CUIT ${EMPRESA.cuit}
Domicilio: ${EMPRESA.domicilio}
Representante: ${EMPRESA.representante}, ${EMPRESA.cargo}

MUTUARIO: ${cli.nombre} ${cli.apellido}
DNI: ${cli.dni} · CUIL: ${cli.cuil}

PRIMERA — OBJETO
${EMPRESA.nombre} entrega en préstamo ${fmt(sol.monto)}, acreditado en CBU/CVU N° ${cli.cbu}.

SEGUNDA — PLAZO Y DEVOLUCIÓN
${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)} con capital, intereses e IVA.
Primera cuota: 30 días desde la acreditación.

TERCERA — TASA DE INTERÉS
TNA: ${sol.tna}% con capitalización mensual + IVA 21%.

CUARTA — INTERESES MORATORIOS
Mora automática: ${((sol?.tna||0)*1.5).toFixed(2)}% TNA + IVA desde el vencimiento (Art. 886 CCyCN).

QUINTA — FORMA DE PAGO
Débito automático en CBU/CVU N° ${cli.cbu}.

SEXTA — CANCELACIÓN ANTICIPADA
Permitida sin penalidades (Art. 1388 CCyCN).

SÉPTIMA — JURISDICCIÓN
Tribunales Ordinarios de la CABA.

OCTAVA — FIRMA DIGITAL
Suscripto conforme Ley 25.506 con plena validez jurídica.`}</pre>
              </div>
            </div>

            <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>COMPLETAR PARA FIRMAR</div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>NOMBRE Y APELLIDO (aclaración)</div>
                <input
                  value={aclaracion}
                  onChange={e => setAclaracion(e.target.value)}
                  placeholder={`${cli.nombre} ${cli.apellido}`}
                  style={{ width: '100%', padding: '13px 14px', border: `1.5px solid ${aclaracion ? C.gold : C.border2}`, borderRadius: 10, fontSize: 14, color: C.text, background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit', fontWeight: 600, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>CONFIRMAR NÚMERO DE DNI</div>
                <input
                  value={dniConfirmado}
                  onChange={e => setDniConfirmado(e.target.value)}
                  placeholder="Ingrese su DNI"
                  inputMode="numeric"
                  style={{ width: '100%', padding: '13px 14px', border: `1.5px solid ${dniConfirmado === cli.dni ? C.green : dniConfirmado ? C.red : C.border2}`, borderRadius: 10, fontSize: 14, color: C.text, background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit', fontWeight: 600, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                />
                {dniConfirmado && dniConfirmado !== cli.dni && (
                  <div style={{ fontSize: 12, color: C.red, marginTop: 6, fontWeight: 700 }}>⚠️ El DNI no coincide con el registrado</div>
                )}
                {dniConfirmado && dniConfirmado === cli.dni && (
                  <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 700 }}>✓ DNI verificado</div>
                )}
              </div>

              <CanvasFirma onFirma={setFirmaMutuo} label="FIRMA OLÓGRAFA DIGITAL" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPaso('bienvenida')} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' }}>← ATRÁS</button>
              <button
                onClick={() => setPaso('leyendo_pagare')}
                disabled={!firmaMutuo || !aclaracion || dniConfirmado !== cli.dni}
                style={{ flex: 2, background: (!firmaMutuo || !aclaracion || dniConfirmado !== cli.dni) ? 'rgba(200,146,42,0.25)' : C.gold, color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (!firmaMutuo || !aclaracion || dniConfirmado !== cli.dni) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: (!firmaMutuo || !aclaracion || dniConfirmado !== cli.dni) ? 0.5 : 1, transition: 'all 0.2s' }}>
                CONTINUAR → PAGARÉ
              </button>
            </div>
          </div>
        )}

        {/* ── PAGARÉ ─────────────────────────────────────────────────────── */}
        {paso === 'leyendo_pagare' && (
          <div>
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PASO 2 DE 3</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: C.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>Pagaré Sin Protesto</div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 6, fontWeight: 400 }}>Lea el documento completo antes de firmar</div>
            </div>

            <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                PAGARÉ — DECRETO-LEY 5965/63
              </div>
              <div style={{ padding: 16, maxHeight: 280, overflowY: 'auto' }}>
                <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>{`Lugar: Ciudad Autónoma de Buenos Aires
Fecha: ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
Monto total: ${fmt((sol.cuota||0) * (sol.plazo||0))}

Yo, ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil}, me obligo a pagar INCONDICIONALMENTE y SIN PROTESTO a la orden de ${EMPRESA.nombre}, CUIT ${EMPRESA.cuit}, la suma de ${fmt((sol.cuota||0) * (sol.plazo||0))}.

FORMA DE PAGO: ${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)}.

TASA: TNA ${sol.tna}% + IVA 21%.

CLÁUSULA SIN PROTESTO: Art. 50 Decreto-Ley 5965/63.

FUERZA EJECUTIVA: Art. 520 CPCCN.

JURISDICCIÓN: Tribunales Ordinarios de la CABA.

Emisor: ${cli.nombre} ${cli.apellido} · DNI ${cli.dni}`}</pre>
              </div>
            </div>

            <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>FIRMA DEL PAGARÉ</div>
              <CanvasFirma onFirma={setFirmaPagare} label="FIRMA OLÓGRAFA DIGITAL" />
              <div style={{ marginTop: 14, padding: '10px 14px', background: C.goldL, borderRadius: 8, border: `1px solid ${C.goldB}`, fontSize: 12, color: C.gold, fontWeight: 400 }}>
                La aclaración y DNI del paso anterior quedan registrados en este documento también.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPaso('leyendo_mutuo')} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' }}>← ATRÁS</button>
              <button
                onClick={() => setPaso('selfie')}
                disabled={!firmaPagare}
                style={{ flex: 2, background: !firmaPagare ? 'rgba(200,146,42,0.25)' : C.gold, color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: !firmaPagare ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: !firmaPagare ? 0.5 : 1, transition: 'all 0.2s' }}>
                CONTINUAR → IDENTIDAD
              </button>
            </div>
          </div>
        )}

        {/* ── SELFIE EN VIVO ─────────────────────────────────────────────── */}
        {paso === 'selfie' && (
          <div>
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: C.gold, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PASO 3 DE 3</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: C.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>Verificación de identidad</div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 6, fontWeight: 400 }}>Tome una selfie en vivo sosteniendo su DNI junto al rostro</div>
            </div>

            {!selfie ? (
              <div>
                {/* Instrucciones */}
                <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>INSTRUCCIONES</div>
                  {[
                    ['🪪', 'Sostenga su DNI abierto mostrando su foto'],
                    ['😊', 'Asegúrese de que su rostro sea claramente visible'],
                    ['💡', 'Use buena iluminación, sin contraluz'],
                    ['📸', 'La foto debe tomarse en este momento — no se aceptan fotos de galería'],
                  ].map(([emoji, texto], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                      <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{texto}</div>
                    </div>
                  ))}
                </div>

                {/* Cámara en vivo */}
                <div style={{ background: C.bg4, borderRadius: 16, border: `1px solid ${camaraActiva ? C.gold : C.border}`, overflow: 'hidden', marginBottom: 16, transition: 'border-color 0.3s' }}>
                  {camaraActiva ? (
                    <div>
                      <div style={{ position: 'relative', background: '#000' }}>
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover', transform: 'scaleX(-1)' /* espejo */ }}
                        />
                        {!camaraLista && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                            <div style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>Iniciando cámara...</div>
                          </div>
                        )}
                        {/* Marco guía */}
                        {camaraLista && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ width: '70%', height: '80%', border: `2px dashed rgba(200,146,42,0.6)`, borderRadius: 12 }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        <button
                          onClick={tomarFoto}
                          disabled={!camaraLista}
                          style={{ width: '100%', background: camaraLista ? C.gold : 'rgba(200,146,42,0.3)', color: '#fff', border: 'none', padding: '16px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: camaraLista ? 'pointer' : 'not-allowed', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: camaraLista ? `0 4px 20px rgba(200,146,42,0.35)` : 'none', transition: 'all 0.2s' }}>
                          📸 TOMAR FOTO
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🤳</div>
                      <div style={{ fontSize: 14, color: C.text2, marginBottom: 6, fontWeight: 500 }}>Cámara frontal en vivo</div>
                      <div style={{ fontSize: 12, color: C.text3, marginBottom: 20, lineHeight: 1.6 }}>
                        Al presionar el botón se abrirá la cámara de su dispositivo.<br/>
                        No se puede usar la galería de fotos.
                      </div>
                      {camaraError && (
                        <div style={{ background: C.redL, border: `1px solid ${C.redB}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: C.red, fontWeight: 600, textAlign: 'left', lineHeight: 1.6 }}>
                          ⚠️ {camaraError}
                        </div>
                      )}
                      <button
                        onClick={abrirCamara}
                        style={{ background: C.gold, color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: `0 4px 20px rgba(200,146,42,0.35)`, width: '100%' }}>
                        📷 ABRIR CÁMARA
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Foto tomada */}
                <div style={{ background: C.bg4, borderRadius: 16, border: `1px solid ${C.greenB}`, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.greenB}`, fontSize: 11, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ✓ FOTO TOMADA CORRECTAMENTE
                  </div>
                  <img src={selfie} alt="Selfie de verificación" style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }} />
                  <div style={{ padding: 16 }}>
                    <button onClick={rehacerSelfie} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 20px', borderRadius: 8, width: '100%' }}>
                      ↺ VOLVER A TOMAR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Registro legal */}
            <div style={{ background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 20, fontSize: 11, color: C.text3, lineHeight: 1.7 }}>
              Al presionar "FIRMAR Y FINALIZAR" confirma haber leído y aceptado ambos documentos.<br/>
              Se registrará: IP {sol?.ip_cliente || 'N/D'} · {geo ? `Ubicación: ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : 'Ubicación: no disponible'} · {new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setPaso('leyendo_pagare'); }} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' }}>← ATRÁS</button>
              <button
                onClick={completarFirma}
                disabled={!selfie || procesando}
                style={{ flex: 2, background: (!selfie || procesando) ? 'rgba(26,107,60,0.35)' : '#1A6B3C', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (!selfie || procesando) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: (!selfie || procesando) ? 0.6 : 1, transition: 'all 0.2s', boxShadow: (!selfie || procesando) ? 'none' : '0 4px 20px rgba(74,224,138,0.2)' }}>
                {procesando ? '⏳ PROCESANDO...' : '✓ FIRMAR Y FINALIZAR'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
