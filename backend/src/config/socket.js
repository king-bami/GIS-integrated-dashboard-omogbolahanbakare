import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // In production, restrict this to your frontend URL
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const emitAmbulanceUpdate = (ambulanceData) => {
    if (io) {
        io.emit('ambulance_location_update', ambulanceData);
    }
};

export const emitStatusUpdate = (updateData) => {
    if (io) {
        io.emit('status_update', updateData);
    }
};

export const emitUnitAlert = (alertData) => {
    if (io) {
        io.emit('unit_alert', alertData);
    }
};
