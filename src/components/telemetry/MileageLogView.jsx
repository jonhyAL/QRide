import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Milestone, 
  Download, 
  Calendar, 
  Sliders, 
  Wrench, 
  Fuel, 
  FileSpreadsheet, 
  FileText,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export function MileageLogView() {
  const [odometerKm, setOdometerKm] = useState(14850.4);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState(14850.4);

  const stats = {
    todayKm: 24.8,
    weekKm: 182.4,
    monthKm: 640.2,
    serviceIntervalKm: 3000,
    kmUntilNextOilChange: 650
  };

  const logs = [
    { id: 1, date: '29 Sep 2026', origin: 'Av. Insurgentes Sur 1420', dest: 'Polanco V', distance: 14.8, fuelEstLiters: 0.6, purpose: 'Traslado Personal' },
    { id: 2, date: '29 Sep 2026', origin: 'Polanco V', dest: 'Roma Norte', distance: 10.0, fuelEstLiters: 0.4, purpose: 'Reunión' },
    { id: 3, date: '28 Sep 2026', origin: 'Roma Norte', dest: 'Av. Insurgentes Sur', distance: 15.2, fuelEstLiters: 0.7, purpose: 'Retorno a Casa' },
    { id: 4, date: '27 Sep 2026', origin: 'Coyoacán', dest: 'Condesa', distance: 9.6, fuelEstLiters: 0.4, purpose: 'Diligencia' },
    { id: 5, date: '26 Sep 2026', origin: 'Condesa', dest: 'Santa Fe', distance: 22.4, fuelEstLiters: 1.1, purpose: 'Trabajo' },
  ];

  const handleExport = (type) => {
    alert(`Exportando bitácora de kilometraje en .${type.toUpperCase()} con desglose por trayectos y cálculo Haversine.`);
  };

  const handleSaveCalibration = () => {
    setOdometerKm(Number(calibrationValue));
    setIsCalibrating(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Cálculo Haversine & Anti-Deriva */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-teal-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
            <Milestone size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Bitácora de Kilometraje con Suma Haversine
              <span className="text-[10px] uppercase tracking-wider bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-bold border border-teal-500/30">Cero Deriva en Parada</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Acumula distancia calculando distancias geodésicas (Haversine). Desprecia el ruido satelital descartando lecturas cuando el vehículo está detenido, evitando falsos kilómetros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Tarjetas de Kilometraje Acumulado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Hoy</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.todayKm} <span className="text-xs text-slate-400">km</span></p>
          <p className="text-[11px] text-teal-600 font-bold mt-1">2 trayectos registrados</p>
        </div>

        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Esta Semana</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.weekKm} <span className="text-xs text-slate-400">km</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Consumo est.: ~7.2 L</p>
        </div>

        <div className="p-5 bg-white/80 border border-slate-200 rounded-3xl shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Este Mes</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.monthKm} <span className="text-xs text-slate-400">km</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Base para reembolso</p>
        </div>

        {/* Odómetro Total y Calibración */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Odómetro Total</span>
              <button 
                onClick={() => setIsCalibrating(!isCalibrating)} 
                className="text-[10px] font-bold text-teal-400 hover:underline flex items-center gap-1"
              >
                <Sliders size={11} /> Calibrar
              </button>
            </div>
            <p className="text-2xl font-black font-mono text-teal-400 mt-1">{odometerKm.toLocaleString()} km</p>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Wrench size={12} className="text-amber-400" /> Próx. servicio en: {stats.kmUntilNextOilChange} km
          </div>
        </div>
      </div>

      {/* Modal de Calibración de Odómetro */}
      {isCalibrating && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-teal-900">Ajustar con el odómetro real del tablero de la moto</p>
            <p className="text-teal-700 text-[11px]">Sincroniza la lectura satelital con el kilometraje físico de tu velocímetro.</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" step="0.1" 
              value={calibrationValue} 
              onChange={e => setCalibrationValue(e.target.value)} 
              className="bg-white border border-teal-300 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-800 w-32 outline-none"
            />
            <button 
              onClick={handleSaveCalibration} 
              className="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-xl"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Tabla Desglosada de Trayectos */}
      <div className="bg-white/80 border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
        <h4 className="font-extrabold text-sm text-slate-900">Historial Detallado de Viajes</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-extrabold">
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Origen</th>
                <th className="pb-3">Destino</th>
                <th className="pb-3 text-right">Distancia</th>
                <th className="pb-3 text-right">Combustible Est.</th>
                <th className="pb-3 text-right">Propósito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-bold">{log.date}</td>
                  <td className="py-3">{log.origin}</td>
                  <td className="py-3">{log.dest}</td>
                  <td className="py-3 text-right font-mono font-bold text-slate-900">{log.distance} km</td>
                  <td className="py-3 text-right font-mono text-teal-700">~{log.fuelEstLiters} L</td>
                  <td className="py-3 text-right">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold">
                      {log.purpose}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
