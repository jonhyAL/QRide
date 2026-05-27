import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heartbeat, Drop, Ruler, Scales, Phone, ArrowUpRight } from '@phosphor-icons/react';
import { Share2, Download, AlertCircle, Trash } from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sidebar } from '../components/layout/Sidebar';
import { FloatingShapes } from '../components/ui/floating-shapes';
import { MedicalRecordModal } from '../components/dashboard/MedicalRecordModal';
import { EmergencyContactModal } from '../components/dashboard/EmergencyContactModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Referencia para capturar el QR y la tarjeta como imagen para el PDF
  const credentialRef = useRef(null);
  
  // Data states
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Modal states
  const [isEditMedicalModalOpen, setIsEditMedicalModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async (userId) => {
    setLoadingData(true);
    try {
      // Fetch ambas tablas en paralelo
      const [recordRes, contactsRes] = await Promise.all([
        supabase.from('medical_records').select('*').eq('user_id', userId).single(),
        supabase.from('emergency_contacts').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      ]);
        
      if (recordRes.error && recordRes.error.code !== 'PGRST116') {
        console.error('Error fetching medical record:', recordRes.error);
      } else if (recordRes.data) {
        setMedicalRecord(recordRes.data);
      }

      if (contactsRes.error) {
        console.error('Error fetching contacts:', contactsRes.error);
      } else if (contactsRes.data) {
        setContacts(contactsRes.data);
      }
    } catch (error) {
      console.error('Unexpected error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) return;
    
    try {
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Error al eliminar el contacto');
    }
  };

  const handleDownloadPDF = async () => {
    if (!credentialRef.current) return;
    try {
      const canvas = await html2canvas(credentialRef.current, {
        scale: 4, // Alta resolución para impresión
        backgroundColor: '#E63946' // Fondo primary rojo
      });
      const imgData = canvas.toDataURL('image/png');
      
      // Formato tarjeta CR80 (Tarjeta de crédito / Identificación) 85.6mm x 53.98mm en landscape
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
      pdf.save('QRide-Credencial-Emergencia.pdf');
    } catch (err) {
      console.error('Error generando el PDF:', err);
      alert('Hubo un error al generar la credencial en PDF: ' + err.message);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
      } else {
        setUser(user);
        fetchDashboardData(user.id);
      }
    };
    getUser();
  }, [navigate, fetchDashboardData]);

  if (!user || loadingData) return <div className="min-h-screen flex items-center justify-center bg-[#F4EFEA] font-sans">
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
  </div>;

  return (
    <div className="min-h-screen bg-[#F4EFEA] font-sans flex relative overflow-hidden">
      <FloatingShapes />
      
      {/* Credencial oculta para el PDF (fuera de pantalla) */}
      <div className="fixed top-0 left-[-9999px]">
        <div 
          ref={credentialRef}
          style={{ backgroundColor: '#E63946' }}
          className="w-[530px] h-[335px] rounded-[1.5rem] flex items-center p-8 relative overflow-hidden"
        >
          {/* Fondo decorativo */}
          <div 
            className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          ></div>
          
          <div className="w-full flex justify-between items-center z-10 gap-6">
            {/* Izquierda: Info */}
            <div className="flex-1" style={{ color: '#ffffff' }}>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase">QRIDE</h1>
              <h2 className="text-xl font-bold uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>Medical ID</h2>
              
              <div className="space-y-4">
                <p className="text-sm font-bold inline-block px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.9)' }}>
                  ESCANEAR EN CASO DE EMERGENCIA
                </p>
                <div className="flex items-center gap-3 pt-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <Heartbeat size={24} weight="fill" color="#ffffff" />
                  <span className="font-semibold">{medicalRecord?.blood_type || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Derecha: QR */}
            <div className="p-5 rounded-[1.5rem] shrink-0" style={{ backgroundColor: '#ffffff' }}>
              <QRCodeCanvas 
                value={`${window.location.origin}/p/${user?.id}`} 
                size={180} 
                level="H" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <MedicalRecordModal 
        isOpen={isEditMedicalModalOpen}
        onClose={() => setIsEditMedicalModalOpen(false)}
        user={user}
        medicalRecord={medicalRecord}
        onSave={() => fetchDashboardData(user.id)}
      />
      <EmergencyContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        user={user}
        onSave={() => fetchDashboardData(user.id)}
      />

      {/* Sidebar - Ahora es oscura y flotante */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 md:ml-[290px] relative z-10">
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
          
          {/* Header minimalista y contrastante */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-secondary tracking-tight">
                Hola, {user.user_metadata?.first_name || 'Usuario'}
              </h1>
              <p className="text-gray-500 font-medium mt-1">Este es el resumen de tu identidad vital.</p>
            </div>
            <button className="flex items-center gap-2 bg-white hover:bg-gray-50 border-2 border-red-100 px-5 py-2.5 rounded-2xl text-sm font-bold text-red-600 shadow-sm transition-all focus:ring-4 focus:ring-red-100">
              <AlertCircle size={18} />
              Notificar Emergencia
            </button>
          </motion.div>

          {/* Grid Principal - Estilo Bento Macizo y Elegante */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Columna 1: Código QR Card (Destacada) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="bg-secondary text-white rounded-[2rem] p-8 text-center relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] h-full flex flex-col justify-between">
                {/* Patrón de fondo opcional */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col items-center flex-1">
                  <div className="bg-white/10 p-5 rounded-3xl mb-6 backdrop-blur-sm border border-white/10">
                    <div className="p-3 bg-white rounded-2xl shadow-lg flex items-center justify-center w-[160px] h-[160px]">
                      <QRCodeSVG 
                        value={`${window.location.origin}/p/${user.id}`} 
                        size={150} 
                        level="H" 
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-white text-xl font-extrabold tracking-tight mb-2">Tu Código QRide</h3>
                  <p className="text-gray-300 text-sm font-medium mb-6 px-2">
                    Permite a los paramédicos escanear este código para acceder a tu historial médico.
                  </p>
                  
                  <div className="flex items-center gap-3 w-full mt-auto">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3.5 rounded-xl transition-colors text-sm font-bold">
                      <Share2 size={16} /> Compartir
                    </button>
                      <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center justify-center bg-primary hover:bg-opacity-90 text-white p-3.5 rounded-xl shadow-md transition-colors"
                        title="Descargar credencial PDF"
                      >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Columna 2 y 3: Datos Vitales & Contactos */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              
              {/* Ficha Rápida (Bento Moderno con Bloques de Color Sólido) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-extrabold text-secondary flex items-center gap-2">
                    <Heartbeat size={24} className="text-primary" weight="fill" />
                    Ficha Rápida
                  </h3>
                  <button 
                    onClick={() => setIsEditMedicalModalOpen(true)}
                    className="text-sm font-bold text-gray-500 hover:text-primary flex items-center gap-1 transition-colors bg-bg-light px-4 py-2 rounded-xl"
                  >
                    Editar <ArrowUpRight size={14} weight="bold" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-red-500 group-hover:scale-110 transition-transform">
                      <Drop size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-red-900/50 uppercase tracking-widest mb-1">Sangre</p>
                    <p className="text-2xl font-black text-red-950">{medicalRecord?.blood_type || '--'}</p>
                  </div>

                  <div className="bg-blue-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                      <Ruler size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-blue-900/50 uppercase tracking-widest mb-1">Estatura</p>
                    <p className="text-2xl font-black text-blue-950 flex items-baseline gap-1">
                      {medicalRecord?.height || '--'}<span className="text-sm font-bold text-blue-900/50">m</span>
                    </p>
                  </div>

                  <div className="bg-emerald-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                      <Scales size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-emerald-900/50 uppercase tracking-widest mb-1">Peso</p>
                    <p className="text-2xl font-black text-emerald-950 flex items-baseline gap-1">
                      {medicalRecord?.weight || '--'}<span className="text-sm font-bold text-emerald-900/50">kg</span>
                    </p>
                  </div>

                  <div className="bg-orange-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                      <AlertCircle size={20} className="fill-orange-500 text-white" />
                    </div>
                    <p className="text-[10px] font-extrabold text-orange-900/50 uppercase tracking-widest mb-1">Alergias</p>
                    <p className="text-lg font-black text-orange-950 leading-tight">
                      {medicalRecord?.allergies ? (
                        medicalRecord.allergies.length > 12 ? medicalRecord.allergies.substring(0, 12) + '...' : medicalRecord.allergies
                      ) : 'Ninguna'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Contactos de Emergencia (Limpios y Sólidos) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold text-secondary flex items-center gap-2">
                    <Phone size={24} className="text-accent" weight="fill" />
                    Contactos de Emergencia
                  </h3>
                  <button 
                    onClick={() => setIsAddContactModalOpen(true)}
                    className="text-sm font-bold text-primary hover:text-secondary transition-colors"
                  >
                    + Agregar Nuevo
                  </button>
                </div>

                <div className="space-y-3">
                  {contacts.length === 0 ? (
                    <div className="text-center p-6 bg-bg-light rounded-[1.5rem] border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">No tienes contactos de emergencia registrados.</p>
                      <button 
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="mt-2 text-sm font-bold text-primary hover:underline"
                      >
                        Añadir mi primer contacto
                      </button>
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-4 bg-bg-light rounded-[1.5rem] hover:bg-gray-100 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-500 font-black text-lg uppercase">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-secondary text-lg">{contact.name}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{contact.relationship} &bull; {contact.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-3 bg-white shadow-sm hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-gray-400"
                            title="Eliminar contacto"
                          >
                            <Trash size={20} weight="fill" />
                          </button>
                          <a 
                            href={`tel:${contact.phone}`}
                            className="p-3 bg-white shadow-sm hover:text-primary hover:bg-primary/5 rounded-xl transition-colors text-gray-600"
                            title="Llamar"
                          >
                            <Phone size={20} weight="fill" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}