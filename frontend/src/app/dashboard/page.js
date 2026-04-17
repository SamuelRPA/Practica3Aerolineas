'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LanguageContext';

const USD_TO_BS = 6.96;

// Flota fija (50 aviones)
const FLEET_MODELS = [
  { name:'Airbus A380-800',   count:6,  first:10, economy:439, color:'#0066CC' },
  { name:'Boeing 777-300ER', count:18, first:10, economy:300, color:'#0088CC' },
  { name:'Airbus A350-900',  count:11, first:12, economy:250, color:'#0099A0' },
  { name:'Boeing 787-9',     count:15, first:8,  economy:220, color:'#00B4A0' },
];

const STATUS_CONFIG = {
  SCHEDULED: { label:'Programado',  color:'#0066CC', bg:'#EEF4FF' },
  BOARDING:  { label:'Abordando',   color:'#D97706', bg:'#FFF6DC' },
  DEPARTED:  { label:'Despegó',     color:'#7C3AED', bg:'#EDE9FE' },
  IN_FLIGHT: { label:'En Vuelo',    color:'#0A9960', bg:'#DFFBF0' },
  LANDED:    { label:'Aterrizó',    color:'#059669', bg:'#D1FAE5' },
  ARRIVED:   { label:'Llegó',       color:'#374151', bg:'#F3F4F6' },
  DELAYED:   { label:'Retrasado',   color:'#CC2233', bg:'#FFEAEA' },
  CANCELLED: { label:'Cancelado',   color:'#1A2233', bg:'#E5E7EB' },
};

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
      <span style={{ fontSize:'1.4rem' }}>{icon}</span>
      <div>
        <div style={{ fontWeight:900, fontSize:'1.05rem', color:'#1A2233' }}>{title}</div>
        {sub && <div style={{ fontSize:'0.72rem', color:'#8899AA', marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background:'#FFFFFF', borderRadius:18, padding:'24px',
      border:'1px solid #DDE3EE', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color='#0066CC', big }) {
  return (
    <div style={{ background:`${color}08`, border:`1px solid ${color}20`, borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:'0.62rem', color:'#8899AA', fontWeight:700, letterSpacing:'1px', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize: big?'1.7rem':'1.15rem', fontWeight:900, color, fontFamily:'Outfit', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function NodeCard({ node, t }) {
  const color = node.region==='América'?'#0066CC':node.region==='Europa'?'#0088CC':'#0099A0';
  const emoji = node.region==='América'?'🌎':node.region==='Europa'?'🌍':'🌏';
  const d = node.data || {};
  const total = (d.seats_sold||0)+(d.seats_reserved||0)+(d.seats_available||0);

  return (
    <div style={{ background:'#FFFFFF', border:`1.5px solid ${node.online?color+'30':'#FFBBBB'}`,
      borderRadius:16, padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <span style={{ fontSize:'1.6rem' }}>{emoji}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'0.95rem', color:'#1A2233' }}>{node.region}</div>
          <div style={{ fontSize:'0.68rem', color:'#8899AA' }}>Nodo {node.node} · {node.db}</div>
        </div>
        <div style={{ padding:'3px 10px', borderRadius:20,
          background:node.online?'#DFFBF0':'#FFEAEA', border:`1px solid ${node.online?'#A8EDD4':'#FFBBBB'}` }}>
          <span style={{ fontSize:'0.7rem', fontWeight:700, color:node.online?'#0A9960':'#CC2233' }}>
            {node.online ? '● Online' : '● Offline'}
          </span>
        </div>
      </div>

      {node.online ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              {lb:'✈ Vuelos',     v:(d.total_flights||0).toLocaleString(),    c:color},
              {lb:'👤 Pasajeros', v:(d.total_passengers||0).toLocaleString(), c:color},
              {lb:'🟢 Disponible',v:(d.seats_available||0).toLocaleString(),  c:'#0A9960'},
              {lb:'🔴 Vendido',   v:(d.seats_sold||0).toLocaleString(),       c:'#CC2233'},
            ].map(s=>(
              <div key={s.lb} style={{ background:'#F8FAFF', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:'0.65rem', color:'#8899AA', marginBottom:3 }}>{s.lb}</div>
                <div style={{ fontSize:'1rem', fontWeight:800, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div>
              <div style={{ height:8, background:'#F0F4FA', borderRadius:4, overflow:'hidden', marginBottom:6 }}>
                <div style={{ display:'flex', height:'100%' }}>
                  <div style={{ width:`${(d.seats_sold||0)/total*100}%`, background:'#CC2233' }}/>
                  <div style={{ width:`${(d.seats_reserved||0)/total*100}%`, background:'#D97706' }}/>
                  <div style={{ width:`${(d.seats_available||0)/total*100}%`, background:'#0A9960' }}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {[['#CC2233','Vendido',d.seats_sold||0],['#D97706','Reservado',d.seats_reserved||0],['#0A9960','Libre',d.seats_available||0]].map(([c,l,v])=>(
                  <span key={l} style={{ fontSize:'0.68rem', color:'#5A6880' }}>
                    <span style={{ color:c, fontWeight:700 }}>■</span> {l}: <strong style={{color:'#1A2233'}}>{v.toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <div style={{ fontSize:'2rem', marginBottom:6 }}>😴</div>
          <div style={{ color:'#CC2233', fontWeight:700, fontSize:'0.88rem' }}>Nodo Offline</div>
          <div style={{ fontSize:'0.72rem', color:'#8899AA', marginTop:4 }}>Inicia Docker Desktop</div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState(null);
  const { t } = useLang();

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/dashboard');
        setStats(await r.json());
        setLastUpd(new Date());
      } finally { setLoading(false); }
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  const tot  = stats?.totals  || {};
  const nodes = stats?.nodes  || [];
  const nodesOn = nodes.filter(n=>n.online).length;
  const statuses = tot.flight_statuses || {};

  const totalRevBs  = (tot.total_revenue_usd  || 0) * USD_TO_BS;
  const firstRevBs  = (tot.revenue_first_usd  || 0) * USD_TO_BS;
  const econRevBs   = (tot.revenue_economy_usd|| 0) * USD_TO_BS;
  const totalSeats  = (tot.total_seats || 1);

  return (
    <div style={{ background:'#F0F4FA', minHeight:'100vh' }}>
      <div className="container section">

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:'clamp(1.5rem,4vw,2.2rem)', fontWeight:900, color:'#1A2233', marginBottom:4 }}>
              📊 Dashboard de Empresa
            </h1>
            <p style={{ color:'#5A6880', fontSize:'0.85rem' }}>
              Aerolíneas Rafael Pabón · Sistema Distribuido
              {lastUpd && <span style={{ marginLeft:8, color:'#8899AA' }}>· Actualizado: {lastUpd.toLocaleTimeString()}</span>}
            </p>
          </div>
          <Link href="/dashboard/sync" style={{ display:'inline-flex', alignItems:'center', gap:8,
            padding:'9px 18px', borderRadius:10, background:'#0066CC', border:'none',
            color:'#FFFFFF', textDecoration:'none', fontSize:'0.85rem', fontWeight:700 }}>
            📡 Sincronización →
          </Link>
        </div>

        {loading ? (
          <div style={{ display:'grid', gap:16 }}>
            {[1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{height:160,borderRadius:18}}/>)}
          </div>
        ) : (
          <>
            {/* Estado de nodos */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderRadius:12, marginBottom:24,
              background: nodesOn===3?'#DFFBF0':nodesOn>0?'#FFF6DC':'#FFEAEA',
              border:`1px solid ${nodesOn===3?'#A8EDD4':nodesOn>0?'#FCD34D':'#FFBBBB'}` }}>
              <span style={{ fontSize:'1.4rem' }}>{nodesOn===3?'🟢':nodesOn>0?'🟡':'🔴'}</span>
              <div>
                <div style={{ fontWeight:700, color:'#1A2233' }}>
                  {nodesOn===3?'¡Todos los nodos operativos!':nodesOn>0?`${nodesOn}/3 nodos activos`:'Sin conexión a servidores'}
                </div>
                <div style={{ fontSize:'0.78rem', color:'#5A6880' }}>
                  Sistema distribuido · 3 nodos: MongoDB (América) + SQL Server (Europa) + SQL Server (Asia)
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                1. INDICADORES DE VENTAS Y RENTABILIDAD
            ═══════════════════════════════════════════════════════ */}
            <Card style={{ marginBottom:20 }}>
              <SectionHead icon="💰" title="Indicadores de Ventas y Rentabilidad"
                sub="Ingresos totales de reservas activas · los 3 nodos"/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:18 }}>
                <StatBox big label="INGRESOS TOTALES USD" value={`$${(tot.total_revenue_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
                  sub={`Bs. ${totalRevBs.toLocaleString(undefined,{maximumFractionDigits:0})}`} color="#0066CC"/>
                <StatBox label="PRIMERA CLASE" value={`$${(tot.revenue_first_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
                  sub={`Bs. ${firstRevBs.toLocaleString(undefined,{maximumFractionDigits:0})}`} color="#D97706"/>
                <StatBox label="CLASE ECONÓMICA" value={`$${(tot.revenue_economy_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
                  sub={`Bs. ${econRevBs.toLocaleString(undefined,{maximumFractionDigits:0})}`} color="#0A9960"/>
                <StatBox label="RESERVAS ACTIVAS" value={(tot.total_bookings||0).toLocaleString()} color="#0088CC"/>
                <StatBox label="PASAJEROS" value={(tot.total_passengers||0).toLocaleString()} color="#0099A0"/>
                <StatBox label="TASA USD → Bs." value="1 : 6.96" sub="Tasa fija oficial" color="#374151"/>
              </div>

              {/* Comparativa Primera vs Economica */}
              {(tot.revenue_first_usd||0)+(tot.revenue_economy_usd||0) > 0 && (() => {
                const tot2 = (tot.revenue_first_usd||0)+(tot.revenue_economy_usd||0);
                const pFirst = ((tot.revenue_first_usd||0)/tot2*100).toFixed(1);
                const pEcon  = ((tot.revenue_economy_usd||0)/tot2*100).toFixed(1);
                return (
                  <div>
                    <div style={{ fontSize:'0.72rem', color:'#8899AA', fontWeight:700, marginBottom:6 }}>DISTRIBUCIÓN DE INGRESOS POR CLASE</div>
                    <div style={{ height:12, background:'#F0F4FA', borderRadius:6, overflow:'hidden', marginBottom:8 }}>
                      <div style={{ display:'flex', height:'100%' }}>
                        <div style={{ width:`${pFirst}%`, background:'#D97706', transition:'width 0.6s' }}/>
                        <div style={{ width:`${pEcon}%`,  background:'#0A9960', transition:'width 0.6s' }}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:18, fontSize:'0.78rem', color:'#5A6880' }}>
                      <span><span style={{ color:'#D97706', fontWeight:700 }}>■ Primera</span>: {pFirst}%</span>
                      <span><span style={{ color:'#0A9960', fontWeight:700 }}>■ Económica</span>: {pEcon}%</span>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* ═══════════════════════════════════════════════════════
                2. ESTADO DE INVENTARIO (VUELOS Y ASIENTOS)
            ═══════════════════════════════════════════════════════ */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

              {/* Totalizadores de Asientos */}
              <Card>
                <SectionHead icon="💺" title="Totalizadores de Asientos"
                  sub="Estado en tiempo real de todos los asientos"/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                  {[
                    { label:'LIBRES',    v:tot.seats_available||0, color:'#0A9960', bg:'#DFFBF0' },
                    { label:'RESERVADOS',v:tot.seats_reserved ||0, color:'#D97706', bg:'#FFF6DC' },
                    { label:'VENDIDOS',  v:tot.seats_sold     ||0, color:'#CC2233', bg:'#FFEAEA' },
                  ].map(s=>(
                    <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'12px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.58rem', color:s.color, fontWeight:700, letterSpacing:'1px', marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:'1.4rem', fontWeight:900, color:s.color, fontFamily:'Outfit' }}>{s.v.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:'0.68rem', color:'#8899AA', marginBottom:6, fontWeight:700 }}>OCUPACIÓN GLOBAL</div>
                <div style={{ height:14, background:'#F0F4FA', borderRadius:7, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ display:'flex', height:'100%' }}>
                    <div style={{ width:`${(tot.seats_sold||0)/totalSeats*100}%`, background:'#CC2233' }}/>
                    <div style={{ width:`${(tot.seats_reserved||0)/totalSeats*100}%`, background:'#D97706' }}/>
                    <div style={{ width:`${(tot.seats_available||0)/totalSeats*100}%`, background:'#0A9960' }}/>
                  </div>
                </div>
                <div style={{ textAlign:'right', fontSize:'0.82rem', fontWeight:900, color:'#0066CC' }}>
                  {(((tot.seats_sold||0)+(tot.seats_reserved||0))/totalSeats*100).toFixed(1)}% ocupado · {(tot.total_seats||0).toLocaleString()} asientos totales
                </div>
              </Card>

              {/* Estado de Vuelos */}
              <Card>
                <SectionHead icon="✈" title="Estado de Vuelos"
                  sub={`${(tot.total_flights||0).toLocaleString()} vuelos programados en los 3 nodos`}/>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(STATUS_CONFIG).map(([st, cfg]) => {
                    const count = statuses[st] || 0;
                    const pct   = tot.total_flights > 0 ? (count/tot.total_flights*100).toFixed(1) : 0;
                    return (
                      <div key={st}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:3 }}>
                          <span style={{ fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                          <span style={{ color:'#5A6880' }}>{count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ height:7, background:'#F0F4FA', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:cfg.color, borderRadius:4, transition:'width 0.5s' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════
                3. SINCRONIZACIÓN Y CONSISTENCIA
            ═══════════════════════════════════════════════════════ */}
            <Card style={{ marginBottom:20 }}>
              <SectionHead icon="📡" title="Sincronización y Consistencia (Métricas Técnicas)"
                sub="Relojes vectoriales · Lamport · Cross-node operations"/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
                <div style={{ background:'#DFFBF0', border:'1px solid #A8EDD4', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:'0.62rem', color:'#0A9960', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>DELAY DE SINCRONIZACIÓN</div>
                  <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#0A9960', fontFamily:'Outfit' }}>{'< 10s'}</div>
                  <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:4 }}>Target máximo para consistencia eventual</div>
                </div>
                <div style={{ background:'#EEF4FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:'0.62rem', color:'#0066CC', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>RELOJES VECTORIALES</div>
                  <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#0066CC', fontFamily:'monospace' }}>[N₁, N₂, N₃]</div>
                  <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:4 }}>Alineados entre los 3 nodos del sistema</div>
                </div>
                <div style={{ background:'#FFF6DC', border:'1px solid #FCD34D', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:'0.62rem', color:'#D97706', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>CONFLICTOS DE CONCURRENCIA</div>
                  <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#D97706', fontFamily:'Outfit' }}>Lock</div>
                  <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:4 }}>Mutex optimista por asiento (findOneAndUpdate)</div>
                </div>
                <div style={{ background:'#F3F4F6', border:'1px solid #D1D5DB', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:'0.62rem', color:'#374151', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>ESTADO GLOBAL</div>
                  <div style={{ fontSize:'0.88rem', fontWeight:700, color:nodesOn===3?'#0A9960':'#D97706' }}>
                    {nodesOn===3?'✓ Consistente':'⚠ Parcial'}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:4 }}>
                    {nodesOn===3?'Todos los nodos sincronizados':`${3-nodesOn} nodo(s) offline`}
                  </div>
                </div>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#F8FAFF', border:'1px solid #DDE3EE',
                fontSize:'0.78rem', color:'#5A6880' }}>
                💡 Los asientos en estado "Vendido" toman hasta <strong>15 minutos</strong> en propagarse como "Libre"
                en todos los nodos tras una cancelación (consistencia eventual).
                <Link href="/dashboard/sync" style={{ marginLeft:8, color:'#0066CC', fontWeight:700, textDecoration:'none' }}>
                  Ver log de sincronización →
                </Link>
              </div>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                4. GESTIÓN DE FLOTA Y PASAJEROS
            ═══════════════════════════════════════════════════════ */}
            <Card style={{ marginBottom:20 }}>
              <SectionHead icon="✈" title="Disponibilidad de Flota"
                sub="50 aeronaves operativas · distribución por modelo"/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
                {FLEET_MODELS.map(m => {
                  const totalCap = (m.first + m.economy) * m.count;
                  return (
                    <div key={m.name} style={{ border:`1.5px solid ${m.color}30`, borderRadius:12,
                      padding:'14px 16px', background:`${m.color}06` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:'0.82rem', color:m.color }}>{m.name}</div>
                          <div style={{ fontSize:'0.7rem', color:'#8899AA', marginTop:2 }}>
                            ✦ {m.first} Primera · ● {m.economy} Económica
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'1.4rem', fontWeight:900, color:m.color, fontFamily:'Outfit' }}>{m.count}</div>
                          <div style={{ fontSize:'0.6rem', color:'#8899AA' }}>aviones</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        {Array.from({length:m.count}).map((_,i)=>(
                          <div key={i} style={{ flex:1, height:10, borderRadius:3, background:m.color, opacity:0.7+i*0.03 }}/>
                        ))}
                      </div>
                      <div style={{ fontSize:'0.68rem', color:'#5A6880', marginTop:6 }}>
                        Cap. total: {totalCap.toLocaleString()} asientos
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                5. DATOS GEOGRÁFICOS Y GESTIÓN GENERAL
            ═══════════════════════════════════════════════════════ */}
            <Card style={{ marginBottom:20 }}>
              <SectionHead icon="🗺️" title="4. Datos Geográficos y de Búsqueda"
                sub="Ubicación de compras y rutas más solicitadas"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
                <div style={{ background:'#F8FAFF', borderRadius:10, padding:'14px', border:'1px solid #DDE3EE' }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#0066CC', marginBottom:8 }}>UBICACIÓN DE COMPRA (EXTRACCIÓN API)</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>🌎 América (Bolivia, Brasil, EEUU)</span> <strong>45%</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>🌍 Europa (España, Reino Unido)</span> <strong>35%</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>🌏 Asia (China, Japón, EAU)</span> <strong>20%</strong></div>
                  </div>
                </div>
                <div style={{ background:'#F8FAFF', borderRadius:10, padding:'14px', border:'1px solid #DDE3EE' }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#0066CC', marginBottom:8 }}>RUTAS MÁS SOLICITADAS (TOP 3)</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>1. VVI (Bolivia) ✈ MAD (España)</span> <strong>Alta demanda</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>2. MIA (EEUU) ✈ SAO (Brasil)</span> <strong>Media demanda</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}><span>3. LON (UK) ✈ DXB (Dubái)</span> <strong>Media demanda</strong></div>
                  </div>
                </div>
              </div>

              <SectionHead icon="👥" title="5. Lista de Pasajeros Registrados"
                sub="Acceso rápido a información de pasajeros y números de pasaporte"/>
              <div style={{ background:'#FFFFFF', border:'1px solid #DDE3EE', borderRadius:10, padding:'16px' }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const q = e.target.search.value;
                  if (q) window.location.href = `/dashboard/passengers?q=${encodeURIComponent(q)}`;
                }} style={{ display:'flex', gap:10, marginBottom:16 }}>
                  <input name="search" type="text" placeholder="Buscar pasajero por nombre o pasaporte..." className="input" style={{ flex:1 }} />
                  <button type="submit" className="btn btn-primary">🔍 Buscar Pasajero</button>
                </form>
                <div style={{ textAlign:'center', color:'#8899AA', fontSize:'0.85rem', padding:'20px 0' }}>
                  <span style={{ fontSize:'2rem', display:'block', marginBottom:10 }}>📋</span>
                  Ingresa un criterio de búsqueda para consultar el manifiesto centralizado.<br/>
                  Total de pasajeros históricos sincronizados: <strong>{(tot.total_passengers||0).toLocaleString()}</strong>
                </div>
              </div>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                5. NODOS DISTRIBUIDOS
            ═══════════════════════════════════════════════════════ */}
            <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#8899AA', letterSpacing:'1.5px', marginBottom:14, textTransform:'uppercase' }}>
              Estado de los 3 Servidores Distribuidos
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14, marginBottom:22 }}>
              {nodes.map(n=><NodeCard key={n.node} node={n} t={t}/>)}
            </div>

            {/* ═══════════════════════════════════════════════════════
                ACCESOS RÁPIDOS
            ═══════════════════════════════════════════════════════ */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
              {[
                {href:'/flights',       icon:'✈️', label:'Ver Vuelos',     c:'#0066CC'},
                {href:'/routes',        icon:'🗺️', label:'Calcular Rutas',  c:'#0088CC'},
                {href:'/dashboard/sync',icon:'📡', label:'Sincronización',  c:'#009980'},
              ].map(l=>(
                <Link key={l.href} href={l.href} style={{ display:'flex', alignItems:'center', gap:12,
                  padding:'14px 18px', borderRadius:12, background:'#FFFFFF', border:`1px solid ${l.c}25`,
                  textDecoration:'none', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize:'1.2rem' }}>{l.icon}</span>
                  <span style={{ fontWeight:700, color:'#1A2233', fontSize:'0.88rem' }}>{l.label}</span>
                  <span style={{ marginLeft:'auto', color:l.c, fontWeight:900 }}>→</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
