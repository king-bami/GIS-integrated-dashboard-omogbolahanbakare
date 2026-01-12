export interface Hospital {
    id: number;
    name: string;
    address: string;
    phone: string;
    capacity: number;
    specialties: string[];
    latitude: number;
    longitude: number;
    created_at: string;
    updated_at: string;
}

export interface Ambulance {
    id: number;
    vehicle_number: string;
    vehicleNumber?: string;
    status: 'available' | 'on-call' | 'off-duty' | 'maintenance';
    driver_name: string;
    driverName?: string;
    phone: string;
    equipment: string[];
    latitude: number;
    longitude: number;
    last_updated: string;
    created_at: string;
    distanceMeters?: number;
    distanceKm?: number;
}

export interface NearestAmbulanceResponse {
    hospital: {
        id: number;
        name: string;
        latitude: number;
        longitude: number;
    };
    nearestAmbulance: Ambulance | null;
    message?: string;
}

export interface APIResponse<T> {
    success: boolean;
    cached?: boolean;
    data: T;
    error?: string;
    message?: string;
}
