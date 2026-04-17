'use client';

import { useEffect, useState } from 'react';

export default function FlightsByDayPage() {
  const [flights, setFlights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getDays = () => {
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        label: i === 0 ? 'HOY' : i === 1 ? 'MAÑANA' : d.toLocaleDateString('es-VE', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase(),
        date: d,
      });
    }
    return days;
  };

  const days = getDays();

  const fetchFlightForDay = async (dateStr) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/flight-status/flights-by-date?date=${dateStr}`
      );
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      const data = await response.json();
      setFlights(prev => ({ ...prev, [dateStr]: data.flights || [] }));
    } catch (err) {
      console.error(`Error fetching flights for ${dateStr}:`, err);
      setFlights(prev => ({ ...prev, [dateStr]: [] }));
    }
  };

  const loadAllFlights = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all(days.map(d => fetchFlightForDay(d.dateStr)));
    } catch (err) {
      setError(err.message || 'Error cargando vuelos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFlights();
    if (!autoRefresh) return;
    const interval = setInterval(loadAllFlights, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  let currentDayFlights = flights[days[selectedDay]?.dateStr] || [];
  currentDayFlights = currentDayFlights.sort((a, b) => 
    new Date(a.departure_time) - new Date(b.departure_time)
  );

  const getRemarkStatus = (status) => {
    switch (status) {
      case 'SCHEDULED': return 'ON TIME';
      case 'DELAYED': return 'DELAYED';
      case 'IN_FLIGHT': return 'DEPARTED';
      case 'LANDED': return 'LANDED';
      case 'ARRIVED': return 'ARRIVED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'ON TIME';
    }
  };

  const getRemarkColor = (status) => {
    switch (status) {
      case 'DELAYED': return '#F59E0B';
      case 'CANCELLED': return '#EF4444';
      case 'IN_FLIGHT': return '#009980';
      case 'ARRIVED': return '#0066CC';
      default: return '#10B981';
    }
  };

  const getRowBg = (status, idx) => {
    if (status === 'CANCELLED') return '#FEE2E2';
    if (status === 'IN_FLIGHT') return '#ECFDF5';
    return idx % 2 === 0 ? '#F0F4FA' : '#FFFFFF';
  };

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      color: '#1A2233',
      paddingBottom: '40px',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '2px solid #DDE3EE',
        padding: '28px 32px',
        marginTop: '64px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>
                ✈️ TABLERO DE SALIDAS
              </h1>
              <p style={{ fontSize: '13px', margin: '8px 0 0 0', color: '#5A6880', letterSpacing: '0.5px' }}>
                Sistema de información de vuelos en vivo
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1A2233' }}>
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0066CC', cursor: 'pointer' }}
                />
                Auto-actualizar
              </label>
              <button
                onClick={loadAllFlights}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0066CC',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0, 102, 204, 0.2)',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0052A3'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#0066CC'}
              >
                🔄 ACTUALIZAR
              </button>
            </div>
          </div>

          {/* Day Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {days.map((day, idx) => (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDay(idx)}
                style={{
                  padding: '10px 16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '12px',
                  border: '2px solid #DDE3EE',
                  backgroundColor: selectedDay === idx ? '#0066CC' : '#FFFFFF',
                  color: selectedDay === idx ? '#FFFFFF' : '#1A2233',
                  fontFamily: "'Inter', sans-serif",
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {day.label}
                {flights[day.dateStr] && (
                  <span style={{ marginLeft: '6px', opacity: 0.7, fontSize: '11px' }}>
                    ({flights[day.dateStr].length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid #FECACA',
            fontWeight: '600',
            fontSize: '13px',
            borderRadius: '8px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '80px', fontSize: '16px', fontWeight: '600', color: '#5A6880' }}>
            <div style={{ display: 'inline-block', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #DDE3EE',
                borderTop: '3px solid #0066CC',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
            <div>Cargando información de vuelos...</div>
          </div>
        ) : currentDayFlights.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '80px', fontSize: '16px', fontWeight: '600', color: '#5A6880' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
            No hay vuelos programados para este día
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE3EE',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            overflowX: 'auto',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '800px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#F0F4FA', borderBottom: '2px solid #DDE3EE' }}>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#1A2233',
                    letterSpacing: '0.5px',
                  }}>HORA</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#1A2233',
                    letterSpacing: '0.5px',
                  }}>RUTA</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#1A2233',
                    letterSpacing: '0.5px',
                  }}>VUELO</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#1A2233',
                    letterSpacing: '0.5px',
                  }}>PUERTA</th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#1A2233',
                    letterSpacing: '0.5px',
                  }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {currentDayFlights.map((flight, idx) => {
                  const time = new Date(flight.departure_time).toLocaleTimeString('es-VE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const destination = `${flight.origin} → ${flight.destination}`.toUpperCase();
                  const remarkStatus = getRemarkStatus(flight.status);
                  const remarkColor = getRemarkColor(flight.status);

                  return (
                    <tr
                      key={flight.id}
                      style={{
                        backgroundColor: getRowBg(flight.status, idx),
                        borderBottom: '1px solid #E2E8F0',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0F172A',
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {time}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#1A2233',
                      }}>
                        {destination}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0066CC',
                        textAlign: 'center',
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {flight.id}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#009980',
                        textAlign: 'center',
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {(flight.gate || '—').toUpperCase()}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: remarkColor,
                      }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: `${remarkColor}15`,
                          border: `1px solid ${remarkColor}40`,
                          borderRadius: '6px',
                        }}>
                          {remarkStatus}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#5A6880',
          letterSpacing: '0.5px',
        }}>
          {autoRefresh && '🔄 Actualización automática cada 30 segundos'}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
