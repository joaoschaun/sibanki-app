const fs = require('fs');
const h = fs.readFileSync('public/app/index.html', 'utf8');
const lines = h.split('\n');
const re_open = /<div[\s>\/]/gi;
const re_close = /<\/div>/gi;
let opens = 0, closes = 0, balance = 0;
let problems = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const o = (l.match(re_open) || []).length;
  const c = (l.match(re_close) || []).length;
  const prev = balance;
  balance += o - c;
  opens += o;
  closes += c;
  if (balance < prev && balance < 0) {
    problems.push({ line: i + 1, balance, snippet: l.substring(0, 120) });
  }
}
console.log('Opens:', opens, 'Closes:', closes, 'Diff:', opens - closes);
if (problems.length > 0) {
  console.log('First negative-balance lines:');
  problems.slice(0, 20).forEach(p => console.log('  Line', p.line, 'balance:', p.balance, '|', p.snippet));
}

// Also check script tags
const scriptOpen = (h.match(/<script[\s>]/gi) || []).length;
const scriptClose = (h.match(/<\/script>/gi) || []).length;
console.log('\nScript opens:', scriptOpen, 'Script closes:', scriptClose);
