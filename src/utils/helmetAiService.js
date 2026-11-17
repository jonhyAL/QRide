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

  // Modelos activos de Google Gemini Vision en v1beta (gemini-3.5-flash, gemini-3.6-flash, etc.)
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
      // Probar con el siguiente modelo si hay un 404, 503 o timeout
    }
  }

  throw lastError || new Error('No se pudo comunicar con Google Gemini Vision');
}
