import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Volume2, 
  VolumeX, 
  Camera, 
  AlertTriangle, 
  ShieldAlert, 
  Radio, 
  Users, 
  Car, 
  RotateCw, 
  Play, 
  Pause, 
  Sparkles, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react';
import { loadCocoSsdModel, estimateProximity, MONITORED_CLASSES } from '../../utils/cocoSsdLoader';
import { proximityAudio } from '../../utils/proximityAudio';

export function ProximityAlertView() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [cameraError, setCameraError] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState('Listo para iniciar');
  const [modelReady, setModelReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Detecciones activas en el fotograma actual
  const [detections, setDetections] = useState([]);
  const [closestObject, setClosestObject] = useState(null);
  const [fps, setFps] = useState(0);

  // Modo Simulación de Prueba (para experimentar el sonido y radar sin salir a la calle)
  const [simulationMode, setSimulationMode] = useState(false);
  const [simDistance, setSimDistance] = useState(2.2); // metros
  const [simTargetType, setSimTargetType] = useState('car'); // 'car' | 'person'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastFrameTime = useRef(performance.now());
  const isDetectingRef = useRef(false);
  const isCameraActiveRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);

  // Mantener ref de sonido sincronizado para el bucle de animación
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    proximityAudio.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Cargar modelo de detección de objetos
  const ensureModelLoaded = async () => {
    if (modelRef.current) return modelRef.current;
    setIsModelLoading(true);
    try {
      const model = await loadCocoSsdModel((msg) => setModelStatus(msg));
      modelRef.current = model;
      setModelReady(true);
      setIsModelLoading(false);
      return model;
    } catch (err) {
      console.error('Error al inicializar modelo:', err);
      setModelStatus('No se pudo cargar modelo neural. El video continuará activo.');
      setIsModelLoading(false);
      throw err;
    }
  };

  // Iniciar la cámara con fallback universal
  const startCamera = async () => {
    setCameraError(null);
    try {
      setModelStatus('Conectando cámara de video...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
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
        console.warn('Fallback a video genérico:', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      isCameraActiveRef.current = true;
      setIsCameraActive(true);
      setSimulationMode(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn('Play metadata error:', e));
        };
        videoRef.current.play().catch(e => console.warn('Direct play error:', e));
      }
      proximityAudio.playArmTone();

      // Cargar modelo de forma no bloqueante y arrancar bucle
      ensureModelLoaded()
        .then(() => {
          startDetectionLoop();
        })
        .catch(() => {
          // Aún sin modelo, arrancamos el loop para que al menos dibuje o se reactive si carga después
          startDetectionLoop();
        });
    } catch (err) {
      console.error('Error al encender cámara:', err);
      setCameraError('No se pudo acceder a la cámara (' + (err.name || 'Permiso denegado') + '). Por favor otorga permisos en tu navegador.');
      setModelStatus('Cámara bloqueada o sin permisos.');
      isCameraActiveRef.current = false;
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    isCameraActiveRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetections([]);
    setClosestObject(null);
    isDetectingRef.current = false;
  };

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Sincronizar stream con videoRef si se vuelve a montar
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Play on isCameraActive effect:', e));
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraFacing]);

  // Bucle de detección en tiempo real a alta velocidad
  const startDetectionLoop = useCallback(() => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    const detectFrame = async () => {
      if (!isCameraActiveRef.current || !videoRef.current) {
        isDetectingRef.current = false;
        return;
      }

      const video = videoRef.current;
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        const now = performance.now();
        const delta = now - lastFrameTime.current;
        if (delta > 0) {
          setFps(Math.round(1000 / delta));
        }
        lastFrameTime.current = now;

        if (modelRef.current) {
          try {
            // Inferencia sobre el fotograma
            const predictions = await modelRef.current.detect(video);
            
            // Filtrar personas y vehículos
            const filtered = predictions.filter(pred => 
              MONITORED_CLASSES.includes(pred.class) && pred.score >= 0.45
            );

            const frameWidth = video.videoWidth || 640;
            const frameHeight = video.videoHeight || 480;

            // Procesar proximidad de cada objeto
            let nearest = null;
            const processed = filtered.map(item => {
              const prox = estimateProximity(item.bbox, frameWidth, frameHeight, item.class);
              const enriched = {
                ...item,
                proximity: prox
              };

              if (!nearest || prox.distanceMeters < nearest.proximity.distanceMeters) {
                nearest = enriched;
              }
              return enriched;
            });

            setDetections(processed);
            setClosestObject(nearest);

            // Disparar alertas sonoras según la distancia del más cercano
            if (nearest && soundEnabledRef.current) {
              if (nearest.proximity.zone === 'critical') {
                // Menor a 1.8 metros: sonido continuo y estridente
                proximityAudio.playCriticalTone();
              } else if (nearest.proximity.zone === 'warning') {
                // Entre 1.8 y 3.6 metros: sonido de aviso intermitente
                proximityAudio.playWarningTone();
              }
            }

            // Dibujar en el canvas overlay
            drawBoundingBoxes(processed, frameWidth, frameHeight);
          } catch (err) {
            console.error('Error en inferencia de frame:', err);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(detectFrame);
    };

    animationFrameId.current = requestAnimationFrame(detectFrame);
  }, []);

  // Dibujo táctico sobre el Canvas overlay
  const drawBoundingBoxes = (items, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    items.forEach(item => {
      const [x, y, w, h] = item.bbox;
      const { distanceMeters, zone } = item.proximity;

      let color = '#06b6d4'; // cian (safe)
      let labelBg = 'rgba(6, 182, 212, 0.85)';
      if (zone === 'critical') {
        color = '#ef4444'; // rojo crítico
        labelBg = 'rgba(239, 68, 68, 0.9)';
      } else if (zone === 'warning') {
        color = '#f59e0b'; // ámbar advertencia
        labelBg = 'rgba(245, 158, 11, 0.9)';
      }

      // Caja principal
      ctx.lineWidth = zone === 'critical' ? 4 : 2.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, w, h);

      // Esquinas resaltadas estilo radar
      const cornerLen = Math.min(20, w / 4, h / 4);
      ctx.lineWidth = zone === 'critical' ? 5 : 4;
      ctx.beginPath();
      // Esquina sup-izq
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      // Esquina sup-der
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      // Esquina inf-izq
      ctx.moveTo(x, y + h - cornerLen);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLen, y + h);
      // Esquina inf-der
      ctx.moveTo(x + w - cornerLen, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      // Etiqueta con clase y distancia
      const labelText = `${item.class.toUpperCase()} • ${distanceMeters}m`;
      ctx.font = 'bold 13px monospace';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = labelBg;
      ctx.fillRect(x, Math.max(0, y - 24), textWidth + 14, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x + 7, Math.max(16, y - 7));
    });
  };

  // Efecto para el modo de prueba interactivo (Simulación)
  useEffect(() => {
    if (!simulationMode) return;

    let zone = 'safe';
    if (simDistance <= 1.8) zone = 'critical';
    else if (simDistance <= 3.6) zone = 'warning';

    const simulatedObj = {
      class: simTargetType,
      proximity: {
        distanceMeters: simDistance,
        zone
      }
    };

    setClosestObject(simulatedObj);
    setDetections([simulatedObj]);

    if (soundEnabled) {
      if (zone === 'critical') {
        proximityAudio.playCriticalTone();
      } else if (zone === 'warning') {
        proximityAudio.playWarningTone();
      }
    }
  }, [simulationMode, simDistance, simTargetType, soundEnabled]);

  // Manejo de sonido de prueba manual
  const triggerManualTestBeep = (type) => {
    if (type === 'critical') {
      proximityAudio.playCriticalTone();
    } else {
      proximityAudio.playWarningTone();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior ADAS de Proximidad */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 md:p-6 rounded-3xl border border-rose-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
            <Radio size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-base md:text-lg">
                Radar ADAS de Proximidad & Alerta de Colisión
              </h4>
              <span className="text-[10px] uppercase tracking-wider bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
                IA Detección Visual & Audio
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Escanea personas, automóviles, camiones y motos en tu campo visual. Si un vehículo o peatón entra a tu zona de riesgo (&lt; 2.0m), dispara <strong>alertas acústicas inmediatas tipo sonar</strong> para evitar choques y atropellos.
            </p>
          </div>
        </div>

        {/* Interruptores de Audio y Modo Simulación */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              soundEnabled
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} className="text-rose-400" /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Sonido Activo' : 'Silenciado'}</span>
          </button>

          <button
            onClick={() => {
              if (isCameraActive) stopCamera();
              setSimulationMode(!simulationMode);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              simulationMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sliders size={15} />
            <span>{simulationMode ? 'Modo Simulación ON' : 'Probar Simulación'}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Visor de Video / Radar y Panel de Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Visor de la Cámara con Overlay AR y Radar (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative w-full aspect-video md:aspect-[16/10] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            
            {/* 1. Elemento de Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Alerta de Error de Cámara */}
            {cameraError && (
              <div className="absolute top-4 left-4 right-4 bg-rose-600/90 backdrop-blur-md text-white p-3 rounded-2xl text-xs font-bold text-center z-30 shadow-xl border border-white/20">
                {cameraError}
              </div>
            )}

            {/* 2. Canvas de Detección en Tiempo Real */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* 3. Modo Cámara Apagada / Estado Inactivo */}
            {!isCameraActive && !simulationMode && (
              <div className="text-center p-6 max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-700">
                  <Eye size={32} />
                </div>
                <h5 className="font-extrabold text-white text-base">Radar Óptico Desconectado</h5>
                <p className="text-xs text-slate-400 mt-1">
                  Enciende la cámara para escanear personas y vehículos en tiempo real o activa la simulación para probar el sonar acústico.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={startCamera}
                    disabled={isModelLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-2"
                  >
                    <Camera size={16} /> Activar Cámara en Vivo
                  </button>
                  <button
                    onClick={() => setSimulationMode(true)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2"
                  >
                    <Sliders size={15} /> Probar con Slider
                  </button>
                </div>
                {isModelLoading && (
                  <p className="text-[11px] text-cyan-400 font-mono mt-3 animate-pulse">
                    {modelStatus}
                  </p>
                )}
              </div>
            )}

            {/* 4. Pantalla de Simulación Interactiva */}
            {!isCameraActive && simulationMode && (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                {/* Visualizador de Onda de Radar */}
                <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                  <div className={`absolute inset-0 rounded-full border-2 border-dashed animate-spin ${
                    simDistance <= 1.8 ? 'border-rose-500/80' : simDistance <= 3.6 ? 'border-amber-500/60' : 'border-cyan-500/40'
                  }`} style={{ animationDuration: '8s' }} />

                  <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all ${
                    simDistance <= 1.8 
                      ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_#ef4444]' 
                      : simDistance <= 3.6 
                      ? 'bg-amber-500/20 border-2 border-amber-500 shadow-[0_0_20px_#f59e0b]' 
                      : 'bg-cyan-500/20 border-2 border-cyan-500 shadow-[0_0_20px_#06b6d4]'
                  }`}>
                    {simTargetType === 'car' ? (
                      <Car size={48} className={simDistance <= 1.8 ? 'text-rose-400' : simDistance <= 3.6 ? 'text-amber-400' : 'text-cyan-400'} />
                    ) : (
                      <Users size={48} className={simDistance <= 1.8 ? 'text-rose-400' : simDistance <= 3.6 ? 'text-amber-400' : 'text-cyan-400'} />
                    )}
                  </div>

                  {simDistance <= 1.8 && (
                    <span className="absolute w-44 h-44 rounded-full bg-rose-500/30 animate-ping" />
                  )}
                </div>

                <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Distancia Simulada</span>
                  <span className="text-3xl font-black font-mono text-white">
                    {simDistance.toFixed(1)} <span className="text-xs text-slate-400">METROS</span>
                  </span>
                  <p className={`text-xs font-black mt-0.5 ${
                    simDistance <= 1.8 ? 'text-rose-400 animate-pulse' : simDistance <= 3.6 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {simDistance <= 1.8 ? '¡PELIGRO: ZONA CRÍTICA!' : simDistance <= 3.6 ? 'PRECAUCIÓN: APROXIMACIÓN' : 'DISTANCIA SEGURA'}
                  </p>
                </div>
              </div>
            )}

            {/* 5. Alerta HUD Flotante de Colisión Crítica */}
            {closestObject && closestObject.proximity.zone === 'critical' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 left-4 right-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-white/40 flex items-center justify-between z-30"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} className="animate-bounce shrink-0" />
                  <div>
                    <h5 className="font-black text-sm uppercase tracking-wide">
                      ¡ALERTA DE PROXIMIDAD INMINENTE!
                    </h5>
                    <p className="text-[11px] text-red-100 font-medium">
                      {closestObject.class.toUpperCase()} a solo {closestObject.proximity.distanceMeters}m de tu moto.
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono bg-black/30 px-3 py-1 rounded-xl">
                  {closestObject.proximity.distanceMeters}m
                </span>
              </motion.div>
            )}

            {/* 6. Barra Inferior HUD de Estado */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-[11px] font-mono text-white bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Radio size={13} className="animate-pulse" /> ADAS ACTIVO
                </span>
                <span className="text-slate-400">
                  Objetos en cuadro: <strong className="text-white">{detections.length}</strong>
                </span>
                {isCameraActive && (
                  <span className="text-slate-500 hidden sm:inline">
                    {fps} FPS
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 hidden sm:inline">Sonido:</span>
                <span className={`font-bold ${soundEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {soundEnabled ? 'ON' : 'MUTE'}
                </span>
              </div>
            </div>
          </div>

          {/* Controles de Cámara y Pruebas Sonoras */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              {isCameraActive ? (
                <>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                  >
                    Detener Cámara
                  </button>
                  <button
                    onClick={toggleCameraFacing}
                    title="Rotar cámara"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                  >
                    <RotateCw size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={isModelLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2"
                >
                  <Camera size={16} /> Abrir Cámara en Vivo
                </button>
              )}

              {/* Botón para probar pitido acústico */}
              <button
                onClick={() => triggerManualTestBeep('warning')}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 flex items-center gap-1.5"
              >
                <Volume2 size={14} /> Probar Beep Advertencia
              </button>
              <button
                onClick={() => triggerManualTestBeep('critical')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5"
              >
                <Volume2 size={14} /> Probar Alarma Crítica
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel de Diagnóstico, Radar y Controles de Simulación (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Objeto Más Cercano */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h5 className="font-black text-slate-900 text-sm flex items-center justify-between">
              <span>Sensor de Proximidad Frontal</span>
              <span className={`w-2.5 h-2.5 rounded-full ${closestObject ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
            </h5>

            {closestObject ? (
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                closestObject.proximity.zone === 'critical'
                  ? 'bg-rose-50 border-rose-500 text-rose-950'
                  : closestObject.proximity.zone === 'warning'
                  ? 'bg-amber-50 border-amber-500 text-amber-950'
                  : 'bg-cyan-50 border-cyan-500 text-cyan-950'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/10 px-2 py-0.5 rounded-md">
                    {closestObject.class}
                  </span>
                  <span className="text-xs font-black uppercase">
                    {closestObject.proximity.zone === 'critical' ? 'Zona Crítica' : closestObject.proximity.zone === 'warning' ? 'Precaución' : 'Seguro'}
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-4xl font-black font-mono">
                    {closestObject.proximity.distanceMeters}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">metros</span>
                </div>
                <p className="text-[11px] text-center font-bold mt-1">
                  {closestObject.proximity.zone === 'critical' 
                    ? '¡Alarma sonora continua activada!' 
                    : closestObject.proximity.zone === 'warning'
                    ? 'Beep intermitente de alerta'
                    : 'Sin peligro de colisión'}
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400">
                <Users size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">Sin vehículos ni personas en campo cercano</p>
                <p className="text-[10px] text-slate-400 mt-0.5">El radar mantiene vigilancia a 360°</p>
              </div>
            )}

            {/* Parámetros de Simulación Manual */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Simulador de Acercamiento:
              </span>

              {/* Selector de Tipo de Blanco */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setSimTargetType('car')}
                  className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    simTargetType === 'car'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Car size={14} /> Vehículo
                </button>
                <button
                  onClick={() => setSimTargetType('person')}
                  className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    simTargetType === 'person'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Users size={14} /> Peatón
                </button>
              </div>

              {/* Slider de Distancia */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Distancia del Objeto:</span>
                  <span className="font-mono font-black text-slate-900">{simDistance.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.1"
                  value={simDistance}
                  onChange={(e) => {
                    setSimulationMode(true);
                    setSimDistance(Number(e.target.value));
                  }}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span className="text-rose-600 font-bold">0.5m (Impacto)</span>
                  <span className="text-amber-500 font-bold">2.5m</span>
                  <span>6.0m (Lejos)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Información de la Tecnología ADAS */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h6 className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Zap size={14} className="text-rose-500" />
              ¿Cómo funciona el Radar QRide?
            </h6>
            <p className="text-[11px] leading-relaxed">
              Utiliza modelos neuronales <strong>COCO-SSD</strong> acelerados por WebGL para identificar peatones y automóviles en la vía. Estima la profundidad relativa y modula osciladores de audio mediante la <strong>Web Audio API</strong> nativa, creando una experiencia acústica adaptativa idéntica a los sensores de reversa de alta gama.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
