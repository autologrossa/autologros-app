import { useState, useEffect } from 'react';
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
  const [embajadores,setEmbajadores]=useState([]);const [nuevoEmb,setNuevoEmb]=useState(false);

  useEffect(()=>{cargar();},[]);
  async function cargar(){
    setLoading(true);
    setLineas(await db.getLineas()||[]);
    setEmbajadores(await db.getEmbajadores()||[]);
    setLoading(false);
  }
  async function guardarLinea(l){await db.saveLinea(l);await cargar();setEditando(null);setNueva(false);}
  async function toggleLinea(linea){await db.saveLinea({...linea,activa:!linea.activa});await cargar();}
  async function eliminarLinea(id){if(!window.confirm('¿ELIMINAR ESTA LÍNEA?'))return;await db.deleteLinea(id);await cargar();}
  async function guardarEmb(e){await db.saveEmbajador(e);await cargar();setNuevoEmb(false);}
  async function eliminarEmb(id){if(!window.confirm('¿ELIMINAR ESTE EMBAJADOR?'))return;await db.deleteEmbajador(id);await cargar();}

  if(editando||nueva) return <FormLinea linea={editando} onGuardar={guardarLinea} onCancelar={()=>{setEditando(null);setNueva(false);}} user={user} onLogout={onLogout}/>;
  if(nuevoEmb) return <FormEmbajador onGuardar={guardarEmb} onCancelar={()=>setNuevoEmb(false)} user={user} onLogout={onLogout}/>;

  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL ADMINISTRADOR" user={user} onLogout={onLogout}/>
      <Tabs tabs={[['lineas','LÍNEAS DE CRÉDITO'],['embajadores','EMBAJADORES']]} active={tab} onChange={setTab}/>
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

// ── ANALISTA ──────────────────────────────────────────────────────────────────
function Analista({user,onLogout}){
  const [sols,setSols]=useState([]);const [filtro,setFiltro]=useState('todas');const [loading,setLoading]=useState(true);const [detalle,setDetalle]=useState(null);
  useEffect(()=>{cargar();const iv=setInterval(cargar,15000);return()=>clearInterval(iv);},[]);
  async function cargar(){setSols(await db.getSolicitudes());setLoading(false);}
  async function resolver(id,estado,obs){
    await db.updateSolicitud(id,{estado,estado_texto:estado==='aprobado'?'APROBADO — PENDIENTE FIRMA':'RECHAZADO',obs,analista:user.nombre,fecha_res:new Date().toLocaleDateString('es-AR')});
    await cargar();setDetalle(null);
  }
  const list=sols.filter(s=>filtro==='todas'||s.estado===filtro);
  const cnt={p:sols.filter(s=>s.estado==='pendiente').length,a:sols.filter(s=>s.estado==='aprobado').length,r:sols.filter(s=>s.estado==='rechazado').length};

  const rowColor={aprobado:'rgba(74,224,138,0.04)',rechazado:'rgba(224,80,80,0.04)',pendiente:'transparent'};
  const rowBorder={aprobado:C.green,rechazado:C.red,pendiente:C.gold};

  return (
    <div style={{minHeight:'100vh',background:C.bg2}}>
      <Hdr title="PANEL DE ANÁLISIS" user={user} onLogout={onLogout}/>
      <div style={{padding:28,maxWidth:1100,margin:'0 auto'}}>
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
                  <tr key={s.id} onClick={()=>setDetalle(s)}
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
export default function App(){
  const [user,setUser]=useState(null);
  if(!user) return <Login onLogin={setUser}/>;
  if(user.rol==='admin') return <Admin user={user} onLogout={()=>setUser(null)}/>;
  if(user.rol==='analista') return <Analista user={user} onLogout={()=>setUser(null)}/>;
  return <Embajador user={user} onLogout={()=>setUser(null)}/>;
}
