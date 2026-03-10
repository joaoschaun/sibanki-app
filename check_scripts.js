const fs = require('fs');
const h = fs.readFileSync('public/app/index.html', 'utf8');
const lines = h.split('\n');
let scriptBalance = 0;
let issues = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const opens = (l.match(/<script[\s>]/gi) || []).length;
  const closes = (l.match(/<\/script>/gi) || []).length;
  const prev = scriptBalance;
  scriptBalance += opens - closes;
  if (opens > 0) {
    issues.push({ line: i + 1, type: 'OPEN', balance: scriptBalance, snippet: l.substring(0, 150) });
  }
  if (closes > 0) {
    issues.push({ line: i + 1, type: 'CLOSE', balance: scriptBalance, snippet: l.substring(0, 150) });
  }
  if (scriptBalance > 1) {
    console.log('!!! DOUBLE OPEN at line', i + 1, '- balance:', scriptBalance);
    console.log('   ', l.substring(0, 150));
  }
}
console.log('\nAll script open/close events:');
issues.forEach(e => console.log(`  Line ${e.line} [${e.type}] balance=${e.balance} | ${e.snippet}`));
