import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  AlertOctagon, 
  Route, 
  ShieldCheck,
  X,
  Sparkles,
  Eye,
  Camera
} from 'lucide-react';

import { LiveGpsTracker } from '../dashboard/LiveGpsTracker';
import { GeofencingView } from './GeofencingView';
import { CrashDetectionView } from './CrashDetectionView';
import { HelmetSafetyCheckView } from './HelmetSafetyCheckView';
import { ProximityAlertView } from './ProximityAlertView';

export function TelemetryHubModal({ isOpen, onClose, initialTab = 'gps' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Tabs optimizados y limpios: Eliminadas pestañas innecesarias (buffer microSD, sliders de batería redundantes y bitácoras aisladas)
  // Añadidas las funciones de visión artificial con cámara y normativa mexicana
  const tabs = [
    { id: 'gps', label: '1. GPS en Vivo', icon: Radio, badge: '1 Hz Satelital' },
    { id: 'crash', label: '2. Caídas SOS', icon: AlertOctagon, badge: 'Sensor Fusion' },
    { id: 'geofence', label: '3. Geocercas', icon: ShieldCheck, badge: 'Zonas Seguras' },
    { id: 'helmet', label: '4. Inspección Casco IA', icon: Camera, badge: 'NOM-206 México' },
    { id: 'proximity', label: '5. Radar Proximidad', icon: Eye, badge: 'Audio ADAS' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
        {/* Fondo oscurecido con desenfoque */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Contenedor Principal del Hub */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-[#FAFBFC] rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-200 overflow-hidden"
        >
          {/* Header del Hub */}
          <div className="bg-slate-900 text-white p-5 md:px-8 flex justify-between items-center shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
                <Radio size={22} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                  Hub de Telemetría Satelital, Hardware & ADAS QRide
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Rastreo en tiempo real, detección de caídas, inspección de casco (NOM-206) y radar de proximidad
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>

          {/* Barra de Pestañas con Scroll Horizontal y Badges Técnicos */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2.5 overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isHighlight = tab.id === 'helmet' || tab.id === 'proximity';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold text-xs whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className={isActive ? (isHighlight ? 'text-rose-400' : 'text-cyan-400') : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono ${
                    isActive 
                      ? (isHighlight ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300')
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Área de Contenido de la Funcionalidad Activa */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FAFBFC]">
            {activeTab === 'gps' && (
              <LiveGpsTracker isModal={false} />
            )}
            {activeTab === 'crash' && (
              <CrashDetectionView />
            )}
            {activeTab === 'geofence' && (
              <GeofencingView />
            )}
            {activeTab === 'helmet' && (
              <HelmetSafetyCheckView />
            )}
            {activeTab === 'proximity' && (
              <ProximityAlertView />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
