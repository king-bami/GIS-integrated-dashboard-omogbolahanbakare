import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Map, Building2, Settings, Search, Activity, CheckCircle2, ArrowRight, Calendar, Clock } from 'lucide-react';
import MapComponent from './components/Map';
import Loader from './components/Loader';
import { hospitalsAPI, ambulancesAPI } from './services/api';
import type { Hospital, Ambulance, APIResponse, NearestAmbulanceResponse } from './types';
import './index.css';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'mgmt'>('map');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [nearestAmbulance, setNearestAmbulance] = useState<Ambulance | null>(null);
  const [nearbyAmbulances, setNearbyAmbulances] = useState<Ambulance[]>([]);
  const [searching, setSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // New States for Alerts and UX
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Management State
  const [showModal, setShowModal] = useState<'hosp' | 'amb' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Timer & Movement State
  const [arrivalTarget, setArrivalTarget] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('00:00');
  const [movementInterval, setMovementInterval] = useState<any>(null);
  const [showArrival, setShowArrival] = useState(false);

  // Computed State for Search
  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAmbulances = ambulances.filter(a =>
    a.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.driver_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize Data
  useEffect(() => {
    loadData();
    // Update clock every minute
    const clockTimer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(clockTimer);
  }, []);

  // Socket Connection
  useEffect(() => {
    const socket = io(SOCKET_URL);
    const updateHandler = (data: Ambulance) => {
      setAmbulances(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
      // @ts-ignore
      setNearestAmbulance(prev => prev && prev.id === data.id ? { ...prev, ...data } : prev);
      setNearbyAmbulances(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
    };

    socket.on('ambulance_location_update', updateHandler);
    socket.on('status_update', updateHandler);
    socket.on('unit_alert', (data: any) => {
      setAlertMessage(`URGENT: UNIT ${data.vehicleNumber} ACKNOWLEDGED`);
      setIsAlerting(true);
      setTimeout(() => { setIsAlerting(false); setAlertMessage(null); }, 3000);
    });
    return () => { socket.disconnect(); };
  }, []);

  // Cleanup movement interval
  useEffect(() => {
    return () => {
      if (movementInterval) clearInterval(movementInterval);
    };
  }, [movementInterval]);

  const loadData = async () => {
    try {
      // Artifically delay for loader demo if too fast
      const [hRes, aRes] = await Promise.all([
        hospitalsAPI.getAll(),
        ambulancesAPI.getAll(),
        new Promise(resolve => setTimeout(resolve, 2000)) // Force 2s load for GSAP impact
      ]);
      setHospitals(hRes.data);
      setAmbulances(aRes.data);
      // @ts-ignore
      setIsCached(hRes.cached || aRes.cached || false);
    } catch (err) { console.error('Data load error'); }
    finally { setIsLoading(false); }
  };

  const handleHospitalSelection = async (h: Hospital) => {
    if (activeTab !== 'map') return;
    setSelectedHospital(h);
    setSearching(true);
    setNearestAmbulance(null);
    setNearbyAmbulances([]);

    try {
      const response: APIResponse<NearestAmbulanceResponse> = await hospitalsAPI.findNearestAmbulance(h.id);
      if (response.data.nearestAmbulance) setNearestAmbulance(response.data.nearestAmbulance);
      if (response.data.nearbyAmbulances) setNearbyAmbulances(response.data.nearbyAmbulances);
      setIsCached(response.cached || false);
    } catch (err) { console.error('Proximity error'); }
    finally { setSearching(false); }
  };

  // Timer Ticker
  useEffect(() => {
    if (!arrivalTarget) return;
    const timer = setInterval(() => {
      const diff = arrivalTarget - Date.now();
      if (diff <= 0) {
        setCountdown('00:00');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [arrivalTarget]);

  const handleDispatch = async () => {
    if (!nearestAmbulance || !selectedHospital) return;

    setIsAlerting(true);
    setAlertMessage("AUTHORIZING DISPATCH SEQUENCE...");

    setTimeout(async () => {
      setAlertMessage("UPLINK ESTABLISHED. TRANSMITTING COORDINATES.");
      try {
        // @ts-ignore
        await ambulancesAPI.updateStatus(nearestAmbulance.id, 'busy');

        const tripTimeMs = 20000; // 20s travel time
        setArrivalTarget(Date.now() + tripTimeMs);

        // Movement Simulation
        // @ts-ignore
        let currentLat = nearestAmbulance.latitude;
        // @ts-ignore
        let currentLng = nearestAmbulance.longitude;
        const targetLat = selectedHospital.latitude;
        const targetLng = selectedHospital.longitude;

        const steps = 10;
        const stepLat = (targetLat - currentLat) / steps;
        const stepLng = (targetLng - currentLng) / steps;

        const moveLoop = setInterval(async () => {
          currentLat += stepLat;
          currentLng += stepLng;

          // Check Arrival Proximity
          if (Math.abs(currentLat - targetLat) < 0.0002) {
            clearInterval(moveLoop);
            setArrivalTarget(null); // Stop timer
            // @ts-ignore
            await ambulancesAPI.updateStatus(nearestAmbulance.id, 'available');

            // Trigger Arrival Success
            setShowArrival(true);
            setTimeout(() => setShowArrival(false), 5000);
          } else {
            // @ts-ignore
            await ambulancesAPI.updateLocation(nearestAmbulance.id, currentLat, currentLng);
          }
        }, 2000); // Update every 2s

        setMovementInterval(moveLoop);
        // @ts-ignore
        setAlertMessage(`UNIT ${nearestAmbulance.vehicleNumber || nearestAmbulance.vehicle_number} EN ROUTE`);
        setTimeout(() => { setIsAlerting(false); setAlertMessage(null); }, 2500);
      } catch (err) {
        setAlertMessage("DISPATCH FAILED. RETRY.");
        setTimeout(() => setIsAlerting(false), 2000);
      }
    }, 1500);
  };

  const saveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showModal === 'hosp') {
        if (editItem) await hospitalsAPI.update(editItem.id, formData);
        else await hospitalsAPI.create(formData);
      } else {
        if (editItem) await ambulancesAPI.update(editItem.id, formData);
        else await ambulancesAPI.create(formData);
      }
      setShowModal(null);
      loadData();
    } catch { alert('Operation failed.'); }
  };

  const decommissionItem = async (type: 'h' | 'a', id: number) => {
    if (!window.confirm('Confirm decommissioning?')) return;
    try {
      if (type === 'h') await hospitalsAPI.delete(id);
      else await ambulancesAPI.delete(id);
      loadData();
    } catch { alert('Failed.'); }
  };

  const openConfig = (type: 'hosp' | 'amb', item: any = null) => {
    setEditItem(item);
    setFormData(item || (type === 'hosp' ? { specialties: [] } : { equipment: [] }));
    setShowModal(type);
  };

  // Greeting Helper
  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Date Formatter
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) return <Loader />;

  return (
    <div className="app">
      {isAlerting && (
        <div className="dispatch-overlay">
          <Activity size={64} className="text-red-500 animate-pulse mb-4" />
          <div className="dispatch-text">{alertMessage}</div>
        </div>
      )}

      {showArrival && (
        <div className="arrival-notification">
          <CheckCircle2 className="arrival-icon" />
          <div className="arrival-text">MISSION COMPLETE: UNIT ARRIVED</div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="profile-section">
          <div style={{ color: 'var(--text-sidebar)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            {getGreeting()}, Admin
          </div>
          <div className="user-greeting">COMMAND CENTER</div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="current-date" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sidebar)' }}>
              <Calendar size={14} />
              <span>{formatDate(currentDateTime)}</span>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sidebar)' }}>
              <Clock size={14} />
              <span>{formatTime(currentDateTime)}</span>
            </div>
          </div>

          <div className="location-tag">
            <Map size={12} />
            <span>LAGOS SECTOR 1</span>
          </div>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
            <Map size={18} />
            <span>List of hospitals on Map</span>
          </div>
          <div className={`nav-item ${activeTab === 'mgmt' ? 'active' : ''}`} onClick={() => setActiveTab('mgmt')}>
            <Building2 size={18} />
            <span>View/Update Hospitals and Ambulances</span>
          </div>
        </nav>

        {activeTab === 'map' && (
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '20px', borderTop: '1px solid var(--border-sidebar)', paddingTop: '20px' }}>
            <div className="stat-label">DEPLOYMENT TARGETS</div>
            {filteredHospitals.map(h => (
              <div key={h.id}
                onClick={() => handleHospitalSelection(h)}
                style={{
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  cursor: 'pointer',
                  background: selectedHospital?.id === h.id ? 'var(--primary-dim)' : 'transparent',
                  border: selectedHospital?.id === h.id ? '1px solid var(--primary)' : '1px solid transparent',
                  color: selectedHospital?.id === h.id ? 'var(--text-inverse)' : 'var(--text-sidebar)'
                }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{h.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>{h.address}</div>
              </div>
            ))}
          </div>
        )}

        <div className="nav-item" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-sidebar)' }}>
          <Settings size={18} />
          <span>System Config</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="search-container">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="telemetry-status">
            <Activity size={14} color="#166534" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', letterSpacing: '1px' }}>LIVE FEED</span>
          </div>
        </div>

        {activeTab === 'map' ? (
          <div className="dashboard-grid">
            <div className="glass-widget widget-map">
              <MapComponent
                hospitals={hospitals}
                ambulances={ambulances}
                selectedHospital={selectedHospital}
                // @ts-ignore
                nearestAmbulance={nearestAmbulance}
                onHospitalClick={handleHospitalSelection}
                isScanning={searching}
              />

              {/* Tactical HUD */}
              {selectedHospital && (
                <div className="glass-widget" style={{
                  position: 'absolute', bottom: '24px', right: '24px', width: '360px', zIndex: 20,
                  background: 'var(--bg-panel)', border: '1px solid var(--primary)'
                }}>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div className="stat-label" style={{ color: 'var(--primary)' }}>TARGET DESIGNATION</div>
                    <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedHospital.name.toUpperCase()}</div>
                  </div>

                  {searching ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>CALCULATING VECTORS...</div>
                    : arrivalTarget ? (
                      <div className="mission-active-banner">
                        <div className="stat-label" style={{ color: 'var(--primary)' }}>STATUS: EN ROUTE</div>
                        <div className="tactical-timer" style={{ color: 'var(--primary)', textShadow: 'none' }}>{countdown}</div>
                        <div style={{ fontSize: '11px', color: 'var(--primary)' }}>ETA TO TARGET</div>
                      </div>
                    ) : nearbyAmbulances.length > 0 ? (
                      <>
                        <div className="tactical-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {nearbyAmbulances.map((amb, index) => (
                            <div key={amb.id}
                              // @ts-ignore
                              className={`tactical-item ${nearestAmbulance?.id === amb.id ? 'active' : ''}`}
                              // @ts-ignore
                              onClick={() => setNearestAmbulance(amb)}
                              style={{ borderColor: index === 0 ? 'var(--primary)' : 'var(--border)' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{amb.vehicleNumber || amb.vehicle_number}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{amb.distanceKm?.toFixed(2)} KM AWAY</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '16px' }}>{amb.etaMinutes}m</div>
                                </div>
                              </div>
                              {index === 0 && <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ArrowRight size={10} /> RECOMMENDED
                              </div>}
                            </div>
                          ))}
                        </div>
                        <button className="btn-alert" onClick={handleDispatch} style={{ marginTop: '16px' }}>
                          AUTHORIZE DISPATCH
                        </button>
                      </>
                    ) : <div>NO UNITS IN RANGE</div>}
                </div>
              )}
            </div>

            <div className="glass-widget widget-stats">
              <div className="stat-label">FLEET STATUS</div>
              <div className="stat-value">{ambulances.length} UNITS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '4px' }}>
                  <div className="stat-label">READY</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{ambulances.filter(a => a.status === 'available').length}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '4px' }}>
                  <div className="stat-label">ACTIVE</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{ambulances.filter(a => a.status !== 'available').length}</div>
                </div>
              </div>

              {/* Cache Indicator */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label" style={{ marginBottom: 0 }}>DATA SOURCE</span>
                <div style={{
                  fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px',
                  background: isCached ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: isCached ? '#0284C7' : '#166534',
                  border: `1px solid ${isCached ? '#BAE6FD' : '#86EFAC'}`
                }}>
                  {isCached ? 'OPTIMIZED (CACHE)' : 'LIVE STREAM'}
                </div>
              </div>
            </div>

            <div className="glass-widget widget-feed">
              <div className="stat-label" style={{ marginBottom: '16px' }}>TACTICAL FEED</div>
              <div className="tactical-list">
                <div className="tactical-item">
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SYSTEM • {formatTime(currentDateTime)}</div>
                  <div style={{ fontSize: '13px' }}>Grid initialization complete.</div>
                </div>
                {nearestAmbulance && (
                  <div className="tactical-item" style={{ borderLeft: '2px solid var(--primary)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--primary)' }}>ALERT</div>
                    {/* @ts-ignore */}
                    <div style={{ fontSize: '13px' }}>Vector request: {nearestAmbulance.vehicle_number}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-widget" style={{ padding: '32px', overflow: 'auto' }}>
            {/* Management View */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>INFRASTRUCTURE REGISTRY</h1>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-alert" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => openConfig('hosp')}>+ FACILITY</button>
                <button className="btn-alert" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => openConfig('amb')}>+ UNIT</button>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 className="stat-label" style={{ marginBottom: '16px' }}>REGISTERED FACILITIES</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredHospitals.map(h => (
                  <div key={h.id} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700 }}>{h.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0' }}>{h.address}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button style={{ fontSize: '11px', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => openConfig('hosp', h)}>CONFIGURE</button>
                      <button style={{ fontSize: '11px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => decommissionItem('h', h.id)}>X DECOMMISSION</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 className="stat-label" style={{ marginBottom: '16px' }}>MOBILE FLEET</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredAmbulances.map(a => (
                  <div key={a.id} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700 }}>{a.vehicle_number}</div>
                      <div style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-panel)', borderRadius: '2px' }}>{a.status}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>P: {a.driver_name}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button style={{ fontSize: '11px', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => openConfig('amb', a)}>CONFIGURE</button>
                      <button style={{ fontSize: '11px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => decommissionItem('a', a.id)}>X DECOMMISSION</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="dispatch-overlay">
          <div className="glass-widget" style={{ width: '500px', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>CONFIGURE ASSET</h2>
            <form onSubmit={saveConfiguration}>
              {showModal === 'hosp' ? (
                <>
                  <div style={{ marginBottom: '16px' }}><label className="stat-label">NAME</label><input className="search-input" style={{ background: 'var(--bg-surface)', padding: '12px' }} value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                  <div style={{ marginBottom: '16px' }}><label className="stat-label">ADDRESS</label><input className="search-input" style={{ background: 'var(--bg-surface)', padding: '12px' }} value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} required /></div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}><label className="stat-label">CALLSIGN</label><input className="search-input" style={{ background: 'var(--bg-surface)', padding: '12px' }} value={formData.vehicle_number || ''} onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })} required /></div>
                  <div style={{ marginBottom: '16px' }}><label className="stat-label">OPERATOR</label><input className="search-input" style={{ background: 'var(--bg-surface)', padding: '12px' }} value={formData.driver_name || ''} onChange={e => setFormData({ ...formData, driver_name: e.target.value })} required /></div>
                </>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                <button type="button" className="btn-alert" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }} onClick={() => setShowModal(null)}>CANCEL</button>
                <button type="submit" className="btn-alert">COMMIT</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
