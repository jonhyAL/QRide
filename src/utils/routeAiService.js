// Servicio de Inteligencia Artificial para Análisis Pericial de Rutas y Tráfico GPS
// Integra Google Gemini AI Multimodal para evaluar el trayecto, velocidad y congestión

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
 * Genera una imagen sintética en Canvas de alta resolución del trayecto recorrido
 * adaptada a la paleta de colores oficial de QRide (Primary: #7B1E3A, Secondary: #2C254D, Accent: #B04A6A)
 */
export function generateRouteSnapshotCanvas(points, routeStats) {
  if (!points || points.length === 0) return null;

  try {
    const width = 800;
    const height = 500;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo estilo Cyber Dark con paleta QRide (#161427)
    ctx.fillStyle = '#161427';
    ctx.fillRect(0, 0, width, height);

    // Cuadrícula sutil de navegación en color Secondary (#2C254D)
    ctx.strokeStyle = 'rgba(44, 37, 77, 0.45)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calcular límites de latitud y longitud con margen
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    if (minLat === maxLat) { minLat -= 0.003; maxLat += 0.003; }
    if (minLng === maxLng) { minLng -= 0.003; maxLng += 0.003; }

    const padding = 70;
    const mapW = width - padding * 2;
    const mapH = height - padding * 2 - 50;

    const project = (lat, lng) => {
      const x = padding + ((lng - minLng) / (maxLng - minLng)) * mapW;
      const y = padding + 60 + ((maxLat - lat) / (maxLat - minLat)) * mapH;
      return { x, y };
    };

    const trafficColors = {
      heavy: '#E63946',    // Rojo: <12 km/h (o paradas)
      moderate: '#f59e0b', // Amarillo: 12-35 km/h
      fluent: '#3D8B6D'    // Verde: >35 km/h (success QRide)
    };

    // Dibujar trazo de ruta por segmentos de tráfico
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length >= 2) {
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = project(points[i].lat, points[i].lng);
        const p2 = project(points[i + 1].lat, points[i + 1].lng);
        const color = trafficColors[points[i + 1].trafficLevel] || '#B04A6A';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    } else if (points.length === 1) {
      const p = project(points[0].lat, points[0].lng);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#7B1E3A';
      ctx.fill();
    }

    // Marcador de Inicio (Verde Success)
    const startPt = project(points[0].lat, points[0].lng);
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#3D8B6D';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Marcador de Fin (Primary QRide)
    const endPt = project(points[points.length - 1].lat, points[points.length - 1].lng);
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#7B1E3A';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Banner Superior con Telemetría (Fondo Secondary #2C254D)
    ctx.fillStyle = 'rgba(44, 37, 77, 0.95)';
    ctx.fillRect(16, 12, width - 32, 54);
    ctx.strokeStyle = 'rgba(123, 30, 58, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 12, width - 32, 54);

    ctx.fillStyle = '#F8F6F7';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('QRIDE • REGISTRO DE RUTA GPS & TRÁFICO', 30, 34);

    ctx.fillStyle = '#B8B2C8';
    ctx.font = '12px monospace';
    const durationMin = Math.round((routeStats?.durationSeconds || 0) / 60);
    const dist = (routeStats?.totalDistanceKm || 0).toFixed(2);
    const avg = (routeStats?.avgSpeedKmH || 0).toFixed(1);
    const max = (routeStats?.maxSpeedKmH || 0).toFixed(1);
    ctx.fillText(`Distancia: ${dist} km  |  Tiempo: ${durationMin} min  |  Vel. Med: ${avg} km/h  |  Vel. Máx: ${max} km/h`, 30, 52);

    // Leyenda Inferior de Colores de Tráfico
    const legendY = height - 20;
    ctx.fillStyle = 'rgba(44, 37, 77, 0.9)';
    ctx.fillRect(16, legendY - 14, width - 32, 26);

    ctx.beginPath();
    ctx.arc(36, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3D8B6D';
    ctx.fill();
    ctx.fillStyle = '#F8F6F7';
    ctx.font = '11px sans-serif';
    ctx.fillText('Fluido (>35 km/h)', 48, legendY + 4);

    ctx.beginPath();
    ctx.arc(200, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.fillText('Moderado (12-35 km/h)', 212, legendY + 4);

    ctx.beginPath();
    ctx.arc(390, legendY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#E63946';
    ctx.fill();
    ctx.fillText('Pesado / Detenido (<12 km/h)', 402, legendY + 4);

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.error('Error generando canvas de ruta:', err);
    return null;
  }
}

/**
 * Genera un análisis pericial del viaje con Google Gemini AI
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

  // Si no hay API key de Gemini, generar un reporte pericial matemático inteligente
  if (!apiKey) {
    if (onProgress) onProgress('Generando análisis de telemetría sin conexión a API...');
    return generateLocalRouteReport(routeData);
  }

  if (onProgress) onProgress('Conectando con Google Gemini AI para análisis de trayecto...');

  const prompt = `Actúa como un perito especializado en análisis de rutas GPS, tráfico urbano y seguridad vial.
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
      if (onProgress) onProgress(`Evaluando flujo de tráfico y telemetría con ${modelName}...`);

      const parts = [{ text: prompt }];

      // Si hay imagen del mapa, adjuntarla como datos multimodales
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

      if (!rawText) throw new Error('Respuesta vacía de Gemini');

      let sanitized = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
      if (jsonMatch) sanitized = jsonMatch[0];

      const parsed = JSON.parse(sanitized);

      return {
        ...parsed,
        aiEngineName: 'Google Gemini Vision AI',
        modelUsed: modelName,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`Error con modelo ${modelName}:`, err);
      lastError = err;
    }
  }

  // Fallback si falla la red
  console.warn('Fallback a cálculo de telemetría interno:', lastError);
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

  const estimatedFuel = Number((totalDistanceKm * 0.045).toFixed(2)); // ~4.5L/100km promedio moto

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
    aiEngineName: 'Análisis Algorítmico de Telemetría QRide',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Busca ubicaciones y direcciones usando OpenStreetMap Nominatim (Gratuito con soporte de proximidad)
 */
export async function searchPlaces(query, userCoords = null) {
  if (!query || query.trim().length < 2) return [];
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=6&addressdetails=1`;
    
    // Si tenemos la ubicación del usuario, priorizar resultados cercanos
    if (userCoords && userCoords.lat && userCoords.lng) {
      const delta = 0.5; // ~50 km alrededor
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
 * Calcula la ruta óptima de navegación entre dos coordenadas usando OSRM (Gratuito)
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

  // Fallback: cálculo directo si falla el servicio público
  const directDist = calculateDistanceKm(startCoords.lat, startCoords.lng, destCoords.lat, destCoords.lng);
  return {
    latlngs: [[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]],
    distanceKm: Number(directDist.toFixed(2)),
    durationMinutes: Math.max(1, Math.round(directDist * 2.2))
  };
}

/**
 * Genera y descarga un reporte formal pericial en PDF usando jsPDF
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
    
    // Encabezado Superior (Fondo Secondary QRide #2C254D)
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
    pdf.text(`Fecha de emisión: ${dateText} | Motor: ${report.aiEngineName || 'Google Gemini AI'}`, 15, 21);

    // Tarjeta de Score & Veredicto
    pdf.setFillColor(245, 241, 242);
    pdf.roundedRect(15, 36, pageWidth - 30, 23, 3, 3, 'F');

    pdf.setTextColor(123, 30, 58);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(`${report.tripScore || 85}/100`, 22, 51);

    pdf.setTextColor(44, 37, 77);
    pdf.setFontSize(12);
    pdf.text(report.verdictLabel || 'Ruta Evaluada con Éxito', 62, 45);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Eficiencia vial estimada: ${report.efficiencyScore || 90}% | Consumo aprox: ${report.estimatedFuelLiters || 0.45} L`, 62, 52);

    // Cuadrícula de Métricas
    const stats = report.routeData || {};
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(15, 63, pageWidth - 30, 20, 2, 2, 'FD');

    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('DISTANCIA TOTAL', 22, 70);
    pdf.text('TIEMPO EN RUTA', 66, 70);
    pdf.text('VELOCIDAD MEDIA', 110, 70);
    pdf.text('VELOCIDAD MÁXIMA', 154, 70);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 37, 77);
    pdf.text(`${stats.totalDistanceKm || 0} km`, 22, 78);
    
    const min = Math.round((stats.durationSeconds || 0) / 60);
    pdf.text(`${min} min (${stats.durationSeconds || 0}s)`, 66, 78);
    pdf.text(`${stats.avgSpeedKmH || 0} km/h`, 110, 78);
    pdf.text(`${stats.maxSpeedKmH || 0} km/h`, 154, 78);

    // Incrustar imagen de la captura satelital
    let currentY = 87;
    if (report.snapshotImage) {
      pdf.setFontSize(9);
      pdf.setTextColor(44, 37, 77);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MAPA SATELITAL DEL TRAYECTO Y FLUJO DE TRÁFICO:', 15, currentY);
      currentY += 4;
      pdf.addImage(report.snapshotImage, 'JPEG', 15, currentY, pageWidth - 30, 85);
      currentY += 89;
    }

    // Dictamen Ejecutivo IA
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(123, 30, 58);
    pdf.text('DICTAMEN EJECUTIVO PERICIAL (IA GEMINI):', 15, currentY);
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
      pdf.setFontSize(9.5);
      pdf.setTextColor(44, 37, 77);
      pdf.text('ANÁLISIS DE TRÁFICO Y CUELLOS DE BOTELLA:', 15, currentY);
      currentY += 4.5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const splitTraffic = pdf.splitTextToSize(report.trafficAnalysis, pageWidth - 30);
      pdf.text(splitTraffic, 15, currentY);
      currentY += (splitTraffic.length * 3.8) + 3;
    }

    // Observaciones o Recomendaciones
    if (report.recommendations && report.recommendations.length > 0 && currentY < 275) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(123, 30, 58);
      pdf.text('RECOMENDACIONES DE CONDUCCIÓN:', 15, currentY);
      currentY += 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      report.recommendations.slice(0, 2).forEach((rec) => {
        pdf.text(`• ${rec}`, 18, currentY);
        currentY += 4;
      });
    }

    // Pie de página institucional
    pdf.setFillColor(245, 241, 242);
    pdf.rect(0, 287, pageWidth, 10, 'F');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Documento pericial generado por QRide Cloud Telemetry System.', 15, 293);
    pdf.text(`ID: ${report.id || 'N/A'}`, pageWidth - 45, 293);

    // Descarga del archivo
    const safeDate = (report.formattedDate || 'viaje').replace(/[^a-zA-Z0-9]/g, '-');
    pdf.save(`QRide-Reporte-Ruta-${safeDate}.pdf`);
  } catch (err) {
    console.error('Error generando PDF de reporte:', err);
    alert('No se pudo generar el archivo PDF: ' + err.message);
  }
}

