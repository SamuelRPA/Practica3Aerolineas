export const LANGUAGES = [
  { code: 'es', label: 'ES', name: 'Español',    flag: '🇪🇸' },
  { code: 'en', label: 'EN', name: 'English',     flag: '🇬🇧' },
  { code: 'fr', label: 'FR', name: 'Français',    flag: '🇫🇷' },
  { code: 'pt', label: 'PT', name: 'Português',   flag: '🇧🇷' },
  { code: 'de', label: 'DE', name: 'Deutsch',     flag: '🇩🇪' },
];

export const T = {
  // ── Navbar ──────────────────────────────────────────────────
  nav_home:      { es:'Inicio',    en:'Home',       fr:'Accueil',   pt:'Início',   de:'Start'      },
  nav_flights:   { es:'Vuelos',    en:'Flights',    fr:'Vols',      pt:'Voos',     de:'Flüge'      },
  nav_routes:    { es:'Rutas',     en:'Routes',     fr:'Itinéraires',pt:'Rotas',   de:'Routen'     },
  nav_dashboard: { es:'Dashboard', en:'Dashboard',  fr:'Tableau',   pt:'Painel',   de:'Dashboard'  },
  nav_book:      { es:'Reservar',  en:'Book',       fr:'Réserver',  pt:'Reservar', de:'Buchen'     },

  // ── Landing ──────────────────────────────────────────────────
  hero_title:    { es:'Vuela a donde quieras ir ✈',
                   en:'Fly wherever you want ✈',
                   fr:'Volez où vous voulez ✈',
                   pt:'Voe para onde quiser ✈',
                   de:'Fliegen Sie wohin Sie wollen ✈' },
  hero_sub:      { es:'15 destinos · 3 continentes · Reserva en 2 minutos',
                   en:'15 destinations · 3 continents · Book in 2 minutes',
                   fr:'15 destinations · 3 continents · Réservez en 2 minutes',
                   pt:'15 destinos · 3 continentes · Reserve em 2 minutos',
                   de:'15 Ziele · 3 Kontinente · In 2 Minuten buchen' },
  tab_oneway:    { es:'✈ Solo Ida',     en:'✈ One Way',     fr:'✈ Aller Simple', pt:'✈ Só Ida',      de:'✈ Einfach'       },
  tab_return:    { es:'↔ Ida y Vuelta', en:'↔ Round Trip',  fr:'↔ Aller-Retour', pt:'↔ Ida e Volta', de:'↔ Hin und Zurück'},
  origin:        { es:'ORIGEN',   en:'ORIGIN',   fr:'ORIGINE',   pt:'ORIGEM',   de:'HERKUNFT'   },
  destination:   { es:'DESTINO',  en:'DESTINATION', fr:'DESTINATION', pt:'DESTINO', de:'ZIEL'    },
  date:          { es:'FECHA DE SALIDA', en:'DEPARTURE DATE', fr:'DATE DE DÉPART', pt:'DATA DE SAÍDA', de:'ABFLUGDATUM' },
  class:         { es:'CLASE',    en:'CLASS',    fr:'CLASSE',    pt:'CLASSE',   de:'KLASSE'     },
  economy:       { es:'● Económica',   en:'● Economy',     fr:'● Économique',  pt:'● Econômica',   de:'● Economy'      },
  first_class:   { es:'✦ Primera Clase',en:'✦ First Class', fr:'✦ Première Classe',pt:'✦ Primeira Classe',de:'✦ Erste Klasse'},
  search_btn:    { es:'🔍 Buscar Vuelos', en:'🔍 Search Flights', fr:'🔍 Rechercher', pt:'🔍 Buscar Voos', de:'🔍 Suchen' },
  from_where:    { es:'¿Desde dónde?', en:'From where?',   fr:'D\'où partez-vous?', pt:'De onde?', de:'Woher?' },
  to_where:      { es:'¿A dónde vas?', en:'Where to?',     fr:'Où allez-vous?',     pt:'Para onde?', de:'Wohin?' },
  swap:          { es:'Intercambiar',  en:'Swap',           fr:'Interchanger',       pt:'Trocar',    de:'Tauschen' },

  // ── Vuelos ───────────────────────────────────────────────────
  flights_title: { es:'Vuelos Disponibles', en:'Available Flights', fr:'Vols Disponibles', pt:'Voos Disponíveis', de:'Verfügbare Flüge' },
  no_results:    { es:'No se encontraron vuelos',  en:'No flights found', fr:'Aucun vol trouvé', pt:'Nenhum voo encontrado', de:'Keine Flüge gefunden' },
  see_seats:     { es:'Ver asientos →', en:'See seats →', fr:'Voir sièges →', pt:'Ver assentos →', de:'Sitze sehen →' },

  // ── Mapa de asientos ─────────────────────────────────────────
  select_seat:   { es:'Selecciona tu Asiento', en:'Select your Seat', fr:'Choisissez votre Siège', pt:'Selecione seu Assento', de:'Wählen Sie Ihren Sitz' },
  available:     { es:'Disponible',   en:'Available',  fr:'Disponible',  pt:'Disponível', de:'Verfügbar'  },
  reserved:      { es:'Reservado',    en:'Reserved',   fr:'Réservé',     pt:'Reservado',  de:'Reserviert' },
  sold:          { es:'Vendido',      en:'Sold',       fr:'Vendu',       pt:'Vendido',    de:'Verkauft'   },
  your_pick:     { es:'Tu selección', en:'Your pick',  fr:'Votre choix', pt:'Sua escolha',de:'Ihre Wahl'  },
  continue:      { es:'Continuar →',  en:'Continue →', fr:'Continuer →', pt:'Continuar →',de:'Weiter →'  },

  // ── Booking ──────────────────────────────────────────────────
  book_title:    { es:'Comprar Boleto', en:'Buy Ticket', fr:'Acheter Billet', pt:'Comprar Bilhete', de:'Ticket Kaufen' },
  reserve_title: { es:'Hacer Reserva',  en:'Make Reservation', fr:'Faire une Réservation', pt:'Fazer Reserva', de:'Reservierung Machen' },
  full_name:     { es:'NOMBRE COMPLETO', en:'FULL NAME', fr:'NOM COMPLET', pt:'NOME COMPLETO', de:'VOLLSTÄNDIGER NAME' },
  email:         { es:'EMAIL',          en:'EMAIL',     fr:'EMAIL',       pt:'EMAIL',          de:'E-MAIL' },
  purchase:      { es:'Comprar',        en:'Purchase',  fr:'Acheter',     pt:'Comprar',        de:'Kaufen'  },
  reservation:   { es:'Reservar',       en:'Reserve',   fr:'Réserver',    pt:'Reservar',       de:'Reservieren' },
  confirm_buy:   { es:'💳 Confirmar Compra', en:'💳 Confirm Purchase', fr:'💳 Confirmer l\'Achat', pt:'💳 Confirmar Compra', de:'💳 Kauf Bestätigen' },
  confirm_res:   { es:'📌 Confirmar Reserva', en:'📌 Confirm Reservation', fr:'📌 Confirmer la Réservation', pt:'📌 Confirmar Reserva', de:'📌 Reservierung Bestätigen' },

  // ── Boarding pass ────────────────────────────────────────────
  passenger:     { es:'PASAJERO',    en:'PASSENGER',  fr:'PASSAGER',    pt:'PASSAGEIRO',  de:'PASSAGIER'   },
  flight:        { es:'VUELO',       en:'FLIGHT',     fr:'VOL',         pt:'VOO',         de:'FLUG'        },
  seat:          { es:'ASIENTO',     en:'SEAT',       fr:'SIÈGE',       pt:'ASSENTO',     de:'SITZ'        },
  gate:          { es:'PUERTA',      en:'GATE',       fr:'PORTE',       pt:'PORTÃO',      de:'GATE'        },
  departure:     { es:'SALIDA',      en:'DEPARTURE',  fr:'DÉPART',      pt:'SAÍDA',       de:'ABFLUG'      },
  arrival:       { es:'LLEGADA',     en:'ARRIVAL',    fr:'ARRIVÉE',     pt:'CHEGADA',     de:'ANKUNFT'     },
  booking_ref:   { es:'REFERENCIA',  en:'BOOKING REF',fr:'RÉFÉRENCE',   pt:'REFERÊNCIA',  de:'BUCHUNGS-NR' },
  price:         { es:'PRECIO',      en:'PRICE',      fr:'PRIX',        pt:'PREÇO',       de:'PREIS'       },
  download_pdf:  { es:'📄 Descargar PDF', en:'📄 Download PDF', fr:'📄 Télécharger PDF', pt:'📄 Baixar PDF', de:'📄 PDF Herunterladen' },
  cancel_booking:{ es:'Cancelar Reserva', en:'Cancel Booking', fr:'Annuler Réservation', pt:'Cancelar Reserva', de:'Buchung Stornieren' },
  reservation_expires: { es:'Reserva expira en:', en:'Reservation expires in:', fr:'Réservation expire dans:', pt:'Reserva expira em:', de:'Reservierung läuft ab in:' },
  seat_freed_in: { es:'El asiento quedará libre en:', en:'Seat will be free in:', fr:'Le siège sera libre dans:', pt:'O assento ficará livre em:', de:'Sitz wird frei in:' },
  expired_msg:   { es:'Reserva expirada — el asiento ya está disponible', en:'Reservation expired — seat is now available', fr:'Réservation expirée', pt:'Reserva expirada', de:'Reservierung abgelaufen' },

  // ── Dashboard ────────────────────────────────────────────────
  dash_title:    { es:'Panel de Control',       en:'Control Panel',      fr:'Tableau de Bord',    pt:'Painel de Controle', de:'Kontrollpanel'      },
  total_revenue: { es:'Dinero Total (USD)',      en:'Total Revenue (USD)',fr:'Revenus Totaux',      pt:'Receita Total',      de:'Gesamteinnahmen'    },
  total_flights: { es:'Vuelos en el sistema',   en:'Total Flights',      fr:'Total des Vols',      pt:'Total de Voos',      de:'Gesamtflüge'        },
  total_pax:     { es:'Pasajeros registrados',  en:'Registered Passengers',fr:'Passagers Enregistrés',pt:'Passageiros Registrados',de:'Registrierte Passagiere'},
  avail_seats:   { es:'Asientos disponibles',   en:'Available Seats',    fr:'Sièges Disponibles',  pt:'Assentos Disponíveis',de:'Verfügbare Sitze'   },
  online:        { es:'En línea',   en:'Online',   fr:'En ligne',    pt:'Online',   de:'Online'   },
  offline:       { es:'Offline',    en:'Offline',  fr:'Hors ligne',  pt:'Offline',  de:'Offline'  },

  // ── Rutas ────────────────────────────────────────────────────
  routes_title:  { es:'Rutas Inteligentes', en:'Smart Routes', fr:'Itinéraires Intelligents', pt:'Rotas Inteligentes', de:'Intelligente Routen' },
};

/** Devuelve el string en el idioma activo (fallback a español) */
export function t(key, lang = 'es') {
  return T[key]?.[lang] || T[key]?.['es'] || key;
}
