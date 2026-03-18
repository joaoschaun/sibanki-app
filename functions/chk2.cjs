const fs=require('fs');
const c=fs.readFileSync('../public/app/app.js','utf8');
// Encontrar onde está o saveCrediAmigo completo e verificar fechamento
const s=c.indexOf('function saveCrediAmigo');
const after=c.substring(s,s+2500);
// Contar chaves
let open=0,close=0;
let endIdx=-1;
for(let i=0;i<after.length;i++){
  if(after[i]==='{')open++;
  if(after[i]==='}'){close++;if(open===close){endIdx=i;break;}}
}
console.log('Funcao termina na pos relativa:',endIdx,'linha aprox:',(c.substring(0,s+endIdx).split('\n').length));
console.log('Ultimas 200 chars:',after.substring(endIdx-200,endIdx+10));
