const fs = require('fs');

const correctCode =         {vehicles?.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className={\\\\ \ rounded-[2rem] p-6 shadow-2xl transition-colors duration-500\\\}>
            <h2 className="text-xl md:text-2xl font-black mb-4 flex items-center gap-2"><Car size={24} className="text-blue-500"/> Vehículos Asociados</h2>
            <div className="space-y-3">
              {vehicles.map(v => (
                <div key={v.id} className={\\\\ rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border \ transition-colors\\\}>
                  <div>
                    <h3 className="font-bold text-lg">{v.make} {v.model} ({v.year})</h3>
                    <p className="text-sm font-medium text-blue-500">{v.plates}</p>
                  </div>
                  {(v.insurance_provider || v.policy_number) && (
                    <div className="md:text-right border-l-2 border-blue-500/20 pl-4 md:border-l-0 md:pl-0">
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Seguro</p>
                      <p className="font-bold">{v.insurance_provider || 'Sin especificar'}</p>
                      {v.policy_number && <p className="text-xs">Pol: {v.policy_number}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {documents?.length > 0 && isMedicViewer && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className={\\\\ \ rounded-[2rem] p-6 shadow-2xl transition-colors duration-500 border-2 border-purple-500/30\\\}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-xl md:text-2xl font-black flex items-center gap-2"><FileText size={24} className="text-purple-500"/> Documentos</h2>
              <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 dark:bg-purple-900/50 dark:text-purple-300 w-fit">
                <Lock size={12}/> Confidencial (Paramédico)
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => {
                return (
                  <button key={doc.id} onClick={async () => {
                    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    else alert('No se pudo abrir el documento confidencial.');
                  }} className={\\\\ hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left rounded-2xl p-4 flex items-center gap-3 border \ transition-all active:scale-95\\\}>
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
        )};

let code = fs.readFileSync('src/pages/PublicProfile.jsx', 'utf8');
const startIndex = code.indexOf('{vehicles.length > 0 &&');
const endIndex = code.indexOf('{/* Burbuja Flotante');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + correctCode + '\n\n      ' + code.substring(endIndex);
  fs.writeFileSync('src/pages/PublicProfile.jsx', code);
  console.log('Fixed successfully');
} else {
  console.log('Markers not found');
}
