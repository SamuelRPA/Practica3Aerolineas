'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function PassengersContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get('q') || '');
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search(query) {
    setLoading(true);
    try {
      const res = await fetch(`/api/passengers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPassengers(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (q) search(q);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    router.push(`/dashboard/passengers?q=${encodeURIComponent(q)}`);
    search(q);
  }

  return (
    <div style={{ background: '#F0F4FA', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: '#0066CC', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, display: 'inline-block', marginBottom: 20 }}>
          ← Volver al Dashboard
        </Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1A2233', marginBottom: 8 }}>
          👥 Gestión de Pasajeros
        </h1>
        <p style={{ color: '#5A6880', marginBottom: 30 }}>
          Consulta el manifiesto centralizado de pasajeros y su historial de vuelos en el sistema distribuido.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
          <input
            type="text"
            placeholder="Ingresa el número de pasaporte exacto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #DDE3EE', outline: 'none', fontSize: '1rem' }}
          />
          <button type="submit" style={{ background: '#0066CC', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            🔍 Buscar Pasaporte
          </button>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8899AA' }}>Buscando pasajeros...</div>
        ) : passengers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {passengers.map((p) => (
              <Link key={p.id} href={`/dashboard/passengers/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#FFF', borderRadius: 14, border: '1px solid #DDE3EE', padding: 20, transition: 'box-shadow 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ fontWeight: 800, color: '#1A2233', fontSize: '1.1rem', marginBottom: 4 }}>{p.full_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#5A6880', marginBottom: 8 }}>{p.email}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F0F4FA', paddingTop: 10, marginTop: 10 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8899AA' }}>DOC: {p.passport || '---'}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0066CC' }}>Ver Historial →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : q && (
          <div style={{ textAlign: 'center', padding: 60, background: '#FFF', borderRadius: 16, border: '1px solid #DDE3EE' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔎</div>
            <h3 style={{ color: '#1A2233' }}>No se encontraron pasajeros</h3>
            <p style={{ color: '#8899AA' }}>Intenta con otro término de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PassengersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Cargando búsqueda...</div>}>
      <PassengersContent />
    </Suspense>
  );
}
