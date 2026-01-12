# 🚀 Quick Start Guide (Terminal Setup)

This guide will help you set up the GIS-Integrated Hospital Dashboard manually using your local terminal.

## Prerequisites
- **PostgreSQL 14+** with **PostGIS** extension installed
- **Redis 6+** installed and running
- **Node.js 18+** and npm

## 🛠️ Step 1: Database Setup

1. **Open your terminal and create the database**:
```bash
psql -U postgres
CREATE DATABASE hospital_dashboard;
\q
```

2. **Verify PostGIS installation**:
Ensure PostGIS is available on your system. The setup script will attempt to enable it automatically.

## 🛠️ Step 2: Backend Configuration

1. **Navigate to backend and install dependencies**:
```bash
cd backend
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```
Edit `.env` to match your local PostgreSQL and Redis credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_dashboard
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Initialize and Seed Database**:
```bash
npm run init-db
npm run seed
```

4. **Start Backend Server**:
```bash
npm run dev
```
The API will be available at `http://localhost:3001`.

## 🛠️ Step 3: Frontend Setup

1. **Open a new terminal, navigate to frontend and install dependencies**:
```bash
cd frontend
npm install
```

2. **Start Frontend Server**:
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 🧪 Testing the Application

1. **Click on any hospital** on the map or in the sidebar.
2. **View the nearest ambulance** calculation results.
3. **Observe Caching**: Click the same hospital again to see the "⚡ Cached" badge (proving the Redis layer works).
4. **Real-time Updates**: Click "Simulate Movement" on an ambulance to see it move on the map instantly via WebSockets.

---

## 🔧 Troubleshooting

### PostgreSQL/PostGIS Issues
- Ensure the PostgreSQL service is running.
- If `npm run init-db` fails with "extension postgis not found", you must install the PostGIS package for your OS (e.g., `sudo apt install postgis` or via Stack Builder on Windows).

### Redis Issues
- Ensure `redis-server` is running.
- If Redis is unavailable, the application will still function but caching will be disabled.

### Connection Errors
- Double-check your `.env` credentials in the `backend/` folder.
- Ensure ports `3001` (backend) and `5173` (frontend) are not being used by other applications.

---

**Enjoy exploring the GIS-Integrated Hospital Dashboard! 🏥🚑**
