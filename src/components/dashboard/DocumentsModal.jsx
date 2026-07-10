import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Upload, ShieldCheck, Lock, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function DocumentsModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchDocuments();
    }
  }, [isOpen, user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!user) return;
    
    setLoading(true);
    
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `user_uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record in user_documents table
      const newDoc = {
        user_id: user.id,
        title: file.name,
        document_type: fileExt.toUpperCase(),
        file_path: filePath
      };

      const { data, error: dbError } = await supabase
        .from('user_documents')
        .insert([newDoc])
        .select();

      if (dbError) throw dbError;

      // Update UI
      setDocuments([data[0], ...documents]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Hubo un error al subir el documento.');
    } finally {
      setLoading(false);
      e.target.value = null; // reset input
    }
  };

  const handleDelete = async (docId, filePath) => {
    if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;
    try {
      // Remove from storage
      await supabase.storage.from('documents').remove([filePath]);
      // Remove from DB
      await supabase.from('user_documents').delete().eq('id', docId);
      
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Error deleting doc:', error);
    }
  };

  const handleEdit = (doc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title || '');
  };

  const handleSaveEdit = async (docId) => {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_documents')
        .update({ title: editTitle.trim() })
        .eq('id', docId);
      
      if (error) throw error;
      setDocuments(documents.map(d => d.id === docId ? { ...d, title: editTitle.trim() } : d));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating doc:', error);
      alert('Error al actualizar el documento');
    } finally {
      setLoading(false);
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
            className="relative bg-[#F4EFEA] w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            <div className="bg-white p-6 border-b border-[#E8DFD8] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary">Documentos Médicos</h3>
                  <p className="text-sm border border-purple-200 bg-purple-50 px-2 py-0.5 rounded-md text-purple-700 font-bold inline-flex items-center gap-1 mt-1 transition-all"><FileText size={12}/> Documentos del Usuario</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-secondary/40 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-dashed border-[#E8DFD8] text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500">
                  <Upload size={28} />
                </div>
                <h4 className="font-bold text-secondary mb-1">Subir Documento (PDF)</h4>
                <p className="text-xs text-secondary/60 max-w-xs mx-auto mb-4">Ej. Carta de no resucitación, tarjeta de donante o expediente médico resumido.</p>
                <label className="cursor-pointer bg-secondary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-secondary/90 transition-colors inline-block">
                  Seleccionar Archivo
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={loading}/>
                </label>
                {loading && <p className="text-xs font-bold text-primary mt-3 animate-pulse">Subiendo documento...</p>}
              </div>

              <div>
                <h4 className="font-black mb-3">Tus Archivos</h4>
                {documents.length === 0 ? (
                  <p className="text-sm text-secondary/50 italic bg-white p-4 rounded-xl">No has subido documentos formales aún.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white p-4 rounded-xl border border-[#E8DFD8] flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                          <div className="p-2 bg-red-100 text-red-500 rounded-lg shrink-0"><FileText size={18}/></div>
                          {editingId === doc.id ? (
                            <div className="flex-1 flex gap-2 mr-2">
                               <input 
                                  type="text" 
                                  value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary outline-none"
                                  autoFocus
                               />
                            </div>
                          ) : (
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-secondary truncate max-w-[200px]" title={doc.title}>{doc.title}</p>
                                <p className="text-xs text-secondary/50"> • {doc.document_type || 'PDF'}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {editingId === doc.id ? (
                                <>
                                  <button onClick={() => handleSaveEdit(doc.id)} className="text-xs bg-primary text-white font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">Guardar</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
                                </>
                            ) : (
                                <>
                                  <div className="text-xs bg-green-50 text-green-700 font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                    <ShieldCheck size={14}/> Seguro
                                  </div>
                                  <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(doc)} className="p-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar Nombre">
                                      <FileText size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(doc.id, doc.file_path)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}