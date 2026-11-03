import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Radio, 
  AlertOctagon, 
  ShieldCheck, 
  Camera, 
  Eye, 
  BatteryCharging, 
  Wifi, 
  Satellite, 
  Sparkles
} from 'lucide-react';

import { Sidebar } from '../components/layout/Sidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { LiveGpsTracker } from '../components/dashboard/LiveGpsTracker';
import { CrashDetectionView } from '../components/telemetry/CrashDetectionView';
import { GeofencingView } from '../components/telemetry/GeofencingView';
import { HelmetSafetyCheckView } from '../components/telemetry/HelmetSafetyCheckView';
import { ProximityAlertView } from '../components/telemetry/ProximityAlertView';
import { VehiclesModal } from '../components/dashboard/VehiclesModal';
import { DocumentsModal } from '../components/dashboard/DocumentsModal';

export default function Telemetry() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'gps');
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const activeModal = isVehiclesModalOpen ? 'vehicles' : isDocumentsModalOpen ? 'documents' : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSidebarAction = (actionId) => {
    if (actionId === 'dashboard') {
      navigate('/dashboard');
    } else if (actionId === 'profile') {
      navigate('/account', { state: { tab: 'profile' } });
    } else if (actionId === 'settings') {
      navigate('/account', { state: { tab: 'preferences' } });
    } else if (actionId === 'telemetry') {
      setActiveTab('gps');
    } else if (actionId === 'vehicles') {
      setIsVehiclesModalOpen(true);
    } else if (actionId === 'documents') {
      setIsDocumentsModalOpen(true);
    } else {
      navigate('/dashboard', { state: { action: actionId } });
    }
  };

  const tabs = [
    { id: 'gps', label: '1. GPS en Vivo', icon: Radio, badge: 'Satelital 1 Hz' },
    { id: 'crash', label: '2. Caídas SOS', icon: AlertOctagon, badge: 'Sensor Fusion' },
    { id: 'geofence', label: '3. Geocercas', icon: ShieldCheck, badge: 'Zonas Seguras' },
    { id: 'helmet', label: '4. Casco IA', icon: Camera, badge: 'NOM-206 México' },
    { id: 'proximity', label: '5. Radar ADAS', icon: Eye, badge: 'Audio Alert' },
  ];

  return (
    <div className="min-h-screen bg-bg-light relative overflow-x-hidden font-sans pb-24 md:pb-10">
      
      {/* Sidebar Flotante de QRide */}
      <Sidebar user={user} onAction={handleSidebarAction} activeModal={activeModal} />

      {/* Contenido Principal de la Página */}
      <div className="flex-1 md:ml-[290px] relative z-10">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* Header de la Página (Sin flecha hacia atrás) */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight">
                  Centro de Telemetría Satelital & Hardware
                </h1>
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-700 text-xs font-black uppercase rounded-full border border-cyan-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  En Tiempo Real
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                Monitoreo vehicular en vivo en mapa real, protección SOS, visión por IA para casco y radar ADAS
              </p>
            </div>

            {/* Badges de Hardware en Vivo */}
            <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 p-2 rounded-2xl border border-slate-200/60 self-start md:self-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-xs text-xs font-mono font-bold text-slate-800">
                <BatteryCharging size={14} className="text-emerald-500" />
                <span>88% LiPo</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-xs text-xs font-mono font-bold text-slate-800">
                <Wifi size={14} className="text-cyan-500" />
                <span>4G LTE</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-xs text-xs font-mono font-bold text-slate-800">
                <Satellite size={14} className="text-indigo-500" />
                <span>12 Sats</span>
              </div>
            </div>
          </motion.div>

          {/* Selector de Secciones SIN Scroll Horizontal (Cuadrícula Adaptativa) */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-2 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isHighlight = tab.id === 'helmet' || tab.id === 'proximity';

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl font-bold text-xs transition-all duration-200 text-left select-none relative overflow-hidden ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.01]'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500 shadow-xs'
                  }`}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate leading-tight font-extrabold text-[12px]">{tab.label}</span>
                    <span className={`text-[10px] font-mono leading-tight mt-0.5 truncate ${
                      isActive ? 'text-white/80' : 'text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Área de Visualización Dinámica */}
          <div className="transition-all">
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

        </div>
      </div>

      {/* Navegación Móvil Inferior */}
      <MobileNav onAction={handleSidebarAction} activeModal={activeModal} />

      {/* Modal de Vehículos */}
      <VehiclesModal 
        isOpen={isVehiclesModalOpen} 
        onClose={() => setIsVehiclesModalOpen(false)} 
        user={user}
        userId={user?.id} 
      />

      {/* Modal de Documentos */}
      <DocumentsModal 
        isOpen={isDocumentsModalOpen} 
        onClose={() => setIsDocumentsModalOpen(false)} 
        user={user}
        userId={user?.id} 
      />
    </div>
  );
}
