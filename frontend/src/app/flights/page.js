'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AIRPORTS } from '@/lib/airports';
import { useLang } from '@/context/LanguageContext';
import { DIRECT_PAIRS, findPath } from '@/lib/routeData';
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from 'react-simple-maps';

const AO = AIRPORTS.map(a => ({ value: a.code, label: `${a.code} — ${a.city}` }));
const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Ligeros ajustes visuales para evitar superposición en el SVG del mapamundi
const ADJUSTED = {
  LON: [-3.0, 53.5], PAR: [2.5, 47.0], AMS: [6.0, 54.0],
  FRA: [11.0, 48.0], MAD: [-4.0, 40.0], IST: [28.0, 41.0]
};

function InteractiveRouteMap({ origin, destination, onSelect }) {
  const [hov, setHov] = useState(null);

  const pathNodes = origin && destination ? findPath(origin, destination) : null;
  const pathSet = new Set();
  if (pathNodes) {
    for (let i = 0; i < pathNodes.length - 1; i++) {
      pathSet.add(`${pathNodes[i]}-${pathNodes[i + 1]}`);
      pathSet.add(`${pathNodes[i + 1]}-${pathNodes[i]}`);
    }
  }

  function handleAp(code) {
    if (!origin) onSelect(code, '');
    else if (!destination) { if (code === origin) onSelect('', ''); else onSelect(origin, code); }
    else onSelect(code, '');
  }

  const hovAp = hov ? AP[hov] : null;

  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid #E2E8F0', background:'#FFFFFF', marginBottom:18, boxShadow:'0 4px 14px rgba(0,0,0,0.03)' }}>
      {/* HEADER MAPA */}
      <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', borderBottom:'1px solid #E2E8F0', background:'#F8FAFC' }}>
        <span style={{ fontWeight:900, fontSize:'1.1rem', color:'#0F172A', fontFamily:'"Outfit", sans-serif' }}>Rutas Comerciales</span>
        <div style={{ flex:1 }} />
        {(origin || destination) && (
          <button onClick={() => onSelect('', '')} style={{ fontSize:'0.75rem', padding:'4px 14px', borderRadius:8, border:'1px solid #FCA5A5', background:'#FEF2F2', cursor:'pointer', color:'#DC2626', fontWeight:700 }}>✕ Limpiar Selección</button>
        )}
      </div>

      <div style={{ display:'flex', height: 450 }}>
        {/* PANEL IZQUIERDO CON TABLA (COMO EN LA IMAGEN) */}
        <div style={{ width:150, background:'#FFFFFF', borderRight:'1px solid #E2E8F0', overflowY:'auto' }}>
          <div style={{ padding:'0' }}>
            {AIRPORTS.map(ap => {
              const isOrig = ap.code === origin;
              const isDest = ap.code === destination;
              const isPath = pathNodes?.includes(ap.code) && !isOrig && !isDest;
              
              const col = isOrig ? '#F59E0B' : isDest ? '#D946EF' : isPath ? '#8B5CF6' : '#10B981';
              const bg  = isOrig ? '#FFFBEB' : isDest ? '#FDF4FF' : isPath ? '#F5F3FF' : (hov === ap.code ? '#F1F5F9' : '#FFFFFF');

              return (
                <button key={ap.code} onClick={() => handleAp(ap.code)} onMouseEnter={() => setHov(ap.code)} onMouseLeave={() => setHov(null)}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', border:'none', borderBottom:'1px solid #F1F5F9', background: bg, cursor:'pointer', textAlign:'left', transition:'background 0.2s' }}>
                  <div style={{ fontSize:'0.75rem', fontWeight: (isOrig || isDest) ? 800 : 500, color: (isOrig || isDest) ? '#0F172A' : '#475569', letterSpacing:'0.5px' }}>
                    {ap.code} <span style={{ opacity: 0.6, fontSize:'0.65rem' }}>({ap.country_code})</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAPAMUNDI REACT-SIMPLE-MAPS */}
        <div style={{ position:'relative', flex:1, background: '#FFFFFF' }}>
          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 110, center: [10, 10] }} style={{ width: '100%', height: '100%' }}>
            <ZoomableGroup zoom={1.1} minZoom={1} maxZoom={4}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth={0.8} style={{ default:{outline:'none'}, hover:{outline:'none'}, pressed:{outline:'none'} }} />
                  ))
                }
              </Geographies>

              {/* LÍNEAS DE RUTA (Grises por defecto, Púrpuras si es el camino activo) */}
              {DIRECT_PAIRS.map(([a, b]) => {
                const apA = AP[a]; const apB = AP[b];
                if (!apA || !apB) return null;
                const coordA = ADJUSTED[a] || [apA.longitude, apA.latitude];
                const coordB = ADJUSTED[b] || [apB.longitude, apB.latitude];
                
                const isPathSeg = pathSet.has(`${a}-${b}`);
                const dimmed = (origin || destination) && !isPathSeg;
                
                return (
                  <Line key={`${a}-${b}`} from={coordA} to={coordB}
                    stroke={isPathSeg ? "#8B5CF6" : "#475569"} // Púrpura para activas, Gris Oscuro/Pizarra para inactivas
                    strokeWidth={isPathSeg ? 2 : 0.8}
                    strokeOpacity={dimmed ? 0.15 : (isPathSeg ? 1 : 0.6)}
                    onClick={() => { if(!origin) handleAp(a); else handleAp(b); }}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}

              {/* NODOS (Verde destiono, Naranja origen, Magenta final) */}
              {AIRPORTS.map((ap) => {
                const coord = ADJUSTED[ap.code] || [ap.longitude, ap.latitude];
                const isOrig = ap.code === origin;
                const isDest = ap.code === destination;
                const isPath = pathNodes?.includes(ap.code) && !isOrig && !isDest;
                
                // Colos estilo bosquejo exacto
                const fillCol = isOrig ? '#F59E0B' : isDest ? '#D946EF' : isPath ? '#a78bfa' : '#10B981';

                return (
                  <Marker key={ap.code} coordinates={coord} onClick={() => handleAp(ap.code)} onMouseEnter={() => setHov(ap.code)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
                    <circle r={8.5} fill={fillCol} stroke="#0F172A" strokeWidth={1} />
                    <text textAnchor="middle" y={-12} style={{ fontFamily: '"Inter", sans-serif', fontSize: '9px', fontWeight: '800', fill: '#0F172A', textShadow: '1px 1px 0px #FFF, -1px -1px 0px #FFF, 1px -1px 0px #FFF, -1px 1px 0px #FFF' }}>
                      {ap.code} {(isOrig || isDest) ? `(${ap.country_code})` : ''}
                    </text>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* LEYENDA (COMO EN LA IMAGEN) */}
          <div style={{ position:'absolute', bottom: 20, left: 20, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:16, height:16, borderRadius:'50%', background:'#10B981', border:'1.5px solid #0F172A' }} />
              <span style={{ fontSize:'0.75rem', fontWeight:600, color:'#0F172A' }}>Destino</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:18, height:2, background:'#475569', position:'relative' }}>
                <div style={{ position:'absolute', right:-1, top:-3, borderTop:'4px solid transparent', borderBottom:'4px solid transparent', borderLeft:'6px solid #475569' }}/>
              </div>
              <span style={{ fontSize:'0.75rem', fontWeight:600, color:'#0F172A' }}>Ruta Comercial</span>
            </div>
          </div>

          {/* TOOLTIP */}
          {hovAp && (
            <div style={{ position:'absolute', top: 16, right: 16, background:'#FFFFFF', border:'1px solid #E2E8F0', padding:'10px 14px', borderRadius:10, boxShadow:'0 10px 25px rgba(0,0,0,0.1)', pointerEvents:'none' }}>
              <div style={{ fontWeight:800, color:'#0F172A', fontSize:'0.9rem' }}>{hovAp.city} ({hovAp.code})</div>
              <div style={{ fontSize:'0.7rem', color:'#64748B', marginTop:4 }}>{hovAp.country} · TZ {hovAp.timezone}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const REGION_TABS = [
  { key: 'ALL',    label: 'Todos',   icon: '🌐', node: null },
  { key: 'AMERICA',label: 'América', icon: '🌎', node: 1 },
  { key: 'EUROPA', label: 'Europa',  icon: '🌍', node: 2 },
  { key: 'ASIA',   label: 'Asia',    icon: '🌏', node: 3 },
];

function SectionTitle({ icon, title, sub, color='#1A2233' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
      <span style={{ fontSize:'1.2rem' }}>{icon}</span>
      <div>
        <div style={{ fontWeight:800, color, fontSize:'0.95rem' }}>{title}</div>
        {sub && <div style={{ fontSize:'0.7rem', color:'#8899AA' }}>{sub}</div>}
      </div>
    </div>
  );
}

function FlightsContent() {
  const sp = useSearchParams();
  const { t } = useLang();

  const [origin, setOrigin]   = useState(sp.get('origin')||'');
  const [dest,   setDest]     = useState(sp.get('destination')||'');
  const [date,   setDate]     = useState(sp.get('date')||'');
  const [cls,    setCls]      = useState(sp.get('class')||'ECONOMY');
  const [activeTab, setActiveTab] = useState('ALL');
  
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [total, setTotal]     = useState(0);
  const PAGE_SIZE = 60;

  function handleMapSelect(newOrigin, newDest) {
    setOrigin(newOrigin); setDest(newDest);
    if (newOrigin && newDest) { setActiveTab('ALL'); searchWith(newOrigin, newDest, date, 'ALL'); }
  }

  async function searchWith(o, d, dt, tab) {
    setLoading(true); setSearched(true);
    
    // Algoritmo para resolver TODO tipo de vuelos, incluyendo escalas automáticas!
    const pNodes = o && d ? findPath(o, d) : null;

    if (pNodes && pNodes.length > 2) {
      // Vuelo con escalas! Armamos la combinación consultando tramos
      try {
        const fetches = [];
        for (let i = 0; i < pNodes.length - 1; i++) {
          const params = new URLSearchParams({ origin: pNodes[i], destination: pNodes[i+1], limit: '30', class: cls });
          if (dt) params.set('date', dt);
          fetches.push(fetch(`/api/flights?${params}`).then(r => r.json()));
        }
        const results = await Promise.all(fetches);
        
        let combinedPaths = [ { legs: [], lastArrivalTime: null, duration: 0, price: 0, flightNumbers: [] } ];
        
        for (let i = 0; i < results.length; i++) {
           const newPaths = [];
           const stageFlights = results[i]?.data || [];
           
           for (const currentPath of combinedPaths) {
               for (const leg of stageFlights) {
                   if (currentPath.legs.length === 0) {
                       newPaths.push({
                           legs: [leg],
                           lastArrivalTime: new Date(leg.arrival_time),
                           duration: leg.flight_duration_hours,
                           price: leg.price,
                           flightNumbers: [leg.flight_number],
                           node: leg.node
                       });
                   } else {
                       const d1 = currentPath.lastArrivalTime;
                       const d2 = new Date(leg.departure_time);
                       const diffH = (d2 - d1) / (1000 * 60 * 60);
                       
                       // Tiempo de escala (45 min hasta 30 h)
                       if (diffH > 0.75 && diffH < 30) {
                           newPaths.push({
                               legs: [...currentPath.legs, leg],
                               lastArrivalTime: new Date(leg.arrival_time),
                               duration: currentPath.duration + leg.flight_duration_hours + diffH,
                               price: currentPath.price + leg.price,
                               flightNumbers: [...currentPath.flightNumbers, leg.flight_number],
                               node: currentPath.node
                           });
                       }
                   }
               }
           }
           combinedPaths = newPaths;
        }

        const combined = combinedPaths.map(p => {
           const firstLeg = p.legs[0];
           const lastLeg = p.legs[p.legs.length - 1];
           
           const scaleDetails = [];
           for(let k = 0; k < p.legs.length - 1; k++) {
               const arr = new Date(p.legs[k].arrival_time);
               const dep = new Date(p.legs[k+1].departure_time);
               const diff = (dep - arr) / 3600000;
               scaleDetails.push(`${p.legs[k+1].origin} (${diff.toFixed(1)}h)`);
           }
           
           return {
               id: 'scale-' + p.legs.map(l => l.id).join('-'),
               origin: firstLeg.origin,
               destination: lastLeg.destination,
               departure_time: firstLeg.departure_time,
               arrival_time: lastLeg.arrival_time,
               flight_number: p.flightNumbers.join(' → '),
               flight_duration_hours: p.duration,
               price: p.price,
               node: p.node,
               isScale: true,
               legs: p.legs.map(l => l.id),
               scaleDetail: `Escalas en: ${scaleDetails.join(' y ')}`
           };
        });
        
        combined.sort((a,b) => new Date(a.departure_time) - new Date(b.departure_time));
        setFlights(combined);
        setTotal(combined.length);
        setWarnings(['Mostrando opciones de Vuelos con Escala debido a que no existen rutas directas conectadas.']);
      } catch (e) { setFlights([]); setWarnings(['Error consultando escalas distribuidas']); }
      setLoading(false);
      return;
    }

    // Flujo normal vuelo directo
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: '1', class: cls });
    if (o)  params.set('origin', o);
    if (d)  params.set('destination', d);
    if (dt) params.set('date', dt);
    const tabObj = REGION_TABS.find(r => r.key === tab);
    if (tabObj?.node) params.set('node', String(tabObj.node));
    
    try {
      const r = await fetch(`/api/flights?${params}`);
      const data = await r.json();
      const directFlights = data.data || [];
      directFlights.forEach(f => f.isScale = false);
      setFlights(directFlights);
      setTotal(data.total || 0);
      setWarnings(data.warnings || []);
    } catch { setFlights([]); setTotal(0); }
    setLoading(false);
  }

  function handleSubmit(e) { e.preventDefault(); setActiveTab('ALL'); searchWith(origin, dest, date, 'ALL'); }
  function handleTab(key) { setActiveTab(key); searchWith(origin, dest, date, key); }

  useEffect(() => { if (origin || dest || date) searchWith(origin, dest, date, activeTab); }, []);

  // Priorizar vuelos directos y luego por fecha
  const displayFlights = [...flights].sort((a, b) => {
    if (a.isScale && !b.isScale) return 1;
    if (!a.isScale && b.isScale) return -1;
    return new Date(a.departure_time) - new Date(b.departure_time);
  });

  const sortedByPrice = [...flights].sort((a, b) => {
    if (a.isScale !== b.isScale) return a.isScale ? 1 : -1;
    return a.price - b.price;
  });
  const sortedByTime  = [...flights].sort((a, b) => {
    if (a.isScale !== b.isScale) return a.isScale ? 1 : -1;
    return a.flight_duration_hours - b.flight_duration_hours;
  });
  const sortedByValue = [...flights].sort((a, b) => {
    if (a.isScale !== b.isScale) return a.isScale ? 1 : -1;
    return (a.price * Math.pow(a.flight_duration_hours, 1.5)) - (b.price * Math.pow(b.flight_duration_hours, 1.5));
  });

  const cheapest  = sortedByPrice[0];
  const fastest   = sortedByTime[0];
  const bestValue = sortedByValue.find(f => f.id !== cheapest?.id && f.id !== fastest?.id) || flights[2];

  const highlights = [];
  if (cheapest)  highlights.push({ label: '💸 MÁS BARATO', color: '#10B981', flight: cheapest });
  if (fastest && fastest.id !== cheapest.id) highlights.push({ label: '⚡ MÁS RÁPIDO', color: '#F59E0B', flight: fastest });
  if (bestValue && bestValue.id !== cheapest?.id && bestValue.id !== fastest?.id) highlights.push({ label: '⭐ MEJOR VALOR', color: '#3B82F6', flight: bestValue });

  return (
    <div style={{ background:'#F8FAFC', minHeight:'100vh', paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 24px' }}>
        
        <h1 style={{ fontSize:'2rem', fontWeight:800, color:'#0F172A', marginBottom:8, fontFamily:'"Outfit", sans-serif' }}>
          ✈ {t('flights_title') || 'Sistema de Reservas Central'}
        </h1>
        <p style={{ color:'#475569', marginBottom:24, fontSize:'0.9rem' }}>
          Realiza consultas globales instantáneas o vuelos con escalas algorítmicas entre continentes.
        </p>

        <InteractiveRouteMap origin={origin} destination={dest} onSelect={handleMapSelect}/>

        <div style={{ background:'#FFFFFF', borderRadius:16, border:'1px solid #E2E8F0', padding:'20px 24px', marginBottom: 24, boxShadow:'0 4px 14px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', gap: 16, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>{t('origin')||'ORIGEN'}</label>
              <select style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #CBD5E1', outline:'none' }} value={origin} onChange={e=>setOrigin(e.target.value)}>
                <option value="">Cualquiera</option>
                {AO.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>{t('destination')||'DESTINO'}</label>
              <select style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #CBD5E1', outline:'none' }} value={dest} onChange={e=>setDest(e.target.value)}>
                <option value="">Cualquiera</option>
                {AO.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>FECHA</label>
              <input type="date" style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #CBD5E1', outline:'none' }} value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>CLASE</label>
              <select style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #CBD5E1', outline:'none' }} value={cls} onChange={e=>setCls(e.target.value)}>
                <option value="ECONOMY">Económica</option>
                <option value="FIRST">Primera Clase</option>
              </select>
            </div>
            <button type="submit" style={{ background:'#0F172A', color:'#FFF', border:'none', borderRadius:8, padding:'11px 24px', fontWeight:600, cursor:'pointer' }}>🔍 Buscar</button>
          </form>
        </div>

        {searched && (
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {REGION_TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => handleTab(tab.key)} style={{ padding:'8px 16px', borderRadius:20, fontWeight:700, fontSize:'0.8rem', border: active ? '1px solid #0F172A' : '1px solid #E2E8F0', background: active ? '#0F172A' : '#FFFFFF', color: active ? '#FFFFFF' : '#475569', cursor:'pointer' }}>
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{ padding:'12px 16px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.85rem', marginBottom:20 }}>
            ⚠️ {warnings.join(' · ')}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign:'center', color:'#64748B' }}>Consultando estado global distribuido... ⏳</div>
        ) : searched && flights.length === 0 ? (
          <div style={{ padding: 60, textAlign:'center', background:'#FFF', borderRadius:16, border:'1px solid #E2E8F0' }}>
            <h3 style={{ fontSize:'1.2rem', color:'#0F172A' }}>No hay vuelos disponibles</h3>
            <p style={{ color:'#64748B', fontSize:'0.9rem' }}>Modifique las fechas o intente buscar entre otros puntos.</p>
          </div>
        ) : searched && (
          <div>
            {highlights.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Opciones Destacadas</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {highlights.map(h => (
                    <Link key={`hi-${h.flight.id}`} href={h.flight.isScale ? `/booking/scale?legs=${h.flight.legs.join(',')}&cls=${cls}` : `/flights/${h.flight.id}`} style={{ textDecoration:'none' }}>
                      <div style={{ background: '#FFF', borderRadius: 14, border: `2px solid ${h.color}40`, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <div style={{ background: h.color, color: '#FFF', fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20, position: 'absolute', top: -12, left: 16 }}>
                          {h.label}
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 6, marginTop: 4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#0F172A' }}>{h.flight.origin}</span>
                            {h.flight.isScale ? <span style={{ color:'#8B5CF6' }}>⤍</span> : <span style={{ color:'#94A3B8' }}>→</span>}
                            <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#0F172A' }}>{h.flight.destination}</span>
                          </div>
                          <div style={{ fontWeight:800, color: h.color, fontSize:'1.2rem' }}>${h.flight.price}</div>
                        </div>
                        <div style={{ fontSize:'0.85rem', color:'#475569', display:'flex', justifyContent: 'space-between' }}>
                          <span>⏱ {h.flight.flight_duration_hours.toFixed(1)} hrs</span>
                          <span>{h.flight.isScale ? 'Con Escalas' : 'Directo'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize:'0.85rem', color:'#64748B', marginBottom: 16, marginTop: highlights.length ? 16 : 0, borderTop: highlights.length ? '1px solid #E2E8F0' : 'none', paddingTop: highlights.length ? 16 : 0 }}>
              Todos los Vuelos ({total})
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {displayFlights.map(f => (
                <Link key={f.id} href={f.isScale ? `/booking/scale?legs=${f.legs.join(',')}&cls=${cls}` : `/flights/${f.id}`} style={{ textDecoration:'none', cursor: 'pointer' }}>
                  <div style={{ background:'#FFFFFF', borderRadius:14, border: f.isScale ? '2px solid #8B5CF6' : '1px solid #E2E8F0', padding:'20px', transition:'transform 0.15s, box-shadow 0.15s', boxShadow:'0 2px 8px rgba(0,0,0,0.02)' }}
                       onMouseEnter={e => { e.currentTarget.style.borderColor='#0F172A'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.06)'; }}
                       onMouseLeave={e => { e.currentTarget.style.borderColor= f.isScale ? '#8B5CF6' : '#E2E8F0'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'; }}>
                    
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#0F172A' }}>{f.origin}</span>
                        {f.isScale ? <span style={{ color:'#8B5CF6' }}>⤍</span> : <span style={{ color:'#94A3B8' }}>→</span>}
                        <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#0F172A' }}>{f.destination}</span>
                      </div>
                      <div style={{ fontWeight:800, color:'#10B981', fontSize:'1.1rem' }}>${f.price}</div>
                    </div>

                    <div style={{ fontSize:'0.85rem', color:'#475569', marginBottom:8, display:'flex', flexDirection:'column', gap:4 }}>
                      <div>🛫 {new Date(f.departure_time).toLocaleString('es')}</div>
                      <div>🛬 {new Date(f.arrival_time).toLocaleString('es')}</div>
                    </div>

                    {f.isScale && (
                      <div style={{ padding:'8px 12px', background:'#F5F3FF', borderRadius:8, color:'#7C3AED', fontSize:'0.75rem', fontWeight:700, marginTop:12 }}>
                        🔄 {f.scaleDetail}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlightsPage() {
  return (
    <Suspense fallback={<div style={{padding:40, textAlign:'center'}}>Cargando...</div>}>
      <FlightsContent />
    </Suspense>
  );
}
