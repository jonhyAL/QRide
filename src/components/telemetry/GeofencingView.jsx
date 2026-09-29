import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  MapPin, 
  Plus, 
  Clock, 
  Bell, 
  Circle, 
  Hexagon, 
  Trash2, 
  AlertTriangle, 
  Sliders, 
  Check, 
  Eye, 
  Compass, 
  ChevronRight,
  Info
} from 'lucide-react';

export function GeofencingView() {
  const [geofences, setGeofences] = useState([
    {
      id: 'geo-1',
      name: 'Casa (Zona Segura)',
      type: 'circle',
      radius: 120, // metros
      events: ['EXIT', 'ENTER'],
      schedule: 'Activa 22:00 - 06:00 (Nocturno)',
      hysteresis: '3 lecturas (25m margen)',
      status: 'active',
      vehicle: 'Yamaha MT-07',
      lastEvent: 'ENTER hace 4h',
      color: '#10b981', // emerald
      coords: { cx: 280, cy: 260, r: 65 }
    },
    {
      id: 'geo-2',
      name: 'Oficina / Trabajo',
      type: 'polygon',
      points: '450,150 560,180 540,290 420,260',
      events: ['ENTER', 'EXIT', 'DWELL'],
      dwellTime: 'Dwell > 15 min',
      schedule: 'Lunes a Viernes (08:00 - 18:00)',
      hysteresis: '3 lecturas consecutivas',
      status: 'active',
      vehicle: 'Yamaha MT-07',
      lastEvent: 'DWELL 4h 12m',
      color: '#3b82f6', // blue
      coords: { cx: 480, cy: 220 }
    },
    {
      id: 'geo-3',
      name: 'Taller Mecánico Especializado',
      type: 'circle',
      radius: 80,
      events: ['ENTER'],
      schedule: 'Siempre activa (24/7)',
      hysteresis: '2 lecturas (20m margen)',
      status: 'paused',
      vehicle: 'Honda Civic',
      lastEvent: 'Inactiva',
      color: '#f59e0b', // amber
      coords: { cx: 620, cy: 390, r: 45 }
    }
  ]);

  const [selectedGeo, setSelectedGeo] = useState(geofences[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState('circle');
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState(150);
  const [alertType, setAlertType] = useState({ push: true, sms: true });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName) return;
    const newG = {
      id: `geo-${Date.now()}`,
      name: newName,
      type: newType,
      radius: newType === 'circle' ? newRadius : null,
      events: ['EXIT', 'ENTER'],
      schedule: 'Siempre activa (24/7)',
      hysteresis: '3 lecturas consecutivas (30m margen)',
      status: 'active',
      vehicle: 'Yamaha MT-07',
      lastEvent: 'Recién creada',
      color: '#06b6d4',
      coords: { cx: 350, cy: 380, r: newRadius / 2 }
    };
    setGeofences([...geofences, newG]);
    setSelectedGeo(newG);
    setIsCreating(false);
    setNewName('');
  };

  const handleDelete = (id) => {
    setGeofences(geofences.filter(g => g.id !== id));
    if (selectedGeo?.id === id) {
      setSelectedGeo(geofences.find(g => g.id !== id) || null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Explicativo de Arquitectura / Histéresis */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-cyan-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Evaluación Edge en Dispositivo + Backend Seguro
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">Offline Shield</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Las geocercas se guardan en la memoria flash del hardware para alertar por <strong>SMS/GSM directo</strong> si se pierde la red celular. Incluye filtro de <strong>histéresis (3 lecturas consecutivas fuera)</strong> para erradicar falsos positivos por deriva GPS.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus size={16} /> Crear Geocerca
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa Interactivo de Geocercas */}
        <div className="lg:col-span-2 bg-slate-950 rounded-[2rem] border border-slate-800 p-5 flex flex-col relative overflow-hidden shadow-2xl min-h-[460px]">
          <div className="flex justify-between items-center mb-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-300">Editor Visual de Geocercas</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl">
              Filtro: Margen 25-30m / 3 lecturas
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-900 bg-slate-900/50">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="geo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#geo-grid)" />

              {/* Calles decorativas */}
              <path d="M 50 250 L 750 250" stroke="#334155" strokeWidth="12" fill="none" opacity="0.4" />
              <path d="M 300 50 L 300 450" stroke="#334155" strokeWidth="10" fill="none" opacity="0.4" />
              <path d="M 500 50 L 500 450" stroke="#334155" strokeWidth="8" fill="none" opacity="0.3" />

              {/* Geocercas representadas */}
              {geofences.map((geo) => {
                const isSelected = selectedGeo?.id === geo.id;
                return (
                  <g key={geo.id} onClick={() => setSelectedGeo(geo)} className="cursor-pointer">
                    {geo.type === 'circle' ? (
                      <>
                        <circle
                          cx={geo.coords.cx}
                          cy={geo.coords.cy}
                          r={geo.coords.r}
                          fill={geo.color}
                          fillOpacity={isSelected ? 0.25 : 0.12}
                          stroke={geo.color}
                          strokeWidth={isSelected ? 3 : 1.5}
                          strokeDasharray={geo.status === 'paused' ? '4 4' : 'none'}
                        />
                        {/* Margen de histéresis virtual (buffer zone) */}
                        <circle
                          cx={geo.coords.cx}
                          cy={geo.coords.cy}
                          r={geo.coords.r + 14}
                          fill="none"
                          stroke={geo.color}
                          strokeWidth="1"
                          strokeDasharray="2 3"
                          opacity={0.4}
                        />
                      </>
                    ) : (
                      <polygon
                        points={geo.points}
                        fill={geo.color}
                        fillOpacity={isSelected ? 0.25 : 0.12}
                        stroke={geo.color}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                    )}
                    {/* Etiqueta */}
                    <text
                      x={geo.coords.cx}
                      y={geo.coords.cy - (geo.coords.r || 40) - 8}
                      fill={geo.color}
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {geo.name}
                    </text>
                  </g>
                );
              })}

              {/* Moto / Vehículo Actual dentro de Casa */}
              <circle cx="280" cy="260" r="8" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              <circle cx="280" cy="260" r="18" fill="#38bdf8" fillOpacity="0.2" className="animate-ping" />
            </svg>

            {/* Leyenda flotante */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Círculo Centro + Radio
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Polígono Libre
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 border border-dashed border-cyan-400" /> Zona de Histéresis (+25m)
              </div>
            </div>
          </div>
        </div>

        {/* Lista y Detalle de Geocercas */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
            Geocercas Configuradas ({geofences.length})
          </h3>

          <div className="space-y-3">
            {geofences.map((geo) => {
              const isSelected = selectedGeo?.id === geo.id;
              return (
                <div
                  key={geo.id}
                  onClick={() => setSelectedGeo(geo)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-md shadow-cyan-500/5' 
                      : 'bg-white/80 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {geo.type === 'circle' ? (
                        <Circle size={16} className="text-cyan-600" />
                      ) : (
                        <Hexagon size={16} className="text-blue-600" />
                      )}
                      <h4 className="font-extrabold text-slate-900 text-sm">{geo.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      geo.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {geo.status === 'active' ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span className="truncate">{geo.schedule}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell size={12} className="text-slate-400" />
                      <span>{geo.events.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Histéresis: {geo.hysteresis}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(geo.id); }} 
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal / Formulario para Nueva Geocerca */}
          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 bg-white rounded-3xl border-2 border-cyan-500 shadow-xl space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-slate-900">Nueva Geocerca</h4>
                  <button onClick={() => setIsCreating(false)} className="text-xs font-bold text-slate-400">Cancelar</button>
                </div>

                <input 
                  type="text" 
                  placeholder="Ej. Estacionamiento Centro" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setNewType('circle')}
                    className={`py-2 rounded-xl font-bold border ${newType === 'circle' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-50 border-slate-200'}`}
                  >
                    Círculo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewType('polygon')}
                    className={`py-2 rounded-xl font-bold border ${newType === 'polygon' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-50 border-slate-200'}`}
                  >
                    Polígono Libre
                  </button>
                </div>

                {newType === 'circle' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Radio ({newRadius} metros)</label>
                    <input 
                      type="range" min="50" max="1000" step="25" 
                      value={newRadius} onChange={e => setNewRadius(Number(e.target.value))} 
                      className="w-full accent-cyan-500"
                    />
                  </div>
                )}

                <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl text-slate-600 border border-slate-200 space-y-1">
                  <p className="font-bold">🛡️ Parámetros anti-falsos positivos:</p>
                  <p>• Exige 3 lecturas fuera (o margen de 30m).</p>
                  <p>• Eventos: EXIT, ENTER y DWELL.</p>
                </div>

                <button 
                  onClick={handleCreate} 
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  Guardar en Memoria de Dispositivo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
