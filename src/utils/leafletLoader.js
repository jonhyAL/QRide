// Cargador seguro de Leaflet para mapas reales interactivos (Google Maps / OpenStreetMap / CartoDB)

let leafletPromise = null;

export function loadLeaflet() {
  if (typeof window !== 'undefined' && window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not available'));

    if (window.L) {
      resolve(window.L);
      return;
    }

    // 1. Inyectar CSS si no está presente
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Inyectar JS si no está presente
    const existingScript = document.getElementById('leaflet-js');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      resolve(window.L);
    };
    script.onerror = (e) => reject(new Error('Error al cargar Leaflet desde CDN: ' + e));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

// Configuración de proveedores de mapas reales
export const MAP_PROVIDERS = {
  googleRoads: {
    name: 'Google Maps Calles',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  googleSatellite: {
    name: 'Google Satélite Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satélite',
    maxZoom: 20
  },
  cartoDark: {
    name: 'Modo Oscuro Cyber',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO & OpenStreetMap',
    maxZoom: 19
  },
  osm: {
    name: 'OpenStreetMap Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

