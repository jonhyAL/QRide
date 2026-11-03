// Cargador dinámico por CDN para TensorFlow.js y COCO-SSD
// Evita el bug conocido de pre-empaquetado de Vite con 'async import(keys, values)' en @tensorflow/tfjs-core

let loadedModel = null;
let loadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true' || window.tf || window.cocoSsd) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

export async function loadCocoSsdModel(onProgress) {
  if (loadedModel) return loadedModel;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      if (onProgress) onProgress('Iniciando aceleración WebGL en navegador...');

      // 1. Cargar tfjs desde CDN UMD minificado (sin errores de sintaxis de ES modules)
      if (!window.tf) {
        if (onProgress) onProgress('Cargando motor TensorFlow.js...');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      }

      // 2. Cargar COCO-SSD desde CDN
      if (!window.cocoSsd) {
        if (onProgress) onProgress('Cargando red neuronal COCO-SSD...');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
      }

      if (!window.cocoSsd) {
        throw new Error('No se pudo inicializar la librería COCO-SSD');
      }

      if (onProgress) onProgress('Optimizando pesos neuronales (MobileNet V2)...');
      loadedModel = await window.cocoSsd.load({
        base: 'lite_mobilenet_v2' // Rápido y fluido para 30 FPS en tiempo real
      });

      if (onProgress) onProgress('Modelo neuronal listo para escaneo.');
      return loadedModel;
    } catch (err) {
      console.warn('Error cargando modelo COCO-SSD desde CDN:', err);
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

// Clases prioritarias para el ADAS de la motocicleta
export const MONITORED_CLASSES = [
  'person',      // Peatones, corredores, ciclistas a pie
  'car',         // Autos particulares, taxis
  'motorcycle',  // Otras motos en punto ciego
  'bicycle',     // Ciclistas
  'truck',       // Camiones de carga
  'bus'          // Autobuses y transporte público
];

/**
 * Estima la distancia aproximada del objeto según el tamaño del cuadro delimitador (bounding box)
 * y su altura en el fotograma de la cámara.
 * @param {Array} bbox [x, y, width, height]
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @param {string} className
 */
export function estimateProximity(bbox, frameWidth, frameHeight, className = 'person') {
  const [x, y, w, h] = bbox;
  const areaRatio = (w * h) / (frameWidth * frameHeight);
  const bottomYRatio = (y + h) / frameHeight;

  // Los vehículos de gran porte ocupan más área visual a mayor distancia
  const isLargeVehicle = className === 'truck' || className === 'bus';
  const isCarOrMoto = className === 'car' || className === 'motorcycle';

  let distance = 5.0;

  if (isLargeVehicle) {
    distance = Math.max(0.8, 8.5 - (areaRatio * 20 + bottomYRatio * 3.5));
  } else if (isCarOrMoto) {
    distance = Math.max(0.6, 6.8 - (areaRatio * 18 + bottomYRatio * 3.0));
  } else {
    // Personas o bicicletas
    distance = Math.max(0.5, 5.0 - (areaRatio * 16 + bottomYRatio * 2.5));
  }

  distance = Number(distance.toFixed(1));

  let zone = 'safe'; // 'safe' (> 3.6m) | 'warning' (1.8m - 3.6m) | 'critical' (< 1.8m)
  if (distance <= 1.8) {
    zone = 'critical';
  } else if (distance <= 3.6) {
    zone = 'warning';
  }

  return {
    distanceMeters: distance,
    zone,
    centerX: x + w / 2,
    centerY: y + h / 2
  };
}
