'use client';
import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { AIRPORTS } from '@/lib/airports';
import { DIRECT_PAIRS, isDirect, findPath } from '@/lib/routeData';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Nodo → color vivo
const NODE_COLOR = { 1: '#00FFCC', 2: '#60CFFF', 3: '#FFD700' };
const NODE_LABEL = { 1: 'América', 2: 'Europa', 3: 'Asia' };

// coords: [lon, lat]
const COORDS = Object.fromEntries(AIRPORTS.map(a => [a.code, [a.longitude, a.latitude]]));

export default function WorldMap() {
  const [from, setFrom]     = useState(null); // primer aeropuerto
  const [to, setTo]         = useState(null); // segundo aeropuerto (opcional)
  const [hovered, setHover] = useState(null);

  // Rutas activas cuando hay selección
  const activeRoute = useMemo(() => {
    if (!from || !to) return null;
    if (isDirect(from, to)) return { type: 'DIRECT', path: [from, to] };
    const path = findPath(from, to);
    return path ? { type: 'CONNECTING', path } : null;
  }, [from, to]);

  function handleMarkerClick(code) {
    if (!from) {
      setFrom(code); setTo(null);
    } else if (code === from) {
      setFrom(null); setTo(null);
    } else if (!to) {
      setTo(code);
    } else {
      setFrom(code); setTo(null);
    }
  }

  const fromAirport = from ? AIRPORTS.find(a => a.code === from) : null;
  const toAirport   = to   ? AIRPORTS.find(a => a.code === to)   : null;

  // Segmentos a dibujar en el mapa
  const segments = useMemo(() => {
    if (activeRoute) {
      return activeRoute.path.slice(0, -1).map((code, i) => ({
        key:   `${code}-${activeRoute.path[i + 1]}`,
        from:  COORDS[code],
        to:    COORDS[activeRoute.path[i + 1]],
        type:  activeRoute.type,
      }));
    }
    return [];
  }, [activeRoute]);

  const idleLines = useMemo(() => {
    if (from && !to) {
      // mostrar solo rutas desde/hacia el from seleccionado
      return DIRECT_PAIRS.filter(([a, b]) => a === from || b === from);
    }
    return DIRECT_PAIRS;
  }, [from, to]);

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden',
      background: '#06111F', border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 0 60px rgba(0,255,204,0.06)' }}>

      {/* SVG filter para glow */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [15, 20], scale: 145 }}
        style={{ width: '100%', height: 520 }}
      >
        <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={6}>

          {/* Base del mapa */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#0B1E30"
                  stroke="#1A3550"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover:   { fill: '#122740', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Líneas idle (todas las directas, o solo del from seleccionado) */}
          {!activeRoute && idleLines.map(([a, b]) => {
            const isFrom = a === from || b === from;
            return (
              <Line
                key={`idle-${a}-${b}`}
                from={COORDS[a]}
                to={COORDS[b]}
                stroke={isFrom ? 'rgba(0,255,204,0.6)' : 'rgba(255,255,255,0.09)'}
                strokeWidth={isFrom ? 1.5 : 0.6}
                strokeLinecap="round"
              />
            );
          })}

          {/* Líneas de ruta activa */}
          {segments.map(seg => (
            <Line
              key={`active-${seg.key}`}
              from={seg.from}
              to={seg.to}
              stroke={seg.type === 'DIRECT' ? '#00FFCC' : '#FFD700'}
              strokeWidth={seg.type === 'DIRECT' ? 2.5 : 2}
              strokeLinecap="round"
              strokeDasharray={seg.type === 'CONNECTING' ? '6 4' : undefined}
              style={{ filter: `drop-shadow(0 0 6px ${seg.type === 'DIRECT' ? '#00FFCC' : '#FFD700'})` }}
            />
          ))}

          {/* Aeropuertos */}
          {AIRPORTS.map(airport => {
            const color      = NODE_COLOR[airport.assigned_node];
            const isSelected = airport.code === from || airport.code === to;
            const isVia      = activeRoute?.type === 'CONNECTING'
              && activeRoute.path.includes(airport.code)
              && airport.code !== from && airport.code !== to;
            const isHov      = hovered === airport.code;
            const r          = isSelected ? 9 : isVia ? 7 : isHov ? 7 : 5;

            return (
              <Marker
                key={airport.code}
                coordinates={COORDS[airport.code]}
                onClick={() => handleMarkerClick(airport.code)}
                onMouseEnter={() => setHover(airport.code)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Halo animado para aeropuertos seleccionados */}
                {isSelected && (
                  <circle r={16} fill="none" stroke={color}
                    strokeWidth={1} opacity={0.4}
                    style={{ animation: 'pulse-ring 1.8s ease-out infinite' }}
                  />
                )}
                {isVia && (
                  <circle r={12} fill="none" stroke="#FFD700"
                    strokeWidth={1} opacity={0.5}
                    style={{ animation: 'pulse-ring 2s ease-out infinite' }}
                  />
                )}

                {/* Dot principal */}
                <circle
                  r={r}
                  fill={isVia ? '#FFD700' : color}
                  stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                  strokeWidth={isSelected ? 2 : 0.8}
                  style={{
                    cursor:  'pointer',
                    filter:  `drop-shadow(0 0 ${isSelected ? 10 : isHov ? 8 : 4}px ${isVia ? '#FFD700' : color})`,
                    transition: 'all 0.2s ease',
                  }}
                />

                {/* Etiqueta del código */}
                <text
                  textAnchor="middle"
                  y={-13}
                  style={{
                    fill:          isSelected ? color : (isHov ? '#ffffff' : 'rgba(255,255,255,0.75)'),
                    fontSize:       isSelected ? 10 : 8,
                    fontWeight:     isSelected ? 700 : 500,
                    fontFamily:    'Outfit, sans-serif',
                    pointerEvents: 'none',
                    letterSpacing: '0.5px',
                    filter:        isSelected ? `drop-shadow(0 0 4px ${color})` : 'none',
                  }}
                >
                  {airport.code}
                </text>
              </Marker>
            );
          })}

        </ZoomableGroup>
      </ComposableMap>

      {/* Leyenda y estado de selección */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(6,17,31,0.85)', borderRadius: 8,
            padding: '4px 10px', backdropFilter: 'blur(8px)',
            border: `1px solid ${NODE_COLOR[n]}30` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%',
              background: NODE_COLOR[n], boxShadow: `0 0 6px ${NODE_COLOR[n]}` }} />
            <span style={{ fontSize: '0.7rem', color: NODE_COLOR[n], fontWeight: 600 }}>
              {NODE_LABEL[n]}
            </span>
          </div>
        ))}
      </div>

      {/* Panel de ruta activa */}
      {(from || to) && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(6,17,31,0.92)', border: '1px solid rgba(0,255,204,0.25)',
          backdropFilter: 'blur(20px)', borderRadius: 14,
          padding: '14px 24px', minWidth: 280, maxWidth: 420,
          boxShadow: '0 0 30px rgba(0,255,204,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: to ? 10 : 0 }}>
            {/* Origen */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: NODE_COLOR[fromAirport?.assigned_node] || '#00FFCC',
                fontFamily: 'Outfit', lineHeight: 1, filter: `drop-shadow(0 0 4px ${NODE_COLOR[fromAirport?.assigned_node] || '#00FFCC'})` }}>
                {from}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {fromAirport?.city}
              </div>
            </div>

            {/* Flecha / segmentos */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              {!to && (
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                  Selecciona destino
                </div>
              )}
              {to && activeRoute && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {activeRoute.path.slice(1, -1).map(via => (
                    <span key={via} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <svg width="18" height="8" viewBox="0 0 18 8">
                        <path d="M0 4 L14 4 M10 1 L14 4 L10 7" stroke="#FFD700" strokeWidth="1.5" fill="none"/>
                      </svg>
                      <span style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 700,
                        background: 'rgba(255,215,0,0.12)', padding: '2px 6px', borderRadius: 4,
                        border: '1px solid rgba(255,215,0,0.3)' }}>{via}</span>
                    </span>
                  ))}
                  <svg width="18" height="8" viewBox="0 0 18 8">
                    <path d="M0 4 L14 4 M10 1 L14 4 L10 7"
                      stroke={activeRoute.type === 'DIRECT' ? '#00FFCC' : '#FFD700'}
                      strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10,
                    fontWeight: 700, letterSpacing: '0.5px',
                    background: activeRoute.type === 'DIRECT' ? 'rgba(0,255,204,0.15)' : 'rgba(255,215,0,0.15)',
                    color:      activeRoute.type === 'DIRECT' ? '#00FFCC' : '#FFD700',
                    border: `1px solid ${activeRoute.type === 'DIRECT' ? 'rgba(0,255,204,0.35)' : 'rgba(255,215,0,0.35)'}`,
                  }}>
                    {activeRoute.type === 'DIRECT' ? 'DIRECTO' : 'CON ESCALA'}
                  </span>
                </div>
              )}
              {to && !activeRoute && (
                <div style={{ fontSize: '0.7rem', color: '#cf222e' }}>Sin ruta disponible</div>
              )}
            </div>

            {/* Destino */}
            {to && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: NODE_COLOR[toAirport?.assigned_node] || '#60CFFF',
                  fontFamily: 'Outfit', lineHeight: 1, filter: `drop-shadow(0 0 4px ${NODE_COLOR[toAirport?.assigned_node] || '#60CFFF'})` }}>
                  {to}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {toAirport?.city}
                </div>
              </div>
            )}
          </div>

          {/* Botón limpiar */}
          <button
            onClick={() => { setFrom(null); setTo(null); }}
            style={{ width: '100%', marginTop: 8, padding: '6px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)',
              fontSize: '0.7rem', cursor: 'pointer', pointerEvents: 'all' }}>
            ✕ Limpiar selección
          </button>
        </div>
      )}

      {/* Hint inicial */}
      {!from && !to && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(6,17,31,0.8)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '8px 18px', pointerEvents: 'none',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Haz clic en un aeropuerto para explorar rutas · Scroll para zoom
          </span>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
