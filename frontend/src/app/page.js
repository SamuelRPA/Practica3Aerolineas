'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AIRPORTS } from '@/lib/airports';
import { useLang } from '@/context/LanguageContext';
import AviationMap from '@/components/AviationMap';

function fmtTime(date, tz) {
  return new Intl.DateTimeFormat('es', {
    hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:tz, hour12:false,
  }).format(date);
}

export default function HomePage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [tab, setTab] = useState('ida');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [cls, setCls] = useState('ECONOMY');
  const [err, setErr] = useState('');
  
  const [now, setNow] = useState(null);
  const [selectedClk, setSelectedClk] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setNow(new Date());
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (!origin || !dest) { 
      setErr(lang === 'en' ? 'Please select origin and destination.' : lang === 'fr' ? 'Veuillez sélectionner origine et destination.' : lang === 'pt' ? 'Selecione origem e destino.' : lang === 'de' ? 'Bitte Herkunft und Ziel wählen.' : 'Por favor selecciona origen y destino.'); 
      return; 
    }
    if (origin === dest) { 
      setErr(lang === 'en' ? 'Origin and destination must be different.' : 'El origen y destino deben ser distintos.'); 
      return; 
    }
    setErr('');
    const p = new URLSearchParams({ origin, destination: dest });
    if (date) p.set('date', date);
    p.set('class', cls);
    router.push(`/flights?${p.toString()}`);
  }

  if (!now) return null;

  // Arrays estáticos convertidos a dinámicos en base a `lang` para soportar todos los idiomas al vuelo
  const WORLD_CLOCKS = [
    { tz:'America/New_York',  label: lang==='en'?'New York':lang==='fr'?'New York':'Nueva York', flag:'🇺🇸', codes:['ATL','LAX','DFW'] },
    { tz:'America/Sao_Paulo', label: 'São Paulo', flag:'🇧🇷', codes:['SAO'] },
    { tz:'Europe/London',     label: lang==='en'?'London':lang==='fr'?'Londres':'Londres', flag:'🇬🇧', codes:['LON'] },
    { tz:'Europe/Paris',      label: lang==='en'?'Paris':lang==='fr'?'Paris':'París', flag:'🇫🇷', codes:['PAR','FRA','MAD','AMS'] },
    { tz:'Europe/Istanbul',   label: lang==='en'?'Istanbul':lang==='fr'?'Istanbul':'Estambul', flag:'🇹🇷', codes:['IST'] },
    { tz:'Asia/Dubai',        label: lang==='en'?'Dubai':lang==='fr'?'Dubaï':'Dubái', flag:'🇦🇪', codes:['DXB'] },
    { tz:'Asia/Tokyo',        label: lang==='en'?'Tokyo':lang==='fr'?'Tokyo':'Tokio', flag:'🇯🇵', codes:['TYO','PEK','SIN','CAN'] },
  ];

  const AO = AIRPORTS.map(a => {
    // Traducciones rápidas de ciudades para el selector
    let city = a.city;
    if (a.city === 'London') city = lang==='en'?'London':'Londres';
    if (a.city === 'Tokyo') city = lang==='en'?'Tokyo':'Tokio';
    if (a.city === 'Paris') city = lang==='en'?'Paris':'París';
    return { value: a.code, label: `${a.code} — ${city}` };
  });

  const DESTINATIONS = [
    { code:'ATL', city: 'Atlanta', country: lang==='en'?'USA':'EE.UU.', flag:'🇺🇸' },
    { code:'LON', city: lang==='en'?'London':'Londres', country: lang==='en'?'England':'Inglaterra', flag:'🇬🇧' },
    { code:'TYO', city: lang==='en'?'Tokyo':'Tokio', country: lang==='en'?'Japan':'Japón', flag:'🇯🇵' },
    { code:'DXB', city: lang==='en'?'Dubai':'Dubái', country: lang==='en'?'UAE':'EAU', flag:'🇦🇪' },
    { code:'PAR', city: lang==='en'?'Paris':'París', country: lang==='en'?'France':'Francia', flag:'🇫🇷' },
    { code:'SAO', city: 'São Paulo', country: lang==='en'?'Brazil':'Brasil', flag:'🇧🇷' },
    { code:'LAX', city: lang==='en'?'Los Angeles':'Los Ángeles', country: lang==='en'?'USA':'EE.UU.', flag:'🇺🇸' },
    { code:'SIN', city: lang==='en'?'Singapore':'Singapur', country: lang==='en'?'Singapore':'Singapur', flag:'🇸🇬' },
  ];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ── HERO SECTION WITH PROFESSIONAL MAP ── */}
      <section style={{ position: 'relative', width: '100%', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <AviationMap />
        </div>
        
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0.45) 0%, rgba(248, 250, 252, 0.95) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1100px', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '6px 16px', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', letterSpacing: '0.5px' }}>
              AEROLÍNEAS RAFAEL PABÓN
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900', color: '#0F172A', textAlign: 'center', lineHeight: '1.1', marginBottom: '16px', fontFamily: '"Outfit", sans-serif' }}>
            {t('hero_title')}
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#475569', textAlign: 'center', maxWidth: '600px', marginBottom: '40px', lineHeight: '1.6' }}>
            {t('hero_sub')}
          </p>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '900px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)', border: '1px solid #E2E8F0' }}>
            
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              {[{ id: 'ida', key: 'tab_oneway' }, { id: 'vuelta', key: 'tab_return' }].map(tb => (
                <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                  padding: '12px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontWeight: '700', fontSize: '0.9rem', color: tab === tb.id ? '#0F172A' : '#94A3B8',
                  borderBottom: tab === tb.id ? '2px solid #0F172A' : '2px solid transparent',
                  transition: 'all 0.2s', fontFamily: '"Inter", sans-serif'
                }}>
                  {t(tb.key) || tb.id}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'end' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('origin')}
                </label>
                <select value={origin} onChange={e => setOrigin(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
                  <option value="">{t('from_where') || 'Selecciona...'}</option>
                  {AO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('destination')}
                </label>
                <select value={dest} onChange={e => setDest(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
                  <option value="">{t('to_where') || 'Selecciona...'}</option>
                  {AO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('date')}
                </label>
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.9rem', fontWeight: '500', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('class')}
                </label>
                <select value={cls} onChange={e => setCls(e.target.value)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
                  <option value="ECONOMY">{t('economy')}</option>
                  <option value="FIRST">{t('first_class')}</option>
                </select>
              </div>

              <button type="submit" style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '45px', transition: 'background 0.2s', marginTop: '16px' }} onMouseEnter={e => e.currentTarget.style.background = '#1E293B'} onMouseLeave={e => e.currentTarget.style.background = '#0F172A'}>
                {t('search_btn')}
              </button>
            </form>
            
            {err && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.85rem' }}>
                ⚠️ {err}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── RELOJ MUNDIAL INTERACTIVO ── */}
      <section style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #F1F5F9', padding: '18px 24px 14px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#F8FAFC', borderRadius: '14px', padding: '12px 22px', border: '1px solid #E2E8F0', minWidth: '220px' }}>
            <span style={{ fontSize: '2.2rem' }}>{WORLD_CLOCKS[selectedClk].flag}</span>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.5px' }}>
                {lang === 'en' ? 'LOCAL TIME' : 'HORA LOCAL'} · {WORLD_CLOCKS[selectedClk].label.toUpperCase()}
              </div>
              <div style={{ fontSize: '1.7rem', fontWeight: '900', fontFamily: 'monospace', color: '#0F172A', letterSpacing: '1px', lineHeight: '1.1' }}>
                {now ? fmtTime(now, WORLD_CLOCKS[selectedClk].tz) : '--:--:--'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
            {WORLD_CLOCKS.map((clk, i) => {
              const sel = i === selectedClk;
              return (
                <button key={clk.tz} onClick={() => setSelectedClk(i)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', border: sel ? '1px solid #0F172A' : '1px solid #E2E8F0', background: sel ? '#0F172A' : '#F8FAFC', color: sel ? '#FFFFFF' : '#475569', fontWeight: '600', fontSize: '0.8rem', fontFamily: '"Inter", sans-serif' }}>
                  <span>{clk.flag}</span>
                  <span>{clk.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DESTINOS POPULARES ── */}
      <section style={{ backgroundColor: '#F8FAFC', padding: '64px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
            {lang === 'en' ? 'Popular Destinations' : lang === 'fr' ? 'Destinations Populaires' : lang === 'pt' ? 'Destinos Populares' : lang === 'de' ? 'Beliebte Ziele' : 'Destinos Populares'}
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', marginBottom: '36px' }}>
            {lang === 'en' ? 'Click a destination to jump straight to booking' : 'Explora nuestros vuelos más solicitados y compra rápido'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {DESTINATIONS.map(d => (
              <button key={d.code} onClick={() => { setDest(d.code); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', fontFamily: '"Inter", sans-serif' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F172A'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{d.flag}</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>{d.city}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>{d.country}</div>
                <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '800', marginTop: '8px', letterSpacing: '1px' }}>{d.code}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFO SECTION ── */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '80px 24px', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0F172A' }}>
              🌐
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
              {lang === 'en' ? 'Distributed Architecture' : 'Arquitectura Distribuida'}
            </h3>
            <p style={{ color: '#64748B', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {lang === 'en' ? 'Global consistency with Lamport and vector clocks running over 3 worldwide servers.' : 'Garantizamos consistencia global operando sobre 3 servidores distribuidos utilizando relojes de Lamport y vectoriales.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0F172A' }}>
              ⚡
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
              {lang === 'en' ? 'Routing Algorithms' : 'Algoritmos de Enrutamiento'}
            </h3>
            <p style={{ color: '#64748B', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {lang === 'en' ? 'Optimized paths via Dijkstra and Held-Karp (TSP) to calculate fastest and cheapest routes in real time.' : 'Utilizamos algoritmos como Dijkstra y Held-Karp (TSP) para calcular las rutas más rápidas o económicas entre nuestros nodos.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0F172A' }}>
              📊
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
              {lang === 'en' ? 'Financial Dashboard' : 'Dashboard Gerencial'}
            </h3>
            <p style={{ color: '#64748B', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {lang === 'en' ? 'Real-time metrics, node sync health, multi-server performance, and revenue overview mapped across nodes.' : 'Visualice métricas en tiempo real con monitores premium del estado global sincronizado, ventas comerciales y flujos lógicos.'}
            </p>
            <Link href="/dashboard" style={{ color: '#10B981', fontWeight: '600', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
              {lang === 'en' ? 'Access Control Panel' : 'Acceder al panel gerencial'} <span style={{ fontSize: '1.2em' }}>→</span>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
