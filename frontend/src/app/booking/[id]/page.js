'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateBoardingPassPdf } from '@/lib/pdf-generator';
import { useLang } from '@/context/LanguageContext';
import { AIRPORTS } from '@/lib/airports';

const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));
const NODE_LABEL  = { 1:'Nodo 1 · América · MongoDB', 2:'Nodo 2 · Europa · SQL Server', 3:'Nodo 3 · Asia · SQL Server' };
const NODE_COLOR  = { 1:'#0066CC', 2:'#0088CC', 3:'#0099A0' };

// ── Contador 15 min ──────────────────────────────────────────
function ReservationTimer({ createdAt, t }) {
  const MINS = 15;
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => {
      const expiry = new Date(new Date(createdAt).getTime() + MINS * 60000);
      setSecs(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);

  const m = Math.floor(secs / 60), s = secs % 60;
  const pct = (secs / (MINS * 60)) * 100;

  if (secs === 0) return (
    <div style={{ padding:'14px 18px', borderRadius:10, background:'#FFEAEA', border:'1px solid #FFBBBB', marginBottom:20 }}>
      <div style={{ fontWeight:700, color:'#CC2233', marginBottom:2 }}>⚠️ {t('expired_msg')}</div>
    </div>
  );

  return (
    <div style={{ padding:'16px 18px', borderRadius:12, background:'#FFF6DC', border:'1px solid #FCD34D', marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:'0.78rem', color:'#92400E', fontWeight:700, marginBottom:2 }}>⏰ {t('reservation_expires')}</div>
          <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#D97706', fontFamily:'Outfit' }}>
            {m}:{s.toString().padStart(2,'0')}
          </div>
        </div>
        <div style={{ fontSize:'2rem' }}>🎟️</div>
      </div>
      <div style={{ height:6, background:'#FDE68A', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#D97706,#F59E0B)', borderRadius:3, transition:'width 1s linear' }}/>
      </div>
      <div style={{ fontSize:'0.72rem', color:'#92400E', marginTop:6 }}>
        {t('seat_freed_in')} {m}:{s.toString().padStart(2,'0')}
      </div>
    </div>
  );
}

// ── Campo de datos ───────────────────────────────────────────
function DataField({ label, value, big, color, mono }) {
  return (
    <div style={{ padding:'10px 14px' }}>
      <div style={{ fontSize:'0.58rem', color:'#8899AA', fontWeight:700, letterSpacing:'1px', marginBottom:4, textTransform:'uppercase' }}>{label}</div>
      <div style={{
        fontWeight: big ? 900 : 700,
        fontSize:   big ? '1.6rem' : '0.9rem',
        fontFamily: big ? 'Outfit' : mono ? 'monospace' : 'Inter',
        color:      color || '#1A2233',
        lineHeight: 1.1,
      }}>{value || '—'}</div>
    </div>
  );
}

// ── QR con datos del boleto embebidos (funciona sin red) ─────
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

function QRCodeComponent({ booking, passenger, flight, seat }) {
  const qrRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && qrRef.current && booking) {
      // QR contiene datos del boleto en texto — funciona sin conexión a red
      const qrData = buildQRText(booking, passenger, flight, seat);

      const generateQR = async () => {
        try {
          const QRCodeStyling = (await import('qr-code-styling')).default;
          const qrCode = new QRCodeStyling({
            width: 120,
            height: 120,
            data: qrData,
            margin: 4,
            type: 'canvas',
            qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
            imageOptions: { hideBackgroundDots: true, hideBackgroundCircles: true },
            dotsOptions: { color: '#1A2233', type: 'rounded' },
            backgroundOptions: { color: '#FFFFFF' },
          });
          if (qrRef.current) {
            qrRef.current.innerHTML = '';
            qrCode.append(qrRef.current);
          }
        } catch (err) {
          console.error('QR generation error:', err);
        }
      };
      generateQR();
    }
  }, [isClient, booking, passenger, flight, seat]);

  return (
    <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
      <div ref={qrRef} style={{ width: '120px', height: '120px' }} />
    </div>
  );
}

// ── Boarding pass principal ──────────────────────────────────
function BoardingPass({ booking, passenger, flight, seat, t }) {
  const dep = flight ? new Date(flight.departure_time) : null;
  const arr = flight ? new Date(flight.arrival_time)   : null;
  const isFirst = seat?.class === 'FIRST';
  const nodeCol = NODE_COLOR[booking.processed_by_node] || '#0066CC';

  const boarding = dep ? new Date(dep.getTime() - 30 * 60000) : null;
  const isConnection = flight?.route_type === 'CONNECTION' || !!flight?.connection_via;
  const stripe = isConnection ? '#2563EB' : (isFirst ? '#D97706' : '#10B981');

  return (
    <div style={{ 
      display: 'flex', width: '100%', maxWidth: '880px', margin: '0 auto 24px', 
      borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', 
      background: '#FFFFFF', position: 'relative',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* ── SECCIÓN PRINCIPAL (IZQUIERDA) ── */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Fondo del Mapa Mundial sutil */}
        <div style={{ 
          position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, 
          opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='%23000' d='M250,150 Q300,100 350,120 T450,150 T500,200 T450,300 T300,350 T200,300 Q150,250 250,150 Z' /%3E%3Cpath fill='%23000' d='M600,100 Q700,50 800,120 T900,250 T800,400 T700,450 T550,350 Q500,200 600,100 Z' /%3E%3C/svg%3E")`,
          backgroundSize: '120% auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'
        }}></div>

        {/* Header Verde/Azul */}
        <div style={{ 
          background: stripe, 
          height: '64px', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFF' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.5l-1.4 1.4c-.3.3-.2.8.1 1.1L8.5 12l-4.3 4.3-2.6-.9c-.4-.1-.8.1-1 .4l-.6.6c-.3.3-.1.8.3.9l4.5 1.8 1.8 4.5c.1.4.6.6.9.3l.6-.6c.2-.3.4-.6.3-1l-.9-2.6 4.3-4.3 2.8 6.1c.3.3.8.4 1.1.1l1.4-1.4c.3-.3.6-.8.5-1.1z"></path>
            </svg>
            <span style={{ fontWeight: 900, letterSpacing: '1px', fontSize: '1.2rem' }}>AEROLÍNEAS DISTRIBUIDAS</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px', opacity: 0.9 }}>
            BOARDING PASS
          </div>
        </div>

        {/* Contenido Principal */}
        <div style={{ padding: '28px 40px 24px 90px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
          
          {/* Fila Top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '20px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>PASSENGER</div>
              <div style={{ fontSize: '1.3rem', color: '#0F172A', fontWeight: 900, textTransform: 'uppercase' }}>{passenger?.full_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>FLIGHT</div>
              <div style={{ fontSize: '1.3rem', color: '#0F172A', fontWeight: 900 }}>{flight?.flight_number || '---'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>DATE</div>
              <div style={{ fontSize: '1.3rem', color: '#0F172A', fontWeight: 900, textTransform: 'uppercase' }}>
                {dep ? dep.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>SEAT</div>
              <div style={{ fontSize: '1.6rem', color: '#0F172A', fontWeight: 900, lineHeight: 1 }}>{seat?.seat_number || '--'}</div>
            </div>
          </div>

          {/* Gran Vuelo ORG -> DST */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', margin: '40px 0' }}>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0F172A', letterSpacing: '-1px' }}>{flight?.origin || '---'}</div>
            <div style={{ fontSize: '3rem', color: '#334155', transform: 'rotate(45deg)' }}>✈</div>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#0F172A', letterSpacing: '-1px' }}>{flight?.destination || '---'}</div>
          </div>

          {/* Fila Bot - Red details & distributed metadata */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '48px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#DC2626', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>GATE</div>
                <div style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: 900, lineHeight: 1 }}>{flight?.gate || '--'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#DC2626', fontWeight: 800, letterSpacing: '1px', marginBottom: 4 }}>BOARDING TIME</div>
                <div style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: 900, lineHeight: 1 }}>
                  {boarding ? boarding.toLocaleTimeString('es-BO', { hour: '2-digit', minute:'2-digit' }) : '--:--'}
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right', paddingLeft: 20, borderLeft: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>DISTRIBUTED NODE</div>
              <div style={{ fontSize: '0.9rem', color: nodeCol, fontWeight: 900 }}>{NODE_LABEL[booking?.processed_by_node]}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800, marginTop: '8px', textTransform: 'uppercase' }}>LAMPORT CLOCK</div>
              <div style={{ fontSize: '0.9rem', color: nodeCol, fontWeight: 900, fontFamily: 'monospace' }}>
                LC: {booking?.lamport_clock || 0}  |  VC: {booking?.vector_clock || '[0,0,0]'}
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Vertical Izquierdo */}
        <div style={{ 
          position: 'absolute', left: '26px', top: '90px', bottom: '26px', width: '38px',
          backgroundImage: 'repeating-linear-gradient(0deg, #1E293B, #1E293B 2px, transparent 2px, transparent 4px, #1E293B 4px, #1E293B 7px, transparent 7px, transparent 9px, #1E293B 9px, #1E293B 14px, transparent 14px, transparent 16px)',
          opacity: 0.85
        }}></div>

      </div>

      {/* ── LÍNEA PERFORADA ── */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: '23%', width: '12px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: 'translateX(50%)' }}>
        {Array.from({length: 14}).map((_, i) => (
          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F0F4FA', boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.05)' }}></div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: '23%', borderLeft: '2px dashed #CBD5E1', zIndex: 9 }}></div>

      {/* ── SECCIÓN STUB (DERECHA 23%) ── */}
      <div style={{ flex: '0 0 23%', display: 'flex', flexDirection: 'column', background: '#F8FAFC', position: 'relative' }}>
        
        {/* Header Stub Oscuro */}
        <div style={{ 
          background: '#1E293B', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
            {flight?.origin} <span style={{ fontWeight: 400, opacity: 0.8, fontSize:'1.2rem', margin:'0 4px', transform: 'rotate(45deg)', display:'inline-block' }}>✈</span> {flight?.destination}
          </div>
        </div>

        {/* Contenido Stub */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>PASSENGER</div>
              <div style={{ fontSize: '1rem', color: '#0F172A', fontWeight: 900, textTransform: 'uppercase' }}>{passenger?.full_name}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>FLIGHT</div>
                <div style={{ fontSize: '1rem', color: '#0F172A', fontWeight: 900 }}>{flight?.flight_number}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>SEAT</div>
                <div style={{ fontSize: '1.2rem', color: '#0F172A', fontWeight: 900 }}>{seat?.seat_number}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>DATE</div>
              <div style={{ fontSize: '1rem', color: '#0F172A', fontWeight: 900 }}>
                {dep ? dep.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '--'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>GATE</div>
                <div style={{ fontSize: '1.1rem', color: '#0F172A', fontWeight: 900 }}>{flight?.gate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>CLASS</div>
                <div style={{ fontSize: '1.1rem', color: stripe, fontWeight: 900 }}>{isFirst ? '1ST' : 'ECO'}</div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: '20px', alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <QRCodeComponent booking={booking} passenger={passenger} flight={flight} seat={seat} />
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#64748B', fontWeight: 700, letterSpacing:'2px' }}>
              PNR: {booking?.id}0{passenger?.id}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
function BookingDetailContent({ params }) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const { t, tz } = useLang();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled]   = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const doc = await generateBoardingPassPdf(data, tz);
      doc.save(`boarding-pass-${data.booking?.id}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generando PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  async function cancelBooking() {
    if (!confirm(t('cancel_booking') + '?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}`, { method:'DELETE' });
      const d   = await res.json();
      if (!res.ok) { setError(d.error); return; }
      setCancelled(true);
      setData(prev => ({ ...prev, booking: { ...prev.booking, status:'REFUNDED' } }));
    } finally { setCancelling(false); }
  }

  if (loading) return <div className="container section"><div className="shimmer" style={{ height:600, borderRadius:20 }}/></div>;
  if (!data?.booking) return <div className="container section"><p style={{ color:'#5A6880' }}>Reserva no encontrada.</p></div>;

  const { booking, passenger, flight, seat } = data;

  return (
    <div style={{ background:'#F0F4FA', minHeight:'100vh' }}>
      <div className="container section">
        <div style={{ maxWidth:700, margin:'0 auto' }}>

          {success && (
            <div style={{ padding:'14px 20px', borderRadius:12, background:'#DFFBF0',
              border:'1px solid #A8EDD4', color:'#0A9960', marginBottom:22, textAlign:'center', fontWeight:700, fontSize:'1rem' }}>
              ✅ ¡{booking.booking_type === 'PURCHASE' ? 'Compra' : 'Reserva'} confirmada exitosamente!
            </div>
          )}

          {booking.booking_type === 'RESERVATION' && booking.status === 'ACTIVE' && (
            <ReservationTimer createdAt={booking.created_at} t={t}/>
          )}

          {booking.booking_type === 'PURCHASE' ? (
            <BoardingPass booking={booking} passenger={passenger} flight={flight} seat={seat} t={t}/>
          ) : (
            <div style={{ background: '#FFF', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24 }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🕒</div>
              <h2 style={{ color: '#F59E0B', marginBottom: 8 }}>Asiento Reservado</h2>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1A2233', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 60, height: 60, borderRadius: 12, background: '#FEF3C7', border: '2px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309', fontSize: '1.4rem' }}>
                  {seat?.seat_number}
                </div>
              </div>
              <p style={{ color: '#64748B', maxWidth: 400, margin: '0 auto', fontSize: '0.9rem' }}>
                Tienes un asiento reservado para {(passenger?.full_name || '').toUpperCase()}. Tienes un límite de tiempo para completar la compra.
              </p>
            </div>
          )}

          {/* Botones */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyItems: 'center', justifyContent: 'center', marginBottom:16 }}>
            {booking.booking_type === 'PURCHASE' && (
              <button onClick={downloadPdf} disabled={downloading} className="btn btn-primary" style={{ padding:'11px 24px', opacity: downloading ? 0.7 : 1 }}>
                {downloading ? '⏳ Generando PDF...' : `📄 ${t('download_pdf')}`}
              </button>
            )}
            {booking.booking_type === 'RESERVATION' && booking.status === 'ACTIVE' && !cancelled && (
              <>
                <button onClick={() => window.location.href = `/booking?flight=${flight.id}&seat=${seat.id}&origin=${flight.origin}`} className="btn btn-primary" style={{ padding:'11px 24px' }}>
                  💳 Comprar Ahora
                </button>
                <button onClick={cancelBooking} className="btn btn-danger" disabled={cancelling} style={{ padding:'11px 24px' }}>
                  {cancelling ? '...' : '🗑 ' + t('cancel_booking')}
                </button>
              </>
            )}
          </div>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'#FFEAEA',
              border:'1px solid #FFBBBB', color:'#CC2233', fontSize:'0.85rem', marginBottom:12 }}>
              {error}
            </div>
          )}

          {cancelled && (
            <div style={{ padding:'14px 18px', borderRadius:10, background:'#FFF6DC', border:'1px solid #FCD34D', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'#D97706' }}>✓ Reserva cancelada</div>
              <div style={{ fontSize:'0.82rem', color:'#92400E', marginTop:4 }}>
                ⏳ {t('seat_freed_in')} 15:00 minutos
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage({ params }) {
  return (
    <Suspense fallback={<div className="container section"><div className="shimmer" style={{height:400,borderRadius:20}}/></div>}>
      <BookingDetailContent params={params}/>
    </Suspense>
  );
}
