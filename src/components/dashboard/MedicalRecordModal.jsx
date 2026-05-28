import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heartbeat } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

export function MedicalRecordModal({ isOpen, onClose, user, medicalRecord, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    blood_type: '',
    height: '',
    weight: '',
    allergies: '',
    medications: '',
    chronic_conditions: '',
    nss: '',
    preferred_hospital: '',
    medical_notes: '',
  });

  useEffect(() => {
    if (medicalRecord) {
      setFormData({
        blood_type: medicalRecord.blood_type || '',
        height: medicalRecord.height || '',
        weight: medicalRecord.weight || '',
        allergies: medicalRecord.allergies || '',
        medications: medicalRecord.medications || '',
        chronic_conditions: medicalRecord.chronic_conditions || '',
        nss: medicalRecord.nss || '',
        preferred_hospital: medicalRecord.preferred_hospital || '',
        medical_notes: medicalRecord.medical_notes || '',
      });
    }
  }, [medicalRecord]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        user_id: user.id,
        blood_type: formData.blood_type,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        allergies: formData.allergies,
        medications: formData.medications,
        chronic_conditions: formData.chronic_conditions,
        nss: formData.nss,
        preferred_hospital: formData.preferred_hospital,
        medical_notes: formData.medical_notes,
        updated_at: new Date().toISOString(),
      };

      if (medicalRecord?.id) {
        // Actualizar existente
        const { error } = await supabase
          .from('medical_records')
          .update(dataToSave)
          .eq('id', medicalRecord.id);
        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('medical_records')
          .insert([dataToSave]);
        if (error) throw error;
      }

      onSave(); // Refrescar datos en el dashboard
      onClose(); // Cerrar modal
    } catch (error) {
      console.error('Error saving medical record:', error);
      alert('Hubo un error al guardar la ficha médica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Overlay oscuro */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
              <X size={20} weight="bold" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Heartbeat size={28} weight="fill" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-secondary">Editar Ficha Médica</h2>
                <p className="text-gray-500 text-sm font-medium">Actualiza tus datos para emergencias.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tipo de Sangre */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Sangre</label>
                  <select
                    name="blood_type" value={formData.blood_type} onChange={handleChange}
                    className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                  >
                    <option value="">Selecciona...</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Estatura */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estatura (m)</label>
                  <input
                    type="number" step="0.01" name="height" placeholder="Ej. 1.75"
                    value={formData.height} onChange={handleChange}
                    className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                  />
                </div>

                {/* Peso */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Peso (kg)</label>
                  <input
                    type="number" step="0.1" name="weight" placeholder="Ej. 72.5"
                    value={formData.weight} onChange={handleChange}
                    className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Alergias */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alergias</label>
                <textarea
                  name="allergies" placeholder="Lista tus alergias conocidas..." rows="2"
                  value={formData.allergies} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none"
                ></textarea>
              </div>

              {/* Medicamentos */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Medicamentos Actuales</label>
                <textarea
                  name="medications" placeholder="Medicamentos que tomas regularmente..." rows="2"
                  value={formData.medications} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none"
                ></textarea>
              </div>

              {/* Enfermedades Crónicas */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Enfermedades Crónicas</label>
                <textarea
                  name="chronic_conditions" placeholder="Ej. Asma, Diabetes, Hipertensión..." rows="2"
                  value={formData.chronic_conditions} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none"
                ></textarea>
              </div>

              {/* IMSS e Información de Emergencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Número de Seguro Social (NSS/IMSS)</label>
                  <input
                    type="text" name="nss" placeholder="Ej. 12345678901"
                    value={formData.nss} onChange={handleChange}
                    className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hospital/Clínica Preferida</label>
                  <input
                    type="text" name="preferred_hospital" placeholder="Ej. HGZ 1 IMSS / Hospital Ángeles"
                    value={formData.preferred_hospital} onChange={handleChange}
                    className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Notas e instrucciones médicas */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instrucciones Especiales / Notas Médicas</label>
                <textarea
                  name="medical_notes" placeholder="Ej. En caso de emergencia administrar Epinefrina, etc..." rows="2"
                  value={formData.medical_notes} onChange={handleChange}
                  className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none"
                ></textarea>
              </div>

              {/* Acciones */}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-opacity-90 transition-colors shadow-md shadow-primary/20 flex justify-center items-center">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Guardar Ficha'
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
