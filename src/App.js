import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import FirmaCliente from './FirmaCliente';
import LegajoDigital, { PanelLegajos } from './LegajoDigital';
import ModuloE from './ModuloE_Desembolso';
import ModuloF, { CuentaCorriente } from './ModuloF_Cartera';
import ModuloH from './ModuloH_Reportes';
import ModuloContabilidad from './ModuloContabilidad';
import { db } from './supabase';

// ── Cálculos financieros ──────────────────────────────────────────────────────
const IVA = 1.21;
function calcTEA(tna) { return ((Math.pow(1 + (tna/100/12)*IVA, 12) - 1) * 100); }
function calcCFT(tna, seguro, comisiones, gastos) {
  const tm = (tna/100/12)*IVA + (seguro/100)*IVA + (comisiones/100)*IVA;
  return ((Math.pow(1 + tm, 12) - 1) * 100);
}
function calcCuota(monto, tna, seguro, comisiones, meses) {
  const tm = (tna/100/12)*IVA;
  const cuotaK = tm === 0 ? monto/meses : (monto*tm*Math.pow(1+tm,meses))/(Math.pow(1+tm,meses)-1);
  const cuotaExtras = monto * ((seguro/100)*IVA + (comisiones/100)*IVA);
  return cuotaK + cuotaExtras;
}
function calcDesembolso(monto, gastos) { return monto - monto*(gastos/100)*IVA; }
const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);
const fmtN = n => new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n);
const fmtP = n => `${parseFloat(n).toFixed(2)}%`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg0:'#030F1E', bg1:'#06172E', bg2:'#071829', bg3:'#0A1F3A', bg4:'#0D2540',
  border:'rgba(255,255,255,0.08)', border2:'rgba(255,255,255,0.12)',
  text:'#FFFFFF', text2:'rgba(255,255,255,0.55)', text3:'rgba(255,255,255,0.35)', text4:'rgba(255,255,255,0.2)',
  gold:'#C8922A', goldL:'rgba(200,146,42,0.15)', goldB:'rgba(200,146,42,0.25)',
  blue:'#4A9AE0', green:'#4AE08A', greenL:'rgba(74,224,138,0.08)', greenB:'rgba(74,224,138,0.15)',
  red:'#E05050', redL:'rgba(224,80,80,0.08)', redB:'rgba(224,80,80,0.15)',
};

// ── Componentes base ──────────────────────────────────────────────────────────
const Logo = ({size=34}) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
    <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
    <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Helvetica Neue,Arial,sans-serif">$</text>
  </svg>
);

function Card({children,style}){ return <div style={{background:C.bg4,borderRadius:12,border:`1px solid ${C.border}`,...style}}>{children}</div>; }

function Inp({label,type='text',value,onChange,placeholder,req,step,hint}){
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>
        {label}{req&&<span style={{color:C.gold,marginLeft:3}}>*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step}
        style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,
          fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',outline:'none',
          fontFamily:'inherit',fontWeight:700,letterSpacing:'0.03em',boxSizing:'border-box'}}
        onFocus={e=>e.target.style.borderColor=C.gold}
        onBlur={e=>e.target.style.borderColor=C.border2}
      />
      {hint&&<div style={{fontSize:10,color:C.text3,marginTop:4,fontWeight:400}}>{hint}</div>}
    </div>
  );
}

function Sel({label,value,onChange,options,req}){
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>
        {label}{req&&<span style={{color:C.gold,marginLeft:3}}>*</span>}
      </label>
      <select value={value} onChange={onChange}
        style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,
          fontSize:13,color:C.text,background:C.bg3,fontFamily:'inherit',fontWeight:700,outline:'none',boxSizing:'border-box'}}>
        <option value="">SELECCIONAR...</option>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Btn({onClick,children,variant='primary',disabled,style,full}){
  const vs={
    primary:{background:'#1A4F8A',color:'#fff',border:'none'},
    gold:{background:C.gold,color:'#fff',border:'none'},
    ghost:{background:'transparent',color:C.gold,border:`1.5px solid ${C.gold}`},
    sec:{background:'rgba(255,255,255,0.06)',color:C.text2,border:`1px solid ${C.border}`},
    danger:{background:'#6B1A1A',color:'#fff',border:'none'},
    white:{background:'transparent',color:'#FFF',border:'1.5px solid rgba(255,255,255,0.4)'},
    success:{background:'#1A6B3C',color:'#fff',border:'none'},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...vs[variant],padding:'10px 22px',borderRadius:8,fontSize:12,fontWeight:700,
        cursor:disabled?'not-allowed':'pointer',opacity:disabled?.55:1,fontFamily:'inherit',
        letterSpacing:'0.08em',textTransform:'uppercase',width:full?'100%':'auto',...style}}>
      {children}
    </button>
  );
}

function Badge({text,type}){
  const c={
    pendiente:[C.goldL,C.gold,C.goldB],
    aprobado:[C.greenL,C.green,C.greenB],
    rechazado:[C.redL,C.red,C.redB],
    activa:[C.greenL,C.green,C.greenB],
    inactiva:['rgba(255,255,255,0.05)',C.text3,C.border],
  }[type]||['rgba(255,255,255,0.05)',C.text3,C.border];
  return (
    <span style={{background:c[0],color:c[1],border:`1px solid ${c[2]}`,
      borderRadius:20,padding:'3px 12px',fontSize:10,fontWeight:700,
      letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
      {text}
    </span>
  );
}

function Hdr({title,user,onLogout}){
  return (
    <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:'14px 24px',
      display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <Logo/>
        <div>
          <div style={{color:C.text,fontWeight:900,fontSize:17,letterSpacing:'0.1em',textTransform:'uppercase'}}>AUTOLOGROS</div>
          <div style={{color:C.text3,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginTop:2}}>{title}</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{color:C.text,fontSize:12,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>{user.nombre}</div>
        <Btn onClick={onLogout} variant="sec" style={{padding:'7px 16px',fontSize:11}}>SALIR</Btn>
      </div>
    </div>
  );
}

function Tabs({tabs,active,onChange}){
  return (
    <div style={{background:C.bg3,borderBottom:`1px solid ${C.border}`,padding:'0 24px',display:'flex',gap:4}}>
      {tabs.map(([k,l])=>(
        <button key={k} onClick={()=>onChange(k)}
          style={{background:'none',border:'none',padding:'13px 18px',fontSize:12,fontWeight:700,
            color:active===k?C.gold:C.text3,
            borderBottom:active===k?`3px solid ${C.gold}`:'3px solid transparent',
            cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em',textTransform:'uppercase'}}>
          {l}
        </button>
      ))}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [cod,setCod]=useState('');const [pw,setPw]=useState('');
  const [err,setErr]=useState('');const [loading,setLoading]=useState(false);

  async function go(){
    setLoading(true);setErr('');
    try{
      const u=await db.getUsuario(cod.toUpperCase(),pw);
      if(u)onLogin(u);else setErr('CÓDIGO O CONTRASEÑA INCORRECTOS.');
    }catch{setErr('ERROR DE CONEXIÓN. INTENTÁ DE NUEVO.');}
    setLoading(false);
  }

  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 40%,#071F1A 100%)`,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <Logo size={60}/><br/>
          <div style={{color:'#FFF',fontWeight:900,fontSize:26,letterSpacing:'0.12em',textTransform:'uppercase',marginTop:12}}>AUTOLOGROS</div>
          <div style={{color:C.text3,fontSize:10,marginTop:6,letterSpacing:'0.2em',textTransform:'uppercase'}}>SISTEMA OPERATIVO INTEGRAL</div>
        </div>
        <Card style={{padding:32}}>
          <Inp label="CÓDIGO DE USUARIO" value={cod} onChange={e=>setCod(e.target.value)} placeholder="CÓDIGO DE ACCESO" req/>
          <Inp label="CONTRASEÑA" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" req/>
          {err&&<div style={{background:C.redL,color:C.red,borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:16,border:`1px solid ${C.redB}`,fontWeight:700,letterSpacing:'0.04em'}}>{err}</div>}
          <Btn onClick={go} disabled={loading||!cod||!pw} variant="white" full>
            {loading?'VERIFICANDO...':'INGRESAR AL SISTEMA'}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function Admin({user,onLogout}){
  const [tab,setTab]=useState('lineas');
  const [lineas,setLineas]=useState([]);const [loading,setLoading]=useState(true);
  const [editando,setEditando]=useState(null);const [nueva,setNueva]=useState(false);
  const [embajadores,setEmbajadores]=useState([]);const [nuevoEmb,setNuevoEmb]=useState(false);const [sols,setSols]=useState([]);const [legajoAdmin,setLegajoAdmin]=useState(null);const [moduloE,setModuloE]=useState(null);const [cuentaCte,setCuentaCte]=useState(null);

  useEffect(()=>{cargar();},[]);
  async function cargar(){
    setLoading(true);
    setLineas(await db.getLineas()||[]);
    setEmbajadores(await db.getEmbajadores()||[]);
    setSols(await db.getSolicitudes()||[]);
    setLoading(false);
  }
  async function guardarLinea(l){await db.saveLinea(l);await cargar();setEditando(null);setNueva(false);}
  async function toggleLinea(linea){await db.saveLinea({...linea,activa:!linea.activa});await cargar();}
  async function eliminarLinea(id){if(!window.confirm('¿ELIMINAR ESTA LÍNEA?'))return;await db.deleteLinea(id);await cargar();}
  async function guardarEmb(e){await db.saveEmbajador(e);await cargar();setNuevoEmb(false);}
  async function eliminarEmb(id){if(!window.confirm('¿ELIMINAR ESTE EMBAJADOR?'))return;await db.deleteEmbajador(id);await cargar();}

  if(editando||nueva) return <FormLinea linea={editando} onGuardar={guardarLinea} onCancelar={()=>{setEditando(null);setNueva(false);}} user={user} onLogout={onLogout}/>;
  if(nuevoEmb) return <FormEmbajador onGuardar={guardarEmb} onCancelar={()=>setNuevoEmb(false)} user={user} onLogout={onLogout}/>;
  if(legajoAdmin) return <LegajoDigital sol={legajoAdmin} user={user} onVolver={()=>setLegajoAdmin(null)} onActualizar={cargar}/>;
  if(moduloE) return <ModuloE sol={moduloE} user={user} onVolver={()=>setModuloE(null)} onActualizar={cargar}/>;
  if(cuentaCte) return <CuentaCorriente credito={cuentaCte} user={user} onVolver={()=>setCuentaCte(null)} onActualizar={cargar}/>;

  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL ADMINISTRADOR" user={user} onLogout={onLogout}/>
      <Tabs tabs={[['lineas','LÍNEAS DE CRÉDITO'],['embajadores','EMBAJADORES'],['legajos','LEGAJOS'],['cartera','CARTERA'],['reportes','REPORTES'],['contabilidad','CONTABILIDAD']]} active={tab} onChange={setTab}/>
      <div style={{padding:28,maxWidth:960,margin:'0 auto'}}>
        {tab==='lineas'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase'}}>LÍNEAS DE CRÉDITO</div>
                <div style={{fontSize:11,color:C.text3,marginTop:4,fontWeight:400}}>{lineas.filter(l=>l.activa).length} activas · {lineas.filter(l=>!l.activa).length} inactivas</div>
              </div>
              <Btn onClick={()=>setNueva(true)} variant="gold">+ NUEVA LÍNEA</Btn>
            </div>
            {loading?<div style={{textAlign:'center',padding:60,color:C.text3}}>CARGANDO...</div>
            :lineas.map(l=>{
              const tea=calcTEA(l.tna);
              const cft=calcCFT(l.tna,l.seguro||0,l.comisiones||0,l.gastos||0);
              return (
                <Card key={l.id} style={{padding:24,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                        <span style={{fontSize:16,fontWeight:900,color:C.text,letterSpacing:'0.04em',textTransform:'uppercase'}}>{l.nombre}</span>
                        <Badge text={l.activa?'ACTIVA':'INACTIVA'} type={l.activa?'activa':'inactiva'}/>
                      </div>
                      <div style={{fontSize:11,color:C.text2,fontWeight:400}}>{l.descripcion}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <Btn onClick={()=>toggleLinea(l)} variant="sec" style={{padding:'7px 14px',fontSize:11}}>{l.activa?'DESACTIVAR':'ACTIVAR'}</Btn>
                      <Btn onClick={()=>setEditando(l)} variant="ghost" style={{padding:'7px 14px',fontSize:11}}>EDITAR</Btn>
                      <Btn onClick={()=>eliminarLinea(l.id)} variant="danger" style={{padding:'7px 12px',fontSize:11}}>×</Btn>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginBottom:14}}>
                    {[['TNA',`${l.tna}%`,C.text],['TEA+IVA',fmtP(tea),C.blue],['CFT REAL',fmtP(cft),C.gold],
                      ['SEGURO',`${l.seguro||0}%+IVA`,C.text2],['COMIS.',`${l.comisiones||0}%+IVA`,C.text2],
                      ['GASTOS',`${l.gastos||0}%+IVA`,C.text2],['PLAZOS',(l.plazos||[]).join(',')+' M',C.text2]
                    ].map(([lbl,val,color])=>(
                      <div key={lbl} style={{background:C.bg3,borderRadius:8,padding:'10px',border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{lbl}</div>
                        <div style={{fontSize:12,fontWeight:900,color}}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {(l.gastos||0)>0&&(
                    <div style={{background:C.goldL,border:`1px solid ${C.goldB}`,borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:11,color:C.text2,fontWeight:400}}>
                      <span style={{color:C.gold,fontWeight:700}}>GASTOS AL ORIGEN:</span> {l.gastos}% + IVA = {fmtP((l.gastos||0)*IVA)} del monto — se descuenta del desembolso.
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:9,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.08em'}}>DOCS:</span>
                    {(l.docsReq||[]).map(d=><span key={d} style={{fontSize:10,background:C.goldL,color:C.gold,borderRadius:6,padding:'3px 10px',border:`1px solid ${C.goldB}`,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{d}</span>)}
                  </div>
                </Card>
              );
            })}
          </>
        )}
        {tab==='legajos'&&<PanelLegajos sols={sols||[]} user={user} onVerLegajo={setLegajoAdmin} onDesembolsar={setModuloE}/>}
        {tab==='cartera'&&<ModuloF user={user} onVerCuenta={setCuentaCte}/>}
        {tab==='reportes'&&<ModuloH user={user}/>}
         {tab==='contabilidad'&&<ModuloContabilidad user={user}/>}
        {tab==='embajadores'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase'}}>EMBAJADORES</div>
                <div style={{fontSize:11,color:C.text3,marginTop:4,fontWeight:400}}>{embajadores.length} activos</div>
              </div>
              <Btn onClick={()=>setNuevoEmb(true)} variant="gold">+ NUEVO EMBAJADOR</Btn>
            </div>
            {embajadores.map(e=>(
              <Card key={e.codigo} style={{padding:18,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:C.text,letterSpacing:'0.04em',textTransform:'uppercase'}}>{e.nombre}</div>
                  <div style={{fontSize:11,color:C.text2,marginTop:3,fontWeight:400}}>Código: <strong style={{color:C.text}}>{e.codigo}</strong>{e.zona?` · Zona: ${e.zona}`:''}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Badge text="ACTIVO" type="activa"/>
                  <Btn onClick={()=>eliminarEmb(e.codigo)} variant="danger" style={{padding:'7px 12px',fontSize:11}}>×</Btn>
                </div>
              </Card>
            ))}
            <Card style={{padding:16,marginTop:8}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>ROLES ÚNICOS DEL SISTEMA</div>
              <div style={{display:'flex',gap:10}}>
                {[['ANALISTA','Rol único · No replicable'],['ADMINISTRADOR','Rol único · No replicable']].map(([r,d])=>(
                  <div key={r} style={{flex:1,background:C.bg3,borderRadius:8,padding:14,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.06em'}}>{r}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:4,fontWeight:400}}>{d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ── FORM LÍNEA ────────────────────────────────────────────────────────────────
function FormLinea({linea,onGuardar,onCancelar,user,onLogout}){
  const nuevo=!linea;
  const [f,setF]=useState(linea?{...linea,plazosStr:(linea.plazos||[]).join(', '),docsReqStr:(linea.docsReq||[]).join('\n'),docsOpcStr:(linea.docsOpc||[]).join('\n')}
    :{id:`linea-${Date.now()}`,nombre:'',descripcion:'',activa:true,montoMin:'',montoMax:'',tna:'',seguro:'',comisiones:'',gastos:'',plazosStr:'',docsReqStr:'',docsOpcStr:''});

  const tea=f.tna?calcTEA(parseFloat(f.tna)):null;
  const cft=(f.tna&&f.seguro!==''&&f.comisiones!==''&&f.gastos!=='')?calcCFT(parseFloat(f.tna),parseFloat(f.seguro||0),parseFloat(f.comisiones||0),parseFloat(f.gastos||0)):null;
  const gastoEjemplo=f.gastos?1000000*(parseFloat(f.gastos)/100)*IVA:0;

  function toLinea(){return{...f,montoMin:parseFloat(f.montoMin),montoMax:parseFloat(f.montoMax),tna:parseFloat(f.tna),
    seguro:parseFloat(f.seguro||0),comisiones:parseFloat(f.comisiones||0),gastos:parseFloat(f.gastos||0),
    plazos:f.plazosStr.split(',').map(x=>parseInt(x.trim())).filter(Boolean),
    docsReq:f.docsReqStr.split('\n').map(x=>x.trim()).filter(Boolean),
    docsOpc:f.docsOpcStr.split('\n').map(x=>x.trim()).filter(Boolean)};}

  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL ADMINISTRADOR" user={user} onLogout={onLogout}/>
      <div style={{padding:28,maxWidth:760,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28}}>
          <button onClick={onCancelar} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3}}>←</button>
          <div style={{fontSize:17,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase'}}>{nuevo?'NUEVA LÍNEA DE CRÉDITO':`EDITAR: ${f.nombre}`}</div>
        </div>
        <Card style={{padding:32}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <div style={{gridColumn:'1/-1'}}><Inp label="NOMBRE DE LA LÍNEA" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} req/></div>
            <div style={{gridColumn:'1/-1'}}><Inp label="DESCRIPCIÓN" value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})}/></div>
            <Inp label="MONTO MÍNIMO ($)" type="number" value={f.montoMin} onChange={e=>setF({...f,montoMin:e.target.value})} req/>
            <Inp label="MONTO MÁXIMO ($)" type="number" value={f.montoMax} onChange={e=>setF({...f,montoMax:e.target.value})} req/>
            <Inp label="PLAZOS (MESES, SEPARADOS POR COMA)" value={f.plazosStr} onChange={e=>setF({...f,plazosStr:e.target.value})} placeholder="6, 12, 18, 24, 36" req/>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'12px 14px',background:'rgba(255,255,255,0.04)',borderRadius:8,border:`1px solid ${C.border}`}}>
              <input type="checkbox" checked={f.activa} onChange={e=>setF({...f,activa:e.target.checked})} style={{width:18,height:18,cursor:'pointer'}}/>
              <span style={{fontSize:11,fontWeight:700,color:f.activa?C.green:C.text3,letterSpacing:'0.06em',textTransform:'uppercase'}}>{f.activa?'ACTIVA — VISIBLE PARA EMBAJADORES':'INACTIVA'}</span>
            </div>
          </div>

          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:18,border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>TASAS Y COSTOS — TODOS CON IVA 21%</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0 12px'}}>
              <Inp label="TNA (%)" type="number" step="0.1" value={f.tna} onChange={e=>setF({...f,tna:e.target.value})} hint="Intereses + IVA 21% en cuota" req/>
              <Inp label="SEGURO (% MENS.)" type="number" step="0.01" value={f.seguro} onChange={e=>setF({...f,seguro:e.target.value})} hint="Sobre saldo capital + IVA 21%"/>
              <Inp label="COMISIONES (% MENS.)" type="number" step="0.01" value={f.comisiones} onChange={e=>setF({...f,comisiones:e.target.value})} hint="Sobre saldo capital + IVA 21%"/>
              <Inp label="GASTOS (% ORIGEN)" type="number" step="0.01" value={f.gastos} onChange={e=>setF({...f,gastos:e.target.value})} hint="Descuento al desembolso + IVA 21%"/>
            </div>
            {tea!==null&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:4}}>
                <div style={{background:C.bg3,borderRadius:8,padding:14,border:'1.5px solid #1A4F8A'}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:5}}>TEA + IVA — CALCULADA AUTOMÁTICAMENTE</div>
                  <div style={{fontSize:22,fontWeight:900,color:C.blue}}>{fmtP(tea)}</div>
                  <div style={{fontSize:9,color:C.text3,marginTop:3,fontWeight:400}}>= [(1 + TNA×1.21/12)¹² − 1]</div>
                </div>
                {cft!==null&&(
                  <div style={{background:C.bg3,borderRadius:8,padding:14,border:`1.5px solid ${C.gold}`}}>
                    <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:5}}>CFT REAL — CALCULADO AUTOMÁTICAMENTE</div>
                    <div style={{fontSize:22,fontWeight:900,color:C.gold}}>{fmtP(cft)}</div>
                    <div style={{fontSize:9,color:C.text3,marginTop:3,fontWeight:400}}>Incluye todos los conceptos + IVA + gastos al origen</div>
                  </div>
                )}
              </div>
            )}
            {gastoEjemplo>0&&(
              <div style={{background:C.bg3,borderRadius:10,padding:14,marginTop:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>EJEMPLO — PRÉSTAMO $1.000.000</div>
                {[['MONTO DEL PRÉSTAMO','$1.000.000',C.text],
                  [`GASTOS AL ORIGEN (${f.gastos}% + IVA)`,`−${fmt(gastoEjemplo)}`,C.red],
                  ['CLIENTE RECIBE',fmt(1000000-gastoEjemplo),C.gold]
                ].map(([l,v,color])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:11,color:C.text2,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{l}</span>
                    <span style={{fontSize:13,fontWeight:900,color}}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>DOCUMENTOS OBLIGATORIOS *</label>
            <textarea value={f.docsReqStr} onChange={e=>setF({...f,docsReqStr:e.target.value})}
              placeholder={'DNI FRENTE Y DORSO\nÚLTIMOS 3 RECIBOS DE SUELDO\nCBU / CVU PROPIO'}
              style={{width:'100%',minHeight:90,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
            <div style={{fontSize:10,color:C.text3,marginTop:4,fontWeight:400}}>Un documento por línea</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>DOCUMENTOS OPCIONALES</label>
            <textarea value={f.docsOpcStr} onChange={e=>setF({...f,docsOpcStr:e.target.value})}
              placeholder="FACTURA DE SERVICIOS"
              style={{width:'100%',minHeight:60,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
            <Btn onClick={onCancelar} variant="sec">CANCELAR</Btn>
            <Btn onClick={()=>onGuardar(toLinea())} variant="gold" disabled={!f.nombre||!f.montoMin||!f.montoMax||!f.tna||!f.plazosStr}>
              {nuevo?'CREAR LÍNEA':'GUARDAR CAMBIOS'}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── FORM EMBAJADOR ────────────────────────────────────────────────────────────
function FormEmbajador({onGuardar,onCancelar,user,onLogout}){
  const [f,setF]=useState({nombre:'',apellido:'',codigo:'',zona:'',email:'',telefono:'',password:''});
  function guardar(){onGuardar({...f,nombre:`${f.nombre} ${f.apellido}`.trim(),rol:'embajador',activo:true});}
  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL ADMINISTRADOR" user={user} onLogout={onLogout}/>
      <div style={{padding:28,maxWidth:720,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28}}>
          <button onClick={onCancelar} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3}}>←</button>
          <div style={{fontSize:17,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase'}}>NUEVO EMBAJADOR</div>
        </div>
        <Card style={{padding:32}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Inp label="NOMBRE" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} req/>
            <Inp label="APELLIDO" value={f.apellido} onChange={e=>setF({...f,apellido:e.target.value})} req/>
            <Inp label="CÓDIGO DE USUARIO" value={f.codigo} onChange={e=>setF({...f,codigo:e.target.value})} placeholder="EMB003" req/>
            <Inp label="ZONA / SECTOR" value={f.zona} onChange={e=>setF({...f,zona:e.target.value})} placeholder="EJ: CABA, GBA NORTE..."/>
            <Inp label="EMAIL" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
            <Inp label="TELÉFONO" value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})}/>
            <div style={{gridColumn:'1/-1'}}><Inp label="CONTRASEÑA INICIAL" type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} hint="El Embajador deberá cambiarla en su primer ingreso" req/></div>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:8}}>
            <Btn onClick={onCancelar} variant="sec">CANCELAR</Btn>
            <Btn onClick={guardar} variant="gold" disabled={!f.nombre||!f.apellido||!f.codigo||!f.password}>CREAR EMBAJADOR</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── PANEL INFORMES (BCRA + NOSIS de solicitudes ya analizadas) ────────────────
function PanelInformes({sols}){
  const [sel,setSel]=useState(null);
  const conInformes=sols.filter(s=>s.bcra_data||s.nosis_data);
  const colorSit=sit=>sit===1?C.green:sit===2?C.gold:C.red;

  if(sel){
    const s=sel;
    const cli=s.cliente||{};
    const bcra=s.bcra_data;
    const nosis=s.nosis_data;
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
          <button onClick={()=>setSel(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3}}>←</button>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:C.text,letterSpacing:'0.04em',textTransform:'uppercase'}}>{cli.nombre} {cli.apellido}</div>
            <div style={{fontSize:11,color:C.text3,marginTop:2,fontWeight:400}}>{s.id} · CUIL {cli.cuil} · Analizado: {s.fecha_res||s.fecha}</div>
          </div>
          <div style={{marginLeft:'auto'}}><Badge text={s.estado_texto||s.estado} type={s.estado}/></div>
        </div>

        {/* Resumen crédito */}
        <Card style={{padding:18,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[['LÍNEA',s.linea_nombre],['MONTO',fmt(s.monto)],['PLAZO',`${s.plazo} M`],['CUOTA',fmt(s.cuota)]].map(([l,v])=>(
              <div key={l} style={{background:C.bg3,borderRadius:8,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,fontWeight:900,color:C.text}}>{v}</div>
              </div>
            ))}
          </div>
          {s.obs&&<div style={{marginTop:14,padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,color:C.text2,fontWeight:400,whiteSpace:'pre-line'}}>{s.obs}</div>}
        </Card>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* BCRA */}
          <Card style={{padding:20}}>
            <div style={{fontSize:12,fontWeight:900,color:C.blue,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>CENTRAL DE DEUDORES BCRA</div>
            {bcra?.ok?(
              <>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:48,height:48,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:`${colorSit(bcra.peorSit)}20`,border:`2px solid ${colorSit(bcra.peorSit)}`}}>
                    <span style={{fontSize:20,fontWeight:900,color:colorSit(bcra.peorSit)}}>{bcra.peorSit}</span>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>PEOR SITUACIÓN</div>
                    <div style={{fontSize:13,fontWeight:700,color:colorSit(bcra.peorSit)}}>
                      {bcra.peorSit===1?'SITUACIÓN NORMAL':bcra.peorSit===2?'RIESGO BAJO':bcra.peorSit===3?'CON PROBLEMAS':bcra.peorSit===4?'ALTO RIESGO':'IRRECUPERABLE'}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:11,color:C.text2,fontWeight:400,marginBottom:8}}>{bcra.cantEntidades} entidad(es) informante(s)</div>
                {(bcra.deudas||[]).slice(0,4).map((d,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                    <span style={{color:C.text2,fontWeight:400}}>{d.entidad}</span>
                    <div style={{display:'flex',gap:8}}>
                      <span style={{color:colorSit(d.situacion),fontWeight:700}}>SIT {d.situacion}</span>
                      {d.monto&&<span style={{color:C.text,fontWeight:700}}>{fmt(d.monto*1000)}</span>}
                    </div>
                  </div>
                ))}
              </>
            ):bcra?(
              <div style={{fontSize:12,color:C.text3,fontWeight:400}}>No figura en la Central de Deudores del BCRA</div>
            ):(
              <div style={{fontSize:12,color:C.text3,fontWeight:400,fontStyle:'italic'}}>Informe BCRA no disponible para esta solicitud</div>
            )}
          </Card>

          {/* Nosis */}
          <Card style={{padding:20}}>
            <div style={{fontSize:12,fontWeight:900,color:C.gold,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>BUREAU NOSIS</div>
            {nosis?.ok?(
              <div>
                <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>SITUACIÓN LABORAL (AFIP)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                  {[['EMPLEADO REL. DEP.',nosis.esEmpleado],['MONOTRIBUTISTA',nosis.esMonotributista],['AUTÓNOMO',nosis.esAutonomo],['JUBILADO',nosis.esJubilado]].map(([l,v])=>(
                    <div key={l} style={{background:C.bg3,borderRadius:7,padding:'7px 10px',border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:8,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:900,color:v==='SI'?C.green:v==='NO'?C.red:C.text3}}>{v||'N/D'}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>COMPORTAMIENTO CREDITICIO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {[
                    ['CHEQUES S/FONDOS 6M',nosis.cheques6mCant,nosis.cheques6mCant>0?C.red:C.green],
                    ['CONCURSOS/QUIEBRAS 24M',nosis.concursos24m,nosis.concursos24m>0?C.red:C.green],
                    ['DEUDA FISCAL AFIP',nosis.deudaFiscal==='SI'?'SÍ':nosis.deudaFiscal==='NO'?'NO':'S/D',nosis.deudaFiscal==='SI'?C.red:C.green],
                    ['COMPROMISO MENSUAL',nosis.compromisoMensual||'S/D',C.text2],
                    ['ANTIGÜEDAD LABORAL',nosis.antiguedadLaboral!=null?`${nosis.antiguedadLaboral} M`:'S/D',nosis.antiguedadLaboral>=6?C.green:C.gold],
                    ['CONSULTAS 12M',nosis.consultas12m,nosis.consultas12m>10?C.gold:C.text2],
                  ].map(([l,v,color])=>(
                    <div key={l} style={{background:C.bg3,borderRadius:7,padding:'7px 10px',border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:8,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:900,color:color||C.text}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ):nosis?(
              <div style={{fontSize:12,color:C.text3,fontWeight:400}}>{nosis.error||'Error en consulta Nosis'}</div>
            ):(
              <div style={{fontSize:12,color:C.text3,fontWeight:400,fontStyle:'italic'}}>Informe Nosis no disponible para esta solicitud</div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>INFORMES CREDITICIOS</div>
      <div style={{fontSize:11,color:C.text3,marginBottom:20,fontWeight:400}}>{conInformes.length} solicitud(es) con informe BCRA / Nosis disponible</div>
      {!conInformes.length?(
        <Card style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>📋</div>
          <div style={{color:C.text3,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>AÚN NO HAY SOLICITUDES ANALIZADAS CON BCRA / NOSIS</div>
          <div style={{color:C.text3,fontSize:11,marginTop:8,fontWeight:400}}>Los informes aparecen aquí cuando el analista completa el Módulo B en una solicitud pendiente.</div>
        </Card>
      ):conInformes.map(s=>{
        const cli=s.cliente||{};
        const bcra=s.bcra_data;
        const semaforo=bcra?.ok?(bcra.peorSit>=3?'🔴':bcra.peorSit===2?'🟡':'🟢'):'⚪';
        return(
          <Card key={s.id} style={{padding:18,marginBottom:10,cursor:'pointer',borderLeft:`3px solid ${s.estado==='aprobado'?C.green:s.estado==='rechazado'?C.red:C.gold}`}} onClick={()=>setSel(s)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:22}}>{semaforo}</span>
                <div>
                  <div style={{fontWeight:900,fontSize:13,color:C.text,textTransform:'uppercase',letterSpacing:'0.03em'}}>{cli.nombre} {cli.apellido}</div>
                  <div style={{fontSize:11,color:C.text2,marginTop:3,fontWeight:400}}>CUIL {cli.cuil} · {s.linea_nombre} · {fmt(s.monto)} · {s.fecha_res||s.fecha}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{display:'flex',gap:8}}>
                  {s.bcra_data&&<span style={{fontSize:10,background:'rgba(74,154,224,0.15)',color:C.blue,borderRadius:6,padding:'3px 10px',fontWeight:700,border:'1px solid rgba(74,154,224,0.3)'}}>BCRA</span>}
                  {s.nosis_data&&<span style={{fontSize:10,background:C.goldL,color:C.gold,borderRadius:6,padding:'3px 10px',fontWeight:700,border:`1px solid ${C.goldB}`}}>NOSIS</span>}
                </div>
                <Badge text={s.estado_texto||s.estado} type={s.estado}/>
                <span style={{color:C.text3,fontSize:16}}>›</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── ANALISTA ──────────────────────────────────────────────────────────────────
function Analista({user,onLogout}){
  const [tab,setTab]=useState('solicitudes');
  const [sols,setSols]=useState([]);const [filtro,setFiltro]=useState('todas');const [loading,setLoading]=useState(true);const [detalle,setDetalle]=useState(null);const [moduloB,setModuloB]=useState(null);const [moduloC,setModuloC]=useState(null);const [legajo,setLegajo]=useState(null);
  useEffect(()=>{cargar();const iv=setInterval(cargar,15000);return()=>clearInterval(iv);},[]);
  async function cargar(){setSols(await db.getSolicitudes());setLoading(false);}
  async function resolver(id,estado,obs){
    await db.updateSolicitud(id,{estado,estado_texto:estado==='aprobado'?'APROBADO — PENDIENTE FIRMA':'RECHAZADO',obs,analista:user.nombre,fecha_res:new Date().toLocaleDateString('es-AR')});
    await cargar();setDetalle(null);
  }

  if(moduloB) return <ModuloB sol={moduloB} user={user} onVolver={()=>setModuloB(null)} onActualizar={cargar}/>;
  if(moduloC) return <ModuloC sol={moduloC} user={user} onVolver={()=>setModuloC(null)} onActualizar={cargar}/>;
  if(legajo) return <LegajoDigital sol={legajo} user={user} onVolver={()=>setLegajo(null)} onActualizar={cargar}/>;

  const list=sols.filter(s=>filtro==='todas'||s.estado===filtro);
  const cnt={p:sols.filter(s=>s.estado==='pendiente').length,a:sols.filter(s=>s.estado==='aprobado').length,r:sols.filter(s=>s.estado==='rechazado').length};
  const rowColor={aprobado:'rgba(74,224,138,0.04)',rechazado:'rgba(224,80,80,0.04)',pendiente:'transparent'};
  const rowBorder={aprobado:C.green,rechazado:C.red,pendiente:C.gold};

  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL DE ANÁLISIS" user={user} onLogout={onLogout}/>
      <Tabs tabs={[['solicitudes','SOLICITUDES'],['informes','INFORMES BCRA / NOSIS'],['legajos','LEGAJOS']]} active={tab} onChange={setTab}/>
      <div style={{padding:28,maxWidth:1100,margin:'0 auto'}}>

        {tab==='solicitudes'&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
              {[['PENDIENTES',cnt.p,C.gold,C.goldL,C.goldB],['APROBADAS',cnt.a,C.green,C.greenL,C.greenB],['RECHAZADAS',cnt.r,C.red,C.redL,C.redB]].map(([l,n,color,bg,b])=>(
                <div key={l} style={{background:bg,borderRadius:12,padding:18,border:`1px solid ${b}`}}>
                  <div style={{fontSize:34,fontWeight:900,color,lineHeight:1}}>{n}</div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color,marginTop:6}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:18}}>
              {[['todas','TODAS'],['pendiente','PENDIENTES'],['aprobado','APROBADAS'],['rechazado','RECHAZADAS']].map(([k,l])=>(
                <button key={k} onClick={()=>setFiltro(k)}
                  style={{padding:'8px 16px',borderRadius:20,fontSize:10,fontWeight:700,
                    background:filtro===k?C.gold:'rgba(255,255,255,0.05)',color:filtro===k?'#fff':C.text2,
                    border:`1px solid ${filtro===k?C.gold:C.border}`,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {l}
                </button>
              ))}
            </div>
            {loading?<div style={{textAlign:'center',padding:60,color:C.text3}}>CARGANDO...</div>:(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      {['CLIENTE','LÍNEA / MONTO','CUOTA','EMBAJADOR','FECHA','ESTADO','OBSERVACIÓN'].map(h=>(
                        <th key={h} style={{background:C.bg3,color:C.text2,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',padding:'10px 14px',textAlign:'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(s=>(
                      <tr key={s.id} onClick={()=>s.estado==='pendiente'?setModuloB(s):s.firma_cliente_completada?setLegajo(s):s.estado==='aprobado'?setModuloC(s):setDetalle(s)}
                        style={{background:rowColor[s.estado],cursor:'pointer',borderLeft:`3px solid ${rowBorder[s.estado]}`}}>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{fontWeight:900,color:s.estado==='rechazado'?C.red:C.text,textTransform:'uppercase',letterSpacing:'0.03em',fontSize:12}}>{s.cliente?.nombre} {s.cliente?.apellido}</div>
                          <div style={{fontSize:10,color:C.text3,fontWeight:400,marginTop:2}}>DNI {s.cliente?.dni}</div>
                        </td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{color:s.estado==='rechazado'?C.text2:C.text,fontWeight:700,fontSize:12,textTransform:'uppercase'}}>{s.linea_nombre}</div>
                          <div style={{fontSize:11,color:C.text3,fontWeight:400}}>{fmt(s.monto)} · {s.plazo}M</div>
                        </td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,fontWeight:900,color:s.estado==='rechazado'?C.red:s.estado==='aprobado'?C.green:C.gold,fontSize:13}}>{fmt(s.cuota)}</td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,color:C.text2,fontWeight:400,fontSize:11}}>{s.emb_nombre}</td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,color:C.text2,fontWeight:400,fontSize:11}}>{s.fecha}</td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><Badge text={s.estado_texto||s.estado} type={s.estado}/></td>
                        <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,color:s.estado==='rechazado'?C.red:C.text3,fontSize:11,fontWeight:400,maxWidth:200}}>{s.obs||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab==='informes'&&<PanelInformes sols={sols}/>}
        {tab==='legajos'&&<PanelLegajos sols={sols} user={user} onVerLegajo={setLegajo}/>}
      </div>
      {detalle&&<Modal sol={detalle} onClose={()=>setDetalle(null)} onResolver={resolver}/>}
    </div>
  );
}

// ── EMBAJADOR ─────────────────────────────────────────────────────────────────
function Embajador({user,onLogout}){
  const [tab,setTab]=useState('nueva');const [lineas,setLineas]=useState([]);const [sols,setSols]=useState([]);const [detalle,setDetalle]=useState(null);
  useEffect(()=>{init();},[]);
  async function init(){const l=await db.getLineas();setLineas((l||[]).filter(x=>x.activa));setSols((await db.getSolicitudes(user.codigo))||[]);}
  async function cargarSols(){setSols((await db.getSolicitudes(user.codigo))||[]);}
  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PORTAL EMBAJADOR" user={user} onLogout={onLogout}/>
      <Tabs tabs={[['nueva','NUEVA SOLICITUD'],['mis','MIS SOLICITUDES']]} active={tab} onChange={k=>{setTab(k);if(k==='mis')cargarSols();}}/>
      <div style={{padding:28,maxWidth:860,margin:'0 auto'}}>
        {tab==='nueva'&&<NuevaSol user={user} lineas={lineas} onEnviada={()=>{cargarSols();setTab('mis');}}/>}
        {tab==='mis'&&(!sols.length
          ?<Card style={{padding:60,textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>📋</div><div style={{color:C.text3,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>TODAVÍA NO CARGASTE SOLICITUDES</div></Card>
          :sols.map(s=>(
            <Card key={s.id} style={{padding:20,marginBottom:10,cursor:'pointer',borderLeft:`3px solid ${s.estado==='pendiente'?C.gold:s.estado==='aprobado'?C.green:C.red}`}} onClick={()=>setDetalle(s)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:900,fontSize:14,color:C.text,textTransform:'uppercase',letterSpacing:'0.03em'}}>{s.cliente?.nombre} {s.cliente?.apellido}</div>
                  <div style={{fontSize:12,color:C.text2,marginTop:4,fontWeight:400}}>{s.linea_nombre} · {fmt(s.monto)} · {s.plazo} MESES · CUOTA {fmt(s.cuota)}</div>
                  <div style={{fontSize:10,color:C.text3,marginTop:3,fontWeight:400}}>{s.id} · {s.fecha}</div>
                </div>
                <Badge text={s.estado_texto||s.estado} type={s.estado}/>
              </div>
              {s.obs&&<div style={{marginTop:10,padding:'8px 12px',background:C.goldL,borderRadius:6,fontSize:11,color:C.gold,fontWeight:700}}>{s.obs}</div>}
            </Card>
          ))
        )}
      </div>
      {detalle&&<Modal sol={detalle} onClose={()=>setDetalle(null)} readOnly/>}
    </div>
  );
}

// ── NUEVA SOLICITUD ───────────────────────────────────────────────────────────
function NuevaSol({user,lineas,onEnviada}){
  const [paso,setPaso]=useState(1);const [lid,setLid]=useState('');const [plazo,setPlazo]=useState('');
  const [s1,setS1]=useState('');const [s2,setS2]=useState('');const [s3,setS3]=useState('');
  const [monto,setMonto]=useState('');const [f,setF]=useState({nombre:'',apellido:'',dni:'',cuil:'',email:'',tel:'',emp:'',antig:'',cbu:''});
  const [docs,setDocs]=useState({});const [env,setEnv]=useState(false);const [ok,setOk]=useState(false);

  const linea=lineas.find(l=>l.id===lid);
  const prom=s1&&s2&&s3?(parseFloat(s1)+parseFloat(s2)+parseFloat(s3))/3:0;
  const cmax=prom*0.30;
  const cuota=linea&&monto&&plazo?calcCuota(parseFloat(monto),linea.tna,linea.seguro||0,linea.comisiones||0,parseInt(plazo)):0;
  const desembolso=linea&&monto?calcDesembolso(parseFloat(monto),linea.gastos||0):0;
  const capOK=cmax>0&&cuota>0&&cuota<=cmax;

  async function enviar(){
    setEnv(true);
    await db.saveSolicitud({id:`SOL-${Date.now()}`,fecha:new Date().toLocaleDateString('es-AR'),embCod:user.codigo,embNombre:user.nombre,lineaId:lid,lineaNombre:linea.nombre,plazo:parseInt(plazo),monto:parseFloat(monto),tna:linea.tna,cuota:Math.round(cuota),promSueldo:Math.round(prom),cli:{...f},docs:Object.keys(docs),estado:'pendiente',estadoTexto:'PENDIENTE DE ANÁLISIS'});
    setEnv(false);setOk(true);
  }
  const reset=()=>{setOk(false);setPaso(1);setLid('');setPlazo('');setS1('');setS2('');setS3('');setMonto('');setF({nombre:'',apellido:'',dni:'',cuil:'',email:'',tel:'',emp:'',antig:'',cbu:''});setDocs({});};

  if(ok) return <Card style={{padding:60,textAlign:'center'}}><div style={{fontSize:52,marginBottom:16}}>✅</div><div style={{fontSize:20,fontWeight:900,color:C.green,marginBottom:8,letterSpacing:'0.06em',textTransform:'uppercase'}}>SOLICITUD ENVIADA</div><div style={{color:C.text2,marginBottom:28,fontWeight:400}}>Enviada al equipo de análisis.</div><Btn onClick={reset} variant="ghost">CARGAR OTRA SOLICITUD</Btn></Card>;

  const steps=['LÍNEA Y SIMULACIÓN','DATOS DEL CLIENTE','DOCUMENTACIÓN','CONFIRMAR'];
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',marginBottom:28}}>
        {steps.map((l,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}>
              <div style={{width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:paso>i+1?C.green:paso===i+1?C.gold:C.border,color:paso>=i+1?'#fff':C.text3,fontWeight:900,fontSize:13}}>{paso>i+1?'✓':i+1}</div>
              <div style={{fontSize:10,color:paso===i+1?C.gold:C.text3,marginTop:5,textAlign:'center',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>{l}</div>
            </div>
            {i<3&&<div style={{height:2,width:20,background:paso>i+1?C.green:C.border,marginBottom:22}}/>}
          </div>
        ))}
      </div>

      {paso===1&&<Card style={{padding:32}}>
        <div style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:20}}>LÍNEA DE CRÉDITO Y SIMULACIÓN</div>
        {!lineas.length?<div style={{padding:20,background:C.goldL,borderRadius:8,color:C.gold,fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>NO HAY LÍNEAS ACTIVAS. CONTACTÁ AL ADMINISTRADOR.</div>:<>
          <Sel label="LÍNEA DE CRÉDITO" value={lid} onChange={e=>{setLid(e.target.value);setPlazo('');}} options={lineas.map(l=>({v:l.id,l:l.nombre.toUpperCase()}))} req/>
          {linea&&<div style={{background:C.bg3,borderRadius:10,padding:14,marginBottom:18,border:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
            {[['TNA',`${linea.tna}%`,C.text],['TEA + IVA',fmtP(calcTEA(linea.tna)),C.blue],['CFT REAL',fmtP(calcCFT(linea.tna,linea.seguro||0,linea.comisiones||0,linea.gastos||0)),C.gold]].map(([l,v,color])=>(
              <div key={l}><div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>{l}</div><div style={{fontSize:16,fontWeight:900,color,marginTop:3}}>{v}</div></div>
            ))}
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 14px'}}>
            <Inp label="RECIBO 1 (MÁS ANTIGUO)" type="number" value={s1} onChange={e=>setS1(e.target.value)} placeholder="0" req/>
            <Inp label="RECIBO 2" type="number" value={s2} onChange={e=>setS2(e.target.value)} placeholder="0" req/>
            <Inp label="RECIBO 3 (MÁS RECIENTE)" type="number" value={s3} onChange={e=>setS3(e.target.value)} placeholder="0" req/>
          </div>
          {prom>0&&<div style={{background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:10,padding:14,marginBottom:18,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div><span style={{fontSize:10,color:C.text2,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>PROMEDIO NETO: </span><strong style={{color:C.text,fontSize:13}}>{fmt(prom)}</strong></div>
            <div><span style={{fontSize:10,color:C.text2,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>CUOTA MÁX. 30%: </span><strong style={{color:C.green,fontSize:13}}>{fmt(cmax)}</strong></div>
          </div>}
          {linea&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Inp label="MONTO SOLICITADO ($)" type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder={`${fmtN(linea.montoMin)} — ${fmtN(linea.montoMax)}`} req/>
            <Sel label="PLAZO" value={plazo} onChange={e=>setPlazo(e.target.value)} options={(linea.plazos||[]).map(p=>({v:p,l:`${p} MESES`}))} req/>
          </div>
          {cuota>0&&<>
            <div style={{borderRadius:12,padding:22,background:capOK?C.greenL:C.redL,border:`1.5px solid ${capOK?C.greenB:C.redB}`}}>
              <div style={{fontSize:10,color:C.text2,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>CUOTA MENSUAL ESTIMADA (CON IVA)</div>
              <div style={{fontSize:40,fontWeight:900,color:capOK?C.green:C.red}}>{fmt(cuota)}</div>
              <div style={{fontSize:11,color:C.text3,marginTop:6,fontWeight:400}}>Capital + intereses×1.21 + seguro×1.21 + comisiones×1.21</div>
              {!capOK&&prom>0&&<div style={{fontSize:12,color:C.red,marginTop:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>⚠️ SUPERA EL 30% DEL SUELDO. REDUCÍ EL MONTO O AMPLIÁ EL PLAZO.</div>}
              {capOK&&<div style={{fontSize:12,color:C.green,marginTop:8,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase'}}>✓ DENTRO DE LA CAPACIDAD DE PAGO</div>}
            </div>
            {(linea.gastos||0)>0&&<div style={{background:C.bg3,borderRadius:10,padding:14,marginTop:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>DESEMBOLSO REAL</div>
              {[[`MONTO DEL PRÉSTAMO`,fmt(parseFloat(monto)),C.text],[`GASTOS AL ORIGEN (${linea.gastos}% + IVA)`,`−${fmt(parseFloat(monto)*(linea.gastos/100)*IVA)}`,C.red],['CLIENTE RECIBE',fmt(desembolso),C.gold]].map(([l,v,color])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:11,color:C.text2,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:900,color}}>{v}</span>
                </div>
              ))}
            </div>}
          </>}</>}
        </>}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:22}}>
          <Btn onClick={()=>setPaso(2)} disabled={!linea||!monto||!plazo||!s1||!s2||!s3||!capOK}>CONTINUAR →</Btn>
        </div>
      </Card>}

      {paso===2&&<Card style={{padding:32}}>
        <div style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:20}}>DATOS DEL CLIENTE</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
          <Inp label="NOMBRE" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} req/>
          <Inp label="APELLIDO" value={f.apellido} onChange={e=>setF({...f,apellido:e.target.value})} req/>
          <Inp label="DNI" value={f.dni} onChange={e=>setF({...f,dni:e.target.value})} placeholder="12345678" req/>
          <Inp label="CUIL" value={f.cuil} onChange={e=>setF({...f,cuil:e.target.value})} placeholder="20-12345678-9" req/>
          <Inp label="EMAIL" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} req/>
          <Inp label="TELÉFONO" value={f.tel} onChange={e=>setF({...f,tel:e.target.value})} placeholder="+54 9 11 ..." req/>
          <Inp label="EMPLEADOR" value={f.emp} onChange={e=>setF({...f,emp:e.target.value})} req/>
          <Inp label="ANTIGÜEDAD" value={f.antig} onChange={e=>setF({...f,antig:e.target.value})} placeholder="2 AÑOS 3 MESES" req/>
          <Inp label="CBU / CVU" value={f.cbu} onChange={e=>setF({...f,cbu:e.target.value})} placeholder="22 DÍGITOS" req/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          <Btn onClick={()=>setPaso(1)} variant="sec">← ATRÁS</Btn>
          <Btn onClick={()=>setPaso(3)} disabled={!f.nombre||!f.apellido||!f.dni||!f.cuil||!f.email||!f.tel||!f.emp||!f.cbu}>CONTINUAR →</Btn>
        </div>
      </Card>}

      {paso===3&&linea&&<Card style={{padding:32}}>
        <div style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:20}}>DOCUMENTACIÓN</div>
        <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>OBLIGATORIOS</div>
        {(linea.docsReq||[]).map(d=>(
          <div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderRadius:8,marginBottom:8,border:`1px solid ${docs[d]?C.greenB:C.border}`,background:docs[d]?C.greenL:'rgba(255,255,255,0.02)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>{docs[d]?'✅':'📄'}</span>
              <span style={{fontSize:12,color:C.text,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{d}</span>
              <span style={{fontSize:11,color:C.gold}}>*</span>
            </div>
            <label style={{cursor:'pointer'}}>
              <span style={{fontSize:11,padding:'6px 14px',borderRadius:6,fontWeight:700,background:docs[d]?C.greenL:C.goldL,color:docs[d]?C.green:C.gold,border:`1px solid ${docs[d]?C.greenB:C.goldB}`,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                {docs[d]?'CAMBIAR':'ADJUNTAR'}
              </span>
              <input type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&setDocs({...docs,[d]:e.target.files[0].name})}/>
            </label>
          </div>
        ))}
        {(linea.docsOpc||[]).length>0&&<>
          <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',margin:'16px 0 12px'}}>OPCIONALES</div>
          {(linea.docsOpc||[]).map(d=>(
            <div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderRadius:8,marginBottom:8,border:`1px solid ${docs[d]?C.greenB:C.border}`,background:docs[d]?C.greenL:'rgba(255,255,255,0.02)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:18}}>{docs[d]?'✅':'📄'}</span><span style={{fontSize:12,color:C.text,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{d}</span></div>
              <label style={{cursor:'pointer'}}><span style={{fontSize:11,padding:'6px 14px',borderRadius:6,fontWeight:700,background:'rgba(255,255,255,0.05)',color:C.text2,border:`1px solid ${C.border}`,letterSpacing:'0.06em',textTransform:'uppercase'}}>{docs[d]?'CAMBIAR':'ADJUNTAR'}</span><input type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&setDocs({...docs,[d]:e.target.files[0].name})}/></label>
            </div>
          ))}
        </>}
        {(linea.docsReq||[]).some(d=>!docs[d])&&<div style={{background:C.goldL,border:`1px solid ${C.goldB}`,borderRadius:8,padding:'10px 14px',fontSize:11,color:C.gold,marginTop:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>FALTAN: {(linea.docsReq||[]).filter(d=>!docs[d]).join(' · ')}</div>}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:22}}>
          <Btn onClick={()=>setPaso(2)} variant="sec">← ATRÁS</Btn>
          <Btn onClick={()=>setPaso(4)} disabled={(linea.docsReq||[]).some(d=>!docs[d])}>CONTINUAR →</Btn>
        </div>
      </Card>}

      {paso===4&&linea&&<Card style={{padding:32}}>
        <div style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:22}}>RESUMEN Y CONFIRMACIÓN</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          <div style={{background:C.bg3,borderRadius:10,padding:18,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>CRÉDITO</div>
            <div style={{fontWeight:900,color:C.text,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:8}}>{linea.nombre}</div>
            <div style={{fontSize:12,color:C.text2}}>MONTO: <strong style={{color:C.text}}>{fmt(parseFloat(monto))}</strong></div>
            <div style={{fontSize:12,color:C.text2}}>PLAZO: <strong style={{color:C.text}}>{plazo} MESES</strong></div>
            <div style={{fontSize:22,fontWeight:900,color:C.green,marginTop:10}}>{fmt(cuota)}</div>
            <div style={{fontSize:10,color:C.text3,fontWeight:400}}>CUOTA MENSUAL ESTIMADA CON IVA</div>
            {(linea.gastos||0)>0&&<><div style={{fontSize:22,fontWeight:900,color:C.gold,marginTop:8}}>{fmt(desembolso)}</div><div style={{fontSize:10,color:C.text3,fontWeight:400}}>CLIENTE RECIBE</div></>}
          </div>
          <div style={{background:C.bg3,borderRadius:10,padding:18,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>CLIENTE</div>
            <div style={{fontWeight:900,color:C.text,textTransform:'uppercase'}}>{f.nombre} {f.apellido}</div>
            <div style={{fontSize:12,color:C.text2,marginTop:4}}>DNI {f.dni} · CUIL {f.cuil}</div>
            <div style={{fontSize:12,color:C.text2}}>{f.email}</div>
            <div style={{fontSize:12,color:C.text2,textTransform:'uppercase'}}>{f.emp} · {f.antig}</div>
          </div>
        </div>
        <div style={{background:C.greenL,borderRadius:10,padding:14,marginBottom:22,border:`1px solid ${C.greenB}`,fontSize:12,color:C.text2}}>
          <strong style={{color:C.green}}>DOCUMENTOS ADJUNTOS:</strong> {Object.keys(docs).join(' · ')}
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <Btn onClick={()=>setPaso(3)} variant="sec">← ATRÁS</Btn>
          <Btn onClick={enviar} variant="success" disabled={env}>{env?'ENVIANDO...':'✓ ENVIAR SOLICITUD'}</Btn>
        </div>
      </Card>}
    </div>
  );
}

// ── MODAL DETALLE ─────────────────────────────────────────────────────────────
function Modal({sol:s,onClose,onResolver,readOnly}){
  const [obs,setObs]=useState(s.obs||'');const [conf,setConf]=useState(null);
  const cli=s.cliente||{};
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(3,15,30,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:C.bg4,borderRadius:14,width:'100%',maxWidth:620,maxHeight:'90vh',overflowY:'auto',border:`1px solid ${C.border}`}}>
        <div style={{padding:'20px 28px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:900,fontSize:16,color:C.text,letterSpacing:'0.04em',textTransform:'uppercase'}}>{s.id}</div><div style={{fontSize:11,color:C.text3,fontWeight:400,marginTop:2}}>{s.fecha} · {s.emb_nombre}</div></div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:C.text3}}>✕</button>
        </div>
        <div style={{padding:28}}>
          {[['CRÉDITO',[['LÍNEA',s.linea_nombre],['MONTO',fmt(s.monto)],['PLAZO',`${s.plazo} MESES`],['CUOTA',fmt(s.cuota),true],['TNA',`${s.tna}%`],['SUELDO PROM.',fmt(s.prom_sueldo)]]],
            ['CLIENTE',[['NOMBRE',`${cli.nombre} ${cli.apellido}`],['DNI',cli.dni],['CUIL',cli.cuil],['EMAIL',cli.email],['TELÉFONO',cli.tel],['EMPLEADOR',cli.emp],['ANTIGÜEDAD',cli.antig],['CBU/CVU',cli.cbu]]]
          ].map(([title,fields])=>(
            <div key={title} style={{marginBottom:22}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>{title}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 24px'}}>
                {fields.map(([l,v,hi])=>(
                  <div key={l} style={{padding:'6px 0'}}>
                    <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:hi?900:600,color:hi?C.green:C.text}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{marginBottom:22}}>
            <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>DOCUMENTACIÓN</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{(s.docs||[]).map(d=><span key={d} style={{background:C.goldL,color:C.gold,borderRadius:6,padding:'4px 10px',fontSize:11,border:`1px solid ${C.goldB}`,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>📎 {d}</span>)}</div>
          </div>
          {!readOnly&&s.estado==='pendiente'&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>RESOLUCIÓN</div>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>OBSERVACIONES</label>
                <textarea value={obs} onChange={e=>setObs(e.target.value)} style={{width:'100%',minHeight:80,padding:'10px 14px',border:`1.5px solid ${C.border2}`,borderRadius:8,fontSize:13,color:C.text,background:'rgba(255,255,255,0.05)',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}} placeholder="FUNDAMENTO DEL ANÁLISIS..."/>
              </div>
              {!conf?<div style={{display:'flex',gap:12}}><Btn onClick={()=>setConf('aprobado')} variant="success" style={{flex:1}}>✓ APROBAR</Btn><Btn onClick={()=>setConf('rechazado')} variant="danger" style={{flex:1}}>✕ RECHAZAR</Btn></div>
              :<div style={{background:conf==='aprobado'?C.greenL:C.redL,borderRadius:10,padding:16,border:`1px solid ${conf==='aprobado'?C.greenB:C.redB}`}}>
                <div style={{fontWeight:700,marginBottom:12,color:conf==='aprobado'?C.green:C.red,textTransform:'uppercase',letterSpacing:'0.06em'}}>¿CONFIRMAR {conf==='aprobado'?'APROBACIÓN':'RECHAZO'}?</div>
                <div style={{display:'flex',gap:10}}>
                  <Btn onClick={()=>onResolver(s.id,conf,obs)} variant={conf==='aprobado'?'success':'danger'} style={{flex:1}}>CONFIRMAR</Btn>
                  <Btn onClick={()=>setConf(null)} variant="sec" style={{flex:1}}>CANCELAR</Btn>
                </div>
              </div>}
            </div>
          )}
          {s.estado!=='pendiente'&&(
            <div style={{padding:'14px 18px',background:s.estado==='aprobado'?C.greenL:C.redL,borderRadius:10,border:`1px solid ${s.estado==='aprobado'?C.greenB:C.redB}`}}>
              <div style={{fontWeight:900,color:s.estado==='aprobado'?C.green:C.red,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.estado==='aprobado'?'✓ APROBADO':'✕ RECHAZADO'} · {s.fecha_res}</div>
              {s.obs&&<div style={{fontSize:13,color:C.text2,fontWeight:400}}>{s.obs}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
function AppPrincipal(){
  const [user,setUser]=useState(null);
  if(!user) return <Login onLogin={setUser}/>;
  if(user.rol==='admin') return <Admin user={user} onLogout={()=>setUser(null)}/>;
  if(user.rol==='analista') return <Analista user={user} onLogout={()=>setUser(null)}/>;
  return <Embajador user={user} onLogout={()=>setUser(null)}/>;
}

export default function App(){
  return (
    <Routes>
      <Route path="/firma/:token" element={<FirmaCliente/>}/>
      <Route path="/*" element={<AppPrincipal/>}/>
    </Routes>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO B — PRE-APROBACIÓN CREDITICIA
// ══════════════════════════════════════════════════════════════════════════════

function getNosisVar(variables, nombre) {
  if (!variables) return null;
  const v = variables.find(x => x.Nombre === nombre);
  return v ? v.Valor : null;
}

function parsearNosis(data) {
  const contenido = data?.Contenido;
  const resultado = contenido?.Resultado;
  if (!resultado || resultado.Estado !== 200) {
    return { ok: false, error: resultado?.Novedad || 'Sin respuesta' };
  }
  const vars = contenido?.Datos?.Variables?.Variable;
  const arr = Array.isArray(vars) ? vars : vars ? [vars] : [];
  return {
    ok: true,
    cuil: getNosisVar(arr, 'VI_Identificacion'),
    domCalle: getNosisVar(arr, 'VI_DomAF_Calle'),
    domNro: getNosisVar(arr, 'VI_DomAF_Nro'),
    domPiso: getNosisVar(arr, 'VI_DomAF_Piso'),
    domDto: getNosisVar(arr, 'VI_DomAF_Dto'),
    domLoc: getNosisVar(arr, 'VI_DomAF_Loc'),
    domCP: getNosisVar(arr, 'VI_DomAF_CP'),
    domProv: getNosisVar(arr, 'VI_DomAF_Prov'),
    telCodArea: getNosisVar(arr, 'VI_Tel1_CodArea'),
    telNro: getNosisVar(arr, 'VI_Tel1_Nro'),
    esJubilado: getNosisVar(arr, 'VI_Jubilado_Es'),
    esEmpleado: getNosisVar(arr, 'VI_Empleado_Es'),
    esMonotributista: getNosisVar(arr, 'VI_Inscrip_Monotributo_Es'),
    esAutonomo: getNosisVar(arr, 'VI_Inscrip_Autonomo_Es'),
    antiguedadLaboral: parseInt(getNosisVar(arr, 'VI_AntiguedadLaboral')) || null,
    compromisoMensual: getNosisVar(arr, 'CI_Vig_CompMensual'),
    cheques6mCant: parseInt(getNosisVar(arr, 'HC_6m_SF_NoPag_Cant')) || 0,
    cheques6mMonto: getNosisVar(arr, 'HC_6m_SF_NoPag_Monto'),
    concursos24m: parseInt(getNosisVar(arr, 'CQ_24m_Cant')) || 0,
    refVigCant: parseInt(getNosisVar(arr, 'RC_Vig_Cant')) || 0,
    refVigFuente: getNosisVar(arr, 'RC_Vig_Fuente'),
    consultas12m: parseInt(getNosisVar(arr, 'CO_12m_Cant')) || 0,
    deudaFiscal: getNosisVar(arr, 'DF_Tiene'),
    cneFecAct: getNosisVar(arr, 'FEX_CNE_FecAct'),
    cneFecVenc: getNosisVar(arr, 'FEX_CNE_FecVenc'),
    cneTiene: getNosisVar(arr, 'CNE_CertificadoTiene'),
  };
}

function parsearBCRA(data) {
  if (!data || data.status !== 200) return { ok: false, error: 'CUIL no encontrado en BCRA' };
  const resultados = data.results?.periodos?.[0]?.entidades || [];
  let peorSit = 1;
  let deudas = [];
  resultados.forEach(e => {
    const sit = parseInt(e.situacion);
    if (sit > peorSit) peorSit = sit;
    deudas.push({ entidad: e.entidad, situacion: sit, monto: e.monto });
  });
  return { ok: true, peorSit, deudas, cantEntidades: resultados.length };
}

function evaluarCredito(bcra, nosis, prom30) {
  const alertas = [];
  const rechazos = [];
  if (bcra && bcra.ok) {
    if (bcra.peorSit >= 3) rechazos.push(`BCRA: Situación ${bcra.peorSit} — Rechazo automático`);
    else if (bcra.peorSit === 2) alertas.push('BCRA: Situación 2 — Requiere análisis adicional');
  } else {
    alertas.push('BCRA: No figura en Central de Deudores — sin historial bancario');
  }
  if (nosis && nosis.ok) {
    if (nosis.cheques6mCant > 0) rechazos.push(`Nosis: ${nosis.cheques6mCant} cheque(s) sin fondos no pagados en últimos 6 meses`);
    if (nosis.concursos24m > 0) rechazos.push(`Nosis: ${nosis.concursos24m} concurso(s)/quiebra(s) en últimos 24 meses`);
    if (nosis.deudaFiscal === 'SI') alertas.push('Nosis: Registra deudas fiscales en AFIP');
    if (nosis.esEmpleado === 'NO' && nosis.esMonotributista === 'NO' && nosis.esAutonomo === 'NO' && nosis.esJubilado === 'NO')
      alertas.push('Nosis: No figura como empleado, monotributista, autónomo ni jubilado en AFIP');
    if (nosis.compromisoMensual && prom30 > 0) {
      const compMens = parseFloat(nosis.compromisoMensual.replace(/[^0-9.]/g, '')) || 0;
      if (compMens > prom30) alertas.push(`Nosis: Compromiso mensual existente supera el 30% del sueldo`);
    }
    if (nosis.antiguedadLaboral !== null && nosis.antiguedadLaboral < 6)
      alertas.push(`Nosis: Antigüedad laboral menor a 6 meses (${nosis.antiguedadLaboral} meses)`);
  }
  const aprobado = rechazos.length === 0;
  const conObservaciones = aprobado && alertas.length > 0;
  return { aprobado, conObservaciones, rechazos, alertas };
}

function ModuloB({ sol, onVolver, onActualizar, user }) {
  const [loading, setLoading] = useState(false);
  const [bcraData, setBcraData] = useState(null);
  const [nosisData, setNosisData] = useState(null);
  const [error, setError] = useState('');
  const [obs, setObs] = useState('');
  const [conf, setConf] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cli = sol.cliente || {};
  const prom = sol.prom_sueldo || 0;
  const prom30 = prom * 0.30;

  async function consultar() {
    setLoading(true); setError(''); setBcraData(null); setNosisData(null);
    try {
      const [rBcra, rNosis] = await Promise.all([
        fetch(`/api/bcra?cuil=${cli.cuil}`).then(r => r.json()),
        fetch(`/api/nosis?cuil=${cli.cuil}&nombre=${encodeURIComponent(cli.nombre||'')}&apellido=${encodeURIComponent(cli.apellido||'')}`).then(r => r.json()),
      ]);
      setBcraData(parsearBCRA(rBcra));
      setNosisData(parsearNosis(rNosis));
    } catch(e) {
      setError('Error de conexión. Verificá la red e intentá de nuevo.');
    }
    setLoading(false);
  }

  async function resolver(estado) {
    setEnviando(true);
    const bcraResumen = bcraData ? `BCRA Sit. ${bcraData.peorSit} | ${bcraData.cantEntidades} entidad(es)` : 'BCRA: no consultado';
    const nosisResumen = nosisData?.ok ? `Cheques 6m: ${nosisData.cheques6mCant} | Concursos: ${nosisData.concursos24m} | Deuda Fiscal: ${nosisData.deudaFiscal}` : 'Nosis: no consultado';
    const obsCompleto = `${obs}\n\n--- ANÁLISIS CREDITICIO ---\n${bcraResumen}\n${nosisResumen}`.trim();
    await db.updateSolicitud(sol.id, {
      estado,
      estado_texto: estado === 'aprobado' ? 'PRE-APROBADO — LINK ENVIADO AL CLIENTE' : 'RECHAZADO',
      obs: obsCompleto,
      analista: user.nombre,
      fecha_res: new Date().toLocaleDateString('es-AR'),
      bcra_data: bcraData,
      nosis_data: nosisData,
    });
    setEnviando(false);
    onActualizar();
    onVolver();
  }

  const bcra = bcraData;
  const nosis = nosisData;
  const eval_ = (bcra || nosis) ? evaluarCredito(bcra || { ok: false }, nosis || { ok: false }, prom30) : null;
  const colorSit = sit => sit === 1 ? C.green : sit === 2 ? C.gold : C.red;

  return (
    <div style={{ minHeight: '100vh', background: C.bg2 }}>
      <Hdr title="ANÁLISIS CREDITICIO — MÓDULO B" user={user} onLogout={() => {}} />
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <button onClick={onVolver} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.text3 }}>←</button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cli.nombre} {cli.apellido}</div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 2, fontWeight: 400 }}>{sol.id} · CUIL {cli.cuil} · DNI {cli.dni}</div>
          </div>
        </div>

        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[['LÍNEA', sol.linea_nombre],['MONTO', fmt(sol.monto)],['PLAZO', `${sol.plazo} MESES`],['CUOTA EST.', fmt(sol.cuota)],['SUELDO PROM.', fmt(prom)],['30% SUELDO', fmt(prom30)],['CUOTA/SUELDO', `${((sol.cuota / prom) * 100).toFixed(1)}%`],['EMBAJADOR', sol.emb_nombre]].map(([l, v]) => (
              <div key={l} style={{ background: C.bg3, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {!bcra && !nosis && (
          <Card style={{ padding: 32, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.text2, marginBottom: 20, fontWeight: 400 }}>Consultá BCRA y Nosis automáticamente con el CUIL del cliente.</div>
            {error && <div style={{ background: C.redL, color: C.red, borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{error}</div>}
            <Btn onClick={consultar} disabled={loading} variant="gold" style={{ padding: '12px 40px', fontSize: 13 }}>
              {loading ? 'CONSULTANDO BCRA + NOSIS...' : '🔍 CONSULTAR BCRA + NOSIS'}
            </Btn>
          </Card>
        )}

        {loading && (
          <Card style={{ padding: 40, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.gold, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CONSULTANDO BCRA Y NOSIS...</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 8, fontWeight: 400 }}>Esto puede demorar hasta 30 segundos</div>
          </Card>
        )}

        {(bcra || nosis) && (
          <>
            {eval_ && (
              <Card style={{ padding: 20, marginBottom: 16, background: eval_.rechazos.length > 0 ? C.redL : eval_.conObservaciones ? C.goldL : C.greenL, border: `1.5px solid ${eval_.rechazos.length > 0 ? C.redB : eval_.conObservaciones ? C.goldB : C.greenB}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: eval_.rechazos.length + eval_.alertas.length > 0 ? 14 : 0 }}>
                  <div style={{ fontSize: 28 }}>{eval_.rechazos.length > 0 ? '🔴' : eval_.conObservaciones ? '🟡' : '🟢'}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: eval_.rechazos.length > 0 ? C.red : eval_.conObservaciones ? C.gold : C.green, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {eval_.rechazos.length > 0 ? 'RECHAZO AUTOMÁTICO' : eval_.conObservaciones ? 'PRE-APROBADO CON OBSERVACIONES' : 'PRE-APROBADO SIN OBSERVACIONES'}
                    </div>
                    <div style={{ fontSize: 11, color: C.text2, fontWeight: 400, marginTop: 3 }}>Basado en consulta BCRA + Nosis</div>
                  </div>
                </div>
                {eval_.rechazos.map((r, i) => <div key={i} style={{ fontSize: 12, color: C.red, fontWeight: 700, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>✕ {r}</div>)}
                {eval_.alertas.map((a, i) => <div key={i} style={{ fontSize: 12, color: C.gold, fontWeight: 700, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>⚠️ {a}</div>)}
              </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>CENTRAL DE DEUDORES BCRA</div>
                {bcra?.ok ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colorSit(bcra.peorSit)}20`, border: `2px solid ${colorSit(bcra.peorSit)}` }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: colorSit(bcra.peorSit) }}>{bcra.peorSit}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PEOR SITUACIÓN</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colorSit(bcra.peorSit) }}>{bcra.peorSit === 1 ? 'SITUACIÓN NORMAL' : bcra.peorSit === 2 ? 'RIESGO BAJO' : bcra.peorSit === 3 ? 'CON PROBLEMAS' : bcra.peorSit === 4 ? 'ALTO RIESGO' : 'IRRECUPERABLE'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.text2, fontWeight: 400 }}>{bcra.cantEntidades} entidad(es) informante(s)</div>
                    {bcra.deudas.slice(0, 3).map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                        <span style={{ color: C.text2, fontWeight: 400 }}>{d.entidad}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ color: colorSit(d.situacion), fontWeight: 700 }}>SIT {d.situacion}</span>
                          {d.monto && <span style={{ color: C.text, fontWeight: 700 }}>{fmt(d.monto * 1000)}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: C.text3, fontWeight: 400 }}>No figura en la Central de Deudores del BCRA</div>
                )}
              </Card>

              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>BUREAU NOSIS</div>
                {nosis?.ok ? (
                  <div>
                    <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>SITUACIÓN LABORAL (AFIP)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[['EMPLEADO REL. DEPENDENCIA', nosis.esEmpleado],['MONOTRIBUTISTA', nosis.esMonotributista],['AUTÓNOMO', nosis.esAutonomo],['JUBILADO', nosis.esJubilado]].map(([l, v]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 7, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: v === 'SI' ? C.green : v === 'NO' ? C.red : C.text3 }}>{v || 'N/D'}</div>
                        </div>
                      ))}
                    </div>
                    {nosis.antiguedadLaboral !== null && (
                      <div style={{ marginBottom: 10, background: C.bg3, borderRadius: 7, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>ANTIGÜEDAD LABORAL</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: nosis.antiguedadLaboral >= 6 ? C.green : C.gold }}>{nosis.antiguedadLaboral} MESES</div>
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>COMPORTAMIENTO CREDITICIO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[['CHEQUES S/FONDOS 6M', nosis.cheques6mCant, nosis.cheques6mCant > 0 ? C.red : C.green],['MONTO CHEQUES 6M', nosis.cheques6mMonto || '$0', nosis.cheques6mCant > 0 ? C.red : C.text2],['CONCURSOS/QUIEBRAS 24M', nosis.concursos24m, nosis.concursos24m > 0 ? C.red : C.green],['COMPROMISO MENSUAL', nosis.compromisoMensual || 'S/D', C.text2],['DEUDA FISCAL AFIP', nosis.deudaFiscal === 'SI' ? 'SÍ' : nosis.deudaFiscal === 'NO' ? 'NO' : 'S/D', nosis.deudaFiscal === 'SI' ? C.red : C.green],['CONSULTAS ÚLTIMOS 12M', nosis.consultas12m, nosis.consultas12m > 10 ? C.gold : C.text2]].map(([l, v, color]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 7, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: color || C.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>REFERENCIAS Y CONTACTO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[['REFERENCIAS COMERCIALES', nosis.refVigCant || '0', nosis.refVigCant > 0 ? C.green : C.text3],['TELÉFONO AFIP', nosis.telNro ? `(${nosis.telCodArea}) ${nosis.telNro}` : 'S/D', nosis.telNro ? C.text : C.text3]].map(([l, v, color]) => (
                        <div key={l} style={{ background: C.bg3, borderRadius: 7, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {(nosis.domCalle || nosis.domLoc) && (
                      <div style={{ marginTop: 6, background: C.bg3, borderRadius: 7, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>DOMICILIO FISCAL AFIP</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{[nosis.domCalle, nosis.domNro, nosis.domPiso && `Piso ${nosis.domPiso}`, nosis.domDto && `Dto ${nosis.domDto}`].filter(Boolean).join(' ')}{nosis.domLoc && ` — ${nosis.domLoc}`}{nosis.domProv && `, ${nosis.domProv}`}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.text3, fontWeight: 400 }}>{nosis?.error || 'Error al consultar Nosis'}</div>
                )}
              </Card>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <Btn onClick={consultar} disabled={loading} variant="sec" style={{ fontSize: 11 }}>{loading ? 'CONSULTANDO...' : '↻ VOLVER A CONSULTAR'}</Btn>
            </div>

            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>RESOLUCIÓN DEL ANALISTA</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>OBSERVACIONES Y FUNDAMENTO</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)}
                  style={{ width: '100%', minHeight: 90, padding: '10px 14px', border: `1.5px solid ${C.border2}`, borderRadius: 8, fontSize: 13, color: C.text, background: 'rgba(255,255,255,0.05)', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="FUNDAMENTO DEL ANÁLISIS CREDITICIO..." />
              </div>
              {!conf ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Btn onClick={() => setConf('aprobado')} variant="success" style={{ flex: 1 }} disabled={!eval_}>✓ PRE-APROBAR — ENVIAR LINK AL CLIENTE</Btn>
                  <Btn onClick={() => setConf('rechazado')} variant="danger" style={{ flex: 1 }} disabled={!eval_}>✕ RECHAZAR SOLICITUD</Btn>
                </div>
              ) : (
                <div style={{ background: conf === 'aprobado' ? C.greenL : C.redL, borderRadius: 10, padding: 18, border: `1px solid ${conf === 'aprobado' ? C.greenB : C.redB}` }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, color: conf === 'aprobado' ? C.green : C.red, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {conf === 'aprobado' ? '¿CONFIRMAR PRE-APROBACIÓN Y ENVÍO DE LINK AL CLIENTE?' : '¿CONFIRMAR RECHAZO DE LA SOLICITUD?'}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn onClick={() => resolver(conf)} variant={conf === 'aprobado' ? 'success' : 'danger'} style={{ flex: 1 }} disabled={enviando}>{enviando ? 'PROCESANDO...' : 'CONFIRMAR'}</Btn>
                    <Btn onClick={() => setConf(null)} variant="sec" style={{ flex: 1 }}>CANCELAR</Btn>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}


// Para usar este módulo:
// 1. Agregar en App.js dentro del componente Analista:
//    const [moduloC, setModuloC] = useState(null);
//    if (moduloC) return <ModuloC sol={moduloC} user={user} onVolver={() => setModuloC(null)} onActualizar={cargar} />;
// 2. En la tabla de solicitudes, para solicitudes aprobadas agregar botón:
//    onClick={() => s.estado === 'aprobado' ? setModuloC(s) : setDetalle(s)}

const EMPRESA = {
  nombre: 'AUTOLOGROS S.A.',
  cuit: '30-71934732-7',
  domicilio: 'Lavalle 1390, Piso 3, Oficina B, Ciudad Autónoma de Buenos Aires',
  representante: 'Nicolás Issaharoff',
  cargo: 'Presidente',
  jurisdiccion: 'Ciudad Autónoma de Buenos Aires',
};

const IVA_MOD = 1.21;

function fmtFecha(fecha) {
  const d = new Date();
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function numALetras(n) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (n === 0) return 'CERO';
  if (n < 0) return 'MENOS ' + numALetras(-n);

  let resultado = '';
  if (n >= 1000000) {
    const mill = Math.floor(n / 1000000);
    resultado += (mill === 1 ? 'UN MILLÓN' : numALetras(mill) + ' MILLONES') + ' ';
    n %= 1000000;
  }
  if (n >= 1000) {
    const miles = Math.floor(n / 1000);
    resultado += (miles === 1 ? 'MIL' : numALetras(miles) + ' MIL') + ' ';
    n %= 1000;
  }
  if (n >= 100) {
    if (n === 100) resultado += 'CIEN ';
    else resultado += centenas[Math.floor(n / 100)] + ' ';
    n %= 100;
  }
  if (n >= 20) {
    resultado += decenas[Math.floor(n / 10)];
    if (n % 10 !== 0) resultado += ' Y ' + unidades[n % 10];
    resultado += ' ';
  } else if (n > 0) {
    resultado += unidades[n] + ' ';
  }
  return resultado.trim();
}

function generarMutuo(sol) {
  const cli = sol.cliente || {};
  const fecha = fmtFecha();
  const montoLetras = numALetras(Math.round(sol.monto));
  const cuotaLetras = numALetras(Math.round(sol.cuota));
  const moraTasa = ((sol.tna || 0) * 1.5).toFixed(2);

  return `CONTRATO DE MUTUO CON INTERÉS
(Ley 25.065 y Código Civil y Comercial de la Nación — Arts. 1525 a 1532)

En la Ciudad Autónoma de Buenos Aires, a los ${fecha}, entre:

MUTUANTE: AUTOLOGROS S.A., CUIT ${EMPRESA.cuit}, con domicilio en ${EMPRESA.domicilio}, representada en este acto por su ${EMPRESA.cargo}, Sr. ${EMPRESA.representante}, en adelante "LA EMPRESA"; y

MUTUARIO: ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil}, con domicilio en el declarado al momento de la solicitud, en adelante "EL CLIENTE";

Las partes acuerdan celebrar el presente Contrato de Mutuo con Interés conforme a las siguientes cláusulas:

──────────────────────────────────────────────────────────
PRIMERA — OBJETO
──────────────────────────────────────────────────────────
LA EMPRESA entrega en préstamo a EL CLIENTE la suma de PESOS ${montoLetras} ($${new Intl.NumberFormat('es-AR').format(Math.round(sol.monto))}), que este declara recibir en este acto de conformidad, mediante acreditación en la cuenta CBU/CVU N° ${cli.cbu} declarada por EL CLIENTE, quien acepta en su totalidad las condiciones del presente contrato.

──────────────────────────────────────────────────────────
SEGUNDA — DESTINO DE LOS FONDOS
──────────────────────────────────────────────────────────
Los fondos otorgados en préstamo serán destinados a uso personal del MUTUARIO. EL CLIENTE declara que los fondos recibidos no provienen ni serán destinados a actividades ilícitas, comprometiéndose a su uso lícito conforme a la legislación argentina vigente.

──────────────────────────────────────────────────────────
TERCERA — PLAZO Y FORMA DE DEVOLUCIÓN
──────────────────────────────────────────────────────────
EL CLIENTE se obliga a devolver el capital prestado más los intereses pactados en ${sol.plazo} (${numALetras(sol.plazo)}) cuotas mensuales, iguales y consecutivas de PESOS ${cuotaLetras} ($${new Intl.NumberFormat('es-AR').format(Math.round(sol.cuota))}), que incluyen capital, intereses y demás accesorios con IVA.

El vencimiento de la primera cuota operará a los treinta (30) días corridos desde la acreditación del préstamo. Las cuotas subsiguientes vencerán el mismo día de cada mes calendario.

──────────────────────────────────────────────────────────
CUARTA — TASA DE INTERÉS
──────────────────────────────────────────────────────────
Se aplica una Tasa Nominal Anual (TNA) del ${sol.tna}% (${numALetras(Math.round(sol.tna))} por ciento), con capitalización mensual. Sobre los intereses se aplica el Impuesto al Valor Agregado (IVA) a la tasa vigente del 21%.

La Tasa Efectiva Anual (TEA) resultante, incluido el IVA sobre intereses, es del ${(((Math.pow(1 + (sol.tna/100/12)*IVA_MOD, 12) - 1) * 100)).toFixed(2)}%.

El Costo Financiero Total (CFT) informado al cliente conforme Comunicación "A" BCRA es del ${sol.cft || '⏳ PENDIENTE'}%.

──────────────────────────────────────────────────────────
QUINTA — INTERESES MORATORIOS Y PUNITORIOS
──────────────────────────────────────────────────────────
En caso de mora en el pago de cualquier cuota, se devengarán automáticamente intereses moratorios a una tasa equivalente al ciento cincuenta por ciento (150%) de la TNA pactada, es decir ${moraTasa}% TNA, más IVA, desde la fecha de vencimiento hasta el efectivo pago, sin necesidad de interpelación judicial o extrajudicial previa.

La mora se producirá en forma automática por el solo vencimiento del plazo, conforme Art. 886 del Código Civil y Comercial de la Nación.

──────────────────────────────────────────────────────────
SEXTA — FORMA DE PAGO Y DÉBITO AUTOMÁTICO
──────────────────────────────────────────────────────────
El pago de las cuotas se realizará mediante débito automático sobre el saldo disponible en la cuenta CBU/CVU N° ${cli.cbu} declarada por EL CLIENTE. EL CLIENTE se compromete expresamente a mantener saldo suficiente en dicha cuenta con una antelación mínima de cuarenta y ocho (48) horas al vencimiento de cada cuota.

La insuficiencia de fondos en la fecha de vencimiento constituirá mora automática en los términos de la Cláusula Quinta.

──────────────────────────────────────────────────────────
SÉPTIMA — CANCELACIÓN ANTICIPADA
──────────────────────────────────────────────────────────
EL CLIENTE podrá cancelar anticipadamente el préstamo en cualquier momento, abonando el capital adeudado más los intereses devengados hasta la fecha de cancelación efectiva. No se cobrarán penalidades por cancelación anticipada, conforme Art. 1388 del Código Civil y Comercial de la Nación y Ley 25.065.

──────────────────────────────────────────────────────────
OCTAVA — INFORMACIÓN Y PRIVACIDAD
──────────────────────────────────────────────────────────
EL CLIENTE autoriza expresamente a LA EMPRESA a:
a) Consultar y reportar su situación crediticia ante bases de datos de información crediticia (Nosis, BCRA Central de Deudores y similares);
b) Informar la mora o incumplimiento a los organismos correspondientes;
c) Tratar sus datos personales conforme la Ley 25.326 de Protección de Datos Personales, exclusivamente para la gestión del presente préstamo.

──────────────────────────────────────────────────────────
NOVENA — DOMICILIOS
──────────────────────────────────────────────────────────
LA EMPRESA constituye domicilio en ${EMPRESA.domicilio}.
EL CLIENTE constituye domicilio en el declarado al momento de la solicitud de crédito, aceptando como válidas todas las notificaciones que allí se realicen, incluyendo las efectuadas por medios electrónicos al correo ${cli.email} y al teléfono ${cli.tel}.

──────────────────────────────────────────────────────────
DÉCIMA — JURISDICCIÓN
──────────────────────────────────────────────────────────
Para cualquier controversia derivada del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la ${EMPRESA.jurisdiccion}, renunciando expresamente a cualquier otro fuero o jurisdicción que pudiera corresponderles.

──────────────────────────────────────────────────────────
DÉCIMO PRIMERA — FIRMA DIGITAL
──────────────────────────────────────────────────────────
El presente contrato es suscripto mediante firma digital conforme Ley 25.506 de Firma Digital. La aceptación electrónica por parte de EL CLIENTE tiene plena validez jurídica y produce los mismos efectos que la firma ológrafa.

En prueba de conformidad, las partes firman el presente en la Ciudad Autónoma de Buenos Aires, en la fecha indicada al inicio.


POR AUTOLOGROS S.A.                    EL CLIENTE
${EMPRESA.representante}               ${cli.nombre} ${cli.apellido}
${EMPRESA.cargo}                       DNI ${cli.dni}


________________________________________    ________________________________________
FIRMA EMPRESA                               FIRMA CLIENTE`;
}

function generarPagare(sol) {
  const cli = sol.cliente || {};
  const fecha = fmtFecha();
  const montoLetras = numALetras(Math.round(sol.monto));
  const totalConIntereses = sol.cuota * sol.plazo;
  const totalLetras = numALetras(Math.round(totalConIntereses));

  return `PAGARÉ SIN PROTESTO
(Art. 101 y ss. Decreto-Ley 5965/63 — Ley Cambiaria Argentina)

LUGAR DE EMISIÓN: Ciudad Autónoma de Buenos Aires
FECHA DE EMISIÓN: ${fecha}
MONTO: PESOS ${totalLetras} ($${new Intl.NumberFormat('es-AR').format(Math.round(totalConIntereses))})

──────────────────────────────────────────────────────────

Yo, ${cli.nombre} ${cli.apellido}, DNI N° ${cli.dni}, CUIL N° ${cli.cuil}, con domicilio declarado ante AUTOLOGROS S.A., me obligo a pagar INCONDICIONALMENTE y SIN PROTESTO a la orden de AUTOLOGROS S.A., CUIT ${EMPRESA.cuit}, o a quien sus derechos represente, en el domicilio sito en ${EMPRESA.domicilio}, Ciudad Autónoma de Buenos Aires, la suma de PESOS ${totalLetras} ($${new Intl.NumberFormat('es-AR').format(Math.round(totalConIntereses))}), correspondiente al total de capital e intereses del préstamo otorgado mediante Contrato de Mutuo de fecha ${fecha}.

El pago se realizará en ${sol.plazo} cuotas mensuales de PESOS ${numALetras(Math.round(sol.cuota))} ($${new Intl.NumberFormat('es-AR').format(Math.round(sol.cuota))}), venciendo la primera a los treinta (30) días corridos de la fecha de acreditación del préstamo.

TASA DE INTERÉS: TNA ${sol.tna}% + IVA 21%.

CLÁUSULA SIN PROTESTO: El presente pagaré lleva insertada la cláusula "SIN PROTESTO" conforme Art. 50 del Decreto-Ley 5965/63, eximiendo al portador de efectuar el protesto por falta de pago para conservar las acciones cambiarias.

LUGAR DE PAGO: ${EMPRESA.domicilio}, Ciudad Autónoma de Buenos Aires.

JURISDICCIÓN: Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.

El presente título tiene fuerza ejecutiva conforme Art. 520 y concordantes del Código Procesal Civil y Comercial de la Nación.

──────────────────────────────────────────────────────────

Emisor:

Nombre y Apellido: ${cli.nombre} ${cli.apellido}
DNI: ${cli.dni}
CUIL: ${cli.cuil}
Domicilio: ${cli.emp || 'según declaración en solicitud'}


________________________________________
FIRMA DEL DEUDOR
${cli.nombre} ${cli.apellido}
DNI ${cli.dni}`;
}

// ── Componente principal Módulo C ─────────────────────────────────────────────
function ModuloC({ sol, user, onVolver, onActualizar }) {
  const C = {
    bg0:'#030F1E', bg1:'#06172E', bg2:'#071829', bg3:'#0A1F3A', bg4:'#0D2540',
    border:'rgba(255,255,255,0.08)', border2:'rgba(255,255,255,0.12)',
    text:'#FFFFFF', text2:'rgba(255,255,255,0.55)', text3:'rgba(255,255,255,0.35)',
    gold:'#C8922A', goldL:'rgba(200,146,42,0.15)', goldB:'rgba(200,146,42,0.25)',
    blue:'#4A9AE0', green:'#4AE08A', greenL:'rgba(74,224,138,0.08)', greenB:'rgba(74,224,138,0.15)',
    red:'#E05050', redL:'rgba(224,80,80,0.08)', redB:'rgba(224,80,80,0.15)',
  };

  const [doc, setDoc] = useState('mutuo'); // 'mutuo' | 'pagare'
  const [firmado, setFirmado] = useState({ mutuo: false, pagare: false });
  const [paso, setPaso] = useState('docs'); // 'docs' | 'firma_cliente' | 'enviado'
  const [enviando, setEnviando] = useState(false);
  const [linkFirma] = useState(`https://autologros-app.vercel.app/firma/${sol.id}`);

  const cli = sol.cliente || {};
  const textoMutuo = generarMutuo(sol);
  const textoPagare = generarPagare(sol);
  const textoActual = doc === 'mutuo' ? textoMutuo : textoPagare;
  const ambosListos = firmado.mutuo && firmado.pagare;

  const whatsappMsg = encodeURIComponent(
    `Hola ${cli.nombre}, le escribimos desde AUTOLOGROS S.A.\n\nSu préstamo por $${new Intl.NumberFormat('es-AR').format(Math.round(sol.monto))} ha sido PRE-APROBADO.\n\nPara completar el proceso, necesitamos que firme digitalmente el Contrato de Mutuo y el Pagaré.\n\nAcceda al siguiente enlace seguro:\n${linkFirma}\n\nEste enlace es personal e intransferible. Ante cualquier consulta comuníquese con nosotros.\n\nGracias,\nAutologros S.A.`
  );
  const mailMsg = `mailto:${cli.email}?subject=AUTOLOGROS S.A. — Firma de Documentos — Solicitud ${sol.id}&body=${encodeURIComponent(
    `Estimado/a ${cli.nombre} ${cli.apellido},\n\nNos comunicamos desde AUTOLOGROS S.A. para informarle que su solicitud de préstamo por $${new Intl.NumberFormat('es-AR').format(Math.round(sol.monto))} ha sido PRE-APROBADA.\n\nPara continuar con el proceso, necesitamos que proceda a la firma digital del Contrato de Mutuo y el Pagaré correspondiente.\n\nAcceda al siguiente enlace para firmar sus documentos:\n${linkFirma}\n\nEste enlace es personal, confidencial e intransferible.\n\nAntes de firmar, le recomendamos leer atentamente ambos documentos.\n\nAnte cualquier consulta no dude en contactarnos.\n\nSaludos cordiales,\n${EMPRESA.representante}\n${EMPRESA.cargo}\nAUTOLOGROS S.A.\n${EMPRESA.domicilio}`
  )}`;

  const Card = ({ children, style }) => <div style={{ background: C.bg4, borderRadius: 12, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
  const Btn = ({ onClick, children, variant = 'primary', disabled, style, full }) => {
    const vs = {
      primary: { background: '#1A4F8A', color: '#fff', border: 'none' },
      gold: { background: C.gold, color: '#fff', border: 'none' },
      ghost: { background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}` },
      sec: { background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}` },
      success: { background: '#1A6B3C', color: '#fff', border: 'none' },
      danger: { background: '#6B1A1A', color: '#fff', border: 'none' },
      green: { background: C.green, color: '#000', border: 'none' },
      whatsapp: { background: '#25D366', color: '#fff', border: 'none' },
      mail: { background: '#1A4F8A', color: '#fff', border: 'none' },
    };
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ ...vs[variant], padding: '10px 22px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase', width: full ? '100%' : 'auto', ...style }}>
        {children}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg2, fontFamily: 'system-ui, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width={34} height={34} viewBox="0 0 44 44" fill="none">
            <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke={C.gold} strokeWidth="2.5"/>
            <polygon points="22,7 36,15 36,29 22,37 8,29 8,15" fill={C.gold} opacity="0.12"/>
            <text x="22" y="27" textAnchor="middle" fill={C.gold} fontSize="16" fontWeight="900" fontFamily="Arial">$</text>
          </svg>
          <div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 17, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AUTOLOGROS</div>
            <div style={{ color: C.text3, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>MÓDULO C — CONTRATOS Y FIRMA DIGITAL</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: C.text, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{user.nombre}</div>
          <button onClick={onVolver} style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>← VOLVER</button>
        </div>
      </div>

      <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>

        {/* Info cliente */}
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              ['CLIENTE', `${cli.nombre} ${cli.apellido}`],
              ['DNI / CUIL', `${cli.dni} / ${cli.cuil}`],
              ['MONTO', `$${new Intl.NumberFormat('es-AR').format(Math.round(sol.monto))}`],
              ['CUOTA × PLAZO', `$${new Intl.NumberFormat('es-AR').format(Math.round(sol.cuota))} × ${sol.plazo}M`],
              ['TNA', `${sol.tna}%`],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.bg3, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {paso === 'docs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Panel izquierdo — selector y preview */}
            <div>
              {/* Tabs doc */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['mutuo', 'CONTRATO DE MUTUO'], ['pagare', 'PAGARÉ']].map(([k, l]) => (
                  <button key={k} onClick={() => setDoc(k)}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', border: `1.5px solid ${doc === k ? C.gold : C.border}`, background: doc === k ? C.goldL : 'rgba(255,255,255,0.03)', color: doc === k ? C.gold : C.text2 }}>
                    {l}
                    {firmado[k] && <span style={{ marginLeft: 8, color: C.green }}>✓</span>}
                  </button>
                ))}
              </div>

              {/* Preview del documento */}
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {doc === 'mutuo' ? 'CONTRATO DE MUTUO CON INTERÉS' : 'PAGARÉ SIN PROTESTO'}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 400 }}>AUTOCOMPLETADO CON DATOS DEL CLIENTE</div>
                </div>
                <div style={{ padding: 16, maxHeight: 480, overflowY: 'auto' }}>
                  <pre style={{ fontSize: 11, color: C.text2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                    {textoActual}
                  </pre>
                </div>
              </Card>

              {/* Botón firmar empresa */}
              <div style={{ marginTop: 14 }}>
                {!firmado[doc] ? (
                  <Btn onClick={() => setFirmado({ ...firmado, [doc]: true })} variant="gold" full>
                    ✍️ FIRMAR {doc === 'mutuo' ? 'CONTRATO' : 'PAGARÉ'} — AUTOLOGROS S.A.
                  </Btn>
                ) : (
                  <div style={{ background: C.greenL, border: `1px solid ${C.greenB}`, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: C.green }}>✓ FIRMADO POR AUTOLOGROS S.A.</div>
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 3, fontWeight: 400 }}>
                      {EMPRESA.representante} · {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho — estado y acciones */}
            <div>
              {/* Estado de firmas */}
              <Card style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>ESTADO DE FIRMAS</div>
                {[
                  ['CONTRATO DE MUTUO', 'mutuo'],
                  ['PAGARÉ', 'pagare'],
                ].map(([label, key]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 8, marginBottom: 8, border: `1px solid ${firmado[key] ? C.greenB : C.border}`, background: firmado[key] ? C.greenL : 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 2, fontWeight: 400 }}>
                        {firmado[key] ? `Firmado por ${EMPRESA.representante}` : 'Pendiente de firma empresa'}
                      </div>
                    </div>
                    <div style={{ fontSize: 20 }}>{firmado[key] ? '✅' : '⏳'}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', opacity: 0.6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>FIRMA CLIENTE</div>
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 2, fontWeight: 400 }}>Se enviará link al cliente</div>
                  </div>
                  <div style={{ fontSize: 20 }}>📱</div>
                </div>
              </Card>

              {/* Progreso */}
              <Card style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>PASOS DEL PROCESO</div>
                {[
                  ['1', 'Revisar y firmar documentos (empresa)', ambosListos],
                  ['2', 'Enviar link de firma al cliente', false],
                  ['3', 'Cliente firma desde su dispositivo', false],
                  ['4', 'Contrato ejecutado — desembolso', false],
                ].map(([n, label, done]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? C.green : C.bg3, border: `1.5px solid ${done ? C.green : C.border}`, fontSize: 11, fontWeight: 900, color: done ? '#000' : C.text3, flexShrink: 0 }}>
                      {done ? '✓' : n}
                    </div>
                    <div style={{ fontSize: 12, color: done ? C.text : C.text2, fontWeight: done ? 700 : 400 }}>{label}</div>
                  </div>
                ))}
              </Card>

              {/* Botón continuar */}
              {ambosListos && (
                <Btn onClick={() => setPaso('envio')} variant="success" full style={{ fontSize: 13, padding: '14px' }}>
                  CONTINUAR → ENVIAR LINK AL CLIENTE
                </Btn>
              )}
              {!ambosListos && (
                <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, padding: '12px 16px', fontSize: 11, color: C.gold, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚠️ Firmá ambos documentos para continuar
                </div>
              )}
            </div>
          </div>
        )}

        {paso === 'envio' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <Card style={{ padding: 32 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ENVIAR LINK DE FIRMA AL CLIENTE</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 6, fontWeight: 400 }}>El cliente recibirá el link para revisar y firmar los documentos</div>
              </div>

              {/* Info cliente */}
              <div style={{ background: C.bg3, borderRadius: 10, padding: 18, marginBottom: 24, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>DESTINATARIO</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.text, textTransform: 'uppercase', marginBottom: 4 }}>{cli.nombre} {cli.apellido}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 3 }}>📧 {cli.email}</div>
                <div style={{ fontSize: 12, color: C.text2 }}>📱 {cli.tel}</div>
              </div>

              {/* Link de firma */}
              <div style={{ background: C.goldL, border: `1px solid ${C.goldB}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>LINK DE FIRMA (AUTOGENERADO)</div>
                <div style={{ fontSize: 11, color: C.text, fontWeight: 700, wordBreak: 'break-all' }}>{linkFirma}</div>
              </div>

              {/* Botones de envío */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <a href={`https://wa.me/${cli.tel?.replace(/[^0-9]/g, '')}?text=${whatsappMsg}`}
                  target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', background: '#25D366', color: '#fff', border: 'none', padding: '14px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>💬</span> ENVIAR POR WHATSAPP
                  </button>
                </a>
                <a href={mailMsg} style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', background: '#1A4F8A', color: '#fff', border: 'none', padding: '14px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📧</span> ENVIAR POR EMAIL
                  </button>
                </a>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setPaso('docs')} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: C.text2, border: `1px solid ${C.border}`, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ← VOLVER A DOCUMENTOS
                </button>
                <button onClick={async () => {
                  await db.updateSolicitud(sol.id, {
                    estado: 'aprobado',
                    estado_texto: 'CONTRATO ENVIADO — PENDIENTE FIRMA CLIENTE',
                    fecha_envio_contrato: new Date().toLocaleDateString('es-AR'),
                    analista: user.nombre,
                  });
                  onActualizar();
                  setPaso('enviado');
                }} style={{ flex: 1, background: '#1A6B3C', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ✓ CONFIRMAR ENVÍO
                </button>
              </div>
            </Card>
          </div>
        )}

        {paso === 'enviado' && (
          <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
            <Card style={{ padding: 48 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.green, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>CONTRATO ENVIADO</div>
              <div style={{ color: C.text2, marginBottom: 8, fontWeight: 400, fontSize: 13 }}>
                El link de firma fue enviado a {cli.nombre} {cli.apellido}
              </div>
              <div style={{ color: C.text3, marginBottom: 28, fontSize: 11, fontWeight: 400 }}>
                Estado actualizado: CONTRATO ENVIADO — PENDIENTE FIRMA CLIENTE
              </div>
              <button onClick={onVolver} style={{ background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`, padding: '10px 28px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                VOLVER AL PANEL
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
