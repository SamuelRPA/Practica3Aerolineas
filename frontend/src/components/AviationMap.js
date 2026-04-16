'use client';
import { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup
} from 'react-simple-maps';
import { AIRPORTS } from '@/lib/airports';
import { DIRECT_PAIRS } from '@/lib/routeData';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const ADJUSTED_COORDS = {
  LON: [-3.0, 53.5], 
  PAR: [2.5, 47.0],
  AMS: [6.0, 54.0],
  FRA: [11.0, 48.0],
  MAD: [-4.0, 40.0],
  IST: [28.0, 41.0]
};

const FLIGHT_ANIMATIONS = [
  { id: 'f1', from: 'ATL', to: 'LON', duration: 10000, offset: 0 },
  { id: 'f2', from: 'LON', to: 'DXB', duration: 8000, offset: 2000 },
  { id: 'f3', from: 'DXB', to: 'SIN', duration: 9000, offset: 4000 },
  { id: 'f4', from: 'SAO', to: 'MAD', duration: 12000, offset: 1000 },
  { id: 'f5', from: 'PEK', to: 'FRA', duration: 11000, offset: 3000 },
  { id: 'f6', from: 'DFW', to: 'PAR', duration: 10500, offset: 5000 },
  { id: 'f7', from: 'FRA', to: 'IST', duration: 4000, offset: 0 },
  { id: 'f8', from: 'ATL', to: 'SAO', duration: 9500, offset: 2500 }
];

export default function AviationMap() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    setMounted(true);
    let start = Date.now();
    const iv = setInterval(() => {
      setTime(Date.now() - start);
    }, 40);
    return () => clearInterval(iv);
  }, []);

  if (!mounted) return <div style={{ height: '100%', background: '#F8FAFC' }} />;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#E2E8F0' }}>
      <ComposableMap 
        projection="geoMercator" 
        projectionConfig={{ scale: 120, center: [10, 20] }} 
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1.1} minZoom={1} maxZoom={4}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography 
                  key={geo.rsmKey} 
                  geography={geo} 
                  fill="#FFFFFF" 
                  stroke="#475569" 
                  strokeWidth={0.8} 
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#F1F5F9', outline: 'none' },
                    pressed: { outline: 'none' }
                  }}
                />
              ))
            }
          </Geographies>

          {DIRECT_PAIRS.map(([a, b]) => {
            const apA = AIRPORTS.find(x => x.code === a);
            const apB = AIRPORTS.find(x => x.code === b);
            if (!apA || !apB) return null;
            const coordA = ADJUSTED_COORDS[a] || [apA.longitude, apA.latitude];
            const coordB = ADJUSTED_COORDS[b] || [apB.longitude, apB.latitude];
            
            const isLong = Math.abs(coordA[0] - coordB[0]) > 60;
            
            return (
              <Line
                key={`${a}-${b}`}
                from={coordA}
                to={coordB}
                stroke={isLong ? "#6B21A8" : "#475569"} 
                strokeWidth={isLong ? 1.5 : 1}
                strokeOpacity={isLong ? 0.7 : 0.6}
                strokeLinecap="round"
              />
            );
          })}

          {AIRPORTS.map((ap) => {
            const coord = ADJUSTED_COORDS[ap.code] || [ap.longitude, ap.latitude];
            return (
              <Marker key={ap.code} coordinates={coord}>
                <circle r={9} fill="rgba(16, 185, 129, 0.2)" />
                <circle r={6.5} fill="#10B981" stroke="#0F172A" strokeWidth={1.5} />
                <text 
                  textAnchor="middle" 
                  y={-12} 
                  style={{ 
                    fontFamily: '"Inter", sans-serif', 
                    fontSize: '9px', 
                    fontWeight: '800', 
                    fill: '#0F172A', 
                    textShadow: '1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF, 0px 3px 3px rgba(0,0,0,0.2)' 
                  }}
                >
                  {ap.code}
                </text>
              </Marker>
            );
          })}

          {time > 0 && FLIGHT_ANIMATIONS.map(f => {
            const apFrom = AIRPORTS.find(x => x.code === f.from);
            const apTo = AIRPORTS.find(x => x.code === f.to);
            if (!apFrom || !apTo) return null;

            const cFrom = ADJUSTED_COORDS[f.from] || [apFrom.longitude, apFrom.latitude];
            const cTo = ADJUSTED_COORDS[f.to] || [apTo.longitude, apTo.latitude];

            const effectiveTime = time + f.offset;
            const progress = (effectiveTime % f.duration) / f.duration;

            const curLon = cFrom[0] + (cTo[0] - cFrom[0]) * progress;
            const curLat = cFrom[1] + (cTo[1] - cFrom[1]) * progress;

            const angleRaw = Math.atan2(cTo[1] - cFrom[1], cTo[0] - cFrom[0]) * 180 / Math.PI;
            const angle = -angleRaw + 45; 

            return (
              <Marker key={f.id} coordinates={[curLon, curLat]}>
                <text 
                  textAnchor="middle" 
                  dominantBaseline="central"
                  style={{ 
                    fontSize: '14px', 
                    transform: `rotate(${angle}deg)`, 
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))'
                  }}
                >
                  ✈️
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
