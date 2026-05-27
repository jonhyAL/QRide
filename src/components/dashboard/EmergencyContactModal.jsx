import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

export function EmergencyContactModal({ isOpen, onClose, user, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .insert([{
          user_id: user.id,
          name: formData.name,
          relationship: formData.relationship,
          phone: formData.phone,
        }]);

      if (error) throw error;

      setFormData({ name: '', relationship: '', phone: '' }); // Limpiar formulario
      onSave(); // Refrescar datos en el dashboard
      onClose(); // Cerrar modal
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      alert('Hubo un error al guardar el contacto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay oscuro */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 z-10"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
              <X size={20} weight="bold" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                <Phone size={28} weight="fill" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-secondary">Añadir Contacto</h2>
                <p className="text-gray-500 text-sm font-medium">Alguien a quien avisar en emergencia.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input
                  type="text" name="name" required placeholder="Ej. Carlos Ruiz"
                  value={formData.name} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Relación */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Relación / Parentesco</label>
                <input
                  type="text" name="relationship" required placeholder="Ej. Esposo, Madre, Amigo"
                  value={formData.relationship} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Número de Teléfono</label>
                <input
                  type="tel" name="phone" required placeholder="Ej. +34 600..."
                  value={formData.phone} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-4 pt-4 mt-6">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-opacity-90 transition-colors shadow-md shadow-primary/20 flex justify-center items-center">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}