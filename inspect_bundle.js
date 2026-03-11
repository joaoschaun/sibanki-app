const https = require('https');
const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';

https.get(url, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Mostra os primeiros 2000 chars para entender a estrutura
    console.log('=== PRIMEIROS 2000 chars do bundle ===');
    console.log(data.substring(0, 2000));
    console.log('\n=== ULTIMOS 500 chars ===');
    console.log(data.substring(data.length - 500));
    
    // Tenta extrair nomes via pattern de exportação
    // UMD tipicamente: t.NomeIcone = function...
    const patterns = [
      /\bt\.([A-Z][a-zA-Z0-9]+)\s*=/g,
      /exports\.([A-Z][a-zA-Z0-9]+)\s*=/g,
      /\bn\.([A-Z][a-zA-Z0-9]+)\s*=/g,
      /\be\.([A-Z][a-zA-Z0-9]+)\s*=/g,
    ];
    
    const found = new Set();
    patterns.forEach(re => {
      let m;
      while ((m = re.exec(data)) !== null) found.add(m[1]);
    });
    console.log('\n=== Icons encontrados via padrão exports ===', found.size);
    if (found.size > 0) {
      console.log([...found].sort().slice(0, 50).join(', '));
    }
  });
}).on('error', e => console.error(e.message));
