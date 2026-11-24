// Servicio Oficial de Inteligencia Artificial para Inspección de Cascos de Motocicleta
// Exclusivo con Google Gemini Vision AI Multimodal (Procesamiento Pericial Fotográfico)

/**
 * Obtiene la API Key de Gemini desde localStorage o variables de entorno Vite
 */
export function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    const local = window.localStorage.getItem('qride_gemini_api_key');
    if (local && local.trim().length > 0) return local.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Guarda o elimina la API Key de Gemini en el almacenamiento local
 */
export function setGeminiApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key && key.trim().length > 0) {
      window.localStorage.setItem('qride_gemini_api_key', key.trim());
    } else {
      window.localStorage.removeItem('qride_gemini_api_key');
    }
  }
}

/**
 * Analiza la fotografía del casco utilizando Google Gemini Vision AI
 * @param {string} imageBase64DataUrl Imagen en formato data:image/...;base64,...
 * @param {Function} onProgress Callback para reportar el progreso del análisis
 * @param {string} overrideApiKey Clave de API opcional
 */
export async function inspectHelmetWithGeminiAI(imageBase64DataUrl, onProgress, overrideApiKey = '') {
  const apiKey = overrideApiKey || getGeminiApiKey();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  if (onProgress) onProgress('Preparando imagen para visión artificial...');

  // Extraer base64 puro y mime type
  const match = imageBase64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/jpeg';
  const cleanBase64 = match ? match[2] : imageBase64DataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

  if (onProgress) onProgress('Conectando con Google Gemini Vision AI...');

  const prompt = `Actúa como un perito especializado en seguridad vial e inspección técnica de cascos de motociclista según la Norma Oficial Mexicana NOM-206-SCFI/SSA2-2018 y los Reglamentos de Tránsito de México (como el de la CDMX y carreteras federales).

Analiza de manera exhaustiva y profesional la fotografía adjunta.
Debes responder ÚNICAMENTE con un objeto JSON válido, sin delimitadores de código markdown (sin \`\`\`json, sin \`\`\`), con la siguiente estructura exacta:

{
  "isHelmet": true,
  "helmetType": "full_face" | "modular" | "open_face" | "bacinica" | "none",
  "helmetTypeLabel": "Integral (Full Face)" | "Modular / Abatible" | "Abierto (Jet 3/4)" | "Bacinica / Quitamultas (No Apto)" | "Objeto no identificado como casco",
  "certificationType": "dot" | "ece2206" | "nom206" | "none",
  "certificationLabel": "DOT FMVSS 218" | "ECE 22.06 / 22.05" | "NOM-206-SCFI" | "Sin sello legible / No homologado",
  "certificationNotes": "Detalle sobre sellos o inscripciones visibles en la calota trasera o inferior",
  "hasFissures": false,
  "fissuresDetail": "Análisis de integridad estructural de la calota (fracturas, fisuras, abolladuras, raspones profundos)",
  "hasPreviousCrash": false,
  "visorCondition": "clear" | "scratched" | "broken_or_none",
  "visorDetail": "Estado del visor óptico (transparente, rayado, roto, tintado o ausente)",
  "strapCondition": "good" | "worn" | "broken",
  "strapDetail": "Estado del sistema de retención y broches",
  "confidence": 0.95,
  "score": 88,
  "status": "approved" | "warning" | "rejected",
  "verdictLabel": "APROBADO PARA CIRCULAR EN MÉXICO" | "APTO CON OBSERVACIONES" | "RECHAZADO / RIESGO CRÍTICO",
  "legalSummary": "Explicación legal concisa basada en la NOM-206 y el Reglamento de Tránsito de México (mención de corralón o multa si aplica)",
  "aiAnalysisDetail": "Dictamen pericial detallado emitido por la IA describiendo los componentes visuales encontrados, diseño, material percibido y recomendaciones",
  "passes": ["Lista de aspectos positivos que cumplen con la normativa"],
  "issues": [
    {
      "title": "Nombre de la observación o riesgo",
      "detail": "Explicación de por qué representa un riesgo o infracción"
    }
  ],
  "recommendations": ["Recomendación técnica 1", "Recomendación técnica 2"]
}

Reglas estrictas de evaluación mexicana:
1. Si es tipo "bacinica", "quepis" o casco de ciclista: "status": "rejected", "score" < 50, se alerta sobre remisión inmediata al depósito vehicular (corralón) y multa de 20 a 30 UMA.
2. Si presenta fisuras o grietas en la calota: "status": "rejected", la absorción de impacto está rota.
3. Si no cuenta con sello DOT, ECE o NOM: advertir sobre riesgo de sanción según el reglamento local.
4. Si la imagen NO contiene un casco de moto: "isHelmet": false, "status": "rejected", "verdictLabel": "NO SE DETECTÓ UN CASCO DE MOTO".`;

  // Modelos oficiales activos de Google Gemini Vision en v1beta (Google AI Studio)
  const modelEndpoints = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ];

  // Si el navegador reporta estar desconectado, abortar inmediatamente con mensaje claro
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sin conexión a internet (dispositivo desconectado de la red). Conéctate a Wi-Fi o datos móviles para consultar Gemini AI.');
  }

  // Validación de advertencia del formato de API Key de Google
  if (apiKey && !apiKey.startsWith('AIza')) {
    console.warn('Advertencia: La clave API configurada no inicia con "AIzaSy...". Asegúrate de que provenga de Google AI Studio (https://aistudio.google.com/app/apikey).');
  }

  let lastError = null;

  for (const modelName of modelEndpoints) {
    try {
      if (onProgress) onProgress(`Analizando calota, visor y sellos con ${modelName}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.map(p => p.text || '').filter(Boolean).join('\n');

      if (!rawText) {
        throw new Error('Respuesta vacía recibida de Gemini Vision');
      }

      // Limpiar posibles etiquetas markdown y aislar objeto JSON
      let sanitized = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sanitized = jsonMatch[0];
      }

      const parsed = JSON.parse(sanitized);

      if (onProgress) onProgress('Generando reporte pericial oficial...');

      return {
        ...parsed,
        aiEngineName: 'Google Gemini Vision AI',
        modelUsed: modelName,
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`Error intentando modelo ${modelName}:`, err);
      lastError = err;
      
      // Si el error es de desconexión de red (Failed to fetch / ERR_INTERNET_DISCONNECTED), no reintentar en bucle
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Sin conexión a internet (dispositivo fuera de línea). Conéctate a una red e intenta nuevamente.');
      }
      if (err instanceof TypeError && err.message?.includes('fetch')) {
        throw new Error('No se pudo establecer conexión con los servidores de Google Gemini (Failed to fetch). Verifica tu conexión a internet o que tu clave de API sea válida.');
      }
    }
  }

  throw lastError || new Error('No se pudo comunicar con Google Gemini Vision');
}

/**
 * Dictamen preliminar preventivo fuera de línea (en caso de no tener señal de internet en ruta)
 */
export function generateOfflineHelmetReport() {
  return {
    isHelmet: true,
    helmetType: 'Casco de Motociclista (Inspección Fuera de Línea)',
    certification: 'Verificación física obligatoria (DOT / ECE / NOM-206)',
    condition: 'Captura registrada (Modo sin conexión a internet)',
    score: 80,
    status: 'warning',
    verdictLabel: 'DICTAMEN PREVENTIVO FUERA DE LÍNEA',
    legalSummary: 'Evaluación preliminar generada en el dispositivo sin conexión a servidores de IA. Para certificación pericial completa con detección de microfisuras, vuelve a escanear con conexión a internet.',
    aiAnalysisDetail: 'Se registró correctamente la fotografía del casco bajo el protocolo de la NOM-206-SCFI/SSA2-2018. Verifica visualmente que cuente con etiqueta de certificación visible en la nuca y que el barboquejo o broche no tenga holgura mayor a dos dedos.',
    passes: [
      'Fotografía pericial capturada y archivada en bitácora local',
      'Estructura básica y visor encuadrados para peritaje',
      'Protocolo de inspección preventiva NOM-206 activo'
    ],
    issues: [
      {
        title: 'Verificación pericial en la nube pendiente',
        detail: 'El dispositivo no tenía conexión a internet o la API key de Gemini no respondió. Re-escanea cuando tengas cobertura.'
      }
    ],
    recommendations: [
      'Asegúrate de que la correa esté bien ajustada al mentón antes de iniciar la marcha.',
      'En cuanto tengas conexión de red, presiona "Re-escanear Imagen" para obtener el peritaje completo por Gemini Vision.'
    ],
    aiEngineName: 'QRide Protocolo Offline NOM-206',
    modelUsed: 'Heurística Local Preventiva',
    analyzedAt: new Date().toISOString()
  };
}
