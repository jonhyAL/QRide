import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserList, EnvelopeSimple, Phone } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

export function ProfileModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
  });
  const [message, setMessage] = useState({ type: '', content: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      });

      if (error) throw error;
      
      setMessage({ type: 'success', content: 'Perfil actualizado exitosamente' });
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', content: 'No se pudo actualizar el perfil' });
    } finally {
      setLoading(false);
    }
  };

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
            className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 z-10"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <UserList size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary">Mi Perfil</h3>
                  <p className="text-sm text-secondary/60">Gestiona tus datos personales</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-secondary/40 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Email (Read Only) */}
            <div className="mb-6 p-4 rounded-2xl bg-[#F4EFEA]/50 border border-[#E8DFD8]">
              <div className="flex items-center gap-3 text-secondary/60 mb-1">
                <EnvelopeSimple size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Correo Electrónico (Solo Lectura)</span>
              </div>
              <p className="text-secondary font-medium ml-8">{user?.email}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary/80 mb-2">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary placeholder:text-secondary/40 focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary/80 mb-2">Apellidos</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary placeholder:text-secondary/40 focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                  placeholder="Tus apellidos"
                />
              </div>

              {message.content && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {message.content}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-secondary bg-secondary/5 hover:bg-secondary/10 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}