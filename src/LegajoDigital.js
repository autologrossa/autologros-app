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

// ── Componente de documento — miniatura de imagen, icono de PDF, o etiqueta ────
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
 
export default function LegajoDigital({ sol, user, onVolver, onActualizar }) {
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const legajoRef = useRef(null);
  const esAdmin = user?.rol === 'admin';
 
  const cli = sol?.cliente || {};
  const firma = sol?.firma_metadata || {};
  const bcra = sol?.bcra_data || {};
  const nosis = sol?.nosis_data || {};
 
  const colorSit = sit => sit === 1 ? C.green : sit === 2 ? C.gold : C.red;

  // Construir mapa de documentos: nombre -> url o nombre
  // Priorizar docs_urls (objeto con URLs reales) sobre docs (array de nombres)
  const docsMap = {};
  if (sol?.docs_urls && Object.keys(sol.docs_urls).length > 0) {
    // Nuevo formato: objeto {nombre: url}
    Object.entries(sol.docs_urls).forEach(([nombre, valor]) => {
      docsMap[nombre] = valor;
    });
  } else if (sol?.docs) {
    // Formato anterior: array de nombres
    sol.docs.forEach(d => {
      if (typeof d === 'string' && d.startsWith('http')) {
        const partes = d.split('/');
        const nombreArchivo = decodeURIComponent(partes[partes.length - 1] || d);
        docsMap[nombreArchivo] = d;
      } else {
        docsMap[d] = d;
      }
    });
  }
 
  async function borrarLegajo() {
    setBorrando(true);
    await db.updateSolicitud(sol.id, {
      firma_cliente_completada: false,
      firma_metadata: null,
      bcra_data: null,
      nosis_data: null,
      estado: 'rechazado',
      estado_texto: 'LEGAJO ELIMINADO POR ADMINISTRADOR',
    });
    setBorrando(false);
    onActualizar();
    onVolver();
  }
 
  function imprimirPDF() {
    const contenido = legajoRef.current;
    if (!contenido) return;
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Legajo ${sol.id}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;}
    .legajo{max-width:900px;margin:0 auto;padding:24px;}.campo{background:#f8f8f8;border-radius:6px;padding:8px 10px;border:1px solid #e0e0e0;margin-bottom:6px;}
    .lbl{font-size:8px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;}.val{font-size:12px;font-weight:700;color:#1a1a1a;}
    .seccion-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #C8922A;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;}
    pre{font-family:monospace;font-size:9px;white-space:pre-wrap;line-height:1.6;background:#f8f8f8;padding:12px;border-radius:6px;}
    </style></head><body><div class="legajo">${contenido.innerHTML}</div>
    <p style="margin-top:20px;font-size:9px;color:#888;text-align:center;">Generado por AUTOLOGROS S.A. · CUIT ${EMPRESA.cuit} · ${new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p>
    </body></html>`);
    ventana.document.close();
    setTimeout(() => ventana.print(), 500);
  }
 
  return (
    <div style={{ minHeight: '100vh', background: C.bg2, fontFamily: 'system-ui, Arial, sans-serif' }}>
      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width={30} height={30} viewBox="0 0 44 44" fill="none">
            <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
            <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
            <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text>
          </svg>
          <div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LEGAJO DIGITAL — {sol.id}</div>
            <div style={{ color: C.text3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>{cli.nombre} {cli.apellido} · {EMPRESA.nombre}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={imprimirPDF} style={{ background: C.gold, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🖨️ IMPRIMIR / PDF</button>
          {esAdmin && !confirmBorrar && (
            <button onClick={() => setConfirmBorrar(true)} style={{ background: '#6B1A1A', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🗑️ ELIMINAR LEGAJO</button>
          )}
          {esAdmin && confirmBorrar && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>¿CONFIRMAR ELIMINACIÓN?</span>
              <button onClick={borrarLegajo} disabled={borrando} style={{ background: C.red, color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{borrando ? 'ELIMINANDO...' : 'SÍ, ELIMINAR'}</button>
              <button onClick={() => setConfirmBorrar(false)} style={{ background: 'rgba(255,255,255,0.08)', color: C.text2, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>CANCELAR</button>
            </div>
          )}
          <button onClick={onVolver} style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '9px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← VOLVER</button>
        </div>
      </div>
 
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        {!esAdmin && (
          <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 11, color: C.gold, fontWeight: 700 }}>
            🔒 MODO SOLO LECTURA — El analista puede visualizar e imprimir el legajo pero no puede modificarlo ni eliminarlo.
          </div>
        )}
 
        <div ref={legajoRef}>
          {/* CARÁTULA */}
          <div style={{ textAlign: 'center', marginBottom: 28, padding: 24, border: `2px solid ${C.gold}`, borderRadius: 12, background: C.bg4 }}>
            <div style={{ fontSize: 11, color: C.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>LEGAJO CREDITICIO DIGITAL</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: '0.1em', marginBottom: 4 }}>{EMPRESA.nombre}</div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>CUIT {EMPRESA.cuit} · {EMPRESA.domicilio}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 }}>{cli.nombre} {cli.apellido}</div>
            <div style={{ fontSize: 12, color: C.text2 }}>DNI {cli.dni} · CUIL {cli.cuil}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 18 }}>
              {[['N° SOLICITUD', sol.id, C.gold],['ESTADO', sol.estado_texto || sol.estado, sol.firma_cliente_completada ? C.green : C.gold],['FECHA SOLICITUD', sol.fecha, C.text],['FECHA FIRMA', sol.fecha_firma_cliente ? new Date(sol.fecha_firma_cliente).toLocaleDateString('es-AR') : '—', C.green]].map(([l,v,color]) => (
                <div key={l} style={{ background: C.bg3, borderRadius: 8, padding: '12px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
 
          {/* SECCIÓN 1: DATOS DEL CRÉDITO */}
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
              <Campo label="EMBAJADOR" valor={sol.emb_nombre}/>
              <Campo label="ANALISTA" valor={sol.analista || '—'}/>
            </div>
          </Seccion>
 
          {/* SECCIÓN 2: DATOS DEL CLIENTE */}
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
 
          {/* SECCIÓN 3: DOCUMENTACIÓN ADJUNTA */}
          <Seccion numero="3" titulo="DOCUMENTACIÓN ADJUNTA" color={C.gold}>
            {Object.keys(docsMap).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {Object.entries(docsMap).map(([nombre, valor]) => (
                  <DocItem key={nombre} nombre={nombre} valor={valor}/>
                ))}
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
 
          {/* SECCIÓN 4: ANÁLISIS CREDITICIO */}
          <Seccion numero="4" titulo="ANÁLISIS CREDITICIO — BCRA + NOSIS" color={C.blue}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                        <div style={{ fontSize: 12, fontWeight: 700, color: colorSit(bcra.peorSit) }}>{bcra.peorSit===1?'SITUACIÓN NORMAL':bcra.peorSit===2?'RIESGO BAJO':bcra.peorSit===3?'CON PROBLEMAS':bcra.peorSit===4?'ALTO RIESGO':'IRRECUPERABLE'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>{bcra.cantEntidades} entidad(es) informante(s)</div>
                    {(bcra.deudas||[]).slice(0,5).map((d,i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                        <span style={{ color: C.text2 }}>{d.entidad}</span>
                        <span style={{ color: colorSit(d.situacion), fontWeight: 700 }}>SIT {d.situacion}</span>
                      </div>
                    ))}
                  </>
                ) : <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>No figura en la Central de Deudores del BCRA</div>}
              </div>
              <div style={{ background: C.bg4, borderRadius: 10, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>BUREAU NOSIS</div>
                {nosis?.ok ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[['EMPLEADO REL. DEP.', nosis.esEmpleado],['JUBILADO', nosis.esJubilado],['MONOTRIBUTISTA', nosis.esMonotributista],['AUTÓNOMO', nosis.esAutonomo]].map(([l,v]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 6, padding: '6px 8px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: v==='SI'?C.green:v==='NO'?C.red:C.text3 }}>{v||'N/D'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[['CHEQUES S/FONDOS 6M', nosis.cheques6mCant, nosis.cheques6mCant>0?C.red:C.green],['CONCURSOS 24M', nosis.concursos24m, nosis.concursos24m>0?C.red:C.green],['DEUDA FISCAL', nosis.deudaFiscal==='SI'?'SÍ':nosis.deudaFiscal==='NO'?'NO':'S/D', nosis.deudaFiscal==='SI'?C.red:C.green],['ANTIGÜEDAD LABORAL', nosis.antiguedadLaboral!=null?`${nosis.antiguedadLaboral} M`:'S/D', nosis.antiguedadLaboral>=6?C.green:C.gold],['CONSULTAS 12M', nosis.consultas12m, C.text2],['COMPROMISO MENS.', nosis.compromisoMensual||'S/D', C.text2]].map(([l,v,color]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 6, padding: '6px 8px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>{nosis?.error || 'Sin datos de Nosis'}</div>}
              </div>
            </div>
          </Seccion>
 
          {/* SECCIÓN 5: CONTRATO DE MUTUO */}
          <Seccion numero="5" titulo="CONTRATO DE MUTUO CON INTERÉS" color={C.gold}>
            <div style={{ background: C.bg4, borderRadius: 10, padding: 20, border: `1px solid ${C.border}` }}>
              <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{`CONTRATO DE MUTUO CON INTERÉS — Ley 25.065 y CCyCN Arts. 1525–1532

MUTUANTE: AUTOLOGROS S.A., CUIT 30-71934732-7
Domicilio: Lavalle 1390, Piso 3, Oficina B, CABA
Representante: Nicolás Issaharoff, Presidente

MUTUARIO: ${cli.nombre} ${cli.apellido} — DNI N° ${cli.dni} · CUIL N° ${cli.cuil}
Email: ${cli.email} · Tel: ${cli.tel} · Empleador: ${cli.emp} · Antigüedad: ${cli.antig}
CBU/CVU: ${cli.cbu}

PRIMERA — OBJETO: ${fmt(sol.monto)} acreditados en CBU/CVU N° ${cli.cbu}.
SEGUNDA — DESTINO: Uso personal. Fondos lícitos.
TERCERA — PLAZO: ${sol.plazo} cuotas de ${fmt(sol.cuota)}. Primera cuota: 30 días.
CUARTA — TASA: TNA ${sol.tna}% + IVA 21%.
QUINTA — MORA: ${((sol.tna||0)*1.5).toFixed(2)}% TNA automática (Art. 886 CCyCN).
SEXTA — PAGO: Débito automático 48hs anticipación.
SÉPTIMA — CANCELACIÓN ANTICIPADA: Sin penalidades (Art. 1388 CCyCN).
OCTAVA — DATOS PERSONALES: Autorización BCRA/Nosis (Ley 25.326).
NOVENA — DOMICILIOS: Empresa: Lavalle 1390 Piso 3 Of. B CABA / Cliente: ${cli.email}.
DÉCIMA — JURISDICCIÓN: Tribunales de la Ciudad Autónoma de Buenos Aires.
DÉCIMO PRIMERA — FIRMA DIGITAL: Conforme Ley 25.506.`}</pre>
              {sol.firma_cliente_completada && <div style={{ marginTop: 14, padding: '10px 14px', background: C.greenL, borderRadius: 8, border: `1px solid ${C.greenB}`, fontSize: 11, color: C.green, fontWeight: 700 }}>✓ FIRMADO DIGITALMENTE POR AMBAS PARTES · {firma?.timestamp_ar}</div>}
            </div>
          </Seccion>
 
          {/* SECCIÓN 6: PAGARÉ */}
          <Seccion numero="6" titulo="PAGARÉ SIN PROTESTO" color={C.gold}>
            <div style={{ background: C.bg4, borderRadius: 10, padding: 20, border: `1px solid ${C.border}` }}>
              <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{`PAGARÉ SIN PROTESTO — Decreto-Ley 5965/63 · Art. 520 CPCCN

Yo, ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil},
me obligo a pagar INCONDICIONALMENTE y SIN PROTESTO a la orden de
AUTOLOGROS S.A., CUIT 30-71934732-7, la suma de ${fmt((sol.cuota||0)*(sol.plazo||0))}.

FORMA DE PAGO: ${sol.plazo} cuotas mensuales de ${fmt(sol.cuota)}.
TASA: TNA ${sol.tna}% + IVA 21%.
CLÁUSULA SIN PROTESTO: Art. 50 Decreto-Ley 5965/63.
JURISDICCIÓN: Tribunales Ordinarios de CABA.

Emisor: ${cli.nombre} ${cli.apellido} · DNI ${cli.dni} · CUIL ${cli.cuil}`}</pre>
              {sol.firma_cliente_completada && <div style={{ marginTop: 14, padding: '10px 14px', background: C.greenL, borderRadius: 8, border: `1px solid ${C.greenB}`, fontSize: 11, color: C.green, fontWeight: 700 }}>✓ FIRMADO DIGITALMENTE POR EL DEUDOR · {firma?.timestamp_ar}</div>}
            </div>
          </Seccion>
 
          {/* SECCIÓN 7: FIRMA DIGITAL */}
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
 
          {/* SECCIÓN 8: CERTIFICADO */}
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
                <div style={{ marginTop: 14, fontSize: 10, color: C.text3, fontStyle: 'italic', lineHeight: 1.6 }}>
                  Este certificado acredita que los documentos fueron firmados digitalmente conforme a la Ley 25.506. El hash SHA-256 garantiza la integridad del documento.
                </div>
              </div>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}
 
export function PanelLegajos({ sols, user, onVerLegajo }) {
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
      <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>LEGAJOS DIGITALES</div>
      <div style={{ fontSize: 11, color: C.text3, marginBottom: 20, fontWeight: 400 }}>{cntFirmados} legajo(s) completo(s) · {cntPendientes} pendiente(s) de firma</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[['TOTAL SOLICITUDES', sols.length, C.text, 'rgba(255,255,255,0.05)', C.border],['LEGAJOS COMPLETOS', cntFirmados, C.green, C.greenL, C.greenB],['PENDIENTES FIRMA', cntPendientes, C.gold, C.goldL, C.goldB]].map(([l,n,color,bg,border]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: 16, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[['todos','TODOS'],['firmados','COMPLETOS'],['pendientes','PENDIENTES FIRMA']].map(([k,l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: filtro===k?C.gold:'rgba(255,255,255,0.05)', color: filtro===k?'#fff':C.text2, border: `1px solid ${filtro===k?C.gold:C.border}`, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</button>
        ))}
      </div>
      {!lista.length ? (
        <div style={{ background: C.bg4, borderRadius: 12, padding: 60, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
          <div style={{ color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NO HAY LEGAJOS EN ESTA CATEGORÍA</div>
        </div>
      ) : lista.map(s => {
        const cli = s.cliente || {};
        const firmado = s.firma_cliente_completada;
        return (
          <div key={s.id} onClick={() => onVerLegajo(s)} style={{ background: C.bg4, borderRadius: 12, padding: 18, marginBottom: 10, cursor: 'pointer', border: `1px solid ${firmado ? C.greenB : C.border}`, borderLeft: `4px solid ${firmado ? C.green : C.gold}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 24 }}>{firmado ? '✅' : '📋'}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: C.text, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{cli.nombre} {cli.apellido}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 3, fontWeight: 400 }}>{s.id} · DNI {cli.dni} · {s.linea_nombre} · {fmt(s.monto)} · {s.plazo}M</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Solicitud: {s.fecha}{firmado && s.fecha_firma_cliente ? ` · Firmado: ${new Date(s.fecha_firma_cliente).toLocaleDateString('es-AR')}` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {firmado && <span style={{ fontSize: 10, background: C.greenL, color: C.green, borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: `1px solid ${C.greenB}` }}>FIRMADO</span>}
                  {s.bcra_data && <span style={{ fontSize: 10, background: 'rgba(74,154,224,0.15)', color: C.blue, borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: '1px solid rgba(74,154,224,0.3)' }}>BCRA</span>}
                  {s.nosis_data && <span style={{ fontSize: 10, background: C.goldL, color: C.gold, borderRadius: 6, padding: '3px 10px', fontWeight: 700, border: `1px solid ${C.goldB}` }}>NOSIS</span>}
                </div>
                <span style={{ color: C.text3, fontSize: 18 }}>›</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
