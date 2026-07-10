import { CAR_BRANDS, CAR_MODELS, CAR_YEARS, MOTO_BRANDS, MOTO_MODELS } from '../../utils/catalogs';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Info, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function VehiclesModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    type: 'auto',
    brand: '',
    model: '',
    year: '',
    plate: '',
    insurance_name: '',
    policy_number: '',
    vin: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchVehicles();
    }
  }, [isOpen, user]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const vehiclePayload = {
        user_id: user.id,
        type: formData.type,
        make: formData.brand,
        model: formData.model,
        year: formData.year,
        plates: formData.plate,
        insurance_provider: formData.insurance_name,
        policy_number: formData.policy_number,
        vin: formData.vin,
        is_active_qr: true
      };

      if (editingId) {
        const { data, error } = await supabase
          .from('vehicles')
          .update(vehiclePayload)
          .eq('id', editingId)
          .select();
        if (error) throw error;
        setVehicles(vehicles.map(v => v.id === editingId ? data[0] : v));
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .insert([vehiclePayload])
          .select();
        if (error) throw error;
        setVehicles([data[0], ...vehicles]);
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData({
        type: 'auto', brand: '', model: '', year: '', plate: '', insurance_name: '', policy_number: '', vin: ''
      });
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Error de base de datos: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (v) => {
    setFormData({
      type: v.type || 'auto',
      brand: v.make || '',
      model: v.model || '',
      year: v.year || '',
      plate: v.plates || '',
      insurance_name: v.insurance_provider || '',
      policy_number: v.policy_number || '',
      vin: v.vin || ''
    });
    setEditingId(v.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Error eliminando vehículo: ' + error.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#F4EFEA] w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            <div className="bg-white p-6 border-b border-[#E8DFD8] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Car size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary">Mis Vehículos</h3>
                  <p className="text-sm text-secondary/60">Gestiona los vehículos para tu código QR</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-secondary/40 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!isAdding && (
                <div className="space-y-4">
                  {vehicles.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-[#E8DFD8]">
                      <Car size={40} className="mx-auto text-secondary/20 mb-3" />
                      <p className="text-secondary/60 font-medium">No tienes vehículos registrados</p>
                    </div>
                  ) : (
                    vehicles.map(v => (
                      <div key={v.id} className="bg-white p-4 rounded-2xl border border-[#E8DFD8] flex justify-between items-center group">
                        <div>
                          <p className="font-bold">{v.make} {v.model} ({v.year})</p>
                          <p className="text-xs text-secondary/60">Placa: {v.plates} • Seguro: {v.insurance_provider || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(v)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors">
                              Editar
                            </button>
                            <button onClick={() => handleDelete(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              Eliminar
                            </button>
                          </div>
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap">
                            Activo
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-dashed border-[#E8DFD8] text-primary font-bold hover:bg-primary/5 transition-colors"
                  >
                    <Plus size={20} /> Agregar Vehículo
                  </button>
                </div>
              )}

              {isAdding && (
                <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-2xl border border-[#E8DFD8]">
                  <div className="flex justify-between items-center border-b border-[#E8DFD8] pb-4">
                    <h4 className="font-black text-lg">{editingId ? 'Editar Vehículo' : 'Datos del Vehículo'}</h4>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingId(null);
                        setFormData({ type: 'auto', brand: '', model: '', year: '', plate: '', insurance_name: '', policy_number: '', vin: '' });
                      }}
                      className="text-sm font-bold text-secondary/50 hover:text-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Tipo</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                      >
                        <option value="auto">Auto</option>
                        <option value="moto">Moto</option>
                        <option value="scooter">Scooter</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="patinete">Patinete Eléctrico</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Marca</label>
                      <select
                          required
                          value={formData.brand}
                          onChange={(e) => setFormData({...formData, brand: e.target.value, model: ''})}
                          className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Selecciona Marca...</option>
                          {formData.type === 'moto' ? MOTO_BRANDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          )) : CAR_BRANDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Otra">Otra / No Aplicable</option>
                        </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Modelo</label>
                      {formData.brand && (
                          (formData.type === 'moto' && MOTO_MODELS[formData.brand]) ||
                          (formData.type !== 'moto' && CAR_MODELS[formData.brand]) 
                        ) ? (
                            <select
                                required
                                value={formData.model}
                                onChange={(e) => setFormData({...formData, model: e.target.value})}
                                className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Selecciona Modelo...</option>
                                {formData.type === 'moto' 
                                  ? MOTO_MODELS[formData.brand].map(m => <option key={m} value={m}>{m}</option>)
                                  : CAR_MODELS[formData.brand].map(m => <option key={m} value={m}>{m}</option>)
                                }
                                <option value="Otro">Otro Modelo...</option>
                            </select>
                        ) : (
                            <input 
                              type="text" required
                              value={formData.model}
                              onChange={(e) => setFormData({...formData, model: e.target.value})}
                              className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                              placeholder="Escribe el modelo..."
                            />
                        )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Año</label>
                      <select
                          required
                          value={formData.year}
                          onChange={(e) => setFormData({...formData, year: e.target.value})}
                          className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Selecciona Año...</option>
                          {CAR_YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-secondary/80 mb-2">
                          Placa (Matrícula)
                          {['bicicleta', 'patinete', 'scooter'].includes(formData.type) && ' (Opcional)'}
                        </label>
                        <input 
                          type="text"
                          value={formData.plate}
                          onChange={(e) => setFormData({...formData, plate: e.target.value})}
                          className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                          placeholder={['bicicleta', 'patinete', 'scooter'].includes(formData.type) ? "No aplica" : "Ej. AB-1234-C"}
                          required={!['bicicleta', 'patinete', 'scooter'].includes(formData.type)}
                      />
                    </div>
                  </div>

                  <h4 className="font-black text-lg border-b border-[#E8DFD8] pb-2 mt-6 mb-4">Seguro e Identificación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Aseguradora</label>
                      <input 
                        type="text"
                        value={formData.insurance_name}
                        onChange={(e) => setFormData({...formData, insurance_name: e.target.value})}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                        placeholder="Nombre del seguro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Número de Póliza</label>
                      <input 
                        type="text"
                        value={formData.policy_number}
                        onChange={(e) => setFormData({...formData, policy_number: e.target.value})}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                        placeholder="Ej. POL-999-888"
                      />
                    </div>
                    <div className="md:col-span-2 mb-2">
                      <label className="block text-sm font-bold text-secondary/80 mb-2">VIN / Número de Serie (Opcional)</label>
                      <input 
                        type="text"
                        value={formData.vin}
                        onChange={(e) => setFormData({...formData, vin: e.target.value})}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3 text-secondary focus:ring-2 focus:ring-primary"
                        placeholder="Identificación única del vehículo"
                      />
                      <p className="text-xs text-secondary/50 mt-1 flex items-center gap-1"><Info size={12}/> Ayuda a descartar vehículos robados</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#E8DFD8]">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 px-4 rounded-xl font-bold text-secondary bg-secondary/5 hover:bg-secondary/10">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50">Guardar Vehículo</button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}