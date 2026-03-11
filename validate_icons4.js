const https = require('https');
const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';

https.get(url, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Padrão real do bundle: a.IconName=variable
    const re = /a\.([A-Z][a-zA-Z0-9]+)=/g;
    const bundleIcons = new Set();
    let m;
    while ((m = re.exec(data)) !== null) {
      // Filtra utilitários (createIcons, icons, createElement)
      if (!['CreateIcons','Icons','CreateElement'].includes(m[1])) {
        bundleIcons.add(m[1]);
      }
    }
    console.log('Total de ícones no bundle v0.383.0:', bundleIcons.size);

    // Converte kebab para PascalCase usando a mesma lógica do bundle (Ly function):
    // /(\w)(\w*)(_|-|\s*)/g → upperCase primeiro char + lowerCase resto
    function kebabToPascal(kebab) {
      return kebab.replace(/(\w)(\w*)(-|$)/g, (_, c, r) => c.toUpperCase() + r.toLowerCase());
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

    console.log('\n=== VALIDAÇÃO DOS 132 ÍCONES USADOS ===\n');
    const ok = [];
    const broken = [];
    used.forEach(icon => {
      const pascal = kebabToPascal(icon);
      if (bundleIcons.has(pascal)) {
        ok.push(icon);
      } else {
        // Tenta variações
        const alt = [];
        const b = bundleIcons;
        // Tenta com 2 no final removido
        const noNum = pascal.replace(/\d+$/, '');
        if (b.has(noNum)) alt.push(noNum);
        // Testa alguns mapeamentos manuais conhecidos
        const manual = {
          'Frown': ['Meh','FrownOpen','Angry'],
          'MinusCircle': ['CircleMinus','MinusCircle'],
          'CircleDollar': ['CircleDollarSign','BadgeDollarSign'],
          'HelpCircle': ['CircleHelp','HelpCircle'],
          'AlertCircle': ['CircleAlert','AlertCircle'],
          'CheckCircle': ['CircleCheck','CheckCircle'],
          'XCircle': ['CircleX','XCircle'],
          'PlusCircle': ['CirclePlus','PlusCircle'],
          'ArrowUpCircle': ['CircleArrowUp'],
          'ArrowDownCircle': ['CircleArrowDown'],
          'MinusCircle': ['CircleMinus'],
        };
        const tries = manual[pascal] || [];
        tries.forEach(t => { if (b.has(t)) alt.push(t); });
        broken.push({icon, pascal, alt});
      }
    });

    console.log('✅ PRESENTES:', ok.length, '/', used.length);
    if (broken.length > 0) {
      console.log('\n❌ AUSENTES/QUEBRADOS (' + broken.length + '):');
      broken.forEach(b => {
        console.log('  data-lucide="' + b.icon + '" → tentei "' + b.pascal + '"' +
          (b.alt.length ? ' | alternativas: ' + b.alt.join(', ') : ' | SEM alternativa automática'));
      });
    }

    // Busca manual para os suspeitos
    console.log('\n=== VERIFICAÇÃO MANUAL DOS SUSPEITOS ===');
    const suspects = ['Frown','MinusCircle','CircleDollar','HelpCircle','AlertCircle','CheckCircle','PlusCircle','ArrowUpCircle','ArrowDownCircle','LineChart','FileBarChart','LayoutDashboard','LayoutGrid'];
    suspects.forEach(s => {
      console.log(s + ':', bundleIcons.has(s) ? '✅ existe' : '❌ ausente');
    });
  });
}).on('error', e => console.error(e.message));
