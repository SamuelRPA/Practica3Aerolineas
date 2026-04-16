/**
 * Relojes Vectoriales para 3 nodos.
 * Vector: [Nodo1_America, Nodo2_Europa, Nodo3_Asia]
 *
 * Reglas:
 *  1. Cada nodo Pi mantiene vector Vi[3]
 *  2. Antes de evento local: Vi[i-1]++
 *  3. Al enviar: adjuntar copia del vector
 *  4. Al recibir Vm: Vi[j] = max(Vi[j], Vm[j]) para todo j, luego Vi[i-1]++
 */

export class VectorClock {
  constructor(nodeId, initialVector = [0, 0, 0]) {
    if (nodeId < 1 || nodeId > 3) throw new Error('nodeId debe ser 1, 2 o 3');
    this.nodeId = nodeId;
    this.vector = [...initialVector];
  }

  // Evento local
  tick() {
    this.vector[this.nodeId - 1]++;
    return [...this.vector];
  }

  // Recibir mensaje con vector externo
  receive(externalVector) {
    for (let i = 0; i < 3; i++) {
      this.vector[i] = Math.max(this.vector[i], externalVector[i]);
    }
    this.vector[this.nodeId - 1]++;
    return [...this.vector];
  }

  get value() {
    return [...this.vector];
  }

  // Comparar causalidad entre dos vectores
  static compare(v1, v2) {
    let v1LeV2 = true;
    let v2LeV1 = true;
    for (let i = 0; i < 3; i++) {
      if (v1[i] > v2[i]) v1LeV2 = false;
      if (v2[i] > v1[i]) v2LeV1 = false;
    }
    if (v1LeV2 && v2LeV1) return 'equal';
    if (v1LeV2) return 'before';  // v1 causalmente antes que v2
    if (v2LeV1) return 'after';   // v1 causalmente después de v2
    return 'concurrent';          // eventos concurrentes -> posible conflicto
  }
}

// Funciones puras
export function vectorTick(vector, nodeId) {
  const v = [...vector];
  v[nodeId - 1]++;
  return v;
}

export function vectorReceive(localVector, receivedVector, nodeId) {
  const v = localVector.map((val, i) => Math.max(val, receivedVector[i]));
  v[nodeId - 1]++;
  return v;
}

export function vectorCompare(v1, v2) {
  return VectorClock.compare(v1, v2);
}

export function parseVector(str) {
  try {
    return JSON.parse(str);
  } catch {
    return [0, 0, 0];
  }
}

export function serializeVector(vector) {
  return JSON.stringify(vector);
}
