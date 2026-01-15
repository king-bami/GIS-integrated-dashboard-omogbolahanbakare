import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Hospital, Ambulance } from '../types';

interface MapComponentProps {
    hospitals: Hospital[];
    ambulances: Ambulance[];
    selectedHospital: Hospital | null;
    nearestAmbulance: Ambulance | null;
    onHospitalClick: (hospital: Hospital) => void;
    isScanning?: boolean;
}

const MapComponent = ({
    hospitals,
    ambulances,
    selectedHospital,
    nearestAmbulance,
    onHospitalClick,
    isScanning = false
}: MapComponentProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
    const radarRef = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'carto-light': {
                        type: 'raster',
                        tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'],
                        tileSize: 256,
                        attribution: '&copy; OpenStreetMap &copy; CARTO',
                    },
                },
                layers: [
                    {
                        id: 'carto-light',
                        type: 'raster',
                        source: 'carto-light',
                        paint: { 'raster-saturation': 0, 'raster-contrast': 0 }
                    },
                ],
            },
            center: [3.3792, 6.5244],
            zoom: 12,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Radar Scanning Effect
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (radarRef.current) {
            radarRef.current.remove();
            radarRef.current = null;
        }

        if (isScanning && selectedHospital) {
            const el = document.createElement('div');
            el.className = 'radar-emitter';

            radarRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([selectedHospital.longitude, selectedHospital.latitude])
                .addTo(map.current);
        }
    }, [isScanning, selectedHospital, mapLoaded]);


    // Update markers
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        Object.keys(markersRef.current).forEach(key => {
            markersRef.current[key].remove();
            delete markersRef.current[key];
        });

        // Add Hospitals
        hospitals.forEach(hospital => {
            const el = document.createElement('div');
            el.className = 'custom-marker hospital-marker';
            el.innerHTML = `<div class="marker-dot" style="background: #FFFFFF; border: 2px solid #DC2626; width: 32px; height: 32px; color: #DC2626; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 50%;">H</div>`;
            el.style.cursor = 'pointer';
            el.onclick = () => onHospitalClick(hospital);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([hospital.longitude, hospital.latitude])
                .addTo(map.current!);

            markersRef.current[`h-${hospital.id}`] = marker;
        });

        // Add Ambulances
        ambulances.forEach(ambulance => {
            const el = document.createElement('div');
            el.className = `marker-wrapper`;

            const isBusy = ambulance.status !== 'available';
            const rippleClass = isBusy ? 'marker-ripple-rapid' : 'marker-ripple';
            const color = isBusy ? '#DC2626' : '#10B981'; // Red (Busy) vs Green (Available)

            const rippleHTML = `<div class="${rippleClass}" style="background: ${color}"></div>`;

            el.innerHTML = `
                ${rippleHTML}
                <div class="marker-dot" style="background: ${color}; border-color: white;">
                    A
                </div>
            `;

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([ambulance.longitude, ambulance.latitude])
                .addTo(map.current!);
            markersRef.current[`a-${ambulance.id}`] = marker;
        });

    }, [hospitals, ambulances, mapLoaded]);

    // Connection Line (Uplink)
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (map.current.getLayer('responder-line')) map.current.removeLayer('responder-line');
        if (map.current.getSource('responder-source')) map.current.removeSource('responder-source');

        if (selectedHospital && nearestAmbulance && !isScanning) {
            map.current.addSource('responder-source', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [selectedHospital.longitude, selectedHospital.latitude],
                            [nearestAmbulance.longitude, nearestAmbulance.latitude]
                        ]
                    },
                    properties: {}
                }
            });

            map.current.addLayer({
                id: 'responder-line',
                type: 'line',
                source: 'responder-source',
                paint: {
                    'line-color': '#DC2626', // Command Red
                    'line-width': 3,
                    'line-dasharray': [2, 2],
                    'line-opacity': 0.8
                }
            });

            const bounds = new maplibregl.LngLatBounds()
                .extend([selectedHospital.longitude, selectedHospital.latitude])
                .extend([nearestAmbulance.longitude, nearestAmbulance.latitude]);

            map.current.fitBounds(bounds, { padding: 100, duration: 2000 });
        }
    }, [selectedHospital, nearestAmbulance, isScanning, mapLoaded]);

    return <div ref={mapContainer} className="map" />;
};

export default MapComponent;
