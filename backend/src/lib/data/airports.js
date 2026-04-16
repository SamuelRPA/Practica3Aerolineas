// 15 aeropuertos con nodo asignado
// Nodo 1 = America (MongoDB), Nodo 2 = Europa (SQL), Nodo 3 = Asia (SQL)
export const AIRPORTS = [
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'United States', country_code: 'USA', latitude: 33.6407, longitude: -84.4277, timezone: 'America/New_York', assigned_node: 1 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', country_code: 'USA', latitude: 33.9425, longitude: -118.4081, timezone: 'America/Los_Angeles', assigned_node: 1 },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'United States', country_code: 'USA', latitude: 32.8998, longitude: -97.0403, timezone: 'America/Chicago', assigned_node: 1 },
  { code: 'SAO', name: 'Guarulhos International', city: 'São Paulo', country: 'Brazil', country_code: 'BRA', latitude: -23.4356, longitude: -46.4731, timezone: 'America/Sao_Paulo', assigned_node: 1 },
  { code: 'LON', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', country_code: 'GBR', latitude: 51.4775, longitude: -0.4614, timezone: 'Europe/London', assigned_node: 2 },
  { code: 'PAR', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', country_code: 'FRA', latitude: 49.0097, longitude: 2.5479, timezone: 'Europe/Paris', assigned_node: 2 },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', country_code: 'DEU', latitude: 50.0379, longitude: 8.5622, timezone: 'Europe/Berlin', assigned_node: 2 },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', country_code: 'TUR', latitude: 41.2753, longitude: 28.7519, timezone: 'Europe/Istanbul', assigned_node: 2 },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', country_code: 'ESP', latitude: 40.4936, longitude: -3.5668, timezone: 'Europe/Madrid', assigned_node: 2 },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', country_code: 'NLD', latitude: 52.3086, longitude: 4.7639, timezone: 'Europe/Amsterdam', assigned_node: 2 },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', country_code: 'CHN', latitude: 40.0799, longitude: 116.6031, timezone: 'Asia/Shanghai', assigned_node: 3 },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', country_code: 'ARE', latitude: 25.2528, longitude: 55.3644, timezone: 'Asia/Dubai', assigned_node: 3 },
  { code: 'TYO', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', country_code: 'JPN', latitude: 35.7647, longitude: 140.3864, timezone: 'Asia/Tokyo', assigned_node: 3 },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', country_code: 'SGP', latitude: 1.3644, longitude: 103.9915, timezone: 'Asia/Singapore', assigned_node: 3 },
  { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', country_code: 'CHN', latitude: 23.3924, longitude: 113.2988, timezone: 'Asia/Shanghai', assigned_node: 3 },
];

export function getAirportByCode(code) {
  return AIRPORTS.find(a => a.code === code);
}

export function getAirportsByNode(node) {
  return AIRPORTS.filter(a => a.assigned_node === node);
}
