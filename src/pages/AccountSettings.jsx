import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, UserList, LockKey, EnvelopeSimple, 
  Phone, Image, CheckCircle, WarningCircle, SignOut,
  Gear, Bell, Moon, Globe, Database, DownloadSimple, UploadSimple
} from '@phosphor-icons/react';

export default function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile');
  
  // Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Security Form States
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });

  // Preferences State
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    publicProfile: true
  });
  
  // Data Export/Import States
  const [dataMessage, setDataMessage] = useState({ type: '', text: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUser(user);
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      setPhone(user.user_metadata?.phone || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
      setEmail(user.email || '');
      
      setPreferences({
        notifications: user.user_metadata?.notifications ?? true,
        darkMode: user.user_metadata?.darkMode ?? false,
        publicProfile: user.user_metadata?.publicProfile ?? true,
      });

      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;
      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (error) {
      setProfileMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setSecurityMessage({ type: '', text: '' });
    if (!newEmail) return;

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setSecurityMessage({ type: 'success', text: 'Se ha enviado un correo de confirmación a tu nueva dirección.' });
      setNewEmail('');
    } catch (error) {
      setSecurityMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSecurityMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecurityMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSecurityMessage({ type: 'error', text: error.message });
    }
  };

  const handleTogglePreference = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    try {
      await supabase.auth.updateUser({
        data: { [key]: value }
      });
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  };

  // --- EXPORT AND IMPORT LOGIC ---
  const handleExportData = async () => {
    setIsExporting(true);
    setDataMessage({ type: '', text: '' });
    try {
      const [mdRes, ctRes, vhRes] = await Promise.all([
        supabase.from('medical_records').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('emergency_contacts').select('*').eq('user_id', user.id),
        supabase.from('vehicles').select('*').eq('user_id', user.id)
      ]);

      const wb = XLSX.utils.book_new();

      if (mdRes.data) {
        const medicalData = [mdRes.data];
        const wsMedical = XLSX.utils.json_to_sheet(medicalData);
        XLSX.utils.book_append_sheet(wb, wsMedical, "Ficha Medica");
      }

      if (ctRes.data && ctRes.data.length > 0) {
        const wsContacts = XLSX.utils.json_to_sheet(ctRes.data);
        XLSX.utils.book_append_sheet(wb, wsContacts, "Contactos");
      }
      
      if (vhRes.data && vhRes.data.length > 0) {
        const wsVehicles = XLSX.utils.json_to_sheet(vhRes.data);
        XLSX.utils.book_append_sheet(wb, wsVehicles, "Vehiculos");
      }

      XLSX.writeFile(wb, `qride_respaldo_${new Date().toISOString().split('T')[0]}.xlsx`);
      setDataMessage({ type: 'success', text: 'Tus datos se exportaron correctamente en formato Excel.' });
      
    } catch (error) {
      console.error('Export error:', error);
      setDataMessage({ type: 'error', text: 'Error al generar Excel: ' + error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Cargar este archivo reemplazará o agregará múltiples registros médicos (contactos, ficha). ¿Seguro de continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setDataMessage({ type: '', text: '' });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        
        let importCount = 0;

        // Ficha Médica
        if (wb.SheetNames.includes("Ficha Medica")) {
          const mdData = XLSX.utils.sheet_to_json(wb.Sheets["Ficha Medica"]);
          if (mdData.length > 0) {
             const row = mdData[0];
             delete row.id; 
             delete row.user_id;

             const { data: existingRecord } = await supabase.from('medical_records').select('id').eq('user_id', user.id).maybeSingle();
             if (existingRecord) {
                await supabase.from('medical_records').update(row).eq('id', existingRecord.id);
             } else {
                row.user_id = user.id;
                await supabase.from('medical_records').insert([row]);
             }
             importCount++;
          }
        }

        // Contactos
        if (wb.SheetNames.includes("Contactos")) {
          const contacts = XLSX.utils.sheet_to_json(wb.Sheets["Contactos"]);
          if (contacts.length > 0) {
            const cleanContacts = contacts.map(c => {
               delete c.id;
               delete c.created_at;
               c.user_id = user.id;
               return c;
            });
            await supabase.from('emergency_contacts').insert(cleanContacts);
            importCount += contacts.length;
          }
        }

        if (importCount > 0) {
          setDataMessage({ type: 'success', text: '¡Datos de Excel importados exitosamente!' });
        } else {
          setDataMessage({ type: 'error', text: 'El archivo Excel está vacío o le faltan pestañas ("Ficha Medica" y/o "Contactos").' });
        }

      } catch (error) {
        console.error('Import error:', error);
        setDataMessage({ type: 'error', text: 'Hubo un problema procesando el formato del Excel.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderToggle = ({ label, icon: Icon, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F4EFEA]/50 border border-[#E8DFD8] hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-secondary">
          <Icon size={20} weight="fill" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-secondary">{label}</h4>
          <p className="text-xs text-secondary/60 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-primary' : 'bg-secondary/20'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      setProfileMessage({ type: '', text: '' });
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen para subir.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error('Error subiendo imagen. Asegúrate de tener un bucket "avatars" público en Supabase.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setProfileMessage({ type: 'success', text: 'Foto actualizada correctamente.' });
    } catch (error) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const renderMessageBanner = (msg) => {
    if (!msg.text) return null;
    return (
      <div className={`p-4 mb-6 rounded-2xl flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
        {msg.type === 'error' ? <WarningCircle size={24} /> : <CheckCircle size={24} />}
        <span className="font-medium text-sm">{msg.text}</span>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4EFEA] flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4EFEA] text-secondary font-sans pb-20 md:pb-0">
      <header className="bg-white px-6 py-4 flex items-center shadow-sm sticky top-0 z-30">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 mr-4 bg-[#F4EFEA] rounded-xl hover:bg-primary/10 transition-colors text-secondary"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Mi Cuenta</h1>
          <p className="text-xs text-secondary/60">Configuración y seguridad</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="md:w-64 flex-shrink-0 grid grid-cols-2 md:flex md:flex-col gap-3 pb-4 md:pb-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 p-3 md:px-5 md:py-4 rounded-2xl transition-all text-center md:text-left ${activeTab === 'profile' ? 'bg-primary text-white font-bold shadow-md' : 'bg-white text-secondary/70 hover:bg-white/60 font-medium'}`}
          >
            <UserList size={20} weight={activeTab === 'profile' ? 'fill' : 'regular'} />
            Datos Personales
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 p-3 md:px-5 md:py-4 rounded-2xl transition-all text-center md:text-left ${activeTab === 'security' ? 'bg-primary text-white font-bold shadow-md' : 'bg-white text-secondary/70 hover:bg-white/60 font-medium'}`}
          >
            <LockKey size={20} weight={activeTab === 'security' ? 'fill' : 'regular'} />
            Seguridad y Acceso
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 p-3 md:px-5 md:py-4 rounded-2xl transition-all text-center md:text-left ${activeTab === 'preferences' ? 'bg-primary text-white font-bold shadow-md' : 'bg-white text-secondary/70 hover:bg-white/60 font-medium'}`}
          >
            <Gear size={20} weight={activeTab === 'preferences' ? 'fill' : 'regular'} />
            Ajustes y Preferencias
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 p-3 md:px-5 md:py-4 rounded-2xl transition-all text-center md:text-left ${activeTab === 'data' ? 'bg-primary text-white font-bold shadow-md' : 'bg-white text-secondary/70 hover:bg-white/60 font-medium'}`}
          >
            <Database size={20} weight={activeTab === 'data' ? 'fill' : 'regular'} />
            Datos y Privacidad
          </button>
          
          <div className="hidden md:block mt-8 pt-8 border-t border-[#E8DFD8]">
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
              className="flex w-full items-center gap-3 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 font-bold transition-all"
            >
              <SignOut size={20} weight="bold" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm overflow-hidden">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-2xl font-black mb-6">Datos Personales</h2>
              {renderMessageBanner(profileMessage)}

              <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 p-6 bg-[#F4EFEA]/50 rounded-[2rem] border border-[#E8DFD8]">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserList size={40} className="text-primary/50" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-105 transition-transform" title="Cambiar Foto">
                    <Image size={16} weight="bold" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-lg">{firstName || 'Tu Nombre'} {lastName || ''}</h3>
                  <p className="text-sm text-secondary/60">Actualiza tu foto de perfil. Recomendado: 1:1 JPG/PNG.</p>
                  {uploading && <p className="text-xs text-primary font-bold mt-1 animate-pulse">Subiendo imagen...</p>}
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-secondary/80 mb-2">Nombre (s)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/40">
                        <UserList size={20} />
                      </div>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl pl-11 pr-4 py-3.5 text-secondary placeholder:text-secondary/40 focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                        placeholder="Ej. Juan"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary/80 mb-2">Apellidos</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary placeholder:text-secondary/40 focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                      placeholder="Ej. Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary/80 mb-2">Número de Teléfono</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/40">
                      <Phone size={20} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F4EFEA] border-none rounded-xl pl-11 pr-4 py-3.5 text-secondary placeholder:text-secondary/40 focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                      placeholder="Ej. 55 1234 5678"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={uploading} className="w-full md:w-auto py-3.5 px-8 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-2xl font-black mb-6">Seguridad y Acceso</h2>
              {renderMessageBanner(securityMessage)}

              <div className="space-y-10">
                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <EnvelopeSimple size={24} className="text-primary" />
                    Actualizar Correo Electrónico
                  </h3>
                  <div className="bg-[#F4EFEA]/50 p-5 rounded-2xl mb-4 border border-[#E8DFD8]">
                    <p className="text-sm font-medium text-secondary/80 mb-1">Correo actual:</p>
                    <p className="font-bold cursor-default select-all">{email}</p>
                  </div>
                  <form onSubmit={handleUpdateEmail} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1 bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                      placeholder="Nuevo correo electrónico"
                    />
                    <button type="submit" className="py-3.5 px-6 rounded-xl font-bold text-white bg-secondary hover:bg-secondary/90 transition-all whitespace-nowrap hidden sm:block">
                      Actualizar
                    </button>
                    <button type="submit" className="sm:hidden py-3.5 px-6 rounded-xl font-bold text-white bg-secondary hover:bg-secondary/90 transition-all w-full">
                      Actualizar Correo
                    </button>
                  </form>
                  <p className="text-xs text-secondary/60 mt-2">Nota: Se enviará un enlace de confirmación antes de que el cambio se haga efectivo.</p>
                </section>

                <hr className="border-[#E8DFD8]" />

                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <LockKey size={24} className="text-primary" />
                    Cambiar Contraseña
                  </h3>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Nueva Contraseña</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary/80 mb-2">Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#F4EFEA] border-none rounded-xl px-4 py-3.5 text-secondary focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                        placeholder="Repite la nueva contraseña"
                      />
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="w-full md:w-auto py-3.5 px-8 rounded-xl font-bold text-white bg-secondary hover:bg-secondary/90 transition-all">
                        Cambiar Contraseña
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-2xl font-black mb-6">Ajustes y Preferencias</h2>

              <div className="space-y-4">
                {renderToggle({
                  label: "Notificaciones Push",
                  description: "Avisos sobre alertas y escaneos de tu código QR.",
                  icon: Bell,
                  checked: preferences.notifications,
                  onChange: (v) => handleTogglePreference('notifications', v)
                })}

                {renderToggle({
                  label: "Perfil Público Activo",
                  description: "Permite que tu perfil de emergencia sea visible al escanear tu QR. Si lo desactivas, la información no será accesible.",
                  icon: Globe,
                  checked: preferences.publicProfile,
                  onChange: (v) => handleTogglePreference('publicProfile', v)
                })}

                {renderToggle({
                  label: "Modo Oscuro (App)",
                  description: "Cambiar la apariencia de la interface principal a escala de grises oscuros (En desarrollo).",
                  icon: Moon,
                  checked: preferences.darkMode,
                  onChange: (v) => handleTogglePreference('darkMode', v)
                })}
              </div>
            </div>
          )}

          {/* DATA AND PRIVACY TAB */}
          {activeTab === 'data' && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-2xl font-black mb-6">Datos y Privacidad</h2>
              {renderMessageBanner(dataMessage)}

              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <DownloadSimple size={24} className="text-primary" />
                    Exportar toda tu información
                  </h3>
                  <p className="text-secondary/70 mb-4 text-sm leading-relaxed">
                    Descarga un archivo seguro con todos tus datos personales, médicos, contactos, y vehículos asociados a tu QRide. Esto será muy útil si deseas darle tus datos rápidamente a tu médico o respaldarlos.
                  </p>
                  <button 
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white bg-secondary hover:bg-secondary/90 transition-all disabled:opacity-50"
                  >
                    <DownloadSimple size={20} weight="bold" />
                    {isExporting ? 'Generando archivo...' : 'Descargar mis datos'}
                  </button>
                </section>

                <hr className="border-[#E8DFD8]" />

                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <UploadSimple size={24} className="text-primary" />
                    Importar un perfil QRide
                  </h3>
                  <p className="text-secondary/70 mb-4 text-sm leading-relaxed">
                    ¿Tienes un archivo de datos QRide que quieras subir? Al importarlo, agregaremos o combinaremos la información de ese respaldo con tu cuenta actual para facilitarte la captura de datos.
                  </p>
                  
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleImportData}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold bg-[#F4EFEA] hover:bg-[#E8DFD8] text-secondary transition-all disabled:opacity-50"
                  >
                    <UploadSimple size={20} weight="bold" />
                    {isImporting ? 'Procesando importación...' : 'Subir archivo de respaldo (.xlsx)'}
                  </button>
                </section>
              </div>

            </div>
          )}

        </div>
      </div>
      
      {/* Mobile Logout (shows at bottom) */}
      <div className="md:hidden p-4 mb-8">
        <button 
          onClick={async () => {
             await supabase.auth.signOut();
             navigate('/');
          }}
          className="flex w-full items-center justify-center gap-3 p-4 rounded-2xl bg-white border border-red-100 text-red-500 font-bold shadow-sm"
        >
          <SignOut size={20} weight="bold" />
          Cerrar Sesión
        </button>
      </div>

      {/* Global CSS injected for hiding scrollbar if needed */}
                  <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

