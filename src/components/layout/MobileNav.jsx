import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Car, Settings, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileNav({ onAction }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', name: 'Panel', icon: LayoutDashboard, path: '/dashboard', tab: null },
    { id: 'vehicles', name: 'Vehículos', icon: Car, path: '/dashboard', action: 'vehicles' },
    { id: 'documents', name: 'Documentos', icon: FileText, path: '/dashboard', action: 'documents' },
    { id: 'profile', name: 'Perfil', icon: User, path: '/account', tab: 'profile' },
    { id: 'settings', name: 'Ajustes', icon: Settings, path: '/account', tab: 'preferences' },
  ];

  const handleNavClick = (item) => {
    if (item.action) {
      if (location.pathname === '/dashboard' && onAction) {
        onAction(item.action);
        return;
      }
      navigate('/dashboard', { state: { action: item.action } });
      return;
    }

    if (location.pathname === item.path && !item.tab) return;
    
    if (item.path === '/account') {
      navigate('/account', { state: { tab: item.tab } });
    } else {
      navigate(item.path);
    }
  };

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-4 left-3 right-[5.5rem] z-50 bg-secondary/90 backdrop-blur-xl rounded-[1.5rem] py-2 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10"
    >
      <div className="flex justify-around items-end">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path && 
                           (!item.tab || location.state?.tab === item.tab) &&
                           (!item.action || location.state?.action === item.action);

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={"flex flex-col items-center justify-center w-[4rem] pb-2 pt-1 transition-all duration-300 " + (isActive ? "text-white" : "text-white/50 hover:text-white/80")}
            >
              <div className={"mb-1 p-1.5 rounded-xl transition-all " + (isActive ? "bg-white/10" : "bg-transparent")}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-white/50'} />
              </div>
              <span className={"text-[10px] font-bold " + (isActive ? "text-white" : "text-white/50")}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
