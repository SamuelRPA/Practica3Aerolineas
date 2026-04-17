'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLang } from '@/context/LanguageContext';

function FastScaleBooking() {
  const sp = useSearchParams();
  const router = useRouter();
  const { t, tz } = useLang();

  const legsParam = sp.get('legs');
  const legIds = legsParam ? legsParam.split(',').map(Number) : [];
  const cls   = sp.get('cls') || 'ECONOMY';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [data, setData] = useState([]); // [{ flight, seat }, ...]

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [passport, setPassport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  // Mapear timezone a region interna
  const getRegionFromTz = (timezone) => {
    if (timezone.startsWith('America/')) return 'AMERICA';
    if (timezone.startsWith('Europe/')) return 'EUROPA';
    if (timezone.startsWith('Asia/') || timezone.startsWith('Australia/')) return 'ASIA';
    return 'AMERICA';
  };

  const [region, setRegion]     = useState(() => getRegionFromTz(tz));

  // Sincronizar región si el usuario cambia el timezone en el Navbar
  useEffect(() => {
    setRegion(getRegionFromTz(tz));
  }, [tz]);

  useEffect(() => {
    if (legIds.length < 2) {
      setError('Faltan parámetros de los vuelos para la escala.');
      setLoading(false);
      return;
    }

    Promise.all(legIds.map(id => fetch(`/api/flights/${id}`).then(r => r.json())))
      .then(results => {
        if (results.some(r => r.error)) {
          setError('Error al encontrar detalles de los vuelos.');
          return;
        }
        
        const validatedLegs = [];
        for (const res of results) {
          const s = res.seats?.find(s => s.status === 'AVAILABLE' && s.class === cls);
          if (!s) {
            setError(`No hay asientos disponibles en clase ${cls} para uno o más trayectos.`);
            return;
          }
          validatedLegs.push({ flight: res.flight, seat: s });
        }
        setData(validatedLegs);
      })
      .catch(e => setError('Error de conexión.'))
      .finally(() => setLoading(false));

  }, [legsParam, cls]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) { setError('Nombre y correo son requeridos'); return; }
    if (!passport.trim()) { setError('Pasaporte es requerido'); return; }
    
    setSubmitting(true);
    setError(null);

    try {
      const fetchPromises = data.map(leg => 
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flight_id: leg.flight.id, seat_id: leg.seat.id, booking_type: 'PURCHASE',
            full_name: fullName, email, passport, passenger_region: region
          })
        })
      );

      const responses = await Promise.all(fetchPromises);
      if (responses.some(r => !r.ok)) {
        throw new Error('Al menos uno de los tramos no pudo confirmarse. Intenta de nuevo.');
      }

      router.push(`/dashboard`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function handleEmailBlur() {
    if (!email.trim() || !email.includes('@')) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/bookings/passenger/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.passenger) {
          setFullName(data.passenger.full_name || '');
          setPassport(data.passenger.passport || '');
        }
      }
    } catch(e) { /* ignore */ }
    finally { setSearching(false); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ Consolidando escala global...</div>;
  if (error) return <div style={{ padding: 60, textAlign: 'center', color: '#DC2626' }}>⚠️ {error}</div>;
  if (!data || data.length === 0) return null;

  const totalPrice = data.reduce((sum, leg) => sum + leg.seat.price_usd, 0);

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
          Conexión Rápida Asignada
        </h1>
        <p style={{ color: '#475569', marginBottom: 24, fontSize: '0.9rem' }}>
          Hemos pre-asignado automáticamente asientos disponibles para tus trayectos con escala, optimizando el algoritmo.
        </p>

        {data.map((leg, idx) => (
          <div key={idx} style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, marginBottom: idx === data.length - 1 ? 24 : 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8B5CF6', letterSpacing: '1px', marginBottom: 8 }}>
              TRAMO {idx + 1}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                  {leg.flight.origin} → {leg.flight.destination}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                  🛫 {new Date(leg.flight.departure_time).toLocaleString('es')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>{leg.seat.seat_number}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>USD {leg.seat.price_usd}</div>
              </div>
            </div>
          </div>
        ))}

        <form onSubmit={handleSubmit} style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>Confirmar Vuelo Multidestino</h2>
          
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>NOMBRE COMPLETO</label>
            <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} disabled={submitting}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>CORREO ELECTRÓNICO</label>
              {searching && <span style={{ fontSize: '0.65rem', color: '#8B5CF6' }}>Buscando...</span>}
            </div>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={handleEmailBlur}
              disabled={submitting}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>PASAPORTE</label>
            <input required type="text" value={passport} onChange={e => setPassport(e.target.value)} disabled={submitting}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none' }} />
          </div>
          
          <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
              📍 UBICACIÓN DETECTADA
            </div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
              {region === 'AMERICA' ? '🌎 América (Nodo 1)' : region === 'EUROPA' ? '🌍 Europa (Nodo 2)' : '🌏 Asia (Nodo 3)' }
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 6 }}>
              Los asientos se apartarán a través de este nodo basado en tu configuración de reloj actual.
            </p>
          </div>

          <button type="submit" disabled={submitting}
            style={{ width: '100%', background: '#0F172A', color: '#FFF', padding: 14, borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Procesando en nodos...' : `Comprar ambos boletos — USD ${totalPrice}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ScaleBookingPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <FastScaleBooking />
    </Suspense>
  );
}
