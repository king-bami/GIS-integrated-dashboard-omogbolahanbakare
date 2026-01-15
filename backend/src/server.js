import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { connectRedis } from './config/redis.js';
import { initSocket } from './config/socket.js';
import pool from './config/database.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import ambulanceRoutes from './routes/ambulanceRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await pool.query('SELECT 1');

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: 'connected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API Routes
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/ambulances', ambulanceRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'GIS-Integrated Hospital Dashboard API',
        version: '1.0.0',
        endpoints: {
            hospitals: '/api/hospitals',
            ambulances: '/api/ambulances',
            health: '/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
const startServer = async () => {
    try {
        // Connect to Redis
        await connectRedis();

        // Test database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connection verified');

        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 GIS-Integrated Hospital Dashboard API                ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║   Real-time WebSockets enabled                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║                                                            ║
║   API Endpoints:                                           ║
║   - GET  /api/hospitals                                    ║
║   - GET  /api/hospitals/:id                                ║
║   - GET  /api/hospitals/:id/nearest-ambulance              ║
║   - GET  /api/ambulances                                   ║
║   - GET  /api/ambulances/:id                               ║
║   - PUT  /api/ambulances/:id/location                      ║
║   - PUT  /api/ambulances/:id/status                        ║
║   - POST /api/ambulances/:id/simulate-movement             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

startServer();
