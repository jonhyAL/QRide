import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash } from 'lucide-react';
import { Heartbeat } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

const COMMON_ALLERGIES = ['Penicilina', 'Látex', 'Aspirina', 'AINEs', 'Ninguna'];
const COMMON_CONDITIONS = ['Asma', 'Diabetes', 'Hipertensión', 'Epilepsia', 'Ninguna'];

export function MedicalRecordModal({ isOpen, onClose, user, medicalRecord, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    blood_type: '',
    height: '',
    weight: '',
    medications: '',
    medical_notes: '',
  });

  // Checkboxes state
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [otherAllergy, setOtherAllergy] = useState('');
  const [showOtherAllergy, setShowOtherAllergy] = useState(false);

  const [selectedConditions, setSelectedConditions] = useState([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [showOtherCondition, setShowOtherCondition] = useState(false);

  // Hospitals state
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    if (medicalRecord) {
      setFormData({
        blood_type: medicalRecord.blood_type || '',
        height: medicalRecord.height || '',
        weight: medicalRecord.weight || '',
        medications: medicalRecord.medications || '',
        medical_notes: medicalRecord.medical_notes || '',
      });

      // Parse JSONBs
      try {
        const allergies = medicalRecord.allergies_list || [];
        const commonA = allergies.filter(a => COMMON_ALLERGIES.includes(a));
        const otherA = allergies.find(a => !COMMON_ALLERGIES.includes(a));
        setSelectedAllergies(commonA);
        if (otherA) {
          setShowOtherAllergy(true);
          setOtherAllergy(otherA);
        }

        const conditions = medicalRecord.chronic_conditions_list || [];
        const commonC = conditions.filter(c => COMMON_CONDITIONS.includes(c));
        const otherC = conditions.find(c => !COMMON_CONDITIONS.includes(c));
        setSelectedConditions(commonC);
        if (otherC) {
          setShowOtherCondition(true);
          setOtherCondition(otherC);
        }

        // Migrate old logic or use new
        const hList = medicalRecord.hospitals_list || [];
        if (hList.length === 0 && (medicalRecord.nss || medicalRecord.preferred_hospital)) {
            hList.push({
                id: Date.now(),
                name: medicalRecord.preferred_hospital || 'Hospital sin nombre',
                nss: medicalRecord.nss || '',
                is_primary: true
            });
        }
        setHospitals(hList);
      } catch (e) {
        console.error('Error parsing JSONBs', e);
      }
    }
  }, [medicalRecord]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (value, state, setter, setOtherShow) => {
    if (value === 'Ninguna') {
        setter(['Ninguna']);
        if(setOtherShow) setOtherShow(false);
        return;
    }
    
    if (state.includes('Ninguna')) {
        setter([value]);
    } else if (state.includes(value)) {
        setter(state.filter(item => item !== value));
    } else {
        setter([...state, value]);
    }
  };

  const addHospital = () => {
    setHospitals([...hospitals, { id: Date.now(), name: '', nss: '', is_primary: hospitals.length === 0 }]);
  };

  const updateHospital = (id, field, value) => {
    setHospitals(hospitals.map(h => {
        if (h.id === id) {
            return { ...h, [field]: value };
        }
        return h;
    }));
  };

  const setPrimaryHospital = (id) => {
    setHospitals(hospitals.map(h => ({
        ...h,
        is_primary: h.id === id
    })));
  };

  const removeHospital = (id) => {
    setHospitals(hospitals.filter(h => h.id !== id));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalAllergies = [...selectedAllergies];
      if (showOtherAllergy && otherAllergy.trim()) finalAllergies.push(otherAllergy.trim());

      const finalConditions = [...selectedConditions];
      if (showOtherCondition && otherCondition.trim()) finalConditions.push(otherCondition.trim());

      const dataToSave = {
        user_id: user.id,
        blood_type: formData.blood_type,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        allergies_list: finalAllergies,
        chronic_conditions_list: finalConditions,
        hospitals_list: hospitals,
        medications: formData.medications,
        medical_notes: formData.medical_notes,
        updated_at: new Date().toISOString(),
      };

      if (medicalRecord?.id) {
        const { error } = await supabase.from('medical_records').update(dataToSave).eq('id', medicalRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('medical_records').insert([dataToSave]);
        if (error) throw error;
      }

      onSave(); 
      onClose(); 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pt-20">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-secondary/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-6 md:p-8 z-10 max-h-[85vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Heartbeat size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-secondary">Ficha Médica</h2>
                <p className="text-gray-500 text-sm font-medium">Actualiza datos para emergencias.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Biometrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Sangre</label>
                  <select name="blood_type" value={formData.blood_type} onChange={handleChange} className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none">
                    <option value="">Selecciona...</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estatura (m)</label>
                  <input type="number" step="0.01" name="height" placeholder="Ej. 1.75" value={formData.height} onChange={handleChange} className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Peso (kg)</label>
                  <input type="number" step="0.1" name="weight" placeholder="Ej. 72.5" value={formData.weight} onChange={handleChange} className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-bold focus:ring-2 focus:ring-primary focus:bg-white outline-none"/>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Alergias</label>
                <div className="flex flex-wrap gap-3">
                  {COMMON_ALLERGIES.map(allergy => (
                    <label key={allergy} className="flex items-center gap-2 cursor-pointer bg-bg-light px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedAllergies.includes(allergy)}
                        onChange={() => handleCheckboxChange(allergy, selectedAllergies, setSelectedAllergies, allergy === 'Ninguna' ? setShowOtherAllergy : null)}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-sm font-medium text-secondary">{allergy}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer bg-bg-light px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showOtherAllergy}
                      onChange={(e) => {
                          setShowOtherAllergy(e.target.checked);
                          if(e.target.checked) {
                              setSelectedAllergies(selectedAllergies.filter(a => a !== 'Ninguna'));
                          } else {
                              setOtherAllergy('');
                          }
                      }}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-sm font-medium text-secondary">Otra</span>
                  </label>
                </div>
                {showOtherAllergy && (
                    <motion.input 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        type="text" placeholder="Especifica otra alergia..." value={otherAllergy} onChange={e => setOtherAllergy(e.target.value)}
                        className="mt-3 w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white outline-none"
                    />
                )}
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Enfermedades Crónicas</label>
                <div className="flex flex-wrap gap-3">
                  {COMMON_CONDITIONS.map(cond => (
                    <label key={cond} className="flex items-center gap-2 cursor-pointer bg-bg-light px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedConditions.includes(cond)}
                        onChange={() => handleCheckboxChange(cond, selectedConditions, setSelectedConditions, cond === 'Ninguna' ? setShowOtherCondition : null)}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-sm font-medium text-secondary">{cond}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer bg-bg-light px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showOtherCondition}
                      onChange={(e) => {
                          setShowOtherCondition(e.target.checked);
                          if(e.target.checked) {
                              setSelectedConditions(selectedConditions.filter(c => c !== 'Ninguna'));
                          } else {
                              setOtherCondition('');
                          }
                      }}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-sm font-medium text-secondary">Otra</span>
                  </label>
                </div>
                {showOtherCondition && (
                    <motion.input 
                         initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                         type="text" placeholder="Especifica otra enfermedad..." value={otherCondition} onChange={e => setOtherCondition(e.target.value)}
                         className="mt-3 w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white outline-none"
                    />
                )}
              </div>

              {/* Hospitals */}
              <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Hospitales / Clínicas / NSS</label>
                    <button type="button" onClick={addHospital} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> Añadir
                    </button>
                </div>
                
                <div className="space-y-4">
                    {hospitals.map((hospital, index) => (
                        <div key={hospital.id} className={`p-4 rounded-xl border-2 transition-colors ${hospital.is_primary ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="primary_hospital" checked={hospital.is_primary} onChange={() => setPrimaryHospital(hospital.id)} className="text-primary focus:ring-primary w-4 h-4" />
                                    <span className="text-sm font-bold text-secondary">Prioritario ⭐</span>
                                </label>
                                <button type="button" onClick={() => removeHospital(hospital.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors">
                                    <Trash size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Nombre de Hospital / Clínica" value={hospital.name} onChange={e => updateHospital(hospital.id, 'name', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none" required />
                                <input type="text" placeholder="NSS / Nro Seguro" value={hospital.nss} onChange={e => updateHospital(hospital.id, 'nss', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                        </div>
                    ))}
                    {hospitals.length === 0 && (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500 text-sm">No has agregado hospitales todavía.</p>
                        </div>
                    )}
                </div>
              </div>

              {/* Medications & Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Medicamentos Actuales</label>
                <textarea name="medications" placeholder="Medicamentos regulares..." rows="2" value={formData.medications} onChange={handleChange} className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white outline-none resize-none"></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas Médicas Adicionales</label>
                <textarea name="medical_notes" placeholder="Instrucciones en caso de emergencia..." rows="2" value={formData.medical_notes} onChange={handleChange} className="w-full bg-bg-light border-none rounded-xl px-4 py-3.5 text-secondary font-medium focus:ring-2 focus:ring-primary focus:bg-white outline-none resize-none"></textarea>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-opacity-90 transition-colors shadow-md shadow-primary/20 flex justify-center items-center">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Guardar Ficha'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
