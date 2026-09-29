import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  Compass, 
  Radio, 
  Satellite, 
  ShieldCheck, 
  Gauge, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  X,
  Maximize2
} from 'lucide-react';

// Puntos simulados de una ruta urbana (coordenadas relativas en un lienzo SVG)
const SIMULATED_ROUTE = [
  { x: 120, y: 380, heading: 45, speed: 28, hdop: 0.9, sats: 11 },
  { x: 170, y: 330, heading: 45, speed: 38, hdop: 1.1, sats: 10 },
  { x: 240, y: 280, heading: 60, speed: 45, hdop: 0.8, sats: 12 },
  { x: 320, y: 250, heading: 85, speed: 42, hdop: 1.0, sats: 9 },
  { x: 410, y: 250, heading: 90, speed: 50, hdop: 1.2, sats: 10 },
  { x: 500, y: 270, heading: 110, speed: 35, hdop: 1.3, sats: 9 },
  { x: 560, y: 330, heading: 140, speed: 25, hdop: 1.4, sats: 8 },
  { x: 600, y: 400, heading: 170, speed: 18, hdop: 1.2, sats: 9 },
  { x: 620, y: 460, heading: 180, speed: 0, hdop: 1.1, sats: 9 }, // Detenida
];

export function LiveGpsTracker({ isOpen = true, onClose, isModal = false }) {
  // Estados disponibles: 'moving' | 'stopped' | 'sleep' | 'no_signal'
  const [vehicleState, setVehicleState] = useState('moving');
  const [simIndex, setSimIndex] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Posición actual suavizada (interpolada)
  const [currentPos, setCurrentPos] = useState({ x: 240, y: 280 });
  const [heading, setHeading] = useState(60);
  const [speed, setSpeed] = useState(45);
  const [hdop, setHdop] = useState(0.8);
  const [satellites, setSatellites] = useState(12);
  
  // Estela de puntos anteriores (últimos N minutos / actualizaciones)
  const [trail, setTrail] = useState([
    { x: 120, y: 380, id: 0 },
    { x: 170, y: 330, id: 1 },
    { x: 240, y: 280, id: 2 }
  ]);
  
  // Indicador de "última actualización hace X s"
  const [secondsAgo, setSecondsAgo] = useState(1);
  const timerRef = useRef(null);

  // Contador de segundos desde última actualización
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulación con Frecuencia Adaptativa:
  // 1 Hz (1000ms) si moving, cada 30-60s si stopped, y modo sleep si pasa tiempo
  useEffect(() => {
    if (!isPlaying) return;

    let delay = 1500; // ~1 Hz en movimiento
    if (vehicleState === 'stopped') delay = 5000; // Simulación acelerada de 30-60s
    if (vehicleState === 'sleep') delay = 10000;
    if (vehicleState === 'no_signal') return;

    timerRef.current = setTimeout(() => {
      const nextIdx = (simIndex + 1) % SIMULATED_ROUTE.length;
      const targetPoint = SIMULATED_ROUTE[nextIdx];

      // Filtro de calidad (HDOP < 2.5 y Satélites >= 4)
      const isValidQuality = targetPoint.hdop <= 2.5 && targetPoint.sats >= 4;
      if (!isValidQuality) {
        console.warn('Punto GPS descartado por filtro de calidad (HDOP > 2.5 o sats < 4)');
        return;
      }

      // Suavizado / Filtro (promedio ponderado tipo Kalman simplificado)
      setCurrentPos(prev => ({
        x: prev.x * 0.25 + targetPoint.x * 0.75,
        y: prev.y * 0.25 + targetPoint.y * 0.75
      }));
      setHeading(targetPoint.heading);
      setSpeed(targetPoint.speed);
      setHdop(targetPoint.hdop);
      setSatellites(targetPoint.sats);
      setSecondsAgo(0);

      // Actualizar estela (últimos 8 puntos)
      setTrail(prev => [...prev.slice(-7), { x: targetPoint.x, y: targetPoint.y, id: Date.now() }]);
      setSimIndex(nextIdx);

      // Detección de estados según telemetría
      if (targetPoint.speed === 0) {
        setVehicleState('stopped');
      } else {
        setVehicleState('moving');
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [simIndex, isPlaying, vehicleState]);

  // Manejo de cambio forzado de estado para pruebas
  const handleStateChange = (newState) => {
    setVehicleState(newState);
    if (newState === 'moving') {
      setSpeed(42);
      setHdop(0.9);
      setSatellites(11);
    } else if (newState === 'stopped') {
      setSpeed(0);
      setHdop(1.0);
    } else if (newState === 'sleep') {
      setSpeed(0);
      setHdop(1.4);
    } else if (newState === 'no_signal') {
      setHdop(3.8);
      setSatellites(2);
    }
  };

  const getStateBadge = () => {
    switch (vehicleState) {
      case 'moving':
        return {
          label: 'En Movimiento',
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          dot: 'bg-emerald-500 animate-pulse',
          rate: '1 Hz (Adaptativo)'
        };
      case 'stopped':
        return {
          label: 'Detenida',
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          dot: 'bg-amber-500',
          rate: '1 pt / 30-60s'
        };
      case 'sleep':
        return {
          label: 'Modo Ahorro / Sleep',
          bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
          dot: 'bg-indigo-500',
          rate: 'Reposo Ultra-Low'
        };
      case 'no_signal':
        return {
          label: 'Sin Señal GPS',
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          dot: 'bg-rose-500 animate-ping',
          rate: 'Desconectado'
        };
      default:
        return { label: 'Online', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', rate: 'N/A' };
    }
  };

  const badge = getStateBadge();

  const content = (
    <div className={`relative ${isModal ? 'p-6 md:p-8 bg-white rounded-[2rem] max-h-[90vh] overflow-y-auto w-full max-w-4xl shadow-2xl' : 'bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden'}`}>
      {/* Header del Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 shadow-sm">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-indigo-900 flex items-center gap-2">
                Telemetría GPS en Vivo
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Monitoreo satelital activo con filtro de Kalman adaptativo
              </p>
            </div>
          </div>
        </div>

        {/* Acciones & Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${badge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.label}
          </div>
          <div className="text-[11px] font-bold text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
            Hace {secondsAgo}s
          </div>
          {isModal && onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-2"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Selector de Modos / Estados (Para pruebas interactivas) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">Simular estado:</span>
        <button 
          onClick={() => handleStateChange('moving')}
          className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${vehicleState === 'moving' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          En Movimiento (1 Hz)
        </button>
        <button 
          onClick={() => handleStateChange('stopped')}
          className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${vehicleState === 'stopped' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Detenida (30-60s)
        </button>
        <button 
          onClick={() => handleStateChange('sleep')}
          className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${vehicleState === 'sleep' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Modo Sleep / Ahorro
        </button>
        <button 
          onClick={() => handleStateChange('no_signal')}
          className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 ${vehicleState === 'no_signal' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Sin Señal (HDOP alto)
        </button>
      </div>

      {/* Contenedor del Mapa / Radar Estético */}
      <div className="relative w-full h-[320px] md:h-[380px] bg-slate-950 rounded-[1.75rem] overflow-hidden border border-slate-800 shadow-inner">
        {/* Fondo estilizado de mapa */}
        <svg className="w-full h-full absolute inset-0 opacity-80" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
            </pattern>
            <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id="haloGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cuadrícula base */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Rutas y arterias urbanas */}
          <path d="M 50 300 C 200 300, 300 200, 750 200" stroke="#334155" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M 50 300 C 200 300, 300 200, 750 200" stroke="#0f172a" strokeWidth="12" fill="none" strokeLinecap="round" />
          
          <path d="M 100 420 L 700 420" stroke="#334155" strokeWidth="10" strokeDasharray="6 6" fill="none" opacity="0.4" />
          <path d="M 400 50 L 400 550" stroke="#334155" strokeWidth="12" fill="none" opacity="0.4" />
          <path d="M 220 100 L 220 520" stroke="#1e293b" strokeWidth="8" fill="none" />
          <path d="M 580 80 L 580 500" stroke="#1e293b" strokeWidth="8" fill="none" />

          {/* Área de cobertura */}
          <circle cx="360" cy="300" r="180" fill="#06b6d4" fillOpacity="0.03" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />

          {/* Estela de los últimos N puntos interpolados */}
          {trail.length > 1 && (
            <polyline 
              points={trail.map(p => `${p.x},${p.y}`).join(' ')} 
              fill="none" 
              stroke="url(#trailGradient)" 
              strokeWidth="4" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos anteriores de la estela */}
          {trail.map((p, idx) => (
            <circle 
              key={p.id || idx} 
              cx={p.x} 
              cy={p.y} 
              r={2.5 + (idx * 0.4)} 
              fill="#06b6d4" 
              opacity={0.2 + (idx / trail.length) * 0.7} 
            />
          ))}

          {/* Halo de pulsación alrededor del vehículo */}
          {vehicleState !== 'no_signal' && (
            <circle 
              cx={currentPos.x} 
              cy={currentPos.y} 
              r="35" 
              fill="url(#haloGradient)"
            />
          )}
        </svg>

        {/* Marcador del vehículo con rotación según heading y animación suave */}
        {vehicleState !== 'no_signal' ? (
          <motion.div 
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            animate={{ 
              left: `${(currentPos.x / 800) * 100}%`, 
              top: `${(currentPos.y / 600) * 100}%` 
            }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          >
            <div className="relative flex items-center justify-center">
              {vehicleState === 'moving' && (
                <span className="absolute w-12 h-12 rounded-full bg-cyan-400/30 animate-ping" />
              )}
              
              <motion.div 
                animate={{ rotate: heading }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 border-2 border-white/90"
              >
                <Navigation size={20} className="fill-white transform -rotate-45" />
              </motion.div>

              <div className="absolute top-12 whitespace-nowrap bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-bold text-white shadow-xl flex items-center gap-1.5">
                <span className="text-cyan-400">{speed} km/h</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{heading}°</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs z-30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-2 animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <p className="text-white font-extrabold text-sm">Señal GPS Perdida o Inestable</p>
            <p className="text-slate-400 text-xs mt-0.5">HDOP {hdop} &gt; 2.5 — Descartando puntos por filtro de calidad</p>
          </div>
        )}

        {/* HUD Superpuesto */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white flex items-center gap-2 shadow-lg">
            <Gauge size={14} className="text-cyan-400" />
            <span className="text-xs font-bold font-mono">{speed} <span className="text-[10px] text-slate-400">KM/H</span></span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white flex items-center gap-2 shadow-lg">
            <Compass size={14} className="text-indigo-400" />
            <span className="text-xs font-bold font-mono">{heading}° <span className="text-[10px] text-slate-400">HEADING</span></span>
          </div>
        </div>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white flex items-center gap-2 shadow-lg">
            <Satellite size={14} className={satellites >= 4 ? "text-emerald-400" : "text-rose-400"} />
            <span className="text-xs font-bold font-mono">{satellites} <span className="text-[10px] text-slate-400">SATS</span></span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white flex items-center gap-2 shadow-lg">
            <ShieldCheck size={14} className={hdop <= 2.5 ? "text-cyan-400" : "text-rose-400"} />
            <span className="text-xs font-bold font-mono">HDOP {hdop}</span>
          </div>
        </div>

        {/* Controles de reproducción */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pausar actualización" : "Reanudar"}
            className="p-2 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button 
            onClick={() => {
              setSimIndex(0);
              setCurrentPos({ x: 120, y: 380 });
              setHeading(45);
              setSpeed(28);
              setSecondsAgo(0);
            }}
            title="Reiniciar ruta"
            className="p-2 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Frecuencia Adaptativa Activa */}
        <div className="absolute bottom-4 left-4 z-20 text-[11px] font-mono text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
          ⚡ Tasa: <span className="text-cyan-300 font-bold">{badge.rate}</span>
        </div>
      </div>

      {/* Métricas y Filtros Técnicos Informativos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Frecuencia Adaptativa</p>
          <p className="text-xs font-black text-slate-800">{badge.rate}</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Filtro de Precisión</p>
          <p className="text-xs font-black text-emerald-600">Kalman / HDOP ≤ 2.5</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Ahorro de Batería</p>
          <p className="text-xs font-black text-indigo-600">{vehicleState === 'sleep' ? 'Modo Sleep Activado' : 'Consumo Optimizado'}</p>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Estela Reciente</p>
          <p className="text-xs font-black text-cyan-700">{trail.length} puntos interpolados</p>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-secondary/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-4xl"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      {content}
    </motion.div>
  );
}
