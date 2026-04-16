// 4 modelos de avión con todas las medidas reales
export const AIRCRAFT_MODELS = [
  {
    id: 1,
    manufacturer: 'Airbus',
    model: 'A380-800',
    origin_country: 'France',
    first_class_seats: 10,
    economy_seats: 439,
    total_seats: 449,
    engines: 4,
    engine_type: 'turbofán',
    length_m: 72.7,
    wingspan_m: 79.8,
    range_km: 15200,
    cruise_speed_kmh: 900,
    range_nm: 8200,
    count: 6,
  },
  {
    id: 2,
    manufacturer: 'Boeing',
    model: '777-300ER',
    origin_country: 'USA',
    first_class_seats: 10,
    economy_seats: 300,
    total_seats: 310,
    engines: 2,
    engine_type: 'turbofán',
    length_m: 73.9,
    wingspan_m: 64.8,
    range_km: 13650,
    cruise_speed_kmh: 905,
    range_nm: 7370,
    count: 18,
  },
  {
    id: 3,
    manufacturer: 'Airbus',
    model: 'A350-900',
    origin_country: 'France',
    first_class_seats: 12,
    economy_seats: 250,
    total_seats: 262,
    engines: 2,
    engine_type: 'turbofán',
    length_m: 66.8,
    wingspan_m: 64.8,
    range_km: 15000,
    cruise_speed_kmh: 900,
    range_nm: 8100,
    count: 11,
  },
  {
    id: 4,
    manufacturer: 'Boeing',
    model: '787-9 Dreamliner',
    origin_country: 'USA',
    first_class_seats: 8,
    economy_seats: 220,
    total_seats: 228,
    engines: 2,
    engine_type: 'turbofán',
    length_m: 62.8,
    wingspan_m: 60.1,
    range_km: 14100,
    cruise_speed_kmh: 903,
    range_nm: 7600,
    count: 15,
  },
];

// Genera la flota completa: 50 aviones con registration codes
export function generateFleet() {
  const fleet = [];
  let globalIdx = 1;
  for (const model of AIRCRAFT_MODELS) {
    for (let i = 1; i <= model.count; i++) {
      const prefix = model.manufacturer === 'Airbus'
        ? model.model.replace('-', '').replace(' ', '')
        : model.model.replace('-', '').replace(' ', '').replace('Dreamliner', 'DL');
      fleet.push({
        id: globalIdx++,
        aircraft_model_id: model.id,
        registration_code: `RP-${model.model.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 6)}-${String(i).padStart(2, '0')}`,
        status: 'ACTIVE',
      });
    }
  }
  return fleet;
}
