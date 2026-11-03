// Base de conocimiento y motor de evaluación de Normativa Mexicana de Cascos de Motocicleta
// NOM-206-SCFI/SSA2-2018, DOT FMVSS 218, ECE 22.05 / 22.06 y Reglamento de Tránsito de México (CDMX / Federal)

export const MEXICAN_HELMET_STANDARDS = {
  nom: {
    code: 'NOM-206-SCFI/SSA2-2018',
    title: 'Norma Oficial Mexicana para Cascos de Seguridad de Motociclistas',
    scope: 'Obligatoria en territorio mexicano para fabricación, importación y uso en vía pública.',
    keyPoints: [
      'Absorción de impacto en calota con EPS de densidad controlada.',
      'Sistema de retención con hebilla de alta resistencia (Doble D o micrométrica certificada).',
      'Protección periférica visual mínima de 105° a cada lado.',
      'Visor inastillable con resistencia a la penetración y transmitancia adecuada.',
      'Prohibición expresa de cascos decorativos, tipo quepis o bacinica sin amortiguación EPS.'
    ]
  },
  acceptedCertifications: [
    {
      id: 'nom206',
      name: 'NOM-206-SCFI/SSA2-2018',
      region: 'México',
      validity: 'Acreditación Oficial Mexicana',
      minScore: 85,
      legalStatus: '100% Legal para circular en México'
    },
    {
      id: 'ece2206',
      name: 'ECE 22.06 (o 22.05)',
      region: 'Europa / ONU',
      validity: 'Aceptada y exigida en México (Reglamento CDMX 2023+)',
      minScore: 90,
      legalStatus: 'Máximo estándar de seguridad homologado'
    },
    {
      id: 'dot',
      name: 'DOT FMVSS 218',
      region: 'Estados Unidos',
      validity: 'Homologada en la normativa de tránsito mexicana',
      minScore: 80,
      legalStatus: 'Legal con sello legible en calota trasera'
    },
    {
      id: 'snell',
      name: 'SNELL M2020 / M2025',
      region: 'Internacional / Competición',
      validity: 'Alta exigencia aceptada',
      minScore: 95,
      legalStatus: 'Excede los requisitos mínimos obligatorios'
    }
  ],
  helmetTypes: [
    {
      id: 'full_face',
      name: 'Integral (Full Face)',
      safetyLevel: 'Máxima Protección (100%)',
      mexicoCompliance: 'Cumple al 100% con NOM-206',
      recommended: true,
      description: 'Cubre cráneo, sienes, nuca y maxilofacial completa. El más seguro y recomendado.'
    },
    {
      id: 'modular',
      name: 'Modular / Abatible',
      safetyLevel: 'Alta Protección (85-90%)',
      mexicoCompliance: 'Permitido (Debe circularse con mentonera cerrada)',
      recommended: true,
      description: 'Mentonera articulada. Debe contar con doble homologación P/J para rodar abierto.'
    },
    {
      id: 'open_face',
      name: 'Abierto / 3/4 (Jet)',
      safetyLevel: 'Media (50-60%)',
      mexicoCompliance: 'Permitido con protección ocular obligatoria',
      recommended: false,
      description: 'Deja la mandíbula expuesta en caso de colisión frontal. Requiere visor o antiparras.'
    },
    {
      id: 'bacinica',
      name: 'Corto / Tipo "Bacinica" / Quitamultas',
      safetyLevel: 'Riesgo Crítico (0%)',
      mexicoCompliance: 'PROHIBIDO en México (Infracción de corralón y 20-30 UMA)',
      recommended: false,
      description: 'No posee forro EPS ni absorbe impactos. Prohibido por Reglamento de Tránsito.'
    }
  ],
  inspectionChecklist: [
    {
      id: 'shell_integrity',
      label: 'Calota Exterior sin Fisuras ni Deformaciones',
      weight: 30,
      dangerText: 'Una calota agrietada o abollada por caída previa no disipará la energía de un impacto.'
    },
    {
      id: 'certification_label',
      label: 'Sello / Etiqueta Legible (NOM-206 / DOT / ECE)',
      weight: 25,
      dangerText: 'Obligatorio para evitar remisión al corralón y multas de tránsito en México.'
    },
    {
      id: 'retention_strap',
      label: 'Correas y Broche de Retención (Doble Anilla o Micrométrico)',
      weight: 20,
      dangerText: 'Si el broche se zafa o la correa está desgastada, el casco saldrá proyectado antes de tocar el suelo.'
    },
    {
      id: 'visor_condition',
      label: 'Visor Transparente y Libre de Rayaduras Severas',
      weight: 15,
      dangerText: 'Los rayones causan deslumbramiento con las luces nocturnas y dificultan la visibilidad.'
    },
    {
      id: 'inner_eps_foam',
      label: 'Forro EPS y Almohadillas sin Compresión Excesiva',
      weight: 10,
      dangerText: 'El poliestireno interior se compacta con el uso o impactos; si está rígido o quebrado, no amortigua.'
    }
  ]
};

// Evaluador inteligente del estado del casco
export function evaluateHelmetInspection({
  helmetType = 'full_face',
  hasFissures = false,
  hasPreviousCrash = false,
  certificationType = 'dot', // 'dot' | 'ece2206' | 'nom206' | 'none'
  strapCondition = 'good', // 'good' | 'worn' | 'broken'
  visorCondition = 'clear', // 'clear' | 'scratched' | 'broken_or_none'
  ageYears = 2
}) {
  let score = 100;
  const issues = [];
  const passes = [];

  // 1. Tipo de casco
  if (helmetType === 'bacinica') {
    score -= 60;
    issues.push({
      severity: 'fatal',
      title: 'Casco Prohibido por Normativa Mexicana',
      detail: 'Los cascos tipo "bacinica" o quitamultas no cumplen con la NOM-206-SCFI/SSA2-2018. Amerita remisión al depósito vehicular (corralón).'
    });
  } else if (helmetType === 'open_face') {
    score -= 10;
    passes.push('Tipo 3/4 permitido pero con menor protección de mentón.');
  } else {
    passes.push('Tipo Integral / Modular avalado por la normativa mexicana.');
  }

  // 2. Fisuras o impactos previos
  if (hasFissures) {
    score -= 40;
    issues.push({
      severity: 'critical',
      title: 'Fisuras Estructurales en Calota',
      detail: 'La carcasa presenta fracturas que comprometen la dispersión de energía. Reemplazo inmediato obligatorio.'
    });
  }

  if (hasPreviousCrash) {
    score -= 35;
    issues.push({
      severity: 'critical',
      title: 'Impacto Previo Registrado',
      detail: 'El poliestireno EPS absorbe energía una sola vez comprimiéndose permanentemente. Aunque no se vea roto por fuera, ya no protege.'
    });
  }

  // 3. Certificación
  if (certificationType === 'none') {
    score -= 30;
    issues.push({
      severity: 'high',
      title: 'Sin Certificación Reconocida',
      detail: 'No se detecta sello DOT, ECE 22.05/22.06 o NOM-206. No cumple con el Reglamento de Tránsito de México.'
    });
  } else {
    passes.push(`Certificación detectada: ${certificationType.toUpperCase()} (Conforme a la normativa).`);
  }

  // 4. Broche y retención
  if (strapCondition === 'broken') {
    score -= 30;
    issues.push({
      severity: 'fatal',
      title: 'Fallo Crítico en Sistema de Retención',
      detail: 'El broche o correa está roto o inoperante. En un choque el casco se desprenderá de tu cabeza.'
    });
  } else if (strapCondition === 'worn') {
    score -= 10;
    issues.push({
      severity: 'medium',
      title: 'Correa Deshilachada o Broche Holgado',
      detail: 'Ajuste deficiente detectado. Requiere mantenimiento o cambio de herraje.'
    });
  } else {
    passes.push('Sistema de retención firme y funcional.');
  }

  // 5. Visor
  if (visorCondition === 'broken_or_none') {
    score -= 15;
    issues.push({
      severity: 'medium',
      title: 'Sin Protección Ocular Obligatoria',
      detail: 'La NOM-206 exige protección de ojos contra piedras, viento e insectos.'
    });
  } else if (visorCondition === 'scratched') {
    score -= 8;
    issues.push({
      severity: 'low',
      title: 'Visor Rayado',
      detail: 'Dificulta la visibilidad nocturna ante faros vehiculares.'
    });
  } else {
    passes.push('Visor ópticamente claro y resistente.');
  }

  // 6. Caducidad
  if (ageYears >= 5) {
    score -= 15;
    issues.push({
      severity: 'medium',
      title: 'Casco con Más de 5 Años de Antigüedad',
      detail: 'Los fabricantes y la NOM recomiendan renovar el casco cada 3 a 5 años por degradación solar (UV) y del pegamento EPS.'
    });
  }

  score = Math.max(0, Math.min(100, score));

  let status = 'approved'; // 'approved' | 'warning' | 'rejected'
  let verdictLabel = 'APROBADO PARA CIRCULAR EN MÉXICO';
  let badgeColor = 'emerald';

  if (score < 60 || helmetType === 'bacinica' || hasFissures || hasPreviousCrash || strapCondition === 'broken') {
    status = 'rejected';
    verdictLabel = 'NO APTO / RIESGO VITAL EN CASO DE ACCIDENTE';
    badgeColor = 'rose';
  } else if (score < 80) {
    status = 'warning';
    verdictLabel = 'APTO CONDICIONADO / REQUIERE ATENCIÓN';
    badgeColor = 'amber';
  }

  return {
    score,
    status,
    verdictLabel,
    badgeColor,
    issues,
    passes,
    legalSummary: status === 'approved' 
      ? 'Cumple con los requisitos vigentes de la NOM-206-SCFI/SSA2-2018 y Reglamento de Tránsito.' 
      : 'Incumple con las especificaciones de seguridad vial mexicanas. Sujeto a infracción y corralón.'
  };
}
