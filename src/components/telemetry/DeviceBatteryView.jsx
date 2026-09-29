import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BatteryCharging, 
  BatteryWarning, 
  BatteryMedium, 
  Zap, 
  ShieldAlert, 
  PowerOff, 
  AlertTriangle,
  Cpu,
  Layers,
  MapPin
} from 'lucide-react';

export function DeviceBatteryView() {
  const [batteryPercent, setBatteryPercent] = useState(82);
  const [voltage, setVoltage] = useState(3.98); // LiPo curva 3.2V - 4.2V
  const [isMainPowerCut, setIsMainPowerCut] = useState(false); // Detección de corte de corriente (robo)
  const [lastGaspSent, setLastGaspSent] = useState(false);

  const getStatusLevel = () => {
    if (batteryPercent <= 5) return { label: 'Crítico (5%)', color: 'rose', mode: 'Último Aliento (Last Gasp)' };
    if (batteryPercent <= 15) return { label: 'Alerta (15%)', color: 'orange', mode: 'Modo Ahorro Extremo' };
    if (batteryPercent <= 30) return { label: 'Aviso (30%)', color: 'amber', mode: 'Frecuencia Reducida' };
    return { label: 'Óptimo', color: 'emerald', mode: 'Operación Estándar' };
  };

  const level = getStatusLevel();

  const handleSimulateCut = () => {
    setIsMainPowerCut(!isMainPowerCut);
  };

  const handleSimulateDischarge = (val) => {
    setBatteryPercent(val);
    const v = (3.2 + (val / 100) * 1.0).toFixed(2);
    setVoltage(v);
    if (val <= 5) setLastGaspSent(true);
    else setLastGaspSent(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Telemetría Eléctrica & Last Gasp */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-emerald-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <BatteryCharging size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Gestión Energética INA219 & "Último Aliento" (Last Gasp)
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">Sensor LiPo</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Monitoreo continuo de voltaje y curva de descarga. Al bajar del 15% activa modo de ahorro apagando funciones no esenciales. A los 5% emite un <strong>último paquete de posición final (Last Gasp)</strong> antes del apagado seguro.
            </p>
          </div>
        </div>

        {/* Simular Corte de Corriente de la Moto */}
        <button 
          onClick={handleSimulateCut}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all shrink-0 ${
            isMainPowerCut 
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 animate-pulse' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <PowerOff size={15} />
          {isMainPowerCut ? '¡Alimentación Moto Cortada!' : 'Simular Corte de Batería (Robo)'}
        </button>
      </div>

      {/* Alerta de Desconexión de Batería Principal (Robo) */}
      {isMainPowerCut && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500 rounded-3xl text-rose-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-rose-500 animate-bounce" />
            <div>
              <p className="font-black text-rose-400 text-sm">⚠️ ¡Alerta de Posible Sabotaje / Robo!</p>
              <p className="text-xs text-slate-300">
                Se desconectó la batería de 12V de la motocicleta. El dispositivo sigue transmitiendo gracias a la batería interna de respaldo LiPo.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-rose-500 text-white px-3 py-1 rounded-full uppercase">
            Batería Interna Activa
          </span>
        </div>
      )}

      {/* Selector de Nivel de Descarga para Pruebas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">Simular descarga:</span>
        <button onClick={() => handleSimulateDischarge(85)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700">85% Normal</button>
        <button onClick={() => handleSimulateDischarge(28)} className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded-xl font-bold text-yellow-800">28% Aviso (30%)</button>
        <button onClick={() => handleSimulateDischarge(12)} className="px-3 py-1 bg-orange-100 hover:bg-orange-200 rounded-xl font-bold text-orange-800">12% Ahorro (15%)</button>
        <button onClick={() => handleSimulateDischarge(4)} className="px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-xl font-bold text-rose-800">4% Last Gasp (5%)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Nivel Actual y Voltaje */}
        <div className="bg-white/80 border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Batería de Respaldo LiPo</span>
              <h4 className="text-3xl font-black font-mono text-slate-900 mt-1">{batteryPercent}%</h4>
            </div>
            <div className={`p-3 rounded-2xl ${
              batteryPercent > 30 ? 'bg-emerald-100 text-emerald-600' : batteryPercent > 15 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <BatteryMedium size={26} />
            </div>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                batteryPercent > 30 ? 'bg-emerald-500' : batteryPercent > 15 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600 font-mono">
            <span>Voltaje medido: <strong>{voltage} V</strong></span>
            <span>Sensor: INA219 I2C</span>
          </div>
        </div>

        {/* Umbrales Escalonados y Estado Operativo */}
        <div className="bg-white/80 border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-4">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Umbrales Escalonados de Ahorro
          </h4>

          <div className="space-y-2 text-xs">
            <div className={`p-2.5 rounded-xl border flex justify-between items-center ${
              batteryPercent <= 30 && batteryPercent > 15 ? 'bg-amber-50 border-amber-300 font-bold text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span>30% Aviso</span>
              <span>Notificación preventiva</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex justify-between items-center ${
              batteryPercent <= 15 && batteryPercent > 5 ? 'bg-orange-50 border-orange-300 font-bold text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span>15% Modo Ahorro</span>
              <span>Apagado de LEDs/Baja freq</span>
            </div>
            <div className={`p-2.5 rounded-xl border flex justify-between items-center ${
              batteryPercent <= 5 ? 'bg-rose-50 border-rose-300 font-bold text-rose-900 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span>5% Crítico (Last Gasp)</span>
              <span>Transmisión final y apagado</span>
            </div>
          </div>
        </div>

        {/* Notificación de Last Gasp */}
        <div className="bg-white/80 border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-cyan-600" />
              Paquete "Último Aliento"
            </h4>
            <p className="text-xs text-slate-500">
              Garantiza que la última ubicación conocida del vehículo quede persistida en la nube antes de que el dispositivo se apague por completo.
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border text-xs font-mono ${
            lastGaspSent ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <p className="font-bold">{lastGaspSent ? '✅ PAQUETE FINAL ENVIADO' : '⚪ EN ESPERA DE CONDICIÓN'}</p>
            <p className="text-[10px] mt-1">Coords: 19.3892° N, -99.1764° W</p>
            <p className="text-[10px]">Timestamp de apagado guardado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
