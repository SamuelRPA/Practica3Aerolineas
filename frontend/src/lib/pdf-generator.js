/**
 * Generador de boarding pass PDF — Aerolíneas Rafael Pabón
 * Tema claro consistente con el frontend (#0066CC / #D97706 / #1A2233)
 */

const AIRPORTS_MAP = {
  ATL: { city: 'Atlanta',    country: 'EE.UU.',        tz: 'America/New_York'    },
  LAX: { city: 'Los Ángeles',country: 'EE.UU.',        tz: 'America/Los_Angeles' },
  DFW: { city: 'Dallas',     country: 'EE.UU.',        tz: 'America/Chicago'     },
  SAO: { city: 'São Paulo',  country: 'Brasil',         tz: 'America/Sao_Paulo'   },
  LON: { city: 'Londres',    country: 'Reino Unido',    tz: 'Europe/London'       },
  PAR: { city: 'París',      country: 'Francia',        tz: 'Europe/Paris'        },
  FRA: { city: 'Fráncfort',  country: 'Alemania',       tz: 'Europe/Berlin'       },
  IST: { city: 'Estambul',   country: 'Turquía',        tz: 'Europe/Istanbul'     },
  MAD: { city: 'Madrid',     country: 'España',         tz: 'Europe/Madrid'       },
  AMS: { city: 'Ámsterdam',  country: 'Países Bajos',   tz: 'Europe/Amsterdam'    },
  PEK: { city: 'Pekín',      country: 'China',          tz: 'Asia/Shanghai'       },
  DXB: { city: 'Dubái',      country: 'Emiratos Árabes',tz: 'Asia/Dubai'          },
  TYO: { city: 'Tokio',      country: 'Japón',          tz: 'Asia/Tokyo'          },
  SIN: { city: 'Singapur',   country: 'Singapur',       tz: 'Asia/Singapore'      },
  CAN: { city: 'Guangzhou',  country: 'China',          tz: 'Asia/Shanghai'       },
};

const NODE_LABEL = {
  1: 'Nodo 1 - America - MongoDB',
  2: 'Nodo 2 - Europa - SQL Server',
  3: 'Nodo 3 - Asia - SQL Server',
};

// Colores tema frontend
const C = {
  blue:    [0, 102, 204],     // #0066CC
  blueDk:  [26, 34, 51],      // #1A2233
  blueLight:[238, 244, 255],  // #EEF4FF
  gold:    [217, 119, 6],     // #D97706
  goldLight:[255, 246, 220],  // #FFF6DC
  green:   [10, 153, 96],     // #0A9960
  gray:    [90, 104, 128],    // #5A6880
  grayLt:  [136, 153, 170],   // #8899AA
  line:    [221, 227, 238],   // #DDE3EE
  white:   [255, 255, 255],
  bg:      [240, 244, 250],   // #F0F4FA
};

export async function generateBoardingPassPdf(data, tz = 'America/La_Paz') {
  function fmtTime(date, opts = {}) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('es-BO', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...opts });
  }
  function fmtDate(date, opts = {}) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-BO', { timeZone: tz, day: '2-digit', month: 'long', year: 'numeric', ...opts });
  }
  function fmtDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-BO', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const { jsPDF } = await import('jspdf');
  const QRCode    = await import('qrcode');

  const { booking, passenger, flight, seat } = data;

  const isFirst  = seat?.class === 'FIRST';
  const dep = flight?.departure_time ? new Date(flight.departure_time) : null;
  const boarding = dep ? new Date(dep.getTime() - 30 * 60000) : null;
  const stripe   = isFirst ? C.gold   : C.blue;
  const stripeLt = isFirst ? C.goldLight : C.blueLight;

  // Landscape format (280mm x 100mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [280, 100] });
  const W = 280, H = 100;
  const STUB_X = 215;

  // ── Helpers ──────────────────────────────────────────────────
  const rgb = (c) => ({ r: c[0], g: c[1], b: c[2] });
  const fill = (c) => { doc.setFillColor(c[0], c[1], c[2]); };
  const text = (c) => { doc.setTextColor(c[0], c[1], c[2]); };
  const draw = (c) => { doc.setDrawColor(c[0], c[1], c[2]); };

  function label(str, x, y, opts = {}) {
    text(opts.color || [100, 116, 139]); // Slate 500
    doc.setFontSize(opts.size || 7);
    doc.setFont('helvetica', 'bold');
    doc.text((str||'').toString().toUpperCase(), x, y);
  }

  function value(str, x, y, opts = {}) {
    text(opts.color || [15, 23, 42]);    // Slate 900
    doc.setFontSize(opts.size || 10);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    // Ensure string cast
    let valStr = String(str);
    if (!valStr || valStr === 'undefined' || valStr === 'null') valStr = '--';
    if (!opts.keepCase) valStr = valStr.toUpperCase();
    doc.text(valStr, x, y, { maxWidth: opts.maxWidth });
  }

  const greenCl  = [16, 185, 129];
  const goldCl   = [217, 119, 6];
  const blueCl   = [37, 99, 235]; // #2563EB
  const darkCl   = [30, 41, 59];
  const redCl    = [220, 38, 38];
  
  const isConnection = flight?.route_type === 'CONNECTION' || !!flight?.connection_via;
  const brandCol = isConnection ? blueCl : (isFirst ? goldCl : greenCl);

  // Fondo total blanco
  fill([255, 255, 255]);
  doc.rect(0, 0, W, H, 'F');

  // Fondo Stub
  fill([248, 250, 252]);
  doc.rect(STUB_X, 0, W - STUB_X, H, 'F');

  // ══════════════════════════════════════════════════════════
  // HEADER MAIN (IZQ)
  // ══════════════════════════════════════════════════════════
  fill(brandCol);
  doc.rect(0, 0, STUB_X, 22, 'F');

  text([255, 255, 255]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('✈   AEROLÍNEAS DISTRIBUIDAS', 16, 14);

  doc.setFontSize(15);
  doc.text('BOARDING PASS', STUB_X - 16, 14.5, { align: 'right' });

  // ══════════════════════════════════════════════════════════
  // HEADER STUB (DER)
  // ══════════════════════════════════════════════════════════
  fill(darkCl);
  doc.rect(STUB_X, 0, W - STUB_X, 22, 'F');

  text([255, 255, 255]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${flight?.origin || 'ORG'}  ✈  ${flight?.destination || 'DST'}`, STUB_X + (W - STUB_X)/2, 14.5, { align: 'center' });


  // ══════════════════════════════════════════════════════════
  // CUERPO PRINCIPAL (MAIN)
  // ══════════════════════════════════════════════════════════
  let y = 34;
  const offX = 36; // Empezando después del barcode izquierdo

  label('PASSENGER', offX, y);
  value(passenger?.full_name, offX, y + 6, { size: 12, bold: true });

  label('FLIGHT', 105, y);
  value(flight?.flight_number, 105, y + 6, { size: 12, bold: true });

  const fDate = dep ? new Date(dep).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '--';
  label('DATE', 145, y);
  value(fDate, 145, y + 6, { size: 12, bold: true });

  label('SEAT', 190, y);
  value(seat?.seat_number, 190, y + 6, { size: 16, bold: true });

  // TEXTOS GIGANTES CENTRALES
  const cy = 60;
  text([30, 41, 59]);
  doc.setFontSize(44);
  doc.setFont('helvetica', 'bold');
  doc.text(`${flight?.origin || '---'}     ✈     ${flight?.destination || '---'}`, STUB_X / 2.0, cy, { align: 'center' });

  // FILA INFERIOR
  const by = 83;
  label('GATE', offX, by, { color: redCl });
  value(flight?.gate, offX, by + 8, { size: 18, bold: true });

  const bTime = boarding ? new Date(boarding).toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit'}) : '--:--';
  label('BOARDING TIME', 85, by, { color: redCl });
  value(bTime, 85, by + 8, { size: 18, bold: true, keepCase: true });

  // METADATA DISTRIBUIDA
  const mx = 150;
  draw([226, 232, 240]);
  doc.setLineWidth(0.4);
  doc.line(mx - 8, by - 1, mx - 8, by + 10);

  label('DISTRIBUTED NODE', mx, by);
  value(NODE_LABEL[booking?.processed_by_node] || '--', mx, by + 4, { size: 8, bold: true, color: brandCol });
  
  label('LAMPORT CLK & VECTOR', mx, by + 8);
  value(`L: ${booking?.lamport_clock || 0}  |  V: ${booking?.vector_clock || '0,0,0'}`, mx, by + 12, { size: 8, bold: true, color: brandCol });


  // ══════════════════════════════════════════════════════════
  // CUERPO STUB (DER)
  // ══════════════════════════════════════════════════════════
  const sx = STUB_X + 10;
  let sy = 34;

  label('PASSENGER', sx, sy);
  value(passenger?.full_name, sx, sy + 5, { size: 9, bold: true });

  sy += 12;
  label('FLIGHT', sx, sy);
  value(flight?.flight_number, sx, sy + 5, { size: 9, bold: true });

  label('SEAT', sx + 35, sy);
  value(seat?.seat_number, sx + 35, sy + 5, { size: 11, bold: true });

  sy += 12;
  label('DATE', sx, sy);
  value(fDate, sx, sy + 5, { size: 9, bold: true });

  sy += 12;
  label('GATE', sx, sy);
  value(flight?.gate, sx, sy + 5, { size: 11, bold: true });

  label('CLASS', sx + 35, sy);
  value(isFirst ? '1ST' : 'ECO', sx + 35, sy + 5, { size: 11, bold: true, color: brandCol });


  // ══════════════════════════════════════════════════════════
  // CÓDIGOS DE BARRAS & LÍNEA DE CORTE
  // ══════════════════════════════════════════════════════════

  // Línea Perforada
  draw([200, 200, 200]);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([2, 5], 0);
  doc.line(STUB_X, 0, STUB_X, H);
  doc.setLineDashPattern([], 0);

  // Semiperforaciones gráficas
  fill([255, 255, 255]);
  for(let i=0; i<10; i++) {
    doc.circle(STUB_X, 5 + i*10, 2, 'F');
  }

  // Barcode Izquierdo Vertical (Líneas Horizontales apiladas)
  fill([15, 23, 42]);
  let bY = 28;
  const bPatt = [1.2, 0.4, 0.8, 0.5, 1.5, 0.3, 0.9, 0.4, 1.2, 0.6, 0.3, 1.0, 0.8, 0.4];
  for(let i=0; i<45; i++) {
     const h = bPatt[i % bPatt.length];
     doc.rect(12, bY, 12, h, 'F');
     bY += h + 0.5;
  }

  // QR Code + Barcode Stub
  const qrPayload = JSON.stringify({
    pn: passenger?.id, fl: flight?.flight_number, bk: booking?.id, nd: booking?.processed_by_node
  });
  const qrUrl = await QRCode.toDataURL(qrPayload, { width: 40, margin: 0, color: { dark: '#0F172A', light: '#00000000' } });
  doc.addImage(qrUrl, 'PNG', sx, sy + 14, 16, 16);

  // Barcode chiquito en stub
  let bX = sx + 22;
  for(let i=0; i<25; i++) {
     const w = bPatt[(i*3) % bPatt.length] * 0.8;
     doc.rect(bX, sy + 14, w, 12, 'F');
     bX += w + 0.5;
  }

  label(`PNR-${booking?.id}0${passenger?.id}`, sx + 22, sy + 29);

  return doc;
}


