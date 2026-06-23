import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heartbeat, Drop, Ruler, Scales, ShieldPlus, FirstAid } from '@phosphor-icons/react';
import { AlertCircle, User, Car, FileText, Phone, Sparkles, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingShapes } from '../components/ui/floating-shapes';

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [profileRes, recordRes, contactsRes, vehiclesRes, docsRes] = await Promise.all([
          supabase.rpc('get_public_profile', { p_id: id }),
          supabase.from('medical_records').select('*').eq('user_id', id).maybeSingle(),
          supabase.from('emergency_contacts').select('*').eq('user_id', id),
          supabase.from('vehicles').select('*').eq('user_id', id).eq('is_active_qr', true),
          supabase.from('user_documents').select('*').eq('user_id', id)
        ]);

        if (recordRes.error && recordRes.error.code !== 'PGRST116') {
          throw new Error('Error al cargar la ficha médica');
        }
        
        setProfile(profileRes.data || {});
        
        const medRecord = recordRes.data || {};
        setMedicalRecord(medRecord);
        
        setContacts(contactsRes.data || []);
        setVehicles(vehiclesRes.data || []);
        setDocuments(docsRes.data || []);

        try {
            setAllergies(medRecord.allergies_list || []);
            setConditions(medRecord.chronic_conditions_list || []);
            
            const hList = medRecord.hospitals_list || [];
            if (hList.length === 0 && (medRecord.nss || medRecord.preferred_hospital)) {
                hList.push({
                    id: 1,
                    name: medRecord.preferred_hospital || 'Hospital',
                    nss: medRecord.nss || '',
                    is_primary: true
                });
            }
            setHospitals(hList);
        } catch(e) {}

      } catch (err) {
        console.error(err);
        setError('No se pudo acceder a la información de este código QR.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPublicData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (error || !medicalRecord) return (
    <div className="min-h-screen bg-[#F4EFEA] flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={64} className="text-gray-400 mb-4" />
      <h1 className="text-2xl font-black text-secondary mb-2">Perfil No Encontrado</h1>
      <p className="text-gray-500 font-medium">Este código QRide no existe o la información no está disponible.</p>
    </div>
  );

  const globalEmergencyNumbers = [
    { name: 'Emergencias Integrales', phone: '911', icon: <FirstAid size={24} weight="fill" />, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { name: 'Policía / Denuncia', phone: '089', icon: <ShieldPlus size={24} weight="fill" />, color: 'bg-blue-600 hover:bg-blue-700' }
  ];

  const primaryHospital = hospitals.find(h => h.is_primary) || hospitals[0];
  const otherHospitals = hospitals.filter(h => h.id !== primaryHospital?.id);

  return (
    <div className="min-h-screen bg-sky-900 text-white font-sans selection:bg-black selection:text-white pb-28 relative overflow-hidden">
      <FloatingShapes variant="emergency" />
      <div className="bg-white/10 backdrop-blur-md sticky top-0 z-50 p-4 text-center border-b border-white/10 shadow-xl">
        <p className="font-black text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-2">
          <FirstAid size={20} weight="fill" className="text-emerald-400" />
          Ficha de Rescate y Asistencia
        </p>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 relative z-10">
        
        {/* Profile Info Header */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center text-center mb-8 pt-4">
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-white/10 backdrop-blur-sm border-4 border-white/40 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-white/70" />
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md flex items-center gap-2 justify-center">
            {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Alguien que precisa apoyo'}
          </h1>
        </motion.div>

        {/* Telefónos Globales de Emergencia */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
          <h2 className="text-xl md:text-2xl font-black mb-4 border-b border-gray-100 pb-4">Teléfonos de Ayuda Rápida</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {globalEmergencyNumbers.map((num, i) => (
              <a key={i} href={`tel:${num.phone.replace(/\s+/g, '')}`} className={`${num.color} text-white p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 shadow-md`}>
                <div className="p-2 bg-white/20 rounded-xl">
                  {num.icon}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold opacity-80">{num.name}</p>
                  <p className="text-lg font-black">{num.phone}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-black mb-6 border-b border-gray-100 pb-4">Datos Biométricos</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-rose-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Drop size={24} weight="fill" className="text-rose-500 mb-1" />
              <span className="text-[10px] font-extrabold text-rose-900/50 uppercase tracking-widest mb-1">Sangre</span>
              <span className="text-2xl font-black text-rose-950">{medicalRecord.blood_type || '--'}</span>
            </div>
            <div className="bg-emerald-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Scales size={24} weight="fill" className="text-emerald-500 mb-1" />
              <span className="text-[10px] font-extrabold text-emerald-900/50 uppercase tracking-widest mb-1">Peso</span>
              <span className="text-2xl font-black text-emerald-950 flex items-baseline gap-1">{medicalRecord.weight || '--'}<span className="text-sm font-bold text-emerald-900/50">kg</span></span>
            </div>
            <div className="bg-sky-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Ruler size={24} weight="fill" className="text-sky-500 mb-1" />
              <span className="text-[10px] font-extrabold text-sky-900/50 uppercase tracking-widest mb-1">Estatura</span>
              <span className="text-2xl font-black text-sky-950 flex items-baseline gap-1">{medicalRecord.height || '--'}<span className="text-sm font-bold text-sky-900/50">m</span></span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
              {/* Alergias */}
              {allergies.length > 0 && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <h4 className="text-orange-800 font-extrabold text-xs uppercase tracking-widest mb-2">Alergias Detectadas</h4>
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a, i) => (
                      <span key={i} className="bg-orange-200 text-orange-950 px-3 py-1 rounded-lg text-sm font-bold">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Enfermedades Crónicas */}
              {conditions.length > 0 && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <h4 className="text-blue-800 font-extrabold text-xs uppercase tracking-widest mb-2">Padecimientos Crónicos</h4>
                  <div className="flex flex-wrap gap-2">
                    {conditions.map((c, i) => (
                      <span key={i} className="bg-blue-200 text-blue-950 px-3 py-1 rounded-lg text-sm font-bold">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {medicalRecord.medications && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <h4 className="text-emerald-800 font-extrabold text-xs uppercase tracking-widest mb-1">Tratamiento Actual</h4>
                  <p className="text-emerald-950 font-bold whitespace-pre-wrap">{medicalRecord.medications}</p>
                </div>
              )}
          </div>
        </motion.div>

        {primaryHospital && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4">Información Hospitalaria</h2>
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 mb-4">
              <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1 mb-1">
                ⭐ Hospital Prioritario
              </span>
              <h3 className="font-black text-xl text-indigo-950">{primaryHospital.name}</h3>
              {primaryHospital.nss && <p className="text-sm font-medium text-indigo-800 mt-1">NSS / Seguro: <strong>{primaryHospital.nss}</strong></p>}
            </div>

            {otherHospitals.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Otras opciones inscritas</h4>
                <div className="space-y-2">
                  {otherHospitals.map((h, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex justify-between items-center">
                      <span className="font-bold text-gray-700">{h.name}</span>
                      {h.nss && <span className="text-xs font-medium text-gray-500">NSS: {h.nss}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {contacts?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4">Red de Contactos Vitales</h2>
            <div className="space-y-4">
              {contacts.map(contact => (
                <div key={contact.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-lg">{contact.name}</h3>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{contact.relationship}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <a href={`tel:${contact.phone}`} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 transition-colors text-white py-2.5 px-6 rounded-xl font-bold w-full shadow-sm">
                        <Phone size={18} weight="fill" />
                        Llamar Principal
                      </a>
                      {contact.secondary_phone && (
                        <a href={`tel:${contact.secondary_phone}`} className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-slate-800 py-2.5 px-6 rounded-xl font-bold w-full shadow-sm">
                          <Phone size={18} />
                          Alternativo
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {vehicles?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4 flex items-center gap-2">
              <Car size={24} className="text-blue-500"/> Vehículo en Uso
            </h2>
            <div className="space-y-3">
              {vehicles.map(v => (
                <div key={v.id} className="bg-sky-50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-sky-100">
                  <div>
                    <h3 className="font-bold text-lg">{v.make} {v.model} ({v.year})</h3>
                    {v.plates && <p className="text-sm font-medium text-sky-700">Placas: {v.plates}</p>}
                    {!v.plates && <p className="text-sm font-medium text-gray-500 italic">Vehículo sin placa</p>}
                  </div>
                  {(v.insurance_provider || v.policy_number) && (
                    <div className="md:text-right border-l-2 border-sky-200 pl-4 md:border-l-0 md:pl-0">
                      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Aseguradora</p>
                      <p className="font-bold text-sky-950">{v.insurance_provider || 'Sin especificar'}</p>
                      {v.policy_number && <p className="text-xs text-sky-800">Pol: {v.policy_number}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
