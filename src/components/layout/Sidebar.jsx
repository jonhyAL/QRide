import { LayoutDashboard, User, FileText, Settings, LogOut, Car, Radio } from 'lucide-react';
import { QrCode } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Sidebar({ user, onAction, activeModal }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { id: 'dashboard', name: 'Panel', icon: LayoutDashboard, path: '/dashboard', type: 'section' },
    { id: 'telemetry', name: 'GPS Telemetría', icon: Radio, path: '/telemetry', type: 'section' },
    { id: 'profile', name: 'Mi Perfil', icon: User, path: '/account', tab: 'profile', type: 'section' },
    { id: 'vehicles', name: 'Vehículos', icon: Car, action: 'vehicles', type: 'modal' },
    { id: 'documents', name: 'Documentos', icon: FileText, action: 'documents', type: 'modal' },
    { id: 'settings', name: 'Ajustes', icon: Settings, path: '/account', tab: 'preferences', type: 'section' },
  ];

  const isItemActive = (item) => {
    // Los modales solo se iluminan si ese modal específico está abierto / activo
    if (item.type === 'modal' || item.action) {
      return activeModal === (item.action || item.id);
    }

    // Secciones principales: no se iluminan si hay un modal activo
    if (activeModal) return false;

    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard';
    }

    if (item.path === '/telemetry') {
      return location.pathname === '/telemetry';
    }

    if (item.path === '/account') {
      if (location.pathname !== '/account') return false;
      const currentTab = location.state?.tab || 'profile';
      return item.tab ? item.tab === currentTab : currentTab === 'profile';
    }

    return location.pathname === item.path;
  };

  const handleItemClick = (item) => {
    if (item.type === 'modal' || item.action) {
      if (onAction) {
        onAction(item.action || item.id);
      }
      return;
    }

    if (item.id === 'dashboard') {
      navigate('/dashboard');
    } else if (item.id === 'telemetry') {
      navigate('/telemetry');
    } else if (item.id === 'profile') {
      navigate('/account', { state: { tab: 'profile' } });
    } else if (item.id === 'settings') {
      navigate('/account', { state: { tab: 'preferences' } });
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="hidden md:flex flex-col w-[260px] h-[calc(100vh-32px)] bg-secondary text-white rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(44,37,77,0.5)] fixed left-4 top-4 z-40 overflow-hidden">
      
      {/* Brand */}
      <div className="flex items-center gap-3 px-8 py-10">
        <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/30">
          <QrCode size={24} weight="bold" className="text-white" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white">QRide</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 relative">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleItemClick(item)}
              className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-colors duration-200 text-left select-none z-10 ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Indicador de píldora activa con animación de transición suave */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-primary rounded-2xl shadow-lg shadow-primary/40 -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30
                  }}
                />
              )}
              <Icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2} 
                className="relative z-10 transition-transform duration-200" 
              />
              <span className="relative z-10 text-sm tracking-wide">{item.name}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* User Profile Snippet & Logout */}
      <div className="p-4 bg-white/5 mx-4 mb-4 rounded-2xl">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
            {user?.user_metadata?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-sm font-bold text-white truncate">
              {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
            </span>
            <span className="text-xs font-medium text-gray-400 truncate">
              {user?.email}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-xl font-bold transition-all duration-200 active:scale-98"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
