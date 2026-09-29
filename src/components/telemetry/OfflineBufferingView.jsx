import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  WifiOff, 
  RefreshCw, 
  HardDrive, 
  ShieldCheck, 
  Radio, 
  ArrowUpCircle, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Cpu
} from 'lucide-react';

export function OfflineBufferingView() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [gsmStatus, setGsmStatus] = useState('registered'); // 'registered' | 'searching' | 'dead_reckoning'
  const [bufferedPoints, setBufferedPoints] = useState(340);
  const [syncedPoints, setSyncedPoints] = useState(1280);

  const bufferQueue = [
    { seq: 4891, timestamp: '10:42:15 AM', type: 'CRITICAL (CAÍDA/SOS)', size: '28 bytes', priority: 'ALTA' },
    { seq: 4892, timestamp: '10:42:16 AM', type: 'GEOCERCA (EXIT)', size: '24 bytes', priority: 'ALTA' },
    { seq: 4893, timestamp: '10:42:17 AM', type: 'TELEMETRÍA (Túnel MPU6050)', size: '18 bytes', priority: 'NORMAL (Estimado)' },
    { seq: 4894, timestamp: '10:42:18 AM', type: 'TELEMETRÍA (Fix GPS)', size: '18 bytes', priority: 'NORMAL' },
  ];

  const handleStartSync = () => {
    setIsSyncing(true);
    let remaining = bufferedPoints;
    const interval = setInterval(() => {
      remaining = Math.max(0, remaining - 50);
      setBufferedPoints(remaining);
      setSyncedPoints(prev => prev + 50);
      if (remaining === 0) {
        clearInterval(interval);
        setIsSyncing(false);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Sincronización Idempotente y Cola FIFO en MicroSD */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-purple-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
            <Database size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Respaldo Offline en MicroSD & Dead Reckoning
              <span className="text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">Cola FIFO Binaria</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Si se pierde cobertura GSM (AT+CREG?), el dispositivo almacena los paquetes en microSD con número de secuencia incremental. Al recuperar red, envía en <strong>lotes de 50 puntos</strong> con deduplicación por <code>(device_id, seq)</code>. Prioriza eventos de caída y geocerca.
            </p>
          </div>
        </div>

        <button 
          onClick={handleStartSync}
          disabled={isSyncing || bufferedPoints === 0}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? 'Sincronizando lotes...' : 'Forzar Sincronización'}
        </button>
      </div>

      {/* Indicador de Estado de Conexión y Buffer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Puntos en Buffer MicroSD</span>
            <HardDrive size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black font-mono text-purple-900">{bufferedPoints}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {bufferedPoints > 0 ? 'Esperando canal de subida' : 'Todo sincronizado'}
          </p>
        </div>

        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Puntos Sincronizados</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-800">{syncedPoints}</p>
          <p className="text-[11px] text-slate-500 mt-1">Deduplicados e idempotentes</p>
        </div>

        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Módulo GSM / Módem</span>
            <Radio size={18} className="text-cyan-600" />
          </div>
          <p className="text-base font-black text-slate-800">AT+CREG: 1 (Hogar)</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Red 4G LTE Conectada</p>
        </div>

        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Túneles (Dead Reckoning)</span>
            <Cpu size={18} className="text-indigo-600" />
          </div>
          <p className="text-base font-black text-slate-800">Inercial MPU6050</p>
          <p className="text-[11px] text-indigo-600 font-bold mt-1">Puntos estimados activos</p>
        </div>
      </div>

      {/* Cola FIFO de Paquetes en Memoria */}
      <div className="bg-white/80 border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-purple-600" />
            Cola FIFO de Eventos Críticos y Telemetría
          </h4>
          <span className="text-[11px] font-mono text-slate-500">Lotes de 50 request / seq incremental</span>
        </div>

        <div className="space-y-2.5">
          {bufferQueue.map((item) => (
            <div key={item.seq} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  SEQ #{item.seq}
                </span>
                <span className="font-extrabold text-slate-800">{item.type}</span>
                <span className="text-slate-400 font-mono text-[11px]">{item.timestamp}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-500">{item.size}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  item.priority.includes('ALTA') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
