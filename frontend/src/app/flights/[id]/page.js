'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AIRCRAFT_MODELS } from '@/lib/aircraft';
import { useLang } from '@/context/LanguageContext';

const MODEL_MAP = Object.fromEntries(AIRCRAFT_MODELS.map(m => [m.id, m]));
// fleet: ids 1..50, cada uno tiene aircraft_model_id
const FLEET_MAP = (() => {
  const map = {}; let idx = 1;
  for (const m of AIRCRAFT_MODELS) for (let i = 0; i < m.count; i++) map[idx++] = m.id;
  return map;
})();

// ── Mapa de asientos estilo real ─────────────────────────────
function AirlineSeatMap({ seats, selectedSeat, onSelect, t }) {
  const firstSeats = seats.filter(s => s.class === 'FIRST');
  const econSeats  = seats.filter(s => s.class === 'ECONOMY');

  const groupByRow = (list) => {
    const rows = {};
    for (const s of list) {
      const row = parseInt(s.seat_number.match(/\d+/)?.[0]);
      const col = s.seat_number.replace(/\d+/, '');
      if (!rows[row]) rows[row] = {};
      rows[row][col] = s;
    }
    return Object.entries(rows).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([r, cols]) => ({ row: parseInt(r), cols }));
  };

  const seatColor = (seat, selected) => {
    if (selected)                  return { bg:'#10B981', border:'#059669', text:'#FFFFFF', cursor:'pointer' };
    if (seat.status==='AVAILABLE') return { bg:'#DBEAFE', border:'#0066CC', text:'#0066CC', cursor:'pointer' };
    if (seat.status==='RESERVED')  return { bg:'#FEF3C7', border:'#D97706', text:'#92400E', cursor:'pointer' };
    if (seat.status==='SOLD')      return { bg:'#F1F5F9', border:'#CBD5E1', text:'#94A3B8', cursor:'default' };
    if (seat.status==='REFUNDED')  return { bg:'#DBEAFE', border:'#3B82F6', text:'#1D4ED8', cursor:'default' };
    return { bg:'#F1F5F9', border:'#CBD5E1', text:'#94A3B8', cursor:'default' };
  };

  function Seat({ seat, w=30, h=26, r=5 }) {
    if (!seat) return <div style={{ width:w, height:h }}/>;
    const sel = selectedSeat?.id === seat.id;
    const { bg, border, text, cursor } = seatColor(seat, sel);
    const titleText = seat.passenger_name 
      ? `${seat.seat_number} · ${seat.status} · Pasajero: ${seat.passenger_name}`
      : `${seat.seat_number} · ${seat.status} · $${seat.price_usd}`;

    return (
      <button onClick={() => {
          if (seat.status === 'AVAILABLE') onSelect(seat);
          if (seat.status === 'RESERVED') onSelect(seat); 
        }}
        title={titleText}
        style={{ width:w, height:h, borderRadius:r, border:`1.5px solid ${border}`,
          background:bg, color:text, fontSize:'0.5rem', fontWeight:700,
          cursor, display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.1s, box-shadow 0.1s', flexShrink:0,
        }}
        onMouseEnter={e=>{ if(seat.status==='AVAILABLE' || seat.status==='RESERVED') e.currentTarget.style.transform='scale(1.12)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}>
        {seat.seat_number}
      </button>
    );
  }

  const firstRows = groupByRow(firstSeats);
  const econRows  = groupByRow(econSeats);

  return (
    <div>
      {/* Leyenda */}
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap', padding:'12px 16px',
        background:'#F8FAFF', borderRadius:10, border:'1px solid #DDE3EE' }}>
        {[
          { label:t('available'), bg:'#DBEAFE', border:'#0066CC' },
          { label:t('reserved'),  bg:'#FEF3C7', border:'#D97706' },
          { label:t('sold'),      bg:'#F1F5F9', border:'#CBD5E1' },
          { label:t('your_pick'), bg:'#10B981', border:'#059669' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:18, height:14, borderRadius:3, background:l.bg, border:`1.5px solid ${l.border}` }}/>
            <span style={{ fontSize:'0.78rem', color:'#5A6880', fontWeight:500 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Avión — wrapper con forma de fuselaje */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        <div style={{ background:'#F8FAFF', border:'2px solid #DDE3EE', borderRadius:40,
          padding:'24px 20px', maxHeight:560, overflowY:'auto', minWidth:300 }}>

          {/* ── PRIMERA CLASE ── */}
          {firstRows.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <span style={{ fontSize:'0.68rem', fontWeight:800, color:'#92400E', letterSpacing:'2px',
                  background:'#FEF3C7', padding:'3px 12px', borderRadius:20, border:'1px solid #FCD34D' }}>
                  ✦ PRIMERA CLASE
                </span>
              </div>
              {/* Header columnas */}
              <div style={{ display:'flex', gap:5, alignItems:'center', justifyContent:'center', marginBottom:6 }}>
                <div style={{ width:22 }}/>
                {['A','B','','C','D'].map((c,i)=>(
                  <div key={i} style={{ width:c===''?20:42, textAlign:'center', fontSize:'0.62rem', fontWeight:700, color:'#94A3B8' }}>{c}</div>
                ))}
              </div>
              {firstRows.map(({row,cols})=>(
                <div key={row} style={{ display:'flex', gap:5, alignItems:'center', justifyContent:'center', marginBottom:5 }}>
                  <div style={{ width:22, textAlign:'right', fontSize:'0.62rem', fontWeight:700, color:'#94A3B8' }}>{row}</div>
                  <Seat seat={cols['A']} w={42} h={38} r={8}/>
                  <Seat seat={cols['B']} w={42} h={38} r={8}/>
                  <div style={{ width:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:1, height:30, background:'#DDE3EE' }}/>
                  </div>
                  <Seat seat={cols['C']} w={42} h={38} r={8}/>
                  <Seat seat={cols['D']} w={42} h={38} r={8}/>
                </div>
              ))}
            </div>
          )}

          {/* Separador */}
          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'#DDE3EE' }}/>
            <span style={{ fontSize:'0.65rem', color:'#94A3B8', fontWeight:600, letterSpacing:'1px' }}>● ECONÓMICA</span>
            <div style={{ flex:1, height:1, background:'#DDE3EE' }}/>
          </div>

          {/* ── ECONÓMICA ── */}
          {econRows.length > 0 && (
            <div>
              <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'center', marginBottom:6 }}>
                <div style={{ width:22 }}/>
                {['A','B','C','','D','E','F'].map((c,i)=>(
                  <div key={i} style={{ width:c===''?14:30, textAlign:'center', fontSize:'0.58rem', fontWeight:700, color:'#94A3B8' }}>{c}</div>
                ))}
              </div>
              {econRows.map(({row,cols})=>(
                <div key={row} style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'center', marginBottom:3 }}>
                  <div style={{ width:22, textAlign:'right', fontSize:'0.58rem', fontWeight:700, color:'#94A3B8' }}>{row}</div>
                  <Seat seat={cols['A']} w={30} h={24}/>
                  <Seat seat={cols['B']} w={30} h={24}/>
                  <Seat seat={cols['C']} w={30} h={24}/>
                  <div style={{ width:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:1, height:20, background:'#DDE3EE' }}/>
                  </div>
                  <Seat seat={cols['D']} w={30} h={24}/>
                  <Seat seat={cols['E']} w={30} h={24}/>
                  <Seat seat={cols['F']} w={30} h={24}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página detalle vuelo ─────────────────────────────────────
export default function FlightDetailPage({ params }) {
  const router = useRouter();
  const { t }  = useLang();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/flights/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [params.id]);

  if (loading) return (
    <div className="container section">
      <div className="shimmer" style={{ height:120, borderRadius:16, marginBottom:16 }}/>
      <div className="shimmer" style={{ height:400, borderRadius:16 }}/>
    </div>
  );
  if (!data?.flight) return (
    <div className="container section">
      <p style={{ color:'#5A6880' }}>Vuelo no encontrado.</p>
    </div>
  );

  const { flight, seats = [] } = data;
  const dep = new Date(flight.departure_time);
  const arr = new Date(flight.arrival_time);
  const availCount = seats.filter(s => s.status==='AVAILABLE').length;
  const soldCount  = seats.filter(s => s.status==='SOLD').length;
  const resCount   = seats.filter(s => s.status==='RESERVED').length;
  const modelId = FLEET_MAP[flight.aircraft_id];
  const model   = modelId ? MODEL_MAP[modelId] : null;

  // Validación de 72h
  const now = new Date();
  const hoursLeft = (dep.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLocked72h = hoursLeft < 72;

  async function handleCancelReserved() {
    if (!selectedSeat || !selectedSeat.booking_id) return;
    if (!confirm('¿Deseas anular esta reserva? El asiento pasará a ser liberado.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${selectedSeat.booking_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + errorData.error);
        return;
      }
      alert('Reserva anulada. El asiento se liberará en 15 minutos.');
      // Refrescar página para ver cambios
      window.location.reload();
    } catch (err) {
      alert('Error de red: ' + err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="container section">
      {/* ── Header del vuelo ── */}
      <div className="glass" style={{ padding:'28px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
              <span style={{ fontSize:'2.4rem', fontWeight:900, fontFamily:'Outfit', color:'#1A2233' }}>{flight.origin}</span>
              <span style={{ fontSize:'1.8rem', color:'#0066CC' }}>→</span>
              <span style={{ fontSize:'2.4rem', fontWeight:900, fontFamily:'Outfit', color:'#1A2233' }}>{flight.destination}</span>
            </div>
            <div style={{ color:'#5A6880', fontSize:'0.88rem', display:'flex', gap:18, flexWrap:'wrap' }}>
              <span>✈ {flight.flight_number}</span>
              <span>🕐 {dep.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})} → {arr.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}</span>
              <span>📅 {dep.toLocaleDateString('es-BO',{day:'2-digit',month:'short',year:'numeric'})}</span>
              <span>⏱ {flight.flight_duration_hours}h</span>
              {flight.gate && <span>🚪 {t('gate')}: <strong style={{color:'#0066CC'}}>{flight.gate}</strong></span>}
            </div>
            {model && (
              <div style={{ marginTop:10, display:'flex', gap:10, flexWrap:'wrap' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px',
                  borderRadius:20, background:'#F0F4FA', border:'1px solid #DDE3EE',
                  fontSize:'0.78rem', color:'#1A2233', fontWeight:700 }}>
                  ✈ {model.manufacturer} {model.model}
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px',
                  borderRadius:20, background:'#FEF3C7', border:'1px solid #FCD34D',
                  fontSize:'0.78rem', color:'#92400E', fontWeight:700 }}>
                  ✦ {model.first_class_seats} Primera · ● {model.economy_seats} Económica · {model.total_seats} total
                </span>
              </div>
            )}
          </div>
          <span className={`badge badge-${flight.status?.toLowerCase()}`} style={{ fontSize:'0.85rem', padding:'6px 14px' }}>
            {flight.status}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { label:t('available'), value:availCount, color:'#0A9960', bg:'#DFFBF0' },
            { label:t('reserved'),  value:resCount,   color:'#CC8800', bg:'#FFF6DC' },
            { label:t('sold'),      value:soldCount,  color:'#CC2233', bg:'#FFEAEA' },
            { label:'Total',        value:seats.length,color:'#5A6880',bg:'#F0F4FA' },
          ].map(s=>(
            <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.color, fontFamily:'Outfit' }}>{s.value}</div>
              <div style={{ fontSize:'0.72rem', color:'#5A6880', fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20, alignItems:'start' }}>
        {/* Mapa */}
        <div className="glass" style={{ padding:'24px' }}>
          <h2 style={{ fontSize:'1.15rem', fontWeight:800, marginBottom:20, color:'#1A2233' }}>
            💺 {t('select_seat')}
          </h2>
          <AirlineSeatMap seats={seats} selectedSeat={selectedSeat} onSelect={setSelectedSeat} t={t}/>
        </div>

        {/* Panel derecho */}
        <div className="glass" style={{ padding:'22px', minWidth:220, position:'sticky', top:80,
          border: selectedSeat ? '2px solid #0066CC' : '1px solid #DDE3EE' }}>
          {selectedSeat ? (
            <>
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <div style={{ fontSize:'2.8rem', fontWeight:900, fontFamily:'Outfit',
                  color: selectedSeat.class==='FIRST' ? '#D97706' : '#0066CC' }}>
                  {selectedSeat.seat_number}
                </div>
                <div style={{ fontSize:'0.82rem', color:'#5A6880', marginTop:4 }}>
                  {selectedSeat.class==='FIRST' ? '✦ Primera Clase' : '● Económica'}
                </div>
              </div>
              <div style={{ background:'#F0F4FA', borderRadius:10, padding:'14px', marginBottom:16, textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#1A2233' }}>USD {selectedSeat.price_usd}</div>
                <div style={{ fontSize:'0.75rem', color:'#5A6880' }}>Bs. {(selectedSeat.price_usd*6.96).toFixed(2)}</div>
              </div>

              {selectedSeat.status === 'RESERVED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-primary" style={{ width:'100%', padding:'12px', background: '#D97706', borderColor: '#D97706' }} onClick={()=>
                    router.push(`/booking?flight_id=${flight.id}&seat_id=${selectedSeat.id}&seat_number=${selectedSeat.seat_number}&class=${selectedSeat.class}&price_usd=${selectedSeat.price_usd}&origin=${flight.origin}`)}>
                    💳 Comprar Asiento
                  </button>
                  <button className="btn btn-danger" disabled={cancelling} style={{ width:'100%', padding:'12px', background: '#FFF0F0', color: '#DC2626', borderColor: '#FECACA' }} onClick={handleCancelReserved}>
                    {cancelling ? '⏳...' : '🗑 Anular Reserva'}
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-primary" 
                  style={{ width:'100%', padding:'12px' }} 
                  onClick={()=>
                    router.push(`/booking?flight_id=${flight.id}&seat_id=${selectedSeat.id}&seat_number=${selectedSeat.seat_number}&class=${selectedSeat.class}&price_usd=${selectedSeat.price_usd}&origin=${flight.origin}`)}>
                  {t('continue')}
                </button>
              )}
            </>
          ) : (
            <div style={{ textAlign:'center', color:'#8899AA', padding:'24px 0' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:10 }}>💺</div>
              <div style={{ fontSize:'0.82rem', lineHeight:1.6, color:'#5A6880' }}>
                {t('select_seat')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
