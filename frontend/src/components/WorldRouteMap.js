'use client';
import { useMemo, useState } from 'react';
import { AIRPORTS } from '@/lib/airports';

const AP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

// SVG canvas
const VW = 800, VH = 360, PAD = 40;
const MW = VW - PAD * 2, MH = VH - PAD * 2;

function toXY(lat, lng) {
  return {
    x: PAD + ((lng + 180) / 360) * MW,
    y: PAD + ((90 - lat) / 180) * MH,
  };
}

// Approximate continent ellipses (verified against each airport's coordinates)
const LAND = [
  { cx:200, cy:110, rx:95,  ry:75  }, // North America
  { cx:280, cy:205, rx:45,  ry:70  }, // South America
  { cx:420, cy:100, rx:50,  ry:50  }, // Europe
  { cx:435, cy:195, rx:55,  ry:85  }, // Africa
  { cx:525, cy:145, rx:65,  ry:45  }, // Middle East / West Asia
  { cx:565, cy: 78, rx:160, ry:52  }, // Russia / North Asia
  { cx:640, cy:162, rx:75,  ry:50  }, // South / SE Asia
  { cx:685, cy:118, rx:20,  ry:25  }, // Japan
  { cx:692, cy:232, rx:55,  ry:35  }, // Oceania
];

export default function WorldRouteMap({ origin, destination }) {
  const [hovCode, setHovCode] = useState(null);

  const oAp = AP[origin];
  const dAp = AP[destination];

  const route = useMemo(() => {
    if (!oAp || !dAp) return null;
    const o = toXY(oAp.latitude, oAp.longitude);
    const d = toXY(dAp.latitude, dAp.longitude);
    const mx = (o.x + d.x) / 2;
    const dist = Math.hypot(d.x - o.x, d.y - o.y);
    const cy = (o.y + d.y) / 2 - dist * 0.28;
    return { o, d, mx, cy };
  }, [origin, destination, oAp, dAp]);

  const hovAp = hovCode ? AP[hovCode] : null;

  const nodeColor = (node) =>
    node === 1 ? '#0066CC' : node === 2 ? '#0088CC' : '#0099A0';

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden',
      border: '1px solid #DDE3EE', background: '#EFF6FF' }}>

      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="wm-ocean" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F0F9FF"/>
            <stop offset="100%" stopColor="#DBEAFE"/>
          </linearGradient>
          <filter id="wm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <style>{`
            @keyframes wm-draw {
              from { stroke-dashoffset: 1400; }
              to   { stroke-dashoffset: 0; }
            }
            @keyframes wm-pulse {
              0%,100% { opacity:.25; r:11; }
              50%      { opacity:.5;  r:15; }
            }
            .wm-route { stroke-dasharray:1400; stroke-dashoffset:1400; animation:wm-draw 2.2s ease-out forwards; }
            .wm-pulse { animation:wm-pulse 2s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Ocean */}
        <rect width={VW} height={VH} fill="url(#wm-ocean)"/>

        {/* Lat/Lng grid */}
        {[-60,-30,0,30,60].map(lat => {
          const { y } = toXY(lat, 0);
          return <g key={lat}>
            <line x1={PAD} y1={y} x2={VW-PAD} y2={y} stroke="#BFDBFE" strokeWidth="0.6"/>
            <text x={PAD-4} y={y+3} fontSize="7" fill="#93C5FD" textAnchor="end">{lat}°</text>
          </g>;
        })}
        {[-120,-60,0,60,120].map(lng => {
          const { x } = toXY(0, lng);
          return <g key={lng}>
            <line x1={x} y1={PAD} x2={x} y2={VH-PAD} stroke="#BFDBFE" strokeWidth="0.6"/>
            <text x={x} y={VH-PAD+11} fontSize="7" fill="#93C5FD" textAnchor="middle">{lng}°</text>
          </g>;
        })}

        {/* Continents */}
        {LAND.map((l, i) => (
          <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
            fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="0.8" opacity="0.75"/>
        ))}

        {/* Route glow + arc */}
        {route && <>
          <path d={`M${route.o.x},${route.o.y} Q${route.mx},${route.cy} ${route.d.x},${route.d.y}`}
            stroke="#0066CC" strokeWidth="8" fill="none" opacity="0.12"/>
          <path className="wm-route"
            d={`M${route.o.x},${route.o.y} Q${route.mx},${route.cy} ${route.d.x},${route.d.y}`}
            stroke="#0066CC" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </>}

        {/* Airport dots */}
        {AIRPORTS.map(ap => {
          const { x, y } = toXY(ap.latitude, ap.longitude);
          const isOrig = ap.code === origin;
          const isDest = ap.code === destination;
          const isHL   = isOrig || isDest;
          const isHov  = hovCode === ap.code;
          const col    = isOrig ? '#0066CC' : isDest ? '#CC2233' : nodeColor(ap.assigned_node);
          return (
            <g key={ap.code} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovCode(ap.code)}
              onMouseLeave={() => setHovCode(null)}>
              {isHL && <circle cx={x} cy={y} r={12} fill={col} className="wm-pulse"/>}
              {isHov && !isHL && <circle cx={x} cy={y} r={8} fill={col} opacity="0.2"/>}
              <circle cx={x} cy={y} r={isHL ? 6 : isHov ? 5 : 4}
                fill={isHL ? col : '#FFFFFF'} stroke={col} strokeWidth={isHL ? 2 : 1.5}
                filter={isHL ? 'url(#wm-glow)' : undefined}/>
              <text x={x} y={y - (isHL ? 10 : 7)} textAnchor="middle"
                fontSize={isHL ? 10 : 8} fontWeight={isHL ? 800 : 600}
                fill={isHL ? '#1A2233' : '#374151'}>
                {ap.code}
              </text>
            </g>
          );
        })}

        {/* City labels for active airports */}
        {route && oAp && (
          <text x={route.o.x} y={route.o.y + 18} textAnchor="middle"
            fontSize="9" fontWeight="800" fill="#0066CC">{oAp.city}</text>
        )}
        {route && dAp && (
          <text x={route.d.x} y={route.d.y + 18} textAnchor="middle"
            fontSize="9" fontWeight="800" fill="#CC2233">{dAp.city}</text>
        )}
      </svg>

      {/* Hover tooltip */}
      {hovAp && (
        <div style={{ position:'absolute', top:8, right:8, background:'rgba(26,34,51,0.92)',
          color:'#FFFFFF', padding:'6px 12px', borderRadius:8, fontSize:'0.72rem',
          pointerEvents:'none', backdropFilter:'blur(4px)' }}>
          <strong>{hovAp.code}</strong> — {hovAp.city}, {hovAp.country}
          <div style={{ opacity:.7, marginTop:2 }}>🕐 {hovAp.timezone}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ position:'absolute', bottom:8, left:10, display:'flex', gap:10, flexWrap:'wrap' }}>
        {[['#0066CC','🌎 Nodo 1'],['#0088CC','🌍 Nodo 2'],['#0099A0','🌏 Nodo 3']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4,
            background:'rgba(255,255,255,0.85)', padding:'2px 8px', borderRadius:10,
            fontSize:'0.65rem', fontWeight:700, color:c }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:c }}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
