'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AIRPORTS } from '@/lib/airports';
import { useLang } from '@/context/LanguageContext';

const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));
const AIRPORT_OPTIONS = AIRPORTS.map(a => ({ value: a.code, label: `${a.code} — ${a.city}` }));

// ── Mini tarjeta de vuelo para un segmento ──────────────────
function SegmentFlightCard({ flight }) {
  if (!flight) return null;
  const dep = new Date(flight.departure_time);
  const arr = new Date(flight.arrival_time);
  return (
    <Link href={`/flights/${flight.id}`} style={{ textDecoration:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
        background:'#F8FAFF', border:'1px solid #DDE3EE', borderRadius:10, cursor:'pointer',
        transition:'all 0.15s' }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor='#0066CC'; e.currentTarget.style.background='#EEF4FF'; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor='#DDE3EE'; e.currentTarget.style.background='#F8FAFF'; }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'0.82rem', fontWeight:800, color:'#1A2233' }}>
            ✈ {flight.flight_number}
          </div>
          <div style={{ fontSize:'0.72rem', color:'#5A6880', marginTop:2 }}>
            {dep.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})} →{' '}
            {arr.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}
            {' · '}{flight.flight_duration_hours}h
            {' · '}{dep.toLocaleDateString('es-BO',{day:'2-digit',month:'short'})}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <span className={`badge badge-${flight.status?.toLowerCase()||'scheduled'}`} style={{ fontSize:'0.65rem' }}>
            {flight.status}
          </span>
          <span style={{ fontSize:'0.72rem', color:'#0066CC', fontWeight:700 }}>Ver asientos →</span>
        </div>
      </div>
    </Link>
  );
}

// ── Segmento con vuelos disponibles ─────────────────────────
function SegmentCard({ seg, idx, segFlights, loadingSegs }) {
  const fromAp = AP[seg.from];
  const toAp   = AP[seg.to];
  const nodeFrom = fromAp?.assigned_node;
  const nodeTo   = toAp?.assigned_node;
  const crossNode = nodeFrom && nodeTo && nodeFrom !== nodeTo;
  const flist = segFlights?.[`${seg.from}-${seg.to}`] || [];

  return (
    <div style={{ border:'1px solid #DDE3EE', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
      {/* Header del segmento */}
      <div style={{ background: crossNode ? 'linear-gradient(135deg,#EEF4FF,#E8F4FF)' : '#F8FAFF',
        padding:'14px 18px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
        borderBottom:'1px solid #DDE3EE' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#8899AA', letterSpacing:'1px' }}>
            TRAMO {idx+1}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.4rem', fontWeight:900, fontFamily:'Outfit', color:'#1A2233', lineHeight:1 }}>{seg.from}</div>
            <div style={{ fontSize:'0.68rem', color:'#8899AA' }}>{fromAp?.city || ''}</div>
          </div>
          <div style={{ color:'#0066CC', fontSize:'1.2rem', flex:1, textAlign:'center' }}>→</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.4rem', fontWeight:900, fontFamily:'Outfit', color:'#1A2233', lineHeight:1 }}>{seg.to}</div>
            <div style={{ fontSize:'0.68rem', color:'#8899AA' }}>{toAp?.city || ''}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          {seg.cost_usd != null && (
            <span style={{ fontWeight:900, color:'#0066CC', fontSize:'0.95rem', fontFamily:'Outfit' }}>
              ${seg.cost_usd}
            </span>
          )}
          {seg.time_hours && (
            <span style={{ color:'#5A6880', fontSize:'0.82rem' }}>⏱ {seg.time_hours}h</span>
          )}
          {crossNode && (
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'#1E40AF',
              background:'#DBEAFE', border:'1px solid #BFDBFE', padding:'2px 8px', borderRadius:10 }}>
              ⚡ Cross-Node N{nodeFrom}→N{nodeTo}
            </span>
          )}
        </div>
      </div>

      {/* Vuelos disponibles */}
      <div style={{ padding:'12px 16px', background:'#FFFFFF' }}>
        <div style={{ fontSize:'0.68rem', color:'#8899AA', fontWeight:700, letterSpacing:'0.5px', marginBottom:10 }}>
          VUELOS DISPONIBLES EN ESTA RUTA
        </div>
        {loadingSegs ? (
          <div style={{ display:'flex', gap:8 }}>
            {[1,2].map(i=><div key={i} className="shimmer" style={{height:56,borderRadius:10,flex:1}}/>)}
          </div>
        ) : flist.length === 0 ? (
          <div style={{ fontSize:'0.8rem', color:'#8899AA', textAlign:'center', padding:'12px 0' }}>
            Sin vuelos directos encontrados —{' '}
            <Link href={`/flights?origin=${seg.from}&destination=${seg.to}`}
              style={{ color:'#0066CC', fontWeight:700 }}>buscar manualmente</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {flist.map(f => <SegmentFlightCard key={f.id} flight={f}/>)}
            {flist.length >= 3 && (
              <Link href={`/flights?origin=${seg.from}&destination=${seg.to}`}
                style={{ fontSize:'0.75rem', color:'#0066CC', fontWeight:700, textAlign:'center', padding:'4px 0' }}>
                Ver todos los vuelos {seg.from} → {seg.to} →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Resultado completo de ruta ───────────────────────────────
function RouteResult({ result, criterion, label, color, icon, segFlights, loadingSegs }) {
  const [open, setOpen] = useState(true);
  const segments = result.segments || [];
  const mainValue = criterion === 'cost'
    ? `$${result.totalCost || result.total_cost}`
    : `${result.totalTime || result.total_time}h`;
  const path = result.path || result.route || [];

  return (
    <div style={{ border:`1.5px solid ${color}30`, borderRadius:16, overflow:'hidden', marginBottom:16 }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:14, padding:'16px 20px',
        background: `${color}08`, border:'none', cursor:'pointer', textAlign:'left',
      }}>
        <span style={{ fontSize:'1.5rem' }}>{icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#1A2233' }}>{label}</div>
          <div style={{ fontSize:'0.78rem', color:'#5A6880', marginTop:2 }}>
            {path.join(' → ')} · {segments.length} tramo{segments.length!==1?'s':''}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'1.6rem', fontWeight:900, color, fontFamily:'Outfit' }}>{mainValue}</div>
          <div style={{ fontSize:'0.68rem', color:'#8899AA' }}>{criterion==='cost'?'USD total':'Tiempo total'}</div>
        </div>
        <span style={{ color:'#8899AA', fontSize:'1.2rem', marginLeft:8 }}>{open?'▲':'▼'}</span>
      </button>

      {open && (
        <div style={{ padding:'16px', background:'#FFFFFF' }}>
          {segments.map((seg, i) => (
            <SegmentCard key={i} seg={seg} idx={i} segFlights={segFlights} loadingSegs={loadingSegs}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function RoutesPage() {
  const { t } = useLang();

  const [dOrigin, setDOrigin] = useState('');
  const [dDest,   setDDest]   = useState('');
  const [dCrit,   setDCrit]   = useState('cost');
  const [dCls,    setDCls]    = useState('economy');
  const [dResults, setDResults] = useState(null);  // { cost, time }
  const [dLoading, setDLoading] = useState(false);
  const [dError,   setDError]   = useState('');

  const [tCities, setTCities] = useState([]);
  const [tCit,    setTCit]    = useState('');
  const [tCls,    setTCls]    = useState('economy');
  const [tResults, setTResults] = useState(null);
  const [tLoading, setTLoading] = useState(false);
  const [tError,   setTError]   = useState('');

  const [segFlights, setSegFlights]   = useState({});
  const [loadingSegs, setLoadingSegs] = useState(false);

  async function fetchSegmentFlights(segments) {
    if (!segments?.length) return;
    setLoadingSegs(true);
    const entries = await Promise.all(
      segments.map(async seg => {
        try {
          const r = await fetch(`/api/flights?origin=${seg.from}&destination=${seg.to}&limit=3`);
          const d = await r.json();
          return [`${seg.from}-${seg.to}`, d.data || []];
        } catch { return [`${seg.from}-${seg.to}`, []]; }
      })
    );
    setSegFlights(Object.fromEntries(entries));
    setLoadingSegs(false);
  }

  async function calcDijkstra(e) {
    e.preventDefault();
    if (!dOrigin || !dDest) { setDError('Selecciona origen y destino'); return; }
    setDLoading(true); setDError(''); setDResults(null); setSegFlights({});
    try {
      // Calcula con ambos criterios en paralelo
      const [rCost, rTime] = await Promise.all([
        fetch(`/api/routes/dijkstra?origin=${dOrigin}&dest=${dDest}&criterion=cost&class=${dCls}`).then(r=>r.json()),
        fetch(`/api/routes/dijkstra?origin=${dOrigin}&dest=${dDest}&criterion=time&class=${dCls}`).then(r=>r.json()),
      ]);
      const results = {};
      if (!rCost.error) results.cost = rCost;
      if (!rTime.error) results.time = rTime;
      if (Object.keys(results).length === 0) { setDError(rCost.error || 'Sin ruta'); return; }
      setDResults(results);
      // Usa los segmentos del primer resultado para cargar vuelos
      const segs = (results.cost || results.time)?.segments || [];
      fetchSegmentFlights(segs);
    } catch (err) { setDError(err.message);
    } finally { setDLoading(false); }
  }

  async function calcTsp(e) {
    e.preventDefault();
    if (tCities.length < 2) { setTError('Agrega al menos 2 ciudades'); return; }
    setTLoading(true); setTError(''); setTResults(null); setSegFlights({});
    try {
      const [rCost, rTime] = await Promise.all([
        fetch('/api/routes/tsp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cities:tCities,criterion:'cost',cls:tCls})}).then(r=>r.json()),
        fetch('/api/routes/tsp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cities:tCities,criterion:'time',cls:tCls})}).then(r=>r.json()),
      ]);
      const results = {};
      if (!rCost.error) results.cost = rCost;
      if (!rTime.error) results.time = rTime;
      if (Object.keys(results).length === 0) { setTError(rCost.error || 'Sin ruta'); return; }
      setTResults(results);
      const segs = (results.cost || results.time)?.segments || [];
      fetchSegmentFlights(segs);
    } catch (err) { setTError(err.message);
    } finally { setTLoading(false); }
  }

  function addCity() {
    if (tCit && !tCities.includes(tCit) && tCities.length < 10) {
      setTCities([...tCities, tCit]); setTCit('');
    }
  }

  const labelInput = { fontSize:'0.65rem', color:'#5A6880', fontWeight:700, letterSpacing:'1px', display:'block', marginBottom:5 };

  return (
    <div style={{ background:'#F0F4FA', minHeight:'100vh' }}>
      <div className="container section">
        <h1 style={{ fontSize:'clamp(1.5rem,4vw,2rem)', fontWeight:900, color:'#1A2233', marginBottom:4 }}>
          🗺️ {t('routes_title')}
        </h1>
        <p style={{ color:'#5A6880', marginBottom:28, fontSize:'0.88rem' }}>
          Calcula rutas óptimas · Obtén la más rápida y más económica · Reserva cada tramo directamente
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))', gap:24, marginBottom:32 }}>

          {/* ── Dijkstra ── */}
          <div className="glass" style={{ padding:'24px' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:800, marginBottom:4, color:'#1A2233' }}>
              🔍 Dijkstra — Punto a Punto
            </h2>
            <p style={{ color:'#5A6880', fontSize:'0.82rem', marginBottom:18 }}>
              Obtén la ruta más rápida Y la más económica en un solo click.
            </p>
            <form onSubmit={calcDijkstra}>
              <div style={{ display:'grid', gap:10, marginBottom:14 }}>
                <div>
                  <label style={labelInput}>{t('origin')}</label>
                  <select className="input" value={dOrigin} onChange={e=>setDOrigin(e.target.value)}>
                    <option value="">Selecciona...</option>
                    {AIRPORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelInput}>{t('destination')}</label>
                  <select className="input" value={dDest} onChange={e=>setDDest(e.target.value)}>
                    <option value="">Selecciona...</option>
                    {AIRPORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelInput}>{t('class')}</label>
                  <select className="input" value={dCls} onChange={e=>setDCls(e.target.value)}>
                    <option value="economy">Económica</option>
                    <option value="first">Primera Clase</option>
                  </select>
                </div>
              </div>
              {dError && <div style={{ padding:'8px 12px', borderRadius:8, background:'#FFEAEA', border:'1px solid #FFBBBB', color:'#CC2233', fontSize:'0.8rem', marginBottom:10 }}>⚠️ {dError}</div>}
              <button type="submit" className="btn btn-primary" style={{ width:'100%' }} disabled={dLoading}>
                {dLoading ? '⏳ Calculando...' : '🔍 Ver rutas óptimas'}
              </button>
            </form>
          </div>

          {/* ── TSP ── */}
          <div className="glass" style={{ padding:'24px' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:800, marginBottom:4, color:'#1A2233' }}>
              🌐 TSP — Circuito Multi-Ciudad
            </h2>
            <p style={{ color:'#5A6880', fontSize:'0.82rem', marginBottom:18 }}>
              Visita todas las ciudades y regresa al inicio. Held-Karp exact algorithm.
            </p>
            <form onSubmit={calcTsp}>
              <div style={{ display:'grid', gap:10, marginBottom:14 }}>
                <div>
                  <label style={labelInput}>AGREGAR CIUDAD</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <select className="input" value={tCit} onChange={e=>setTCit(e.target.value)}>
                      <option value="">Selecciona...</option>
                      {AIRPORT_OPTIONS.filter(o=>!tCities.includes(o.value)).map(o=>
                        <option key={o.value} value={o.value}>{o.label}</option>
                      )}
                    </select>
                    <button type="button" onClick={addCity} className="btn btn-primary" style={{padding:'10px 16px',whiteSpace:'nowrap'}}>+</button>
                  </div>
                </div>
                {tCities.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {tCities.map((c,i)=>(
                      <span key={c} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px',
                        borderRadius:20, background:'#EEF4FF', border:'1px solid #BFDBFE',
                        fontSize:'0.78rem', color:'#0066CC', fontWeight:700 }}>
                        {i===0?'🏁 ':''}{c}
                        <button type="button" onClick={()=>setTCities(tCities.filter(x=>x!==c))}
                          style={{background:'none',border:'none',color:'#8899AA',cursor:'pointer',padding:0,fontSize:'1rem'}}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div>
                  <label style={labelInput}>{t('class')}</label>
                  <select className="input" value={tCls} onChange={e=>setTCls(e.target.value)}>
                    <option value="economy">Económica</option>
                    <option value="first">Primera Clase</option>
                  </select>
                </div>
              </div>
              {tError && <div style={{ padding:'8px 12px', borderRadius:8, background:'#FFEAEA', border:'1px solid #FFBBBB', color:'#CC2233', fontSize:'0.8rem', marginBottom:10 }}>⚠️ {tError}</div>}
              <button type="submit" className="btn btn-gold" style={{ width:'100%' }}
                disabled={tLoading||tCities.length<2}>
                {tLoading ? '⏳ Calculando TSP...' : `🌐 Calcular circuito (${tCities.length} ciudades)`}
              </button>
            </form>
          </div>
        </div>

        {/* ── Resultados Dijkstra ── */}
        {dResults && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <h2 style={{ fontSize:'1.1rem', fontWeight:800, color:'#1A2233' }}>
                Rutas {dOrigin} → {dDest}
              </h2>
              <span style={{ fontSize:'0.72rem', color:'#8899AA' }}>Haz click en un vuelo para reservar</span>
            </div>
            {dResults.cost && (
              <RouteResult result={dResults.cost} criterion="cost" icon="💰" color="#0066CC"
                label="Ruta más económica" segFlights={segFlights} loadingSegs={loadingSegs}/>
            )}
            {dResults.time && (
              <RouteResult result={dResults.time} criterion="time" icon="⚡" color="#0A9960"
                label="Ruta más rápida" segFlights={segFlights} loadingSegs={loadingSegs}/>
            )}
          </div>
        )}

        {/* ── Resultados TSP ── */}
        {tResults && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <h2 style={{ fontSize:'1.1rem', fontWeight:800, color:'#1A2233' }}>
                Circuito TSP — {tCities.length} ciudades
              </h2>
              <span style={{ fontSize:'0.72rem', color:'#8899AA' }}>Haz click en un vuelo para reservar</span>
            </div>
            {tResults.cost && (
              <RouteResult result={tResults.cost} criterion="cost" icon="💰" color="#D97706"
                label="Circuito más económico" segFlights={segFlights} loadingSegs={loadingSegs}/>
            )}
            {tResults.time && (
              <RouteResult result={tResults.time} criterion="time" icon="⚡" color="#0A9960"
                label="Circuito más rápido" segFlights={segFlights} loadingSegs={loadingSegs}/>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
