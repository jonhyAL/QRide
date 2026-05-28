import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gear, Bell, LockKey, Moon, SignOut } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function SettingsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    publicProfile: true
  });

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  const Toggle = ({ label, icon: Icon, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E8DFD8] hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-secondary">
          <Icon size={20} weight="fill" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-secondary">{label}</h4>
          <p className="text-xs text-secondary/60 mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-primary' : 'bg-secondary/20'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#F4EFEA] w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="bg-white p-6 pb-6 border-b border-[#E8DFD8]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <Gear size={24} weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-secondary">Ajustes</h3>
                    <p className="text-sm text-secondary/60">Preferencias de cuenta</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-secondary/40 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-colors">
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <Toggle 
                label="Notificaciones Push"
                description="Avisos sobre el escanéo de tu QR."
                icon={Bell}
                checked={settings.notifications}
                onChange={(v) => setSettings({...settings, notifications: v})}
              />

              <Toggle 
                label="Perfil Público Activo"
                description="Permitir que tu perfil sea visible mediante QR."
                icon={LockKey}
                checked={settings.publicProfile}
                onChange={(v) => setSettings({...settings, publicProfile: v})}
              />

              <Toggle 
                label="Modo Oscuro"
                description="Cambiar apariencia de la aplicación."
                icon={Moon}
                checked={settings.darkMode}
                onChange={(v) => setSettings({...settings, darkMode: v})}
              />
              
              <div className="pt-4 mt-4 border-t border-[#E8DFD8]/50">
                <button 
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors"
                >
                  <SignOut size={20} weight="bold" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}