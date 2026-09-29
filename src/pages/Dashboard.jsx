import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Heartbeat, Drop, Ruler, Scales, Phone, ArrowUpRight } from '@phosphor-icons/react';
import { Share2, Download, AlertCircle, Trash, Sparkles, Send, X, Bot, MessageCircle, Hospital, ShieldAlert, Maximize2 } from 'lucide-react';

import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { FloatingShapes } from '../components/ui/floating-shapes';
import { MedicalRecordModal } from '../components/dashboard/MedicalRecordModal';
import { EmergencyContactModal } from '../components/dashboard/EmergencyContactModal';
import { VehiclesModal } from '../components/dashboard/VehiclesModal';
import { DocumentsModal } from '../components/dashboard/DocumentsModal';
import { TelemetryHubModal } from '../components/telemetry/TelemetryHubModal';

export default function Dashboard() {
  const dragX = useMotionValue(0);
  // Se ajustó para que inicie exactamente en los bordes del botón (48px) y no se asome
  const sliderFillWidth = useTransform(dragX, [0, 196], ["48px", "252px"]);
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
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Custom action states for Sidebar missing modules
  const [isUnderConstructionModalOpen, setIsUnderConstructionModalOpen] = useState(false);
  const [constructionFeatureName, setConstructionFeatureName] = useState('');

  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isEmergencySliderOpen, setIsEmergencySliderOpen] = useState(false);
  const isAnyModalOpen = isEditMedicalModalOpen || isAddContactModalOpen || isQRModalOpen || isUnderConstructionModalOpen || isVehiclesModalOpen || isDocumentsModalOpen || isTelemetryModalOpen || isEmergencySliderOpen;

  const handleSidebarAction = (actionId) => {
    if (actionId === 'profile') {
      navigate('/account', { state: { tab: 'profile' } });
    } else if (actionId === 'settings') {
      navigate('/account', { state: { tab: 'preferences' } });
    } else if (actionId === 'vehicles') {
      setIsVehiclesModalOpen(true);
    } else if (actionId === 'documents') {
      setIsDocumentsModalOpen(true);
    } else if (actionId === 'telemetry') {
      setIsTelemetryModalOpen(true);
    } else {
      setConstructionFeatureName(actionId);
      setIsUnderConstructionModalOpen(true);
    }
  };

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

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/p/${user?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi Perfil Médico QRide',
          text: 'En caso de emergencia, puedes consultar mi historial médico aquí.',
          url: profileUrl,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      alert('Enlace copiado al portapapeles');
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

  useEffect(() => {
    if (location.state?.action) {
      handleSidebarAction(location.state.action);
    }
  }, [location.state]);

  if (!user || loadingData) return (
    <div className="min-h-screen bg-slate-50 font-sans flex relative overflow-hidden">
      {/* Skeleton Desktop Nav */}
      <div className="hidden md:flex flex-col w-24 lg:w-[240px] bg-slate-900 text-white shadow-2xl z-50 fixed h-full p-4 lg:p-6 transition-all duration-300">
        <div className="h-10 w-10 lg:w-32 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/10 rounded-xl mb-12 animate-pulse" />
        <div className="space-y-4 w-full">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 w-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/5 rounded-xl animate-pulse" />)}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:pl-24 lg:pl-[240px] transition-all duration-300 w-full">
        {/* Skeleton Mobile Header */}
        <div className="bg-slate-900 p-4 sticky top-0 z-40 md:hidden flex justify-between items-center shadow-lg">
          <div className="h-8 w-24 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/10 rounded-lg animate-pulse" />
          <div className="h-10 w-10 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/10 rounded-full animate-pulse" />
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse mb-3" />
              <div className="h-8 w-48 bg-gray-300 rounded-lg animate-pulse" />
            </div>
            <div className="h-12 w-32 bg-gray-300 rounded-full animate-pulse hidden md:block" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Card Skeleton */}
              <div className="w-full h-[220px] md:h-[280px] bg-gradient-to-br from-cyan-50 to-indigo-50 border border-indigo-100 shadow-inner rounded-[1.5rem] animate-pulse shadow-xl" />
              
              {/* Vitals Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm p-4 md:p-5 rounded-[1.5rem] shadow-sm h-[110px] md:h-[130px] flex flex-col justify-between">
                    <div className="w-10 h-10 bg-gray-100 rounded-2xl animate-pulse" />
                    <div>
                      <div className="h-6 w-16 bg-gray-300 rounded-lg animate-pulse mb-1" />
                      <div className="h-3 w-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 md:space-y-8">
               {/* Controls skeleton */}
               <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[2rem] p-5 shadow-sm">
                  <div className="h-6 w-40 bg-gray-300 rounded-lg animate-pulse mb-6" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-3xl animate-pulse" />
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
);
return (
    <div className="min-h-screen bg-slate-50 font-sans flex relative overflow-hidden">
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

      <VehiclesModal
        isOpen={isVehiclesModalOpen}
        onClose={() => setIsVehiclesModalOpen(false)}
        user={user}
      />

      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        user={user}
      />

      <TelemetryHubModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
      />


      {/* Sidebar - Ahora es oscura y flotante */}
      <Sidebar user={user} onAction={handleSidebarAction} />

      {/* Main Content */}
      <div className="flex-1 md:ml-[290px] relative z-10">
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 pb-32 md:pb-10">
          
          {/* Header minimalista y contrastante */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 tracking-tight">
                Hola, {user.user_metadata?.first_name || 'Usuario'}
              </h1>
              <p className="text-slate-500 font-medium mt-1">Este es el resumen de tu identidad vital.</p>
            </div>
            <button 
                onClick={() => {
                  if (!contacts || contacts.length === 0) {
                    alert('Debes agregar al menos un contacto de emergencia (sección inferior) para usar esta función.');
                    return;
                  }
                  dragX.set(0);
                  setIsEmergencySliderOpen(true);
                }}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm hover:bg-gray-50 border-2 border-red-100 px-5 py-2.5 rounded-2xl text-sm font-bold text-red-600 shadow-sm transition-all focus:ring-4 focus:ring-red-100 active:scale-95"
              >
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
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/5 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col items-center flex-1">
<div 
                      onClick={() => setIsQRModalOpen(true)}
                      className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/10 p-5 rounded-3xl mb-6 backdrop-blur-sm border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                    >
                    <div className="p-3 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl shadow-lg flex items-center justify-center w-[160px] h-[160px]">
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
                      <button 
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/10 hover:bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm/20 border border-white/10 text-white py-3.5 rounded-xl transition-colors text-sm font-bold"
                      >
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
                className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-extrabold text-indigo-900 flex items-center gap-2">
                    <Heartbeat size={24} className="text-cyan-600" weight="fill" />
                    Ficha Rápida
                  </h3>
                  <button 
                    onClick={() => setIsEditMedicalModalOpen(true)}
                    className="text-sm font-bold text-slate-500 hover:text-cyan-600 flex items-center gap-1 transition-colors bg-bg-light px-4 py-2 rounded-xl"
                  >
                    Editar <ArrowUpRight size={14} weight="bold" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-red-500 group-hover:scale-110 transition-transform">
                      <Drop size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-red-900/50 uppercase tracking-widest mb-1">Sangre</p>
                    <p className="text-2xl font-black text-red-950">{medicalRecord?.blood_type || '--'}</p>
                  </div>

                  <div className="bg-blue-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                      <Ruler size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-blue-900/50 uppercase tracking-widest mb-1">Estatura</p>
                    <p className="text-2xl font-black text-blue-950 flex items-baseline gap-1">
                      {medicalRecord?.height || '--'}<span className="text-sm font-bold text-blue-900/50">m</span>
                    </p>
                  </div>

                  <div className="bg-emerald-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                      <Scales size={20} weight="fill" />
                    </div>
                    <p className="text-[10px] font-extrabold text-emerald-900/50 uppercase tracking-widest mb-1">Peso</p>
                    <p className="text-2xl font-black text-emerald-950 flex items-baseline gap-1">
                      {medicalRecord?.weight || '--'}<span className="text-sm font-bold text-emerald-900/50">kg</span>
                    </p>
                  </div>

                  <div className="bg-orange-50 p-5 rounded-[1.5rem] border-none group">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                      <AlertCircle size={20} className="fill-orange-500 text-white" />
                    </div>
                    <p className="text-[10px] font-extrabold text-orange-900/50 uppercase tracking-widest mb-1">Alergias</p>
                    <p className="text-lg font-black text-orange-950 leading-tight">
                      {medicalRecord?.allergies ? (
                        medicalRecord.allergies.length > 20 ? medicalRecord.allergies.substring(0, 20) + '...' : medicalRecord.allergies
                      ) : 'Ninguna'}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-5 rounded-[1.5rem] border-none group col-span-2 md:col-span-1">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-purple-500 group-hover:scale-110 transition-transform">
                      <ShieldAlert size={20} />
                    </div>
                    <p className="text-[10px] font-extrabold text-purple-900/50 uppercase tracking-widest mb-1">NSS (Seguro)</p>
                    <p className="text-lg font-black text-purple-950 leading-tight">
                      {medicalRecord?.nss || '--'}
                    </p>
                  </div>

                  <div className="bg-teal-50 p-5 rounded-[1.5rem] border-none group col-span-2 md:col-span-1">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-sm text-teal-500 group-hover:scale-110 transition-transform">
                      <Hospital size={20} />
                    </div>
                    <p className="text-[10px] font-extrabold text-teal-900/50 uppercase tracking-widest mb-1">Hospital Preferido</p>
                    <p className="text-lg font-black text-teal-950 leading-tight">
                      {medicalRecord?.preferred_hospital ? (
                        medicalRecord.preferred_hospital.length > 20 ? medicalRecord.preferred_hospital.substring(0, 20) + '...' : medicalRecord.preferred_hospital
                      ) : '--'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Contactos de Emergencia (Limpios y Sólidos) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold text-indigo-900 flex items-center gap-2">
                    <Phone size={24} className="text-accent" weight="fill" />
                    Contactos de Emergencia
                  </h3>
                  <button 
                    onClick={() => setIsAddContactModalOpen(true)}
                    className="text-sm font-bold text-cyan-600 hover:text-indigo-900 transition-colors"
                  >
                    + Agregar Nuevo
                  </button>
                </div>

                <div className="space-y-3">
                  {contacts.length === 0 ? (
                    <div className="text-center p-6 bg-bg-light rounded-[1.5rem] border border-dashed border-gray-200">
                      <p className="text-slate-500 font-medium">No tienes contactos de emergencia registrados.</p>
                      <button 
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="mt-2 text-sm font-bold text-cyan-600 hover:underline"
                      >
                        Añadir mi primer contacto
                      </button>
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-4 bg-bg-light rounded-[1.5rem] hover:bg-gray-100 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm shadow-sm flex items-center justify-center text-slate-500 font-black text-lg uppercase">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-indigo-900 text-lg">{contact.name}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{contact.relationship} &bull; {contact.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-3 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm shadow-sm hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-gray-400"
                            title="Eliminar contacto"
                          >
                            <Trash size={20} weight="fill" />
                          </button>
                          <a 
                            href={`tel:${contact.phone}`}
                            className="p-3 bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm shadow-sm hover:text-cyan-600 hover:bg-primary/5 rounded-xl transition-colors text-slate-600"
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

      {/* Modal - Próximamente (Perfil y Ajustes) */}
      <AnimatePresence>
        {isUnderConstructionModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsUnderConstructionModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm p-8 rounded-[2rem] shadow-2xl relative max-w-sm w-full flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setIsUnderConstructionModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-indigo-900 text-2xl font-black mb-3">{constructionFeatureName}</h3>
              <p className="text-slate-500 font-medium mb-6">
                Estamos trabajando aplicando medidas de máxima seguridad (encriptación AES-256) antes de liberar este módulo al público.
              </p>
              <span className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">Próximamente</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal QR Ampliado */}
      <AnimatePresence>
        {isQRModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsQRModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm p-8 rounded-[2rem] shadow-2xl relative max-w-sm w-full flex flex-col items-center"
            >
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-indigo-900 text-2xl font-black mb-6 text-center">Tu Código QRide</h3>
              <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm p-4 rounded-3xl shadow-inner border border-gray-100 mb-6">
                <QRCodeSVG 
                  value={`${window.location.origin}/p/${user?.id}`} 
                  size={250} 
                  level="H" 
                />
              </div>
              <p className="text-slate-500 text-sm font-medium text-center mb-6">
                Muestra este código al personal médico de emergencia para que escaneen tu perfil vital.
              </p>
              <button 
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white py-4 rounded-xl transition-colors font-bold"
              >
                <Share2 size={20} /> Compartir Perfil
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Emergencia con Deslizador */}
        <AnimatePresence>
          {isEmergencySliderOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[2rem] p-6 md:p-8 w-full max-w-sm text-center shadow-2xl relative"
              >
                <button
                  onClick={() => setIsEmergencySliderOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-slate-600 bg-gray-50 rounded-full p-2"
                >
                  <X size={20} />
                </button>
                
                <div className="mx-auto bg-red-100/50 w-20 h-20 rounded-full flex flex-col items-center justify-center mb-6 border border-red-100">
                  <ShieldAlert size={36} className="text-red-500" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-indigo-900 mb-2">Confirmar Alerta</h2>
                <p className="text-slate-500 text-sm md:text-base mb-8 font-medium px-4">
                  Desliza para enviar un mensaje SMS de auxilio con tu historial médico a todos tus contactos.
                </p>

                {/* Contenedor del Slider */}
                <div className="relative w-[260px] mx-auto h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Barra de progreso de color acoplada a la paleta */}
                  <motion.div 
                    className="absolute left-1 top-1 bottom-1 bg-primary z-0 rounded-full"
                    style={{ width: sliderFillWidth }}
                  />
                  <span className="text-red-600/60 font-bold text-sm z-10 pl-10 pointer-events-none select-none">Desliza para notificar</span>
                  
                  <motion.div
                    drag="x"
                    style={{ x: dragX }}
                    dragConstraints={{ left: 0, right: 260 - 56 - 8 }}
                    dragElastic={0.1}
                    dragSnapToOrigin={true}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 150) {
                        setIsEmergencySliderOpen(false);
                        const phones = contacts.map(c => c.phone).join(',');
                        const userName = user?.user_metadata?.first_name || 'un paciente';
                        const publicUrl = window.location.origin + '/qr/' + user.id;
                        const msg = encodeURIComponent(`🚨 ALERTA MÉDICA: Emergencia reportada por ${userName}. Revisa mi ubicación actual o ficha médica aquí: ${publicUrl}`);
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                        window.location.href = `sms:${phones}${isIOS ? '&' : '?'}body=${msg}`;
                      }
                    }}
                    className="absolute left-1 top-1 w-12 h-12 bg-red-600 rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                  >
                    <Send size={20} className="text-white ml-[-2px]" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isAnyModalOpen && <MobileNav onAction={handleSidebarAction} />}
    </div>
  );
}
