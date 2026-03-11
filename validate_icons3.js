const https = require('https');
const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';

https.get(url, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // No bundle UMD minificado, os nomes dos ícones aparecem em strings como:
    // "AlertCircle" ou como chaves de objeto
    // Extraimos todos os PascalCase que parecem nomes de ícone
    const re = /["']([A-Z][a-zA-Z0-9]{2,30})["']/g;
    const names = new Set();
    let m;
    while ((m = re.exec(data)) !== null) names.add(m[1]);
    
    // Filtra: ícones Lucide são PascalCase com pelo menos 3 chars, sem espaços
    const iconNames = [...names].filter(n => /^[A-Z][a-zA-Z0-9]+$/.test(n)).sort();
    
    // Converte kebab dos usados para PascalCase correto
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

    function toPascal(kebab) {
      return kebab.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }

    console.log('Bundle icons encontrados no bundle:', iconNames.length);
    console.log('\n=== RESULTADO DE VALIDAÇÃO ===\n');

    const broken = [];
    const ok = [];
    used.forEach(icon => {
      const pascal = toPascal(icon);
      if (iconNames.includes(pascal)) {
        ok.push(icon);
      } else {
        broken.push({icon, pascal});
      }
    });

    console.log('✅ OK:', ok.length, '/', used.length);
    console.log('\n❌ AUSENTES (' + broken.length + '):');
    broken.forEach(b => {
      // Tenta encontrar algo parecido
      const base = b.pascal.replace(/\d/g, '').toLowerCase();
      const similar = iconNames.filter(n => n.toLowerCase().includes(base) || base.includes(n.toLowerCase().replace(/\d/g,''))).slice(0, 3);
      console.log('  "' + b.icon + '" (→' + b.pascal + ') | similar no bundle:', similar.join(', ') || 'nenhum');
    });

    // Mostra os primeiros 50 ícones do bundle para debug
    console.log('\n=== PRIMEIROS 60 ÍCONES NO BUNDLE ===');
    console.log(iconNames.slice(0,60).join(', '));
  });
}).on('error', e => console.error(e.message));
