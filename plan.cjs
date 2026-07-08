const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');

// 1. Quitar el checkbox y el "Ingresar ID manual", simplificando la UI.
code = code.replace(
  /<label className="flex items-center gap-1\.5 cursor-pointer text-xs font-bold text-primary hover:underline">[\s\S]*?<\/label>/m,
  ''
);

// 2. Modificar la parte del condicional {manualUserId ? (...) : (...)} para que simplemente sea lo que correspondía a "!manualUserId" o que el user_id no se pueda ni elegir en edición, sino que sea fijo.
// Si editando (editingId), el user_id / paciente debería estar en solo lectura.
