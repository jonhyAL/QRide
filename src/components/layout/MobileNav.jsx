import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Car, FileText, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileNav({ onAction, activeModal }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', name: 'Panel', icon: LayoutDashboard, path: '/dashboard', type: 'section' },
    { id: 'telemetry', name: 'GPS', icon: Radio, path: '/telemetry', type: 'section' },
    { id: 'vehicles', name: 'Vehículos', icon: Car, action: 'vehicles', type: 'modal' },
    { id: 'documents', name: 'Docs', icon: FileText, action: 'documents', type: 'modal' },
    { id: 'profile', name: 'Perfil', icon: User, path: '/account', tab: 'profile', type: 'section' },
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

  const handleNavClick = (item) => {
    if (item.type === 'modal' || item.action) {
      // Si se pasa onAction, llamarlo directamente sin importar la ruta actual
      if (onAction) {
        onAction(item.action || item.id);
        return;
      }
      navigate('/dashboard', { state: { action: item.action || item.id } });
      return;
    }

    if (location.pathname === item.path && (!item.tab || location.state?.tab === item.tab)) {
      return;
    }
    
    if (item.path === '/account') {
      navigate('/account', { state: { tab: item.tab } });
    } else {
      navigate(item.path);
    }
  };

  return (
    <motion.div 
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="md:hidden fixed bottom-4 inset-x-3 max-w-md mx-auto z-40 bg-secondary/95 backdrop-blur-xl rounded-[2rem] py-2 px-2 shadow-[0_12px_36px_rgba(44,37,77,0.4)] border border-white/10"
    >
      <div className="flex justify-between items-center relative">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleNavClick(item)}
              className="relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 select-none z-10"
            >
              <div className="relative isolate flex flex-col items-center w-full">
                {/* Indicador de píldora activa con animación de transición suave y garantizada visibilidad */}
                {isActive && (
                  <motion.div
                    layoutId="mobileActivePill"
                    className="absolute inset-0 -inset-x-1.5 -inset-y-1 bg-primary rounded-2xl shadow-lg shadow-primary/40 -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32
                    }}
                  />
                )}
                
                <div className={`relative z-10 mb-0.5 p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'scale-105 text-white' : 'text-gray-400 hover:text-white'
                }`}>
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className="transition-colors duration-200" 
                  />
                </div>
                <span className={`relative z-10 text-[10px] font-bold tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-white font-extrabold' : 'text-gray-400'
                }`}>
                  {item.name}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
