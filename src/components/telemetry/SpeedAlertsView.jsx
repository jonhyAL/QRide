import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Gauge, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Award, 
  Sliders, 
  Zap, 
  TrendingDown, 
  CheckCircle,
  Bell
} from 'lucide-react';

export function SpeedAlertsView() {
  const [speedLimit, setSpeedLimit] = useState(85); // km/h
  const [consecutiveSeconds, setConsecutiveSeconds] = useState(10); // anti-ruido
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [currentSpeed, setCurrentSpeed] = useState(74); // Doppler speed
  const [driverScore, setDriverScore] = useState(94); // 0 a 100

  // Eventos de exceso registrados
  const [speedEvents, setSpeedEvents] = useState([
    {
      id: 1,
      date: 'Hoy 08:34 AM',
      location: 'Viaducto Miguel Alemán',
      peakSpeed: 96,
      durationSec: 14,
      severity: 'warning', // 80%-100% aviso, >100% alerta, >120% critica
      dopplerPrecision: '±0.1 km/h Doppler'
    },
    {
      id: 2,
      date: 'Ayer 20:12 PM',
      location: 'Periférico Sur (Túnel)',
      peakSpeed: 104,
      durationSec: 18,
      severity: 'critical',
      dopplerPrecision: '±0.1 km/h Doppler'
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Banner de Filtrado Anti-Ruido y Velocidad Doppler */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-amber-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Gauge size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Velocidad Doppler & Filtro Anti-Picos Aislados
              <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">Precisión ±0.1 km/h</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Utiliza la <strong>velocidad Doppler</strong> directa del hardware satelital. Dispara la alerta únicamente si la velocidad supera el umbral durante <strong>{consecutiveSeconds} segundos consecutivos</strong>, evitando falsas alarmas por acelerones puntuales.
            </p>
          </div>
        </div>

        {/* Score de Conducción */}
        <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center gap-3 shrink-0">
          <Award size={24} className="text-amber-400" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Score de Manejo</span>
            <span className="text-lg font-black text-amber-400 font-mono">{driverScore}/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración de Umbrales */}
        <div className="bg-white/80 border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-5">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Sliders size={16} className="text-cyan-600" />
            Configuración de Umbrales & Perfil
          </h4>

          {/* Slider de Velocidad */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-600">Límite Máximo Configurado</span>
              <span className="text-base font-black font-mono text-cyan-600">{speedLimit} km/h</span>
            </div>
            <input 
              type="range" min="40" max="140" step="5"
              value={speedLimit} onChange={e => setSpeedLimit(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Niveles de Alerta Escalonados */}
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-400 text-[10px] uppercase">Niveles de Alerta Escalonados:</p>
            <div className="p-2.5 bg-yellow-50 rounded-xl border border-yellow-200 flex justify-between items-center">
              <span className="font-bold text-yellow-800">Aviso (80%)</span>
              <span className="font-mono font-bold text-yellow-900">{Math.round(speedLimit * 0.8)} km/h</span>
            </div>
            <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200 flex justify-between items-center">
              <span className="font-bold text-orange-800">Alerta (100%)</span>
              <span className="font-mono font-bold text-orange-900">{speedLimit} km/h</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
              <span className="font-bold text-rose-800">Crítica (120%)</span>
              <span className="font-mono font-bold text-rose-900">{Math.round(speedLimit * 1.2)} km/h</span>
            </div>
          </div>

          {/* Filtro Anti-Ruido de Segundos Consecutivos */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-600">Ventana Anti-Pico (Sostenido)</span>
              <span className="text-xs font-black font-mono text-slate-800">{consecutiveSeconds} segs</span>
            </div>
            <input 
              type="range" min="3" max="30" step="1"
              value={consecutiveSeconds} onChange={e => setConsecutiveSeconds(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Cooldown */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock size={14} className="text-slate-400" />
              Cooldown Anti-Spam:
            </div>
            <span className="font-black font-mono text-slate-800">{cooldownMinutes} min</span>
          </div>
        </div>

        {/* Registro de Infracciones / Historial de Excesos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
              Eventos de Velocidad Registrados ({speedEvents.length})
            </h4>
            <span className="text-xs text-slate-400 font-medium">Impacta score de manejo</span>
          </div>

          <div className="space-y-3">
            {speedEvents.map((evt) => (
              <div key={evt.id} className="p-4 bg-white/80 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    evt.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-sm">{evt.location}</h5>
                    <p className="text-xs text-slate-500">{evt.date} • Duración: {evt.durationSec} s sostenidos</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-rose-600 block">{evt.peakSpeed} km/h pico</span>
                    <span className="text-[10px] text-slate-400 font-mono">{evt.dopplerPrecision}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    evt.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {evt.severity === 'critical' ? 'Crítico (120%)' : 'Alerta (100%)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Información Técnica de Respaldo */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-slate-800">
              <Zap size={14} className="text-amber-500" /> Doppler vs Derivada:
            </p>
            <p className="text-[11px] text-slate-500">
              A diferencia de derivar la distancia entre dos puntos (sujeto a errores por jitter de GPS), el cálculo de velocidad Doppler analiza el cambio de frecuencia en las señales satelitales directamente en el chip receptor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
