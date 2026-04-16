'use client';
import { useState, useEffect } from 'react';

export default function FlightDashboard({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/flights/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [params.id]);

  if (loading) return (
    <div className="container section">
      <div className="shimmer" style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
      <div className="shimmer" style={{ height: 400, borderRadius: 16 }} />
    </div>
  );
  if (!data?.flight) return (
    <div className="container section">
      <p style={{ color: '#5A6880' }}>Vuelo no encontrado.</p>
    </div>
  );

  const { flight, seats = [] } = data;
  const total = seats.length;
  const sold = seats.filter(s => s.status === 'SOLD').length;
  const reserved = seats.filter(s => s.status === 'RESERVED').length;
  const available = seats.filter(s => s.status === 'AVAILABLE').length;
  const refunded = seats.filter(s => s.status === 'REFUNDED').length;
  const occupied = sold + reserved;
  const occupancyPct = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
  const revenue = seats.filter(s => s.status === 'SOLD').reduce((s, seat) => s + (seat.price_usd || 0), 0);
  const revBs = (revenue * 6.96).toFixed(2);

  const colorOf = s => ({
    AVAILABLE: '#0A9960', RESERVED: '#D97706', SOLD: '#CC2233', REFUNDED: '#0088CC'
  })[s.status] || '#8899AA';

  return (
    <div style={{ background: '#F0F4FA', minHeight: '100vh' }}>
      <div className="container section">
        {/* Header */}
        <div className="glass" style={{ padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1A2233', fontFamily: 'Outfit' }}>
              {flight.origin} → {flight.destination}
            </h1>
            <span className={`badge badge-${flight.status?.toLowerCase()}`}>{flight.status}</span>
          </div>
          <p style={{ color: '#5A6880', fontSize: '0.88rem' }}>
            ✈ {flight.flight_number} · Dashboard de vuelo individual
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Ocupación', value: `${occupancyPct}%`, color: '#0066CC', bg: '#EEF4FF', icon: '📊' },
            { label: 'Vendidos',  value: sold,               color: '#CC2233', bg: '#FFEAEA', icon: '🔴' },
            { label: 'Reservados',value: reserved,           color: '#D97706', bg: '#FFF6DC', icon: '🟡' },
            { label: 'Disponibles',value: available,         color: '#0A9960', bg: '#DFFBF0', icon: '🟢' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '18px', textAlign: 'center',
              border: `1px solid ${s.color}20` }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, fontFamily: 'Outfit', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#5A6880', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ingresos */}
        <div className="glass" style={{ padding: '22px', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: '#1A2233' }}>💰 Ingresos del Vuelo</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0066CC', fontFamily: 'Outfit' }}>
                ${revenue.toLocaleString()}
              </div>
              <div style={{ color: '#5A6880', fontSize: '0.82rem' }}>USD Total recaudado</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#D97706', fontFamily: 'Outfit' }}>
                Bs. {parseFloat(revBs).toLocaleString()}
              </div>
              <div style={{ color: '#5A6880', fontSize: '0.82rem' }}>Bolivianos equivalente</div>
            </div>
          </div>
        </div>

        {/* Barra de ocupación */}
        <div className="glass" style={{ padding: '22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: '#1A2233' }}>Distribución de Asientos</span>
            <span style={{ color: '#0066CC', fontWeight: 700 }}>{total} total</span>
          </div>
          <div style={{ height: 14, background: '#F0F4FA', borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ width: `${(sold/total)*100}%`, background: '#CC2233', transition: 'width 0.6s' }} />
              <div style={{ width: `${(reserved/total)*100}%`, background: '#D97706', transition: 'width 0.6s' }} />
              <div style={{ width: `${(available/total)*100}%`, background: '#0A9960', transition: 'width 0.6s' }} />
              <div style={{ width: `${(refunded/total)*100}%`, background: '#0088CC', transition: 'width 0.6s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', flexWrap: 'wrap' }}>
            {[['#CC2233','Vendido',sold],['#D97706','Reservado',reserved],['#0A9960','Disponible',available],['#0088CC','Reembolsado',refunded]].map(([c,l,v]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ color: '#5A6880' }}>{l}: <strong style={{ color: '#1A2233' }}>{v}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa compacto */}
        <div className="glass" style={{ padding: '22px', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 14, color: '#1A2233' }}>🗺 Mapa de Asientos</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {seats.map(s => (
              <div key={s.id || s.seat_number}
                title={`${s.seat_number} · ${s.class} · ${s.status}`}
                style={{
                  width: 20, height: 20, borderRadius: 3,
                  background: `${colorOf(s)}18`,
                  border: `1px solid ${colorOf(s)}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Info técnica */}
        <div className="glass" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>
            METADATOS DISTRIBUIDOS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, fontSize: '0.82rem' }}>
            <div><span style={{ color: '#8899AA' }}>Reloj Lamport: </span><strong style={{ color: '#1A2233' }}>{flight.lamport_clock}</strong></div>
            <div><span style={{ color: '#8899AA' }}>Vector: </span><code style={{ fontFamily: 'monospace', color: '#0088CC' }}>{flight.vector_clock}</code></div>
            <div><span style={{ color: '#8899AA' }}>Nodo: </span><strong style={{ color: '#0066CC' }}>Nodo {flight.processed_by_node}</strong></div>
            <div><span style={{ color: '#8899AA' }}>Aeronave ID: </span><strong style={{ color: '#1A2233' }}>{flight.aircraft_id}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
