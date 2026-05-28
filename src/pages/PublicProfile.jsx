import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heartbeat, Drop, Ruler, Scales, Phone, WarningCircle, ShieldPlus } from '@phosphor-icons/react';
import { AlertCircle, User, Car, FileText, Lock, Sparkles, X, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [documents, setDocuments] = useState([]);
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
        setMedicalRecord(recordRes.data || {});
        setContacts(contactsRes.data || []);
        setVehicles(vehiclesRes.data || []);
        setDocuments(docsRes.data || []);
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
    <div className="min-h-screen bg-red-600 flex items-center justify-center">
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
    { name: 'Emergencias', phone: '911', icon: <WarningCircle size={24} weight="fill" />, color: 'bg-red-500 hover:bg-red-600' },
    { name: 'Policía / Denuncia', phone: '089', icon: <ShieldPlus size={24} weight="fill" />, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Atención IMSS', phone: '800 623 2323', icon: <Heartbeat size={24} weight="fill" />, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { name: 'Atención ISSSTE', phone: '55 4000 1000', icon: <Heartbeat size={24} weight="fill" />, color: 'bg-teal-600 hover:bg-teal-700' },
  ];

  return (
    <div className="min-h-screen bg-red-600 text-white font-sans selection:bg-black selection:text-white pb-28">
      <div className="bg-black/20 backdrop-blur-md sticky top-0 z-50 p-4 text-center border-b border-white/10 shadow-xl">
        <p className="font-black text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-2">
          <Heartbeat size={20} weight="fill" className="animate-pulse" />
          Perfil de Emergencia
        </p>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        
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
          <h2 className="text-xl md:text-2xl font-black mb-4 border-b border-gray-100 pb-4">Teléfonos de Ayuda Oficial</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {globalEmergencyNumbers.map((num, i) => (
              <a key={i} href={`tel:${num.phone.replace(/\s+/g, '')}`} className={`${num.color} text-white p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-95 shadow-md`}>
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
          <h2 className="text-2xl md:text-3xl font-black mb-6 border-b border-gray-100 pb-4">Ficha Vital</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Drop size={24} weight="fill" className="text-red-500 mb-1" />
              <span className="text-[10px] font-extrabold text-red-900/50 uppercase tracking-widest mb-1">Sangre</span>
              <span className="text-2xl font-black text-red-950">{medicalRecord.blood_type || '--'}</span>
            </div>
            <div className="bg-emerald-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Scales size={24} weight="fill" className="text-emerald-500 mb-1" />
              <span className="text-[10px] font-extrabold text-emerald-900/50 uppercase tracking-widest mb-1">Peso</span>
              <span className="text-2xl font-black text-emerald-950 flex items-baseline gap-1">{medicalRecord.weight || '--'}<span className="text-sm font-bold text-emerald-900/50">kg</span></span>
            </div>
            <div className="bg-blue-50 p-4 justify-center items-center flex flex-col rounded-2xl">
              <Ruler size={24} weight="fill" className="text-blue-500 mb-1" />
              <span className="text-[10px] font-extrabold text-blue-900/50 uppercase tracking-widest mb-1">Estatura</span>
              <span className="text-2xl font-black text-blue-950 flex items-baseline gap-1">{medicalRecord.height || '--'}<span className="text-sm font-bold text-blue-900/50">m</span></span>
            </div>
          </div>

          {(medicalRecord.allergies || medicalRecord.medications || medicalRecord.chronic_conditions) && (
            <div className="mt-6 space-y-4">
              {medicalRecord.allergies && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <h4 className="text-orange-800 font-extrabold text-xs uppercase tracking-widest mb-1">Alergias</h4>
                  <p className="text-orange-950 font-bold whitespace-pre-wrap">{medicalRecord.allergies}</p>
                </div>
              )}
              {medicalRecord.medications && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <h4 className="text-blue-800 font-extrabold text-xs uppercase tracking-widest mb-1">Medicamentos Actuales</h4>
                  <p className="text-blue-950 font-bold whitespace-pre-wrap">{medicalRecord.medications}</p>
                </div>
              )}
              {medicalRecord.chronic_conditions && (
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <h4 className="text-red-800 font-extrabold text-xs uppercase tracking-widest mb-1">Enfermedades Crónicas</h4>
                  <p className="text-red-950 font-bold whitespace-pre-wrap">{medicalRecord.chronic_conditions}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {contacts?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4">Contactos de Emergencia Personales</h2>
            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="bg-bg-light rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-100">
                  <div>
                    <h3 className="font-black text-lg">{contact.name}</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{contact.relationship}</p>
                  </div>
                  <a href={`tel:${contact.phone}`} className="flex items-center justify-center gap-2 bg-black hover:bg-black/80 transition-colors text-white py-3 px-6 rounded-xl font-bold w-full md:w-auto shadow-md">
                    <Phone size={20} weight="fill" />
                    Llamar al Contacto
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {vehicles?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4 flex items-center gap-2">
              <Car size={24} className="text-blue-500"/> Vehículos Asociados
            </h2>
            <div className="space-y-3">
              {vehicles.map(v => (
                <div key={v.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-200">
                  <div>
                    <h3 className="font-bold text-lg">{v.make} {v.model} ({v.year})</h3>
                    <p className="text-sm font-medium text-blue-500">{v.plates}</p>
                  </div>
                  {(v.insurance_provider || v.policy_number) && (
                    <div className="md:text-right border-l-2 border-blue-500/20 pl-4 md:border-l-0 md:pl-0">
                      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Seguro</p>
                      <p className="font-bold">{v.insurance_provider || 'Sin especificar'}</p>
                      {v.policy_number && <p className="text-xs">Pol: {v.policy_number}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {documents?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                <FileText size={24} className="text-purple-500"/> Documentos Subidos
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => {
                return (
                  <button key={doc.id} onClick={async () => {
                    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    else alert('No se pudo abrir el documento.');
                  }} className="bg-gray-50 hover:bg-purple-50 text-left rounded-2xl p-4 flex items-center gap-3 border border-gray-200 transition-all active:scale-95">
                    <div className="bg-red-100 text-red-500 p-2 rounded-xl"><FileText size={20}/></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{doc.title}</p>
                      <p className="text-xs opacity-60 uppercase">{doc.document_type || 'PDF'}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

      </div>

      {/* Burbuja Flotante del Chatbot QRide AI */}
      <AnimatePresence>
        {isChatbotOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, type: "spring" }}
            className="fixed bottom-24 right-6 w-full max-w-[360px] z-50"
          >
            <div className="bg-[#2C254D] bg-gradient-to-br from-[#1C1A27] to-[#2C254D] rounded-[2rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-primary/30 rounded-full blur-[3rem]"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white">
                      <Sparkles size={24} className="text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                        QRide AI
                        <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">BETA</span>
                      </h3>
                      <p className="text-sm font-medium text-gray-300">Asistente personal</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsChatbotOpen(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/5 rounded-[1.5rem] p-5 mb-5 rounded-tl-sm h-[180px] overflow-y-auto">
                  <p className="text-sm text-white/90 font-medium leading-relaxed">
                    ¡Hola! Soy QRide AI y estaré aquí para guiarte frente a esta emergencia o darte apoyo si eres el primero en responder. ¿Necesitas saber cómo reaccionar?
                  </p>
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Escribe aquí..." 
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-[1.25rem] pl-5 pr-14 py-3.5 text-white placeholder-gray-400 font-medium focus:outline-none transition-all cursor-not-allowed text-sm"
                  />
                  <button 
                    disabled
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white/10 rounded-xl text-white/50 opacity-60 cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#2C254D] text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 transition-all hover:shadow-[0_0_20px_rgba(44,37,77,0.5)]"
      >
        {isChatbotOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isChatbotOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#F4EFEA] animate-pulse"></span>
        )}
      </motion.button>

    </div>
  );
}
