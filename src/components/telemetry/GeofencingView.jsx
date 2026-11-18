import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Clock, 
  Bell, 
  Circle, 
  Hexagon, 
  Trash2, 
  AlertTriangle, 
  Crosshair, 
  ExternalLink, 
  Layers, 
  Navigation, 
  CheckCircle2, 
  X, 
  Radio, 
  Power,
  ChevronRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { loadLeaflet, MAP_PROVIDERS } from '../../utils/leafletLoader';
import { calculateDistanceKm, searchPlaces } from '../../utils/routeAiService';
import { proximityAudio } from '../../utils/proximityAudio';

const STORAGE_KEY = 'qride_geofences_v2';

// Algoritmo Ray-Casting para determinar si un punto está dentro de un polígono
function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function GeofencingView() {
  // Ubicación real del usuario/vehículo (obtenida por GPS)
  const [userLocation, setUserLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Lista de geocercas activas (persistidas en localStorage)
  const [geofences, setGeofences] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo geocercas locales:', e);
    }
    return [];
  });

  const [selectedGeo, setSelectedGeo] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('circle');
  const [newRadius, setNewRadius] = useState(150);
  const [pickedLatLng, setPickedLatLng] = useState(null);
  const [pickedAddressName, setPickedAddressName] = useState('');
  const [mapProvider, setMapProvider] = useState('googleRoads');

  // Búsqueda de ubicación con sugerencias estilo Maps
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Manejador de búsqueda con autocompletado y sugerencias
  const handleLocationSearchChange = (text) => {
    setSearchLocationQuery(text);
    if (!text || text.trim().length < 2) {
      setLocationSearchResults([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text, userLocation);
        setLocationSearchResults(results);
      } catch (err) {
        console.warn('Error buscando ubicaciones:', err);
        setLocationSearchResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);
  };

  // Seleccionar sugerencia de búsqueda
  const handleSelectLocationResult = (place) => {
    setPickedLatLng({ lat: place.lat, lng: place.lng });
    setPickedAddressName(place.name || place.fullName);
    setSearchLocationQuery(place.name);
    setLocationSearchResults([]);
    if (!newName.trim()) {
      setNewName(place.name);
    }
    if (previewMapInstanceRef.current) {
      previewMapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 0.6 });
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 0.8 });
    }
  };

  // Usar ubicación actual del GPS
  const handleUseCurrentLocation = () => {
    if (!userLocation) return;
    setPickedLatLng({ lat: userLocation.lat, lng: userLocation.lng });
    setPickedAddressName('Mi Ubicación Actual (GPS)');
    setSearchLocationQuery('');
    setLocationSearchResults([]);
    if (!newName.trim()) {
      setNewName('Mi Ubicación');
    }
    if (previewMapInstanceRef.current) {
      previewMapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 0.6 });
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 0.8 });
    }
  };

  // Referencias para Leaflet y Geolocation
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastAlertTimeRef = useRef(0);

  // Referencias para el Mapa de Referencia en Tiempo Real del Formulario
  const previewMapContainerRef = useRef(null);
  const previewMapInstanceRef = useRef(null);
  const previewLayersRef = useRef(null);
  const previewTileLayerRef = useRef(null);

  // 1. Persistir geocercas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(geofences));
    } catch (e) {
      console.warn('Error guardando geocercas:', e);
    }
  }, [geofences]);

  // 2. Conectar GPS real continuo mediante navigator.geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo o navegador no soporta geolocalización satelital.');
      return;
    }

    const onPosSuccess = (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 5),
        speed: Math.round(pos.coords.speed ? pos.coords.speed * 3.6 : 0),
        heading: pos.coords.heading || 0,
        timestamp: Date.now()
      };

      setUserLocation(coords);
      setGpsActive(true);
      setGpsError(null);

      // Si no hay ninguna geocerca creada, crear automáticamente una primera zona segura real alrededor de la posición actual
      setGeofences((prev) => {
        if (prev.length === 0) {
          const defaultGeo = {
            id: `geo-${Date.now()}`,
            name: 'Mi Zona Segura (Base)',
            type: 'circle',
            lat: coords.lat,
            lng: coords.lng,
            radius: 180,
            events: ['EXIT', 'ENTER'],
            schedule: 'Monitoreo 24/7',
            status: 'active',
            color: '#3D8B6D', // Verde QRide
            createdAt: new Date().toISOString()
          };
          setSelectedGeo(defaultGeo);
          return [defaultGeo];
        }
        return prev;
      });
    };

    const onPosError = (err) => {
      let msg = 'Esperando señal satelital...';
      if (err.code === 1) msg = 'Permiso de ubicación denegado en el navegador.';
      else if (err.code === 2) msg = 'Señal satelital no disponible actualmente.';
      setGpsError(msg);
      setGpsActive(false);
    };

    // Obtener posición inicial
    navigator.geolocation.getCurrentPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      timeout: 10000
    });

    // Seguimiento continuo
    const watchId = navigator.geolocation.watchPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000
    });
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 3. Crear icono de vehículo real en Leaflet
  const createUserVehicleIcon = (L) => {
    return L.divIcon({
      className: 'real-vehicle-marker-geo',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(123, 30, 58, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: #161427; border: 2.5px solid #7B1E3A; box-shadow: 0 4px 14px rgba(123, 30, 58, 0.6); display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#B04A6A" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  };

  // 4. Inicializar mapa Leaflet
  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Centro inicial: posición del usuario o de la geocerca seleccionada
      const initialCenter = userLocation 
        ? [userLocation.lat, userLocation.lng]
        : (selectedGeo ? [selectedGeo.lat, selectedGeo.lng] : [19.4326, -99.1332]);

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Capa base
      const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;
      tileLayerRef.current = L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      // Grupo de capas para geocercas
      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      // Evento de clic en el mapa para capturar coordenadas al crear geocerca
      map.on('click', (e) => {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPickedLatLng(coords);
        setPickedAddressName('Punto fijado en el mapa');
        if (previewMapInstanceRef.current) {
          previewMapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 0.5 });
        }
      });

      mapInstanceRef.current = map;
      drawGeofencesAndVehicle(map, layersGroup, geofences, selectedGeo, userLocation);
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

  // 5. Cambio dinámico de capa de mapa
  useEffect(() => {
    if (!window.L) return;
    const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;

    if (mapInstanceRef.current) {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      tileLayerRef.current = window.L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(mapInstanceRef.current);
    }

    if (previewMapInstanceRef.current) {
      if (previewTileLayerRef.current) {
        previewMapInstanceRef.current.removeLayer(previewTileLayerRef.current);
      }
      previewTileLayerRef.current = window.L.tileLayer(provider.url, {
        maxZoom: provider.maxZoom,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(previewMapInstanceRef.current);
    }
  }, [mapProvider]);

  // Función para dibujar la geocerca de referencia en el formulario
  const drawPreviewGeofence = (map, group, latLng, type, radius, userPos) => {
    if (!window.L || !group) return;
    const L = window.L;
    group.clearLayers();

    // Dibujar vehículo del usuario si existe
    if (userPos) {
      const userDot = L.circleMarker([userPos.lat, userPos.lng], {
        radius: 6,
        fillColor: '#2C254D',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      });
      userDot.bindTooltip('Tu posición GPS actual', { permanent: false, direction: 'top' });
      group.addLayer(userDot);
    }

    if (!latLng) return;

    const centerLat = latLng.lat;
    const centerLng = latLng.lng;

    // Marcador central de la nueva geocerca
    const centerMarker = L.circleMarker([centerLat, centerLng], {
      radius: 7,
      fillColor: '#7B1E3A',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    });
    centerMarker.bindTooltip('Centro de la zona', { permanent: true, direction: 'top' });
    group.addLayer(centerMarker);

    // Dibujar perímetro de referencia
    if (type === 'circle') {
      const circle = L.circle([centerLat, centerLng], {
        radius: radius,
        color: '#7B1E3A',
        fillColor: '#7B1E3A',
        fillOpacity: 0.25,
        weight: 2.5,
        dashArray: '5, 5'
      });
      group.addLayer(circle);

      // Círculo exterior de margen de histéresis (+25m)
      const tolCircle = L.circle([centerLat, centerLng], {
        radius: radius + 25,
        color: '#2C254D',
        fill: false,
        weight: 1,
        dashArray: '3, 4',
        opacity: 0.4
      });
      group.addLayer(tolCircle);
    } else if (type === 'polygon') {
      const delta = 0.0018;
      const pts = [
        [centerLat + delta, centerLng - delta],
        [centerLat + delta, centerLng + delta],
        [centerLat - delta, centerLng + delta],
        [centerLat - delta, centerLng - delta]
      ];
      const polygon = L.polygon(pts, {
        color: '#7B1E3A',
        fillColor: '#7B1E3A',
        fillOpacity: 0.25,
        weight: 2.5,
        dashArray: '5, 5'
      });
      group.addLayer(polygon);
    }
  };

  // Inicialización y ciclo de vida del Mapa de Referencia dentro del formulario
  useEffect(() => {
    if (!isCreating) {
      if (previewMapInstanceRef.current) {
        previewMapInstanceRef.current.remove();
        previewMapInstanceRef.current = null;
        previewLayersRef.current = null;
        previewTileLayerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      loadLeaflet().then((L) => {
        if (!isMounted || !previewMapContainerRef.current) return;

        if (previewMapInstanceRef.current) {
          previewMapInstanceRef.current.remove();
          previewMapInstanceRef.current = null;
        }

        const centerCoords = pickedLatLng 
          ? [pickedLatLng.lat, pickedLatLng.lng]
          : (userLocation ? [userLocation.lat, userLocation.lng] : [19.4326, -99.1332]);

        const pMap = L.map(previewMapContainerRef.current, {
          center: centerCoords,
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        L.control.zoom({ position: 'topright' }).addTo(pMap);

        const provider = MAP_PROVIDERS[mapProvider] || MAP_PROVIDERS.googleRoads;
        previewTileLayerRef.current = L.tileLayer(provider.url, {
          maxZoom: provider.maxZoom,
          subdomains: ['a', 'b', 'c', 'd']
        }).addTo(pMap);

        const pLayers = L.layerGroup().addTo(pMap);
        previewLayersRef.current = pLayers;

        pMap.on('click', (e) => {
          const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
          setPickedLatLng(newPos);
          setPickedAddressName('Punto seleccionado en mapa');
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([newPos.lat, newPos.lng], 16, { duration: 0.5 });
          }
        });

        previewMapInstanceRef.current = pMap;

        // Invalidate size para ajustar dimensiones tras la animación
        setTimeout(() => {
          if (previewMapInstanceRef.current) {
            previewMapInstanceRef.current.invalidateSize();
          }
        }, 250);

        const targetPos = pickedLatLng || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null);
        drawPreviewGeofence(pMap, pLayers, targetPos, newType, newRadius, userLocation);
      }).catch(err => {
        console.error('Error cargando mapa de referencia en formulario:', err);
      });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (previewMapInstanceRef.current) {
        previewMapInstanceRef.current.remove();
        previewMapInstanceRef.current = null;
        previewLayersRef.current = null;
        previewTileLayerRef.current = null;
      }
    };
  }, [isCreating]);

  // Redibujar mapa de referencia cuando cambian parámetros del formulario
  useEffect(() => {
    if (!isCreating || !previewMapInstanceRef.current || !previewLayersRef.current) return;
    const targetPos = pickedLatLng || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null);
    drawPreviewGeofence(previewMapInstanceRef.current, previewLayersRef.current, targetPos, newType, newRadius, userLocation);
  }, [pickedLatLng, newType, newRadius, userLocation, isCreating]);

  // 6. Redibujar geocercas y vehículo cuando cambian datos o posición GPS
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;
    drawGeofencesAndVehicle(mapInstanceRef.current, layersGroupRef.current, geofences, selectedGeo, userLocation);
  }, [geofences, selectedGeo, userLocation]);

  // 7. Cálculo matemático real de pertenencia (Dentro / Fuera) y distancias
  const getGeofenceStatus = (geo, userPos) => {
    if (!userPos) {
      return { isInside: false, isOutside: false, label: 'Calculando...', distanceText: 'Esperando GPS', distanceMeters: 0, distanceToBoundary: 0 };
    }

    if (geo.type === 'circle') {
      const distMeters = Math.round(calculateDistanceKm(userPos.lat, userPos.lng, geo.lat, geo.lng) * 1000);
      const isInside = distMeters <= geo.radius;
      const distanceToBoundary = Math.abs(distMeters - geo.radius);

      return {
        isInside,
        isOutside: !isInside,
        label: isInside ? 'DENTRO (Seguro)' : 'FUERA DE ZONA',
        distanceMeters: distMeters,
        distanceToBoundary,
        distanceText: isInside 
          ? `A ${distMeters}m del centro (${distanceToBoundary}m al límite)` 
          : `A ${distanceToBoundary}m fuera del límite`
      };
    } else if (geo.type === 'polygon' && geo.points) {
      const inside = isPointInPolygon([userPos.lat, userPos.lng], geo.points);
      return {
        isInside: inside,
        isOutside: !inside,
        label: inside ? 'DENTRO (Seguro)' : 'FUERA DE ZONA',
        distanceMeters: 0,
        distanceToBoundary: 0,
        distanceText: inside ? 'Dentro del polígono seguro' : 'Fuera del polígono configurado'
      };
    }

    return { isInside: false, isOutside: false, label: 'N/A', distanceText: 'N/A', distanceMeters: 0, distanceToBoundary: 0 };
  };

  // 8. Comprobación Multi-Zona Segura Profesional
  // El vehículo está SEGURO si está dentro de CUALQUIER zona activa.
  // Solo se considera violación de perímetro (Breach) si existen zonas activas Y el vehículo está fuera de TODAS ellas.
  const activeSafeZones = geofences.filter(geo => geo.status === 'active');
  const safeZonesWithVehicle = activeSafeZones.filter(geo => getGeofenceStatus(geo, userLocation).isInside);
  const isVehicleInAnySafeZone = safeZonesWithVehicle.length > 0;
  const isGlobalBreach = Boolean(userLocation && activeSafeZones.length > 0 && !isVehicleInAnySafeZone);

  // Zona más cercana al vehículo cuando está fuera de todos los perímetros
  const closestZone = isGlobalBreach ? activeSafeZones.reduce((prev, curr) => {
    const prevDist = getGeofenceStatus(prev, userLocation).distanceMeters || 999999;
    const currDist = getGeofenceStatus(curr, userLocation).distanceMeters || 999999;
    return currDist < prevDist ? curr : prev;
  }, activeSafeZones[0]) : null;

  // Emitir alerta acústica SOLO cuando el vehículo sale de TODAS las zonas seguras autorizadas
  useEffect(() => {
    if (isGlobalBreach && Date.now() - lastAlertTimeRef.current > 30000) {
      proximityAudio.playBeep(520, 0.25, 'triangle', 0.25);
      lastAlertTimeRef.current = Date.now();
    }
  }, [isGlobalBreach]);

  // 9. Función de dibujo y renderizado en Leaflet
  const drawGeofencesAndVehicle = (map, group, list, activeGeo, userPos) => {
    if (!window.L || !group) return;
    const L = window.L;
    group.clearLayers();

    // Evaluar multi-zona segura para colorear adecuadamente
    const currentActiveZones = list.filter(g => g.status === 'active');
    const insideAnyZone = currentActiveZones.some(g => getGeofenceStatus(g, userPos).isInside);
    const hasBreach = Boolean(userPos && currentActiveZones.length > 0 && !insideAnyZone);

    // Dibujar cada geocerca
    list.forEach((geo) => {
      const isSelected = activeGeo?.id === geo.id;
      const statusInfo = getGeofenceStatus(geo, userPos);
      const isInsideThis = statusInfo.isInside;

      // Determinación profesional del color:
      // - Si está pausada: gris slate
      // - Si el vehículo está fuera de TODAS las zonas seguras: rojo de alerta perimetral (#E63946)
      // - Si el vehículo está dentro de ESTA zona: verde esmeralda brillante (#3D8B6D)
      // - Si el vehículo está dentro de OTRA zona segura: verde azulado calmado (#2C7A58)
      let color = '#64748b';
      if (geo.status === 'active') {
        if (hasBreach) {
          color = '#E63946';
        } else if (isInsideThis) {
          color = '#3D8B6D';
        } else {
          color = '#2C7A58';
        }
      }

      const tooltipText = isInsideThis
        ? `<b>${geo.name}</b><br/>🟢 Vehículo presente aquí`
        : (hasBreach 
            ? `<b>${geo.name}</b><br/>⚠️ Fuera de zona segura (${statusInfo.distanceText})`
            : `<b>${geo.name}</b><br/>🛡️ Zona autorizada (${statusInfo.distanceText})`);

      if (geo.type === 'circle') {
        const circle = L.circle([geo.lat, geo.lng], {
          radius: geo.radius,
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : (isInsideThis ? 0.25 : 0.14),
          weight: isSelected ? 3.5 : (isInsideThis ? 2.5 : 1.8),
          dashArray: geo.status === 'paused' ? '6, 6' : null
        });

        circle.bindTooltip(tooltipText, {
          permanent: isSelected,
          direction: 'top',
          className: 'geofence-tooltip'
        });

        circle.on('click', () => setSelectedGeo(geo));
        group.addLayer(circle);

        // Margen virtual de histéresis (+25m)
        const hysteresisCircle = L.circle([geo.lat, geo.lng], {
          radius: geo.radius + 25,
          color: color,
          fill: false,
          weight: 1,
          dashArray: '3, 5',
          opacity: 0.35
        });
        group.addLayer(hysteresisCircle);

      } else if (geo.type === 'polygon' && geo.points) {
        const polygon = L.polygon(geo.points, {
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : (isInsideThis ? 0.25 : 0.14),
          weight: isSelected ? 3.5 : (isInsideThis ? 2.5 : 1.8),
          dashArray: geo.status === 'paused' ? '6, 6' : null
        });

        polygon.bindTooltip(tooltipText, {
          permanent: isSelected,
          direction: 'top',
          className: 'geofence-tooltip'
        });

        polygon.on('click', () => setSelectedGeo(geo));
        group.addLayer(polygon);
      }
    });

    // Marcador de punto fijado para nueva geocerca
    if (pickedLatLng) {
      const pickedMarker = L.circleMarker([pickedLatLng.lat, pickedLatLng.lng], {
        radius: 7,
        fillColor: '#7B1E3A',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      });
      pickedMarker.bindTooltip('Nuevo perímetro seleccionado', { permanent: true, direction: 'bottom' });
      group.addLayer(pickedMarker);
    }

    // Marcador del vehículo real del usuario en tiempo real
    if (userPos) {
      const vehicleMarker = L.marker([userPos.lat, userPos.lng], {
        icon: createUserVehicleIcon(L)
      });
      vehicleMarker.bindPopup(`<b>Mi Vehículo (GPS Real)</b><br/>Precisión: ±${userPos.accuracy}m<br/>Velocidad: ${userPos.speed} km/h`);
      group.addLayer(vehicleMarker);
      userMarkerRef.current = vehicleMarker;
    }
  };

  // 10. Crear nueva geocerca real
  const handleCreateGeofence = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Si el usuario seleccionó un punto en el mapa, usarlo; de lo contrario, usar su ubicación GPS actual
    const targetLat = pickedLatLng ? pickedLatLng.lat : (userLocation ? userLocation.lat : 19.4326);
    const targetLng = pickedLatLng ? pickedLatLng.lng : (userLocation ? userLocation.lng : -99.1332);

    let points = null;
    if (newType === 'polygon') {
      const delta = 0.0018;
      points = [
        [targetLat + delta, targetLng - delta],
        [targetLat + delta, targetLng + delta],
        [targetLat - delta, targetLng + delta],
        [targetLat - delta, targetLng - delta]
      ];
    }

    const newGeo = {
      id: `geo-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      lat: targetLat,
      lng: targetLng,
      radius: newType === 'circle' ? newRadius : null,
      points,
      events: ['EXIT', 'ENTER'],
      schedule: 'Monitoreo 24/7',
      status: 'active',
      color: '#3D8B6D',
      createdAt: new Date().toISOString()
    };

    const updated = [...geofences, newGeo];
    setGeofences(updated);
    setSelectedGeo(newGeo);
    setIsCreating(false);
    setNewName('');
    setPickedLatLng(null);
    setPickedAddressName('');
    setSearchLocationQuery('');
    setLocationSearchResults([]);

    // Centrar mapa en la nueva geocerca
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([targetLat, targetLng], 16, { duration: 0.8 });
    }
  };

  // Alternar pausa / activación de geocerca
  const handleToggleStatus = (id) => {
    setGeofences(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, status: g.status === 'active' ? 'paused' : 'active' };
      }
      return g;
    }));
  };

  // Eliminar geocerca
  const handleDeleteGeofence = (id) => {
    const updated = geofences.filter(g => g.id !== id);
    setGeofences(updated);
    if (selectedGeo?.id === id) {
      setSelectedGeo(updated[0] || null);
    }
  };

  // Centrar en vehículo del usuario
  const handleCenterUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 0.8 });
    }
  };

  // Centrar en geocerca seleccionada
  const handleCenterGeofence = () => {
    if (mapInstanceRef.current && selectedGeo) {
      mapInstanceRef.current.flyTo([selectedGeo.lat, selectedGeo.lng], 16, { duration: 0.8 });
    }
  };

  // Abrir en Google Maps
  const handleOpenGoogleMaps = () => {
    const target = selectedGeo || userLocation;
    if (!target) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Alerta Destacada en Caso de Violación de Perímetro Multi-Zona */}
      <AnimatePresence>
        {isGlobalBreach && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shrink-0 animate-bounce">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h5 className="font-black text-sm">
                  ¡Alerta de Seguridad Satelital!
                </h5>
                <p className="text-xs font-semibold text-rose-800">
                  Tu vehículo se encuentra <strong>fuera de todos los perímetros seguros autorizados</strong>
                  {closestZone ? ` (a ${getGeofenceStatus(closestZone, userLocation).distanceText} de "${closestZone.name}")` : ''}.
                </p>
              </div>
            </div>
            <button
              onClick={handleCenterUser}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all text-center"
            >
              Ubicar en Mapa
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner Principal de Geocercas Satelitales (Paleta Oficial QRide, Sin icono lateral) */}
      <div className="bg-gradient-to-br from-secondary via-[#382f60] to-secondary p-4 sm:p-5 md:p-6 rounded-3xl md:rounded-[2rem] border border-secondary/60 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-base md:text-lg text-white">
              Geocercas Satelitales en Tiempo Real
            </h4>
            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${
              gpsActive 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {gpsActive ? 'GPS Activo' : 'Buscando GPS'}
            </span>
            {isVehicleInAnySafeZone && (
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} /> Seguro ({safeZonesWithVehicle[0]?.name})
              </span>
            )}
            {isGlobalBreach && (
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse flex items-center gap-1">
                <AlertTriangle size={11} /> Fuera de Zona
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted max-w-2xl">
            Monitoreo continuo multizona con tu ubicación real. Puedes registrar múltiples zonas seguras (casa, trabajo, cochera) y el vehículo se considerará protegido al encontrarse en cualquiera de ellas.
          </p>
        </div>

        {/* Botón Nueva Geocerca */}
        <button 
          onClick={() => {
            const next = !isCreating;
            setIsCreating(next);
            if (next && !pickedLatLng) {
              if (userLocation) {
                setPickedLatLng({ lat: userLocation.lat, lng: userLocation.lng });
                setPickedAddressName('Mi Ubicación Actual (GPS)');
              } else {
                setPickedLatLng({ lat: 19.4326, lng: -99.1332 });
                setPickedAddressName('Ciudad de México (Centro)');
              }
            }
          }}
          className="w-full sm:w-auto justify-center px-5 py-3 bg-primary hover:bg-btn-hover text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-primary/35 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
        >
          {isCreating ? <X size={17} /> : <Plus size={17} />} 
          <span>{isCreating ? 'Cerrar Formulario' : 'Crear Geocerca'}</span>
        </button>
      </div>

      {/* Formulario de Creación de Nueva Geocerca (Desplegado directamente debajo del botón Crear Geocerca con Buscador Maps y Mapa de Referencia) */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="p-5 md:p-6 bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-[2rem] border-2 border-primary/30 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm md:text-base text-secondary">
                    Configurar Nuevo Perímetro Seguro
                  </h4>
                  <p className="text-xs text-slate-500">
                    Busca una ubicación con sugerencias, usa tu GPS actual o haz clic en el mapa de referencia interactivo.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreating(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                title="Cerrar formulario"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
              {/* Controles de Configuración: 7 columnas en desktop */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Columna Izquierda: Ubicación y Buscador con Sugerencias */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block">
                      1. Seleccionar Ubicación
                    </label>

                    {/* Barra de Búsqueda con Sugerencias Estilo Google Maps */}
                    <div className="relative">
                      <div className="relative flex items-center">
                        <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar dirección o lugar..."
                          value={searchLocationQuery}
                          onChange={(e) => handleLocationSearchChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                        />
                        {searchLocationQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchLocationQuery(''); setLocationSearchResults([]); }}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de Sugerencias Nominatim */}
                      {locationSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-52 overflow-y-auto">
                          {locationSearchResults.map((place) => (
                            <div
                              key={place.id}
                              onClick={() => handleSelectLocationResult(place)}
                              className="p-2.5 hover:bg-primary/5 border-b border-slate-100 last:border-0 cursor-pointer transition-colors flex items-start gap-2"
                            >
                              <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-secondary truncate">{place.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{place.fullName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botón Usar mi ubicación actual (GPS) */}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={!userLocation}
                      className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-secondary rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
                    >
                      <Crosshair size={14} className="text-primary" />
                      <span>Usar mi posición actual (GPS)</span>
                    </button>

                    {/* Indicador de coordenadas / Punto fijado */}
                    {pickedLatLng ? (
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between">
                        <span className="truncate">📍 {pickedAddressName || `Lat: ${pickedLatLng.lat.toFixed(4)}, Lng: ${pickedLatLng.lng.toFixed(4)}`}</span>
                        <span className="text-[10px] text-emerald-700 uppercase shrink-0 font-sans ml-2">Fijado</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                        💡 Selecciona una sugerencia, usa tu GPS o haz clic en el mapa de referencia.
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Parámetros */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block">
                      2. Nombre y Cobertura
                    </label>

                    <input 
                      type="text" 
                      placeholder="Nombre de la zona (ej. Casa, Trabajo)" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/40 outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setNewType('circle')}
                        className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          newType === 'circle' 
                            ? 'bg-primary text-white border-primary shadow-xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Circle size={13} /> Círculo
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setNewType('polygon')}
                        className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          newType === 'polygon' 
                            ? 'bg-primary text-white border-primary shadow-xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Hexagon size={13} /> Polígono
                      </button>
                    </div>

                    {newType === 'circle' && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Radio de Cobertura</label>
                          <span className="text-xs font-mono font-bold text-primary">{newRadius} metros</span>
                        </div>
                        <input 
                          type="range" min="50" max="1000" step="25" 
                          value={newRadius} onChange={e => setNewRadius(Number(e.target.value))} 
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones Guardar / Cancelar */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={handleCreateGeofence} 
                    disabled={!newName.trim()}
                    className="flex-1 py-3 bg-primary hover:bg-btn-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} /> Guardar Zona Segura
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)} 
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Columna Derecha: Mapa de Referencia en Tiempo Real: 5 columnas en desktop */}
              <div className="lg:col-span-5 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-primary" />
                    3. Previsualización del Perímetro
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {newType === 'circle' ? `Radio: ${newRadius}m` : 'Polígono'}
                  </span>
                </div>

                {/* Contenedor del Mapa de Referencia */}
                <div className="relative w-full h-64 sm:h-72 lg:h-full min-h-[260px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                  <div ref={previewMapContainerRef} className="w-full h-full z-0" />

                  {/* Floating Badges */}
                  <div className="absolute top-2.5 left-2.5 z-[400] bg-secondary/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-white shadow-md flex items-center gap-1.5 border border-white/10 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>Perímetro antes de guardar</span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700 shadow-md border border-slate-200 pointer-events-none">
                    👆 Clic en mapa para reubicar centro
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid: Mapa Real + Panel de Control de Geocercas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAPA REAL LEAFLET */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-xl rounded-[2rem] border border-white/60 p-4 sm:p-5 flex flex-col relative overflow-hidden shadow-xl min-h-[440px] sm:min-h-[500px]">
          
          {/* Header del Mapa y Selector de Capas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${gpsActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              <span className="text-xs font-bold text-secondary">
                {selectedGeo ? `${selectedGeo.name}` : 'Mapa Satelital de Geocercas'}
              </span>
            </div>

            {/* Selector de Capas */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 flex items-center gap-1">
                <Layers size={11} /> Capa:
              </span>
              <button
                onClick={() => setMapProvider('googleRoads')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'googleRoads' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                onClick={() => setMapProvider('googleSatellite')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'googleSatellite' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
              <button
                onClick={() => setMapProvider('cartoDark')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mapProvider === 'cartoDark' ? 'bg-white text-secondary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cyber
              </button>
            </div>
          </div>

          {/* Contenedor del Mapa Leaflet */}
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-inner min-h-[340px] sm:min-h-[380px] z-0">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Botones Flotantes de Navegación Rápida */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[400] flex items-center gap-2">
              <button
                onClick={handleCenterUser}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-secondary/90 hover:bg-secondary text-white rounded-xl shadow-lg border border-white/10 backdrop-blur-md text-[11px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                title="Centrar en mi ubicación GPS"
              >
                <Crosshair size={13} className="text-accent" />
                <span>Mi Ubicación</span>
              </button>

              <button
                onClick={handleOpenGoogleMaps}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-secondary/90 hover:bg-secondary text-white rounded-xl shadow-lg border border-white/10 backdrop-blur-md text-[11px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                title="Abrir en Google Maps"
              >
                <ExternalLink size={12} className="text-emerald-400" />
                <span className="hidden sm:inline">Google Maps</span>
              </button>
            </div>

            {/* Indicador de ayuda al usuario para fijar geocerca con un clic */}
            <div className="hidden sm:flex absolute bottom-3 right-3 z-[400] text-[10px] font-bold text-slate-700 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md items-center gap-1.5">
              <MapPin size={12} className="text-primary" />
              <span>Clic en el mapa para ubicar nuevo perímetro</span>
            </div>

            {/* Leyenda interactiva */}
            <div className="absolute bottom-3 left-3 z-[400] bg-secondary/95 backdrop-blur-md p-2 sm:p-2.5 rounded-xl border border-white/10 text-[9px] sm:text-[10px] text-slate-200 space-y-1 shadow-lg max-w-[210px] sm:max-w-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Vehículo en Zona Segura
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C7A58] shrink-0" /> Zona Autorizada
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" /> Fuera de Zona (Alerta)
              </div>
            </div>
          </div>
        </div>

        {/* LISTA Y DETALLE DE GEOCERCAS ACTIVAS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
              Zonas Registradas ({geofences.length})
            </h3>
            <span className="text-[11px] font-bold text-primary">
              Toca para inspeccionar
            </span>
          </div>

          {/* Tarjetas de Geocercas */}
          <div className="space-y-3">
            {geofences.length === 0 && !isCreating && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                No tienes zonas configuradas. Presiona <strong>«Crear Geocerca»</strong> para registrar tu primera zona segura.
              </div>
            )}

            {geofences.map((geo) => {
              const isSelected = selectedGeo?.id === geo.id;
              const status = getGeofenceStatus(geo, userLocation);
              const isInsideThis = status.isInside;

              let badgeLabel = 'Pausada';
              let badgeStyle = 'bg-slate-100 text-slate-500 border border-slate-200';

              if (geo.status === 'active') {
                if (isInsideThis) {
                  badgeLabel = '🟢 Vehículo Aquí (Dentro)';
                  badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold';
                } else if (!isGlobalBreach && isVehicleInAnySafeZone) {
                  const currentName = safeZonesWithVehicle[0]?.name || 'otra zona';
                  badgeLabel = `🛡️ Autorizada (En ${currentName})`;
                  badgeStyle = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                } else {
                  badgeLabel = '⚠️ Fuera de Perímetro';
                  badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-300 animate-pulse';
                }
              }

              let statusDescription = status.distanceText;
              if (geo.status === 'active') {
                if (isInsideThis) {
                  statusDescription = 'Vehículo protegido dentro de esta zona segura.';
                } else if (!isGlobalBreach && isVehicleInAnySafeZone) {
                  const currentName = safeZonesWithVehicle[0]?.name || 'otra zona autorizada';
                  statusDescription = `Vehículo seguro en "${currentName}". ${status.distanceText}.`;
                }
              }

              return (
                <div
                  key={geo.id}
                  onClick={() => {
                    setSelectedGeo(geo);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([geo.lat, geo.lng], 16, { duration: 0.8 });
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/5 border-primary shadow-md shadow-primary/10 scale-[1.01]' 
                      : 'bg-white/90 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      {geo.type === 'circle' ? (
                        <Circle size={16} className={isInsideThis ? 'text-emerald-600' : (isGlobalBreach ? 'text-rose-600' : 'text-primary')} />
                      ) : (
                        <Hexagon size={16} className={isInsideThis ? 'text-emerald-600' : (isGlobalBreach ? 'text-rose-600' : 'text-secondary')} />
                      )}
                      <h4 className="font-extrabold text-secondary text-sm">{geo.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shrink-0 ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium mb-3">
                    {statusDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{geo.schedule || '24/7'}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <Bell size={12} className="text-slate-400 shrink-0" />
                      <span>{geo.events?.join(', ') || 'EXIT, ENTER'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{geo.type === 'circle' ? `Radio: ${geo.radius}m` : 'Polígono'} • Histéresis 25m</span>
                    
                    <div className="flex items-center gap-1">
                      {/* Botón pausar / activar */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(geo.id); }} 
                        className={`p-1.5 rounded-lg transition-colors ${geo.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        title={geo.status === 'active' ? 'Pausar monitoreo' : 'Activar monitoreo'}
                      >
                        <Power size={13} />
                      </button>

                      {/* Botón eliminar */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteGeofence(geo.id); }} 
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar geocerca"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
