import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertOctagon, 
  Activity, 
  RotateCw, 
  PhoneCall, 
  MessageSquare, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Volume2, 
  X, 
  HelpCircle,
  AlertTriangle,
  Play
} from 'lucide-react';

export function CrashDetectionView() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [crashState, setCrashState] = useState('idle'); // 'idle' | 'countdown' | 'dispatched' | 'cancelled'
  const [activeStep, setActiveStep] = useState(1);

  // Sensores simulados en tiempo real
  const [telemetry, setTelemetry] = useState({
    gForce: 1.02,
    rollAngle: 4.5,
    speed: 48,
    isStationary: false
  });

  // Temporizador de cuenta regresiva de emergencia (30 segundos)
  useEffect(() => {
    let timer;
    if (crashState === 'countdown' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (crashState === 'countdown' && countdown === 0) {
      setCrashState('dispatched');
    }
    return () => clearInterval(timer);
  }, [crashState, countdown]);

  const triggerSimulatedCrash = () => {
    setIsSimulating(true);
    // Cascada de Sensor Fusion:
    // Paso 1: Impacto > 3-4 g
    setTelemetry({ gForce: 4.6, rollAngle: 12, speed: 45, isStationary: false });
    setActiveStep(1);

    setTimeout(() => {
      // Paso 2: Orientación > 60°
      setTelemetry({ gForce: 1.8, rollAngle: 72, speed: 10, isStationary: false });
      setActiveStep(2);
    }, 1200);

    setTimeout(() => {
      // Paso 3: Inmovilidad post-impacto (~0 km/h)
      setTelemetry({ gForce: 1.0, rollAngle: 78, speed: 0, isStationary: true });
      setActiveStep(3);
      setCrashState('countdown');
      setCountdown(30);
      setIsSimulating(false);
    }, 2500);
  };

  const handleCancelCountdown = () => {
    setCrashState('cancelled');
    setTelemetry({ gForce: 1.0, rollAngle: 3, speed: 0, isStationary: true });
  };

  const resetAll = () => {
    setCrashState('idle');
    setCountdown(30);
    setActiveStep(1);
    setTelemetry({ gForce: 1.02, rollAngle: 4.5, speed: 48, isStationary: false });
  };

  return (
    <div className="space-y-6">
      {/* Banner de Sensor Fusion y Prevención de Falsos Positivos */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-rose-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertOctagon size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Sensor Fusion Anti-Falsos Positivos (IMU + GPS)
              <span className="text-[10px] uppercase tracking-wider bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">Protocolo SOS</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Descarta baches o caídas estacionadas evaluando en cascada: <strong>1) Impacto &gt; 3.5g</strong>, <strong>2) Ángulo Roll &gt; 60° sostenido por 3-5s</strong> y <strong>3) Detención total inmediata (v ≈ 0 km/h)</strong>.
            </p>
          </div>
        </div>
        <button 
          onClick={triggerSimulatedCrash}
          disabled={isSimulating || crashState === 'countdown'}
          className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all shrink-0 disabled:opacity-50"
        >
          <Play size={15} /> Simular Caída en Moto
        </button>
      </div>

      {/* Alerta de Cuenta Regresiva de Emergencia */}
      <AnimatePresence>
        {crashState === 'countdown' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 md:p-8 bg-gradient-to-br from-rose-600 to-red-800 rounded-3xl text-white shadow-2xl border-4 border-white/20 relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black font-mono animate-pulse border-2 border-white">
                  {countdown}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 justify-center md:justify-start">
                    <Volume2 className="animate-bounce" /> ¡Impacto Severo Detectado!
                  </h3>
                  <p className="text-sm text-red-100 font-medium">
                    Alarma sonora y vibración activadas. Si estás bien, presiona el botón para cancelar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelCountdown}
                  className="px-8 py-4 bg-white text-red-700 hover:bg-red-50 font-black rounded-2xl text-base shadow-2xl transition-transform active:scale-95"
                >
                  ESTOY BIEN (CANCELAR)
                </button>
              </div>
            </div>
            {/* Barra de progreso cuenta regresiva */}
            <div className="w-full bg-black/30 h-2 rounded-full mt-6 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado Despachado */}
      {crashState === 'dispatched' && (
        <div className="p-6 bg-slate-900 border-2 border-rose-500 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={36} className="text-rose-500 animate-pulse" />
            <div>
              <h4 className="font-extrabold text-base text-rose-400">🚨 Protocolo de Emergencia Despachado</h4>
              <p className="text-xs text-slate-300">
                SMS enviado a 2 contactos con enlace de ubicación en vivo + severidad. Si no responden en 2 min, escalará al 911.
              </p>
            </div>
          </div>
          <button onClick={resetAll} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold">
            Restablecer Simulación
          </button>
        </div>
      )}

      {/* Estado Cancelado */}
      {crashState === 'cancelled' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Falsa alarma prevenida con éxito. No se enviaron llamadas ni SMS.
          </div>
          <button onClick={resetAll} className="text-xs font-bold underline">Reintentar</button>
        </div>
      )}

      {/* Visualización de las 3 Fases del Algoritmo en Cascada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Paso 1: Impacto */}
        <div className={`p-5 rounded-3xl border transition-all ${
          activeStep === 1 || crashState === 'countdown' ? 'bg-white border-rose-300 shadow-md' : 'bg-slate-50 border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Paso 1: Magnitud</span>
            <Activity size={18} className={telemetry.gForce > 3.0 ? "text-rose-600 animate-pulse" : "text-slate-400"} />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{telemetry.gForce} <span className="text-xs font-bold text-slate-400">g</span></p>
          <p className="text-xs text-slate-500 mt-1">Umbral: &gt; 3.5 g (√(ax² + ay² + az²))</p>
          <div className={`mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
            telemetry.gForce > 3.0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {telemetry.gForce > 3.0 ? 'Disparo de Choque' : 'Normal'}
          </div>
        </div>

        {/* Paso 2: Orientación */}
        <div className={`p-5 rounded-3xl border transition-all ${
          activeStep === 2 || crashState === 'countdown' ? 'bg-white border-rose-300 shadow-md' : 'bg-slate-50 border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Paso 2: Inclinación Roll</span>
            <RotateCw size={18} className={telemetry.rollAngle > 60 ? "text-rose-600 animate-pulse" : "text-slate-400"} />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{telemetry.rollAngle}° <span className="text-xs font-bold text-slate-400">Roll</span></p>
          <p className="text-xs text-slate-500 mt-1">Umbral: &gt; 60° durante &gt; 3 segundos</p>
          <div className={`mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
            telemetry.rollAngle > 60 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {telemetry.rollAngle > 60 ? 'Moto Tumbada' : 'Erecta'}
          </div>
        </div>

        {/* Paso 3: Inmovilidad GPS */}
        <div className={`p-5 rounded-3xl border transition-all ${
          activeStep === 3 || crashState === 'countdown' ? 'bg-white border-rose-300 shadow-md' : 'bg-slate-50 border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Paso 3: Detención Inmediata</span>
            <AlertOctagon size={18} className={telemetry.speed === 0 ? "text-rose-600 animate-pulse" : "text-slate-400"} />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{telemetry.speed} <span className="text-xs font-bold text-slate-400">km/h</span></p>
          <p className="text-xs text-slate-500 mt-1">Verificación: Caída a 0 km/h sin movimiento</p>
          <div className={`mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
            telemetry.speed === 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {telemetry.speed === 0 ? 'Inmovilidad Confirmada' : 'En Circulación'}
          </div>
        </div>
      </div>

      {/* Cadena de Escalamiento SOS */}
      <div className="bg-white/80 border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <PhoneCall size={16} className="text-cyan-600" />
          Cadena de Escalamiento Inteligente
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">1. Notificación Inmediata</span>
            <p className="font-black text-slate-800 mt-0.5">Alerta Sonora + App</p>
            <p className="text-slate-500 text-[11px] mt-1">Cuenta regresiva 30s para abortar.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">2. Contactos de Emergencia</span>
            <p className="font-black text-slate-800 mt-0.5">SMS + Llamada GSM</p>
            <p className="text-slate-500 text-[11px] mt-1">Contacto 1 → espera 2 min → Contacto 2.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">3. Respaldo Final</span>
            <p className="font-black text-slate-800 mt-0.5">Enlace a Ficha Médica QR</p>
            <p className="text-slate-500 text-[11px] mt-1">Envía tipo de sangre, alergias y coordenadas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
