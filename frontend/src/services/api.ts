import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Hospitals API
export const hospitalsAPI = {
    getAll: async () => {
        const response = await api.get('/hospitals');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get(`/hospitals/${id}`);
        return response.data;
    },

    findNearestAmbulance: async (id: number) => {
        const response = await api.get(`/hospitals/${id}/nearest-ambulance`);
        return response.data;
    },
};

// Ambulances API
export const ambulancesAPI = {
    getAll: async () => {
        const response = await api.get('/ambulances');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get(`/ambulances/${id}`);
        return response.data;
    },

    updateLocation: async (id: number, latitude: number, longitude: number) => {
        const response = await api.put(`/ambulances/${id}/location`, {
            latitude,
            longitude,
        });
        return response.data;
    },

    updateStatus: async (id: number, status: string) => {
        const response = await api.put(`/ambulances/${id}/status`, {
            status,
        });
        return response.data;
    },

    simulateMovement: async (id: number) => {
        const response = await api.post(`/ambulances/${id}/simulate-movement`);
        return response.data;
    },
};

export default api;
