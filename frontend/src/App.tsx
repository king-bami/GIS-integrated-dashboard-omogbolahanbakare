import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import MapComponent from './components/Map';
import { hospitalsAPI, ambulancesAPI } from './services/api';
import { Hospital, Ambulance, APIResponse, NearestAmbulanceResponse } from './types';
import './index.css';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

function App() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [nearestAmbulance, setNearestAmbulance] = useState<Ambulance | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState(false);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('🔌 Connected to real-time updates');
    });

    socket.on('ambulance_location_update', (updatedAmbulance: Ambulance) => {
      console.log('🚑 Real-time ambulance update:', updatedAmbulance);
      setAmbulances((prev) =>
        prev.map((amb) => amb.id === updatedAmbulance.id ? { ...amb, ...updatedAmbulance } : amb)
      );

      // Update nearest ambulance info if it's the one that moved
      setNearestAmbulance((prev) =>
        prev && prev.id === updatedAmbulance.id ? { ...prev, ...updatedAmbulance } : prev
      );
    });

    socket.on('status_update', (updatedAmbulance: Ambulance) => {
      console.log('📝 Real-time status update:', updatedAmbulance);
      setAmbulances((prev) =>
        prev.map((amb) => amb.id === updatedAmbulance.id ? { ...amb, ...updatedAmbulance } : amb)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [hospitalsRes, ambulancesRes] = await Promise.all([
          hospitalsAPI.getAll(),
          ambulancesAPI.getAll(),
        ]);

        setHospitals(hospitalsRes.data);
        setAmbulances(ambulancesRes.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please ensure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle hospital selection and find nearest ambulance
  const handleHospitalClick = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setSearching(true);
    setNearestAmbulance(null);
    setCacheHit(false);

    try {
      const response: APIResponse<NearestAmbulanceResponse> = await hospitalsAPI.findNearestAmbulance(hospital.id);

      if (response.data.nearestAmbulance) {
        setNearestAmbulance(response.data.nearestAmbulance);
      }

      setCacheHit(response.cached || false);
      setError(null);
    } catch (err) {
      console.error('Error finding nearest ambulance:', err);
      setError('Failed to find nearest ambulance');
    } finally {
      setSearching(false);
    }
  };

  // Simulate ambulance movement
  const handleSimulateMovement = async (ambulanceId: number) => {
    try {
      await ambulancesAPI.simulateMovement(ambulanceId);

      // Refresh ambulances
      const ambulancesRes = await ambulancesAPI.getAll();
      setAmbulances(ambulancesRes.data);

      // If this was the selected ambulance, refresh the nearest ambulance data
      if (selectedHospital) {
        const response: APIResponse<NearestAmbulanceResponse> = await hospitalsAPI.findNearestAmbulance(selectedHospital.id);
        if (response.data.nearestAmbulance) {
          setNearestAmbulance(response.data.nearestAmbulance);
        }
        setCacheHit(response.cached || false);
      }
    } catch (err) {
      console.error('Error simulating movement:', err);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Loading hospital data...</p>
        </div>
      </div>
    );
  }

  if (error && hospitals.length === 0) {
    return (
      <div className="app">
        <div className="loading">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h2>{error}</h2>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Please check the README.md for setup instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <h1>Hospital Dashboard</h1>
              <p>GIS-Integrated Emergency Response System</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-value">{hospitals.length}</div>
              <div className="stat-label">Hospitals</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{ambulances.filter(a => a.status === 'available').length}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{ambulances.length}</div>
              <div className="stat-label">Total Ambulances</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Hospitals List */}
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">🏥</span>
                Hospitals
              </h2>
              <span className="badge badge-primary">{hospitals.length}</span>
            </div>
            <div className="hospital-list">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className={`hospital-item ${selectedHospital?.id === hospital.id ? 'active' : ''}`}
                  onClick={() => handleHospitalClick(hospital)}
                >
                  <div className="hospital-name">{hospital.name}</div>
                  <div className="hospital-address">
                    <span>📍</span>
                    {hospital.address}
                  </div>
                  <div className="hospital-meta">
                    <span>🛏️ {hospital.capacity} beds</span>
                    <span>📞 {hospital.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearest Ambulance Info */}
          {selectedHospital && (
            <div className="card fade-in">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon">🚑</span>
                  Nearest Ambulance
                </h2>
                {cacheHit && (
                  <span className="badge badge-success" title="Result from cache">
                    ⚡ Cached
                  </span>
                )}
              </div>

              {searching ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p className="loading-text">Finding nearest ambulance...</p>
                </div>
              ) : nearestAmbulance ? (
                <div className="ambulance-info">
                  <div className="info-row">
                    <span className="info-label">Vehicle</span>
                    <span className="info-value">{nearestAmbulance.vehicleNumber || nearestAmbulance.vehicle_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Driver</span>
                    <span className="info-value">{nearestAmbulance.driverName || nearestAmbulance.driver_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{nearestAmbulance.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status</span>
                    <span className="badge badge-success">{nearestAmbulance.status}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Distance</span>
                    <span className="distance-highlight">
                      {nearestAmbulance.distanceKm?.toFixed(2)} km
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Equipment</span>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                      {nearestAmbulance.equipment?.join(', ')}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary mt-2"
                    style={{ width: '100%' }}
                    onClick={() => handleSimulateMovement(nearestAmbulance.id)}
                  >
                    🎯 Simulate Movement
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No available ambulances found</p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="map-container fade-in">
          <MapComponent
            hospitals={hospitals}
            ambulances={ambulances}
            selectedHospital={selectedHospital}
            nearestAmbulance={nearestAmbulance}
            onHospitalClick={handleHospitalClick}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
