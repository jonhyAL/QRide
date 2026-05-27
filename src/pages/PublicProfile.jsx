import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heartbeat, Drop, Ruler, Scales, Phone } from '@phosphor-icons/react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PublicProfile() {
  const { id } = useParams();
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [recordRes, contactsRes] = await Promise.all([
          supabase.from('medical_records').select('*').eq('user_id', id).single(),
          supabase.from('emergency_contacts').select('*').eq('user_id', id)
        ]);

        if (recordRes.error && recordRes.error.code !== 'PGRST116') {
          throw new Error('Error al cargar la ficha médica');
        }
        
        setMedicalRecord(recordRes.data);
        setContacts(contactsRes.data || []);
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

  return (
    <div className="min-h-screen bg-red-600 text-white font-sans selection:bg-black selection:text-white">
      {/* Banner de Emergencia */}
      <div className="bg-black/20 backdrop-blur-md sticky top-0 z-50 p-4 text-center border-b border-white/10 shadow-xl">
        <p className="font-black text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-2">
          <Heartbeat size={20} weight="fill" className="animate-pulse" />
          Perfil de Emergencia Médico
        </p>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
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

        {contacts.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white text-secondary rounded-[2rem] p-6 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black mb-4">Contactos de Emergencia</h2>
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

      </div>
    </div>
  );
}