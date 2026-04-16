'use client';
import { useState, useEffect } from 'react';

export default function SyncDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const res = await fetch('/api/sync');
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const m = data?.metrics || {};
  const clocks = data?.clocks || {};
  const logs = data?.logs || [];
  const healthOk = m.health === 'OK';

  return (
    <div style={{ background: '#F0F4FA', minHeight: '100vh' }}>
      <div className="container section">
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 900, color: '#1A2233', marginBottom: 6 }}>
          📡 Panel de Sincronización
        </h1>
        <p style={{ color: '#5A6880', marginBottom: 28 }}>
          Métricas de consistencia distribuida · Relojes Lamport y Vectoriales
        </p>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 100, borderRadius: 12 }} />)}
          </div>
        ) : (
          <>
            {/* Relojes actuales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 24 }}>
              <div className="glass" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  RELOJ DE LAMPORT
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#0066CC', fontFamily: 'Outfit', lineHeight: 1, marginBottom: 8 }}>
                  {clocks.lamport || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8899AA' }}>
                  Timestamp causal global · monotónicamente creciente
                </div>
              </div>
              <div className="glass" style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  RELOJ VECTORIAL
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: '#0088CC', marginBottom: 8 }}>
                  {JSON.stringify(clocks.vector || [0,0,0])}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#5A6880', flexWrap: 'wrap' }}>
                  {['América','Europa','Asia'].map((r, i) => (
                    <span key={r}>
                      <span style={{ color: '#1A2233', fontWeight: 700 }}>N{i+1}({r}):</span>{' '}
                      {(clocks.vector || [0,0,0])[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
              <div className="glass" style={{ padding: '20px', borderColor: healthOk ? '#A8EDD4' : '#FCD34D' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  DELAY PROMEDIO
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: healthOk ? '#0A9960' : '#D97706', fontFamily: 'Outfit' }}>
                  {m.avg_delay_ms || 0}ms
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8899AA', marginTop: 4 }}>Límite: 10,000ms</div>
              </div>
              <div className="glass" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  DELAY MÁXIMO
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1A2233', fontFamily: 'Outfit' }}>
                  {m.max_delay_ms || 0}ms
                </div>
              </div>
              <div className="glass" style={{ padding: '20px', borderColor: (m.conflicts || 0) > 0 ? '#FFBBBB' : '#DDE3EE' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  CONFLICTOS
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'Outfit',
                  color: (m.conflicts || 0) > 0 ? '#CC2233' : '#0A9960' }}>
                  {m.conflicts || 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8899AA', marginTop: 4 }}>Resueltos con relojes vectoriales</div>
              </div>
              <div className="glass" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>
                  EVENTOS TOTALES
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1A2233', fontFamily: 'Outfit' }}>
                  {m.total_events || 0}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', marginTop: 6 }}>
                  <span style={{ color: '#0A9960', fontWeight: 700 }}>✓ {m.synced || 0} sync</span>
                  <span style={{ color: '#D97706', fontWeight: 700 }}>⏳ {m.pending || 0} pend.</span>
                </div>
              </div>
            </div>

            {/* Estado global */}
            <div className="glass" style={{ padding: '24px', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: '#1A2233' }}>
                🌐 Estado Global de Consistencia
              </h2>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                {['América (Nodo 1)','Europa (Nodo 2)','Asia (Nodo 3)'].map((region) => (
                  <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: '#DFFBF0', border: '1px solid #A8EDD4', borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0A9960' }}/>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2233' }}>{region}</div>
                      <div style={{ fontSize: '0.72rem', color: '#0A9960' }}>Sincronizado</div>
                    </div>
                  </div>
                ))}
                {(m.pending || 0) > 0 && (
                  <div style={{ padding: '10px 16px', borderRadius: 10, background: '#FFF6DC',
                    border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.82rem' }}>
                    ⏳ {m.pending} evento(s) pendientes (hasta 15 min para reembolsos)
                  </div>
                )}
              </div>
            </div>

            {/* Log de sincronización */}
            <div className="glass" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: '#1A2233' }}>
                📋 Log de Sincronización (últimos {logs.length})
              </h2>
              {logs.length === 0 ? (
                <div style={{ color: '#8899AA', textAlign: 'center', padding: '32px' }}>
                  No hay eventos de sincronización aún.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #DDE3EE' }}>
                        {['Tipo','N.Origen','N.Destino','Lamport','Vector','Estado','Delay','Timestamp'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                            color: '#5A6880', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F0F4FA' }}>
                          <td style={{ padding: '8px 12px', color: '#0066CC', fontWeight: 700 }}>{log.event_type}</td>
                          <td style={{ padding: '8px 12px', color: '#1A2233', fontWeight: 600 }}>{log.source_node}</td>
                          <td style={{ padding: '8px 12px', color: '#1A2233', fontWeight: 600 }}>{log.target_node}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#1A2233' }}>{log.lamport_clock}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0088CC', fontSize: '0.75rem' }}>{log.vector_clock}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge badge-${log.status === 'SYNCED' ? 'scheduled' : log.status === 'CONFLICT' ? 'sold' : 'reserved'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: log.delay_ms > 10000 ? '#CC2233' : '#0A9960', fontWeight: 700 }}>
                            {log.delay_ms}ms
                          </td>
                          <td style={{ padding: '8px 12px', color: '#8899AA' }}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('es-BO') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
