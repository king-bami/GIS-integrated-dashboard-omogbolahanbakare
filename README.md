## Tech Stack

- **GIS**: PostGIS, MapLibre GL
- **Frontend**: React, TypeScript, Lucide, GSAP
- **Backend**: Node.js, Express, Socket.io, Redis
- **DevOps**: Docker, Docker-Compose

# Medical Command Center

**Medical Command Center** is a high performance, real time emergency response dashboard designed to visualize hospital facilities and coordinate ambulance dispatches using advanced geospatial logic.

## Architecture
**Frontend**: React (Vite) + TypeScript. Uses **MapLibre GL JS** for vector map rendering and **GSAP** for mission critical animations.
**Backend**: Node.js (Express) serving a RESTful API and a **Socket.io** event hub.
**Database**: PostgreSQL with the **PostGIS** extension for spherical geographic calculations.
**Caching**: Dual layer architecture (Redis with an In Memory fallback) to optimize repeated proximity requests ("Grit" Challenge).



## Setup &  How to run the project

## Option 1: Docker (Fastest)
The entire stack is containerized for instant deployment.
```bash
docker-compose up --build
```
*The dashboard will be available at `http://localhost:5173`.*

## Option 2: Manual Development Setup

#### 1. Database
Ensure PostgreSQL and PostGIS are installed.
#### 2. Backend
```bash
cd backend
npm install
# i have add the necessities in the .env file (DATABASE_URL, etc.)
npm run init-db  # Initializes PostGIS extension and tables
npm run seed     # Injects 10 mock hospitals and 5 ambulances
npm run dev
```

#### 3. Frontend
cd frontend
npm install
npm run dev

---

## Testing the Operations

1. **Target Selection**: Click on any hospital to trigger the spatial proximity engine.
2. **Optimal Vector**: Review the calculated distance and ETA. The system will automatically highlight the recommended unit.
3. **Verify Caching**: Click the same hospital again immediately. Observe the **"OPTIMIZED (CACHE)"** badge in the Fleet Status widget, this demonstrates the logic saving layer.
4. **Real-time Dispatch**: Click "Authorize Dispatch". Observe the transition to "Mission Active" and watch the unit move live on the map.



## Infrastructure Troubleshooting

### Geospatial DB (PostGIS)
- **Error**: `extension postgis not found`.
- **Fix**: Ensure PostGIS is installed on your system. The `init-db` script attempted `CREATE EXTENSION IF NOT EXISTS postgis`. On Windows, use the Stack Builder to add PostGIS to your Postgres installation.

### Persistence (Redis)
- **Status**: Redis is used for high-performance caching.
- **Failover**: If Redis is not detected, the backend will log `Redis not found. Using internal memory cache.` The application features a 100% functional fallback to in-memory caching to ensure stability.


---

## Evaluation Deliverables

- **Learning Log**: A detailed report on the "Vanishing Ambulance" bug and architectural trade offs. [**Read the Learning Log here**](./LEARNING_LOG.md).
- **Documentation**: This README serves as the primary system guide.
