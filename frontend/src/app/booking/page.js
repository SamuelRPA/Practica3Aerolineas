'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLang } from '@/context/LanguageContext';

const REGIONS = [
  {
    code: 'AMERICA', label: 'América', flag: '🌎', color: '#0066CC', bg: '#EEF4FF',
    node: 'Nodo 1 · MongoDB Atlas',
    countries: [
      { flag: '🇺🇸', name: 'Estados Unidos', airports: ['ATL — Atlanta', 'LAX — Los Ángeles', 'DFW — Dallas'] },
      { flag: '🇧🇷', name: 'Brasil',          airports: ['SAO — São Paulo'] },
    ],
  },
  {
    code: 'EUROPA', label: 'Europa', flag: '🌍', color: '#0088CC', bg: '#E8F4FF',
    node: 'Nodo 2 · SQL Server',
    countries: [
      { flag: '🇬🇧', name: 'Reino Unido',  airports: ['LON — Londres'] },
      { flag: '🇫🇷', name: 'Francia',      airports: ['PAR — París'] },
      { flag: '🇩🇪', name: 'Alemania',     airports: ['FRA — Fráncfort'] },
      { flag: '🇹🇷', name: 'Turquía',      airports: ['IST — Estambul'] },
      { flag: '🇪🇸', name: 'España',       airports: ['MAD — Madrid'] },
      { flag: '🇳🇱', name: 'Países Bajos', airports: ['AMS — Ámsterdam'] },
    ],
  },
  {
    code: 'ASIA', label: 'Asia / Medio Oriente', flag: '🌏', color: '#0099A0', bg: '#E6F9F8',
    node: 'Nodo 3 · SQL Server',
    countries: [
      { flag: '🇨🇳', name: 'China',                airports: ['PEK — Pekín', 'CAN — Guangzhou'] },
      { flag: '🇦🇪', name: 'Emiratos Árabes',      airports: ['DXB — Dubái'] },
      { flag: '🇯🇵', name: 'Japón',                airports: ['TYO — Tokio'] },
      { flag: '🇸🇬', name: 'Singapur',             airports: ['SIN — Singapur'] },
    ],
  },
];

function RegionPicker({ onSelect }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A2233', marginBottom: 4 }}>
        🌐 ¿Desde dónde reservas?
      </h1>
      <p style={{ color: '#5A6880', fontSize: '0.85rem', marginBottom: 6 }}>
        El nodo más cercano a tu región procesará la reserva.
      </p>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: '#EEF4FF',
        border: '1px solid #BFDBFE', marginBottom: 20, fontSize: '0.78rem', color: '#1E40AF' }}>
        💡 Si tu región difiere del nodo del vuelo → <strong>operación cross-node</strong> (lectura entre nodos).
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {REGIONS.map(r => (
          <button key={r.code} onClick={() => onSelect(r.code)}
            style={{ display: 'grid', gridTemplateColumns: 'auto 1fr',
              gap: 14, padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
              textAlign: 'left', width: '100%', background: '#FFFFFF',
              border: `1px solid ${r.color}40`, outline: 'none' }}>
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{r.flag}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1A2233', marginBottom: 2 }}>
                {r.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: r.color, fontWeight: 700, marginBottom: 4 }}>
                {r.node}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.countries.map(c => (
                  <span key={c.name} style={{ fontSize: '0.68rem', color: '#5A6880' }}>
                    {c.flag} {c.name} ({c.airports.map(a => a.split('—')[0].trim()).join(', ')})
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BookingContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const { t, tz } = useLang();

  const flight_id   = parseInt(sp.get('flight_id'));
  const seat_id     = parseInt(sp.get('seat_id'));
  const seat_number = sp.get('seat_number');
  const seatClass   = sp.get('class');
  const price_usd   = parseFloat(sp.get('price_usd') || '0');
  const price_bs    = (price_usd * 6.96).toFixed(2);

  // Mapear timezone a region interna
  const getRegionFromTz = (timezone) => {
    if (timezone.startsWith('America/')) return 'AMERICA';
    if (timezone.startsWith('Europe/')) return 'EUROPA';
    if (timezone.startsWith('Asia/') || timezone.startsWith('Australia/')) return 'ASIA';
    return 'AMERICA';
  };

  const [region,   setRegion]  = useState(() => getRegionFromTz(tz));

  // Sincronizar región si el usuario cambia el timezone en el Navbar
  useEffect(() => {
    setRegion(getRegionFromTz(tz));
  }, [tz]);

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [passport, setPassport] = useState('');
  const [type,     setType]     = useState('PURCHASE');
  const [loading,  setLoading]  = useState(false);
  const [searching, setSearching] = useState(false);
  const [error,    setError]    = useState('');
  const submittingRef = useRef(false); // bloqueo inmediato antes del re-render

  const isFirst = seatClass === 'FIRST';

  // Nodo del vuelo según aeropuerto de origen (simplificado en frontend)
  const FLIGHT_NODE_LABEL = (() => {
    const origin = sp.get('origin') || '';
    if (['ATL','LAX','DFW','SAO'].includes(origin)) return { n: 1, label: 'Nodo 1 · América' };
    if (['LON','PAR','FRA','IST','MAD','AMS'].includes(origin)) return { n: 2, label: 'Nodo 2 · Europa' };
    if (['PEK','DXB','TYO','SIN','CAN'].includes(origin)) return { n: 3, label: 'Nodo 3 · Asia' };
    return null;
  })();

  const selectedRegion = REGIONS.find(r => r.code === region);
  const regionNode = region === 'AMERICA' ? 1 : region === 'EUROPA' ? 2 : region === 'ASIA' ? 3 : null;
  const isCrossNode = FLIGHT_NODE_LABEL && regionNode && regionNode !== FLIGHT_NODE_LABEL.n;

  async function handlePassportBlur() {
    if (!passport.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/passengers/passport/${encodeURIComponent(passport)}`);
      if (res.ok) {
        const passenger = await res.json();
        if (passenger) {
          setFullName(passenger.full_name || '');
          setEmail(passenger.email || '');
          // Feedback visual opcional
        }
      }
    } catch(e) {
      // Ignorar errores del autofill
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return; // bloqueo síncrono instantáneo
    if (!fullName.trim() || !email.trim()) { setError('Nombre y email son requeridos.'); return; }
    if (!passport.trim()) { setError('El número de pasaporte es requerido.'); return; }
    submittingRef.current = true;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id, seat_id, booking_type: type,
          full_name: fullName, email, passport,
          passenger_region: region,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al procesar'); return; }
      router.push(`/booking/${data.booking_id}?success=1`);
    } catch { setError('Error de conexión. Intenta nuevamente.');
    } finally { setLoading(false); submittingRef.current = false; }
  }

  if (!flight_id || !seat_id) return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
      <h2 style={{ color: '#1A2233', marginBottom: 8 }}>Parámetros incompletos</h2>
      <p style={{ color: '#5A6880' }}>Por favor selecciona un vuelo y asiento primero.</p>
    </div>
  );

  return (
    <div className="container section">
      {/* Paso 1: elegir región */}
      {!region ? (
        <RegionPicker onSelect={setRegion} />
      ) : (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* Cabecera con región seleccionada */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <button onClick={() => setRegion(null)} disabled={loading}
              style={{ background: 'none', border: '1px solid #DDE3EE', borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer', color: loading ? '#BCC5D6' : '#5A6880',
                padding: '6px 10px', fontSize: '0.82rem', opacity: loading ? 0.5 : 1 }}>
              ← Cambiar región
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20, background: selectedRegion.bg,
              border: `1px solid ${selectedRegion.color}40` }}>
              <span>{selectedRegion.flag}</span>
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: selectedRegion.color }}>
                {selectedRegion.label} — {selectedRegion.nodes}
              </span>
            </div>
          </div>

          {/* Banner cross-node si aplica */}
          {isCrossNode && (
            <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 18,
              background: 'linear-gradient(135deg, #EEF4FF, #E8F4FF)',
              border: '1px solid #BFDBFE' }}>
              <div style={{ fontWeight: 800, color: '#0066CC', fontSize: '0.88rem', marginBottom: 4 }}>
                ⚡ Operación Cross-Node detectada
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.6 }}>
                Tu nodo (<strong>{selectedRegion.label}</strong>) leerá el asiento desde el <strong>{FLIGHT_NODE_LABEL.label}</strong>.
                Esto demuestra la comunicación entre nodos del sistema distribuido.
              </div>
            </div>
          )}

          <h1 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1A2233', marginBottom: 4 }}>
            {type === 'PURCHASE' ? `💳 ${t('book_title')}` : `📌 ${t('reserve_title')}`}
          </h1>
          <p style={{ color: '#5A6880', marginBottom: 22 }}>Completa tus datos para confirmar</p>

          {/* Resumen del vuelo */}
          <div style={{
            background: isFirst ? 'linear-gradient(135deg,#FEF3C7,#FDE68A)' : 'linear-gradient(135deg,#DBEAFE,#BFDBFE)',
            borderRadius: 16, padding: '18px 22px', marginBottom: 18,
            border: `1px solid ${isFirst ? '#FCD34D' : '#BFDBFE'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1A2233' }}>Vuelo #{flight_id}</div>
                <div style={{ color: isFirst ? '#92400E' : '#1E40AF', fontSize: '0.82rem', marginTop: 3 }}>
                  {t('seat')}: <strong style={{ fontSize: '1.1rem' }}>{seat_number}</strong>
                  {' · '}{isFirst ? '✦ Primera Clase' : '● Económica'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: isFirst ? '#D97706' : '#0066CC', fontFamily: 'Outfit' }}>
                  USD {price_usd}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#5A6880' }}>Bs. {price_bs}</div>
              </div>
            </div>
          </div>

          {/* Tipo operación */}
          <div className="glass" style={{ padding: '18px', marginBottom: 18 }}>
            <div style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', marginBottom: 12 }}>
              TIPO DE OPERACIÓN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { value: 'PURCHASE',    icon: '💳', label: t('purchase'),    desc: 'Pago inmediato' },
                { value: 'RESERVATION', icon: '📌', label: t('reservation'), desc: 'Sin pago ahora · 15 min' },
              ].map(opt => (
                <button key={opt.value} onClick={() => !loading && setType(opt.value)} disabled={loading} style={{
                  padding: '14px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left',
                  border: `2px solid ${type === opt.value ? '#0066CC' : '#DDE3EE'}`,
                  background: type === opt.value ? '#EEF4FF' : '#FFFFFF',
                  color: '#1A2233', transition: 'all 0.15s', opacity: loading ? 0.6 : 1,
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#5A6880', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="glass" style={{ padding: '22px' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
                👤 {t('full_name')}
              </label>
              <input className="input" type="text" placeholder="Juan Carlos Pérez"
                value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}/>
            </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px' }}>
                  📧 {t('email')}
                </label>
                {searching && <span style={{ fontSize: '0.65rem', color: '#0066CC' }}>Buscando pasajero...</span>}
              </div>
              <input className="input" type="email" placeholder="correo@ejemplo.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}/>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: '0.68rem', color: '#5A6880', fontWeight: 700, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
                🛂 PASAPORTE
              </label>
              <input className="input" type="text" placeholder="AB1234567"
                value={passport} onChange={e => setPassport(e.target.value)} onBlur={handlePassportBlur}
                required disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}/>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFEAEA', border: '1px solid #FFBBBB',
                color: '#CC2233', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>
            )}

            {loading && (
              <div style={{ padding:'12px 14px', borderRadius:8, background:'#EEF4FF',
                border:'1px solid #BFDBFE', color:'#1E40AF', fontSize:'0.82rem',
                marginBottom:14, textAlign:'center', fontWeight:700 }}>
                ⏳ Procesando tu {type === 'PURCHASE' ? 'compra' : 'reserva'}... no cierres esta página
              </div>
            )}
            <button type="submit" className={`btn ${type === 'PURCHASE' ? 'btn-primary' : 'btn-gold'}`}
              style={{ width: '100%', padding: '14px', fontSize: '1rem',
                opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
                pointerEvents: loading ? 'none' : 'auto' }}
              disabled={loading}>
              {loading
                ? `⏳ Procesando...`
                : type === 'PURCHASE'
                  ? `${t('confirm_buy')} — USD ${price_usd}`
                  : t('confirm_res')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="container section"><div className="shimmer" style={{ height: 400, borderRadius: 16 }} /></div>}>
      <BookingContent />
    </Suspense>
  );
}
