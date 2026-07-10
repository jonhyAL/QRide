import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heartbeat, Drop, Ruler, Scales, ShieldPlus, FirstAid, HandHeart } from '@phosphor-icons/react';
import { AlertCircle, User, Car, Phone, FileText, StickyNote } from 'lucide-react';
import { motion } from 'framer-motion';

// Paleta del proyecto — todo en un solo lugar para no perder consistencia.
// Los dos tonos marcados como "derivado" no venían en la tabla; los saqué
// del mismo criterio que "Información" (#DBEAFE) y "Éxito" (#D1FAE5): un
// fondo suave + texto oscuro del mismo color, aplicado a "Emergencia".
const C = {
  bg: '#FAFBFC', card: '#FFFFFF', blue: '#2563EB', blueDark: '#1D4ED8', green: '#10B981',
  text: '#1F2937', textSoft: '#6B7280', border: '#E5E7EB',
  infoBg: '#DBEAFE', infoText: '#1D4ED8', successBg: '#D1FAE5', successText: '#047857',
  warningBg: '#FEF3C7', warningText: '#92400E', emergency: '#DC2626', emergencyDark: '#B91C1C',
  emergencyBg: '#FEF2F2', emergencyBorder: '#FECACA', emergencyText: '#991B1B', rowTint: '#F8FAFC',
};

// Sistema de "profundidad": entre más urgente la información, más elevada
// (sombra más grande, más cercana al usuario). El fondo es plano; las
// tarjetas normales flotan poco; la de alertas críticas flota más que todas.
const shadowStd = "shadow-[0_1px_3px_rgba(15,23,42,0.06),0_10px_24px_-12px_rgba(15,23,42,0.12)]";
const shadowLifted = "shadow-[0_2px_4px_rgba(37,99,235,0.08),0_16px_32px_-12px_rgba(37,99,235,0.22)]";
const shadowCritical = "shadow-[0_4px_10px_rgba(153,27,27,0.10),0_20px_44px_-14px_rgba(220,38,38,0.30)]";

const card = `bg-white border border-[#E5E7EB] border-l-4 border-l-[#2563EB] rounded-[1.5rem] p-6 ${shadowStd}`;
const cardTitle = "text-lg md:text-xl font-black text-[#1F2937] mb-4 flex items-center gap-2";
const hoverLift = "transition-all duration-200 hover:-translate-y-0.5";

// Entrada "desde el fondo hacia el usuario": escala + desplazamiento + opacidad
const depthIn = { initial: { y: 16, opacity: 0, scale: 0.97 }, animate: { y: 0, opacity: 1, scale: 1 } };

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
        } catch (e) {}

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
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-[#6B7280] uppercase tracking-widest">Cargando ficha…</p>
    </div>
  );

  if (error || !medicalRecord) return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={56} className="text-[#DC2626] mb-4" />
      <h1 className="text-2xl font-black text-[#1F2937] mb-2">Perfil no encontrado</h1>
      <p className="text-[#6B7280] font-medium max-w-sm">
        Este código QR no existe o la información no está disponible en este momento.
      </p>
    </div>
  );

  const globalEmergencyNumbers = [
    { name: 'Ambulancia / Emergencias', phone: '911', icon: <FirstAid size={26} weight="fill" />, color: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white' },
    { name: 'Denuncia / Policía', phone: '089', icon: <ShieldPlus size={26} weight="fill" />, color: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white' }
  ];

  const primaryHospital = hospitals.find(h => h.is_primary) || hospitals[0];
  const otherHospitals = hospitals.filter(h => h.id !== primaryHospital?.id);

  const allergiesText = allergies.length === 0 ? medicalRecord.allergies : null;
  const conditionsText = conditions.length === 0 ? medicalRecord.chronic_conditions : null;
  const hasNotes = !!medicalRecord.medical_notes;
  const hasCriticalAlerts = allergies.length > 0 || !!allergiesText || conditions.length > 0 || !!conditionsText || hasNotes;
  const isOrganDonor = !!medicalRecord.is_donor;
  const isBloodDonor = !!medicalRecord.blood_donor;

  const lastUpdatedRaw = medicalRecord?.updated_at || profile?.updated_at;
  const lastUpdated = lastUpdatedRaw
    ? new Date(lastUpdatedRaw).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#1F2937] font-sans pb-28 relative">

      {/* Resplandor ambiental: da profundidad de fondo sin distraer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 inset-x-0 h-80 z-0"
        style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(37,99,235,0.10), transparent 70%)' }}
      />

      {/* Header — vidrio azul flotando sobre el contenido al hacer scroll */}
      <div className="bg-[#2563EB]/95 backdrop-blur-md sticky top-0 z-40 p-4 text-center shadow-[0_4px_16px_rgba(37,99,235,0.25)]">
        <p className="font-black text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-2 text-white">
          <FirstAid size={20} weight="fill" className="text-white" />
          Ficha de Rescate y Asistencia
        </p>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 relative z-10">

        {/* Identidad + tipo de sangre — segundo nivel de elevación */}
        <motion.div {...depthIn} transition={{ duration: 0.4 }} className={`bg-white border border-[#E5E7EB] border-l-4 border-l-[#2563EB] rounded-[1.5rem] p-6 ${shadowLifted} flex items-center gap-4`}>
          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center overflow-hidden shadow-inner">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-[#2563EB]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-0.5">Persona</p>
            <h1 className="text-xl md:text-2xl font-black truncate">
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Alguien que necesita apoyo'}
            </h1>
          </div>
          <div className="shrink-0 text-center bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2 shadow-sm">
            <p className="text-[9px] font-extrabold text-[#991B1B] uppercase tracking-widest">Sangre</p>
            <p className="text-2xl font-black text-[#DC2626] font-mono leading-none mt-0.5">
              {medicalRecord.blood_type || '--'}
            </p>
          </div>
        </motion.div>

        {/* Estado de donación */}
        {(isOrganDonor || isBloodDonor) && (
          <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.05 }} className="flex flex-wrap gap-2">
            {isOrganDonor && (
              <span className="flex items-center gap-2 bg-[#D1FAE5] border border-[#6EE7B7] text-[#047857] px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                <HandHeart size={18} weight="fill" /> Donador de órganos
              </span>
            )}
            {isBloodDonor && (
              <span className="flex items-center gap-2 bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                <Drop size={18} weight="fill" /> Donador de sangre
              </span>
            )}
          </motion.div>
        )}

        {/* Alertas médicas críticas — nivel de elevación más alto: lo más cercano al usuario */}
        {hasCriticalAlerts && (
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{
              y: 0, opacity: 1, scale: 1,
              boxShadow: [
                '0 20px 44px -14px rgba(220,38,38,0.28)',
                '0 24px 52px -14px rgba(220,38,38,0.38)',
                '0 20px 44px -14px rgba(220,38,38,0.28)'
              ]
            }}
            transition={{
              y: { duration: 0.4, delay: 0.1 }, opacity: { duration: 0.4, delay: 0.1 }, scale: { duration: 0.4, delay: 0.1 },
              boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
            }}
            className="bg-[#FEF2F2] border-2 border-[#FECACA] rounded-[1.5rem] p-6"
          >
            <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2 text-[#991B1B]">
              <AlertCircle size={22} weight="fill" className="text-[#DC2626]" />
              Antes de actuar, lea esto
            </h2>

            {(allergies.length > 0 || allergiesText) && (
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-[#991B1B] uppercase tracking-widest mb-2">Alergias</h3>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a, i) => (
                      <span key={i} className="bg-[#DC2626] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#991B1B] font-bold text-sm whitespace-pre-wrap">{allergiesText}</p>
                )}
              </div>
            )}

            {(conditions.length > 0 || conditionsText) && (
              <div className={hasNotes ? "mb-4" : ""}>
                <h3 className="text-xs font-extrabold text-[#92400E] uppercase tracking-widest mb-2">Padecimientos crónicos</h3>
                {conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {conditions.map((c, i) => (
                      <span key={i} className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">{c}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#92400E] font-bold text-sm whitespace-pre-wrap">{conditionsText}</p>
                )}
              </div>
            )}

            {hasNotes && (
              <div>
                <h3 className="text-xs font-extrabold text-[#6B7280] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <StickyNote size={14} /> Notas médicas adicionales
                </h3>
                <p className="text-[#1F2937] font-medium text-sm bg-white border border-[#E5E7EB] rounded-xl p-3 whitespace-pre-wrap shadow-sm">
                  {medicalRecord.medical_notes}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Teléfonos de emergencia — segundo nivel de elevación (acción prioritaria) */}
        <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.15 }} className={`bg-white border border-[#E5E7EB] border-l-4 border-l-[#2563EB] rounded-[1.5rem] p-6 ${shadowLifted}`}>
          <h2 className={cardTitle}>Llamar ahora</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {globalEmergencyNumbers.map((num, i) => (
              <a
                key={i}
                href={`tel:${num.phone.replace(/\s+/g, '')}`}
                aria-label={`Llamar a ${num.name}, número ${num.phone}`}
                className={`${num.color} ${hoverLift} p-4 rounded-2xl flex items-center gap-4 active:scale-95 shadow-md hover:shadow-lg`}
              >
                <div className="p-2 bg-white/20 rounded-xl">{num.icon}</div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold opacity-90">{num.name}</p>
                  <p className="text-xl font-black">{num.phone}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Signos vitales + tratamiento */}
        <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.2 }} className={card}>
          <h2 className={cardTitle}>
            <Heartbeat size={22} weight="fill" className="text-[#2563EB]" />
            Información médica
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#DBEAFE] border border-[#BFDBFE] p-4 justify-center items-center flex flex-col rounded-2xl shadow-sm">
              <Scales size={20} weight="fill" className="text-[#1D4ED8] mb-1" />
              <span className="text-[10px] font-extrabold text-[#1D4ED8] uppercase tracking-widest mb-1">Peso</span>
              <span className="text-xl font-black font-mono text-[#1D4ED8]">
                {medicalRecord.weight || '--'}<span className="text-xs font-bold text-[#2563EB]/60"> kg</span>
              </span>
            </div>
            <div className="bg-[#DBEAFE] border border-[#BFDBFE] p-4 justify-center items-center flex flex-col rounded-2xl shadow-sm">
              <Ruler size={20} weight="fill" className="text-[#1D4ED8] mb-1" />
              <span className="text-[10px] font-extrabold text-[#1D4ED8] uppercase tracking-widest mb-1">Estatura</span>
              <span className="text-xl font-black font-mono text-[#1D4ED8]">
                {medicalRecord.height || '--'}<span className="text-xs font-bold text-[#2563EB]/60"> m</span>
              </span>
            </div>
          </div>

          {medicalRecord.medications && (
            <div className="mt-4 bg-[#D1FAE5] border border-[#6EE7B7] rounded-2xl p-4 shadow-sm">
              <h4 className="text-[#047857] font-extrabold text-xs uppercase tracking-widest mb-1 flex items-center gap-1">
                <Drop size={14} weight="fill" /> Tratamiento actual
              </h4>
              <p className="text-[#065F46] font-bold whitespace-pre-wrap">{medicalRecord.medications}</p>
            </div>
          )}
        </motion.div>

        {/* Hospital */}
        {primaryHospital && (
          <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.25 }} className={card}>
            <h2 className={cardTitle}>Información hospitalaria</h2>
            <div className="bg-[#DBEAFE] border-2 border-[#BFDBFE] rounded-2xl p-5 shadow-sm">
              <span className="text-[#1D4ED8] text-xs font-extrabold uppercase tracking-widest mb-1 block">
                Hospital prioritario
              </span>
              <h3 className="font-black text-lg text-[#1F2937]">{primaryHospital.name}</h3>
              {primaryHospital.nss && <p className="text-sm font-bold text-[#1D4ED8] mt-1">NSS / Seguro: {primaryHospital.nss}</p>}
            </div>

            {otherHospitals.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-2">Otras opciones inscritas</h4>
                <div className="space-y-2">
                  {otherHospitals.map((h, i) => (
                    <div key={i} className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E5E7EB] flex justify-between items-center">
                      <span className="font-bold text-sm">{h.name}</span>
                      {h.nss && <span className="text-xs font-medium text-[#6B7280]">NSS: {h.nss}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Contactos de emergencia */}
        {contacts?.length > 0 && (
          <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.3 }} className={card}>
            <h2 className={cardTitle}>Contactos de emergencia</h2>
            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E7EB] shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">{contact.name}</h3>
                      <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">{contact.relationship}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <a
                        href={`tel:${contact.phone}`}
                        aria-label={`Llamar a ${contact.name}`}
                        className={`flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] ${hoverLift} text-white py-2.5 px-6 rounded-xl font-bold w-full shadow-sm hover:shadow-md`}
                      >
                        <Phone size={18} weight="fill" />
                        Llamar principal
                      </a>
                      {contact.secondary_phone && (
                        <a
                          href={`tel:${contact.secondary_phone}`}
                          aria-label={`Llamar a ${contact.name}, número alternativo`}
                          className={`flex items-center justify-center gap-2 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] ${hoverLift} text-[#1F2937] py-2.5 px-6 rounded-xl font-bold w-full shadow-sm`}
                        >
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

        {/* Vehículo */}
        {vehicles?.length > 0 && (
          <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.35 }} className={card}>
            <h2 className={cardTitle}>
              <Car size={22} className="text-[#2563EB]" /> Vehículo en uso
            </h2>
            <div className="space-y-3">
              {vehicles.map(v => (
                <div key={v.id} className="bg-[#DBEAFE] border border-[#BFDBFE] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                  <div>
                    <h3 className="font-bold">{v.make} {v.model} ({v.year})</h3>
                    {v.plates
                      ? <p className="text-sm font-medium text-[#1D4ED8]">Placas: {v.plates}</p>
                      : <p className="text-sm font-medium text-[#6B7280] italic">Vehículo sin placa</p>}
                  </div>
                  {(v.insurance_provider || v.policy_number) && (
                    <div className="md:text-right border-l-2 border-[#BFDBFE] pl-4 md:border-l-0 md:pl-0">
                      <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Aseguradora</p>
                      <p className="font-bold">{v.insurance_provider || 'Sin especificar'}</p>
                      {v.policy_number && <p className="text-xs text-[#1D4ED8]">Pol: {v.policy_number}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Documentos */}
        {documents?.length > 0 && (
          <motion.div {...depthIn} transition={{ duration: 0.4, delay: 0.4 }} className={card}>
            <h2 className={cardTitle}>
              <FileText size={22} className="text-[#2563EB]" /> Documentos
            </h2>
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <a
                  key={doc.id || i}
                  href={doc.url || doc.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 font-bold text-sm text-[#1F2937] ${hoverLift} hover:bg-[#DBEAFE] shadow-sm`}
                >
                  {doc.name || doc.title || 'Documento adjunto'}
                  <FileText size={16} className="text-[#6B7280]" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pie de confianza */}
        <p className="text-center text-xs font-medium text-[#6B7280] pt-2">
          Información proporcionada por el usuario{lastUpdated ? ` · Actualizada el ${lastUpdated}` : ''}
        </p>
      </div>

      {/* Barra fija inferior — vidrio flotando por encima del contenido */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
        <a
          href="tel:911"
          aria-label="Llamar a emergencias, 911"
          className="flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] transition-all text-white py-3.5 rounded-2xl font-black text-lg shadow-lg max-w-2xl mx-auto"
        >
          <FirstAid size={22} weight="fill" />
          Llamar ambulancia · 911
        </a>
      </div>
    </div>
  );
}