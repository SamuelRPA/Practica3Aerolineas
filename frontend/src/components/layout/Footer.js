export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #DDE3EE',
      padding: '28px 0',
      marginTop: 'auto',
      background: '#FFFFFF',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#1A2233', marginBottom: 4 }}>
            Aerolíneas Rafael Pabón
          </div>
          <div style={{ fontSize: '0.8rem', color: '#8899AA' }}>
            Sistema de Reservas Distribuido · 3 Nodos · 15 Destinos Globales
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#8899AA', textAlign: 'right' }}>
          <div>Nodo 1: MongoDB · América (ATL, LAX, DFW, SAO)</div>
          <div>Nodo 2: SQL Server · Europa (LON, PAR, FRA, IST, MAD, AMS)</div>
          <div>Nodo 3: SQL Server · Asia (PEK, DXB, TYO, SIN, CAN)</div>
        </div>
      </div>
    </footer>
  );
}
