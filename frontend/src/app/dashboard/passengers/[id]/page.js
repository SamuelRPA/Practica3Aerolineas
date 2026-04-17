'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PassengerHistoryPage() {
  const { id } = useParams();
  const [passenger, setPassenger] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Cargar datos del pasajero
        const pres = await fetch(`/api/passengers/${id}`);
        const pdata = await pres.json();
        setPassenger(pdata);

        // 2. Cargar sus reservas
        const bres = await fetch(`/api/bookings?passenger_id=${id}`);
        const bdata = await bres.json();
        const rawBookings = bdata.data || [];

        // 3. Enriquecer con info de vuelo (en paralelo)
        const enriched = await Promise.all(rawBookings.map(async (b) => {
          try {
            const fres = await fetch(`/api/flights/${b.flight_id}`);
            const fdata = await fres.json();
            return { ...b, flight: fdata.flight };
          } catch (e) {
            return b;
          }
        }));

        setBookings(enriched);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#8899AA' }}>Cargando historial del pasajero...</div>;
  if (!passenger) return <div style={{ padding: 60, textAlign: 'center' }}>Pasajero no encontrado</div>;

  return (
    <div style={{ background: '#F0F4FA', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/dashboard/passengers" style={{ color: '#0066CC', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, display: 'inline-block', marginBottom: 20 }}>
          ← Volver a Búsqueda
        </Link>

        <div style={{ background: '#FFF', borderRadius: 18, padding: 30, border: '1px solid #DDE3EE', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, background: '#F0F4FA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              👤
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1A2233', margin: 0 }}>{passenger.full_name}</h1>
              <p style={{ color: '#5A6880', margin: '4px 0 0' }}>{passenger.email} · Pasaporte: <strong>{passenger.passport || 'No registrado'}</strong></p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, borderTop: '1px solid #F0F4FA', paddingTop: 20 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8899AA', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>TOTAL VUELOS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0066CC' }}>{bookings.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8899AA', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>ID SISTEMA</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1A2233' }}>#{passenger.id}</div>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A2233', marginBottom: 16 }}>Historial de Reservas y Compras</h2>

        {bookings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ background: '#FFF', borderRadius: 14, border: '1px solid #DDE3EE', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8899AA', marginBottom: 2 }}>VUELO</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0066CC' }}>#{b.flight_id}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1A2233', fontSize: '1rem' }}>
                      {b.flight?.origin || '---'} → {b.flight?.destination || '---'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#5A6880', marginTop: 2 }}>
                      {b.flight ? new Date(b.flight.departure_time).toLocaleString('es') : '---'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: b.status === 'ACTIVE' ? (b.booking_type === 'PURCHASE' ? '#DFFBF0' : '#FFF6DC') : '#FFEAEA', 
                                border: `1px solid ${b.status === 'ACTIVE' ? (b.booking_type === 'PURCHASE' ? '#A8EDD4' : '#FCD34D') : '#FFBBBB'}`,
                                padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, color: b.status === 'ACTIVE' ? (b.booking_type === 'PURCHASE' ? '#0A9960' : '#D97706') : '#CC2233' }}>
                    {b.status === 'ACTIVE' ? (b.booking_type === 'PURCHASE' ? 'COMPRADO' : 'RESERVADO') : 'CANCELADO'}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1A2233', marginTop: 6 }}>
                    ${b.amount_paid_usd || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', background: '#FFF', borderRadius: 14, border: '1px solid #DDE3EE', color: '#8899AA' }}>
            Este pasajero aún no tiene registros de vuelos.
          </div>
        )}
      </div>
    </div>
  );
}
