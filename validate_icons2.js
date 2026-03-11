// Valida ícones Lucide baixando o bundle real e testando
const https = require('https');

// Converte corretamente: "bar-chart-2" -> "BarChart2", "share-2" -> "Share2"
function kebabToCamel(s) {
  return s.split('-').map((part, i) => {
    if (i === 0) return part.charAt(0).toUpperCase() + part.slice(1);
    if (/^\d+$/.test(part)) return part; // número puro não capitaliza
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('');
}

const used = [
  "alert-circle","alert-triangle","arrow-down-circle","arrow-left","arrow-left-right",
  "arrow-right","arrow-up","arrow-up-circle","award","baby","bar-chart-2","bell",
  "book-open","bookmark","bot","brain","brain-circuit","briefcase","building-2",
  "calculator","calendar","calendar-days","car","chart-pie","check","check-circle",
  "chevron-down","chevron-left","chevron-right","circle","circle-alert","circle-dollar",
  "circle-dollar-sign","clipboard-list","clock","copy","credit-card","database",
  "download","dumbbell","external-link","file-bar-chart","file-down","file-text",
  "filter","flame","flask-conical","frown","gamepad-2","gem","gift","git-compare",
  "globe","graduation-cap","grip-vertical","hash","heart","help-circle","history",
  "home","inbox","info","key","landmark","languages","layers","layout-dashboard",
  "layout-grid","leaf","lightbulb","line-chart","link","list","lock","log-out",
  "mail-plus","medal","menu","message-circle","mic","minus","minus-circle","moon",
  "more-horizontal","more-vertical","newspaper","package","palette","party-popper",
  "pen-line","pencil","piggy-bank","pin","plane","play","plus","plus-circle",
  "receipt","refresh-cw","rocket","rotate-ccw","scissors","search","send","settings",
  "share-2","shield","shield-alert","shield-check","shopping-cart","shuffle",
  "sliders-horizontal","smartphone","smile","sparkles","star","sun","sunrise","tag",
  "target","trash-2","trending-down","trending-up","trophy","unlink","upload","user",
  "users","utensils","wallet","x","zap"
];

const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';
console.log('Baixando Lucide v0.383.0 para validação...\n');

https.get(url, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Bundle size:', Math.round(data.length/1024), 'KB\n');
    const missing = [];
    const present = [];
    used.forEach(icon => {
      const camel = kebabToCamel(icon);
      // No bundle UMD o nome aparece como "exports.NomeIcone" ou como chave de objeto
      // Testamos ambas as formas
      const found = data.includes('exports.' + camel) ||
                    data.includes('"' + camel + '"') ||
                    data.includes(' ' + camel + '=') ||
                    data.includes(',' + camel + '=') ||
                    data.includes('{' + camel + ':') ||
                    data.includes('e.' + camel + '=');
      if (found) {
        present.push(icon);
      } else {
        missing.push({kebab: icon, camel: camel});
      }
    });

    console.log('✅ PRESENTES (' + present.length + '/' + used.length + ')');
    console.log('\n❌ AUSENTES/QUEBRADOS (' + missing.length + '):');
    missing.forEach(m => {
      console.log('  data-lucide="' + m.kebab + '"  →  camelCase tentado: ' + m.camel);
    });

    // Agora busca sugestões para os ausentes
    if (missing.length > 0) {
      console.log('\n=== BUSCANDO SUGESTÕES ===');
      missing.forEach(m => {
        const base = m.camel.replace(/\d/g,'').toLowerCase();
        const similar = [];
        // Testa variações comuns
        const variants = [
          m.camel + 's',
          m.camel.replace('Circle',''),
          'Circle' + m.camel,
          m.camel + 'Icon',
        ];
        variants.forEach(v => {
          if (data.includes('exports.' + v) || data.includes('e.' + v + '=')) {
            similar.push(v);
          }
        });
        console.log('  "' + m.kebab + '" → sugestões:', similar.length ? similar.join(', ') : 'nenhuma automática — verificar manualmente');
      });
    }
  });
}).on('error', e => {
  console.log('Erro de rede:', e.message);
});
