# 🏥 GIS-Integrated Hospital Dashboard

A full-stack web application that visualizes hospital locations and ambulance proximity using spatial queries, built with React, MapLibre GL JS, Node.js, PostgreSQL with PostGIS, and Redis caching.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Learning Log](#learning-log)
- [Project Structure](#project-structure)
- [Future Enhancements](#future-enhancements)

## 🎯 Overview

This project is a technical assessment demonstrating advanced full-stack development skills, including:

- **Spatial Database Management**: PostgreSQL with PostGIS for efficient geographic queries
- **Intelligent Caching**: Redis-based caching layer to optimize repeated proximity requests
- **Interactive Mapping**: React-based frontend with MapLibre GL JS for real-time visualization
- **RESTful API**: Express.js backend with comprehensive endpoints
- **Modern UI/UX**: Premium dark-themed interface with smooth animations

## ✨ Features

### Core Features
- ✅ **Interactive Map**: Display 10+ hospitals and 5 ambulances on an interactive map
- ✅ **Spatial Proximity Queries**: Find nearest ambulance using PostGIS spatial functions
- ✅ **Intelligent Caching**: Redis caching prevents redundant database queries
- ✅ **Ambulance Simulation**: Update ambulance locations via API to simulate movement
- ✅ **Real-time WebSocket Updates**: Instant map updates when ambulance locations change without polling
- ✅ **Request Logging**: Track all proximity requests in the database

### Additional Features (Going Beyond Requirements)
- 🎨 **Premium UI Design**: Modern dark theme with glassmorphism and gradient accents
- 📊 **Dashboard Statistics**: Real-time stats showing hospital and ambulance counts
- 🔍 **Visual Route Display**: Line drawing between selected hospital and nearest ambulance
- ⚡ **Cache Indicators**: Visual feedback showing when results are served from cache
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🎯 **Interactive Markers**: Custom emoji markers with hover effects and popups

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend│
│   (MapLibre GL) │
└────────┬────────┘
         │ HTTP/REST / WebSocket
         ▼
┌─────────────────┐
│  Express.js API │
│   (Node.js)     │
└────┬───────┬────┘
     │       │
     │       └──────────┐
     ▼                  ▼
┌─────────┐      ┌──────────┐
│PostgreSQL│      │  Redis   │
│ PostGIS  │      │  Cache   │
└──────────┘      └──────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **MapLibre GL JS** - Open-source mapping library
- **Socket.io Client** - Real-time updates
- **Axios** - HTTP client
- **Vite** - Build tool and dev server
- **CSS3** - Custom styling with modern features

### Backend
- **Node.js** with Express.js
- **Socket.io** - Real-time WebSocket communication
- **PostgreSQL 14+** with PostGIS extension
- **Redis** - In-memory caching
- **pg** - PostgreSQL client
- **CORS** - Cross-origin resource sharing

## 📦 Prerequisites

Before you begin, ensure you have the following installed locally:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) with **PostGIS** extension
- **Redis** (v6 or higher)
- **npm** package manager

## 🚀 Installation & Setup

### 1. Database Setup

1. Create a database named `hospital_dashboard`:
```bash
psql -U postgres -c "CREATE DATABASE hospital_dashboard;"
```

### 2. Configure Backend

1. Navigate to the backend directory:
```bash
cd backend
npm install
```

2. Create a `.env` file from the template:
```bash
cp .env.example .env
```
Update `backend/.env` with your local PostgreSQL and Redis details.

3. Initialize the spatial database and seed with data:
```bash
npm run init-db
npm run seed
```

### 3. Configure Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
npm install
```

## 🎮 Running the Application

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The application will be live at `http://localhost:5173`.

## 📚 API Documentation

### Hospitals
- `GET /api/hospitals`: Get all hospitals
- `GET /api/hospitals/:id/nearest-ambulance`: Find nearest available ambulance (Uses PostGIS + Redis Cache)

### Ambulances
- `GET /api/ambulances`: Get all ambulances
- `POST /api/ambulances/:id/simulate-movement`: Simulates random movement and broadcasts via WebSocket

## 📖 Learning Log

### Most Challenging Bug: PostGIS Geography vs Geometry Types

**The Problem:**
Initially, I used the `geometry` type for location columns. While this worked for flat planes, `ST_Distance` returned results in "degrees" instead of meters/kilometers. This led to incorrect proximity sorting and unreadable distance values.

**The Solution:**
I refactored the database schema to use the `geography` type.
```sql
location GEOGRAPHY(POINT, 4326)
```
This ensured that `ST_Distance` automatically utilized spherical calculations, returning accurate real-world distances in meters. It also allowed the use of the `<->` KNN operator for efficient nearest-neighbor searches at scale.

**Key Learning:**
Always use `geography` for real-world distances and `geometry` for planar/projected coordinates when accuracy over large distances is required.

---

Built as a technical assessment for the GIS-Integrated Hospital Dashboard project.
