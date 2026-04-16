'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';

export default function Navbar() {
  const pathname          = usePathname();
  const { lang, setLang, tz, setTz, t } = useLang();
  const [showLang, setShowLang] = useState(false);
  
  const TIMEZONES = [
    { id: 'America/Los_Angeles', label: 'Los Ángeles', flag: '🇺🇸' },
    { id: 'America/New_York',    label: 'Nueva York',  flag: '🇺🇸' },
    { id: 'America/Mexico_City', label: 'C. de México',flag: '🇲🇽' },
    { id: 'America/Bogota',      label: 'Bogotá',      flag: '🇨🇴' },
    { id: 'America/La_Paz',      label: 'Bolivia',     flag: '🇧🇴' },
    { id: 'America/Santiago',    label: 'Santiago',    flag: '🇨🇱' },
    { id: 'America/Buenos_Aires',label: 'Buenos Aires',flag: '🇦🇷' },
    { id: 'America/Sao_Paulo',   label: 'São Paulo',   flag: '🇧🇷' },
    { id: 'Europe/London',       label: 'Londres',     flag: '🇬🇧' },
    { id: 'Europe/Madrid',       label: 'Madrid',      flag: '🇪🇸' },
    { id: 'Europe/Paris',        label: 'París',       flag: '🇫🇷' },
    { id: 'Europe/Berlin',       label: 'Berlín',      flag: '🇩🇪' },
    { id: 'Europe/Istanbul',     label: 'Estambul',    flag: '🇹🇷' },
    { id: 'Europe/Moscow',       label: 'Moscú',       flag: '🇷🇺' },
    { id: 'Asia/Dubai',          label: 'Dubái',       flag: '🇦🇪' },
    { id: 'Asia/Shanghai',       label: 'Pekín',       flag: '🇨🇳' },
    { id: 'Asia/Tokyo',          label: 'Tokio',       flag: '🇯🇵' },
    { id: 'Australia/Sydney',    label: 'Sídney',      flag: '🇦🇺' },
  ];
  
  const [showTz, setShowTz] = useState(false);
  const [liveTime, setLiveTime] = useState('');
  
  const currentTzObj = TIMEZONES.find(x => x.id === tz) || TIMEZONES[4]; // Bolivia is default

  useEffect(() => {
    const updateTime = () => setLiveTime(new Date().toLocaleTimeString('es-BO', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateTime();
    const iv = setInterval(updateTime, 1000);
    return () => clearInterval(iv);
  }, [tz]);

  const NAV = [
    { href: '/',          key: 'nav_home',      icon: '🏠' },
    { href: '/flights',   key: 'nav_flights',   icon: '✈️' },
    { href: '/routes',    key: 'nav_routes',    icon: '🗺️' },
    { href: '/dashboard', key: 'nav_dashboard', icon: '📊' },
  ];

  const currentLang = LANGUAGES.find(l => l.code === lang);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#FFFFFF', borderBottom: '1px solid #DDE3EE',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64, gap: 12 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="18" fill="#EEF4FF" stroke="#0066CC" strokeWidth="1.5"/>
            <path d="M27 19 L15 12 L13 14 L18 18 L9 18 L8 19 L9 20 L18 20 L13 24 L15 26 Z" fill="#0066CC"/>
            <line x1="8" y1="19" x2="5" y2="19" stroke="#0066CC" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '0.95rem', color: '#1A2233' }}>Aerolíneas</div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.6rem', color: '#0066CC', letterSpacing: '2px' }}>RAFAEL PABÓN</div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
          {NAV.map(l => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 8, fontSize: '0.85rem',
                fontWeight: active ? 700 : 500,
                color: active ? '#0066CC' : '#5A6880',
                background: active ? '#EEF4FF' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
                borderBottom: active ? '2px solid #0066CC' : '2px solid transparent',
              }}>
                <span>{l.icon}</span>{t(l.key)}
              </Link>
            );
          })}
        </div>

        {/* Derecha: idioma + reservar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Selector de idioma */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLang(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8,
              background: showLang ? '#EEF4FF' : 'transparent',
              border: '1.5px solid #DDE3EE', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, color: '#1A2233',
              transition: 'all 0.15s',
            }}>
              <span>{currentLang?.flag}</span>
              <span>{currentLang?.label}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
            </button>

            {showLang && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#FFFFFF', border: '1px solid #DDE3EE',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden', minWidth: 140, zIndex: 200,
              }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                    background: lang === l.code ? '#EEF4FF' : '#FFFFFF',
                    fontSize: '0.85rem', fontWeight: lang === l.code ? 700 : 400,
                    color: lang === l.code ? '#0066CC' : '#1A2233',
                    transition: 'background 0.1s', textAlign: 'left',
                  }}>
                    <span>{l.flag}</span><span>{l.name}</span>
                    {lang === l.code && <span style={{ marginLeft: 'auto', color: '#0066CC' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector de Reloj Mundial */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowTz(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8,
              background: showTz ? '#EEF4FF' : '#F8FAFC',
              border: '1.5px solid #DDE3EE', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, color: '#1A2233',
              transition: 'all 0.15s', minWidth: 160, justifyContent: 'space-between'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <span>{currentTzObj.flag}</span>
                <span style={{ fontFamily:'monospace', fontSize:'0.85rem', color:'#0066CC', fontWeight:900, width: 62, textAlign:'left' }}>
                  {liveTime || '--:--:--'}
                </span>
                <span style={{ color:'#5A6880', fontSize:'0.75rem', width: 65, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentTzObj.label}
                </span>
              </div>
              <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
            </button>

            {showTz && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#FFFFFF', border: '1px solid #DDE3EE',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden', overflowY: 'auto', maxHeight: '350px',
                minWidth: 160, zIndex: 200,
              }}>
                {TIMEZONES.map(tOption => (
                  <button key={tOption.id} onClick={() => { setTz(tOption.id); setShowTz(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                    background: tz === tOption.id ? '#EEF4FF' : '#FFFFFF',
                    fontSize: '0.85rem', fontWeight: tz === tOption.id ? 700 : 400,
                    color: tz === tOption.id ? '#0066CC' : '#1A2233',
                    transition: 'background 0.1s', textAlign: 'left',
                  }}>
                    <span>{tOption.flag}</span><span>{tOption.label}</span>
                    {tz === tOption.id && <span style={{ marginLeft: 'auto', color: '#0066CC' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <Link href="/flights" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8,
            background: '#0066CC', color: '#FFFFFF',
            fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(0,102,204,0.3)', transition: 'all 0.2s',
          }}>
            ✈ {t('nav_book')}
          </Link>
        </div>
      </div>

      {/* Cierra dropdown al hacer click fuera */}
      {(showLang || showTz) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => { setShowLang(false); setShowTz(false); }} />
      )}
    </nav>
  );
}
