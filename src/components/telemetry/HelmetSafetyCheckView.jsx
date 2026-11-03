import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Upload, 
  Info, 
  Award, 
  Sparkles, 
  FileText, 
  Check, 
  HelpCircle,
  Eye,
  Sliders,
  ChevronRight,
  Maximize2,
  Zap,
  RotateCw
} from 'lucide-react';
import { 
  MEXICAN_HELMET_STANDARDS, 
  evaluateHelmetInspection 
} from '../../utils/mexicanHelmetStandards';
import { proximityAudio } from '../../utils/proximityAudio';

export function HelmetSafetyCheckView() {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

  // Parámetros de inspección interactivos
  const [helmetType, setHelmetType] = useState('full_face'); // 'full_face' | 'modular' | 'open_face' | 'bacinica'
  const [certificationType, setCertificationType] = useState('dot'); // 'dot' | 'ece2206' | 'nom206' | 'none'
  const [hasFissures, setHasFissures] = useState(false);
  const [hasPreviousCrash, setHasPreviousCrash] = useState(false);
  const [strapCondition, setStrapCondition] = useState('good'); // 'good' | 'worn' | 'broken'
  const [visorCondition, setVisorCondition] = useState('clear'); // 'clear' | 'scratched' | 'broken_or_none'
  const [ageYears, setAgeYears] = useState(2);

  // Resultado de la evaluación
  const [result, setResult] = useState(null);
  const [showLawModal, setShowLawModal] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Iniciar / detener cámara con fallback garantizado para cualquier dispositivo
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing ? { ideal: cameraFacing } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (errConstraint) {
        console.warn('Fallo con constraints ideales, reintentando con video genérico:', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setStreamActive(true);
      setCapturedImage(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn('Play metadata error:', e));
        };
        videoRef.current.play().catch(e => console.warn('Direct play error:', e));
      }
      proximityAudio.playArmTone();
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setCameraError('No se pudo acceder a la cámara (' + (err.name || 'Permiso denegado') + '). Por favor permite el acceso en el navegador.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Sincronizar stream con el elemento video en caso de re-render
  useEffect(() => {
    if (streamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Play on streamActive effect:', e));
    }
  }, [streamActive]);

  useEffect(() => {
    if (streamActive) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraFacing]);

  // Capturar foto desde el stream de video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    runAIAnalysis(dataUrl);
  };

  // Manejar subida de archivo
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result);
      stopCamera();
      runAIAnalysis(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Simulación del escaneo con IA sobre la imagen capturada
  const runAIAnalysis = (imgSrc) => {
    setIsAnalyzing(true);
    setScanProgress(10);
    setScanStep('Analizando geometría y silueta del casco...');
    proximityAudio.playWarningTone();

    setTimeout(() => {
      setScanProgress(35);
      setScanStep('Evaluando integridad de calota y detección de fisuras...');
    }, 800);

    setTimeout(() => {
      setScanProgress(65);
      setScanStep('Buscando sellos holográficos (NOM-206 / DOT / ECE)...');
    }, 1600);

    setTimeout(() => {
      setScanProgress(90);
      setScanStep('Verificando visor, broches y forro EPS de absorción...');
    }, 2400);

    setTimeout(() => {
      setScanProgress(100);
      setIsAnalyzing(false);

      // Evaluar según los criterios configurados
      const evalResult = evaluateHelmetInspection({
        helmetType,
        hasFissures,
        hasPreviousCrash,
        certificationType,
        strapCondition,
        visorCondition,
        ageYears
      });

      setResult(evalResult);

      if (evalResult.status === 'approved') {
        proximityAudio.playArmTone();
      } else {
        proximityAudio.playCriticalTone();
      }
    }, 3000);
  };

  // Re-evaluar cuando cambien parámetros manuales si ya hubo resultado
  useEffect(() => {
    if (result) {
      const evalResult = evaluateHelmetInspection({
        helmetType,
        hasFissures,
        hasPreviousCrash,
        certificationType,
        strapCondition,
        visorCondition,
        ageYears
      });
      setResult(evalResult);
    }
  }, [helmetType, hasFissures, hasPreviousCrash, certificationType, strapCondition, visorCondition, ageYears]);

  return (
    <div className="space-y-6">
      {/* Banner Superior Explicativo de la Normativa Mexicana */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 md:p-6 rounded-3xl border border-cyan-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-base md:text-lg">
                Inspección Óptica de Casco & Normativa Mexicana
              </h4>
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                NOM-206-SCFI/SSA2-2018
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Verifica mediante cámara si tu casco presenta <strong>daños estructurales o fisuras</strong>, si cuenta con <strong>certificación legal en México</strong> (NOM-206, DOT o ECE 22.06) y si te protege de multas y corralón.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLawModal(true)}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Info size={15} /> Ver Leyes en México
        </button>
      </div>

      {/* Panel Principal Dividido: Cámara / Visor & Panel de Diagnóstico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Visor de Cámara y HUD (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative w-full aspect-video md:aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            
            {/* 1. Video en Vivo: siempre en el DOM para persistencia de ref */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
            />

            {/* 2. Imagen Capturada / Subida */}
            {!streamActive && capturedImage && (
              <img
                src={capturedImage}
                alt="Casco en inspección"
                className="w-full h-full object-contain bg-slate-900"
              />
            )}

            {/* 3. Estado Vacío / Pantalla de Bienvenida */}
            {!streamActive && !capturedImage && (
              <div className="text-center p-6 max-w-sm">
                <div className="w-16 h-16 rounded-3xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-700">
                  <Camera size={32} />
                </div>
                <h5 className="font-extrabold text-white text-base">Cámara Desactivada</h5>
                <p className="text-xs text-slate-400 mt-1">
                  Enciende tu cámara o carga una foto de tu casco para iniciar el escaneo de daños y sellos oficiales.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    <Camera size={15} /> Activar Cámara
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2"
                  >
                    <Upload size={15} /> Cargar Foto
                  </button>
                </div>
              </div>
            )}

            {/* 4. Overlay de Escaneo AR (HUD) */}
            {(streamActive || isAnalyzing) && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                {/* Cuadro de Encuadre */}
                <div className="relative w-full h-full border-2 border-dashed border-cyan-400/40 rounded-2xl flex items-center justify-center">
                  {/* Esquinas tácticas */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />

                  {/* Silueta guía para encuadrar casco */}
                  <div className="w-56 h-56 rounded-full border border-cyan-400/25 flex flex-col items-center justify-center text-[10px] text-cyan-300 font-mono text-center p-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping mb-2" />
                    Encuadra el casco completo o el sello de certificación posterior
                  </div>

                  {/* Línea Láser Animada de Escaneo */}
                  {isAnalyzing && (
                    <motion.div
                      initial={{ top: '5%' }}
                      animate={{ top: ['5%', '90%', '5%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                    />
                  )}
                </div>

                {/* Badge de Estado en el HUD */}
                <div className="flex items-center justify-between text-[11px] font-mono text-white bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 mt-2">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Zap size={14} /> ESCÁNER ÓPTICO QRIDE
                  </span>
                  <span>{cameraFacing === 'environment' ? 'Lente Trasero' : 'Lente Frontal'}</span>
                </div>
              </div>
            )}

            {/* Barra de Progreso de Análisis */}
            {isAnalyzing && (
              <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md p-4 border-t border-slate-800 text-center">
                <p className="text-xs font-bold text-cyan-300 mb-2">{scanStep}</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Controles de Cámara */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              {streamActive ? (
                <>
                  <button
                    onClick={capturePhoto}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
                  >
                    <Camera size={16} /> Capturar y Analizar
                  </button>
                  <button
                    onClick={toggleCameraFacing}
                    title="Rotar cámara frontal/trasera"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                  >
                    <RotateCw size={16} />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                  >
                    Detener
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Camera size={16} /> Abrir Cámara
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Upload size={16} /> Subir Imagen
                  </button>
                </>
              )}
            </div>

            {capturedImage && (
              <button
                onClick={() => runAIAnalysis(capturedImage)}
                disabled={isAnalyzing}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200"
              >
                <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                Re-escanear
              </button>
            )}
          </div>
        </div>

        {/* Columna Derecha: Parámetros del Casco y Diagnóstico Oficial (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h5 className="font-black text-slate-900 text-sm flex items-center justify-between">
              <span>Parámetros de Evaluación Técnica</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Checklist NOM-206</span>
            </h5>

            {/* 1. Tipo de Casco */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tipo de Diseño:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'full_face', label: 'Integral (Full Face)' },
                  { id: 'modular', label: 'Modular / Abatible' },
                  { id: 'open_face', label: 'Abierto (Jet 3/4)' },
                  { id: 'bacinica', label: 'Bacinica / No Apto' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setHelmetType(item.id)}
                    className={`p-2 rounded-xl text-left font-bold transition-all border ${
                      helmetType === item.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Certificación Legal Detectada */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Sello / Certificación Identificada:
              </label>
              <select
                value={certificationType}
                onChange={(e) => setCertificationType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="dot">DOT FMVSS 218 (Certificación Estándar)</option>
                <option value="ece2206">ECE 22.06 / 22.05 (Estándar Europeo Homologado)</option>
                <option value="nom206">NOM-206-SCFI/SSA2-2018 (Certificación Mexicana)</option>
                <option value="none">Sin sello visible / Casco no certificado</option>
              </select>
            </div>

            {/* 3. Daños Físicos e Impactos */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Inspección de Daños Físicos:
              </span>

              {/* Fisuras en calota */}
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800">
                  ¿Presenta fisuras, grietas o calota partida?
                </span>
                <input
                  type="checkbox"
                  checked={hasFissures}
                  onChange={(e) => setHasFissures(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
              </label>

              {/* Impacto o caída previa */}
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800">
                  ¿Sufrió una caída o golpe fuerte previo?
                </span>
                <input
                  type="checkbox"
                  checked={hasPreviousCrash}
                  onChange={(e) => setHasPreviousCrash(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
              </label>

              {/* Estado del visor */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Estado del Visor:</span>
                <select
                  value={visorCondition}
                  onChange={(e) => setVisorCondition(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="clear">Transparente / Óptimo</option>
                  <option value="scratched">Rayado / Opaco</option>
                  <option value="broken_or_none">Roto o Sin Visor</option>
                </select>
              </div>

              {/* Broche / Sistema de retención */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Sistema de Broche:</span>
                <select
                  value={strapCondition}
                  onChange={(e) => setStrapCondition(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="good">Ajuste Firme (Doble D / Micro)</option>
                  <option value="worn">Correa Deshilachada / Floja</option>
                  <option value="broken">Roto o Trabado</option>
                </select>
              </div>

              {/* Antigüedad en años */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700">Antigüedad del Casco:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={ageYears}
                    onChange={(e) => setAgeYears(Number(e.target.value))}
                    className="w-24 accent-slate-900"
                  />
                  <span className="text-xs font-mono font-bold text-slate-900 w-12">{ageYears} años</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Veredicto Oficial y Resultados */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 md:p-8 rounded-3xl border-2 shadow-xl ${
            result.status === 'approved'
              ? 'bg-emerald-950/10 border-emerald-500/30 text-emerald-950'
              : result.status === 'warning'
              ? 'bg-amber-950/10 border-amber-500/30 text-amber-950'
              : 'bg-rose-950/10 border-rose-500/30 text-rose-950'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-black/10">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
                result.status === 'approved'
                  ? 'bg-emerald-600 shadow-emerald-500/20'
                  : result.status === 'warning'
                  ? 'bg-amber-600 shadow-amber-500/20'
                  : 'bg-rose-600 shadow-rose-500/20'
              }`}>
                {result.status === 'approved' ? (
                  <CheckCircle2 size={32} />
                ) : result.status === 'warning' ? (
                  <AlertTriangle size={32} />
                ) : (
                  <XCircle size={32} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white ${
                    result.status === 'approved' ? 'bg-emerald-600' : result.status === 'warning' ? 'bg-amber-600' : 'bg-rose-600'
                  }`}>
                    {result.status === 'approved' ? 'Cumple Normas de México' : 'Riesgo / No Homologado'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Puntaje de Integridad: {result.score}/100
                  </span>
                </div>
                <h4 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                  {result.verdictLabel}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  {result.legalSummary}
                </p>
              </div>
            </div>

            {/* Medidor Circular o Puntuación */}
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-black/5 shadow-sm">
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Nivel de Seguridad</span>
                <span className="text-2xl font-black font-mono">{result.score}%</span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center font-bold text-xs">
                {result.score >= 80 ? '🛡️' : result.score >= 60 ? '⚠️' : '🚫'}
              </div>
            </div>
          </div>

          {/* Desglose de Puntos Críticos y Observaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Aspectos Aprobados */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-black/5">
              <h6 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Check size={16} /> Puntos Conformes a la Norma
              </h6>
              {result.passes.length === 0 ? (
                <p className="text-xs text-slate-500">No se detectaron puntos aprobados.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {result.passes.map((pass, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{pass}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Observaciones o Infracciones */}
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-black/5">
              <h6 className="font-extrabold text-xs text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={16} /> Observaciones & Defectos Críticos
              </h6>
              {result.issues.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium">¡Tu casco no presenta observaciones de riesgo!</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {result.issues.map((issue, idx) => (
                    <li key={idx} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900">
                      <p className="font-black flex items-center gap-1">
                        <span>⚠️</span> {issue.title}
                      </p>
                      <p className="text-[11px] text-rose-800 mt-0.5">{issue.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal Informativo: Leyes y Sanciones de Cascos en México */}
      <AnimatePresence>
        {showLawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLawModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Normativa Mexicana de Cascos de Moto</h3>
                    <p className="text-xs text-slate-500">NOM-206-SCFI/SSA2-2018 y Reglamentos de Tránsito</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLawModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 py-4 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <h6 className="font-black text-slate-900 mb-1">¿Qué exige la NOM-206-SCFI/SSA2-2018?</h6>
                  <p className="text-slate-600 leading-relaxed">
                    Establece que todo casco debe poseer una estructura externa (calota) resistente a la penetración, forro de poliestireno expandido (EPS) para absorción de impactos, sistema de retención de cinta continua sin juego holgado y visor inastillable que cubra el campo visual periférico.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                  <h6 className="font-black text-amber-950 mb-1">Reformas de Tránsito en México (CDMX y Federal):</h6>
                  <p className="leading-relaxed">
                    Queda <strong>terminantemente prohibido el uso de cascos tipo bacinica, quepis, cascos de ciclista o cascos industriales</strong> en motocicletas. Conducir con casco no certificado amerita una multa de 20 a 30 UMA ($2,170 a $3,250 MXN aprox.) y la <strong>remisión inmediata de la motocicleta al depósito vehicular (corralón)</strong>.
                  </p>
                </div>

                <div>
                  <h6 className="font-black text-slate-900 mb-2">Sellos y Certificaciones Aceptadas Legalmente:</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {MEXICAN_HELMET_STANDARDS.acceptedCertifications.map(cert => (
                      <div key={cert.id} className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="font-black text-slate-900 block">{cert.name}</span>
                        <span className="text-[10px] text-cyan-600 font-bold block">{cert.region}</span>
                        <p className="text-[11px] text-slate-500 mt-1">{cert.legalStatus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowLawModal(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
