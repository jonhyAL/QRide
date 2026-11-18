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
  Square,
  RotateCcw, 
  X, 
  BatteryCharging, 
  Wifi, 
  MapPin, 
  ExternalLink, 
  Layers, 
  Crosshair, 
  Sparkles, 
  Clock, 
  Flame, 
  Zap, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Printer,
  Search,
  FolderClock,
  FileDown,
  Trash2,
  Flag,
  Route,
  ChevronRight,
  LocateFixed
} from 'lucide-react';
import { loadLeaflet, MAP_PROVIDERS } from '../../utils/leafletLoader';
import { 
  calculateDistanceKm, 
  getTrafficLevel, 
  analyzeRouteWithGeminiAI,
  generateRouteSnapshotCanvas,
  searchPlaces,
  calculatePlannedRoute,
  generateTripPdf
} from '../../utils/routeAiService';

const REPORTS_STORAGE_KEY = 'qride_gps_route_reports_v2';

export function LiveGpsTracker({ isOpen = true, onClose, isModal = false }) {
  // Estados de flujo: 'idle' (Inicio) | 'tracking' (En Ruta) | 'analyzing' (Procesando con IA) | 'report' (Reporte Pericial) | 'history' (Historial)
  const [routeState, setRouteState] = useState('idle');

  // Puntos GPS registrados del viaje actual
  const [routePoints, setRoutePoints] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);

  // Estadísticas en tiempo real
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [maxSpeedKmH, setMaxSpeedKmH] = useState(0);

  // Capa de mapas Leaflet: 'googleRoads' | 'googleSatellite' | 'cartoDark'
  const [mapProvider, setMapProvider] = useState('googleRoads');

  // Estados de IA y Reporte
  const [aiReport, setAiReport] = useState(null);
  const [aiProgressText, setAiProgressText] = useState('');
  const [routeSnapshot, setRouteSnapshot] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Historial de reportes guardados
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const data = localStorage.getItem(REPORTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error leyendo reportes guardados:', e);
      return [];
    }
  });

  // Estados de Búsqueda de Destinos con Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estados de Navegación Activa (Estilo Waze / Google Maps)
  const [destination, setDestination] = useState(null);
  const [plannedRouteInfo, setPlannedRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false); // Confirmado por el usuario
  const [followVehicle, setFollowVehicle] = useState(true); // Cámara centrada en el vehículo

  // Referencias
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineGroupRef = useRef(null);
  const plannedRouteLayerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const watchIdRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const followVehicleRef = useRef(true);

  // Sincronizar referencia mutable para callbacks de Leaflet
  useEffect(() => {
    followVehicleRef.current = followVehicle;
  }, [followVehicle]);

  // Colores de tráfico para polilíneas y badges (Paleta QRide)
  const TRAFFIC_COLORS = {
    heavy: '#E63946',    // Rojo (<12 km/h o detenido)
    moderate: '#f59e0b', // Amarillo (12 - 35 km/h)
    fluent: '#3D8B6D'    // Verde (>35 km/h)
  };

  // 1. Manejo del temporizador durante la ruta activa
  useEffect(() => {
    if (routeState === 'tracking') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [routeState]);

  // 2. Limpieza de geolocalización y mapa al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Crear icono de vehículo Leaflet estilo flecha GPS con giro
  const createVehicleIcon = (L, headingDeg = 0) => {
    return L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(123, 30, 58, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #161427; border: 2.5px solid #7B1E3A; box-shadow: 0 4px 16px rgba(123, 30, 58, 0.7); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); transition: transform 0.35s ease-out;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#B04A6A" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  };

  // 4. Crear icono de destino para el mapa
  const createDestinationIcon = (L) => {
    return L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #7B1E3A; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(123,30,58,0.7); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
  };

  // 5. Inicializar mapa Leaflet al entrar en modo 'tracking'
  const initLeafletMap = (initialCoords) => {
    if (!mapContainerRef.current) return;

    loadLeaflet().then((L) => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [initialCoords.lat, initialCoords.lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Si el usuario arrastra manualmente el mapa, pausar el seguimiento automático de cámara
      map.on('dragstart', () => {
        setFollowVehicle(false);
      });

      // Capa de tiles
      const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;
      tileLayerRef.current = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      // Capa de grupo para segmentos de tráfico
      polylineGroupRef.current = L.layerGroup().addTo(map);

      // Marcador de inicio
      L.circleMarker([initialCoords.lat, initialCoords.lng], {
        radius: 8,
        fillColor: '#3D8B6D',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);

      // Marcador del vehículo activo
      markerRef.current = L.marker([initialCoords.lat, initialCoords.lng], {
        icon: createVehicleIcon(L, initialCoords.heading || 0)
      }).addTo(map);

      mapInstanceRef.current = map;

      // Si ya había un destino seleccionado antes de comenzar, dibujarlo
      if (destination) {
        plotPlannedRouteOnMap(map, initialCoords, destination, false);
      }
    }).catch(err => {
      console.error('Error cargando Leaflet:', err);
    });
  };

  // 6. Cambio dinámico de capa de mapa
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

  // 7. Iniciar ruta y activar GPS real
  const handleStartRoute = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo o navegador no soporta geolocalización satelital.');
      return;
    }

    setGpsError(null);
    setRoutePoints([]);
    setTotalDistanceKm(0);
    setMaxSpeedKmH(0);
    setElapsedSeconds(0);
    setAiReport(null);
    setRouteSnapshot(null);
    lastPositionRef.current = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = Math.round(pos.coords.speed ? pos.coords.speed * 3.6 : 0);
        const heading = pos.coords.heading || 0;
        const trafficLevel = getTrafficLevel(speed);

        const initialPoint = {
          lat,
          lng,
          speed,
          heading,
          trafficLevel,
          accuracy: Math.round(pos.coords.accuracy || 5),
          timestamp: Date.now()
        };

        lastPositionRef.current = initialPoint;
        setCurrentPosition(initialPoint);
        setRoutePoints([initialPoint]);
        setRouteState('tracking');

        setTimeout(() => {
          initLeafletMap(initialPoint);
        }, 150);

        const watchId = navigator.geolocation.watchPosition(
          (watchPos) => {
            handleNewPosition(watchPos);
          },
          (watchErr) => {
            console.warn('Alerta GPS:', watchErr.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 12000
          }
        );

        watchIdRef.current = watchId;
      },
      (err) => {
        let msg = 'No se pudo obtener la ubicación GPS.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado. Por favor autoriza el GPS en tu navegador.';
        else if (err.code === 2) msg = 'Señal satelital no disponible o débil en este momento.';
        else if (err.code === 3) msg = 'Tiempo de espera de conexión GPS agotado.';
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  };

  // 8. Procesar nueva posición satelital en tiempo real con seguimiento activo
  const handleNewPosition = (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const now = Date.now();

    const prevPt = lastPositionRef.current;
    let computedSpeed = 0;

    if (pos.coords.speed !== null && pos.coords.speed !== undefined && pos.coords.speed >= 0) {
      computedSpeed = Math.round(pos.coords.speed * 3.6);
    } else if (prevPt) {
      const deltaSec = Math.max(1, (now - prevPt.timestamp) / 1000);
      const deltaDistKm = calculateDistanceKm(prevPt.lat, prevPt.lng, lat, lng);
      computedSpeed = Math.round((deltaDistKm / (deltaSec / 3600)));
    }

    const heading = pos.coords.heading || (prevPt ? calculateHeading(prevPt.lat, prevPt.lng, lat, lng) : 0);
    const trafficLevel = getTrafficLevel(computedSpeed);
    const accuracy = Math.round(pos.coords.accuracy || 6);

    const newPt = {
      lat,
      lng,
      speed: computedSpeed,
      heading,
      trafficLevel,
      accuracy,
      timestamp: now
    };

    if (prevPt) {
      const stepDist = calculateDistanceKm(prevPt.lat, prevPt.lng, lat, lng);
      if (stepDist >= 0.002) {
        setTotalDistanceKm(prev => prev + stepDist);
      }
    }

    setMaxSpeedKmH(prev => Math.max(prev, computedSpeed));
    lastPositionRef.current = newPt;
    setCurrentPosition(newPt);
    setRoutePoints(prev => [...prev, newPt]);

    // Actualizar visualización en Leaflet
    if (mapInstanceRef.current && window.L) {
      const nextLatLng = [lat, lng];

      // Mover y orientar flecha de navegación
      if (markerRef.current) {
        markerRef.current.setLatLng(nextLatLng);
        markerRef.current.setIcon(createVehicleIcon(window.L, heading));
      }

      // Trazar estela de tráfico por color
      if (prevPt && polylineGroupRef.current) {
        const segColor = TRAFFIC_COLORS[trafficLevel] || '#B04A6A';
        const segment = window.L.polyline(
          [[prevPt.lat, prevPt.lng], [lat, lng]],
          {
            color: segColor,
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }
        );
        polylineGroupRef.current.addLayer(segment);
      }

      // Si el modo seguimiento está activo (como Waze / Google Maps), mantener la flecha centrada
      if (followVehicleRef.current) {
        mapInstanceRef.current.panTo(nextLatLng, { animate: true, duration: 0.6 });
      }
    }
  };

  const calculateHeading = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return Math.round((brng + 360) % 360);
  };

  // 9. Búsqueda con Sugerencias en Vivo (Autocomplete mientras el usuario escribe)
  const handleSearchInputChange = (text) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const userCoords = currentPosition || (routePoints[0] || null);
      const results = await searchPlaces(text, userCoords);
      setSearchResults(results);
      setIsSearching(false);
    }, 320);
  };

  // Cuando el usuario selecciona una sugerencia de la lista: Previsualizar ruta
  const handleSelectDestination = async (place) => {
    setDestination(place);
    setSearchResults([]);
    setSearchQuery(place.name);
    setIsNavigating(false); // Espera confirmación del usuario

    const userPt = currentPosition || (routePoints[0] || { lat: 19.4326, lng: -99.1332 });
    
    if (mapInstanceRef.current) {
      await plotPlannedRouteOnMap(mapInstanceRef.current, userPt, place, true);
    }
  };

  // Trazar ruta planificada en Leaflet
  const plotPlannedRouteOnMap = async (map, startPt, destPt, autoFitBounds = true) => {
    if (!window.L || !map) return;
    const L = window.L;

    if (plannedRouteLayerRef.current) {
      map.removeLayer(plannedRouteLayerRef.current);
      plannedRouteLayerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    // Marcador de destino con icono oficial
    const destMarker = L.marker([destPt.lat, destPt.lng], {
      icon: createDestinationIcon(L)
    }).addTo(map);
    destMarker.bindPopup(`<b>Destino:</b> ${destPt.name}`);
    destinationMarkerRef.current = destMarker;

    // Calcular ruta vial
    const routeInfo = await calculatePlannedRoute(startPt, destPt);
    setPlannedRouteInfo(routeInfo);

    if (routeInfo && routeInfo.latlngs) {
      const plannedLine = L.polyline(routeInfo.latlngs, {
        color: '#7B1E3A',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      plannedRouteLayerRef.current = plannedLine;

      if (autoFitBounds) {
        map.fitBounds([
          [startPt.lat, startPt.lng],
          [destPt.lat, destPt.lng]
        ], { padding: [60, 60], maxZoom: 16 });
      }
    }
  };

  // Confirmar inicio de navegación (Zoom a la flecha estilo Waze / Google Maps)
  const handleConfirmStartNavigation = () => {
    if (!destination || !mapInstanceRef.current || !currentPosition) return;
    setIsNavigating(true);
    setFollowVehicle(true);

    // Zoom cinematográfico a la flecha del vehículo
    mapInstanceRef.current.flyTo([currentPosition.lat, currentPosition.lng], 18, {
      duration: 1.2
    });
  };

  // Recentrar cámara en la flecha del vehículo
  const handleRecenterVehicle = () => {
    setFollowVehicle(true);
    if (mapInstanceRef.current && currentPosition) {
      mapInstanceRef.current.flyTo([currentPosition.lat, currentPosition.lng], 18, {
        duration: 0.8
      });
    }
  };

  // Cancelar destino o navegación
  const handleClearDestination = () => {
    setDestination(null);
    setPlannedRouteInfo(null);
    setIsNavigating(false);
    setSearchQuery('');
    setSearchResults([]);

    if (mapInstanceRef.current) {
      if (plannedRouteLayerRef.current) {
        mapInstanceRef.current.removeLayer(plannedRouteLayerRef.current);
        plannedRouteLayerRef.current = null;
      }
      if (destinationMarkerRef.current) {
        mapInstanceRef.current.removeLayer(destinationMarkerRef.current);
        destinationMarkerRef.current = null;
      }
    }
  };

  const handleOpenTurnByTurnGoogleMaps = () => {
    if (!destination) return;
    const origin = currentPosition ? `${currentPosition.lat},${currentPosition.lng}` : '';
    const url = origin 
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.lat},${destination.lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`;
    window.open(url, '_blank');
  };

  // 10. Finalizar Ruta, Analizar con IA y Guardar en Historial
  const handleFinishRoute = async () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setRouteState('analyzing');
    setAiProgressText('Compilando telemetría del trayecto y calculando congestión...');

    const pts = routePoints.length > 0 ? routePoints : (currentPosition ? [currentPosition] : []);

    let heavyCount = 0;
    let moderateCount = 0;
    let fluentCount = 0;

    pts.forEach(p => {
      if (p.trafficLevel === 'heavy') heavyCount++;
      else if (p.trafficLevel === 'moderate') moderateCount++;
      else fluentCount++;
    });

    const totalPts = Math.max(1, pts.length);
    const heavyPercent = Math.round((heavyCount / totalPts) * 100);
    const moderatePercent = Math.round((moderateCount / totalPts) * 100);
    const fluentPercent = Math.max(0, 100 - heavyPercent - moderatePercent);

    const avgSpeed = elapsedSeconds > 0 
      ? Number(((totalDistanceKm / (elapsedSeconds / 3600))).toFixed(1))
      : 0;

    const routeData = {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      durationSeconds: elapsedSeconds,
      avgSpeedKmH: avgSpeed,
      maxSpeedKmH: maxSpeedKmH,
      pointsCount: pts.length,
      trafficStats: {
        heavyPercent,
        moderatePercent,
        fluentPercent
      },
      startCoords: pts[0] ? { lat: pts[0].lat, lng: pts[0].lng } : null,
      endCoords: pts[pts.length - 1] ? { lat: pts[pts.length - 1].lat, lng: pts[pts.length - 1].lng } : null
    };

    const snapshotBase64 = generateRouteSnapshotCanvas(pts, routeData);
    setRouteSnapshot(snapshotBase64);

    try {
      setAiProgressText('Analizando ruta con Google Gemini Vision AI...');
      const report = await analyzeRouteWithGeminiAI(
        routeData, 
        snapshotBase64, 
        (step) => setAiProgressText(step)
      );

      const now = new Date();
      const reportFull = {
        id: `report-${Date.now()}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        formattedTime: now.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        ...report,
        routeData,
        snapshotImage: snapshotBase64
      };

      // Guardar en el Historial de Reportes LocalStorage
      const updatedReports = [reportFull, ...savedReports];
      setSavedReports(updatedReports);
      try {
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updatedReports));
      } catch (err) {
        console.warn('Error guardando en localStorage:', err);
      }

      setAiReport(reportFull);
      setRouteState('report');
    } catch (err) {
      console.error('Error generando reporte con IA:', err);
      setRouteState('report');
    }
  };

  // 11. Eliminar reporte del historial
  const handleDeleteReport = (reportId) => {
    const updated = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updated);
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Error actualizando reportes:', err);
    }
  };

  // 12. Reiniciar a pantalla inicial
  const handleResetToIdle = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setRouteState('idle');
    setRoutePoints([]);
    setCurrentPosition(null);
    setElapsedSeconds(0);
    setTotalDistanceKm(0);
    setMaxSpeedKmH(0);
    setAiReport(null);
    setRouteSnapshot(null);
    setGpsError(null);
    setDestination(null);
    setPlannedRouteInfo(null);
    setIsNavigating(false);
  };

  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenGoogleMaps = () => {
    if (!currentPosition) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${currentPosition.lat},${currentPosition.lng}`;
    window.open(url, '_blank');
  };

  // ==========================================
  // VISTA 1: PANTALLA INICIAL (COMENZAR RUTA / HISTORIAL)
  // ==========================================
  if (routeState === 'idle') {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 p-6 md:p-10 rounded-[2.25rem] shadow-xl text-slate-800">
        
        {/* Cabecera con selector entre Nueva Ruta e Historial */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-inner">
              <Radio size={28} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-secondary tracking-tight">
                Rastreo GPS en Vivo & Registro de Ruta
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Monitoreo satelital en tiempo real con análisis pericial de tráfico mediante Google Gemini
              </p>
            </div>
          </div>

          {/* Botón Acceso Rápido al Historial de Reportes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRouteState('history')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-secondary font-bold text-xs rounded-xl border border-slate-200/80 transition-all cursor-pointer"
            >
              <FolderClock size={16} className="text-primary" />
              <span>Historial de Reportes ({savedReports.length})</span>
            </button>

            {isModal && onClose && (
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de Error si el GPS fue bloqueado */}
        {gpsError && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold"
          >
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{gpsError}</span>
          </motion.div>
        )}

        {/* Hero Card Informativo - Texto y Botón completamente centrados con colores oficiales */}
        <div className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#382f60] to-secondary text-white p-8 md:p-14 rounded-[2rem] shadow-xl mb-8 border border-secondary/60 flex flex-col items-center justify-center text-center">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-60 h-60 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center text-center">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight text-center">
              ¿Listo para iniciar tu viaje?
            </h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-8 font-medium text-center">
              Al comenzar, el sistema activará los sensores satelitales de tu dispositivo para registrar cada coordenada, medir velocidades en tiempo real, identificar zonas de tráfico pesado y generar un informe pericial al finalizar con recomendaciones de seguridad y eficiencia.
            </p>

            {/* Gran Botón: Comenzar Ruta Centrado */}
            <div className="flex justify-center items-center w-full">
              <button
                onClick={handleStartRoute}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-primary hover:bg-btn-hover text-white font-bold text-sm md:text-base rounded-2xl shadow-lg shadow-primary/35 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Play size={20} className="fill-white transition-transform group-hover:scale-110" />
                <span>Comenzar Ruta Satelital</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Pilares Informativos con Colores de la Web */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/15 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Navigation size={20} />
            </div>
            <h4 className="font-bold text-secondary text-sm mb-1">Mapeo Satelital Real</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Trazado continuo con coordenadas GPS de alta precisión en capas de Google Maps Calles, Satélite o Cyber.
            </p>
          </div>

          <div className="bg-accent/5 p-5 rounded-2xl border border-accent/15 hover:border-accent/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
              <TrendingUp size={20} />
            </div>
            <h4 className="font-bold text-secondary text-sm mb-1">Detección de Tráfico</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Segmentación cromática automática: Verde para flujo libre, Amarillo en tráfico moderado y Rojo en detenciones.
            </p>
          </div>

          <div className="bg-secondary/5 p-5 rounded-2xl border border-secondary/15 hover:border-secondary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
              <Sparkles size={20} />
            </div>
            <h4 className="font-bold text-secondary text-sm mb-1">Peritaje con Gemini IA</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Al finalizar, la IA examina la captura visual del mapa y la telemetría para evaluar cuellos de botella y combustible.
            </p>
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // VISTA 2: HISTORIAL DE REPORTES GUARDADOS
  // ==========================================
  if (routeState === 'history') {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 p-6 md:p-10 rounded-[2.25rem] shadow-xl text-slate-800">
        
        {/* Encabezado del Historial */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-inner">
              <FolderClock size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-secondary tracking-tight">
                Historial de Reportes Satelitales
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Consulta y descarga tus informes de viajes previos con fecha y hora exacta
              </p>
            </div>
          </div>

          <button
            onClick={() => setRouteState('idle')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold shadow-md hover:bg-secondary/90 transition-all self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Volver a Iniciar Ruta</span>
          </button>
        </div>

        {/* Lista de Reportes */}
        {savedReports.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200/80 max-w-lg mx-auto">
            <FolderClock size={42} className="mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-secondary text-base mb-1">No hay reportes archivados todavía</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Cada vez que inicies y finalices un recorrido con GPS, se creará un reporte pericial con captura de mapa y quedará guardado aquí.
            </p>
            <button
              onClick={() => setRouteState('idle')}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-btn-hover transition-all"
            >
              Comenzar Mi Primer Recorrido
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedReports.map((item) => (
              <div 
                key={item.id}
                className="bg-slate-50/90 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Clock size={13} />
                      {item.formattedDate} • {item.formattedTime} hrs
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Score: {item.tripScore || 85}/100
                    </span>
                  </div>

                  <h4 className="font-bold text-secondary text-sm mb-1 truncate">
                    {item.verdictLabel || 'Ruta Evaluada con Éxito'}
                  </h4>

                  <div className="grid grid-cols-3 gap-2 my-3 text-xs bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Distancia</span>
                      <strong className="text-secondary">{item.routeData?.totalDistanceKm || 0} km</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Tiempo</span>
                      <strong className="text-secondary">{Math.round((item.routeData?.durationSeconds || 0) / 60)} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Vel. Media</span>
                      <strong className="text-secondary">{item.routeData?.avgSpeedKmH || 0} km/h</strong>
                    </div>
                  </div>

                  {item.snapshotImage && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 mb-3 bg-[#161427] max-h-36 flex items-center justify-center">
                      <img src={item.snapshotImage} alt="Vista previa de ruta" className="w-full h-auto object-cover max-h-36" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAiReport(item);
                        setRouteSnapshot(item.snapshotImage);
                        setRouteState('report');
                      }}
                      className="px-3.5 py-2 bg-primary hover:bg-btn-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Ver Reporte</span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      onClick={() => generateTripPdf(item)}
                      className="px-3.5 py-2 bg-secondary text-white hover:bg-secondary/90 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Descargar archivo PDF"
                    >
                      <FileDown size={14} />
                      <span className="hidden sm:inline">Descargar PDF</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteReport(item.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Eliminar de historial"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // VISTA 3: PROCESANDO REPORTE CON IA (LOADING)
  // ==========================================
  if (routeState === 'analyzing') {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 p-8 md:p-14 rounded-[2.25rem] shadow-xl text-slate-800 text-center">
        <div className="max-w-md mx-auto">
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles size={30} className="animate-pulse" />
            </div>
          </div>

          <h3 className="text-xl md:text-2xl font-black text-secondary mb-2">
            Generando Reporte Pericial con IA
          </h3>
          <p className="text-xs md:text-sm text-slate-500 font-medium mb-6">
            Google Gemini Vision AI está examinando la captura satelital del recorrido y calculando cuellos de botella.
          </p>

          <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/15 text-xs font-mono text-secondary font-bold mb-4 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>{aiProgressText || 'Procesando telemetría satelital...'}</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Esto toma solo unos segundos. No cierres esta ventana.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 4: REPORTE PERICIAL DETALLADO DE RUTA
  // ==========================================
  if (routeState === 'report' && aiReport) {
    const reportData = aiReport.routeData || {};
    const traffic = reportData.trafficStats || { heavyPercent: 0, moderatePercent: 0, fluentPercent: 100 };

    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 p-6 md:p-10 rounded-[2.25rem] shadow-xl text-slate-800">
        
        {/* Cabecera del Reporte */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-inner">
              <Award size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-secondary tracking-tight">
                  Reporte Pericial de Ruta & Tráfico
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
                  {aiReport.aiEngineName || 'Google Gemini AI'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Registrado el {aiReport.formattedDate || new Date(aiReport.createdAt || Date.now()).toLocaleDateString('es-MX')} a las {aiReport.formattedTime || ''} hrs
              </p>
            </div>
          </div>

          {/* Acciones del Reporte */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => generateTripPdf(aiReport)}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Descargar documento formal en PDF"
            >
              <FileDown size={15} />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-secondary rounded-xl text-xs font-bold transition-all"
              title="Imprimir"
            >
              <Printer size={15} />
            </button>

            <button
              onClick={() => setRouteState('history')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-secondary rounded-xl text-xs font-bold transition-all"
            >
              <FolderClock size={15} />
              <span>Ver Historial</span>
            </button>

            <button
              onClick={handleResetToIdle}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-btn-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/25 transition-all cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Nueva Ruta</span>
            </button>
          </div>
        </div>

        {/* Resumen Principal: Veredicto y Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-secondary via-[#382f60] to-secondary text-white p-6 rounded-2xl shadow-lg border border-secondary/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
                Calificación de Ruta
              </span>
              <Sparkles size={16} className="text-accent" />
            </div>
            <div className="my-2">
              <div className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-baseline gap-1">
                {aiReport.tripScore || 85}
                <span className="text-lg text-slate-400 font-bold">/100</span>
              </div>
              <p className="text-xs font-bold text-accent mt-1">
                {aiReport.verdictLabel || 'Ruta Fluida y Despejada'}
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Eficiencia de trayecto estimada: <span className="text-white font-bold">{aiReport.efficiencyScore || 90}%</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 md:col-span-2 flex flex-col justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Telemetría Registrada
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Distancia</span>
                <span className="text-base font-black text-secondary">
                  {reportData.totalDistanceKm || 0} <span className="text-[10px] text-slate-500 font-medium">KM</span>
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Duración</span>
                <span className="text-base font-black text-secondary">
                  {formatTime(reportData.durationSeconds || 0)}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Vel. Media</span>
                <span className="text-base font-black text-secondary">
                  {reportData.avgSpeedKmH || 0} <span className="text-[10px] text-slate-500 font-medium">KM/H</span>
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Vel. Máxima</span>
                <span className="text-base font-black text-secondary">
                  {reportData.maxSpeedKmH || 0} <span className="text-[10px] text-slate-500 font-medium">KM/H</span>
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                <span>Distribución del Tráfico por Tiempo</span>
                <span>
                  🟢 {traffic.fluentPercent}% | 🟡 {traffic.moderatePercent}% | 🔴 {traffic.heavyPercent}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${traffic.fluentPercent}%` }} 
                  className="bg-emerald-500 h-full transition-all" 
                  title={`Fluido: ${traffic.fluentPercent}%`} 
                />
                <div 
                  style={{ width: `${traffic.moderatePercent}%` }} 
                  className="bg-amber-500 h-full transition-all" 
                  title={`Moderado: ${traffic.moderatePercent}%`} 
                />
                <div 
                  style={{ width: `${traffic.heavyPercent}%` }} 
                  className="bg-rose-500 h-full transition-all" 
                  title={`Detenido/Pesado: ${traffic.heavyPercent}%`} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Captura Visual del Mapa y Trazo */}
        {routeSnapshot && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                <MapPin size={14} className="text-primary" />
                Captura Satelital del Trazo y Segmentos de Tráfico
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {reportData.pointsCount || 0} waypoints procesados
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-[#161427] flex items-center justify-center max-h-[360px]">
              <img 
                src={routeSnapshot} 
                alt="Mapa satelital de la ruta" 
                className="w-full h-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        )}

        {/* Dictamen Pericial de la IA */}
        <div className="space-y-4 mb-6">
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20">
            <h4 className="font-black text-secondary text-sm mb-1.5 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Dictamen Ejecutivo del Perito IA
            </h4>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
              {aiReport.executiveSummary || 'Recorrido evaluado con éxito bajo estándares de telemetría QRide.'}
            </p>
          </div>

          <div className="bg-secondary/5 p-5 rounded-2xl border border-secondary/15">
            <h4 className="font-bold text-secondary text-sm mb-1.5 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              Análisis de Congestión y Flujo Vial
            </h4>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium mb-3">
              {aiReport.trafficAnalysis || 'No se registraron cuellos de botella significativos.'}
            </p>

            {aiReport.congestionHotspots && aiReport.congestionHotspots.length > 0 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Puntos Críticos Detectados:
                </span>
                {aiReport.congestionHotspots.map((spot, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                    <div>
                      <strong className="text-secondary font-bold">{spot.title}: </strong>
                      <span className="text-slate-600">{spot.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Observaciones y Recomendaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <h4 className="font-bold text-secondary text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Observaciones de Conducción
            </h4>
            <ul className="space-y-2">
              {(aiReport.drivingObservations || [
                `Velocidad máxima de ${reportData.maxSpeedKmH} km/h dentro de parámetros seguros.`,
                'Conducción estable en tramos urbanos.'
              ]).map((obs, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-emerald-600 font-black">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <h4 className="font-bold text-secondary text-sm mb-3 flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Recomendaciones de Optimización
            </h4>
            <ul className="space-y-2">
              {(aiReport.recommendations || [
                'Considerar vías alternas en horas de alta congestión.',
                'Mantener aceleraciones progresivas para conservar combustible.'
              ]).map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-primary font-black">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer del Reporte */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium">
          <div>
            Consumo estimado de combustible: <strong className="text-secondary">{aiReport.estimatedFuelLiters || 0.45} L</strong>
          </div>
          <button
            onClick={handleResetToIdle}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-btn-hover text-white rounded-xl font-bold shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={15} />
            <span>Iniciar Nuevo Recorrido</span>
          </button>
        </div>

      </div>
    );
  }

  // ==========================================
  // VISTA 5: RASTREO SATELITAL EN VIVO & MAPA (MOBILE-FRIENDLY CON WAZE/GOOGLE MAPS FOLLOW)
  // ==========================================
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/60 p-4 sm:p-7 md:p-8 rounded-[2.25rem] shadow-xl text-slate-800">
      
      {/* Header del Tracker en Vivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shrink-0">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-secondary tracking-tight flex items-center gap-2">
                Ruta GPS en Vivo
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              {currentPosition ? `Lat: ${currentPosition.lat.toFixed(5)}, Lng: ${currentPosition.lng.toFixed(5)} • ±${currentPosition.accuracy}m` : 'Conectando satélites GPS...'}
            </p>
          </div>
        </div>

        {/* Botón Finalizar Ruta */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleFinishRoute}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-primary hover:bg-btn-hover text-white rounded-xl shadow-lg shadow-primary/30 text-xs sm:text-sm font-black transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title="Detener el viaje y generar reporte con IA"
          >
            <Square size={15} className="fill-white" />
            <span>Finalizar Ruta</span>
          </button>

          {isModal && onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-1"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA FLOTANTE ADAPTADA A MÓVIL (Con Sugerencias en Vivo Autocomplete) */}
      <div className="relative mb-3 z-30">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Buscar destino (ej. Reforma, Centro, Hospital, Plaza...)"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className="w-full bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs font-bold pl-10 pr-20 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-xs outline-none focus:ring-2 focus:ring-primary/40 placeholder-slate-400 transition-all"
          />
          <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {isSearching && (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {searchQuery && (
              <button 
                onClick={handleClearDestination} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown de Sugerencias en Tiempo Real */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100 max-h-60 overflow-y-auto"
            >
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectDestination(place)}
                  className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                    <MapPin size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-secondary block truncate">{place.name}</span>
                    <span className="text-[11px] text-slate-500 block truncate">{place.fullName}</span>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 shrink-0 mt-1" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selector de Capa de Mapa y Leyenda de Colores de Tráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 text-xs">
        
        {/* Leyenda de Colores de Tráfico */}
        <div className="flex items-center gap-3 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/60 font-semibold text-[11px] text-slate-600 overflow-x-auto">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Tráfico:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Fluido (&gt;35 km/h)</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Moderado (12-35)</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Pesado (&lt;12)</span>
          </div>
        </div>

        {/* Selector de Proveedor de Mapa */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl self-stretch sm:self-auto border border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Layers size={13} />
            <span className="hidden sm:inline">Capa:</span>
          </span>
          <div className="grid grid-cols-3 gap-1 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setMapProvider('googleRoads')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'googleRoads' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calles
            </button>
            <button
              type="button"
              onClick={() => setMapProvider('googleSatellite')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'googleSatellite' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setMapProvider('cartoDark')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                mapProvider === 'cartoDark' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Oscuro
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA REAL LEAFLET (MODO WAZE / GOOGLE MAPS) */}
      <div className="relative w-full h-[380px] sm:h-[440px] md:h-[500px] rounded-[1.75rem] overflow-hidden border border-slate-200 shadow-inner z-0">
        
        {/* DOM del Mapa */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* BANNER SUPERIOR DE NAVEGACIÓN ACTIVA (ESTILO WAZE / GOOGLE MAPS) */}
        <AnimatePresence>
          {isNavigating && destination && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-3 left-3 right-3 z-[400] bg-secondary/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md shrink-0">
                  <Navigation size={22} className="animate-pulse" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block truncate">
                    Navegando hacia:
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-white block truncate">
                    {destination.name}
                  </strong>
                  {plannedRouteInfo && (
                    <span className="text-[11px] text-slate-300 font-mono block">
                      ~{plannedRouteInfo.distanceKm} km • ETA: {plannedRouteInfo.durationMinutes} min
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleOpenTurnByTurnGoogleMaps}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                  title="Abrir en Google Maps"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Google Maps</span>
                </button>
                <button
                  onClick={handleClearDestination}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all"
                  title="Detener navegación"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Superior Izquierdo: Velocímetro (Oculto o compacto si está en modo navegación) */}
        {!isNavigating && (
          <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 pointer-events-none">
            <div className="bg-secondary/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-white flex items-center gap-2 shadow-xl pointer-events-auto">
              <Gauge size={16} className={currentPosition?.speed > 35 ? 'text-emerald-400' : (currentPosition?.speed > 12 ? 'text-amber-400' : 'text-rose-400')} />
              <span className="text-sm font-extrabold font-mono tracking-tight">
                {currentPosition?.speed || 0} <span className="text-[10px] text-slate-300">KM/H</span>
              </span>
            </div>
            <div className="bg-secondary/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-white flex items-center gap-2 shadow-xl pointer-events-auto hidden sm:flex">
              <Compass size={16} className="text-accent" />
              <span className="text-sm font-extrabold font-mono tracking-tight">
                {currentPosition?.heading || 0}° <span className="text-[10px] text-slate-300">RUMBO</span>
              </span>
            </div>
          </div>
        )}

        {/* HUD Superior Derecho: Distancia y Tiempo de Viaje */}
        {!isNavigating && (
          <div className="absolute top-4 right-4 z-[400] flex items-center gap-2 pointer-events-none justify-end">
            <div className="bg-secondary/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto">
              <Clock size={14} className="text-accent" />
              <span className="text-xs font-bold font-mono">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="bg-secondary/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto">
              <Navigation size={14} className="text-emerald-400" />
              <span className="text-xs font-bold font-mono">{totalDistanceKm.toFixed(2)} KM</span>
            </div>
          </div>
        )}

        {/* BOTÓN FLOTANTE "RECENTRAR" (ESTILO GOOGLE MAPS / WAZE) */}
        {!followVehicle && currentPosition && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-[400]"
          >
            <button
              onClick={handleRecenterVehicle}
              className="px-4 py-2 bg-primary hover:bg-btn-hover text-white text-xs font-extrabold rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <LocateFixed size={15} className="animate-spin" />
              <span>Recentrar Vehículo</span>
            </button>
          </motion.div>
        )}

        {/* TARJETA DE CONFIRMACIÓN DE RUTA (CUANDO SE SELECCIONA DESTINO PERO AÚN NO SE CONFIRMA) */}
        <AnimatePresence>
          {destination && !isNavigating && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-4 left-4 right-4 z-[400] bg-secondary/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-xl mx-auto"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-primary text-white rounded-xl shrink-0">
                  <Flag size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-accent font-extrabold uppercase block tracking-wider">
                    Ruta Sugerida
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-white block truncate">{destination.name}</strong>
                  {plannedRouteInfo && (
                    <span className="text-[11px] text-slate-300 font-mono block">
                      Distancia: {plannedRouteInfo.distanceKm} km • Aprox. {plannedRouteInfo.durationMinutes} min
                    </span>
                  )}
                </div>
              </div>

              {/* Botón de Confirmación para hacer zoom y seguir ruta como Waze */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleConfirmStartNavigation}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Navigation size={14} />
                  <span>Seguir Ruta</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={handleClearDestination}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all"
                  title="Cancelar ruta"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Inferior Izquierdo: Puntos registrados */}
        <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-2 pointer-events-none">
          <div className="bg-secondary/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-1.5 shadow-lg pointer-events-auto text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{routePoints.length} Waypoints</span>
          </div>
        </div>

        {/* HUD Inferior Derecho: Acciones rápidas (Google Maps y Centrar) */}
        <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-2">
          <button
            onClick={handleRecenterVehicle}
            className="p-2.5 bg-secondary/90 hover:bg-secondary text-white rounded-xl shadow-xl border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Centrar en mi vehículo"
          >
            <Crosshair size={16} className="text-accent" />
          </button>

          <button
            onClick={handleOpenGoogleMaps}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary/90 hover:bg-secondary text-white rounded-xl shadow-xl border border-white/15 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Abrir punto en Google Maps"
          >
            <ExternalLink size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Google Maps</span>
          </button>
        </div>
      </div>

      {/* Métricas Inferiores en Tiempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Distancia Recorrida</p>
          <p className="text-sm font-black text-secondary">{totalDistanceKm.toFixed(2)} km</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Tiempo en Ruta</p>
          <p className="text-sm font-black text-primary">{formatTime(elapsedSeconds)}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Velocidad Máxima</p>
          <p className="text-sm font-black text-accent">{maxSpeedKmH} km/h</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Estado de Tráfico</p>
          <p className={`text-sm font-black ${
            currentPosition?.trafficLevel === 'fluent' ? 'text-emerald-600' :
            currentPosition?.trafficLevel === 'moderate' ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {currentPosition?.trafficLevel === 'fluent' ? 'Fluido' :
             currentPosition?.trafficLevel === 'moderate' ? 'Moderado' : 'Pesado / Alto'}
          </p>
        </div>
      </div>

    </div>
  );
}
