const fs = require('fs');

function fixHeader(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix import
  if (!content.includes('Maximize2')) {
    content = content.replace(/import \{([^}]+)\}\s*from\s*['"]lucide-react['"];/, (match, group) => {
      return `import { ${group.trim()}, Maximize2 } from 'lucide-react';`;
    });
  }

  // Find the exact block to replace using a regex that captures everything after the close of the div with the title, up to the end of the header
  const regex = /<div className="flex items-center gap-2">\s*<button[\s\S]*?<X size=\{20\}\s*\/>\s*<\/button>\s*(?:<\/div>\s*){1,2}/;
  
  if (regex.test(content)) {
    content = content.replace(regex, `<div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.location.href = '/chat'}
                        className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-full text-white/70 transition-colors"
                        title="Ampliar Chat"
                      >
                        <Maximize2 size={20} />
                      </button>
                      <button 
                        onClick={() => setIsChatbotOpen(false)}
                        className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-full text-white/70 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>`);
    console.log('Fixed button block in ' + filePath);
  } else {
    console.log('Regex did not match in ' + filePath);
  }

  fs.writeFileSync(filePath, content);
}

fixHeader('src/pages/Dashboard.jsx');
fixHeader('src/pages/PublicProfile.jsx');
