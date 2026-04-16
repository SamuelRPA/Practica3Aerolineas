# ✈️ Aerolíneas Rafael Pabón - Sistema Distribuido

Este proyecto es una plataforma de reserva de boletos de avión con una arquitectura de base de datos **completamente distribuida**, simulando operaciones globales a través de 3 nodos independientes coordinados por **Relojes de Lamport** y **Relojes Vectoriales** para evitar la sobreventa de asientos bajo condiciones de alta concurrencia.

## 🏗️ Arquitectura del Sistema

El sistema distribuye la información geográfica del mundo en 3 bases de datos, con una API en Node.js actuando como puente principal y un Frontend consumiendo los servicios en Next.js.

*   **Nodo 1 (América)**: Base de datos **MongoDB** (Optimizado para lectura rápida de rutas clave).
*   **Nodo 2 (Europa)**: Base de datos **Microsoft SQL Server**.
*   **Nodo 3 (Asia/Oceanía)**: Base de datos **Microsoft SQL Server**.

---

## 🚀 Requisitos Previos

1.  **Node.js**: Instalado (versión 18+ recomendada).
2.  **MongoDB**: Instalado y ejecutándose en el puerto por defecto (`27017`).
3.  **Microsoft SQL Server**: Instalado. Si utilizas Windows, asegúrate de utilizar SQL Server Express o Developer Edition.

---

## ⚙️ Configuración Paso a Paso

### 1. Configuración de Microsoft SQL Server (Crucial)

Para que el backend pueda comunicarse con las dos instancias de SQL Server (Europa y Asia), debes asegurar los siguientes ajustes en tu servidor SQL:

1.  Habilitar la **Autenticación Mixta** (SQL Server and Windows Authentication mode).
2.  Habilitar la cuenta de administrador **`sa`** y asignarle una contraseña (por defecto el proyecto buscará `Password123`, si usas otra deberás actualizar tu `.env`).
3.  Abrir el **SQL Server Configuration Manager**:
    *   Ve a *SQL Server Network Configuration* > *Protocols for MSSQLSERVER*.
    *   Habilitar **TCP/IP**. Haz doble clic, ve a la pestaña *IP Addresses*, desliza hacia abajo del todo hasta *IPAll*, asegúrate de borrar "TCP Dynamic Ports" y escribir `1433` en **TCP Port**.
4.  Reinicia el servicio de SQL Server.

**Creación de las Bases de Datos (Nodos 2 y 3)**
Abre SQL Server Management Studio (SSMS) o la terminal y ejecuta el siguiente script base para crear las bases de datos de Europa y Asia:
```sql
CREATE DATABASE aerolineas_europa;
CREATE DATABASE aerolineas_asia;
```

*(Nota: Las tablas y el poblado inicial de vuelos/asientos se generan automáticamente ejecutando el script oficial adjunto en `backend/scripts/setup.js` una vez todo esté configurado).*

### 2. Instalación de Dependencias

Ejecuta los siguientes comandos desde la misma terminal para inicializar ambos subsistemas.

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Arranque del Sistema

Abre dos terminales diferentes.

En la terminal 1 (inicia el Backend Proxy en *localhost:3001*):
```bash
cd backend
npm run dev
```

En la terminal 2 (inicia el Frontend Next.js en *localhost:3000*):
```bash
cd frontend
npm run dev
```

Abre en tu navegador `http://localhost:3000`.

---

## 🎫 Dinámica y Personalización del Boleto (Ticket PDF)

El diseño del boleto o **Boarding Pass** ha sido reconstruido dinámicamente. El pase es altamente visual (formato *Landscape*) y reacciona de diferentes colores (Oro, Verde, o Azul si el vuelo tiene Escalas).

*   **Cambiar Diseño en Pantalla**: Si deseas modificar el layout del boleto que el usuario visualiza, edita el componente React ubicado en `frontend/src/app/booking/[id]/page.js`.
*   **Cambiar Diseño del PDF Descargable**: El billete que se exporta con información minuciosa es re-dibujado bajo un motor PDF propio. Puedes reprogramar el lienzo modificando `frontend/src/lib/pdf-generator.js`.

---

## 🧪 Pruebas a Realizar

Una vez iniciado el servidor, se te insta a hacer las siguientes pruebas de consistencia operativa:

1.  **Sincronización:** Compra un boleto intercontinental (ej. *América -> Asia*). En el diseño del boleto final impreso / PDF podrás confirmar bajo qué Nodo se procesó, además de observar el **Reloj de Lamport** y el **Reloj Vectorial** asignado a la transacción.
2.  **Concurrencia (Doble Compra Simulada):** Intenta reservar exactamente un mismo asiento de un mismo vuelo en dos navegadores al mismo tiempo. El mecanismo de *Optimistic Locking* del backend forzará un estado de conflicto (`409`) rechazando a uno de los peticionarios para asegurar que las bases de datos de los 3 nodos no comprometan los datos.
3.  **Huso Horario Global:** Cambia el territorio desde la barra de navegación del frontend y cerciórate de que todas las descripciones del itinerario muten automáticamente al timezone destino.