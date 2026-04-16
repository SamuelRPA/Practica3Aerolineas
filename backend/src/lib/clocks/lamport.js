/**
 * Reloj de Lamport para sincronización de eventos distribuidos.
 *
 * Reglas:
 *  1. Cada nodo mantiene un contador C
 *  2. Antes de cada evento local: C = C + 1
 *  3. Al enviar mensaje: adjuntar timestamp T = C
 *  4. Al recibir mensaje con T: C = max(C, T) + 1
 */

export class LamportClock {
  constructor(initialValue = 0) {
    this.counter = initialValue;
  }

  // Evento local: incrementa y retorna el nuevo valor
  tick() {
    this.counter += 1;
    return this.counter;
  }

  // Al recibir un mensaje con timestamp externo
  receive(externalTimestamp) {
    this.counter = Math.max(this.counter, externalTimestamp) + 1;
    return this.counter;
  }

  // Obtener valor actual
  get value() {
    return this.counter;
  }
}

// Funciones puras (sin estado) para usar en API routes
export function lamportTick(current) {
  return current + 1;
}

export function lamportReceive(current, received) {
  return Math.max(current, received) + 1;
}
