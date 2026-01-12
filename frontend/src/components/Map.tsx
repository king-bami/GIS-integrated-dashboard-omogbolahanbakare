import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Hospital, Ambulance } from '../types';

interface MapComponentProps {
    hospitals: Hospital[];
    ambulances: Ambulance[];
    selectedHospital: Hospital | null;
    nearestAmbulance: Ambulance | null;
    onHospitalClick: (hospital: Hospital) => void;
}

const MapComponent = ({
    hospitals,
    ambulances,
    selectedHospital,
    nearestAmbulance,
    onHospitalClick,
}: MapComponentProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        // Initialize map
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'osm-tiles': {
                        type: 'raster',
                        tiles: [
                            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors',
                    },
                },
                layers: [
                    {
                        id: 'osm-tiles',
                        type: 'raster',
                        source: 'osm-tiles',
                        minzoom: 0,
                        maxzoom: 19,
                    },
                ],
            },
            center: [3.3792, 6.5244], // Lagos, Nigeria
            zoom: 11,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update hospital markers
    useEffect(() => {
        if (!map.current) return;

        // Clear existing hospital markers
        Object.keys(markersRef.current).forEach((key) => {
            if (key.startsWith('hospital-')) {
                markersRef.current[key].remove();
                delete markersRef.current[key];
            }
        });

        // Add hospital markers
        hospitals.forEach((hospital) => {
            const el = document.createElement('div');
            el.className = 'hospital-marker';
            el.innerHTML = '🏥';
            el.style.fontSize = '32px';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s';

            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.2)';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
            });

            el.addEventListener('click', () => {
                onHospitalClick(hospital);
            });

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${hospital.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #b4b4c5;">${hospital.address}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #7a7a8c;">Capacity: ${hospital.capacity} beds</p>
        </div>
      `);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([hospital.longitude, hospital.latitude])
                .setPopup(popup)
                .addTo(map.current!);

            markersRef.current[`hospital-${hospital.id}`] = marker;
        });
    }, [hospitals, onHospitalClick]);

    // Update ambulance markers
    useEffect(() => {
        if (!map.current) return;

        // Clear existing ambulance markers
        Object.keys(markersRef.current).forEach((key) => {
            if (key.startsWith('ambulance-')) {
                markersRef.current[key].remove();
                delete markersRef.current[key];
            }
        });

        // Add ambulance markers
        ambulances.forEach((ambulance) => {
            const el = document.createElement('div');
            el.className = 'ambulance-marker';
            el.innerHTML = '🚑';
            el.style.fontSize = '28px';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s';

            if (ambulance.status !== 'available') {
                el.style.opacity = '0.5';
            }

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${ambulance.vehicle_number || ambulance.vehicleNumber}</h3>
          <p style="margin: 0; font-size: 12px; color: #b4b4c5;">Driver: ${ambulance.driver_name || ambulance.driverName}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px;">
            <span style="padding: 2px 6px; background: ${ambulance.status === 'available' ? '#4facfe' : '#fa709a'}; border-radius: 4px; color: white;">
              ${ambulance.status}
            </span>
          </p>
        </div>
      `);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([ambulance.longitude, ambulance.latitude])
                .setPopup(popup)
                .addTo(map.current!);

            markersRef.current[`ambulance-${ambulance.id}`] = marker;
        });
    }, [ambulances]);

    // Draw line between selected hospital and nearest ambulance
    useEffect(() => {
        if (!map.current) return;

        // Remove existing line
        if (map.current.getLayer('route-line')) {
            map.current.removeLayer('route-line');
        }
        if (map.current.getSource('route')) {
            map.current.removeSource('route');
        }

        if (selectedHospital && nearestAmbulance) {
            const coordinates = [
                [selectedHospital.longitude, selectedHospital.latitude],
                [nearestAmbulance.longitude, nearestAmbulance.latitude],
            ];

            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                },
            });

            map.current.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#667eea',
                    'line-width': 4,
                    'line-opacity': 0.8,
                },
            });

            // Fit map to show both markers
            const bounds = new maplibregl.LngLatBounds();
            coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
            map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
        }
    }, [selectedHospital, nearestAmbulance]);

    return <div ref={mapContainer} className="map" />;
};

export default MapComponent;
