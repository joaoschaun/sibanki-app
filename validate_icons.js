// Tenta carregar lucide do node_modules ou via npm install temporário
let lucideIcons = null;
try {
  lucideIcons = require('./node_modules/lucide/dist/cjs/lucide.js');
} catch(e) {
  try {
    lucideIcons = require('lucide');
  } catch(e2) {
    // Fallback: usar a lista canônica da v0.383.0 conhecida
    lucideIcons = null;
  }
}

// Lista canônica Lucide 0.383.0 — extraída do bundle UMD
// Todos os nomes são camelCase internamente, mas o HTML usa kebab-case
// Testamos a conversão kebab->camel
function kebabToCamel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
           .replace(/^([a-z])/, (c) => c.toUpperCase());
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

if (lucideIcons) {
  console.log('Lucide carregado do node_modules - versão:', lucideIcons.version || 'desconhecida');
  const available = Object.keys(lucideIcons);
  const missing = [];
  const found = [];
  used.forEach(icon => {
    const camel = kebabToCamel(icon);
    if (available.includes(camel)) {
      found.push(icon);
    } else {
      missing.push({icon, camel});
    }
  });
  console.log('\n✅ ENCONTRADOS (' + found.length + '):', found.join(', '));
  console.log('\n❌ AUSENTES/QUEBRADOS (' + missing.length + '):');
  missing.forEach(m => console.log('  data-lucide="' + m.icon + '"  →  camelCase: ' + m.camel));
} else {
  // Valida com fetch do CDN - lista do bundle 0.383.0
  // Ícones CONFIRMADOS como ausentes em Lucide <= 0.450:
  const KNOWN_MISSING_OR_RENAMED = {
    'frown':          'meh (use "meh" ou "annoyed" em v0.383)',
    'minus-circle':   'circle-minus (renomeado em v0.290+)',
    'circle-dollar':  'circle-dollar-sign (use apenas circle-dollar-sign)',
    'bot':            'OK em 0.383',
    'baby':           'OK em 0.383',
    'brain-circuit':  'OK em 0.383',
    'flask-conical':  'OK em 0.383',
    'piggy-bank':     'OK em 0.383',
    'party-popper':   'OK em 0.383',
    'mail-plus':      'OK em 0.383',
    'grip-vertical':  'OK em 0.383',
    'pen-line':       'OK em 0.383',
    'layout-grid':    'OK em 0.383',
    'layout-dashboard': 'OK em 0.383',
    'calendar-days':  'OK em 0.383',
    'line-chart':     'Pode ser "chart-line" em versões novas, mas OK em 0.383',
    'file-bar-chart': 'OK em 0.383',
    'shield-alert':   'OK em 0.383',
    'sliders-horizontal': 'OK em 0.383',
  };

  console.log('node_modules lucide não encontrado — usando lista de referência conhecida\n');
  console.log('=== ÍCONES PROBLEMÁTICOS CONHECIDOS ===');
  const problematic = ['frown', 'minus-circle', 'circle-dollar'];
  used.forEach(icon => {
    const note = KNOWN_MISSING_OR_RENAMED[icon];
    if (note && !note.startsWith('OK')) {
      console.log('❌  data-lucide="' + icon + '" → ' + note);
    }
  });

  console.log('\n=== VERIFICAÇÃO FINAL via node http ===');
  // Tentativa de verificar online se disponível
  const https = require('https');
  const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';
  console.log('Buscando', url, '...');
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      const missing = [];
      used.forEach(icon => {
        const camel = kebabToCamel(icon);
        // No bundle UMD, os ícones aparecem como "camelName:" ou "camelName :"
        if (!data.includes('"' + camel + '"') && !data.includes(' ' + camel + ':') && !data.includes(',' + camel + ':')) {
          missing.push(icon + ' (' + camel + ')');
        }
      });
      console.log('\n❌ AUSENTES no bundle real v0.383.0 (' + missing.length + '):');
      missing.forEach(m => console.log('  ', m));
      if (missing.length === 0) console.log('  Nenhum — todos os ícones existem!');
    });
  }).on('error', e => {
    console.log('Erro ao buscar CDN (sem internet?):', e.message);
    console.log('Usando lista de referência estática.');
  });
}
