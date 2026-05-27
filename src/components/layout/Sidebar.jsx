import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, User, FileText, Settings, LogOut } from 'lucide-react';
import { QrCode } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

export function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Panel', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Mi Perfil', icon: User, path: '/profile' },
    { name: 'Ficha Médica', icon: FileText, path: '/medical' },
    { name: 'Ajustes', icon: Settings, path: '/settings' },
  ];

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
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300
                ${isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.name}
            </button>
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-xl font-bold transition-colors"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}