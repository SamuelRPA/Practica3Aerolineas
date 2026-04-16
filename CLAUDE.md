# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aerolíneas Rafael Pabón** — Sistema de reservas aéreo distribuido (curso Sistemas Distribuidos).

Arquitectura separada en dos proyectos independientes:
- **`backend/`** — API REST con Express.js (puerto 3001) · toda la lógica de DB, sync, algoritmos
- **`frontend/`** — UI con Next.js 14 (puerto 3000) · solo UI, sin acceso directo a bases de datos

## Comandos

### Desarrollo (los dos juntos)
```bash
npm run dev          # levanta backend (3001) + frontend (3000) en paralelo
```

### Por separado
```bash
npm run dev:backend   # solo Express API  → http://localhost:3001
npm run dev:frontend  # solo Next.js UI   → http://localhost:3000
```

### Inicializar bases de datos (ejecutar una sola vez)
```bash
npm run seed:schema   # crea tablas/colecciones en los 3 nodos
npm run seed:data     # aeropuertos, modelos, flota, precios, tiempos
# Cuando tengas el CSV de vuelos:
cd backend && node --env-file=.env scripts/seed-flights.mjs ./vuelos.csv
```

## Arquitectura

```
Practica3Aerolineas/
├── backend/               # Express.js API — puerto 3001
│   ├── server.js          # Entry point, monta todos los routers
│   ├── .env               # Credenciales DB (NO commitear)
│   ├── src/
│   │   ├── routes/        # Un archivo por recurso (Express Router)
│   │   └── lib/
│   │       ├── db/        # mongodb.js, sqlserver.js, sync.js
│   │       ├── clocks/    # lamport.js, vector.js
│   │       ├── algorithms/# dijkstra.js, tsp.js, graph.js
│   │       ├── data/      # airports.js, aircraft.js, price-matrix.js
│   │       └── tickets/   # (reservado para PDF server-side)
│   └── scripts/           # Seed scripts (.mjs)
│
├── frontend/              # Next.js 14 — puerto 3000
│   ├── next.config.js     # Proxy /api/* → backend:3001
│   ├── .env.local         # BACKEND_URL=http://localhost:3001
│   └── src/
│       ├── app/           # Páginas (App Router, sin carpeta /api)
│       ├── components/    # Navbar, Footer
│       └── lib/           # Solo datos estáticos + pdf-generator.js
│
└── package.json           # Workspace raíz con script `dev` (concurrently)
```

### 3 Nodos Distribuidos

| Nodo | Región | Base de Datos | Aeropuertos |
|------|--------|---------------|-------------|
| 1 | América | MongoDB Atlas | ATL, LAX, DFW, SAO |
| 2 | Europa  | SQL Server `AerolineasEuropa` | LON, PAR, FRA, IST, MAD, AMS |
| 3 | Asia    | SQL Server `AerolineasAsia`   | PEK, DXB, TYO, SIN, CAN |

### Flujo petición frontend → backend

```
Browser → Next.js (3000) → proxy /api/* → Express (3001) → MongoDB/SQL Server
```

`next.config.js` tiene un `rewrite` que redirige todo `/api/*` al backend.
Las páginas del frontend solo usan `fetch('/api/...')` — no saben nada de la DB.

### IDs con salto de llave
- Nodo 1: 1, 4, 7... | Nodo 2: 2, 5, 8... | Nodo 3: 3, 6, 9...
- Contador en MongoDB colección `id_counters`

### Prevención de doble venta
`findOneAndUpdate({ status: 'AVAILABLE' }, { $set: { status: '_LOCKING' } })` — lock optimista en `backend/src/routes/bookings.js`

### Reembolsos (consistencia eventual)
Seat → `REFUNDED` inmediato → `AVAILABLE` después de 15 min (`REFUND_PROPAGATION_DELAY_MS`)

## API Endpoints (backend puerto 3001)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/flights` | Buscar vuelos (query: origin, destination, date, limit) |
| GET | `/api/flights/:id` | Vuelo + asientos |
| POST | `/api/bookings` | Crear reserva/compra |
| GET | `/api/bookings/:id` | Detalle de reserva |
| DELETE | `/api/bookings/:id` | Cancelar reserva |
| GET | `/api/routes/dijkstra` | Ruta óptima (query: origin, dest, criterion, class) |
| POST | `/api/routes/tsp` | Circuito TSP (body: cities[], criterion, cls) |
| GET | `/api/dashboard` | Stats de los 3 nodos |
| GET | `/api/sync` | Relojes + log de sincronización |
| GET | `/api/tickets/pdf` | Datos para generar PDF |
| GET | `/api/health` | Health check |

## Variables de Entorno

**`backend/.env`**
```
MONGODB_URI=mongodb+srv://...
SQL_EUROPA_HOST=(localdb)\MSSQLLocalDB
SQL_EUROPA_DB=AerolineasEuropa
SQL_ASIA_HOST=(localdb)\MSSQLLocalDB
SQL_ASIA_DB=AerolineasAsia
PORT=3001
USD_TO_BS=6.96
REFUND_PROPAGATION_DELAY_MS=900000
MAX_SYNC_DELAY_MS=10000
```

**`frontend/.env.local`**
```
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Datos del Dominio

- **Flota**: A380-800 (6×449), 777-300ER (18×310), A350-900 (11×262), 787-9 (15×228)
- **Distribución inicial asientos**: 73% SOLD, 3% RESERVED, resto AVAILABLE
- **Moneda**: USD + Bs. (tasa fija 6.96)
- **Estados vuelo**: SCHEDULED → BOARDING → DEPARTED → IN_FLIGHT → LANDED → ARRIVED
- **Sin DELAYED ni CANCELLED** — los vuelos nunca se retrasan/cancelan
