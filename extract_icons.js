const fs = require('fs');
const js  = fs.readFileSync('public/app/app.js',    'utf8');
const html = fs.readFileSync('public/app/index.html','utf8');
const css  = fs.readFileSync('public/app/app.css',  'utf8');
const all  = js + html + css;

// 1) Todos data-lucide="xxx"
const attrRe = /data-lucide=["']([a-z0-9-]+)["']/g;
// 2) lucide: 'xxx'  (nos sibOnbQuestions etc)
const objRe  = /lucide:\s*['"]([a-z0-9-]+)['"]/g;
// 3) data-lucide="xxx  (truncado no search — apanha o nome completo)
const strRe  = /data-lucide=\\"([a-z0-9-]+)\\"/g;

const names = new Set();
let m;
while ((m = attrRe.exec(all)) !== null) names.add(m[1]);
while ((m = objRe.exec(all))  !== null) names.add(m[1]);
while ((m = strRe.exec(all))  !== null) names.add(m[1]);

const sorted = [...names].sort();
console.log('=== TOTAL UNIQUE ICONS:', sorted.length, '===');
console.log(sorted.join('\n'));

// 4) Contar createIcons calls
const ci = (js.match(/lucide\.createIcons\(\)/g)||[]).length;
const refreshCalls = (js.match(/refreshLucide\(\)/g)||[]).length;
console.log('\n=== createIcons() calls in app.js:', ci, '===');
console.log('=== refreshLucide() calls in app.js:', refreshCalls, '===');

// 5) Linhas com innerHTML que NÃO têm createIcons logo após (próximas 5 linhas)
const lines = js.split('\n');
const suspects = [];
lines.forEach((ln, i) => {
  if (/\.innerHTML\s*=|\.innerHTML\s*\+=/.test(ln) && /data-lucide/.test(ln)) {
    // Check next 6 lines for createIcons
    const window5 = lines.slice(i, i+7).join('\n');
    if (!/createIcons|refreshLucide/.test(window5)) {
      suspects.push({line: i+1, content: ln.trim().substring(0,120)});
    }
  }
});
console.log('\n=== innerHTML+lucide WITHOUT createIcons nearby (' + suspects.length + ' suspects) ===');
suspects.forEach(s => console.log('L'+s.line+':', s.content));
