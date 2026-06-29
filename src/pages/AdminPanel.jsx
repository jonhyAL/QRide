import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, ShieldAlert, Trash, Search, RefreshCw, Plus, Edit, X, Upload, 
  Check, FilePlus, AlertCircle, FileText, Phone, Car, PlusCircle, Trash2, 
  Sparkles, ExternalLink, Activity, Info
} from 'lucide-react';

const COMMON_ALLERGIES = ['Penicilina', 'Látex', 'Aspirina', 'AINEs', 'Ninguna'];
const COMMON_CONDITIONS = ['Asma', 'Diabetes', 'Hipertensión', 'Epilepsia', 'Ninguna'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Cache and Selection
  const [users, setUsers] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({});
  const [manualUserId, setManualUserId] = useState(false);
  
  // Complex fields for medical_records
  const [allergiesTags, setAllergiesTags] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [conditionsTags, setConditionsTags] = useState([]);
  const [newCondition, setNewCondition] = useState('');
  const [hospitalsList, setHospitalsList] = useState([]);

  // File Upload State for user_documents
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Global collections for dashboard statistics
  const [allData, setAllData] = useState({
    medical_records: [],
    emergency_contacts: [],
    vehicles: [],
    user_documents: []
  });

  const tabs = [
    { id: 'dashboard', name: 'Estadísticas', icon: Activity },
    { id: 'medical_records', name: 'Expedientes', icon: FileText },
    { id: 'emergency_contacts', name: 'Contactos', icon: Phone },
    { id: 'vehicles', name: 'Vehículos', icon: Car },
    { id: 'user_documents', name: 'Documentos', icon: FileText }
  ];

  useEffect(() => {
    checkAdminAndLoadData();
  }, [activeTab]);

  const checkAdminAndLoadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (activeTab === 'dashboard') {
      await loadAllDashboardData();
    } else {
      await loadData(activeTab);
    }
    await fetchAllKnownUsers();
  };

  const loadAllDashboardData = async () => {
    setLoading(true);
    try {
      const [medicalRes, contactRes, vehicleRes, documentRes] = await Promise.all([
        supabase.from('medical_records').select('*'),
        supabase.from('emergency_contacts').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('user_documents').select('*')
      ]);

      const records = {
        medical_records: medicalRes.data || [],
        emergency_contacts: contactRes.data || [],
        vehicles: vehicleRes.data || [],
        user_documents: documentRes.data || []
      };

      setAllData(records);

      // Resolve user profiles for all user IDs we see in all tables
      const allUserIds = [
        ...records.medical_records.map(r => r.user_id),
        ...records.emergency_contacts.map(c => c.user_id),
        ...records.vehicles.map(v => v.user_id),
        ...records.user_documents.map(d => d.user_id)
      ].filter(Boolean);
      
      const uniqueUserIds = [...new Set(allUserIds)];
      const newProfiles = {};
      await Promise.all(uniqueUserIds.map(async (uid) => {
        if (users[uid]) return;
        try {
          const { data: prof, error: rpcError } = await supabase.rpc('get_public_profile', { p_id: uid });
          if (!rpcError && prof) {
            newProfiles[uid] = prof;
          } else {
            newProfiles[uid] = { first_name: 'Usuario', last_name: uid.substring(0, 8) };
          }
        } catch (e) {
          newProfiles[uid] = { first_name: 'Usuario', last_name: uid.substring(0, 8) };
        }
      }));
      setUsers(prev => ({ ...prev, ...newProfiles }));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const stats = React.useMemo(() => {
    if (activeTab !== 'dashboard') return null;

    // Blood Types
    const bloodTypeMap = {};
    allData.medical_records.forEach(r => {
      const bt = (r.blood_type || 'Desconocido').toUpperCase().trim();
      bloodTypeMap[bt] = (bloodTypeMap[bt] || 0) + 1;
    });
    const bloodTypes = Object.entries(bloodTypeMap).map(([type, count]) => ({
      type,
      count,
      percentage: allData.medical_records.length ? Math.round((count / allData.medical_records.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Vehicle Types
    const vehicleTypeMap = {};
    allData.vehicles.forEach(v => {
      let type = v.type || 'otro';
      type = type.charAt(0).toUpperCase() + type.slice(1);
      vehicleTypeMap[type] = (vehicleTypeMap[type] || 0) + 1;
    });
    const vehiclesTotal = allData.vehicles.length;
    const vehicleTypes = Object.entries(vehicleTypeMap).map(([type, count]) => ({
      type,
      count,
      percentage: vehiclesTotal ? Math.round((count / vehiclesTotal) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Allergies
    const allergyMap = {};
    allData.medical_records.forEach(r => {
      if (Array.isArray(r.allergies_list)) {
        r.allergies_list.forEach(a => {
          const name = a.trim();
          if (name) allergyMap[name] = (allergyMap[name] || 0) + 1;
        });
      }
    });
    const topAllergies = Object.entries(allergyMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Conditions
    const conditionMap = {};
    allData.medical_records.forEach(r => {
      if (Array.isArray(r.chronic_conditions_list)) {
        r.chronic_conditions_list.forEach(c => {
          const name = c.trim();
          if (name) conditionMap[name] = (conditionMap[name] || 0) + 1;
        });
      }
    });
    const topConditions = Object.entries(conditionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Relationships
    const relationshipMap = {};
    allData.emergency_contacts.forEach(c => {
      let rel = c.relationship || 'Otro';
      rel = rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
      relationshipMap[rel] = (relationshipMap[rel] || 0) + 1;
    });
    const relationships = Object.entries(relationshipMap).map(([type, count]) => ({
      type,
      count,
      percentage: allData.emergency_contacts.length ? Math.round((count / allData.emergency_contacts.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    return {
      bloodTypes,
      vehicleTypes,
      topAllergies,
      topConditions,
      relationships
    };
  }, [allData, activeTab]);

  const loadData = async (table) => {
    setLoading(true);
    const { data: records, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (!error && records) {
      setData(records);
      // Resolving User Profiles
      const uniqueUserIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
      const newProfiles = {};
      await Promise.all(uniqueUserIds.map(async (uid) => {
        if (users[uid]) return;
        try {
          const { data: prof, error: rpcError } = await supabase.rpc('get_public_profile', { p_id: uid });
          if (!rpcError && prof) {
            newProfiles[uid] = prof;
          } else {
            newProfiles[uid] = { first_name: 'Usuario', last_name: uid.substring(0, 8) };
          }
        } catch (e) {
          newProfiles[uid] = { first_name: 'Usuario', last_name: uid.substring(0, 8) };
        }
      }));
      setUsers(prev => ({ ...prev, ...newProfiles }));
    } else {
      setData([]);
    }
    setLoading(false);
  };

  const fetchAllKnownUsers = async () => {
    try {
      const { data: records } = await supabase.from('medical_records').select('user_id');
      if (records) {
        const uniqueIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
        const newProfiles = {};
        await Promise.all(uniqueIds.map(async (uid) => {
          if (users[uid]) return;
          const { data: prof } = await supabase.rpc('get_public_profile', { p_id: uid });
          if (prof) {
            newProfiles[uid] = prof;
          } else {
            newProfiles[uid] = { first_name: 'Usuario', last_name: uid.substring(0, 8) };
          }
        }));
        setUsers(prev => ({ ...prev, ...newProfiles }));
      }
    } catch (e) {
      console.error('Error fetching known users:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
    
    // If it's a user document, optionally delete from storage
    if (activeTab === 'user_documents') {
      const doc = data.find(item => item.id === id);
      if (doc?.file_path) {
        try {
          await supabase.storage.from('documents').remove([doc.file_path]);
        } catch (e) {
          console.error('Error removing file from storage:', e);
        }
      }
    }

    const { error } = await supabase.from(activeTab).delete().eq('id', id);
    if (!error) {
      setData(data.filter(item => item.id !== id));
    } else {
      alert('Error eliminando registro: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Open Edit Modal
  const openEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setManualUserId(!Object.keys(users).includes(item.user_id));
    
    if (activeTab === 'medical_records') {
      setAllergiesTags(item.allergies_list || []);
      setConditionsTags(item.chronic_conditions_list || []);
      setHospitalsList(item.hospitals_list || []);
    }
    
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  // Open Create Modal
  const openCreate = () => {
    setEditingItem(null);
    setSelectedFile(null);
    
    let initialForm = { user_id: Object.keys(users)[0] || '' };
    setManualUserId(Object.keys(users).length === 0);
    
    if (activeTab === 'medical_records') {
      initialForm = {
        ...initialForm,
        blood_type: '',
        height: '',
        weight: '',
        medications: '',
        medical_notes: '',
        nss: '',
        preferred_hospital: ''
      };
      setAllergiesTags([]);
      setConditionsTags([]);
      setHospitalsList([]);
    } else if (activeTab === 'emergency_contacts') {
      initialForm = {
        ...initialForm,
        name: '',
        relationship: '',
        phone: '',
        secondary_phone: ''
      };
    } else if (activeTab === 'vehicles') {
      initialForm = {
        ...initialForm,
        type: 'auto',
        make: '',
        model: '',
        year: '',
        plates: '',
        insurance_provider: '',
        policy_number: '',
        vin: '',
        is_active_qr: true
      };
    } else if (activeTab === 'user_documents') {
      initialForm = {
        ...initialForm,
        title: '',
        document_type: 'PDF',
        file_path: ''
      };
    }

    setFormData(initialForm);
    setIsModalOpen(true);
  };

  // Save changes (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    setUploadingFile(true);

    try {
      let finalUserId = formData.user_id;
      if (!finalUserId || finalUserId.trim() === '') {
        throw new Error('El ID de usuario es obligatorio');
      }

      let savePayload = { ...formData, user_id: finalUserId.trim() };

      // Handle custom file upload for user_documents
      if (activeTab === 'user_documents' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${finalUserId}_${Math.random()}.${fileExt}`;
        const filePath = `user_uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        savePayload.file_path = filePath;
        savePayload.document_type = fileExt.toUpperCase();
        if (!savePayload.title) savePayload.title = selectedFile.name;
      }

      // Handle complex sublists for medical_records
      if (activeTab === 'medical_records') {
        savePayload.allergies_list = allergiesTags;
        savePayload.chronic_conditions_list = conditionsTags;
        savePayload.hospitals_list = hospitalsList;
        savePayload.height = savePayload.height ? parseFloat(savePayload.height) : null;
        savePayload.weight = savePayload.weight ? parseFloat(savePayload.weight) : null;
        savePayload.updated_at = new Date().toISOString();
      }

      if (editingItem) {
        // Update
        const { data: updated, error } = await supabase
          .from(activeTab)
          .update(savePayload)
          .eq('id', editingItem.id)
          .select();

        if (error) throw error;
        
        setData(data.map(item => item.id === editingItem.id ? updated[0] : item));
      } else {
        // Create
        const { data: inserted, error } = await supabase
          .from(activeTab)
          .insert([savePayload])
          .select();

        if (error) throw error;
        setData([inserted[0], ...data]);
      }

      // Refresh profiles cache
      if (!users[finalUserId]) {
        const { data: prof } = await supabase.rpc('get_public_profile', { p_id: finalUserId });
        if (prof) {
          setUsers(prev => ({ ...prev, [finalUserId]: prof }));
        } else {
          setUsers(prev => ({ ...prev, [finalUserId]: { first_name: 'Usuario', last_name: finalUserId.substring(0, 8) } }));
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Tag list helpers
  const addAllergy = () => {
    if (newAllergy.trim() && !allergiesTags.includes(newAllergy.trim())) {
      setAllergiesTags([...allergiesTags, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (tag) => {
    setAllergiesTags(allergiesTags.filter(t => t !== tag));
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditionsTags.includes(newCondition.trim())) {
      setConditionsTags([...conditionsTags, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeCondition = (tag) => {
    setConditionsTags(conditionsTags.filter(t => t !== tag));
  };

  const addHospital = () => {
    setHospitalsList([...hospitalsList, { id: Date.now(), name: '', nss: '', is_primary: hospitalsList.length === 0 }]);
  };

  const updateHospital = (id, field, value) => {
    setHospitalsList(hospitalsList.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const removeHospital = (id) => {
    setHospitalsList(hospitalsList.filter(h => h.id !== id));
  };

  const setPrimaryHospital = (id) => {
    setHospitalsList(hospitalsList.map(h => ({ ...h, is_primary: h.id === id })));
  };

  const uniqueUsersCount = React.useMemo(() => {
    const ids = [
      ...allData.medical_records.map(r => r.user_id),
      ...allData.emergency_contacts.map(c => c.user_id),
      ...allData.vehicles.map(v => v.user_id),
      ...allData.user_documents.map(d => d.user_id)
    ].filter(Boolean);
    return new Set(ids).size;
  }, [allData]);

  const vehicleChartSegments = React.useMemo(() => {
    let accumulatedPercent = 0;
    const r = 50;
    const circumference = 2 * Math.PI * r;
    const colors = [
      'stroke-blue-500', 
      'stroke-emerald-500', 
      'stroke-amber-500', 
      'stroke-purple-500', 
      'stroke-pink-500'
    ];

    return stats?.vehicleTypes.map((item, idx) => {
      const strokeLength = circumference * (item.percentage / 100);
      const strokeOffset = circumference - (circumference * (accumulatedPercent / 100));
      accumulatedPercent += item.percentage;

      return {
        ...item,
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: strokeOffset,
        colorClass: colors[idx % colors.length]
      };
    }) || [];
  }, [stats]);

  const relationshipChartBars = React.useMemo(() => {
    if (!stats || stats.relationships.length === 0) return [];
    
    const svgWidth = 400;
    const svgHeight = 200;
    const margin = { top: 15, right: 15, bottom: 35, left: 40 };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    const maxCount = Math.max(...stats.relationships.map(r => r.count)) || 1;
    const barWidth = Math.min(40, (chartWidth / stats.relationships.length) * 0.6);
    const gap = (chartWidth - (barWidth * stats.relationships.length)) / (stats.relationships.length + 1);

    return stats.relationships.map((item, idx) => {
      const valPercentage = item.count / maxCount;
      const barHeight = chartHeight * valPercentage;
      const x = margin.left + gap + idx * (barWidth + gap);
      const y = margin.top + chartHeight - barHeight;

      return {
        ...item,
        x,
        y,
        width: barWidth,
        height: barHeight,
        textX: x + barWidth / 2,
        textY: margin.top + chartHeight + 18,
        countY: y - 5
      };
    });
  }, [stats]);

  const filteredData = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (users[item.user_id] && `${users[item.user_id].first_name} ${users[item.user_id].last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F4EFEA] font-sans flex relative overflow-hidden text-secondary">
      
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <div className="h-screen w-64 bg-secondary text-white p-6 shadow-2xl flex flex-col z-20 relative rounded-r-[3rem] border-r border-white/10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-primary rounded-2xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold font-title">Admin QRide</h1>
          </div>
          <div className="flex-1 space-y-3">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-sans font-bold ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors font-bold mt-auto font-sans"
          >
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-6 bg-secondary text-white shadow-lg rounded-b-[2rem] z-20 relative">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-primary rounded-xl">
               <ShieldAlert className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-lg font-bold font-title">Panel Admin</h1>
           </div>
           <button onClick={handleLogout} className="p-2 text-red-400 bg-red-400/10 rounded-xl">
             <LogOut size={20} />
           </button>
        </div>
        
        {/* Mobile Tabs */}
        <div className="md:hidden flex overflow-x-auto p-4 gap-2 no-scrollbar z-20 relative">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl whitespace-nowrap transition-all flex-shrink-0 font-sans font-bold text-sm ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white text-secondary/60'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar z-20 relative">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-secondary font-title">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <p className="text-xs text-gray-500 font-medium font-sans">
                  Administración y gestión de registros en tiempo real.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {activeTab !== 'dashboard' && (
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por campo o usuario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm font-sans font-semibold"
                    />
                  </div>
                )}
                <button 
                  onClick={() => activeTab === 'dashboard' ? loadAllDashboardData() : loadData(activeTab)}
                  className="p-3 bg-white text-secondary rounded-2xl shadow-sm hover:scale-105 transition-transform"
                  title="Refrescar"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                {activeTab !== 'dashboard' && (
                  <button 
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl shadow-md hover:bg-btn-hover active:scale-[0.98] transition-all font-sans font-bold text-sm"
                  >
                    <Plus size={18} />
                    <span>Añadir</span>
                  </button>
                )}
              </div>
            </div>

            {/* List View Grid */}
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-28 bg-white/50 backdrop-blur-xl rounded-3xl animate-pulse"></div>
                ))}
              </div>
            ) : activeTab === 'dashboard' ? (
              <div className="space-y-8 pb-10">
                {/* Metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { title: 'Usuarios Únicos', count: uniqueUsersCount, icon: Activity, color: 'from-blue-500 to-indigo-600', text: 'text-blue-600', bg: 'bg-blue-50/70' },
                    { title: 'Fichas Médicas', count: allData.medical_records.length, icon: FileText, color: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-50/70' },
                    { title: 'Contactos Emergencia', count: allData.emergency_contacts.length, icon: Phone, color: 'from-amber-500 to-orange-600', text: 'text-orange-600', bg: 'bg-orange-50/70' },
                    { title: 'Vehículos Registrados', count: allData.vehicles.length, icon: Car, color: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50/70' },
                    { title: 'Documentos Adjuntos', count: allData.user_documents.length, icon: FileText, color: 'from-purple-500 to-violet-600', text: 'text-purple-600', bg: 'bg-purple-50/70' }
                  ].map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-md border border-white flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.title}</span>
                        <div className={`p-2 rounded-xl ${card.bg} ${card.text}`}>
                          <card.icon size={18} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-secondary leading-none">{card.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Blood Types Bar Chart */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                        Tipos de Sangre
                      </h3>
                      <span className="text-xs font-bold text-gray-400">Total: {allData.medical_records.length}</span>
                    </div>
                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                      {stats.bloodTypes.length === 0 ? (
                        <p className="text-sm text-gray-400 font-semibold py-8 text-center">No hay registros médicos cargados</p>
                      ) : (
                        stats.bloodTypes.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-secondary">{item.type}</span>
                              <span className="text-gray-500">{item.count} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-gradient-to-r from-red-400 to-rose-500 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Vehicle Types Doughnut Chart */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Tipos de Vehículos
                      </h3>
                      <span className="text-xs font-bold text-gray-400">Total: {allData.vehicles.length}</span>
                    </div>
                    
                    {stats.vehicleTypes.length === 0 ? (
                      <p className="text-sm text-gray-400 font-semibold py-8 text-center">No hay vehículos registrados</p>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                        <div className="relative w-36 h-36 flex-shrink-0">
                          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                            <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                            {vehicleChartSegments.map((seg, idx) => (
                              <motion.circle
                                key={idx}
                                cx="60"
                                cy="60"
                                r="50"
                                fill="transparent"
                                className={seg.colorClass}
                                strokeWidth="12"
                                strokeDasharray={seg.strokeDasharray}
                                initial={{ strokeDashoffset: 314.16 }}
                                animate={{ strokeDashoffset: seg.strokeDashoffset }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: idx * 0.1 }}
                                strokeLinecap="round"
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                            <span className="text-2xl font-black text-secondary leading-none">{allData.vehicles.length}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Vehículos</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 flex-1 w-full max-w-[200px]">
                          {vehicleChartSegments.map((seg, idx) => {
                            const dotColors = [
                              'bg-blue-500', 
                              'bg-emerald-500', 
                              'bg-amber-500', 
                              'bg-purple-500', 
                              'bg-pink-500'
                            ];
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs font-bold font-sans">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`}></div>
                                  <span className="text-secondary">{seg.type}</span>
                                </div>
                                <span className="text-gray-400">{seg.count} ({seg.percentage}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Top Allergies and Chronic Conditions */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white space-y-4 lg:col-span-2"
                  >
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></div>
                        Alergias y Padecimientos más Frecuentes
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Allergies */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-orange-600 uppercase tracking-wider bg-orange-50 px-3 py-1.5 rounded-xl w-fit">Top Alergias</h4>
                        <div className="space-y-3">
                          {stats.topAllergies.length === 0 ? (
                            <p className="text-xs text-gray-400 font-semibold py-8 text-center">No hay reportes de alergias</p>
                          ) : (
                            stats.topAllergies.map((item, idx) => {
                              const maxVal = stats.topAllergies[0]?.count || 1;
                              const fillWidth = Math.round((item.count / maxVal) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-secondary">{item.name}</span>
                                    <span className="text-orange-600">{item.count} {item.count === 1 ? 'caso' : 'casos'}</span>
                                  </div>
                                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${fillWidth}%` }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                      className="bg-orange-400 h-full rounded-full"
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Conditions */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-xl w-fit">Top Padecimientos</h4>
                        <div className="space-y-3">
                          {stats.topConditions.length === 0 ? (
                            <p className="text-xs text-gray-400 font-semibold py-8 text-center">No hay reportes de padecimientos</p>
                          ) : (
                            stats.topConditions.map((item, idx) => {
                              const maxVal = stats.topConditions[0]?.count || 1;
                              const fillWidth = Math.round((item.count / maxVal) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-secondary">{item.name}</span>
                                    <span className="text-blue-600">{item.count} {item.count === 1 ? 'caso' : 'casos'}</span>
                                  </div>
                                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${fillWidth}%` }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                      className="bg-blue-400 h-full rounded-full"
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Relationship Chart */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white space-y-4 lg:col-span-2"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                        Relación de Contactos de Emergencia
                      </h3>
                      <span className="text-xs font-bold text-gray-400">Total: {allData.emergency_contacts.length}</span>
                    </div>

                    {stats.relationships.length === 0 ? (
                      <p className="text-sm text-gray-400 font-semibold py-8 text-center">No hay contactos de emergencia registrados</p>
                    ) : (
                      <div className="w-full flex justify-center py-2 overflow-x-auto no-scrollbar">
                        <svg viewBox="0 0 400 200" className="w-full max-w-[400px] h-auto overflow-visible font-sans font-bold text-[9px] fill-secondary flex-shrink-0">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                            const yPos = 15 + 150 * (1 - ratio);
                            return (
                              <line key={i} x1="40" y1={yPos} x2="385" y2={yPos} stroke="#f3f4f6" strokeWidth="1" />
                            );
                          })}

                          {/* Bars */}
                          {relationshipChartBars.map((bar, idx) => (
                            <g key={idx} className="group cursor-pointer">
                              <motion.rect
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                initial={{ height: 0, y: 165 }}
                                animate={{ height: bar.height, y: bar.y }}
                                transition={{ duration: 1, ease: "easeOut", delay: idx * 0.05 }}
                                className="fill-primary/80 hover:fill-primary transition-colors"
                                rx="3"
                              />
                              <text
                                x={bar.textX}
                                y={bar.countY}
                                textAnchor="middle"
                                className="fill-primary font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                {bar.count}
                              </text>
                              <text
                                x={bar.textX}
                                y={bar.textY}
                                textAnchor="middle"
                                className="fill-gray-400 font-bold"
                              >
                                {bar.type.length > 8 ? `${bar.type.substring(0, 6)}.` : bar.type}
                              </text>
                            </g>
                          ))}
                          {/* Baseline */}
                          <line x1="30" y1="165" x2="390" y2="165" stroke="#e5e7eb" strokeWidth="1.5" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="bg-white/50 backdrop-blur-xl rounded-3xl p-10 text-center shadow-lg border border-white">
                <p className="text-secondary/50 font-semibold font-sans">No hay registros encontrados en esta sección.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredData.map(item => {
                    const userProfile = users[item.user_id] || { first_name: 'Cargando...', last_name: '' };
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={item.id}
                        className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white relative group flex flex-col justify-between"
                      >
                        <div>
                          {/* User tag banner */}
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-[#F4EFEA] border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                              {userProfile.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-secondary text-sm">{userProfile.first_name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold font-sans text-sm text-secondary truncate">{userProfile.first_name} {userProfile.last_name}</p>
                              <p className="text-[10px] font-semibold text-gray-400 font-sans truncate" title={item.user_id}>UID: {item.user_id?.substring(0, 13)}...</p>
                            </div>
                          </div>

                          {/* Specific columns render */}
                          {activeTab === 'medical_records' && (
                            <div className="space-y-2.5 text-xs text-secondary/80 font-sans">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-secondary">Sangre:</span>
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-black">{item.blood_type || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-secondary">Estatura / Peso:</span>
                                <span className="font-semibold">{item.height ? `${item.height}m` : '--'} / {item.weight ? `${item.weight}kg` : '--'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-secondary">Seguro (NSS):</span>
                                <span className="font-semibold">{item.nss || 'N/A'}</span>
                              </div>
                              {item.allergies_list?.length > 0 && (
                                <div>
                                  <span className="font-bold text-secondary block mb-1">Alergias:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {item.allergies_list.map((a, i) => (
                                      <span key={i} className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{a}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.chronic_conditions_list?.length > 0 && (
                                <div className="pt-1">
                                  <span className="font-bold text-secondary block mb-1">Padecimientos:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {item.chronic_conditions_list.map((c, i) => (
                                      <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === 'emergency_contacts' && (
                            <div className="space-y-2.5 text-xs text-secondary/80 font-sans">
                              <div>
                                <span className="font-bold text-secondary block text-sm mb-1">{item.name}</span>
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[10px] uppercase tracking-wider">{item.relationship}</span>
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                <span className="font-bold text-secondary">Teléfono:</span>
                                <a href={`tel:${item.phone}`} className="text-primary font-bold flex items-center gap-1 hover:underline">{item.phone}</a>
                              </div>
                              {item.secondary_phone && (
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-secondary">Tel. Alterno:</span>
                                  <a href={`tel:${item.secondary_phone}`} className="text-secondary/70 font-bold hover:underline">{item.secondary_phone}</a>
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === 'vehicles' && (
                            <div className="space-y-2 text-xs text-secondary/80 font-sans">
                              <div>
                                <span className="font-bold text-secondary block text-sm">{item.make} {item.model}</span>
                                <span className="text-gray-400 font-bold">{item.year} &bull; {item.type}</span>
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                <span className="font-bold text-secondary">Placas:</span>
                                <span className="px-2 py-0.5 bg-gray-100 rounded-md font-black text-secondary">{item.plates || 'Sin placa'}</span>
                              </div>
                              {item.insurance_provider && (
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-secondary">Seguro:</span>
                                  <span className="font-semibold text-secondary/70">{item.insurance_provider}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                <span className="font-bold text-secondary">QR Vinculado:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.is_active_qr ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {item.is_active_qr ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </div>
                          )}

                          {activeTab === 'user_documents' && (
                            <div className="space-y-2 text-xs text-secondary/80 font-sans">
                              <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-red-50 text-red-500 rounded-xl mt-1"><FileText size={20} /></div>
                                <div className="min-w-0">
                                  <p className="font-bold text-secondary text-sm truncate" title={item.title}>{item.title}</p>
                                  <p className="text-gray-400 font-bold uppercase">{item.document_type || 'PDF'}</p>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-gray-400 font-semibold">Subido el:</span>
                                <span className="font-semibold">{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                              {item.file_path && (
                                <div className="pt-2">
                                  <a 
                                    href={supabase.storage.from('documents').getPublicUrl(item.file_path).data.publicUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-primary font-bold flex items-center gap-1 hover:underline text-[10px]"
                                  >
                                    <ExternalLink size={12} /> Ver documento subido
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Hover Actions Bar */}
                        <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-secondary/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 z-10 max-h-[85vh] overflow-y-auto font-sans"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-title text-secondary">
                    {editingItem ? 'Editar' : 'Añadir nuevo'} {tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}
                  </h2>
                  <p className="text-gray-500 text-xs font-semibold">Completa los campos para guardar los cambios.</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                
                {/* User ID Selector Section */}
                <div className="bg-[#F4EFEA]/50 p-5 rounded-2xl border border-[#E8DFD8]">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider">Paciente / Propietario</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary hover:underline">
                      <input 
                        type="checkbox" 
                        checked={manualUserId} 
                        onChange={(e) => setManualUserId(e.target.checked)} 
                        className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>Ingresar ID manual</span>
                    </label>
                  </div>

                  {manualUserId ? (
                    <div>
                      <input 
                        type="text" 
                        required 
                        value={formData.user_id || ''} 
                        onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none" 
                        placeholder="Ingresa el UUID de Supabase del usuario..."
                      />
                      <p className="text-[10px] text-gray-400 font-semibold mt-1 flex items-center gap-1"><Info size={10} /> Copia el UUID de usuario desde Supabase Auth.</p>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.user_id || ''}
                      onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="" disabled>Selecciona un usuario...</option>
                      {Object.entries(users).map(([id, p]) => (
                        <option key={id} value={id}>
                          {p.first_name} {p.last_name} ({id.substring(0, 8)}...)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Form fields depending on selected tab */}
                {activeTab === 'medical_records' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Sangre</label>
                        <select 
                          name="blood_type" 
                          value={formData.blood_type || ''} 
                          onChange={e => setFormData({ ...formData, blood_type: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="">Selecciona...</option>
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estatura (m)</label>
                        <input 
                          type="number" step="0.01" name="height" placeholder="Ej. 1.75" 
                          value={formData.height || ''} 
                          onChange={e => setFormData({ ...formData, height: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Peso (kg)</label>
                        <input 
                          type="number" step="0.1" name="weight" placeholder="Ej. 72.5" 
                          value={formData.weight || ''} 
                          onChange={e => setFormData({ ...formData, weight: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">NSS / Nro Seguro</label>
                        <input 
                          type="text" name="nss" placeholder="NSS del paciente" 
                          value={formData.nss || ''} 
                          onChange={e => setFormData({ ...formData, nss: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hospital Preferido</label>
                        <input 
                          type="text" name="preferred_hospital" placeholder="Clínica u hospital principal" 
                          value={formData.preferred_hospital || ''} 
                          onChange={e => setFormData({ ...formData, preferred_hospital: e.target.value })} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    {/* Allergies tag editor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Alergias</label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" placeholder="Escribe alergia y pulsa '+'" 
                          value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button type="button" onClick={addAllergy} className="p-3 bg-secondary hover:bg-opacity-95 text-white rounded-xl"><PlusCircle size={18} /></button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3 items-center">
                        <span className="text-[10px] text-gray-400 font-bold mr-1">Sugerencias:</span>
                        {COMMON_ALLERGIES.map(allergy => (
                          <button
                            type="button"
                            key={allergy}
                            onClick={() => !allergiesTags.includes(allergy) && setAllergiesTags([...allergiesTags, allergy])}
                            className="bg-slate-100 hover:bg-slate-200 text-secondary text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition-all"
                          >
                            + {allergy}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {allergiesTags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-xl text-xs font-bold">
                            {tag}
                            <button type="button" onClick={() => removeAllergy(tag)} className="text-orange-500 hover:text-orange-800"><X size={12} /></button>
                          </span>
                        ))}
                        {allergiesTags.length === 0 && <span className="text-xs text-gray-400 font-semibold italic">Sin alergias añadidas.</span>}
                      </div>
                    </div>

                    {/* Chronic conditions tag editor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Enfermedades Crónicas</label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" placeholder="Escribe enfermedad y pulsa '+'" 
                          value={newCondition} onChange={e => setNewCondition(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button type="button" onClick={addCondition} className="p-3 bg-secondary hover:bg-opacity-95 text-white rounded-xl"><PlusCircle size={18} /></button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3 items-center">
                        <span className="text-[10px] text-gray-400 font-bold mr-1">Sugerencias:</span>
                        {COMMON_CONDITIONS.map(cond => (
                          <button
                            type="button"
                            key={cond}
                            onClick={() => !conditionsTags.includes(cond) && setConditionsTags([...conditionsTags, cond])}
                            className="bg-slate-100 hover:bg-slate-200 text-secondary text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition-all"
                          >
                            + {cond}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {conditionsTags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-bold">
                            {tag}
                            <button type="button" onClick={() => removeCondition(tag)} className="text-blue-500 hover:text-blue-800"><X size={12} /></button>
                          </span>
                        ))}
                        {conditionsTags.length === 0 && <span className="text-xs text-gray-400 font-semibold italic">Sin padecimientos añadidos.</span>}
                      </div>
                    </div>

                    {/* Hospital list editor */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Hospitales Inscritos</label>
                        <button type="button" onClick={addHospital} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                          <Plus size={14} /> Añadir Hospital
                        </button>
                      </div>
                      <div className="space-y-3">
                        {hospitalsList.map((h) => (
                          <div key={h.id} className={`p-4 rounded-2xl border ${h.is_primary ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'} flex flex-col gap-3 relative`}>
                            <button type="button" onClick={() => removeHospital(h.id)} className="absolute top-4 right-4 text-red-500 p-1 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-red-100"><Trash2 size={14} /></button>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-secondary">
                              <input type="radio" checked={h.is_primary} onChange={() => setPrimaryHospital(h.id)} className="text-primary focus:ring-primary" />
                              <span>Prioritario ⭐</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input 
                                type="text" placeholder="Nombre del hospital" required
                                value={h.name} onChange={e => updateHospital(h.id, 'name', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                              />
                              <input 
                                type="text" placeholder="NSS asociado"
                                value={h.nss || ''} onChange={e => updateHospital(h.id, 'nss', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tratamientos / Medicamentos</label>
                      <textarea 
                        name="medications" rows="2" placeholder="Medicamentos tomados con frecuencia..." 
                        value={formData.medications || ''} 
                        onChange={e => setFormData({ ...formData, medications: e.target.value })} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notas Médicas Adicionales</label>
                      <textarea 
                        name="medical_notes" rows="2" placeholder="Notas sobre alergias o situaciones complejas..." 
                        value={formData.medical_notes || ''} 
                        onChange={e => setFormData({ ...formData, medical_notes: e.target.value })} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'emergency_contacts' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Contacto</label>
                      <input 
                        type="text" required placeholder="Ej. Carlos Ruiz"
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Parentesco / Relación</label>
                      <input 
                        type="text" required placeholder="Ej. Esposa, Madre, Amigo"
                        value={formData.relationship || ''} 
                        onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Teléfono Principal</label>
                        <input 
                          type="tel" required placeholder="Ej. +34 600 000 000"
                          value={formData.phone || ''} 
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Teléfono Alterno (Opcional)</label>
                        <input 
                          type="tel" placeholder="Ej. +34 600 000 000"
                          value={formData.secondary_phone || ''} 
                          onChange={e => setFormData({ ...formData, secondary_phone: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'vehicles' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Vehículo</label>
                        <select 
                          value={formData.type || 'auto'} 
                          onChange={e => setFormData({ ...formData, type: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="auto">Automóvil</option>
                          <option value="moto">Motocicleta</option>
                          <option value="scooter">Scooter</option>
                          <option value="bicicleta">Bicicleta</option>
                          <option value="patinete">Patinete Eléctrico</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Marca</label>
                        <input 
                          type="text" required placeholder="Ej. Honda"
                          value={formData.make || ''} 
                          onChange={e => setFormData({ ...formData, make: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Modelo</label>
                        <input 
                          type="text" required placeholder="Ej. Civic"
                          value={formData.model || ''} 
                          onChange={e => setFormData({ ...formData, model: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Año</label>
                        <input 
                          type="text" required placeholder="Ej. 2022"
                          value={formData.year || ''} 
                          onChange={e => setFormData({ ...formData, year: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Placa (Matrícula)</label>
                        <input 
                          type="text" placeholder="Ej. AB-1234-C"
                          value={formData.plates || ''} 
                          onChange={e => setFormData({ ...formData, plates: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">VIN / Número de Serie</label>
                        <input 
                          type="text" placeholder="Identificador único"
                          value={formData.vin || ''} 
                          onChange={e => setFormData({ ...formData, vin: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Aseguradora</label>
                        <input 
                          type="text" placeholder="Nombre del seguro"
                          value={formData.insurance_provider || ''} 
                          onChange={e => setFormData({ ...formData, insurance_provider: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Número de Póliza</label>
                        <input 
                          type="text" placeholder="Ej. POL-999-888"
                          value={formData.policy_number || ''} 
                          onChange={e => setFormData({ ...formData, policy_number: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-secondary">
                        <input 
                          type="checkbox" 
                          checked={formData.is_active_qr ?? true} 
                          onChange={e => setFormData({ ...formData, is_active_qr: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Activar en el Perfil QR de Emergencia</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'user_documents' && (
                  <div className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Título del Documento</label>
                      <input 
                        type="text" required placeholder="Ej. Tarjeta de donante, Ficha Médica"
                        value={formData.title || ''} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Extensión</label>
                      <select 
                        value={formData.document_type || 'PDF'} 
                        onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="PDF">PDF</option>
                        <option value="PNG">Imagen PNG</option>
                        <option value="JPG">Imagen JPG</option>
                      </select>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-gray-200 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                        <Upload size={24} />
                      </div>
                      <h4 className="font-bold text-secondary text-sm mb-1">Subir archivo de documento</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mb-4">Ej. Archivo oficial de no resucitación o alergias.</p>
                      
                      <label className="cursor-pointer bg-[#F4EFEA] hover:bg-[#E8DFD8] text-secondary px-6 py-2.5 rounded-xl font-bold transition-all text-xs inline-block">
                        {selectedFile ? 'Cambiar archivo' : 'Seleccionar Archivo'}
                        <input 
                          type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" 
                          onChange={e => setSelectedFile(e.target.files[0])}
                        />
                      </label>
                      {selectedFile && (
                        <p className="text-xs text-secondary font-bold mt-2 truncate">Archivo seleccionado: {selectedFile.name}</p>
                      )}
                      {formData.file_path && !selectedFile && (
                        <p className="text-xs text-gray-400 font-semibold mt-2">Ya existe un archivo subido. Déjalo en blanco si no quieres reemplazarlo.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-3 px-4 rounded-2xl font-sans font-bold text-secondary bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploadingFile}
                    className="flex-1 py-3 px-4 rounded-2xl font-sans font-bold text-white bg-primary hover:bg-btn-hover active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploadingFile ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
