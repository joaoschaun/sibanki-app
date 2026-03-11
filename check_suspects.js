const https = require('https');
const url = 'https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js';

https.get(url, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Padrão corrigido: captura também nomes de 1 char como X
    const re = /a\.([A-Z][a-zA-Z0-9]*)=/g;
    const bundleIcons = new Set();
    let m;
    while ((m = re.exec(data)) !== null) {
      if (!['CreateIcons','Icons','CreateElement'].includes(m[1])) {
        bundleIcons.add(m[1]);
      }
    }
    console.log('Total ícones (regex corrigido):', bundleIcons.size);

    // Verificações específicas
    const checks = [
      'X', 'ChartPie', 'PieChart', 'CircleDollar', 'CircleDollarSign',
      'Frown', 'MinusCircle', 'Zap', 'Home', 'Bell', 'Star', 'Wallet'
    ];
    console.log('\n=== VERIFICAÇÕES ESPECÍFICAS ===');
    checks.forEach(c => {
      console.log('  ' + c + ':', bundleIcons.has(c) ? '✅' : '❌');
    });

    // Busca ícones com "Pie" no nome
    const pie = [...bundleIcons].filter(n => n.toLowerCase().includes('pie'));
    console.log('\nÍcones com "pie":', pie.join(', '));

    // Busca ícones com "Dollar" no nome  
    const dollar = [...bundleIcons].filter(n => n.toLowerCase().includes('dollar'));
    console.log('Ícones com "dollar":', dollar.join(', '));

    // Busca ícones com "Chart" no nome
    const chart = [...bundleIcons].filter(n => n.toLowerCase().includes('chart'));
    console.log('Ícones com "chart":', chart.join(', '));
  });
}).on('error', e => console.error(e.message));
