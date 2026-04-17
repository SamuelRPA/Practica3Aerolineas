'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LanguageContext';
import { AIRPORTS } from '@/lib/airports';

const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

// ── QR con datos del boleto embebidos (funciona sin red) ──────
function buildQRText(booking, passenger, flight, seat) {
  if (!booking) return 'AEROLÍNEAS DISTRIBUIDAS';
  const dep = flight ? new Date(flight.departure_time) : null;
  const arr = flight ? new Date(flight.arrival_time) : null;
  const boarding = dep ? new Date(dep.getTime() - 30 * 60000) : null;
  const fmt = (d) => d ? d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const fmtDate = (d) => d ? d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '--';
  return [
    'AEROLÍNEAS DISTRIBUIDAS',
    `PNR: ${booking.id}0${passenger?.id || ''}`,
    `PASAJERO: ${(passenger?.full_name || 'N/A').toUpperCase()}`,
    `PASAPORTE: ${passenger?.passport || 'N/A'}`,
    `VUELO: ${flight?.flight_number || '---'} | ${fmtDate(dep)}`,
    `RUTA: ${flight?.origin || '---'} → ${flight?.destination || '---'}`,
    `SALIDA: ${fmt(dep)} | LLEGADA: ${fmt(arr)}`,
    `ASIENTO: ${seat?.seat_number || '--'} | CLASE: ${seat?.class === 'FIRST' ? 'PRIMERA' : 'ECONÓMICA'}`,
    `PUERTA: ${flight?.gate || '--'} | ABORDAJE: ${fmt(boarding)}`,
    `ESTADO: ${booking.booking_type === 'PURCHASE' ? 'COMPRADO' : 'RESERVADO'}`,
  ].join('\n');
}

function QRCodeComponent({ booking, passenger, flight, seat, size = 100 }) {
  const qrRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isClient && qrRef.current && booking) {
      const qrData = buildQRText(booking, passenger, flight, seat);
      const generateQR = async () => {
        try {
          const QRCodeStyling = (await import('qr-code-styling')).default;
          const qrCode = new QRCodeStyling({
            width: size, height: size, data: qrData, margin: 4, type: 'canvas',
            qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
            imageOptions: { hideBackgroundDots: true },
            dotsOptions: { color: '#1A2233', type: 'rounded' },
            backgroundOptions: { color: '#FFFFFF' },
          });
          if (qrRef.current) {
            qrRef.current.innerHTML = '';
            qrCode.append(qrRef.current);
          }
        } catch (err) { console.error('QR error:', err); }
      };
      generateQR();
    }
  }, [isClient, booking, passenger, flight, seat, size]);

  return (
    <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
      <div ref={qrRef} style={{ width: `${size}px`, height: `${size}px` }} />
    </div>
  );
}

// ── Tarjeta de boleto ─────────────────────────────────────────
function TicketCard({ booking, expanded, onExpand }) {
  const flight    = booking.flight    || {};
  const passenger = booking.passenger || {};
  const seat      = booking.seat      || {};

  const dep = flight.departure_time ? new Date(flight.departure_time) : null;
  const arr = flight.arrival_time   ? new Date(flight.arrival_time)   : null;
  const boarding = dep ? new Date(dep.getTime() - 30 * 60000) : null;

  const isFirst     = seat.class === 'FIRST';
  const isPurchase  = booking.booking_type === 'PURCHASE';
  const bgGradient  = isFirst
    ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
    : 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)';
  const accentColor = isFirst ? '#D97706' : '#0A9960';

  const durH = (dep && arr) ? ((arr - dep) / 3600000).toFixed(1) : null;

  return (
    <div
      onClick={() => onExpand(expanded ? null : booking.id)}
      style={{
        background: '#FFFFFF',
        border: `2px solid ${accentColor}40`,
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s',
        transform: expanded ? 'scale(1.01)' : 'scale(1)',
        boxShadow: expanded ? '0 20px 40px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => !expanded && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)')}
      onMouseLeave={e => !expanded && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)')}
    >
      {/* Header */}
      <div style={{
        background: bgGradient,
        padding: '20px 24px',
        borderBottom: `3px solid ${accentColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5A6880', fontWeight: '700', letterSpacing: '1px', marginBottom: '4px' }}>
            {isFirst ? '✦ PRIMERA CLASE' : 'ECONOMÍA'}
            {!isPurchase && <span style={{ marginLeft: 8, color: '#D97706', background: '#FEF9C3', padding: '2px 8px', borderRadius: 20, fontSize: '0.6rem' }}>RESERVA</span>}
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '900', color: '#1A2233', fontFamily: 'Outfit' }}>
            {flight.flight_number || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#5A6880', fontWeight: '700', marginBottom: '4px' }}>
            {booking.status === 'ACTIVE' ? 'ACTIVO' : booking.status}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: accentColor }}>
            {isPurchase ? '✈ Comprado' : '⏰ Reservado'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* Pasajero */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8899AA', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>PASAJERO</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1A2233', textTransform: 'uppercase' }}>
              {passenger.full_name || '—'}
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', color: '#0066CC', opacity: 0.2 }}>✈</div>
        </div>

        {/* Ruta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: '12px',
          marginBottom: '16px',
          border: `1px solid ${accentColor}20`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#8899AA', fontWeight: '700', marginBottom: '4px' }}>SALIDA</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1A2233', fontFamily: 'Outfit' }}>{flight.origin || '—'}</div>
            <div style={{ fontSize: '0.7rem', color: '#5A6880', marginTop: '2px', fontWeight: '600' }}>
              {dep ? dep.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '50px', height: '2px', background: `linear-gradient(90deg, ${accentColor}80, ${accentColor}20)` }} />
            <div style={{ fontSize: '0.75rem', color: accentColor, fontWeight: '700' }}>
              {durH ? `${durH}h` : '—'}
            </div>
            <div style={{ width: '50px', height: '2px', background: `linear-gradient(90deg, ${accentColor}20, ${accentColor}80)` }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#8899AA', fontWeight: '700', marginBottom: '4px' }}>LLEGADA</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1A2233', fontFamily: 'Outfit' }}>{flight.destination || '—'}</div>
            <div style={{ fontSize: '0.7rem', color: '#5A6880', marginTop: '2px', fontWeight: '600' }}>
              {arr ? arr.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'ASIENTO', value: seat.seat_number || '—', big: true, color: accentColor },
            { label: 'PUERTA', value: flight.gate || '—', big: true },
            { label: 'FECHA', value: dep ? dep.toLocaleDateString('es', { day: '2-digit', month: '2-digit' }) : '—' },
          ].map(({ label, value, big, color }) => (
            <div key={label} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #DDE3EE' }}>
              <div style={{ fontSize: '0.6rem', color: '#8899AA', fontWeight: '700', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: big ? '1.5rem' : '0.9rem', fontWeight: '900', color: color || '#1A2233' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ paddingTop: '16px', borderTop: '1px solid #DDE3EE', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* QR Section */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: `1px solid ${accentColor}20` }}>
              <QRCodeComponent booking={booking} passenger={passenger} flight={flight} seat={seat} size={110} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: '#8899AA', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Código de Embarque
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1A2233', marginBottom: '4px', fontFamily: 'monospace' }}>
                  PNR: {booking.id}0{passenger.id}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '8px' }}>
                  📱 Escanea para ver info del vuelo sin conexión
                </div>
                {boarding && (
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: accentColor }}>
                    🚪 Abordaje: {boarding.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {passenger.passport && (
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px' }}>
                    🛂 Pasaporte: {passenger.passport}
                  </div>
                )}
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href={`/booking/${booking.id}`} style={{
                flex: '1', minWidth: '130px', padding: '10px 16px',
                background: '#0066CC', color: '#FFFFFF', textDecoration: 'none',
                borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', textAlign: 'center',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.target.style.backgroundColor = '#0052A3'}
                onMouseLeave={e => e.target.style.backgroundColor = '#0066CC'}
              >
                Ver Boarding Pass
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario de búsqueda ────────────────────────────────────
function SearchForm({ onSearch, loading }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) onSearch(email.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: '1', minWidth: '260px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5A6880', marginBottom: '8px' }}>
          Correo electrónico del pasajero
        </label>
        <input
          id="wallet-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          required
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #DDE3EE',
            borderRadius: '10px',
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            color: '#1A2233',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#0066CC'}
          onBlur={e => e.target.style.borderColor = '#DDE3EE'}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '12px 28px',
          background: loading ? '#8899AA' : '#0066CC',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '0.95rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.2s',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => !loading && (e.target.style.background = '#0052A3')}
        onMouseLeave={e => !loading && (e.target.style.background = '#0066CC')}
      >
        {loading ? '⏳ Buscando…' : '🔍 Buscar Boletos'}
      </button>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function WalletPage() {
  const { t } = useLang();
  const [tickets, setTickets]     = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [error, setError]         = useState('');

  const loadTickets = async (email) => {
    setLoading(true);
    setError('');
    setSearchEmail(email);
    setSearched(false);
    setTickets([]);
    try {
      // 1. Obtener bookings del pasajero
      const res = await fetch(`/api/bookings?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('Error al buscar reservas');
      const data = await res.json();
      const rawBookings = (data.data || []).filter(b => b.status === 'ACTIVE');

      if (rawBookings.length === 0) {
        setTickets([]);
        setSearched(true);
        return;
      }

      // 2. Enriquecer cada booking con flight, passenger, seat
      const enriched = await Promise.all(
        rawBookings.map(async (b) => {
          try {
            const detailRes = await fetch(`/api/bookings/${b.id}`);
            if (!detailRes.ok) return { ...b, flight: null, passenger: null, seat: null };
            const detail = await detailRes.json();
            return {
              ...b,
              flight:    detail.flight    || null,
              passenger: detail.passenger || null,
              seat:      detail.seat      || null,
            };
          } catch {
            return { ...b, flight: null, passenger: null, seat: null };
          }
        })
      );

      // 3. Ordenar: compras primero, luego por fecha más reciente
      enriched.sort((a, b) => {
        if (a.booking_type !== b.booking_type) {
          return a.booking_type === 'PURCHASE' ? -1 : 1;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setTickets(enriched);
    } catch (err) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const purchases  = tickets.filter(t => t.booking_type === 'PURCHASE');
  const reservations = tickets.filter(t => t.booking_type === 'RESERVATION');

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #DDE3EE', padding: '32px', marginTop: '64px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0F172A', marginBottom: '8px', fontFamily: 'Outfit' }}>
            🎫 Mi Cartera de Boletos
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#5A6880', marginBottom: '24px' }}>
            Busca tus boletos por correo electrónico. El QR de cada boleto funciona <strong>sin conexión a internet</strong>.
          </p>
          <SearchForm onSearch={loadTickets} loading={loading} />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>

        {/* Error */}
        {error && (
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: '#FFEAEA', border: '1px solid #FFBBBB', color: '#CC2233', marginBottom: '24px', fontWeight: '600' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer" style={{ height: '380px', borderRadius: '16px' }} />
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {!loading && searched && tickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 32px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #DDE3EE' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>✈</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
              No se encontraron boletos
            </h2>
            <p style={{ color: '#5A6880', marginBottom: '24px', fontSize: '0.95rem' }}>
              No hay reservas activas para <strong>{searchEmail}</strong>
            </p>
            <Link href="/flights" style={{
              display: 'inline-block', padding: '12px 28px', background: '#0066CC',
              color: '#FFFFFF', textDecoration: 'none', borderRadius: '8px', fontWeight: '700',
            }}>
              Buscar Vuelos
            </Link>
          </div>
        )}

        {/* Sin búsqueda aún */}
        {!loading && !searched && (
          <div style={{ textAlign: 'center', padding: '60px 32px', background: '#FFFFFF', borderRadius: '16px', border: '1px dashed #DDE3EE', opacity: 0.8 }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📧</div>
            <p style={{ color: '#5A6880', fontSize: '1rem' }}>
              Ingresa tu correo para ver tus boletos
            </p>
          </div>
        )}

        {/* Boletos — COMPRAS */}
        {!loading && purchases.length > 0 && (
          <>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0A9960', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#0A9960' }} />
              BOLETOS COMPRADOS ({purchases.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {purchases.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  booking={ticket}
                  expanded={expandedId === ticket.id}
                  onExpand={setExpandedId}
                />
              ))}
            </div>
          </>
        )}

        {/* Boletos — RESERVAS */}
        {!loading && reservations.length > 0 && (
          <>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D97706', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#D97706' }} />
              RESERVAS PENDIENTES ({reservations.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {reservations.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  booking={ticket}
                  expanded={expandedId === ticket.id}
                  onExpand={setExpandedId}
                />
              ))}
            </div>
          </>
        )}

        {/* Stats */}
        {!loading && tickets.length > 0 && (
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {[
              { label: 'TOTAL BOLETOS', value: tickets.length, color: '#0066CC' },
              { label: 'COMPRADOS', value: purchases.length, color: '#0A9960' },
              { label: 'RESERVAS', value: reservations.length, color: '#D97706' },
              {
                label: 'PRÓXIMO VUELO',
                value: purchases.length > 0 && purchases[0].flight
                  ? new Date(purchases[0].flight.departure_time).toLocaleDateString('es', { day: '2-digit', month: 'short' })
                  : '—',
                color: '#1A2233',
              },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1px solid #DDE3EE', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#8899AA', fontWeight: '700', marginBottom: '8px' }}>{label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color, fontFamily: 'Outfit' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
