import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  MapPin, 
  Plus, 
  Clock, 
  Bell, 
  Circle, 
  Hexagon, 
  Trash2, 
  AlertTriangle, 
  Sliders, 
  Check, 
  Eye, 
  Compass, 
  ChevronRight,
  Info,
  ExternalLink,
  Layers,
  Crosshair
} from 'lucide-react';
import { loadLeaflet, MAP_PROVIDERS } from '../../utils/leafletLoader';

const INITIAL_GEOFENCES = [
  {
    id: 'geo-1',
    name: 'Casa (Zona Segura)',
    type: 'circle',
    lat: 19.4185,
    lng: -99.1630, // Roma Norte, CDMX
    radius: 180, // metros
    events: ['EXIT', 'ENTER'],
    schedule: 'Activa 22:00 - 06:00 (Nocturno)',
    hysteresis: '3 lecturas (25m margen)',
    status: 'active',
    vehicle: 'Yamaha MT-07',
    lastEvent: 'DENTRO (Seguro)',
    color: '#10b981' // emerald
  },
  {
    id: 'geo-2',
    name: 'Oficina / Corporativo',
    type: 'polygon',
    lat: 19.4272,
    lng: -99.1675,
    points: [
      [19.4285, -99.1700],
      [19.4295, -99.1655],
      [19.4255, -99.1645],
      [19.4248, -99.1690]
    ],
    events: ['ENTER', 'EXIT', 'DWELL'],
    dwellTime: 'Dwell > 15 min',
    schedule: 'Lunes a Viernes (08:00 - 18:00)',
    hysteresis: '3 lecturas consecutivas',
    status: 'active',
    vehicle: 'Yamaha MT-07',
    lastEvent: 'DWELL 4h 12m',
    color: '#3b82f6' // blue
  },
  {
    id: 'geo-3',
    name: 'Taller Mecánico Especializado',
    type: 'circle',
    lat: 19.4390,
    lng: -99.1800, // Anzures / Polanco
    radius: 140, // metros
    events: ['ENTER'],
    schedule: 'Siempre activa (24/7)',
    hysteresis: '2 lecturas (20m margen)',
    status: 'paused',
    vehicle: 'Honda Civic',
    lastEvent: 'Inactiva',
    color: '#f59e0b' // amber
  }
];

export function GeofencingView() {
  const [geofences, setGeofences] = useState(INITIAL_GEOFENCES);
  const [selectedGeo, setSelectedGeo] = useState(INITIAL_GEOFENCES[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState('circle');
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState(150);
  const [mapProvider, setMapProvider] = useState('googleRoads');
  const [pickedLatLng, setPickedLatLng] = useState(null);

  // Referencias para Leaflet
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  // 1. Inicializar Mapa Real Leaflet
  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Crear mapa centrado en la geocerca seleccionada
      const map = L.map(mapContainerRef.current, {
        center: [selectedGeo.lat, selectedGeo.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Capa de mapa base
      const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;
      tileLayerRef.current = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      // Grupo de capas para las geocercas
      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      // Evento de clic en el mapa para capturar coordenadas
      map.on('click', (e) => {
        setPickedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapInstanceRef.current = map;
      renderGeofencesOnMap(map, layersGroup, geofences, selectedGeo);
    }).catch(err => {
      console.error('Error cargando Leaflet en Geocercas:', err);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Renderizar Geocercas reales en el mapa
  const renderGeofencesOnMap = (map, group, list, activeGeo) => {
    if (!window.L || !group) return;
    const L = window.L;
    group.clearLayers();

    list.forEach((geo) => {
      const isSelected = activeGeo?.id === geo.id;

      if (geo.type === 'circle') {
        // Círculo principal
        const circle = L.circle([geo.lat, geo.lng], {
          radius: geo.radius,
          color: geo.color,
          fillColor: geo.color,
          fillOpacity: isSelected ? 0.35 : 0.15,
          weight: isSelected ? 3.5 : 2,
          dashArray: geo.status === 'paused' ? '6, 6' : null
        });

        circle.bindTooltip(`<b>${geo.name}</b><br/>Radio: ${geo.radius}m`, {
          permanent: isSelected,
          direction: 'top',
          className: 'geofence-tooltip'
        });

        circle.on('click', () => setSelectedGeo(geo));
        group.addLayer(circle);

        // Margen de histéresis virtual (+25 metros)
        const hysteresisCircle = L.circle([geo.lat, geo.lng], {
          radius: geo.radius + 25,
          color: geo.color,
          fill: false,
          weight: 1,
          dashArray: '3, 4',
          opacity: 0.45
        });
        group.addLayer(hysteresisCircle);

      } else if (geo.type === 'polygon' && geo.points) {
        // Polígono
        const polygon = L.polygon(geo.points, {
          color: geo.color,
          fillColor: geo.color,
          fillOpacity: isSelected ? 0.35 : 0.15,
          weight: isSelected ? 3.5 : 2
        });

        polygon.bindTooltip(`<b>${geo.name}</b><br/>Polígono Seguro`, {
          permanent: isSelected,
          direction: 'top',
          className: 'geofence-tooltip'
        });

        polygon.on('click', () => setSelectedGeo(geo));
        group.addLayer(polygon);
      }
    });

    // Marcador de la Moto (Vehículo monitoreado en tiempo real dentro de Casa)
    const motoIcon = L.divIcon({
      className: 'vehicle-marker-geo',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(56, 189, 248, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #0f172a; border: 2.5px solid #38bdf8; box-shadow: 0 4px 12px rgba(56,189,248,0.6); display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8" stroke="#ffffff" stroke-width="2">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const motoMarker = L.marker([19.4185, -99.1630], { icon: motoIcon });
    motoMarker.bindPopup('<b>Yamaha MT-07</b><br/>Estado: Dentro de Casa (Zona Segura)');
    group.addLayer(motoMarker);
  };

  // 3. Cambiar capa de tiles dinámicamente
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

  // 4. Volar suavemente cuando cambia la geocerca seleccionada
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedGeo) return;
    mapInstanceRef.current.flyTo([selectedGeo.lat, selectedGeo.lng], 16, { duration: 1 });
    if (layersGroupRef.current) {
      renderGeofencesOnMap(mapInstanceRef.current, layersGroupRef.current, geofences, selectedGeo);
    }
  }, [selectedGeo, geofences]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName) return;
    
    // Usar la coordenada seleccionada o centrar cerca de Reforma
    const targetLat = pickedLatLng ? pickedLatLng.lat : 19.4300;
    const targetLng = pickedLatLng ? pickedLatLng.lng : -99.1600;

    const newG = {
      id: `geo-${Date.now()}`,
      name: newName,
      type: newType,
      lat: targetLat,
      lng: targetLng,
      radius: newType === 'circle' ? newRadius : null,
      points: newType === 'polygon' ? [
        [targetLat + 0.0015, targetLng - 0.0020],
        [targetLat + 0.0020, targetLng + 0.0020],
        [targetLat - 0.0015, targetLng + 0.0020],
        [targetLat - 0.0020, targetLng - 0.0020]
      ] : null,
      events: ['EXIT', 'ENTER'],
      schedule: 'Siempre activa (24/7)',
      hysteresis: '3 lecturas consecutivas (30m margen)',
      status: 'active',
      vehicle: 'Yamaha MT-07',
      lastEvent: 'Recién creada',
      color: '#06b6d4'
    };

    const updated = [...geofences, newG];
    setGeofences(updated);
    setSelectedGeo(newG);
    setIsCreating(false);
    setNewName('');
    setPickedLatLng(null);
  };

  const handleDelete = (id) => {
    const updated = geofences.filter(g => g.id !== id);
    setGeofences(updated);
    if (selectedGeo?.id === id) {
      setSelectedGeo(updated[0] || null);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!selectedGeo) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${selectedGeo.lat},${selectedGeo.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Banner de Arquitectura de Geocercas */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-cyan-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Geocercas Satelitales en Mapa Real
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">Offline Shield</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Definición de perímetros reales sobre mapa satelital. Sincronización en memoria flash del hardware con <strong>histéresis de 25m</strong> para erradicar falsas alarmas.
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsCreating(true);
            setPickedLatLng({ lat: selectedGeo.lat, lng: selectedGeo.lng });
          }}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus size={16} /> Crear Geocerca
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAPA REAL INTERACTIVO DE GEOCERCAS */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-5 flex flex-col relative overflow-hidden shadow-xl min-h-[480px]">
          
          {/* Header del Mapa y Selector de Capas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-800">
                {selectedGeo ? `${selectedGeo.name} (Perímetro Real)` : 'Editor de Geocercas'}
              </span>
            </div>

            {/* Selector de capa de mapa */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Layers size={12} /> Capa:
              </span>
              <button
                onClick={() => setMapProvider('googleRoads')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'googleRoads' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Calles
              </button>
              <button
                onClick={() => setMapProvider('googleSatellite')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'googleSatellite' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
              <button
                onClick={() => setMapProvider('cartoDark')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'cartoDark' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cyber Oscuro
              </button>
            </div>
          </div>

          {/* Contenedor del Mapa Real Leaflet */}
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-inner min-h-[360px] z-0">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Botón flotante: Abrir en Google Maps */}
            <div className="absolute top-4 right-4 z-[400]">
              <button
                onClick={handleOpenGoogleMaps}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95"
              >
                <ExternalLink size={13} />
                <span>Google Maps</span>
              </button>
            </div>

            {/* Aviso de clic en el mapa */}
            <div className="absolute bottom-3 right-3 z-[400] text-[10px] font-bold text-slate-700 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-1.5">
              <MapPin size={12} className="text-cyan-600" />
              <span>Haz clic en el mapa para fijar nueva geocerca</span>
            </div>

            {/* Leyenda interactiva */}
            <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 space-y-1 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Perímetro Circular ({selectedGeo?.radius || 180}m)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Polígono Seguro de Manzana
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border border-dashed border-cyan-400" /> Buffer de Histéresis (+25m)
              </div>
            </div>
          </div>
        </div>

        {/* Lista y Detalle de Geocercas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
              Geocercas Configuradas ({geofences.length})
            </h3>
            <span className="text-[11px] font-bold text-cyan-600">
              Toca para volar en el mapa
            </span>
          </div>

          <div className="space-y-3">
            {geofences.map((geo) => {
              const isSelected = selectedGeo?.id === geo.id;
              return (
                <div
                  key={geo.id}
                  onClick={() => setSelectedGeo(geo)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-md shadow-cyan-500/5 scale-[1.01]' 
                      : 'bg-white/80 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {geo.type === 'circle' ? (
                        <Circle size={16} className="text-cyan-600" />
                      ) : (
                        <Hexagon size={16} className="text-blue-600" />
                      )}
                      <h4 className="font-extrabold text-slate-900 text-sm">{geo.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      geo.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {geo.status === 'active' ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span className="truncate">{geo.schedule}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell size={12} className="text-slate-400" />
                      <span>{geo.events.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{geo.type === 'circle' ? `Radio: ${geo.radius}m` : 'Polígono'} • {geo.hysteresis}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(geo.id); }} 
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Eliminar geocerca"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario para Nueva Geocerca */}
          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 bg-white rounded-3xl border-2 border-cyan-500 shadow-xl space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-slate-900">Nueva Geocerca en Mapa Real</h4>
                  <button onClick={() => setIsCreating(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
                </div>

                {pickedLatLng && (
                  <div className="bg-cyan-50 text-cyan-800 p-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                    <MapPin size={13} className="text-cyan-600" />
                    <span>Lat: {pickedLatLng.lat.toFixed(5)}, Lng: {pickedLatLng.lng.toFixed(5)}</span>
                  </div>
                )}

                <input 
                  type="text" 
                  placeholder="Ej. Estacionamiento Centro o Gimnasio" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setNewType('circle')}
                    className={`py-2 rounded-xl font-bold border ${newType === 'circle' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    Círculo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewType('polygon')}
                    className={`py-2 rounded-xl font-bold border ${newType === 'polygon' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    Polígono Libre
                  </button>
                </div>

                {newType === 'circle' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Radio ({newRadius} metros)</label>
                      <span className="text-[10px] font-mono font-bold text-cyan-600">{newRadius} m</span>
                    </div>
                    <input 
                      type="range" min="50" max="1000" step="25" 
                      value={newRadius} onChange={e => setNewRadius(Number(e.target.value))} 
                      className="w-full accent-cyan-500"
                    />
                  </div>
                )}

                <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl text-slate-600 border border-slate-200 space-y-1">
                  <p className="font-bold">🛡️ Parámetros anti-falsos positivos:</p>
                  <p>• Exige 3 lecturas fuera (o margen de 25-30m).</p>
                  <p>• Eventos: EXIT, ENTER y DWELL.</p>
                </div>

                <button 
                  onClick={handleCreate} 
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Guardar Perímetro en Mapa
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
