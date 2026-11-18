// Servicio de Inteligencia Artificial para Análisis Pericial de Rutas y Tráfico GPS
// Integra QRide IA para evaluar el trayecto, velocidad y congestión

import { getGeminiApiKey } from './helmetAiService';
import jsPDF from 'jspdf';

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula Haversine
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determina el nivel de tráfico según la velocidad instantánea
 * @param {number} speedKmH Velocidad en km/h
 * @returns {'heavy' | 'moderate' | 'fluent'}
 */
export function getTrafficLevel(speedKmH) {
  if (speedKmH <= 12) return 'heavy'; // Rojo: Tráfico pesado o detenido
  if (speedKmH <= 35) return 'moderate'; // Amarillo: Tráfico urbano moderado
  return 'fluent'; // Verde: Tráfico fluido
}

/**
 * Conversiones de proyección Web Mercator para azulejos de mapa (Tiles)
 */
function lon2tile(lon, zoom) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat, zoom) {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

/**
 * Geocodificación inversa para obtener la dirección escrita a partir de coordenadas GPS
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return 'Ubicación no disponible';
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es'
      }
    });
    if (!res.ok) throw new Error('Geocodificación fallida');
    const data = await res.json();
    if (data && data.display_name) {
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.suburb || '';
      const suburb = addr.neighbourhood || addr.suburb || addr.city_district || '';
      const city = addr.city || addr.town || addr.municipality || addr.state || '';
      
      const parts = [road, suburb, city].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
      return data.display_name.split(',').slice(0, 3).join(', ');
    }
  } catch (err) {
    console.warn('Fallback de geocodificación inversa:', err);
  }
  return `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Genera una imagen en Canvas de alta resolución del trayecto recorrido,
 * cargando tiles reales de mapa (CartoDB Voyager) en el fondo para que se vean calles y colonias reales.
 */
export async function generateRouteSnapshotCanvas(points, routeStats, startAddr = '', endAddr = '') {
  if (!points || points.length === 0) return null;

  try {
    const width = 800;
    const height = 520;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo base
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, width, height);

    // Calcular límites geográficos de la ruta con margen de seguridad
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const latDelta = Math.abs(maxLat - minLat);
    const lngDelta = Math.abs(maxLng - minLng);
    if (latDelta < 0.002) { minLat -= 0.0025; maxLat += 0.0025; }
    if (lngDelta < 0.002) { minLng -= 0.0025; maxLng += 0.0025; }

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calcular zoom óptimo para que se vea el mapa de calles claramente
    let zoom = 15;
    for (let z = 17; z >= 12; z--) {
      const dx = (lon2tile(maxLng, z) - lon2tile(minLng, z)) * 256;
      const dy = Math.abs(lat2tile(minLat, z) - lat2tile(maxLat, z)) * 256;
      if (dx < width - 160 && dy < height - 200) {
        zoom = z;
        break;
      }
    }
    zoom = Math.max(12, Math.min(17, zoom));

    const centerTileX = lon2tile(centerLng, zoom);
    const centerTileY = lat2tile(centerLat, zoom);

    // Cargar azulejos de mapa real (Esri World Street Map con soporte total de CORS sin marcas de agua)
    const minTX = Math.floor(centerTileX - (width / 2) / 256) - 1;
    const maxTX = Math.ceil(centerTileX + (width / 2) / 256) + 1;
    const minTY = Math.floor(centerTileY - (height / 2) / 256) - 1;
    const maxTY = Math.ceil(centerTileY + (height / 2) / 256) + 1;

    const maxTile = Math.pow(2, zoom);
    const tilePromises = [];

    for (let tx = minTX; tx <= maxTX; tx++) {
      for (let ty = minTY; ty <= maxTY; ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        const normTX = ((tx % maxTile) + maxTile) % maxTile;

        tilePromises.push(new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const px = width / 2 + (tx - centerTileX) * 256;
            const py = height / 2 + (ty - centerTileY) * 256;
            try {
              ctx.drawImage(img, px, py, 256, 256);
            } catch (e) {}
            resolve();
          };
          img.onerror = () => {
            // Intento con Esri World Topo Map como fallback
            const topoImg = new Image();
            topoImg.crossOrigin = 'anonymous';
            topoImg.onload = () => {
              const px = width / 2 + (tx - centerTileX) * 256;
              const py = height / 2 + (ty - centerTileY) * 256;
              try {
                ctx.drawImage(topoImg, px, py, 256, 256);
              } catch (e) {}
              resolve();
            };
            topoImg.onerror = () => resolve();
            topoImg.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${ty}/${normTX}`;
          };
          setTimeout(resolve, 3200); // Timeout por si la red es lenta
          img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${normTX}`;
        }));
      }
    }

    // Esperar carga de tiles de mapa
    await Promise.race([
      Promise.all(tilePromises),
      new Promise(r => setTimeout(r, 3400))
    ]);

    // Función de proyección lat/lng a píxeles
    const project = (lat, lng) => {
      const x = width / 2 + (lon2tile(lng, zoom) - centerTileX) * 256;
      const y = height / 2 + (lat2tile(lat, zoom) - centerTileY) * 256;
      return { x, y };
    };

    const trafficColors = {
      heavy: '#E63946',    // Rojo: <12 km/h
      moderate: '#f59e0b', // Amarillo: 12-35 km/h
      fluent: '#3D8B6D'    // Verde: >35 km/h
    };

    // Trazar estela de tráfico
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = project(points[i].lat, points[i].lng);
        const p2 = project(points[i + 1].lat, points[i + 1].lng);
        const color = trafficColors[points[i + 1].trafficLevel] || '#B04A6A';

        // Sombra / resplandor
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5.5;
        ctx.stroke();
      }
    } else if (points.length === 1) {
      const p = project(points[0].lat, points[0].lng);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#7B1E3A';
      ctx.fill();
    }

    // Marcador de Inicio (Verde con halo)
    const startPt = project(points[0].lat, points[0].lng);
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#3D8B6D';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Marcador de Fin (Rojo Vino con halo)
    const endPt = project(points[points.length - 1].lat, points[points.length - 1].lng);
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#7B1E3A';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Banner Superior con Branding y Direcciones
    ctx.fillStyle = 'rgba(44, 37, 77, 0.95)';
    ctx.fillRect(14, 12, width - 28, 56);
    ctx.strokeStyle = 'rgba(123, 30, 58, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, 12, width - 28, 56);

    ctx.fillStyle = '#F8F6F7';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('QRIDE • REPORTE PERICIAL DE RUTA Y TRÁFICO', 26, 31);

    ctx.fillStyle = '#B8B2C8';
    ctx.font = '11px sans-serif';
    const startTxt = startAddr ? `Inicio: ${startAddr.slice(0, 48)}` : 'Inicio registrado';
    const endTxt = endAddr ? `Fin: ${endAddr.slice(0, 48)}` : 'Destino final registrado';
    ctx.fillText(`${startTxt}   ➜   ${endTxt}`, 26, 47);

    ctx.font = '10px monospace';
    const durationMin = Math.round((routeStats?.durationSeconds || 0) / 60);
    const dist = (routeStats?.totalDistanceKm || 0).toFixed(2);
    const avg = (routeStats?.avgSpeedKmH || 0).toFixed(1);
    ctx.fillText(`Distancia: ${dist} km  |  Duración: ${durationMin} min  |  Vel. Promedio: ${avg} km/h`, 26, 61);

    // Leyenda de Tráfico Inferior
    const legendY = height - 18;
    ctx.fillStyle = 'rgba(44, 37, 77, 0.92)';
    ctx.fillRect(14, legendY - 14, width - 28, 26);

    ctx.beginPath();
    ctx.arc(36, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3D8B6D';
    ctx.fill();
    ctx.fillStyle = '#F8F6F7';
    ctx.font = '10px sans-serif';
    ctx.fillText('Fluido (>35 km/h)', 48, legendY + 3.5);

    ctx.beginPath();
    ctx.arc(200, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.fillText('Moderado (12-35 km/h)', 212, legendY + 3.5);

    ctx.beginPath();
    ctx.arc(390, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#E63946';
    ctx.fill();
    ctx.fillText('Pesado / Detenido (<12 km/h)', 402, legendY + 3.5);

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.error('Error generando canvas de ruta:', err);
    return null;
  }
}

/**
 * Genera un análisis pericial del viaje con QRide IA
 */
export async function analyzeRouteWithGeminiAI(routeData, mapCaptureBase64 = null, onProgress) {
  const apiKey = getGeminiApiKey();

  const {
    totalDistanceKm,
    durationSeconds,
    avgSpeedKmH,
    maxSpeedKmH,
    pointsCount,
    trafficStats,
    startCoords,
    endCoords
  } = routeData;

  const durationMin = Math.round(durationSeconds / 60);

  if (!apiKey) {
    if (onProgress) onProgress('QRide IA generando análisis de telemetría local...');
    return generateLocalRouteReport(routeData);
  }

  if (onProgress) onProgress('QRide IA evaluando telemetría del trayecto...');

  const prompt = `Actúa como QRide IA, un sistema de peritaje especializado en análisis de rutas GPS, tráfico urbano y seguridad vial.
Analiza la siguiente información de telemetría de un viaje en motocicleta/vehículo y la captura de la ruta:

DATOS DE TELEMETRÍA DEL VIAJE:
- Distancia Total: ${totalDistanceKm.toFixed(2)} km
- Tiempo de Viaje: ${durationMin} minutos (${durationSeconds} segundos)
- Velocidad Promedio: ${avgSpeedKmH.toFixed(1)} km/h
- Velocidad Máxima Registrada: ${maxSpeedKmH.toFixed(1)} km/h
- Puntos GPS Registrados: ${pointsCount}
- Distribución de Tráfico:
  * Tráfico Pesado / Detenciones (<12 km/h): ${trafficStats.heavyPercent}% del tiempo
  * Tráfico Moderado (12-35 km/h): ${trafficStats.moderatePercent}% del tiempo
  * Tráfico Fluido (>35 km/h): ${trafficStats.fluentPercent}% del tiempo
- Punto Inicial: Lat ${startCoords?.lat || 'N/A'}, Lng ${startCoords?.lng || 'N/A'}
- Punto Final: Lat ${endCoords?.lat || 'N/A'}, Lng ${endCoords?.lng || 'N/A'}

Debes responder ÚNICAMENTE con un objeto JSON válido, sin delimitadores markdown ni \`\`\`json:
{
  "tripScore": number (0-100, donde 100 es ruta óptima, fluida y segura),
  "verdictLabel": "string breve (ej: Ruta con Congestión Moderada)",
  "executiveSummary": "string resumen de 2 o 3 oraciones evaluando la calidad y ritmo del trayecto",
  "trafficAnalysis": "string diagnóstico pericial detallando los cuellos de botella detectados según los porcentajes de detención",
  "efficiencyScore": number (0-100),
  "estimatedFuelLiters": number (ej: 0.65),
  "congestionHotspots": [
    {
      "title": "Zona de congestión o parada",
      "detail": "descripción de tiempo y velocidad en este tramo"
    }
  ],
  "drivingObservations": [
    "observación positiva o de precaución sobre la velocidad y regularidad"
  ],
  "recommendations": [
    "consejo para optimizar tiempos o evitar horas pico en tramos similares"
  ]
}`;

  const modelEndpoints = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let lastError = null;

  for (const modelName of modelEndpoints) {
    try {
      if (onProgress) onProgress('QRide IA procesando cuellos de botella y flujo de tráfico...');

      const parts = [{ text: prompt }];

      if (mapCaptureBase64) {
        const cleanBase64 = mapCaptureBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: cleanBase64
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawParts = data?.candidates?.[0]?.content?.parts || [];
      const rawText = rawParts.map(p => p.text || '').filter(Boolean).join('\n');

      if (!rawText) throw new Error('Respuesta vacía');

      let sanitized = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
      if (jsonMatch) sanitized = jsonMatch[0];

      const parsed = JSON.parse(sanitized);

      return {
        ...parsed,
        aiEngineName: 'QRide IA',
        modelUsed: modelName,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`Error con motor ${modelName}:`, err);
      lastError = err;
    }
  }

  // Fallback si falla la red
  console.warn('Fallback a cálculo de telemetría interno QRide:', lastError);
  return generateLocalRouteReport(routeData);
}

/**
 * Reporte generado mediante análisis algorítmico cuando no hay conexión a API
 */
function generateLocalRouteReport(routeData) {
  const { totalDistanceKm, durationSeconds, avgSpeedKmH, maxSpeedKmH, trafficStats } = routeData;
  const durationMin = Math.max(1, Math.round(durationSeconds / 60));

  let tripScore = 85;
  if (trafficStats.heavyPercent > 40) tripScore -= 25;
  else if (trafficStats.heavyPercent > 20) tripScore -= 10;
  if (maxSpeedKmH > 90) tripScore -= 10;
  tripScore = Math.max(40, Math.min(98, tripScore));

  const estimatedFuel = Number((totalDistanceKm * 0.045).toFixed(2));

  let verdict = 'Ruta Fluida y Despejada';
  if (trafficStats.heavyPercent > 45) {
    verdict = 'Ruta con Congestión Severa';
  } else if (trafficStats.heavyPercent > 20) {
    verdict = 'Ruta Urbana con Tráfico Moderado';
  }

  return {
    tripScore,
    verdictLabel: verdict,
    executiveSummary: `Trayecto completado de ${totalDistanceKm.toFixed(1)} km en ${durationMin} minutos con una velocidad media de ${avgSpeedKmH.toFixed(1)} km/h. Se registró un ritmo ${trafficStats.heavyPercent > 30 ? 'con interrupciones frecuentes por semáforos o tráfico' : 'constante y fluido'}.`,
    trafficAnalysis: `El ${trafficStats.heavyPercent}% del recorrido se transitó en zona de tráfico denso o detención (<12 km/h). El ${trafficStats.fluentPercent}% se desarrolló en flujo libre (>35 km/h).`,
    efficiencyScore: Math.round(Math.max(50, 100 - trafficStats.heavyPercent * 0.8)),
    estimatedFuelLiters: estimatedFuel,
    congestionHotspots: [
      {
        title: trafficStats.heavyPercent > 25 ? 'Tramos con Detenciones Frecuentes' : 'Intersecciones Urbanas',
        detail: `Se acumularon aproximadamente ${Math.round((trafficStats.heavyPercent / 100) * durationMin)} minutos en tráfico lento o semáforos.`
      }
    ],
    drivingObservations: [
      `Velocidad máxima alcanzada de ${maxSpeedKmH.toFixed(0)} km/h dentro de parámetros seguros.`,
      `Consistencia en aceleración: ${avgSpeedKmH > 25 ? 'Buena fluidez en tramos libres' : 'Ritmo urbano con frenadas reiteradas'}.`
    ],
    recommendations: [
      'Mantener distancias preventivas de frenado en zonas de tráfico moderado.',
      'En horas pico, explorar vías secundarias o salidas alternas para evitar embotellamientos.'
    ],
    aiEngineName: 'QRide IA',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Busca ubicaciones y direcciones usando OpenStreetMap Nominatim con soporte de proximidad
 */
export async function searchPlaces(query, userCoords = null) {
  if (!query || query.trim().length < 2) return [];
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=6&addressdetails=1`;
    
    if (userCoords && userCoords.lat && userCoords.lng) {
      const delta = 0.5;
      url += `&viewbox=${userCoords.lng - delta},${userCoords.lat + delta},${userCoords.lng + delta},${userCoords.lat - delta}`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => ({
      id: item.place_id,
      name: item.display_name.split(',')[0],
      fullName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (err) {
    console.warn('Error en búsqueda de lugares:', err);
    return [];
  }
}

/**
 * Calcula la ruta óptima de navegación entre dos coordenadas usando OSRM
 */
export async function calculatePlannedRoute(startCoords, destCoords) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Servicio OSRM no disponible');
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const latlngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      return {
        latlngs,
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.round(route.duration / 60))
      };
    }
  } catch (err) {
    console.warn('Fallo OSRM, usando trazado directo:', err);
  }

  const directDist = calculateDistanceKm(startCoords.lat, startCoords.lng, destCoords.lat, destCoords.lng);
  return {
    latlngs: [[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]],
    distanceKm: Number(directDist.toFixed(2)),
    durationMinutes: Math.max(1, Math.round(directDist * 2.2))
  };
}

/**
 * Genera y descarga un reporte formal pericial en PDF usando jsPDF con mapa real y direcciones escritas
 */
export function generateTripPdf(report) {
  if (!report) return;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Encabezado Superior (Secondary QRide #2C254D)
    pdf.setFillColor(44, 37, 77);
    pdf.rect(0, 0, pageWidth, 28, 'F');

    // Acento Primary QRide (#7B1E3A)
    pdf.setFillColor(123, 30, 58);
    pdf.rect(0, 28, pageWidth, 2.5, 'F');

    // Título institucional
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('QRIDE • REPORTE PERICIAL DE TELEMETRÍA Y RUTA', 15, 13);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(184, 178, 200);
    const dateText = report.formattedDate 
      ? `${report.formattedDate} ${report.formattedTime || ''}` 
      : new Date(report.createdAt || report.generatedAt || Date.now()).toLocaleString('es-MX');
    pdf.text(`Fecha de emisión: ${dateText} | Motor: ${report.aiEngineName || 'QRide IA'}`, 15, 21);

    // Caja de Direcciones Escritas (Inicio y Fin)
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(15, 34, pageWidth - 30, 16, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(61, 139, 109);
    pdf.text('PUNTO DE INICIO:', 19, 40);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(44, 37, 77);
    const sAddr = report.startAddress || 'Ubicación de partida registrada';
    pdf.text(pdf.splitTextToSize(sAddr, 80)[0], 47, 40);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(230, 57, 70);
    pdf.text('PUNTO DE LLEGADA:', 19, 46);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(44, 37, 77);
    const eAddr = report.endAddress || 'Destino final registrado';
    pdf.text(pdf.splitTextToSize(eAddr, 80)[0], 51, 46);

    // Tarjeta de Score & Veredicto
    pdf.setFillColor(245, 241, 242);
    pdf.roundedRect(15, 53, pageWidth - 30, 20, 2, 2, 'F');

    pdf.setTextColor(123, 30, 58);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(`${report.tripScore || 85}/100`, 22, 66);

    pdf.setTextColor(44, 37, 77);
    pdf.setFontSize(11);
    pdf.text(report.verdictLabel || 'Ruta Evaluada con Éxito', 60, 61);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Eficiencia vial estimada: ${report.efficiencyScore || 90}% | Consumo aprox: ${report.estimatedFuelLiters || 0.45} L`, 60, 67);

    // Cuadrícula de Métricas
    const stats = report.routeData || {};
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(15, 76, pageWidth - 30, 18, 2, 2, 'FD');

    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('DISTANCIA TOTAL', 22, 82);
    pdf.text('TIEMPO EN RUTA', 66, 82);
    pdf.text('VELOCIDAD MEDIA', 110, 82);
    pdf.text('VELOCIDAD MÁXIMA', 154, 82);

    pdf.setFontSize(10.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 37, 77);
    pdf.text(`${stats.totalDistanceKm || 0} km`, 22, 90);
    
    const min = Math.round((stats.durationSeconds || 0) / 60);
    pdf.text(`${min} min (${stats.durationSeconds || 0}s)`, 66, 90);
    pdf.text(`${stats.avgSpeedKmH || 0} km/h`, 110, 90);
    pdf.text(`${stats.maxSpeedKmH || 0} km/h`, 154, 90);

    // Incrustar imagen de la captura satelital
    let currentY = 98;
    if (report.snapshotImage) {
      pdf.setFontSize(8.5);
      pdf.setTextColor(44, 37, 77);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MAPA SATELITAL DEL TRAYECTO Y FLUJO DE TRÁFICO:', 15, currentY);
      currentY += 3.5;
      pdf.addImage(report.snapshotImage, 'JPEG', 15, currentY, pageWidth - 30, 85);
      currentY += 89;
    }

    // Dictamen Ejecutivo IA
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(123, 30, 58);
    pdf.text('DICTAMEN EJECUTIVO (QRIDE IA):', 15, currentY);
    currentY += 4.5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    const splitSummary = pdf.splitTextToSize(report.executiveSummary || 'Recorrido evaluado bajo estándares QRide.', pageWidth - 30);
    pdf.text(splitSummary, 15, currentY);
    currentY += (splitSummary.length * 4.2) + 4;

    // Análisis de Tráfico
    if (report.trafficAnalysis && currentY < 265) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(44, 37, 77);
      pdf.text('ANÁLISIS DE CONGESTIÓN Y CUELLOS DE BOTELLA:', 15, currentY);
      currentY += 4.5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const splitTraffic = pdf.splitTextToSize(report.trafficAnalysis, pageWidth - 30);
      pdf.text(splitTraffic, 15, currentY);
      currentY += (splitTraffic.length * 3.8) + 3;
    }

    // Pie de página institucional
    pdf.setFillColor(245, 241, 242);
    pdf.rect(0, 287, pageWidth, 10, 'F');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Documento pericial generado por QRide Cloud Telemetry System.', 15, 293);
    pdf.text(`ID: ${report.id || 'N/A'}`, pageWidth - 45, 293);

    const safeDate = (report.formattedDate || 'viaje').replace(/[^a-zA-Z0-9]/g, '-');
    pdf.save(`QRide-Reporte-Ruta-${safeDate}.pdf`);
  } catch (err) {
    console.error('Error generando PDF de reporte:', err);
    alert('No se pudo generar el archivo PDF: ' + err.message);
  }
}
