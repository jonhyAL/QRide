import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  Compass, 
  Radio, 
  Satellite, 
  ShieldCheck, 
  Gauge, 
  AlertTriangle,
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Maximize2, 
  BatteryCharging, 
  Wifi,
  MapPin,
  ExternalLink,
  Layers,
  Crosshair
} from 'lucide-react';
import { loadLeaflet, MAP_PROVIDERS } from '../../utils/leafletLoader';

// Coordenadas reales de una ruta urbana icónica (Paseo de la Reforma, CDMX)
const REAL_ROUTE = [
  { lat: 19.42702, lng: -99.16766, name: 'Ángel de la Independencia', speed: 42, heading: 58, hdop: 0.8, sats: 12 },
  { lat: 19.42861, lng: -99.16430, name: 'Reforma y Florencia', speed: 48, heading: 62, hdop: 0.9, sats: 12 },
  { lat: 19.43085, lng: -99.15980, name: 'Glorieta del Ahuehuete / Cuauhtémoc', speed: 45, heading: 68, hdop: 0.8, sats: 11 },
  { lat: 19.43260, lng: -99.15610, name: 'Cruce Paseo de la Reforma e Insurgentes', speed: 36, heading: 74, hdop: 0.9, sats: 11 },
  { lat: 19.43460, lng: -99.15190, name: 'Glorieta de las Mujeres que Luchan', speed: 46, heading: 82, hdop: 1.0, sats: 10 },
  { lat: 19.43610, lng: -99.14680, name: 'Reforma y Av. Hidalgo / Metro Hidalgo', speed: 32, heading: 92, hdop: 1.1, sats: 10 },
  { lat: 19.43520, lng: -99.14120, name: 'Palacio de Bellas Artes / Alameda Central', speed: 24, heading: 105, hdop: 1.1, sats: 9 },
  { lat: 19.43410, lng: -99.13680, name: 'Eje Central y Av. 5 de Mayo', speed: 18, heading: 112, hdop: 1.2, sats: 9 },
  { lat: 19.43262, lng: -99.13320, name: 'Plaza de la Constitución (Zócalo CDMX)', speed: 0, heading: 118, hdop: 1.1, sats: 9 }, // Detenido en Zócalo
];

export function LiveGpsTracker({ isOpen = true, onClose, isModal = false }) {
  // Estados disponibles: 'moving' | 'stopped' | 'sleep' | 'no_signal'
  const [vehicleState, setVehicleState] = useState('moving');
  const [simIndex, setSimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Proveedor de mapa: 'googleRoads' | 'googleSatellite' | 'cartoDark'
  const [mapProvider, setMapProvider] = useState('googleRoads');
  
  // Telemetría en vivo
  const [currentCoords, setCurrentCoords] = useState(REAL_ROUTE[0]);
  const [trailCoords, setTrailCoords] = useState([REAL_ROUTE[0]]);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [userRealLocation, setUserRealLocation] = useState(null);

  // Referencias para Leaflet
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const tileLayerRef = useRef(null);
  const timerRef = useRef(null);

  // 1. Inicializar mapa real interactivo con Leaflet
  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Si ya hay una instancia, limpiarla antes de reinstanciar
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Crear mapa
      const map = L.map(mapContainerRef.current, {
        center: [REAL_ROUTE[0].lat, REAL_ROUTE[0].lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // Añadir controles de zoom en la esquina superior izquierda
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Añadir capa de azulejos (Tiles) inicial
      const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;
      tileLayerRef.current = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      // Icono de vehículo personalizado con giro de orientación (Heading)
      const createVehicleIcon = (headingDeg) => {
        return L.divIcon({
          className: 'custom-vehicle-marker',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 2.5px solid #06b6d4; box-shadow: 0 4px 14px rgba(6,182,212,0.6); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); transition: transform 0.4s ease-out;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#38bdf8" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });
      };

      // Marcador del vehículo
      markerRef.current = L.marker([REAL_ROUTE[0].lat, REAL_ROUTE[0].lng], {
        icon: createVehicleIcon(REAL_ROUTE[0].heading)
      }).addTo(map);

      // Polilínea de la estela / ruta
      polylineRef.current = L.polyline([[REAL_ROUTE[0].lat, REAL_ROUTE[0].lng]], {
        color: '#06b6d4',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: null
      }).addTo(map);

      mapInstanceRef.current = map;
    }).catch(err => {
      console.error('Error inicializando mapa Leaflet:', err);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Cambiar capa de tiles dinámicamente cuando el usuario selecciona Google Maps o CartoDB
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = window.L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: ['a', 'b', 'c', 'd']
    }).addTo(mapInstanceRef.current);
  }, [mapProvider]);

  // 3. Contador de segundos de actualización
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 4. Ciclo de Simulación / Telemetría en Tiempo Real
  useEffect(() => {
    if (!isPlaying) return;

    let delay = 1400; // ~1 Hz en movimiento
    if (vehicleState === 'stopped') delay = 5000;
    if (vehicleState === 'sleep') delay = 9000;
    if (vehicleState === 'no_signal') return;

    timerRef.current = setTimeout(() => {
      const nextIdx = (simIndex + 1) % REAL_ROUTE.length;
      const targetPoint = REAL_ROUTE[nextIdx];

      // Filtro de calidad (HDOP < 2.5 y Satélites >= 4)
      if (targetPoint.hdop > 2.5 || targetPoint.sats < 4) {
        console.warn('Punto GPS descartado por filtro de calidad');
        return;
      }

      setCurrentCoords(targetPoint);
      setSecondsAgo(0);
      setSimIndex(nextIdx);

      // Actualizar mapa, marcador y estela
      if (mapInstanceRef.current && markerRef.current && window.L) {
        const nextLatLng = [targetPoint.lat, targetPoint.lng];
        
        // Mover marcador
        markerRef.current.setLatLng(nextLatLng);
        
        // Rotar icono según el heading
        markerRef.current.setIcon(
          window.L.divIcon({
            className: 'custom-vehicle-marker',
            html: `
              <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 2.5px solid #06b6d4; box-shadow: 0 4px 14px rgba(6,182,212,0.6); display: flex; align-items: center; justify-content: center; transform: rotate(${targetPoint.heading}deg); transition: transform 0.4s ease-out;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#38bdf8" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                  </svg>
                </div>
              </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          })
        );

        // Suave seguimiento de la cámara
        mapInstanceRef.current.panTo(nextLatLng, { animate: true, duration: 0.8 });

        // Actualizar estela
        setTrailCoords(prev => {
          const updated = [...prev.slice(-15), targetPoint];
          if (polylineRef.current) {
            polylineRef.current.setLatLngs(updated.map(p => [p.lat, p.lng]));
          }
          return updated;
        });
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [isPlaying, simIndex, vehicleState]);

  // Manejo de cambio de estados
  const handleStateChange = (state) => {
    setVehicleState(state);
    if (state === 'stopped') {
      const stoppedPt = { ...REAL_ROUTE[REAL_ROUTE.length - 1], speed: 0 };
      setCurrentCoords(stoppedPt);
      if (markerRef.current) markerRef.current.setLatLng([stoppedPt.lat, stoppedPt.lng]);
    } else if (state === 'moving') {
      setIsPlaying(true);
    }
  };

  // Centrar cámara en el vehículo
  const handleCenterVehicle = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCoords.lat, currentCoords.lng], 17, { duration: 1 });
    }
  };

  // Abrir ubicación exacta en Google Maps oficial
  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`;
    window.open(url, '_blank');
  };

  // Obtener ubicación real del dispositivo (GPS móvil / navegador)
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Mi Ubicación Real (GPS)',
          speed: Math.round(pos.coords.speed ? pos.coords.speed * 3.6 : 0),
          heading: pos.coords.heading || 0,
          hdop: 0.7,
          sats: 14
        };
        setUserRealLocation(coords);
        setCurrentCoords(coords);
        setIsPlaying(false);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 17, { duration: 1.2 });
          markerRef.current.setLatLng([coords.lat, coords.lng]);
        }
      },
      (err) => {
        alert('No se pudo obtener la ubicación GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Badges informativos
  const getBadgeInfo = () => {
    switch (vehicleState) {
      case 'moving': return { text: 'En Movimiento', color: 'bg-emerald-500', rate: '1 Hz (Satelital en vivo)' };
      case 'stopped': return { text: 'Vehículo Detenido', color: 'bg-amber-500', rate: 'Ahorro (Cada 30s)' };
      case 'sleep': return { text: 'Modo Sleep / Standby', color: 'bg-indigo-500', rate: 'Ultra bajo consumo' };
      case 'no_signal': return { text: 'Sin Señal Satelital', color: 'bg-rose-500', rate: 'Esperando fix GPS' };
      default: return { text: 'Desconocido', color: 'bg-slate-500', rate: 'N/A' };
    }
  };

  const badge = getBadgeInfo();

  const content = (
    <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 md:p-8 rounded-[2rem] shadow-xl text-slate-800">
      
      {/* Header del Tracker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-600 rounded-2xl">
              <Radio size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-indigo-950 tracking-tight flex items-center gap-2">
                Rastreo Satelital en Mapa Real
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {currentCoords.name} • Lat: {currentCoords.lat.toFixed(5)}, Lng: {currentCoords.lng.toFixed(5)}
              </p>
            </div>
          </div>
        </div>

        {/* Estado y Tiempo de Actualización */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
            <span className={`w-2 h-2 rounded-full ${badge.color}`} />
            <span>{badge.text}</span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            Actualizado hace {secondsAgo}s
          </div>

          {isModal && onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-2"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Selector de Modos de Simulación y Proveedores de Mapa (Sin Scroll, Totalmente Adaptativo) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 text-xs">
        
        {/* Selector de Estados */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Estado simulado:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => handleStateChange('moving')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-center ${
                vehicleState === 'moving' 
                  ? 'bg-emerald-600 text-white shadow-sm scale-[1.02]' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">En Movimiento</span>
            </button>
            <button 
              type="button"
              onClick={() => handleStateChange('stopped')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-center ${
                vehicleState === 'stopped' 
                  ? 'bg-amber-600 text-white shadow-sm scale-[1.02]' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">Detenido</span>
            </button>
            <button 
              type="button"
              onClick={() => handleStateChange('sleep')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-center ${
                vehicleState === 'sleep' 
                  ? 'bg-indigo-600 text-white shadow-sm scale-[1.02]' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
              <span className="truncate">Modo Sleep</span>
            </button>
            <button 
              type="button"
              onClick={() => handleStateChange('no_signal')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-center ${
                vehicleState === 'no_signal' 
                  ? 'bg-rose-600 text-white shadow-sm scale-[1.02]' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span className="truncate">Sin Señal</span>
            </button>
          </div>
        </div>

        {/* Selector de Tipo de Mapa Real (Google Maps Calles / Satélite / Cyber) */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl self-stretch sm:self-auto border border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Layers size={13} />
            <span className="hidden sm:inline">Capa:</span>
          </span>
          <div className="grid grid-cols-3 gap-1 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setMapProvider('googleRoads')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'googleRoads' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Calles
            </button>
            <button
              type="button"
              onClick={() => setMapProvider('googleSatellite')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'googleSatellite' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setMapProvider('cartoDark')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'cartoDark' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cyber Oscuro
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA REAL LEAFLET */}
      <div className="relative w-full h-[360px] md:h-[420px] rounded-[1.75rem] overflow-hidden border border-slate-200 shadow-inner z-0">
        
        {/* Contenedor del DOM de Leaflet */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Telemetría Flotante - Velocímetro y Rumbo */}
        <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/60 text-white flex items-center gap-2 shadow-xl pointer-events-auto">
            <Gauge size={16} className="text-cyan-400" />
            <span className="text-sm font-extrabold font-mono tracking-tight">
              {currentCoords.speed} <span className="text-[10px] text-slate-400">KM/H</span>
            </span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/60 text-white flex items-center gap-2 shadow-xl pointer-events-auto">
            <Compass size={16} className="text-indigo-400" />
            <span className="text-sm font-extrabold font-mono tracking-tight">
              {currentCoords.heading}° <span className="text-[10px] text-slate-400">RUMBO</span>
            </span>
          </div>
        </div>

        {/* Telemetría de Conectividad y Hardware */}
        <div className="absolute top-4 right-4 z-[400] flex items-center gap-1.5 flex-wrap pointer-events-none justify-end">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto">
            <BatteryCharging size={14} className="text-emerald-400" />
            <span className="text-xs font-bold font-mono">88%</span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto">
            <Wifi size={14} className="text-cyan-400" />
            <span className="text-xs font-bold font-mono">4G LTE</span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto">
            <Satellite size={14} className={currentCoords.sats >= 4 ? "text-emerald-400" : "text-rose-400"} />
            <span className="text-xs font-bold font-mono">{currentCoords.sats} SATS</span>
          </div>
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto hidden md:flex">
            <ShieldCheck size={14} className={currentCoords.hdop <= 2.5 ? "text-cyan-400" : "text-rose-400"} />
            <span className="text-xs font-bold font-mono">HDOP {currentCoords.hdop}</span>
          </div>
        </div>

        {/* Acciones Rápidas en Mapa: Centrar, Abrir en Google Maps, Ubicación GPS Real */}
        <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-2">
          
          {/* Botón Mi Ubicación Real */}
          <button
            onClick={handleGetDeviceLocation}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95"
            title="Usar GPS real de tu dispositivo"
          >
            <Crosshair size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Mi GPS Real</span>
          </button>

          {/* Botón Centrar Vehículo */}
          <button
            onClick={handleCenterVehicle}
            className="p-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Centrar en vehículo"
          >
            <MapPin size={16} className="text-rose-400" />
          </button>

          {/* Botón Abrir en Google Maps */}
          <button
            onClick={handleOpenGoogleMaps}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xl border border-primary/40 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95"
            title="Abrir punto en Google Maps oficial"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Google Maps</span>
          </button>

          {/* Controles de reproducción */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pausar actualización" : "Reanudar"}
              className="p-1.5 hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button 
              onClick={() => {
                setSimIndex(0);
                setCurrentCoords(REAL_ROUTE[0]);
                setTrailCoords([REAL_ROUTE[0]]);
                setSecondsAgo(0);
                if (markerRef.current && mapInstanceRef.current) {
                  markerRef.current.setLatLng([REAL_ROUTE[0].lat, REAL_ROUTE[0].lng]);
                  mapInstanceRef.current.panTo([REAL_ROUTE[0].lat, REAL_ROUTE[0].lng]);
                }
              }}
              title="Reiniciar ruta"
              className="p-1.5 hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Frecuencia Adaptativa Activa */}
        <div className="absolute bottom-4 left-4 z-[400] text-[11px] font-mono text-slate-300 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg">
          ⚡ Tasa: <span className="text-cyan-300 font-bold">{badge.rate}</span>
        </div>
      </div>

      {/* Métricas y Filtros Técnicos Informativos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Frecuencia Adaptativa</p>
          <p className="text-xs font-black text-slate-800">{badge.rate}</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Filtro de Precisión</p>
          <p className="text-xs font-black text-emerald-600">Kalman / HDOP ≤ 2.5</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Ahorro de Batería</p>
          <p className="text-xs font-black text-indigo-600">{vehicleState === 'sleep' ? 'Modo Sleep Activado' : 'Consumo Optimizado'}</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Puntos de Estela</p>
          <p className="text-xs font-black text-cyan-700">{trailCoords.length} ubicaciones registradas</p>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-secondary/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-4xl"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      {content}
    </motion.div>
  );
}
