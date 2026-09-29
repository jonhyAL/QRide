import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Route, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Calendar, 
  Clock, 
  MapPin, 
  Gauge, 
  Layers, 
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export function RouteHistoryView() {
  const [selectedRouteId, setSelectedRouteId] = useState('route-1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(40); // 0 a 100%

  const routes = [
    {
      id: 'route-1',
      date: 'Hoy, 29 Sep',
      startTime: '08:15 AM',
      endTime: '08:52 AM',
      origin: 'Av. Insurgentes Sur 1420',
      destination: 'Polanco V Sección',
      distanceKm: 14.8,
      duration: '37 min',
      avgSpeed: 24.2,
      maxSpeed: 68.5,
      stops: 3,
      compressionRate: '86% (Ramer-Douglas-Peucker)',
      pathPoints: '120,400 160,350 240,320 310,260 380,240 450,210 520,180 580,160 640,120',
      activeCoords: { x: 380, y: 240 }
    },
    {
      id: 'route-2',
      date: 'Ayer, 28 Sep',
      startTime: '19:40 PM',
      endTime: '20:25 PM',
      origin: 'Polanco V Sección',
      destination: 'Av. Insurgentes Sur 1420',
      distanceKm: 15.2,
      duration: '45 min',
      avgSpeed: 20.1,
      maxSpeed: 72.0,
      stops: 5,
      compressionRate: '88% (RDP)',
      pathPoints: '640,120 580,160 520,180 450,210 380,240 310,260 240,320 160,350 120,400',
      activeCoords: { x: 520, y: 180 }
    },
    {
      id: 'route-3',
      date: 'Viernes, 26 Sep',
      startTime: '14:10 PM',
      endTime: '14:40 PM',
      origin: 'Coyoacán Centro',
      destination: 'Condesa',
      distanceKm: 9.6,
      duration: '30 min',
      avgSpeed: 19.4,
      maxSpeed: 58.0,
      stops: 2,
      compressionRate: '84% (RDP)',
      pathPoints: '200,420 280,360 340,300 420,270 480,210',
      activeCoords: { x: 340, y: 300 }
    }
  ];

  const currentRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  const handleExport = (format) => {
    alert(`Exportando trayecto "${currentRoute.origin} ➔ ${currentRoute.destination}" en formato .${format.toUpperCase()} (comprimido con RDP)`);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Segmentación Automática */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-5 rounded-3xl border border-blue-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Route size={26} />
          </div>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              Segmentación Automática & Compresión Ramer–Douglas–Peucker
              <span className="text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">Auto-Detect</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Inicia al detectar <strong>velocidad sostenida &gt; 5 km/h</strong> y concluye tras <strong>5 min detenida</strong>. Los puntos se optimizan con RDP y polylines codificadas reduciendo un 85% de datos sin perder curvatura.
            </p>
          </div>
        </div>
        
        {/* Botones de Exportación */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleExport('gpx')} 
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 flex items-center gap-1.5"
          >
            <Download size={13} /> GPX
          </button>
          <button 
            onClick={() => handleExport('kml')} 
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 flex items-center gap-1.5"
          >
            <Download size={13} /> KML
          </button>
          <button 
            onClick={() => handleExport('pdf')} 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa / Reproductor Animado de Ruta */}
        <div className="lg:col-span-2 bg-slate-950 rounded-[2rem] border border-slate-800 p-5 flex flex-col relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center mb-3 z-10">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">{currentRoute.date}</p>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                {currentRoute.origin} <span className="text-cyan-400">➔</span> {currentRoute.destination}
              </h4>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
              Compresión: {currentRoute.compressionRate}
            </div>
          </div>

          {/* Lienzo de Ruta SVG */}
          <div className="relative flex-1 min-h-[340px] rounded-2xl overflow-hidden border border-slate-900 bg-slate-900/60">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="route-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#route-grid)" />

              {/* Calles base */}
              <path d="M 80 400 L 720 120" stroke="#334155" strokeWidth="18" fill="none" opacity="0.3" strokeLinecap="round" />
              <path d="M 120 400 L 640 120" stroke="#1e293b" strokeWidth="12" fill="none" opacity="0.8" strokeLinecap="round" />

              {/* Trazo del recorrido */}
              <polyline 
                points={currentRoute.pathPoints} 
                fill="none" 
                stroke="url(#routeGradient)" 
                strokeWidth="6" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Marcador Inicio */}
              <circle cx="120" cy="400" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              {/* Marcador Fin */}
              <circle cx="640" cy="120" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />

              {/* Marcador en movimiento durante Replay */}
              <circle 
                cx={currentRoute.activeCoords.x} 
                cy={currentRoute.activeCoords.y} 
                r="9" 
                fill="#38bdf8" 
                stroke="#ffffff" 
                strokeWidth="2.5" 
              />
              <circle 
                cx={currentRoute.activeCoords.x} 
                cy={currentRoute.activeCoords.y} 
                r="20" 
                fill="#38bdf8" 
                fillOpacity="0.2" 
                className="animate-ping" 
              />
            </svg>

            {/* Marcadores Inicio / Fin Flotantes */}
            <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Salida: {currentRoute.startTime}
            </div>
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Llegada: {currentRoute.endTime}
            </div>
          </div>

          {/* Barra de Replay / Reproductor Animado */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-4">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold shrink-0 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Replay de recorrido</span>
                <span>{playbackProgress}% completado</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={playbackProgress} 
                onChange={e => setPlaybackProgress(Number(e.target.value))} 
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <button 
              onClick={() => setPlaybackProgress(0)}
              className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Reiniciar reproducción"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Lista de Trayectos Históricos */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
            Trayectos Registrados ({routes.length})
          </h3>

          <div className="space-y-3">
            {routes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/5' 
                      : 'bg-white/80 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-slate-900">{route.date}</span>
                    <span className="text-xs font-black font-mono text-cyan-600">{route.distanceKm} km</span>
                  </div>

                  <p className="text-xs font-bold text-slate-700 truncate">{route.origin}</p>
                  <p className="text-xs text-slate-400 truncate">↳ {route.destination}</p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                    <div>
                      <span className="text-[9px] uppercase block text-slate-400">Tiempo</span>
                      <span className="font-bold text-slate-700">{route.duration}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase block text-slate-400">Vel. Prom</span>
                      <span className="font-bold text-slate-700">{route.avgSpeed} km/h</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase block text-slate-400">Paradas</span>
                      <span className="font-bold text-slate-700">{route.stops}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
