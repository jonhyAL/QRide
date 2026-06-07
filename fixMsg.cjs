const fs = require('fs');

let content = fs.readFileSync('src/pages/PublicProfile.jsx', 'utf8');

const regex = /<p className="text-sm text-white\/90 font-medium leading-relaxed">\s*¡Hola! Soy QRide AI y estaré aquí para guiarte frente a esta emergencia o darte apoyo si eres el primero en responder\. ¿Necesitas saber cómo reaccionar\?\s*<\/p>/m;

const newMsg = `<div className="text-sm text-white/90 font-medium leading-relaxed space-y-2">
                      <p className="font-bold text-red-400 flex items-center gap-1">
                        <AlertCircle size={16} /> Modo Emergencia Activado
                      </p>
                      <p>
                        Hola, soy <strong>QRide AI</strong>. He analizado la ficha médica de este paciente.
                      </p>
                      <p className="text-white/70">
                        Haz clic en <strong>"Ampliar Chat"</strong> para hacerme preguntas sobre sus preexistencias, alergias, o para recibir instrucciones precisas de primeros auxilios según su perfil clínico.
                      </p>
                    </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newMsg);
  fs.writeFileSync('src/pages/PublicProfile.jsx', content);
  console.log('Fixed message in PublicProfile');
} else {
  console.log('Regex did not match');
}
