(function(){
var old1=localStorage.getItem('brapiToken');
var old2=localStorage.getItem('vrt_b3_token');
var cur=localStorage.getItem('vrt_b3token');
if(!cur&&old1){localStorage.setItem('vrt_b3token',old1);}
if(!cur&&!old1&&old2){localStorage.setItem('vrt_b3token',old2);}
})();

/* ── Performance: Debounce Lucide (não bloqueia, apenas agrupa chamadas rápidas) ── */
(function(){
var _timer=null;
var _orig=null;
function init(){
if(typeof lucide==='undefined'||!lucide.createIcons){setTimeout(init,200);return;}
if(_orig)return;
_orig=lucide.createIcons.bind(lucide);
lucide.createIcons=function(){
clearTimeout(_timer);
_timer=setTimeout(function(){try{_orig();}catch(e){}},15);
};
}
setTimeout(init,100);
})();

/* ── next block ── */

function pf(id){var v=document.getElementById(id);if(!v)return 0;return parseFloat(String(v.value).replace(/\./g,'').replace(',','.'))||0;}

var authResolved=false;
setTimeout(function(){
if(authResolved)return;
var lb=document.getElementById('loadBg');
if(lb){lb.classList.add('hidden');lb.style.display='none';}
var splash=document.getElementById('virtSplash');
if(splash){splash.classList.add('gone');setTimeout(function(){if(splash.parentNode)splash.parentNode.removeChild(splash);},500);}
var ab=document.getElementById('authBg');
var appEl=document.getElementById('app');
if(ab){ab.classList.remove('hidden');}
if(appEl){appEl.classList.add('on');}
if(typeof showLog==='function')showLog();
},8000);

/* ── next block ── */

var firebaseConfig={
apiKey:"AIzaSyAFuVpVJQb51MYqXyKD9w9ETwI-FHKv2k8",
authDomain:"virtus-financeiro-cd7bd.firebaseapp.com",
projectId:"virtus-financeiro-cd7bd",
storageBucket:"virtus-financeiro-cd7bd.firebasestorage.app",
messagingSenderId:"508459921027",
appId:"1:508459921027:web:fb54b7f94795bdb88735b6",
measurementId:"G-M03SM9BFWX"
};
firebase.initializeApp(firebaseConfig);
/* App Check: ative após registrar o app em Firebase Console > App Check e definir window.APP_CHECK_RECAPTCHA_SITE_KEY (chave reCAPTCHA v3) */
if(typeof firebase.appCheck!=='undefined'&&window.APP_CHECK_RECAPTCHA_SITE_KEY){try{firebase.appCheck().activate(window.APP_CHECK_RECAPTCHA_SITE_KEY,{isTokenAutoRefreshEnabled:true});}catch(e){console.warn('App Check:',e);}}
var auth=firebase.auth();
var db=firebase.firestore();
var U=null,entries=[],investments=[],achievements={},goals=[],budgets={},orcamentosByMonth={},charts={},commProfile=null,commPosts=[],dashboardLayout=null;
var onboardingDone=false;
var tourModulos={};
var onboardingState={step:1,banks:[],mainAccount:null,balance:0};

var defaultCats=['Moradia','Transporte','Alimentação','Saúde','Bem-estar','Educação','Lazer','Cartões','Empréstimo','Assinaturas','Imprevisto','Salário','Freela','Investimentos','Transferencia','Outros'];
var defaultAccs=['Nubank','Inter','Itaú','Bradesco','Banco do Brasil','Caixa Econômica','Santander','C6 Bank','PagBank','Neon','Safra','BTG Pactual','Sicoob','Sicredi','Original','Mercado Pago','PicPay','XP Investimentos','Rico','Clear','Modal Mais','Banco Pan','Will Bank','Next','Agi','Dinheiro'];
var userCats=[];
var userAccs=[];
var accountBalances={};
var accountCesta={};
var accountMeta={};

function showLog(){document.getElementById('loginBox').style.display='block';document.getElementById('regBox').style.display='none';var fb=document.getElementById('forgotBox');if(fb)fb.style.display='none';var vb=document.getElementById('verifyEmailBox');if(vb)vb.style.display='none';clrErr();if(typeof checkAuthInviteHash==='function')checkAuthInviteHash();}
function showReg(){document.getElementById('loginBox').style.display='none';document.getElementById('regBox').style.display='block';var fb=document.getElementById('forgotBox');if(fb)fb.style.display='none';var vb=document.getElementById('verifyEmailBox');if(vb)vb.style.display='none';clrErr();if(typeof checkAuthInviteHash==='function')checkAuthInviteHash();}
function showForgot(){document.getElementById('loginBox').style.display='none';document.getElementById('regBox').style.display='none';var fb=document.getElementById('forgotBox');if(fb){fb.style.display='block';var inp=document.getElementById('forgotEmail');if(inp){inp.value='';inp.focus();}}var vb=document.getElementById('verifyEmailBox');if(vb)vb.style.display='none';var e=document.getElementById('forgotErr');if(e){e.textContent='';e.classList.remove('show');}clrErr()}
function showVerifyEmail(user){document.getElementById('loginBox').style.display='none';document.getElementById('regBox').style.display='none';var fb=document.getElementById('forgotBox');if(fb)fb.style.display='none';var vb=document.getElementById('verifyEmailBox');if(vb){vb.style.display='block';var addr=document.getElementById('verifyEmailAddr');if(addr)addr.textContent=user.email||'';}var ve=document.getElementById('verifyErr');if(ve){ve.textContent='';ve.classList.remove('show');}}
function resendVerifyEmail(){var u=auth.currentUser;if(!u){return;}var btn=document.getElementById('verifyResendBtn');var ve=document.getElementById('verifyErr');if(btn){btn.disabled=true;btn.textContent=typeof t==='function'?t('btn_enviando'):'Enviando...';}if(ve){ve.textContent='';ve.classList.remove('show');ve.style.color='';}var continueUrl=window.location.origin+'/app/';var done=function(success,msg){if(btn){btn.disabled=false;btn.textContent=typeof t==='function'?t('btn_reenviar_email'):'Reenviar e-mail';}if(success&&ve){ve.innerHTML='<span style=\"color:var(--green)\">'+(typeof t==='function'?t('toast_email_reenviado'):'E-mail reenviado!')+' Confira sua caixa de entrada, spam e promoções.</span>';ve.classList.add('show');}else if(!success&&ve){ve.textContent=msg||'Erro ao enviar.';ve.classList.add('show');}if(success&&typeof toast==='function')toast(typeof t==='function'?t('toast_email_reenviado'):'E-mail reenviado!','ok');};var sendViaResend=function(){try{var fn=firebase.functions().httpsCallable('sendVerificationEmail');fn({continueUrl:continueUrl}).then(function(r){if(r&&r.data&&r.data.ok){done(true);}else{done(false,r.data&&r.data.message||'Falha ao enviar.');}}).catch(function(err){var code=err.code||(err.details&&err.details.code);var msg=err.message||(err.details&&err.details.message);if(code==='failed-precondition'||(msg&&msg.indexOf('não configurado')!==-1)){u.sendEmailVerification({url:continueUrl}).then(function(){done(true);}).catch(function(e){done(false,e.code==='auth/too-many-requests'?'Aguarde 1–2 minutos antes de reenviar.':e.message);});}else{done(false,msg||'Erro ao enviar. Tente novamente.');}});}catch(e){u.sendEmailVerification({url:continueUrl}).then(function(){done(true);}).catch(function(err){done(false,err.code==='auth/too-many-requests'?'Aguarde 1–2 minutos antes de reenviar.':err.message);});}};sendViaResend();}
function doVerifySignOut(){auth.signOut().then(function(){window._justLoggedOut=true;});}
function recheckEmailVerified(){var u=auth.currentUser;if(!u)return;u.reload().then(function(){if(u.emailVerified){location.reload();}else{if(typeof toast==='function')toast(typeof t==='function'?t('toast_verifique_email'):'Ainda não verificado. Clique no link que enviamos por e-mail.','warn');}}).catch(function(){if(typeof toast==='function')toast(typeof t==='function'?t('toast_erro_verificar'):'Erro ao verificar. Tente novamente.','err');});}
function checkAuthInviteHash(){
var banner=document.getElementById('authInviteBanner');var txt=document.getElementById('authInviteBannerText');var lE=document.getElementById('lE');var rE=document.getElementById('rE');
if(!banner||!txt)return;
var m=window.location.hash.match(/#invite=([a-zA-Z0-9_-]+)/);
if(!m){banner.style.display='none';window._pendingInvite=null;if(lE)lE.removeAttribute('readonly');if(rE)rE.removeAttribute('readonly');return;}
var invId=m[1];
db.collection('invites').doc(invId).get().then(function(snap){
if(!snap.exists){banner.style.display='none';window._pendingInvite=null;return;}
var d=snap.data();
if(d.status!=='pending'){banner.style.display='none';window._pendingInvite=null;return;}
window._pendingInvite={id:invId,fromName:d.fromName||'Alguém',toEmail:d.toEmail||''};
txt.textContent=d.fromName+' convidou você para o modo Família. Crie sua conta ou faça login com o e-mail '+d.toEmail+' para aceitar.';
banner.style.display='block';
if(lE){lE.value=d.toEmail;lE.readOnly=true;}
if(rE){rE.value=d.toEmail;rE.readOnly=true;}
}).catch(function(){banner.style.display='none';window._pendingInvite=null;if(lE)lE.removeAttribute('readonly');if(rE)rE.removeAttribute('readonly');});
}
function doForgotPassword(){
var email=document.getElementById('forgotEmail').value.trim();
if(!email){var fe=document.getElementById('forgotErr');fe.textContent=typeof t==='function'?t('err_digite_email'):'Digite seu e-mail';fe.classList.add('show');return;}
var btn=document.getElementById('forgotBtn');var fe=document.getElementById('forgotErr');
btn.disabled=true;btn.textContent=typeof t==='function'?t('btn_enviando'):'Enviando...';fe.textContent='';fe.classList.remove('show');
auth.sendPasswordResetEmail(email).then(function(){
btn.disabled=false;btn.textContent=typeof t==='function'?t('btn_enviar_link'):'Enviar link';
fe.innerHTML='<span style="color:var(--green)">'+(typeof t==='function'?t('err_link_enviado'):'Link enviado! Verifique seu e-mail (e a pasta de spam).')+'</span>';fe.classList.add('show');
}).catch(function(err){
btn.disabled=false;btn.textContent=typeof t==='function'?t('btn_enviar_link'):'Enviar link';
var msg=err.code==='auth/user-not-found'?(typeof t==='function'?t('err_email_nao_cadastrado'):'E-mail não cadastrado'):err.code==='auth/invalid-email'?(typeof t==='function'?t('err_email_invalido'):'E-mail inválido'):err.code==='auth/too-many-requests'?(typeof t==='function'?t('err_muitas_tentativas'):'Muitas tentativas. Tente mais tarde.'):err.message;
fe.textContent=msg;fe.classList.add('show');
});
}
function clrErr(){var e=document.querySelectorAll('.auth-err');for(var i=0;i<e.length;i++){e[i].classList.remove('show');e[i].textContent=''}}
function sErr(id,m){var e=document.getElementById(id);e.textContent=m;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}

function doLogin(){
var e=document.getElementById('lE').value.trim(),p=document.getElementById('lP').value;
if(!e||!p){sErr('lErr',typeof t==='function'?t('err_preencha_campos'):'Preencha todos os campos');return}
try{sessionStorage.setItem('vrt_just_logged_in','1');}catch(z){}
var b=document.getElementById('lBtn');b.disabled=true;b.textContent=typeof t==='function'?t('btn_entrando'):'Entrando...';
var loginTimeout=setTimeout(function(){b.disabled=false;b.textContent=typeof t==='function'?t('btn_entrar'):'Entrar';sErr('lErr',typeof t==='function'?t('toast_tempo_esgotado'):'Tempo esgotado. Tente novamente.');},15000);
auth.signInWithEmailAndPassword(e,p).then(function(){
clearTimeout(loginTimeout);
b.disabled=false;b.textContent=typeof t==='function'?t('btn_entrar'):'Entrar';
}).catch(function(err){
clearTimeout(loginTimeout);
b.disabled=false;b.textContent=typeof t==='function'?t('btn_entrar'):'Entrar';
var code=err&&err.code||'';var msg=code==='auth/user-not-found'?'Usuário não encontrado.':code==='auth/wrong-password'?'Senha incorreta.':code==='auth/invalid-credential'?'Senha incorreta.':code==='auth/invalid-login-credentials'?'Senha incorreta.':code==='auth/invalid-email'?'E-mail inválido.':code==='auth/too-many-requests'?'Muitas tentativas. Aguarde.':code==='auth/network-request-failed'?'Sem conexão com a internet.':(err&&err.message&&/invalid-credential|invalid-login-credentials|wrong-password/i.test(err.message))?'Senha incorreta.':(err&&err.message)||'Erro ao entrar.';
sErr('lErr',msg);
});
}

function doReg(){
var n=document.getElementById('rN').value.trim(),e=document.getElementById('rE').value.trim(),p=document.getElementById('rP').value;
if(!n||!e||!p){sErr('rErr',typeof t==='function'?t('err_preencha_campos'):'Preencha todos os campos');return}
if(p.length<6){sErr('rErr','Senha min 6 caracteres');return}
var b=document.getElementById('rBtn');b.disabled=true;b.textContent=typeof t==='function'?t('btn_criando'):'Criando...';
auth.createUserWithEmailAndPassword(e,p).then(function(r){var usr=r.user;return usr.updateProfile({displayName:n}).then(function(){var continueUrl=window.location.origin+'/app/';var sendResend=function(){try{var fn=firebase.functions().httpsCallable('sendVerificationEmail');return fn({continueUrl:continueUrl}).then(function(res){if(res&&res.data&&res.data.ok)return;throw new Error('skip');}).catch(function(err){return usr.sendEmailVerification({url:continueUrl}).catch(function(){});});}catch(z){return usr.sendEmailVerification({url:continueUrl}).catch(function(){});}};return sendResend();});}).then(function(){if(typeof toast==='function')toast(typeof t==='function'?t('toast_conta_criada'):'Conta criada! Verifique seu e-mail para confirmar.','ok');}).catch(function(err){
b.disabled=false;b.textContent=typeof t==='function'?t('btn_criar_conta'):'Criar Conta';sErr('rErr',err.message);
});
}

function doGoogle(){
try{sessionStorage.setItem('vrt_just_logged_in','1');}catch(z){}
var gBtns=document.querySelectorAll('.g-btn');
var provider=new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
var isSafariIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
gBtns.forEach(function(b){b.disabled=true;b.innerHTML='<span class="spinner"></span> Conectando...'});
if(isSafariIOS){
try{localStorage.setItem('loginPending','google');}catch(z){}
auth.signInWithRedirect(provider);
return;
}
auth.signInWithPopup(provider).then(function(r){
console.log('Google login OK:',r.user.email);
}).catch(function(err){
console.error('Google login error:',err.code,err.message);
gBtns.forEach(function(b){b.disabled=false;b.innerHTML=typeof t==='function'?t('entrar_com_google'):'Entrar com Google'});
if(err&&err.code==='auth/popup-blocked'){
toast('Popups bloqueados. Permita popups para este site e tente novamente.','err');
return;
}
if(err&&err.code==='auth/cancelled-popup-request'||err&&err.code==='auth/popup-closed-by-user')return;
toast((typeof t==='function'?t('toast_erro_geral'):'Erro: ')+err.message,'err');
});
}
/* GIS removido — usa signInWithPopup direto */

// GIS auth - no redirect needed

function doOut(){
auth.signOut().then(function(){
try{sessionStorage.removeItem('vrt_just_logged_in');}catch(z){}
window._justLoggedOut=true;
U=null;entries=[];investments=[];goals=[];budgets={};cards=[];
document.getElementById('app').classList.remove('on');
var _fab2=document.getElementById('virtFab');if(_fab2)_fab2.style.display='none';
var _fabM2=document.getElementById('virtFabMenu');if(_fabM2)_fabM2.style.display='none';
document.getElementById('loadBg').classList.add('hidden');
document.getElementById('authBg').classList.remove('hidden');
authResolved=true;
document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});
var skels=document.querySelectorAll('.skeleton');
skels.forEach(function(s){s.remove()});
showLog();
var lBtn=document.getElementById('lBtn');if(lBtn){lBtn.disabled=false;lBtn.textContent=typeof t==='function'?t('btn_entrar'):'Entrar';}
var lE=document.getElementById('lE');var lP=document.getElementById('lP');if(lE)lE.value='';if(lP)lP.value='';
clrErr();
}).catch(function(e){console.error('Logout error:',e);toast(typeof t==='function'?t('toast_erro_sair'):'Erro ao sair','err')})
}

var wasExpectingRedirect=false;
try{if(localStorage.getItem('loginPending')==='google'){wasExpectingRedirect=true;localStorage.removeItem('loginPending');}}catch(z){}
if(wasExpectingRedirect){
var lb=document.getElementById('loadBg');if(lb){lb.classList.remove('hidden');var lt=lb.querySelector('.load-txt');if(lt)lt.innerHTML='<span class="spinner"></span> Finalizando login com Google...';}
var ab=document.getElementById('authBg');if(ab)ab.classList.add('hidden');
}
auth.getRedirectResult().then(function(result){
if(result&&result.user){console.log('Login Google via redirect ok:',result.user.email);}
}).catch(function(err){
if(err&&err.code!=='auth/no-current-user'){
console.error('Erro redirect:',err);
if(typeof toast==='function')toast(typeof t==='function'?t('toast_erro_google'):'Erro ao entrar com Google. Tente novamente.','err');
}
if(wasExpectingRedirect){
var ab=document.getElementById('authBg');if(ab)ab.classList.remove('hidden');
var lb=document.getElementById('loadBg');if(lb)lb.classList.add('hidden');
var lt=document.getElementById('loadTxt');if(lt)lt.innerHTML='<span class="spinner"></span> Carregando Sibanki...';
var gBtns=document.querySelectorAll('.g-btn');gBtns.forEach(function(b){b.disabled=false;var isReg=b.id==='gBtnReg';b.innerHTML=isReg?'<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg> Cadastrar com Google':'<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg> Entrar com Google';});
}
});
function _proceedToApp(user){
var needReload=false;
try{needReload=sessionStorage.getItem('vrt_just_logged_in')==='1';if(needReload)sessionStorage.removeItem('vrt_just_logged_in');}catch(z){}
var namePart=(user.email&&user.email.split('@')[0])||'Usuário';
U={uid:user.uid,email:user.email,name:user.displayName||namePart};
entries=[];investments=[];goals=[];budgets={};userAccs=[];accountBalances={};accountCesta={};accountMeta={};recurrents=[];cards=[];
achievements={};commProfile=null;commPosts=[];commBookmarks=[];
onboardingDone=false;
var ab=document.getElementById('authBg');if(ab)ab.classList.add('hidden');
var app=document.getElementById('app');if(app)app.classList.add('on');
var lb=document.getElementById('loadBg');if(lb)lb.classList.remove('hidden');
var _fab=document.getElementById('virtFab');if(_fab)_fab.style.display='flex';
var _fabM=document.getElementById('virtFabMenu');if(_fabM)_fabM.style.display='flex';
updateDrawerUser();
if(needReload){location.reload();return;}
checkOnboardingAndLoad();
if(typeof initStripeFunctions==='function')initStripeFunctions();
setTimeout(function(){if(typeof loadUserPlan==='function')loadUserPlan();},1500);
if(typeof checkCheckoutResult==='function')checkCheckoutResult();
setTimeout(function(){if(typeof loadFamilyChildren==='function')loadFamilyChildren();},3000);
}
auth.onAuthStateChanged(function(user){
authResolved=true;
if(user){
var isEmailPassword=user.providerData&&user.providerData.length&&user.providerData[0].providerId==='password';
if(isEmailPassword&&!user.emailVerified){
var ab=document.getElementById('authBg');if(ab)ab.classList.remove('hidden');
var lb=document.getElementById('loadBg');if(lb)lb.classList.add('hidden');
db.collection('users').doc(user.uid).get().then(function(doc){
if(doc&&doc.exists){
_proceedToApp(user);
}else{
showVerifyEmail(user);
}
}).catch(function(){
showVerifyEmail(user);
});
return;
}
_proceedToApp(user);
}else{
U=null;entries=[];investments=[];goals=[];budgets={};userAccs=[];accountBalances={};accountCesta={};
window._onboardingShown=false;
var app2=document.getElementById('app');if(app2)app2.classList.remove('on');
var lb2=document.getElementById('loadBg');if(lb2)lb2.classList.add('hidden');
var _fab2=document.getElementById('virtFab');if(_fab2)_fab2.style.display='none';
var _fabM2=document.getElementById('virtFabMenu');if(_fabM2)_fabM2.style.display='none';
if(window._justLoggedOut){
window._justLoggedOut=false;
var ab2=document.getElementById('authBg');if(ab2)ab2.classList.remove('hidden');
showLog();
var lBtn=document.getElementById('lBtn');if(lBtn){lBtn.disabled=false;lBtn.textContent=typeof t==='function'?t('btn_entrar'):'Entrar';}
clrErr();
}else{
var m=window.location.hash.match(/#invite=([a-zA-Z0-9_-]+)/);
if(m){var ab=document.getElementById('authBg');if(ab)ab.classList.remove('hidden');showReg();setTimeout(function(){if(typeof checkAuthInviteHash==='function')checkAuthInviteHash();},100);}
else{showAuth();}
}
}
});

function checkOnboardingAndLoad(){
if(!U||!U.uid){loadData();return;}
db.collection('users').doc(U.uid).get().then(function(doc){
var d=doc&&doc.exists?doc.data():{};
var completo=!!(d.onboardingCompleto||d.onboardingDone);
if(completo){
onboardingDone=true;
loadData();
return;
}
var el=document.getElementById('sibankiOnboarding');
var nameEl=document.getElementById('sibOnbUserName');
if(nameEl)nameEl.textContent=U.name||'Usuário';
if(el){el.style.display='flex';el.setAttribute('aria-hidden','false');}
sibOnbCurrentQ=0;sibOnbAnswers={situacao:'',dor:'',objetivo:''};
sibOnbShowScreen('welcome');
document.getElementById('loadBg').classList.add('hidden');
}).catch(function(err){
console.error('checkOnboardingAndLoad error',err);
loadData();
});
}

var sibOnbCurrentQ=0,sibOnbAnswers={situacao:'',dor:'',objetivo:''};
var sibOnbQuestions=[
{key:'situacao',title:'Conta pra gente: qual sua situação financeira atual?',options:[
{value:'endividado',label:'Tenho dívidas para quitar',lucide:'circle-x'},
{value:'equilibrado',label:'Não tenho dívidas mas não consigo guardar',lucide:'minus-square'},
{value:'poupador',label:'Consigo economizar um pouco todo mês',lucide:'circle-check'},
{value:'investidor',label:'Economizo bem e já invisto',lucide:'trending-up'}
]},
{key:'dor',title:'O que mais te preocupa quando o assunto é dinheiro?',options:[
{value:'controle',label:'Não sei para onde meu dinheiro vai',lucide:'wallet'},
{value:'habito',label:'Sei onde gasto mas não consigo diminuir',lucide:'flame'},
{value:'poupança',label:'Guardo menos do que gostaria',lucide:'piggy-bank'},
{value:'organizacao',label:'Esqueço de pagar contas no prazo',lucide:'calendar'}
]},
{key:'objetivo',title:'Qual seu principal objetivo agora?',options:[
{value:'controle',label:'Entender para onde vai meu dinheiro',lucide:'bar-chart-2'},
{value:'reducao',label:'Reduzir meus gastos mensais',lucide:'scissors'},
{value:'meta',label:'Guardar dinheiro para uma meta',lucide:'target'},
{value:'investimento',label:'Começar a investir',lucide:'trending-up'},
{value:'familia',label:'Organizar as finanças da família',lucide:'users'}
]}
];

function sibOnbShowScreen(step){
var ids=['welcome','questions','ready','config','preparing'];
var map={welcome:'sibOnbWelcome',questions:'sibOnbQ',ready:'sibOnbReady',config:'sibOnbConfig',preparing:'sibOnbPreparing'};
var id=map[step];if(!id)return;
document.querySelectorAll('.sib-onb-screen').forEach(function(s){s.classList.remove('on');});
var el=document.getElementById(id);if(el)el.classList.add('on');
if(step==='questions')sibOnbRenderQuestion();
if(step==='config')sibOnbRenderBanks();
}

function sibOnbStart(){
sibCadShow(true);
}

function sibOnbRenderQuestion(){
var q=sibOnbQuestions[sibOnbCurrentQ];
if(!q){sibOnbShowScreen('ready');return;}
document.getElementById('sibOnbProgress').textContent=(sibOnbCurrentQ+1)+' de 3';
document.getElementById('sibOnbQTitle').textContent=q.title;
var opts=document.getElementById('sibOnbOptions');opts.innerHTML='';
var currentVal=sibOnbAnswers[q.key];
q.options.forEach(function(o){
var div=document.createElement('div');
div.className='sib-onb-opt'+(currentVal===o.value?' selected':'');
div.setAttribute('data-value',o.value);
var iconHtml=o.lucide?'<i data-lucide="'+o.lucide+'" style="width:24px;height:24px;stroke:currentColor;stroke-width:2"></i>':'';
div.innerHTML='<span class="sib-onb-opt-icon">'+iconHtml+'</span><span>'+o.label+'</span>';
div.onclick=function(){sibOnbSelectOption(q.key,o.value);};
opts.appendChild(div);
});
if(typeof lucide!=='undefined')lucide.createIcons();
}

function sibOnbSelectOption(key,value){
sibOnbAnswers[key]=value;
var next=sibOnbCurrentQ+1;
if(next>=sibOnbQuestions.length){sibOnbShowScreen('ready');return;}
sibOnbCurrentQ=next;
sibOnbRenderQuestion();
}

function sibOnbQuestionBack(){
if(sibOnbCurrentQ<=0){sibOnbShowScreen('welcome');return;}
sibOnbCurrentQ--;
sibOnbRenderQuestion();
}

var sibOnbConfigBank='';sibOnbConfigBalance=0;

function sibOnbShowConfig(){
sibOnbShowScreen('config');
}

var sibOnbBanksList=['Nubank','Inter','Itaú','Bradesco','Banco do Brasil','C6','Caixa','Santander','Outro'];
function sibOnbRenderBanks(){
var wrap=document.getElementById('sibOnbBanks');if(!wrap)return;
wrap.innerHTML='';
sibOnbBanksList.forEach(function(b){
var btn=document.createElement('button');
btn.type='button';
btn.className='sib-onb-bank'+(sibOnbConfigBank===b?' selected':'');
btn.textContent=b;
btn.onclick=function(){sibOnbConfigBank=b;document.querySelectorAll('.sib-onb-bank').forEach(function(x){x.classList.remove('selected');if(x.textContent===b)x.classList.add('selected');});document.getElementById('sibOnbBalanceWrap').style.display='block';};
wrap.appendChild(btn);
});
document.getElementById('sibOnbBalanceWrap').style.display=sibOnbConfigBank?'block':'none';
document.getElementById('sibOnbBalance').value='';
}

function sibOnbEnterNow(){
sibOnbDoFinish(false);
}

function sibOnbSaveAndEnter(){
var balEl=document.getElementById('sibOnbBalance');
var raw=balEl?balEl.value.trim().replace('.','').replace(',','.'):'0';
var val=parseFloat(raw);
sibOnbConfigBalance=!isFinite(val)||val<0?0:Math.round(val*100)/100;
sibOnbDoFinish(true);
}

function sibOnbDoFinish(withConfig){
sibOnbShowScreen('preparing');
var lb=document.getElementById('loadBg');if(lb){lb.classList.remove('hidden');lb.style.display='flex';var lt=lb.querySelector('.load-txt');if(lt)lt.textContent=typeof t==='function'?t('preparando_sibanki'):'Preparando seu Sibanki...';}
var payload={
onboardingCompleto:true,
tourCompleto:false,
perfilOnboarding:sibOnbAnswers,
primeiroAcesso:firebase.firestore.FieldValue.serverTimestamp()
};
if(withConfig&&sibOnbConfigBank){
var acc=sibOnbConfigBank==='Outro'?'Minha Conta':sibOnbConfigBank;
payload.accounts=[acc];
payload.accountBalances={};payload.accountBalances[acc]=sibOnbConfigBalance;
}
db.collection('users').doc(U.uid).set(payload,{merge:true}).then(function(){
setTimeout(function(){
var ov=document.getElementById('sibankiOnboarding');if(ov){ov.style.display='none';ov.setAttribute('aria-hidden','true');}
onboardingDone=true;
loadData();
if(typeof createIcons==='function')createIcons();
},1500);
}).catch(function(e){
console.error('sibOnbDoFinish error',e);
toast(typeof t==='function'?t('toast_erro_salvar'):'Erro ao salvar. Tente novamente.','err');
sibOnbShowScreen('ready');
var lb2=document.getElementById('loadBg');if(lb2)lb2.classList.add('hidden');
});
}

var sibCadSteps=[{id:'identidade',label:'Identidade'},{id:'contato',label:'Contato'},{id:'financeiro',label:'Financeiro'},{id:'objetivo',label:'Objetivo'}];
var sibCadObjetivos=[{id:'dividas',title:'Sair das dívidas',desc:'Organizar e eliminar dívidas'},{id:'reserva',title:'Construir reserva',desc:'Ter 6 meses de segurança'},{id:'investir',title:'Começar a investir',desc:'Fazer meu dinheiro crescer'},{id:'casa',title:'Comprar minha casa',desc:'Guardar para o imóvel próprio'},{id:'aposentadoria',title:'Aposentadoria tranquila',desc:'Garantir o futuro'},{id:'controle',title:'Controle do dia a dia',desc:'Entender para onde vai meu dinheiro'}];
var sibCadRenda=[{id:'ate2k',label:'Até R$ 2.000'},{id:'2k5k',label:'R$ 2.000 – R$ 5.000'},{id:'5k10k',label:'R$ 5.000 – R$ 10.000'},{id:'10k20k',label:'R$ 10.000 – R$ 20.000'},{id:'acima20k',label:'Acima de R$ 20.000'}];
var sibCadPerfis=[{id:'clt',label:'CLT / Assalariado'},{id:'mei',label:'MEI / Autônomo'},{id:'empresario',label:'Empresário'},{id:'estudante',label:'Estudante'},{id:'outro',label:'Outro'}];
var sibCadEstados=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
var sibCadGeneros=['Masculino','Feminino','Não-binário','Prefiro não informar'];
var sibCadMsgs=['Olá! Vou te fazer algumas perguntas para personalizar sua experiência no Sibanki. Seus dados são protegidos conforme a LGPD. Menos de 2 minutos.','Ótimo. Agora preciso do seu contato e localização para alertas e recomendações regionais.','Agora a parte mais importante: entender seu contexto financeiro. Sem julgamentos — só para te ajudar melhor.','Último passo. Me conta qual é o seu principal objetivo — pode escolher mais de um.'];
var sibCadForm={nome:'',apelido:'',cpf:'',nasc:'',sexo:'',tel:'',cep:'',estado:'',cidade:'',perfil:'',renda:'',obj:[],pesq:false};
function isValidCPF(cpf){var v=(cpf||'').replace(/\D/g,'');if(v.length!==11)return false;if(/^(\d)\1{10}$/.test(v))return false;var s=0;for(var i=0;i<9;i++)s+=parseInt(v[i])*(10-i);var d1=(s*10)%11;if(d1===10)d1=0;if(d1!==parseInt(v[9]))return false;s=0;for(var j=0;j<10;j++)s+=parseInt(v[j])*(11-j);var d2=(s*10)%11;if(d2===10)d2=0;return d2===parseInt(v[10]);}
function lookupCEP(cep,cb){var v=(cep||'').replace(/\D/g,'');if(v.length!==8)return cb(null);fetch('https://viacep.com.br/ws/'+v+'/json/').then(function(r){return r.json();}).then(function(d){if(d&&d.erro)return cb(null);cb(d);}).catch(function(){cb(null);});}
var sibCadStep=0;
var sibCadFromOnb=false;
function sibCadShow(fromOnb){sibCadFromOnb=!!fromOnb;var ov=document.getElementById('sibCadastroWizard');if(ov){ov.classList.add('show');ov.setAttribute('aria-hidden','false');}var f=document.getElementById('sibCadForm');var s=document.getElementById('sibCadSuccess');if(f)f.style.display='block';if(s)s.style.display='none';sibCadStep=0;function doRender(){sibCadRender();if(typeof lucide!=='undefined')lucide.createIcons();}if(U&&U.uid){db.collection('users').doc(U.uid).get().then(function(doc){if(doc&&doc.exists){var c=doc.data().cadastroCompleto;if(c&&typeof c==='object'){sibCadForm={nome:c.nome||'',apelido:c.apelido||'',cpf:c.cpf||'',nasc:c.nasc||'',sexo:c.sexo||'',tel:c.tel||'',cep:c.cep||'',estado:c.estado||'',cidade:c.cidade||'',perfil:c.perfil||'',renda:c.renda||'',obj:Array.isArray(c.obj)?c.obj:[],pesq:!!c.pesq};}}doRender();}).catch(doRender);}else{doRender();}}
function sibCadHide(){var ov=document.getElementById('sibCadastroWizard');if(ov){ov.classList.remove('show');ov.setAttribute('aria-hidden','true');}}
function sibCadDesistir(){sibCadHide();if(sibCadFromOnb){sibOnbShowScreen('welcome');}else{toast(typeof t==='function'?t('toast_cadastro_depois'):'Cadastro pode ser completado depois em Perfil.','info');}}
function sibCadUpdateNextState(){var n=document.getElementById('sibCadNext');if(n)n.disabled=!sibCadValid();}
function sibCadValid(){var f=sibCadForm;if(sibCadStep===0)return f.nome.trim().length>2&&f.cpf.replace(/\D/g,'').length===11&&isValidCPF(f.cpf);if(sibCadStep===1)return f.tel.replace(/\D/g,'').length>=10;if(sibCadStep===2)return f.perfil&&f.renda;if(sibCadStep===3)return f.obj.length>0;return true;}
function sibCadNext(){if(!sibCadValid())return;if(sibCadStep<sibCadSteps.length-1){sibCadStep++;sibCadRender();}else{sibCadSave();document.getElementById('sibCadForm').style.display='none';document.getElementById('sibCadSuccess').style.display='block';document.getElementById('sibCadPills').innerHTML='';document.getElementById('sibCadMsgs').innerHTML='';if(typeof lucide!=='undefined')lucide.createIcons();}}
function sibCadPrev(){if(sibCadStep>0){sibCadStep--;sibCadRender();}}
function sibCadFinishAndGo(){sibCadHide();if(sibCadFromOnb){sibOnbShowConfig();}else{go('contas',null);toast(typeof t==='function'?t('toast_cadastro_salvo'):'Cadastro salvo! Adicione sua primeira conta.','ok');}}
function sibCadSave(){if(U&&U.uid){db.collection('users').doc(U.uid).set({cadastroCompleto:sibCadForm,cadastroCompletoEm:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(function(){});}if(U&&U.displayName!==sibCadForm.nome){try{U.updateProfile({displayName:sibCadForm.nome}).catch(function(){});}catch(e){}}if(typeof updateDrawerUser==='function')updateDrawerUser();}
function sibCadRender(){var pct=((sibCadStep+1)/sibCadSteps.length)*100;document.getElementById('sibCadStepNum').textContent=sibCadStep+1;document.getElementById('sibCadProgressFill').style.width=pct+'%';document.getElementById('sibCadBack').style.visibility=sibCadStep===0?'hidden':'visible';document.getElementById('sibCadNext').textContent=sibCadStep===sibCadSteps.length-1?(typeof t==='function'?t('concluir'):'Concluir'):(typeof t==='function'?t('continuar'):'Continuar');document.getElementById('sibCadNext').disabled=!sibCadValid();var rest=sibCadSteps.length-sibCadStep-1;document.getElementById('sibCadRestante').textContent=rest>0?(rest+' etapa'+(rest>1?'s':'')+' restante'+(rest>1?'s':'')):'Última etapa';var pills=document.getElementById('sibCadPills');pills.innerHTML=sibCadSteps.map(function(s,i){var d=i<sibCadStep,a=i===sibCadStep;return '<div class="sib-cadastro-pill '+(d?'done':a?'active':'')+'">'+(d?'<i data-lucide="check" style="width:12px;height:12px"></i>':'<i data-lucide="circle" style="width:12px;height:12px"></i>')+s.label+'</div>';}).join('');var msgs=document.getElementById('sibCadMsgs');msgs.innerHTML='<div class="sib-cadastro-msg"><div class="sib-cadastro-msg-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 15v.01M16 15v.01"/></svg></div><div class="sib-cadastro-msg-text">'+sibCadMsgs[sibCadStep]+'</div></div>';var content=document.getElementById('sibCadStepContent');content.innerHTML='';if(sibCadStep===0){content.innerHTML='<h2>Sua identidade</h2><p class="sub">Dados básicos de identificação</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div style="grid-column:1/-1"><label class="fl">Nome completo</label><input type="text" id="sibCadNome" class="sib-cadastro-inp" placeholder="Ex: João Silva Martins" value="'+escapeHtml(sibCadForm.nome)+'"><p style="font-size:.7rem;color:var(--t3);margin-top:4px">Como consta no CPF</p></div><div><label class="fl">Como prefere ser chamado?</label><input type="text" id="sibCadApelido" class="sib-cadastro-inp" placeholder="Ex: João" value="'+escapeHtml(sibCadForm.apelido)+'"></div><div><label class="fl">Data de nascimento</label><input type="date" id="sibCadNasc" class="sib-cadastro-inp" value="'+escapeHtml(sibCadForm.nasc)+'"></div><div style="grid-column:1/-1"><label class="fl">CPF</label><input type="text" id="sibCadCpf" class="sib-cadastro-inp" placeholder="000.000.000-00" maxlength="14" value="'+escapeHtml(sibCadForm.cpf)+'"><p style="font-size:.7rem;color:var(--t3);margin-top:4px">Nunca compartilhado com terceiros</p><span id="sibCadCpfErr" style="font-size:.7rem;color:var(--danger);margin-top:4px;display:none">CPF inválido. Verifique os números.</span></div><div style="grid-column:1/-1"><label class="fl">Gênero <span style="font-weight:400;color:var(--t3)">— opcional</span></label><div style="display:flex;gap:8px;flex-wrap:wrap">'+sibCadGeneros.map(function(g){return '<button type="button" class="sib-cadastro-chip'+(sibCadForm.sexo===g?' selected':'')+'" onclick="sibCadSet(\'sexo\',\''+escapeHtml(g).replace(/'/g,"\\'")+'\')">'+(sibCadForm.sexo===g?'<i data-lucide="check" style="width:11px;height:11px"></i>':'')+escapeHtml(g)+'</button>';}).join('')+'</div></div></div>';content.querySelector('#sibCadNome').oninput=function(){sibCadForm.nome=this.value;sibCadUpdateNextState();};content.querySelector('#sibCadApelido').oninput=function(){sibCadForm.apelido=this.value;};content.querySelector('#sibCadNasc').oninput=function(){sibCadForm.nasc=this.value;sibCadUpdateNextState();};content.querySelector('#sibCadCpf').oninput=function(){var v=this.value.replace(/\D/g,'');if(v.length>3)v=v.slice(0,3)+'.'+v.slice(3);if(v.length>7)v=v.slice(0,7)+'.'+v.slice(7);if(v.length>11)v=v.slice(0,11)+'-'+v.slice(11);sibCadForm.cpf=v.slice(0,14);this.value=sibCadForm.cpf;var err=document.getElementById('sibCadCpfErr');if(err)err.style.display=(v.length===11&&!isValidCPF(sibCadForm.cpf))?'block':'none';sibCadUpdateNextState();};}else if(sibCadStep===1){content.innerHTML='<h2>Contato & localização</h2><p class="sub">Para alertas e recomendações regionais</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div style="grid-column:1/-1"><label class="fl">Telefone / WhatsApp</label><div style="position:relative"><span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:.78rem;color:var(--t3);font-weight:700">+55</span><input type="text" id="sibCadTel" class="sib-cadastro-inp" placeholder="(51) 99999-9999" value="'+escapeHtml(sibCadForm.tel)+'" style="padding-left:44px"></div></div><div><label class="fl">CEP</label><input type="text" id="sibCadCep" class="sib-cadastro-inp" placeholder="00000-000" maxlength="9" value="'+escapeHtml(sibCadForm.cep)+'"></div><div><label class="fl">Estado</label><select id="sibCadEstado" class="sib-cadastro-inp"><option value="">Selecione</option>'+sibCadEstados.map(function(e){return '<option value="'+e+'"'+(sibCadForm.estado===e?' selected':'')+'>'+e+'</option>';}).join('')+'</select></div><div style="grid-column:1/-1"><label class="fl">Cidade</label><input type="text" id="sibCadCidade" class="sib-cadastro-inp" placeholder="Ex: Porto Alegre" value="'+escapeHtml(sibCadForm.cidade)+'"></div></div><div style="margin-top:18px;padding:12px 15px;background:var(--bg2);border-radius:10px;border:1px solid var(--brd);display:flex;gap:9px;align-items:flex-start"><i data-lucide="shield-check" style="width:14px;height:14px;color:var(--t3);flex-shrink:0;margin-top:1px"></i><p style="font-size:.78rem;color:var(--t2);line-height:1.6;margin:0">Seu telefone é usado exclusivamente para alertas financeiros. Nunca compartilhamos com parceiros.</p></div>';content.querySelector('#sibCadTel').oninput=function(){sibCadForm.tel=this.value;sibCadUpdateNextState();};var cepInp=content.querySelector('#sibCadCep');cepInp.oninput=function(){var v=this.value.replace(/\D/g,'');if(v.length>5)v=v.slice(0,5)+'-'+v.slice(5);sibCadForm.cep=v.slice(0,9);this.value=sibCadForm.cep;};cepInp.onblur=function(){var v=sibCadForm.cep.replace(/\D/g,'');if(v.length===8){lookupCEP(v,function(d){if(d){sibCadForm.estado=d.uf||'';sibCadForm.cidade=d.localidade||'';var sel=content.querySelector('#sibCadEstado');var city=content.querySelector('#sibCadCidade');if(sel)sel.value=sibCadForm.estado;if(city)city.value=sibCadForm.cidade;if(typeof toast==='function')toast('Endereço preenchido automaticamente','ok');}else if(typeof toast==='function')toast('CEP não encontrado. Verifique o número.','err');});}};content.querySelector('#sibCadEstado').onchange=function(){sibCadForm.estado=this.value;};content.querySelector('#sibCadCidade').oninput=function(){sibCadForm.cidade=this.value;};}else if(sibCadStep===2){content.innerHTML='<h2>Perfil financeiro</h2><p class="sub">Para a IA calibrar recomendações ao seu contexto real</p><div style="margin-bottom:26px"><label class="fl">Situação profissional</label><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">'+sibCadPerfis.map(function(p){var sel=sibCadForm.perfil===p.id;return '<button type="button" class="sib-cadastro-oc'+(sel?' selected':'')+'" onclick="sibCadSet(\'perfil\',\''+p.id+'\')"><div style="width:38px;height:38px;border-radius:9px;background:'+(sel?'rgba(59,130,246,.15)':'var(--bg2)')+';display:flex;align-items:center;justify-content:center;margin-bottom:9px"><i data-lucide="briefcase" style="width:17px;height:17px;color:'+(sel?'var(--vr)':'var(--t3)')+'"></i></div><span style="font-size:.78rem;font-weight:'+(sel?'700':'500')+';color:'+(sel?'var(--t1)':'var(--t2)')+';text-align:center;line-height:1.3">'+escapeHtml(p.label)+'</span></button>';}).join('')+'</div></div><div><label class="fl">Faixa de renda mensal <span style="font-weight:400;color:var(--t3)">— opcional</span></label><div style="display:flex;flex-direction:column;gap:8">'+sibCadRenda.map(function(r){var sel=sibCadForm.renda===r.id;return '<button type="button" class="sib-cadastro-chip'+(sel?' selected':'')+'" style="justify-content:space-between;padding:12px 15px" onclick="sibCadSet(\'renda\',\''+r.id+'\')"><span>'+escapeHtml(r.label)+'</span>'+(sel?'<div style="width:19px;height:19px;border-radius:50%;background:var(--vr);display:flex;align-items:center;justify-content:center"><i data-lucide="check" style="width:10px;height:10px;stroke:#fff"></i></div>':'')+'</button>';}).join('')+'</div></div>';}else if(sibCadStep===3){content.innerHTML='<h2>Seus objetivos</h2><p class="sub">Pode escolher mais de um — define o foco da Siba para você</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:18px">'+sibCadObjetivos.map(function(o){var sel=sibCadForm.obj.indexOf(o.id)>=0;return '<button type="button" class="sib-cadastro-oc'+(sel?' selected':'')+'" onclick="sibCadTogObj(\''+o.id+'\')"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div style="width:34px;height:34px;border-radius:9px;background:'+(sel?'rgba(59,130,246,.15)':'var(--bg2)')+';display:flex;align-items:center;justify-content:center"><i data-lucide="target" style="width:15px;height:15px;color:'+(sel?'var(--vr)':'var(--t3)')+'"></i></div><div style="width:19px;height:19px;border-radius:50%;border:'+(sel?'none':'1.5px solid var(--brd)')+';background:'+(sel?'var(--vr)':'transparent')+';display:flex;align-items:center;justify-content:center">'+(sel?'<i data-lucide="check" style="width:10px;height:10px;stroke:#fff"></i>':'')+'</div></div><div style="font-size:.88rem;font-weight:700;color:'+(sel?'var(--t1)':'var(--t2)')+';margin-bottom:2px">'+escapeHtml(o.title)+'</div><div style="font-size:.78rem;color:var(--t3);line-height:1.5">'+escapeHtml(o.desc)+'</div></button>';}).join('')+'</div>'+(sibCadForm.obj.length>0?'<div style="padding:11px 15px;background:rgba(59,130,246,.08);border-radius:10px;border:1.5px solid rgba(59,130,246,.2);display:flex;gap:9px;align-items:center;margin-bottom:13px"><i data-lucide="bot" style="width:14px;height:14px;color:var(--vr);flex-shrink:0"></i><p style="font-size:.82rem;color:var(--t1);font-weight:500;margin:0">A Siba vai priorizar esses objetivos nas recomendações do seu dashboard.</p></div>':'')+'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 15px;background:var(--bg2);border-radius:10px;border:1px solid var(--brd)"><div><div style="font-size:.88rem;font-weight:600;color:var(--t1);margin-bottom:2px">Participar de pesquisas e ganhar benefícios</div><div style="font-size:.7rem;color:var(--t3)">Pesquisas anônimas ocasionais em troca de funcionalidades extras</div></div><button type="button" class="perfil-toggle'+(sibCadForm.pesq?' on':'')+'" onclick="sibCadForm.pesq=!sibCadForm.pesq;this.classList.toggle(\'on\',sibCadForm.pesq)"></button></div>';}
document.getElementById('sibCadNext').disabled=!sibCadValid();if(typeof lucide!=='undefined')lucide.createIcons();}
function sibCadSet(k,v){sibCadForm[k]=v;sibCadRender();}
function sibCadTogObj(id){var i=sibCadForm.obj.indexOf(id);if(i>=0)sibCadForm.obj.splice(i,1);else sibCadForm.obj.push(id);sibCadRender();}

function applyDocFromServer(doc){
var lb=document.getElementById('loadBg');
try{
if(doc&&doc.exists){
var d=doc.data();
entries=d.entries||[];
investments=d.investments||[];
achievements=d.achievements||{};
goals=d.goals||[];
budgets=d.budgets||{};orcamentosByMonth=d.orcamentosByMonth||{};
var _now=new Date();
var _cmk=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0');
if(orcamentosByMonth[_cmk]&&orcamentosByMonth[_cmk].categorias){budgets={};for(var _k in orcamentosByMonth[_cmk].categorias)budgets[_k]=orcamentosByMonth[_cmk].categorias[_k];}
userCats=d.categories||defaultCats.slice();
userAccs=d.accounts||defaultAccs.slice();
if(userAccs.length===0){userAccs=['Carteira física'];if(typeof saveData==='function')setTimeout(saveData,500)}
accountBalances=d.accountBalances||{};
accountCesta=d.accountCesta||{};
accountMeta=d.accountMeta||{};
recurrents=d.recurrents||[];
cards=d.cards||[];
commProfile=d.commProfile||null;
commPosts=d.commPosts||[];
commBookmarks=d.commBookmarks||[];
if(d.investorProfile){investorProfileData=d.investorProfile;try{localStorage.setItem('vrt_investorProfile',JSON.stringify(d.investorProfile));}catch(e){}}
tourModulos=typeof d.tourModulos==='object'&&d.tourModulos?d.tourModulos:{};
dashboardLayout=d.dashboardLayout||null;
onboardingDone=!!(d.onboardingCompleto!==undefined?d.onboardingCompleto:d.onboardingDone);
if(typeof window._tourCompleto==='undefined')window._tourCompleto=false;
if(d.tourCompleto!==undefined){window._tourCompleto=!!d.tourCompleto;if(window._tourCompleto){try{localStorage.setItem('vrt_onb','1');}catch(z){}}}
if(d.perfilOnboarding&&typeof window._perfilOnboarding==='undefined')window._perfilOnboarding=d.perfilOnboarding;
if(d.primeirosPassos&&d.primeirosPassos.ia)window._primeirosPassosIa=true;
window._primeirosPassosCompletoEm=d.primeirosPassosCompletoEm?(d.primeirosPassosCompletoEm.toDate?d.primeirosPassosCompletoEm.toDate():d.primeirosPassosCompletoEm):null;
window._resumoSemanalEmail=!!d.resumoSemanalEmail;
console.log('Data loaded! Entries:',entries.length,'Investments:',investments.length,'Goals:',goals.length);
}else{
window._resumoSemanalEmail=false;
console.log('No existing data for user, starting fresh');
entries=[];investments=[];achievements={};goals=[];budgets={};orcamentosByMonth={};
userCats=defaultCats.slice();userAccs=['Carteira física'];
accountBalances={};accountCesta={};accountMeta={};recurrents=[];cards=[];
dashboardLayout=null;onboardingDone=false;
}
initUI();
setTimeout(function(){if(typeof go==='function')go('dash',null);},50);
setTimeout(function(){if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();},400);
setTimeout(function(){
if(onboardingDone&&window._tourCompleto!==true){if(typeof startSibankiTour==='function')startSibankiTour();}
},1400);
}catch(e){console.error('applyDocFromServer error:',e);toast(typeof t==='function'?t('toast_erro_preparar'):'Erro ao preparar a tela. Recarregue a página.','err');}
if(typeof updateResumoSemanalToggle==='function')updateResumoSemanalToggle(!!window._resumoSemanalEmail);
if(lb){lb.classList.add('hidden');lb.style.display='none'}
setTimeout(function(){var lb2=document.getElementById('loadBg');if(lb2){lb2.classList.add('hidden');lb2.style.display='none'}},500);
}

function loadData(){
if(!U||!U.uid){console.error('No user to load data for');return}
if(typeof loadRemoteFeatureFlags==='function')loadRemoteFeatureFlags();
console.log('Loading data for user:',U.uid);
var loadDone=false;
var loadDoc=function(src){return (src?db.collection('users').doc(U.uid).get({source:src}):db.collection('users').doc(U.uid).get())};
var timeout=setTimeout(function(){
if(loadDone)return;
loadDone=true;
console.warn('loadData timeout - applying empty data');
toast(typeof t==='function'?t('toast_carregamento_demorou'):'Carregamento demorou. Exibindo tela com dados locais.','info');
applyDocFromServer(null);
},15000);
loadDoc('server').then(function(doc){ if(!loadDone){loadDone=true;clearTimeout(timeout);applyDocFromServer(doc);} }).catch(function(err){
if(loadDone)return;
if(err&&(err.code==='unavailable'||err.code==='resource-exhausted')){clearTimeout(timeout);return loadDoc();}
loadDone=true;
clearTimeout(timeout);
console.error('LOAD ERROR:',err.code,err.message);
toast((typeof t==='function'?t('toast_erro_carregar'):'Erro ao carregar dados: ')+err.message,'err');
applyDocFromServer(null);
}).then(function(ret){
if(ret&&ret.exists!==undefined&&!loadDone){loadDone=true;clearTimeout(timeout);applyDocFromServer(ret);}
});
}

var _saveDataDirty=false,_saveDataTimeout=null;
function _persistData(){
if(!U||!U.uid)return;
_saveDataDirty=false;
var data={
entries:entries,investments:investments,achievements:achievements,
goals:goals,budgets:budgets,orcamentosByMonth:orcamentosByMonth||{},categories:userCats,accounts:userAccs,accountBalances:accountBalances,accountCesta:accountCesta||{},accountMeta:accountMeta||{},recurrents:recurrents,cards:cards,
name:U.name,email:U.email,updated:new Date().toISOString(),commProfile:commProfile||null,commPosts:commPosts||[],commBookmarks:commBookmarks||[],
investorProfile:typeof investorProfileData==='object'&&investorProfileData?investorProfileData:(function(){try{return JSON.parse(localStorage.getItem('vrt_investorProfile')||'null');}catch(e){return null;}})(),
tourModulos:typeof tourModulos==='object'&&tourModulos?tourModulos:{}
};
if(typeof dashboardLayout!=='undefined'&&dashboardLayout&&Array.isArray(dashboardLayout))data.dashboardLayout=dashboardLayout;
db.collection('users').doc(U.uid).set(data,{merge:true}).then(function(){
console.log('Data saved OK! Entries:',entries.length);
setTimeout(function(){if(typeof renderAlertBar==='function')renderAlertBar();},400);
}).catch(function(e){
console.error('SAVE ERROR:',e.code,e.message);
toast((typeof t==='function'?t('toast_erro_salvar_dados'):'ERRO ao salvar: ')+e.message+'. Verifique sua conexao.','err');
setTimeout(function(){
db.collection('users').doc(U.uid).set(data,{merge:true}).then(function(){
toast(typeof t==='function'?t('toast_dados_salvos'):'Dados salvos com sucesso!','ok');
}).catch(function(e2){
toast(typeof t==='function'?t('toast_falha_salvar'):'Falha ao salvar. Seus dados podem ser perdidos!','err');
});
},3000);
});
}
function saveData(){
if(!U||!U.uid){console.error('No user logged in!');return}
_saveDataDirty=true;
if(_saveDataTimeout)clearTimeout(_saveDataTimeout);
_saveDataTimeout=setTimeout(function(){
_saveDataTimeout=null;
if(_saveDataDirty)_persistData();
},1500);
}
function saveDataNow(){
if(_saveDataTimeout){clearTimeout(_saveDataTimeout);_saveDataTimeout=null;}
_saveDataDirty=true;
_persistData();
}

function resetAllDataAndRestart(){
if(!U||!U.uid)return;
if(!confirm(typeof t==='function'?t('confirm_apagar_tudo'):'Tem certeza? Todos os lançamentos, metas, contas, investimentos e categorias serão apagados. Sua conta de login continua. Esta ação não pode ser desfeita.'))return;
if(!confirm(typeof t==='function'?t('confirm_ultima_apagar'):'Última confirmação: realmente apagar TUDO e recomeçar do zero?'))return;
var emptyData={
entries:[],investments:[],achievements:{},goals:[],budgets:{},orcamentosByMonth:{},
categories:defaultCats.slice(),accounts:['Carteira física'],accountBalances:{},accountCesta:{},accountMeta:{},recurrents:[],cards:[],
name:U.name,email:U.email,updated:new Date().toISOString(),commProfile:null,commPosts:[],commBookmarks:[],investorProfile:null
};
if(typeof dashboardLayout!=='undefined'&&dashboardLayout&&Array.isArray(dashboardLayout))emptyData.dashboardLayout=dashboardLayout;
db.collection('users').doc(U.uid).set(emptyData,{merge:true}).then(function(){
entries=[];investments=[];achievements={};goals=[];budgets={};orcamentosByMonth={};
userCats=defaultCats.slice();userAccs=['Carteira física'];
accountBalances={};accountCesta={};accountMeta={};recurrents=[];cards=[];
commProfile=null;commPosts=[];commBookmarks=[];investorProfileData=null;
try{localStorage.removeItem('vrt_investorProfile');}catch(e){}
if(typeof toast==='function')toast(typeof t==='function'?t('toast_dados_apagados'):'Dados apagados. Recomeçando do zero.','ok');
initUI();
setTimeout(function(){if(typeof go==='function')go('dash',null);},50);
setTimeout(function(){if(typeof renderCatTags==='function')renderCatTags();if(typeof renderAccTags==='function')renderAccTags();},100);
setTimeout(function(){if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();},400);
}).catch(function(e){
console.error('resetAllData error',e);
if(typeof toast==='function')toast((typeof t==='function'?t('toast_erro_apagar'):'Erro ao apagar dados: ')+e.message,'err');
});
}

// CATEGORIAS E CONTAS
function renderCatTags(){
var c=document.getElementById('catTags');
c.innerHTML=userCats.map(function(cat,i){
return '<span class="tag-item">'+escapeHtml(cat)+' <span class="tag-del" onclick="delCatByIndex('+i+')">x</span></span>';
}).join('');
updateCatSelects();
}

function renderAccTags(){
var c=document.getElementById('accTags');
c.innerHTML=userAccs.map(function(acc,i){
return '<span class="tag-item">'+escapeHtml(acc)+' <span class="tag-del" onclick="delAccByIndex('+i+')">x</span></span>';
}).join('');
updateAccSelects();
}

function delCatByIndex(i){var name=userCats[i];if(name)delCat(name);}
function delAccByIndex(i){var name=userAccs[i];if(name)delAcc(name);}

function addCat(){
var v=document.getElementById('newCatInput').value.trim();
if(!v){toast(typeof t==='function'?t('toast_digite_categoria'):'Digite o nome da categoria','err');return}
if(userCats.indexOf(v)>=0){toast(typeof t==='function'?t('toast_categoria_ja_existe'):'Categoria já existe','err');return}
userCats.push(v);
document.getElementById('newCatInput').value='';
renderCatTags();saveData();toast(typeof t==='function'?t('toast_categoria_adicionada'):'Categoria adicionada!','ok');
}

function delCat(name){
if(!confirm((typeof t==='function'?t('confirm_remover_categoria'):'Remover categoria "{0}"?').replace('{0}',name)))return;
userCats=userCats.filter(function(c){return c!==name});
renderCatTags();saveData();toast(typeof t==='function'?t('toast_categoria_removida'):'Categoria removida','info');
}

function addAcc(){
var v=document.getElementById('newAccInput').value.trim();
if(!v){toast(typeof t==='function'?t('toast_digite_conta'):'Digite o nome da conta','err');return}
if(userAccs.indexOf(v)>=0){toast(typeof t==='function'?t('toast_conta_ja_existe'):'Conta já existe','err');return}
userAccs.push(v);
document.getElementById('newAccInput').value='';
renderAccTags();saveData();toast(typeof t==='function'?t('toast_conta_adicionada'):'Conta adicionada!','ok');
if(userAccs.length===1&&typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
}

function delAcc(name){
if(!confirm((typeof t==='function'?t('confirm_remover_conta'):'Remover conta "{0}"?').replace('{0}',name)))return;
userAccs=userAccs.filter(function(c){return c!==name});
renderAccTags();saveData();toast(typeof t==='function'?t('toast_conta_removida'):'Conta removida','info');
}

var _CImap={'moradia':'🏠','transporte':'🚗','alimentacao':'🍔','saude':'💊','bem-estar':'🧘','educação':'📚','lazer':'🎮','cartoes':'💳','emprestimo':'🏦','assinaturas':'📱','salário':'💼','freela':'💻','investimentos':'📈','transferencia':'🔄','outros':'📦','mercado':'🛒','supermercado':'🛒','farmacia':'💊','restaurante':'🍽️','delivery':'🛵','cafe':'☕','uber':'🚕','combustivel':'⛽','energia':'⚡','agua':'💧','gas':'🔥','aluguel':'🏡','condominio':'🏢','seguro':'🛡️','imposto':'📋','pet':'🐾','internet':'🌐','telefone':'📞','streaming':'📺','vestuario':'👕','beleza':'💅','viagem':'✈️','hotel':'🏨','presente':'🎁','academia':'🏋️','escola':'🎓','cinema':'🎬','shows':'🎵','esporte':'⚽','dentista':'🦷','médico':'🩺','poupança':'🏦','dividendos':'💹','renda extra':'💰','bonus':'🎯','luz':'💡','parcela':'💳','compras':'🛍️','doacao':'❤️'};
var _CImapLucide={'moradia':'home','transporte':'car','alimentacao':'utensils-crossed','saude':'heart-pulse','bem-estar':'sparkles','educacao':'graduation-cap','lazer':'gamepad-2','cartoes':'credit-card','emprestimo':'landmark','assinaturas':'smartphone','salario':'briefcase','freela':'laptop','investimentos':'trending-up','transferencia':'arrow-left-right','outros':'package','mercado':'shopping-cart','supermercado':'shopping-cart','farmacia':'tablets','restaurante':'utensils-crossed','delivery':'truck','cafe':'coffee','uber':'car','combustivel':'droplets','energia':'zap','agua':'droplets','gas':'flame','aluguel':'home','condominio':'building-2','pet':'paw-print','internet':'globe','telefone':'phone','streaming':'tv','vestuario':'shirt','viagem':'plane','hotel':'building','presente':'gift','academia':'dumbbell','escola':'graduation-cap','cinema':'film','compras':'shopping-bag'};
function _rmAc(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-')}
function _gCI(c){if(!c)return'';var k=_rmAc(c);return _CImap[k]||''}
function _gCILucide(c){if(!c)return'package';var k=_rmAc(c);return _CImapLucide[k]||'package'}

function updateCatSelects(){
var opts=userCats.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('');
var sel=document.getElementById('fC');if(sel)sel.innerHTML=opts;
var dd=document.getElementById('fCDropdown');if(!dd)return;
var items=userCats.map(function(c){var ic=_gCILucide(c);var cls='cat-'+_rmAc(c);return '<button type="button" class="cat-picker-item" role="option" data-value="'+escapeHtml(c)+'" onclick="selectCatPicker(\''+escapeHtml(c).replace(/'/g,"\\'")+'\')"><span class="categoria-icon '+cls+'"><i data-lucide="'+ic+'"></i></span><span>'+escapeHtml(c)+'</span></button>'}).join('');
dd.innerHTML=items;
if(typeof window.refreshLucide==='function')lucide.createIcons();
syncCatPickerTrigger();
}
function syncCatPickerTrigger(){
var sel=document.getElementById('fC');var lab=document.getElementById('fCTriggerLabel');var ico=document.getElementById('fCTriggerIcon');
if(!sel||!lab||!ico)return;
var v=sel.value;
lab.textContent=v||'Selecione';
var ic=v?_gCILucide(v):'package';var cls=v?'cat-'+_rmAc(v):'cat-outros';
ico.className='cat-picker-icon '+cls;ico.innerHTML='<i data-lucide="'+ic+'"></i>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
function toggleCatPicker(){
var dd=document.getElementById('fCDropdown');var tr=document.getElementById('fCTrigger');
if(!dd||!tr)return;
var open=dd.classList.toggle('open');tr.setAttribute('aria-expanded',open?'true':'false');
if(open){updateCatSelects();}
}
function selectCatPicker(cat){
var sel=document.getElementById('fC');if(sel)sel.value=cat;
syncCatPickerTrigger();
var dd=document.getElementById('fCDropdown');if(dd)dd.classList.remove('open');
var tr=document.getElementById('fCTrigger');if(tr)tr.setAttribute('aria-expanded','false');
}
document.addEventListener('click',function(e){var dd=document.getElementById('fCDropdown');var tr=document.getElementById('fCTrigger');if(dd&&tr&&dd.classList.contains('open')&&!dd.contains(e.target)&&!tr.contains(e.target)){dd.classList.remove('open');if(tr)tr.setAttribute('aria-expanded','false');}});

function updateAccSelects(){
var opts=userAccs.map(function(a){return '<option value="'+a+'">'+a+'</option>'}).join('');
document.getElementById('fA').innerHTML=opts;
document.getElementById('invConta').innerHTML=opts;
var filA=document.getElementById('filA');
filA.innerHTML='<option value="all">Todas Contas</option>'+opts;
}

// MODAL
function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modalOverlay').classList.add('show')}
function closeModal(){if(window._fabConsultorRecognition&&typeof window._fabConsultorRecognition.abort==='function'){try{window._fabConsultorRecognition.abort();}catch(e){}}var ov=document.getElementById('modalOverlay');var box=document.getElementById('modalBox');if(ov){ov.classList.remove('show','modal-ia-lanc')}if(box){box.classList.remove('modal-ia-lanc')}}

// DRAWER
function toggleDrawer(){
var d=document.getElementById('drawer');var o=document.getElementById('drawerOverlay');
if(!d||!o)return;
var isDesktop=window.innerWidth>=1024;
if(isDesktop){
var body=document.body;
body.classList.add('drawer-sidebar-mode');
var collapsed=body.classList.toggle('drawer-sidebar-collapsed');
try{localStorage.setItem('sibanki_drawer_open',collapsed?'0':'1');}catch(z){}
var expandEl=document.querySelector('.drawer-expand-icon');
if(expandEl&&typeof lucide!=='undefined'&&lucide.createIcons){lucide.createIcons();}
var btn=document.getElementById('drawerToggleBtn');
if(btn)btn.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');
}else{
d.classList.toggle('open');o.classList.toggle('show',d.classList.contains('open'));o.setAttribute('aria-hidden',d.classList.contains('open')?'false':'true');
}
}
function openDrawer(){var d=document.getElementById('drawer');var o=document.getElementById('drawerOverlay');if(d&&o&&window.innerWidth<1024){d.classList.add('open');o.classList.add('show');o.setAttribute('aria-hidden','false');}}
function closeDrawer(){
var d=document.getElementById('drawer');var o=document.getElementById('drawerOverlay');
if(!d||!o)return;
if(window.innerWidth>=1024){
document.body.classList.add('drawer-sidebar-mode');
document.body.classList.add('drawer-sidebar-collapsed');
try{localStorage.setItem('sibanki_drawer_open','0');}catch(z){}
}else{d.classList.remove('open');o.classList.remove('show');o.setAttribute('aria-hidden','true');}
}
function updateDrawerUser(){
if(!U)return;
var iniciais=(U.name||'U').split(' ').map(function(x){return x[0]}).join('').substring(0,2).toUpperCase()||'U';
var dav=document.getElementById('drawerAvatar');var davI=document.getElementById('drawerAvatarInicial');if(davI)davI.textContent=iniciais;
var dName=document.getElementById('drawerUserName');if(dName)dName.textContent=U.name||'Usuário';
var dEmail=document.getElementById('drawerUserEmail');if(dEmail)dEmail.textContent=U.email||'';
var topAv=document.getElementById('topHeaderAvatar');var topAvI=document.getElementById('topHeaderAvatarInicial');if(topAvI)topAvI.textContent=iniciais;
if(typeof window._lastFinScore!=='number')calcFinScore();
var scoreEl=document.getElementById('drawerScorePill');if(scoreEl){var nota=(typeof window._lastFinScore==='number'?window._lastFinScore:0);var cls=nota>70?'green':nota>=40?'yellow':'red';scoreEl.textContent='Score: '+nota;scoreEl.className='drawer-score-pill '+cls;}
var planEl=document.getElementById('drawerPlanBadge');var upgBtn=document.getElementById('drawerUpgradeBtn');
if(planEl){var p=(typeof userPlan!=='undefined'?userPlan:'free')||'free';planEl.textContent=p==='pro'?'Pro':p==='familia'?'Família':'Gratuito';planEl.className='drawer-plan-badge '+(p==='pro'?'pro':p==='familia'?'familia':'gratuito');}
if(upgBtn)upgBtn.style.display=(typeof userPlan!=='undefined'&&(userPlan==='pro'||userPlan==='familia'))?'none':'block';
}
/* ── Avatar dropdown ── */
function toggleAvatarDropdown(e){
if(e)e.stopPropagation();
var dd=document.getElementById('avatarDropdown');
var av=document.getElementById('topHeaderAvatar');
if(!dd)return;
var isOpen=dd.classList.toggle('open');
if(av)av.setAttribute('aria-expanded',isOpen?'true':'false');
if(isOpen){
// Posicionamento fixo baseado na posição real do avatar no viewport
var rect=av.getBoundingClientRect();
var dropW=224; // min-width
var leftPos=rect.right-dropW;
if(leftPos<8)leftPos=8;
dd.style.top=(rect.bottom+8)+'px';
dd.style.left=leftPos+'px';
dd.style.right='auto';
setTimeout(function(){
document.addEventListener('click',function _cad(ev){
if(dd.contains(ev.target)||ev.target===av)return;
if(ev.target.closest&&(ev.target.closest('#drawerToggleBtn')||ev.target.closest('#drawer')||ev.target.closest('.drawer-overlay')))return;
closeAvatarDropdown();
document.removeEventListener('click',_cad);
});
},10);
if(typeof lucide!=='undefined')lucide.createIcons();
}
}
function closeAvatarDropdown(){
var dd=document.getElementById('avatarDropdown');
var av=document.getElementById('topHeaderAvatar');
if(dd)dd.classList.remove('open');
if(av)av.setAttribute('aria-expanded','false');
}
function syncDrawerActiveTab(id){
var items=document.querySelectorAll('.drawer-nav-item');items.forEach(function(it){var goId=it.getAttribute('data-go');it.classList.toggle('active',goId===id);});
// Abrir grupo que contém o item ativo
document.querySelectorAll('.drawer-nav-group').forEach(function(g){
if(g.querySelector('[data-go="'+id+'"]')){g.classList.add('open');var btn=g.querySelector('.drawer-nav-group-head');if(btn)btn.setAttribute('aria-expanded','true');}
});
}
function toggleDrawerGroup(id){
var key='drawerGroup'+id.charAt(0).toUpperCase()+id.slice(1);
var g=document.getElementById(key);
if(!g)return;
var isOpen=g.classList.toggle('open');
var btn=g.querySelector('.drawer-nav-group-head');
if(btn)btn.setAttribute('aria-expanded',isOpen?'true':'false');
// Fechar todos os outros grupos
if(isOpen){
document.querySelectorAll('.drawer-nav-group').forEach(function(other){
if(other!==g&&other.classList.contains('open')){
other.classList.remove('open');
var ob=other.querySelector('.drawer-nav-group-head');
if(ob)ob.setAttribute('aria-expanded','false');
}
});
}
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},10);
try{var keys=[];document.querySelectorAll('.drawer-nav-group.open').forEach(function(gr){if(gr.id&&gr.id.indexOf('drawerGroup')===0)keys.push(gr.id.replace('drawerGroup','').toLowerCase());});localStorage.setItem('sibanki_drawer_groups',JSON.stringify(keys));}catch(e){}
}
function initDrawerDesktop(){
if(window.innerWidth>=1024){
var pref=localStorage.getItem('sibanki_drawer_open');
var expanded=(pref===null)?true:(pref==='1');
document.body.classList.add('drawer-sidebar-mode');
if(!expanded){document.body.classList.add('drawer-sidebar-collapsed');var btn=document.getElementById('drawerToggleBtn');if(btn)btn.setAttribute('aria-label','Expandir menu');}
}
}
(function(){
initDrawerDesktop();
// Restaurar grupos abertos
try{var saved=localStorage.getItem('sibanki_drawer_groups');if(saved){JSON.parse(saved).forEach(function(id){var g=document.getElementById('drawerGroup'+id.charAt(0).toUpperCase()+id.slice(1));if(g){g.classList.add('open');var btn=g.querySelector('.drawer-nav-group-head');if(btn)btn.setAttribute('aria-expanded','true');}});}}catch(e){}
// Separadores legados (se não houver grupos)
var nav=document.querySelector('.drawer-nav');
if(nav&&!nav.querySelector('.drawer-nav-sep')&&!nav.querySelector('.drawer-nav-group')){
[{b:'orçamento',t:'Planejamento'},{b:'invest',t:'Crescimento'},{b:'casal',t:'Social'},{b:'rel',t:'Sistema'}].forEach(function(s){var item=nav.querySelector('[data-go="'+s.b+'"]');if(item){var d=document.createElement('div');d.className='drawer-nav-sep';d.textContent=s.t;nav.insertBefore(d,item);}});
}
document.querySelectorAll('.drawer-nav-item').forEach(function(it){it.addEventListener('click',function(){var id=it.getAttribute('data-go');if(id){go(id,null);if(window.innerWidth<768)closeDrawer();}});});
})();
window.addEventListener('resize',function(){
if(window.innerWidth>=1024){
document.getElementById('drawerOverlay').classList.remove('show');
document.getElementById('drawer').classList.remove('open');
var pref=localStorage.getItem('sibanki_drawer_open');
var expanded=(pref===null)?true:(pref==='1');
document.body.classList.add('drawer-sidebar-mode');
document.body.classList.toggle('drawer-sidebar-collapsed',!expanded);
}else{
document.body.classList.remove('drawer-sidebar-mode');
document.body.classList.remove('drawer-sidebar-collapsed');
}
});

// PERFIL — bind tabs (robusto: sem visibility, apenas display, try/catch)
function bindPerfilTabs(){
var perfilEl=document.getElementById('perfil');if(!perfilEl)return;
var tabs=perfilEl.querySelectorAll('.perfil-tab');
if(!tabs.length)return;
Array.from(tabs).forEach(function(btn){
var novo=btn.cloneNode(true);
btn.parentNode.replaceChild(novo,btn);
novo.addEventListener('click',function(){
var id=novo.getAttribute('data-perfil-tab');if(!id)return;
var targetId='perfil'+(id.charAt(0).toUpperCase()+id.slice(1));
perfilEl.querySelectorAll('.perfil-tab').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-perfil-tab')===id);});
perfilEl.querySelectorAll('.perfil-tab-content').forEach(function(c){
var isActive=c.id===targetId;
c.classList.toggle('on',isActive);
c.style.removeProperty('display');
c.style.removeProperty('visibility');
});
try{if(typeof loadPerfilData==='function')loadPerfilData();}catch(e){}
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},20);
});
});
ensurePerfilTabVisible();
}
function ensurePerfilTabVisible(){
var perfilEl=document.getElementById('perfil');if(!perfilEl)return;
// Sempre resetar para Visão Geral ao entrar no perfil
perfilEl.querySelectorAll('.perfil-tab').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-perfil-tab')==='visao');});
perfilEl.querySelectorAll('.perfil-tab-content').forEach(function(c){
var isActive=c.id==='perfilVisao';
c.classList.toggle('on',isActive);
c.style.removeProperty('display');
c.style.removeProperty('visibility');
});
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bindPerfilTabs);}else{bindPerfilTabs();}
var _perfilPrivState={analise:true,personalizacao:true,marketing:false,parceiros:false,relatorios:true};
var _perfilAlertasState={login:true,senha:true,device:true,bloqueio:true,resumo:false};
function calcFinScore(){
if(typeof renderFinDiagnostic==='function'){
var el=document.getElementById('finDiagnosticContainer');
var tmp=false;
if(el&&el.style.display==='none'){el.style.display='block';tmp=true;}
renderFinDiagnostic();
if(tmp&&el)el.style.display='none';
}
return window._lastFinScore||0;
}
function renderPerfilSegurancaPrivacidade(){return;// removida: abas usam HTML estático

var perfilRoot=document.getElementById('perfil');
var sl=document.getElementById('perfilSegurancaList')||(perfilRoot&&perfilRoot.querySelector('#perfilSegurancaList'));
if(!sl){console.warn('[Perfil] perfilSegurancaList não encontrado no DOM — aba Segurança pode ficar vazia');}
if(sl){try{
var segItems=[
{icon:'lock',title:'Alterar senha',desc:typeof U!=='undefined'&&U&&U.providerData&&U.providerData[0]&&U.providerData[0].providerId==='google.com'?'Conta Google — use as configurações do Google':'Clique para redefinir sua senha por e-mail',action:'Alterar senha',fn:'segAlterarSenha()',available:!(typeof U!=='undefined'&&U&&U.providerData&&U.providerData[0]&&U.providerData[0].providerId==='google.com')},
{icon:'smartphone',title:'Autenticação de dois fatores',desc:'Em breve — camada extra de segurança para sua conta',action:'Em breve',fn:"toast('2FA em breve!','info')",available:false},
{icon:'monitor',title:'Sessões ativas',desc:'Encerre sessões em outros dispositivos',action:'Encerrar outras sessões',fn:'segEncerrarSessoes()',available:true},
{icon:'clock',title:'Histórico de acessos',desc:'Veja data e hora dos seus últimos logins',action:'Ver histórico',fn:'segVerHistorico()',available:true}
];
sl.innerHTML=segItems.map(function(s){var btnStyle=s.available?'':'opacity:.5;cursor:not-allowed';return '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--brd);gap:12px;flex-wrap:wrap"><div style="display:flex;gap:12px;align-items:center;flex:1;min-width:0"><div style="width:42px;height:42px;border-radius:11px;background:var(--bg2);border:1px solid var(--brd);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i data-lucide="'+s.icon+'" style="width:18px;height:18px;color:var(--vr)"></i></div><div style="min-width:0"><div style="font-size:.9rem;font-weight:600;color:var(--t1)">'+escapeHtml(s.title)+'</div><div style="font-size:.8rem;color:var(--t2);margin-top:2px">'+escapeHtml(s.desc)+'</div></div></div><button class="btn btn-p" style="font-size:.78rem;padding:7px 14px;flex-shrink:0;'+btnStyle+'" onclick="'+s.fn+'">'+escapeHtml(s.action)+'</button></div>';}).join('');
}catch(e){console.warn('[Perfil] Erro ao preencher Segurança:',e);}
}
var ALERTAS=[{k:'login',l:'Novo login detectado'},{k:'senha',l:'Troca de senha'},{k:'device',l:'Acesso de novo dispositivo'},{k:'bloqueio',l:'Tentativa de acesso bloqueada'},{k:'resumo',l:'Resumo semanal'}];
var alist=document.getElementById('perfilAlertasList')||(perfilRoot&&perfilRoot.querySelector('#perfilAlertasList'));if(!alist){console.warn('[Perfil] perfilAlertasList não encontrado no DOM');}if(alist){alist.innerHTML=ALERTAS.map(function(a){var on=_perfilAlertasState[a.k];return '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:.88rem;color:var(--t2)">'+escapeHtml(a.l)+'</span><button type="button" class="perfil-toggle '+(on?'on':'')+'" onclick="togglePerfilAlerta(\''+a.k+'\',this)" aria-label="Toggle"></button></div>';}).join('');}
var PRIV=[{k:'analise',t:'Análise de dados para melhorar a IA',d:'Seus dados anonimizados ajudam a tornar a IA mais precisa'},{k:'personalizacao',t:'Personalização de recomendações',d:'Permite que a IA use seu histórico para sugestões mais relevantes'},{k:'marketing',t:'Comunicações de marketing',d:'Receba dicas, novidades e ofertas por e-mail'},{k:'parceiros',t:'Compartilhamento com parceiros',d:'Dados para propostas personalizadas de crédito e seguros'},{k:'relatorios',t:'Relatórios agregados de mercado',d:'Contribua anonimamente para estatísticas financeiras'}];
var pl=document.getElementById('perfilPrivacidadeList')||(perfilRoot&&perfilRoot.querySelector('#perfilPrivacidadeList'));if(!pl){console.warn('[Perfil] perfilPrivacidadeList não encontrado no DOM — aba Privacidade pode ficar vazia');}if(pl){try{pl.innerHTML=PRIV.map(function(p){var on=_perfilPrivState[p.k];return '<div style="display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:20px"><div><div style="font-size:.9rem;font-weight:600;color:var(--t1);margin-bottom:3px">'+escapeHtml(p.t)+'</div><div style="font-size:.8rem;color:var(--t2);line-height:1.6">'+escapeHtml(p.d)+'</div></div><button type="button" class="perfil-toggle '+(on?'on':'')+'" onclick="togglePerfilPriv(\''+p.k+'\',this)"></button></div>';}).join('');}catch(e){console.warn('[Perfil] Erro ao preencher Privacidade:',e);}}
if(typeof lucide!=='undefined')lucide.createIcons();
}
function loadPerfilData(){
var score=0;var saldo=0;
try{
if(typeof window._lastFinScore!=='number')calcFinScore();
score=typeof window._lastFinScore==='number'?window._lastFinScore:0;
var offset=408-(408*score/100);
var arc=document.getElementById('perfilScoreArc');if(arc){arc.style.strokeDashoffset=offset;arc.style.stroke=score>=80?'var(--green)':score>=60?'var(--yellow)':'var(--danger)';}
var num=document.getElementById('perfilScoreNum');if(num)num.textContent=score;
var label=document.getElementById('perfilSaudeLabel');if(label)label.textContent=score>=80?'Saúde Excelente':score>=60?'Saúde Moderada':'Saúde Crítica';
if(typeof userAccs!=='undefined'&&Array.isArray(userAccs)){saldo=userAccs.reduce(function(s,a){return s+(typeof getAccBal==='function'?getAccBal(a).atual:0);},0);}
var mesAtual=new Date().toISOString().substring(0,7);
var entradasMes=typeof entries!=='undefined'&&Array.isArray(entries)?entries.filter(function(e){return e.date&&e.date.startsWith(mesAtual)&&!e.isTransfer&&e.category!=='Transferencia'&&e.status!=='pendente'&&e.status!=='agendado';}):[];
var recReal=entradasMes.filter(function(e){return e.type==='receita';}).reduce(function(s,e){return s+e.value;},0);
var despReal=entradasMes.filter(function(e){return e.type==='despesa';}).reduce(function(s,e){return s+e.value;},0);
var endivPct=recReal>0?Math.round(despReal/recReal*100):0;
var endivStatus=endivPct>80?'bad':endivPct>60?'warn':'ok';
var invAtual=entradasMes.filter(function(e){return e.category==='Investimentos';}).reduce(function(s,e){return s+e.value;},0);
var mdObj=typeof getMD==='function'?getMD():{};var mks=Object.keys(mdObj);
var avgGasto=mks.length>0?mks.reduce(function(s,k){return s+mdObj[k].d;},0)/mks.length:despReal||1;
var reservaIdeal=avgGasto*6;
var reservaPct=reservaIdeal>0?Math.min(100,Math.round(saldo/reservaIdeal*100)):0;
var reservaMeses=reservaIdeal>0?Math.min(6,saldo/avgGasto).toFixed(1):0;
var reservaStatus=reservaPct>=100?'ok':reservaPct>=50?'warn':'bad';
var HEALTH=[
{label:'Reserva de emergência',status:reservaStatus,text:reservaMeses+' de 6 meses',pct:reservaPct},
{label:'Score de crédito',status:'ok',text:'Não disponível',pct:0},
{label:'Endividamento',status:endivStatus,text:endivPct+'% da renda',pct:endivPct},
{label:'Investimentos ativos',status:invAtual>0?'ok':'warn',text:'R$ '+(invAtual||0).toFixed(2).replace('.',','),pct:Math.min(100,invAtual/500*100)},
{label:'Orçamento controlado',status:endivPct<=100?'ok':'bad',text:endivPct<=100?'Dentro do orçamento':'Acima do orçamento',pct:endivPct<=100?100:0}
];
var SC={ok:'var(--green)',warn:'var(--yellow)',bad:'var(--danger)'};
var hl=document.getElementById('perfilHealthList');if(hl){hl.innerHTML=HEALTH.map(function(h){return '<div class="perfil-health-row"><div class="perfil-health-icon '+h.status+'"><span class="perfil-health-dot dot" style="background:'+SC[h.status]+'"></span></div><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:.88rem;color:var(--t1)">'+escapeHtml(h.label)+'</span><span style="font-size:.8rem;font-weight:700;color:'+SC[h.status]+'">'+escapeHtml(h.text)+'</span></div><div class="perfil-health-bar"><div class="perfil-health-bar-fill" style="width:'+h.pct+'%;background:'+SC[h.status]+'"></div></div></div></div>';}).join('');}
var METAS=Array.isArray(goals)&&goals.length>0?goals.slice(0,5).map(function(g){var v=parseFloat(g.atual||g.current||g.saved)||0;var t=parseFloat(g.alvo||g.target)||1;return{name:g.nome||g.name||'Meta',val:v,total:t,color:'var(--green)'};}):[{name:'Reserva de emergência',val:2400,total:7200,color:'var(--yellow)'},{name:'Viagem para Europa',val:1800,total:8000,color:'var(--vr)'},{name:'Aposentadoria',val:3200,total:50000,color:'var(--green)'}];
var ml=document.getElementById('perfilMetasList');if(ml){ml.innerHTML=METAS.length?METAS.map(function(m){var pct=Math.min(100,Math.round((m.val/m.total)*100));return '<div style="margin-bottom:'+(m===METAS[METAS.length-1]?0:16)+'px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:.88rem;color:var(--t2)">'+escapeHtml(m.name)+'</span><span style="font-size:.8rem;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums">R$ '+m.val.toLocaleString('pt-BR')+' <span style="color:var(--t3);font-weight:400">/ R$ '+m.total.toLocaleString('pt-BR')+'</span></span></div><div class="perfil-health-bar"><div class="perfil-health-bar-fill" style="width:'+pct+'%;background:'+m.color+'"></div></div></div>';}).join(''):'<div style="font-size:.88rem;color:var(--t3);padding:12px 0">Nenhuma meta ativa. Crie em Metas.</div>';}
var ATIV=[{text:'Fatura Nubank sincronizada',time:'Agora há pouco',icon:'var(--vr)'},{text:'Alerta: limite de alimentação 85%',time:'2 horas atrás',icon:'var(--yellow)'},{text:'Meta viagem: aporte de R$ 200',time:'Ontem',icon:'var(--green)'},{text:'Open Finance reconectado',time:'2 dias atrás',icon:'var(--green)'}];
var al=document.getElementById('perfilAtividadesList');if(al){al.innerHTML=ATIV.map(function(a){return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:'+(a===ATIV[ATIV.length-1]?0:12)+'px"><div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:'+a.icon+'"></div></div><div><div style="font-size:.88rem;color:var(--t1);font-weight:500">'+escapeHtml(a.text)+'</div><div style="font-size:.75rem;color:var(--t3)">'+escapeHtml(a.time)+'</div></div></div>';}).join('');}
}catch(e){}
renderPerfilSegurancaPrivacidade();
if(U){var iniciais=(U.name||'U').split(' ').map(function(x){return x[0]}).join('').substring(0,2).toUpperCase()||'U';var av=document.getElementById('perfilAvatar');var avI=document.getElementById('perfilAvatarInicial');if(avI)avI.textContent=iniciais;if(av&&U.photoURL){av.innerHTML='<img src="'+escapeHtml(U.photoURL)+'" alt="">';}
var nomeEl=document.getElementById('perfilNome');if(nomeEl)nomeEl.textContent=U.name||'Usuário';var emailEl=document.getElementById('perfilEmail');if(emailEl)emailEl.textContent=U.email||'—';
var ni=document.getElementById('perfilNomeInput');if(ni)ni.value=U.name||'';var ti=document.getElementById('perfilTelInput');if(ti)ti.value=localStorage.getItem('perfil_tel')||'';
var objVal=localStorage.getItem('perfil_obj')||'';
var oi=document.getElementById('perfilObjInput');if(oi)oi.value=objVal||'Sair das dívidas e construir reserva';
var ei=document.getElementById('perfilEmailInput');if(ei)ei.value=U.email||'';
var plan=(typeof userPlan!=='undefined'?userPlan:'free')||'free';var planBadge=document.getElementById('perfilPlanBadge');if(planBadge)planBadge.textContent=plan==='pro'?'Pro':plan==='familia'?'Família':'Gratuito';
if(typeof userAccs==='undefined'||!Array.isArray(userAccs)){saldo=0;}else{saldo=userAccs.reduce(function(s,a){return s+(typeof getAccBal==='function'?getAccBal(a).atual:0);},0);}
var saldoEl=document.getElementById('perfilSaldo');if(saldoEl)saldoEl.textContent=typeof fmt==='function'?fmt(saldo):String(saldo);
var contasEl=document.getElementById('perfilContas');if(contasEl)contasEl.textContent=typeof userAccs!=='undefined'&&Array.isArray(userAccs)?userAccs.length:0;
var scoreEl=document.getElementById('perfilScore');if(scoreEl)scoreEl.textContent=score;
var apEl=document.getElementById('perfilAparencia');if(apEl)apEl.textContent=document.body.classList.contains('theme-light')?'Modo claro':'Modo escuro';}
if(typeof updateResumoSemanalToggle==='function')updateResumoSemanalToggle(!!window._resumoSemanalEmail);
if(typeof perfilAtualizarStatusNotif==='function')perfilAtualizarStatusNotif();
if(typeof carregarPreferencias==='function')carregarPreferencias();
if(typeof lucide!=='undefined')lucide.createIcons();
}
function togglePerfilAlerta(k,el){_perfilAlertasState[k]=!_perfilAlertasState[k];el.classList.toggle('on',_perfilAlertasState[k]);}
function togglePerfilPriv(k,el){_perfilPrivState[k]=!_perfilPrivState[k];el.classList.toggle('on',_perfilPrivState[k]);}
function togglePerfilEdit(){
var ed=document.getElementById('perfilEditBtn');
var acts=document.getElementById('perfilEditActions');
var inputs=['perfilNomeInput','perfilTelInput','perfilObjInput'];
var editing=ed.textContent.indexOf('Cancelar')>=0;
ed.textContent=editing?'Editar dados':'Cancelar';
acts.style.display=editing?'none':'flex';
inputs.forEach(function(id){var inp=document.getElementById(id);if(inp)inp.disabled=editing;});
// fechar form de e-mail ao cancelar
if(editing)cancelarPerfilEmailEdit();
}

function savePerfilDados(){
var n=document.getElementById('perfilNomeInput').value.trim();
var tel=document.getElementById('perfilTelInput').value.trim();
var o=document.getElementById('perfilObjInput').value.trim();
if(U&&U.uid){
try{U.updateProfile({displayName:n}).catch(function(){});}catch(e){}
localStorage.setItem('perfil_tel',tel);
localStorage.setItem('perfil_obj',o);
// Salva objetivo também no Firestore
db.collection('users').doc(U.uid).set({objetivoFinanceiro:o,telefone:tel},{merge:true}).catch(function(){});
}
var nameEl=document.getElementById('perfilNome');if(nameEl)nameEl.textContent=n||(typeof t==='function'?t('usuario'):'Usuário');
togglePerfilEdit();
if(typeof updateDrawerUser==='function')updateDrawerUser();
toast(typeof t==='function'?t('toast_alteracoes_salvas'):'Alterações salvas!','ok');
}

/* ── Alterar e-mail ── */
function showPerfilEmailEdit(){
var form=document.getElementById('perfilEmailEditForm');
if(form){form.style.display='block';}
}
function cancelarPerfilEmailEdit(){
var form=document.getElementById('perfilEmailEditForm');
if(form){form.style.display='none';}
var ni=document.getElementById('perfilEmailNovoInput');var si=document.getElementById('perfilEmailSenhaInput');
if(ni)ni.value='';if(si)si.value='';
}
function salvarPerfilEmail(){
var novoEmail=(document.getElementById('perfilEmailNovoInput')||{}).value.trim();
var senha=(document.getElementById('perfilEmailSenhaInput')||{}).value;
if(!novoEmail||!novoEmail.includes('@')){toast('E-mail inválido.','err');return;}
if(!senha){toast('Informe sua senha atual para confirmar.','err');return;}
if(!U||!U.email){toast('Usuário não autenticado.','err');return;}
var btn=document.querySelector('#perfilEmailEditForm .btn-r');
if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Aguarde...';}
// Re-autenticar e depois atualizar e-mail
var cred=firebase.auth.EmailAuthProvider.credential(U.email,senha);
U.reauthenticateWithCredential(cred).then(function(){
return U.updateEmail(novoEmail);
}).then(function(){
toast('E-mail alterado para '+novoEmail+'! Verifique sua caixa de entrada.','ok');
var ei=document.getElementById('perfilEmailInput');if(ei)ei.value=novoEmail;
var edisp=document.getElementById('perfilEmail');if(edisp)edisp.textContent=novoEmail;
cancelarPerfilEmailEdit();
}).catch(function(err){
if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Confirmar alteração';if(typeof lucide!=='undefined')lucide.createIcons();}
if(err.code==='auth/wrong-password'){toast('Senha incorreta. Tente novamente.','err');}
else if(err.code==='auth/email-already-in-use'){toast('Este e-mail já está em uso.','err');}
else{toast('Erro: '+err.message,'err');}
});
}

/* ── Preferências ── */
function salvarPreferencias(){
var idioma=(document.getElementById('perfilIdiomaSelect')||{}).value||'pt';
var moeda=(document.getElementById('perfilMoedaSelect')||{}).value||'BRL';
localStorage.setItem('sib_idioma',idioma);
localStorage.setItem('sib_moeda',moeda);
if(U&&U.uid)db.collection('users').doc(U.uid).set({idioma:idioma,moeda:moeda},{merge:true}).catch(function(){});
toast('Preferências salvas!','ok');
}
function salvarAparenciaSelect(){
var val=(document.getElementById('perfilAparenciaSelect')||{}).value||'dark';
if(val==='light'&&!document.body.classList.contains('light')){toggleTheme();}
else if(val==='dark'&&document.body.classList.contains('light')){toggleTheme();}
}
function carregarPreferencias(){
var idioma=localStorage.getItem('sib_idioma')||'pt';
var moeda=localStorage.getItem('sib_moeda')||'BRL';
var sel=document.getElementById('perfilIdiomaSelect');if(sel)sel.value=idioma;
var sel2=document.getElementById('perfilMoedaSelect');if(sel2)sel2.value=moeda;
var sel3=document.getElementById('perfilAparenciaSelect');if(sel3)sel3.value=document.body.classList.contains('light')?'light':'dark';
}

/* ── Segurança: ações reais ── */
function segAlterarSenha(){
if(!U||!U.email){toast('Usuário não autenticado.','err');return;}
auth.sendPasswordResetEmail(U.email).then(function(){
toast('Link enviado para '+U.email+'. Verifique sua caixa de entrada.','ok');
}).catch(function(err){
toast('Erro ao enviar: '+err.message,'err');
});
}
function segEncerrarSessoes(){
if(!confirm('Encerrar todas as outras sessões ativas?\nVocê continuará logado neste dispositivo.'))return;
// Firebase não tem API nativa para invalidar outras sessões — melhor UX: forçar refresh do token
if(U){
U.getIdToken(true).then(function(){
toast('Token atualizado. Outras sessões expirarão em até 1 hora.','ok');
}).catch(function(err){toast('Erro: '+err.message,'err');});
}
}
var _accessHistory=[];
function segVerHistorico(){
// Registra acesso atual no localStorage
var hist=JSON.parse(localStorage.getItem('sib_access_hist')||'[]');
var agora=new Date().toLocaleString('pt-BR');
var ua=navigator.userAgent;
var device=ua.includes('Mobile')?'📱 Mobile':ua.includes('Tablet')?'📱 Tablet':'🖥️ Desktop';
// Busca histórico salvo no Firestore
if(!U||!U.uid){toast('Usuário não autenticado.','err');return;}
db.collection('users').doc(U.uid).collection('acessos').orderBy('ts','desc').limit(10).get().then(function(snap){
var itens=[];snap.forEach(function(d){itens.push(d.data());});
var html='<div style="max-width:480px"><h3 style="margin-bottom:16px;font-size:1rem">📋 Histórico de acessos (últimos 10)</h3>';
if(!itens.length){html+='<p style="color:var(--t3);font-size:.88rem">Nenhum registro encontrado ainda.</p>';}
else{html+=itens.map(function(it){return '<div style="padding:10px 0;border-bottom:1px solid var(--brd);font-size:.84rem"><div style="font-weight:600;color:var(--t1)">'+escapeHtml(it.device||'Dispositivo desconhecido')+'</div><div style="color:var(--t3);margin-top:2px">'+escapeHtml(it.ts||'')+'</div></div>';}).join('');}
html+='</div>';
var box=document.getElementById('modalBox');var ov=document.getElementById('modalOv');
if(box&&ov){box.innerHTML=html+'<div style="margin-top:16px;text-align:right"><button class="btn btn-p" onclick="closeModal()">Fechar</button></div>';ov.style.display='flex';if(typeof lucide!=='undefined')lucide.createIcons();}
}).catch(function(){
toast('Histórico disponível apenas para contas com dados registrados.','info');
});
// Salva acesso atual
db.collection('users').doc(U.uid).collection('acessos').add({ts:new Date().toLocaleString('pt-BR'),device:device,email:U.email||''}).catch(function(){});
}
function updateResumoSemanalToggle(on){var btn=document.getElementById('perfilResumoSemanalBtn');var thumb=document.getElementById('perfilResumoSemanalThumb');if(!btn||!thumb)return;btn.setAttribute('aria-pressed',on?'true':'false');btn.classList.toggle('on',on);btn.style.background=on?'rgba(76,123,244,.35)':'var(--bg2)';thumb.style.transform=on?'translateX(20px)':'translateX(3px)';thumb.style.background=on?'#4C7BF4':'var(--t3)';}
function toggleResumoSemanalEmail(){if(!U||!U.uid)return;window._resumoSemanalEmail=!window._resumoSemanalEmail;var on=window._resumoSemanalEmail;updateResumoSemanalToggle(on);db.collection('users').doc(U.uid).set({resumoSemanalEmail:on},{merge:true}).then(function(){toast(on?'Resumo semanal ativado. Você receberá o e-mail às segundas.':'Resumo semanal desativado.','ok');}).catch(function(e){window._resumoSemanalEmail=!on;updateResumoSemanalToggle(!on);toast(typeof t==='function'?t('toast_erro_salvar'):'Erro ao salvar. Tente novamente.','err');});}

/* ── Perfil: Telegram + WhatsApp ── */
function perfilAtualizarStatusNotif(){
var tgLinked=typeof window._tgLinked!=='undefined'?window._tgLinked:false;
var tgNick=window._tgNick||'';
var tgStatus=document.getElementById('tgStatusPerfil');
var tgBtn=document.getElementById('tgBtnPerfil');
if(tgStatus)tgStatus.textContent=tgLinked?'Vinculado como @'+tgNick:'Não vinculado';
if(tgBtn){tgBtn.textContent='';tgBtn.innerHTML=tgLinked?'<i data-lucide="unlink" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Desvincular':'<i data-lucide="link" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Vincular';tgBtn.onclick=tgLinked?perfilDesvincularTelegram:perfilVincularTelegram;}
var waNum=window._waNumber||localStorage.getItem('sibanki_wa_number')||'';
var waStatus=document.getElementById('waStatusPerfil');
var waBtn=document.getElementById('waBtnPerfil');
if(waStatus)waStatus.textContent=waNum?'Configurado: '+waNum:'Não configurado';
if(waBtn){waBtn.innerHTML=waNum?'<i data-lucide="settings" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Editar':'<i data-lucide="link" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Configurar';}
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},20);
}
function perfilVincularTelegram(){go('config',null);setTimeout(function(){var s=document.getElementById('configSectionTelegram');if(s)s.scrollIntoView({behavior:'smooth'});},400);}
function perfilDesvincularTelegram(){if(!confirm('Desvincular o Telegram?'))return;if(U&&U.uid)db.collection('users').doc(U.uid).set({telegramId:null,telegramNick:null},{merge:true});window._tgLinked=false;window._tgNick='';perfilAtualizarStatusNotif();toast('Telegram desvinculado','ok');}
function perfilVincularWhatsApp(){
var num=prompt('Digite seu número de WhatsApp com DDD (ex: 11999998888):','');
if(!num)return;num=num.replace(/\D/g,'');
if(num.length<10||num.length>11){toast('Número inválido. Use apenas dígitos, com DDD.','err');return;}
window._waNumber=num;localStorage.setItem('sibanki_wa_number',num);
if(U&&U.uid)db.collection('users').doc(U.uid).set({whatsappNumber:num},{merge:true}).catch(function(){});
perfilAtualizarStatusNotif();toast('WhatsApp configurado! Notificações serão enviadas para '+num,'ok');
}
// NAV
function go(id,el){
/* Hook: show child section when entering family tab */
if(id==='comunidade'&&typeof initCommunity==='function'){setTimeout(initCommunity,100);}
if(id==='config'&&typeof loadIAUsage==='function'){setTimeout(loadIAUsage,300);}
if(id==='config'&&typeof checkTelegramLink==='function'){setTimeout(checkTelegramLink,300);}
if(id==='config'&&typeof checkWhatsAppLink==='function'){setTimeout(checkWhatsAppLink,300);}
if(id==='perfil'){setTimeout(function(){if(typeof bindPerfilTabs==='function')bindPerfilTabs();},50);if(typeof loadPerfilData==='function'){setTimeout(loadPerfilData,420);}}
if(id==='invest'){
var hasProfile=localStorage.getItem('vrt_investorProfile')||(typeof investorProfileData==='object'&&investorProfileData);
var hasSeenInvestTour=typeof tourModulos==='object'&&tourModulos.invest;
if(!hasSeenInvestTour&&typeof startModuleTour==='function'&&typeof getModuleTourSteps==='function'&&getModuleTourSteps('invest').length>0){
setTimeout(function(){startModuleTour('invest');},500);
}else if(!hasProfile&&hasSeenInvestTour&&typeof openInvestorProfilePopup==='function'){
setTimeout(openInvestorProfilePopup,400);
}
}
if(id==='metas'||id==='lanc'||id==='orçamento'||id==='cartões'||id==='contas'||id==='ia'||id==='config'||id==='casal'||id==='calendario'||id==='conq'){
var mid=id;
if(!tourModulos[mid]&&typeof startModuleTour==='function'&&typeof getModuleTourSteps==='function'&&getModuleTourSteps(mid).length>0){
setTimeout(function(){startModuleTour(mid);},600);
}
}
if(id==='casal'){
if(typeof loadCoupleStatus==='function')loadCoupleStatus();
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},50);
if(typeof loadFamilyChildren==='function'){
setTimeout(function(){
var sec=document.getElementById('familyChildSection');
var admin=document.getElementById('childAdminPanel');
if(sec)sec.style.display='block';
if(admin)admin.style.display='block';
},500);
}
}

var t=document.querySelectorAll('.tab');for(var i=0;i<t.length;i++){t[i].classList.remove('on');t[i].style.animation='none';t[i].style.display=''}
if(id!=='invest'&&typeof showInvSub==='function'){var _subs=["invOverview","invCarteira","invAnalise","invProventos","invSimuladores","invPerfil"];_subs.forEach(function(s){var _el=document.getElementById(s);if(_el){_el.classList.remove("active");_el.style.setProperty("display","none","important");}});var _c=document.getElementById("invCarteira");if(_c){_c.classList.add("active");_c.style.setProperty("display","block","important");}var _tabs=["invTabCarteira","invTabAnalise","invTabProventos","invTabSimuladores","invTabPerfil"];_tabs.forEach(function(tid){var _tb=document.getElementById(tid);if(_tb)_tb.classList.remove("active");});var _ct=document.getElementById("invTabCarteira");if(_ct)_ct.classList.add("active");}
var tb=document.getElementById(id);if(!tb){console.warn('Tab not found: '+id);return;}tb.offsetHeight;tb.style.animation='slideUp2 .5s cubic-bezier(.16,1,.3,1)';tb.classList.add('on');
if(typeof syncDrawerActiveTab==='function')syncDrawerActiveTab(id);
if(window.innerWidth<768&&typeof closeDrawer==='function')closeDrawer();
window.scrollTo({top:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0;
if(id==='calendario'||id==='casal'){var hdrEl=document.getElementById('topHeader');if(hdrEl)document.documentElement.style.setProperty('--header-bottom',hdrEl.getBoundingClientRect().bottom+'px');var w=document.querySelector('.wrap');if(w)w.scrollTop=0;setTimeout(function(){window.scrollTo({top:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0;if(w)w.scrollTop=0;},100);}
if(id==='lanc'&&typeof initLancDate==='function'){try{initLancDate()}catch(e){}}
if(id==='ia'&&window._proactiveConsultorQuestion){setTimeout(function(){var q=document.getElementById('iaQ');if(q){q.value=window._proactiveConsultorQuestion;q.focus();window._proactiveConsultorQuestion=null;}},400);}
/* Calendar hook - render calendar when tab is selected */
if(id==='calendario'&&typeof rCal==='function'){try{rCal()}catch(e){console.warn('rCal error:',e)}}
/* Sempre re-renderizar o conteúdo da aba ao trocar (metas, dashboard, etc.) */
if(typeof renderAll==='function'){setTimeout(renderAll,0);}
}

function escapeHtml(s){
if(s==null||s===undefined)return'';
var d=document.createElement('div');d.textContent=s;return d.innerHTML;
}

function fmt(v){
if(isNaN(v)||v===undefined||v===null)return'R$ 0,00';
var n=v<0;v=Math.abs(v);var s=v.toFixed(2);var parts=s.split('.');
var intP=parts[0];var res='';var c=0;
for(var i=intP.length-1;i>=0;i--){if(c>0&&c%3===0)res='.'+res;res=intP[i]+res;c++}
return(n?'- ':'')+'R$ '+res+','+parts[1];
}
function fmtNumOnly(v){
if(isNaN(v)||v===undefined||v===null)return'0,00';
var s=Math.abs(v).toFixed(2);var parts=s.split('.');
var intP=parts[0];var res='';var c=0;
for(var i=intP.length-1;i>=0;i--){if(c>0&&c%3===0)res='.'+res;res=intP[i]+res;c++}
return res+','+parts[1];
}

function toast(m,t){var e=document.getElementById('toast');e.textContent=m;e.className='toast '+t+' show';setTimeout(function(){e.classList.remove('show')},3000)}

function checkProactiveConsultor(entry){
if(!entry||entry.type!=='despesa')return;
if(window._lastProactiveConsultor&&(Date.now()-window._lastProactiveConsultor<60000))return;
var cat=(entry.category||'').toLowerCase(),desc=(entry.desc||'').toLowerCase();
var isImprevisto=/imprevisto|emergência|emergencia|imprevisto/.test(cat+' '+desc);
var ctx=typeof getFinancialContext==='function'?getFinancialContext():{saldo_mes:0,pct_gasto:0};
var saldoBaixo=ctx.saldo_mes<0||(ctx.pct_gasto>=90);
if(!isImprevisto&&!saldoBaixo)return;
window._lastProactiveConsultor=Date.now();
var msg=isImprevisto?'Você registrou um imprevisto. Quer que eu te ajude a encaixar isso no mês?':'Suas despesas estão altas este mês. Quer que eu te ajude a organizar?';
if(confirm(msg+'\n\n[Abrir Consultor] = Sim  |  [Cancelar] = Agora não')){
window._proactiveConsultorQuestion=isImprevisto?'Como encaixar esse imprevisto no meu orçamento deste mês?':'Como posso organizar minhas despesas este mês?';
if(typeof go==='function')go('ia',null);
}
}

function getMD(){
var m={};
entries.forEach(function(e){if(e.isTransfer||e.category==='Transferencia'||e.status==='pendente'||e.status==='agendado')return;var k=e.date.substring(0,7);if(!m[k])m[k]={r:0,d:0};if(e.type==='receita')m[k].r+=e.value;else m[k].d+=e.value});
return m;
}

function getStreak(){
if(!entries.length)return 0;
var days=new Set(entries.map(function(e){return e.date}));
var streak=0,d=new Date();
for(var i=0;i<365;i++){
var ds=d.toISOString().split('T')[0];
if(days.has(ds))streak++;else if(i>0)break;
d.setDate(d.getDate()-1);
}
return streak;
}

function getLevel(){
var n=Object.keys(achievements).length;
if(n>=12)return'Mestre';if(n>=9)return'Expert';if(n>=6)return'Avançado';if(n>=3)return'Intermediário';if(n>=1)return'Iniciante';return'Novato';
}

// INIT UI
function initUI(){
var anyTabOn=document.querySelector('.tab.on');
if(!anyTabOn){if(typeof go==='function')go('dash',null);}
document.getElementById('fD').value=new Date().toISOString().split('T')[0];
document.getElementById('invDate').value=new Date().toISOString().split('T')[0];
renderCatTags();renderAccTags();try{renderAll();}catch(e){console.error('renderAll error:',e);toast(typeof t==='function'?t('toast_erro_renderizar'):'Erro ao renderizar. Recarregue a página.','err')}
popTfSels();if(typeof popImpCardSel==="function")popImpCardSel();popRcSels();procRc();popFilCat();loadGeminiKey();loadBrapiToken();loadCashMode();loadTheme();popFilMes();popTfSels();setTimeout(chkOnb,800);
// Ocultar banners fixos legados
var _imp=document.getElementById('dashImportPromoCard');if(_imp)_imp.style.display='none';
var _tel=document.getElementById('dashTelegramPromoCard');if(_tel)_tel.style.display='none';
// Flash banners contextuais
setTimeout(function(){if(typeof renderAlertBar==='function')renderAlertBar();},1200);
// Produto insight contextual (IA de vendas)
setTimeout(function(){if(typeof requireFeature==='function')requireFeature('ia_insights_produto',function(){if(typeof checkProdutoInsight==='function')checkProdutoInsight();});},2000);
// Briefing pós-login — controlado por feature flag
setTimeout(function(){if(typeof requireFeature==='function')requireFeature('briefing_ia',function(){if(typeof showBriefingModal==='function')showBriefingModal();});},1800);
setTimeout(function(){if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();},600);
setTimeout(function(){if(!window.matchMedia("(display-mode:standalone)").matches){}},3000);
if(typeof initCouple==="function")initCouple();
setTimeout(checkInviteHash,600);
setTimeout(checkVoiceParam,800);
}
function checkVoiceParam(){
var params=new URLSearchParams(window.location.search);
var voice=params.get('voice')||params.get('siba');
if(!voice||!voice.trim())return;
try{voice=decodeURIComponent(voice.trim());}catch(e){}
if(!voice)return;
history.replaceState({},'',window.location.pathname+window.location.hash||'');
setTimeout(function(){
if(typeof openModalConsultorFAB!=='function')return;
openModalConsultorFAB();
setTimeout(function(){
var inp=document.getElementById('fabConsultorInput');
if(inp){inp.value=voice;fabConsultorSend();}
},400);
},300);
}
function checkInviteHash(){
var m=window.location.hash.match(/#invite=([a-zA-Z0-9_-]+)/);
if(!m||!U||!U.uid)return;
var invId=m[1];
db.collection('invites').doc(invId).get().then(function(snap){
if(!snap.exists)return;
var d=snap.data();
if(d.toEmail!==U.email.toLowerCase())return;
if(d.status!=='pending')return;
if(typeof go==='function')go('casal',null);
setTimeout(function(){
showCoupleInviteReceived({id:snap.id,data:function(){return d;}});
},400);
});
}


function getAccBal(acc){
var ini=accountBalances[acc]||0;
var rec=0;var desp=0;
var cash=(typeof getCashMode==='function')?getCashMode():true;
for(var i=0;i<entries.length;i++){
var e=entries[i];
if(e.account===acc){
var st=(e.status||'pago');
if(cash&&(st==='pendente'||st==='agendado'))continue;
if(e.type==='receita')rec+=e.value;
else desp+=e.value;
}
}
return {ini:ini,rec:rec,desp:desp,atual:ini+rec-desp};
}


function setBalance(){
var acc=document.getElementById('balAcc').value;
var val=pf('balVal');
if(!acc){toast(typeof t==='function'?t('toast_selecione_conta'):'Selecione uma conta','err');return;}
if(isNaN(val)){toast(typeof t==='function'?t('toast_digite_valor'):'Digite um valor','err');return;}
accountBalances[acc]=Math.round(val*100)/100;
saveData();renderCarteira();renderDashW();
toast((typeof t==='function'?t('toast_saldo_definido'):'Saldo de {0} definido!').replace('{0}',acc),'ok');
document.getElementById('balVal').value='';
}

/* old renderCarteira removed */

function renderDashW(){
var c=document.getElementById('dashWallet');
if(!c)return;
var total=0;var h='';
for(var i=0;i<userAccs.length;i++){
var acc=userAccs[i];
var b=getAccBal(acc);
if(!(accountMeta[acc]&&accountMeta[acc].incluirNaSoma===false))total+=b.atual;
var cor=b.atual>=0?'var(--pri)':'#e74c3c';
h+='<div style="background:var(--c2);border-radius:10px;padding:10px 14px;min-width:120px;flex:1;display:flex;align-items:center;gap:8px">';
h+='<div style="flex-shrink:0">'+(typeof getBankLogoHtml==='function'?getBankLogoHtml(acc,28):'')+'</div>';
h+='<div><div style="font-size:.82em;color:var(--t2)">'+acc+'</div>';
h+='<div style="font-size:1.05em;font-weight:700;color:'+cor+';margin-top:2px">R$ '+b.atual.toFixed(2)+'</div></div></div>';
}
h+='<div style="background:var(--pri);border-radius:10px;padding:10px 14px;min-width:130px;flex:1">';
h+='<div style="font-size:.82em;color:rgba(255,255,255,.8)">Total</div>';
h+='<div style="font-size:1.15em;font-weight:700;color:#fff;margin-top:4px">R$ '+total.toFixed(2)+'</div></div>';
c.innerHTML=h;
}

var DASHBOARD_WIDGETS=[
{id:'insight',title:'Insight da IA',size:'full',iconName:'bot'},
{id:'saldo',title:'Patrimônio',size:'full',iconName:'banknote'},
{id:'evolucao-financeira',title:'Evolução Financeira',size:'medium',iconName:'trending-up'},
{id:'despesas-categoria',title:'Despesas por Categoria',size:'medium',iconName:'pie-chart'},
{id:'receitas-despesas',title:'Receitas vs Despesas',size:'medium',iconName:'bar-chart-2'},
{id:'progresso-metas',title:'Progresso das Metas',size:'medium',iconName:'target'},
{id:'orcamento',title:'Orçamento do Mês',size:'full',iconName:'chart-pie'},
{id:'contas',title:'Contas',size:'medium',iconName:'landmark'},
{id:'proximos-vencimentos',title:'Próximos Vencimentos',size:'medium',iconName:'credit-card'},
{id:'conquistas',title:'Conquistas Recentes',size:'medium',iconName:'trophy'},
{id:'ultimos-lancamentos',title:'Últimos Lançamentos',size:'full',iconName:'arrow-left-right'},
{id:'calendario-mini',title:'Calendário Mini',size:'medium',iconName:'calendar'}
];
var DEFAULT_DASHBOARD_LAYOUT=[
{id:'insight',ordem:0,visivel:true},{id:'evolucao-financeira',ordem:1,visivel:true},{id:'despesas-categoria',ordem:2,visivel:true},
{id:'ultimos-lancamentos',ordem:3,visivel:true},{id:'orcamento',ordem:4,visivel:true},
{id:'progresso-metas',ordem:5,visivel:true},{id:'proximos-vencimentos',ordem:6,visivel:true}
];
function getDashboardLayout(){
var L=dashboardLayout&&Array.isArray(dashboardLayout)&&dashboardLayout.length>0?dashboardLayout:DEFAULT_DASHBOARD_LAYOUT;
return L.filter(function(w){return w.visivel!==false}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0)});
}
function renderWidgetContent(widgetId,container){
if(!container)return;
var now=new Date(),cm=now.getMonth(),cy=now.getFullYear(),mesAtual=cy+'-'+String(cm+1).padStart(2,'0');
var mesE=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy});
var mesesNome=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var hideVal=!!window._dashHideValues;
var fmtVal=function(v){return hideVal?'••••':fmt(v);};
var recM=mesE.filter(function(e){return e.type==='receita'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);
var despM=mesE.filter(function(e){return e.type==='despesa'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);
var salM=recM-despM;
var totalSaldo=0;for(var i=0;i<userAccs.length;i++){var _a=userAccs[i];if(accountMeta[_a]&&accountMeta[_a].incluirNaSoma===false)continue;try{totalSaldo+=getAccBal(_a).atual;}catch(x){}}
var totalInv=0;investments.forEach(function(inv){totalInv+=inv.atual||inv.valor||0});
var w=DASHBOARD_WIDGETS.find(function(x){return x.id===widgetId});if(!w)return;
var h='';
if(widgetId==='saldo'){
var patrimonioWidget=totalSaldo+totalInv;
var mesesNomeShort=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var saldoPorMes=[];for(var ei=5;ei>=0;ei--){var dP=new Date(cy,cm-ei,1);var mP=dP.getMonth(),yP=dP.getFullYear(),mesKeyP=yP+'-'+String(mP+1).padStart(2,'0');var recP=entries.filter(function(e){return e.date&&e.date.startsWith(mesKeyP)&&e.type==='receita'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);var despP=entries.filter(function(e){return e.date&&e.date.startsWith(mesKeyP)&&e.type==='despesa'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);saldoPorMes.push(recP-despP);}
var patrimonioEvol=[];patrimonioEvol[5]=Math.round(patrimonioWidget);for(var pi=4;pi>=0;pi--)patrimonioEvol[pi]=Math.round(patrimonioEvol[pi+1]-saldoPorMes[pi+1]);if(patrimonioEvol[0]!==patrimonioEvol[0])patrimonioEvol[0]=0;
var patrimonioVsAnterior=patrimonioEvol.length>=2?patrimonioEvol[5]-patrimonioEvol[4]:0;
var patrimonioLabels=[];for(var li=5;li>=0;li--){var dL=new Date(cy,cm-li,1);patrimonioLabels.push(mesesNomeShort[dL.getMonth()]);}
h='<div class="widget-patrimonio-header"><div class="widget-label">Patrim\u00f4nio</div><div class="widget-saldo-value">'+fmtVal(patrimonioWidget)+'</div><p class="widget-patrimonio-sub">Contas + Investimentos</p></div><div class="widget-patrimonio-chart-wrap"><canvas id="w_c3_patrimonio_evol"></canvas></div><div class="widget-patrimonio-vs '+(patrimonioVsAnterior>=0?'widget-patrimonio-vs-pos':'widget-patrimonio-vs-neg')+'">'+(hideVal?'••••':(patrimonioVsAnterior>=0?'+':'')+fmt(patrimonioVsAnterior))+' <span class="widget-patrimonio-vs-label">vs m\u00eas anterior</span></div>';
}else if(widgetId==='receitas-despesas'){
h='<div class="widget-label">Receitas vs Despesas</div><div style="height:180px;position:relative"><canvas id="w_c3_'+widgetId.replace(/-/g,'_')+'"></canvas></div>';
}else if(widgetId==='evolucao-financeira'){
var mesesNome=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var evolData=[];for(var ei=5;ei>=0;ei--){var dEv=new Date(cy,cm-ei,1);var mEv=dEv.getMonth(),yEv=dEv.getFullYear(),mesKey=yEv+'-'+String(mEv+1).padStart(2,'0');var recEv=entries.filter(function(e){return e.date&&e.date.startsWith(mesKey)&&e.type==='receita'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);var despEv=entries.filter(function(e){return e.date&&e.date.startsWith(mesKey)&&e.type==='despesa'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);evolData.push({month:mesesNome[mEv],receita:Math.round(recEv),despesa:Math.round(despEv)});}
h='<div class="widget-label">Evolução Financeira</div><p class="widget-sublabel">Últimos 6 meses</p><div style="height:200px;position:relative"><canvas id="w_c3_evolucao_financeira"></canvas></div>';
}else if(widgetId==='despesas-categoria'){
var catMap={};mesE.filter(function(e){return e.type==='despesa'&&!e.isTransfer&&e.category!=='Transferencia'}).forEach(function(e){var c=e.category||'Outros';catMap[c]=(catMap[c]||0)+e.value;});var pieEntries=Object.keys(catMap).map(function(k){return{name:k,value:catMap[k]};}).sort(function(a,b){return b.value-a.value;});
var coresPie=['hsl(221, 83%, 53%)','hsl(160, 64%, 43%)','hsl(38, 92%, 50%)','hsl(262, 60%, 58%)','hsl(220, 9%, 46%)','hsl(0, 84%, 60%)'];
h='<div class="widget-label">Despesas por Categoria</div><p class="widget-sublabel">'+mesesNome[cm]+' '+cy+'</p><div style="height:180px;position:relative"><canvas id="w_c3_despesas_categoria"></canvas></div>';
if(pieEntries.length>0){h+='<div class="widget-pie-legend">';pieEntries.forEach(function(pe,i){h+='<div class="widget-pie-legend-item"><span class="widget-pie-dot" style="background:'+coresPie[i%coresPie.length]+'"></span><span class="widget-pie-name">'+escapeHtml(pe.name)+'</span></div>';});h+='</div>';}
}else if(widgetId==='progresso-metas'){
var gl=goals||[];var totalMeta=0,currentMeta=0;
gl.forEach(function(g){var alvo=parseFloat(g.target||g.alvo)||0;var atual=parseFloat(g.current||g.atual)||0;totalMeta+=alvo;currentMeta+=Math.min(atual,alvo);});
var pct=totalMeta>0?Math.round(currentMeta/totalMeta*100):0;
h='<div class="widget-label">Progresso das Metas</div>';
gl.slice(0,4).forEach(function(g){var alvo=parseFloat(g.target||g.alvo)||0;var atual=parseFloat(g.current||g.atual)||0;var p=alvo>0?Math.round(atual/alvo*100):0;
h+='<div style="margin-bottom:10px"><div style="font-size:.8em;margin-bottom:4px">'+(g.nome||g.name||'Meta')+'</div><div style="height:6px;background:var(--bg2);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,p)+'%;background:var(--purple);border-radius:6px;transition:width .6s"></div></div></div>';
});
if(gl.length===0)h+='<p style="color:var(--t2);font-size:.85em">Nenhuma meta cadastrada</p>';
}else if(widgetId==='insight'){
h='<div id="insightDoDiaCard" class="widget-insight-wrap"><div class="widget-insight-icon"><i data-lucide="bot" style="width:28px;height:28px;color:#4C7BF4"></i></div><div class="widget-insight-title">INSIGHT DO DIA</div><div id="insightDoDiaText" class="widget-insight-text">Carregando...</div><div class="widget-insight-actions"><button type="button" class="btn btn-r" onclick="renderInsightDoDia(true)" style="font-size:.8rem;padding:6px 12px">Novo insight</button><button type="button" class="btn" onclick="go(\'ia\',null)" style="font-size:.8rem;padding:6px 12px;background:transparent;border:1px solid var(--brd);color:var(--t2);border-radius:8px;cursor:pointer">Ver no Consultor IA</button></div></div>';
}else if(widgetId==='contas'){
var saldoContas=0;for(var sc=0;sc<userAccs.length;sc++){var bx=getAccBal(userAccs[sc]);saldoContas+=bx.atual;}
h='<div class="widget-label">Saldo em Contas</div><div class="widget-value" style="color:'+(saldoContas>=0?'var(--green)':'var(--danger)')+'">'+fmtVal(saldoContas)+'</div><div style="font-size:.8em;color:var(--t2);margin-top:4px">'+userAccs.length+' conta(s)</div>';
}else if(widgetId==='proximos-vencimentos'){
var hoje=new Date().toISOString().split('T')[0];
var em7Dias=new Date();em7Dias.setDate(em7Dias.getDate()+7);var ate=em7Dias.toISOString().split('T')[0];
var proximos=[];cards.forEach(function(c){var faturas=c.faturas||[];faturas.forEach(function(f){if(f.vencimento>=hoje&&f.vencimento<=ate)proximos.push({tipo:'Fatura',nome:c.name,valor:f.total,data:f.vencimento});});});
entries.filter(function(e){return e.status==='pendente'&&e.date>=hoje&&e.date<=ate}).forEach(function(e){proximos.push({tipo:'Conta',nome:e.desc,valor:e.value,data:e.date});});
proximos.sort(function(a,b){return a.data.localeCompare(b.data)});
h='<div class="widget-label">Próximos 7 dias</div>';
proximos.slice(0,5).forEach(function(p){h+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--brd);font-size:.85em"><span>'+escapeHtml(p.nome)+'</span><span style="font-weight:700;color:var(--vr)">'+fmtVal(p.valor)+'</span></div>';});
if(proximos.length===0)h+='<p style="color:var(--t2);font-size:.85em">Nada a vencer</p>';
}else if(widgetId==='orcamento'){
var orc=budgets||{};var keys=Object.keys(orc);
h='<div class="widget-label">Orçamento do Mês</div>';
keys.slice(0,5).forEach(function(cat){var lim=orc[cat]||0;var usado=mesE.filter(function(e){return e.type==='despesa'&&e.category===cat}).reduce(function(s,e){return s+e.value},0);var p=lim>0?Math.min(100,Math.round(usado/lim*100)):0;
h+='<div style="margin-bottom:10px"><div style="font-size:.8em;margin-bottom:4px">'+escapeHtml(cat)+'</div><div style="height:6px;background:var(--bg2);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+p+'%;background:'+(p>90?'var(--danger)':p>70?'var(--alerta)':'var(--green)')+';border-radius:6px"></div></div><div style="font-size:.7em;color:var(--t2)">'+fmtVal(usado)+' / '+fmtVal(lim)+'</div></div>';
});
if(keys.length===0)h+='<p style="color:var(--t2);font-size:.85em">Nenhum orçamento definido</p>';
}else if(widgetId==='conquistas'){
var ach=achievements||{};var keys=Object.keys(ach).slice(-4).reverse();
h='<div class="widget-label">Conquistas Recentes</div>';
keys.forEach(function(k){var a=ach[k];var d=new Date(a.date||0);h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.85em"><span><i data-lucide="trophy" style="width:20px;height:20px;stroke:currentColor;stroke-width:2"></i></span><span>'+escapeHtml(k)+'</span><span style="color:var(--t3);font-size:.75em">'+d.toLocaleDateString('pt-BR')+'</span></div>';});
if(keys.length===0)h+='<p style="color:var(--t2);font-size:.85em">Nenhuma conquista ainda</p>';
}else if(widgetId==='ultimos-lancamentos'){
var ultimos=entries.slice().sort(function(a,b){return b.date.localeCompare(a.date)}).slice(0,5);
h='<div class="widget-label">Últimos Lançamentos</div>';
ultimos.forEach(function(e){h+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--brd);font-size:.85em"><span>'+escapeHtml(e.desc||e.category)+'</span><span class="m '+(e.type==='receita'?'g':'r')+'">'+(e.type==='receita'?'+ ':'- ')+fmtVal(e.value)+'</span></div>';});
if(ultimos.length===0)h+='<p style="color:var(--t2);font-size:.85em">Nenhum lançamento</p>';
}else if(widgetId==='calendario-mini'){
var dia1=new Date(cy,cm,1);var lastD=new Date(cy,cm+1,0).getDate();
h='<div class="widget-label">Calendário</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:.7em">';
['D','S','T','Q','Q','S','S'].forEach(function(d){h+='<div style="text-align:center;color:var(--t3)">'+d+'</div>';});
for(var i=0;i<dia1.getDay();i++)h+='<div></div>';
for(var d=1;d<=lastD;d++){var ds=cy+'-'+String(cm+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');var gasto=mesE.filter(function(e){return e.type==='despesa'&&e.date===ds}).reduce(function(s,e){return s+e.value},0);var cor=gasto>0?'var(--vr)':'var(--t3)';h+='<div style="text-align:center;padding:4px;border-radius:4px;background:'+(gasto>0?'rgba(239,68,68,.1)':'transparent')+'">'+d+'</div>';}
h+='</div>';
}
container.innerHTML=h;
if(widgetId==='saldo'){
setTimeout(function(){var cid='w_c3_patrimonio_evol';var can=document.getElementById(cid);if(!can||typeof Chart==='undefined')return;if(charts[cid])charts[cid].destroy();var trendData=[];var first=patrimonioEvol[0],last=patrimonioEvol[5];for(var ti=0;ti<6;ti++)trendData.push(first+(last-first)*ti/5);var gc='rgba(148,163,184,0.06)';var segColor=function(ctx){var y0=ctx.p0.parsed.y,y1=ctx.p1.parsed.y;return y1>=y0?'#22C55E':'#EF4444';};charts[cid]=new Chart(can,{type:'line',data:{labels:patrimonioLabels,datasets:[{label:'Patrimonio',data:patrimonioEvol,borderWidth:2.5,tension:0.3,fill:true,backgroundColor:'rgba(34,197,94,0.08)',segment:{borderColor:segColor},pointRadius:[0,0,0,0,0,5],pointBackgroundColor:patrimonioVsAnterior>=0?'#22C55E':'#EF4444',pointBorderColor:'#0d1825',pointBorderWidth:2},{label:'Tendencia',data:trendData,borderWidth:1,borderDash:[6,4],borderColor:'rgba(148,163,184,0.5)',tension:0,pointRadius:0,fill:false}]},options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false},plugins:{legend:{display:false}},scales:{y:{grid:{color:gc},ticks:{color:'#94a3b8'}},x:{grid:{color:gc},ticks:{color:'#94a3b8'}}}}})},150);
}
if(widgetId==='receitas-despesas'){
setTimeout(function(){var cid='w_c3_'+widgetId.replace(/-/g,'_');var can=document.getElementById(cid);if(can&&typeof Chart!=='undefined'){if(charts[cid])charts[cid].destroy();var gc='rgba(148,163,184,0.06)';charts[cid]=new Chart(can,{type:'bar',data:{labels:['Receitas','Despesas'],datasets:[{label:'R$',data:[recM,despM],backgroundColor:['rgba(34,197,94,0.6)','rgba(239,68,68,0.6)']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:gc},ticks:{color:'#94a3b8'}},x:{grid:{color:gc},ticks:{color:'#94a3b8'}}}}})}},100);
}
if(widgetId==='evolucao-financeira'){
setTimeout(function(){var cid='w_c3_evolucao_financeira';var can=document.getElementById(cid);if(!can||typeof Chart==='undefined')return;if(charts[cid])charts[cid].destroy();var labels=evolData.map(function(x){return x.month});charts[cid]=new Chart(can,{type:'line',data:{labels:labels,datasets:[{label:'Receita',data:evolData.map(function(x){return x.receita}),borderColor:'hsl(160, 64%, 43%)',backgroundColor:'rgba(34,197,94,0.15)',fill:true,tension:0.3},{label:'Despesa',data:evolData.map(function(x){return x.despesa}),borderColor:'hsl(0, 84%, 60%)',backgroundColor:'rgba(239,68,68,0.1)',fill:true,tension:0.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top'}},scales:{y:{grid:{color:'rgba(148,163,184,0.06)'},ticks:{color:'#94a3b8'}},x:{grid:{color:'rgba(148,163,184,0.06)'},ticks:{color:'#94a3b8'}}}}})},100);
}
if(widgetId==='despesas-categoria'&&pieEntries&&pieEntries.length>0){
var coresPieArr=['hsl(221, 83%, 53%)','hsl(160, 64%, 43%)','hsl(38, 92%, 50%)','hsl(262, 60%, 58%)','hsl(220, 9%, 46%)','hsl(0, 84%, 60%)'];
setTimeout(function(){var cid='w_c3_despesas_categoria';var can=document.getElementById(cid);if(!can||typeof Chart==='undefined')return;if(charts[cid])charts[cid].destroy();charts[cid]=new Chart(can,{type:'doughnut',data:{labels:pieEntries.map(function(x){return x.name}),datasets:[{data:pieEntries.map(function(x){return x.value}),backgroundColor:pieEntries.map(function(_,i){return coresPieArr[i%6]}),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}})},100);
}
if(widgetId==='insight'&&typeof renderInsightDoDia==='function')setTimeout(renderInsightDoDia,200);
}
function renderDashboardWidgets(){
var grid=document.getElementById('dashboardGrid');if(!grid)return;
var layout=getDashboardLayout();
var editMode=grid.classList.contains('widget-edit-mode');
grid.innerHTML='';
layout.forEach(function(item){
var w=DASHBOARD_WIDGETS.find(function(x){return x.id===item.id});if(!w)return;
var div=document.createElement('div');
div.className='widget '+(w.size==='full'?'widget-full':'');
div.dataset.widgetId=item.id;
div.innerHTML='<span class="widget-drag-handle" aria-label="Arrastar"><i data-lucide="grip-vertical" style="width:16px;height:16px"></i></span><span class="widget-remove-btn" onclick="removerWidgetDashboard(\''+item.id+'\')" aria-label="Remover"><i data-lucide="x" style="width:14px;height:14px"></i></span><div class="widget-content"></div>';
var content=div.querySelector('.widget-content');
try{renderWidgetContent(item.id,content);}catch(e){console.warn('Widget '+item.id+' render error:',e);if(content)content.innerHTML='<p style="color:var(--t2);font-size:.85em">Erro ao carregar widget</p>'}
grid.appendChild(div);
});
if(typeof window.refreshLucide==='function')lucide.createIcons();
}
function toggleDashHideValues(){
try{window._dashHideValues=!window._dashHideValues;if(typeof localStorage!=='undefined')localStorage.setItem('sibanki_dash_hide_values',window._dashHideValues?'1':'0');}catch(e){}
// Sincroniza ícone no header
var headerIcon=document.getElementById('dashHideValuesIcon');
if(headerIcon){headerIcon.setAttribute('data-lucide',window._dashHideValues?'eye-off':'eye');if(typeof lucide!=='undefined')lucide.createIcons();}
if(typeof rKPI==='function')rKPI();
if(typeof renderDashboardWidgets==='function')renderDashboardWidgets();
}
function initDashboardSortable(){
var grid=document.getElementById('dashboardGrid');
if(!grid||typeof Sortable==='undefined')return;
if(window._dashSortable){window._dashSortable.destroy();window._dashSortable=null;}
window._dashSortable=Sortable.create(grid,{
animation:200,
ghostClass:'widget-ghost',
chosenClass:'widget-chosen',
dragClass:'widget-dragging',
placeholder:'widget-placeholder',
filter:'.widget-remove-btn',
preventOnFilter:true,
onEnd:function(){salvarLayoutDashboard();}
});
}
function toggleDashboardEdit(){
var grid=document.getElementById('dashboardGrid');var panel=document.getElementById('dashEditPanel');var btn=document.getElementById('dashEditBtn');
if(!grid)return;
var isEdit=grid.classList.toggle('widget-edit-mode');
panel.classList.toggle('show',isEdit);btn.textContent=isEdit?'Concluir Edição':'Editar Dashboard';
if(isEdit){
initDashboardSortable();
var picker=document.getElementById('dashWidgetPicker');var current=getDashboardLayout().map(function(x){return x.id});
picker.innerHTML=DASHBOARD_WIDGETS.filter(function(w){return current.indexOf(w.id)<0}).map(function(w){return '<span onclick="adicionarWidgetDashboard(\''+w.id+'\')"><i data-lucide="'+(w.iconName||'circle')+'"></i> '+w.title+'</span>'}).join('');
if(typeof window.refreshLucide==='function')lucide.createIcons();
}else{
var pickerEl=document.getElementById('dashWidgetPicker');var closeEl=document.getElementById('dashWidgetPickerClose');
if(pickerEl)pickerEl.style.display='none';if(closeEl)closeEl.style.display='none';
renderDashboardWidgets();
}
}
function removerWidgetDashboard(id){
var L=dashboardLayout&&dashboardLayout.length?dashboardLayout.slice():getDashboardLayout().map(function(w){return Object.assign({},w)});
var idx=L.findIndex(function(w){return w.id===id});
if(idx>=0)L[idx].visivel=false;
dashboardLayout=L;
renderDashboardWidgets();
}
function adicionarWidgetDashboard(id){
var L=dashboardLayout&&dashboardLayout.length?dashboardLayout.slice():getDashboardLayout().map(function(w){return Object.assign({},w)});
if(L.find(function(w){return w.id===id}))return;
L.push({id:id,ordem:L.length,visivel:true});
dashboardLayout=L;
renderDashboardWidgets();
}
async function salvarLayoutDashboard(){
var grid=document.getElementById('dashboardGrid');if(!grid||!U||!U.uid)return;
var widgets=[];grid.querySelectorAll('.widget').forEach(function(el,i){var id=el.dataset.widgetId;if(id)widgets.push({id:id,ordem:i,visivel:true});});
dashboardLayout=widgets;
renderDashboardWidgets();
if(grid.classList.contains('widget-edit-mode'))initDashboardSortable();
try{await db.collection('users').doc(U.uid).update({dashboardLayout:widgets,layoutAtualizadoEm:firebase.firestore.FieldValue.serverTimestamp()});toast(typeof t==='function'?t('toast_layout_salvo'):'Layout salvo!','ok');}catch(e){toast((typeof t==='function'?t('toast_erro_salvar'):'Erro ao salvar: ')+e.message,'err');}
}
function resetarLayoutDashboard(){
dashboardLayout=DEFAULT_DASHBOARD_LAYOUT.slice();
renderDashboardWidgets();
salvarLayoutDashboard();
toast(typeof t==='function'?t('toast_layout_resetado'):'Layout resetado','ok');
}
/* Unificado: máx 1 card de promo visível por vez */
function renderDashImportPromo(){renderDashPromos();}
function renderDashTelegramPromo(){renderDashPromos();}
function renderDashPromos(){
var impCard=document.getElementById('dashImportPromoCard');
var telCard=document.getElementById('dashTelegramPromoCard');
if(telCard)telCard.style.display='none';
if(impCard)impCard.style.display='none';
if(!onboardingDone)return;
var showTelegram=!localStorage.getItem('vrt_telegram_promo');
if(showTelegram&&telCard)telCard.style.display='flex';
}
/* Filtro padrão: mostrar apenas lançamentos de hoje */
function lancInitTodayFilter(){
var hoje=new Date().toISOString().split('T')[0];
var fDe=document.getElementById('filDe'),fAte=document.getElementById('filAte');
var fMes=document.getElementById('filMes');
// só inicializa se nenhum filtro de data estiver ativo
if(fDe&&!fDe.value&&fAte&&!fAte.value){
if(fDe)fDe.value=hoje;
if(fAte)fAte.value=hoje;
if(fMes&&fMes.value==='all')fMes.value='all';
// Mostrar chip indicador de filtro ativo
var bar=document.getElementById('lancFilterChipBar');
if(!bar){bar=document.createElement('div');bar.id='lancFilterChipBar';bar.style.cssText='display:flex;align-items:center;gap:8px;margin:4px 0 8px;flex-wrap:wrap';var filtrosBar=document.querySelector('.lanc-filtros-bar');if(filtrosBar)filtrosBar.insertAdjacentElement('afterend',bar);}
bar.innerHTML='<span style="font-size:.78rem;color:var(--t3)">Mostrando:</span><span style="display:inline-flex;align-items:center;gap:6px;background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.25);border-radius:20px;padding:3px 10px;font-size:.78rem;color:var(--pri);font-weight:600"><i data-lucide="calendar" style="width:12px;height:12px"></i>Hoje</span><button type="button" style="font-size:.75rem;color:var(--t3);background:none;border:none;cursor:pointer;text-decoration:underline" onclick="lancClearTodayFilter()">Ver todos</button>';
if(typeof window.refreshLucide==='function')setTimeout(function(){lucide.createIcons();},20);
}
}
function lancClearTodayFilter(){
var fDe=document.getElementById('filDe'),fAte=document.getElementById('filAte');
if(fDe)fDe.value='';if(fAte)fAte.value='';
var bar=document.getElementById('lancFilterChipBar');if(bar)bar.innerHTML='';
rE();
}
function setLancFirstGuide(){var box=document.getElementById('lancFormBox');
var hint=document.getElementById('lancFirstGuideHint');
if(!box||!hint)return;
if(entries.length===0){
hint.style.display='block';
box.classList.add('lanc-first-guide');
}else{
hint.style.display='none';
box.classList.remove('lanc-first-guide');
}
}

var edId=null;
function editE(id){
var e=null;for(var i=0;i<entries.length;i++){if(entries[i].id===id){e=entries[i];break}}
if(!e)return;
edId=id;
document.getElementById('edD').value=e.date;
document.getElementById('edT').value=e.type;
document.getElementById('edC').innerHTML=userCats.map(function(c){return '<option value="'+c+'"'+(c===e.category?' selected':'')+'>'+c+'</option>'}).join('');
document.getElementById('edV').value=e.value;
document.getElementById('edDe').value=e.desc||'';
document.getElementById('edA').innerHTML=userAccs.map(function(a){return '<option value="'+a+'"'+(a===e.account?' selected':'')+'>'+a+'</option>'}).join('');
var edSt=document.getElementById('edStatus');
if(edSt){edSt.value=e.status||'pago'}
var edPg=document.getElementById('edPgto');
if(edPg){edPg.value=e.formaPgto||''}
document.getElementById('editMdl').style.display='flex';
}
function saveEd(){
if(!edId)return;
for(var i=0;i<entries.length;i++){
if(entries[i].id===edId){
var v=parseFloat(document.getElementById('edV').value);
if(!v||v<=0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
entries[i].date=document.getElementById('edD').value;
entries[i].type=document.getElementById('edT').value;
entries[i].category=document.getElementById('edC').value;
entries[i].value=Math.round(v*100)/100;
entries[i].desc=document.getElementById('edDe').value.trim()||entries[i].category;
entries[i].account=document.getElementById('edA').value;
var edSt=document.getElementById('edStatus');
if(edSt)entries[i].status=edSt.value;
var edPg=document.getElementById('edPgto');
if(edPg)entries[i].formaPgto=edPg.value;
break;
}
}
closeEd();saveData();renderAll();toast(typeof t==='function'?t('toast_atualizado'):'Atualizado!','ok');
}
function closeEd(){edId=null;document.getElementById('editMdl').style.display='none'}


function doTransfer(){
var date=document.getElementById('tfD').value;
var from=document.getElementById('tfFrom').value;
var to=document.getElementById('tfTo').value;
var val=pf('tfV');
if(!date){toast(typeof t==='function'?t('toast_selecione_data'):'Selecione a data','err');return}
if(!from||!to||from===to){toast(typeof t==='function'?t('toast_contas_diferentes'):'Selecione contas diferentes','err');return}
if(!val||val<=0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
val=Math.round(val*100)/100;
var now=Date.now();
entries.push({id:now,date:date,type:'despesa',desc:'Transf. para '+to,category:'Transferencia',value:val,account:from,isTransfer:true});
entries.push({id:now+1,date:date,type:'receita',desc:'Transf. de '+from,category:'Transferencia',value:val,account:to,isTransfer:true});
saveData();renderAll();toast((typeof t==='function'?t('toast_transferencia_realizada'):'Transferencia de R$ {0} realizada!').replace('{0}',val.toFixed(2)),'ok');
document.getElementById('tfV').value='';
}
function popTfSels(){
var opts=userAccs.map(function(a){return '<option value="'+a+'">'+a+'</option>'}).join('');
/* Lanc tab transfer selects */
var s1=document.getElementById('tfFrom');if(s1)s1.innerHTML=opts;
var s2=document.getElementById('tfTo');if(s2)s2.innerHTML=opts;
var s3=document.getElementById('tfD');if(s3&&!s3.value)s3.value=new Date().toISOString().split('T')[0];
/* Carteira tab transfer selects */
var w1=document.getElementById('wTfFrom');if(w1)w1.innerHTML=opts;
var w2=document.getElementById('wTfTo');if(w2)w2.innerHTML=opts;
}



var recurrents=[];
var cards=[];
function addRc(){
var t=document.getElementById('rcT').value;
var de=document.getElementById('rcDe').value.trim();
var cat=document.getElementById('rcC').value;
var val=pf('rcV');
var acc=document.getElementById('rcA').value;
var day=parseInt(document.getElementById('rcDay').value);
if(!de){toast(typeof t==='function'?t('toast_digite_descricao'):'Digite descrição','err');return}
if(!val||val<=0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
if(!day||day<1||day>31){toast(typeof t==='function'?t('toast_dia_invalido'):'Dia inválido','err');return}
var freq=document.getElementById('rcFreq')?document.getElementById('rcFreq').value:'mensal';
recurrents.push({id:Date.now(),type:t,desc:de,category:cat,value:Math.round(val*100)/100,account:acc,day:day,freq:freq,active:true});
saveData();rnRc();toast(typeof t==='function'?t('toast_recorrente_adicionado'):'Recorrente adicionado!','ok');
document.getElementById('rcDe').value='';document.getElementById('rcV').value='';
}
function delRc(id){
if(!confirm(typeof t==='function'?t('confirm_excluir_recorrente'):'Excluir recorrente?'))return;
recurrents=recurrents.filter(function(r){return r.id!==id});
saveData();rnRc();
}
function rnRc(){
var c=document.getElementById('rcList');
if(!c)return;
if(!recurrents.length){c.innerHTML='<p style="color:var(--t2);font-size:.85em">Nenhum recorrente cadastrado.</p>';return}
var totalR=0;var totalD=0;
var h=recurrents.map(function(r){
var cor=r.type==='receita'?'#27ae60':'#e74c3c';
if(r.type==='receita')totalR+=r.value;else totalD+=r.value;
return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--c2);border-radius:8px;margin-bottom:6px">'+
'<div><b>'+r.desc+'</b> <span style="color:var(--t2);font-size:.82em">('+r.category+' | dia '+r.day+' | '+(r.freq||'mensal')+' | '+r.account+')</span></div>'+
'<div style="display:flex;align-items:center;gap:8px"><span style="color:'+cor+';font-weight:700">R$ '+r.value.toFixed(2)+'</span>'+
'<button class="btn-d" onclick="delRc('+r.id+')">X</button></div></div>';
}).join('');
h+='<div style="display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:.9em;flex-wrap:wrap">';
h+='<span style="color:#27ae60;font-weight:600">Receitas fixas: R$ '+totalR.toFixed(2)+'</span>';
h+='<span style="color:#e74c3c;font-weight:600">Despesas fixas: R$ '+totalD.toFixed(2)+'</span>';
h+='<span style="color:var(--pri);font-weight:600">Saldo fixo: R$ '+(totalR-totalD).toFixed(2)+'</span></div>';
c.innerHTML=h;
}
function procRc(){
var td=new Date();var y=td.getFullYear();var m=td.getMonth();
var changed=false;
for(var i=0;i<recurrents.length;i++){
var r=recurrents[i];if(!r.active)continue;
var freq=r.freq||'mensal';
var shouldRun=false;
if(freq==='mensal')shouldRun=true;
else if(freq==='semanal')shouldRun=true;
else if(freq==='quinzenal')shouldRun=true;
else if(freq==='bimestral')shouldRun=(m%2===0);
else if(freq==='trimestral')shouldRun=(m%3===0);
else if(freq==='semestral')shouldRun=(m%6===0);
else if(freq==='anual')shouldRun=(m===0);
else shouldRun=true;
if(!shouldRun)continue;
var ym=y+'-'+String(m+1).padStart(2,'0');
var tag='rc_'+r.id+'_'+ym;
if(freq==='semanal'){
var semana=Math.ceil(td.getDate()/7);
tag='rc_'+r.id+'_'+ym+'_w'+semana;
}else if(freq==='quinzenal'){
var quinz=td.getDate()<=15?'q1':'q2';
tag='rc_'+r.id+'_'+ym+'_'+quinz;
}
var ex=false;for(var j=0;j<entries.length;j++){if(entries[j].rcTag===tag){ex=true;break}}
if(!ex){
var maxD=new Date(y,m+1,0).getDate();
var d=Math.min(r.day||1,maxD);
var ds=ym+'-'+String(d).padStart(2,'0');
var freqLabel={'mensal':'fixo','semanal':'semanal','quinzenal':'quinzenal','bimestral':'bimestral','trimestral':'trimestral','semestral':'semestral','anual':'anual'};
entries.push({id:Date.now()+i,date:ds,type:r.type,desc:r.desc+' ('+( freqLabel[freq]||'fixo')+')',category:r.category,value:r.value,account:r.account,rcTag:tag,isFixed:true,status:'pendente'});
changed=true;
}
}
if(changed){saveData();toast(typeof t==='function'?t('toast_custos_fixos_lancados'):'Custos fixos do mês lançados!','ok')}
}
function popRcSels(){
var co=userCats.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('');
var ao=userAccs.map(function(a){return '<option value="'+a+'">'+a+'</option>'}).join('');
var s1=document.getElementById('rcC');if(s1)s1.innerHTML=co;
var s2=document.getElementById('rcA');if(s2)s2.innerHTML=ao;
}


function chkOnb(){if(!onboardingDone)return;if(!localStorage.getItem('vrt_onb')&&typeof startSibankiTour==='function')startSibankiTour()}

var sibTourSteps=[
{selector:'.top-header-btn-menu',title:'Menu Principal',body:'Aqui você acessa todos os 15 módulos do Sibanki. Dashboard, Investimentos, Família e muito mais — tudo em um lugar.'},
{selector:'#kR',title:'Visão Geral',body:'Seus números mais importantes em tempo real. Saldo do mês, Patrimônio total, Receitas e Despesas — tudo atualizado automaticamente.'},
{selector:'#insightDoDiaCard',title:'Inteligência Artificial',body:'Sua IA financeira pessoal. Toda vez que abrir o app, ela analisa seus dados e traz um insight personalizado para você.'},
{selector:'#dashEditBtn',title:'Dashboard Configurável',body:'O Sibanki é seu. Clique aqui para reorganizar os blocos, remover o que não usa e adicionar o que prefere ver em destaque.'},
{selector:'#virtFab',title:'Lançamento Rápido',body:'Este botão está em todas as telas. Use para lançar gastos e receitas em segundos — ou fale por voz e a IA interpreta automaticamente.'},
{selector:'.notif-btn',title:'Alertas Inteligentes',body:'Sua IA monitora suas finanças 24h. Você recebe alertas quando um orçamento estourar, uma conta vencer ou uma oportunidade aparecer.'},
{selector:'#topHeaderAvatar',title:'Score Financeiro',body:'Seu score vai de 0 a 100 e mede sua saúde financeira. Quanto mais você lançar, mais preciso ele fica. Meta: chegar ao Score 100! 🎯'},
{selector:'#sibPrimeirosPassos',title:'Seus Primeiros Passos',body:'Complete esses passos para aproveitar o Sibanki ao máximo. Cada item concluído melhora seu score e desbloqueia recursos da IA.',last:true}
];
var sibTourIndex=0;
var _sibTourState=null;
var _sibTourPositionTick=null;
var _sibTourResizeHandler=null;
function _sibTourCurrentStep(){
if(_sibTourState&&_sibTourState.steps)return _sibTourState.steps[_sibTourState.index];
return sibTourSteps[sibTourIndex];
}
function _sibTourCurrentIndex(){return _sibTourState?_sibTourState.index:sibTourIndex;}
function _sibTourTotalSteps(){return _sibTourState?_sibTourState.steps.length:sibTourSteps.length;}
function sibTourRefreshPosition(){
var step=_sibTourCurrentStep();
var spotlight=document.getElementById('sibTourSpotlight');
var tooltip=document.getElementById('sibTourTooltip');
if(!step||!spotlight||!tooltip)return;
var el=document.querySelector(step.selector);
if(el){
var r=el.getBoundingClientRect();
// Só reposiciona se elemento está visível (evita calcular com r={0,0,0,0})
if(r.width===0&&r.height===0){spotlight.style.display='none';return;}
var pad=12;
spotlight.style.display='block';
spotlight.style.top=(r.top-pad)+'px';
spotlight.style.left=(r.left-pad)+'px';
spotlight.style.width=(r.width+pad*2)+'px';
spotlight.style.height=(r.height+pad*2)+'px';
sibTourPositionTooltip(el,tooltip);
}else{
spotlight.style.display='none';
}
}
function startSibankiTour(){
var ov=document.getElementById('sibTourOverlay');
var tt=document.getElementById('sibTourTooltip');
if(!ov||!tt)return;
_sibTourState=null;
sibTourIndex=0;
ov.classList.add('show');
ov.setAttribute('aria-hidden','false');
try{localStorage.removeItem('vrt_onb');}catch(z){}
sibTourUpdateStep();
sibTourStartPositionTick();
}

function getModuleTourSteps(moduleId){
var steps={
invest:[
{selector:'.inv-hero',title:'Módulo Investimentos 📈',body:'Aqui você acompanha todo seu patrimônio investido: rentabilidade, proventos recebidos e simuladores de juros compostos. Tudo para tomar decisões mais conscientes.'},
{selector:'#invNav',title:'5 abas, tudo coberto',body:'▸ Minha Carteira: seus ativos cadastrados. ▸ Análise B3: cotações em tempo real de ações e FIIs. ▸ Proventos: dividendos e JCP. ▸ Simuladores: projeções de rentabilidade. ▸ Perfil: questionário do investidor.'},
{selector:'#invTabCarteira',title:'Minha Carteira',body:'Cadastre cada investimento (CDB, ações, FIIs, Tesouro Direto, cripto) com valor e data de entrada. O Sibanki calcula o total investido e você acompanha a evolução do patrimônio ao longo do tempo.'},
{selector:'#invTabProventos',title:'Proventos (Dividendos e JCP)',body:'Nesta aba ficam os dividendos e Juros sobre Capital Próprio recebidos dos seus ativos de renda variável. Registre cada provento para ter o histórico de renda passiva completo.'},
{selector:'#invTabSim',title:'Simuladores Financeiros',body:'Projete quanto seu dinheiro vai render: calcule juros compostos, simule quanto precisaria guardar por mês para atingir uma meta ou compare diferentes opções de investimento.'},
{selector:'#invTabPerfil',title:'Perfil do Investidor',body:'Responda ao questionário de suitability para descobrir seu perfil de risco (Conservador → Agressivo) e receber uma sugestão de alocação ideal entre Renda Fixa, Ações, FIIs e Cripto. Deseja responder agora?',ctaQuestionario:true}
],
metas:[
{selector:'#metasWrap',title:'Metas Financeiras 🎯',body:'Aqui você transforma sonhos em planos concretos: reserva de emergência, viagem, entrada do imóvel, carro novo. O Sibanki calcula quanto guardar por mês para chegar lá no prazo que você definir.'},
{selector:'.metas-header',title:'Criando sua primeira meta',body:'Clique em + Nova Meta e escolha um atalho rápido (Reserva, Viagem, Imóvel, Carro) ou defina um objetivo personalizado com nome, valor-alvo e prazo em meses.'},
{selector:'#metasWrap',title:'Progresso visual',body:'Cada meta mostra uma barra de progresso, o valor acumulado, quanto falta e a estimativa de quando você vai atingir o objetivo. Conforme faz lançamentos, o progresso atualiza.'},
{selector:'#metasWrap',title:'Aporte sugerido',body:'O Sibanki calcula automaticamente quanto você precisa guardar por mês para atingir cada meta no prazo. Se o prazo estiver curto, ele avisa e sugere aumentar o aporte ou estender o prazo.'},
{selector:'#virtFab',title:'Aporte rápido via IA',body:'Você pode registrar um aporte em uma meta pelo Consultor IA. Experimente: toque no ícone e diga "adicionar R$200 na meta viagem". Ele vincula automaticamente.',last:true}
],
lanc:[
{selector:'#fD',title:'Lançamentos 📋',body:'Central de controle das suas finanças. Registre toda receita e despesa com data, descrição, valor, categoria, conta e tags. O histórico completo fica disponível para análise a qualquer momento.'},
{selector:'#fD',title:'Formulário rápido',body:'Preencha: ① Tipo (Receita ou Despesa) ② Data ③ Descrição ④ Valor ⑤ Categoria ⑥ Conta. Os campos de Recorrente e Tag são opcionais. Clique em Salvar ou pressione Enter.'},
{selector:'#rcList',title:'Lançamentos Recorrentes',body:'Aqui ficam as contas fixas: aluguel, streaming, salário, academia. Cadastre uma vez e o Sibanki lembra você no vencimento — e opcionalmente lança automaticamente todo mês.'},
{selector:'#fC',title:'Filtros por categoria',body:'Use o filtro de categoria para analisar gastos específicos. Selecione "Alimentação" para ver quanto gastou em comida no mês, ou "Lazer" para checar se ficou dentro do orçamento.'},
{selector:'#fD',title:'Importar extrato do banco',body:'Já usa outro app ou quer trazer lançamentos em lote? Use a função de importação (disponível na aba Cartões → Importar) para trazer CSV do Nubank, Inter, Itaú ou C6 em segundos.'},
{selector:'#virtFab',title:'Lançamento por voz ou texto IA',body:'A forma mais rápida: toque no Consultor e diga "almoço 45 reais". A IA interpreta e registra automaticamente. Funciona com linguagem natural: "paguei o aluguel 1800 hoje".',last:true}
],
'orçamento':[
{selector:'.orc-header',title:'Orçamento Mensal 💰',body:'Defina quanto quer gastar em cada categoria do mês. O Sibanki compara o planejado com o realizado e te avisa quando você está se aproximando ou estourou um limite.'},
{selector:'#orcamentoStep1',title:'Passo 1 — Sua renda',body:'Informe sua renda mensal total. Com base nisso, o Sibanki sugere automaticamente limites por categoria seguindo a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança.'},
{selector:'#orcamentoStep2',title:'Passo 2 — Categorias',body:'Ajuste os limites sugeridos para cada categoria conforme sua realidade. Você pode adicionar categorias personalizadas, remover as que não usa e copiar o orçamento do mês anterior.'},
{selector:'#orcamentoFilledList',title:'Acompanhamento em tempo real',body:'Conforme você registra lançamentos, as barras de progresso de cada categoria atualizam automaticamente. Verde = ok, amarelo = atenção, vermelho = estourou.'},
{selector:'#orcamentoWrap',title:'Histórico mensal',body:'Navegue pelos meses anteriores para comparar planejado vs. realizado. Identifique padrões de gasto e ajuste seu orçamento futuro baseado no histórico real.',last:true}
],
cartões:[
{selector:'#cardsCarousel',title:'Cartões de Crédito 💳',body:'Gerencie todos os seus cartões em um só lugar. Cadastre com limite, dia de fechamento e dia de vencimento. O Sibanki controla a fatura e avisa antes do vencimento.'},
{selector:'#cardsCarousel',title:'Seu carrossel de cartões',body:'Cada cartão aparece como um card visual com o limite total e o limite disponível. Deslize para navegar entre os cartões. O card "+ Adicionar" fica sempre no final.'},
{selector:'.card-pill',title:'Abas por cartão',body:'Com um cartão selecionado você tem 3 abas: ▸ Lançar: registrar compras e parcelamentos. ▸ Importar: trazer extrato CSV da operadora. ▸ Fatura: ver o resumo da fatura atual e histórico de faturas.'},
{selector:'#virtFab',title:'Lançar compra via IA',body:'Toque no Consultor e diga "comprei no cartão Nubank 150 reais sapatos". A IA vincula automaticamente ao cartão correto, categoriza e registra a compra.',last:true}
],
contas:[
{selector:'.contas-header',title:'Contas e Carteira 🏦',body:'Aqui ficam suas contas bancárias, carteiras digitais e o caixa. Registre o saldo inicial de cada conta — a partir daí, todo lançamento vinculado a ela atualiza o saldo automaticamente.'},
{selector:'.contas-header-actions',title:'Ações rápidas',body:'Use os botões no topo para: ① Adicionar nova conta. ② Ver a evolução do patrimônio ao longo do tempo em gráfico. ③ Acessar opções adicionais como transferência entre contas.'},
{selector:'#contasSidebarAtual',title:'Saldo atual e previsto',body:'O painel lateral mostra o saldo atual da conta selecionada e o saldo previsto — calculado considerando os lançamentos agendados para os próximos dias.'},
{selector:'#contas',title:'Lista de contas',body:'Cada conta mostra o banco, o nome e o saldo atual. Clique em uma conta para ver o extrato detalhado. Use a transferência para mover valores entre contas sem perder o histórico.',last:true}
],
ia:[
{selector:'#ia',title:'Consultor IA Sibanki 🤖',body:'Seu assistente financeiro pessoal com inteligência artificial. Ele conhece seus dados: saldo, gastos, metas, investimentos. Faça perguntas, peça análises ou deixe ele sugerir ações.'},
{selector:'#ia',title:'Atalhos inteligentes',body:'Use os botões de atalho para começar: "Análise Geral" traz um diagnóstico completo, "Dicas de Economia" sugere cortes baseados nos seus gastos reais, "Hábitos Financeiros" analisa seus padrões de consumo.'},
{selector:'#iaQ',title:'Pergunte em linguagem natural',body:'Escreva como se estivesse conversando: "quanto gastei com restaurante em janeiro?", "estou no limite do orçamento de lazer?", "quais minhas maiores despesas este mês?". Sem comandos especiais.'},
{selector:'#iaHistory',title:'Histórico da conversa',body:'O histórico fica salvo durante a sessão. Role para cima para rever análises anteriores. Para uma nova análise do zero, clique em Limpar conversa.'},
{selector:'#virtFab',title:'IA em qualquer tela',body:'O Consultor IA está disponível em todas as abas pelo botão flutuante. Use para lançamentos rápidos ("almoço 45"), dúvidas ("o que é CDI?") ou comandos ("criar meta viagem 3000").',last:true}
],
config:[
{selector:'.config-hero',title:'Configurações ⚙️',body:'Personalize sua experiência: tema claro ou escuro, chaves de API para cotações em tempo real, backup dos dados e preferências de notificação.'},
{selector:'#planSection',title:'Seu plano',body:'Veja qual plano você está usando e os recursos disponíveis. Faça upgrade para Pro ou Família para desbloquear Briefing IA diário, relatórios PDF e finanças compartilhadas.'},
{selector:'.cfg-sec-hd',title:'Preferências e integrações',body:'Cada seção tem um ícone e um título. Configure: ▸ Modo Caixa (como o saldo é calculado) ▸ Chave Gemini (sua IA) ▸ Token B3 Brapi (cotações em tempo real) ▸ Categorias personalizadas.'},
{selector:'#planSection',title:'Backup dos seus dados',body:'Mais abaixo na aba você encontra o Backup. Exporte em JSON (completo) ou CSV (planilha). Seus dados ficam na nuvem Firebase, mas o backup local é uma camada extra de proteção.',last:true}
],
casal:[
{selector:'#casal',title:'Finanças em Família 👨‍👩‍👧',body:'Gerencie as finanças do casal ou da família juntos. Cada pessoa mantém sua conta individual, mas vocês têm visibilidade total do consolidado — receitas, despesas, metas e investimentos de todos.'},
{selector:'#coupleNotLinked',title:'Vincular parceiro(a)',body:'Para começar, envie um convite por email para seu parceiro(a). Quando ele(a) aceitar, as finanças de vocês serão vinculadas e você verá o painel consolidado do casal.'},
{selector:'#coupleEmail',title:'Enviar convite',body:'Digite o email do parceiro(a) no campo e clique em Enviar. O email pode ser de alguém que ainda não tem conta no Sibanki — o convite cria a conta automaticamente.'},
{selector:'#familyChildSection',title:'Finanças dos filhos',body:'No plano Família você também pode cadastrar perfis para os filhos, definir mesadas e acompanhar os gastos de cada um. Cada filho tem seu próprio dashboard simplificado.',last:true}
],
calendario:[
{selector:'#calendario',title:'Calendário Financeiro 📅',body:'Visualize todas as suas movimentações financeiras em formato de calendário. Veja num relance quais dias do mês tiveram lançamentos, contas a vencer ou metas com aporte programado.'},
{selector:'.cal-hd',title:'Navegando pelo calendário',body:'Use as setas ◀ ▶ para avançar ou voltar meses. O mês e ano atual ficam exibidos no centro. Clique em qualquer dia para ver o resumo dos lançamentos daquela data.'},
{selector:'#calG',title:'Dias com eventos',body:'Dias com lançamentos aparecem marcados no calendário. Verde indica receita, vermelho indica despesa. Dias com vencimentos de contas ou cartões aparecem com destaque em amarelo.'},
{selector:'#calSum',title:'Resumo do mês',body:'O resumo no topo mostra o total de receitas, despesas e o saldo do mês selecionado. Use para ter uma visão rápida de como foi o mês sem precisar abrir cada lançamento.',last:true}
],
conquistas:[
{selector:'#conq',title:'Conquistas e Gamificação 🏆',body:'O Sibanki recompensa bons hábitos financeiros. Cada ação positiva — registrar lançamentos, cumprir orçamento, atingir metas — desbloqueia badges e acumula pontos XP.'},
{selector:'.conq-hero',title:'Seu perfil de conquistas',body:'Aqui você vê suas conquistas desbloqueadas, quantas faltam e sua sequência de dias usando o app. Manter a sequência ativa é um dos critérios para subir de nível.'},
{selector:'#cqCount',title:'KPIs de progresso',body:'▸ Conquistas: quantas você desbloqueou do total disponível. ▸ Sequência: dias consecutivos usando o app. ▸ Nível: Iniciante → Bronze → Prata → Ouro → Diamante. ▸ Score: sua pontuação financeira geral.'},
{selector:'#badgesGrid',title:'Galeria de badges',body:'Cada badge tem um critério específico: "Primeiro lançamento", "Meta atingida", "30 dias sem estouro de orçamento", "Portfólio diversificado" e muitos outros. Passe o mouse sobre um badge para ver o que falta para desbloquear.',last:true}
]
};
return steps[moduleId]||[];
}

function startModuleTour(moduleId){
var steps=getModuleTourSteps(moduleId);
if(!steps.length)return;
var ov=document.getElementById('sibTourOverlay');
var tt=document.getElementById('sibTourTooltip');
if(!ov||!tt)return;
_sibTourState={
steps:steps,
index:0,
onEnd:function(){
if(typeof tourModulos!=='undefined')tourModulos[moduleId]=true;
if(typeof saveData==='function')saveData();
}
};
sibTourIndex=-1;
ov.classList.add('show');
ov.setAttribute('aria-hidden','false');
sibTourUpdateStep();
sibTourStartPositionTick();
}
function sibTourStartPositionTick(){
if(_sibTourPositionTick)return;
function tick(){
var ov=document.getElementById('sibTourOverlay');
if(!ov||!ov.classList.contains('show')){sibTourStopPositionTick();return;}
sibTourRefreshPosition();
}
_sibTourResizeHandler=tick;
_sibTourPositionTick=setInterval(tick,120);
window.addEventListener('resize',tick);
}
function sibTourStopPositionTick(){
if(_sibTourPositionTick){clearInterval(_sibTourPositionTick);_sibTourPositionTick=null;}
if(_sibTourResizeHandler){window.removeEventListener('resize',_sibTourResizeHandler);_sibTourResizeHandler=null;}
}
function sibTourUnbindScrollResize(){
sibTourStopPositionTick();
}
function sibTourUpdateStep(){
var step=_sibTourCurrentStep();
var spotlight=document.getElementById('sibTourSpotlight');
var tooltip=document.getElementById('sibTourTooltip');
if(!step){
sibTourEnd();return;
}
var el=step.selector?document.querySelector(step.selector):null;
if(el){
// Garante que o elemento está visível antes de calcular posição
if(el.scrollIntoView){el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}
// Esconde o spotlight durante o scroll para não "vaguear"
spotlight.style.display='none';
// Aguarda o scroll terminar + animações de aba (450ms) antes de posicionar
setTimeout(function(){
var r=el.getBoundingClientRect();
// Só mostra se o elemento está de fato na viewport
if(r.width>0&&r.height>0){
var pad=12;
spotlight.style.display='block';
spotlight.style.top=(r.top-pad)+'px';
spotlight.style.left=(r.left-pad)+'px';
spotlight.style.width=(r.width+pad*2)+'px';
spotlight.style.height=(r.height+pad*2)+'px';
}
sibTourRefreshPosition();
},460);
}else{
spotlight.style.display='none';
}
document.getElementById('sibTourTTTitle').textContent=step.title;
document.getElementById('sibTourTTCount').textContent=(_sibTourCurrentIndex()+1)+' / '+_sibTourTotalSteps();
document.getElementById('sibTourTTBody').textContent=step.body;
var actionsNorm=document.getElementById('sibTourTTActions');
var actionsCTA=document.getElementById('sibTourTTActionsCTA');
if(step.ctaQuestionario&&actionsNorm&&actionsCTA){
if(actionsNorm)actionsNorm.style.display='none';
if(actionsCTA)actionsCTA.style.display='flex';
}else{
if(actionsNorm)actionsNorm.style.display='flex';
if(actionsCTA)actionsCTA.style.display='none';
var btnNext=document.getElementById('sibTourNext');
if(btnNext)btnNext.textContent=step.last?'ENTENDIDO, VAMOS LÁ! 🚀':'PRÓXIMO →';
}
tooltip.style.display='block';
requestAnimationFrame(function(){sibTourRefreshPosition();});
}
function sibTourPositionTooltip(targetEl,tt){
var ttRect=tt.getBoundingClientRect();
var vw=window.innerWidth;var vh=window.innerHeight;
var preferRight=targetEl&&targetEl.getBoundingClientRect().left<vw/2;
var x=20;var y=vh/2-ttRect.height/2;
if(targetEl){
var r=targetEl.getBoundingClientRect();
if(preferRight){x=Math.min(r.right+16,vw-ttRect.width-20);}else{x=Math.max(20,r.left-ttRect.width-16);}
y=r.top+(r.height/2)-ttRect.height/2;
if(y<20)y=20;if(y+ttRect.height>vh-20)y=vh-ttRect.height-20;
}
tt.style.left=x+'px';tt.style.top=y+'px';
}
function sibTourNext(){
if(_sibTourState){_sibTourState.index++;if(_sibTourState.index>=_sibTourState.steps.length){if(_sibTourState.onEnd)_sibTourState.onEnd();sibTourEnd();return;}}
else{sibTourIndex++;if(sibTourIndex>=sibTourSteps.length){sibTourEnd();return;}}
sibTourUpdateStep();
}
function sibTourSkip(){
if(_sibTourState&&_sibTourState.onEnd)_sibTourState.onEnd();
sibTourEnd();
}
function sibTourEnd(){
sibTourUnbindScrollResize();
var ov=document.getElementById('sibTourOverlay');
var spotlight=document.getElementById('sibTourSpotlight');
var tooltip=document.getElementById('sibTourTooltip');
var actionsNorm=document.getElementById('sibTourTTActions');
var actionsCTA=document.getElementById('sibTourTTActionsCTA');
if(ov){ov.classList.remove('show');ov.setAttribute('aria-hidden','true');}
if(spotlight){spotlight.style.display='none';}
if(tooltip){tooltip.style.display='none';}
if(actionsNorm){actionsNorm.style.display='flex';}
if(actionsCTA){actionsCTA.style.display='none';}
if(!_sibTourState){
try{localStorage.setItem('vrt_onb','1');}catch(z){}
window._tourCompleto=true;
if(U&&U.uid){
db.collection('users').doc(U.uid).set({tourCompleto:true},{merge:true}).then(function(){
if(typeof toast==='function')toast(typeof t==='function'?t('toast_tour_concluido'):'Tour concluído! Você ganhou +50 XP 🎉','ok');
}).catch(function(e){console.error('tourCompleto save',e);});
}else{if(typeof toast==='function')toast(typeof t==='function'?t('toast_tour_concluido'):'Tour concluído! Você ganhou +50 XP ��','ok');}
}
_sibTourState=null;
}
document.addEventListener('DOMContentLoaded',function(){
var skip=document.getElementById('sibTourSkip');var next=document.getElementById('sibTourNext');
var ctaAgora=document.getElementById('sibTourCTAgora');var ctaDepois=document.getElementById('sibTourCTDepois');
if(skip)skip.addEventListener('click',sibTourSkip);
if(next)next.addEventListener('click',function(){sibTourNext();});
if(ctaAgora){ctaAgora.addEventListener('click',function(){if(_sibTourState&&_sibTourState.onEnd)_sibTourState.onEnd();sibTourEnd();if(typeof openInvestorProfilePopup==='function')openInvestorProfilePopup();if(typeof toast==='function')toast(typeof t==='function'?t('toast_questionario_perfil'):'Responda ao questionário para descobrir seu perfil.','ok');});}
if(ctaDepois){ctaDepois.addEventListener('click',function(){if(_sibTourState&&_sibTourState.onEnd)_sibTourState.onEnd();sibTourEnd();if(typeof toast==='function')toast(typeof t==='function'?t('toast_questionario_depois'):'Você pode fazer o questionário depois na aba Perfil.','ok');});}
});

var sibPPItems=[
{key:'conta',label:'Adicionar sua primeira conta bancária',action:function(){go('contas',null);}},
{key:'gasto',label:'Lançar seu primeiro gasto',action:function(){go('lanc',null);}},
{key:'meta',label:'Definir uma meta financeira',action:function(){go('metas',null);}},
{key:'orcamento',label:'Configurar um orçamento mensal',action:function(){go('orçamento',null);}},
{key:'ia',label:'Conversar com o Consultor IA',action:function(){go('ia',null);}}
];
var _sibPPPrev={conta:false,gasto:false,meta:false,orcamento:false,ia:false};
function renderPrimeirosPassos(){
if(!onboardingDone){var w=document.getElementById('sibPrimeirosPassos');if(w){w.style.display='none';}return;}
var wrap=document.getElementById('sibPrimeirosPassos');if(!wrap)return;
var completoEm=window._primeirosPassosCompletoEm;
if(completoEm){wrap.classList.add('sib-pp-hidden');wrap.style.display='none';return;}
var hasAcc=userAccs&&userAccs.length>0;
var hasGasto=entries&&entries.length>0;
var hasMeta=goals&&goals.length>0;
var hasOrc=budgets&&Object.keys(budgets).length>0;
var hasIa=!!window._primeirosPassosIa;
var doneCount=(hasAcc?1:0)+(hasGasto?1:0)+(hasMeta?1:0)+(hasOrc?1:0)+(hasIa?1:0);
var allDone=doneCount>=5;
var state={conta:hasAcc,gasto:hasGasto,meta:hasMeta,orcamento:hasOrc,ia:hasIa};
if(!window._sibPPFirstRenderDone){window._sibPPFirstRenderDone=true;for(var k in state)_sibPPPrev[k]=state[k];}
else{for(var k in state){if(state[k]&&!_sibPPPrev[k]){if(typeof toast==='function')toast(typeof t==='function'?t('toast_xp_20'):'+20 XP','ok');if(U&&U.uid&&k==='ia')db.collection('users').doc(U.uid).set({primeirosPassos:{ia:true}},{merge:true}).catch(function(){});}_sibPPPrev[k]=state[k];}}
if(allDone&&!window._primeirosPassosAllDoneShown){window._primeirosPassosAllDoneShown=true;if(typeof celebrateLucide==='function')celebrateLucide();if(typeof toast==='function')toast(typeof t==='function'?t('toast_config_completa_xp'):'Configuração completa! +100 XP bônus 🎉','ok');if(U&&U.uid){db.collection('users').doc(U.uid).set({primeirosPassosCompletoEm:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(function(){});}}
wrap.classList.remove('sib-pp-hidden');
wrap.style.display='block';
var listEl=document.getElementById('sibPPList');var doneMsg=document.getElementById('sibPPDoneMsg');
if(allDone){listEl.style.display='none';doneMsg.style.display='block';wrap.classList.add('sib-pp-done');document.getElementById('sibPPProgress').textContent='5 / 5';setTimeout(function(){wrap.classList.add('sib-pp-hidden');wrap.style.display='none';},2500);return;}
listEl.style.display='block';doneMsg.style.display='none';wrap.classList.remove('sib-pp-done');
document.getElementById('sibPPProgress').textContent=doneCount+' / 5';
listEl.innerHTML='';
sibPPItems.forEach(function(it){
var done=state[it.key];
var div=document.createElement('div');
div.className='sib-pp-item'+(done?' done':'');
div.innerHTML='<span class="sib-pp-item-check">'+(done?'✅':'□')+'</span><span class="sib-pp-item-text">'+it.label+'</span>';
if(!done){div.onclick=function(){it.action();};}
listEl.appendChild(div);
});
if(typeof window.refreshLucide==='function')lucide.createIcons();
}
function markPrimeiroPassoIa(){window._primeirosPassosIa=true;if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();}


function toggleTopActions(){
var d=document.getElementById('topActionsDropdown');
if(!d)return;
d.style.display=d.style.display==='block'?'none':'block';
}
function closeTopActions(){
var d=document.getElementById('topActionsDropdown');
if(d)d.style.display='none';
}
document.addEventListener('click',function(e){
if(!e.target.closest('.top-r'))closeTopActions();
});
function toggleTheme(){
var b=document.body;
var isLight=b.classList.toggle('light');
localStorage.setItem('vrt_theme',isLight?'light':'dark');
document.getElementById('themeBtn').innerHTML=isLight?'<i data-lucide="sun" style="width:20px;height:20px;stroke:currentColor;stroke-width:2"></i>':'<i data-lucide="moon" style="width:20px;height:20px;stroke:currentColor;stroke-width:2"></i>';
if(typeof lucide!=='undefined')lucide.createIcons();
Chart.defaults.color=isLight?'#475569':'#94a3b8';
Object.keys(charts).forEach(function(k){if(charts[k]&&charts[k].update)charts[k].update()});
}
function loadTheme(){
var t=localStorage.getItem('vrt_theme');
if(t==='light'){
document.body.classList.add('light');
document.getElementById('themeBtn').innerHTML='<i data-lucide="sun" style="width:20px;height:20px;stroke:currentColor;stroke-width:2"></i>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}
function toggleLangDropdown(){
var d=document.getElementById('langDropdown');
if(d){d.classList.toggle('open');}
}
function closeLangDropdown(){
var d=document.getElementById('langDropdown');
if(d)d.classList.remove('open');
}
function updateLangBtnFlag(){
var b=document.getElementById('langBtn');
if(b){
  var isEn=window.currentLang==='en';
  var lbl=isEn?'Language':'Idioma';
  var flag=isEn?'🇺🇸':'🇧🇷';
  b.setAttribute('title',lbl);b.setAttribute('aria-label',lbl);
  b.innerHTML='<span style="font-size:1.2rem;line-height:1;display:flex;align-items:center">'+flag+'</span>';
}
}
document.addEventListener('click',function(e){
if(!e.target.closest('.lang-wrap'))closeLangDropdown();
});

function celebrateLucide(){
var colors=['#4F8CFF','#7C5CFC','#EAB308','#22C55E','#06B6D4','#A855F7'];
var icons=['sparkles','star','trophy'];
var ov=document.createElement('div');
ov.className='sib-celebrate-ov';
var n=28;
for(var i=0;i<n;i++){
var p=document.createElement('div');
p.className='sib-celebrate-p';
var size=14+Math.floor(Math.random()*14);
p.style.left=Math.random()*100+'%';
p.style.width=size+'px';p.style.height=size+'px';
p.style.color=colors[Math.floor(Math.random()*colors.length)];
p.style.animationDelay=(Math.random()*0.4)+'s';
p.innerHTML='<i data-lucide="'+icons[Math.floor(Math.random()*icons.length)]+'" style="width:100%;height:100%"></i>';
ov.appendChild(p);
}
document.body.appendChild(ov);
if(typeof lucide!=='undefined')lucide.createIcons();
setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},2500);
}

function gerarPDF(){
try{
var jsPDF=window.jspdf.jsPDF;
var doc=new jsPDF();
var today=new Date().toLocaleDateString('pt-BR');
var mes=new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'});
var mesAno=mes.charAt(0).toUpperCase()+mes.slice(1);
var userName=(U&&U.name)||'Usuário';

/* Capa profissional (cores marca: #1A237E azul, #2E7D32 verde) */
doc.setFillColor(26,35,126);
doc.rect(0,0,210,50,'F');
doc.setTextColor(255,255,255);
doc.setFontSize(24);
doc.setFont(undefined,'bold');
doc.text('Sibanki',105,22,{align:'center'});
doc.setFontSize(12);
doc.setFont(undefined,'normal');
doc.text('Relatório Financeiro Mensal',105,32,{align:'center'});
doc.text(mesAno,105,40,{align:'center'});
doc.setFillColor(46,125,50);
doc.rect(0,50,210,25,'F');
doc.setTextColor(255,255,255);
doc.setFontSize(10);
doc.text(userName,14,60);
doc.text('Gerado em '+today,14,67);
doc.setTextColor(50,50,50);
doc.addPage();
doc.setFontSize(14);
doc.text('Resumo Financeiro',14,20);

var cm=new Date().getMonth();
var cr=entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm&&e.type==='receita'}).reduce(function(s,e){return s+e.value},0);
var cd=entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm&&e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);

doc.autoTable({
startY:28,
head:[['Indicador','Valor (R$)']],
body:[
['Receitas do Mes','R$ '+cr.toFixed(2)],
['Despesas do Mes','R$ '+cd.toFixed(2)],
['Saldo do Mes','R$ '+(cr-cd).toFixed(2)],
['Total Lançamentos',''+entries.length],
['Total Investimentos',''+investments.length],
['Total Metas',''+goals.length]
],
theme:'grid',
headStyles:{fillColor:[26,35,126]},
styles:{fontSize:10}
});

doc.setFontSize(14);
doc.text('Lançamentos do Mês',14,doc.lastAutoTable.finalY+15);

var mesEntries=entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm});
mesEntries.sort(function(a,b){return a.date.localeCompare(b.date)});

if(mesEntries.length>0){
var rows=mesEntries.map(function(e){
return [
new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR'),
e.type==='receita'?'Receita':'Despesa',
e.desc||'-',
e.category,
'R$ '+e.value.toFixed(2),
e.account||'-'
];
});
doc.autoTable({
startY:doc.lastAutoTable.finalY+20,
head:[['Data','Tipo','Descrição','Categoria','Valor','Conta']],
body:rows,
theme:'striped',
headStyles:{fillColor:[26,35,126]},
styles:{fontSize:8},
columnStyles:{4:{halign:'right'}}
});
}

var cats={};
mesEntries.filter(function(e){return e.type==='despesa'}).forEach(function(e){
cats[e.category]=(cats[e.category]||0)+e.value;
});
var catRows=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]}).map(function(c){
var pct=cd>0?((cats[c]/cd)*100).toFixed(1):'0';
return [c,'R$ '+cats[c].toFixed(2),pct+'%'];
});

if(catRows.length>0){
var newY=doc.lastAutoTable?doc.lastAutoTable.finalY+15:120;
if(newY>250){doc.addPage();newY=20}
doc.setFontSize(14);
doc.text('Despesas por Categoria',14,newY);
doc.autoTable({
startY:newY+5,
head:[['Categoria','Valor','%']],
body:catRows,
theme:'grid',
headStyles:{fillColor:[26,35,126]},
styles:{fontSize:9}
});
}

var totalPag=doc.internal.getNumberOfPages();
for(var p=1;p<=totalPag;p++){
doc.setPage(p);
doc.setFontSize(8);
doc.setTextColor(120,120,120);
doc.text('Sibanki',14,290);
doc.text('Página '+p+' de '+totalPag+' | Gerado em '+today,105,290,{align:'center'});
}

doc.save('Sibanki_PRO_Relatório_'+new Date().toISOString().split('T')[0]+'.pdf');
toast(typeof t==='function'?t('toast_relatorio_pdf_gerado'):'Relatório PDF gerado!','ok');
}catch(err){
console.error(err);
toast((typeof t==='function'?t('toast_erro_pdf'):'Erro ao gerar PDF: ')+err.message,'err');
}
}


function checkAlerts(){
var alerts=[];
var cm=new Date().getMonth();
var catTotals={};
entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm&&e.type==='despesa'}).forEach(function(e){
catTotals[e.category]=(catTotals[e.category]||0)+e.value;
});
for(var cat in budgets){
if(catTotals[cat]){
var pct=(catTotals[cat]/budgets[cat])*100;
if(pct>=100){
alerts.push({type:'danger',msg:'&#128680; '+cat+': Orçamento ESTOURADO! ('+pct.toFixed(0)+'%)'});
}else if(pct>=80){
alerts.push({type:'warn',msg:'&#9888;&#65039; '+cat+': '+pct.toFixed(0)+'% do orçamento usado'});
}
}
}
var totalDesp=entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm&&e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);
var totalRec=entries.filter(function(e){return new Date(e.date+'T12:00:00').getMonth()===cm&&e.type==='receita'}).reduce(function(s,e){return s+e.value},0);
if(totalRec>0&&totalDesp/totalRec>0.9){
alerts.push({type:'warn',msg:'&#128176; Você já gastou '+(totalDesp/totalRec*100).toFixed(0)+'% da receita do mês!'});
}
cards.forEach(function(c){
var diasFecha=getDiasParaFecha(c);
if(diasFecha<=3){
var bm=getBillingMonth(c,new Date().toISOString().split('T')[0]);
var fat=c.purchases.filter(function(p){return p.billingMonth===bm}).reduce(function(s,p){return s+p.value},0);
alerts.push({type:'danger',msg:'&#128179; Fatura do '+c.name+' fecha em '+diasFecha+' dia'+(diasFecha>1?'s':'')+'! Total: R$ '+fat.toFixed(2)});
}else if(diasFecha<=7){
alerts.push({type:'warn',msg:'&#128179; Fatura do '+c.name+' fecha em '+diasFecha+' dias'});
}
var bm2=getBillingMonth(c,new Date().toISOString().split('T')[0]);
var fat2=c.purchases.filter(function(p){return p.billingMonth===bm2}).reduce(function(s,p){return s+p.value},0);
if(fat2/c.limit>=0.9){
alerts.push({type:'danger',msg:'&#128680; '+c.name+': '+Math.round(fat2/c.limit*100)+'% do limite usado!'});
}
});
var ab=document.getElementById('alertBar');
if(!ab)return;
if(!alerts.length){ab.innerHTML='';ab.style.display='none';return}
ab.style.display='block';
ab.innerHTML=alerts.map(function(a){
var bg=a.type==='danger'?'rgba(239,68,68,.15)':'rgba(234,179,8,.15)';
var brd=a.type==='danger'?'rgba(79,140,255,.3)':'rgba(234,179,8,.3)';
return '<div style="padding:10px 14px;background:'+bg+';border:1px solid '+brd+';border-radius:10px;margin-bottom:6px;font-size:.88em">'+a.msg+'</div>';
}).join('');
}


function showLanding(){
// Landing unificada em /index.html - redireciona para a home
window.location.href='/';
}
function showAuth(){
document.getElementById('authBg').classList.remove('hidden');
showLog();
}


function clearFilters(){
var ids=['filM','filT','filA','filS','filDe','filAte','filCat','filMin','filMax'];
ids.forEach(function(id){
var el=document.getElementById(id);
if(!el)return;
if(el.tagName==='SELECT')el.value='all';
else el.value='';
});
rE();
}
function popFilCat(){
var el=document.getElementById('filCat');
if(!el)return;
var opts='<option value="all">Todas</option>';
opts+=userCats.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('');
el.innerHTML=opts;
}


function showTerms(type){
var title=type==='terms'?'Termos de Uso':'Pol\u00edtica de Privacidade';
var body='';
if(type==='terms'){
body='<p><b>1. Aceita\u00e7\u00e3o dos Termos</b><br>Ao acessar e utilizar o aplicativo Sibanki, voc\u00ea concorda integralmente com estes Termos de Uso. Caso n\u00e3o concorde com algum dos termos aqui descritos, recomendamos que n\u00e3o utilize o aplicativo.</p>'+
'<p><b>2. Descri\u00e7\u00e3o do Servi\u00e7o</b><br>O Sibanki \u00e9 um aplicativo de gest\u00e3o financeira pessoal e familiar que permite o registro de receitas, despesas, investimentos, metas, or\u00e7amentos e demais funcionalidades financeiras. Os dados s\u00e3o armazenados de forma segura na nuvem atrav\u00e9s do Firebase (Google Cloud).</p>'+
'<p><b>3. Conta do Usu\u00e1rio</b><br>Para utilizar o Sibanki, \u00e9 necess\u00e1rio criar uma conta atrav\u00e9s de e-mail/senha ou login com Google. Voc\u00ea \u00e9 inteiramente respons\u00e1vel por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.</p>'+
'<p><b>4. Funcionalidade Família Sibanki</b><br>O Sibanki oferece a funcionalidade de vincular duas contas para gest\u00e3o financeira conjunta. Ao vincular contas, ambos os usu\u00e1rios concordam em compartilhar seus dados financeiros entre si. A desvincula\u00e7\u00e3o pode ser feita a qualquer momento por qualquer uma das partes.</p>'+
'<p><b>5. Prote\u00e7\u00e3o dos Dados</b><br>Seus dados financeiros s\u00e3o pessoais e tratados com total sigilo. N\u00e3o vendemos, compartilhamos ou cedemos suas informa\u00e7\u00f5es a terceiros em nenhuma hip\u00f3tese, exceto quando exigido por lei.</p>'+
'<p><b>6. Disponibilidade do Servi\u00e7o</b><br>O Sibanki \u00e9 fornecido \u201ccomo est\u00e1\u201d, sem garantias expl\u00edcitas ou impl\u00edcitas de disponibilidade ininterrupta. Nos esfor\u00e7amos para manter o servi\u00e7o est\u00e1vel, mas eventuais manuten\u00e7\u00f5es ou falhas podem ocorrer.</p>'+
'<p><b>7. Propriedade Intelectual</b><br>Todo o conte\u00fado do aplicativo, incluindo design, c\u00f3digo, textos, logotipos e marca Sibanki, \u00e9 de propriedade exclusiva dos desenvolvedores e protegido pela legisla\u00e7\u00e3o de direitos autorais.</p>'+
'<p><b>8. Limita\u00e7\u00e3o de Responsabilidade</b><br>O Sibanki n\u00e3o se responsabiliza por decis\u00f5es financeiras tomadas com base nas informa\u00e7\u00f5es exibidas no aplicativo. O app \u00e9 uma ferramenta de organiza\u00e7\u00e3o e n\u00e3o substitui consultoria financeira profissional.</p>'+
'<p><b>9. Modifica\u00e7\u00f5es nos Termos</b><br>Reservamo-nos o direito de alterar estes Termos de Uso a qualquer momento. As altera\u00e7\u00f5es entram em vigor imediatamente ap\u00f3s a pública\u00e7\u00e3o. O uso continuado do aplicativo ap\u00f3s altera\u00e7\u00f5es constitui aceita\u00e7\u00e3o dos novos termos.</p>'+
'<p><b>10. Legisla\u00e7\u00e3o Aplic\u00e1vel</b><br>Estes Termos s\u00e3o regidos pela legisla\u00e7\u00e3o brasileira, em conformidade com o C\u00f3digo de Defesa do Consumidor (CDC) e a Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD \u2014 Lei n\u00ba 13.709/2018).</p>'+
'<p style="color:var(--t3);font-size:.82em;margin-top:16px"><em>\u00daltima atualiza\u00e7\u00e3o: Fevereiro de 2026</em></p>';
}else{
body='<p><b>1. Dados Coletados</b><br>O Sibanki coleta apenas as informa\u00e7\u00f5es estritamente necess\u00e1rias para o funcionamento do servi\u00e7o: endere\u00e7o de e-mail, nome (via Google ou cadastro manual) e os dados financeiros que voc\u00ea cadastra voluntariamente no aplicativo.</p>'+
'<p><b>2. Finalidade do Uso dos Dados</b><br>Seus dados s\u00e3o utilizados exclusivamente para: (a) autentica\u00e7\u00e3o e identifica\u00e7\u00e3o do usu\u00e1rio; (b) armazenamento e exibi\u00e7\u00e3o dos seus registros financeiros; (c) funcionamento da funcionalidade Família Sibanki; (d) gera\u00e7\u00e3o de relat\u00f3rios e an\u00e1lises financeiras dentro do pr\u00f3prio aplicativo.</p>'+
'<p><b>3. Armazenamento e Seguran\u00e7a</b><br>Todos os dados s\u00e3o armazenados no Firebase (Google Cloud Platform), com criptografia em tr\u00e2nsito (TLS/SSL) e em repouso. Utilizamos as melhores pr\u00e1ticas de seguran\u00e7a recomendadas pelo Google para garantir a integridade dos seus dados.</p>'+
'<p><b>4. Compartilhamento de Dados</b><br>N\u00e3o vendemos, alugamos ou compartilhamos seus dados pessoais ou financeiros com terceiros, empresas de publicidade ou parceiros comerciais. A \u00fanica exce\u00e7\u00e3o \u00e9 a funcionalidade Família Sibanki, onde voc\u00ea consente explicitamente o compartilhamento com seu parceiro(a) vinculado(a).</p>'+
'<p><b>5. Cookies e Armazenamento Local</b><br>O Sibanki utiliza apenas o localStorage do navegador para salvar prefer\u00eancias de tema (claro/escuro) e status do tour inicial. N\u00e3o utilizamos cookies de rastreamento, an\u00e1lise comportamental ou publicidade.</p>'+
'<p><b>6. Seus Direitos (LGPD)</b><br>Em conformidade com a Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD), voc\u00ea tem direito a: (a) acessar todos os seus dados; (b) corrigir dados incompletos ou desatualizados; (c) solicitar a exclus\u00e3o total dos seus dados; (d) revogar o consentimento a qualquer momento; (e) exportar seus dados em formato JSON ou CSV.</p>'+
'<p><b>7. Exclus\u00e3o de Dados</b><br>Voc\u00ea pode excluir sua conta e todos os dados associados a qualquer momento atrav\u00e9s das configura\u00e7\u00f5es do aplicativo. Ap\u00f3s a exclus\u00e3o, todos os dados s\u00e3o removidos permanentemente dos nossos servidores em at\u00e9 30 dias.</p>'+
'<p><b>8. Dados de Menores</b><br>O Sibanki n\u00e3o \u00e9 direcionado a menores de 18 anos. N\u00e3o coletamos intencionalmente dados de menores de idade.</p>'+
'<p><b>9. Altera\u00e7\u00f5es nesta Pol\u00edtica</b><br>Esta Pol\u00edtica de Privacidade pode ser atualizada periodicamente. Notificaremos sobre mudan\u00e7as significativas atrav\u00e9s do pr\u00f3prio aplicativo.</p>'+
'<p><b>10. Contato</b><br>Para d\u00favidas, solicita\u00e7\u00f5es ou exerc\u00edcio dos seus direitos relacionados \u00e0 privacidade, entre em contato pelo e-mail de suporte dispon\u00edvel nas configura\u00e7\u00f5es do aplicativo.</p>'+
'<p style="color:var(--t3);font-size:.82em;margin-top:16px"><em>\u00daltima atualiza\u00e7\u00e3o: Fevereiro de 2026</em></p>';
}
document.getElementById('termsTitle').textContent=title;
document.getElementById('termsBody').innerHTML=body;
document.getElementById('termsModal').style.display='flex';
}


var iaMessages=[];

function getFinancialContext(){
try{
var _e=(typeof entries!=='undefined'&&entries)?entries:[];
var _g=(typeof goals!=='undefined'&&goals)?goals:[];
var _i=(typeof investments!=='undefined'&&investments)?investments:[];
var _b=(typeof budgets!=='undefined'&&budgets)?budgets:{};
var _ua=(typeof userAccs!=='undefined'&&userAccs)?userAccs:[];
var _ab=(typeof accountBalances!=='undefined'&&accountBalances)?accountBalances:{};
var _rc=(typeof recurrents!=='undefined'&&recurrents)?recurrents:[];

var cm=new Date().getMonth();
var cy=new Date().getFullYear();
var mesEntries=_e.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy});
var recM=mesEntries.filter(function(e){return e.type==='receita'}).reduce(function(s,e){return s+e.value},0);
var despM=mesEntries.filter(function(e){return e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);
var catTotals={};
mesEntries.filter(function(e){return e.type==='despesa'}).forEach(function(e){catTotals[e.category]=(catTotals[e.category]||0)+e.value});
var topCats=Object.keys(catTotals).sort(function(a,b){return catTotals[b]-catTotals[a]}).slice(0,5);
var topCatsStr=topCats.map(function(c){return c+': R$'+catTotals[c].toFixed(2)}).join(', ');

var totalRec=_e.filter(function(e){return e.type==='receita'}).reduce(function(s,e){return s+e.value},0);
var totalDesp=_e.filter(function(e){return e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);

var metasInfo=_g.map(function(g){var n=g.name||g.nome,t=parseFloat(g.target)||parseFloat(g.alvo)||0,c=parseFloat(g.current)||parseFloat(g.atual)||0;return n+': R$'+c.toFixed(2)+'/R$'+t.toFixed(2)+' ('+(t>0?Math.round(c/t*100):0)+'%)';}).join('; ');
var invInfo=_i.map(function(i){var nome=i.nome||i.name||'?';var val=i.atual||i.valor||i.value||0;var tipo=i.tipo||i.type||'?';return nome+': R$'+val.toFixed(2)+' ('+tipo+')';}).join('; ');
var invInfoEnriched='';
if(_i.length>0){var ti=0,ta=0,byTipo={};_i.forEach(function(i){var v=typeof invCostBasis==='function'?invCostBasis(i):(i.valor||i.value||0),a=i.atual||i.valor||i.value||0;ti+=v;ta+=a;var t=i.tipo||i.type||'Outros';byTipo[t]=(byTipo[t]||0)+a;});var ret=ta-ti,pct=ti>0?((ret/ti)*100):0;var allocStr=Object.keys(byTipo).map(function(t){return t+': '+((byTipo[t]/ta)*100).toFixed(0)+'%';}).join(', ');var proventos=[];try{proventos=JSON.parse(localStorage.getItem('vrt_proventos')||'[]');}catch(e){}var totalProv=proventos.reduce(function(s,p){return s+(p.valor||0);},0);invInfoEnriched='Patrimônio: R$'+ta.toFixed(2)+' | Investido: R$'+ti.toFixed(2)+' | Resultado: '+(ret>=0?'+':'')+'R$'+ret.toFixed(2)+' ('+(pct>=0?'+':'')+pct.toFixed(1)+'%) | Alocação: '+allocStr+(totalProv>0?' | Proventos 12m: R$'+totalProv.toFixed(2):'')+' | Ativos: '+invInfo;}

var orcInfo=Object.keys(_b).map(function(c){
var gasto=catTotals[c]||0;
var budget=_b[c]||0;
return c+': R$'+gasto.toFixed(2)+'/R$'+budget.toFixed(2)+' ('+(budget>0?Math.round(gasto/budget*100):0)+'%)';
}).join('; ');

var accBals={};
_ua.forEach(function(a){
var init=_ab[a]||0;
var rec=_e.filter(function(e){return e.account===a&&e.type==='receita'}).reduce(function(s,e){return s+e.value},0);
var desp=_e.filter(function(e){return e.account===a&&e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);
accBals[a]=init+rec-desp;
});
var accStr=Object.keys(accBals).map(function(a){return a+': R$'+accBals[a].toFixed(2)}).join(', ');

var months={};
_e.forEach(function(e){
var key=e.date.substring(0,7);
if(!months[key])months[key]={rec:0,desp:0};
if(e.type==='receita')months[key].rec+=e.value;
else months[key].desp+=e.value;
});
var monthTrend=Object.keys(months).sort().slice(-6).map(function(k){
return k+' (Rec:R$'+months[k].rec.toFixed(0)+' Desp:R$'+months[k].desp.toFixed(0)+')';
}).join('; ');

var recurrInfo='';
if(_rc.length>0){
recurrInfo=_rc.map(function(r){return (r.desc||'?')+': R$'+(r.value||0).toFixed(2)+' ('+(r.type||'?')+', dia '+(r.day||'?')+')'}).join('; ');
}

var _cards=(typeof cards!=='undefined'&&cards)?cards:[];
var cartoesInfo=_cards.filter(function(c){return c.active!==false;}).map(function(c){return (c.name||'?')+': limite R$'+(parseFloat(c.limit)||0).toFixed(2);}).join('; ')||'Nenhum cartão';

return{
receita_mes:recM,despesa_mes:despM,saldo_mes:recM-despM,
receita_total:totalRec,despesa_total:totalDesp,saldo_total:totalRec-totalDesp,
top_categorias:topCatsStr||'Sem dados',cat_totals:catTotals,
metas:metasInfo||'Nenhuma meta cadastrada',
investimentos:invInfo||'Nenhum investimento',
investimentos_enriquecido:invInfoEnriched||invInfo||'Nenhum investimento',
orçamentos:orcInfo||'Nenhum orçamento definido',
contas:accStr||'Nenhuma conta',
cartoes:cartoesInfo,
tendencia_meses:monthTrend||'Sem histórico',
recorrentes:recurrInfo||'Nenhum lançamento recorrente',
total_lancamentos:_e.length,
pct_gasto:recM>0?Math.round(despM/recM*100):0
};
}catch(err){
console.error('getFinancialContext error:',err);
return{receita_mes:0,despesa_mes:0,saldo_mes:0,receita_total:0,despesa_total:0,saldo_total:0,top_categorias:'Erro ao carregar',cat_totals:{},metas:'',investimentos:'',investimentos_enriquecido:'',orçamentos:'',contas:'',cartoes:'',tendencia_meses:'',recorrentes:'',total_lancamentos:0,pct_gasto:0};
}
}

function buildPrompt(tipo,ctx){
var base='Você e o Sibanki IA, um consultor financeiro pessoal inteligente e amigavel. Análise os dados financeiros do usuario abaixo e de conselhos praticos, especificos e acionaveis. Use emojis para tornar a resposta mais visual. Responda em português brasileiro.\n\n';
if(tipo==='familia'&&ctx.membro1_nome){
base+='DADOS DA FAMÍLIA (casal):\n';
base+='--- '+ctx.membro1_nome+' ---\n';
base+='- Receita do mês: R$'+(ctx.membro1_receita||0).toFixed(2)+'\n';
base+='- Despesa do mês: R$'+(ctx.membro1_despesa||0).toFixed(2)+'\n';
base+='- Metas individuais: '+ctx.membro1_metas+'\n';
base+='--- '+ctx.membro2_nome+' ---\n';
base+='- Receita do mês: R$'+(ctx.membro2_receita||0).toFixed(2)+'\n';
base+='- Despesa do mês: R$'+(ctx.membro2_despesa||0).toFixed(2)+'\n';
base+='- Metas individuais: '+ctx.membro2_metas+'\n';
base+='--- JUNTOS ---\n';
base+='- Receita total: R$'+(ctx.receita_mes||0).toFixed(2)+'\n';
base+='- Despesa total: R$'+(ctx.despesa_mes||0).toFixed(2)+'\n';
base+='- Saldo do casal: R$'+(ctx.saldo_mes||0).toFixed(2)+'\n';
base+='- Metas da família: '+ctx.metas_familia+'\n';
base+='- Total lançamentos: '+ctx.total_lancamentos+'\n\n';
}else{
base+='DADOS DO USUARIO:\n';
base+='- Receita do mês: R$'+ctx.receita_mes.toFixed(2)+'\n';
base+='- Despesa do mês: R$'+ctx.despesa_mes.toFixed(2)+'\n';
base+='- Saldo do mês: R$'+ctx.saldo_mes.toFixed(2)+'\n';
base+='- % da receita gasta: '+ctx.pct_gasto+'%\n';
base+='- Top categorias de gasto: '+ctx.top_categorias+'\n';
base+='- Contas: '+ctx.contas+'\n';
base+='- Metas: '+ctx.metas+'\n';
base+='- Investimentos: '+(tipo==='investimentos'&&ctx.investimentos_enriquecido?ctx.investimentos_enriquecido:ctx.investimentos)+'\n';
base+='- Orçamentos: '+ctx.orçamentos+'\n';
base+='- Tendência (últimos meses): '+ctx.tendencia_meses+'\n';
base+='- Recorrentes: '+ctx.recorrentes+'\n';
base+='- Total de lançamentos: '+(ctx.total_lançamentos||ctx.total_lancamentos||0)+'\n\n';
}

var prompts={
geral:'Faca uma análise geral completa da saúde financeira do usuario. Identifique pontos fortes, pontos fracos, riscos e oportunidades. De uma nota de 0 a 10 para a saúde financeira.',
economia:'Análise os gastos do usuario e sugira 5-7 formas praticas e especificas de economizar dinheiro baseado nas categorias onde mais gasta. Calcule quanto poderia economizar.',
hábitos:'Identifique os hábitos financeiros do usuario (bons e ruins) baseado nos padroes de gastos. Sugira mudancas de comportamento especificas que podem melhorar a vida financeira.',
metas:'Análise as metas financeiras do usuario e sugira estrategias para alcanca-las mais rapido. Se não tem metas, sugira metas adequadas ao perfil.',
investimentos:'Analise a carteira de investimentos do usuario (patrimônio, alocação, rentabilidade, proventos). Identifique: (1) pontos fortes e fracos da alocação; (2) se a diversificação está adequada; (3) sugestões de rebalanceamento se necessário; (4) dicas para otimizar rendimentos e proventos. Considere reserva de emergência (6 meses de gastos), metas e perfil de risco. Seja específico com os dados fornecidos.',
planejamento:'Crie um planejamento financeiro detalhado para o próximo mes. Inclua: quanto gastar em cada categoria, quanto investir, quanto guardar para metas.',
familia:'Você está analisando uma FAMÍLIA/CASAL. Com base nos dados de ambos os membros: (1) Como cada um pode ajudar o outro financeiramente? (2) Sugira metas que podem desenvolver JUNTOS (ex: reserva, viagem, entrada). (3) Como devem discutir e ajustar gastos para conquistar objetivos comuns e individuais? (4) Dê dicas práticas de comunicação financeira no casal. Seja acolhedor e prático.'
};

return base+'INSTRUÇÃO: '+(prompts[tipo]||prompts.geral)+'\n\nResponda de forma estruturada com títulos em negrito, use listas e emojis. Seja especifico com valores em R$.';
}

function iaAnalyze(tipo){
try{
console.log('iaAnalyze called with:',tipo);
if(tipo==='familia'&&typeof coupleData!=='undefined'&&coupleData&&coupleId){
getFamilyFinancialContext(function(ctx){
if(!ctx){addIAMsg('ai','Não foi possível carregar os dados da família.');return;}
var prompt=buildPrompt('familia',ctx);
callIA(prompt,'familia');
});
return;
}
var ctx=getFinancialContext();
console.log('ctx:',ctx);
var hasInvestimentos=ctx.investimentos&&ctx.investimentos!=='Nenhum investimento';
if(ctx.total_lancamentos===0&&(ctx.total_lançamentos===undefined||ctx.total_lançamentos===0)&&!hasInvestimentos){
addIAMsg('ai','&#129302; <b>Ainda nao tenho dados suficientes!</b><br><br>Para eu analisar seus hábitos financeiros, preciso que você cadastre alguns lançamentos ou investimentos primeiro.<br><br>Vá até <b>Lançar</b> (receitas/despesas) ou <b>Investimentos</b> (carteira). Quanto mais dados eu tiver, melhores serao minhas analises! &#128170;');
return;
}
var prompt=buildPrompt(tipo,ctx);
callIA(prompt,tipo);
}catch(err){
console.error('iaAnalyze error:',err);
addIAMsg('ai','&#9888;&#65039; Erro ao analisar: '+err.message+'<br>Tente novamente ou verifique se tem lançamentos cadastrados.');
}
}
function getFamilyFinancialContext(cb){
if(!coupleData||!U||typeof cb!=='function'){if(cb)cb(null);return;}
var partnerUid=coupleData.members.find(function(m){return m!==U.uid});
if(!partnerUid){cb(getFinancialContext());return;}
var myCtx=getFinancialContext();
var myName=coupleData.names[U.uid]||'Membro 1';
var partnerName=coupleData.names[partnerUid]||'Parceiro(a)';
var ctx={...myCtx};
ctx.membro1_nome=myName;
ctx.membro2_nome=partnerName;
ctx.membro1_receita=myCtx.receita_mes;
ctx.membro1_despesa=myCtx.despesa_mes;
ctx.membro1_metas=myCtx.metas||'Nenhuma';
ctx.membro2_receita=0;
ctx.membro2_despesa=0;
ctx.membro2_metas='';
ctx.metas_familia=(coupleData.goals||[]).map(function(g){return g.name+': R$'+(g.current||0)+'/R$'+g.target;}).join('; ')||'Nenhuma';
db.collection('users').doc(partnerUid).get().then(function(pDoc){
if(!pDoc.exists){ctx.membro2_metas='Sem dados';cb(ctx);return;}
var pd=pDoc.data();
var pe=pd.entries||[];
var pg=pd.goals||[];
var now=new Date(),curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var rec2=0,desp2=0;
pe.forEach(function(e){if(e.date&&e.date.startsWith(curM)){if(e.type==='receita')rec2+=e.value;else desp2+=e.value;}});
var metas2=pg.map(function(g){var n=g.nome||g.name;var a=parseFloat(g.alvo||g.target)||0;var c=parseFloat(g.atual||g.current)||0;return n+': R$'+c.toFixed(2)+'/R$'+a.toFixed(2);}).join('; ')||'Nenhuma';
ctx.membro2_receita=rec2;
ctx.membro2_despesa=desp2;
ctx.membro2_metas=metas2;
ctx.receita_mes=myCtx.receita_mes+rec2;
ctx.despesa_mes=myCtx.despesa_mes+desp2;
ctx.saldo_mes=ctx.receita_mes-ctx.despesa_mes;
ctx.total_lancamentos=(typeof entries!=='undefined'?entries.length:0)+pe.length;
cb(ctx);
}).catch(function(){cb(ctx);});
}

function iaChat(){
try{
var q=document.getElementById('iaQ').value.trim();
if(!q){toast(typeof t==='function'?t('toast_digite_pergunta'):'Digite uma pergunta','err');return;}
addIAMsg('user',q);
document.getElementById('iaQ').value='';
callIA(q,'chat');
}catch(err){
console.error('iaChat error:',err);
addIAMsg('ai','&#9888;&#65039; Erro: '+err.message);
}
}

function callIA(prompt,tipo){
try{
document.getElementById('iaLoading').style.display='block';

// Obter token do Firebase Auth
var user=firebase.auth().currentUser;
if(!user){
addIAMsg('ai','&#9888;&#65039; Faça login para usar o consultor IA.');
document.getElementById('iaLoading').style.display='none';
return;
}

var ctx=getFinancialContext();
var contextStr='Receita mensal: R$'+(ctx.receita_mes||0).toFixed(2)+'\n';
contextStr+='Despesa mensal: R$'+(ctx.despesa_mes||0).toFixed(2)+'\n';
contextStr+='Saldo: R$'+((ctx.receita_mes||0)-(ctx.despesa_mes||0)).toFixed(2)+'\n';
contextStr+='% gasto: '+(ctx.pct_gasto||0).toFixed(1)+'%\n';
if(ctx.investimentos)contextStr+='Investimentos: '+(ctx.investimentos_enriquecido||ctx.investimentos)+'\n';
if(ctx.orçamentos)contextStr+='Orçamentos: '+ctx.orçamentos+'\n';
if(ctx.metas)contextStr+='Metas: '+ctx.metas+'\n';
if(ctx.contas)contextStr+='Contas: '+ctx.contas+'\n';
if(ctx.cartoes)contextStr+='Cartões de crédito: '+ctx.cartoes+'\n';
if(ctx.tendencia_meses)contextStr+='Tendência: '+ctx.tendencia_meses+'\n';
if(ctx.recorrentes)contextStr+='Recorrentes: '+ctx.recorrentes+'\n';
if(ctx.cat_totals){
var cats='';
for(var c in ctx.cat_totals){cats+=c+': R$'+ctx.cat_totals[c].toFixed(2)+', ';}
if(cats)contextStr+='Gastos por categoria: '+cats+'\n';
}
try{
var callIAFn=firebase.functions().httpsCallable('chatApi');
callIAFn({message:prompt,context:contextStr}).then(function(res){
var data=res&&res.data?res.data:{};
document.getElementById('iaLoading').style.display='none';
var reply=data.reply||'Sem resposta';
reply=reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
addIAMsg('ai',reply);
}).catch(function(err){
if(err.code==='resource-exhausted'||(err.message&&err.message.indexOf('Limite')!==-1)){document.getElementById('iaLoading').style.display='none';addIAMsg('ai','&#9888;&#65039; <b>Limite atingido</b>. Tente mais tarde.');return;}
console.error('callIA error:',err);
document.getElementById('iaLoading').style.display='none';
localIAResponse(tipo);
});
}catch(e){
console.error('callIA error:',e);
document.getElementById('iaLoading').style.display='none';
localIAResponse(tipo);
}
}catch(err){
console.error('callIA error:',err);
document.getElementById('iaLoading').style.display='none';
addIAMsg('ai','&#9888;&#65039; Erro: '+err.message);
}
}

function localIAResponse(tipo){
document.getElementById('iaLoading').style.display='none';
var ctx=getFinancialContext();
var msg='';
var pct=ctx.pct_gasto||0;

if(tipo==='geral'){
var nota=10;
if(pct>100)nota-=4;else if(pct>80)nota-=2;else if(pct>60)nota-=1;
nota=Math.max(1,Math.min(10,nota));
var emoji=nota>=8?'\u{1F7E2}':nota>=5?'\u{1F7E1}':'\u{1F534}';
msg='<h4>\u{1F4CA} Analise Geral do Mes</h4>';
msg+='<b>Nota de saude financeira: '+emoji+' '+nota+'/10</b><br><br>';
msg+='\u{1F4B0} <b>Receitas:</b> R$ '+ctx.receita_mes.toFixed(2)+'<br>';
msg+='\u{1F4B8} <b>Despesas:</b> R$ '+ctx.despesa_mes.toFixed(2)+'<br>';
msg+='\u{1F4C8} <b>Saldo:</b> R$ '+ctx.saldo_mes.toFixed(2)+'<br>';
msg+='\u{1F4CA} <b>Comprometimento:</b> '+pct+'% da receita<br><br>';
if(ctx.top_categorias)msg+='\u{1F3F7} <b>Principais gastos:</b> '+ctx.top_categorias+'<br><br>';
if(ctx.saldo_mes>0)msg+='\u2705 Parabéns! Saldo positivo este mês. Continue assim!';
else msg+='\u26A0\uFE0F Atenção! Despesas superaram receitas. Revise seus gastos.';
msg+='<br><br><small>\u{1F4A1} Adicione sua chave Gemini gratuita em Configuracoes para analises com IA generativa!</small>';

}else if(tipo==='economia'){
msg='<h4>\u{1F4B0} Dicas de Economia</h4>';
msg+='\u{1F4CA} Você gasta <b>'+pct+'%</b> da sua receita.<br><br>';
if(pct>90)msg+='\u{1F534} <b>Nível crítico!</b> Reduza para abaixo de 80%.<br><br>';
else if(pct>70)msg+='\u{1F7E1} <b>Atenção!</b> Tente manter abaixo de 70%.<br><br>';
else msg+='\u{1F7E2} <b>Ótimo!</b> Você está economizando bem!<br><br>';
msg+='\u{1F4A1} <b>Sugestoes praticas:</b><br>';
msg+='\u2022 Revise assinaturas e servicos recorrentes<br>';
msg+='\u2022 Compare precos antes de compras grandes<br>';
msg+='\u2022 Estabeleca um orçamento mensal por categoria<br>';
msg+='\u2022 Reserve pelo menos 20% da receita para poupança<br>';
msg+='\u2022 Evite compras por impulso - espere 24h<br>';

}else if(tipo==='hábitos'){
msg='<h4>\u{1F9E0} Habitos Financeiros</h4>';
msg+='\u{1F4DD} <b>Total de lançamentos:</b> '+(ctx.total_lancamentos||0)+'<br>';
if(ctx.top_categorias)msg+='\u{1F3F7} <b>Categorias mais usadas:</b> '+ctx.top_categorias+'<br>';
msg+='<br>\u{1F4A1} <b>Dicas de bons hábitos:</b><br>';
msg+='\u2022 Registre TODOS os gastos, mesmo os pequenos<br>';
msg+='\u2022 Revise seus lançamentos semanalmente<br>';
msg+='\u2022 Defina metas claras e acompanhe o progresso<br>';
msg+='\u2022 Use a regra 50/30/20 (necessidades/desejos/poupança)<br>';
msg+='\u2022 Automatize pagamentos fixos para nao esquecer<br>';

}else if(tipo==='metas'){
msg='<h4>\u{1F3AF} Analise de Metas</h4>';
if(ctx.metas&&ctx.metas!=='Nenhuma meta cadastrada')msg+='\u{1F4CB} <b>Suas metas:</b> '+ctx.metas+'<br><br>';
else msg+='\u26A0\uFE0F Você ainda nao cadastrou metas. Va em <b>Metas</b> para criar!<br><br>';
msg+='\u{1F4A1} <b>Como alcancar suas metas:</b><br>';
msg+='\u2022 Divida metas grandes em etapas menores<br>';
msg+='\u2022 Automatize depositos mensais<br>';
msg+='\u2022 Revise e ajuste metas trimestralmente<br>';
msg+='\u2022 Comemore pequenas conquistas no caminho<br>';

}else if(tipo==='investimentos'){
msg='<h4>\u{1F4C8} Consultoria de Investimentos</h4>';
if(ctx.investimentos&&ctx.investimentos!=='Nenhum investimento'){
msg+='\u{1F4BC} <b>Sua carteira:</b><br>';
msg+='<span style="font-size:.9em;color:var(--t2)">'+(ctx.investimentos_enriquecido||ctx.investimentos).replace(/\|/g,'<br>').replace(/;/g,'; ')+'</span><br><br>';
msg+='\u{1F4A1} <b>Análise e dicas:</b><br>';
}else msg+='\u26A0\uFE0F Você ainda nao registrou investimentos.<br><br>';
msg+='\u2022 Monte primeiro sua reserva de emergência (6 meses de gastos)<br>';
msg+='\u2022 Diversifique entre renda fixa e variavel<br>';
msg+='\u2022 Considere seu perfil de risco<br>';
msg+='\u2022 Invista regularmente com aportes mensais<br>';
var reserva=(ctx.despesa_mes||0)*6;
msg+='<br>\u{1F3E6} <b>Reserva ideal (6 meses):</b> R$ '+reserva.toFixed(2);

}else if(tipo==='planejamento'){
msg='<h4>\u{1F4C5} Planejamento Mensal</h4>';
msg+='\u{1F4B0} <b>Receita:</b> R$ '+ctx.receita_mes.toFixed(2)+'<br>';
msg+='\u{1F4B8} <b>Despesa:</b> R$ '+ctx.despesa_mes.toFixed(2)+'<br><br>';
msg+='\u{1F4CB} <b>Sugestao 50/30/20:</b><br>';
var r=ctx.receita_mes;
msg+='\u2022 \u{1F3E0} Necessidades (50%): R$ '+(r*0.5).toFixed(2)+'<br>';
msg+='\u2022 \u{1F389} Desejos (30%): R$ '+(r*0.3).toFixed(2)+'<br>';
msg+='\u2022 \u{1F4B0} Poupança (20%): R$ '+(r*0.2).toFixed(2)+'<br>';
msg+='<br>\u{1F4CA} <b>Comprometimento atual:</b> '+pct+'%<br>';
if(pct<=50)msg+='\u{1F7E2} Excelente! Dentro do ideal.';
else if(pct<=80)msg+='\u{1F7E1} Razoavel. Tente otimizar gastos variaveis.';
else msg+='\u{1F534} Acima do ideal. Priorize reduzir gastos não essenciais.';

}else if(tipo==='mercado'){
msg='<h4>\u{1F680} Analise de Mercado</h4>';
msg+='Para dados em tempo real da B3, acesse a aba <b>B3</b> e pesquise ativos.<br><br>';
var hasToken=localStorage.getItem('vrt_b3token');
if(hasToken)msg+='\u2705 Módulo de investimentos ativo! Use a aba B3.';
else msg+='\u26A0\uFE0F Use a aba B3 para análise de ações, FIIs e ETFs em tempo real!';
msg+='<br><br>\u{1F4A1} <b>Dicas:</b><br>';
msg+='\u2022 Diversifique seus investimentos<br>';
msg+='\u2022 Acompanhe indicadores fundamentalistas<br>';
msg+='\u2022 Nao invista baseado apenas em dicas - estude!';

}else{
msg='\u{1F916} <b>Sibanki IA</b><br><br>';
msg+='\u{1F4CA} Receita: R$ '+ctx.receita_mes.toFixed(2)+' | Despesa: R$ '+ctx.despesa_mes.toFixed(2)+' | Saldo: R$ '+ctx.saldo_mes.toFixed(2)+'<br><br>';
msg+='Para respostas personalizadas, adicione sua chave Gemini gratuita em Configuracoes.';
}

addIAMsg('ai',msg);
}

function addIAMsg(role,content){
var h=document.getElementById('iaHistory');
var div=document.createElement('div');
div.className='ia-msg '+role;
var icon=role==='ai'?'&#129302; <b>Sibanki IA</b>':'&#128100; <b>Você</b>';
div.innerHTML='<div style="font-size:.78em;color:var(--t3);margin-bottom:6px">'+icon+' &bull; '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</div>'+content;
h.insertBefore(div,h.firstChild);
iaMessages.push({role:role,content:content,time:Date.now()});
}


function saveGeminiKey(){
/* Função mantida por compatibilidade - IA agora é integrada */
toast(typeof t==='function'?t('toast_ia_integrada'):'IA já está integrada! Nenhuma chave necessária.','ok');
}


function getCashMode(){
try{
var v=localStorage.getItem('vrt_cash_mode');
if(v===null||v===undefined||v==='')return true;
return v==='true'||v===true;
}catch(e){return true}
}

function saveCashMode(){
try{
var el=document.getElementById('cashModeToggle');
if(!el)return;
var on=!!el.checked;
localStorage.setItem('vrt_cash_mode', on?'true':'false');
var lb=document.getElementById('cashModeLabel');
if(lb)lb.textContent=on?'Ativado':'Desativado';
var st=document.getElementById('cashModeStatus');
if(st)st.innerHTML=on?
'&#9989; Saldo das contas = apenas lançamentos pagos (modo caixa).':'&#8505; Saldo das contas inclui pendentes/agendados (modo competência).';
try{renderCarteira();}catch(x){}
try{renderDashW();}catch(x){}
try{rKPI();}catch(x){}
}catch(err){console.error('saveCashMode error',err);toast(typeof t==='function'?t('toast_modo_caixa_erro'):'Não foi possível salvar preferência do modo caixa','err');}
}

function loadCashMode(){
var on=getCashMode();
var el=document.getElementById('cashModeToggle');
if(el)el.checked=on;
var lb=document.getElementById('cashModeLabel');
if(lb)lb.textContent=on?'Ativado':'Desativado';
var st=document.getElementById('cashModeStatus');
if(st)st.innerHTML=on?
'&#9989; Saldo das contas = apenas lançamentos pagos (modo caixa).':'&#8505; Saldo das contas inclui pendentes/agendados (modo competência).';
}
function loadGeminiKey(){
/* IA integrada via backend - nenhuma chave necessária */
}


function renderDashPremium(){
var cm=new Date().getMonth();
var cy=new Date().getFullYear();
var now=new Date();
var mesE=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy});
var recM=mesE.filter(function(e){return e.type==='receita'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);
var despM=mesE.filter(function(e){return e.type==='despesa'&&!e.isTransfer&&e.category!=='Transferencia'}).reduce(function(s,e){return s+e.value},0);
var salM=recM-despM;

var h=now.getHours();
var saud=h<6?'Boa madrugada':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
var nota=10;
var pctGasto=recM>0?Math.round(despM/recM*100):(despM>0?999:0);
// Sem receita + com despesa = situação crítica (trata como 999% de gasto)
if(recM===0&&despM>0)nota-=5;
else if(pctGasto>100)nota-=4;else if(pctGasto>80)nota-=2;else if(pctGasto>60)nota-=1;
// Penalidade extra: despesa muito maior que receita
if(recM>0&&pctGasto>150)nota-=2;
if(investments.length===0)nota-=1;if(goals.length===0)nota-=1;if(Object.keys(budgets).length===0)nota-=1;
nota=Math.max(1,Math.min(10,nota));
window._lastFinScore=nota*10;
var scoreNum=nota*10;
var scoreCor=scoreNum>=70?'#22C55E':scoreNum>=40?'#EAB308':'#EF4444';
var userName=(U&&U.name)||'Usuário';
var labelEl=document.getElementById('dashGreetLabel');
if(labelEl)labelEl.textContent=saud;
var el=document.getElementById('dashGreet');
if(el)el.innerHTML=escapeHtml(userName);
var sub=document.getElementById('dashSubtitle');
if(sub){
var diasSemana=['Domingo','Segunda-feira','Ter\u00e7a-feira','Quarta-feira','Quinta-feira','Sexta-feira','S\u00e1bado'];
var meses=['Janeiro','Fevereiro','Mar\u00e7o','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var dataStr=diasSemana[now.getDay()]+', '+now.getDate()+' de '+meses[cm]+' de '+cy;
sub.innerHTML=dataStr;
}
var headerIcon=document.getElementById('dashHideValuesIcon');
if(headerIcon){var iconName=window._dashHideValues?'eye-off':'eye';if(headerIcon.getAttribute('data-lucide')!==iconName){headerIcon.setAttribute('data-lucide',iconName);if(typeof lucide!=='undefined')lucide.createIcons();}}
var previsaoEl=document.getElementById('dashPrevisaoFimMes');
if(previsaoEl){
var sal=0;for(var _i=0;_i<userAccs.length;_i++){var _acc2=userAccs[_i];if(accountMeta[_acc2]&&accountMeta[_acc2].incluirNaSoma===false)continue;try{sal+=getAccBal(_acc2).atual;}catch(x){}}
var diaHojeP=now.getDate();var lastDayP=new Date(cy,cm+1,0).getDate();var diasRestP=lastDayP-diaHojeP;
var diasPassados=Math.max(1,diaHojeP);
var avgRec=recM/diasPassados;var avgDesp=despM/diasPassados;
var projFuturo=(avgRec-avgDesp)*diasRestP;
var fimMes=sal+projFuturo;
previsaoEl.style.display='block';
previsaoEl.textContent=(typeof t==='function'?t('previsao_fim_mes'):'Com esse ritmo, você termina o mês com ')+fmt(fimMes)+'.';
previsaoEl.style.color=fimMes>=0?'var(--green)':'var(--vr)';
}

var gEl=document.getElementById('healthGauge');
if(gEl){
var cor=nota>=8?'var(--green)':nota>=5?'var(--yellow)':'var(--vr)';
var emoji=nota>=8?'&#128170;':nota>=5?'&#128077;':'&#9888;&#65039;';
var label=nota>=8?'Excelente':nota>=5?'Atenção':'Critico';
gEl.innerHTML='<div style="width:70px;height:70px;border-radius:50%;border:4px solid '+cor+';display:flex;align-items:center;justify-content:center;flex-direction:column"><div style="font-size:1.3em;font-weight:800;color:'+cor+'">'+nota+'</div><div style="font-size:.55em;color:var(--t2)">de 10</div></div><div style="font-size:.7em;color:'+cor+';margin-top:4px">'+emoji+' '+label+'</div>';
var descEl=document.getElementById('healthGaugeDesc');
if(descEl)descEl.textContent=typeof t==='function'?t('saude_financeira_desc'):'Sua saúde financeira considera gastos, metas e orçamento.';
}

var txPoup=recM>0?Math.round(salM/recM*100):0;
if(txPoup<0)txPoup=0;
var vp=document.getElementById('valPoup');
if(vp)vp.textContent=txPoup+'%';
if(vp)vp.style.color=txPoup>=20?'var(--green)':txPoup>=10?'var(--yellow)':'var(--vr)';
var bp=document.getElementById('barPoupIn');
if(bp)bp.style.width=Math.min(100,txPoup)+'%';

var diaHoje=now.getDate();
var lastDay=new Date(cy,cm+1,0).getDate();
var diasRest=lastDay-diaHoje;
var vd=document.getElementById('valDias');
if(vd)vd.textContent=diasRest;
var limDiario=diasRest>0?(recM-despM)/diasRest:0;
var vdi=document.getElementById('valDiario');
if(vdi)vdi.innerHTML=limDiario>0?'Limite diario: <b style="color:var(--green)">'+fmt(limDiario)+'</b>':'<span style="color:var(--vr)">Orçamento estourado</span>';

var mesAnt=cm===0?11:cm-1;
var anoAnt=cm===0?cy-1:cy;
var despAnt=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===mesAnt&&d.getFullYear()===anoAnt&&e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);
var vc=document.getElementById('valComp');
var vcd=document.getElementById('valCompDesc');
if(vc&&despAnt>0){
var diff=((despM-despAnt)/despAnt*100).toFixed(0);
if(diff>0){vc.innerHTML='<span style="color:var(--vr)">&#8593; +'+diff+'%</span>';vcd.innerHTML='Você gastou mais que o mês anterior';}
else if(diff<0){vc.innerHTML='<span style="color:var(--green)">&#8595; '+diff+'%</span>';vcd.innerHTML='Parabéns! Você economizou!';}
else{vc.innerHTML='<span style="color:var(--blue)">=  0%</span>';vcd.innerHTML='Mesmo nivel do mês anterior';}
}else if(vc){vc.innerHTML='-';if(vcd)vcd.innerHTML='Sem dados do mês anterior';}

function updateDashMetasBlock(){
var totalMeta=0,currentMeta=0;
var gl=typeof goals!=='undefined'?goals:[];
gl.forEach(function(g){var alvo=parseFloat(g.target||g.alvo)||0;var atual=parseFloat(g.current||g.atual)||0;totalMeta+=alvo;currentMeta+=Math.min(atual,alvo);});
var pctMeta=totalMeta>0?Math.round(currentMeta/totalMeta*100):0;
var vm=document.getElementById('valMetas');
if(vm)vm.textContent=gl.length>0?pctMeta+'%':'Sem metas';
var bm=document.getElementById('barMetasIn');
if(bm)bm.style.width=pctMeta+'%';
}
updateDashMetasBlock();

var prevEl=document.getElementById('dashPrev');
if(prevEl){
var recPrev=recM;
var despRecorr=0;
if(typeof recurrents!=='undefined'){
recurrents.forEach(function(rc){
if(rc.type==='despesa'&&rc.day>diaHoje)despRecorr+=rc.value;
if(rc.type==='receita'&&rc.day>diaHoje)recPrev+=rc.value;
});
}
var despPrev=despM+despRecorr;
var salPrev=recPrev-despPrev;
prevEl.innerHTML=
'<div style="padding:10px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Receita Prevista</div><div style="font-size:1.1em;font-weight:700;color:var(--green);margin-top:4px">'+fmt(recPrev)+'</div></div>'+
'<div style="padding:10px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Despesa Prevista</div><div style="font-size:1.1em;font-weight:700;color:var(--vr);margin-top:4px">'+fmt(despPrev)+'</div></div>'+
'<div style="padding:10px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Saldo Previsto</div><div style="font-size:1.1em;font-weight:700;color:'+(salPrev>=0?'var(--green)':'var(--vr)')+';margin-top:4px">'+fmt(salPrev)+'</div></div>';
}

var tg=document.getElementById('topGastos');
if(tg){
var topE=mesE.filter(function(e){return e.type==='despesa'}).sort(function(a,b){return b.value-a.value}).slice(0,5);
if(topE.length>0){
tg.innerHTML=topE.map(function(e,i){
var pct=despM>0?Math.round(e.value/despM*100):0;
var medals=['<i data-lucide="trophy" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;color:#FFD700"></i>','<i data-lucide="medal" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;color:#C0C0C0"></i>','<i data-lucide="award" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;color:#CD7F32"></i>','4.','5.'];
return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;'+(i<topE.length-1?'border-bottom:1px solid var(--brd)':'')+'"><div style="font-size:1.2em;width:28px;text-align:center">'+medals[i]+'</div><div style="flex:1"><div style="font-weight:600;font-size:.9em">'+(e.desc||e.category)+'</div><div style="font-size:.75em;color:var(--t2)">'+e.category+' &bull; '+new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR')+'</div></div><div style="text-align:right"><div style="font-weight:700;color:var(--vr)">'+fmt(e.value)+'</div><div style="font-size:.7em;color:var(--t3)">'+pct+'% do total</div></div></div>';
}).join('');
if(topE.length>0&&typeof lucide!=='undefined')lucide.createIcons();
}else{tg.innerHTML='<p style="color:var(--t2);text-align:center;padding:16px">Sem despesas este mês</p>';}
}
}


function renderNewCharts(){
var cm=new Date().getMonth();
var cy=new Date().getFullYear();

var diasSem=['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
var gastosDia=[0,0,0,0,0,0,0];
entries.filter(function(e){return e.type==='despesa'}).forEach(function(e){
var d=new Date(e.date+'T12:00:00').getDay();
gastosDia[d]+=e.value;
});

var gc='rgba(148,163,184,0.06)';
var el5=document.getElementById('c5');
if(el5&&gastosDia.some(function(v){return v>0})){
if(charts.c5)charts.c5.destroy();
charts.c5=new Chart(el5,{type:'bar',data:{
labels:diasSem,
datasets:[{label:'Gastos (R$)',data:gastosDia.map(function(v){return +v.toFixed(2)}),
backgroundColor:['#4F8CFF','#7C5CFC','#EAB308','#22C55E','#06B6D4','#EC4899','#A855F7'],
borderRadius:8,borderSkipped:false}]
},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});
}

var el6=document.getElementById('c6');
if(el6){
var meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var m=getMD();var mk=Object.keys(m).sort().slice(-6);
if(mk.length>=2){
var recArr=mk.map(function(k){return m[k].r});
var despArr=mk.map(function(k){return m[k].d});
var mediaRec=recArr.reduce(function(s,v){return s+v},0)/recArr.length;
var mediaDesp=despArr.reduce(function(s,v){return s+v},0)/despArr.length;
var projLabels=mk.map(function(k){var p=k.split('-');return meses[+p[1]-1]});
var projRec=mk.map(function(k){return +m[k].r.toFixed(0)});
var projDesp=mk.map(function(k){return +m[k].d.toFixed(0)});
for(var f=1;f<=6;f++){
var futMonth=(cm+f)%12;
projLabels.push(meses[futMonth]+'*');
projRec.push(+mediaRec.toFixed(0));
projDesp.push(+mediaDesp.toFixed(0));
}
if(charts.c6)charts.c6.destroy();
charts.c6=new Chart(el6,{type:'line',data:{
labels:projLabels,
datasets:[
{label:'Receita',data:projRec,borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.08)',fill:true,tension:.4,borderWidth:2,pointRadius:3,borderDash:[]},
{label:'Despesa',data:projDesp,borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,.08)',fill:true,tension:.4,borderWidth:2,pointRadius:3}
]
},options:{responsive:true,plugins:{legend:{position:'bottom'},annotation:{}},scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});
}
}
}


function addCard(){openCardModal()}

function delCard(id){
if(!confirm(typeof t==='function'?t('confirm_excluir_cartao'):'Excluir este cartão e todas as suas faturas?'))return;
var card=cards.find(function(c){return c.id===id});
if(card){
var pIds={};
card.purchases.forEach(function(p){pIds[p.purchaseId]=true});
entries=entries.filter(function(e){return !e.cardPurchaseId||!pIds[e.cardPurchaseId]});
}
cards=cards.filter(function(c){return c.id!==id});
saveData();renderAll();toast(typeof t==='function'?t('toast_cartao_removido'):'Cartão removido','ok');
}

function addFatura(){
var cardId=parseInt(document.getElementById('fatCard').value);
var desc=document.getElementById('fatDesc').value.trim();
var cat=document.getElementById('fatCat').value;
var fatValEl=document.getElementById('fatVal');
if(!desc){toast(typeof t==='function'?t('toast_preencha_desc_compra'):'Preencha a descrição da compra','err');return;}
if(!fatValEl||!fatValEl.value){toast(typeof t==='function'?t('toast_preencha_valor_compra'):'Preencha o valor da compra','err');return;}
var total=pf('fatVal');
var parcelas=parseInt(document.getElementById('fatParc').value)||1;
var date=document.getElementById('fatDate').value;
if(!cardId){toast(typeof t==='function'?t('toast_selecione_cartao'):'Selecione um cartão','err');return}
if(!desc){toast(typeof t==='function'?t('toast_digite_descricao'):'Digite uma descrição','err');return}
if(!total||total<=0){toast(typeof t==='function'?t('toast_digite_valor'):'Digite o valor','err');return}
if(!date){toast(typeof t==='function'?t('toast_selecione_data'):'Selecione a data','err');return}
var card=cards.find(function(c){return c.id===cardId});
if(!card){toast(typeof t==='function'?t('toast_cartao_nao_encontrado'):'Cartão não encontrado','err');return}
var valParc=Math.round(total/parcelas*100)/100;
var purchaseId=Date.now();
for(var p=0;p<parcelas;p++){
var d=new Date(date+'T12:00:00');
d.setMonth(d.getMonth()+p);
var pDate=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
card.purchases.push({
id:purchaseId+p,
purchaseId:purchaseId,
desc:desc+(parcelas>1?' ('+(p+1)+'/'+parcelas+')':''),
category:cat,
value:valParc,
totalValue:total,
parcela:p+1,
totalParcelas:parcelas,
date:pDate,
billingMonth:getBillingMonth(card,pDate)
});
entries.push({
id:purchaseId+p,
cardPurchaseId:purchaseId,
type:'despesa',
desc:'['+card.name+'] '+desc+(parcelas>1?' ('+(p+1)+'/'+parcelas+')':''),
value:valParc,
category:cat,
date:pDate,
tags:['cartão',card.name.toLowerCase()],
account:card.name
});
}
saveData();renderAll();
toast(parcelas>1?desc+' em '+parcelas+'x de R$ '+valParc.toFixed(2)+' lancado!':desc+' lancado no cartão!','ok');
document.getElementById('fatDesc').value='';document.getElementById('fatVal').value='';document.getElementById('fatParc').value='1';
}

function getBillingMonth(card,dateStr){
var d=new Date(dateStr+'T12:00:00');
var day=d.getDate();
var month=d.getMonth();
var year=d.getFullYear();
if(day>card.closeDay){
month++;
if(month>11){month=0;year++}
}
return year+'-'+String(month+1).padStart(2,'0');
}

function delPurchase(cardId,purchaseId){
if(!confirm(typeof t==='function'?t('confirm_excluir_compra'):'Excluir esta compra? (todas as parcelas serao removidas)'))return;
var card=cards.find(function(c){return c.id===cardId});
if(card){
card.purchases=card.purchases.filter(function(p){return p.purchaseId!==purchaseId});
entries=entries.filter(function(e){return e.cardPurchaseId!==purchaseId});
saveData();renderAll();toast(typeof t==='function'?t('toast_compra_removida'):'Compra removida','ok');
}
}

/* old renderCards removed */

function getDiasParaFecha(card){
var now=new Date();
var closeDate=new Date(now.getFullYear(),now.getMonth(),card.closeDay);
if(now>closeDate)closeDate.setMonth(closeDate.getMonth()+1);
var diff=Math.ceil((closeDate-now)/(1000*60*60*24));
return diff;
}

function updateCardSelects(){
var selFat=document.getElementById('fatCard');
var selView=document.getElementById('fatViewCard');
var selCat=document.getElementById('fatCat');
var opts=cards.map(function(c){return '<option value="'+c.id+'">'+c.name+' ('+c.flag+')</option>'}).join('');
if(selFat)selFat.innerHTML=opts||'<option>Cadastre um cartão</option>';
if(selView)selView.innerHTML=opts||'<option>Cadastre um cartão</option>';
if(selCat)selCat.innerHTML=userCats.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('');
var selMes=document.getElementById('fatViewMes');
if(selMes){
var now=new Date();
var meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var opts2='';
for(var m=-2;m<=3;m++){
var d=new Date(now.getFullYear(),now.getMonth()+m,1);
var val=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
var sel=m===0?' selected':'';
opts2+='<option value="'+val+'"'+sel+'>'+meses[d.getMonth()]+' '+d.getFullYear()+'</option>';
}
selMes.innerHTML=opts2;
}
if(!document.getElementById('fatDate').value){
document.getElementById('fatDate').value=new Date().toISOString().split('T')[0];
}
}

function renderFatura(){
var cardId=parseInt(document.getElementById('fatViewCard').value);
var mes=document.getElementById('fatViewMes').value;
var card=cards.find(function(c){return c.id===cardId});
if(!card)return;
var purchases=card.purchases.filter(function(p){return p.billingMonth===mes});
var totalFat=purchases.reduce(function(s,p){return s+p.value},0);
var disponível=card.limit-totalFat;
var pct=card.limit>0?Math.round(totalFat/card.limit*100):0;

var rEl=document.getElementById('faturaResumo');
if(rEl){
rEl.innerHTML=
'<div style="padding:12px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Total da Fatura</div><div style="font-size:1.2em;font-weight:800;color:var(--vr);margin-top:4px">R$ '+totalFat.toFixed(2)+'</div></div>'+
'<div style="padding:12px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Limite Disponível</div><div style="font-size:1.2em;font-weight:800;color:'+(disponível>=0?'var(--green)':'var(--vr)')+';margin-top:4px">R$ '+disponível.toFixed(2)+'</div></div>'+
'<div style="padding:12px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">% Utilizado</div><div style="font-size:1.2em;font-weight:800;color:'+(pct>=80?'var(--vr)':pct>=50?'var(--yellow)':'var(--green)')+';margin-top:4px">'+pct+'%</div></div>'+
'<div style="padding:12px;background:var(--bg2);border-radius:10px;text-align:center"><div style="font-size:.75em;color:var(--t2)">Itens na Fatura</div><div style="font-size:1.2em;font-weight:800;color:var(--blue);margin-top:4px">'+purchases.length+'</div></div>';
}

var aEl=document.getElementById('faturaAlerta');
if(aEl){
var diasFecha=getDiasParaFecha(card);
if(diasFecha<=3){
aEl.innerHTML='<div style="padding:10px 14px;background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.3);border-radius:10px;margin-bottom:12px;font-size:.88em">&#128680; <b>Atenção!</b> A fatura do '+card.name+' fecha em <b>'+diasFecha+' dia'+(diasFecha>1?'s':'')+'</b>! Total atual: <b>R$ '+totalFat.toFixed(2)+'</b></div>';
}else if(diasFecha<=7){
aEl.innerHTML='<div style="padding:10px 14px;background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.3);border-radius:10px;margin-bottom:12px;font-size:.88em">&#9888;&#65039; A fatura do '+card.name+' fecha em <b>'+diasFecha+' dias</b>.</div>';
}else{aEl.innerHTML='';}
}

var dEl=document.getElementById('faturaDetalhe');
if(dEl){
if(purchases.length===0){
dEl.innerHTML='<div style="text-align:center;color:var(--t2);padding:20px">Nenhuma compra nesta fatura.</div>';
}else{
var h='<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>';
purchases.sort(function(a,b){return a.date>b.date?1:-1}).forEach(function(p){
h+='<tr><td>'+new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR')+'</td>';
h+='<td>'+p.desc+'</td>';
h+='<td>'+p.category+'</td>';
h+='<td style="color:var(--vr);font-weight:600">R$ '+p.value.toFixed(2)+'</td>';
h+='<td><button onclick="delPurchase('+cardId+','+p.purchaseId+')" style="background:var(--vr);color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:.8em">X</button></td></tr>';
});
h+='</tbody></table>';
dEl.innerHTML=h;
}
}
}

function renderCardsResumo(){
var rEl=document.getElementById('cardsResumo');
if(!rEl)return;
if(cards.length===0){rEl.innerHTML='';return}
var now=new Date();
var totalLimite=0,totalUsado=0;
var h='';
cards.forEach(function(c){
var bm=getBillingMonth(c,now.toISOString().split('T')[0]);
var fat=c.purchases.filter(function(p){return p.billingMonth===bm}).reduce(function(s,p){return s+p.value},0);
totalLimite+=c.limit;
totalUsado+=fat;
});
var totalDisp=totalLimite-totalUsado;
var pctTotal=totalLimite>0?Math.round(totalUsado/totalLimite*100):0;
h+='<div style="padding:14px;background:var(--bg2);border-radius:12px;text-align:center"><div style="font-size:.78em;color:var(--t2)">Limite Total</div><div style="font-size:1.3em;font-weight:800;color:var(--blue);margin-top:4px">R$ '+totalLimite.toFixed(2)+'</div></div>';
h+='<div style="padding:14px;background:var(--bg2);border-radius:12px;text-align:center"><div style="font-size:.78em;color:var(--t2)">Total Utilizado</div><div style="font-size:1.3em;font-weight:800;color:var(--vr);margin-top:4px">R$ '+totalUsado.toFixed(2)+'</div></div>';
h+='<div style="padding:14px;background:var(--bg2);border-radius:12px;text-align:center"><div style="font-size:.78em;color:var(--t2)">Disponível Total</div><div style="font-size:1.3em;font-weight:800;color:var(--green);margin-top:4px">R$ '+totalDisp.toFixed(2)+'</div></div>';
h+='<div style="padding:14px;background:var(--bg2);border-radius:12px;text-align:center"><div style="font-size:.78em;color:var(--t2)">% Comprometido</div><div style="font-size:1.3em;font-weight:800;color:'+(pctTotal>=80?'var(--vr)':pctTotal>=50?'var(--yellow)':'var(--green)')+';margin-top:4px">'+pctTotal+'%</div></div>';
rEl.innerHTML=h;
}



function emptyState(icon,title,text,btnText,btnAction){
var h='<div class="empty-state"><div class="empty-icon">'+icon+'</div>';
h+='<div class="empty-title">'+title+'</div>';
h+='<div class="empty-text">'+text+'</div>';
if(btnText&&btnAction){
h+='<div class="empty-btn"><button class="btn btn-r" onclick="'+btnAction+'">'+btnText+'</button></div>';
}
h+='</div>';
return h;
}

function getInsightDoDia(opts){
opts=opts||{};
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var today=now.toISOString().split('T')[0];
var weekAgo=new Date(now);
weekAgo.setDate(weekAgo.getDate()-7);
var weekAgoStr=weekAgo.toISOString().split('T')[0];
var fourWeeksAgo=new Date(now);
fourWeeksAgo.setDate(fourWeeksAgo.getDate()-28);
var fourStr=fourWeeksAgo.toISOString().split('T')[0];
var gastoEstaSemana=0,gastoUltimas4=0,countWeeks=0;
var recMes=0,gastoMes=0;
if(typeof entries!=='undefined'){
entries.forEach(function(e){
var v=e.value||e.val||0;
var d=e.date||'';
if(e.type==='despesa'||e.type==='desp'){if(d>=weekAgoStr&&d<=today)gastoEstaSemana+=v;if(d>=fourStr)gastoUltimas4+=v;}
else if(e.type==='receita'||e.type==='rec'){if(d.startsWith(mesAtual))recMes+=v;}
if(e.type==='despesa'||e.type==='desp'){if(d.startsWith(mesAtual))gastoMes+=v;}
});
countWeeks=4;
}
var mediaSemanal=countWeeks>0?gastoUltimas4/countWeeks:0;
var insights=[];
if(mediaSemanal>0&&gastoEstaSemana>mediaSemanal*1.1){
var pct=Math.round((gastoEstaSemana/mediaSemanal-1)*100);
insights.push('Você gastou '+pct+'% a mais esta semana do que a sua média. Vale a pena revisar os gastos antes do fim do mês.');
}
if(typeof goals!=='undefined'&&goals.length>0){
goals.forEach(function(g){
if(!g||!g.target||g.target<=0)return;
var pct=Math.round(((g.current||0)/g.target)*100);
var fim=g.deadline||g.endDate;
var diasRest=0;
if(fim){var dFim=new Date(fim);diasRest=Math.ceil((dFim-now)/(24*60*60*1000));}
if(pct>=70&&pct<100&&diasRest>0&&diasRest<=30){
var falta=g.target-(g.current||0);
var porDia=diasRest>0?falta/diasRest:0;
insights.push('Sua meta "'+(g.name||'Meta')+'" vence em '+diasRest+' dia(s) e está em '+pct+'%. Para atingir, guarde cerca de R$ '+porDia.toFixed(0)+'/dia.');
}
if(pct>=100)insights.push('Parabéns! Você atingiu a meta "'+(g.name||'Meta')+'".');
});
}
if(typeof recurrents!=='undefined'&&recurrents.length>0){
var amanha=new Date(now);amanha.setDate(amanha.getDate()+1);var amanhaStr=amanha.toISOString().split('T')[0];
recurrents.forEach(function(r){
if(!r.active)return;
var venc=r.dueDay||r.nextDue;
if(venc===amanha.getDate()||(r.nextDate&&r.nextDate.startsWith(amanhaStr))){
insights.push('Amanhã vence: '+(r.name||'Despesa recorrente')+' de R$ '+(r.value||0).toFixed(2)+'.');
}
});
}
if(typeof cards!=='undefined'&&cards.length>0){
var dia=now.getDate();
cards.forEach(function(c){
if(!c.closeDay)return;
var diasPra=c.closeDay-dia;
if(diasPra<0)diasPra+=30;
if(diasPra<=3){
var fat=0;
if(c.purchases){var bm=mesAtual;fat=c.purchases.filter(function(p){return (p.billingMonth||'').substring(0,7)===bm}).reduce(function(s,p){return s+(p.value||0)},0);}
insights.push('A fatura do '+(c.name||'cartão')+' fecha em '+diasPra+' dia(s). Total aproximado: R$ '+fat.toFixed(2)+'.');
}
});
}
var sal=0;
if(typeof userAccs!=='undefined'&&typeof getAccBal==='function'){
for(var i=0;i<userAccs.length;i++){try{sal+=getAccBal(userAccs[i]).atual;}catch(x){}}
}
if(sal>0&&typeof goals!=='undefined'&&goals.length>0){
var metaInv=goals.find(function(g){return (g.type||'').toLowerCase().indexOf('invest')>=0||(g.name||'').toLowerCase().indexOf('invest')>=0;});
if(metaInv&&(metaInv.current||0)<(metaInv.target||0)){
var falta=(metaInv.target||0)-(metaInv.current||0);
var aporte=Math.min(sal*0.1,falta);
if(aporte>=50)insights.push('Seu saldo permite um aporte de até R$ '+aporte.toFixed(0)+' na meta "'+(metaInv.name||'Investimento')+'".');
}
}
if(recMes>0&&gastoMes>0){
var saldoMes=recMes-gastoMes;
if(saldoMes>0)insights.push('Este mês você está no azul: saldo de R$ '+saldoMes.toFixed(2)+' até agora. Continue assim!');
else if(saldoMes<0)insights.push('Este mês as despesas já superaram as receitas em R$ '+Math.abs(saldoMes).toFixed(2)+'. Que tal revisar algumas categorias?');
}
if(opts.shuffle&&insights.length>1){var i=Math.floor(Math.random()*insights.length);return insights[i];}
if(insights.length>0)return insights[0];
return 'Seus números estão sendo organizados. Use o Consultor IA para dúvidas ou planejamento.';
}

function renderInsightDoDia(forceNew){
var card=document.getElementById('insightDoDiaCard');
var textEl=document.getElementById('insightDoDiaText');
if(!card||!textEl)return;
if(!U||!U.uid){card.style.display='none';return;}
var msg=getInsightDoDia(forceNew?{shuffle:true}:{});
textEl.textContent=msg;
card.style.display='block';
}

var _raLast=0,_raTimer=null;
function renderAll(){
var now=Date.now();
if(now-_raLast<80){clearTimeout(_raTimer);_raTimer=setTimeout(renderAll,80);return;}
_raLast=now;
var tabEl=document.querySelector('.tab.on');
var tabId=tabEl&&tabEl.id?tabEl.id:'dash';
rKPI();
popFilMes();popTfSels();
if(tabId==='dash'){
if(window._dashHideValues===undefined){try{window._dashHideValues=localStorage.getItem('sibanki_dash_hide_values')==='1';}catch(e){window._dashHideValues=false;}}
rKPI();renderDashPremium();renderDashboardWidgets();rDicas();checkAlerts();renderDashImportPromo();renderDashTelegramPromo();if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
}
else if(tabId==='lanc'){if(typeof setLancPeriodo==='function')setLancPeriodo(_lancPeriodo||'hoje');rE();setLancFirstGuide();if(typeof window.refreshLucide==='function')lucide.createIcons();}
else if(tabId==='invest'){rInv();try{renderPortfolio();}catch(e){}}
else if(tabId==='metas'){metasIaTipLoaded=false;rMetas();if(typeof updateDashMetasBlock==='function')updateDashMetasBlock();}
else if(tabId==='orçamento'){rOrc();}
else if(tabId==='contas'){renderCarteira();}
else if(tabId==='cartões'||tabId==='cartoes'){renderCards();renderFatura();}
else if(tabId==='conq'){rBadges();checkAch();}
else if(tabId==='rel'){rRel();}
else if(tabId==='dicas'){rDicas();}
else if(tabId==='calendario'){if(typeof renderCalendario==='function')renderCalendario();else if(typeof rCal==='function')rCal();}
else if(tabId==='casal'||tabId==='familia'){/* família: sem re-render pesado, dados carregados por listeners próprios */}
else if(tabId==='ia'||tabId==='config'||tabId==='comunidade'){if(tabId==='ia'&&typeof markPrimeiroPassoIa==='function')markPrimeiroPassoIa();}
else{rE();rCharts();rDicas();rBadges();rRel();rInv();try{renderPortfolio();}catch(e){}rMetas();rOrc();checkAch();renderCarteira();renderDashW();renderInsightDoDia();rnRc();checkAlerts();renderDashPremium();renderNewCharts();renderCards();renderFatura();}
rnRc();
try{bldN();}catch(x){}
if(typeof updateDrawerUser==='function')updateDrawerUser();
if(typeof window.refreshLucide==='function')lucide.createIcons();
}

// KPI — 4 cards estilo Lovable (Saldo Total, Receitas, Despesas, Investimentos)
function rKPI(){
var td=0,tr=0,dc=0,rc=0;
var now=new Date();var cm=now.getMonth(),cy=now.getFullYear();
var mesAtual=cy+'-'+String(cm+1).padStart(2,'0');
var mesAnt=cm===0?11:cm-1,anoAnt=cm===0?cy-1:cy;
var mesAntStr=anoAnt+'-'+String(mesAnt+1).padStart(2,'0');
var despMes=0,recMes=0,pendMes=0,recAnt=0,despAnt=0;
entries.forEach(function(e){
var isMes=e.date&&e.date.startsWith(mesAtual);
var isAnt=e.date&&e.date.startsWith(mesAntStr);
var isTf=e.isTransfer||e.category==='Transferencia';
if(e.type==='despesa'){td+=e.value;dc++;if(isMes&&!isTf){despMes+=e.value;if(e.status==='pendente'||e.status==='agendado')pendMes+=e.value}if(isAnt&&!isTf)despAnt+=e.value;}
else{tr+=e.value;rc++;if(isMes&&!isTf)recMes+=e.value;if(isAnt&&!isTf)recAnt+=e.value;}
});
var salMes=recMes-despMes;
var salMesAnt=recAnt-despAnt;
var sal=0;
for(var _ai=0;_ai<userAccs.length;_ai++){var _acc=userAccs[_ai];if(accountMeta[_acc]&&accountMeta[_acc].incluirNaSoma===false)continue;try{sal+=getAccBal(_acc).atual;}catch(x){}}
var totalInvAtual=0;
investments.forEach(function(i){totalInvAtual+=i.atual||i.valor||0});
var patrimônio=sal+totalInvAtual;
var hide=!!window._dashHideValues;
var f=function(v){return hide?'••••••':fmt(v);};
function pctChange(atual,ant){if(ant===0)return atual>0?'+0%':'0%';var p=((atual-ant)/Math.abs(ant))*100;var s=p>=0?'+':'';return s+p.toFixed(1).replace('.',',')+'%';}
var chSaldoBadge=hide?'•••':'M\u00eas: '+fmt(salMes);
var chRec=recAnt>0?pctChange(recMes,recAnt):(recMes>0?'+0%':'0%');
var chDesp=despAnt>0?pctChange(despMes,despAnt):(despMes>0?'+0%':'0%');
var chInv='—';
var kRel=document.getElementById('kR');if(!kRel)return;
kRel.innerHTML=
'<div class="dash-stats-grid">'+
'<div class="dash-stat-card dash-stat-saldo" onclick="openKpiModal(\'saldo\')"><div class="dash-stat-head"><div class="dash-stat-icon dash-stat-icon-primary"><i data-lucide="wallet"></i></div><span class="dash-stat-badge '+(salMes>=0?'dash-stat-badge-pos':'dash-stat-badge-neg')+'">'+chSaldoBadge+'</span></div><div class="dash-stat-label">Saldo Total</div><div class="dash-stat-value">'+f(sal)+'</div><div class="dash-stat-accent"></div></div>'+
'<div class="dash-stat-card dash-stat-receitas" onclick="openKpiModal(\'receitas\')"><div class="dash-stat-head"><div class="dash-stat-icon dash-stat-icon-success"><i data-lucide="arrow-up-right"></i></div><span class="dash-stat-badge dash-stat-badge-pos">'+(hide?'•••':chRec)+'</span></div><div class="dash-stat-label">Receitas</div><div class="dash-stat-value">'+f(recMes)+'</div><div class="dash-stat-accent"></div></div>'+
'<div class="dash-stat-card dash-stat-despesas" onclick="openKpiModal(\'despesas\')"><div class="dash-stat-head"><div class="dash-stat-icon dash-stat-icon-danger"><i data-lucide="arrow-down-left"></i></div><span class="dash-stat-badge dash-stat-badge-neg">'+(hide?'•••':chDesp)+'</span></div><div class="dash-stat-label">Despesas</div><div class="dash-stat-value">'+f(despMes)+'</div><div class="dash-stat-accent"></div></div>'+
'<div class="dash-stat-card dash-stat-invest" onclick="openKpiModal(\'investido\')"><div class="dash-stat-head"><div class="dash-stat-icon dash-stat-icon-accent"><i data-lucide="trending-up"></i></div><span class="dash-stat-badge dash-stat-badge-pos">'+(hide?'•••':chInv)+'</span></div><div class="dash-stat-label">Investimentos</div><div class="dash-stat-value">'+f(totalInvAtual)+'</div><div class="dash-stat-accent"></div></div>'+
'</div>';
var tips=getSmartTips().filter(function(t){var s=(t.title||'')+(t.text||'');return !/importe|importar|extrato|nubank|inter|itaú|c6/i.test(s);});
if(tips.length>0){var t=tips[0];
var tb=document.getElementById('tipBanner');if(tb)tb.innerHTML='<div class="tip-card '+t.color+'" style="margin-bottom:16px"><b>'+t.title+'</b> - '+t.text+'</div>'}
else{var tb=document.getElementById('tipBanner');if(tb)tb.innerHTML='';}
if(typeof window.refreshLucide==='function')lucide.createIcons();
}
function drawSparklineSaldo(){
var can=document.getElementById('sparkline-saldo');
if(!can||typeof entries==='undefined')return;
var ctx=can.getContext('2d');
var w=80,h=40;
var pad=2;
var now=new Date();
var points=[];
var baseMs=now.getTime()-(6*24*60*60*1000);
var fromStr=new Date(baseMs).getFullYear()+'-'+String(new Date(baseMs).getMonth()+1).padStart(2,'0')+'-'+String(new Date(baseMs).getDate()).padStart(2,'0');
var daysWithData=0;
for(var i=0;i<7;i++){
var d=new Date(baseMs+i*24*60*60*1000);
var dateStr=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
var cum=0,hasEntry=false;
entries.forEach(function(e){
if(e.date&&e.date>=fromStr&&e.date<=dateStr){cum+=e.type==='receita'?e.value:-e.value;if(e.date===dateStr)hasEntry=true;}
});
if(hasEntry)daysWithData++;
points.push(cum);
}
ctx.clearRect(0,0,w,h);
var min=Math.min.apply(null,points),max=Math.max.apply(null,points);
var range=max-min||1;
var firstVal=points[0],lastVal=points[6];
var strokeColor=lastVal>=firstVal?'#22C55E':'#EF4444';
function x(j){return pad+(w-pad*2)*(j/6);}
function y(v){return h-pad-(h-pad*2)*((v-min)/range);}
if(daysWithData===0){
var dadosPlaceholder=[40,38,40,39,41,40,40];
var phMin=Math.min.apply(null,dadosPlaceholder),phMax=Math.max.apply(null,dadosPlaceholder),phRange=phMax-phMin||1;
ctx.save();
ctx.globalAlpha=0.55;
ctx.strokeStyle='#94a3b8';
ctx.lineWidth=2;
ctx.lineJoin='round';ctx.lineCap='round';
ctx.beginPath();
for(var j=0;j<7;j++){var xj=x(j),yj=h-pad-(h-pad*2)*((dadosPlaceholder[j]-phMin)/phRange);if(j===0)ctx.moveTo(xj,yj);else ctx.lineTo(xj,yj);}
ctx.stroke();
ctx.restore();
return;
}
if(daysWithData>=1&&daysWithData<=4){
ctx.strokeStyle=strokeColor;
ctx.lineWidth=2.5;
ctx.lineJoin='round';ctx.lineCap='round';
ctx.beginPath();
for(var j=0;j<7;j++){var xj=x(j),yj=y(points[j]);if(j===0)ctx.moveTo(xj,yj);else ctx.lineTo(xj,yj);}
ctx.stroke();
ctx.fillStyle=strokeColor;
for(var j=0;j<7;j++){ctx.beginPath();ctx.arc(x(j),y(points[j]),2.5,0,Math.PI*2);ctx.fill();}
return;
}
var grad=ctx.createLinearGradient(0,0,0,h);
grad.addColorStop(0,strokeColor==='#22C55E'?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)');
grad.addColorStop(1,'transparent');
ctx.beginPath();
ctx.moveTo(x(0),h-pad);
ctx.lineTo(x(0),y(points[0]));
for(var j=1;j<7;j++){
var cpx=(x(j-1)+x(j))/2,cpy=(y(points[j-1])+y(points[j]))/2;
ctx.quadraticCurveTo(cpx,cpy,x(j),y(points[j]));
}
ctx.lineTo(x(6),h-pad);
ctx.closePath();
ctx.fillStyle=grad;
ctx.fill();
ctx.strokeStyle=strokeColor;
ctx.lineWidth=2;
ctx.lineJoin='round';ctx.lineCap='round';
ctx.beginPath();
ctx.moveTo(x(0),y(points[0]));
for(var j=1;j<7;j++){
var cpx=(x(j-1)+x(j))/2,cpy=(y(points[j-1])+y(points[j]))/2;
ctx.quadraticCurveTo(cpx,cpy,x(j),y(points[j]));
}
ctx.stroke();
}

// LANÇAMENTOS
function onChangePgto(val){
var row=document.getElementById('fPgtoCartaoRow');
var contaSel=document.getElementById('fA');
if(val==='cartao'){
// Popula select de cartões
var sel=document.getElementById('fPgtoCard');
if(sel&&typeof cards!=='undefined'){
sel.innerHTML=cards.length===0?'<option value="">Nenhum cartão cadastrado</option>':cards.map(function(c){return'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>';}).join('');
}
if(row)row.style.display='block';
// Desabilita e limpa o campo Conta
if(contaSel){contaSel.value='';contaSel.disabled=true;contaSel.style.opacity='.35';}
}else{
if(row)row.style.display='none';
// Reabilita o campo Conta
if(contaSel){contaSel.disabled=false;contaSel.style.opacity='';}
}
}

function addE(){
var date=document.getElementById('fD').value,type=document.getElementById('fT').value;
var cat=document.getElementById('fC').value,val=pf('fV');
var desc=document.getElementById('fDe').value.trim(),acc=document.getElementById('fA').value;
var tags=document.getElementById('fTags')?document.getElementById('fTags').value.trim():'';
if(!date||!val||val<=0){toast(typeof t==='function'?t('toast_preencha_data_valor'):'Preencha data e valor!','err');return}
var status=document.getElementById('fStatus')?document.getElementById('fStatus').value:'pago';
var pgto=document.getElementById('fPgto')?document.getElementById('fPgto').value:'';

// ── Roteamento para cartão de crédito ──
if(pgto==='cartao'&&type==='despesa'){
var cardSel=document.getElementById('fPgtoCard');
var parcSel=document.getElementById('fPgtoParc');
var cardId=cardSel?parseInt(cardSel.value):0;
var parcelas=parcSel?parseInt(parcSel.value)||1:1;
if(!cardId){toast('Selecione um cartão','err');return;}
var card=typeof cards!=='undefined'?cards.find(function(c){return c.id===cardId}):null;
if(!card){toast('Cartão não encontrado','err');return;}
var valParc=Math.round(val/parcelas*100)/100;
var purchaseId=Date.now();
for(var p=0;p<parcelas;p++){
var d2=new Date(date+'T12:00:00');d2.setMonth(d2.getMonth()+p);
var pDate=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0')+'-'+String(d2.getDate()).padStart(2,'0');
card.purchases.push({id:purchaseId+p,purchaseId:purchaseId,desc:(desc||cat)+(parcelas>1?' ('+(p+1)+'/'+parcelas+')':''),category:cat,value:valParc,totalValue:val,parcela:p+1,totalParcelas:parcelas,date:pDate,billingMonth:getBillingMonth(card,pDate)});
entries.push({id:purchaseId+p,cardPurchaseId:purchaseId,type:'despesa',desc:'['+card.name+'] '+(desc||cat)+(parcelas>1?' ('+(p+1)+'/'+parcelas+')':''),value:valParc,category:cat,date:pDate,tags:['cartão',card.name.toLowerCase()],account:card.name,status:'pendente',formaPgto:'cartao'});
}
saveData();clrF();renderAll();
toast(parcelas>1?(desc||cat)+' em '+parcelas+'x de R$ '+valParc.toFixed(2).replace('.',',')+'  no '+card.name:'Lançado no '+card.name,'ok');
if(typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
return;
}

var newEntry={id:Date.now(),date:date,type:type,desc:desc||cat,category:cat,value:Math.round(val*100)/100,account:acc,tags:tags,status:status,formaPgto:pgto};
entries.push(newEntry);
saveData();clrF();renderAll();
var _lancFb=document.getElementById('lancFormBox');if(_lancFb)_lancFb.style.display='none';
var _lancBtnL=document.getElementById('lancBtnLancar');if(_lancBtnL)_lancBtnL.classList.remove('lp-on');
toast(typeof t==='function'?t('toast_lancamento_salvo'):'Lançamento salvo!','ok');
if(entries.length===1&&typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
setTimeout(function(){checkProactiveConsultor(newEntry);},500);
}

function delE(id){if(!confirm(typeof t==='function'?t('confirm_excluir_lancamento'):'Excluir?'))return;entries=entries.filter(function(e){return e.id!==id});saveData();renderAll();toast(typeof t==='function'?t('toast_excluido'):'Excluído','err')}

function clrF(){
document.getElementById('fV').value='';
document.getElementById('fDe').value='';
var ftg=document.getElementById('fTags');if(ftg)ftg.value='';
document.getElementById('fD').value=new Date().toISOString().split('T')[0];
var fp=document.getElementById('fPgto');if(fp)fp.value='';
var row=document.getElementById('fPgtoCartaoRow');if(row)row.style.display='none';
var fp2=document.getElementById('fPgtoParc');if(fp2)fp2.value='1';
var fA=document.getElementById('fA');if(fA){fA.disabled=false;fA.style.opacity='';}
}

var _rEPage=0,_rEPageSize=50;
function setREPage(p){_rEPage=p;rE();}
function rE(){
var f=getFilteredEntries().slice();
f.sort(function(a,b){return b.date.localeCompare(a.date)});
var total=f.length;
var tb=document.getElementById('tB'),em=document.getElementById('emp');
var pagEl=document.getElementById('rEPagination');
document.getElementById('cnt').textContent='('+total+')';
var totalFilt=f.reduce(function(s,e){return s+(e.type==='receita'?e.value:-e.value)},0);
var sumDiv=document.getElementById('filtSum');
if(sumDiv)sumDiv.innerHTML='<span style="font-size:.78em;color:var(--t3)">Soma filtrada: </span><span style="font-weight:600;font-family:var(--font-mono);color:'+(totalFilt>=0?'var(--green)':'var(--danger)')+'">'+fmt(Math.abs(totalFilt))+(totalFilt>=0?' (+)':' (-)')+'</span>';
if(!f.length){if(tb)tb.innerHTML='';if(pagEl){pagEl.style.display='none';pagEl.innerHTML='';}em.style.display='block';return}
em.style.display='none';
var maxPage=Math.max(0,Math.ceil(total/_rEPageSize)-1);
if(_rEPage>maxPage)_rEPage=maxPage;
var pageRows=total<=_rEPageSize?f:f.slice(_rEPage*_rEPageSize,(_rEPage+1)*_rEPageSize);
// Group by date
var groups={},groupOrder=[];
pageRows.forEach(function(e){var d=e.date;if(!groups[d]){groups[d]=[];groupOrder.push(d);}groups[d].push(e);});
var stIcoLucide={'pago':'','pendente':'clock','agendado':'calendar'};
var stCls={'pendente':'entry-st-pendente','agendado':'entry-st-agendado'};
var pgLbl={'pix':'<i data-lucide="zap" style="width:12px;height:12px;vertical-align:middle"></i> Pix','debito':'<i data-lucide="credit-card" style="width:12px;height:12px;vertical-align:middle"></i> Débito','credito':'<i data-lucide="credit-card" style="width:12px;height:12px;vertical-align:middle"></i> Crédito','dinheiro':'<i data-lucide="banknote" style="width:12px;height:12px;vertical-align:middle"></i> Dinheiro','boleto':'<i data-lucide="file-text" style="width:12px;height:12px;vertical-align:middle"></i> Boleto','transferencia':'<i data-lucide="arrow-left-right" style="width:12px;height:12px;vertical-align:middle"></i> Transf.','cartao':'<i data-lucide="credit-card" style="width:12px;height:12px;vertical-align:middle"></i> Cartão'};
var weekDays=['dom','seg','ter','qua','qui','sex','sáb'];
var monthsAb=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
if(tb)tb.innerHTML=groupOrder.map(function(date){
var d=new Date(date+'T12:00:00');
var dateLabel=weekDays[d.getDay()]+', '+d.getDate()+' '+monthsAb[d.getMonth()];
var items=groups[date];
var dayTotal=items.reduce(function(s,e){return s+(e.type==='receita'?e.value:-e.value)},0);
var rows=items.map(function(e){
var ic=_gCILucide(e.category);
var isRec=e.type==='receita';
var st=e.status||'pago';
var pgmt=pgLbl[e.formaPgto]||e.formaPgto||'';
var metaParts=[escapeHtml(e.category||'')];
if(e.account)metaParts.push(escapeHtml(e.account));
if(pgmt)metaParts.push(pgmt);
var stHtml=st!=='pago'?'<span class="'+stCls[st]+'"><i data-lucide="'+stIcoLucide[st]+'" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>'+st+'</span>':'';
if(stHtml)metaParts.push(stHtml);
return '<div class="entry-item">'
+'<div class="entry-ico '+(isRec?'entry-ico-rec':'entry-ico-desp')+'"><i data-lucide="'+ic+'" style="width:18px;height:18px"></i></div>'
+'<div class="entry-info">'
+'<div class="entry-desc">'+escapeHtml(e.desc||'-')+'</div>'
+'<div class="entry-meta">'+metaParts.join(' · ')+'</div>'
+'</div>'
+'<div class="entry-amt '+(isRec?'entry-rec':'entry-desp')+'"><span class="entry-amt-prefix">'+(isRec?'+':'-')+' R$ </span><span class="entry-amt-num">'+fmtNumOnly(e.value)+'</span></div>'
+'<div class="entry-acts"><button class="entry-btn-edit" onclick="editE('+e.id+')" title="Editar"><i data-lucide="pencil" style="width:14px;height:14px"></i></button><button class="entry-btn-del" onclick="delE('+e.id+')" title="Excluir"><i data-lucide="x" style="width:14px;height:14px"></i></button></div>'
+'</div>';
}).join('');
return '<div class="entry-group">'
+'<div class="entry-date-hd"><span class="entry-date-lbl">'+dateLabel+'</span></div>'
+rows
+'<div class="entry-date-ft"><span class="entry-date-total" style="color:'+(dayTotal>=0?'#10b981':'#ef4444')+'">Total do dia: '+(dayTotal>=0?'+':'')+fmt(dayTotal)+'</span></div>'
+'</div>';
}).join('');
if(pagEl){
if(total<=_rEPageSize){pagEl.style.display='none';pagEl.innerHTML='';}
else{
pagEl.style.display='flex';
var from=_rEPage*_rEPageSize+1,to=Math.min((_rEPage+1)*_rEPageSize,total);
pagEl.innerHTML='<span>Mostrando '+from+'-'+to+' de '+total+'</span><div style="display:flex;gap:6px"><button type="button" class="btn btn-o btn-sm" '+(_rEPage<=0?'disabled':'')+' onclick="setREPage('+(_rEPage-1)+')">← Anterior</button><button type="button" class="btn btn-o btn-sm" '+(_rEPage>=maxPage?'disabled':'')+' onclick="setREPage('+(_rEPage+1)+')">Próxima →</button></div>';
}
}
if(typeof lucide!=='undefined')lucide.createIcons();
}

// INVESTIMENTOS

// ============================================
// AUTO-PREENCHIMENTO: ETFs, AÇÕES, FIIs, CRIPTO
// ============================================
var _tickerFetchTimeout=null;
var _invTickerListTimeout=null;
var _lastInvTickerPrice={};
var _lastInvTickerValid=false;
function setupTickerAutofill(){
var tipoEl=document.getElementById('invTipo');
var nomeEl=document.getElementById('invNome');
var valorEl=document.getElementById('invValor');
if(!tipoEl||!nomeEl)return;

// Quando valor investido muda, recalcular quantidade exibida
if(valorEl){valorEl.addEventListener('input',updateInvQtdDisplay);valorEl.addEventListener('change',updateInvQtdDisplay);}
tipoEl.addEventListener('change',updateInvQtdDisplay);

// Quando muda o tipo, ajustar placeholder (opcional; nome vem primeiro)
tipoEl.addEventListener('change',function(){
var t=this.value;
if(t==='Ações')nomeEl.placeholder='Ex: PETR4, VALE3';
else if(t==='FIIs')nomeEl.placeholder='Ex: HGLG11, XPML11';
else if(t==='ETFs')nomeEl.placeholder='Ex: BOVA11, IVVB11';
else if(t==='Cripto')nomeEl.placeholder='Ex: Bitcoin, BTC';
else if(t==='Tesouro Direto')nomeEl.placeholder='Ex: Tesouro IPCA+ 2029';
else if(t==='CDB')nomeEl.placeholder='Ex: CDB Banco Inter 120% CDI';
else if(t==='LCI/LCA')nomeEl.placeholder='Ex: LCI Banco do Brasil 95% CDI';
else if(t==='Poupança')nomeEl.placeholder='Ex: Poupança Caixa';
else nomeEl.placeholder='Ex: PETR4, HGLG11, Tesouro IPCA+';
});

// Quando sai do campo nome, buscar cotação se for ticker B3
nomeEl.addEventListener('blur',function(){
var ticker=this.value.trim().toUpperCase();
if(!ticker)return;
if(/^[A-Z]{4}[0-9]{1,2}$/.test(ticker)){
fetchTickerQuote(ticker);
if(!tipoEl.value||['Ações','FIIs','ETFs'].indexOf(tipoEl.value)<0)setInvTipoFromTicker(ticker);
}
});

// Autocomplete abrangente: sugere sem depender do tipo; ao selecionar o sistema define o tipo
nomeEl.addEventListener('input',function(){
clearTimeout(_tickerFetchTimeout);
clearTimeout(_invTickerListTimeout);
var ticker=this.value.trim().toUpperCase();
if(ticker.length>=2){
_invTickerListTimeout=setTimeout(function(){fetchTickerList(ticker);},400);
if(/^[A-Z]{4}[0-9]{1,2}$/.test(ticker)){_tickerFetchTimeout=setTimeout(function(){fetchTickerQuote(ticker);setInvTipoFromTicker(ticker);},600);}
}else{hideInvTickerDropdown();_lastInvTickerValid=false;}
});
nomeEl.addEventListener('blur',function(){setTimeout(hideInvTickerDropdown,200);});
}
function setInvTipoFromTicker(ticker){
var tipo=inferTipoFromTicker(ticker);
if(tipo){var sel=document.getElementById('invTipo');if(sel)sel.value=tipo;}
}
function inferTipoFromTicker(ticker){
if(!ticker||ticker.length<5)return null;
if(/^[A-Z]{4}[34]$/.test(ticker))return 'Ações';
if(/^[A-Z]{4}11$/.test(ticker)){
var etfs=['BOVA','IVVB','SMAL','PIBB','DIVO','MATB','BBSD','ISUS','USDB','XFIX','IMAB','IMAT','GOVT','AGRI','URTI','FUND','BLOC','CIBR','ECOO','GOVE','HASH','NASD','SPXI','SMAC','XFIV'];
if(etfs.indexOf(ticker.substring(0,4))>=0)return 'ETFs';
return 'FIIs';
}
return null;
}
function hideInvTickerDropdown(){var d=document.getElementById('invTickerDropdown');if(d)d.style.display='none';}
async function fetchTickerList(term){
var dd=document.getElementById('invTickerDropdown');
if(!dd)return;
var token=localStorage.getItem('vrt_b3token')||'';
var base='https://brapi.dev/api/quote/list?search='+encodeURIComponent(term)+'&limit=8&sortBy=name&sortOrder=asc&token='+token;
try{
var rStock=fetch(base+'&type=stock');
var rFund=fetch(base+'&type=fund');
var jStock=await (await rStock).json();
var jFund=await (await rFund).json();
var stocks=(jStock.stocks||[]).map(function(s){return {stock:(s.stock||'').toUpperCase(),name:s.name||'',type:'stock'};});
var funds=(jFund.stocks||[]).map(function(s){return {stock:(s.stock||'').toUpperCase(),name:s.name||'',type:'fund'};});
var seen={};
var merged=[];
stocks.forEach(function(s){var t=s.stock;if(!seen[t]){seen[t]=true;merged.push(s);}});
funds.forEach(function(s){var t=s.stock;if(!seen[t]){seen[t]=true;merged.push(s);}});
merged=merged.slice(0,14);
if(merged.length===0){dd.innerHTML='';dd.style.display='none';return;}
var etfPrefixes=['BOVA','IVVB','SMAL','PIBB','DIVO','MATB','BBSD','ISUS','USDB','XFIX','IMAB','IMAT','GOVT','AGRI','URTI','FUND','BLOC','CIBR','ECOO','GOVE','HASH','NASD','SPXI','SMAC','XFIV'];
dd.innerHTML=merged.map(function(s){
var t=s.stock;
var tipoVal=s.type==='fund'?'FIIs':(t.length===6&&t.slice(-2)==='11'&&etfPrefixes.indexOf(t.slice(0,4))>=0?'ETFs':(t.length===6&&t.slice(-2)==='11'?'FIIs':'Ações'));
var tipoLabel=tipoVal==='Ações'?'Ação':tipoVal==='FIIs'?'FII':'ETF';
return '<div style="padding:8px 12px;cursor:pointer;font-size:.85em;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'transparent\'" onclick="document.getElementById(\'invNome\').value=\''+t.replace(/'/g,"\\'")+'\';var sel=document.getElementById(\'invTipo\');if(sel)sel.value=\''+tipoVal+'\';hideInvTickerDropdown();fetchTickerQuote(\''+t.replace(/'/g,"\\'")+'\');"><span style="font-weight:700;color:var(--pri)">'+t+'</span><span style="font-size:.8em;color:var(--t2)">'+(s.name||'').substring(0,22)+' · '+tipoLabel+'</span></div>';
}).join('');
dd.style.display='block';
}catch(e){dd.style.display='none';}
}

function updateInvQtdDisplay(){
var tipoEl=document.getElementById('invTipo');
var nomeEl=document.getElementById('invNome');
var valorEl=document.getElementById('invValor');
var atualEl=document.getElementById('invAtual');
var qtdEl=document.getElementById('invQtdStatus');
if(!qtdEl||!tipoEl||!nomeEl)return;
var tipo=tipoEl.value;
var ticker=(nomeEl.value||'').trim().toUpperCase();
var valor=parseFloat(valorEl&&valorEl.value?valorEl.value:0)||0;
var isRV=['Ações','FIIs','ETFs'].indexOf(tipo)>=0;
if(!isRV||!ticker||valor<=0){qtdEl.innerHTML='';return}
var preco=0;
if(_lastInvTickerPrice[ticker]&&_lastInvTickerPrice[ticker]>0)preco=_lastInvTickerPrice[ticker];
else if(atualEl&&atualEl.value){preco=parseFloat(atualEl.value)||0;}
if(preco<=0){qtdEl.innerHTML='';return}
var qtd=Math.floor(valor/preco);
var unidade=tipo==='Ações'?'ações':tipo==='FIIs'?'cotas':'cotas';
qtdEl.innerHTML='<span style="color:var(--pri);font-weight:600">≈ '+qtd+' '+unidade+'</span> a R$ '+preco.toFixed(2).replace('.',',')+' cada';
}

async function fetchTickerQuote(ticker){
var atualEl=document.getElementById('invAtual');
var statusEl=document.getElementById('invTickerStatus');
if(!statusEl){
// Criar elemento de status abaixo do campo Nome
var nomeParent=document.getElementById('invNome').parentElement;
statusEl=document.createElement('div');
statusEl.id='invTickerStatus';
statusEl.style.cssText='font-size:.75em;margin-top:4px;min-height:18px';
nomeParent.appendChild(statusEl);
}
statusEl.innerHTML='<span style="color:var(--pri);display:inline-flex;align-items:center;gap:6px"><i data-lucide="search" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Buscando '+ticker+'...</span>';

try{
var url,results;
if(typeof brapiRaioXFn==='function'){
try{
var resp=await brapiRaioXFn({ticker:ticker,range:'1d',modules:'',dividends:false});
results=resp.data.results||[];
}catch(e){
var token=localStorage.getItem('vrt_b3token')||'';
var r=await fetch('https://brapi.dev/api/quote/'+ticker+'?token='+token);
var json=await r.json();
results=json.results||[];
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var r=await fetch('https://brapi.dev/api/quote/'+ticker+'?token='+token);
var json=await r.json();
results=json.results||[];
}

if(results.length>0){
var q=results[0];
var price=q.regularMarketPrice||0;
var chg=q.regularMarketChangePercent||0;
var name=q.longName||q.shortName||ticker;
var chgColor=chg>=0?'#22C55E':'#EF4444';
var chgSign=chg>=0?'+':'';

// Preencher valor atual e guardar preço para cálculo de quantidade
_lastInvTickerValid=true;
if(atualEl&&price>0){
atualEl.value=price.toFixed(2);
_lastInvTickerPrice[ticker]=price;
}
updateInvQtdDisplay();

statusEl.innerHTML='<span style="color:#22C55E;display:inline-flex;align-items:center;gap:6px"><i data-lucide="check" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> <strong>'+ticker+'</strong></span> '+
'<span style="color:var(--t2)">'+name.substring(0,30)+'</span> — '+
'<span style="font-weight:700">R$ '+price.toFixed(2)+'</span> '+
'<span style="color:'+chgColor+'">'+chgSign+chg.toFixed(2)+'%</span>';
}else{
_lastInvTickerValid=false;
statusEl.innerHTML='<span style="color:#EF4444;display:inline-flex;align-items:center;gap:6px"><i data-lucide="x" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Ticker não encontrado</span>';
}
}catch(e){
_lastInvTickerValid=false;
statusEl.innerHTML='<span style="color:var(--t3);display:inline-flex;align-items:center;gap:6px"><i data-lucide="alert-triangle" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Erro ao buscar cotação</span>';
}
if(typeof lucide!=='undefined')lucide.createIcons();
}

// ============================================
// RENDA FIXA: BUSCAR SELIC/CDI DO BANCO CENTRAL
// ============================================
var _rfRates={selic:0,cdi:0,ipca:0,poupanca:0,loaded:false};

async function loadRendaFixaRates(){
if(_rfRates.loaded)return _rfRates;
try{
// Selic Meta (série 432)
var r1=await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
var d1=await r1.json();
if(d1&&d1.length)_rfRates.selic=parseFloat(d1[0].valor);

// CDI diário (série 12) - taxa diária, converter para anual
var r2=await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json');
var d2=await r2.json();
if(d2&&d2.length){
var cdiDia=parseFloat(d2[0].valor)/100;
_rfRates.cdi=((Math.pow(1+cdiDia,252)-1)*100); // Anualizar: (1+tx)^252 - 1
}

// IPCA mensal (série 433)
try{
var r3=await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json');
var d3=await r3.json();
if(d3&&d3.length){
var ipcaAcum=0;
d3.forEach(function(m){ipcaAcum+=parseFloat(m.valor)});
_rfRates.ipca=ipcaAcum;
}
}catch(e){_rfRates.ipca=4.5;} // fallback

// Poupança = 70% da Selic (se Selic > 8.5%)
_rfRates.poupanca=_rfRates.selic>8.5?(_rfRates.selic*0.7):(_rfRates.selic*0.7);
_rfRates.loaded=true;
}catch(e){
console.warn('Erro ao buscar taxas BCB:',e);
// Fallback
_rfRates.selic=14.75;_rfRates.cdi=14.65;_rfRates.ipca=4.5;_rfRates.poupanca=10.33;
_rfRates.loaded=true;
}
return _rfRates;
}

// Calcular rendimento de renda fixa baseado no tipo
function calcRendaFixa(tipo,nome,valorInvestido,dataInvestimento){
if(!_rfRates.loaded)return valorInvestido;

var nomeUpper=(nome||'').toUpperCase();
var dataInv=new Date(dataInvestimento+'T12:00:00');
var hoje=new Date();
var diasCorridos=Math.max(1,Math.floor((hoje-dataInv)/(1000*60*60*24)));
var anosDecorridos=diasCorridos/365;

var taxaAnual=0;

if(tipo==='Poupança'){
taxaAnual=_rfRates.poupanca;
}else if(tipo==='Tesouro Direto'){
if(nomeUpper.indexOf('SELIC')>=0){
taxaAnual=_rfRates.selic*0.98; // Tesouro Selic rende ~98% da Selic
}else if(nomeUpper.indexOf('IPCA')>=0){
// IPCA + taxa (tipicamente 5-6%)
var taxaReal=5.5; // taxa média
var match=nomeUpper.match(/(\d+[.,]\d+)/);
if(match)taxaReal=parseFloat(match[1].replace(',','.'));
taxaAnual=_rfRates.ipca+taxaReal;
}else if(nomeUpper.indexOf('PRE')>=0||nomeUpper.indexOf('PRÉ')>=0){
taxaAnual=_rfRates.selic+1; // Prefixado tipicamente Selic+1
}else{
taxaAnual=_rfRates.selic;
}
}else if(tipo==='CDB'){
// Extrair % do CDI do nome (ex: "CDB 120% CDI" ou "CDB Inter 110%")
var pctCDI=100;
var matchCDI=nomeUpper.match(/(\d{2,3})\s*%/);
if(matchCDI)pctCDI=parseInt(matchCDI[1]);
taxaAnual=_rfRates.cdi*(pctCDI/100);
}else if(tipo==='LCI/LCA'){
// LCI/LCA isenta de IR, geralmente 90-95% CDI
var pctCDI2=93;
var matchLCI=nomeUpper.match(/(\d{2,3})\s*%/);
if(matchLCI)pctCDI2=parseInt(matchLCI[1]);
taxaAnual=_rfRates.cdi*(pctCDI2/100);
}else if(tipo==='Renda Fixa'){
taxaAnual=_rfRates.cdi; // Default: 100% CDI
}else{
return valorInvestido;
}

// Calcular valor atualizado (juros compostos)
var valorAtual=valorInvestido*Math.pow(1+taxaAnual/100,anosDecorridos);
return Math.round(valorAtual*100)/100;
}

// ============================================
// ATUALIZAR CARTEIRA COM RENDA FIXA REAL
// ============================================
async function updateRendaFixaValues(){
await loadRendaFixaRates();

var updated=0;
var rfTipos=['Renda Fixa','Tesouro Direto','CDB','LCI/LCA','Poupança','Previdência'];

investments.forEach(function(inv){
if(rfTipos.indexOf(inv.tipo)>=0&&inv.date&&inv.valor>0){
var novoValor=calcRendaFixa(inv.tipo,inv.nome,inv.valor,inv.date);
if(novoValor!==inv.valor){
inv.atual=novoValor;
updated++;
}
}
});

if(updated>0){
saveData();renderAll();
toast(updated+' investimento(s) de renda fixa atualizado(s) com taxas reais!','ok');
}

// Mostrar taxas atuais
var ratesInfo=document.getElementById('invRFRates');
if(!ratesInfo){
var kpiRow=document.getElementById('invDashKPIs');
if(kpiRow){
ratesInfo=document.createElement('div');
ratesInfo.id='invRFRates';
ratesInfo.style.cssText='display:flex;gap:12px;flex-wrap:wrap;padding:8px 12px;background:var(--bg2);border:1px solid var(--brd);border-radius:10px;margin:8px 0;font-size:.75em';
kpiRow.parentElement.insertBefore(ratesInfo,kpiRow.nextSibling);
}
}
if(ratesInfo){
ratesInfo.innerHTML=
'<span style="color:var(--t3);display:inline-flex;align-items:center;gap:4px"><i data-lucide="bar-chart-2" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Taxas Reais (BCB):</span>'+
'<span style="color:#22C55E;font-weight:700">SELIC '+_rfRates.selic.toFixed(2)+'%</span>'+
'<span style="color:var(--pri);font-weight:700">CDI '+_rfRates.cdi.toFixed(2)+'%</span>'+
'<span style="color:#EAB308;font-weight:700">IPCA '+_rfRates.ipca.toFixed(1)+'% (12m)</span>'+
'<span style="color:var(--t2)">Poup. '+_rfRates.poupanca.toFixed(2)+'%</span>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}


function addInv(){
var date=document.getElementById('invDate').value;
var tipo=document.getElementById('invTipo').value;
var nome=document.getElementById('invNome').value.trim();
var valor=parseFloat(document.getElementById('invValor').value);
var atualEl=document.getElementById('invAtual');
var atual=parseFloat(atualEl&&atualEl.value?atualEl.value:0)||valor;
var conta=document.getElementById('invConta').value;
if(!date||!nome||!valor||valor<=0){toast(typeof t==='function'?t('toast_preencha_todos_campos'):'Preencha todos os campos!','err');return}
var ticker=nome.toUpperCase().trim();
var isRV=['Ações','FIIs','ETFs'].indexOf(tipo)>=0;
if(isRV&&/^[A-Z]{4}[0-9]{1,2}$/.test(ticker)){
if(!_lastInvTickerValid||!(_lastInvTickerPrice[ticker]||(atualEl&&atualEl.value?parseFloat(atualEl.value):0))){toast(typeof t==='function'?t('toast_ticker_invalido'):'Ticker inválido ou não encontrado. Digite um ticker válido e aguarde a confirmação (✓) antes de registrar.','err');return;}
}
var obj={id:Date.now(),date:date,tipo:tipo,nome:nome,valor:Math.round(valor*100)/100,atual:Math.round(atual*100)/100,conta:conta};
if(isRV&&/^[A-Z]{4}[0-9]{1,2}$/.test(ticker)){
var precoCompra=_lastInvTickerPrice[ticker]||(atualEl&&atualEl.value?parseFloat(atualEl.value):0);
if(precoCompra>0){
obj.precoCompra=Math.round(precoCompra*100)/100;
obj.qtd=Math.floor(valor/precoCompra);
var custoReal=Math.round(obj.qtd*obj.precoCompra*100)/100;
obj.valor=custoReal;
obj.atual=custoReal;
}}
var valorAbate=obj.valor;
if(conta){
var entryId=Date.now()+1;
entries.push({id:entryId,date:date,type:'despesa',desc:'Aporte em '+nome,category:'Investimentos',value:Math.round(valorAbate*100)/100,account:conta,tags:['investimento'],status:'pago'});
obj.entryId=entryId;
}
investments.push(obj);
saveData();renderAll();
document.getElementById('invNome').value='';document.getElementById('invValor').value='';document.getElementById('invAtual').value='';
_lastInvTickerPrice={};
var qtdEl=document.getElementById('invQtdStatus');if(qtdEl)qtdEl.innerHTML='';
updateInvQtdDisplay();
toast(conta?'Investimento registrado! Saída de R$ '+valorAbate.toFixed(2).replace('.',',')+' na conta '+conta+'.':'Investimento registrado!','ok');
}

function delInv(id){if(!confirm(typeof t==='function'?t('toast_excluir_investimento'):'Excluir investimento?'))return;var inv=investments.find(function(i){return i.id===id});if(inv&&inv.entryId)entries=entries.filter(function(e){return e.id!==inv.entryId});investments=investments.filter(function(i){return i.id!==id});saveData();renderAll();toast(typeof t==='function'?t('toast_excluido'):'Excluído','err')}

function editInvAtual(id){
var inv=investments.find(function(i){return i.id===id});
if(!inv)return;
var nv=prompt('Novo valor atual de "'+inv.nome+'" (R$):',inv.atual);
if(nv===null)return;
nv=parseFloat(nv);
if(isNaN(nv)||nv<0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
inv.atual=Math.round(nv*100)/100;
saveData();renderAll();toast(typeof t==='function'?t('toast_atualizado'):'Atualizado!','ok');
}

function rInv(){
var totalInv=0,totalAtual=0;
investments.forEach(function(i){totalInv+=invCostBasis(i);totalAtual+=i.atual||i.valor});
var retorno=totalAtual-totalInv;
var pctRet=totalInv>0?((retorno/totalInv)*100).toFixed(2):'0.00';
var invKPI=document.getElementById('invKPI');
if(invKPI){invKPI.innerHTML='<div class="kpi green"><div class="kl">Total Investido</div><div class="kv">'+fmt(totalInv)+'</div></div>'+'<div class="kpi blue"><div class="kl">Valor Atual</div><div class="kv">'+fmt(totalAtual)+'</div></div>'+'<div class="kpi '+(retorno>=0?'green':'red')+'"><div class="kl">Retorno</div><div class="kv">'+fmt(retorno)+'</div><div class="ks">'+pctRet+'%</div></div>'+'<div class="kpi purple"><div class="kl">Ativos</div><div class="kv">'+investments.length+'</div></div>';}

var tb=document.getElementById('invTB'),em=document.getElementById('invEmp');
if(!investments.length){tb.innerHTML='';em.style.display='block';rInvCharts();return}
em.style.display='none';
tb.innerHTML=investments.map(function(i){
var base=invCostBasis(i);var ret=(i.atual||i.valor)-base;var pct=base>0?((ret/base)*100).toFixed(1):'0';
var cls=ret>=0?'g':'r';
return '<tr><td>'+new Date(i.date+'T12:00:00').toLocaleDateString('pt-BR')+'</td><td><span class="bdg info">'+i.tipo+'</span></td><td><b>'+i.nome+'</b></td><td>'+fmt(base)+'</td><td class="m '+cls+'">'+fmt(i.atual||i.valor)+'</td><td class="m '+cls+'">'+(ret>=0?'+':'')+fmt(ret)+' ('+pct+'%)</td><td>'+(i.conta||'-')+'</td><td><button class="btn btn-b btn-sm" onclick="editInvAtual('+i.id+')" style="margin-right:4px">Atualizar</button><button class="btn-d" onclick="delInv('+i.id+')">X</button></td></tr>';
}).join('');
rInvCharts();
}

function rInvCharts(){
try{if(charts.inv1)charts.inv1.destroy()}catch(e){}
try{if(charts.inv2)charts.inv2.destroy()}catch(e){}
var c1=document.getElementById('invChart1'),c2=document.getElementById('invChart2');
if(!investments.length||!c1||!c2)return;
var byTipo={};investments.forEach(function(i){byTipo[i.tipo]=(byTipo[i.tipo]||0)+i.atual});
var tk=Object.keys(byTipo);var tv=tk.map(function(k){return+(byTipo[k].toFixed(2))});
var cc=['#4F8CFF','#7C5CFC','#EAB308','#22C55E','#14B8A6','#06B6D4','#EC4899','#6366F1','#A855F7','#EC4899','#F43F5E'];
charts.inv1=new Chart(c1,{type:'doughnut',data:{labels:tk,datasets:[{data:tv,backgroundColor:cc.slice(0,tk.length),borderColor:'#111132',borderWidth:3}]},options:{responsive:true,cutout:'55%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:6,font:{size:10}}}}}});

var byDate={};investments.forEach(function(i){var k=i.date.substring(0,7);byDate[k]=(byDate[k]||0)+i.atual});
var dk=Object.keys(byDate).sort();
var ns=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var dl=dk.map(function(k){var p=k.split('-');return ns[+p[1]-1]+'/'+p[0].slice(2)});
var dv=[];var ac=0;dk.forEach(function(k){ac+=byDate[k];dv.push(+(ac.toFixed(2)))});
charts.inv2=new Chart(c2,{type:'line',data:{labels:dl,datasets:[{label:'Carteira',data:dv,borderColor:'#A855F7',backgroundColor:'rgba(168,85,247,.1)',fill:true,tension:.4,borderWidth:3,pointRadius:5}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(148,163,184,0.06)'}},x:{grid:{color:'rgba(148,163,184,0.06)'}}}}});
}

// CALCULADORA JUROS COMPOSTOS
function calcJuros(){
var ini=parseFloat(document.getElementById('calcIni').value)||0;
var mensal=parseFloat(document.getElementById('calcMensal').value)||0;
var taxa=(parseFloat(document.getElementById('calcTaxa').value)||0)/100;
var meses=parseInt(document.getElementById('calcMeses').value)||0;
var total=ini;var totalInvestido=ini;
for(var i=0;i<meses;i++){total=total*(1+taxa)+mensal;totalInvestido+=mensal}
var jurosGanhos=total-totalInvestido;
var anos=(meses/12).toFixed(1);
document.getElementById('calcResult').innerHTML=
'<div class="calc-result"><h4>Resultado da Simulação</h4>'+
'<p class="big">'+fmt(total)+'</p>'+
'<p>Total investido: <b>'+fmt(totalInvestido)+'</b></p>'+
'<p>Juros ganhos: <b style="color:var(--green)">'+fmt(jurosGanhos)+'</b></p>'+
'<p>Período: <b>'+meses+' meses ('+anos+' anos)</b></p>'+
'<p>Rendimento: <b style="color:var(--green)">'+((jurosGanhos/totalInvestido)*100).toFixed(1)+'%</b></p></div>';
}

// METAS
var metasFilterType='all';
var metasIaTipLoaded=false;
var metasIaTipGoalsCount=-1;

function getMetaPct(g){var alvo=parseFloat(g.alvo||g.target)||0;var atual=parseFloat(g.atual||g.current)||0;return alvo>0?Math.min((atual/alvo)*100,100):0;}

function getMetaLucideIcon(nome){nome=(nome||'').toLowerCase();if(/reserva|emergên|emergenc|poupan/.test(nome))return'shield-check';if(/viagem|férias|ferias|turismo/.test(nome))return'plane';if(/carro|veículo|veiculo|moto/.test(nome))return'car';if(/casa|imóvel|imovel|aparta|moradia|entrada/.test(nome))return'home';if(/educa|facul|curso|pós|pos|mestrad|grad/.test(nome))return'graduation-cap';if(/invest|fundo|rend|ativo|portf/.test(nome))return'trending-up';if(/casam|bodas|festa/.test(nome))return'heart';if(/saúde|saude|médic|medic|plano/.test(nome))return'activity';if(/aposentad|reform/.test(nome))return'coffee';return'target';}

function getMetaCategory(nome){nome=(nome||'').toLowerCase();if(/reserva|emergên|emergenc|poupan/.test(nome))return'Segurança';if(/viagem|férias|ferias/.test(nome))return'Lazer';if(/carro|veículo|veiculo|moto/.test(nome))return'Bens';if(/casa|imóvel|imovel|aparta|moradia/.test(nome))return'Moradia';if(/educa|facul|curso|pós|pos|grad/.test(nome))return'Educação';if(/invest|fundo/.test(nome))return'Investimentos';if(/saúde|saude/.test(nome))return'Saúde';return'Pessoal';}

function getMetaColor(g,idx){var corMap={green:'#10B981',blue:'#3b82f6',purple:'#8b5cf6',yellow:'#f59e0b',red:'#ef4444',cyan:'#06b6d4'};if(g.cor&&corMap[g.cor])return corMap[g.cor];var palette=['#3b82f6','#10B981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899'];return palette[(idx||0)%palette.length];}

function setMetasFilter(type,btn){
  metasFilterType=type;
  document.querySelectorAll('.mf-tab').forEach(function(t){t.classList.remove('active');});
  if(btn)btn.classList.add('active');
  renderMetasCards();
  if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},60);
}

function showMetaMenu(id,btn){
  document.querySelectorAll('.meta-dropdown').forEach(function(d){d.remove();});
  var g=goals.find(function(x){return x.id===id;});
  if(!g)return;
  var menu=document.createElement('div');
  menu.className='meta-dropdown';
  menu.innerHTML=[
    '<button onclick="editMetaAtual('+id+');closeMetaDropdown()">✏️ Atualizar valor</button>',
    '<button onclick="addValToGoal('+id+',50);closeMetaDropdown()">+ R$ 50</button>',
    '<button onclick="addValToGoal('+id+',100);closeMetaDropdown()">+ R$ 100</button>',
    '<button onclick="addValToGoal('+id+',200);closeMetaDropdown()">+ R$ 200</button>',
    '<button onclick="openFinCalcWithGoal('+id+');closeMetaDropdown()">📈 Como atingir?</button>',
    '<button onclick="delMeta('+id+');closeMetaDropdown()" style="color:var(--danger)">🗑 Excluir</button>',
  ].join('');
  if(btn){btn.style.position='relative';btn.appendChild(menu);}
  setTimeout(function(){
    document.addEventListener('click',function handler(e){
      if(!menu.contains(e.target)&&e.target!==btn){menu.remove();document.removeEventListener('click',handler);}
    });
  },10);
}

function closeMetaDropdown(){document.querySelectorAll('.meta-dropdown').forEach(function(d){d.remove();});}

function renderMetasCards(){
  var c=document.getElementById('metasContainer');
  if(!c)return;
  var filtered=goals.filter(function(g){
    var pct=getMetaPct(g);
    if(metasFilterType==='active')return pct<100;
    if(metasFilterType==='completed')return pct>=100;
    return true;
  });
  if(!filtered.length){c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--t2);font-size:.85rem">Nenhuma meta neste filtro.</div>';return;}
  c.innerHTML=filtered.map(function(g,idx){
    var alvo=parseFloat(g.alvo||g.target)||0;
    var atual=parseFloat(g.atual||g.current)||0;
    var nome=g.nome||g.name||'Meta';
    var pct=alvo>0?Math.min((atual/alvo)*100,100):0;
    var isCompleted=pct>=100;
    var cor=getMetaColor(g,idx);
    var icon=getMetaLucideIcon(nome);
    var category=getMetaCategory(nome);
    var pl=getMetaPlanner(g);
    var prazoTxt=g.prazo?new Date(g.prazo+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):'Sem prazo';
    var monthlyTxt=pl&&pl.aporteMensal>0?fmt(Math.round(pl.aporteMensal))+'/mês':'—';
    var remaining=alvo-atual;
    return '<div class="meta-card-v2">'+
      '<div class="meta-card-v2-glow" style="background:'+cor+'"></div>'+
      '<div class="meta-card-v2-header">'+
        '<div style="display:flex;align-items:center;gap:10px">'+
          '<div class="meta-card-v2-icon" style="background:'+cor+'18"><i data-lucide="'+icon+'" style="width:20px;height:20px;color:'+cor+'"></i></div>'+
          '<div><div class="meta-card-v2-title">'+nome+'</div><div class="meta-card-v2-cat">'+category+'</div></div>'+
        '</div>'+
        '<button type="button" class="meta-card-v2-menu" onclick="showMetaMenu('+g.id+',this)" title="Opções"><i data-lucide="more-horizontal" style="width:16px;height:16px"></i></button>'+
      '</div>'+
      '<div class="meta-card-v2-amounts"><span class="meta-card-v2-current">'+fmt(atual)+'</span><span class="meta-card-v2-target">de '+fmt(alvo)+'</span></div>'+
      '<div class="meta-card-v2-bar"><div class="meta-card-v2-fill" style="width:'+pct+'%;background:'+cor+'"></div></div>'+
      '<div class="meta-card-v2-bar-info">'+
        '<span class="meta-card-v2-pct" style="color:'+cor+'">'+pct.toFixed(1)+'%</span>'+
        (isCompleted?'<span class="meta-card-v2-completed-badge"><i data-lucide="check-circle-2" style="width:12px;height:12px"></i> Concluída</span>':'<span class="meta-card-v2-remaining">Faltam '+fmt(remaining)+'</span>')+
      '</div>'+
      (isCompleted?'':'<div class="meta-card-v2-footer"><div class="meta-card-v2-footer-item"><i data-lucide="calendar" style="width:12px;height:12px"></i>'+prazoTxt+'</div><div class="meta-card-v2-footer-item"><i data-lucide="flame" style="width:12px;height:12px"></i>'+monthlyTxt+'</div></div>')+
    '</div>';
  }).join('');
}

function renderMetasIaTip(){
  var tipEl=document.getElementById('metasIaTip');
  if(!tipEl||goals.length===0){if(tipEl)tipEl.style.display='none';return;}
  if(metasIaTipLoaded&&metasIaTipGoalsCount===goals.length)return;
  metasIaTipGoalsCount=goals.length;
  tipEl.style.display='flex';
  tipEl.innerHTML='<div class="metas-ia-tip-icon"><i data-lucide="sparkles" style="width:22px;height:22px;color:var(--vr)"></i></div>'+
    '<div class="metas-ia-tip-body">'+
      '<div class="metas-ia-tip-title">Dica do Consultor IA</div>'+
      '<div class="metas-ia-tip-text" id="metasIaTipText" style="color:var(--t3)">Analisando suas metas...</div>'+
    '</div>';
  if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},50);
  try{
    var user=firebase.auth().currentUser;
    if(!user)return;
    var metasStr=goals.slice(0,6).map(function(g){
      var nome=g.nome||g.name;
      var alvo=parseFloat(g.alvo||g.target)||0;
      var atual=parseFloat(g.atual||g.current)||0;
      var pct=alvo>0?Math.round(atual/alvo*100):0;
      var pl=getMetaPlanner(g);
      return nome+': '+pct+'% ('+fmt(atual)+'/'+fmt(alvo)+(pl&&pl.aporteMensal>0?', guardar '+fmt(Math.round(pl.aporteMensal))+'/mês':'')+')';
    }).join('; ');
    var ctx=getFinancialContext();
    var prompt='Analise as metas do usuário e dê UMA dica prática e específica em no máximo 2 frases curtas. Seja direto e motivador. Metas: '+metasStr+'. Receita: '+fmt(ctx.receita_mes||0)+'/mês. Saldo livre: '+fmt((ctx.receita_mes||0)-(ctx.despesa_mes||0))+'/mês. Destaque a meta mais próxima de ser concluída ou a que precisa de ajuste.';
    var callIAFn=firebase.functions().httpsCallable('chatApi');
    callIAFn({message:prompt,context:''}).then(function(res){
      var data=res&&res.data?res.data:{};
      var reply=data.reply||'Continue contribuindo regularmente nas suas metas! 💪';
      reply=reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n+/g,' ').trim();
      var sentences=reply.match(/[^.!?]+[.!?]+/g);
      if(sentences&&sentences.length>2)reply=sentences.slice(0,2).join(' ');
      var textEl=document.getElementById('metasIaTipText');
      if(textEl){textEl.style.color='';textEl.innerHTML=reply;}
      var tipElNow=document.getElementById('metasIaTip');
      if(tipElNow){
        tipElNow.insertAdjacentHTML('beforeend','<button class="metas-ia-tip-btn" onclick="go(\'ia\');setTimeout(function(){iaAnalyze(\'metas\');},350)">Ver análise →</button>');
      }
      metasIaTipLoaded=true;
      if(typeof lucide!=='undefined')lucide.createIcons();
    }).catch(function(){
      var textEl=document.getElementById('metasIaTipText');
      if(textEl){textEl.style.color='';textEl.innerHTML='Continue contribuindo regularmente para alcançar seus objetivos! 💪';}
      metasIaTipLoaded=true;
    });
  }catch(e){metasIaTipLoaded=false;}
}

function addMeta(){
var nome=document.getElementById('metaNome').value.trim();
var alvo=parseFloat(document.getElementById('metaAlvo').value);
var atual=parseFloat(document.getElementById('metaAtual').value)||0;
var prazo=document.getElementById('metaPrazo').value;
var cor=document.getElementById('metaCor').value;
if(!nome||!alvo){toast(typeof t==='function'?t('toast_preencha_todos_campos'):'Preencha nome e valor alvo!','err');return false}
goals.push({id:Date.now(),nome:nome,alvo:alvo,atual:atual,prazo:prazo,cor:cor});
saveData();renderAll();
document.getElementById('metaNome').value='';document.getElementById('metaAlvo').value='';document.getElementById('metaAtual').value='0';
toast(typeof t==='function'?t('toast_meta_criada'):'Meta criada!','ok');
if(goals.length===1&&typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
if(typeof closeMetaModal==='function')closeMetaModal();
return true;
}
function openMetaModal(){
var ov=document.getElementById('metaModalOv');if(ov)ov.classList.add('show');
if(typeof lucide!=='undefined')lucide.createIcons();
}
function closeMetaModal(){
var ov=document.getElementById('metaModalOv');if(ov)ov.classList.remove('show');
}

function delMeta(id){if(!confirm('Excluir meta?'))return;goals=goals.filter(function(g){return g.id!==id});saveData();renderAll();toast(typeof t==='function'?t('toast_meta_excluida'):'Meta excluida','err')}

function getMetaPlanner(g){
var alvo=parseFloat(g.alvo)||parseFloat(g.target)||0;
var atual=parseFloat(g.atual)||parseFloat(g.current)||0;
var falta=Math.max(0,alvo-atual);
var mesesAte=0;
var prazo=g.prazo||g.deadline;
if(prazo){
var d=new Date(typeof prazo==='string'?prazo+'T12:00:00':prazo);
var hoje=new Date();
mesesAte=Math.max(0,Math.ceil((d.getTime()-hoje.getTime())/(30.44*24*60*60*1000)));
}
var tax=0.01;
var aporteMensal=0;
if(falta>0&&mesesAte>0){var fator=Math.pow(1+tax,mesesAte);aporteMensal=falta*tax/(fator-1);}
var aporteSemana=aporteMensal>0?aporteMensal/4.33:0;
return{falta:falta,mesesAte:mesesAte,aporteMensal:aporteMensal,aporteSemana:aporteSemana,jaAtingida:falta<=0};
}

function openFinCalcWithGoal(goalId){
var g=goals.find(function(x){return x.id===goalId});if(!g){openFinCalc('aporte');return}
var pl=getMetaPlanner(g);
var metaVal=Math.round(pl.falta);
var prazoVal=pl.mesesAte||60;
openFinCalc('aporte',{meta:metaVal,prazo:prazoVal});
}

function getMetaTips(g){
var nome=(g.nome||g.name||'').toLowerCase();
var tips=[];
if(/reserva|emergência|emergencia/.test(nome)){
tips.push('Mantenha em aplicação de liquidez diária (CDB, Tesouro Selic).');
tips.push('Só use em situação real de emergência (desemprego, saúde).');
tips.push('Recomposição: reponha o valor usado assim que puder.');
}else if(/viagem|férias|ferias|passeio/.test(nome)){
tips.push('Separe em uma conta ou subconta para não misturar com o dia a dia.');
tips.push('Pesquise com antecedência: passagens e hospedagem costumam ser mais baratas.');
tips.push('Inclua no orçamento: transporte, hospedagem, alimentação e um extra para imprevistos.');
}else if(/carro|automóvel|automovel|veículo/.test(nome)){
tips.push('Além da entrada, planeje IPVA, seguro e manutenção no primeiro ano.');
tips.push('Compare financiamento x consórcio x guardar e pagar à vista.');
tips.push('Considere o custo total de propriedade (combustível, estacionamento).');
}else if(/casa|imóvel|imovel|entrada|apartamento/.test(nome)){
tips.push('A entrada ideal costuma ser 20% do valor para melhores condições.');
tips.push('Não esqueça dos custos de escritura, ITBI e documentação.');
tips.push('Enquanto junta, estude o mercado e as regiões de interesse.');
}else if(/aposentadoria|aposentar|futuro/.test(nome)){
tips.push('Quanto antes começar, menor o aporte mensal necessário.');
tips.push('Diversifique: previdência privada, Tesouro, FIIs e ações no longo prazo.');
tips.push('Use a regra dos 4%: patrimônio = gasto anual desejado x 25.');
}else if(/estudo|estudos|faculdade|curso|graduação|graduacao|universidade|p��s|pos|mba/.test(nome)){
tips.push('Verifique programas de bolsa, ProUni e financiamento estudantil (FIES).');
tips.push('Inclua no orçamento: mensalidade, livros, transporte e material.');
tips.push('Comece a guardar antes do início do curso para ter folga no primeiro ano.');
}else if(/casamento|casar|festa|bodas|cerimônia/.test(nome)){
tips.push('Defina prioridades: lista de convidados e itens essenciais primeiro.');
tips.push('Pesquise fornecedores com antecedência e negocie pacotes.');
tips.push('Deixe uma margem de 10–15% para imprevistos no grande dia.');
}else if(/reforma|reformar|móveis|moveis|decorar/.test(nome)){
tips.push('Faça orçamentos em pelo menos 3 fornecedores antes de fechar.');
tips.push('Priorize itens que trazem segurança e valor (elétrica, hidráulica).');
tips.push('Compre por etapas para não comprometer todo o orçamento de uma vez.');
}else if(/investimento|investir|renda|patrimônio/.test(nome)){
tips.push('Antes de investir, garanta a reserva de emergência (6 meses de gastos).');
tips.push('Diversifique: renda fixa, ações, FIIs e ativos no exterior.');
tips.push('Aporte regular (mesmo valor todo mês) reduz o risco de timing.');
}else{
tips.push('Defina um prazo realista e ajuste o valor mensal ao seu orçamento.');
tips.push('Automatize: transfira no mesmo dia do salário para a meta.');
tips.push('Celebre cada marco (25%, 50%, 75%) para manter a motivação.');
}
return tips;
}

function getNextMilestone(alvo,atual){
if(!alvo||alvo<=0)return null;
var pct=alvo>0?(atual/alvo)*100:0;
var milestones=[25,50,75,100];
for(var i=0;i<milestones.length;i++){if(pct<milestones[i]){var v=Math.round(alvo*milestones[i]/100);return{label:milestones[i]+'%',value:v};}
}return null;
}

function getMetaSavingsSuggestion(){
var now=new Date();
var curMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var rec=0,desp=0;
if(typeof entries!=='undefined'&&entries.length){entries.forEach(function(e){if(e.date&&e.date.substring(0,7)===curMonth){if(e.type==='receita')rec+=e.value;else if(e.type==='despesa')desp+=e.value;}});}
var sobra=rec-desp;
if(sobra<=0)return null;
var sugerido=Math.round(sobra*0.2);
return{sobra:sobra,sugerido:sugerido,rec:rec,desp:desp};
}

function getTotalMetasNeeded(){
var total=0;
if(!goals||!goals.length)return 0;
goals.forEach(function(g){var pl=getMetaPlanner(g);if(!pl.jaAtingida&&pl.aporteMensal>0)total+=pl.aporteMensal;});
return Math.round(total);
}

function applyMetaTemplate(tipo){
var now=new Date();
var y=now.getFullYear(),m=now.getMonth();
var curMonth=y+'-'+String(m+1).padStart(2,'0');
var desp=0;
if(typeof entries!=='undefined'&&entries.length){entries.forEach(function(e){if(e.date&&e.date.substring(0,7)===curMonth&&e.type==='despesa')desp+=e.value;});}
var nom='',alvo=0,prazo='';
if(tipo==='reserva'){nom='Reserva de emergência';alvo=Math.max(Math.round(desp*6),3000);var d=new Date(y,m+1,1);d.setMonth(d.getMonth()+18);prazo=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';}
else if(tipo==='viagem'){nom='Viagem';alvo=5000;var d2=new Date(y,m+1,1);d2.setMonth(d2.getMonth()+11);prazo=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0')+'-01';}
else if(tipo==='entrada'){nom='Entrada para imóvel';alvo=50000;var d3=new Date(y,m+1,1);d3.setFullYear(d3.getFullYear()+5);prazo=d3.getFullYear()+'-'+String(d3.getMonth()+1).padStart(2,'0')+'-01';}
else if(tipo==='carro'){nom='Carro';alvo=30000;var d4=new Date(y,m+1,1);d4.setFullYear(d4.getFullYear()+3);prazo=d4.getFullYear()+'-'+String(d4.getMonth()+1).padStart(2,'0')+'-01';}
var n=document.getElementById('metaNome');var a=document.getElementById('metaAlvo');var p=document.getElementById('metaPrazo');
if(n)n.value=nom;if(a)a.value=alvo;if(p&&prazo)p.value=prazo;
toast(typeof t==='function'?t('toast_template_aplicado'):'Template aplicado. Ajuste valores e prazo se quiser.','ok');
}

function addValToGoal(goalId,val){
var g=goals.find(function(x){return x.id===goalId});if(!g)return;
var atual=parseFloat(g.atual)||parseFloat(g.current)||0;
var novo=Math.round((atual+val)*100)/100;
g.atual=g.current=novo;
saveData();renderAll();
toast('+ '+fmt(val)+' em "'+(g.nome||g.name)+'"','ok');
}

function editMetaAtual(id){
var g=goals.find(function(x){return x.id===id});if(!g)return;
var nome=g.nome||g.name||'Meta';var atualVal=parseFloat(g.atual)||parseFloat(g.current)||0;
var nv=prompt('Novo valor atual de "'+nome+'" (R$):',atualVal);
if(nv===null)return;nv=parseFloat(nv);
if(isNaN(nv)||nv<0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
var val=Math.round(nv*100)/100;
g.atual=g.current=val;
saveData();renderAll();toast(typeof t==='function'?t('toast_meta_atualizada'):'Meta atualizada!','ok');
}

function rMetas(){
var emptyEl=document.getElementById('metasEmpty');
var filledEl=document.getElementById('metasFilled');
if(emptyEl&&filledEl){emptyEl.style.display=goals.length===0?'block':'none';filledEl.style.display=goals.length>0?'block':'none';}
if(goals.length===0){if(typeof lucide!=='undefined')lucide.createIcons();return;}

// KPI cards
var ativas=goals.filter(function(g){return getMetaPct(g)<100;});
var concluidas=goals.filter(function(g){return getMetaPct(g)>=100;});
var totalGuardado=goals.reduce(function(s,g){return s+(parseFloat(g.atual||g.current)||0);},0);
var maisProxima=ativas.length>0?Math.max.apply(null,ativas.map(function(g){return getMetaPct(g);})):0;
var kpiEl=document.getElementById('metasKpiGrid');
if(kpiEl){
  var kpis=[
    {label:'Metas Ativas',value:ativas.length,icon:'target',color:'#3b82f6'},
    {label:'Total Guardado',value:fmt(totalGuardado),icon:'wallet',color:'#10B981'},
    {label:'Mais Próxima',value:maisProxima.toFixed(0)+'%',icon:'trending-up',color:'#8b5cf6'},
    {label:'Concluídas',value:concluidas.length,icon:'check-circle-2',color:'#10B981'},
  ];
  kpiEl.innerHTML=kpis.map(function(k){
    return '<div class="metas-kpi-card">'+
      '<div class="metas-kpi-icon" style="background:'+k.color+'18"><i data-lucide="'+k.icon+'" style="width:20px;height:20px;color:'+k.color+'"></i></div>'+
      '<div><div class="metas-kpi-label">'+k.label+'</div><div class="metas-kpi-value">'+k.value+'</div></div>'+
    '</div>';
  }).join('');
}

// Progresso geral (só metas ativas)
var totalTarget=ativas.reduce(function(s,g){return s+(parseFloat(g.alvo||g.target)||0);},0);
var totalCurrent=ativas.reduce(function(s,g){return s+(parseFloat(g.atual||g.current)||0);},0);
var overallPct=totalTarget>0?Math.min(Math.round(totalCurrent/totalTarget*100),100):0;
var pgEl=document.getElementById('metasProgressGeral');
if(pgEl&&ativas.length>0){
  pgEl.style.display='block';
  pgEl.innerHTML='<div class="metas-progress-geral-header">'+
    '<div class="metas-progress-geral-title"><i data-lucide="sparkles" style="width:15px;height:15px;color:var(--vr)"></i> Progresso Geral</div>'+
    '<div class="metas-progress-geral-sub">'+fmt(totalCurrent)+' de '+fmt(totalTarget)+' nas metas ativas</div>'+
  '</div>'+
  '<div class="metas-progress-geral-bar"><div class="metas-progress-geral-fill" style="width:'+overallPct+'%"></div></div>'+
  '<div class="metas-progress-geral-pct">'+overallPct+'% concluído</div>';
}else if(pgEl)pgEl.style.display='none';

// Cards + IA tip
renderMetasCards();
renderMetasIaTip();
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},60);
}

// ORÇAMENTO (redesenhado)
var orcamentoViewMonth='';
var ORC_CATEGORIAS=[{nome:'Moradia',cor:'#4C7BF4',lucide:'home'},{nome:'Transporte',cor:'#00B4D8',lucide:'car'},{nome:'Alimentação',cor:'#FF7A00',lucide:'utensils'},{nome:'Saúde',cor:'#FF6B9D',lucide:'heart'},{nome:'Educação',cor:'#8A05BE',lucide:'graduation-cap'},{nome:'Lazer',cor:'#F59E0B',lucide:'gamepad-2'},{nome:'Cartões',cor:'#7C3AED',lucide:'credit-card'},{nome:'Empréstimos',cor:'#EF4444',lucide:'landmark'},{nome:'Assinaturas',cor:'#14B8A6',lucide:'refresh-cw'},{nome:'Investimentos',cor:'#10B981',lucide:'trending-up'},{nome:'Transferência',cor:'#6B7280',lucide:'arrow-left-right'},{nome:'Outros',cor:'#6B7280',lucide:'more-horizontal'}];
function getOrcamentoMonthKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function getReceitasMes(ym){return entries.filter(function(e){return e.type==='receita'&&e.date.substring(0,7)===ym}).reduce(function(s,e){return s+e.value},0);}
function getGastosMes(ym){return entries.filter(function(e){return e.type==='despesa'&&e.date.substring(0,7)===ym}).reduce(function(s,e){return s+e.value},0);}
function getCatSpentMes(ym){var o={};entries.filter(function(e){return e.type==='despesa'&&e.date.substring(0,7)===ym}).forEach(function(e){o[e.category]=(o[e.category]||0)+e.value});return o;}
function getRendaMediaUltimos3Meses(){
var now=new Date();var total=0,count=0;
for(var i=0;i<3;i++){var y=now.getFullYear(),m=now.getMonth()-i;if(m<0){m+=12;y--}var ym=y+'-'+String(m+1).padStart(2,'0');total+=getReceitasMes(ym);count++;}
return count>0?Math.round(total/count*100)/100:0;
}
function rOrc(){
if(!document.getElementById('orcamentoWrap'))return;
if(!orcamentoViewMonth)orcamentoViewMonth=getOrcamentoMonthKey();
var orc=orcamentosByMonth[orcamentoViewMonth];
var emptyEl=document.getElementById('orcamentoEmpty');
var filledEl=document.getElementById('orcamentoFilled');
var tit=document.getElementById('orcamentoMonthTitle');
var mesNomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var parts=orcamentoViewMonth.split('-');
tit.textContent=mesNomes[parseInt(parts[1],10)-1]+' '+parts[0];
var rec=getReceitasMes(orcamentoViewMonth);
var gastos=getGastosMes(orcamentoViewMonth);
emptyEl.style.display=orc?'none':'block';
filledEl.style.display=orc?'block':'none';
// Mostrar botões do header ao ter orçamento
var pageActions=document.getElementById('orcPageActions');
if(pageActions)pageActions.style.display=orc?'flex':'none';
if(emptyEl.style.display==='block'){
var copyBtn=document.getElementById('orcamentoCopyPrevBtn');
if(copyBtn){
var prevMonth=getOrcamentoMonthKey(new Date(parseInt(parts[0],10),parseInt(parts[1],10)-2,1));
var hasPrev=!!orcamentosByMonth[prevMonth];
copyBtn.disabled=!hasPrev;
copyBtn.title=hasPrev?'Copiar orçamento de '+prevMonth:'Não há planejamento no mês anterior';
if(hasPrev){copyBtn.removeAttribute('data-state');copyBtn.innerHTML='<i data-lucide="copy" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Copiar do mês anterior';if(typeof lucide!=='undefined')lucide.createIcons();}
else{copyBtn.setAttribute('data-state','no-prev');copyBtn.textContent=typeof t==='function'?t('sem_planejamento_anterior'):'Sem planejamento anterior';}
}
}
if(orc&&filledEl.style.display==='block'){
var filledKpis=document.getElementById('orcamentoFilledKpis');
var gastosReais=getGastosMes(orcamentoViewMonth);
var rendaO=orc.rendaMensal||0;
var totalPlan=orc.orcamentoTotal||0;
var econReal=rendaO-gastosReais;
var econPctReal=rendaO>0?Math.round(econReal/rendaO*100):0;
// KPIs v2
var kpiDefs=[
{label:'Receitas do Mês',value:fmt(rendaO),icon:'trending-up',color:'#10b981',badge:null},
{label:'Gastos Planejados',value:fmt(totalPlan),icon:'pie-chart',color:'#3b82f6',badge:null},
{label:'Gastos Reais',value:fmt(gastosReais),icon:'trending-down',color:'#ef4444',badge:totalPlan>0?(gastosReais<=totalPlan?{txt:'Dentro',cls:'up'}:{txt:'Acima',cls:'down'}):null},
{label:'Economia Real',value:econPctReal+'%',icon:'wallet',color:'#10b981',badge:econPctReal>0?{txt:'+'+econPctReal+'%',cls:'up'}:null},
];
filledKpis.className='orc-kpis-v2';
filledKpis.innerHTML=kpiDefs.map(function(k){
return '<div class="orc-kpi-v2">'+
'<div class="orc-kpi-v2-top">'+
'<div class="orc-kpi-v2-icon" style="background:'+k.color+'18"><i data-lucide="'+k.icon+'" style="width:18px;height:18px;color:'+k.color+'"></i></div>'+
(k.badge?'<span class="orc-kpi-v2-badge '+k.badge.cls+'">'+k.badge.txt+'</span>':'<span></span>')+
'</div>'+
'<div class="orc-kpi-v2-label">'+k.label+'</div>'+
'<div class="orc-kpi-v2-value">'+k.value+'</div>'+
'</div>';
}).join('');
// Overview bar
var overEl=document.getElementById('orcOverviewBar');
if(overEl&&totalPlan>0){
overEl.style.display='block';
var usePct=Math.min(Math.round(gastosReais/totalPlan*100),100);
var overAmt=gastosReais>totalPlan?gastosReais-totalPlan:0;
var catSpentTemp=getCatSpentMes(orcamentoViewMonth);var catsTemp=orc.categorias||{};
var overCount=ORC_CATEGORIAS.filter(function(c){return (catsTemp[c.nome]||0)>0&&(catSpentTemp[c.nome]||0)>(catsTemp[c.nome]||0);}).length;
var fillColor=gastosReais>totalPlan?'#ef4444':'var(--vr)';
overEl.innerHTML='<div class="orc-overview-bar-header">'+
'<div class="orc-overview-bar-title">Uso do Orçamento Total</div>'+
'<div class="orc-overview-bar-info">'+
'<span>Gasto: <strong>'+fmt(gastosReais)+'</strong></span>'+
'<span>Planejado: <strong>'+fmt(totalPlan)+'</strong></span>'+
(overCount>0?'<span class="over">'+overCount+' categoria(s) acima</span>':'')+
'</div></div>'+
'<div class="orc-overview-track"><div class="orc-overview-fill" style="width:'+usePct+'%;background:'+fillColor+'"></div></div>'+
'<div class="orc-overview-pct" style="color:'+fillColor+'">'+usePct+'% utilizado'+(overAmt>0?' — '+fmt(overAmt)+' acima':' — '+fmt(totalPlan-gastosReais)+' disponível')+'</div>';
}
// Bar chart (Planejado vs Real — últimos 6 meses)
renderOrcBarChart();
// Pie chart (Distribuição de gastos)
renderOrcPieChart(orc);
// Category cards v2
var catSpent=getCatSpentMes(orcamentoViewMonth);
var cats=orc.categorias||{};
var listHtml='';
for(var i=0;i<ORC_CATEGORIAS.length;i++){
var c=ORC_CATEGORIAS[i];
var lim=cats[c.nome]||0;
if(lim<=0)continue;
var spent=catSpent[c.nome]||0;
var pct=lim>0?Math.min((spent/lim)*100,100):0;
var over=spent>lim;
var warn=!over&&pct>=90;
var badgeCls=over?'over':warn?'warn':'ok';
var badgeTxt=over?'⚠ Acima':warn?'⚠ Atenção':'✓ OK';
var barFill=over?'#ef4444':warn?'#f59e0b':c.cor;
var pctTxt=pct.toFixed(0)+'%';
var available=over?'−'+fmt(spent-lim)+' acima':fmt(lim-spent)+' disponível';
listHtml+='<div class="orc-cat-v2">'+
'<div class="orc-cat-v2-glow" style="background:'+c.cor+'"></div>'+
'<div class="orc-cat-v2-head">'+
'<div class="orc-cat-v2-icon" style="background:'+c.cor+'18"><i data-lucide="'+c.lucide+'" style="width:18px;height:18px;color:'+c.cor+'"></i></div>'+
'<span class="orc-cat-v2-name">'+escapeHtml(c.nome)+'</span>'+
'<span class="orc-cat-v2-badge '+badgeCls+'">'+badgeTxt+'</span>'+
'<span class="orc-cat-v2-pct" style="color:'+barFill+'">'+pctTxt+'</span>'+
'</div>'+
'<div class="orc-cat-v2-bar"><div class="orc-cat-v2-fill" style="width:'+pct+'%;background:'+barFill+'"></div></div>'+
'<div class="orc-cat-v2-vals"><span>'+fmt(spent)+' de '+fmt(lim)+' planejados</span><span>'+available+'</span></div>'+
'</div>';
}
document.getElementById('orcamentoFilledList').innerHTML=listHtml||'<p style="color:var(--t2);font-size:.9rem;padding:20px 0">Nenhuma categoria com limite definido.</p>';
// IA Insight
renderOrcIaTip(orc,cats,catSpent);
}
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},60);
}
var _orcBarChartInst=null;
var _orcPieChartInst=null;
var _orcIaTipLoaded=false;
var _orcIaTipMonth='';

function renderOrcBarChart(){
var wrap=document.getElementById('orcBarChartWrap');
var canvas=document.getElementById('orcBarChart');
if(!wrap||!canvas)return;
var now=new Date();
var labels=[],planData=[],realData=[];
for(var i=5;i>=0;i--){var y=now.getFullYear(),m=now.getMonth()-i;if(m<0){m+=12;y--;}var ym=y+'-'+String(m+1).padStart(2,'0');var mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];labels.push(mn[m]);planData.push((orcamentosByMonth[ym]&&orcamentosByMonth[ym].orcamentoTotal)||0);realData.push(getGastosMes(ym));}
var hasData=planData.some(function(v){return v>0;})||realData.some(function(v){return v>0;});
if(!hasData){wrap.style.display='none';return;}
wrap.style.display='block';
if(_orcBarChartInst){_orcBarChartInst.destroy();_orcBarChartInst=null;}
var isDark=!document.body.classList.contains('light');
var gridColor=isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
var tickColor=isDark?'#6b8aaa':'#64748b';
_orcBarChartInst=new Chart(canvas,{type:'bar',data:{labels:labels,datasets:[
{label:'Planejado',data:planData,backgroundColor:'rgba(59,130,246,.25)',borderColor:'rgba(59,130,246,.6)',borderRadius:4,barPercentage:.55},
{label:'Real',data:realData,backgroundColor:'#3b82f6',borderColor:'#3b82f6',borderRadius:4,barPercentage:.55}
]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+fmt(ctx.parsed.y);}}}},scales:{x:{grid:{color:gridColor},ticks:{color:tickColor,font:{size:10}}},y:{grid:{color:gridColor},ticks:{color:tickColor,font:{size:10},callback:function(v){return 'R$'+Math.round(v/1000)+'k';}}}}}});
}

function renderOrcPieChart(orc){
var wrap=document.getElementById('orcPieChartWrap');
var canvas=document.getElementById('orcPieChart');
if(!wrap||!canvas||!orc)return;
var catSpent=getCatSpentMes(orcamentoViewMonth);
var cats=orc.categorias||{};
var pieLabels=[],pieData=[],pieColors=[];
ORC_CATEGORIAS.forEach(function(c){var spent=catSpent[c.nome]||0;if(spent>0&&(cats[c.nome]||0)>0){pieLabels.push(c.nome);pieData.push(Math.round(spent));pieColors.push(c.cor);}});
if(!pieData.length){wrap.style.display='none';return;}
wrap.style.display='block';
var sub=document.getElementById('orcPieChartSub');
if(sub){var mesNomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];var parts=orcamentoViewMonth.split('-');sub.textContent=mesNomes[parseInt(parts[1],10)-1]+' '+parts[0];}
if(_orcPieChartInst){_orcPieChartInst.destroy();_orcPieChartInst=null;}
_orcPieChartInst=new Chart(canvas,{type:'doughnut',data:{labels:pieLabels,datasets:[{data:pieData,backgroundColor:pieColors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': '+fmt(ctx.parsed);}}}}}});
var legend=document.getElementById('orcPieLegend');
if(legend){legend.innerHTML=pieLabels.map(function(l,i){return '<div class="orc-pie-legend-item"><span class="orc-pie-legend-dot" style="background:'+pieColors[i]+'"></span><span class="text-truncate">'+l+'</span></div>';}).join('');}
}

function renderOrcIaTip(orc,cats,catSpent){
var tipEl=document.getElementById('orcIaTip');
if(!tipEl)return;
if(_orcIaTipLoaded&&_orcIaTipMonth===orcamentoViewMonth)return;
_orcIaTipMonth=orcamentoViewMonth;
tipEl.style.display='flex';
tipEl.innerHTML='<div class="metas-ia-tip-icon"><i data-lucide="sparkles" style="width:22px;height:22px;color:var(--vr)"></i></div>'+
'<div class="metas-ia-tip-body"><div class="metas-ia-tip-title">Insight do Consultor IA</div>'+
'<div class="metas-ia-tip-text" id="orcIaTipText" style="color:var(--t3)">Analisando seu orçamento...</div></div>';
if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},50);
try{
var user=firebase.auth().currentUser;if(!user)return;
var gastosReais=getGastosMes(orcamentoViewMonth);
var totalPlan=orc.orcamentoTotal||0;
var catSummary=ORC_CATEGORIAS.filter(function(c){return (cats[c.nome]||0)>0;}).map(function(c){var l=cats[c.nome]||0;var s=catSpent[c.nome]||0;var pct=l>0?Math.round(s/l*100):0;return c.nome+': '+pct+'% ('+fmt(s)+'/'+fmt(l)+')';}).join('; ');
var prompt='Analise o orçamento do usuário e dê UMA observação prática e específica em no máximo 2 frases curtas. Seja direto. Gastos totais: '+fmt(gastosReais)+'/'+fmt(totalPlan)+' planejados. Categorias: '+catSummary+'. Destaque a categoria mais fora do limite ou um ponto positivo se tudo estiver ok.';
var callIAFn=firebase.functions().httpsCallable('chatApi');
callIAFn({message:prompt,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
var reply=data.reply||'Continue monitorando seus gastos por categoria! 💪';
reply=reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n+/g,' ').trim();
var sentences=reply.match(/[^.!?]+[.!?]+/g);if(sentences&&sentences.length>2)reply=sentences.slice(0,2).join(' ');
var textEl=document.getElementById('orcIaTipText');
if(textEl){textEl.style.color='';textEl.innerHTML=reply;}
var tipNow=document.getElementById('orcIaTip');
if(tipNow){tipNow.insertAdjacentHTML('beforeend','<button class="metas-ia-tip-btn" onclick="go(\'ia\');setTimeout(function(){iaAnalyze(\'metas\');},350)">Ver análise →</button>');}
_orcIaTipLoaded=true;
if(typeof lucide!=='undefined')lucide.createIcons();
}).catch(function(){
var textEl=document.getElementById('orcIaTipText');
if(textEl){textEl.style.color='';textEl.innerHTML='Continue monitorando seus limites por categoria para manter as finanças saudáveis! 💙';}
_orcIaTipLoaded=true;
});
}catch(e){_orcIaTipLoaded=false;}
}

function orcamentoPrevMonth(){
var parts=orcamentoViewMonth.split('-');
var y=parseInt(parts[0],10),m=parseInt(parts[1],10);
var d=new Date(y,m-2,1);
orcamentoViewMonth=getOrcamentoMonthKey(d);
_orcIaTipLoaded=false;
rOrc();
}
function orcamentoNextMonth(){
var parts=orcamentoViewMonth.split('-');
var y=parseInt(parts[0],10),m=parseInt(parts[1],10);
var d=new Date(y,m,1);
orcamentoViewMonth=getOrcamentoMonthKey(d);
_orcIaTipLoaded=false;
rOrc();
}
function orcamentoOpenWizard(edit){
var step1=document.getElementById('orcamentoStep1');
var step2=document.getElementById('orcamentoStep2');
var modalOv=document.getElementById('orcamentoModalOv');
if(modalOv)modalOv.classList.add('show');
if(step1)step1.style.display='block';
if(step2)step2.style.display='none';
document.getElementById('orcamentoBreadcrumb').innerHTML='<span class="crumb-active">● Renda mensal</span> → <span class="crumb-done">○ Categorias</span>';
var orc=orcamentosByMonth[orcamentoViewMonth];
var rendaVal=orc&&orc.rendaMensal?Number(orc.rendaMensal):(getRendaMediaUltimos3Meses()||0);
var rendaNum=parseFloat(rendaVal)||0;
var rendaInput=document.getElementById('orcRenda');
if(rendaNum<=0)rendaInput.value='';
else{var reais=Math.floor(rendaNum);var cent=Math.round((rendaNum%1)*100);rendaInput.value='R$ '+reais.toLocaleString('pt-BR').replace(/\s/g,'')+','+String(cent).padStart(2,'0');}
document.getElementById('orcEconomiaPct').value=orc&&orc.metaEconomia!=null?orc.metaEconomia:20;
orcamentoCalcRenda();
if(typeof lucide!=='undefined')lucide.createIcons();
}
function orcamentoOpenAddCategorias(){
var orc=orcamentosByMonth[orcamentoViewMonth];
if(!orc||!orc.rendaMensal){orcamentoOpenWizard(true);return;}
var step1=document.getElementById('orcamentoStep1');
var step2=document.getElementById('orcamentoStep2');
var modalOv=document.getElementById('orcamentoModalOv');
if(modalOv)modalOv.classList.add('show');
var renda=Number(orc.rendaMensal)||0;
var pct=orc.metaEconomia!=null?orc.metaEconomia:20;
var rendaInput=document.getElementById('orcRenda');
if(renda>0){var reais=Math.floor(renda);var cent=Math.round((renda%1)*100);rendaInput.value='R$ '+reais.toLocaleString('pt-BR').replace(/\s/g,'')+','+String(cent).padStart(2,'0');}
document.getElementById('orcEconomiaPct').value=pct;
if(step1)step1.style.display='none';
if(step2)step2.style.display='flex';
document.getElementById('orcamentoBreadcrumb').innerHTML='<span class="crumb-done">✓ Renda mensal</span> → <span class="crumb-active">● Adicionar categorias</span>';
var orcamentoTotal=renda*(1-pct/100);
var cats=orc.categorias||{};
var listHtml='';
for(var i=0;i<ORC_CATEGORIAS.length;i++){
var c=ORC_CATEGORIAS[i];
var val=cats[c.nome]||'';
listHtml+='<div class="orc-cat-card"><div class="orc-cat-card-head"><div class="orc-cat-card-icon" style="background:'+c.cor+'20"><i data-lucide="'+c.lucide+'" style="color:'+c.cor+'"></i></div><span class="orc-cat-card-name">'+escapeHtml(c.nome)+'</span></div>'+
'<input type="text" class="orc-cat-card-input" id="orc_cat_'+i+'" value="'+val+'" placeholder="R$ 0,00" data-nome="'+escapeHtml(c.nome)+'" oninput="orcamentoUpdateSidebar()">'+
'<div class="orc-cat-card-bar"><div id="orc_bar_'+i+'" class="orc-cat-card-bar-fill" style="width:0%;background:'+c.cor+'"></div></div><div class="orc-cat-card-pct" id="orc_bar_pct_'+i+'">0%</div></div>';
}
document.getElementById('orcamentoCategoriasList').innerHTML=listHtml;
var sumEl=document.getElementById('orcStep2SummaryTotal');
if(sumEl)sumEl.textContent='R$ '+(orcamentoTotal.toFixed(2).replace('.',','));
window._orcamentoRenda=renda;
window._orcamentoEconomiaPct=pct;
window._orcamentoTotalDisponivel=orcamentoTotal;
orcamentoUpdateSidebar();
if(typeof lucide!=='undefined')lucide.createIcons();
}
function closeOrcamentoModal(){
var modalOv=document.getElementById('orcamentoModalOv');
if(modalOv)modalOv.classList.remove('show');
}
function orcamentoVoltarStep1(){
document.getElementById('orcamentoStep1').style.display='block';
document.getElementById('orcamentoStep2').style.display='none';
document.getElementById('orcamentoBreadcrumb').innerHTML='<span class="crumb-active">● Renda mensal</span> → <span class="crumb-done">○ Categorias</span>';
}
function orcamentoFormatRenda(inputEl){
var v=inputEl.value.replace(/\D/g,'');
if(v.length===0){inputEl.value='';return;}
var num=parseInt(v,10);
if(v.length<=2)inputEl.value=num===0?'':'R$ 0,'+String(num).padStart(2,'0');
else{var reais=Math.floor(num/100);var cent=num%100;inputEl.value='R$ '+reais.toLocaleString('pt-BR').replace(/\s/g,'')+','+String(cent).padStart(2,'0');}
}
function orcamentoCalcRenda(){
var v=document.getElementById('orcRenda').value;
var raw=v.replace(/\D/g,'')||'0';
var renda=parseFloat(raw)||0;
if(raw.length>2)renda=parseFloat(raw.slice(0,-2)+'.'+raw.slice(-2))||0;
var pct=parseInt(document.getElementById('orcEconomiaPct').value,10)||0;
document.getElementById('orcEconomiaPctVal').textContent=pct+'%';
var gastosOrc=renda*(1-pct/100);
var econVal=renda*pct/100;
document.getElementById('orcResultadoValor').textContent='R$ '+(gastosOrc.toFixed(2).replace('.',','));
document.getElementById('orcResultadoEconomia').textContent='R$ '+(econVal.toFixed(2).replace('.',','));
}
function orcamentoGoStep2(){
var v=document.getElementById('orcRenda').value;
var raw=v.replace(/\D/g,'')||'0';
var renda=parseFloat(raw)||0;
if(raw.length>2)renda=parseFloat(raw.slice(0,-2)+'.'+raw.slice(-2))||0;
if(renda<=0){toast(typeof t==='function'?t('toast_informe_renda'):'Informe sua renda mensal','err');return;}
document.getElementById('orcamentoStep1').style.display='none';
document.getElementById('orcamentoStep2').style.display='flex';
document.getElementById('orcamentoBreadcrumb').innerHTML='<span class="crumb-done">✓ Renda mensal</span> → <span class="crumb-active">● Categorias</span>';
var pct=parseInt(document.getElementById('orcEconomiaPct').value,10)||0;
var orcamentoTotal=renda*(1-pct/100);
var orc=orcamentosByMonth[orcamentoViewMonth];
var cats=orc&&orc.categorias?orc.categorias:{};
var listHtml='';
for(var i=0;i<ORC_CATEGORIAS.length;i++){
var c=ORC_CATEGORIAS[i];
var val=cats[c.nome]||'';
listHtml+='<div class="orc-cat-card"><div class="orc-cat-card-head"><div class="orc-cat-card-icon" style="background:'+c.cor+'20"><i data-lucide="'+c.lucide+'" style="color:'+c.cor+'"></i></div><span class="orc-cat-card-name">'+escapeHtml(c.nome)+'</span></div>'+
'<input type="text" class="orc-cat-card-input" id="orc_cat_'+i+'" value="'+val+'" placeholder="R$ 0,00" data-nome="'+escapeHtml(c.nome)+'" oninput="orcamentoUpdateSidebar()">'+
'<div class="orc-cat-card-bar"><div id="orc_bar_'+i+'" class="orc-cat-card-bar-fill" style="width:0%;background:'+c.cor+'"></div></div><div class="orc-cat-card-pct" id="orc_bar_pct_'+i+'">0%</div></div>';
}
document.getElementById('orcamentoCategoriasList').innerHTML=listHtml;
document.getElementById('orcStep2SummaryTotal').textContent='R$ '+(orcamentoTotal.toFixed(2).replace('.',','));
window._orcamentoRenda=renda;
window._orcamentoEconomiaPct=pct;
window._orcamentoTotalDisponivel=orcamentoTotal;
orcamentoUpdateSidebar();
if(typeof lucide!=='undefined')lucide.createIcons();
}
function orcamentoUpdateSidebar(){
var totalDisponivel=window._orcamentoTotalDisponivel||0;
var soma=0;
for(var i=0;i<ORC_CATEGORIAS.length;i++){
var el=document.getElementById('orc_cat_'+i);
if(!el)continue;
var raw=String(el.value).replace(/\./g,'').replace(',','.');
var v=parseFloat(raw)||0;
if(String(el.value).indexOf(',')>=0){var r=String(el.value).replace(/\D/g,'');if(r.length>2)v=parseFloat(r.slice(0,-2)+'.'+r.slice(-2))||0;}
soma+=v;
var barEl=document.getElementById('orc_bar_'+i);
var pctEl=document.getElementById('orc_bar_pct_'+i);
var pctCat=totalDisponivel>0?Math.min((v/totalDisponivel)*100,100):0;
if(barEl){barEl.style.width=pctCat.toFixed(0)+'%';}
if(pctEl)pctEl.textContent=pctCat.toFixed(0)+'%';
}
var pctBar=totalDisponivel>0?Math.min((soma/totalDisponivel)*100,100):0;
var disp=totalDisponivel-soma;
var summaryDist=document.getElementById('orcStep2SummaryDistribuido');
var summaryDisp=document.getElementById('orcStep2SummaryDisponivel');
var summaryBar=document.getElementById('orcStep2SummaryBar');
if(summaryDist)summaryDist.textContent='R$ '+(soma.toFixed(2).replace('.',','));
if(summaryDisp)summaryDisp.textContent='R$ '+(disp.toFixed(2).replace('.',','));
if(summaryBar){summaryBar.style.width=pctBar+'%';summaryBar.className='orc-step2-summary-bar-fill'+(pctBar>100?' danger':pctBar>=90?' warn':'');}
document.getElementById('orcamentoSaveBtn').disabled=disp<0;
if(typeof lucide!=='undefined')lucide.createIcons();
}
function orcamentoSavePlan(){
var renda=window._orcamentoRenda||0;
var pct=window._orcamentoEconomiaPct||20;
var valorEconomia=renda*pct/100;
var categorias={};
for(var i=0;i<ORC_CATEGORIAS.length;i++){
var el=document.getElementById('orc_cat_'+i);
if(!el)continue;
var s=String(el.value).replace(/\./g,'').replace(',','.');
var v=parseFloat(s)||0;
if(String(el.value).indexOf(',')>=0){var r=el.value.replace(/\D/g,'');if(r.length>2)v=parseFloat(r.slice(0,-2)+'.'+r.slice(-2))||0;}
if(v>0)categorias[ORC_CATEGORIAS[i].nome]=v;
}
var totalOrc=Object.keys(categorias).reduce(function(s,k){return s+categorias[k]},0);
orcamentosByMonth[orcamentoViewMonth]={rendaMensal:renda,metaEconomia:pct,valorEconomia:valorEconomia,orcamentoTotal:totalOrc,categorias:categorias};
if(orcamentoViewMonth===getOrcamentoMonthKey()){budgets={};for(var k in categorias)budgets[k]=categorias[k];}
saveData();
closeOrcamentoModal();
toast(typeof t==='function'?t('toast_planejamento_salvo'):'Planejamento salvo!','ok');
rOrc();
if(Object.keys(orcamentosByMonth).length>0&&typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
}
function orcamentoCopyFromPrev(){
var parts=orcamentoViewMonth.split('-');
var prevMonth=getOrcamentoMonthKey(new Date(parseInt(parts[0],10),parseInt(parts[1],10)-2,1));
var prev=orcamentosByMonth[prevMonth];
if(!prev){toast(typeof t==='function'?t('toast_orcamento_sem_anterior'):'Não há orçamento no mês anterior','err');return;}
orcamentosByMonth[orcamentoViewMonth]={rendaMensal:prev.rendaMensal,metaEconomia:prev.metaEconomia,valorEconomia:prev.valorEconomia,orcamentoTotal:prev.orcamentoTotal,categorias:Object.assign({},prev.categorias)};
saveData();
toast(typeof t==='function'?t('toast_orcamento_copiado'):'Orçamento copiado do mês anterior!','ok');
rOrc();
}
function saveOrc(){
var despCats=userCats.filter(function(c){return ['Salário','Freela'].indexOf(c)<0});
despCats.forEach(function(cat){
var el=document.getElementById('orc_'+cat.replace(/[^a-zA-Z0-9]/g,'_'));
if(el){var v=parseFloat(el.value);if(v>0)budgets[cat]=v;else delete budgets[cat]}
});
saveData();renderAll();toast(typeof t==='function'?t('toast_orcamento_salvo'):'Orçamento salvo!','ok');
if(Object.keys(budgets).length>0&&typeof renderPrimeirosPassos==='function')renderPrimeirosPassos();
}

// DICAS INTELIGENTES
function getSmartTips(){
var tips=[];
var m=getMD();var mk=Object.keys(m).sort();
var td=0,tr=0;
entries.forEach(function(e){if(e.type==='despesa')td+=e.value;else tr+=e.value});
var catD={};entries.filter(function(e){return e.type==='despesa'}).forEach(function(e){catD[e.category]=(catD[e.category]||0)+e.value});
var topCat=Object.entries(catD).sort(function(a,b){return b[1]-a[1]});
var nm=mk.length||1;
if(tr>td)tips.push({title:'Saldo Positivo!',text:'Você gasta menos do que ganha. Direcione o excedente para investimentos.',color:'green'});
else if(td>0)tips.push({title:'Atenção ao Saldo',text:'Despesas superam receitas. Revise gastos urgente.',color:'red'});
if(topCat.length>0){var pct=td>0?((topCat[0][1]/td)*100).toFixed(0):'0';tips.push({title:topCat[0][0]+' = '+pct+'% dos gastos',text:'Maior categoria de despesa. Busque alternativas e negocie.',color:'yellow'})}
if(mk.length>=2){var last=m[mk[mk.length-1]].d,prev=m[mk[mk.length-2]].d;if(last<prev)tips.push({title:'Gastos em queda!',text:'Redução de '+fmt(prev-last)+' vs mês anterior. Continue assim!',color:'green'});else if(last>prev)tips.push({title:'Gastos subiram',text:'Aumento de '+fmt(last-prev)+' vs mês anterior. Revise.',color:'red'})}
tips.push({title:'Reserva de emergência',text:'Ideal: 6 meses de despesas. Sua meta: '+fmt((td/nm)*6),color:'blue'});
if(!entries.some(function(e){return e.category==='Investimentos'})&&investments.length===0)tips.push({title:'Comece a investir',text:'Mesmo R$50/mes fazem diferença com juros compostos!',color:'purple'});
if(catD['Assinaturas']>0)tips.push({title:'Revise assinaturas',text:'Gasto de '+fmt(catD['Assinaturas'])+' em assinaturas. Cancele as que não usa.',color:'yellow'});
// Orçamento alerts
var now=new Date();var curMonth=(now.getFullYear())+'-'+String(now.getMonth()+1).padStart(2,'0');
var catSpent={};entries.filter(function(e){return e.type==='despesa'&&e.date.substring(0,7)===curMonth}).forEach(function(e){catSpent[e.category]=(catSpent[e.category]||0)+e.value});
Object.keys(budgets).forEach(function(cat){
if(budgets[cat]>0&&catSpent[cat]){var pct=(catSpent[cat]/budgets[cat])*100;
if(pct>90)tips.push({title:'Orçamento estourado: '+cat,text:'Você já usou '+pct.toFixed(0)+'% do orçamento de '+cat+'!',color:'red'});
else if(pct>70)tips.push({title:'Atenção: '+cat,text:'Já usou '+pct.toFixed(0)+'% do orçamento. Cuidado!',color:'yellow'})}
});
return tips;
}

function getInvestTips(){
return [
{title:'Diversifique seus investimentos',text:'Não coloque todos os ovos na mesma cesta. Distribua entre renda fixa, ações, FIIs e cripto.',color:'blue'},
{title:'Tesouro Direto para iniciantes',text:'Tesouro Selic é ideal para reserva de emergência. Liquidez diária e baixo risco.',color:'green'},
{title:'FIIs: Renda passiva mensal',text:'Fundos Imobiliários pagam dividendos mensais isentos de IR para pessoa física.',color:'purple'},
{title:'ETFs: Diversificação fácil',text:'BOVA11 replica o Ibovespa. IVVB11 replica o S&P 500. Ideal para diversificar. (Apenas exemplos educativos, não constitui recomendação de investimento.)',color:'cyan'},
{title:'Ações: Pense no longo prazo',text:'Investir em ações e para quem tem horizonte de 5+ anos. Foque em empresas sólidas.',color:'yellow'},
{title:'CDB vs Poupança',text:'CDBs de bancos digitais rendem até 110% do CDI. Poupança rende apenas 70% da Selic.',color:'green'},
{title:'LCI/LCA: Isento de IR',text:'Letras de Crédito são isentas de IR para pessoa fisica. Ótimas para diversificar renda fixa.',color:'blue'},
{title:'Cripto: Alto risco, alto retorno',text:'Bitcoin e Ethereum são os mais consolidados. Nunca invista mais do que pode perder.',color:'red'},
{title:'Previdência Privada',text:'PGBL para quem declara IR completo. VGBL para declaração simplificada.',color:'purple'},
{title:'Rebalanceamento da carteira',text:'Revise sua alocação a cada 6 meses. Venda o que subiu muito e compre o que ficou barato.',color:'yellow'},
{title:'Aporte consistente vence timing',text:'Investir todo mês e mais eficiente do que tentar acertar o melhor momento.',color:'green'},
{title:'Taxa de administração importa',text:'Prefira fundos com taxa abaixo de 0.5%. Taxas altas corroem seu patrimônio.',color:'red'}
];
}

function getEduTips(){
return [
{title:'Regra 50-30-20',text:'50% necessidades, 30% desejos, 20% poupança e investimentos.',color:'blue'},
{title:'Juros do cartão',text:'Cartão cobra ate 400%/ano. Sempre pague o valor total da fatura.',color:'red'},
{title:'Pague-se primeiro',text:'Separe 10-20% para investimentos assim que receber o salário.',color:'green'},
{title:'Custo de vida',text:'Some todas despesas fixas = mínimo que precisa ganhar por mês.',color:'purple'},
{title:'Metas SMART',text:'"Guardar R$500/mes por 12 meses" é melhor que "quero economizar".',color:'yellow'},
{title:'Bola de Neve',text:'Quite a menor dívida primeiro, depois use o valor para a próxima.',color:'red'},
{title:'Juros compostos',text:'R$300/mês a 1%/mês = R$70.000+ em 10 anos. O tempo é seu aliado.',color:'green'},
{title:'Seguro e importante',text:'Protege seu patrimônio contra imprevistos. Avalie seguro de vida e residencial.',color:'blue'}
];
}

function rDicas(){
var tips=getSmartTips();
document.getElementById('tipsContainer').innerHTML=tips.length?tips.map(function(t){return '<div class="tip-card '+t.color+'"><div class="tip-title">'+t.title+'</div><div class="tip-text">'+t.text+'</div></div>'}).join(''):'<div class="empty"><p>Adicione lançamentos para receber dicas personalizadas!</p></div>';
document.getElementById('investTips').innerHTML=getInvestTips().map(function(t){return '<div class="tip-card '+t.color+'"><div class="tip-title">'+t.title+'</div><div class="tip-text">'+t.text+'</div></div>'}).join('');
document.getElementById('eduTips').innerHTML=getEduTips().map(function(t){return '<div class="tip-card '+t.color+'"><div class="tip-title">'+t.title+'</div><div class="tip-text">'+t.text+'</div></div>'}).join('');
}

// CONQUISTAS
var BADGES=[
{id:'first',lucide:'target',name:'Primeiro Passo',desc:'Fez 1 lançamento',check:function(){return entries.length>=1}},
{id:'ten',lucide:'hash',name:'Consistente',desc:'10 lançamentos',check:function(){return entries.length>=10}},
{id:'fifty',lucide:'dumbbell',name:'Determinado',desc:'50 lançamentos',check:function(){return entries.length>=50}},
{id:'hundred',lucide:'medal',name:'Centenário',desc:'100 lançamentos',check:function(){return entries.length>=100}},
{id:'income1',lucide:'wallet',name:'Salário!',desc:'Primeira receita',check:function(){return entries.some(function(e){return e.type==='receita'})}},
{id:'saver',lucide:'piggy-bank',name:'Poupador',desc:'Mes com saldo positivo',check:function(){var m=getMD();return Object.values(m).some(function(x){return x.r>x.d})}},
{id:'allcat',lucide:'layers',name:'Diversificado',desc:'5+ categorias usadas',check:function(){var s=new Set();entries.forEach(function(e){s.add(e.category)});return s.size>=5}},
{id:'week',lucide:'calendar',name:'Semanista',desc:'7 dias seguidos',check:function(){return getStreak()>=7}},
{id:'month',lucide:'calendar-days',name:'Mensalista',desc:'30 dias seguidos',check:function(){return getStreak()>=30}},
{id:'bigcut',lucide:'scissors',name:'Corte!',desc:'Reduziu despesas',check:function(){var m=getMD();var k=Object.keys(m).sort();return k.length>=2&&m[k[k.length-1]].d<m[k[k.length-2]].d}},
{id:'surplus',lucide:'rocket',name:'Superavit',desc:'3 meses positivos',check:function(){return Object.values(getMD()).filter(function(v){return v.r>v.d}).length>=3}},
{id:'debtfree',lucide:'party-popper',name:'Livre!',desc:'Quitou uma divida',check:function(){return entries.some(function(e){var d=(e.desc||'').toLowerCase();return d.indexOf('quitado')>=0||d.indexOf('quitação')>=0})}},
{id:'invest',lucide:'trending-up',name:'Investidor',desc:'Registrou investimento',check:function(){return investments.length>=1}},
{id:'lowspend',lucide:'trophy',name:'Econômico',desc:'Mes com despesa < R$3.000',check:function(){return Object.values(getMD()).some(function(v){return v.d>0&&v.d<3000})}},
{id:'organized',lucide:'star',name:'Organizado',desc:'Registros em todos os meses',check:function(){return Object.keys(getMD()).length>=Math.max(new Date().getMonth(),1)}},
{id:'metaset',lucide:'target',name:'Planejador',desc:'Criou uma meta',check:function(){return goals.length>=1}},
{id:'inv5',lucide:'briefcase',name:'Carteira Diversa',desc:'5+ investimentos',check:function(){return investments.length>=5}},
{id:'budget',lucide:'clipboard-list',name:'Orcamentista',desc:'Definiu orçamento',check:function(){return Object.keys(budgets).length>=1}},
{id:'edu_trail_1',lucide:'leaf',name:'Trilha Fundamentos',desc:'Completou a trilha Fundamentos',check:function(){return (finCompletedLessons||[]).filter(function(id){return id&&id.indexOf('edu_1_')===0}).length>=5}},
{id:'edu_trail_2',lucide:'trending-up',name:'Trilha Investimentos',desc:'Completou a trilha Investimentos',check:function(){return (finCompletedLessons||[]).filter(function(id){return id&&id.indexOf('edu_2_')===0}).length>=5}},
{id:'edu_trail_3',lucide:'brain',name:'Trilha Psicologia',desc:'Completou a trilha Psicologia do dinheiro',check:function(){return (finCompletedLessons||[]).filter(function(id){return id&&id.indexOf('edu_3_')===0}).length>=5}},
{id:'edu_trail_4',lucide:'home',name:'Trilha Metas',desc:'Completou a trilha Metas e planejamento',check:function(){return (finCompletedLessons||[]).filter(function(id){return id&&id.indexOf('edu_4_')===0}).length>=5}},
{id:'edu_trail_5',lucide:'bar-chart-2',name:'Trilha Análise',desc:'Completou a trilha Análise de investimentos',check:function(){return (finCompletedLessons||[]).filter(function(id){return id&&id.indexOf('edu_5_')===0}).length>=5}}
];

function checkAch(){
var nw=[];
BADGES.forEach(function(b){if(!achievements[b.id]&&b.check()){achievements[b.id]={date:new Date().toISOString()};nw.push(b)}});
if(nw.length>0){saveData();showCq(nw[0])}
}

function showCq(b){
var iconName=b.lucide||'award';
document.getElementById('cqEmoji').innerHTML='<i data-lucide="'+iconName+'" style="width:64px;height:64px;stroke:currentColor;stroke-width:2"></i>';
document.getElementById('cqTitle').textContent=b.name;
document.getElementById('cqDesc').textContent=b.desc;
document.getElementById('cqModal').classList.add('show');
if(typeof lucide!=='undefined')lucide.createIcons();
if(typeof celebrateLucide==='function')celebrateLucide();
}
function closeCq(){document.getElementById('cqModal').classList.remove('show')}

function rBadges(){
var n=Object.keys(achievements).length;
document.getElementById('cqCount').textContent=n+'/'+BADGES.length;
document.getElementById('cqStreak').textContent=getStreak()+' dias';
document.getElementById('cqLevel').textContent=getLevel();
document.getElementById('cqScore').textContent=(n*100);
document.getElementById('badgesGrid').innerHTML=BADGES.map(function(b){
var u=achievements[b.id];var cls=u?'unlocked':'locked';
var dt=u?new Date(u.date).toLocaleDateString('pt-BR'):'';
var iconName=b.lucide||'award';
var iconHtml='<i data-lucide="'+iconName+'" style="width:36px;height:36px;stroke:currentColor;stroke-width:2"></i>';
return '<div class="badge-item '+cls+'"><div class="badge-emoji">'+iconHtml+'</div><div class="badge-name">'+b.name+'</div><div class="badge-desc">'+b.desc+'</div>'+(dt?'<div class="badge-date">'+dt+'</div>':'')+'</div>';
}).join('');
if(typeof lucide!=='undefined')lucide.createIcons();
}

// CHARTS
function dC(){var k=Object.keys(charts);for(var i=0;i<k.length;i++){try{charts[k[i]].destroy()}catch(e){}}charts={}}

var _rcTimer=null;
function rCharts(){clearTimeout(_rcTimer);_rcTimer=setTimeout(_rChartsCore,120);}
function _rChartsCore(){
dC();Chart.defaults.color=document.body.classList.contains('light')?'#475569':'#94a3b8';Chart.defaults.font.family='Inter';
var gc='rgba(148,163,184,0.06)';
var m=getMD();var mk=Object.keys(m).sort();
if(mk.length===0)return;
if(!document.getElementById('c1'))return;
var ns=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var ml=mk.map(function(k){var p=k.split('-');return ns[+p[1]-1]+'/'+p[0].slice(2)});
var mR=mk.map(function(k){return +(m[k].r.toFixed(2))});
var mD=mk.map(function(k){return +(m[k].d.toFixed(2))});
var mS=mk.map(function(x,i){return +((mR[i]-mD[i]).toFixed(2))});

charts.c1=new Chart(document.getElementById('c1'),{type:'line',data:{labels:ml,datasets:[
{label:'Receitas',data:mR,borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.1)',fill:true,tension:.4,borderWidth:3,pointRadius:5},
{label:'Despesas',data:mD,borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,.1)',fill:true,tension:.4,borderWidth:3,pointRadius:5}
]},options:{responsive:true,scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});

var cd={};entries.filter(function(e){return e.type==='despesa'}).forEach(function(e){cd[e.category]=(cd[e.category]||0)+e.value});
var ck=Object.keys(cd).sort(function(a,b){return cd[b]-cd[a]});
var cv=ck.map(function(k){return +(cd[k].toFixed(2))});
var cc=['#4F8CFF','#7C5CFC','#EAB308','#22C55E','#14B8A6','#06B6D4','#EC4899','#6366F1','#A855F7','#EC4899'];

if(ck.length>0){
charts.c2=new Chart(document.getElementById('c2'),{type:'doughnut',data:{labels:ck,datasets:[{data:cv,backgroundColor:cc.slice(0,ck.length),borderColor:'#111132',borderWidth:3}]},options:{responsive:true,cutout:'55%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:6,font:{size:10}}}}}});
}

charts.c3=new Chart(document.getElementById('c3'),{type:'bar',data:{labels:ml,datasets:[{label:'Receitas',data:mR,backgroundColor:'rgba(34,197,94,.6)',borderRadius:6},{label:'Despesas',data:mD,backgroundColor:'rgba(239,68,68,.6)',borderRadius:6}]},options:{responsive:true,scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});

charts.c4=new Chart(document.getElementById('c4'),{type:'bar',data:{labels:ml,datasets:[{label:'Saldo',data:mS,backgroundColor:mS.map(function(v){return v>=0?'rgba(34,197,94,.6)':'rgba(239,68,68,.6)'}),borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});
}

// RELATORIOS
function rRel(){
var m=getMD();var mk=Object.keys(m).sort();
var ns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var tR=0,tD=0;
document.getElementById('relB').innerHTML=mk.map(function(k){
var v=m[k],s=v.r-v.d;tR+=v.r;tD+=v.d;
var p=k.split('-');
var st=s>0?'<span class="bdg ok">Positivo</span>':s===0?'<span class="bdg warn">Neutro</span>':'<span class="bdg danger">Negativo</span>';
var tx=v.r>0?Math.round((v.r-v.d)/v.r*100):0;return '<tr><td><b>'+ns[+p[1]-1]+'/'+p[0]+'</b></td><td class="m g">'+fmt(v.r)+'</td><td class="m r">'+fmt(v.d)+'</td><td class="m '+(s>=0?'g':'r')+'">'+fmt(s)+'</td><td>'+tx+'%</td><td>'+st+'</td></tr>';
}).join('')+(mk.length?'<tr class="total-row"><td><b>TOTAL</b></td><td class="m g"><b>'+fmt(tR)+'</b></td><td class="m r"><b>'+fmt(tD)+'</b></td><td class="m '+(tR-tD>=0?'g':'r')+'"><b>'+fmt(tR-tD)+'</b></td><td><b>'+(tR>0?Math.round((tR-tD)/tR*100):0)+'%</b></td><td></td></tr>':'');

if(mk.length===0)return;
var gc='rgba(148,163,184,0.06)';
var ml=mk.map(function(k){var p=k.split('-');return ns[+p[1]-1].substring(0,3)+'/'+p[0].slice(2)});
var mR=mk.map(function(k){return +(m[k].r.toFixed(2))});
var mD=mk.map(function(k){return +(m[k].d.toFixed(2))});
var mS=mk.map(function(x,i){return +((mR[i]-mD[i]).toFixed(2))});
var ac=0;var mA=mS.map(function(v){ac+=v;return +(ac.toFixed(2))});

try{if(charts.c5)charts.c5.destroy()}catch(e){}
try{if(charts.c6)charts.c6.destroy()}catch(e){}

charts.c5=new Chart(document.getElementById('c5'),{type:'line',data:{labels:ml,datasets:[
{label:'Receitas',data:mR,borderColor:'#22C55E',tension:.4,borderWidth:3,pointRadius:5},
{label:'Despesas',data:mD,borderColor:'#EF4444',tension:.4,borderWidth:3,pointRadius:5},
{label:'Saldo',data:mS,borderColor:'#4F8CFF',tension:.4,borderWidth:2,borderDash:[6,3],pointRadius:4}
]},options:{responsive:true,scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});

charts.c6=new Chart(document.getElementById('c6'),{type:'line',data:{labels:ml,datasets:[{label:'Acumulado',data:mA,borderColor:'#A855F7',backgroundColor:'rgba(168,85,247,.1)',fill:true,tension:.4,borderWidth:3,pointRadius:5}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});
}

// EXPORT JSON
function expJSON(){
var d=JSON.stringify({entries:entries,investments:investments,goals:goals,budgets:budgets,categories:userCats,accounts:userAccs,accountBalances:accountBalances,recurrents:recurrents,cards:cards},null,2);
var b=new Blob([d],{type:'application/json'});var a=document.createElement('a');
a.href=URL.createObjectURL(b);a.download='sibanki_backup_'+new Date().toISOString().split('T')[0]+'.json';a.click();toast(typeof t==='function'?t('toast_backup_salvo'):'Backup JSON salvo!','ok');
}

// EXPORT CSV
function expCSV(){
var header='Data,Tipo,Descrição,Categoria,Valor,Conta\n';
var rows=entries.map(function(e){return e.date+','+e.type+',"'+((e.desc||'').replace(/"/g,'""'))+'",'+e.category+','+e.value+','+(e.account||'')}).join('\n');
var csv=header+rows;
if(investments.length>0){
csv+='\n\nINVESTIMENTOS\nData,Tipo,Nome,Investido,Atual,Conta\n';
csv+=investments.map(function(i){return i.date+','+i.tipo+',"'+i.nome+'",'+i.valor+','+i.atual+','+(i.conta||'')}).join('\n');
}
var b=new Blob([csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');
a.href=URL.createObjectURL(b);a.download='sibanki_export_'+new Date().toISOString().split('T')[0]+'.csv';a.click();toast(typeof t==='function'?t('toast_csv_exportado'):'CSV exportado!','ok');
}

// IMPORT
function impData(){document.getElementById('impFile').click()}
function handleImport(event){
var file=event.target.files[0];if(!file)return;
var reader=new FileReader();
reader.onload=function(e){
try{
var data=JSON.parse(e.target.result);
if(data.entries){entries=entries.concat(data.entries);toast((typeof t==='function'?t('toast_lancamentos_importados'):'Lançamentos importados: ')+data.entries.length,'ok')}
if(data.investments){investments=investments.concat(data.investments);toast((typeof t==='function'?t('toast_investimentos_importados'):'Investimentos importados: ')+data.investments.length,'ok')}
if(data.goals){goals=goals.concat(data.goals)}
if(data.budgets){Object.assign(budgets,data.budgets)}
if(data.categories){data.categories.forEach(function(c){if(userCats.indexOf(c)<0)userCats.push(c)})}
if(data.accountBalances){for(var k in data.accountBalances){accountBalances[k]=data.accountBalances[k]}}
if(data.recurrents){recurrents=data.recurrents}
if(data.accounts){data.accounts.forEach(function(a){if(userAccs.indexOf(a)<0)userAccs.push(a)})}
saveData();renderAll();
}catch(err){
// Try CSV: mostrar preview com edição de categoria e totais antes de importar
var lines=e.target.result.split('\n');
if(lines.length>1){
var items=[];
for(var i=1;i<lines.length;i++){
var cols=lines[i].split(',');
if(cols.length>=5&&cols[0].match(/\d{4}-\d{2}-\d{2}/)){
var tipo=(cols[1]||'').toLowerCase().indexOf('rec')>=0?'receita':'despesa';
var cat=cols[3]||'Outros';
items.push({type:tipo,date:cols[0],desc:cols[2].replace(/"/g,''),category:cat,value:parseFloat(cols[4])||0,account:cols[5]||'',checked:true,cat:cat});
}
}
if(items.length>0){
_impItems=items;_impMode='generic';
var tab=document.getElementById('cartões');
if(tab&&!tab.classList.contains('on')){go('cartões',null);}
setTimeout(function(){
cardSubTab('cst-importar',document.querySelectorAll('.card-pill')[1]);
document.getElementById('impPreview').style.display='block';
renderImportPreview();
},150);
}else{toast(typeof t==='function'?t('toast_formato_nao_reconhecido_registros'):'Formato não reconhecido ou nenhum registro válido','err')}
}else{toast(typeof t==='function'?t('toast_formato_nao_reconhecido'):'Formato não reconhecido','err')}
}
};
reader.readAsText(file);
event.target.value='';
}


/* ===== LANC SUB-TAB NAVIGATION ===== */
function lancSub(id, el){
  var subs = document.querySelectorAll('.lanc-sub');
  for(var i=0;i<subs.length;i++) subs[i].classList.remove('lanc-sub-on');
  var pills = document.querySelectorAll('.lp-btn');
  for(var j=0;j<pills.length;j++) pills[j].classList.remove('lp-on');
  var target = document.getElementById('lancSub_'+id);
  if(target) target.classList.add('lanc-sub-on');
  if(el) el.classList.add('lp-on');
  // Se trocou para outra aba, ocultar form de lançamento
  if(id !== 'novo'){
    var fb = document.getElementById('lancFormBox');
    if(fb) fb.style.display = 'none';
    var btn = document.getElementById('lancBtnLancar');
    if(btn) btn.classList.remove('lp-on');
  }
}

function toggleLancForm(btn){
  var fb = document.getElementById('lancFormBox');
  if(!fb) return;
  // Desativar outras pills
  var pills = document.querySelectorAll('.lp-btn');
  for(var j=0;j<pills.length;j++) pills[j].classList.remove('lp-on');
  // Ativar sub_novo
  var subs = document.querySelectorAll('.lanc-sub');
  for(var i=0;i<subs.length;i++) subs[i].classList.remove('lanc-sub-on');
  var novo = document.getElementById('lancSub_novo');
  if(novo) novo.classList.add('lanc-sub-on');
  // Toggle form
  var isOpen = fb.style.display !== 'none';
  fb.style.display = isOpen ? 'none' : 'block';
  if(btn) btn.classList.toggle('lp-on', !isOpen);
  if(!isOpen && typeof window.refreshLucide === 'function') lucide.createIcons();
}

/* ===== TIPO TOGGLE (Despesa/Receita) ===== */
function setTipoLanc(tipo){
  var sel = document.getElementById('fT');
  if(sel) sel.value = tipo;
  var btnD = document.getElementById('btnTipoDespesa');
  var btnR = document.getElementById('btnTipoReceita');
  var btnSave = document.getElementById('btnLancSalvar');
  if(tipo === 'despesa'){
    if(btnD){btnD.classList.add('tipo-desp-on');btnD.classList.remove('tipo-rec-on')}
    if(btnR){btnR.classList.remove('tipo-rec-on');btnR.classList.remove('tipo-desp-on')}
    if(btnSave){btnSave.innerHTML='<i data-lucide="trending-down" style="width:18px;height:18px;vertical-align:middle"></i> Salvar Despesa';btnSave.classList.remove('receita-mode');if(typeof window.refreshLucide==='function')lucide.createIcons()}
  } else {
    if(btnR){btnR.classList.add('tipo-rec-on');btnR.classList.remove('tipo-desp-on')}
    if(btnD){btnD.classList.remove('tipo-desp-on');btnD.classList.remove('tipo-rec-on')}
    if(btnSave){btnSave.innerHTML='<i data-lucide="trending-up" style="width:18px;height:18px;vertical-align:middle"></i> Salvar Receita';btnSave.classList.add('receita-mode');if(typeof window.refreshLucide==='function')lucide.createIcons()}
  }
}

/* Set default date on form load */
function initLancDate(){
  var d=document.getElementById('fD');
  var td=document.getElementById('tfD');
  var today=new Date().toISOString().split('T')[0];
  if(d && !d.value) d.value=today;
  if(td && !td.value) td.value=today;
}



/* ===== IMPORT FATURA ENGINE ===== */
var _impItems=[];
var _impMode='card'; /* 'card' = fatura para cartão; 'generic' = CSV genérico para lançamentos */

function toggleImportMode(){
var f=document.getElementById('impFormat').value;
var fz=document.getElementById('impFileZone');
var tz=document.getElementById('impTextZone');
if(f==='text'){fz.style.display='none';tz.style.display='block'}
else{fz.style.display='block';tz.style.display='none'}
document.getElementById('impPreview').style.display='none';
}

function handleImportDrop(e){
e.preventDefault();
e.currentTarget.classList.remove('drag-over');
var f=e.dataTransfer.files[0];
if(f)processImportFile(f);
}

function handleImportFile(inp){
if(inp.files[0])processImportFile(inp.files[0]);
}

function processImportFile(file){
_impMode='card';
if(file.size>5*1024*1024){toast(typeof t==='function'?t('toast_arquivo_muito_grande'):'Arquivo muito grande (max 5MB)','err');return}
var reader=new FileReader();
reader.onload=function(e){
var text=e.target.result;
var fmt=document.getElementById('impFormat').value;
if(fmt==='ofx')parseOFX(text);
else parseCSV(text);
};
reader.readAsText(file,'UTF-8');
}

/* ===== CSV PARSER (Nubank, Inter, Itau, C6, BTG, etc) ===== */
function parseCSV(text){
var lines=text.trim().split(/\r?\n/);
if(lines.length<2){toast(typeof t==='function'?t('toast_arquivo_invalido'):'Arquivo vazio ou inválido','err');return}

/* Detect separator */
var sep=',';
if(lines[0].split(';').length>lines[0].split(',').length)sep=';';

var header=lines[0].toLowerCase().split(sep).map(function(h){return h.trim().replace(/^"|"$/g,'').replace(/[\u00e0-\u00fc]/g,function(c){
var map={'ã':'a','á':'a','â':'a','é':'e','ê':'e','í':'i','ó':'o','ô':'o','ú':'u','ç':'c'};
return map[c]||c;
})});

/* Map columns */
var colDate=-1,colDesc=-1,colVal=-1,colCat=-1;
for(var i=0;i<header.length;i++){
var h=header[i];
if(colDate<0&&(h.indexOf('data')>-1||h==='date'))colDate=i;
if(colDesc<0&&(h.indexOf('descri')>-1||h.indexOf('título')>-1||h==='title'||h.indexOf('estabelecimento')>-1||h.indexOf('lançamento')>-1))colDesc=i;
if(colVal<0&&(h.indexOf('valor')>-1||h.indexOf('amount')>-1||h.indexOf('preco')>-1||h==='value'))colVal=i;
if(colCat<0&&(h.indexOf('categ')>-1||h.indexOf('category')>-1))colCat=i;
}

/* Nubank format: date, category, title, amount */
if(colDate<0||colDesc<0||colVal<0){
/* Fallback: try Nubank CSV order */
if(header.length>=4&&header[0].indexOf('date')>-1){
colDate=0;colCat=1;colDesc=2;colVal=3;
}else if(header.length>=3){
colDate=0;colDesc=1;colVal=header.length-1;
}else{
toast(typeof t==='function'?t('toast_detectar_colunas'):'Nao consegui detectar as colunas. Verifique o formato.','err');return;
}
}

_impItems=[];
for(var j=1;j<lines.length;j++){
var cols=lines[j].split(sep).map(function(c){return c.trim().replace(/^"|"$/g,'')});
if(cols.length<3||!cols[colDate])continue;

var rawDate=cols[colDate];
var desc=cols[colDesc]||'';
var rawVal=cols[colVal]||'0';
var cat=colCat>=0?cols[colCat]:'Outros';

/* Parse date (DD/MM/YYYY or YYYY-MM-DD) */
var date=parseImportDate(rawDate);
if(!date)continue;

/* Parse value (handle BRL format: 1.234,56) */
var val=parseImportValue(rawVal);
if(!val||val===0)continue;

/* Only import expenses (positive values in most CSVs) */
_impItems.push({checked:true,date:date,desc:desc,value:Math.abs(val),cat:autoDetectCategory(desc,cat),original:cols});
}

if(_impItems.length===0){toast(typeof t==='function'?t('toast_nenhum_item_arquivo'):'Nenhum item encontrado no arquivo','err');return}
renderImportPreview();
}

/* ===== OFX PARSER ===== */
function parseOFX(text){
_impItems=[];
/* Simple OFX transaction parser */
var txns=text.split('<STMTTRN>');
for(var i=1;i<txns.length;i++){
var block=txns[i].split('</STMTTRN>')[0]||txns[i];
var dtMatch=block.match(/<DTPOSTED>([\d]+)/);
var valMatch=block.match(/<TRNAMT>([\-\d.,]+)/);
var descMatch=block.match(/<MEMO>([^<\n]+)/)||block.match(/<NAME>([^<\n]+)/);
if(!dtMatch||!valMatch)continue;

var rawDt=dtMatch[1]; /* YYYYMMDD */
var date=rawDt.substring(0,4)+'-'+rawDt.substring(4,6)+'-'+rawDt.substring(6,8);
var val=parseFloat(valMatch[1].replace(',','.'));
var desc=descMatch?descMatch[1].trim():'Sem descrição';

/* Only debits (negative in OFX) */
if(val>=0)continue;
_impItems.push({checked:true,date:date,desc:desc,value:Math.abs(val),cat:autoDetectCategory(desc,'Outros'),original:null});
}
if(_impItems.length===0){toast(typeof t==='function'?t('toast_nenhuma_transacao_ofx'):'Nenhuma transacao encontrada no OFX','err');return}
renderImportPreview();
}

/* ===== TEXT PARSER (copy/paste) ===== */
function parseImportText(){
var text=document.getElementById('impTextArea').value.trim();
if(!text){toast(typeof t==='function'?t('toast_cole_fatura'):'Cole o texto da fatura','err');return}
_impItems=[];
var lines=text.split(/\r?\n/);
for(var i=0;i<lines.length;i++){
var line=lines[i].trim();
if(!line||line.length<8)continue;

/* Try pattern: DD/MM/YYYY ... R$ XXX,XX or DD/MM ... value */
var m=line.match(/(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(.+?)\s+(?:R\$\s*)?(-?[\d.,]+)\s*$/);
if(!m){
/* Try: description ... DD/MM ... value */
m=line.match(/^(.+?)\s+(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(?:R\$\s*)?(-?[\d.,]+)\s*$/);
if(m){var tmp=m[1];m[1]=m[2];m[2]=tmp;}
}
if(!m)continue;

var date=parseImportDate(m[1]);
var desc=m[2].replace(/\s+/g,' ').trim();
var val=parseImportValue(m[3]);
if(!date||!val||val===0)continue;

_impItems.push({checked:true,date:date,desc:desc,value:Math.abs(val),cat:autoDetectCategory(desc,'Outros'),original:null});
}
if(_impItems.length===0){toast(typeof t==='function'?t('toast_nao_encontrei_itens'):'Nao encontrei itens. Verifique o formato do texto.','err');return}
renderImportPreview();
}

/* ===== HELPERS ===== */
function parseImportDate(raw){
if(!raw)return null;
raw=raw.trim();
/* YYYY-MM-DD */
if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
/* DD/MM/YYYY or DD-MM-YYYY */
var m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
if(m){
var y=m[3].length===2?'20'+m[3]:m[3];
return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
}
/* DD/MM (assume current year) */
var m2=raw.match(/^(\d{1,2})[\/-](\d{1,2})$/);
if(m2){
return new Date().getFullYear()+'-'+m2[2].padStart(2,'0')+'-'+m2[1].padStart(2,'0');
}
return null;
}

function parseImportValue(raw){
if(!raw)return 0;
raw=raw.trim().replace('R$','').replace(/\s/g,'');
/* BRL: 1.234,56 → remove dots, replace comma with dot */
if(raw.indexOf(',')>-1&&raw.indexOf('.')>-1){
raw=raw.replace(/\./g,'').replace(',','.');
}else if(raw.indexOf(',')>-1){
raw=raw.replace(',','.');
}
return parseFloat(raw)||0;
}

function autoDetectCategory(desc,fallback){
desc=(desc||'').toLowerCase();
var rules=[
[/super|mercado|extra|carrefour|atacad|pao de acucar|assai/,'Alimentação'],
[/restaur|ifood|rappi|uber ?eat|burger|pizza|lanche|mcdon|bk |subway|sushi|padaria/,'Alimentação'],
[/uber|99|taxi|cabify|waze|estacion|parking|combusti|gasolina|shell|ipiranga|br ?petro/,'Transporte'],
[/netflix|spotify|disney|hbo|prime ?video|youtube|deezer|apple ?music|amazon ?prime|globoplay/,'Assinatura'],
[/farmaci|drogaria|droga ?raia|pacheco|saude|medic|hospital|clinica|dentist|psicolog/,'Saúde'],
[/luz|energia|agua|gas|internet|telefone|celular|claro|vivo|tim|oi |net |telecom/,'Moradia'],
[/roupa|zara|renner|c&a|riachuelo|shein|nike|adidas|calçado|sapato|tenis/,'Vestuário'],
[/escola|faculdade|curso|livro|udemy|alura|educação/,'Educação'],
[/viagem|hotel|airbnb|booking|passagem|gol |latam|azul /,'Viagem'],
[/pet|veterinari|racao|cobasi|petz/,'Pet'],
[/jogo|game|steam|playstation|xbox|cinema|teatro|show|ingresso/,'Lazer']
];
for(var i=0;i<rules.length;i++){
if(rules[i][0].test(desc))return rules[i][1];
}
return fallback||'Outros';
}

/* ===== RENDER PREVIEW ===== */
function renderImportPreview(){
var box=document.getElementById('impPreview');
box.style.display='block';
document.getElementById('impCount').textContent=_impItems.length;

var isGeneric=(_impMode==='generic');
var impCardEl=document.getElementById('impCard');
if(impCardEl){var fg=impCardEl.closest('.fg');if(fg)fg.style.display=isGeneric?'none':'block';}

/* Categories available (use userCats for consistency with app) */
var catOpts='<option value="Outros">Outros</option>';
var cats=(typeof userCats!=='undefined'&&userCats.length>0)?userCats:(typeof defaultCats!=='undefined'?defaultCats:['Alimentação','Transporte','Moradia','Saúde','Educação','Lazer','Vestuário','Assinatura','Viagem','Pet']);
cats.forEach(function(c){catOpts+='<option value="'+c+'">'+c+'</option>';});

var h;
if(isGeneric){
h='<div class="imp-row imp-header"><div></div><div>Tipo</div><div>Data</div><div>Descrição</div><div>Valor</div><div class="imp-cat-col">Categoria</div></div>';
_impItems.forEach(function(it,idx){
var corVal=it.type==='receita'?'var(--green)':'var(--red)';
h+='<div class="imp-row">';
h+='<div><input type="checkbox" '+(it.checked?'checked':'')+' onchange="_impItems['+idx+'].checked=this.checked;updateImpSummary()"></div>';
h+='<div style="font-size:.8em">'+(it.type==='receita'?'Rec.':'Desp.')+'</div>';
h+='<div>'+formatDateBR(it.date)+'</div>';
h+='<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escapeHtml(it.desc)+'">'+escapeHtml(it.desc)+'</div>';
h+='<div style="font-weight:600;color:'+corVal+'">R$ '+it.value.toFixed(2).replace('.',',')+'</div>';
h+='<div class="imp-cat-col"><select class="imp-row-cat" onchange="_impItems['+idx+'].cat=this.value">'+catOpts.replace('value="'+escapeHtml(it.cat)+'"','value="'+escapeHtml(it.cat)+'" selected')+'</select></div>';
h+='</div>';
});
}else{
h='<div class="imp-row imp-header"><div></div><div>Data</div><div>Descrição</div><div>Valor</div><div class="imp-cat-col">Categoria</div></div>';
_impItems.forEach(function(it,idx){
h+='<div class="imp-row">';
h+='<div><input type="checkbox" '+(it.checked?'checked':'')+' onchange="_impItems['+idx+'].checked=this.checked;updateImpSummary()"></div>';
h+='<div>'+formatDateBR(it.date)+'</div>';
h+='<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escapeHtml(it.desc)+'">'+escapeHtml(it.desc)+'</div>';
h+='<div style="font-weight:600;color:var(--red)">R$ '+it.value.toFixed(2).replace('.',',')+'</div>';
h+='<div class="imp-cat-col"><select class="imp-row-cat" onchange="_impItems['+idx+'].cat=this.value">'+catOpts.replace('value="'+escapeHtml(it.cat)+'"','value="'+escapeHtml(it.cat)+'" selected')+'</select></div>';
h+='</div>';
});
}
document.getElementById('impTable').innerHTML=h;
updateImpSummary();
}

function formatDateBR(d){if(!d)return'';var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0]}

function updateImpSummary(){
var sel=_impItems.filter(function(i){return i.checked});
var total=sel.reduce(function(s,i){return s+i.value},0);
var btn=document.getElementById('impConfirmBtn');
if(!btn)return;
if(_impMode==='generic'){
var totalRec=sel.filter(function(i){return i.type==='receita'}).reduce(function(s,i){return s+i.value},0);
var totalDesp=sel.filter(function(i){return i.type==='despesa'}).reduce(function(s,i){return s+i.value},0);
var nRec=sel.filter(function(i){return i.type==='receita'}).length;
var nDesp=sel.filter(function(i){return i.type==='despesa'}).length;
var sumH='<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:center">';
sumH+='<span><b>'+sel.length+'</b> lançamentos de '+_impItems.length+' itens</span>';
sumH+='<span><span style="color:var(--green)">'+nRec+' rec. R$ '+totalRec.toFixed(2).replace('.',',')+'</span> &nbsp; <span style="color:var(--red)">'+nDesp+' desp. R$ '+totalDesp.toFixed(2).replace('.',',')+'</span></span></div>';
sumH+='<div style="font-size:.8em;color:var(--t3);margin-top:4px">Confira as categorias acima e altere se precisar. Depois clique em Importar.</div>';
document.getElementById('impSummary').innerHTML=sumH;
btn.onclick=function(){confirmGenericImport();};
btn.innerHTML='&#128229; Importar <span id="impSelCount">'+sel.length+'</span> lançamentos';
btn.disabled=sel.length===0;
document.getElementById('impSelCount').textContent=sel.length;
}else{
document.getElementById('impSelCount').textContent=sel.length;
document.getElementById('impSelTotal').textContent=total.toFixed(2).replace('.',',');
var cats={};
sel.forEach(function(i){cats[i.cat]=(cats[i.cat]||0)+i.value});
var sumH='<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:center">';
sumH+='<span><b>'+sel.length+'</b> despesas de '+_impItems.length+' itens</span>';
sumH+='<span style="font-weight:700;color:var(--red)">Total: R$ '+total.toFixed(2).replace('.',',')+'</span></div>';
sumH+='<div style="font-size:.8em;color:var(--t3);margin-top:4px">Confira as categorias acima e altere se precisar. Depois clique em Importar.</div>';
sumH+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
Object.keys(cats).forEach(function(c){
sumH+='<span style="padding:2px 8px;background:var(--bg2);border-radius:6px;font-size:.78em">'+escapeHtml(c)+': R$ '+cats[c].toFixed(2).replace('.',',')+'</span>';
});
sumH+='</div>';
document.getElementById('impSummary').innerHTML=sumH;
btn.onclick=function(){confirmImport();};
btn.innerHTML='&#128229; Importar <span id="impSelCount">'+sel.length+'</span> itens - R$ <span id="impSelTotal">'+total.toFixed(2).replace('.',',')+'</span>';
btn.disabled=sel.length===0;
document.getElementById('impSelCount').textContent=sel.length;
document.getElementById('impSelTotal').textContent=total.toFixed(2).replace('.',',');
}
}

function confirmGenericImport(){
var sel=_impItems.filter(function(i){return i.checked});
if(!sel.length){toast(typeof t==='function'?t('toast_nenhum_item_selecionado'):'Nenhum item selecionado','err');return}
if(!confirm('Importar '+sel.length+' lançamentos?'))return;
var imported=0;
var baseId=Date.now();
sel.forEach(function(it,i){
entries.push({
id:baseId+i,
type:it.type||'despesa',
date:it.date,
desc:it.desc||'',
category:it.cat||'Outros',
value:it.value,
account:it.account||''
});
imported++;
});
saveData();renderAll();
_impItems=[];_impMode='card';
document.getElementById('impPreview').style.display='none';
var st=document.getElementById('impStatus');
if(st){st.style.display='block';st.innerHTML='<div class="imp-status-ok" style="display:inline-flex;align-items:center;gap:8px"><i data-lucide="check" style="width:20px;height:20px;stroke:currentColor;stroke-width:2"></i> <strong>'+imported+' lançamentos importados!</strong></div>';if(typeof lucide!=='undefined')lucide.createIcons();setTimeout(function(){st.style.display='none'},5000);}
toast(imported+' lançamentos importados!','ok');
}

function impSelectAll(){_impItems.forEach(function(i){i.checked=true});renderImportPreview()}
function impDeselectAll(){_impItems.forEach(function(i){i.checked=false});renderImportPreview()}

/* ===== CONFIRM IMPORT ===== */
function confirmImport(){
var cardId=parseInt(document.getElementById('impCard').value);
if(!cardId){toast(typeof t==='function'?t('toast_selecione_cartao_destino'):'Selecione o cartao destino','err');return}
var card=cards.find(function(c){return c.id===cardId});
if(!card){toast(typeof t==='function'?t('toast_cartao_nao_encontrado'):'Cartão nao encontrado','err');return}

var sel=_impItems.filter(function(i){return i.checked});
if(!sel.length){toast(typeof t==='function'?t('toast_nenhum_item_selecionado'):'Nenhum item selecionado','err');return}

if(!confirm((typeof t==='function'?t('confirm_importar_itens_cartao'):'Importar {0} itens no cartao {1}?').replace('{0}',sel.length).replace('{1}',card.name)))return;

var imported=0;
sel.forEach(function(it){
var pid=Date.now()+imported;
card.purchases.push({
id:pid,
purchaseId:pid,
desc:it.desc,
category:it.cat,
value:it.value,
totalValue:it.value,
parcela:1,
totalParcelas:1,
date:it.date,
billingMonth:typeof getBillingMonth==='function'?getBillingMonth(card,it.date):it.date.substring(0,7),
imported:true
});
entries.push({
id:pid,
cardPurchaseId:pid,
type:'despesa',
desc:'['+card.name+'] '+it.desc,
value:it.value,
category:it.cat,
date:it.date,
tags:['cartão',card.name.toLowerCase(),'importado'],
account:card.name,
imported:true
});
imported++;
});

saveData();renderAll();
_impItems=[];
document.getElementById('impPreview').style.display='none';
var st=document.getElementById('impStatus');
st.style.display='block';
st.innerHTML='<div class="imp-status-ok" style="display:inline-flex;align-items:flex-start;gap:8px"><i data-lucide="check" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;flex-shrink:0;margin-top:2px"></i> <div><strong>'+imported+' lançamentos importados com sucesso!</strong><br><span style="font-size:.9em;opacity:.9">No cartão '+card.name+'. Revise em Lançar ou na Fatura do cartão.</span></div></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
setTimeout(function(){st.style.display='none'},6000);
toast(imported+' lançamentos importados!','ok');
}

/* ===== POPULATE IMPORT CARD SELECT ===== */
function popImpCardSel(){
var sel=document.getElementById('impCard');
if(!sel)return;
var h='<option value="">Selecione...</option>';
if(typeof cards!=='undefined'){
cards.forEach(function(c){
if(c.active!==false)h+='<option value="'+c.id+'">'+c.name+' ('+c.flag+')</option>';
});
}
sel.innerHTML=h;
}



/* ===== CARD MODAL ===== */
var _editingCardId=null;

function renderCardBankGrid(){
var grid=document.getElementById('cardBankGrid');
if(!grid)return;
var sel=document.getElementById('cardBank');
var selected=(sel&&sel.value)||'outro';
var h='';
for(var key in LOGOS_BANCOS){
var b=LOGOS_BANCOS[key];
var isSel=key===selected;
var logoMini=getBancoLogoImgHtml(b,28);
h+='<div class="banco-option'+(isSel?' selected':'')+'" data-bank="'+key+'" onclick="selecionarBancoCard(\''+key+'\')">'+logoMini+'<div class="banco-nome">'+escapeHtml(b.nome)+'</div></div>';
}
grid.innerHTML=h;
}
function selecionarBancoCard(key){
var sel=document.getElementById('cardBank');
if(sel)sel.value=key;
var banco=LOGOS_BANCOS[key];
if(banco&&!document.getElementById('cardName').value.trim()){
document.getElementById('cardName').value=banco.nome;
}
renderCardBankGrid();
updateCardPreview();
}
function setAnuidadeCard(tem){
var noBtn=document.getElementById('toggleAnuidadeNao');
var simBtn=document.getElementById('toggleAnuidadeSim');
var campos=document.getElementById('camposAnuidade');
var tip=document.getElementById('anuidadeMensalTip');
if(noBtn){noBtn.classList.toggle('active',!tem);}
if(simBtn){simBtn.classList.toggle('active',!!tem);}
if(campos){campos.classList.toggle('show',!!tem);}
if(tip){tip.style.display=tem?'block':'none';}
if(tem)calcAnuidadeMensal();
}
function calcAnuidadeMensal(){
var v=parseFloat(document.getElementById('cardAnuidadeValor').value)||0;
var el=document.getElementById('anuidadeMensalValor');
if(el)el.textContent='R$ '+(v/12).toFixed(2).replace('.',',');
}
function updateCardPreview(){
var wrap=document.getElementById('cardPreviewWrap');
if(!wrap)return;
var name=document.getElementById('cardName').value.trim()||'Nome do cartão';
var flag=document.getElementById('cardFlag').value;
var limit=parseFloat(document.getElementById('cardLimit').value)||5000;
var close=document.getElementById('cardClose').value||'25';
var due=document.getElementById('cardDue').value||'5';
var bankKey=document.getElementById('cardBank').value;
var banco=LOGOS_BANCOS[bankKey]||LOGOS_BANCOS.outro;
var bandeiraSvg=getBandeiraSvg(flag);
var bg=banco.cor;
var logoHtml=getBancoLogoImgHtml(banco,20);
wrap.style.display='block';
wrap.innerHTML='<div class="vcard vcard-preview" style="background:'+bg+'"><div class="vcard-top"><div class="vcard-logo-banco">'+logoHtml+'</div><div class="vcard-chip"></div></div><div class="vcard-num">•••• •••• •••• 4242</div><div class="vcard-name">'+escapeHtml(name)+'</div><div class="vcard-dates">Fecha '+close+' · Vence '+due+'</div><div class="vcard-bottom"><div class="vcard-uso"><div class="vcard-uso-labels"><span>0% usado</span><span>R$ '+(limit/1000).toFixed(1)+'k</span></div><div class="vcard-bar"><div class="vcard-bar-fill" style="width:0%;background:#22C55E"></div></div></div><div class="vcard-bandeira">'+bandeiraSvg+'</div></div></div>';
}
function openCardModal(editId){
_editingCardId=editId||null;
var m=document.getElementById('cardModalOv');
var title=document.getElementById('cardModalTitle');
var btn=document.getElementById('cardModalSaveBtn');
if(editId){
var c=cards.find(function(x){return x.id===editId});
if(c){
document.getElementById('cardName').value=c.name;
document.getElementById('cardFlag').value=c.flag||'Visa';
document.getElementById('cardLimit').value=c.limit;
document.getElementById('cardClose').value=c.closeDay;
document.getElementById('cardDue').value=c.dueDay;
var corVal=c.color||'#8B5CF6';
if(corVal.indexOf('#')===0)document.getElementById('cardColor').value=corVal;
else document.getElementById('cardColor').value='#8B5CF6';
var bankKey=getCardBankKey(c);
var bankEl=document.getElementById('cardBank');
if(bankEl)bankEl.value=bankKey;
setAnuidadeCard(!!c.temAnuidade);
if(c.temAnuidade&&c.anuidade){
document.getElementById('cardAnuidadeValor').value=c.anuidade.valorAnual||'';
document.getElementById('cardAnuidadeMes').value=String(c.anuidade.mesCobranca||3);
calcAnuidadeMensal();
}
title.innerHTML='<i data-lucide="pencil" style="width:20px;height:20px"></i> Editar Cartão';
btn.textContent=typeof t==='function'?t('btn_salvar'):'Salvar';
}
}else{
document.getElementById('cardName').value='';
document.getElementById('cardLimit').value='';
document.getElementById('cardClose').value='25';
document.getElementById('cardDue').value='5';
document.getElementById('cardColor').value='#8B5CF6';
var bankEl=document.getElementById('cardBank');
if(bankEl)bankEl.value='outro';
setAnuidadeCard(false);
document.getElementById('cardAnuidadeValor').value='';
document.getElementById('cardAnuidadeMes').value='3';
title.innerHTML='<i data-lucide="credit-card" style="width:20px;height:20px"></i> Novo Cartão';
btn.textContent=typeof t==='function'?t('btn_adicionar'):'Adicionar';
}
renderCardBankGrid();
updateCardPreview();
m.classList.add('show');
if(typeof window.refreshLucide==='function')lucide.createIcons();
setTimeout(function(){document.getElementById('cardName').focus()},200);
}

function closeCardModal(){
document.getElementById('cardModalOv').classList.remove('show');
_editingCardId=null;
}

function saveCardModal(){
var name=document.getElementById('cardName').value.trim();
var flag=document.getElementById('cardFlag').value;
var limit=pf('cardLimit');
var close=parseInt(document.getElementById('cardClose').value)||25;
var due=parseInt(document.getElementById('cardDue').value)||5;
var color=document.getElementById('cardColor').value;
var bankKey=(document.getElementById('cardBank')&&document.getElementById('cardBank').value)||'outro';
var banco=LOGOS_BANCOS[bankKey];
if(banco&&banco.cor)color=banco.cor;
var temAnuidade=document.getElementById('toggleAnuidadeSim')&&document.getElementById('toggleAnuidadeSim').classList.contains('active');
var valorAnual=temAnuidade?(parseFloat(document.getElementById('cardAnuidadeValor').value)||0):0;
var mesCobranca=temAnuidade?(parseInt(document.getElementById('cardAnuidadeMes').value)||3):3;
var valorMensal=valorAnual>0?valorAnual/12:0;
var now=new Date();
var anoProx=now.getFullYear();
if(now.getMonth()+1>=mesCobranca)anoProx++;
var proximaCobranca=anoProx+'-'+String(mesCobranca).padStart(2,'0')+'-15';
var anuidadeObj=temAnuidade&&valorAnual>0?{valorAnual:valorAnual,valorMensal:valorMensal,mesCobranca:mesCobranca,proximaCobranca:proximaCobranca}:null;
if(!name){toast(typeof t==='function'?t('toast_dig_nome_cartao'):'Digite o nome do cartão','err');return}
if(!limit||limit<=0){toast(typeof t==='function'?t('toast_dig_limite'):'Digite o limite','err');return}
if(_editingCardId){
var c=cards.find(function(x){return x.id===_editingCardId});
if(c){c.name=name;c.flag=flag;c.limit=limit;c.closeDay=close;c.dueDay=due;c.color=color;c.bank=bankKey;c.temAnuidade=!!temAnuidade;c.anuidade=anuidadeObj;
toast(typeof t==='function'?t('toast_cartao_atualizado'):'Cartão atualizado!','ok');}
}else{
cards.push({id:Date.now(),name:name,flag:flag,limit:limit,closeDay:close,dueDay:due,color:color,bank:bankKey,temAnuidade:!!temAnuidade,anuidade:anuidadeObj,purchases:[],active:true});
toast(typeof t==='function'?t('toast_cartao_adicionado'):'Cartão adicionado!','ok');
}
saveData();renderCards();closeCardModal();
}

/* ===== CARD SUB-TABS ===== */
function cardSubTab(id,el){
var subs=document.querySelectorAll('.card-sub');
for(var i=0;i<subs.length;i++){subs[i].classList.remove('on')}
var pills=document.querySelectorAll('.card-pill');
for(var j=0;j<pills.length;j++){pills[j].classList.remove('active')}
var target=document.getElementById(id);
if(target)target.classList.add('on');
if(el)el.classList.add('active');
}

/* ===== CAROUSEL RENDER (replaces renderCards) ===== */
function renderCards(){
var carousel=document.getElementById('cardsCarousel');
var cl=document.getElementById('cardsList');
if(!carousel){
if(cl){
cl.innerHTML='<div style="text-align:center;color:var(--t2);padding:16px">Carousel not found</div>';
}
return;
}
if(cards.length===0){
carousel.innerHTML='<div style="text-align:center;color:var(--t2);padding:24px;min-width:200px">Nenhum cartão cadastrado.</div><div class="card-novo-cartao" onclick="openCardModal()" role="button" tabindex="0"><div class="card-novo-cartao-icon"><i data-lucide="plus" style="width:24px;height:24px;color:#4C7BF4"></i></div><div class="card-novo-cartao-txt">Adicionar cartão</div><div class="card-novo-cartao-sub">Crédito, débito ou pré-pago</div></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
updateCardSelects();
if(typeof popImpCardSel==='function')popImpCardSel();
return;
}
var h='';
var now=new Date();
cards.forEach(function(c){
if(c.active===false)return;
var bm=getBillingMonth(c,now.toISOString().split('T')[0]);
var fatAtual=c.purchases.filter(function(p){return p.billingMonth===bm}).reduce(function(s,p){return s+p.value},0);
var pctUsado=c.limit>0?Math.round(fatAtual/c.limit*100):0;
var corBarra=pctUsado>=90?'#EF4444':pctUsado>=70?'#EAB308':'#22C55E';
var diasFecha=getDiasParaFecha(c);
var banco=getBancoForCard(c);
var bg=banco.cor||('linear-gradient(135deg,'+(c.color||'#1e3a5f')+','+(c.color||'#0d1b2a')+')');
var bandeiraSvg=getBandeiraSvg(c.flag);
var logoHtml=getBancoLogoImgHtml(banco,28);
h+='<div class="vcard" style="background:'+bg+'" onclick="selectCard('+c.id+',this)">';
h+='<div class="vcard-actions">';
h+='<button onclick="event.stopPropagation();openCardModal('+c.id+')" title="Editar">&#9998;</button>';
h+='<button onclick="event.stopPropagation();delCard('+c.id+')" title="Excluir">&#128465;</button>';
h+='</div>';
h+='<div class="vcard-top">';
h+='<div class="vcard-logo-banco">'+logoHtml+'</div>';
h+='<div class="vcard-chip"></div>';
h+='</div>';
h+='<div class="vcard-num">•••• •••• •••• '+('0000'+String(c.id)).slice(-4)+'</div>';
h+='<div class="vcard-name">'+escapeHtml(c.name)+'</div>';
h+='<div class="vcard-dates">Fecha '+c.closeDay+' · Vence '+c.dueDay+'</div>';
h+='<button type="button" class="vcard-fatura-btn" data-card-id="'+c.id+'" title="Ver fatura" onclick="event.stopPropagation();event.preventDefault();if(typeof closeBankExtratoModal===\'function\')closeBankExtratoModal();showCardFaturaModal('+c.id+');return false;"><i data-lucide="file-text" style="width:16px;height:16px;pointer-events:none"></i> Fatura</button>';
h+='<div class="vcard-bottom">';
h+='<div class="vcard-uso"><div class="vcard-uso-labels"><span>'+pctUsado+'% usado</span><span>R$ '+(c.limit/1000).toFixed(1)+'k</span></div>';
h+='<div class="vcard-bar"><div class="vcard-bar-fill" style="width:'+Math.min(100,pctUsado)+'%;background:'+corBarra+'"></div></div></div>';
h+='<div class="vcard-bandeira">'+bandeiraSvg+'</div>';
h+='</div>';
if(c.temAnuidade&&c.anuidade&&c.anuidade.valorAnual>0){
h+='<div class="vcard-anuidade">Anuidade: R$ '+c.anuidade.valorAnual.toFixed(2)+'/ano</div>';
}
if(diasFecha!==null&&diasFecha<=5){
h+='<div class="vcard-alert">&#9888;&#65039; Fecha em '+diasFecha+' dia'+(diasFecha>1?'s':'')+'!</div>';
}
h+='</div>';
});
h+='<div class="card-novo-cartao" onclick="openCardModal()" role="button" tabindex="0"><div class="card-novo-cartao-icon"><i data-lucide="plus" style="width:24px;height:24px;color:#4C7BF4"></i></div><div class="card-novo-cartao-txt">Adicionar cartão</div><div class="card-novo-cartao-sub">Crédito, débito ou pré-pago</div></div>';
carousel.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
if(cl)cl.style.display='none';
updateCardSelects();
renderCardsResumo();
if(typeof popImpCardSel==='function')popImpCardSel();
}

function selectCard(id,el){
var sel=document.getElementById('fatViewCard');
if(sel){sel.value=id;renderFatura();}
var selFat=document.getElementById('fatCard');
if(selFat)selFat.value=id;
var selImp=document.getElementById('impCard');
if(selImp)selImp.value=id;
var vcards=document.querySelectorAll('.vcard');
for(var i=0;i<vcards.length;i++){vcards[i].classList.remove('vcard-active')}
if(el)el.classList.add('vcard-active');
}
function showCardFaturaModal(cardId){
var cid=typeof cardId==='string'?parseInt(cardId,10):cardId;
var card=cards.find(function(c){return c.id==cid||c.id===cid});
if(!card)return;
var modal=document.getElementById('cardFaturaModal');
var box=document.getElementById('cardFaturaBox');
var header=document.getElementById('cardFaturaHeader');
var logoEl=document.getElementById('cardFaturaLogo');
var content=document.getElementById('cardFaturaContent');
if(!modal||!box||!content)return;
var banco=getBancoForCard(card);
var bg=banco.cor||(card.color||'#1e3a5f');
box.style.background=bg.indexOf('linear')>=0?bg:'linear-gradient(135deg,'+bg+','+bg+'dd)';
logoEl.innerHTML='<div style="display:flex;align-items:center;gap:12px"><span style="background:rgba(255,255,255,.25);border-radius:10px;padding:6px;display:inline-flex">'+(typeof getBancoLogoImgHtml==='function'?getBancoLogoImgHtml(banco,36):'')+'</span><div><div style="font-size:.75em;opacity:.9">Fatura</div><div style="font-weight:800;font-size:1.1em">'+escapeHtml(card.name)+'</div></div></div>';
var now=new Date();
var bm=getBillingMonth(card,now.toISOString().split('T')[0]);
var purchases=card.purchases.filter(function(p){return p.billingMonth===bm}).sort(function(a,b){return a.date>b.date?1:-1});
var totalFat=purchases.reduce(function(s,p){return s+p.value},0);
var meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var bmParts=bm.split('-');
var mesLabel=meses[parseInt(bmParts[1],10)-1]+' '+bmParts[0];
if(purchases.length===0){
content.innerHTML='<div style="text-align:center;color:var(--t3);padding:24px;font-size:.88em">Nenhuma compra na fatura de '+mesLabel+'.</div>';
}else{
var h='<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:.8em;color:var(--t2)">'+mesLabel+'</span><span style="font-weight:800;color:var(--vr)">Total: R$ '+totalFat.toFixed(2)+'</span></div>';
h+='<table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>';
purchases.forEach(function(p){
h+='<tr><td>'+new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR')+'</td><td>'+escapeHtml(p.desc)+'</td><td style="color:var(--vr);font-weight:600">R$ '+p.value.toFixed(2)+'</td></tr>';
});
h+='</tbody></table>';
content.innerHTML=h;
}
modal.classList.add('show');
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},80);
}
function closeCardFaturaModal(){
var modal=document.getElementById('cardFaturaModal');
if(modal)modal.classList.remove('show');
}



/* ===== WALLET REDESIGN JS ===== */
var CARTEIRA_FISICA_ID='Carteira física';
var BANKS_LIST=[
{id:CARTEIRA_FISICA_ID,name:'Carteira física',color:'#F59E0B',domain:null,isPhysical:true},
{id:'Nubank',name:'Nubank',color:'#8B5CF6',domain:'nubank.com.br'},
{id:'Inter',name:'Inter',color:'#FF7A00',domain:'bancointer.com.br'},
{id:'Itaú',name:'Itaú',color:'#003399',domain:'itau.com.br'},
{id:'Bradesco',name:'Bradesco',color:'#CC092F',domain:'bradesco.com.br'},
{id:'Banco do Brasil',name:'Banco do Brasil',color:'#FFCC00',domain:'bb.com.br'},
{id:'Caixa Economica',name:'Caixa Econômica',color:'#005CA9',domain:'caixa.gov.br'},
{id:'Caixa Econômica',name:'Caixa Econômica',color:'#005CA9',domain:'caixa.gov.br'},
{id:'Santander',name:'Santander',color:'#EC0000',domain:'santander.com.br'},
{id:'C6 Bank',name:'C6 Bank',color:'#1A1A1A',domain:'c6bank.com.br'},
{id:'PagBank',name:'PagBank',color:'#00A868',domain:'pagseguro.com.br'},
{id:'Neon',name:'Neon',color:'#00E5A0',domain:'neon.com.br'},
{id:'Safra',name:'Safra',color:'#003F72',domain:'safra.com.br'},
{id:'BTG Pactual',name:'BTG Pactual',color:'#002855',domain:'btg.com.br'},
{id:'Sicoob',name:'Sicoob',color:'#003641',domain:'sicoob.com.br'},
{id:'Sicredi',name:'Sicredi',color:'#33A02C',domain:'sicredi.com.br'},
{id:'Original',name:'Original',color:'#FF6600',domain:'bancooriginal.com.br'},
{id:'Mercado Pago',name:'Mercado Pago',color:'#009EE3',domain:'mercadopago.com.br'},
{id:'PicPay',name:'PicPay',color:'#21C25E',domain:'picpay.com'},
{id:'XP Investimentos',name:'XP Investimentos',color:'#1D1D1B',domain:'xp.com.br'},
{id:'Rico',name:'Rico',color:'#FF5900',domain:'rico.com.vc'},
{id:'Clear',name:'Clear',color:'#00B4D8',domain:'clear.com.br'},
{id:'Modal Mais',name:'Modal Mais',color:'#2D3748',domain:'modalmais.com.br'},
{id:'Banco Pan',name:'Banco Pan',color:'#0066CC',domain:'bancopan.com.br'},
{id:'Will Bank',name:'Will Bank',color:'#FF00AA',domain:'willbank.com.br'},
{id:'Next',name:'Next',color:'#00E88F',domain:'next.me'},
{id:'Agi',name:'Agi',color:'#7B2D8B',domain:'agibank.com.br'},
{id:'Dinheiro',name:'Dinheiro',color:'#27AE60',domain:''},
{id:'Cora',name:'Cora',color:'#6236FF',domain:'corabank.com.br'},
{id:'Banco Sofisa',name:'Banco Sofisa',color:'#0066B3',domain:'sofisa.com.br'},
{id:'Banco BMG',name:'Banco BMG',color:'#E31937',domain:'bancobmg.com.br'},
{id:'Banco Rendimento',name:'Banco Rendimento',color:'#003366',domain:''},
{id:'Banestes',name:'Banestes',color:'#0066CC',domain:'banestes.com.br'},
{id:'BRB',name:'BRB',color:'#0066B3',domain:'brb.com.br'},
{id:'Banco do Nordeste',name:'Banco do Nordeste',color:'#009639',domain:'bnb.gov.br'},
{id:'Stone',name:'Stone',color:'#1A1A1A',domain:'stone.com.br'},
{id:'Caja',name:'Caja',color:'#E31837',domain:''},
{id:'Banco Digio',name:'Digio',color:'#7C3AED',domain:'digio.com.br'},
{id:'Banco BS2',name:'BS2',color:'#00A651',domain:'bs2.com.br'}
];
var _bankColors={};
var _bankDomains={};
BANKS_LIST.forEach(function(b){_bankColors[b.id]=b.color;_bankColors[b.name]=b.color;if(b.domain)_bankDomains[b.id]=b.domain;_bankDomains[b.name]=b.domain;});
_bankColors['Itau']=_bankColors['Itaú'];_bankDomains['Itau']=_bankDomains['Itaú'];
_bankColors['Caixa Economica']=_bankColors['Caixa Econômica'];_bankDomains['Caixa Economica']=_bankDomains['Caixa Econômica'];
var _bankIcons={
'Nubank':'&#128179;','Inter':'&#127968;','Itau':'&#127974;','Itaú':'&#127974;',
'Bradesco':'&#127974;','Banco do Brasil':'&#127974;','Caixa Economica':'&#127974;','Caixa Econômica':'&#127974;',
'Santander':'&#127974;','C6 Bank':'&#128179;','PagBank':'&#128241;','Neon':'&#128179;',
'Mercado Pago':'&#128179;','PicPay':'&#128179;','Dinheiro':'&#128176;'
};

var LOGOS_BANCOS={
nubank:{nome:'Nubank',cor:'#8A05BE',dominio:'nubank.com.br',logo:'/assets/bancos/nubank.png'},
inter:{nome:'Inter',cor:'#FF7A00',dominio:'inter.co',logo:'/assets/bancos/inter.png'},
itau:{nome:'Ita��',cor:'#003399',dominio:'itau.com.br',logo:'/assets/bancos/itau.png'},
bradesco:{nome:'Bradesco',cor:'#CC092F',dominio:'bradesco.com.br',logo:'/assets/bancos/bradesco.png'},
santander:{nome:'Santander',cor:'#EC0000',dominio:'santander.com.br',logo:'/assets/bancos/santander.png'},
bb:{nome:'Banco do Brasil',cor:'#FFCC00',fundo:'#003399',dominio:'bb.com.br',logo:'/assets/bancos/bb.png'},
caixa:{nome:'Caixa',cor:'#005B9A',dominio:'caixa.gov.br',logo:'/assets/bancos/caixa.png'},
c6:{nome:'C6 Bank',cor:'#242424',dominio:'c6bank.com.br',logo:'/assets/bancos/c6.png'},
btg:{nome:'BTG Pactual',cor:'#1B1B1B',dominio:'btgpactual.com',logo:'/assets/bancos/btg.png'},
xp:{nome:'XP',cor:'#000000',dominio:'xp.com.br',logo:'/assets/bancos/xp.png'},
picpay:{nome:'PicPay',cor:'#21C25E',dominio:'picpay.com',logo:'/assets/bancos/picpay.png'},
mercadopago:{nome:'Mercado Pago',cor:'#009EE3',dominio:'mercadopago.com.br',logo:'/assets/bancos/mercadopago.png'},
neon:{nome:'Neon',cor:'#00CFFF',dominio:'neon.com.br',logo:'/assets/bancos/neon.png'},
will:{nome:'Will Bank',cor:'#FFDD00',fundo:'#1a1a1a',dominio:'will.com.br',logo:'/assets/bancos/will.png'},
pagbank:{nome:'PagBank',cor:'#00B94A',dominio:'pagbank.com.br',logo:'/assets/bancos/pagbank.png'},
outro:{nome:'Outro',cor:'#1e3a5f',dominio:null}
};
function getBancoLogoImgHtml(banco,size){
if(!banco)return '';
var px=size||32;
var fallbackBg=banco.fundo||banco.cor||'rgba(255,255,255,.2)';
var fallbackColor=banco.fundo?'#fff':'#fff';
var iniciais=getCardIniciais(banco.nome);
var url=banco.logo||(banco.dominio?'https://img.logo.dev/'+encodeURIComponent(banco.dominio)+'?format=png&size=60':null);
if(url){
return '<span class="banco-logo-wrapper" style="display:inline-flex;align-items:center;justify-content:center;position:relative">'+
'<img src="'+url+'" alt="'+escapeHtml(banco.nome)+'" style="width:'+px+'px;height:'+px+'px;object-fit:contain" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'">'+
'<span class="logo-fallback" style="display:none;width:'+px+'px;height:'+px+'px;min-width:'+px+'px;min-height:'+px+'px;border-radius:50%;background:'+fallbackBg+';color:'+fallbackColor+';align-items:center;justify-content:center;font-weight:800;font-size:'+Math.round(px*0.4)+'px">'+iniciais+'</span>'+
'</span>';
}
return '<span class="logo-fallback" style="display:inline-flex;width:'+px+'px;height:'+px+'px;min-width:'+px+'px;min-height:'+px+'px;border-radius:50%;background:'+fallbackBg+';color:'+fallbackColor+';align-items:center;justify-content:center;font-weight:800;font-size:'+Math.round(px*0.4)+'px">'+iniciais+'</span>';
}

var LOGOS_BANDEIRAS={
visa:{nome:'Visa',svg:'<svg viewBox="0 0 48 16" fill="none" width="42"><text x="0" y="14" font-family="Arial" font-weight="900" font-size="16" fill="white" letter-spacing="-1">VISA</text></svg>'},
mastercard:{nome:'Mastercard',svg:'<svg viewBox="0 0 38 24" width="38"><circle cx="14" cy="12" r="12" fill="#EB001B" opacity="0.9"/><circle cx="24" cy="12" r="12" fill="#F79E1B" opacity="0.9"/><path d="M19 5.3a12 12 0 0 1 0 13.4 A12 12 0 0 1 19 5.3z" fill="#FF5F00" opacity="0.9"/></svg>'},
elo:{nome:'Elo',svg:'<svg viewBox="0 0 48 20" width="36"><text x="0" y="16" font-family="Arial" font-weight="900" font-size="15" fill="white">elo</text></svg>'},
amex:{nome:'American Express',svg:'<svg viewBox="0 0 48 16" width="40"><text x="0" y="13" font-family="Arial" font-weight="700" font-size="11" fill="white" letter-spacing="0.5">AMEX</text></svg>'},
hipercard:{nome:'Hipercard',svg:'<svg viewBox="0 0 48 16" width="40"><text x="0" y="13" font-family="Arial" font-weight="700" font-size="10" fill="#FF0000">Hiper</text></svg>'},
outra:{nome:'Outra',svg:'<svg viewBox="0 0 48 16" width="40"><text x="0" y="13" font-family="Arial" font-weight="700" font-size="10" fill="white">CARD</text></svg>'}
};

var _nomeToBankKey={'nubank':'nubank','inter':'inter','itaú':'itau','itau':'itau','bradesco':'bradesco','santander':'santander','banco do brasil':'bb','bb':'bb','caixa':'caixa','caixa econômica':'caixa','c6 bank':'c6','c6':'c6','btg':'btg','btg pactual':'btg','xp':'xp','picpay':'picpay','mercado pago':'mercadopago','mercadopago':'mercadopago','neon':'neon','will bank':'will','will':'will','pagbank':'pagbank','pag bank':'pagbank'};
function getCardBankKey(c){
if(!c)return 'outro';
var key=(c.bank||'').toLowerCase().trim();
if(LOGOS_BANCOS[key])return key;
var nome=(c.name||'').toLowerCase().replace(/\s+/g,' ').trim();
for(var k in _nomeToBankKey){if(nome.indexOf(k)>=0)return _nomeToBankKey[k];}
if(nome.indexOf('nubank')>=0)return 'nubank';if(nome.indexOf('inter')>=0)return 'inter';if(nome.indexOf('itau')>=0)return 'itau';
if(nome.indexOf('bradesco')>=0)return 'bradesco';if(nome.indexOf('santander')>=0)return 'santander';if(nome.indexOf('brasil')>=0||nome.indexOf('bb')>=0)return 'bb';
if(nome.indexOf('caixa')>=0)return 'caixa';if(nome.indexOf('c6')>=0)return 'c6';if(nome.indexOf('btg')>=0)return 'btg';if(nome.indexOf('xp')>=0)return 'xp';
if(nome.indexOf('picpay')>=0)return 'picpay';if(nome.indexOf('mercadopago')>=0||nome.indexOf('mercado pago')>=0)return 'mercadopago';
if(nome.indexOf('neon')>=0)return 'neon';if(nome.indexOf('will')>=0)return 'will';if(nome.indexOf('pagbank')>=0||nome.indexOf('pag bank')>=0)return 'pagbank';
return 'outro';
}
function getBancoForCard(c){var key=getCardBankKey(c);return LOGOS_BANCOS[key]||LOGOS_BANCOS.outro;}
function getBandeiraSvg(flag){
var key=(flag||'').toLowerCase().replace(/\s+/g,'');
if(LOGOS_BANDEIRAS[key])return LOGOS_BANDEIRAS[key].svg;
if(key==='americanexpress'||key==='amex')return LOGOS_BANDEIRAS.amex.svg;
return LOGOS_BANDEIRAS.outra.svg;
}
function getCardIniciais(nome){
if(!nome||nome.length===0)return '??';
return nome.split(' ').map(function(p){return p[0]}).join('').substring(0,2).toUpperCase();
}

function getBankLogoUrl(name){
var d=_bankDomains[name];
if(d)return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=128';
return '';
}
function getBankInitial(name){
if(!name||name.length===0)return '?';
var parts=name.replace(/\s+e\s+|\s+do\s+|\s+da\s+|\s+de\s+/gi,' ').trim().split(/\s+/);
if(parts.length>=2)return (parts[0][0]+parts[1][0]).toUpperCase();
return name.substring(0,2).toUpperCase();
}
function getBankColor(name){
if(_bankColors[name])return _bankColors[name];
var hash=0;
for(var i=0;i<name.length;i++){hash=name.charCodeAt(i)+((hash<<5)-hash)}
var h=Math.abs(hash)%360;
return 'hsl('+h+',55%,45%)';
}
function getBankLogoHtml(accName,px){
var size=px||40;
var norm=function(s){return (s||'').toLowerCase().trim()};
var accNorm=norm(accName);
if(accNorm==='carteira física'||accNorm==='carteira fisica'){
var c=getBankColor(accName);
var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"/><path d="M3 10h18"/><path d="M7 15h.01"/></svg>';
return '<span class="wlt-bank-wallet-icon" style="width:'+size+'px;height:'+size+'px;min-width:'+size+'px;min-height:'+size+'px;border-radius:10px;background:'+c+';color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:6px;box-sizing:border-box">'+svg+'</span>';
}
var bancoByNome=null;
var keyByMap=_nomeToBankKey[accNorm];
if(keyByMap&&LOGOS_BANCOS[keyByMap])bancoByNome=LOGOS_BANCOS[keyByMap];
else{for(var k in LOGOS_BANCOS){if(norm(LOGOS_BANCOS[k].nome)===accNorm){bancoByNome=LOGOS_BANCOS[k];break}}}
if(bancoByNome&&bancoByNome.dominio)return getBancoLogoImgHtml(bancoByNome,size);
var color=getBankColor(accName);
var url=getBankLogoUrl(accName);
var initial=getBankInitial(accName);
var initialSpan='<span class="wlt-bank-initial" style="width:'+size+'px;height:'+size+'px;min-width:'+size+'px;min-height:'+size+'px;border-radius:10px;background:'+color+';color:#fff;display:none;align-items:center;justify-content:center;font-size:'+Math.round(size*0.45)+'px;font-weight:800;flex-shrink:0">'+initial+'</span>';
if(url)return '<span class="wlt-bank-logo-wrap" style="display:inline-flex;align-items:center;justify-content:center;position:relative"><img class="wlt-bank-logo" src="'+url+'" alt="" style="width:'+size+'px;height:'+size+'px;border-radius:10px;object-fit:contain;background:#fff" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'inline-flex\'">'+initialSpan+'</span>';
return '<span class="wlt-bank-initial" style="width:'+size+'px;height:'+size+'px;min-width:'+size+'px;min-height:'+size+'px;border-radius:10px;background:'+color+';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:'+Math.round(size*0.45)+'px;font-weight:800;flex-shrink:0">'+initial+'</span>';
}

function renderWltBankList(filter){
var list=document.getElementById('wltBankList');
var sel=document.getElementById('wBankSel');
if(!list)return;
var q=(filter||'').trim().toLowerCase();
var seen={};
var opts='<option value="">Selecione um banco...</option>';
var items='';
BANKS_LIST.forEach(function(b){
if(seen[b.id])return;
seen[b.id]=true;
if(q&&b.name.toLowerCase().indexOf(q)===-1)return;
opts+='<option value="'+b.id.replace(/"/g,'&quot;')+'">'+b.name+'</option>';
var safeId=b.id.replace(/'/g,"\\'");
var logoHtml=getBankLogoHtml(b.id,44);
items+='<div class="wlt-bank-item" data-id="'+b.id.replace(/"/g,'&quot;')+'" onclick="document.getElementById(\'wBankSel\').value=\''+safeId+'\';wBankChg();document.querySelectorAll(\'.wlt-bank-item\').forEach(function(el){el.classList.remove(\'selected\')});document.querySelectorAll(\'.wlt-quick-add-card\').forEach(function(el){el.classList.remove(\'selected\')});this.classList.add(\'selected\');document.getElementById(\'wBalDiv\').style.display=\'block\';document.getElementById(\'wCestaDiv\').style.display=\'block\'">';
items+='<div class="wlt-bank-item-logo">'+logoHtml+'</div>';
items+='<span class="wlt-bank-item-name">'+b.name+'</span>';
items+='<span class="wlt-bank-item-arrow">&#10148;</span></div>';
});
opts+='<option value="__custom__">+ Outro (digitar)...</option>';
items+='<div class="wlt-bank-item" data-id="__custom__" onclick="document.getElementById(\'wBankSel\').value=\'__custom__\';wBankChg();document.querySelectorAll(\'.wlt-bank-item\').forEach(function(el){el.classList.remove(\'selected\')});document.querySelectorAll(\'.wlt-quick-add-card\').forEach(function(el){el.classList.remove(\'selected\')});this.classList.add(\'selected\');document.getElementById(\'wBalDiv\').style.display=\'block\';document.getElementById(\'wCestaDiv\').style.display=\'block\'"><div class="wlt-bank-item-logo"><span class="wlt-bank-initial" style="width:44px;height:44px;border-radius:10px;background:var(--brd);color:var(--t2);display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">+</span></div><span class="wlt-bank-item-name">Outro (digitar nome)</span><span class="wlt-bank-item-arrow">&#10148;</span></div>';
if(sel)sel.innerHTML=opts;
list.innerHTML=items||'<div style="padding:16px;color:var(--t2);text-align:center">Nenhum banco encontrado.</div>';
}
function toggleWltCesta(){
var check=document.getElementById('wCestaCheck');
var fields=document.getElementById('wCestaFields');
if(fields)fields.style.display=check&&check.checked?'grid':'none';
}
function selectWltQuickAdd(bankId,el){
document.getElementById('wBankSel').value=bankId;
wBankChg();
document.querySelectorAll('.wlt-bank-item').forEach(function(e){e.classList.remove('selected')});
document.querySelectorAll('.wlt-quick-add-card').forEach(function(e){e.classList.remove('selected')});
if(el)el.classList.add('selected');
var item=document.querySelector('.wlt-bank-item[data-id="'+bankId.replace(/"/g,'&quot;')+'"]');
if(item)item.classList.add('selected');
document.getElementById('wBalDiv').style.display='block';
document.getElementById('wCestaDiv').style.display='block';
}
function openWltModal(){
var m=document.getElementById('wltModalOv');
document.getElementById('wBankSel').value='';
document.getElementById('wCustDiv').style.display='none';
document.getElementById('wBalDiv').style.display='none';
document.getElementById('wCestaDiv').style.display='none';
document.querySelectorAll('.wlt-quick-add-card').forEach(function(el){el.classList.remove('selected')});
var searchEl=document.getElementById('wltBankSearch');
if(searchEl){searchEl.value='';}
document.getElementById('wCustName').value='';
document.getElementById('wNewBal').value='';
var cestaCheck=document.getElementById('wCestaCheck');if(cestaCheck)cestaCheck.checked=false;
document.getElementById('wCestaVal').value='';
document.getElementById('wCestaDay').value='';
toggleWltCesta();
renderWltBankList('');
m.classList.add('show');
setTimeout(function(){if(searchEl)searchEl.focus();if(typeof lucide!=='undefined')lucide.createIcons()},200);
}

function closeWltModal(){
document.getElementById('wltModalOv').classList.remove('show');
}

function openWltTransfer(){
var ov=document.getElementById('wltTransferModalOv');
var aOv=document.getElementById('wltAjusteModalOv');
if(aOv)aOv.classList.remove('show');
if(ov){ov.classList.add('show');popTfSels();setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons()},100)}
}

function openWltAjuste(preSelectAcc){
var ov=document.getElementById('wltAjusteModalOv');
var tOv=document.getElementById('wltTransferModalOv');
if(tOv)tOv.classList.remove('show');
if(ov){
ov.classList.add('show');
renderBalAccSelect();
document.querySelectorAll('.reajuste-opcao').forEach(function(el){el.classList.remove('selected')});
var transOpt=document.querySelector('.reajuste-opcao[data-mode="transacao"]');
if(transOpt)transOpt.classList.add('selected');
window._reajusteMode='transacao';
document.getElementById('balDesc').value='';
if(preSelectAcc){
var sel=document.getElementById('balAcc');
if(sel&&sel.querySelector('option[value="'+preSelectAcc.replace(/"/g,'&quot;')+'"]'))sel.value=preSelectAcc;
}
var curAcc=document.getElementById('balAcc').value;
var curBal=curAcc&&typeof getAccBal==='function'?getAccBal(curAcc).atual:0;
document.getElementById('balVal').value=curBal.toFixed(2).replace('.',',');
updateReajusteSaldoInicial();
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons()},100);
}
}
function updateReajusteSaldoInicial(){
var acc=document.getElementById('balAcc').value;
var ini=acc?(accountBalances[acc]||0):0;
document.getElementById('reajusteSaldoInicial').textContent='R$ '+ini.toFixed(2).replace('.',',');
}
function setReajusteMode(mode,el){
window._reajusteMode=mode;
document.querySelectorAll('.reajuste-opcao').forEach(function(o){o.classList.remove('selected')});
if(el)el.classList.add('selected');
}
function applyReajusteSaldo(){
var acc=document.getElementById('balAcc').value;
var val=parseFloat((document.getElementById('balVal').value||'0').replace(',','.'))||0;
var desc=(document.getElementById('balDesc').value||'').trim()||'Ajuste de saldo';
if(!acc){toast(typeof t==='function'?t('toast_selecione_conta'):'Selecione uma conta','err');return;}
var b=getAccBal(acc);
var diff=val-b.atual;
if(Math.abs(diff)<0.01){toast(typeof t==='function'?t('toast_saldo_igual_atual'):'O novo saldo é igual ao atual','info');closeWltPanel('wltAjustePanel');return;}
if(window._reajusteMode==='transacao'){
var now=new Date().toISOString().split('T')[0];
var tipo=diff>0?'receita':'despesa';
var valor=Math.abs(diff);
entries.push({id:Date.now(),type:tipo,desc:desc,value:valor,category:'Ajuste',date:now,tags:['ajuste'],account:acc,status:'pago'});
saveData();renderCarteira();renderDashW();
toast(typeof t==='function'?t('toast_transacao_ajuste_criada'):'Transação de ajuste criada!','ok');
}else{
var newIni=val-b.rec+b.desp;
accountBalances[acc]=Math.round(newIni*100)/100;
saveData();renderCarteira();renderDashW();
toast(typeof t==='function'?t('toast_saldo_inicial_atualizado'):'Saldo inicial atualizado!','ok');
}
document.getElementById('balVal').value='';
document.getElementById('balDesc').value='';
closeWltPanel('wltAjustePanel');
}

function closeWltPanel(id){
var ov=id==='wltTransferPanel'?document.getElementById('wltTransferModalOv'):id==='wltAjustePanel'?document.getElementById('wltAjusteModalOv'):null;
if(ov)ov.classList.remove('show');
}
function openCarteiraDetail(){
var w=document.getElementById('carteiraDetailWrap');
var m=document.getElementById('contasMainWrap');
var acts=document.querySelector('.wlt-actions');
if(w&&m){w.classList.add('on');m.style.display='none';if(acts)acts.style.display='none'}
var acc='Carteira física';
var b=getAccBal(acc);
var now=new Date();
var mes=(now.getMonth()+1).toString().padStart(2,'0');
var prefix=now.getFullYear()+'-'+mes;
var recM=0,despM=0;
entries.forEach(function(e){if(e.account===acc&&e.date&&e.date.startsWith(prefix)){if(e.type==='receita')recM+=e.value;else despM+=e.value}});
document.getElementById('carteiraDetailSaldo').textContent='R$ '+b.atual.toFixed(2).replace('.',',');
document.getElementById('carteiraDetailPrevisto').textContent='R$ '+b.atual.toFixed(2).replace('.',',');
document.getElementById('carteiraDetailRec').textContent='R$ '+recM.toFixed(2).replace('.',',');
document.getElementById('carteiraDetailDesp').textContent='R$ '+despM.toFixed(2).replace('.',',');
var movList=document.getElementById('carteiraTabMov');
if(movList){
var accEntries=entries.filter(function(e){return e.account===acc}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
var h='';
for(var i=0;i<Math.min(20,accEntries.length);i++){
var e=accEntries[i];
var s=e.type==='receita'?'+':'';
var c=e.type==='receita'?'var(--green)':'var(--danger)';
h+='<div class="wlt-ext-row"><span class="wlt-ext-date">'+(e.date||'').split('-').reverse().join('/')+'</span><span class="wlt-ext-desc">'+(e.desc||'')+'</span><span class="wlt-ext-val" style="color:'+c+'">'+s+'R$ '+(e.value||0).toFixed(2).replace('.',',')+'</span></div>';
}
movList.innerHTML=h||'<div style="padding:24px;text-align:center;color:var(--t3)">Nenhuma movimentação</div>';
}
setCarteiraTab('visao');
if(typeof lucide!=='undefined')lucide.createIcons();
}
function closeCarteiraDetail(){
var w=document.getElementById('carteiraDetailWrap');
var m=document.getElementById('contasMainWrap');
var acts=document.querySelector('.wlt-actions');
if(w&&m){w.classList.remove('on');m.style.display='';if(acts)acts.style.display='flex'}
}

var _detalhesContaAcc='';
var _editarContaAcc='';
var ACC_CORES=['#4C7BF4','#8B5CF6','#22C55E','#F59E0B','#6B7280'];

function openDetalhesConta(acc){
_detalhesContaAcc=acc||_detalhesContaAcc;
if(!_detalhesContaAcc)return;
var ov=document.getElementById('detalhesContaModalOv');
if(!ov)return;
var sel=document.getElementById('detalhesContaSel');
if(sel){
sel.innerHTML=userAccs.map(function(a){return '<option value="'+a.replace(/"/g,'&quot;')+'"'+(a===_detalhesContaAcc?' selected':'')+'>'+escapeHtml(a)+'</option>'}).join('');
}
var b=getAccBal(_detalhesContaAcc);
var now=new Date();
var prefix=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var recM=0,despM=0,transfM=0;
entries.forEach(function(e){
if(e.account!==_detalhesContaAcc)return;
if(e.date&&e.date.startsWith(prefix)){
if(e.isTransfer)transfM++;else if(e.type==='receita'){recM+=e.value;}else despM+=e.value;
}
});
var meta=accountMeta[_detalhesContaAcc]||{};
var incluir=meta.incluirNaSoma!==false;
document.getElementById('detalhesContaSaldo').textContent='R$ '+b.atual.toFixed(2).replace('.',',');
document.getElementById('detalhesContaSaldo').className='detalhes-conta-saldo '+(b.atual>=0?'positive':'negative');
document.getElementById('detalhesContaTipo').textContent=meta.tipo||'Conta corrente';
document.getElementById('detalhesContaSaldoIni').textContent='R$ '+(b.ini||0).toFixed(2).replace('.',',');
document.getElementById('detalhesContaDespesas').textContent=String(entries.filter(function(e){return e.account===_detalhesContaAcc&&e.type==='despesa'&&!e.isTransfer}).length);
document.getElementById('detalhesContaReceitas').textContent=String(entries.filter(function(e){return e.account===_detalhesContaAcc&&e.type==='receita'&&!e.isTransfer}).length);
document.getElementById('detalhesContaTransf').textContent=String(entries.filter(function(e){return e.account===_detalhesContaAcc&&e.isTransfer}).length);
document.getElementById('detalhesContaIncluir').checked=incluir;
ov.classList.add('show');
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons()},100);
}
function closeDetalhesConta(){
var ov=document.getElementById('detalhesContaModalOv');
if(ov)ov.classList.remove('show');
}
function switchDetalhesConta(acc){
if(!acc)return;
_detalhesContaAcc=acc;
openDetalhesConta(acc);
}
function toggleDetalhesIncluirNaSoma(){
if(!_detalhesContaAcc)return;
if(!accountMeta[_detalhesContaAcc])accountMeta[_detalhesContaAcc]={};
accountMeta[_detalhesContaAcc].incluirNaSoma=document.getElementById('detalhesContaIncluir').checked;
saveData();
}

function openEditarConta(acc){
_editarContaAcc=acc||_editarContaAcc;
if(!_editarContaAcc)return;
var ov=document.getElementById('editarContaModalOv');
if(!ov)return;
var b=getAccBal(_editarContaAcc);
var meta=accountMeta[_editarContaAcc]||{};
document.getElementById('editarContaSaldo').value='R$ '+b.atual.toFixed(2).replace('.',',');
document.getElementById('editarContaInstNome').textContent=_editarContaAcc;
var logoEl=document.getElementById('editarContaInstLogo');
logoEl.innerHTML=typeof getBankLogoHtml==='function'?getBankLogoHtml(_editarContaAcc,32):'';
document.getElementById('editarContaNome').value=_editarContaAcc;
var tipoSel=document.getElementById('editarContaTipo');
tipoSel.value=meta.tipo||'Conta corrente';
var coresEl=document.getElementById('editarContaCores');
var corAtual=meta.cor||getBankColor(_editarContaAcc);
var coresList=ACC_CORES.indexOf(corAtual)>=0?ACC_CORES:ACC_CORES.concat([corAtual]);
coresEl.innerHTML=coresList.map(function(c){return '<div class="editar-conta-cor'+(c===corAtual?' selected':'')+'" style="background:'+c+'" data-cor="'+c+'" onclick="selectEditarContaCor(this)"></div>'}).join('');
document.getElementById('editarContaIncluir').checked=meta.incluirNaSoma!==false;
ov.classList.add('show');
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons()},100);
}
function selectEditarContaCor(el){
document.querySelectorAll('#editarContaCores .editar-conta-cor').forEach(function(c){c.classList.remove('selected')});
if(el)el.classList.add('selected');
}
function closeEditarConta(){
var ov=document.getElementById('editarContaModalOv');
if(ov)ov.classList.remove('show');
}
function saveEditarConta(){
if(!_editarContaAcc)return;
var novoNome=document.getElementById('editarContaNome').value.trim();
if(!novoNome){toast(typeof t==='function'?t('toast_digite_conta'):'Digite o nome da conta','err');return}
var meta=accountMeta[_editarContaAcc]||{};
meta.tipo=document.getElementById('editarContaTipo').value;
var corEl=document.querySelector('#editarContaCores .editar-conta-cor.selected');
meta.cor=corEl?corEl.getAttribute('data-cor'):getBankColor(_editarContaAcc);
meta.incluirNaSoma=document.getElementById('editarContaIncluir').checked;
if(novoNome!==_editarContaAcc){
var idx=userAccs.indexOf(_editarContaAcc);
if(idx>=0){
userAccs[idx]=novoNome;
var bal=accountBalances[_editarContaAcc];
if(bal!==undefined){delete accountBalances[_editarContaAcc];accountBalances[novoNome]=bal;}
var cesta=accountCesta[_editarContaAcc];
if(cesta){delete accountCesta[_editarContaAcc];accountCesta[novoNome]=cesta;}
var oldMeta=accountMeta[_editarContaAcc];
if(oldMeta){delete accountMeta[_editarContaAcc];accountMeta[novoNome]=oldMeta;}
entries.forEach(function(e){if(e.account===_editarContaAcc)e.account=novoNome;});
recurrents.forEach(function(r){if(r.account===_editarContaAcc)r.account=novoNome;});
investments.forEach(function(i){if(i.conta===_editarContaAcc)i.conta=novoNome;});
_editarContaAcc=novoNome;
accountMeta[novoNome]=meta;
}else{
accountMeta[_editarContaAcc]=meta;
}
}else{
accountMeta[_editarContaAcc]=meta;
}
saveData();renderCarteira();renderDashW();closeEditarConta();toast(typeof t==='function'?t('toast_conta_atualizada'):'Conta atualizada!','ok');
}

function setCarteiraTab(tab){
document.querySelectorAll('.carteira-detail-tab').forEach(function(t){t.classList.toggle('on',t.getAttribute('data-tab')===tab)});
document.getElementById('carteiraTabVisao').style.display=tab==='visao'?'block':'none';
document.getElementById('carteiraTabMov').style.display=tab==='mov'?'block':'none';
}

function renderBalAccSelect(){
var sel=document.getElementById('balAcc');
if(!sel)return;
var opts='';
for(var j=0;j<userAccs.length;j++){
var cb=accountBalances[userAccs[j]]||0;
opts+='<option value="'+userAccs[j]+'">'+userAccs[j]+(cb?' (R$ '+cb.toFixed(2)+')':'')+'</option>';
}
sel.innerHTML=opts;
}

function selectWltAccount(accName,el){
var all=document.querySelectorAll('.wlt-acc-card');
for(var i=0;i<all.length;i++){all[i].classList.remove('wlt-active')}
if(el)el.classList.add('wlt-active');
var s1=document.getElementById('wTfFrom');
if(s1)s1.value=accName;
showBankExtratoModal(accName);
}

function showWltExtrato(accName){
showBankExtratoModal(accName);
}
function showBankExtratoModal(accName){
var modal=document.getElementById('bankExtratoModal');
var box=document.getElementById('bankExtratoBox');
var header=document.getElementById('bankExtratoHeader');
var logoEl=document.getElementById('bankExtratoLogo');
var list=document.getElementById('bankExtratoList');
if(!modal||!box||!list)return;
var color=(accountMeta[accName]&&accountMeta[accName].cor)||getBankColor(accName);
box.style.background='linear-gradient(135deg,'+color+','+color+'dd)';
logoEl.innerHTML='<div style="display:flex;align-items:center;gap:12px"><span style="background:rgba(255,255,255,.25);border-radius:10px;padding:6px;display:inline-flex">'+(typeof getBankLogoHtml==='function'?getBankLogoHtml(accName,36):'')+'</span><div><div style="font-size:.75em;opacity:.9">Extrato</div><div style="font-weight:800;font-size:1.1em">'+escapeHtml(accName)+'</div></div></div>';
var filtered=entries.filter(function(e){return e.account===accName}).sort(function(a,b){return b.date>a.date?1:b.date<a.date?-1:0});
if(filtered.length===0){
list.innerHTML='<div style="text-align:center;color:var(--t3);padding:24px;font-size:.88em">Nenhuma movimentação nesta conta.</div>';
}else{
var last=filtered.slice(0,30);
var h='';
last.forEach(function(e){
var isIn=e.type==='receita';
var sign=isIn?'+':'-';
var cls=isIn?'wlt-ext-in':'wlt-ext-out';
var d=e.date||'';
if(d.length>=10)d=d.substring(8,10)+'/'+d.substring(5,7);
h+='<div class="wlt-ext-row"><span class="wlt-ext-date">'+d+'</span><span class="wlt-ext-desc">'+escapeHtml(e.desc)+'</span><span class="wlt-ext-val '+cls+'">'+sign+'R$ '+e.value.toFixed(2).replace('.',',')+'</span></div>';
});
if(filtered.length>30)h+='<div style="text-align:center;padding:10px;font-size:.78em;color:var(--t3)">Mostrando 30 de '+filtered.length+'</div>';
list.innerHTML=h;
}
modal.classList.add('show');
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},80);
}
function closeBankExtratoModal(){
var modal=document.getElementById('bankExtratoModal');
if(modal)modal.classList.remove('show');
}

/* ===== OVERRIDE renderCarteira ===== */
function renderCarteira(){
var grid=document.getElementById('contasGrid');
var carousel=document.getElementById('wltCarousel');
var patBox=document.getElementById('wltPatTotal');
var deltaBox=document.getElementById('wltPatDelta');
var sidebarAtual=document.getElementById('contasSidebarAtual');
var sidebarPrevisto=document.getElementById('contasSidebarPrevisto');
var oldWC=document.getElementById('walletCards');

var total=0;
var h='';
var accsOrder=userAccs.length?[].concat(userAccs.filter(function(a){return(a||'').toLowerCase().replace(/\s+/g,' ')==='carteira física';}),userAccs.filter(function(a){return(a||'').toLowerCase().replace(/\s+/g,' ')!=='carteira física';})):[];
// Aplicar ordem salva pelo drag
try{var _savedOrd=JSON.parse(localStorage.getItem('sib_contas_order')||'null');if(_savedOrd&&Array.isArray(_savedOrd)&&_savedOrd.length>0){accsOrder.sort(function(a,b){var ia=_savedOrd.indexOf(a);var ib=_savedOrd.indexOf(b);if(ia<0)ia=9999;if(ib<0)ib=9999;return ia-ib;});}}catch(e){}

if(grid){
var novaCard='<div class="contas-card contas-card-nova" onclick="openWltModal()" role="button" tabindex="0"><div class="contas-card-nova-icon">+</div><span>Nova conta</span></div>';
if(accsOrder.length===0){
grid.innerHTML=novaCard+'<div class="contas-card" style="grid-column:1/-1;text-align:center;color:var(--t2);padding:24px">Nenhuma conta cadastrada. Clique em <b>Nova conta</b> acima para adicionar.</div>';
if(sidebarAtual)sidebarAtual.textContent='R$ 0,00';
if(sidebarPrevisto)sidebarPrevisto.textContent='R$ 0,00';
renderBalAccSelect();
popTfSels();
return;
}

for(var i=0;i<accsOrder.length;i++){
var acc=accsOrder[i];
var b=getAccBal(acc);
if(!(accountMeta[acc]&&accountMeta[acc].incluirNaSoma===false))total+=b.atual;
var color=(accountMeta[acc]&&accountMeta[acc].cor)||getBankColor(acc);
var safeAcc=acc.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var saldoCls=b.atual>=0?'positive':'negative';
var saldoStr='R$ '+b.atual.toFixed(2).replace(".",",");
var isCarteira=(acc||'').toLowerCase().replace(/\s+/g,' ')==='carteira física';
var cardClick=' onclick="event.stopPropagation();showBankExtratoModal(\''+safeAcc+'\')" role="button" tabindex="0" style="cursor:pointer"';
h+='<div class="contas-card contas-card-brand" style="background:linear-gradient(135deg,'+color+','+color+'dd);border-color:rgba(255,255,255,.12)"'+cardClick+'>';
h+='<div class="contas-card-top">';
h+='<div class="contas-card-logo" style="background:rgba(255,255,255,.25)">'+getBankLogoHtml(acc,40)+'</div>';
h+='<span class="contas-card-name">'+escapeHtml(acc)+'</span>';
h+='<button type="button" class="contas-card-menu" onclick="event.stopPropagation();toggleContasCardMenu(this,\''+safeAcc+'\')" title="Opções"><i data-lucide="more-vertical" style="width:18px;height:18px"></i></button>';
h+='</div>';
h+='<div class="contas-card-saldo '+saldoCls+'">'+saldoStr+'</div>';
h+='<div class="contas-card-prev">Saldo previsto: '+saldoStr+'</div>';
h+='<div class="contas-card-foot">';
h+='<a href="#" onclick="event.preventDefault();event.stopPropagation();showBankExtratoModal(\''+safeAcc+'\')">Ver extrato</a>';
h+='</div>';
h+='</div>';
}
grid.innerHTML=novaCard+h;
if(sidebarAtual){sidebarAtual.textContent='R$ '+total.toFixed(2).replace(".",",");sidebarAtual.className='contas-sidebar-value '+(total>=0?'positive':'negative');}
if(sidebarPrevisto){sidebarPrevisto.textContent='R$ '+total.toFixed(2).replace(".",",");sidebarPrevisto.className='contas-sidebar-value '+(total>=0?'positive':'negative');}
if(typeof lucide!=='undefined')lucide.createIcons();
renderBalAccSelect();
popTfSels();
setTimeout(function(){initContasSortable(grid);},60);
return;
}

if(!carousel){
if(oldWC){
for(var k=0;k<userAccs.length;k++){var a2=userAccs[k];if(accountMeta[a2]&&accountMeta[a2].incluirNaSoma===false)continue;var b2=getAccBal(a2);total+=b2.atual;}
oldWC.innerHTML=h;
}
return;
}

if(userAccs.length===0){
carousel.innerHTML='<div style="text-align:center;color:var(--t2);padding:24px;width:100%">Nenhuma conta cadastrada.<br>Clique em <b>+ Conta</b> para adicionar!</div>';
if(patBox)patBox.textContent='R$ 0,00';
if(deltaBox)deltaBox.textContent='';
renderBalAccSelect();
popTfSels();
return;
}

for(var i=0;i<userAccs.length;i++){
var acc=userAccs[i];
var b=getAccBal(acc);
if(!(accountMeta[acc]&&accountMeta[acc].incluirNaSoma===false))total+=b.atual;
var color=getBankColor(acc);
var corSaldo=b.atual>=0?'rgba(255,255,255,.95)':'#FCA5A5';
var safeAcc=acc.replace(/'/g,"\\'");
h+='<div class="wlt-acc-card" style="background:linear-gradient(135deg,'+color+','+color+'cc)" onclick="selectWltAccount(\''+safeAcc+'\',this)">';
h+='<div class="wlt-acc-actions"><button onclick="event.stopPropagation();delAccount(\''+safeAcc+'\')" title="Excluir">&#128465;</button></div>';
h+='<div class="wlt-acc-name" style="display:flex;align-items:center;gap:10px">'+getBankLogoHtml(acc,36)+' <span>'+acc+'</span></div>';
h+='<div class="wlt-acc-bal" style="color:'+corSaldo+'">R$ '+b.atual.toFixed(2).replace(".",",")+'</div>';
h+='<div class="wlt-acc-detail"><span style="color:#86EFAC">+'+b.rec.toFixed(0)+'</span><span style="color:#FCA5A5">-'+b.desp.toFixed(0)+'</span></div>';
h+='</div>';
}
carousel.innerHTML=h;
if(patBox)patBox.innerHTML='<span style="color:'+(total>=0?'#fff':'#FCA5A5')+'">R$ '+total.toFixed(2).replace(".",",")+'</span>';
if(deltaBox){
var now=new Date();
var mesAtual=(now.getMonth()+1).toString().padStart(2,'0');
var prefix=now.getFullYear()+'-'+mesAtual;
var recMes=0,despMes=0;
entries.forEach(function(e){if(e.date&&e.date.startsWith(prefix)){if(e.type==='receita')recMes+=e.value;else despMes+=e.value;}});
var delta=recMes-despMes;
deltaBox.innerHTML=delta!==0?'<span style="color:'+(delta>0?'#86EFAC':'#FCA5A5')+'">'+(delta>0?'+':'')+'R$ '+delta.toFixed(2).replace(".",",")+' este mês</span>':'';
}
if(oldWC)oldWC.style.display='none';
var tp=document.getElementById('totalPatrimonio');
if(tp)tp.innerHTML='<span style="color:'+(total>=0?'var(--pri)':'#e74c3c')+'">R$ '+total.toFixed(2)+'</span>';
renderBalAccSelect();
popTfSels();
}
function toggleContasCardMenu(btn,acc){
var existing=document.getElementById('contasCardMenuDropdown');
if(existing){existing.remove();return;}
var esc=String(acc).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
var menu=document.createElement('div');
menu.id='contasCardMenuDropdown';
menu.style.cssText='position:fixed;background:var(--card);border:1px solid var(--brd);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);padding:6px 0;z-index:9999;min-width:180px';
var r=btn.getBoundingClientRect();
// Posicionar à esquerda do botão para não sair da tela
var menuLeft=r.left-180;
if(menuLeft<8)menuLeft=r.right+4;
if(menuLeft+180>window.innerWidth-8)menuLeft=window.innerWidth-188;
menu.style.left=menuLeft+'px';
var menuTop=r.top;
if(menuTop+220>window.innerHeight-8)menuTop=r.bottom-220;
menu.style.top=Math.max(8,menuTop)+'px';
menu.innerHTML='<button type="button" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:var(--t1);font-size:.85rem;cursor:pointer" onclick="document.getElementById(\'contasCardMenuDropdown\')?.remove();openDetalhesConta(\''+esc+'\')">Detalhes da conta</button>'+
'<button type="button" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:var(--t1);font-size:.85rem;cursor:pointer" onclick="document.getElementById(\'contasCardMenuDropdown\')?.remove();openWltAjuste(\''+esc+'\')">Reajuste de saldo</button>'+
'<button type="button" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:var(--t1);font-size:.85rem;cursor:pointer" onclick="document.getElementById(\'contasCardMenuDropdown\')?.remove();openEditarConta(\''+esc+'\')">Editar conta</button>'+
'<button type="button" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:var(--t1);font-size:.85rem;cursor:pointer" onclick="document.getElementById(\'contasCardMenuDropdown\')?.remove();showBankExtratoModal(\''+esc+'\')">Ver extrato</button>'+
'<button type="button" style="display:block;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:var(--danger);font-size:.85rem;cursor:pointer" onclick="document.getElementById(\'contasCardMenuDropdown\')?.remove();delAccount(\''+esc+'\')">Excluir</button>';
document.body.appendChild(menu);
document.addEventListener('click',function closeMenu(ev){if(!menu.contains(ev.target)&&ev.target!==btn){menu.remove();document.removeEventListener('click',closeMenu);}});
}

function toggleContasHeaderMenu(btn){
var existing=document.getElementById('contasHeaderMenuDropdown');
if(existing){existing.remove();return;}
var menu=document.createElement('div');
menu.id='contasHeaderMenuDropdown';
menu.style.cssText='position:fixed;background:var(--card);border:1px solid var(--brd);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);padding:6px 0;z-index:9999;min-width:200px';
var r=btn.getBoundingClientRect();
var left=Math.max(8,r.right-200);
menu.style.left=left+'px';
menu.style.top=(r.bottom+6)+'px';
var itemStyle='display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 16px;border:none;background:none;color:var(--t1);font-size:.88rem;cursor:pointer;';
menu.innerHTML=
'<button type="button" style="'+itemStyle+'" onclick="document.getElementById(\'contasHeaderMenuDropdown\')?.remove();openTransferModal()"><i data-lucide="arrow-left-right" style="width:16px;height:16px;opacity:.7"></i> Transferir entre contas</button>'+
'<button type="button" style="'+itemStyle+'" onclick="document.getElementById(\'contasHeaderMenuDropdown\')?.remove();openWltModal()"><i data-lucide="plus-circle" style="width:16px;height:16px;opacity:.7"></i> Nova conta</button>'+
'<button type="button" style="'+itemStyle+'" onclick="document.getElementById(\'contasHeaderMenuDropdown\')?.remove();openAjustarSaldoGlobal()"><i data-lucide="settings-2" style="width:16px;height:16px;opacity:.7"></i> Ajustar saldos iniciais</button>'+
'<div style="height:1px;background:var(--brd);margin:4px 0"></div>'+
'<button type="button" style="'+itemStyle+'" onclick="document.getElementById(\'contasHeaderMenuDropdown\')?.remove();typeof showPatrimonio===\'function\'&&showPatrimonio()"><i data-lucide="bar-chart-2" style="width:16px;height:16px;opacity:.7"></i> Resumo do patrimônio</button>'+
'<button type="button" style="'+itemStyle+'" onclick="document.getElementById(\'contasHeaderMenuDropdown\')?.remove();expCSV&&expCSV()"><i data-lucide="download" style="width:16px;height:16px;opacity:.7"></i> Exportar extrato CSV</button>';
document.body.appendChild(menu);
if(typeof lucide!=='undefined')lucide.createIcons();
document.addEventListener('click',function closeHMenu(ev){if(!menu.contains(ev.target)&&ev.target!==btn){menu.remove();document.removeEventListener('click',closeHMenu);}});
}

/* ── Drag-to-reorder Contas ── */
function initContasSortable(grid){
if(!grid||typeof Sortable==='undefined')return;
if(window._contasSortable){window._contasSortable.destroy();window._contasSortable=null;}
// Aplicar ordem salva
var saved=null;
try{saved=JSON.parse(localStorage.getItem('sib_contas_order')||'null');}catch(e){}
if(saved&&Array.isArray(saved)&&saved.length>0){
var brands=Array.from(grid.querySelectorAll('.contas-card-brand'));
var sorted=[];
saved.forEach(function(name){var c=brands.find(function(b){var n=b.querySelector('.contas-card-name');return n&&n.textContent.trim()===name;});if(c)sorted.push(c);});
brands.forEach(function(c){if(sorted.indexOf(c)<0)sorted.push(c);});
sorted.forEach(function(c){grid.appendChild(c);});
}
window._contasSortable=Sortable.create(grid,{
animation:180,
draggable:'.contas-card-brand',
filter:'.contas-card-nova',
ghostClass:'sortable-ghost',
chosenClass:'sortable-chosen',
delay:120,
delayOnTouchOnly:true,
onEnd:function(){
var names=Array.from(grid.querySelectorAll('.contas-card-brand .contas-card-name')).map(function(e){return e.textContent.trim();});
localStorage.setItem('sib_contas_order',JSON.stringify(names));
toast('Ordem das contas salva!','ok');
}
});
}

function openAjustarSaldoGlobal(){
// Abre o modal de ajuste de saldo para que o usuário escolha a conta
var accs=(typeof userAccs!=='undefined'&&Array.isArray(userAccs))?userAccs:[];
if(accs.length===0){toast('Nenhuma conta cadastrada.','warn');return;}
if(accs.length===1){openWltAjuste(accs[0]);return;}
// Mais de uma conta: mostra picker simples
var ov=document.createElement('div');
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center';
var box=document.createElement('div');
box.style.cssText='background:var(--card);border:1px solid var(--brd);border-radius:16px;padding:24px;min-width:280px;max-width:340px;width:90%';
box.innerHTML='<h3 style="margin:0 0 16px;font-size:1rem">Selecionar conta para ajustar</h3>'+
accs.map(function(a){return'<button type="button" onclick="this.closest(\'[data-ov]\').remove();openWltAjuste(\''+String(a).replace(/'/g,"\\'")+'\')" style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;margin-bottom:8px;border:1px solid var(--brd);border-radius:10px;background:var(--bg2);color:var(--t1);cursor:pointer;font-size:.9rem">'+getBankLogoHtml(a,28)+' '+escapeHtml(a)+'</button>';}).join('')+
'<button type="button" onclick="this.closest(\'[data-ov]\').remove()" style="width:100%;padding:10px;border:none;background:none;color:var(--t3);cursor:pointer;font-size:.85rem;margin-top:4px">Cancelar</button>';
ov.setAttribute('data-ov','1');
ov.appendChild(box);
ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
document.body.appendChild(ov);
if(typeof lucide!=='undefined')lucide.createIcons();
}



/* ===== CENTRAL INTELIGENCIA FINANCEIRA - FULL JS ===== */

/* --- Sub-abas Dicas (4): Aprender, Dica do Dia, Calculadoras, Desafios --- */
function goFinTab(idx,btn){
for(var i=0;i<4;i++){
var s=document.getElementById('finSec'+i);
if(s){s.classList.remove('active')}
}
var sec=document.getElementById('finSec'+idx);
if(sec)sec.classList.add('active');

var tabs=document.querySelectorAll('.fin-tab');
for(var j=0;j<tabs.length;j++){tabs[j].classList.remove('active')}
if(btn)btn.classList.add('active');
updateEduXPLabel();
if(idx===0){} /* Aprender já tem finTrailsList preenchido em rDicas */
if(idx===1){renderEduDicaCard();}
if(idx===2){renderEduCalcsGrid();}
if(idx===3){renderEduDesafios();}
}

var educationXP=0;
function loadEducationXP(){try{var s=localStorage.getItem('virtus_edu_xp');if(s)educationXP=parseInt(s,10)||0}catch(e){}}
function saveEducationXP(){try{localStorage.setItem('virtus_edu_xp',String(educationXP))}catch(e){}}
function addEducationXP(xp){educationXP+=xp;saveEducationXP();updateEduXPLabel();if(typeof rBadges==='function')rBadges()}
function updateEduXPLabel(){var el=document.getElementById('finEduXpLabel');if(el)el.textContent=educationXP+' XP'}

/* --- rDicas: 4 abas (Aprender, Dica do Dia, Calculadoras, Desafios) --- */
function rDicas(){
loadEducationXP();updateEduXPLabel();
renderFinInsight();
renderFinTrails();
renderEduDicaCard();
renderEduCalcsGrid();
renderEduDesafios();
updateContinuarBtn();
/* backward compat */
var tc=document.getElementById('tipsContainer');
if(tc&&tc.parentElement&&tc.parentElement.classList.contains('tips-section'))tc.parentElement.style.display='none';
var it=document.getElementById('investTips');
if(it&&it.parentElement&&it.parentElement.classList.contains('tips-section'))it.parentElement.style.display='none';
var et=document.getElementById('eduTips');
if(et&&et.parentElement&&et.parentElement.classList.contains('tips-section'))et.parentElement.style.display='none';
}
function updateContinuarBtn(){
var btn=document.getElementById('finContinuarBtn');
if(!btn)return;
var last=lastUnfinishedLesson();
if(last){btn.style.display='block';btn.onclick=function(){openFinLesson(last.tidx,last.lidx);};} else btn.style.display='none';
}
function lastUnfinishedLesson(){
if(typeof finCompletedLessons==='undefined')return null;
for(var t=0;t<FIN_TRAILS.length;t++){
var trail=FIN_TRAILS[t];
for(var l=0;l<trail.lessons.length;l++){
var done=finCompletedLessons.indexOf(trail.lessons[l].id)>=0;
if(!done){
var prevOk=l===0||finCompletedLessons.indexOf(trail.lessons[l-1].id)>=0;
if(prevOk)return {tidx:t,lidx:l};
}
}
}
return null;
}
function continuarUltimaLicao(){
var last=lastUnfinishedLesson();
if(last)openFinLesson(last.tidx,last.lidx);
}

/* ============================================================
   SUB-TAB 0: INSIGHT DO DIA
   ============================================================ */
function renderFinInsight(){
var el=document.getElementById('finInsightText');
var btn=document.getElementById('finInsightBtn');
if(!el)return;

var td=0,tr=0,nm=0;
var catD={};
var now=new Date();
var curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var tdM=0,trM=0;

entries.forEach(function(e){
if(e.type==='despesa'){td+=e.value;catD[e.category]=(catD[e.category]||0)+e.value}
else{tr+=e.value}
if(e.date&&e.date.substring(0,7)===curM){
if(e.type==='despesa')tdM+=e.value;else trM+=e.value;
}
});

var md=getMD();nm=Object.keys(md).length||1;
var topCats=Object.entries(catD).sort(function(a,b){return b[1]-a[1]});
var avgD=td/nm;
var sobraM=trM-tdM;
var insights=[];

if(topCats.length>0){
var pct=td>0?((topCats[0][1]/td)*100).toFixed(0):'0';
if(parseInt(pct)>30){
var econMes=topCats[0][1]*0.15;
var em12=econMes*12*1.12;
insights.push({text:'Você gasta '+pct+'% em <b>'+topCats[0][0]+'</b>. Se reduzir 15% (R$ '+econMes.toFixed(0)+'/mes), em 12 meses terá <b>R$ '+em12.toFixed(0)+'</b> investidos a 1%/mês.',btn:true,cat:'Economia',emoji:'💰'});
}
}

if(sobraM>0){
var em12s=sobraM*12*1.12;
insights.push({text:'Você tem <b>R$ '+sobraM.toFixed(0)+'</b> sobrando este mês. Investindo essa sobra todo mês, em 1 ano terá <b>R$ '+em12s.toFixed(0)+'</b> com juros compostos.',btn:true,cat:'Investimento',emoji:'📈'});
}

if(sobraM<0){
insights.push({text:'Atenção: suas despesas superam receitas em <b>R$ '+Math.abs(sobraM).toFixed(0)+'</b> este mês. Revise seus gastos para evitar endividamento.',btn:false,cat:'Alerta',emoji:'⚠️'});
}

var reservaIdeal=avgD*6;
var totalPat=0;
for(var k=0;k<userAccs.length;k++){var b=getAccBal(userAccs[k]);totalPat+=b.atual}
if(totalPat<reservaIdeal&&reservaIdeal>0){
var falta=reservaIdeal-totalPat;
insights.push({text:'Sua reserva de emergência ideal é <b>R$ '+reservaIdeal.toFixed(0)+'</b> (6 meses de gastos). Faltam <b>R$ '+falta.toFixed(0)+'</b> para atingir.',btn:false,cat:'Meta',emoji:'🎯'});
}

if(insights.length>0){
var pick=insights[Math.floor(Math.random()*insights.length)];
window._currentInsight=pick;
el.innerHTML=pick.text;
var catEl=document.getElementById('finInsightCategoria');
var emojiEl=document.getElementById('finInsightEmoji');
var saveBtn=document.getElementById('finInsightSaveBtn');
var newBtn=document.getElementById('finInsightNewBtn');
if(catEl){var catLucide={'Economia':'wallet','Investimento':'trending-up','Alerta':'alert-triangle','Meta':'target'};var ci=catLucide[pick.cat]||'lightbulb';catEl.innerHTML='<i data-lucide="'+ci+'" style="width:12px;height:12px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> '+(pick.cat||'Dica');catEl.style.display='inline-flex';catEl.style.alignItems='center';catEl.style.gap='4px';}
if(emojiEl){emojiEl.innerHTML='<i data-lucide="lightbulb" style="width:32px;height:32px;color:var(--vr)"></i>';if(typeof window.refreshLucide==='function')lucide.createIcons();}
if(btn)btn.style.display=pick.btn?'inline-block':'none';
if(saveBtn)saveBtn.style.display='inline-block';
if(newBtn)updateNovaDicaBtn();
}else{
window._currentInsight=null;
el.textContent=typeof t==='function'?t('adicione_lancamentos_insights_full'):'Adicione lançamentos para receber insights personalizados sobre suas finanças.';
var catEl=document.getElementById('finInsightCategoria');if(catEl)catEl.style.display='none';
var saveBtn=document.getElementById('finInsightSaveBtn');if(saveBtn)saveBtn.style.display='none';
if(btn)btn.style.display='none';
updateNovaDicaBtn();
}
}
function updateNovaDicaBtn(){
var key='virtus_insight_novas';var today=new Date().toDateString();
try{var o=JSON.parse(localStorage.getItem(key)||'{}');var count=o[today]||0;}
catch(e){var count=0;}
var newBtn=document.getElementById('finInsightNewBtn');if(!newBtn)return;
newBtn.innerHTML='<i data-lucide="refresh-cw" style="width:14px;height:14px;vertical-align:middle"></i> Nova dica'+(count<3?' ('+(3-count)+' hoje)':'');
newBtn.disabled=count>=3;
if(typeof window.refreshLucide==='function')lucide.createIcons();
}
function salvarInsightDoDia(){
var insight=window._currentInsight;
if(!insight){toast(typeof t==='function'?t('toast_nenhuma_dica_salvar'):'Nenhuma dica para salvar.','err');return;}
try{
var arr=JSON.parse(localStorage.getItem('virtus_edu_dicas')||'[]');
arr.push({text:insight.text,cat:insight.cat||'Dica',emoji:insight.emoji||'💡',saved:true,date:new Date().toISOString()});
if(arr.length>50)arr=arr.slice(-50);
localStorage.setItem('virtus_edu_dicas',JSON.stringify(arr));
toast(typeof t==='function'?t('toast_dica_salva_favoritas'):'Dica salva nas favoritas!','ok');
renderEduDicaCard();
}catch(e){toast(typeof t==='function'?t('toast_erro_salvar'):'Erro ao salvar.','err');}
}
var INSIGHT_NOVAS_LIMIT=3;
function novaInsightDoDia(){
var key='virtus_insight_novas';var today=new Date().toDateString();
try{var o=JSON.parse(localStorage.getItem(key)||'{}');var count=o[today]||0;}
catch(e){var o={};var count=0;}
if(count>=INSIGHT_NOVAS_LIMIT){toast(typeof t==='function'?t('toast_limite_dicas'):'Limite de 3 novas dicas por dia.','err');return;}
o[today]=(count||0)+1;localStorage.setItem(key,JSON.stringify(o));
updateNovaDicaBtn();
renderFinInsight();
}

/* ============================================================
   SUB-TAB 0: ALERTAS PERSONALIZADOS
   ============================================================ */
function renderFinAlerts(){
var list=document.getElementById('finAlertsList');
var badge=document.getElementById('finAlertCount');
if(!list)return;

var alerts=[];
var now=new Date();
var curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var catSpentM={};var trM=0;var tdM=0;

entries.forEach(function(e){
if(e.date&&e.date.substring(0,7)===curM){
if(e.type==='despesa'){tdM+=e.value;catSpentM[e.category]=(catSpentM[e.category]||0)+e.value}
else{trM+=e.value}
}
});

/* Orçamento alerts */
if(typeof budgets!=='undefined'){
Object.keys(budgets).forEach(function(cat){
if(budgets[cat]>0&&catSpentM[cat]){
var pct=(catSpentM[cat]/budgets[cat])*100;
if(pct>100){
alerts.push({lucide:'alert-triangle',title:'Orçamento ESTOURADO: '+cat,text:'Você gastou R$ '+catSpentM[cat].toFixed(0)+' de R$ '+budgets[cat].toFixed(0)+' ('+pct.toFixed(0)+'%). Excedeu em R$ '+(catSpentM[cat]-budgets[cat]).toFixed(0)+'.',tag:'critical',priority:1});
}else if(pct>85){
alerts.push({lucide:'alert-triangle',title:cat+' a '+pct.toFixed(0)+'% do orçamento',text:'Resta apenas R$ '+(budgets[cat]-catSpentM[cat]).toFixed(0)+' até o fim do mês. Cuidado!',tag:'warning',priority:2});
}else if(pct>70){
alerts.push({lucide:'circle-alert',title:cat+': '+pct.toFixed(0)+'% utilizado',text:'Você ja usou R$ '+catSpentM[cat].toFixed(0)+' de R$ '+budgets[cat].toFixed(0)+'. Fique atento.',tag:'warning',priority:3});
}
}
});
}

/* Despesas > receitas */
if(tdM>trM&&trM>0){
alerts.push({lucide:'trending-down',title:'Despesas maiores que receitas',text:'Este mes: despesas R$ '+tdM.toFixed(0)+' vs receitas R$ '+trM.toFixed(0)+'. Déficit de R$ '+(tdM-trM).toFixed(0)+'.',tag:'critical',priority:1});
}

/* Tendencia de gastos (comparar com mes anterior) */
var md=getMD();var mks=Object.keys(md).sort();
if(mks.length>=2){
var lastK=mks[mks.length-1];var prevK=mks[mks.length-2];
var lastD=md[lastK].d;var prevD=md[prevK].d;
if(lastD>prevD*1.2){
alerts.push({lucide:'trending-up',title:'Gastos em alta: +'+((lastD/prevD-1)*100).toFixed(0)+'%',text:'Seus gastos aumentaram de R$ '+prevD.toFixed(0)+' para R$ '+lastD.toFixed(0)+' comparado ao mes anterior.',tag:'warning',priority:2});
}else if(lastD<prevD*0.9){
alerts.push({lucide:'trending-down',title:'Gastos em queda: -'+((1-lastD/prevD)*100).toFixed(0)+'%',text:'Parabéns! Redução de R$ '+(prevD-lastD).toFixed(0)+' vs mês anterior.',tag:'good',priority:4});
}
}

/* Saldo positivo */
if(trM>tdM&&tdM>0){
var taxa=(1-tdM/trM)*100;
alerts.push({lucide:'check-circle',title:'Saldo positivo: '+taxa.toFixed(0)+'% de economia',text:'Você está guardando R$ '+(trM-tdM).toFixed(0)+' este mês. Continue assim!',tag:'good',priority:5});
}

/* Reserva de emergência */
var totalGastoMedio=0;
var nMeses=Math.max(mks.length,1);
mks.forEach(function(k){totalGastoMedio+=md[k].d});
var avgGasto=totalGastoMedio/nMeses;
var reservaIdeal=avgGasto*6;
var totalPat=0;
for(var k=0;k<userAccs.length;k++){var b=getAccBal(userAccs[k]);totalPat+=b.atual}
var reservaPct=reservaIdeal>0?(totalPat/reservaIdeal*100):0;

if(reservaPct<100&&reservaIdeal>0){
var meses=(totalPat/avgGasto).toFixed(1);
alerts.push({lucide:'shield-alert',title:'Reserva de emergência: '+meses+' meses',text:'Ideal: 6 meses (R$ '+reservaIdeal.toFixed(0)+'). Você tem R$ '+totalPat.toFixed(0)+' ('+reservaPct.toFixed(0)+'%).',tag:reservaPct<50?'critical':'warning',priority:reservaPct<50?1:3});
}else if(reservaIdeal>0){
alerts.push({lucide:'trophy',title:'Reserva de emergência completa!',text:'Você tem '+((totalPat/avgGasto)).toFixed(1)+' meses de reserva. Excelente!',tag:'good',priority:5});
}

/* Assinaturas */
if(catSpentM['Assinaturas']>0){
alerts.push({lucide:'smartphone',title:'Assinaturas: R$ '+catSpentM['Assinaturas'].toFixed(0)+'/mes',text:'Revise suas assinaturas. Cancele as que não usa para economizar.',tag:'info',priority:3});
}

/* Sem investimento */
var hasInv=entries.some(function(e){return e.category==='Investimentos'})||(typeof investments!=='undefined'&&investments.length>0);
if(!hasInv&&trM>0){
alerts.push({lucide:'wallet',title:'Você não tem investimentos registrados',text:'Mesmo R$ 50/mes fazem diferença com juros compostos. Comece hoje!',tag:'info',priority:3});
}

/* Faturas de cartao */
if(typeof cards!=='undefined'){
cards.forEach(function(c){
if(c.items&&c.items.length>0){
var totalFat=0;
c.items.forEach(function(it){totalFat+=it.value||0});
if(totalFat>0&&c.limit>0){
var uso=(totalFat/c.limit*100);
if(uso>80){
alerts.push({lucide:'credit-card',title:'Cartão '+c.name+': '+uso.toFixed(0)+'% do limite',text:'Fatura de R$ '+totalFat.toFixed(0)+' em limite de R$ '+c.limit.toFixed(0)+'. Cuidado com juros!',tag:uso>95?'critical':'warning',priority:2});
}
}
}
});
}

/* Sort by priority */
alerts.sort(function(a,b){return a.priority-b.priority});

if(alerts.length===0){
list.innerHTML='<div style="text-align:center;padding:30px;color:var(--t2)"><div style="font-size:2.5em;margin-bottom:8px;display:flex;justify-content:center"><i data-lucide="check-circle" style="width:48px;height:48px;stroke:currentColor;stroke-width:2"></i></div><p style="font-size:.88em">Tudo certo! Nenhum alerta no momento.</p><p style="font-size:.78em;color:var(--t3)">Continue lançando suas finanças para receber alertas personalizados.</p></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}else{
var h='';
alerts.forEach(function(a){
var iconHtml=a.lucide?'<i data-lucide="'+a.lucide+'" style="width:24px;height:24px;stroke:currentColor;stroke-width:2"></i>':(a.icon||'');
h+='<div class="fin-alert">';
h+='<div class="fin-alert-icon">'+iconHtml+'</div>';
h+='<div class="fin-alert-body">';
h+='<div class="fin-alert-title">'+a.title+'</div>';
h+='<div class="fin-alert-text">'+a.text+'</div>';
h+='<span class="fin-alert-tag '+a.tag+'">'+(a.tag==='critical'?'Critico':a.tag==='warning'?'Atenção':a.tag==='good'?'Positivo':'Info')+'</span>';
h+='</div></div>';
});
list.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

if(badge)badge.textContent=alerts.filter(function(a){return a.tag==='critical'||a.tag==='warning'}).length;
}



/* ============================================================
   SUB-TAB 1: INVESTIMENTOS
   ============================================================ */
var FIN_INV_DATA=[
{id:'rf',cls:'rf',icon:'&#128181;',name:'Renda Fixa',risk:1,articles:[
{title:'Tesouro Selic',body:'<h4>O que é?</h4><p>Título público emitido pelo governo federal com rentabilidade atrelada à taxa Selic. É considerado o investimento mais seguro do Brasil.</p><h4>Como funciona?</h4><p>Você empresta dinheiro ao governo e recebe juros diarios. Tem liquidez D+1 (resgata em 1 dia util) e é ideal para reserva de emergência.</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Segurança máxima<br>• Liquidez diária<br>• Rentabilidade superior à poupança<br>• Investimento mínimo ~R$30</div><div class="con-box"><b>&#128308; Contras</b><br>• Rentabilidade limitada pela Selic<br>• IR regressivo (22,5% a 15%)<br>• IOF nos primeiros 30 dias</div></div><div class="example-box"><b>&#128200; Exemplo prático:</b><br>Investindo R$ 500/mês no Tesouro Selic a 13,25% ao ano:<br>• Em 1 ano: ~R$ 6.430<br>• Em 3 anos: ~R$ 20.800<br>• Em 5 anos: ~R$ 37.500</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:10%;background:#22C55E"></div></div><span style="font-size:.78em;color:#22C55E">Muito Baixo</span></div>'},
{title:'CDB (Certificado de Deposito Bancario)',body:'<h4>O que é?</h4><p>É um empréstimo que você faz ao banco. Em troca, recebe juros que podem ser pre-fixados, pos-fixados (% do CDI) ou atrelados a inflacao (IPCA+).</p><h4>Tipos de CDB</h4><p><b>Pre-fixado:</b> você sabe exatamente quanto vai receber. Ideal quando a Selic tende a cair.<br><b>Pos-fixado:</b> rende % do CDI. Mais comum e mais flexível.<br><b>IPCA+:</b> protege contra inflação, ideal para longo prazo.</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Proteção do FGC ate R$ 250 mil<br>• Bancos digitais oferecem ate 110% CDI<br>• Opções com liquidez diária</div><div class="con-box"><b>&#128308; Contras</b><br>• IR regressivo<br>• Alguns têm carência (sem liquidez)<br>• Rendimento limitado vs renda variável</div></div><div class="example-box"><b>&#128200; Exemplo:</b> CDB 100% CDI com CDI a 13%/ano:<br>R$ 10.000 investidos → R$ 11.300 em 1 ano (bruto)<br>Apos IR (17,5% em 2 anos): rendimento liquido ~10,7%/ano</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:15%;background:#22C55E"></div></div><span style="font-size:.78em;color:#22C55E">Baixo</span></div>'},
{title:'LCI e LCA',body:'<h4>O que são?</h4><p><b>LCI</b> (Letra de Credito Imobiliario) e <b>LCA</b> (Letra de Credito do Agronegocio) sao títulos emitidos por bancos para financiar o setor imobiliário e o agronegocio.</p><h4>Grande vantagem</h4><p>São <b>ISENTOS de Imposto de Renda</b> para pessoa fisica! Um LCI que rende 85% do CDI pode equivaler a um CDB de 100% do CDI apos IR.</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Isenção de IR (PF)<br>• Proteção do FGC<br>• Boa rentabilidade líquida</div><div class="con-box"><b>&#128308; Contras</b><br>• Geralmente sem liquidez diária<br>• Carência mínima de 90 dias<br>• Investimento mínimo mais alto</div></div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:15%;background:#22C55E"></div></div><span style="font-size:.78em;color:#22C55E">Baixo</span></div>'},
{title:'Tesouro IPCA+',body:'<h4>O que é?</h4><p>Título público que paga uma taxa fixa + a variação da inflação (IPCA). Garante ganho real acima da inflação, ideal para objetivos de longo prazo.</p><h4>Por que investir?</h4><p>Se a inflação subir, seu rendimento sobe junto. Você SEMPRE ganha acima da inflacao se levar ate o vencimento.</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Proteção contra inflação<br>• Ganho real garantido<br>• Ideal para aposentadoria</div><div class="con-box"><b>&#128308; Contras</b><br>• Marcação a mercado (pode ter perda se vender antes)<br>• IR regressivo<br>• Vencimentos longos</div></div><div class="example-box"><b>&#128200; Exemplo:</b> Tesouro IPCA+ 6,5%:<br>Se inflacao for 5%/ano → rendimento bruto: 11,5%/ano<br>R$ 1.000/mês por 20 anos ≈ R$ 860.000</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:20%;background:#22C55E"></div></div><span style="font-size:.78em;color:#22C55E">Baixo-Medio</span></div>'}
]},
{id:'rv',cls:'rv',icon:'&#128200;',name:'Ações',risk:4,articles:[
{title:'O que são ações?',body:'<h4>Conceito</h4><p>Ações são pequenas frações do capital de uma empresa. Ao comprar acoes, você se torna sócio da empresa e pode lucrar com valorização e dividendos.</p><h4>Como ganhar com ações</h4><p><b>1. Valorização:</b> compra a R$ 10, vende a R$ 15 → lucro de 50%<br><b>2. Dividendos:</b> parcela do lucro distribuida aos acionistas (isento de IR)</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Potencial de alto retorno<br>• Dividendos isentos de IR<br>• Liquidez alta (pode vender a qualquer hora)<br>• Diversificação de setores</div><div class="con-box"><b>&#128308; Contras</b><br>• Alta volatilidade<br>• Risco de perder capital<br>• Exige estudo e paciência<br>• Emocional pode atrapalhar</div></div><div class="example-box"><b>&#128200; Exemplos educativos (não é recomendação):</b><br>Setores classicos: bancos, energia, varejo, saude, tecnologia<br>ETF BOVA11 replica o indice Ibovespa (diversificação automática)</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:65%;background:#EAB308"></div></div><span style="font-size:.78em;color:#EAB308">Medio-Alto</span></div>'},
{title:'Dividendos: renda passiva com acoes',body:'<h4>O que são dividendos?</h4><p>Dividendos sao parte do lucro que a empresa distribui aos acionistas. No Brasil, sao <b>isentos de IR</b>.</p><h4>Como montar uma carteira de dividendos</h4><p>1. Busque empresas com histórico consistente de pagamento<br>2. Analise o Dividend Yield (DY) — idealmente acima de 5-6%<br>3. Diversifique entre setores (energia, bancos, saneamento)<br>4. Reinvista os dividendos para acelerar o crescimento</p><div class="example-box"><b>&#128200; Simulação:</b><br>Carteira de R$ 100.000 com DY medio de 8%/ano:<br>• Renda passiva: ~R$ 667/mês<br>• Reinvestindo por 10 anos (DY 8% + valorização 5%): patrimônio ~R$ 340.000</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:50%;background:#EAB308"></div></div><span style="font-size:.78em;color:#EAB308">Medio</span></div>'}
]},
{id:'fii',cls:'fii',icon:'&#127970;',name:'FIIs',risk:3,articles:[
{title:'Fundos Imobiliários (FIIs)',body:'<h4>O que são?</h4><p>FIIs são fundos que investem em imóveis ou títulos imobiliários. Você compra cotas na bolsa e recebe alugueis mensais (dividendos) <b>isentos de IR</b>.</p><h4>Tipos de FIIs</h4><p><b>Tijolo:</b> investem em imóveis físicos (shoppings, galpoes, lajes corporativas)<br><b>Papel:</b> investem em títulos como CRI e LCI<br><b>Hibrido:</b> misturam ambos</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Renda mensal isenta de IR<br>• Investimento mínimo baixo (~R$ 10)<br>• Diversificação imobiliária<br>• Liquidez (compra/vende na bolsa)</div><div class="con-box"><b>&#128308; Contras</b><br>• Cota pode desvalorizar<br>• Vacância dos imóveis<br>• Risco de mercado<br>�� Gestão do fundo pode ser ruim</div></div><div class="example-box"><b>&#128200; Exemplo:</b><br>100 cotas de um FII a R$ 100 = R$ 10.000 investidos<br>DY de 0,80%/mês = R$ 80/mês de rendimento isento<br>= R$ 960/ano sem pagar IR</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:40%;background:#EAB308"></div></div><span style="font-size:.78em;color:#EAB308">Medio</span></div>'}
]},
{id:'cripto',cls:'cripto',icon:'&#129689;',name:'Cripto',risk:5,articles:[
{title:'Criptomoedas: Bitcoin e alem',body:'<h4>O que são criptomoedas?</h4><p>Moedas digitais descentralizadas baseadas em tecnologia blockchain. Bitcoin foi a primeira (2009) e permanece a maior em valor de mercado.</p><h4>Principais criptos</h4><p><b>Bitcoin (BTC):</b> "ouro digital", reserva de valor<br><b>Ethereum (ETH):</b> plataforma de contratos inteligentes<br><b>Stablecoins (USDT/USDC):</b> pareadas ao dolar</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Potencial de valorização extrema<br>• Descentralização<br>• Mercado 24/7<br>• Diversificação global</div><div class="con-box"><b>&#128308; Contras</b><br>• Volatilidade extrema<br>• Risco de perda total<br>• Regulação incerta<br>• Golpes e fraudes comuns</div></div><div class="example-box"><b>&#128308; REGRA DE OURO:</b><br>Nunca invista mais do que pode perder totalmente.<br>Sugestao: máximo 5-10% do patrimônio em cripto.</div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:90%;background:linear-gradient(135deg,#4F8CFF,#7C5CFC)"></div></div><span style="font-size:.78em;color:#EF4444">Muito Alto</span></div>'}
]},
{id:'prev',cls:'prev',icon:'&#128116;',name:'Previdência',risk:2,articles:[
{title:'Previdência Privada: PGBL vs VGBL',body:'<h4>PGBL</h4><p>Ideal para quem faz declaração <b>completa</b> do IR. Permite deduzir ate 12% da renda bruta anual da base de calculo do IR.</p><h4>VGBL</h4><p>Ideal para declaração <b>simplificada</b>. O IR incide apenas sobre os rendimentos no resgate.</p><h4>Tabelas de IR</h4><p><b>Regressiva:</b> comeca em 35% e cai ate 10% apos 10 anos. Ideal para longo prazo.<br><b>Progressiva:</b> segue tabela normal do IR. Ideal para quem planeja resgatar pouco por mes.</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Benefício fiscal (PGBL)<br>• Disciplina de investimento<br>• Planejamento sucessório<br>• Sem come-cotas</div><div class="con-box"><b>&#128308; Contras</b><br>• Taxas de administração altas<br>• Carência para resgate<br>• Rentabilidade pode ser baixa<br>• Tabela regressiva exige compromisso</div></div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:20%;background:#22C55E"></div></div><span style="font-size:.78em;color:#22C55E">Baixo</span></div>'}
]},
{id:'inter',cls:'inter',icon:'&#127757;',name:'Internacional',risk:3,articles:[
{title:'Investir no exterior',body:'<h4>Por que diversificar internacionalmente?</h4><p>O Brasil representa menos de 2% do mercado global. Investir la fora protege contra risco-pais e desvalorização do real.</p><h4>Como investir</h4><p><b>ETFs na B3:</b> IVVB11 (S&P 500), NASD11 (Nasdaq) — mais simples, em reais<br><b>BDRs:</b> recibos de acoes estrangeiras negociados na B3<br><b>Conta no exterior:</b> corretoras como Interactive Brokers, Avenue, Nomad</p><div class="pros-cons"><div class="pro-box"><b>&#128994; Pros</b><br>• Diversificação cambial<br>• Acesso a maiores empresas do mundo<br>• Proteção contra risco-Brasil<br>• Dolar historicamente se valoriza vs real</div><div class="con-box"><b>&#128308; Contras</b><br>• Risco cambial (pode valorizar ou desvalorizar)<br>• Tributação mais complexa<br>• IOF na remessa<br>• Declaração de IRPF mais trabalhosa</div></div><div class="example-box"><b>Apenas informações educativas, não é recomendação de investimento.</b></div><div class="risk-meter"><span style="font-size:.82em;font-weight:600">Risco:</span><div class="risk-bar"><div class="risk-fill" style="width:45%;background:#EAB308"></div></div><span style="font-size:.78em;color:#EAB308">Medio</span></div>'}
]}
];

function renderFinInvestments(){
var grid=document.getElementById('finInvGrid');
var prof=document.getElementById('finProfileVal');
var profFill=document.getElementById('finProfileFill');
if(!grid)return;

/* Perfil baseado nos dados */
var td=0,tr=0;
entries.forEach(function(e){if(e.type==='despesa')td+=e.value;else tr+=e.value});
var hasInv=(typeof investments!=='undefined'&&investments.length>0);
var taxa=tr>0?(1-td/tr)*100:0;
var perfil='Conservador';var profW=25;
if(taxa>30&&hasInv){perfil='Arrojado';profW=85}
else if(taxa>20||hasInv){perfil='Moderado';profW=50}
else if(taxa>10){perfil='Conservador-Moderado';profW=35}
if(prof)prof.textContent=perfil;
if(profFill)profFill.style.width=profW+'%';

var h='';
FIN_INV_DATA.forEach(function(cat){
h+='<div class="fin-inv-card '+cat.cls+'" onclick="openFinInvCat(\''+cat.id+'\')">';
h+='<div class="fin-inv-icon">'+cat.icon+'</div>';
h+='<div class="fin-inv-name">'+cat.name+'</div>';
h+='<div class="fin-inv-count">'+cat.articles.length+' artigo'+(cat.articles.length>1?'s':'')+'</div>';
h+='<div class="fin-inv-risk">';
for(var r=1;r<=5;r++){h+='<div class="fin-inv-risk-dot'+(r<=cat.risk?' on':'')+'"></div>'}
h+='</div></div>';
});
grid.innerHTML=h;
}

function openFinInvCat(catId){
var cat=FIN_INV_DATA.find(function(c){return c.id===catId});
if(!cat||!cat.articles.length)return;

var h='';
cat.articles.forEach(function(art,idx){
h+='<div style="padding:12px;margin-bottom:8px;background:var(--bg2);border-radius:12px;cursor:pointer" onclick="showFinArticle(\''+catId+'\','+idx+')">';
h+='<div style="font-weight:700;font-size:.9em;color:var(--t1)">'+art.title+'</div>';
h+='<div style="font-size:.75em;color:var(--vr);margin-top:4px">Clique para ler &#8594;</div>';
h+='</div>';
});

document.getElementById('finArticleTitle').textContent=cat.icon+' '+cat.name;
document.getElementById('finArticleContent').innerHTML=h;
document.getElementById('finArticleOv').classList.add('show');
}

function showFinArticle(catId,artIdx){
var cat=FIN_INV_DATA.find(function(c){return c.id===catId});
if(!cat)return;
var art=cat.articles[artIdx];
if(!art)return;
document.getElementById('finArticleTitle').textContent=art.title;
document.getElementById('finArticleContent').innerHTML=art.body;
}

function closeFinArticle(){
document.getElementById('finArticleOv').classList.remove('show');
}



/* ============================================================
   SUB-TAB 2: EDUCAÇÃO - TRILHA DE APRENDIZADO
   ============================================================ */
var FIN_TRAILS=[
{name:'Fundamentos Financeiros',lucide:'book-open',lessons:[
{id:'edu_1_1',title:'O que é orçamento pessoal',time:'3 min',content:'<p>Orçamento é o mapa do seu dinheiro. Sem ele, você não sabe para onde vai cada real. Liste toda renda (salário, freelance), despesas fixas (aluguel, contas) e variáveis (alimentação, lazer). Renda - Despesas = Sobra ou Déficit. Pessoas com orçamento economizam em média 20% mais.</p>',dicaPratica:'Use este app: lance tudo aqui e acompanhe pelo dashboard. Consistência é mais importante que perfeição.',quiz:[{pergunta:'Qual o primeiro passo para fazer um orçamento?',opts:[{text:'Listar toda a renda',correct:true},{text:'Comprar um caderno',correct:false},{text:'Fechar todas as contas',correct:false}]},{pergunta:'O que significa Renda - Despesas?',opts:[{text:'Quanto devo ao banco',correct:false},{text:'Sobra ou déficit do mês',correct:true},{text:'Valor do aluguel',correct:false}]},{pergunta:'Onde você pode controlar seu orçamento no Sibanki?',opts:[{text:'Apenas em planilha',correct:false},{text:'Na aba Lançar e no Dashboard',correct:true},{text:'Só no banco',correct:false}]}]},
{id:'edu_1_2',title:'Regra 50-30-20',time:'3 min',content:'<h4>A regra mais simples de orçamento</h4><p>Criada pela senadora americana Elizabeth Warren, divide sua renda em 3 categorias:</p><p><b>50% - Necessidades:</b> moradia, alimentacao, transporte, saude, contas basicas<br><b>30% - Desejos:</b> lazer, restaurantes, streaming, roupas, viagens<br><b>20% - Poupança e investimentos:</b> reserva, aportes, quitação de dívidas</p><h4>Exemplo prático</h4><p>Renda de R$ 5.000:<br>• Necessidades: R$ 2.500<br>• Desejos: R$ 1.500<br>• Poupança: R$ 1.000</p><h4>E se nao consigo 20%?</h4><p>Comece com o que puder - 5%, 10%. O hábito é mais importante que o percentual.</p>'},
{id:'edu_1_3',title:'Reserva de emergência',time:'4 min',content:'<h4>O que é?</h4><p>Dinheiro guardado para imprevistos: demissão, doença, conserto urgente. É sua PRIMEIRA prioridade financeira, antes de qualquer investimento.</p><h4>Quanto guardar?</h4><p><b>Mínimo:</b> 3 meses de gastos essenciais<br><b>Ideal:</b> 6 meses de gastos totais<br><b>Autonomo/CLT instavel:</b> 12 meses</p><h4>Onde deixar?</h4><p>Precisa ter <b>liquidez imediata</b> e <b>seguranca</b>:<br>• Tesouro Selic (liquidez D+1)<br>• CDB de liquidez diaria (100% CDI+)<br>• Conta que rende automaticamente (Nubank, Inter)</p><h4>NUNCA use a reserva para:</h4><p>• Viagens ou compras por impulso<br>• Investimentos arriscados<br>• Empréstimos para terceiros</p>'},
{id:'edu_1_4',title:'Juros compostos: a 8a maravilha',time:'4 min',content:'<h4>O conceito mais poderoso das finanças</h4><p>Juros compostos são "juros sobre juros". Seu dinheiro cresce de forma exponencial ao longo do tempo.</p><h4>A formula</h4><p><b>M = C x (1 + i)^t</b><br>M = Montante final<br>C = Capital inicial<br>i = taxa de juros (mensal ou anual)<br>t = tempo (meses ou anos)</p><h4>O poder do tempo</h4><p>R$ 500/mês investidos a 1%/mês:<br>• 5 anos: R$ 40.800 (investiu R$ 30.000)<br>• 10 anos: R$ 115.000 (investiu R$ 60.000)<br>• 20 anos: R$ 494.000 (investiu R$ 120.000)<br>• 30 anos: R$ 1.750.000 (investiu R$ 180.000)</p><h4>A regra dos 72</h4><p>Divida 72 pela taxa anual para saber em quantos anos dobra seu dinheiro.<br>Exemplo: 12%/ano → 72/12 = 6 anos para dobrar.</p>'},
{id:'edu_1_5',title:'Dividas: como sair do vermelho',time:'4 min',content:'<h4>Tipos de dívida</h4><p><b>Dívida "boa":</b> financiamento imobiliário (taxa baixa, ativo valorizando)<br><b>Dívida "ruim":</b> cartao de credito, cheque especial (juros altissimos)</p><h4>Estratégias para sair das dívidas</h4><p><b>1. Bola de Neve:</b> pague a menor divida primeiro → use o valor liberado na proxima → ganha motivacao<br><b>2. Avalanche:</b> pague a divida com maior juros primeiro → economiza mais matematicamente<br><b>3. Negociação:</b> contate os credores, busque descontos a vista</p><h4>Prioridade de pagamento</h4><p>1. Cartão de credito (300-400%/ano)<br>2. Cheque especial (150-300%/ano)<br>3. Empréstimo pessoal (30-100%/ano)<br>4. Financiamento (8-15%/ano)</p>'}
]},
{name:'Investimentos para Iniciantes',lucide:'trending-up',lessons:[
{id:'edu_2_1',title:'Renda fixa vs renda variável',time:'3 min',content:'<h4>Renda Fixa</h4><p>Você sabe (ou tem previsao) de quanto vai receber. Como emprestar dinheiro e receber juros.<br><b>Exemplos:</b> Tesouro Direto, CDB, LCI, LCA, Debentures</p><h4>Renda Variável</h4><p>Não há garantia de retorno. Pode ganhar muito ou perder.<br><b>Exemplos:</b> Acoes, FIIs, ETFs, Criptomoedas</p><h4>Como escolher?</h4><p>Depende do seu <b>perfil de risco</b>, <b>prazo</b> e <b>objetivo</b>.<br>Reserva de emergência → Renda fixa<br>Aposentadoria (20+ anos) → Mix de ambos<br>Curto prazo (< 2 anos) → Renda fixa</p>'},
{id:'edu_2_2',title:'Como abrir conta em corretora',time:'3 min',content:'<h4>O que e uma corretora?</h4><p>Intermediária entre você e o mercado financeiro. Por ela você compra títulos, acoes, FIIs etc.</p><h4>Passo a passo</h4><p><b>1.</b> Escolha uma corretora (XP, Rico, Clear, Inter, NuInvest)<br><b>2.</b> Faça o cadastro online (dados pessoais + documentos)<br><b>3.</b> Responda o questionario de perfil (suitability)<br><b>4.</b> Transfira dinheiro via TED/PIX<br><b>5.</b> Comece a investir!</p><h4>Custos</h4><p>A maioria das corretoras nao cobra taxa de abertura nem manutencao. Verifique taxa de corretagem para acoes.</p>'},
{id:'edu_2_3',title:'Montando sua primeira carteira',time:'5 min',content:'<h4>Carteira para iniciantes</h4><p>Sugestão de alocação conservadora-moderada:</p><p><b>60% Renda Fixa:</b> Tesouro Selic (reserva), CDB/LCI/LCA, Tesouro IPCA+.<br><b>30% Renda Variável Brasil:</b> FIIs, Ações/ETFs (BOVA11).<br><b>10% Internacional:</b> ETFs (IVVB11).</p><p>Rebalanceie a cada 6 meses. Apenas educativo; consulte um profissional.</p>'},
{id:'edu_2_4',title:'O que são ações e FIIs',time:'4 min',content:'<p><b>Ações:</b> frações do capital de uma empresa. Você pode ganhar com valorização e dividendos (isentos de IR).</p><p><b>FIIs:</b> fundos que investem em imóveis. Pagam dividendos mensais, também isentos para PF. Exemplos: escritórios, shoppings, lajes corporativas.</p><p>Ambos têm risco e volatilidade. Horizonte longo (5+ anos) reduz o risco.</p>'},
{id:'edu_2_5',title:'Como montar sua primeira carteira',time:'4 min',content:'<p>Comece pela reserva (Tesouro Selic ou CDB liquidez diária). Depois diversifique: parte em CDB/LCI, parte em Tesouro IPCA+, e só então considere FIIs e ações ou ETFs. Use a aba Investimentos do Sibanki para registrar e acompanhar.</p>'}
]},
{name:'Planejamento Avançado',lucide:'target',lessons:[
{id:'edu_3_1',title:'Imposto de Renda sobre investimentos',time:'5 min',content:'<h4>Tabela regressiva (Renda Fixa)</h4><p>• Ate 180 dias: 22,5%<br>• 181 a 360 dias: 20%<br>• 361 a 720 dias: 17,5%<br>• Acima de 720 dias: 15%</p><h4>Ações</h4><p>• Vendas até R$ 20.000/mes: isento<br>• Acima: 15% sobre lucro (swing trade)<br>• Day trade: 20% sobre lucro<br>• Dividendos: isentos</p><h4>FIIs</h4><p>• Dividendos: isentos<br>• Ganho de capital (venda com lucro): 20%</p><h4>Dica</h4><p>Organize seus dados para a declaração anual. Use planilhas ou apps de controle de investimentos.</p>'},
{id:'edu_3_2',title:'Planejamento de aposentadoria',time:'5 min',content:'<h4>Quanto precisa para se aposentar?</h4><p>Use a regra dos 4%: multiplique sua despesa anual por 25.<br>Gastos de R$ 5.000/mes = R$ 60.000/ano x 25 = <b>R$ 1.500.000</b></p><h4>Fontes de renda na aposentadoria</h4><p>1. INSS (previdência pública)<br>2. Previdência privada (PGBL/VGBL)<br>3. Investimentos (dividendos, FIIs, renda fixa)<br>4. Imóveis (aluguel)</p><h4>Comece cedo!</h4><p>Quanto mais cedo começar, menor o aporte mensal necessário:<br>• Começar aos 25: R$ 800/mês<br>• Começar aos 35: R$ 2.000/mês<br>• Começar aos 45: R$ 5.500/mês<br>(para acumular R$ 1.5M aos 65 a 10%/ano)</p>'},
{id:'edu_3_3',title:'Proteção patrimonial',time:'4 min',content:'<h4>Seguros essenciais</h4><p><b>Seguro de vida:</b> protege a família. <b>Seguro residencial:</b> cobre incêndio, roubo. <b>Seguro auto:</b> obrigatório se financia.</p><p>Previdência privada não entra em inventário. Diversifique em ativos, moedas e geografias.</p>'},
{id:'edu_3_4',title:'Comprar vs alugar — a conta real',time:'4 min',content:'<p>Compare: parcela do financiamento + IPTU + manutenção vs aluguel + investir a diferença. Use a calculadora Comprar vs Alugar neste app. O aluguel costuma ganhar se você investir a sobra; o financiamento pode compensar em prazos longos e valorização.</p>'},
{id:'edu_3_5',title:'Independência financeira (FIRE)',time:'4 min',content:'<p>FIRE = Financial Independence, Retire Early. Regra dos 4%: acumule 25x seu gasto anual. Ex.: gastar R$ 5.000/mês = R$ 60.000/ano → precisa de R$ 1,5 milhão investido. Com 4% de retorno ao ano, você vive dos rendimentos sem trabalhar.</p>'}
]},
{name:'Metas e planejamento',lucide:'target',lessons:[
{id:'edu_4_1',title:'Como definir metas financeiras que funcionam',time:'3 min',content:'<p>Metas SMART: Específicas, Mensuráveis, Atingíveis, Relevantes, com Prazo. Ex.: "Guardar R$ 500/mês por 12 meses para viagem" é melhor que "quero economizar". Use a aba Metas do Sibanki para acompanhar.</p>'},
{id:'edu_4_2',title:'Juros compostos — a 8ª maravilha',time:'3 min',content:'<p>Juros sobre juros. R$ 500/mês a 1%/mês = mais de R$ 1 milhão em 30 anos. Quanto antes começar, maior o efeito. Regra dos 72: 72 ÷ taxa anual = anos para dobrar o dinheiro.</p>'},
{id:'edu_4_3',title:'Planejamento de aposentadoria aos 30',time:'4 min',content:'<p>Quanto mais cedo, menor o aporte necessário. Aos 25 anos, R$ 800/mês podem virar R$ 1,5 mi aos 65 (a 10%/ano). Use a calculadora de Aposentadoria neste app com sua idade e meta.</p>'},
{id:'edu_4_4',title:'Comprar vs alugar',time:'3 min',content:'<p>Simule no app: valor do imóvel, entrada, juros, aluguel equivalente. O ponto de equilíbrio depende da valorização e do tempo que ficará no imóvel.</p>'},
{id:'edu_4_5',title:'Conceito FIRE',time:'3 min',content:'<p>Viver de renda: acumule 25x seu gasto anual. Com 4% de retorno, os rendimentos cobrem as despesas. Exige disciplina e tempo; a calculadora Independência Financeira mostra o patrimônio necessário.</p>'}
]},
{name:'Análise de investimentos',lucide:'trending-up',lessons:[
{id:'edu_5_1',title:'Como ler o balanço de uma empresa',time:'4 min',content:'<p>Balanço: Ativo (o que a empresa tem), Passivo (dívidas), Patrimônio Líquido (Ativo - Passivo). DRE: Receita - Custos - Despesas = Lucro. Foco em empresas com PL crescente e dívida controlada.</p>'},
{id:'edu_5_2',title:'P/L, P/VP e Dividend Yield na prática',time:'4 min',content:'<p><b>P/L:</b> preço ÷ lucro por ação. Abaixo de 15 pode indicar subvalorização. <b>P/VP:</b> preço ÷ valor patrimonial. <b>DY:</b> dividendos ÷ preço. Alto DY pode ser renda, mas verifique sustentabilidade.</p>'},
{id:'edu_5_3',title:'Graham e a margem de segurança',time:'3 min',content:'<p>Benjamin Graham: compre com desconto ao valor intrínseco. Margem de segurança = comprar bem mais barato do que o valor calculado para reduzir risco de erro. O Sibanki tem análise fundamentalista com método Graham na aba Investimentos.</p>'},
{id:'edu_5_4',title:'Como analisar FIIs',time:'4 min',content:'<p>Veja: valor do imóvel, vacância, tipo (título, papel, híbrido), dividend yield histórico, gestão. FIIs de tijolo (imóveis físicos) vs papel (CRIs, LCIs). Diversifique entre setores.</p>'},
{id:'edu_5_5',title:'Diversificação e alocação de ativos',time:'4 min',content:'<p>Não coloque tudo em um ativo. Distribua entre renda fixa, ações, FIIs, internacional. Rebalanceie periodicamente. A alocação depende do seu perfil e do prazo do objetivo.</p>'}
]}
];

var finCompletedLessons=[];
function loadFinLessons(){
try{var s=localStorage.getItem('virtus_fin_lessons');if(s)finCompletedLessons=JSON.parse(s)}catch(e){}
}
function saveFinLessons(){
try{localStorage.setItem('virtus_fin_lessons',JSON.stringify(finCompletedLessons))}catch(e){}
}

function renderEduCalcsGrid(){
var grid=document.getElementById('eduCalcGrid');
if(!grid)return;
var items=[
{lucide:'circle-dollar-sign',name:'Juros Compostos',desc:'Valor final com aportes e taxa',type:'compostos'},
{lucide:'sunrise',name:'Independência (FIRE)',desc:'Patrimônio para viver de renda',type:'independência'},
{lucide:'trending-up',name:'Quanto rende minha reserva',desc:'Poupança vs CDB vs Tesouro',type:'reserva'},
{lucide:'home',name:'Comprar vs Alugar',desc:'Análise e ponto de equilíbrio',type:'financiamento'},
{lucide:'briefcase',name:'Aposentadoria',desc:'Aporte mensal necessário',type:'aposentadoria'},
{lucide:'wallet',name:'Quitar minha dívida',desc:'Meses e total a pagar',type:'divida'}
];
grid.innerHTML=items.map(function(c){return '<div class="fin-calc-card" onclick="openFinCalc(\''+c.type+'\')"><span class="fin-calc-icon"><i data-lucide="'+(c.lucide||'calculator')+'" style="width:28px;height:28px;stroke:currentColor;stroke-width:2"></i></span><span class="fin-calc-name">'+c.name+'</span><span class="fin-calc-desc">'+c.desc+'</span></div>'}).join('');
if(typeof lucide!=='undefined')lucide.createIcons();
}

function renderEduDicaCard(){
var card=document.getElementById('eduDicaCard');
var hist=document.getElementById('eduDicaHistory');
if(!card)return;
var insight=window._currentInsight;
if(insight){
var eduLucideMap={'Economia':'wallet','Investimento':'trending-up','Alerta':'alert-triangle','Meta':'target'};
var eduIcon=eduLucideMap[insight.cat]||'lightbulb';
card.innerHTML='<div class="edu-dica-emoji"><i data-lucide="'+eduIcon+'" style="width:32px;height:32px;stroke:currentColor;stroke-width:2"></i></div><div class="edu-dica-titulo">Dica do dia</div><div class="edu-dica-conteudo">'+insight.text+'</div><span class="edu-dica-cat" style="background:rgba(79,140,255,.2);color:var(--vr)">'+(insight.cat||'Dica')+'</span><div class="fin-insight-actions" style="margin-top:12px"><button type="button" class="calc-btn" onclick="salvarInsightDoDia();renderEduDicaCard()"><i data-lucide="bookmark" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Salvar dica</button><button type="button" class="calc-btn" onclick="novaInsightDoDia();renderEduDicaCard()" id="eduNovaDicaBtn"><i data-lucide="refresh-cw" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Nova dica</button></div>';
var eduBtn=document.getElementById('eduNovaDicaBtn');if(eduBtn){(function(){var k='virtus_insight_novas',t=new Date().toDateString();try{var o=JSON.parse(localStorage.getItem(k)||'{}');var c=o[t]||0;eduBtn.disabled=c>=3;eduBtn.textContent='🔄 Nova dica'+(c<3?' ('+(3-c)+' hoje)':'');}catch(e){}})();}
}else{
card.innerHTML='<div class="edu-dica-emoji"><i data-lucide="lightbulb" style="width:32px;height:32px;stroke:currentColor;stroke-width:2"></i></div><div class="edu-dica-titulo">Dica do dia</div><div class="edu-dica-conteudo">Adicione lançamentos para receber insights. Ou gere uma dica personalizada com IA.</div><button class="calc-btn" onclick="fetchEduDicaDoDia()" style="margin-top:8px"><i data-lucide="refresh-cw" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Gerar minha dica</button>';
}
var saved=loadEduDicasSalvas();
if(hist){hist.innerHTML=saved.length?'<h4 style="font-size:.9em;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i data-lucide="star" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Favoritas / Histórico</h4>'+saved.slice(0,10).map(function(d){var t=(d.titulo||d.text||'').substring(0,40);return '<div class="edu-dica-hist-item"><i data-lucide="lightbulb" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> '+t+(d.saved?' ★':'')+'</div>'}).join(''):'<p style="font-size:.85em;color:var(--t3)">Nenhuma dica salva ainda.</p>';}
if(typeof lucide!=='undefined')lucide.createIcons();
}

function loadEduDicasSalvas(){try{var s=localStorage.getItem('virtus_edu_dicas');return s?JSON.parse(s):[]}catch(e){return []}}
function saveEduDicasSalvas(arr){try{localStorage.setItem('virtus_edu_dicas',JSON.stringify(arr))}catch(e){}}

function fetchEduDicaDoDia(){
var card=document.getElementById('eduDicaCard');
if(!card)return;
card.innerHTML='<div class="edu-dica-conteudo">Gerando dica personalizada...</div>';
var ctx=getEduDicaContext();
var prompt='Gere UMA dica financeira personalizada e educativa para este usuário. Dados: score financeiro '+ctx.score+'/100, maior gasto este mês: '+ctx.topCategory+' com R$ '+ctx.topValue+', meta mais próxima: '+ctx.metaNome+' com '+ctx.metaPct+'% concluída. Responda APENAS com um JSON válido, sem markdown: {"emoji":"string","titulo":"max 8 palavras","conteudo":"max 80 palavras, tom amigável","acaoPratica":"1 ação para fazer HOJE, max 20 palavras","categoria":"economia|investimento|habito|meta|alerta"}';
var user=typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser;
if(!user){card.innerHTML='<div class="edu-dica-conteudo">Faça login para receber dicas personalizadas com seus dados.</div>';return;}
try{
firebase.functions().httpsCallable('chatApi')({message:prompt,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
var raw=(data.reply||'').trim();
var m=raw.match(/\{[\s\S]*\}/);
var d=m?JSON.parse(m[0]):null;
if(!d||!d.titulo){card.innerHTML='<div class="edu-dica-conteudo">Não foi possível gerar a dica. Tente novamente.</div><button class="calc-btn" onclick="fetchEduDicaDoDia()">Tentar de novo</button>';return;}
var catClr=({economia:'#22C55E',investimento:'#4F8CFF',habito:'#A855F7',meta:'#F59E0B',alerta:'#EF4444'})[d.categoria]||'#64748b';
window._lastEduDica=d;
var eduIcon=({economia:'wallet',investimento:'trending-up',habito:'target',meta:'target',alerta:'alert-triangle'})[d.categoria]||'lightbulb';
card.innerHTML='<div class="edu-dica-emoji"><i data-lucide="'+eduIcon+'" style="width:32px;height:32px;stroke:currentColor;stroke-width:2"></i></div><div class="edu-dica-titulo">'+(d.titulo||'Dica')+'</div><div class="edu-dica-conteudo">'+(d.conteudo||'')+'</div><div class="edu-dica-acao"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Ação para hoje: '+(d.acaoPratica||'')+'</div><span class="edu-dica-cat" style="background:'+catClr+'22;color:'+catClr+'">'+(d.categoria||'')+'</span><div style="margin-top:12px"><button class="calc-btn" onclick="if(window._lastEduDica)salvarEduDica(window._lastEduDica.titulo,window._lastEduDica.emoji)">Salvar dica</button></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}).catch(function(){card.innerHTML='<div class="edu-dica-conteudo">Erro ao gerar dica. Verifique sua conexão.</div><button class="calc-btn" onclick="fetchEduDicaDoDia()">Tentar de novo</button>';});
}catch(e){card.innerHTML='<div class="edu-dica-conteudo">Erro ao gerar dica.</div><button class="calc-btn" onclick="fetchEduDicaDoDia()">Tentar de novo</button>';}
}

function getEduDicaContext(){
var score=typeof renderFinDiagnostic==='function'?70:70;
var now=new Date(),curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var trM=0,tdM=0,catD={};
entries.forEach(function(e){
if(e.date&&e.date.substring(0,7)===curM){if(e.type==='despesa'){tdM+=e.value;catD[e.category]=(catD[e.category]||0)+e.value}else trM+=e.value;}
});
var topCat=Object.entries(catD).sort(function(a,b){return b[1]-a[1]})[0]||['N/A',0];
var metaNome='Nenhuma',metaPct=0;
if(typeof goals!=='undefined'&&goals.length>0){var g=goals[0];metaNome=g.nome||g.name||'Meta';var v=g.atual||g.current||0;var a=g.alvo||g.target||1;metaPct=Math.round((v/a)*100)}
return {score:score,topCategory:topCat[0],topValue:Math.round(topCat[1]),metaNome:metaNome,metaPct:metaPct};
}

function salvarEduDica(titulo,emoji){
if(!titulo)return;
var arr=loadEduDicasSalvas();
arr.unshift({titulo:String(titulo),emoji:emoji||'💡',date:new Date().toISOString()});
if(arr.length>20)arr.pop();
saveEduDicasSalvas(arr);
if(document.getElementById('eduDicaHistory')){var saved=loadEduDicasSalvas();document.getElementById('eduDicaHistory').innerHTML='<h4 style="font-size:.9em;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i data-lucide="star" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i> Dicas salvas</h4>'+saved.slice(0,7).map(function(d){return '<div class="edu-dica-hist-item"><i data-lucide="lightbulb" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> '+d.titulo+'</div>'}).join('');if(typeof lucide!=='undefined')lucide.createIcons();}
toast(typeof t==='function'?t('toast_dica_salva'):'Dica salva!','ok');
}

var EDU_DESAFIOS=[
{id:'delivery7',lucide:'calendar',nome:'7 Dias Sem Delivery',duracao:7,regra:'zero delivery/ifood/rappi',xp:150,badgeId:'desafio_delivery7'},
{id:'guardar10',lucide:'wallet',nome:'Guardar 10% do Salário',duracao:30,regra:'10% receita como poupança',xp:200,badgeId:'desafio_guardar10'},
{id:'zero_sup',lucide:'trending-up',nome:'Semana Zero Supérfluo',duracao:7,regra:'zero lazer/restaurante não essencial',xp:150,badgeId:'desafio_zerosup'},
{id:'meta_dia',lucide:'target',nome:'Meta em Dia',duracao:30,regra:'1 aporte em cada meta ativa',xp:200,badgeId:'desafio_metadia'},
{id:'30lanc',lucide:'pen-line',nome:'30 Dias de Lançamentos',duracao:30,regra:'1 lançamento por dia',xp:300,badgeId:'desafio_30lanc'}
];
var eduDesafiosAtivos=[];
function loadEduDesafios(){try{var s=localStorage.getItem('virtus_edu_desafios');if(s)eduDesafiosAtivos=JSON.parse(s)}catch(e){eduDesafiosAtivos=[]}}
function saveEduDesafios(){try{localStorage.setItem('virtus_edu_desafios',JSON.stringify(eduDesafiosAtivos))}catch(e){}}

function updateEduDesafiosProgress(){
var now=new Date();var today=now.getTime();
var changed=false;
eduDesafiosAtivos.forEach(function(a){
if(a.concluido)return;
var d=EDU_DESAFIOS.find(function(x){return x.id===a.id});if(!d)return;
var startMs=new Date(a.start).getTime();
var dias=Math.floor((today-startMs)/(24*60*60*1000));
a.diasPassados=Math.min(dias,d.duracao);
if(dias>=d.duracao){
a.concluido=true;a.diasPassados=d.duracao;
if(typeof addEducationXP==='function')addEducationXP(d.xp);
if(typeof achievements!=='undefined'){achievements[d.badgeId||a.id]={date:new Date().toISOString()};if(typeof saveData==='function')saveData();}
toast((typeof t==='function'?t('toast_desafio_concluido'):'Desafio "{0}" concluído! +{1} XP').replace('{0}',d.nome).replace('{1}',d.xp),'ok');
changed=true;
}
});
if(changed)saveEduDesafios();
}
function renderEduDesafios(){
loadEduDesafios();
updateEduDesafiosProgress();
var list=document.getElementById('eduDesafiosList');
if(!list)return;
var h='';
EDU_DESAFIOS.forEach(function(d){
var ativo=eduDesafiosAtivos.find(function(a){return a.id===d.id&&!a.concluido});
var concluido=eduDesafiosAtivos.some(function(a){return a.id===d.id&&a.concluido});
var dias=ativo?ativo.diasPassados:0;
var pct=d.duracao>0?Math.min(100,Math.round((dias/(d.duracao))*100)):0;
h+='<div class="edu-desafio-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="edu-desafio-icon"><i data-lucide="'+(d.lucide||'trophy')+'" style="width:24px;height:24px;stroke:currentColor;stroke-width:2"></i></span><strong>'+d.nome+'</strong></div><p style="font-size:.8em;color:var(--t2);margin:0 0 8px">'+d.regra+' · '+d.duracao+' dias · +'+d.xp+' XP</p>';
if(ativo){h+='<div class="edu-desafio-progress"><div class="edu-desafio-fill" style="width:'+pct+'%"></div></div><span style="font-size:.75em;color:var(--t3)">'+dias+'/'+d.duracao+' dias</span>';}
else if(concluido){h+='<span style="color:#22C55E;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2.5"></i> Concluído</span>';}
else if(eduDesafiosAtivos.filter(function(a){return !a.concluido}).length>=2){h+='<span style="font-size:.8em;color:var(--t3)">Máximo 2 desafios ativos. Conclua um primeiro.</span>';}
else{h+='<button class="calc-btn" style="font-size:.85em;padding:8px 16px" onclick="aceitarEduDesafio(\''+d.id+'\')">Aceitar desafio</button>';}
h+='</div>';
});
list.innerHTML=h||'<p style="color:var(--t2)">Nenhum desafio disponível.</p>';
if(typeof lucide!=='undefined')lucide.createIcons();
}

function aceitarEduDesafio(id){
loadEduDesafios();
if(eduDesafiosAtivos.filter(function(a){return !a.concluido}).length>=2){toast(typeof t==='function'?t('toast_max_desafios'):'Máximo 2 desafios ativos.','info');return;}
var d=EDU_DESAFIOS.find(function(x){return x.id===id});
if(!d)return;
eduDesafiosAtivos.push({id:id,start:new Date().toISOString(),diasPassados:0,concluido:false});
saveEduDesafios();
renderEduDesafios();
toast(typeof t==='function'?t('toast_desafio_aceito'):'Desafio aceito! Boa sorte.','ok');
}

function renderFinTrails(){
loadFinLessons();
var container=document.getElementById('finTrailsList');
var totalLessons=0,completed=0;
if(!container)return;

FIN_TRAILS.forEach(function(t){totalLessons+=t.lessons.length;
t.lessons.forEach(function(l){if(finCompletedLessons.indexOf(l.id)>=0)completed++})});

var pct=totalLessons>0?Math.round(completed/totalLessons*100):0;
var fill=document.getElementById('finTrailFill');if(fill)fill.style.width=pct+'%';
var label=document.getElementById('finTrailLabel');if(label)label.textContent=completed+' de '+totalLessons+' lições concluídas';
var badge=document.getElementById('finEduProgress');if(badge)badge.textContent=pct+'%';

var h='';
FIN_TRAILS.forEach(function(trail,tidx){
var tComp=0;trail.lessons.forEach(function(l){if(finCompletedLessons.indexOf(l.id)>=0)tComp++});
var tPct=Math.round(tComp/trail.lessons.length*100);
var bgColor=tPct===100?'rgba(34,197,94,.08)':'rgba(79,140,255,.03)';
h+='<div class="fin-trail" id="finTrail'+tidx+'">';
h+='<div class="fin-trail-head" onclick="toggleFinTrail('+tidx+')" style="background:'+bgColor+'">';
h+='<div class="fin-trail-head-left">';
h+='<div class="fin-trail-head-icon"><i data-lucide="'+(trail.lucide||'book-open')+'" style="width:22px;height:22px;stroke:currentColor;stroke-width:2"></i></div>';
h+='<div><div class="fin-trail-head-name">'+trail.name+'</div>';
h+='<div class="fin-trail-head-sub">'+tComp+'/'+trail.lessons.length+' lições</div></div></div>';
h+='<span class="fin-trail-head-badge" style="background:'+(tPct===100?'rgba(34,197,94,.12);color:#22C55E':'rgba(79,140,255,.12);color:var(--vr)')+'">'+tPct+'%</span>';
h+='</div>';
h+='<div class="fin-trail-lessons">';
trail.lessons.forEach(function(lesson,lidx){
var done=finCompletedLessons.indexOf(lesson.id)>=0;
var isCurrent=!done&&(lidx===0||finCompletedLessons.indexOf(trail.lessons[lidx-1].id)>=0);
var statusCls=done?'done':isCurrent?'current':'locked';
var statusIcon=done?'<i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2.5"></i>':isCurrent?'<i data-lucide="play" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i>':'<i data-lucide="lock" style="width:14px;height:14px;stroke:currentColor;stroke-width:2"></i>';
h+='<div class="fin-lesson" onclick="openFinLesson('+tidx+','+lidx+')">';
h+='<div class="fin-lesson-status '+statusCls+'" style="display:flex;align-items:center;justify-content:center;min-width:24px">'+statusIcon+'</div>';
h+='<div class="fin-lesson-name" style="'+(done?'text-decoration:line-through;opacity:.6':'')+'">'+lesson.title+'</div>';
h+='<div class="fin-lesson-time">'+lesson.time+'</div>';
h+='</div>';
});
h+='</div></div>';
});
container.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

function toggleFinTrail(idx){
var el=document.getElementById('finTrail'+idx);
if(el)el.classList.toggle('open');
}

window._currentEduTidx=null;window._currentEduLidx=null;
function openFinLesson(tidx,lidx){
var trail=FIN_TRAILS[tidx];
if(!trail)return;
var lesson=trail.lessons[lidx];
if(!lesson)return;
window._currentEduTidx=tidx;window._currentEduLidx=lidx;

var done=finCompletedLessons.indexOf(lesson.id)>=0;
var hasQuiz=lesson.quiz&&lesson.quiz.length>=1;
var btnHtml='';
if(done){btnHtml='<div style="text-align:center;padding:12px;color:#22C55E;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px"><i data-lucide="check" style="width:18px;height:18px;stroke:currentColor;stroke-width:2.5"></i> Lição concluída</div>';}
else if(hasQuiz){btnHtml='<div id="eduQuizWrap" class="edu-quiz"><div class="edu-quiz-q">Responda ao quiz para desbloquear a conclusão:</div>'+lesson.quiz.map(function(q,iq){var opts=q.opts||q.opcoes||[];return '<div class="edu-quiz-q">'+(iq+1)+'. '+q.pergunta+'</div><div class="edu-quiz-opts" id="eduQuizOpts'+iq+'">'+opts.map(function(o,j){var isCorrect=o.correct===true||o.certa;return '<div class="edu-quiz-opt" data-correct="'+isCorrect+'" data-expl="'+(o.explicacao||'')+'" onclick="eduQuizClick('+tidx+','+lidx+','+iq+',this,'+j+')">'+o.text+'</div>'}).join('')+'</div><div id="eduQuizFeedback'+iq+'" class="edu-quiz-feedback" style="display:none"></div>';}).join('')+'<div id="eduQuizComplete" style="display:none;margin-top:14px"><button class="calc-btn" onclick="completeFinLesson(\''+lesson.id.replace(/'/g,"\\'")+'\','+tidx+','+lidx+')"><i data-lucide="check" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Concluir lição</button></div></div>';}
else{btnHtml='<button class="calc-btn" onclick="completeFinLesson(\''+lesson.id.replace(/'/g,"\\'")+'\','+tidx+','+lidx+')"><i data-lucide="check" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Marcar como concluída</button>';}

var dicaBox=lesson.dicaPratica?'<div class="edu-lesson-dica"><strong><i data-lucide="lightbulb" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Dica prática:</strong> '+lesson.dicaPratica+'</div>':'';
document.getElementById('finArticleTitle').textContent=lesson.title;
document.getElementById('finArticleContent').innerHTML='<p style="font-size:.85em;color:var(--t3);margin:0 0 12px">'+lesson.time+'</p>'+lesson.content+dicaBox+'<div style="margin-top:16px">'+btnHtml+'</div>';
document.getElementById('finArticleOv').classList.add('show');
if(typeof lucide!=='undefined')lucide.createIcons();
}

var eduQuizAnswered=[];
function eduQuizClick(tidx,lidx,qIdx,el,optIdx){
var trail=FIN_TRAILS[tidx];if(!trail)return;
var lesson=trail.lessons[lidx];if(!lesson||!lesson.quiz||!lesson.quiz[qIdx])return;
var opts=lesson.quiz[qIdx].opts||lesson.quiz[qIdx].opcoes;
var correct=opts[optIdx].correct===true||opts[optIdx].certa;
var wrap=el.closest('.edu-quiz-opts');if(!wrap)return;
var feedback=document.getElementById('eduQuizFeedback'+qIdx);if(feedback){feedback.style.display='block';feedback.style.background=correct?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)';feedback.style.color=correct?'#22C55E':'#EF4444';feedback.textContent=correct?'Correto!':(opts[optIdx].explicacao||'Incorreto.');}
wrap.querySelectorAll('.edu-quiz-opt').forEach(function(o){o.style.pointerEvents='none';if(o===el)o.classList.add(correct?'correct':'wrong');});
if(!window.eduQuizAnswered)window.eduQuizAnswered=[];window.eduQuizAnswered[qIdx]=correct;
var allDone=lesson.quiz.every(function(_,i){return window.eduQuizAnswered[i]});
if(allDone){var completeDiv=document.getElementById('eduQuizComplete');if(completeDiv)completeDiv.style.display='block';var acertos=window.eduQuizAnswered.filter(Boolean).length;if(acertos===lesson.quiz.length)addEducationXP(30);}
}

function completeFinLesson(id,tidx,lidx){
if(finCompletedLessons.indexOf(id)<0){
finCompletedLessons.push(id);
addEducationXP(50);
saveFinLessons();
var trail=FIN_TRAILS[tidx];
if(trail){var tComp=trail.lessons.filter(function(l){return finCompletedLessons.indexOf(l.id)>=0}).length;if(tComp===trail.lessons.length){addEducationXP(300);if(typeof achievements!=='undefined'){achievements['edu_trail_'+(tidx+1)]={date:new Date().toISOString()};if(typeof saveData==='function')saveData();}toast(typeof t==='function'?t('toast_trilha_completa'):'Trilha completa! +300 XP e badge.','ok');}}
renderFinTrails();updateEduXPLabel();if(typeof updateContinuarBtn==='function')updateContinuarBtn();if(typeof rBadges==='function')rBadges();
toast(typeof t==='function'?t('toast_licao_concluida'):'Lição concluída! +50 XP','ok');
closeFinArticle();
}
}

/* ============================================================
   CALCULADORAS — Usar meus dados
   ============================================================ */
function getFinCalcUserData(){
var td=0,tr=0;var now=new Date();var curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
entries.forEach(function(e){
if(e.type==='despesa')td+=e.value;else tr+=e.value;
});
var md=getMD();var nm=Math.max(Object.keys(md).length,1);
var avgGasto=td/nm;
var totalPat=0;
for(var k=0;k<userAccs.length;k++){var b=getAccBal(userAccs[k]);totalPat+=b.atual;}
var metaVal=0,metaAlvo=1;
if(typeof goals!=='undefined'&&goals.length>0){var g=goals[0];metaVal=g.atual||g.current||0;metaAlvo=g.alvo||g.target||1;}
var faltaMeta=Math.max(0,(metaAlvo||1)-metaVal);
return {receitaMensal:tr,despesaMensal:td,mediaGasto:avgGasto,patrimonio:totalPat,metaFalta:faltaMeta,mesesMeta:60};
}
function applyFinCalcUserData(type){
var d=getFinCalcUserData();
var set=function(id,val){var el=document.getElementById(id);if(el)el.value=String(val);};
if(type==='compostos'){
set('ccIni',Math.round(d.patrimonio)||1000);
set('ccAp',Math.round(Math.max(0,d.receitaMensal-d.despesaMensal)*0.2)||500);
set('ccTax',1);set('ccPer',120);
}else if(type==='independência'){
set('ciGasto',Math.round(d.mediaGasto)||5000);
set('ciRent',0.7);
}else if(type==='aporte'){
set('caMeta',Math.round(d.metaFalta)||100000);
set('caPrazo',d.mesesMeta||60);
set('caTax',1);
}else if(type==='financiamento'){
set('cfImov',400000);
set('cfEnt',Math.round(d.patrimonio*0.2)||80000);
set('cfAlug',Math.round(d.mediaGasto*0.3)||2000);
set('cfJuros',10);set('cfPrazo',30);
}else if(type==='aposentadoria'){
set('cpPat',Math.round(d.patrimonio));
set('cpGasto',Math.round(d.mediaGasto)||5000);
set('cpIdade',30);set('cpApos',65);set('cpRent',10);
}else if(type==='emergência'){
set('ceGasto',Math.round(d.mediaGasto)||3000);
set('ceMeses',6);
set('ceAporte',Math.round(d.mediaGasto*0.1)||500);
}else if(type==='reserva'){
set('crVal',Math.round(d.patrimonio)||10000);
set('crPrazo',12);
}else if(type==='divida'){
set('cdVal',5000);
set('cdTax',10);
set('cdParc',Math.round(Math.min(d.mediaGasto*0.2,500)));
}
toast(typeof t==='function'?t('toast_campos_preenchidos_auto'):'Campos preenchidos com seus dados.','ok');
}

function openFinCalc(type,prefill){
var title='',body='';
var apMeta=prefill&&prefill.meta!=null?prefill.meta:100000;
var apPrazo=prefill&&prefill.prazo!=null?prefill.prazo:60;
var btnMeusDados='<button type="button" class="calc-btn calc-btn-outline" style="margin-bottom:12px;font-size:.85em" onclick="applyFinCalcUserData(\''+type+'\')">&#128100; Usar meus dados</button>';

if(type==='compostos'){
title='&#128176; Juros Compostos';
body=btnMeusDados+'<label>Valor inicial (R$)</label><input type="number" id="ccIni" value="1000" step="100">';
body+='<label>Aporte mensal (R$)</label><input type="number" id="ccAp" value="500" step="50">';
body+='<label>Taxa de juros (% ao mês)</label><input type="number" id="ccTax" value="1" step="0.1">';
body+='<label>Período (meses)</label><input type="number" id="ccPer" value="120" step="12">';
body+='<button class="calc-btn" onclick="calcCompostos()">Calcular</button>';
}else if(type==='independência'){
title='&#127965; Independência Financeira';
body=btnMeusDados+'<label>Gasto mensal desejado (R$)</label><input type="number" id="ciGasto" value="5000" step="500">';
body+='<label>Rentabilidade mensal esperada (%)</label><input type="number" id="ciRent" value="0.7" step="0.1">';
body+='<button class="calc-btn" onclick="calcIndep()">Calcular</button>';
}else if(type==='aporte'){
title='&#128200; Simulador de Aportes';
body=btnMeusDados+'<label>Valor que falta para a meta (R$)</label><input type="number" id="caMeta" value="'+apMeta+'" step="1000">';
body+='<label>Prazo (meses)</label><input type="number" id="caPrazo" value="'+apPrazo+'" step="1">';
body+='<label>Taxa mensal (%)</label><input type="number" id="caTax" value="1" step="0.1">';
body+='<button class="calc-btn" onclick="calcAporte()">Calcular</button>';
}else if(type==='financiamento'){
title='&#127968; Financiamento vs Aluguel';
body=btnMeusDados+'<label>Valor do imóvel (R$)</label><input type="number" id="cfImov" value="400000" step="10000">';
body+='<label>Entrada (R$)</label><input type="number" id="cfEnt" value="80000" step="5000">';
body+='<label>Juros do financiamento (%/ano)</label><input type="number" id="cfJuros" value="10" step="0.5">';
body+='<label>Prazo (anos)</label><input type="number" id="cfPrazo" value="30" step="1">';
body+='<label>Aluguel equivalente (R$/mes)</label><input type="number" id="cfAlug" value="2000" step="100">';
body+='<button class="calc-btn" onclick="calcFinanc()">Calcular</button>';
}else if(type==='aposentadoria'){
title='&#128116; Aposentadoria';
body=btnMeusDados+'<label>Sua idade atual</label><input type="number" id="cpIdade" value="30" step="1">';
body+='<label>Idade para aposentar</label><input type="number" id="cpApos" value="65" step="1">';
body+='<label>Gasto mensal na aposentadoria (R$)</label><input type="number" id="cpGasto" value="5000" step="500">';
body+='<label>Patrimônio atual (R$)</label><input type="number" id="cpPat" value="0" step="1000">';
body+='<label>Rentabilidade anual esperada (%)</label><input type="number" id="cpRent" value="10" step="0.5">';
body+='<button class="calc-btn" onclick="calcApos()">Calcular</button>';
}else if(type==='emergência'){
title='&#128657; Reserva de Emergência';
body=btnMeusDados+'<label>Gasto mensal total (R$)</label><input type="number" id="ceGasto" value="3000" step="100">';
body+='<label>Meses de reserva desejados</label><input type="number" id="ceMeses" value="6" step="1">';
body+='<label>Quanto pode guardar por mês (R$)</label><input type="number" id="ceAporte" value="500" step="50">';
body+='<button class="calc-btn" onclick="calcEmerg()">Calcular</button>';
}else if(type==='reserva'){
title='&#128200; Quanto rende minha reserva?';
body=btnMeusDados+'<label>Valor da reserva (R$)</label><input type="number" id="crVal" value="10000" step="1000">';
body+='<label>Prazo (meses)</label><input type="number" id="crPrazo" value="12" step="1">';
body+='<button class="calc-btn" onclick="calcReserva()">Comparar</button>';
}else if(type==='divida'){
title='&#128176; Quanto tempo para quitar minha dívida?';
body=btnMeusDados+'<label>Valor da dívida (R$)</label><input type="number" id="cdVal" value="5000" step="100">';
body+='<label>Taxa de juros mensal (%)</label><input type="number" id="cdTax" value="10" step="0.5">';
body+='<label>Quanto pode pagar por mês (R$)</label><input type="number" id="cdParc" value="500" step="50">';
body+='<button class="calc-btn" onclick="calcDivida()">Calcular</button>';
}

document.getElementById('finCalcTitle').innerHTML=title;
document.getElementById('finCalcBody').innerHTML=body;
document.getElementById('finCalcResult').style.display='none';
document.getElementById('finCalcResult').innerHTML='';
document.getElementById('finCalcOv').classList.add('show');
if(typeof window.refreshLucide==='function')lucide.createIcons();
}

function closeFinCalc(){document.getElementById('finCalcOv').classList.remove('show')}

function showCalcResult(title,value,detail){
var r=document.getElementById('finCalcResult');
r.style.display='block';
r.innerHTML='<div class="calc-res-title">'+title+'</div><div class="calc-res-value">'+value+'</div><div class="calc-res-detail">'+detail+'</div>';
}

function calcCompostos(){
var ini=parseFloat(document.getElementById('ccIni').value)||0;
var ap=parseFloat(document.getElementById('ccAp').value)||0;
var tax=(parseFloat(document.getElementById('ccTax').value)||0)/100;
var per=parseInt(document.getElementById('ccPer').value)||0;
var total=ini;
for(var i=0;i<per;i++){total=total*(1+tax)+ap}
var investido=ini+ap*per;
var jurosG=total-investido;
showCalcResult('Montante Final','R$ '+total.toFixed(2),
'Você investiu: <b>R$ '+investido.toFixed(2)+'</b><br>Juros ganhos: <b>R$ '+jurosG.toFixed(2)+'</b><br>Rendimento total: <b>'+((total/investido-1)*100).toFixed(1)+'%</b><br>Em '+per+' meses ('+Math.round(per/12)+' anos)');
}

function calcIndep(){
var gasto=parseFloat(document.getElementById('ciGasto').value)||0;
var rent=(parseFloat(document.getElementById('ciRent').value)||0)/100;
if(rent<=0){showCalcResult('Erro','—','Taxa deve ser maior que 0');return}
var patriNec=gasto/rent;
showCalcResult('Patrimônio Necessário','R$ '+patriNec.toFixed(0),
'Para ter renda passiva de <b>R$ '+gasto.toFixed(0)+'/mês</b><br>Com rendimento de <b>'+(rent*100).toFixed(1)+'% ao mes</b><br><br>Se investir R$ 1.000/mês a 1%/mês:<br>Levaria ~<b>'+Math.round(Math.log(patriNec*0.01/1000+1)/Math.log(1.01))+'</b> meses');
}

function calcAporte(){
var meta=parseFloat(document.getElementById('caMeta').value)||0;
var prazo=parseInt(document.getElementById('caPrazo').value)||0;
var tax=(parseFloat(document.getElementById('caTax').value)||0)/100;
if(tax<=0||prazo<=0){showCalcResult('Erro','—','Valores inválidos');return}
var fator=Math.pow(1+tax,prazo);
var aporte=meta*tax/(fator-1);
var investido=aporte*prazo;
showCalcResult('Aporte Mensal Necessário','R$ '+aporte.toFixed(2),
'Para atingir <b>R$ '+meta.toFixed(0)+'</b> em <b>'+prazo+' meses</b><br>Total investido: <b>R$ '+investido.toFixed(0)+'</b><br>Juros ganhos: <b>R$ '+(meta-investido).toFixed(0)+'</b>');
}

function calcFinanc(){
var imov=parseFloat(document.getElementById('cfImov').value)||0;
var ent=parseFloat(document.getElementById('cfEnt').value)||0;
var jAnual=(parseFloat(document.getElementById('cfJuros').value)||0)/100;
var anos=parseInt(document.getElementById('cfPrazo').value)||0;
var alug=parseFloat(document.getElementById('cfAlug').value)||0;
var jMensal=Math.pow(1+jAnual,1/12)-1;
var meses=anos*12;
var financ=imov-ent;
var parcela=financ*(jMensal*Math.pow(1+jMensal,meses))/(Math.pow(1+jMensal,meses)-1);
var totalFinanc=ent+parcela*meses;
var totalAlug=alug*meses;
/* Se investisse a entrada + diferenca da parcela-aluguel */
var investAlt=ent;
for(var i=0;i<meses;i++){investAlt=investAlt*1.008}
showCalcResult('Comparativo',parcela>alug?'Aluguel mais barato/mês':'Financiamento mais barato/mês',
'<b>Financiamento:</b><br>Parcela: R$ '+parcela.toFixed(0)+'/mes<br>Total pago: R$ '+totalFinanc.toFixed(0)+' ('+((totalFinanc/imov)).toFixed(1)+'x o imóvel)<br><br><b>Aluguel:</b><br>R$ '+alug.toFixed(0)+'/mes<br>Total em '+anos+' anos: R$ '+totalAlug.toFixed(0)+'<br><br><b>Diferença mensal:</b> R$ '+Math.abs(parcela-alug).toFixed(0));
}

function calcApos(){
var idade=parseInt(document.getElementById('cpIdade').value)||0;
var apos=parseInt(document.getElementById('cpApos').value)||0;
var gasto=parseFloat(document.getElementById('cpGasto').value)||0;
var pat=parseFloat(document.getElementById('cpPat').value)||0;
var rentA=(parseFloat(document.getElementById('cpRent').value)||0)/100;
var rentM=Math.pow(1+rentA,1/12)-1;
var mesesAte=(apos-idade)*12;
var patriNec=gasto/rentM;
/* Quanto precisa aportar por mes */
var fvPat=pat*Math.pow(1+rentM,mesesAte);
var falta=Math.max(0,patriNec-fvPat);
var aporte=falta>0?falta*rentM/(Math.pow(1+rentM,mesesAte)-1):0;
showCalcResult('Resultado','R$ '+aporte.toFixed(0)+'/mes',
'Patrimônio necessário: <b>R$ '+patriNec.toFixed(0)+'</b><br>Seu patrimônio atual (projetado a '+apos+' anos): <b>R$ '+fvPat.toFixed(0)+'</b><br>Falta acumular: <b>R$ '+falta.toFixed(0)+'</b><br>Aporte mensal necessário: <b>R$ '+aporte.toFixed(0)+'</b><br>Tempo: <b>'+mesesAte+' meses ('+Math.round(mesesAte/12)+' anos)</b>');
}

function calcEmerg(){
var gasto=parseFloat(document.getElementById('ceGasto').value)||0;
var meses=parseInt(document.getElementById('ceMeses').value)||0;
var aporte=parseFloat(document.getElementById('ceAporte').value)||0;
var reserva=gasto*meses;
var mesesPara=aporte>0?Math.ceil(reserva/aporte):0;
showCalcResult('Reserva Ideal','R$ '+reserva.toFixed(0),
'Gasto mensal: <b>R$ '+gasto.toFixed(0)+'</b><br>Meses de reserva: <b>'+meses+'</b><br>Guardando R$ '+aporte.toFixed(0)+'/mes, você monta em: <b>'+mesesPara+' meses</b> ('+(mesesPara/12).toFixed(1)+' anos)');
}

function calcReserva(){
var val=parseFloat(document.getElementById('crVal').value)||0;
var meses=parseInt(document.getElementById('crPrazo').value)||0;
if(val<=0||meses<=0){showCalcResult('Erro','—','Preencha valor e prazo');return;}
var poup=val*Math.pow(1+0.005987,meses);
var cdi100=val*Math.pow(1+0.01,meses);
var selic=val*Math.pow(1+0.0095,meses);
var cdi110=val*Math.pow(1+0.011,meses);
var det='<b>Poupança (~0.6%/mês):</b> R$ '+poup.toFixed(2)+'<br><b>CDB 100% CDI (~1%/mês):</b> R$ '+cdi100.toFixed(2)+'<br><b>Tesouro SELIC (~0.95%/mês):</b> R$ '+selic.toFixed(2)+'<br><b>CDB 110% CDI (~1.1%/mês):</b> R$ '+cdi110.toFixed(2)+'<br><br>Rendimento líquido aproximado. Consulte instituições para taxas reais.';
showCalcResult('Comparativo em '+meses+' meses','R$ '+cdi110.toFixed(0)+' (melhor cenário)',det);
}

function calcDivida(){
var val=parseFloat(document.getElementById('cdVal').value)||0;
var taxM=(parseFloat(document.getElementById('cdTax').value)||0)/100;
var parc=parseFloat(document.getElementById('cdParc').value)||0;
if(val<=0||parc<=0){showCalcResult('Erro','—','Preencha valor e parcela');return;}
if(parc<=val*taxM){showCalcResult('Atenção','Parcela insuficiente','A parcela deve ser maior que os juros mensais para quitar a dívida.');return;}
var meses=0,resto=val,totalJuros=0;
while(resto>0.01&&meses<600){var juros=resto*taxM;totalJuros+=juros;resto=resto+juros-parc;meses++;}
var totalPago=val+totalJuros;
showCalcResult('Tempo para quitar',''+meses+' meses ('+(meses/12).toFixed(1)+' anos)',
'Total a pagar: <b>R$ '+totalPago.toFixed(2)+'</b><br>Juros totais: <b>R$ '+totalJuros.toFixed(2)+'</b><br>Quitando com parcelas de R$ '+parc.toFixed(2)+'/mês.');
}

/* ============================================================
   SUB-TAB 4: DIAGNÓSTICO FINANCEIRO
   ============================================================ */
function renderFinDiagnostic(){
var diagList=document.getElementById('finDiagList');
var recomBox=document.getElementById('finRecomBox');
var recomList=document.getElementById('finRecomList');
if(!diagList)return;

var score=0;var maxScore=100;
var criteria=[];
var recomendacoes=[];
var now=new Date();
var curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var trM=0,tdM=0;
entries.forEach(function(e){
if(e.date&&e.date.substring(0,7)===curM){
if(e.type==='despesa')tdM+=e.value;else trM+=e.value;
}
});

/* 1. Tem orçamento (15pts) */
var hasBudget=typeof budgets!=='undefined'&&Object.keys(budgets).length>0;
criteria.push({name:'Orçamento definido',pts:hasBudget?15:0,max:15,icon:hasBudget?'&#9989;':'&#10060;'});
if(!hasBudget)recomendacoes.push('Defina orçamentos por categoria na aba Orçamento para controlar melhor seus gastos.');

/* 2. Lançamentos em dia (10pts) */
var hasEntries=entries.length>=5;
criteria.push({name:'Lançamentos em dia (5+)',pts:hasEntries?10:0,max:10,icon:hasEntries?'&#9989;':'&#10060;'});
if(!hasEntries)recomendacoes.push('Lance pelo menos 5 transações para ter uma visão clara das suas finanças.');

/* 3. Saldo positivo (15pts) */
var saldoOk=trM>tdM;
criteria.push({name:'Receitas > Despesas este mês',pts:saldoOk?15:(trM>0?5:0),max:15,icon:saldoOk?'&#9989;':(trM>0?'&#9888;&#65039;':'&#10060;')});
if(!saldoOk&&trM>0)recomendacoes.push('Suas despesas superam as receitas. Revise gastos não essenciais para inverter isso.');

/* 4. Taxa de economia > 20% (15pts) */
var taxaEcon=trM>0?((trM-tdM)/trM*100):0;
var econPts=taxaEcon>=20?15:taxaEcon>=10?10:taxaEcon>=5?5:0;
criteria.push({name:'Taxa de economia >= 20%'+(trM>0?' (atual: '+taxaEcon.toFixed(0)+'%)':''),pts:econPts,max:15,icon:econPts>=15?'&#9989;':econPts>=5?'&#9888;&#65039;':'&#10060;'});
if(econPts<15)recomendacoes.push('Tente guardar pelo menos 20% da renda. Atualmente você guarda '+taxaEcon.toFixed(0)+'%.');

/* 5. Reserva de emergência (15pts) */
var md=getMD();var mks=Object.keys(md).sort();
var avgGasto=0;
mks.forEach(function(k){avgGasto+=md[k].d});
avgGasto=mks.length>0?avgGasto/mks.length:tdM;
var reservaIdeal=avgGasto*6;
var totalPat=0;
for(var k=0;k<userAccs.length;k++){var _ak=userAccs[k];if(accountMeta[_ak]&&accountMeta[_ak].incluirNaSoma===false)continue;var b=getAccBal(_ak);totalPat+=b.atual}
var reservaPct=reservaIdeal>0?(totalPat/reservaIdeal*100):0;
var reservaPts=reservaPct>=100?15:reservaPct>=50?10:reservaPct>=25?5:0;
criteria.push({name:'Reserva de emergência (6 meses)',pts:reservaPts,max:15,icon:reservaPts>=15?'&#9989;':reservaPts>=5?'&#9888;&#65039;':'&#10060;'});
if(reservaPts<15)recomendacoes.push('Complete sua reserva de emergência. Meta: R$ '+reservaIdeal.toFixed(0)+'. Você tem '+reservaPct.toFixed(0)+'%.');

/* 6. Investimentos (10pts) */
var hasInv=(typeof investments!=='undefined'&&investments.length>0)||entries.some(function(e){return e.category==='Investimentos'});
criteria.push({name:'Tem investimentos',pts:hasInv?10:0,max:10,icon:hasInv?'&#9989;':'&#10060;'});
if(!hasInv)recomendacoes.push('Comece a investir! Mesmo R$ 50/mes em Tesouro Selic já é um ótimo início.');

/* 7. Diversificacao (10pts) */
var numAccs=userAccs.length;
var divPts=numAccs>=3?10:numAccs>=2?5:0;
criteria.push({name:'Diversificação de contas (3+)',pts:divPts,max:10,icon:divPts>=10?'&#9989;':divPts>=5?'&#9888;&#65039;':'&#10060;'});
if(divPts<10)recomendacoes.push('Diversifique usando pelo menos 3 contas/instituições financeiras.');

/* 8. Metas definidas (10pts) */
var hasMetas=typeof goals!=='undefined'&&goals.length>0;
criteria.push({name:'Metas financeiras definidas',pts:hasMetas?10:0,max:10,icon:hasMetas?'&#9989;':'&#10060;'});
if(!hasMetas)recomendacoes.push('Defina metas na aba Metas. Ter objetivos claros aumenta sua motivação e disciplina.');

/* Total */
criteria.forEach(function(c){score+=c.pts});
window._lastFinScore=score;

/* Render score */
var arc=document.getElementById('finScoreArc');
var num=document.getElementById('finScoreNum');
var title=document.getElementById('finScoreTitle');
var sub=document.getElementById('finScoreSub');
if(arc){
var circumference=327;
var offset=circumference-(score/100)*circumference;
setTimeout(function(){arc.style.strokeDashoffset=offset;
var color=score>=80?'#22C55E':score>=60?'#EAB308':score>=40?'#F59E0B':'#EF4444';
arc.style.stroke=color;
},100);
}
if(num)num.textContent=score;
if(title)title.textContent=score>=80?'Excelente! Finanças saudáveis':score>=60?'Bom, mas pode melhorar':score>=40?'Atenção necessária':'Situação crítica';
if(sub)sub.textContent=score>=80?'Continue assim! Você está no caminho certo.':score>=60?'Algumas áreas precisam de atenção.':score>=40?'Revise as recomendações abaixo para melhorar.':'Foque nas recomendações urgentes abaixo.';

/* Render criteria */
var h='';
criteria.forEach(function(c){
h+='<div class="fin-diag-item">';
h+='<div class="fin-diag-icon">'+c.icon+'</div>';
h+='<div class="fin-diag-name">'+c.name+'</div>';
h+='<div class="fin-diag-pts '+(c.pts>=c.max?'earned':'missed')+'">'+(c.pts>=c.max?'+':'')+c.pts+'/'+c.max+'</div>';
h+='</div>';
});
diagList.innerHTML=h;

/* Render recomendacoes */
if(recomendacoes.length>0){
recomBox.style.display='block';
recomList.innerHTML=recomendacoes.map(function(r){return '<div class="fin-recom">&#128161; '+r+'</div>'}).join('');
}else{
recomBox.style.display='block';
recomList.innerHTML='<div class="fin-recom" style="text-align:center;color:#22C55E">&#127881; Parabéns! Você atingiu todas as metas do diagnóstico!</div>';
}
}



/* Carregar uso da IA ao abrir a aba config */
function loadIAUsage(){
var user=firebase.auth().currentUser;
if(!user)return;
user.getIdToken().then(function(token){
fetch('/api/usage',{
method:'POST',
headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
body:JSON.stringify({})
}).then(function(r){return r.json();}).then(function(data){
var dc=document.getElementById('iaDailyCount');
var mc=document.getElementById('iaMonthlyCount');
var db=document.getElementById('iaDailyBar');
var mb=document.getElementById('iaMonthlyBar');
if(dc)dc.textContent=(data.dailyCount||0)+'/'+(data.dailyLimit||30)+' perguntas';
if(mc)mc.textContent=(data.monthlyCount||0)+'/'+(data.monthlyLimit||200)+' perguntas';
if(db)db.style.width=Math.min(100,((data.dailyCount||0)/(data.dailyLimit||30)*100))+'%';
if(mb)mb.style.width=Math.min(100,((data.monthlyCount||0)/(data.monthlyLimit||200)*100))+'%';
}).catch(function(e){console.log('usage load err',e);});
});
}

/* ── next block ── */

var nList=[];
function toggleNP(){
var p=document.getElementById('nPanel');
var o=document.getElementById('nOv');
if(p.classList.contains('open')){p.classList.remove('open');o.classList.remove('open')}
else{bldN();rndN();p.classList.add('open');o.classList.add('open')}
}

function generateNotifications(){try{bldN();rndN();var b=document.getElementById("nBadge");if(b&&nList.length>0){b.style.display="flex";b.textContent=nList.length}else if(b){b.style.display="none"}}catch(e){}}

function bldN(){
nList=[];
try{
var now=new Date();var cm=now.getMonth();var cy=now.getFullYear();var td=now.getDate();
var mE=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy});
var rM=0;var dM=0;
mE.forEach(function(e){if(e.type==='receita')rM+=e.value;else dM+=e.value});

if(typeof cards!=='undefined'&&cards.length>0){
cards.forEach(function(c){
var cd=c.closeDay||25;var dd=new Date(cy,cm,cd);if(dd<now)dd.setMonth(dd.getMonth()+1);
var dias=Math.ceil((dd-now)/(86400000));
var bm=typeof getBillingMonth==='function'?getBillingMonth(c,now.toISOString().split('T')[0]):'';
var fat=0;if(c.purchases)c.purchases.forEach(function(p){if(p.billingMonth===bm)fat+=p.value});
if(dias<=3)nList.push({id:'cc'+c.id,lucide:'credit-card',tp:'danger',tit:'Fatura Fechando!',txt:c.name+' fecha em '+dias+' dia(s)! Total: R$ '+fat.toFixed(2)});
else if(dias<=7)nList.push({id:'c7'+c.id,lucide:'credit-card',tp:'warn',tit:'Fatura Próxima',txt:c.name+' fecha em '+dias+' dias. Total: R$ '+fat.toFixed(2)});
if(c.limit>0&&fat/c.limit>=0.9)nList.push({id:'cl'+c.id,lucide:'alert-triangle',tp:'danger',tit:'Limite Quase Esgotado!',txt:c.name+': '+Math.round(fat/c.limit*100)+'% usado'});
if(c.temAnuidade&&c.anuidade&&c.anuidade.valorAnual>0){
var prox=c.anuidade.proximaCobranca;var dProx=prox?new Date(prox):new Date(cy,c.anuidade.mesCobranca-1,15);if(dProx<=now)dProx.setFullYear(dProx.getFullYear()+1);
var diasAnu=Math.ceil((dProx-now)/(86400000));var val=typeof c.anuidade.valorAnual==='number'?c.anuidade.valorAnual.toFixed(2):String(c.anuidade.valorAnual);
if(diasAnu<=30&&diasAnu>=0)nList.push({id:'an'+c.id,lucide:'credit-card',tp:'warn',tit:'Anuidade em breve',txt:'💳 Anuidade do '+c.name+' vence em '+(diasAnu===0?'hoje':diasAnu===1?'1 dia':diasAnu+' dias')+' — R$ '+val});
}
});
}

var cT={};mE.forEach(function(e){if(e.type==='despesa')cT[e.category]=(cT[e.category]||0)+e.value});
// Snooze: alertas recorrentes de orçamento/saldo não voltam no mesmo dia após dispensados
var _snoozeHoje=new Date().toISOString().split('T')[0];
var _snoozed={};try{var _sn=JSON.parse(localStorage.getItem('sib_notif_snooze')||'{}');Object.keys(_sn).forEach(function(k){if(_sn[k]===_snoozeHoje)_snoozed[k]=true;});}catch(e){}
for(var cat in budgets){if(cT[cat]){
var pc=Math.round(cT[cat]/budgets[cat]*100);
if(pc>=100&&!_snoozed['bo'+cat])nList.push({id:'bo'+cat,lucide:'alert-triangle',tp:'danger',tit:'Orçamento Estourado!',txt:cat+': '+pc+'% gasto'});
else if(pc>=80&&!_snoozed['bw'+cat])nList.push({id:'bw'+cat,lucide:'alert-triangle',tp:'warn',tit:'Orçamento em Alerta',txt:cat+': '+pc+'% usado. Restam R$ '+(budgets[cat]-cT[cat]).toFixed(2)});
}}

if(rM>0&&dM/rM>0.9&&!_snoozed['sh'])nList.push({id:'sh',lucide:'trending-down',tp:'danger',tit:'Gastos Elevados!',txt:'Você gastou '+Math.round(dM/rM*100)+'% da receita!'});

var mA=cm===0?11:cm-1;var aA=cm===0?cy-1:cy;
var dA=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===mA&&d.getFullYear()===aA&&e.type==='despesa'}).reduce(function(s,e){return s+e.value},0);
if(dA>0&&dM<dA){var ec=Math.round((1-dM/dA)*100);if(ec>=10)nList.push({id:'sv',lucide:'party-popper',tp:'success',tit:'Você Economizou!',txt:'Gastos '+ec+'% menores que mês passado!'});}

goals.forEach(function(g){
var pc=g.target>0?Math.round(g.current/g.target*100):0;
if(pc>=100)nList.push({id:'g1'+g.name,lucide:'trophy',tp:'success',tit:'Meta Atingida!',txt:g.name+' concluida!'});
else if(pc>=90)nList.push({id:'g9'+g.name,lucide:'target',tp:'success',tit:'Meta Quase La!',txt:g.name+' em '+pc+'%!'});
});

if(typeof recurrents!=='undefined'&&recurrents.length>0){
recurrents.forEach(function(rc){
var df=rc.day-td;
if(df>=0&&df<=3){var lb=df===0?'hoje':df===1?'amanha':'em '+df+' dias';
nList.push({id:'rc'+rc.desc,lucide:'calendar',tp:'info',tit:'Recorrente '+lb,txt:rc.desc+': R$ '+rc.value.toFixed(2)});}
});
}

var lD=new Date(cy,cm+1,0).getDate();var dR=lD-td;
if(dR<=5&&dR>0&&rM>0){var lm=(rM-dM)/dR;if(lm>0)nList.push({id:'me',lucide:'calendar',tp:'info',tit:'Fim do Mes',txt:'Faltam '+dR+' dias. Limite diario: R$ '+lm.toFixed(2)});}

var tx=rM>0?Math.round((rM-dM)/rM*100):0;
if(tx>=20)nList.push({id:'sr',lucide:'star',tp:'success',tit:'Poupança Excelente!',txt:'Você poupa '+tx+'% da renda!'});

var ri=JSON.parse(localStorage.getItem('vrt_nr')||'{}');
nList.forEach(function(n){if(ri[n.id])n.rd=true});
nList.sort(function(a,b){var o={danger:0,warn:1,success:2,info:3};if(a.rd!==b.rd)return a.rd?1:-1;return(o[a.tp]||3)-(o[b.tp]||3)});
}catch(ex){console.log('notif err:',ex)}
uNB();
}

function uNB(){
var ct=nList.filter(function(n){return !n.rd}).length;
var b=document.getElementById('nBadge');
if(b){if(ct>0){b.textContent=ct>99?'99+':ct;b.style.display='flex'}else{b.style.display='none'}}
}

function rndN(){
var bd=document.getElementById('nBody');if(!bd)return;
// Filtrar itens snoozados hoje para não poluir o painel
var _snoozeHoje2=new Date().toISOString().split('T')[0];
var _snoozed2={};try{var _sn2=JSON.parse(localStorage.getItem('sib_notif_snooze')||'{}');Object.keys(_sn2).forEach(function(k){if(_sn2[k]===_snoozeHoje2)_snoozed2[k]=true;});}catch(z){}
var visible=nList.filter(function(n){return !(_snoozed2[n.id]&&n.rd);});
if(visible.length===0){bd.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--t2)"><div style="font-size:3em;margin-bottom:12px;display:flex;justify-content:center"><i data-lucide="bell" style="width:48px;height:48px"></i></div><div style="font-weight:600;margin-bottom:6px">Tudo em dia!</div><div style="font-size:.85em">Nenhuma notificação.</div></div>';if(typeof window.refreshLucide==='function')lucide.createIcons();return}
var cs={danger:'rgba(239,68,68,.08)',warn:'rgba(234,179,8,.08)',success:'rgba(34,197,94,.08)',info:'rgba(79,140,255,.08)'};
var bs={danger:'rgba(239,68,68,.25)',warn:'rgba(234,179,8,.25)',success:'rgba(34,197,94,.25)',info:'rgba(79,140,255,.25)'};
var h='';
for(var i=0;i<visible.length;i++){var n=visible[i];var nIdx=nList.indexOf(n);var ic=n.lucide||'bell';
h+='<div class="notif-it'+(n.rd?'':' unread')+'" style="background:'+(cs[n.tp]||cs.info)+';border-color:'+(bs[n.tp]||bs.info)+'" onclick="mNR('+nIdx+')">';
h+='<div style="display:flex;align-items:start;gap:12px"><div class="notif-iw"><i data-lucide="'+ic+'" style="width:24px;height:24px"></i></div><div class="notif-ct">';
h+='<div class="notif-tt">'+n.tit+'</div><div class="notif-tx">'+n.txt+'</div>';
h+='<div class="notif-tm"><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;margin-right:4px"></i>Agora</div></div></div></div>';}
bd.innerHTML=h;
if(typeof window.refreshLucide==='function')lucide.createIcons();
}

function mNR(i){
if(nList[i]){nList[i].rd=true;var ri=JSON.parse(localStorage.getItem('vrt_nr')||'{}');ri[nList[i].id]=true;localStorage.setItem('vrt_nr',JSON.stringify(ri));
// Snooze todos os alertas recorrentes por 1 dia ao dispensar
var _snId=nList[i].id;if(_snId.startsWith('bo')||_snId.startsWith('bw')||_snId==='sh'||_snId==='saldo_neg'||_snId==='saldo_warn'||_snId.startsWith('orc_')){try{var _snStore=JSON.parse(localStorage.getItem('sib_notif_snooze')||'{}');_snStore[_snId]=new Date().toISOString().split('T')[0];localStorage.setItem('sib_notif_snooze',JSON.stringify(_snStore));}catch(z){}}
rndN();uNB()}
}
function mAllRead(){
var ri=JSON.parse(localStorage.getItem('vrt_nr')||'{}');
nList.forEach(function(n){n.rd=true;ri[n.id]=true});
localStorage.setItem('vrt_nr',JSON.stringify(ri));rndN();uNB();toast(typeof t==='function'?t('toast_todas_lidas'):'Todas marcadas como lidas','ok');
}
function clrN(){nList=[];rndN();uNB();toast(typeof t==='function'?t('toast_notificacoes_limpas'):'Notificações limpas','ok')}

document.addEventListener('click',function(e){
var btn=e.target.closest('.btn-r');if(!btn)return;
var rp=document.createElement('span');rp.className='ripple-fx';
var rc=btn.getBoundingClientRect();
rp.style.left=(e.clientX-rc.left)+'px';rp.style.top=(e.clientY-rc.top)+'px';
rp.style.width=rp.style.height=Math.max(rc.width,rc.height)+'px';
btn.appendChild(rp);setTimeout(function(){rp.remove()},600);
});

/* ── next block ── */

function goRelTab(idx,el){
var tabs=document.querySelectorAll('.rel-tab');
var secs=document.querySelectorAll('.rel-sec');
for(var i=0;i<tabs.length;i++){tabs[i].classList.remove('on');secs[i].classList.remove('on');secs[i].style.animation='none'}
tabs[idx].classList.add('on');
secs[idx].offsetHeight;
secs[idx].style.animation='slideUp2 .4s both';
secs[idx].classList.add('on');
if(idx===1)renderPatrimônio();
if(idx===2)renderCatAnalysis();
if(idx===3){popCompSels();renderComp()}
if(idx===4)renderCardReport();
if(idx===5)renderGoalReport();
}

function renderPatrimônio(){
try{
var m=getMD();var mk=Object.keys(m).sort();
if(mk.length===0)return;
var ns=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var ml=mk.map(function(k){var p=k.split('-');return ns[+p[1]-1]+'/'+p[0].slice(2)});
var ac=0;
var saldos=mk.map(function(k){ac+=m[k].r-m[k].d;return Math.round(ac*100)/100});
var invTotal=investments.reduce(function(s,i){return s+i.atual},0);
var patri=saldos.map(function(s){return Math.round((s+invTotal)*100)/100});
var poupança=mk.map(function(k){return m[k].r>0?Math.round((m[k].r-m[k].d)/m[k].r*100):0});

var gc='rgba(148,163,184,0.06)';
try{if(charts.cPatri)charts.cPatri.destroy()}catch(e){}
try{if(charts.cPatriComp)charts.cPatriComp.destroy()}catch(e){}
try{if(charts.cPoup)charts.cPoup.destroy()}catch(e){}

charts.cPatri=new Chart(document.getElementById('cPatri'),{type:'line',data:{labels:ml,datasets:[
{label:'Patrimônio Total',data:patri,borderColor:'#A855F7',backgroundColor:'rgba(168,85,247,.1)',fill:true,tension:.4,borderWidth:3,pointRadius:5},
{label:'Saldo Acumulado',data:saldos,borderColor:'#4F8CFF',tension:.4,borderWidth:2,borderDash:[6,3],pointRadius:4}
]},options:{responsive:true,scales:{y:{grid:{color:gc}},x:{grid:{color:gc}}}}});

var lastSaldo=saldos.length>0?saldos[saldos.length-1]:0;
charts.cPatriComp=new Chart(document.getElementById('cPatriComp'),{type:'doughnut',data:{labels:['Saldo em Conta','Investimentos'],datasets:[{data:[Math.max(0,lastSaldo),invTotal],backgroundColor:['#4F8CFF','#A855F7'],borderWidth:0}]},options:{responsive:true,cutout:'65%'}});

charts.cPoup=new Chart(document.getElementById('cPoup'),{type:'bar',data:{labels:ml,datasets:[{label:'Taxa Poupança %',data:poupança,backgroundColor:poupança.map(function(v){return v>=20?'rgba(34,197,94,.6)':v>=10?'rgba(234,179,8,.6)':'rgba(239,68,68,.6)'}),borderRadius:6}]},options:{responsive:true,scales:{y:{max:100,grid:{color:gc}},x:{grid:{color:gc}}}}});
}catch(e){console.log('patri err:',e)}
}

function renderCatAnalysis(){
try{
var now=new Date();var cm=now.getMonth();var cy=now.getFullYear();
var mesE=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy&&e.type==='despesa'});
var catT={};var total=0;
mesE.forEach(function(e){catT[e.category]=(catT[e.category]||0)+e.value;total+=e.value});
var sorted=Object.keys(catT).sort(function(a,b){return catT[b]-catT[a]});
var colors=['#4F8CFF','#7C5CFC','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899','#F43F5E','#14B8A6'];

var h='';
sorted.forEach(function(cat,i){
var pct=total>0?Math.round(catT[cat]/total*100):0;
var clr=colors[i%colors.length];
h+='<div class="rank-item"><span style="font-size:1.2em;width:28px;text-align:center">'+(i+1)+'.</span>';
h+='<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600;font-size:.85em">'+cat+'</span><span style="font-size:.85em;font-weight:700">R$ '+catT[cat].toFixed(2)+' ('+pct+'%)</span></div>';
h+='<div class="rank-bar"><div class="rank-fill" style="width:'+pct+'%;background:'+clr+'"></div></div></div></div>';
});
if(sorted.length===0)h='<div style="text-align:center;padding:30px;color:var(--t2)">Sem despesas este mês</div>';
document.getElementById('catRanking').innerHTML=h;

try{if(charts.cCatPie)charts.cCatPie.destroy()}catch(e){}
charts.cCatPie=new Chart(document.getElementById('cCatPie'),{type:'doughnut',data:{labels:sorted.slice(0,8),datasets:[{data:sorted.slice(0,8).map(function(c){return catT[c]}),backgroundColor:colors.slice(0,8),borderWidth:0}]},options:{responsive:true,cutout:'55%'}});

var m=getMD();var mk=Object.keys(m).sort().slice(-6);
var ns=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var top5=sorted.slice(0,5);
var datasets=top5.map(function(cat,idx){
var data=mk.map(function(k){
var kEntries=entries.filter(function(e){return e.date.startsWith(k)&&e.type==='despesa'&&e.category===cat});
return kEntries.reduce(function(s,e){return s+e.value},0);
});
return{label:cat,data:data,borderColor:colors[idx],tension:.4,borderWidth:2,pointRadius:4};
});
var mlabels=mk.map(function(k){var p=k.split('-');return ns[+p[1]-1]+'/'+p[0].slice(2)});
try{if(charts.cCatEvo)charts.cCatEvo.destroy()}catch(e){}
charts.cCatEvo=new Chart(document.getElementById('cCatEvo'),{type:'line',data:{labels:mlabels,datasets:datasets},options:{responsive:true}});
}catch(e){console.log('cat analysis err:',e)}
}

function popCompSels(){
var m=getMD();var mk=Object.keys(m).sort();
var ns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var opts=mk.map(function(k){var p=k.split('-');return '<option value="'+k+'">'+ns[+p[1]-1]+'/'+p[0]+'</option>'}).join('');
var s1=document.getElementById('compMes1');
var s2=document.getElementById('compMes2');
if(s1&&s2){
s1.innerHTML=opts;s2.innerHTML=opts;
if(mk.length>=2){s1.value=mk[mk.length-2];s2.value=mk[mk.length-1]}
}
}

function renderComp(){
try{
var k1=document.getElementById('compMes1').value;
var k2=document.getElementById('compMes2').value;
if(!k1||!k2)return;
var m=getMD();
var d1=m[k1]||{r:0,d:0};var d2=m[k2]||{r:0,d:0};
var ns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var n1=k1.split('-');var n2=k2.split('-');
var l1=ns[+n1[1]-1]+'/'+n1[0];var l2=ns[+n2[1]-1]+'/'+n2[0];

function diffHTML(v1,v2){
if(v2===v1)return '<span class="comp-eq">= Igual</span>';
var pct=v1>0?Math.round((v2-v1)/v1*100):0;
return v2>v1?'<span class="comp-up">&#9650; +'+pct+'%</span>':'<span class="comp-down">&#9660; '+pct+'%</span>';
}

var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">';
h+='<div class="comp-card"><div class="comp-lbl">Receita '+l1+'</div><div class="comp-val" style="color:#22C55E">'+fmt(d1.r)+'</div></div>';
h+='<div class="comp-card"><div class="comp-lbl">Receita '+l2+'</div><div class="comp-val" style="color:#22C55E">'+fmt(d2.r)+'</div><div class="comp-diff">'+diffHTML(d1.r,d2.r)+'</div></div>';
h+='<div class="comp-card"><div class="comp-lbl">Despesa '+l1+'</div><div class="comp-val" style="color:#EF4444">'+fmt(d1.d)+'</div></div>';
h+='<div class="comp-card"><div class="comp-lbl">Despesa '+l2+'</div><div class="comp-val" style="color:#EF4444">'+fmt(d2.d)+'</div><div class="comp-diff">'+diffHTML(d1.d,d2.d)+'</div></div>';
h+='<div class="comp-card"><div class="comp-lbl">Saldo '+l1+'</div><div class="comp-val" style="color:#4F8CFF">'+fmt(d1.r-d1.d)+'</div></div>';
h+='<div class="comp-card"><div class="comp-lbl">Saldo '+l2+'</div><div class="comp-val" style="color:#4F8CFF">'+fmt(d2.r-d2.d)+'</div><div class="comp-diff">'+diffHTML(d1.r-d1.d,d2.r-d2.d)+'</div></div>';
h+='</div>';
document.getElementById('compResult').innerHTML=h;

try{if(charts.cComp)charts.cComp.destroy()}catch(e){}
charts.cComp=new Chart(document.getElementById('cComp'),{type:'bar',data:{labels:['Receitas','Despesas','Saldo'],datasets:[
{label:l1,data:[d1.r,d1.d,d1.r-d1.d],backgroundColor:['rgba(34,197,94,.5)','rgba(239,68,68,.5)','rgba(79,140,255,.5)'],borderRadius:6},
{label:l2,data:[d2.r,d2.d,d2.r-d2.d],backgroundColor:['rgba(34,197,94,.9)','rgba(239,68,68,.9)','rgba(79,140,255,.9)'],borderRadius:6}
]},options:{responsive:true}});
}catch(e){console.log('comp err:',e)}
}

function renderCardReport(){
try{
if(typeof cards==='undefined'||cards.length===0){
document.getElementById('cardReport').innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)"><div style="font-size:3em;margin-bottom:12px">&#128179;</div><div style="font-weight:600">Nenhum cartão cadastrado</div><div style="font-size:.85em;margin-top:6px">Cadastre seus cartões na aba Cartões para ver o relatório</div></div>';
return;
}
var h='';
cards.forEach(function(c){
var totalGasto=c.purchases?c.purchases.reduce(function(s,p){return s+p.value},0):0;
var limDisp=c.limit-totalGasto;
var pctUso=c.limit>0?Math.round(totalGasto/c.limit*100):0;
var clr=pctUso>=90?'#EF4444':pctUso>=70?'#EAB308':'#22C55E';

h+='<div style="padding:16px;border:1px solid var(--brd);border-radius:12px;margin-bottom:12px;background:var(--card)">';
h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="margin:0">&#128179; '+c.name+'</h4><span style="font-size:.75em;padding:4px 10px;border-radius:6px;background:'+clr+';color:#fff">'+pctUso+'% usado</span></div>';
h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">';
h+='<div style="text-align:center"><div style="font-size:.72em;color:var(--t2)">Limite</div><div style="font-weight:700">R$ '+c.limit.toFixed(2)+'</div></div>';
h+='<div style="text-align:center"><div style="font-size:.72em;color:var(--t2)">Gasto Total</div><div style="font-weight:700;color:#EF4444">R$ '+totalGasto.toFixed(2)+'</div></div>';
h+='<div style="text-align:center"><div style="font-size:.72em;color:var(--t2)">Disponível</div><div style="font-weight:700;color:#22C55E">R$ '+limDisp.toFixed(2)+'</div></div>';
h+='</div>';
h+='<div class="rank-bar" style="height:10px"><div class="rank-fill" style="width:'+Math.min(pctUso,100)+'%;background:'+clr+'"></div></div>';
h+='</div>';
});
document.getElementById('cardReport').innerHTML=h;
}catch(e){console.log('card report err:',e)}
}

function renderGoalReport(){
try{
if(goals.length===0){
document.getElementById('goalReport').innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)"><div style="font-size:3em;margin-bottom:12px">&#127919;</div><div style="font-weight:600">Nenhuma meta cadastrada</div></div>';
return;
}
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">';
goals.forEach(function(g){
var target=parseFloat(g.target)||parseFloat(g.alvo)||0;
var current=parseFloat(g.current)||parseFloat(g.atual)||0;
var name=g.name||g.nome||'Meta';
var pct=target>0?Math.round(current/target*100):0;
var clr=pct>=100?'#22C55E':pct>=70?'#4F8CFF':pct>=40?'#EAB308':'#EF4444';
var ico=pct>=100?'&#127942;':pct>=70?'&#128170;':pct>=40?'&#128200;':'&#127919;';
h+='<div class="goal-rep-item">';
h+='<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700">'+ico+' '+name+'</span><span style="font-size:.85em;font-weight:700;color:'+clr+'">'+pct+'%</span></div>';
h+='<div class="goal-rep-bar"><div class="goal-rep-fill" style="width:'+Math.min(pct,100)+'%;background:'+clr+'"></div></div>';
h+='<div style="display:flex;justify-content:space-between;font-size:.78em;color:var(--t2)"><span>R$ '+current.toFixed(2)+'</span><span>R$ '+target.toFixed(2)+'</span></div>';
var deadline=g.deadline||(g.prazo?new Date(g.prazo+'T12:00:00').toLocaleDateString('pt-BR'):'');
if(deadline){h+='<div style="font-size:.72em;color:var(--t3);margin-top:4px">&#128197; Prazo: '+deadline+'</div>'}
h+='</div>';
});
h+='</div>';
document.getElementById('goalReport').innerHTML=h;
}catch(e){console.log('goal report err:',e)}
}

function shareReport(){
try{
var now=new Date();var cm=now.getMonth();var cy=now.getFullYear();
var ns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var mesE=entries.filter(function(e){var d=new Date(e.date+'T12:00:00');return d.getMonth()===cm&&d.getFullYear()===cy});
var rec=0;var desp=0;
mesE.forEach(function(e){if(e.type==='receita')rec+=e.value;else desp+=e.value});
var saldo=rec-desp;
var tx=rec>0?Math.round((rec-desp)/rec*100):0;

var txt='=== SIBANKI - RELATÓRIO ===\n';
txt+=ns[cm]+'/'+cy+'\n\n';
txt+='Receitas: R$ '+rec.toFixed(2)+'\n';
txt+='Despesas: R$ '+desp.toFixed(2)+'\n';
txt+='Saldo: R$ '+saldo.toFixed(2)+'\n';
txt+='Taxa de Poupança: '+tx+'%\n';
txt+='\n=================================';

if(navigator.clipboard){
navigator.clipboard.writeText(txt);
toast(typeof t==='function'?t('toast_relatorio_copiado'):'Relatório copiado!','ok');
}else{
var ta=document.createElement('textarea');
ta.value=txt;document.body.appendChild(ta);ta.select();
document.execCommand('copy');document.body.removeChild(ta);
toast(typeof t==='function'?t('toast_relatorio_copiado'):'Relatório copiado!','ok');
}
}catch(e){toast(typeof t==='function'?t('toast_erro_compartilhar'):'Erro ao compartilhar','err')}
}

function exportPDF(){
if(typeof gerarPDF==='function'){gerarPDF();return;}
toast(typeof t==='function'?t('toast_gerando_pdf'):'Gerando PDF... Use Ctrl+P para salvar como PDF','ok');
setTimeout(function(){window.print()},500);
}

/* ── next block ── */

// FILTRO POR MES - popular os meses disponíveis
function popFilMes(){
try{
var sel=document.getElementById('filMes');
if(!sel)return;
var meses={};
entries.forEach(function(e){
var k=e.date.substring(0,7);
meses[k]=true;
});
var mk=Object.keys(meses).sort().reverse();
var ns=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var h='<option value="all">Todos os meses</option>';
mk.forEach(function(k){
var p=k.split('-');
h+='<option value="'+k+'">'+ns[+p[1]-1]+'/'+p[0]+'</option>';
});
sel.innerHTML=h;
}catch(e){console.log('popFilMes err:',e)}
}

function clearFilters(){
var fm=document.getElementById('filMes');
var fb=document.getElementById('filBusca');
var ft=document.getElementById('filTipo');
if(fm)fm.value='all';
if(fb)fb.value='';
if(ft)ft.value='all';
setLancPeriodo('todos');
}

var _lancPeriodo='hoje'; // padrão: hoje
function setLancPeriodo(p){
_lancPeriodo=p;
['hoje','mes','todos'].forEach(function(k){
var btn=document.getElementById('filPeriodo'+k.charAt(0).toUpperCase()+k.slice(1));
if(!btn)return;
if(k===p){btn.style.background='var(--pri)';btn.style.color='#fff';btn.style.fontWeight='600';}
else{btn.style.background='transparent';btn.style.color='var(--t2)';btn.style.fontWeight='400';}
});
renderAll();
}

var _searchDebounceTimer=null;
function debouncedRenderForSearch(){
if(_searchDebounceTimer)clearTimeout(_searchDebounceTimer);
_searchDebounceTimer=setTimeout(function(){_searchDebounceTimer=null;renderAll();},300);
}

function getFilteredEntries(){
var list=entries.slice();
try{
var fm=document.getElementById('filMes'),fm2=document.getElementById('filM');
var fb=document.getElementById('filBusca'),fs=document.getElementById('filS');
var ft=document.getElementById('filTipo'),ft2=document.getElementById('filT');
var fa=document.getElementById('filA'),fde=document.getElementById('filDe'),fate=document.getElementById('filAte');
var fcat=document.getElementById('filCat'),fmin=document.getElementById('filMin'),fmax=document.getElementById('filMax');
// Filtro de período (toggle Hoje / Mês / Todos)
var _todayStr=new Date().toISOString().split('T')[0];
var _mesStr=new Date().toISOString().substring(0,7);
if(typeof _lancPeriodo==='undefined')window._lancPeriodo='hoje';
if(_lancPeriodo==='hoje')list=list.filter(function(e){return e.date===_todayStr});
else if(_lancPeriodo==='mes')list=list.filter(function(e){return e.date&&e.date.startsWith(_mesStr)});
if(fm&&fm.value!=='all')list=list.filter(function(e){return e.date&&e.date.startsWith(fm.value)});
if(fm2&&fm2.value!=='all')list=list.filter(function(e){return e.date&&new Date(e.date+'T12:00:00').getMonth()+1===+fm2.value});
if(ft&&ft.value!=='all')list=list.filter(function(e){return e.type===ft.value});
if(ft2&&ft2.value!=='all')list=list.filter(function(e){return e.type===ft2.value});
var q=(fb&&fb.value.trim()?fb.value.trim():fs&&fs.value.trim()?fs.value.trim():'').toLowerCase();
if(q)list=list.filter(function(e){return(e.desc||'').toLowerCase().indexOf(q)>=0||(e.category||'').toLowerCase().indexOf(q)>=0||(e.tags||'').toLowerCase().indexOf(q)>=0});
if(fa&&fa.value!=='all')list=list.filter(function(e){return e.account===fa.value});
if(fde&&fde.value)list=list.filter(function(e){return e.date>=fde.value});
if(fate&&fate.value)list=list.filter(function(e){return e.date<=fate.value});
if(fcat&&fcat.value!=='all')list=list.filter(function(e){return e.category===fcat.value});
var vmin=fmin?parseFloat(fmin.value):NaN,vmax=fmax?parseFloat(fmax.value):NaN;
if(!isNaN(vmin))list=list.filter(function(e){return e.value>=vmin});
if(!isNaN(vmax))list=list.filter(function(e){return e.value<=vmax});
}catch(e){}
return list;
}

// TRANSFERÊNCIA ENTRE CONTAS
function addTransfer(){
var from=document.getElementById('wTfFrom').value;
var to=document.getElementById('wTfTo').value;
var val=parseFloat(document.getElementById('wTfVal').value);
if(!from||!to){toast(typeof t==='function'?t('toast_selecione_contas'):'Selecione as contas','err');return}
if(from===to){toast(typeof t==='function'?t('toast_contas_diferentes'):'Selecione contas diferentes','err');return}
if(!val||val<=0){toast(typeof t==='function'?t('toast_digite_valor'):'Digite um valor','err');return}

var now=new Date().toISOString().split('T')[0];
var tfId=Date.now();

entries.push({
id:tfId,
type:'despesa',
desc:'Transferencia para '+to,
value:val,
category:'Transferencia',
date:now,
tags:['transferencia'],
account:from,
isTransfer:true
});
entries.push({
id:tfId+1,
type:'receita',
desc:'Transferencia de '+from,
value:val,
category:'Transferencia',
date:now,
tags:['transferencia'],
account:to,
isTransfer:true
});

saveData();renderAll();
toast('Transferencia de R$ '+val.toFixed(2)+' realizada!','ok');
document.getElementById('wTfVal').value='';
closeWltPanel('wltTransferPanel');
}

/* popTfSels merged into first definition */

// EDITAR CARTÃO
function editCard(id){openCardModal(id)}

/* ── next block ── */

// Keyboard shortcuts
document.addEventListener('keydown',function(e){
if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
if(e.key==='1'&&e.altKey){e.preventDefault();go('dash',null)}
if(e.key==='2'&&e.altKey){e.preventDefault();go('lanc',null)}
if(e.key==='3'&&e.altKey){e.preventDefault();go('invest',null)}
if(e.key==='4'&&e.altKey){e.preventDefault();go('cartões',null)}
if(e.key==='n'&&e.altKey){e.preventDefault();go('lanc',null);setTimeout(function(){var fn=document.getElementById('fDe');if(fn)fn.focus()},300)}
if(e.key==='?'){
if(typeof startSibankiTour==='function'){localStorage.removeItem('vrt_onb');window._tourCompleto=false;startSibankiTour();}
}
});

/* ── next block ── */

// ============================================
// B3 MODULE - DADOS REAIS VIA CLOUD FUNCTIONS
// ============================================

var b3Cache={};
var watchlist=[];
var brapiProxy=null;
var brapiRaioXFn=null;
var brapiMultiFn=null;

// Inicializar Cloud Functions
function initBrapiFunctions(){
if(typeof firebase!=='undefined'&&firebase.functions){
var fns=firebase.functions();
brapiProxy=fns.httpsCallable('brapiQuote');
brapiRaioXFn=fns.httpsCallable('brapiQuote');
brapiMultiFn=fns.httpsCallable('brapiMulti');
}
}


// ============================================
// STRIPE - SISTEMA DE PLANOS
// ============================================
var STRIPE_PK='pk_test_51T5EvgHy6wEjpvXYBARcvONa4ApigP7UqR7TQ11F06Fs8ZrehVbxzbmghWFbiwVgTHXRia4naB9sSJFVTauc6IwT00qKHFcR4s';
var STRIPE_PRICES={
proMonthly:'price_1T5Fp1Hy6wEjpvXYYPVNuBXT',
proAnnual:'price_1T5FqIHy6wEjpvXYjp0CNt9p',
familyMonthly:'price_1T5FreHy6wEjpvXYxDii3kQ9',
familyAnnual:'price_1T5FsWHy6wEjpvXY6y3uvbDA'
};

var PLAN_LIMITS={
free:{entries:50,cards:1,accounts:2,goals:2,iaQueries:5,investments:false,pdf:false,family:false},
pro:{entries:999999,cards:999999,accounts:999999,goals:999999,iaQueries:999999,investments:true,pdf:true,family:false},
familia:{entries:999999,cards:999999,accounts:999999,goals:999999,iaQueries:999999,investments:true,pdf:true,family:true}
};

var userPlan='free';
var userPlanData={};
var stripeInstance=null;
var checkoutFn=null;
var portalFn=null;
var getPlanFn=null;
var stripeScriptLoaded=false;
var stripeScriptPromise=null;

function initStripeFunctions(){
if(typeof firebase!=='undefined'&&firebase.functions){
var fns=firebase.functions();
checkoutFn=fns.httpsCallable('createCheckout');
portalFn=fns.httpsCallable('createPortal');
getPlanFn=fns.httpsCallable('getUserPlan');
}
}

function loadStripeScript(){
if(stripeInstance)return Promise.resolve();
if(stripeScriptPromise)return stripeScriptPromise;
stripeScriptPromise=new Promise(function(resolve,reject){
var s=document.querySelector('script[src*="js.stripe.com"]');
if(s){s.addEventListener('load',function(){try{if(typeof STRIPE_PK!=='undefined'&&STRIPE_PK&&typeof Stripe!=='undefined'){stripeInstance=Stripe(STRIPE_PK);stripeScriptLoaded=true;}resolve();}catch(e){reject(e);}});s.addEventListener('error',function(){reject(new Error('Stripe script failed to load'));});return;}
s=document.createElement('script');
s.src='https://js.stripe.com/v3/';
s.async=true;
s.onload=function(){try{if(typeof STRIPE_PK!=='undefined'&&STRIPE_PK&&typeof Stripe!=='undefined'){stripeInstance=Stripe(STRIPE_PK);stripeScriptLoaded=true;}resolve();}catch(e){reject(e);}};
s.onerror=function(){reject(new Error('Stripe script failed to load'));};
document.head.appendChild(s);
});
return stripeScriptPromise;
}

async function loadUserPlan(){
if(!getPlanFn||!U)return;
try{
var result=await getPlanFn();
userPlanData=result.data||{};
userPlan=userPlanData.plan||'free';
console.log('User plan:',userPlan);
// Após carregar o plano real, verifica se veio da landing com trial
checkTrialPlanFromURL();
updatePlanUI();
}catch(e){
console.error('Load plan error:',e);
userPlan='free';
updatePlanUI();
}
}

// ── TRIAL 30 DIAS — aplicado quando o usuário vem da landing com ?plan=X&trial=30 ──
function checkTrialPlanFromURL(){
if(!U||!U.uid)return;
var params=new URLSearchParams(window.location.search);
var planParam=params.get('plan');
var trialParam=params.get('trial');
// Também checa localStorage (set pelos botões de detalhe dos cards)
if(!planParam){try{planParam=localStorage.getItem('sib_selected_plan');}catch(z){}}
if(!planParam||planParam==='free')return;
if(planParam!=='pro'&&planParam!=='familia')return;
// Só aplica se o usuário AINDA está no free (não sobrescreve plano pago existente)
if(userPlan&&userPlan!=='free')return;
// Calcula data de expiração do trial
var dias=parseInt(trialParam)||30;
var trialEnd=new Date();
trialEnd.setDate(trialEnd.getDate()+dias);
var trialEndISO=trialEnd.toISOString();
// Salva no Firestore
db.collection('users').doc(U.uid).set({
  plan: planParam,
  trialPlan: planParam,
  trialEnd: trialEndISO,
  trialStarted: new Date().toISOString(),
  planSource: 'landing_trial'
},{merge:true}).then(function(){
  userPlan=planParam;
  userPlanData=userPlanData||{};
  userPlanData.plan=planParam;
  userPlanData.trialEnd=trialEndISO;
  updatePlanUI();
  if(typeof updateDrawerUser==='function')updateDrawerUser();
  var diasRestantes=dias;
  toast('🎉 Plano '+( planParam==='pro'?'Pro':'Família')+' ativado! '+diasRestantes+' dias gratuitos.','ok');
  // Limpa os parâmetros da URL
  try{
    var url=window.location.pathname;
    history.replaceState({},'',url);
    localStorage.removeItem('sib_selected_plan');
  }catch(z){}
}).catch(function(e){
  console.error('Trial plan error:',e);
});
}

function updatePlanUI(){
var badge=document.getElementById('planBadge');
if(badge){
if(userPlan==='pro'){
badge.innerHTML='⭐ Pro';
badge.style.background='linear-gradient(135deg,#4F8CFF,#7C5CFC)';
badge.style.display='inline-flex';
}else if(userPlan==='familia'){
badge.innerHTML='👨‍👩‍👧‍👦 Família';
badge.style.background='linear-gradient(135deg,#22C55E,#16A34A)';
badge.style.display='inline-flex';
}else{
badge.innerHTML='Grátis';
badge.style.background='rgba(255,255,255,.08)';
badge.style.display='inline-flex';
}
}
var topPlanTag=document.getElementById('topPlanTag');
if(topPlanTag){
if(userPlan==='pro'||userPlan==='familia'){topPlanTag.textContent=userPlan==='pro'?'PRO':'Família';topPlanTag.style.display='inline';}
else{topPlanTag.style.display='none';}
}
// Update plan section in config
var planSection=document.getElementById('planSection');
if(planSection)renderPlanSection();
if(typeof updateDrawerUser==='function')updateDrawerUser();
}

function getPlanLimit(feature){
var limits=PLAN_LIMITS[userPlan]||PLAN_LIMITS.free;
return limits[feature];
}

function checkPlanLimit(feature,currentCount){
var limit=getPlanLimit(feature);
if(typeof limit==='boolean')return limit;
return currentCount<limit;
}

function showUpgradeModal(feature){
var featureNames={
entries:'lançamentos',
cards:'cartões de crédito',
accounts:'contas bancárias',
goals:'metas financeiras',
iaQueries:'consultas à IA',
investments:'investimentos',
pdf:'relatórios PDF',
family:'módulo família'
};
var name=featureNames[feature]||feature;
var modal=document.createElement('div');
modal.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px)';
modal.innerHTML='<div style="background:var(--c1);border:1px solid var(--brd);border-radius:20px;padding:40px;max-width:480px;width:90%;text-align:center">'+
'<div style="font-size:3em;margin-bottom:16px">🔒</div>'+
'<h2 style="font-size:1.4em;margin-bottom:8px">Limite do plano grátis</h2>'+
'<p style="color:var(--t2);margin-bottom:24px;line-height:1.7">Você atingiu o limite de <b>'+name+'</b> do plano grátis. Faça upgrade para o <b>Pro</b> e desbloqueie tudo!</p>'+
'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">'+
'<button onclick="this.closest(\'div[style*=fixed]\').remove();showPlansModal()" class="btn btn-r" style="padding:12px 28px;font-size:.95em">⭐ Ver planos</button>'+
'<button onclick="this.closest(\'div[style*=fixed]\').remove()" class="btn btn-r" style="padding:12px 28px;font-size:.95em;background:rgba(255,255,255,.08)">Fechar</button>'+
'</div></div>';
document.body.appendChild(modal);
modal.addEventListener('click',function(e){if(e.target===modal)modal.remove()});
}

function showPlansModal(){
var modal=document.createElement('div');
modal.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);overflow-y:auto;padding:20px';
modal.innerHTML='<div style="background:var(--c1);border:1px solid var(--brd);border-radius:20px;padding:32px;max-width:720px;width:95%">'+
'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">'+
'<h2 style="font-size:1.3em">Escolha seu plano</h2>'+
'<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;color:var(--t2);font-size:1.5em;cursor:pointer">✕</button>'+
'</div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
// PRO
'<div style="background:var(--c2);border:2px solid var(--pri);border-radius:16px;padding:24px;position:relative">'+
'<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#4F8CFF,#7C5CFC);color:#fff;padding:3px 14px;border-radius:20px;font-size:.75em;font-weight:700">MAIS POPULAR</div>'+
'<div style="text-align:center;margin-bottom:16px">'+
'<div style="font-size:2em;display:flex;justify-content:center"><i data-lucide="star" style="width:40px;height:40px;stroke:currentColor;stroke-width:2"></i></div>'+
'<h3 style="font-size:1.1em;margin:8px 0 4px">Pro</h3>'+
'<div style="font-size:2em;font-weight:900">R$ 19<sup style=\"font-size:.4em\">,90</sup><small style=\"font-size:.35em;color:var(--t3)\">/mês</small></div>'+
'<div style="font-size:.78em;color:var(--pri);margin-top:4px">ou R$ 14,90/mês no anual</div>'+
'</div>'+
'<ul style="list-style:none;font-size:.85em;color:var(--t2);margin-bottom:20px">'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Lançamentos ilimitados</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Cartões ilimitados</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Contas ilimitadas</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> IA ilimitada</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Investimentos B3</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Relatórios PDF</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> 30 dias grátis</li>'+
'</ul>'+
'<button onclick="startCheckout(\'pro\',\'monthly\')" class="btn btn-r" style="width:100%;padding:12px;font-size:.9em;justify-content:center">Assinar Pro Mensal</button>'+
'<button onclick="startCheckout(\'pro\',\'annual\')" class="btn btn-r" style="width:100%;padding:10px;font-size:.82em;justify-content:center;background:rgba(79,140,255,.1);margin-top:8px;border:1px solid rgba(79,140,255,.2)"><i data-lucide="lightbulb" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Anual (economia de 25%)</button>'+
'</div>'+
// FAMÍLIA
'<div style="background:var(--c2);border:1px solid var(--brd);border-radius:16px;padding:24px">'+
'<div style="text-align:center;margin-bottom:16px">'+
'<div style="font-size:2em;display:flex;justify-content:center"><i data-lucide="users" style="width:40px;height:40px;stroke:currentColor;stroke-width:2"></i></div>'+
'<h3 style="font-size:1.1em;margin:8px 0 4px">Família</h3>'+
'<div style="font-size:2em;font-weight:900">R$ 29<sup style=\"font-size:.4em\">,90</sup><small style=\"font-size:.35em;color:var(--t3)\">/mês</small></div>'+
'<div style="font-size:.78em;color:var(--pri);margin-top:4px">ou R$ 22,90/mês no anual</div>'+
'</div>'+
'<ul style="list-style:none;font-size:.85em;color:var(--t2);margin-bottom:20px">'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Tudo do Pro</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Até 5 membros</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Finanças compartilhadas</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Orçamento familiar</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> Metas em conjunto</li>'+
'<li style="padding:4px 0;display:flex;align-items:center;gap:8px"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;flex-shrink:0"></i> 30 dias grátis</li>'+
'</ul>'+
'<button onclick="startCheckout(\'familia\',\'monthly\')" class="btn btn-r" style="width:100%;padding:12px;font-size:.9em;justify-content:center;background:var(--green)">Assinar Família Mensal</button>'+
'<button onclick="startCheckout(\'familia\',\'annual\')" class="btn btn-r" style="width:100%;padding:10px;font-size:.82em;justify-content:center;background:rgba(34,197,94,.1);margin-top:8px;border:1px solid rgba(34,197,94,.2)"><i data-lucide="lightbulb" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Anual (economia de 23%)</button>'+
'</div>'+
'</div>'+
'</div>';
document.body.appendChild(modal);
if(typeof lucide!=='undefined')lucide.createIcons();
modal.addEventListener('click',function(e){if(e.target===modal)modal.remove()});
}

async function startCheckout(plan,billing){
if(!checkoutFn){toast(typeof t==='function'?t('toast_max_tentativas_checkout'):'Erro ao iniciar checkout','err');return}
try{await loadStripeScript();}catch(e){toast(typeof t==='function'?t('toast_pagamentos_indisponiveis'):'Pagamentos temporariamente indisponíveis. Tente novamente.','err');return;}
if(!stripeInstance){toast(typeof t==='function'?t('toast_max_tentativas_checkout'):'Erro ao iniciar checkout','err');return}
var priceId='';
if(plan==='pro'&&billing==='monthly')priceId=STRIPE_PRICES.proMonthly;
if(plan==='pro'&&billing==='annual')priceId=STRIPE_PRICES.proAnnual;
if(plan==='familia'&&billing==='monthly')priceId=STRIPE_PRICES.familyMonthly;
if(plan==='familia'&&billing==='annual')priceId=STRIPE_PRICES.familyAnnual;
if(!priceId){toast(typeof t==='function'?t('toast_preco_nao_encontrado'):'Preço não encontrado','err');return}
toast(typeof t==='function'?t('toast_redirecionando_pagamento'):'Redirecionando para pagamento...','info');
try{
var result=await checkoutFn({priceId:priceId,plan:plan,billing:billing});
if(result.data&&result.data.url){
window.location.href=result.data.url;
}else if(result.data&&result.data.sessionId){
await stripeInstance.redirectToCheckout({sessionId:result.data.sessionId});
}
}catch(e){
console.error('Checkout error:',e);
toast('Erro no checkout: '+e.message,'err');
}
}

async function openCustomerPortal(){
if(!portalFn){toast(typeof t==='function'?t('toast_erro_portal'):'Erro ao abrir portal','err');return}
toast(typeof t==='function'?t('toast_abrindo_portal'):'Abrindo portal de assinatura...','info');
try{
var result=await portalFn();
if(result.data&&result.data.url){
window.location.href=result.data.url;
}
}catch(e){
console.error('Portal error:',e);
toast('Erro: '+e.message,'err');
}
}

function renderPlanSection(){
var el=document.getElementById('planSection');
if(!el)return;
var isTrialing=userPlanData.status==='trialing';
var trialEnd=userPlanData.trialEnd?new Date(userPlanData.trialEnd).toLocaleDateString('pt-BR'):'';
var periodEnd=userPlanData.currentPeriodEnd?new Date(userPlanData.currentPeriodEnd).toLocaleDateString('pt-BR'):'';
var canceling=userPlanData.cancelAtPeriodEnd;

if(userPlan==='free'){
el.innerHTML='<div style="text-align:center;padding:20px">'+
'<div style="font-size:2.5em;margin-bottom:12px;display:flex;justify-content:center"><i data-lucide="gift" style="width:48px;height:48px;stroke:currentColor;stroke-width:2"></i></div>'+
'<h3 style="margin-bottom:4px">Plano Grátis</h3>'+
'<p style="color:var(--t2);font-size:.88em;margin-bottom:20px">Você está no plano gratuito com recursos limitados</p>'+
'<div style="background:var(--c2);border:1px solid var(--brd);border-radius:12px;padding:16px;margin-bottom:20px;text-align:left">'+
'<div style="font-size:.85em;color:var(--t2);line-height:2">'+
'<div><i data-lucide="file-text" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Lançamentos: <b style="color:var(--t1)">'+entries.length+' / 50</b></div>'+
'<div><i data-lucide="credit-card" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Cartões: <b style="color:var(--t1)">'+(cards?cards.length:0)+' / 1</b></div>'+
'<div><i data-lucide="landmark" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Contas: <b style="color:var(--t1)">'+(userAccs?userAccs.length:0)+' / 2</b></div>'+
'<div><i data-lucide="target" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Metas: <b style="color:var(--t1)">'+(goals?goals.length:0)+' / 2</b></div>'+
'<div><i data-lucide="message-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> IA: <b style="color:var(--t1)">5 consultas/mês</b></div>'+
'<div><i data-lucide="bar-chart-2" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Investimentos: <b style="color:var(--red)"><i data-lucide="x" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Bloqueado</b></div>'+
'<div><i data-lucide="file-text" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> PDF: <b style="color:var(--red)"><i data-lucide="x" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Bloqueado</b></div>'+
'</div></div>'+
'<button onclick="showPlansModal()" class="btn btn-r" style="padding:14px 32px;font-size:1em"><i data-lucide="star" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Fazer Upgrade</button>'+
'</div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}else{
var planName=userPlan==='pro'?'Pro':'Família';
var statusText=isTrialing?'<span style="color:var(--orange);display:inline-flex;align-items:center;gap:6px"><i data-lucide="flask-conical" style="width:18px;height:18px;stroke:currentColor;stroke-width:2"></i> Trial gratuito até '+trialEnd+'</span>':
canceling?'<span style="color:var(--red);display:inline-flex;align-items:center;gap:6px"><i data-lucide="alert-triangle" style="width:18px;height:18px;stroke:currentColor;stroke-width:2"></i> Cancela em '+periodEnd+'</span>':
'<span style="color:var(--green);display:inline-flex;align-items:center;gap:6px"><i data-lucide="check" style="width:18px;height:18px;stroke:currentColor;stroke-width:2"></i> Ativo até '+periodEnd+'</span>';
var planIcon=userPlan==='pro'?'<i data-lucide="star" style="width:48px;height:48px;stroke:currentColor;stroke-width:2"></i>':'<i data-lucide="users" style="width:48px;height:48px;stroke:currentColor;stroke-width:2"></i>';
el.innerHTML='<div style="text-align:center;padding:20px">'+
'<div style="font-size:2.5em;margin-bottom:12px;display:flex;justify-content:center">'+planIcon+'</div>'+
'<h3 style="margin-bottom:4px">Plano '+planName+'</h3>'+
'<div style="margin:8px 0 20px">'+statusText+'</div>'+
'<div style="background:var(--c2);border:1px solid var(--brd);border-radius:12px;padding:16px;margin-bottom:20px;text-align:left">'+
'<div style="font-size:.85em;color:var(--t2);line-height:2">'+
'<div><i data-lucide="file-text" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Lançamentos: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Ilimitados</b></div>'+
'<div><i data-lucide="credit-card" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Cartões: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Ilimitados</b></div>'+
'<div><i data-lucide="landmark" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Contas: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Ilimitadas</b></div>'+
'<div><i data-lucide="target" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Metas: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Ilimitadas</b></div>'+
'<div><i data-lucide="message-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> IA: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Ilimitada</b></div>'+
'<div><i data-lucide="bar-chart-2" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Investimentos: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Desbloqueado</b></div>'+
'<div><i data-lucide="file-text" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> PDF: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Desbloqueado</b></div>'+
(userPlan==='familia'?'<div><i data-lucide="users" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle;display:inline-block"></i> Família: <b style="color:var(--green)"><i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;display:inline-block"></i> Até 5 membros</b></div>':'')+
'</div></div>'+
'<button onclick="openCustomerPortal()" class="btn btn-r" style="padding:12px 28px;font-size:.9em"><i data-lucide="settings" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Gerenciar Assinatura</button>'+
'</div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}

// Check checkout result from URL
function checkCheckoutResult(){
var params=new URLSearchParams(window.location.search);
if(params.get('checkout')==='success'){
toast(typeof t==='function'?t('toast_assinatura_ativada'):'Assinatura ativada com sucesso!','ok');
window.history.replaceState({},'',window.location.pathname);
setTimeout(loadUserPlan,2000);
}else if(params.get('checkout')==='cancel'){
toast(typeof t==='function'?t('toast_checkout_cancelado'):'Checkout cancelado','info');
window.history.replaceState({},'',window.location.pathname);
}
}


// Fallback: chamada direta à BRAPI (se Cloud Function falhar)
async function brapiFallback(ticker,range,interval,modules){
var token=localStorage.getItem('vrt_b3token')||'';
if(!token){console.warn('Sem token local, usando token público');token='';}
var url='https://brapi.dev/api/quote/'+ticker+'?token='+token+'&fundamental=true';
if(range)url+='&range='+range;
if(interval)url+='&interval='+interval;
if(modules){
var blocked=['cashflowStatementHistory','dividendsData'];
var safe=modules.split(',').map(function(m){return m.trim();}).filter(function(m){return m&&blocked.indexOf(m)===-1;}).join(',');
if(safe)url+='&modules='+safe;
if(modules.indexOf('dividendsData')!==-1)url+='&dividends=true';
}
var r=await fetch(url);
if(!r.ok){
if(r.status===401)throw new Error('Dados de mercado temporariamente indisponíveis.');
if(r.status===429)throw new Error('Muitas requisições. Aguarde um momento e tente novamente.');
throw new Error('Erro '+r.status);
}
return r.json();
}

function getB3Token(){
var t=localStorage.getItem('vrt_b3token');
var el=document.getElementById('b3Token');
if(t&&el)el.value=t;
return t||'';
}

function saveB3Token(){
var t=document.getElementById('b3Token').value.trim();
if(t){localStorage.setItem('vrt_b3token',t);toast(typeof t==='function'?t('toast_token_brapi_salvo'):'Token brapi salvo!','ok')}
else{localStorage.removeItem('vrt_b3token');toast(typeof t==='function'?t('toast_token_removido'):'Token removido','ok')}
}

function quickB3(ticker){
document.getElementById('b3Search').value=ticker;
searchB3();
}

// ============================================
// BUSCA PRINCIPAL - RAIO-X COMPLETO
// ============================================
async function searchB3(){
var searchEl=document.getElementById('b3Search');
var rangeEl=document.getElementById('b3Range');
var ticker=(searchEl&&searchEl.value?searchEl.value:'').trim().toUpperCase();
if(!ticker){toast(typeof t==='function'?t('toast_digite_ticker'):'Digite um ticker','err');return;}
var range=rangeEl&&rangeEl.value?rangeEl.value:'1mo';

var resEl=document.getElementById('b3Result');
var errEl=document.getElementById('b3Error');
var loadEl=document.getElementById('b3Loading');
if(resEl)resEl.style.display='none';
if(errEl)errEl.style.display='none';
if(loadEl)loadEl.style.display='block';

try{
var stock,hist;

// Tentar via Cloud Function primeiro
if(brapiRaioXFn){
try{
var result=await brapiRaioXFn({ticker:ticker,range:range,modules:'summaryProfile,financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory,cashflowStatementHistory,dividendsData',dividends:true});
var cfData=result&&result.data?result.data:null;
if(!cfData)throw new Error('Resposta inválida da API');
if(cfData.error||cfData.message){
var apiMsg=String(cfData.message||cfData.error||'');
if(apiMsg.indexOf('401')>=0||/unauthorized|não autorizado|token/i.test(apiMsg))throw new Error('Dados de mercado temporariamente indisponíveis.');
throw new Error(cfData.message||cfData.error||'Erro na API');
}
if(!cfData.results||!cfData.results.length){
throw new Error('Ativo não encontrado: '+ticker);
}
stock=cfData.results[0];
hist=stock&&stock.historicalDataPrice?stock.historicalDataPrice:[];
}catch(cfErr){
console.warn('Cloud Function falhou, tentando fallback:',cfErr);
// Fallback: chamada direta
var d1=await brapiFallback(ticker,range,null,'summaryProfile,financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory,dividendsData');
if(!d1.results||!d1.results.length)throw new Error('Ativo não encontrado: '+ticker);
stock=d1.results[0];

var intervalMap={'1d':'15m','5d':'1h','1mo':'1d','3mo':'1d','6mo':'1d','1y':'1mo','2y':'1mo','5y':'3mo'};
var interval=intervalMap[range]||'1d';
var d2=await brapiFallback(ticker,range,interval,null);
hist=(d2.results&&d2.results[0])?d2.results[0].historicalDataPrice||[]:[];
}
}else{
// Sem Cloud Function - chamada direta
var d1=await brapiFallback(ticker,range,null,'summaryProfile,financialData,defaultKeyStatistics,dividendsData');
if(!d1.results||!d1.results.length)throw new Error('Ativo não encontrado: '+ticker);
stock=d1.results[0];

var intervalMap={'1d':'15m','5d':'1h','1mo':'1d','3mo':'1d','6mo':'1d','1y':'1mo','2y':'1mo','5y':'3mo'};
var interval=intervalMap[range]||'1d';
var d2=await brapiFallback(ticker,range,interval,null);
hist=(d2.results&&d2.results[0])?d2.results[0].historicalDataPrice||[]:[];
}

// Cache
b3Cache[ticker]={stock:stock,hist:hist,range:range,time:Date.now()};

// Render completo com Raio-X (com proteção contra erro interno)
if(!stock){
throw new Error('Dados do ativo não disponíveis');
}
try{
renderB3(stock,hist||[],range);
}catch(renderErr){
console.error('Erro ao renderizar Raio-X:',renderErr);
var _load=document.getElementById('b3Loading');
var _err=document.getElementById('b3Error');
var _msg=document.getElementById('b3ErrorMsg');
if(_load)_load.style.display='none';
if(_err)_err.style.display='block';
if(_msg)_msg.innerHTML=(renderErr.message||'Erro ao exibir análise')+'<br><small style="color:var(--t3)">Tente outro ticker ou atualize a página.</small>';
}

}catch(e){
var _load=document.getElementById('b3Loading');
var _err=document.getElementById('b3Error');
var _msg=document.getElementById('b3ErrorMsg');
if(_load)_load.style.display='none';
if(_err)_err.style.display='block';
var msg=(e&&e.message?e.message:'Erro ao buscar ativo');
var hint=(msg.indexOf('indisponíveis')>=0||msg.indexOf('Muitas')>=0)?'Tente novamente em instantes.':'Verifique o ticker e tente novamente.';
if(_msg)_msg.innerHTML=msg+'<br><small style="color:var(--t3)">'+hint+'</small>';
}
}

// ============================================
// RENDER PRINCIPAL
// ============================================


// ============================================
// MEGA UPGRADE: DETECTOR DE TIPO DE ATIVO
// ============================================
var _ETF_DB={
'BOVA11':{nome:'iShares Ibovespa',indice:'Ibovespa',gestora:'BlackRock',taxa:0.10},
'IVVB11':{nome:'iShares S&P 500',indice:'S&P 500',gestora:'BlackRock',taxa:0.23},
'SMAL11':{nome:'iShares Small Cap',indice:'Small Cap',gestora:'BlackRock',taxa:0.50},
'HASH11':{nome:'Hashdex Crypto',indice:'NCI (Crypto)',gestora:'Hashdex',taxa:1.00},
'XFIX11':{nome:'iShares IFIX',indice:'IFIX (FIIs)',gestora:'BlackRock',taxa:0.30},
'DIVO11':{nome:'It Now Dividendos',indice:'IDIV',gestora:'Itaú',taxa:0.50},
'BOVV11':{nome:'It Now Ibovespa',indice:'Ibovespa',gestora:'Itaú',taxa:0.10},
'NASD11':{nome:'It Now Nasdaq',indice:'Nasdaq 100',gestora:'Itaú',taxa:0.50},
'ECOO11':{nome:'It Now ISE',indice:'ISE B3',gestora:'Itaú',taxa:0.38},
'GOLD11':{nome:'Trend ETF Ouro',indice:'LBMA Gold Price',gestora:'XP',taxa:0.30},
'IMAB11':{nome:'It Now IMA-B',indice:'IMA-B (IPCA)',gestora:'Itaú',taxa:0.25},
'IRFM11':{nome:'It Now IRF-M P2',indice:'IRF-M P2',gestora:'Itaú',taxa:0.20},
'MATB11':{nome:'It Now IMAT',indice:'IMAT (Materiais)',gestora:'Itaú',taxa:0.50},
'FIND11':{nome:'It Now IFNC',indice:'IFNC (Financeiro)',gestora:'Itaú',taxa:0.50},
'PIBB11':{nome:'It Now PIBB',indice:'IBrX-50',gestora:'Itaú',taxa:0.059},
'SPXI11':{nome:'It Now S&P 500',indice:'S&P 500',gestora:'Itaú',taxa:0.21},
'TECK11':{nome:'It Now Tech',indice:'NYSE FANG+',gestora:'Itaú',taxa:0.50},
'QBTC11':{nome:'QR Bitcoin',indice:'Bitcoin',gestora:'QR Asset',taxa:0.75},
'QETH11':{nome:'QR Ethereum',indice:'Ethereum',gestora:'QR Asset',taxa:0.75},
'BBSD11':{nome:'BB Dividendos',indice:'S&P Dividendos BR',gestora:'BB',taxa:0.50},
'SMAC11':{nome:'It Now Small Cap',indice:'SMLL',gestora:'Itaú',taxa:0.50},
'BITH11':{nome:'Hashdex Bitcoin',indice:'Bitcoin',gestora:'Hashdex',taxa:0.70},
'ETHE11':{nome:'Hashdex Ethereum',indice:'Ethereum',gestora:'Hashdex',taxa:0.70},
'SHOT11':{nome:'It Now S. Setorial',indice:'SHOT',gestora:'Itaú',taxa:0.50},
'WRLD11':{nome:'It Now MSCI World',indice:'MSCI ACWI',gestora:'Itaú',taxa:0.38},
'XINA11':{nome:'Trend China',indice:'MSCI China',gestora:'XP',taxa:0.30},
'EURP11':{nome:'Trend Europa',indice:'MSCI Europe',gestora:'XP',taxa:0.30}
};

var _BDR_DB={
'AAPL34':{nome:'Apple Inc.',ticker_us:'AAPL',setor:'Tecnologia',pais:'EUA'},
'MSFT34':{nome:'Microsoft Corp.',ticker_us:'MSFT',setor:'Tecnologia',pais:'EUA'},
'AMZO34':{nome:'Amazon.com Inc.',ticker_us:'AMZN',setor:'Tecnologia/Varejo',pais:'EUA'},
'GOGL34':{nome:'Alphabet (Google)',ticker_us:'GOOGL',setor:'Tecnologia',pais:'EUA'},
'GOGL35':{nome:'Alphabet (Google) C',ticker_us:'GOOG',setor:'Tecnologia',pais:'EUA'},
'META34':{nome:'Meta Platforms',ticker_us:'META',setor:'Tecnologia',pais:'EUA'},
'TSLA34':{nome:'Tesla Inc.',ticker_us:'TSLA',setor:'Automotivo/Tech',pais:'EUA'},
'NVDC34':{nome:'NVIDIA Corp.',ticker_us:'NVDA',setor:'Semicondutores',pais:'EUA'},
'NFLX34':{nome:'Netflix Inc.',ticker_us:'NFLX',setor:'Entretenimento',pais:'EUA'},
'DISB34':{nome:'Walt Disney Co.',ticker_us:'DIS',setor:'Entretenimento',pais:'EUA'},
'COCA34':{nome:'Coca-Cola Co.',ticker_us:'KO',setor:'Bens de Consumo',pais:'EUA'},
'JPMC34':{nome:'JPMorgan Chase',ticker_us:'JPM',setor:'Financeiro',pais:'EUA'},
'MSBR34':{nome:'Morgan Stanley',ticker_us:'MS',setor:'Financeiro',pais:'EUA'},
'BOAC34':{nome:'Bank of America',ticker_us:'BAC',setor:'Financeiro',pais:'EUA'},
'BERK34':{nome:'Berkshire Hathaway',ticker_us:'BRK-B',setor:'Conglomerado',pais:'EUA'},
'VISA34':{nome:'Visa Inc.',ticker_us:'V',setor:'Financeiro',pais:'EUA'},
'MSCD34':{nome:'Mastercard Inc.',ticker_us:'MA',setor:'Financeiro',pais:'EUA'},
'PFIZ34':{nome:'Pfizer Inc.',ticker_us:'PFE',setor:'Farmacêutico',pais:'EUA'},
'JNJB34':{nome:'Johnson & Johnson',ticker_us:'JNJ',setor:'Saúde',pais:'EUA'},
'MCDONALD34':{nome:'McDonalds Corp.',ticker_us:'MCD',setor:'Alimentação',pais:'EUA'},
'NIKE34':{nome:'Nike Inc.',ticker_us:'NKE',setor:'Varejo',pais:'EUA'},
'ADBE34':{nome:'Adobe Inc.',ticker_us:'ADBE',setor:'Tecnologia',pais:'EUA'},
'TXRX34':{nome:'Texas Instruments',ticker_us:'TXN',setor:'Semicondutores',pais:'EUA'},
'INBR32':{nome:'Intel Corp.',ticker_us:'INTC',setor:'Semicondutores',pais:'EUA'},
'AVGO34':{nome:'Broadcom Inc.',ticker_us:'AVGO',setor:'Semicondutores',pais:'EUA'},
'A1MD34':{nome:'AMD Inc.',ticker_us:'AMD',setor:'Semicondutores',pais:'EUA'},
'SPOT34':{nome:'Spotify',ticker_us:'SPOT',setor:'Tecnologia',pais:'Suécia'},
'MELI34':{nome:'MercadoLibre',ticker_us:'MELI',setor:'E-commerce',pais:'Argentina'}
};

function detectAssetType(ticker){
if(!ticker)return 'acao';
var t=ticker.toUpperCase().trim();

// ETF: verificar banco de dados primeiro
if(_ETF_DB[t])return 'etf';

// BDR: verificar banco de dados
if(_BDR_DB[t])return 'bdr';

// FII: termina em 11 (mas não pode ser ETF)
if(/^[A-Z]{4}11$/.test(t))return 'fii';
if(/^[A-Z]{4}11B$/.test(t))return 'fii';

// BDR genérico: termina em 34 ou 35 (ex: AAPL34, MCDONALD34)
if(/^[A-Z]{2,10}3[45]$/.test(t))return 'bdr';

// Units: termina em 11 mas com mais letras
if(/^[A-Z]{4}[0-9]{1,2}$/.test(t)){
var num=parseInt(t.replace(/[A-Z]/g,''));
if(num===11)return 'fii'; // já coberto acima
}

return 'acao';
}

// ============================================
// ANÁLISE ESPECIALIZADA: FIIs
// ============================================
function renderFIIAnalysis(stock,price,fg){
var dks=stock.defaultKeyStatistics||{};
var fd=stock.financialData||{};
var dy=stock.dividendYield||dks.yield||0;
if(dy>0&&dy<1)dy=dy*100;
// FII: calcular DY via dividendsData se necessário
if((!dy||dy===0)&&stock.dividendsData&&stock.dividendsData.cashDividends){
var _fiiDivs=stock.dividendsData.cashDividends;
var _fiiNow=new Date();var _fii1y=new Date(_fiiNow.getFullYear()-1,_fiiNow.getMonth(),_fiiNow.getDate());
var _fiiTotDiv=0;_fiiDivs.forEach(function(d){var dd=new Date(d.paymentDate||d.approvedDate||d.lastDatePrior);if(dd>=_fii1y)_fiiTotDiv+=d.value||d.rate||0;});
if(_fiiTotDiv>0&&price>0)dy=(_fiiTotDiv/price)*100;
}
var pvp=stock.priceToBookRatio||0;

// DY mensal estimado
var dyMensal=dy/12;
var divMensal=price*(dyMensal/100);

// Header do FII
fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(34,197,94,.1),rgba(34,197,94,.03));border:1px solid rgba(34,197,94,.3);padding:16px;border-radius:12px">';
fg+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="font-size:1.4em">\u{1F3E2}</span><span style="font-size:1em;font-weight:800;color:#22C55E">ANÁLISE DE FII</span><span style="font-size:.7em;background:rgba(34,197,94,.15);color:#22C55E;padding:3px 10px;border-radius:6px;font-weight:600">FUNDO IMOBILIÁRIO</span></div>';

// KPIs FII
fg+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';

// DY Anual
var dyColor=dy>=8?'#22C55E':dy>=6?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+dyColor+'33">';
fg+='<div style="font-size:.65em;color:var(--t3)">DY Anual</div>';
fg+='<div style="font-size:1.5em;font-weight:900;color:'+dyColor+'">'+dy.toFixed(2)+'%</div>';
fg+='<div style="font-size:.6em;color:var(--t3)">'+(dy>=8?'\u{1F7E2} Excelente':dy>=6?'\u{1F7E1} Bom':'\u{1F534} Baixo')+'</div></div>';

// DY Mensal
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center">';
fg+='<div style="font-size:.65em;color:var(--t3)">DY Mensal</div>';
fg+='<div style="font-size:1.5em;font-weight:900;color:var(--pri)">'+dyMensal.toFixed(2)+'%</div>';
fg+='<div style="font-size:.6em;color:var(--t3)">~R$ '+divMensal.toFixed(2)+'/cota</div></div>';

// P/VP
var pvpColor=pvp>0&&pvp<0.95?'#22C55E':pvp<=1.05?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+pvpColor+'33">';
fg+='<div style="font-size:.65em;color:var(--t3)">P/VP</div>';
fg+='<div style="font-size:1.5em;font-weight:900;color:'+pvpColor+'">'+(pvp>0?pvp.toFixed(2):'N/D')+'</div>';
fg+='<div style="font-size:.6em;color:var(--t3)">'+(pvp>0&&pvp<0.95?'\u{1F7E2} Desconto':pvp<=1.05?'\u{1F7E1} Justo':'\u{1F534} Ágio')+'</div></div>';

// Preço Teto Bazin (DY 6%)
var precoTeto=0;
if(dy>0&&price>0){
var divAnualCota=(dy/100)*price;
precoTeto=divAnualCota/0.06;
}
var tetoColor=precoTeto>0&&price<=precoTeto?'#22C55E':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+tetoColor+'33">';
fg+='<div style="font-size:.65em;color:var(--t3)">Preço Teto (6%)</div>';
fg+='<div style="font-size:1.5em;font-weight:900;color:'+tetoColor+'">'+(precoTeto>0?'R$ '+precoTeto.toFixed(2):'N/D')+'</div>';
fg+='<div style="font-size:.6em;color:var(--t3)">'+(precoTeto>0&&price<=precoTeto?'\u{1F7E2} Abaixo do teto':'\u{1F534} Acima do teto')+'</div></div>';
fg+='</div>';

// Score FII
var fiiScore=0;var fiiItems=[];
if(dy>=10){fiiScore+=30;fiiItems.push('\u{1F7E2} DY excelente ('+dy.toFixed(1)+'%)');}
else if(dy>=7){fiiScore+=22;fiiItems.push('\u{1F7E2} DY muito bom ('+dy.toFixed(1)+'%)');}
else if(dy>=5){fiiScore+=15;fiiItems.push('\u{1F7E1} DY razoável ('+dy.toFixed(1)+'%)');}
else if(dy>0){fiiScore+=8;fiiItems.push('\u{1F7E1} DY baixo ('+dy.toFixed(1)+'%)');}
else{fiiScore+=12;fiiItems.push('\u{26A0}\u{FE0F} DY indisponível — sem penalizar');}

if(pvp>0&&pvp<0.9){fiiScore+=25;fiiItems.push('\u{1F7E2} Grande desconto no VP (P/VP '+pvp.toFixed(2)+')');}
else if(pvp>0&&pvp<1.0){fiiScore+=18;fiiItems.push('\u{1F7E2} Abaixo do VP (P/VP '+pvp.toFixed(2)+')');}
else if(pvp>0&&pvp<=1.1){fiiScore+=10;fiiItems.push('\u{1F7E1} Preço justo (P/VP '+pvp.toFixed(2)+')');}
else if(pvp>0){fiiScore+=3;fiiItems.push('\u{1F534} Ágio sobre VP (P/VP '+pvp.toFixed(2)+')');}

if(precoTeto>0&&price<=precoTeto){fiiScore+=20;fiiItems.push('\u{1F7E2} Abaixo do preço teto Bazin');}
else if(precoTeto>0){fiiScore+=5;fiiItems.push('\u{1F534} Acima do preço teto');}

if(stock.regularMarketVolume>500000){fiiScore+=15;fiiItems.push('\u{1F7E2} Boa liquidez (vol '+fmtVol(stock.regularMarketVolume)+')');}
else if(stock.regularMarketVolume>100000){fiiScore+=8;fiiItems.push('\u{1F7E1} Liquidez média');}
else{fiiScore+=2;fiiItems.push('\u{1F534} Baixa liquidez — risco');}

if(stock.marketCap&&stock.marketCap>1e9){fiiScore+=10;fiiItems.push('\u{1F7E2} FII grande (PL > R$ 1 bi)');}
else if(stock.marketCap&&stock.marketCap>500e6){fiiScore+=6;fiiItems.push('\u{1F7E1} FII médio');}
else if(!stock.marketCap||stock.marketCap===0){fiiScore+=6;fiiItems.push('\u{26A0}\u{FE0F} PL indisponível — sem penalizar');}
else{fiiScore+=3;fiiItems.push('\u{1F7E1} FII pequeno');}

fiiScore=Math.min(100,fiiScore);
var fiiVerdict=fiiScore>=75?'COMPRAR':fiiScore>=50?'ANALISAR':fiiScore>=30?'CAUTELA':'EVITAR';
var fiiVColor=fiiScore>=75?'#22C55E':fiiScore>=50?'#EAB308':fiiScore>=30?'#F59E0B':'#EF4444';

fg+='<div style="display:flex;align-items:center;gap:16px;margin:12px 0">';
fg+='<div style="font-size:2em;font-weight:900;color:'+fiiVColor+'">'+fiiVerdict+'</div>';
fg+='<div style="flex:1"><div style="font-size:.85em;color:var(--t2)">Score FII: <strong style="color:'+fiiVColor+'">'+fiiScore+'/100</strong></div>';
fg+='<div style="height:8px;background:var(--bg2);border-radius:4px;margin-top:6px;overflow:hidden"><div style="height:100%;width:'+fiiScore+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:4px;transition:width .8s ease"></div></div></div></div>';
fg+='<div style="font-size:.78em;color:var(--t2);line-height:1.8;margin-top:8px">'+fiiItems.join('<br>')+'</div>';
fg+='</div>';

// ============================================
// SIMULADOR DE RENDA PASSIVA INTERATIVO
// ============================================
fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(79,140,255,.1),rgba(79,140,255,.03));border:1px solid rgba(79,140,255,.3);padding:16px;border-radius:12px">';
fg+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="font-size:1.4em">\u{1F4B0}</span><span style="font-size:1em;font-weight:800;color:var(--pri)">SIMULADOR DE RENDA PASSIVA</span></div>';

var simId='fiiSim_'+Date.now();

fg+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px">';
fg+='<div><label style="font-size:.75em;color:var(--t3);display:block;margin-bottom:4px">Quanto quer investir (R$)</label>';
fg+='<input type="number" id="'+simId+'_valor" value="10000" min="100" step="1000" style="width:100%;padding:10px;border:1px solid var(--brd);border-radius:8px;background:var(--bg2);color:var(--t1);font-size:1em" oninput="calcFIISim(\''+simId+'\','+price+','+dy+')"></div>';
fg+='<div><label style="font-size:.75em;color:var(--t3);display:block;margin-bottom:4px">Aporte mensal (R$)</label>';
fg+='<input type="number" id="'+simId+'_aporte" value="500" min="0" step="100" style="width:100%;padding:10px;border:1px solid var(--brd);border-radius:8px;background:var(--bg2);color:var(--t1);font-size:1em" oninput="calcFIISim(\''+simId+'\','+price+','+dy+')"></div>';
fg+='</div>';

// Resultado do simulador
fg+='<div id="'+simId+'_result" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"></div>';

// Tabela evolução
fg+='<div id="'+simId+'_table" style="margin-top:12px"></div>';

fg+='</div>';

// Chamar simulador automaticamente
fg+='<script>setTimeout(function(){calcFIISim("'+simId+'",'+price+','+dy+')},100)<\/script>';

return fg;
}

// Calculadora FII Simulador
function calcFIISim(simId,price,dy){
var valorEl=document.getElementById(simId+'_valor');
var aporteEl=document.getElementById(simId+'_aporte');
if(!valorEl||!aporteEl)return;

var investimento=parseFloat(valorEl.value)||0;
var aporteMensal=parseFloat(aporteEl.value)||0;
var dyMensal=dy/12/100;

// Cálculo imediato
var cotas=Math.floor(investimento/price);
var rendaMensal=cotas*price*dyMensal;
var rendaAnual=rendaMensal*12;

// Resultado
var rEl=document.getElementById(simId+'_result');
if(rEl){
var rh='';
rh+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(34,197,94,.3)">';
rh+='<div style="font-size:.65em;color:var(--t3)">Cotas</div>';
rh+='<div style="font-size:1.4em;font-weight:900;color:var(--t1)">'+cotas+'</div></div>';
rh+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(34,197,94,.3)">';
rh+='<div style="font-size:.65em;color:var(--t3)">Renda/Mês</div>';
rh+='<div style="font-size:1.4em;font-weight:900;color:#22C55E">R$ '+rendaMensal.toFixed(2)+'</div></div>';
rh+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(79,140,255,.3)">';
rh+='<div style="font-size:.65em;color:var(--t3)">Renda/Ano</div>';
rh+='<div style="font-size:1.4em;font-weight:900;color:var(--pri)">R$ '+rendaAnual.toFixed(2)+'</div></div>';
rh+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center">';
rh+='<div style="font-size:.65em;color:var(--t3)">Yield on Cost</div>';
rh+='<div style="font-size:1.4em;font-weight:900;color:var(--t1)">'+(investimento>0?(rendaAnual/investimento*100).toFixed(1):0)+'%</div></div>';
rEl.innerHTML=rh;
}

// Tabela de evolução (1, 2, 3, 5, 10 anos)
var tEl=document.getElementById(simId+'_table');
if(tEl){
var th='<table style="width:100%;border-collapse:collapse;font-size:.8em">';
th+='<thead><tr style="background:var(--bg2)"><th style="padding:8px;text-align:left;color:var(--t3);font-size:.75em">ANO</th><th style="padding:8px;text-align:right;color:var(--t3);font-size:.75em">INVESTIDO</th><th style="padding:8px;text-align:right;color:var(--t3);font-size:.75em">COTAS</th><th style="padding:8px;text-align:right;color:var(--t3);font-size:.75em">PATRIMÔNIO</th><th style="padding:8px;text-align:right;color:var(--t3);font-size:.75em">RENDA/MÊS</th><th style="padding:8px;text-align:right;color:var(--t3);font-size:.75em">RENDA/ANO</th></tr></thead><tbody>';

var anos=[1,2,3,5,10,15,20];
anos.forEach(function(ano){
var totalInv=investimento+(aporteMensal*12*ano);
var totalCotas=cotas;
// Simular aportes mensais comprando cotas
for(var m=1;m<=ano*12;m++){
totalCotas+=Math.floor(aporteMensal/price);
}
var patrimonio=totalCotas*price;
var rendaMes=totalCotas*price*dyMensal;
var rendaAno2=rendaMes*12;

th+='<tr style="border-bottom:1px solid var(--brd)">';
th+='<td style="padding:8px;font-weight:700;color:var(--t1)">'+ano+' ano'+(ano>1?'s':'')+'</td>';
th+='<td style="padding:8px;text-align:right;color:var(--t2)">R$ '+(totalInv/1000).toFixed(1)+'k</td>';
th+='<td style="padding:8px;text-align:right;color:var(--t1);font-weight:600">'+totalCotas+'</td>';
th+='<td style="padding:8px;text-align:right;color:var(--pri);font-weight:700">R$ '+(patrimonio/1000).toFixed(1)+'k</td>';
th+='<td style="padding:8px;text-align:right;color:#22C55E;font-weight:700">R$ '+rendaMes.toFixed(2)+'</td>';
th+='<td style="padding:8px;text-align:right;color:#22C55E;font-weight:700">R$ '+(rendaAno2/1000).toFixed(1)+'k</td>';
th+='</tr>';
});
th+='</tbody></table>';
tEl.innerHTML=th;
}
}




// ============================================
// ANÁLISE ESPECIALIZADA: ETFs
// ============================================
function renderETFAnalysis(stock,price,fg){
var ticker=(stock.symbol||'').toUpperCase();
var etfInfo=_ETF_DB[ticker]||{nome:stock.longName||ticker,indice:'N/D',gestora:'N/D',taxa:0};
var dks=stock.defaultKeyStatistics||{};
var dy=stock.dividendYield||dks.yield||0;
if(dy>0&&dy<1)dy=dy*100;
// ETF: calcular DY via dividendsData se necessário
if((!dy||dy===0)&&stock.dividendsData&&stock.dividendsData.cashDividends){
var _etfDivs=stock.dividendsData.cashDividends;
var _etfNow=new Date();var _etf1y=new Date(_etfNow.getFullYear()-1,_etfNow.getMonth(),_etfNow.getDate());
var _etfTotDiv=0;_etfDivs.forEach(function(d){var dd=new Date(d.paymentDate||d.approvedDate||d.lastDatePrior);if(dd>=_etf1y)_etfTotDiv+=d.value||d.rate||0;});
if(_etfTotDiv>0&&price>0)dy=(_etfTotDiv/price)*100;
}

fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(124,92,252,.1),rgba(124,92,252,.03));border:1px solid rgba(124,92,252,.3);padding:16px;border-radius:12px">';
fg+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="font-size:1.4em">\u{1F4CA}</span><span style="font-size:1em;font-weight:800;color:#7C5CFC">ANÁLISE DE ETF</span><span style="font-size:.7em;background:rgba(124,92,252,.15);color:#7C5CFC;padding:3px 10px;border-radius:6px;font-weight:600">FUNDO DE ÍNDICE</span></div>';

fg+='<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:.85em">';
fg+='<div><span style="color:var(--t3)">Nome:</span> <strong style="color:var(--t1)">'+etfInfo.nome+'</strong></div>';
fg+='<div><span style="color:var(--t3)">Índice:</span> <strong style="color:var(--pri)">'+etfInfo.indice+'</strong></div>';
fg+='<div><span style="color:var(--t3)">Gestora:</span> <strong style="color:var(--t1)">'+etfInfo.gestora+'</strong></div>';
fg+='<div><span style="color:var(--t3)">Taxa Admin:</span> <strong style="color:'+(etfInfo.taxa<=0.2?'#22C55E':etfInfo.taxa<=0.5?'#EAB308':'#EF4444')+'">'+etfInfo.taxa.toFixed(2)+'% a.a.</strong></div>';
fg+='</div>';

fg+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';
var taxaColor=etfInfo.taxa<=0.15?'#22C55E':etfInfo.taxa<=0.3?'#EAB308':etfInfo.taxa<=0.5?'#F59E0B':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+taxaColor+'33"><div style="font-size:.65em;color:var(--t3)">Taxa Admin</div><div style="font-size:1.5em;font-weight:900;color:'+taxaColor+'">'+etfInfo.taxa.toFixed(2)+'%</div><div style="font-size:.6em;color:var(--t3)">'+(etfInfo.taxa<=0.15?'\u{1F7E2} Ótima':etfInfo.taxa<=0.3?'\u{1F7E2} Boa':etfInfo.taxa<=0.5?'\u{1F7E1} Média':'\u{1F534} Alta')+'</div></div>';

var volColor=stock.regularMarketVolume>1000000?'#22C55E':stock.regularMarketVolume>100000?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+volColor+'33"><div style="font-size:.65em;color:var(--t3)">Volume Diário</div><div style="font-size:1.5em;font-weight:900;color:'+volColor+'">'+fmtVol(stock.regularMarketVolume||0)+'</div></div>';

fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:.65em;color:var(--t3)">DY</div><div style="font-size:1.5em;font-weight:900;color:var(--t1)">'+(dy>0?dy.toFixed(2)+'%':'N/A')+'</div></div>';

var var52=0;
if(stock.fiftyTwoWeekLow&&stock.fiftyTwoWeekLow>0)var52=((price-stock.fiftyTwoWeekLow)/stock.fiftyTwoWeekLow*100);
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:.65em;color:var(--t3)">Var. 52 Sem</div><div style="font-size:1.5em;font-weight:900;color:'+(var52>=0?'#22C55E':'#EF4444')+'">'+var52.toFixed(1)+'%</div></div>';
fg+='</div>';

// Score ETF
var etfScore=0;var etfItems=[];
if(etfInfo.taxa<=0.1){etfScore+=25;etfItems.push('\u{1F7E2} Taxa excelente');}
else if(etfInfo.taxa<=0.25){etfScore+=20;etfItems.push('\u{1F7E2} Taxa boa');}
else if(etfInfo.taxa<=0.5){etfScore+=12;etfItems.push('\u{1F7E1} Taxa aceitável');}
else{etfScore+=5;etfItems.push('\u{1F534} Taxa alta');}

if(stock.regularMarketVolume>5000000){etfScore+=25;etfItems.push('\u{1F7E2} Liquidez excepcional');}
else if(stock.regularMarketVolume>1000000){etfScore+=20;etfItems.push('\u{1F7E2} Boa liquidez');}
else if(stock.regularMarketVolume>100000){etfScore+=10;etfItems.push('\u{1F7E1} Liquidez média');}
else{etfScore+=3;etfItems.push('\u{1F534} Baixa liquidez');}

if(stock.marketCap&&stock.marketCap>5e9){etfScore+=20;etfItems.push('\u{1F7E2} ETF grande (PL > R$ 5bi)');}
else if(stock.marketCap&&stock.marketCap>1e9){etfScore+=15;etfItems.push('\u{1F7E2} ETF médio-grande');}
else if(stock.marketCap&&stock.marketCap>100e6){etfScore+=10;etfItems.push('\u{1F7E1} ETF médio');}
else if(!stock.marketCap||stock.marketCap===0){etfScore+=12;etfItems.push('\u{26A0}\u{FE0F} PL indisponível — sem penalizar');}
else{etfScore+=8;etfItems.push('\u{1F7E1} ETF pequeno');}

var pos52e=stock.fiftyTwoWeekHigh&&stock.fiftyTwoWeekLow?((price-stock.fiftyTwoWeekLow)/(stock.fiftyTwoWeekHigh-stock.fiftyTwoWeekLow)*100):50;
if(pos52e<30){etfScore+=15;etfItems.push('\u{1F7E2} Bom ponto de entrada');}
else if(pos52e<60){etfScore+=10;etfItems.push('\u{1F7E1} Preço na média');}
else{etfScore+=4;etfItems.push('\u{1F534} Próximo da máxima');}

if(dy>=4){etfScore+=15;etfItems.push('\u{1F7E2} Distribui bons dividendos');}
else if(dy>=2){etfScore+=12;etfItems.push('\u{1F7E2} Distribui dividendos');}
else if(dy>0){etfScore+=10;etfItems.push('\u{1F7E1} DY baixo ('+dy.toFixed(2)+'%)');}
else{etfScore+=10;etfItems.push('\u{26A0}\u{FE0F} ETF de acumulação — sem penalizar');}

etfScore=Math.min(100,etfScore);
var etfVerdict=etfScore>=75?'COMPRAR':etfScore>=50?'ANALISAR':etfScore>=30?'CAUTELA':'EVITAR';
var etfVColor=etfScore>=75?'#22C55E':etfScore>=50?'#EAB308':etfScore>=30?'#F59E0B':'#EF4444';

fg+='<div style="display:flex;align-items:center;gap:16px;margin:12px 0"><div style="font-size:2em;font-weight:900;color:'+etfVColor+'">'+etfVerdict+'</div><div style="flex:1"><div style="font-size:.85em;color:var(--t2)">Score ETF: <strong style="color:'+etfVColor+'">'+etfScore+'/100</strong></div><div style="height:8px;background:var(--bg2);border-radius:4px;margin-top:6px;overflow:hidden"><div style="height:100%;width:'+etfScore+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:4px"></div></div></div></div>';
fg+='<div style="font-size:.78em;color:var(--t2);line-height:1.8;margin-top:8px">'+etfItems.join('<br>')+'</div>';

fg+='<div style="margin-top:16px;background:var(--bg2);border-radius:10px;padding:14px;border:1px solid rgba(124,92,252,.2)"><div style="font-size:.8em;font-weight:700;color:#7C5CFC;margin-bottom:6px">\u{1F4DD} Sobre este ETF</div><div style="font-size:.78em;color:var(--t2);line-height:1.7">O '+etfInfo.nome+' replica o índice '+etfInfo.indice+', gerido pela '+etfInfo.gestora+'. ETFs são ideais para investimento passivo de longo prazo com baixas taxas e diversificação instantânea.</div></div>';

fg+='</div>';
return fg;
}

// ============================================
// ANÁLISE ESPECIALIZADA: BDRs
// ============================================
function renderBDRAnalysis(stock,price,fg){
var ticker=(stock.symbol||'').toUpperCase();
var bdrInfo=_BDR_DB[ticker]||{nome:stock.longName||ticker,ticker_us:ticker.replace(/3[45]$/,''),setor:'N/D',pais:'EUA'};
var pe=stock.priceEarnings||0;
var fd=stock.financialData||{};
var dks=stock.defaultKeyStatistics||{};
var dy=stock.dividendYield||dks.yield||0;
if(dy>0&&dy<1)dy=dy*100;
// BDR: calcular DY via dividendsData se necessário
if((!dy||dy===0)&&stock.dividendsData&&stock.dividendsData.cashDividends){
var _divs=stock.dividendsData.cashDividends;
var _now=new Date();var _1y=new Date(_now.getFullYear()-1,_now.getMonth(),_now.getDate());
var _totDiv=0;_divs.forEach(function(d){var dd=new Date(d.paymentDate||d.approvedDate||d.lastDatePrior);if(dd>=_1y)_totDiv+=d.value||d.rate||0;});
if(_totDiv>0&&price>0)dy=(_totDiv/price)*100;
}
var pvp=stock.priceToBookRatio||0;

fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(245,158,11,.03));border:1px solid rgba(245,158,11,.3);padding:16px;border-radius:12px">';
fg+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="font-size:1.4em">\u{1F30D}</span><span style="font-size:1em;font-weight:800;color:#F59E0B">ANÁLISE DE BDR</span><span style="font-size:.7em;background:rgba(245,158,11,.15);color:#F59E0B;padding:3px 10px;border-radius:6px;font-weight:600">RECIBO DEPOSITÁRIO</span></div>';

fg+='<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:.85em">';
fg+='<div><span style="color:var(--t3)">Empresa:</span> <strong style="color:var(--t1)">'+bdrInfo.nome+'</strong></div>';
fg+='<div><span style="color:var(--t3)">Ticker Original:</span> <strong style="color:#F59E0B">'+bdrInfo.ticker_us+' ('+bdrInfo.pais+')</strong></div>';
fg+='<div><span style="color:var(--t3)">Setor:</span> <strong style="color:var(--t1)">'+bdrInfo.setor+'</strong></div>';
fg+='<div><span style="color:var(--t3)">Tipo:</span> <strong style="color:var(--t2)">BDR Nível I</strong></div>';
fg+='</div>';

fg+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';
var peColor=pe>0&&pe<15?'#22C55E':pe>0&&pe<25?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:.65em;color:var(--t3)">P/L</div><div style="font-size:1.5em;font-weight:900;color:'+(pe>0?peColor:'var(--t2)')+'">'+( pe>0?pe.toFixed(1):'N/D')+'</div></div>';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:.65em;color:var(--t3)">DY</div><div style="font-size:1.5em;font-weight:900;color:var(--t1)">'+(dy>0?dy.toFixed(2)+'%':'N/A')+'</div></div>';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:.65em;color:var(--t3)">P/VP</div><div style="font-size:1.5em;font-weight:900;color:var(--t1)">'+(pvp>0?pvp.toFixed(2):'N/D')+'</div></div>';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(245,158,11,.3)"><div style="font-size:.65em;color:var(--t3)">Câmbio</div><div style="font-size:1.4em;font-weight:900;color:#F59E0B">\u{1F4B1} USD</div><div style="font-size:.6em;color:var(--t3)">Proteção cambial</div></div>';
fg+='</div>';

var bdrScore=0;var bdrItems=[];
if(pe>0&&pe<15){bdrScore+=20;bdrItems.push('\u{1F7E2} P/L atrativo');}
else if(pe>0&&pe<25){bdrScore+=12;bdrItems.push('\u{1F7E1} P/L moderado');}
else if(pe>0){bdrScore+=5;bdrItems.push('\u{1F534} P/L alto');}

if(dy>=3){bdrScore+=15;bdrItems.push('\u{1F7E2} Bons dividendos');}
else if(dy>=1){bdrScore+=8;bdrItems.push('\u{1F7E1} Dividendos modestos');}
else{bdrScore+=3;bdrItems.push('\u{26A0}\u{FE0F} Sem dividendos expressivos');}

var roe=fd.returnOnEquity?fd.returnOnEquity*100:0;
if(roe>=20){bdrScore+=20;bdrItems.push('\u{1F7E2} ROE excepcional ('+roe.toFixed(1)+'%)');}
else if(roe>=12){bdrScore+=12;bdrItems.push('\u{1F7E2} ROE bom');}
else if(roe>0){bdrScore+=5;bdrItems.push('\u{1F7E1} ROE fraco');}

if(stock.regularMarketVolume>500000){bdrScore+=15;bdrItems.push('\u{1F7E2} Boa liquidez na B3');}
else if(stock.regularMarketVolume>50000){bdrScore+=8;bdrItems.push('\u{1F7E1} Liquidez média');}
else{bdrScore+=3;bdrItems.push('\u{1F534} Baixa liquidez');}

if(_BDR_DB[ticker]){bdrScore+=15;bdrItems.push('\u{1F7E2} Empresa global reconhecida');}
bdrScore+=10;bdrItems.push('\u{1F4B1} Exposição ao dólar');

bdrScore=Math.min(100,bdrScore);
var bdrVerdict=bdrScore>=75?'COMPRAR':bdrScore>=50?'ANALISAR':bdrScore>=30?'CAUTELA':'EVITAR';
var bdrVColor=bdrScore>=75?'#22C55E':bdrScore>=50?'#EAB308':bdrScore>=30?'#F59E0B':'#EF4444';

fg+='<div style="display:flex;align-items:center;gap:16px;margin:12px 0"><div style="font-size:2em;font-weight:900;color:'+bdrVColor+'">'+bdrVerdict+'</div><div style="flex:1"><div style="font-size:.85em;color:var(--t2)">Score BDR: <strong style="color:'+bdrVColor+'">'+bdrScore+'/100</strong></div><div style="height:8px;background:var(--bg2);border-radius:4px;margin-top:6px;overflow:hidden"><div style="height:100%;width:'+bdrScore+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:4px"></div></div></div></div>';
fg+='<div style="font-size:.78em;color:var(--t2);line-height:1.8;margin-top:8px">'+bdrItems.join('<br>')+'</div>';

fg+='<div style="margin-top:16px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:14px"><div style="font-size:.8em;font-weight:700;color:#F59E0B;margin-bottom:6px">\u{26A0}\u{FE0F} Sobre BDRs</div><div style="font-size:.75em;color:var(--t2);line-height:1.8">\u2022 Recibos de ações estrangeiras negociados na B3 em reais<br>\u2022 Preço influenciado pela cotação original + câmbio (USD/BRL)<br>\u2022 Dividendos têm IR retido na fonte (30% nos EUA)<br>\u2022 Ideal para diversificação internacional</div></div>';
fg+='</div>';
return fg;
}


function renderB3(stock,hist,range){
if(!stock||typeof stock!=='object'){
var errEl=document.getElementById('b3Error');
var loadEl=document.getElementById('b3Loading');
var resEl=document.getElementById('b3Result');
if(loadEl)loadEl.style.display='none';
if(resEl)resEl.style.display='none';
if(errEl){errEl.style.display='block';var msgEl=document.getElementById('b3ErrorMsg');if(msgEl)msgEl.innerHTML='Dados do ativo inválidos.';}
return;
}
hist=Array.isArray(hist)?hist:[];

var _b3=function(id){return document.getElementById(id);};
var loadEl=_b3('b3Loading');
var resEl=_b3('b3Result');
if(loadEl)loadEl.style.display='none';
if(resEl)resEl.style.display='block';

var price=stock.regularMarketPrice||0;
var change=stock.regularMarketChange||0;
var changePct=stock.regularMarketChangePercent||0;
var isUp=change>=0;
var arrow=isUp?'&#9650;':'&#9660;';
var colorClass=isUp?'b3-up':'b3-down';

// HEADER
var logo=stock.logourl||'https://icons.brapi.dev/icons/BRAPI.svg';
var h='<img loading="lazy" src="'+logo+'" style="width:48px;height:48px;border-radius:12px;background:#fff;padding:4px" onerror="this.style.display=\'none\'">';
h+='<div style="flex:1"><div style="font-size:1.3em;font-weight:800">'+stock.symbol+'</div>';
h+='<div style="font-size:.8em;color:var(--t2)">'+( stock.longName||stock.shortName||'')+'</div></div>';
h+='<div style="text-align:right"><div style="font-size:1.5em;font-weight:800">R$ '+price.toFixed(2)+'</div>';
h+='<div class="'+colorClass+'" style="font-size:.9em;font-weight:700">'+arrow+' R$ '+Math.abs(change).toFixed(2)+' ('+changePct.toFixed(2)+'%)</div></div>';
h+='<button onclick="toggleB3QuickAdd()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.85em;cursor:pointer;white-space:nowrap" title="Adicionar à carteira"><i data-lucide="plus-circle" style="width:18px;height:18px"></i> Adicionar à carteira</button>';
var headerEl=_b3('b3Header');if(headerEl)headerEl.innerHTML=h;
var qaEl=_b3('b3QuickAdd');if(qaEl){qaEl.style.display='none';}
if(typeof lucide!=='undefined')lucide.createIcons();

// KPIs
var kpis=[
{l:'Abertura',v:'R$ '+(stock.regularMarketOpen||0).toFixed(2)},
{l:'Maxima',v:'R$ '+(stock.regularMarketDayHigh||0).toFixed(2)},
{l:'Minima',v:'R$ '+(stock.regularMarketDayLow||0).toFixed(2)},
{l:'Volume',v:fmtVol(stock.regularMarketVolume||0)},
{l:'Market Cap',v:fmtMktCap(stock.marketCap||0)},
{l:'Min 52 Sem',v:'R$ '+(stock.fiftyTwoWeekLow||0).toFixed(2)},
{l:'Max 52 Sem',v:'R$ '+(stock.fiftyTwoWeekHigh||0).toFixed(2)},
{l:'Fech. Ant.',v:'R$ '+(stock.regularMarketPreviousClose||0).toFixed(2)}
];

var kh='';
kpis.forEach(function(k){
kh+='<div class="b3-kpi"><div class="b3-kpi-label">'+k.l+'</div><div class="b3-kpi-value">'+k.v+'</div></div>';
});
var kpisEl=_b3('b3KPIs');if(kpisEl)kpisEl.innerHTML=kh;

// GRÁFICO
renderB3Chart(hist,stock.symbol||'',range);

// ============================================
// MEGA UPGRADE: DETECÇÃO DE TIPO + ROTEAMENTO
// ============================================
var _assetType=detectAssetType(stock.symbol||'');
var _typeLabels={'acao':'\u{1F4C8} Ação','fii':'\u{1F3E2} FII','etf':'\u{1F4CA} ETF','bdr':'\u{1F30D} BDR'};
var _typeColors={'acao':'#8B5CF6','fii':'#22C55E','etf':'#7C5CFC','bdr':'#F59E0B'};

// Badge de tipo de ativo (mostrar logo após KPIs)
var typeBadge='<div style="display:flex;align-items:center;gap:8px;margin:12px 0 16px;padding:8px 14px;background:'+_typeColors[_assetType]+'15;border:1px solid '+_typeColors[_assetType]+'33;border-radius:10px;width:fit-content">';
typeBadge+='<span style="font-size:1.2em">'+(_typeLabels[_assetType]||'\u{1F4C8} Ação')+'</span>';
typeBadge+='<span style="font-size:.75em;color:'+_typeColors[_assetType]+';font-weight:700">Análise especializada para '+(_assetType==='fii'?'Fundos Imobiliários':_assetType==='etf'?'Fundos de Índice':_assetType==='bdr'?'BDRs (Ações Internacionais)':'Ações')+'</span></div>';
if(kpisEl)kpisEl.insertAdjacentHTML('afterend',typeBadge);

// FUNDAMENTALISTAS + ANÁLISE POR TIPO (EXTRAÇÃO ROBUSTA)
var fd=stock.financialData||{};
var dks=stock.defaultKeyStatistics||{};
var ss=stock.summaryStatistics||{};

// P/L - múltiplas fontes
var pe=stock.priceEarnings||fd.trailingPE||dks.trailingPE||dks.forwardPE||0;

// LPA (Earnings Per Share) - múltiplas fontes
var eps=stock.earningsPerShare||dks.trailingEps||0;
if(!eps&&pe>0&&price>0)eps=price/pe; // calcular se possível

// VPA (Book Value Per Share) - CRÍTICO para Graham
var vpa=0;
if(dks.bookValue)vpa=dks.bookValue;
else if(stock.bookValue)vpa=stock.bookValue;
else if(stock.priceToBookRatio&&stock.priceToBookRatio>0&&price>0)vpa=price/stock.priceToBookRatio;

// P/VP - múltiplas fontes
var pvp=stock.priceToBookRatio||dks.priceToBook||0;
if(!pvp&&vpa>0&&price>0)pvp=price/vpa; // calcular se possível

// ROE - múltiplas fontes
var roe=0;
if(fd.returnOnEquity)roe=fd.returnOnEquity>1?fd.returnOnEquity:fd.returnOnEquity*100;
else if(dks.returnOnEquity)roe=dks.returnOnEquity>1?dks.returnOnEquity:dks.returnOnEquity*100;
else if(eps>0&&vpa>0)roe=(eps/vpa)*100; // ROE = LPA/VPA

// DY - múltiplas fontes + cálculo via dividendsData
var dy=stock.dividendYield||dks.yield||0;
if(dy>0&&dy<1)dy=dy*100;
// Se DY ainda é 0, calcular via dividendsData
var divsData=stock.dividendsData&&stock.dividendsData.cashDividends;
if((!dy||dy===0)&&divsData&&Array.isArray(divsData)){
var now=new Date();
var oneYearAgo=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());
var totalDiv12m=0;
divsData.forEach(function(d){
var dDate=new Date(d.paymentDate||d.approvedDate||d.lastDatePrior);
if(dDate>=oneYearAgo){totalDiv12m+=d.value||d.rate||0;}
});
if(totalDiv12m>0&&price>0){dy=(totalDiv12m/price)*100;}
}

// Margem Líquida
var margLiq=0;
if(fd.profitMargins)margLiq=fd.profitMargins>1?fd.profitMargins:fd.profitMargins*100;

// Margem Operacional
var margOp=0;
if(fd.operatingMargins)margOp=fd.operatingMargins>1?fd.operatingMargins:fd.operatingMargins*100;

// Dívida/PL
var divPL=fd.debtToEquity||0;

// Liquidez Corrente
var liqCorr=fd.currentRatio||0;

// Market Cap
var mktCap=stock.marketCap||0;

// Volume
var vol=stock.regularMarketVolume||0;

// Receita Total
var receita=fd.totalRevenue||0;

// Free Cash Flow
var fcf=fd.freeCashflow||0;

// ============================================
// LOG DE DEBUG (só em dev)
// ============================================
console.log('[Sibanki] Indicadores extraídos para '+stock.symbol+':',{pe:pe,eps:eps,vpa:vpa,pvp:pvp,roe:roe,dy:dy,margLiq:margLiq,divPL:divPL,liqCorr:liqCorr});

var hasFund=(pe||eps||dy||pvp||vpa||roe||liqCorr||margLiq||_assetType!=='acao');

if(hasFund){
var b3FundEl=_b3('b3Fund');if(b3FundEl)b3FundEl.style.display='block';
var fg='';

// ====== FII ======
if(_assetType==='fii'){
// Indicadores básicos relevantes para FII
if(pvp)fg+='<div class="b3-fund-item"><div class="b3-fund-label">P/VP</div><div class="b3-fund-value">'+pvp.toFixed(2)+'</div><div style="font-size:.65em;color:var(--t3);margin-top:4px">'+(pvp<1?'\u{1F7E2} Desconto':pvp<1.1?'\u{1F7E1} Justo':'\u{1F534} Ágio')+'</div></div>';
if(dy)fg+='<div class="b3-fund-item"><div class="b3-fund-label">DY Anual</div><div class="b3-fund-value" style="color:'+(dy>=6?'#22C55E':dy>=3?'#EAB308':'var(--t1)')+'">'+dy.toFixed(2)+'%</div></div>';
if(stock.marketCap)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Patrimônio</div><div class="b3-fund-value">'+fmtMktCap(stock.marketCap)+'</div></div>';
fg=renderFIIAnalysis(stock,price,fg);
}

// ====== ETF ======
else if(_assetType==='etf'){
if(stock.marketCap)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Patrimônio</div><div class="b3-fund-value">'+fmtMktCap(stock.marketCap)+'</div></div>';
if(dy)fg+='<div class="b3-fund-item"><div class="b3-fund-label">DY</div><div class="b3-fund-value">'+dy.toFixed(2)+'%</div></div>';
fg=renderETFAnalysis(stock,price,fg);
}

// ====== BDR ======
else if(_assetType==='bdr'){
if(pe)fg+='<div class="b3-fund-item"><div class="b3-fund-label">P/L</div><div class="b3-fund-value">'+pe.toFixed(2)+'</div><div style="font-size:.65em;color:var(--t3);margin-top:4px">'+(pe<10?'\u{1F7E2} Barato':pe<15?'\u{1F7E2} Atrativo':pe<25?'\u{1F7E1} Moderado':'\u{1F534} Caro')+'</div></div>';
if(dy)fg+='<div class="b3-fund-item"><div class="b3-fund-label">DY</div><div class="b3-fund-value">'+dy.toFixed(2)+'%</div></div>';
if(pvp)fg+='<div class="b3-fund-item"><div class="b3-fund-label">P/VP</div><div class="b3-fund-value">'+pvp.toFixed(2)+'</div></div>';
if(roe)fg+='<div class="b3-fund-item"><div class="b3-fund-label">ROE</div><div class="b3-fund-value" style="color:'+(roe>=15?'#22C55E':roe>=8?'#EAB308':'#EF4444')+'">'+roe.toFixed(1)+'%</div></div>';
fg=renderBDRAnalysis(stock,price,fg);
}

// ====== AÇÃO (mantém análise original completa) ======
else{
// --- INDICADORES BÁSICOS (CORRIGIDOS) ---
if(pe)fg+='<div class="b3-fund-item"><div class="b3-fund-label">P/L</div><div class="b3-fund-value">'+pe.toFixed(2)+'</div><div style="font-size:.65em;color:var(--t3);margin-top:4px">'+(pe<10?'\u{1F7E2} Barato':pe<15?'\u{1F7E2} Atrativo':pe<25?'\u{1F7E1} Moderado':'\u{1F534} Caro')+'</div></div>';
if(eps)fg+='<div class="b3-fund-item"><div class="b3-fund-label">LPA</div><div class="b3-fund-value">R$ '+eps.toFixed(2)+'</div></div>';
if(vpa)fg+='<div class="b3-fund-item"><div class="b3-fund-label">VPA</div><div class="b3-fund-value">R$ '+vpa.toFixed(2)+'</div></div>';
if(pvp)fg+='<div class="b3-fund-item"><div class="b3-fund-label">P/VP</div><div class="b3-fund-value">'+pvp.toFixed(2)+'</div><div style="font-size:.65em;color:var(--t3);margin-top:4px">'+(pvp<1?'\u{1F7E2} Abaixo do VP':pvp<1.5?'\u{1F7E1} Justo':'\u{1F534} Acima do VP')+'</div></div>';
if(dy)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Dividend Yield</div><div class="b3-fund-value" style="color:'+(dy>=6?'#22C55E':dy>=3?'#EAB308':'var(--t1)')+'">'+dy.toFixed(2)+'%</div></div>';
if(roe)fg+='<div class="b3-fund-item"><div class="b3-fund-label">ROE</div><div class="b3-fund-value" style="color:'+(roe>=15?'#22C55E':roe>=8?'#EAB308':'#EF4444')+'">'+roe.toFixed(1)+'%</div></div>';
if(margLiq)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Margem Líquida</div><div class="b3-fund-value" style="color:'+(margLiq>15?'#22C55E':margLiq>0?'#EAB308':'#EF4444')+'">'+margLiq.toFixed(1)+'%</div></div>';
if(margOp)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Margem Operacional</div><div class="b3-fund-value" style="color:'+(margOp>15?'#22C55E':margOp>0?'#EAB308':'#EF4444')+'">'+margOp.toFixed(1)+'%</div></div>';
if(mktCap)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Market Cap</div><div class="b3-fund-value">'+fmtMktCap(mktCap)+'</div></div>';
if(liqCorr)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Liquidez Corrente</div><div class="b3-fund-value" style="color:'+(liqCorr>=1.5?'#22C55E':liqCorr>=1?'#EAB308':'#EF4444')+'">'+liqCorr.toFixed(2)+'</div></div>';
if(divPL)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Dívida/PL</div><div class="b3-fund-value" style="color:'+(divPL<50?'#22C55E':divPL<100?'#EAB308':'#EF4444')+'">'+divPL.toFixed(0)+'%</div></div>';
if(receita)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Receita Total</div><div class="b3-fund-value">'+fmtMktCap(receita)+'</div></div>';
if(fcf)fg+='<div class="b3-fund-item"><div class="b3-fund-label">Free Cash Flow</div><div class="b3-fund-value" style="color:'+(fcf>0?'#22C55E':'#EF4444')+'">'+fmtMktCap(fcf)+'</div></div>';
// --- GRAHAM (FÓRMULA CORRETA: √(22.5 × LPA × VPA)) ---
var grahamOk=(eps>0&&vpa>0);
var grahamPrice=0;
if(grahamOk){
grahamPrice=Math.sqrt(22.5*eps*vpa);
if(isNaN(grahamPrice)||!isFinite(grahamPrice))grahamPrice=0;
}
var grahamUpside=grahamPrice>0?((grahamPrice-price)/price*100):0;

fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(34,197,94,.02));border-color:rgba(34,197,94,.3)">';
fg+='<div class="b3-fund-label">\u{1F4D7} GRAHAM - Preço Justo</div>';
if(grahamPrice>0){
fg+='<div class="b3-fund-value" style="font-size:1.4em;color:'+(grahamUpside>0?'#22C55E':'#EF4444')+'">R$ '+grahamPrice.toFixed(2)+'</div>';
fg+='<div style="font-size:.75em;margin-top:4px;color:'+(grahamUpside>0?'#22C55E':'#EF4444')+';font-weight:700">'+(grahamUpside>0?'\u2B06 Upside de ':'⬇ Downside de ')+Math.abs(grahamUpside).toFixed(1)+'%</div>';
fg+='<div style="font-size:.68em;color:var(--t3);margin-top:6px">Fórmula: √(22,5 × LPA × VPA) | LPA: R$ '+eps.toFixed(2)+' | VPA: R$ '+vpa.toFixed(2)+'</div>';
}else{
fg+='<div style="font-size:.8em;color:var(--t3);margin-top:4px">Dados insuficientes para calcular</div>';
}
fg+='</div>';

// --- BAZIN ---
var bazinPrice=0;
if(dy>0&&price>0){
var divPerShare=(dy/100)*price;
bazinPrice=divPerShare/0.06; // Bazin: DY mínimo de 6%
}
var bazinUpside=bazinPrice>0?((bazinPrice-price)/price*100):0;

fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(79,140,255,.08),rgba(79,140,255,.02));border-color:rgba(79,140,255,.3)">';
fg+='<div class="b3-fund-label">\u{1F4D8} BAZIN - Preço Teto (DY 6%)</div>';
if(bazinPrice>0){
fg+='<div class="b3-fund-value" style="font-size:1.4em;color:'+(bazinUpside>0?'#22C55E':'#EF4444')+'">R$ '+bazinPrice.toFixed(2)+'</div>';
fg+='<div style="font-size:.75em;margin-top:4px;color:'+(bazinUpside>0?'#22C55E':'#EF4444')+';font-weight:700">'+(bazinUpside>0?'\u2B06 Margem de ':'⬇ Acima do teto em ')+Math.abs(bazinUpside).toFixed(1)+'%</div>';
fg+='<div style="font-size:.68em;color:var(--t3);margin-top:6px">Fórmula: Dividendo/Ação ÷ 0,06 | DY atual: '+dy.toFixed(2)+'% '+(dy>=6?'\u{1F7E2} Bom pagador':'\u{1F7E1} DY abaixo de 6%')+'</div>';
}else{
fg+='<div style="font-size:.8em;color:var(--t3);margin-top:4px">Dados de dividendos podem estar limitados para este ativo.</div>';
}
fg+='</div>';

// --- LYNCH ---
fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(124,92,252,.08),rgba(124,92,252,.02));border-color:rgba(124,92,252,.3)">';
fg+='<div class="b3-fund-label">\u{1F4D9} PETER LYNCH - Análise</div>';
var lynchItems=[];
var lynchScore=0;

if(pe>0&&pe<15){lynchScore+=30;lynchItems.push('\u{1F7E2} P/L baixo ('+pe.toFixed(1)+') - Ótimo')}
else if(pe>0&&pe<25){lynchScore+=15;lynchItems.push('\u{1F7E1} P/L moderado ('+pe.toFixed(1)+')')}
else if(pe>0){lynchScore+=5;lynchItems.push('\u{1F534} P/L alto ('+pe.toFixed(1)+')')}

if(dy>=3){lynchScore+=20;lynchItems.push('\u{1F7E2} Bons dividendos ('+dy.toFixed(1)+'%)')}
else if(dy>0){lynchScore+=10;lynchItems.push('\u{1F7E1} Dividendos modestos ('+dy.toFixed(1)+'%)')}

if(roe>=15){lynchScore+=25;lynchItems.push('\u{1F7E2} ROE excelente ('+roe.toFixed(1)+'%)')}
else if(roe>=8){lynchScore+=15;lynchItems.push('\u{1F7E1} ROE razoável ('+roe.toFixed(1)+'%)')}
else if(roe>0){lynchScore+=5;lynchItems.push('\u{1F534} ROE fraco ('+roe.toFixed(1)+'%)')}

if(fd.currentRatio>=1.5){lynchScore+=15;lynchItems.push('\u{1F7E2} Boa liquidez ('+fd.currentRatio.toFixed(2)+')')}
else if(fd.currentRatio>=1){lynchScore+=8;lynchItems.push('\u{1F7E1} Liquidez OK ('+fd.currentRatio.toFixed(2)+')')}
else if(fd.currentRatio>0){lynchScore+=0;lynchItems.push('\u{1F534} Liquidez baixa ('+fd.currentRatio.toFixed(2)+')')}

if(fd.debtToEquity&&fd.debtToEquity<50){lynchScore+=10;lynchItems.push('\u{1F7E2} Baixo endividamento')}
else if(fd.debtToEquity&&fd.debtToEquity<100){lynchScore+=5;lynchItems.push('\u{1F7E1} Endividamento moderado')}
else if(fd.debtToEquity){lynchItems.push('\u{1F534} Alto endividamento')}

var lynchVerdict=lynchScore>=70?'COMPRAR':lynchScore>=40?'ANALISAR':'CAUTELA';
var lynchColor=lynchScore>=70?'#22C55E':lynchScore>=40?'#EAB308':'#EF4444';

fg+='<div style="display:flex;align-items:center;gap:12px;margin:8px 0"><div style="font-size:1.4em;font-weight:900;color:'+lynchColor+'">'+lynchVerdict+'</div><div style="font-size:.85em;color:var(--t2)">Score: '+lynchScore+'/100</div></div>';
fg+='<div style="height:6px;background:var(--bg2);border-radius:4px;margin:8px 0;overflow:hidden"><div style="height:100%;width:'+lynchScore+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:4px;transition:width .6s"></div></div>';
fg+='<div style="font-size:.78em;color:var(--t2);line-height:1.8">'+lynchItems.join('<br>')+'</div>';
fg+='</div>';

// --- WARREN BUFFETT - Análise Completa ---
fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(245,158,11,.02));border-color:rgba(245,158,11,.3);padding:16px">';
fg+='<div class="b3-fund-label" style="font-size:.85em;margin-bottom:12px">\u{1F4D5} WARREN BUFFETT - Os 4 Pilares</div>';

var buffScore=0;

// === PILAR 1: MOAT ECONÔMICO (0-25 pts) ===
var moatScore=0;var moatItems=[];
if(roe>=20){moatScore+=10;moatItems.push('\u{1F7E2} ROE excelente ('+roe.toFixed(1)+'%) — forte vantagem competitiva')}
else if(roe>=15){moatScore+=7;moatItems.push('\u{1F7E2} ROE bom ('+roe.toFixed(1)+'%) — vantagem competitiva')}
else if(roe>=10){moatScore+=4;moatItems.push('\u{1F7E1} ROE moderado ('+roe.toFixed(1)+'%)')}
else if(roe>0){moatScore+=1;moatItems.push('\u{1F534} ROE fraco ('+roe.toFixed(1)+'%) — sem moat evidente')}
var ml=fd.profitMargins?fd.profitMargins*100:0;
if(ml>=20){moatScore+=8;moatItems.push('\u{1F7E2} Margem líq. alta ('+ml.toFixed(1)+'%) — pricing power')}
else if(ml>=10){moatScore+=5;moatItems.push('\u{1F7E2} Margem líq. boa ('+ml.toFixed(1)+'%)')}
else if(ml>0){moatScore+=2;moatItems.push('\u{1F7E1} Margem líq. baixa ('+ml.toFixed(1)+'%)')}
var mo=fd.operatingMargins?fd.operatingMargins*100:0;
if(mo>=20){moatScore+=7;moatItems.push('\u{1F7E2} Margem oper. alta ('+mo.toFixed(1)+'%)')}
else if(mo>=12){moatScore+=4;moatItems.push('\u{1F7E1} Margem oper. ok ('+mo.toFixed(1)+'%)')}
else if(mo>0){moatScore+=1;moatItems.push('\u{1F534} Margem oper. baixa ('+mo.toFixed(1)+'%)')}
moatScore=Math.min(25,moatScore);buffScore+=moatScore;

// === PILAR 2: QUALIDADE DA GESTÃO (0-25 pts) ===
var mgtScore=0;var mgtItems=[];
if(roe>=20&&fd.debtToEquity&&fd.debtToEquity<80){mgtScore+=10;mgtItems.push('\u{1F7E2} ROE alto + dívida controlada — gestão excepcional')}
else if(roe>=15){mgtScore+=6;mgtItems.push('\u{1F7E2} ROE indica boa gestão')}
else if(roe>=8){mgtScore+=3;mgtItems.push('\u{1F7E1} Gestão mediana')}
var revGrow=fd.revenueGrowth?fd.revenueGrowth*100:0;
if(revGrow>15){mgtScore+=8;mgtItems.push('\u{1F7E2} Receita crescendo '+revGrow.toFixed(1)+'%')}
else if(revGrow>5){mgtScore+=5;mgtItems.push('\u{1F7E2} Receita crescendo '+revGrow.toFixed(1)+'%')}
else if(revGrow>0){mgtScore+=2;mgtItems.push('\u{1F7E1} Receita estagnada ('+revGrow.toFixed(1)+'%)')}
else if(revGrow<0){mgtItems.push('\u{1F534} Receita caindo ('+revGrow.toFixed(1)+'%)')}
var earGrow=fd.earningsGrowth?fd.earningsGrowth*100:0;
if(earGrow>20){mgtScore+=7;mgtItems.push('\u{1F7E2} Lucros crescendo '+earGrow.toFixed(1)+'%')}
else if(earGrow>5){mgtScore+=4;mgtItems.push('\u{1F7E2} Lucros crescendo '+earGrow.toFixed(1)+'%')}
else if(earGrow>0){mgtScore+=2;mgtItems.push('\u{1F7E1} Lucros estáveis')}
else if(earGrow<0){mgtItems.push('\u{1F534} Lucros caindo ('+earGrow.toFixed(1)+'%)')}
mgtScore=Math.min(25,mgtScore);buffScore+=mgtScore;

// === PILAR 3: SAÚDE FINANCEIRA (0-25 pts) ===
var finScore=0;var finItems=[];
if(fd.debtToEquity&&fd.debtToEquity<30){finScore+=10;finItems.push('\u{1F7E2} Dívida/PL muito baixa ('+fd.debtToEquity.toFixed(0)+'%) — fortaleza')}
else if(fd.debtToEquity&&fd.debtToEquity<50){finScore+=7;finItems.push('\u{1F7E2} Dívida/PL controlada ('+fd.debtToEquity.toFixed(0)+'%)')}
else if(fd.debtToEquity&&fd.debtToEquity<100){finScore+=3;finItems.push('\u{1F7E1} Dívida/PL moderada ('+fd.debtToEquity.toFixed(0)+'%)')}
else if(fd.debtToEquity){finItems.push('\u{1F534} Dívida/PL alta ('+fd.debtToEquity.toFixed(0)+'%)')}
if(fd.currentRatio>=2){finScore+=7;finItems.push('\u{1F7E2} Liquidez excelente ('+fd.currentRatio.toFixed(2)+')')}
else if(fd.currentRatio>=1.5){finScore+=5;finItems.push('\u{1F7E2} Boa liquidez ('+fd.currentRatio.toFixed(2)+')')}
else if(fd.currentRatio>=1){finScore+=2;finItems.push('\u{1F7E1} Liquidez apertada ('+fd.currentRatio.toFixed(2)+')')}
else if(fd.currentRatio>0){finItems.push('\u{1F534} Liquidez baixa ('+fd.currentRatio.toFixed(2)+')')}
var fcf=fd.freeCashflow||0;
if(fcf>0){var fcfBi=fcf/1e9;finScore+=8;finItems.push('\u{1F7E2} FCF positivo (R$ '+(fcfBi>=1?fcfBi.toFixed(1)+' bi':(fcf/1e6).toFixed(0)+' mi')+')')}
else if(fcf<0){finItems.push('\u{1F534} FCF negativo — queima caixa')}
else{finItems.push('\u{26A0}\u{FE0F} FCF indisponível')}
finScore=Math.min(25,finScore);buffScore+=finScore;

// === PILAR 4: MARGEM DE SEGURANÇA (0-25 pts) ===
var mosScore=0;var mosItems=[];
var ownerEarnings=fd.operatingCashflow||fcf||0;
var intrinsicValue=0;
if(ownerEarnings>0&&stock.marketCap&&stock.marketCap>0){
var shares=stock.marketCap/price;
var ownerPerShare=ownerEarnings/shares;
intrinsicValue=ownerPerShare*12;
var buffUpside=((intrinsicValue-price)/price*100);
if(buffUpside>30){mosScore+=12;mosItems.push('\u{1F7E2} Valor intrínseco R$ '+intrinsicValue.toFixed(2)+' — desconto de '+buffUpside.toFixed(0)+'%!')}
else if(buffUpside>10){mosScore+=8;mosItems.push('\u{1F7E2} Valor intrínseco R$ '+intrinsicValue.toFixed(2)+' — desconto de '+buffUpside.toFixed(0)+'%')}
else if(buffUpside>0){mosScore+=4;mosItems.push('\u{1F7E1} Valor intrínseco R$ '+intrinsicValue.toFixed(2)+' — margem de '+buffUpside.toFixed(0)+'%')}
else{mosScore+=1;mosItems.push('\u{1F534} Valor intrínseco R$ '+intrinsicValue.toFixed(2)+' — acima do justo ('+buffUpside.toFixed(0)+'%)')}
}else{mosItems.push('\u{26A0}\u{FE0F} Valor intrínseco indisponível (sem cashflow)')}
if(pe>0&&pe<12){mosScore+=7;mosItems.push('\u{1F7E2} P/L muito baixo ('+pe.toFixed(1)+') — barganha')}
else if(pe>0&&pe<15){mosScore+=5;mosItems.push('\u{1F7E2} P/L bom ('+pe.toFixed(1)+')')}
else if(pe>0&&pe<20){mosScore+=2;mosItems.push('\u{1F7E1} P/L aceitável ('+pe.toFixed(1)+')')}
else if(pe>0){mosItems.push('\u{1F534} P/L caro ('+pe.toFixed(1)+')')}
if(grahamUpside>30){mosScore+=6;mosItems.push('\u{1F7E2} Graham confirma desconto ('+grahamUpside.toFixed(0)+'%)')}
else if(grahamUpside>10){mosScore+=3;mosItems.push('\u{1F7E1} Graham margem moderada ('+grahamUpside.toFixed(0)+'%)')}
mosScore=Math.min(25,mosScore);buffScore+=mosScore;

// VEREDICTO
buffScore=Math.min(100,Math.max(0,buffScore));
var buffVerdict=buffScore>=75?'COMPRAR':buffScore>=50?'ANALISAR':buffScore>=30?'CAUTELA':'EVITAR';
var buffColor=buffScore>=75?'#22C55E':buffScore>=50?'#EAB308':buffScore>=30?'#F59E0B':'#EF4444';

fg+='<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">';
fg+='<div style="font-size:2em;font-weight:900;color:'+buffColor+'">'+buffVerdict+'</div>';
fg+='<div style="flex:1"><div style="font-size:.85em;color:var(--t2)">Score Buffett: <strong style="color:'+buffColor+'">'+buffScore+'/100</strong></div>';
fg+='<div style="height:8px;background:var(--bg2);border-radius:4px;margin-top:6px;overflow:hidden"><div style="height:100%;width:'+buffScore+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:4px;transition:width .8s ease"></div></div></div></div>';

// 4 Pilares visuais
fg+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0">';
var moatColor=moatScore>=18?'#22C55E':moatScore>=10?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+moatColor+'33"><div style="font-size:1.2em;margin-bottom:4px">\u{1F3F0}</div><div style="font-size:.7em;color:var(--t3)">Moat</div><div style="font-size:1.3em;font-weight:900;color:'+moatColor+'">'+moatScore+'/25</div></div>';
var mgtColor=mgtScore>=18?'#22C55E':mgtScore>=10?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+mgtColor+'33"><div style="font-size:1.2em;margin-bottom:4px">\u{1F464}</div><div style="font-size:.7em;color:var(--t3)">Gestão</div><div style="font-size:1.3em;font-weight:900;color:'+mgtColor+'">'+mgtScore+'/25</div></div>';
var finColor2=finScore>=18?'#22C55E':finScore>=10?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+finColor2+'33"><div style="font-size:1.2em;margin-bottom:4px">\u{1F4B0}</div><div style="font-size:.7em;color:var(--t3)">Saúde Fin.</div><div style="font-size:1.3em;font-weight:900;color:'+finColor2+'">'+finScore+'/25</div></div>';
var mosColor=mosScore>=18?'#22C55E':mosScore>=10?'#EAB308':'#EF4444';
fg+='<div style="background:var(--bg2);border-radius:10px;padding:12px;text-align:center;border:1px solid '+mosColor+'33"><div style="font-size:1.2em;margin-bottom:4px">\u{1F6E1}\u{FE0F}</div><div style="font-size:.7em;color:var(--t3)">Margem Seg.</div><div style="font-size:1.3em;font-weight:900;color:'+mosColor+'">'+mosScore+'/25</div></div>';
fg+='</div>';

// Detalhes expandíveis
fg+='<details style="margin-top:8px"><summary style="cursor:pointer;font-size:.78em;color:var(--pri);font-weight:600">Ver análise detalhada dos 4 pilares ▼</summary>';
fg+='<div style="margin-top:12px;font-size:.76em;color:var(--t2);line-height:2">';
fg+='<div style="margin-bottom:12px"><strong style="color:var(--t1)">\u{1F3F0} Pilar 1 — Moat Econômico ('+moatScore+'/25)</strong><br>'+moatItems.join('<br>')+'</div>';
fg+='<div style="margin-bottom:12px"><strong style="color:var(--t1)">\u{1F464} Pilar 2 — Qualidade da Gestão ('+mgtScore+'/25)</strong><br>'+mgtItems.join('<br>')+'</div>';
fg+='<div style="margin-bottom:12px"><strong style="color:var(--t1)">\u{1F4B0} Pilar 3 — Saúde Financeira ('+finScore+'/25)</strong><br>'+finItems.join('<br>')+'</div>';
fg+='<div style="margin-bottom:12px"><strong style="color:var(--t1)">\u{1F6E1}\u{FE0F} Pilar 4 — Margem de Segurança ('+mosScore+'/25)</strong><br>'+mosItems.join('<br>')+'</div>';
fg+='<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:10px;margin-top:8px">';
fg+='<strong style="color:#F59E0B">Metodologia:</strong> "Compre empresas maravilhosas a preços justos." Os critérios avaliam: vantagem competitiva duradoura (moat), gestão competente, solidez financeira e preço abaixo do valor intrínseco calculado por Owner Earnings (FCO × 12x).';
fg+='</div></div></details>';

// Valor intrínseco em destaque
if(intrinsicValue>0){
var buffUp2=((intrinsicValue-price)/price*100);
fg+='<div style="margin-top:12px;background:var(--bg2);border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center">';
fg+='<div><div style="font-size:.7em;color:var(--t3)">Valor Intrínseco (Owner Earnings)</div>';
fg+='<div style="font-size:1.2em;font-weight:800;color:'+(buffUp2>0?'#22C55E':'#EF4444')+'">R$ '+intrinsicValue.toFixed(2)+'</div></div>';
fg+='<div style="text-align:right"><div style="font-size:.7em;color:var(--t3)">vs Preço Atual</div>';
fg+='<div style="font-size:1em;font-weight:700;color:'+(buffUp2>0?'#22C55E':'#EF4444')+'">'+(buffUp2>0?'\u2B06 ':'\u2B07 ')+Math.abs(buffUp2).toFixed(1)+'%</div></div>';
fg+='</div>';
}
fg+='</div>';


// --- SCORE SIBANKI GERAL (MELHORADO) ---
var score=0;
var scoreItems=[];

// P/L (peso: 15)
if(pe>0&&pe<10){score+=15;scoreItems.push('\u{1F7E2} P/L excelente ('+pe.toFixed(1)+')');}
else if(pe>0&&pe<15){score+=12;scoreItems.push('\u{1F7E2} P/L atrativo ('+pe.toFixed(1)+')');}
else if(pe>0&&pe<25){score+=8;scoreItems.push('\u{1F7E1} P/L moderado ('+pe.toFixed(1)+')');}
else if(pe>0){score+=3;scoreItems.push('\u{1F534} P/L alto ('+pe.toFixed(1)+')');}

// DY (peso: 15)
if(dy>=8){score+=15;scoreItems.push('\u{1F7E2} DY excelente ('+dy.toFixed(1)+'%)');}
else if(dy>=5){score+=12;scoreItems.push('\u{1F7E2} DY bom ('+dy.toFixed(1)+'%)');}
else if(dy>=2){score+=8;scoreItems.push('\u{1F7E1} DY razoável ('+dy.toFixed(1)+'%)');}
else if(dy>0){score+=3;scoreItems.push('\u{1F7E1} DY baixo ('+dy.toFixed(1)+'%)');}

// ROE (peso: 15)
if(roe>=20){score+=15;scoreItems.push('\u{1F7E2} ROE excepcional ('+roe.toFixed(1)+'%)');}
else if(roe>=15){score+=12;scoreItems.push('\u{1F7E2} ROE forte ('+roe.toFixed(1)+'%)');}
else if(roe>=8){score+=7;scoreItems.push('\u{1F7E1} ROE ok ('+roe.toFixed(1)+'%)');}
else if(roe>0){score+=3;scoreItems.push('\u{1F534} ROE fraco ('+roe.toFixed(1)+'%)');}

// Graham (peso: 15)
if(grahamUpside>30){score+=15;scoreItems.push('\u{1F7E2} Grande desconto Graham ('+grahamUpside.toFixed(0)+'%)');}
else if(grahamUpside>10){score+=12;scoreItems.push('\u{1F7E2} Desconto Graham ('+grahamUpside.toFixed(0)+'%)');}
else if(grahamUpside>0){score+=7;scoreItems.push('\u{1F7E1} Leve desconto Graham');}
else if(grahamPrice>0){score+=2;scoreItems.push('\u{1F534} Acima do Graham');}

// P/VP (peso: 10)
if(pvp>0&&pvp<0.8){score+=10;scoreItems.push('\u{1F7E2} P/VP muito baixo ('+pvp.toFixed(2)+')');}
else if(pvp>0&&pvp<1.2){score+=7;scoreItems.push('\u{1F7E2} P/VP justo ('+pvp.toFixed(2)+')');}
else if(pvp>0&&pvp<2){score+=4;scoreItems.push('\u{1F7E1} P/VP moderado ('+pvp.toFixed(2)+')');}
else if(pvp>0){score+=1;scoreItems.push('\u{1F534} P/VP alto ('+pvp.toFixed(2)+')');}

// Margem Líquida (peso: 10)
if(margLiq>20){score+=10;scoreItems.push('\u{1F7E2} Margem líquida alta ('+margLiq.toFixed(1)+'%)');}
else if(margLiq>10){score+=7;scoreItems.push('\u{1F7E2} Margem líquida boa');}
else if(margLiq>0){score+=3;scoreItems.push('\u{1F7E1} Margem líquida baixa');}

// Dívida/PL (peso: 10)
if(divPL>0&&divPL<30){score+=10;scoreItems.push('\u{1F7E2} Baixo endividamento ('+divPL.toFixed(0)+'%)');}
else if(divPL>0&&divPL<80){score+=7;scoreItems.push('\u{1F7E1} Endividamento moderado');}
else if(divPL>0){score+=2;scoreItems.push('\u{1F534} Alto endividamento ('+divPL.toFixed(0)+'%)');}

// Liquidez (peso: 5)
if(vol>5000000){score+=5;scoreItems.push('\u{1F7E2} Alta liquidez');}
else if(vol>1000000){score+=3;scoreItems.push('\u{1F7E1} Liquidez média');}
else{score+=1;scoreItems.push('\u{1F534} Baixa liquidez');}

// Posição 52 semanas (peso: 5)
var pos52=stock.fiftyTwoWeekHigh&&stock.fiftyTwoWeekLow?((price-stock.fiftyTwoWeekLow)/(stock.fiftyTwoWeekHigh-stock.fiftyTwoWeekLow)*100):50;
if(pos52<25){score+=5;scoreItems.push('\u{1F7E2} Próximo da mínima 52s');}
else if(pos52<50){score+=4;scoreItems.push('\u{1F7E2} Na metade inferior 52s');}
else if(pos52>85){score+=1;scoreItems.push('\u{1F534} Próximo da máxima 52s');}
else{score+=3;scoreItems.push('\u{1F7E1} No range médio 52s');}

score=Math.min(100,score);
var scoreVerdict=score>=75?'COMPRA FORTE':score>=55?'COMPRA':score>=40?'NEUTRO':score>=25?'CAUTELA':'VENDA';
var scoreColor=score>=75?'#22C55E':score>=55?'#22C55E':score>=40?'#EAB308':score>=25?'#F59E0B':'#EF4444';

fg+='<div class="b3-fund-item" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.04));border:2px solid '+scoreColor+'44;padding:20px">';
fg+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div class="b3-fund-label" style="margin:0">\u{1F3AF} SCORE SIBANKI</div><div style="font-size:2em;font-weight:900;color:'+scoreColor+'">'+scoreVerdict+'</div></div>';
fg+='<div style="display:flex;align-items:center;gap:16px"><div style="font-size:2.5em;font-weight:900;color:'+scoreColor+'">'+score+'<span style="font-size:.4em;color:var(--t3)">/100</span></div>';
fg+='<div style="flex:1"><div style="height:10px;background:var(--bg2);border-radius:5px;overflow:hidden"><div style="height:100%;width:'+score+'%;background:linear-gradient(90deg,#EF4444,#EAB308,#22C55E);border-radius:5px;transition:width .8s ease"></div></div></div></div>';
fg+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">';
scoreItems.forEach(function(item){
var itemColor=item.indexOf('\u{1F7E2}')>=0?'rgba(34,197,94,.1)':item.indexOf('\u{1F534}')>=0?'rgba(239,68,68,.1)':'rgba(234,179,8,.1)';
var itemBorder=item.indexOf('\u{1F7E2}')>=0?'rgba(34,197,94,.2)':item.indexOf('\u{1F534}')>=0?'rgba(239,68,68,.2)':'rgba(234,179,8,.2)';
fg+='<span style="font-size:.7em;padding:3px 8px;background:'+itemColor+';border:1px solid '+itemBorder+';border-radius:6px;color:var(--t2)">'+item+'</span>';
});
fg+='</div></div>';


} // fim else (ação)

var gridEl=_b3('b3FundGrid');if(gridEl)gridEl.innerHTML=fg;
}else{
var fe=_b3('b3Fund');if(fe)fe.style.display='none';
}

// PERFIL
var prof=stock.summaryProfile;
var profEl=_b3('b3Profile');
var profContent=_b3('b3ProfileContent');
if(prof&&prof.longBusinessSummary&&profEl&&profContent){
profEl.style.display='block';
var pc='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">';
if(prof.sector)pc+='<span style="background:var(--vr);color:#fff;padding:3px 10px;border-radius:6px;font-size:.75em;font-weight:600">'+prof.sector+'</span>';
if(prof.industry)pc+='<span style="background:var(--bg2);color:var(--t1);padding:3px 10px;border-radius:6px;font-size:.75em;border:1px solid var(--brd)">'+prof.industry+'</span>';
if(prof.city)pc+='<span style="font-size:.75em;color:var(--t3)">&#128205; '+prof.city+(prof.state?', '+prof.state:'')+'</span>';
if(prof.website)pc+='<a href="'+prof.website+'" target="_blank" style="font-size:.75em;color:var(--vr)">&#127760; Site</a>';
pc+='</div>';
var summary=prof.longBusinessSummary;
if(summary.length>500)summary=summary.substring(0,500)+'...';
pc+='<div style="font-size:.82em;color:var(--t2);line-height:1.7">'+summary+'</div>';
profContent.innerHTML=pc;
}else if(profEl){profEl.style.display='none';}

// RENDERIZAR NOVAS SEÇÕES
renderDividends(stock);
renderBalance(stock);
renderIncome(stock);

// Mostrar comparador e simulador se existem
var cmpEl=_b3('b3Compare');var simEl=_b3('b3DivSimulator');
if(cmpEl)cmpEl.style.display='block';if(simEl)simEl.style.display='block';

// Pre-preencher comparador com ticker atual
var cmp1=_b3('b3Compare1');
if(cmp1&&!cmp1.value)cmp1.value=stock.symbol||'';
}

function renderB3Chart(hist,symbol,range){
hist=Array.isArray(hist)?hist:[];
hist=hist.filter(function(h){return h&&(h.close!= null&&h.close!==undefined);});
var canvas=document.getElementById('b3Chart');
if(!canvas||!hist.length)return;
var ctx=canvas.getContext('2d');
var W=Math.max(200,(canvas.parentElement&&canvas.parentElement.clientWidth?canvas.parentElement.clientWidth:400)-32);
canvas.width=W;canvas.height=250;
ctx.clearRect(0,0,W,250);

var prices=hist.map(function(h){return Number(h.close);});
if(!prices.length)return;
var minP=Math.min.apply(null,prices);
var maxP=Math.max.apply(null,prices);
var rangeP=maxP-minP||1;
var padding={t:20,r:60,b:30,l:10};
var cW=W-padding.l-padding.r;
var cH=250-padding.t-padding.b;
var nPoints=Math.max(1,prices.length-1);

var isUp=prices[prices.length-1]>=prices[0];
var color=isUp?'#22C55E':'#EF4444';

// Grid lines
ctx.strokeStyle='rgba(128,128,128,.1)';
ctx.lineWidth=1;
for(var i=0;i<5;i++){
var y=padding.t+(cH/4)*i;
ctx.beginPath();ctx.moveTo(padding.l,y);ctx.lineTo(W-padding.r,y);ctx.stroke();
var val=maxP-(rangeP/4)*i;
ctx.fillStyle='rgba(128,128,128,.5)';ctx.font='10px Inter';ctx.textAlign='right';
ctx.fillText('R$'+val.toFixed(2),W-5,y+4);
}

// Line
ctx.beginPath();
ctx.strokeStyle=color;
ctx.lineWidth=2.5;
ctx.lineJoin='round';
prices.forEach(function(p,idx){
var x=padding.l+(cW/nPoints)*idx;
var y=padding.t+cH-(((p-minP)/rangeP)*cH);
if(idx===0)ctx.moveTo(x,y);
else ctx.lineTo(x,y);
});
ctx.stroke();

// Gradient fill
var gradient=ctx.createLinearGradient(0,padding.t,0,250-padding.b);
gradient.addColorStop(0,color+'40');
gradient.addColorStop(1,color+'05');
ctx.lineTo(padding.l+cW,250-padding.b);
ctx.lineTo(padding.l,250-padding.b);
ctx.closePath();
ctx.fillStyle=gradient;
ctx.fill();

// Current price dot
var lastX=padding.l+cW;
var lastY=padding.t+cH-(((prices[prices.length-1]-minP)/rangeP)*cH);
ctx.beginPath();ctx.arc(lastX,lastY,5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
ctx.beginPath();ctx.arc(lastX,lastY,8,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();

// Labels
if(hist.length>0){
var dates=hist.map(function(h){
var d=new Date((h.date!= null?h.date:0)*1000);
return (d.getDate())+'/'+(d.getMonth()+1);
});
ctx.fillStyle='rgba(128,128,128,.5)';ctx.font='9px Inter';ctx.textAlign='center';
var step=Math.max(1,Math.floor(dates.length/6));
var dateStep=Math.max(1,dates.length-1);
for(var i=0;i<dates.length;i+=step){
var x=padding.l+(cW/dateStep)*i;
ctx.fillText(dates[i],x,250-5);
}
}
}

function fmtVol(v){
if(v>=1e9)return(v/1e9).toFixed(1)+'B';
if(v>=1e6)return(v/1e6).toFixed(1)+'M';
if(v>=1e3)return(v/1e3).toFixed(0)+'K';
return v.toString();
}

function fmtMktCap(v){
if(v>=1e12)return'R$ '+(v/1e12).toFixed(1)+'T';
if(v>=1e9)return'R$ '+(v/1e9).toFixed(1)+'B';
if(v>=1e6)return'R$ '+(v/1e6).toFixed(0)+'M';
return'R$ '+v.toFixed(0);
}

// WATCHLIST
function loadWatchlist(){
try{watchlist=JSON.parse(localStorage.getItem('vrt_watchlist')||'[]')}catch(e){watchlist=[]}
renderWatchlist();
}

function addToWatchlist(){
var ticker=document.getElementById('b3Search').value.trim().toUpperCase();
if(!ticker){toast(typeof t==='function'?t('toast_pesquise_ativo'):'Pesquise um ativo primeiro','err');return}
if(watchlist.indexOf(ticker)>=0){toast(ticker+' já esta na watchlist','err');return}
if(watchlist.length>=20){toast(typeof t==='function'?t('toast_max_watchlist'):'Máximo 20 ativos na watchlist','err');return}
watchlist.push(ticker);
localStorage.setItem('vrt_watchlist',JSON.stringify(watchlist));
renderWatchlist();
toast(ticker+' adicionado a watchlist!','ok');
}

function toggleB3QuickAdd(){
var el=document.getElementById('b3QuickAdd');
if(!el)return;
var show=el.style.display==='none';
el.style.display=show?'block':'none';
if(show){
var accs=typeof userAccs!=='undefined'?userAccs:[];
var opts='<option value="">Não abater conta</option>'+accs.map(function(a){return '<option value="'+a+'">'+a+'</option>'}).join('');
var sel=document.getElementById('b3QuickConta');if(sel)sel.innerHTML=opts;
var ticker=(document.getElementById('b3Search')||{}).value.trim().toUpperCase();
var cached=ticker?b3Cache[ticker]:null;
var price=cached&&cached.stock?cached.stock.regularMarketPrice:0;
var hint=document.getElementById('b3QuickAddHint');
if(hint)hint.textContent=price>0?'Preço atual: R$ '+price.toFixed(2)+' — qtd será calculada automaticamente':'';
document.getElementById('b3QuickValor').value='';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}

function submitB3QuickAdd(){
var ticker=(document.getElementById('b3Search')||{}).value.trim().toUpperCase();
if(!ticker){toast(typeof t==='function'?t('toast_pesquise_ativo'):'Pesquise um ativo primeiro','err');return}
var cached=b3Cache[ticker];
if(!cached||!cached.stock){toast(typeof t==='function'?t('toast_dados_ativo_indisponiveis'):'Dados do ativo não disponíveis. Faça a busca novamente.','err');return}
var valor=parseFloat(document.getElementById('b3QuickValor').value);
if(!valor||valor<=0){toast(typeof t==='function'?t('toast_informe_valor_investido'):'Informe o valor investido','err');return}
var conta=document.getElementById('b3QuickConta').value||'';
var price=cached.stock.regularMarketPrice||0;
if(price<=0){toast(typeof t==='function'?t('toast_preco_ativo_indisponivel'):'Preço do ativo indisponível','err');return}
var _assetType=typeof detectAssetType==='function'?detectAssetType(ticker):'acao';
var tipoMap={'acao':'Ações','fii':'FIIs','etf':'ETFs','bdr':'Ações'};
var tipo=tipoMap[_assetType]||'Ações';
var qtd=Math.floor(valor/price);
var custoReal=Math.round(qtd*price*100)/100;
var date=new Date().toISOString().split('T')[0];
var obj={id:Date.now(),date:date,tipo:tipo,nome:ticker,valor:custoReal,atual:custoReal,precoCompra:Math.round(price*100)/100,qtd:qtd};
if(conta){
var entryId=Date.now()+1;
entries.push({id:entryId,date:date,type:'despesa',desc:'Aporte em '+ticker,category:'Investimentos',value:custoReal,account:conta,tags:['investimento'],status:'pago'});
obj.entryId=entryId;
}
investments.push(obj);
saveData();renderAll();
document.getElementById('b3QuickValor').value='';
document.getElementById('b3QuickAdd').style.display='none';
toast(conta?'Investimento registrado! Saída de R$ '+custoReal.toFixed(2).replace('.',',')+' na conta '+conta+'.':'Investimento registrado!','ok');
}

function rmWatchlist(ticker){
watchlist=watchlist.filter(function(t){return t!==ticker});
localStorage.setItem('vrt_watchlist',JSON.stringify(watchlist));
renderWatchlist();
}

function renderWatchlist(){
var el=document.getElementById('b3Watchlist');
if(!el)return;
if(!watchlist.length){
el.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.85em;padding:16px">Nenhum ativo na watchlist. Pesquise e adicione!</div>';
return;
}
var h='';
watchlist.forEach(function(ticker){
var cached=b3Cache[ticker];
if(cached&&cached.stock){
var s=cached.stock;
var isUp=(s.regularMarketChangePercent||0)>=0;
var arrow=isUp?'&#9650;':'&#9660;';
var cls=isUp?'b3-up':'b3-down';
h+='<div class="wl-item" onclick="quickB3(\''+ticker+'\')">'; 
h+='<div style="display:flex;align-items:center;gap:8px">';
h+='<img loading="lazy" src="'+(s.logourl||'')+'" style="width:28px;height:28px;border-radius:6px;background:#fff;padding:2px" onerror="this.style.display=\'none\'">';
h+='<div><div style="font-weight:700;font-size:.9em">'+ticker+'</div>';
h+='<div style="font-size:.7em;color:var(--t3)">'+(s.shortName||'')+'</div></div></div>';
h+='<div style="text-align:right;display:flex;align-items:center;gap:8px">';
h+='<div><div style="font-weight:700">R$ '+(s.regularMarketPrice||0).toFixed(2)+'</div>';
h+='<div class="'+cls+'" style="font-size:.78em;font-weight:600">'+arrow+' '+(s.regularMarketChangePercent||0).toFixed(2)+'%</div></div>';
h+='<button onclick="event.stopPropagation();rmWatchlist(\''+ticker+'\')\)" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:.9em;padding:4px" title="Remover">&#10060;</button>';
h+='</div></div>';
}else{
h+='<div class="wl-item" onclick="quickB3(\''+ticker+'\')">'; 
h+='<div style="font-weight:700">'+ticker+'</div>';
h+='<div style="font-size:.78em;color:var(--t3)">Clique para carregar</div>';
h+='<button onclick="event.stopPropagation();rmWatchlist(\''+ticker+'\')\)" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:.9em" title="Remover">&#10060;</button>';
h+='</div>';
}
});
el.innerHTML=h;
}

// ============================================
// ATUALIZAR COTAÇÕES DA CARTEIRA via Cloud Function
// ============================================
async function updateInvestQuotes(){
if(!investments||!investments.length){toast(typeof t==='function'?t('toast_nenhum_inv_atualizar'):'Nenhum investimento para atualizar','err');return}
var tickers=[];
investments.forEach(function(inv){
var name=(inv.nome||inv.name||'').toUpperCase().trim();
if(/^[A-Z]{4}[0-9]{1,2}$/.test(name)&&tickers.indexOf(name)<0)tickers.push(name);
});
if(!tickers.length){toast(typeof t==='function'?t('toast_nenhum_ticker_b3_encontrado'):'Nenhum ticker válido encontrado','err');return}

toast('Atualizando '+tickers.length+' cotação(ões)...','ok');

try{
var results;
if(brapiMultiFn){
try{
var resp=await brapiMultiFn({tickers:tickers});
results=resp.data.results||[];
}catch(cfErr){
console.warn('Cloud Function multi falhou, fallback:',cfErr);
var token=localStorage.getItem('vrt_b3token')||'';
if(!token){console.warn('Sem token brapi, tentando sem...');}
var url='https://brapi.dev/api/quote/'+tickers.join(',')+( token?'?token='+token:'');
var r=await fetch(url);
var json=await r.json();
results=json.results||[];
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var url='https://brapi.dev/api/quote/'+tickers.join(',')+( token?'?token='+token:'');
var r=await fetch(url);
var json=await r.json();
results=json.results||[];
}

var updated=0;
results.forEach(function(q){
investments.forEach(function(inv){
if((inv.nome||inv.name||'').toUpperCase()===q.symbol){
inv.currentValue=q.regularMarketPrice*( inv.quantity||1);
inv.quote=q.regularMarketPrice;
inv.changePercent=q.regularMarketChangePercent;
updated++;
}
});
});

if(updated>0){
saveData();
renderAll();
toast('\u{1F4C8} '+updated+' cotação(ões) atualizada(s)!','ok');
}else{
toast(typeof t==='function'?t('toast_nenhuma_cotacao'):'Nenhuma cotação encontrada','err');
}
}catch(e){
toast('Erro: '+e.message,'err');
}
}



// ============================================
// DIVIDENDOS HISTÓRICOS
// ============================================
function renderDividends(stock){
if(!stock||typeof stock!=='object')return;
var raw=stock.dividendsData&&stock.dividendsData.cashDividends;
var divs=Array.isArray(raw)?raw:[];
var el=document.getElementById('b3Dividends');
if(!el||!divs.length){if(el)el.style.display='none';return;}
el.style.display='block';

// Ordenar por data (mais recente primeiro)
divs.sort(function(a,b){return new Date(b.paymentDate||b.approvedDate)-new Date(a.paymentDate||a.approvedDate)});

// Calcular métricas
var price=stock.regularMarketPrice||1;
var total12m=0;
var now=new Date();
var oneYearAgo=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());

divs.forEach(function(d){
var dt=new Date(d.paymentDate||d.approvedDate);
if(dt>=oneYearAgo)total12m+=(d.rate||0);
});

var dy12m=price>0?(total12m/price*100):0;
var avgDiv=divs.length>0?divs.reduce(function(s,d){return s+(d.rate||0)},0)/divs.length:0;
var totalHist=divs.reduce(function(s,d){return s+(d.rate||0)},0);
var freqAnual=0;
var anos={};
divs.forEach(function(d){
var yr=new Date(d.paymentDate||d.approvedDate).getFullYear();
anos[yr]=(anos[yr]||0)+1;
});
var anosKeys=Object.keys(anos);
if(anosKeys.length>0)freqAnual=Math.round(divs.length/anosKeys.length);

// Badge DY
var badge=document.getElementById('b3DivYieldBadge');
if(badge){
badge.textContent='DY 12m: '+dy12m.toFixed(2)+'%';
badge.style.color=dy12m>=6?'#22C55E':dy12m>=3?'#EAB308':'var(--t2)';
badge.style.background=dy12m>=6?'rgba(34,197,94,.15)':dy12m>=3?'rgba(234,179,8,.15)':'rgba(148,163,184,.1)';
}

// Summary KPIs
var sh='';
sh+='<div class="b3-metric"><div class="b3-metric-label">DY 12 meses</div><div class="b3-metric-value" style="color:'+(dy12m>=6?'#22C55E':dy12m>=3?'#EAB308':'var(--t1)')+'">'+dy12m.toFixed(2)+'%</div><div class="b3-metric-sub">'+total12m.toFixed(2)+'/ação</div></div>';
sh+='<div class="b3-metric"><div class="b3-metric-label">Total Histórico</div><div class="b3-metric-value">R$ '+totalHist.toFixed(2)+'</div><div class="b3-metric-sub">'+divs.length+' pagamentos</div></div>';
sh+='<div class="b3-metric"><div class="b3-metric-label">Média/Pagamento</div><div class="b3-metric-value">R$ '+avgDiv.toFixed(4)+'</div></div>';
sh+='<div class="b3-metric"><div class="b3-metric-label">Frequência</div><div class="b3-metric-value">~'+freqAnual+'x/ano</div></div>';

// Yield on Cost (se investiu há 1 ano)
var hist52=stock.fiftyTwoWeekLow;
if(hist52&&hist52>0){
var yoc=(total12m/hist52*100);
sh+='<div class="b3-metric"><div class="b3-metric-label">YoC (mín 52s)</div><div class="b3-metric-value" style="color:#22C55E">'+yoc.toFixed(2)+'%</div><div class="b3-metric-sub">Se comprou na mín</div></div>';
}

// Payout estimado
if(stock.earningsPerShare&&stock.earningsPerShare>0){
var payout=(total12m/stock.earningsPerShare*100);
sh+='<div class="b3-metric"><div class="b3-metric-label">Payout Est.</div><div class="b3-metric-value" style="color:'+(payout>80?'#EF4444':payout>50?'#EAB308':'#22C55E')+'">'+payout.toFixed(0)+'%</div><div class="b3-metric-sub">'+(payout>80?'Alto':'Saudável')+'</div></div>';
}

var divSumEl=document.getElementById('b3DivSummary');
if(divSumEl)divSumEl.innerHTML=sh;

// Gráfico de dividendos por ano
renderDivChart(divs);

// Tabela
var th='<table class="fin-tbl"><thead><tr><th>Data Pgto</th><th>Tipo</th><th>Valor/Ação</th><th>Data Ex</th></tr></thead><tbody>';
divs.slice(0,50).forEach(function(d){
var dt=d.paymentDate?new Date(d.paymentDate).toLocaleDateString('pt-BR'):'—';
var dtEx=d.lastDatePrior?new Date(d.lastDatePrior).toLocaleDateString('pt-BR'):'—';
var tipo=d.label||'Dividendo';
th+='<tr><td>'+dt+'</td><td style="font-size:.78em">'+tipo+'</td><td class="positive">R$ '+(d.rate||0).toFixed(4)+'</td><td style="font-size:.78em;color:var(--t3)">'+dtEx+'</td></tr>';
});
th+='</tbody></table>';
if(divs.length>50)th+='<div style="text-align:center;color:var(--t3);font-size:.78em;padding:8px">Mostrando 50 de '+divs.length+' pagamentos</div>';
var divTblEl=document.getElementById('b3DivTable');
if(divTblEl)divTblEl.innerHTML=th;
}

function renderDivChart(divs){
var canvas=document.getElementById('b3DivChart');
if(!canvas)return;
var ctx=canvas.getContext('2d');
var W=canvas.parentElement.clientWidth-32;
canvas.width=W;canvas.height=180;
ctx.clearRect(0,0,W,180);

// Agrupar por ano
var byYear={};
divs.forEach(function(d){
var yr=new Date(d.paymentDate||d.approvedDate).getFullYear();
if(!isNaN(yr)){byYear[yr]=(byYear[yr]||0)+(d.rate||0)}
});

var years=Object.keys(byYear).sort();
if(years.length<2)return;

var vals=years.map(function(y){return byYear[y]});
var maxV=Math.max.apply(null,vals)||1;
var padding={t:20,r:10,b:35,l:10};
var cW=W-padding.l-padding.r;
var cH=180-padding.t-padding.b;
var barW=Math.min(40,cW/years.length-8);

years.forEach(function(yr,i){
var x=padding.l+(cW/years.length)*i+(cW/years.length-barW)/2;
var h=(vals[i]/maxV)*cH;
var y=padding.t+cH-h;

// Gradient bar
var grad=ctx.createLinearGradient(0,y,0,padding.t+cH);
grad.addColorStop(0,'#22C55E');
grad.addColorStop(1,'rgba(34,197,94,.3)');
ctx.fillStyle=grad;
ctx.beginPath();
ctx.roundRect(x,y,barW,h,3);
ctx.fill();

// Valor
ctx.fillStyle='#22C55E';ctx.font='bold 9px Inter';ctx.textAlign='center';
ctx.fillText('R$'+vals[i].toFixed(2),x+barW/2,y-5);

// Ano
ctx.fillStyle='rgba(128,128,128,.6)';ctx.font='10px Inter';
ctx.fillText(yr,x+barW/2,180-8);
});
}

// ============================================
// BALANÇO PATRIMONIAL
// ============================================
function renderBalance(stock){
if(!stock||typeof stock!=='object')return;
var bs=stock.balanceSheetHistory&&stock.balanceSheetHistory.balanceSheetStatements?stock.balanceSheetHistory.balanceSheetStatements:[];
var el=document.getElementById('b3Balance');
if(!el)return;
if(!bs.length){el.style.display='none';return;}
el.style.display='block';

var latest=bs[0];

// Summary
var sh='';
var items=[
{l:'Ativo Total',v:latest.totalAssets,fmt:true},
{l:'Passivo Total',v:latest.totalLiab,fmt:true},
{l:'Patrimônio Líquido',v:latest.totalStockholderEquity,fmt:true},
{l:'Caixa',v:latest.cash||latest.cashAndShortTermInvestments,fmt:true},
{l:'Dívida CP',v:latest.shortLongTermDebt||latest.shortTermDebt,fmt:true},
{l:'Dívida LP',v:latest.longTermDebt,fmt:true},
{l:'Ativo Circulante',v:latest.totalCurrentAssets,fmt:true},
{l:'Passivo Circulante',v:latest.totalCurrentLiabilities,fmt:true}
];

items.forEach(function(it){
if(it.v!==undefined&&it.v!==null){
var color='var(--t1)';
if(it.l==='Patrimônio Líquido')color=it.v>0?'#22C55E':'#EF4444';
if(it.l==='Caixa')color='#22C55E';
if(it.l.indexOf('Dívida')>=0)color=it.v>0?'#EF4444':'#22C55E';
sh+='<div class="b3-metric"><div class="b3-metric-label">'+it.l+'</div><div class="b3-metric-value" style="color:'+color+'">'+(it.fmt?fmtMktCap(Math.abs(it.v)):it.v)+'</div></div>';
}
});

// Indicadores derivados
if(latest.totalCurrentAssets&&latest.totalCurrentLiabilities&&latest.totalCurrentLiabilities>0){
var liqCorr=(latest.totalCurrentAssets/latest.totalCurrentLiabilities);
sh+='<div class="b3-metric"><div class="b3-metric-label">Liquidez Corrente</div><div class="b3-metric-value" style="color:'+(liqCorr>=1.5?'#22C55E':liqCorr>=1?'#EAB308':'#EF4444')+'">'+liqCorr.toFixed(2)+'</div></div>';
}
if(latest.totalLiab&&latest.totalStockholderEquity&&latest.totalStockholderEquity>0){
var divPl=(latest.totalLiab/latest.totalStockholderEquity);
sh+='<div class="b3-metric"><div class="b3-metric-label">Dívida/PL</div><div class="b3-metric-value" style="color:'+(divPl<0.5?'#22C55E':divPl<1?'#EAB308':'#EF4444')+'">'+divPl.toFixed(2)+'x</div></div>';
}

var sumEl=document.getElementById('b3BalanceSummary');
if(sumEl)sumEl.innerHTML=sh;

// Gráfico comparativo (barras horizontais)
renderBalanceChart(latest);

// Tabela histórica
var th='<table class="fin-tbl"><thead><tr><th>Período</th><th>Ativo Total</th><th>Passivo Total</th><th>PL</th><th>Caixa</th></tr></thead><tbody>';
bs.forEach(function(b){
var dt=b.endDate?new Date(b.endDate).toLocaleDateString('pt-BR',{year:'numeric',month:'short'}):'—';
th+='<tr><td style="font-weight:600">'+dt+'</td>';
th+='<td>'+fmtMktCap(b.totalAssets||0)+'</td>';
th+='<td>'+fmtMktCap(b.totalLiab||0)+'</td>';
th+='<td class="'+(b.totalStockholderEquity>0?'positive':'negative')+'">'+fmtMktCap(b.totalStockholderEquity||0)+'</td>';
th+='<td class="positive">'+fmtMktCap(b.cash||b.cashAndShortTermInvestments||0)+'</td></tr>';
});
th+='</tbody></table>';
var tblEl=document.getElementById('b3BalanceTable');
if(tblEl)tblEl.innerHTML=th;
}

function renderBalanceChart(bs){
var canvas=document.getElementById('b3BalanceChart');
if(!canvas)return;
var ctx=canvas.getContext('2d');
var W=canvas.parentElement.clientWidth-32;
canvas.width=W;canvas.height=200;
ctx.clearRect(0,0,W,200);

var data=[
{l:'Ativo Total',v:bs.totalAssets||0,c:'#4F8CFF'},
{l:'Passivo Total',v:bs.totalLiab||0,c:'#EF4444'},
{l:'Patrimônio Líq.',v:bs.totalStockholderEquity||0,c:'#22C55E'},
{l:'Caixa',v:bs.cash||bs.cashAndShortTermInvestments||0,c:'#06B6D4'},
{l:'Dívida LP',v:bs.longTermDebt||0,c:'#F59E0B'}
].filter(function(d){return d.v>0});

if(!data.length)return;
var maxV=Math.max.apply(null,data.map(function(d){return d.v}));
var barH=24;
var gap=12;
var startY=20;
var maxBarW=W-180;

data.forEach(function(d,i){
var y=startY+i*(barH+gap);
var w=Math.max(4,(d.v/maxV)*maxBarW);

// Bar
var grad=ctx.createLinearGradient(100,0,100+w,0);
grad.addColorStop(0,d.c);
grad.addColorStop(1,d.c+'80');
ctx.fillStyle=grad;
ctx.beginPath();
ctx.roundRect(100,y,w,barH,4);
ctx.fill();

// Label
ctx.fillStyle='rgba(200,200,200,.8)';ctx.font='11px Inter';ctx.textAlign='right';
ctx.fillText(d.l,90,y+barH/2+4);

// Value
ctx.fillStyle=d.c;ctx.font='bold 10px Inter';ctx.textAlign='left';
ctx.fillText(fmtMktCap(d.v),105+w,y+barH/2+4);
});
}

// ============================================
// DRE - DEMONSTRAÇÃO DO RESULTADO
// ============================================
function renderIncome(stock){
if(!stock||typeof stock!=='object')return;
var is=stock.incomeStatementHistory&&stock.incomeStatementHistory.incomeStatementHistory?stock.incomeStatementHistory.incomeStatementHistory:[];
var el=document.getElementById('b3Income');
if(!el)return;
if(!is.length){el.style.display='none';return;}
el.style.display='block';

var latest=is[0];

// Summary
var sh='';
var items=[
{l:'Receita Líquida',v:latest.totalRevenue,c:null},
{l:'Lucro Bruto',v:latest.grossProfit,c:null},
{l:'EBITDA',v:latest.ebitda,c:null},
{l:'Lucro Líquido',v:latest.netIncome,c:null}
];

items.forEach(function(it){
if(it.v!==undefined&&it.v!==null){
var color=it.v>=0?'#22C55E':'#EF4444';
sh+='<div class="b3-metric"><div class="b3-metric-label">'+it.l+'</div><div class="b3-metric-value" style="color:'+color+'">'+fmtMktCap(it.v)+'</div></div>';
}
});

// Margens
if(latest.totalRevenue&&latest.totalRevenue>0){
if(latest.grossProfit){
var mBruta=(latest.grossProfit/latest.totalRevenue*100);
sh+='<div class="b3-metric"><div class="b3-metric-label">Margem Bruta</div><div class="b3-metric-value" style="color:'+(mBruta>30?'#22C55E':mBruta>15?'#EAB308':'#EF4444')+'">'+mBruta.toFixed(1)+'%</div></div>';
}
if(latest.ebitda){
var mEbitda=(latest.ebitda/latest.totalRevenue*100);
sh+='<div class="b3-metric"><div class="b3-metric-label">Margem EBITDA</div><div class="b3-metric-value" style="color:'+(mEbitda>20?'#22C55E':mEbitda>10?'#EAB308':'#EF4444')+'">'+mEbitda.toFixed(1)+'%</div></div>';
}
if(latest.netIncome){
var mLiq=(latest.netIncome/latest.totalRevenue*100);
sh+='<div class="b3-metric"><div class="b3-metric-label">Margem Líquida</div><div class="b3-metric-value" style="color:'+(mLiq>15?'#22C55E':mLiq>5?'#EAB308':'#EF4444')+'">'+mLiq.toFixed(1)+'%</div></div>';
}
}

var incSumEl=document.getElementById('b3IncomeSummary');
if(incSumEl)incSumEl.innerHTML=sh;

// Gráfico evolução
renderIncomeChart(is);

// Tabela histórica
var th='<table class="fin-tbl"><thead><tr><th>Período</th><th>Receita</th><th>Lucro Bruto</th><th>EBITDA</th><th>Lucro Líq.</th><th>Margem Líq.</th></tr></thead><tbody>';
is.forEach(function(s){
var dt=s.endDate?new Date(s.endDate).toLocaleDateString('pt-BR',{year:'numeric',month:'short'}):'—';
var ml=s.totalRevenue&&s.netIncome?(s.netIncome/s.totalRevenue*100):0;
th+='<tr><td style="font-weight:600">'+dt+'</td>';
th+='<td>'+fmtMktCap(s.totalRevenue||0)+'</td>';
th+='<td>'+fmtMktCap(s.grossProfit||0)+'</td>';
th+='<td>'+fmtMktCap(s.ebitda||0)+'</td>';
th+='<td class="'+(s.netIncome>=0?'positive':'negative')+'">'+fmtMktCap(s.netIncome||0)+'</td>';
th+='<td class="'+(ml>=0?'positive':'negative')+'">'+ml.toFixed(1)+'%</td></tr>';
});
th+='</tbody></table>';
var incTblEl=document.getElementById('b3IncomeTable');
if(incTblEl)incTblEl.innerHTML=th;
}

function renderIncomeChart(statements){
var canvas=document.getElementById('b3IncomeChart');
if(!canvas||statements.length<2)return;
var ctx=canvas.getContext('2d');
var W=canvas.parentElement.clientWidth-32;
canvas.width=W;canvas.height=200;
ctx.clearRect(0,0,W,200);

// Inverter para ordem cronológica
var data=statements.slice().reverse();
var padding={t:20,r:10,b:35,l:10};
var cW=W-padding.l-padding.r;
var cH=200-padding.t-padding.b;
var groupW=cW/data.length;
var barW=Math.min(20,groupW/3-4);

var allVals=[];
data.forEach(function(s){
allVals.push(s.totalRevenue||0);
allVals.push(s.grossProfit||0);
allVals.push(s.netIncome||0);
});
var maxV=Math.max.apply(null,allVals)||1;

var series=[
{key:'totalRevenue',c:'#4F8CFF',l:'Receita'},
{key:'grossProfit',c:'#22C55E',l:'L.Bruto'},
{key:'netIncome',c:'#A855F7',l:'L.Líquido'}
];

data.forEach(function(s,i){
series.forEach(function(sr,si){
var val=s[sr.key]||0;
var x=padding.l+groupW*i+(groupW-barW*3-8)/2+si*(barW+4);
var h=Math.abs(val/maxV)*cH;
var y=val>=0?padding.t+cH-h:padding.t+cH;

ctx.fillStyle=sr.c+(val>=0?'':'60');
ctx.beginPath();
ctx.roundRect(x,y,barW,h||2,2);
ctx.fill();
});

// Ano
var dt=s.endDate?new Date(s.endDate).getFullYear():'?';
ctx.fillStyle='rgba(128,128,128,.6)';ctx.font='10px Inter';ctx.textAlign='center';
ctx.fillText(dt,padding.l+groupW*i+groupW/2,200-8);
});

// Legenda
var lx=W-200;
series.forEach(function(sr,i){
ctx.fillStyle=sr.c;
ctx.fillRect(lx+i*70,5,10,10);
ctx.fillStyle='rgba(200,200,200,.7)';ctx.font='9px Inter';ctx.textAlign='left';
ctx.fillText(sr.l,lx+i*70+14,14);
});
}

// ============================================
// COMPARADOR DE ATIVOS
// ============================================
async function compareStocks(){
var t1=document.getElementById('b3Compare1').value.trim().toUpperCase();
var t2=document.getElementById('b3Compare2').value.trim().toUpperCase();
if(!t1||!t2){toast(typeof t==='function'?t('toast_preencha_dois_tickers'):'Preencha os dois tickers','err');return}
if(t1===t2){toast(typeof t==='function'?t('toast_tickers_diferentes'):'Tickers devem ser diferentes','err');return}

var el=document.getElementById('b3CompareResult');
el.innerHTML='<div style="text-align:center;padding:20px;color:var(--t2)"><div style="font-size:2em;animation:spin 1s linear infinite;display:inline-block">&#9881;</div><div>Comparando '+t1+' vs '+t2+'...</div></div>';
document.getElementById('b3Compare').style.display='block';

try{
var results;
if(brapiMultiFn){
try{
var resp=await brapiMultiFn({tickers:[t1,t2]});
results=resp.data.results||[];
}catch(e){
var token=localStorage.getItem('vrt_b3token')||'';
var r=await fetch('https://brapi.dev/api/quote/'+t1+','+t2+'?token='+token+'&fundamental=true&modules=summaryProfile,defaultKeyStatistics,financialData');
var json=await r.json();
results=json.results||[];
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var r=await fetch('https://brapi.dev/api/quote/'+t1+','+t2+'?token='+token+'&fundamental=true&modules=summaryProfile,defaultKeyStatistics,financialData');
var json=await r.json();
results=json.results||[];
}

if(results.length<2){el.innerHTML='<div style="color:#EF4444;text-align:center;padding:20px">Não encontrei os dois ativos. Verifique os tickers.</div>';return}

var s1=results[0];
var s2=results[1];

var h='<div style="overflow-x:auto"><table class="fin-tbl"><thead><tr><th>Indicador</th><th style="text-align:center">'+s1.symbol+'</th><th style="text-align:center">'+s2.symbol+'</th><th style="text-align:center">Melhor</th></tr></thead><tbody>';

var metrics=[
{l:'Preço',v1:s1.regularMarketPrice,v2:s2.regularMarketPrice,fmt:'R$',lower:false,cmp:false},
{l:'Variação Dia',v1:s1.regularMarketChangePercent,v2:s2.regularMarketChangePercent,fmt:'%',lower:false,cmp:true},
{l:'P/L',v1:s1.priceEarnings,v2:s2.priceEarnings,fmt:'x',lower:true,cmp:true},
{l:'P/VP',v1:s1.priceToBookRatio,v2:s2.priceToBookRatio,fmt:'x',lower:true,cmp:true},
{l:'DY',v1:s1.dividendYield&&s1.dividendYield<1?s1.dividendYield*100:s1.dividendYield,v2:s2.dividendYield&&s2.dividendYield<1?s2.dividendYield*100:s2.dividendYield,fmt:'%',lower:false,cmp:true},
{l:'LPA',v1:s1.earningsPerShare,v2:s2.earningsPerShare,fmt:'R$',lower:false,cmp:true},
{l:'Market Cap',v1:s1.marketCap,v2:s2.marketCap,fmt:'cap',lower:false,cmp:false},
{l:'Volume',v1:s1.regularMarketVolume,v2:s2.regularMarketVolume,fmt:'vol',lower:false,cmp:true},
{l:'Mín 52s',v1:s1.fiftyTwoWeekLow,v2:s2.fiftyTwoWeekLow,fmt:'R$',lower:false,cmp:false},
{l:'Máx 52s',v1:s1.fiftyTwoWeekHigh,v2:s2.fiftyTwoWeekHigh,fmt:'R$',lower:false,cmp:false}
];

// ROE
var fd1=s1.financialData||{};
var fd2=s2.financialData||{};
if(fd1.returnOnEquity||fd2.returnOnEquity){
metrics.push({l:'ROE',v1:fd1.returnOnEquity?(fd1.returnOnEquity*100):null,v2:fd2.returnOnEquity?(fd2.returnOnEquity*100):null,fmt:'%',lower:false,cmp:true});
}
if(fd1.currentRatio||fd2.currentRatio){
metrics.push({l:'Liquidez Corrente',v1:fd1.currentRatio,v2:fd2.currentRatio,fmt:'x',lower:false,cmp:true});
}
if(fd1.debtToEquity||fd2.debtToEquity){
metrics.push({l:'Dívida/PL',v1:fd1.debtToEquity,v2:fd2.debtToEquity,fmt:'%',lower:true,cmp:true});
}

var score1=0,score2=0;

metrics.forEach(function(m){
var v1s='—',v2s='—',winner='';
if(m.v1!==null&&m.v1!==undefined){
if(m.fmt==='R$')v1s='R$ '+m.v1.toFixed(2);
else if(m.fmt==='%')v1s=m.v1.toFixed(2)+'%';
else if(m.fmt==='x')v1s=m.v1.toFixed(2);
else if(m.fmt==='cap')v1s=fmtMktCap(m.v1);
else if(m.fmt==='vol')v1s=fmtVol(m.v1);
}
if(m.v2!==null&&m.v2!==undefined){
if(m.fmt==='R$')v2s='R$ '+m.v2.toFixed(2);
else if(m.fmt==='%')v2s=m.v2.toFixed(2)+'%';
else if(m.fmt==='x')v2s=m.v2.toFixed(2);
else if(m.fmt==='cap')v2s=fmtMktCap(m.v2);
else if(m.fmt==='vol')v2s=fmtVol(m.v2);
}

if(m.cmp&&m.v1!==null&&m.v2!==null&&m.v1!==undefined&&m.v2!==undefined){
if(m.lower){
winner=m.v1<m.v2?s1.symbol:(m.v2<m.v1?s2.symbol:'Empate');
if(m.v1<m.v2)score1++;else if(m.v2<m.v1)score2++;
}else{
winner=m.v1>m.v2?s1.symbol:(m.v2>m.v1?s2.symbol:'Empate');
if(m.v1>m.v2)score1++;else if(m.v2>m.v1)score2++;
}
}

var w1=winner===s1.symbol?'style="color:#22C55E;font-weight:700"':'';
var w2=winner===s2.symbol?'style="color:#22C55E;font-weight:700"':'';
var wCol=winner===s1.symbol?'#22C55E':(winner===s2.symbol?'#4F8CFF':'var(--t3)');

h+='<tr><td style="font-weight:600">'+m.l+'</td>';
h+='<td style="text-align:center" '+w1+'>'+v1s+'</td>';
h+='<td style="text-align:center" '+w2+'>'+v2s+'</td>';
h+='<td style="text-align:center;color:'+wCol+';font-weight:600;font-size:.85em">'+winner+'</td></tr>';
});

h+='</tbody></table></div>';

// Veredito
var totalCmp=score1+score2;
h+='<div style="display:flex;gap:16px;margin-top:16px;text-align:center">';
h+='<div style="flex:1;background:'+(score1>=score2?'rgba(34,197,94,.1)':'rgba(148,163,184,.05)')+';border-radius:12px;padding:16px;border:1px solid '+(score1>=score2?'rgba(34,197,94,.3)':'var(--brd)')+'"><div style="font-size:1.4em;font-weight:900;color:'+(score1>=score2?'#22C55E':'var(--t2)')+'">'+s1.symbol+'</div><div style="font-size:2em;font-weight:900;color:'+(score1>=score2?'#22C55E':'var(--t2)')+'">'+score1+'</div><div style="font-size:.75em;color:var(--t3)">vitórias</div></div>';
h+='<div style="flex:1;background:'+(score2>=score1?'rgba(79,140,255,.1)':'rgba(148,163,184,.05)')+';border-radius:12px;padding:16px;border:1px solid '+(score2>=score1?'rgba(79,140,255,.3)':'var(--brd)')+'"><div style="font-size:1.4em;font-weight:900;color:'+(score2>=score1?'#4F8CFF':'var(--t2)')+'">'+s2.symbol+'</div><div style="font-size:2em;font-weight:900;color:'+(score2>=score1?'#4F8CFF':'var(--t2)')+'">'+score2+'</div><div style="font-size:.75em;color:var(--t3)">vitórias</div></div>';
h+='</div>';

el.innerHTML=h;

}catch(e){
el.innerHTML='<div style="color:#EF4444;text-align:center;padding:20px">Erro: '+e.message+'</div>';
}
}

// ============================================
// SIMULADOR DE DIVIDENDOS / RENDA PASSIVA
// ============================================
function simulateDividends(){
var ticker=document.getElementById('b3Search').value.trim().toUpperCase();
var cached=b3Cache[ticker];
var dy=0;
var price=0;

if(cached&&cached.stock){
var s=cached.stock;
price=s.regularMarketPrice||0;
dy=s.dividendYield||0;
if(dy>0&&dy<1)dy=dy*100;
}

if(dy<=0)dy=6; // Default 6% se não tem dados

var investido=parseFloat(document.getElementById('divSimVal').value)||10000;
var aporte=parseFloat(document.getElementById('divSimAporte').value)||500;
var anos=parseInt(document.getElementById('divSimAnos').value)||10;
var dyDecimal=dy/100;

var el=document.getElementById('b3DivSimResult');
document.getElementById('b3DivSimulator').style.display='block';

var patrimônio=investido;
var totalAportes=investido;
var totalDivs=0;
var rows=[];

for(var i=1;i<=anos;i++){
var divAnual=patrimônio*dyDecimal;
totalDivs+=divAnual;
patrimônio+=divAnual+aporte*12;
totalAportes+=aporte*12;

rows.push({
ano:i,
patrimônio:patrimônio,
divAnual:divAnual,
divMensal:divAnual/12,
totalDivs:totalDivs,
totalAportes:totalAportes
});
}

var last=rows[rows.length-1];
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:16px">';
h+='<div class="b3-metric"><div class="b3-metric-label">Patrimônio Final</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(last.patrimônio)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Renda Mensal</div><div class="b3-metric-value" style="color:#4F8CFF">'+fmt(last.divMensal)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Renda Anual</div><div class="b3-metric-value" style="color:#7C5CFC">'+fmt(last.divAnual)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Total Dividendos</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(last.totalDivs)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Total Investido</div><div class="b3-metric-value">'+fmt(last.totalAportes)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">DY usado</div><div class="b3-metric-value">'+dy.toFixed(2)+'%</div><div class="b3-metric-sub">'+(ticker?ticker+' atual':'padrão 6%')+'</div></div>';
h+='</div>';

h+='<div style="max-height:250px;overflow-y:auto"><table class="fin-tbl"><thead><tr><th>Ano</th><th>Patrimônio</th><th>Div. Anual</th><th>Div. Mensal</th><th>Acum. Divs</th></tr></thead><tbody>';
rows.forEach(function(r){
h+='<tr><td style="font-weight:600">'+r.ano+'º</td>';
h+='<td>'+fmt(r.patrimônio)+'</td>';
h+='<td class="positive">'+fmt(r.divAnual)+'</td>';
h+='<td class="positive">'+fmt(r.divMensal)+'</td>';
h+='<td>'+fmt(r.totalDivs)+'</td></tr>';
});
h+='</tbody></table></div>';

el.innerHTML=h;
}




// ============================================
// SPRINT 3: SCREENER DE AÇÕES
// ============================================

var screenerPresets={
dividendos:{label:'Top Dividendos',tickers:['BBAS3','TAEE11','BBSE3','CPLE6','CMIG4','VIVT3','ITSA4','SANB11','TRPL4','ENBR3','CPFE3','EGIE3','GOAU4','CSNA3','PETR4'],sort:'dy',desc:true},
baratas:{label:'Baratas (Graham)',tickers:['BBAS3','CMIG4','CPLE6','GOAU4','CSNA3','USIM5','GGBR4','PETR4','VALE3','BRAP4','SANB11','TAEE11','VIVT3','ENBR3','BBSE3'],sort:'graham',desc:true},
crescimento:{label:'Crescimento',tickers:['WEGE3','ELET3','PRIO3','RAIZ4','CSAN3','TOTS3','RENT3','EQTL3','RADL3','HAPV3','RAIL3','VBBR3','SUZB3','KLBN11','PETZ3'],sort:'score',desc:true},
seguras:{label:'Seguras / Blue Chips',tickers:['ITUB4','BBDC4','VALE3','PETR4','ABEV3','WEGE3','BBAS3','RENT3','SUZB3','ELET3','JBSS3','RAIZ4','EQTL3','VIVT3','B3SA3'],sort:'score',desc:true},
fiis:{label:'Top FIIs',tickers:['HGLG11','XPML11','MXRF11','KNRI11','VISC11','HGRE11','BCFF11','IRDM11','HGBS11','XPLG11','RBRR11','KNCR11','CPTS11','RECR11','BTLG11'],sort:'dy',desc:true},
small:{label:'Small Caps',tickers:['PETZ3','MDIA3','CVCB3','LWSA3','CASH3','AERI3','INTB3','ESPA3','SMFT3','MBLY3','MLAS3','BRIT3','TFCO4','SIMH3','VIVA3'],sort:'score',desc:true}
};

var screenerData=[];

async function runScreener(preset){
var tickers;
var sortKey='score';
var sortDesc=true;

if(preset==='custom'){
tickers=screenerPresets.seguras.tickers; // base para filtros custom
sortKey='score';
}else if(screenerPresets[preset]){
tickers=screenerPresets[preset].tickers;
sortKey=screenerPresets[preset].sort;
sortDesc=screenerPresets[preset].desc;
}else{
toast(typeof t==='function'?t('toast_formato_nao_reconhecido'):'Preset não encontrado','err');return;
}

var el=document.getElementById('screenerResult');
el.innerHTML='<div style="text-align:center;padding:30px;color:var(--t2)"><div style="font-size:2em;animation:spin 1s linear infinite;display:inline-block">&#9881;</div><div style="margin-top:8px">Analisando '+tickers.length+' ativos...</div><div style="font-size:.78em;color:var(--t3);margin-top:4px">Isso pode levar alguns segundos</div></div>';

try{
var results=[];
// Buscar em lotes de 5
for(var i=0;i<tickers.length;i+=5){
var batch=tickers.slice(i,i+5);
var batchStr=batch.join(',');

try{
var data;
if(typeof brapiMultiFn==='function'){
try{
var resp=await brapiMultiFn({tickers:batch});
data=resp.data;
}catch(e){
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+batchStr+'?token='+token+'&fundamental=true&modules=defaultKeyStatistics,financialData');
data=await r2.json();
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+batchStr+'?token='+token+'&fundamental=true&modules=defaultKeyStatistics,financialData');
data=await r2.json();
}

if(data.results){
data.results.forEach(function(s){
var fd=s.financialData||{};
var ks=s.defaultKeyStatistics||{};
var price=s.regularMarketPrice||0;
var pl=s.priceEarnings||ks.trailingPE||0;
var pvp=ks.priceToBook||s.priceToBookRatio||0;
var dy=s.dividendYield||0;
if(dy>0&&dy<1)dy=dy*100;
var eps=s.earningsPerShare||ks.trailingEps||0;
var roe=fd.returnOnEquity?(fd.returnOnEquity*100):0;
var divPL=fd.debtToEquity||0;
var liqCorr=fd.currentRatio||0;
var mktCap=s.marketCap||0;
var vpa=pvp>0&&price>0?(price/pvp):0;

// Graham
var graham=0;
if(eps>0&&vpa>0)graham=Math.sqrt(22.5*eps*vpa);
var grahamUpside=graham>0&&price>0?((graham/price-1)*100):0;

// Bazin
var bazin=0;
var dpa=dy>0&&price>0?(dy/100*price):0;
if(dpa>0)bazin=dpa/0.06;
var bazinUpside=bazin>0&&price>0?((bazin/price-1)*100):0;

// Score Sibanki
var score=50;
if(pl>0&&pl<=10)score+=15;else if(pl>0&&pl<=15)score+=10;else if(pl>0&&pl<=20)score+=5;
if(pvp>0&&pvp<=1)score+=10;else if(pvp>0&&pvp<=1.5)score+=7;else if(pvp>0&&pvp<=2)score+=3;
if(dy>=8)score+=15;else if(dy>=5)score+=10;else if(dy>=3)score+=5;
if(roe>=20)score+=10;else if(roe>=15)score+=7;else if(roe>=10)score+=4;
if(liqCorr>=1.5)score+=5;else if(liqCorr>=1)score+=2;
if(divPL>=0&&divPL<50)score+=5;else if(divPL>=100)score-=5;
if(grahamUpside>30)score+=10;else if(grahamUpside>10)score+=5;
score=Math.min(100,Math.max(0,score));

results.push({
symbol:s.symbol,
name:s.longName||s.shortName||s.symbol,
price:price,
change:s.regularMarketChangePercent||0,
pl:pl,pvp:pvp,dy:dy,eps:eps,roe:roe,
divPL:divPL,liqCorr:liqCorr,mktCap:mktCap,
vpa:vpa,graham:graham,grahamUpside:grahamUpside,
bazin:bazin,bazinUpside:bazinUpside,
score:score,logo:s.logourl||''
});
});
}
}catch(batchErr){
console.warn('Erro lote screener:',batchErr);
}

// Delay entre lotes para não sobrecarregar API
if(i+5<tickers.length)await new Promise(function(r){setTimeout(r,300)});
}

// Aplicar filtros custom
if(preset==='custom'){
var fPL=parseFloat(document.getElementById('scrPL').value)||999;
var fPVP=parseFloat(document.getElementById('scrPVP').value)||999;
var fDY=parseFloat(document.getElementById('scrDY').value)||0;
var fROE=parseFloat(document.getElementById('scrROE').value)||0;
var fDivPL=parseFloat(document.getElementById('scrDivPL').value)||999;

results=results.filter(function(s){
if(s.pl>0&&s.pl>fPL)return false;
if(s.pvp>0&&s.pvp>fPVP)return false;
if(s.dy<fDY)return false;
if(s.roe<fROE)return false;
if(s.divPL>0&&s.divPL/100>fDivPL)return false;
return true;
});
}

// Ordenar
results.sort(function(a,b){
var va=a[sortKey]||0;
var vb=b[sortKey]||0;
if(sortKey==='pl'||sortKey==='pvp'){
// Menor é melhor (mas ignorar zeros)
if(va<=0)va=9999;
if(vb<=0)vb=9999;
return va-vb;
}
return sortDesc?(vb-va):(va-vb);
});

screenerData=results;
renderScreenerResults(results,preset);

// Mostrar ranking
if(results.length>0){
document.getElementById('b3Ranking').style.display='block';
renderRanking(results);
}

}catch(e){
el.innerHTML='<div style="color:#EF4444;text-align:center;padding:20px">Erro no screener: '+e.message+'</div>';
}
}

function renderScreenerResults(results,preset){
var el=document.getElementById('screenerResult');
if(!results.length){
el.innerHTML='<div style="text-align:center;color:var(--t3);padding:20px">Nenhum ativo encontrado com esses filtros.</div>';
return;
}

var label=preset==='custom'?'Filtro Personalizado':(screenerPresets[preset]?screenerPresets[preset].label:preset);
var h='<div style="font-size:.78em;color:var(--t3);margin-bottom:8px">'+label+' — '+results.length+' ativos encontrados</div>';

h+='<div style="overflow-x:auto"><table class="fin-tbl"><thead><tr>';
h+='<th>#</th><th>Ativo</th><th>Preço</th><th>Var%</th><th>P/L</th><th>P/VP</th><th>DY</th><th>ROE</th>';
h+='<th>Graham</th><th>Score</th><th></th>';
h+='</tr></thead><tbody>';

results.forEach(function(s,i){
var chgCls=s.change>=0?'positive':'negative';
var scoreCls=s.score>=70?'positive':s.score>=50?'':'negative';
var grahamCls=s.grahamUpside>0?'positive':'negative';

h+='<tr style="cursor:pointer" onclick="quickB3(\x27'+s.symbol+'\x27)">';
h+='<td style="font-weight:700;color:var(--t3)">'+(i+1)+'</td>';
h+='<td><div style="display:flex;align-items:center;gap:6px">';
if(s.logo)h+='<img src="'+s.logo+'" style="width:20px;height:20px;border-radius:4px" onerror="this.style.display=\x27none\x27" alt="">';
h+='<div><div style="font-weight:700;color:var(--t1);font-size:.88em">'+s.symbol+'</div>';
h+='<div style="font-size:.68em;color:var(--t3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.name||'')+'</div></div></div></td>';
h+='<td style="font-weight:600">R$ '+s.price.toFixed(2)+'</td>';
h+='<td class="'+chgCls+'">'+(s.change>=0?'+':'')+s.change.toFixed(2)+'%</td>';
h+='<td>'+(s.pl>0?s.pl.toFixed(1):'—')+'</td>';
h+='<td>'+(s.pvp>0?s.pvp.toFixed(2):'—')+'</td>';
h+='<td style="color:'+(s.dy>=6?'#22C55E':s.dy>=3?'#EAB308':'var(--t2)')+'">'+s.dy.toFixed(2)+'%</td>';
h+='<td style="color:'+(s.roe>=15?'#22C55E':s.roe>=10?'#EAB308':'var(--t2)')+'">'+s.roe.toFixed(1)+'%</td>';
h+='<td class="'+grahamCls+'">'+(s.grahamUpside!==0?(s.grahamUpside>0?'+':'')+s.grahamUpside.toFixed(0)+'%':'—')+'</td>';
h+='<td><div style="display:flex;align-items:center;gap:4px"><div style="width:32px;height:6px;background:var(--brd);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+s.score+'%;background:'+(s.score>=70?'#22C55E':s.score>=50?'#EAB308':'#EF4444')+';border-radius:3px"></div></div><span style="font-size:.78em;font-weight:700;color:'+(s.score>=70?'#22C55E':s.score>=50?'#EAB308':'#EF4444')+'">'+s.score+'</span></div></td>';
h+='<td><button onclick="event.stopPropagation();quickB3(\x27'+s.symbol+'\x27)" style="background:none;border:none;cursor:pointer;font-size:1em;padding:2px" title="Analisar">&#128269;</button></td>';
h+='</tr>';
});

h+='</tbody></table></div>';
el.innerHTML=h;
}

function resetScreenerFilters(){
document.getElementById('scrPL').value='15';
document.getElementById('scrPVP').value='3';
document.getElementById('scrDY').value='4';
document.getElementById('scrROE').value='10';
document.getElementById('scrDivPL').value='1';
document.getElementById('scrSetor').value='';
toast(typeof t==='function'?t('toast_filtros_resetados'):'Filtros resetados','ok');
}

// ============================================
// SPRINT 3: RANKING SIBANKI
// ============================================

function renderRanking(data){
var el=document.getElementById('rankingResult');
if(!data||!data.length){el.innerHTML='';return}

// Top 5 em destaque
var top5=data.slice(0,5);
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:12px">';

var medals=['<i data-lucide="trophy" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#FFD700"></i>','<i data-lucide="medal" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#C0C0C0"></i>','<i data-lucide="award" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#CD7F32"></i>','4º','5º'];
var colors=['#FFD700','#C0C0C0','#CD7F32','var(--t2)','var(--t2)'];

top5.forEach(function(s,i){
var bgGrad=i===0?'linear-gradient(135deg,rgba(255,215,0,.08),rgba(255,215,0,.03))':'var(--bg2)';
var brdColor=i===0?'rgba(255,215,0,.3)':'var(--brd)';

h+='<div style="background:'+bgGrad+';border:1px solid '+brdColor+';border-radius:12px;padding:14px;text-align:center;cursor:pointer" onclick="quickB3(\x27'+s.symbol+'\x27)">';
h+='<div style="font-size:1.4em;margin-bottom:4px;display:inline-flex;align-items:center;justify-content:center">'+medals[i]+'</div>';
if(s.logo)h+='<img src="'+s.logo+'" style="width:28px;height:28px;border-radius:6px;margin-bottom:4px" onerror="this.style.display=\x27none\x27" alt="">';
h+='<div style="font-weight:800;font-size:1em;color:var(--t1)">'+s.symbol+'</div>';
h+='<div style="font-size:.72em;color:var(--t3);margin:2px 0;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.name||'')+'</div>';
h+='<div style="font-size:1.3em;font-weight:900;color:'+(s.score>=70?'#22C55E':s.score>=50?'#EAB308':'#EF4444')+'">'+s.score+'</div>';
h+='<div style="font-size:.68em;color:var(--t3)">Score Sibanki</div>';
h+='<div style="margin-top:6px;font-size:.75em">';
h+='<span style="color:'+(s.dy>=5?'#22C55E':'var(--t2)')+'">DY '+s.dy.toFixed(1)+'%</span> ';
h+='<span style="color:var(--t3)">|</span> ';
h+='<span style="color:'+(s.pl>0&&s.pl<15?'#22C55E':'var(--t2)')+'">P/L '+(s.pl>0?s.pl.toFixed(1):'—')+'</span>';
h+='</div>';
h+='</div>';
});

h+='</div>';
el.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

function sortRanking(){
var key=document.getElementById('rankSort').value;
if(!screenerData.length)return;

var data=screenerData.slice();
data.sort(function(a,b){
if(key==='pl'||key==='pvp'){
var va=a[key]||9999;
var vb=b[key]||9999;
if(va<=0)va=9999;
if(vb<=0)vb=9999;
return va-vb;
}
if(key==='graham')return (b.grahamUpside||0)-(a.grahamUpside||0);
return (b[key]||0)-(a[key]||0);
});

renderRanking(data);
}

// ============================================
// SPRINT 3: ALERTAS DE PREÇO
// ============================================

var priceAlerts=JSON.parse(localStorage.getItem('vrt_priceAlerts')||'[]');

function addPriceAlert(){
var ticker=document.getElementById('alertTicker').value.trim().toUpperCase();
var price=parseFloat(document.getElementById('alertPrice').value);
var condition=document.getElementById('alertCondition').value;

if(!ticker){toast(typeof t==='function'?t('toast_digite_ticker'):'Digite o ticker','err');return}
if(!price||price<=0){toast(typeof t==='function'?t('toast_preco_invalido'):'Preço inválido','err');return}

// Verificar duplicata
var exists=priceAlerts.find(function(a){return a.ticker===ticker&&a.condition===condition});
if(exists){toast('Já existe alerta para '+ticker+' com essa condição','err');return}

priceAlerts.push({
id:Date.now(),
ticker:ticker,
targetPrice:price,
condition:condition,
createdAt:new Date().toISOString(),
triggered:false
});

localStorage.setItem('vrt_priceAlerts',JSON.stringify(priceAlerts));
renderAlertsList();
toast('Alerta criado para '+ticker+'!','ok');

// Limpar inputs
document.getElementById('alertTicker').value='';
document.getElementById('alertPrice').value='';
}

function removePriceAlert(id){
priceAlerts=priceAlerts.filter(function(a){return a.id!==id});
localStorage.setItem('vrt_priceAlerts',JSON.stringify(priceAlerts));
renderAlertsList();
toast(typeof t==='function'?t('toast_alerta_removido'):'Alerta removido','ok');
}

function renderAlertsList(){
var el=document.getElementById('alertsList');
var countEl=document.getElementById('alertCount');
var active=priceAlerts.filter(function(a){return !a.triggered});
if(countEl)countEl.textContent=active.length+' ativo'+(active.length!==1?'s':'');

if(!priceAlerts.length){
el.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:12px">Nenhum alerta configurado. Adicione acima!</div>';
return;
}

var h='';
priceAlerts.forEach(function(a){
var condText=a.condition==='below'?'&#128315; Abaixo de':'&#128314; Acima de';
var statusColor=a.triggered?'#22C55E':'var(--pri)';
var statusText=a.triggered?'&#9989; Atingido!':'&#9203; Monitorando';
var bg=a.triggered?'rgba(34,197,94,.05)':'var(--bg2)';

h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:'+bg+';border:1px solid var(--brd);border-radius:10px;margin-bottom:6px;flex-wrap:wrap;gap:6px">';
h+='<div style="display:flex;align-items:center;gap:10px">';
h+='<div style="font-weight:700;color:var(--t1);font-size:.92em;cursor:pointer" onclick="quickB3(\x27'+a.ticker+'\x27)">'+a.ticker+'</div>';
h+='<div style="font-size:.8em;color:var(--t2)">'+condText+' <strong style="color:var(--t1)">R$ '+a.targetPrice.toFixed(2)+'</strong></div>';
h+='</div>';
h+='<div style="display:flex;align-items:center;gap:8px">';
h+='<span style="font-size:.72em;color:'+statusColor+'">'+statusText+'</span>';
h+='<button onclick="removePriceAlert('+a.id+')" style="background:none;border:none;cursor:pointer;font-size:.85em;color:var(--t3);padding:2px" title="Remover">&#10006;</button>';
h+='</div>';
h+='</div>';
});

el.innerHTML=h;
}

async function checkPriceAlerts(){
var active=priceAlerts.filter(function(a){return !a.triggered});
if(!active.length)return;

var tickers=[...new Set(active.map(function(a){return a.ticker}))];
if(!tickers.length)return;

try{
var data;
if(typeof brapiMultiFn==='function'){
try{
var resp=await brapiMultiFn({tickers:tickers});
data=resp.data;
}catch(e){
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+tickers.join(',')+'?token='+token);
data=await r2.json();
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+tickers.join(',')+'?token='+token);
data=await r2.json();
}

if(!data.results)return;

var priceMap={};
data.results.forEach(function(s){
priceMap[s.symbol]=s.regularMarketPrice||0;
});

var triggered=false;
priceAlerts.forEach(function(a){
if(a.triggered)return;
var currentPrice=priceMap[a.ticker];
if(!currentPrice)return;

if(a.condition==='below'&&currentPrice<=a.targetPrice){
a.triggered=true;
triggered=true;
toast('&#128276; ALERTA: '+a.ticker+' caiu para R$ '+currentPrice.toFixed(2)+' (alvo: R$ '+a.targetPrice.toFixed(2)+')','ok');
}
if(a.condition==='above'&&currentPrice>=a.targetPrice){
a.triggered=true;
triggered=true;
toast('&#128276; ALERTA: '+a.ticker+' subiu para R$ '+currentPrice.toFixed(2)+' (alvo: R$ '+a.targetPrice.toFixed(2)+')','ok');
}
});

if(triggered){
localStorage.setItem('vrt_priceAlerts',JSON.stringify(priceAlerts));
renderAlertsList();
}
}catch(e){
console.warn('Erro checkAlerts:',e);
}
}

// ============================================
// SPRINT 3: MAPA DE CALOR DO MERCADO
// ============================================

async function loadHeatmap(){
var el=document.getElementById('heatmapResult');
el.innerHTML='<div style="text-align:center;padding:20px;color:var(--t2)"><div style="font-size:2em;animation:spin 1s linear infinite;display:inline-block">&#9881;</div><div style="margin-top:8px">Carregando mercado...</div></div>';

var tickers=['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','BBAS3','RENT3','SUZB3','ELET3','JBSS3','B3SA3','PRIO3','HAPV3','RAIZ4','MGLU3','VBBR3','EQTL3','TOTS3','RADL3'];

try{
var data;
if(typeof brapiMultiFn==='function'){
try{
var resp=await brapiMultiFn({tickers:tickers});
data=resp.data;
}catch(e){
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+tickers.join(',')+'?token='+token);
data=await r2.json();
}
}else{
var token=localStorage.getItem('vrt_b3token')||'';
var r2=await fetch('https://brapi.dev/api/quote/'+tickers.join(',')+'?token='+token);
data=await r2.json();
}

if(!data.results||!data.results.length){
el.innerHTML='<div style="color:#EF4444;text-align:center;padding:20px">Sem dados disponíveis</div>';
return;
}

// Ordenar por variação (positivo primeiro)
var stocks=data.results.sort(function(a,b){return (b.regularMarketChangePercent||0)-(a.regularMarketChangePercent||0)});

var maxAbs=Math.max.apply(null,stocks.map(function(s){return Math.abs(s.regularMarketChangePercent||0)}))||1;

var h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:4px">';

stocks.forEach(function(s){
var chg=s.regularMarketChangePercent||0;
var intensity=Math.min(1,Math.abs(chg)/maxAbs);
var bg,color;

if(chg>0){
bg='rgba(34,197,94,'+(0.1+intensity*0.3)+')';
color='#22C55E';
}else if(chg<0){
bg='rgba(239,68,68,'+(0.1+intensity*0.3)+')';
color='#EF4444';
}else{
bg='var(--bg2)';
color='var(--t3)';
}

var mktCapSize=s.marketCap||0;
var fontSize=mktCapSize>100000000000?'1em':(mktCapSize>50000000000?'.92em':'.85em');
var padding=mktCapSize>100000000000?'14px 10px':'10px 8px';

h+='<div style="background:'+bg+';border-radius:8px;padding:'+padding+';text-align:center;cursor:pointer;border:1px solid rgba(255,255,255,.03);transition:all .2s" onclick="quickB3(\x27'+s.symbol+'\x27)" onmouseover="this.style.transform=\x27scale(1.05)\x27" onmouseout="this.style.transform=\x27scale(1)\x27">';
if(s.logourl)h+='<img src="'+s.logourl+'" style="width:20px;height:20px;border-radius:4px;margin-bottom:2px" onerror="this.style.display=\x27none\x27" alt="">';
h+='<div style="font-weight:800;font-size:'+fontSize+';color:var(--t1)">'+s.symbol+'</div>';
h+='<div style="font-size:.75em;color:'+color+';font-weight:700;margin-top:2px">'+(chg>=0?'+':'')+chg.toFixed(2)+'%</div>';
h+='<div style="font-size:.65em;color:var(--t3);margin-top:1px">R$ '+(s.regularMarketPrice||0).toFixed(2)+'</div>';
h+='</div>';
});

h+='</div>';

// Resumo
var up=stocks.filter(function(s){return (s.regularMarketChangePercent||0)>0}).length;
var down=stocks.filter(function(s){return (s.regularMarketChangePercent||0)<0}).length;
var flat=stocks.length-up-down;

h+='<div style="display:flex;gap:16px;margin-top:10px;justify-content:center;font-size:.78em">';
h+='<span style="color:#22C55E">&#9650; '+up+' subindo</span>';
h+='<span style="color:var(--t3)">&#9644; '+flat+' estáveis</span>';
h+='<span style="color:#EF4444">&#9660; '+down+' caindo</span>';
h+='</div>';

el.innerHTML=h;

}catch(e){
el.innerHTML='<div style="color:#EF4444;text-align:center;padding:20px">Erro: '+e.message+'</div>';
}
}

// ============================================
// SPRINT 3: HELPER - fmtVol
// ============================================
function fmtVol(v){
if(!v)return '—';
if(v>=1000000000)return (v/1000000000).toFixed(1)+'B';
if(v>=1000000)return (v/1000000).toFixed(1)+'M';
if(v>=1000)return (v/1000).toFixed(1)+'K';
return v.toString();
}

// ============================================
// SPRINT 3: INIT - carregar alertas e checar periodicamente
// ============================================

// ============================================
// SPRINT 4: PORTFOLIO PROFISSIONAL
// ============================================
var portfolioCache={};
var allocTargetsData=JSON.parse(localStorage.getItem('vrt_allocTargets')||'{"Ações":40,"FIIs":20,"Renda Fixa":30,"Cripto":5,"Outros":5}');

function renderPortfolio(){
var kpi=document.getElementById('portfolioKPIs');
var pt=document.getElementById('portfolioTable');
if(!investments||!investments.length){
if(kpi)kpi.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:24px 16px;background:var(--bg2);border-radius:12px;border:1px dashed var(--brd)"><div style="font-size:2.5em;margin-bottom:8px;opacity:.6">📊</div><p style="margin:0;font-size:.9em;color:var(--t2)">Nenhum investimento registrado</p><p style="margin:6px 0 0;font-size:.78em;color:var(--t3)">Use o formulário abaixo para registrar seu primeiro investimento</p></div>';
if(pt)pt.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:16px">Registre investimentos para ver o portfolio.</div>';
var sumEl=document.getElementById('portfolioAnaliseSummary');if(sumEl)sumEl.innerHTML='';
try{if(charts.inv1)charts.inv1.destroy()}catch(e){}
try{if(charts.inv2)charts.inv2.destroy()}catch(e){}
return;
}
renderPortfolioKPIs();
renderPortfolioTypeChart();
renderPortfolioReturnChart();
renderPortfolioTable();
renderPortfolioEvolution();
renderAllocComparison();
}

function invCostBasis(inv){
if(inv.qtd&&inv.precoCompra&&inv.precoCompra>0)return inv.qtd*inv.precoCompra;
return inv.valor||0;
}
function renderPortfolioKPIs(){
var totalInv=0,totalAtual=0;
var tipoCount={};
investments.forEach(function(inv){
totalInv+=invCostBasis(inv);
totalAtual+=inv.atual||inv.valor||0;
tipoCount[inv.tipo]=(tipoCount[inv.tipo]||0)+1;
});
var retorno=totalAtual-totalInv;
var pctRet=totalInv>0?((retorno/totalInv)*100):0;
var tipoQtd=Object.keys(tipoCount).length;
var melhor=null,pior=null;
investments.forEach(function(inv){
var base=invCostBasis(inv);
var ret=base>0?((inv.atual||inv.valor||0)-base)/base*100:0;
if(!melhor||ret>melhor.ret)melhor={nome:inv.nome,ret:ret};
if(!pior||ret<pior.ret)pior={nome:inv.nome,ret:ret};
});

var h='';
h+='<div class="b3-metric"><div class="b3-metric-label">Total Investido</div><div class="b3-metric-value">'+fmt(totalInv)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Valor Atual</div><div class="b3-metric-value" style="color:'+(totalAtual>=totalInv?'#22C55E':'#EF4444')+'">'+fmt(totalAtual)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Resultado</div><div class="b3-metric-value" style="color:'+(retorno>=0?'#22C55E':'#EF4444')+'">'+(retorno>=0?'+':'')+fmt(retorno)+'</div><div class="b3-metric-sub">'+(pctRet>=0?'+':'')+pctRet.toFixed(2)+'%</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Ativos</div><div class="b3-metric-value">'+investments.length+'</div><div class="b3-metric-sub">'+tipoQtd+' tipos</div></div>';
if(melhor)h+='<div class="b3-metric"><div class="b3-metric-label">Melhor</div><div class="b3-metric-value" style="color:#22C55E;font-size:.85em">'+melhor.nome+'</div><div class="b3-metric-sub" style="color:#22C55E">+'+melhor.ret.toFixed(2)+'%</div></div>';
if(pior&&pior.ret<0)h+='<div class="b3-metric"><div class="b3-metric-label">Pior</div><div class="b3-metric-value" style="color:#EF4444;font-size:.85em">'+pior.nome+'</div><div class="b3-metric-sub" style="color:#EF4444">'+pior.ret.toFixed(2)+'%</div></div>';
document.getElementById('portfolioKPIs').innerHTML=h;
var sumEl=document.getElementById('portfolioAnaliseSummary');
if(sumEl){var retTxt=retorno>=0?'+'+fmt(retorno):fmt(retorno);var pctTxt=(pctRet>=0?'+':'')+pctRet.toFixed(2)+'%';sumEl.innerHTML='Rentabilidade total: <span style="color:'+(retorno>=0?'#22C55E':'#EF4444')+'">'+retTxt+' ('+pctTxt+')</span>';}
}

function renderPortfolioTypeChart(){
var canvas=document.getElementById('portfolioTypeChart');if(!canvas)return;
var byType={};var total=0;
investments.forEach(function(inv){var t=inv.tipo||'Outros';byType[t]=(byType[t]||0)+(inv.atual||inv.valor||0);total+=(inv.atual||inv.valor||0);});
if(total<=0)return;
var colors=['#4F8CFF','#22C55E','#A855F7','#F59E0B','#EF4444','#06B6D4','#EC4899','#8B5CF6','#14B8A6','#F97316'];
var types=Object.keys(byType).sort(function(a,b){return byType[b]-byType[a]});
var data=types.map(function(t){return byType[t]});
if(canvas._chartPT)canvas._chartPT.destroy();
canvas._chartPT=new Chart(canvas.getContext('2d'),{
type:'doughnut',
data:{labels:types,datasets:[{data:data,backgroundColor:colors.slice(0,types.length),borderColor:'#111128',borderWidth:2}]},
options:{responsive:true,maintainAspectRatio:true,aspectRatio:1.4,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.label+': R$ '+ctx.parsed.toLocaleString('pt-BR',{minimumFractionDigits:2})+' ('+((ctx.parsed/total)*100).toFixed(1)+'%)';}}}},cutout:'55%'}
});
var leg=document.getElementById('portfolioTypeLegend');
var lh='<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">';
types.forEach(function(t,i){var pct=(byType[t]/total*100).toFixed(1);lh+='<div style="display:flex;align-items:center;gap:3px;font-size:.68em"><div style="width:8px;height:8px;border-radius:2px;background:'+colors[i%colors.length]+'"></div><span style="color:var(--t2)">'+t+' <strong style="color:var(--t1)">'+pct+'%</strong></span></div>';});
lh+='</div>';if(leg)leg.innerHTML=lh;
}

function renderPortfolioReturnChart(){
var canvas=document.getElementById('portfolioReturnChart');if(!canvas)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=200;ctx.clearRect(0,0,W,200);
var items=[];
investments.forEach(function(inv){var base=invCostBasis(inv);var ret=base>0?((inv.atual||inv.valor||0)-base)/base*100:0;items.push({nome:inv.nome,ret:ret});});
items.sort(function(a,b){return b.ret-a.ret});items=items.slice(0,12);if(!items.length)return;
var maxAbs=Math.max.apply(null,items.map(function(i){return Math.abs(i.ret)}))||1;
var padding={t:15,r:10,b:25,l:10};var cH=200-padding.t-padding.b;
var barW=Math.min(28,(W-padding.l-padding.r)/items.length-6);var centerY=padding.t+cH/2;
items.forEach(function(item,i){
var x=padding.l+((W-padding.l-padding.r)/items.length)*i+((W-padding.l-padding.r)/items.length-barW)/2;
var h=Math.abs(item.ret/maxAbs)*(cH/2-10);var y=item.ret>=0?centerY-h:centerY;
var color=item.ret>=0?'#22C55E':'#EF4444';ctx.fillStyle=color;ctx.globalAlpha=0.7;
ctx.beginPath();ctx.rect(x,y,barW,h||2);ctx.fill();ctx.globalAlpha=1;
ctx.fillStyle=color;ctx.font='bold 8px Inter';ctx.textAlign='center';
ctx.fillText((item.ret>=0?'+':'')+item.ret.toFixed(1)+'%',x+barW/2,item.ret>=0?y-4:y+h+10);
ctx.fillStyle='rgba(128,128,128,.5)';ctx.font='7px Inter';
ctx.fillText(item.nome.length>6?item.nome.substring(0,6):item.nome,x+barW/2,200-6);
});
ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padding.l,centerY);ctx.lineTo(W-padding.r,centerY);ctx.stroke();
}

function renderPortfolioTable(){
var el=document.getElementById('portfolioTable');if(!investments||!investments.length){if(el)el.innerHTML='';return}
var sortBy=(document.getElementById('portfolioSort')||{}).value||'valor';
var items=investments.map(function(inv){
var base=invCostBasis(inv);
var ret=base>0?((inv.atual||inv.valor||0)-base)/base*100:0;
return{id:inv.id,date:inv.date,tipo:inv.tipo,nome:inv.nome,valor:base,atual:inv.atual||inv.valor,retPct:ret,retVal:(inv.atual||inv.valor||0)-base,qtd:inv.qtd};
});
if(sortBy==='valor')items.sort(function(a,b){return b.atual-a.atual});
else if(sortBy==='retorno')items.sort(function(a,b){return b.retPct-a.retPct});
else if(sortBy==='perda')items.sort(function(a,b){return a.retPct-b.retPct});
else if(sortBy==='tipo')items.sort(function(a,b){return(a.tipo||'').localeCompare(b.tipo||'')});
else if(sortBy==='nome')items.sort(function(a,b){return(a.nome||'').localeCompare(b.nome||'')});
var totalAtual=items.reduce(function(s,i){return s+i.atual},0);
var h='<table class="fin-tbl"><thead><tr><th>Ativo</th><th>Tipo</th><th>Qtd</th><th>Investido</th><th>Atual</th><th>Resultado</th><th>% Cart.</th><th></th></tr></thead><tbody>';
items.forEach(function(item){
var pctCart=totalAtual>0?(item.atual/totalAtual*100):0;
var qtdTxt=item.qtd&&item.qtd>0?item.qtd:'-';
h+='<tr><td><div style="font-weight:700;color:var(--t1)">'+item.nome+'</div><div style="font-size:.65em;color:var(--t3)">'+item.date+'</div></td>';
h+='<td><span style="font-size:.72em;padding:2px 6px;border-radius:4px;background:rgba(79,140,255,.1);color:var(--pri)">'+item.tipo+'</span></td>';
h+='<td style="font-size:.8em;color:var(--t2)">'+qtdTxt+'</td>';
h+='<td>'+fmt(item.valor)+'</td>';
h+='<td style="font-weight:600">'+fmt(item.atual)+'</td>';
h+='<td style="color:'+(item.retPct>=0?'#22C55E':'#EF4444')+'">'+(item.retPct>=0?'+':'')+item.retPct.toFixed(2)+'%<br><span style="font-size:.72em">'+(item.retVal>=0?'+':'')+fmt(item.retVal)+'</span></td>';
h+='<td><div style="display:flex;align-items:center;gap:4px"><div style="width:40px;height:5px;background:var(--brd);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,pctCart)+'%;background:var(--pri);border-radius:3px"></div></div><span style="font-size:.72em;color:var(--t2)">'+pctCart.toFixed(1)+'%</span></div></td>';
h+='<td><div style="display:flex;align-items:center;gap:6px"><button onclick="quickB3(\''+item.nome.toUpperCase().replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--pri);display:inline-flex;align-items:center;justify-content:center" title="Analisar na B3"><i data-lucide="search" style="width:18px;height:18px;stroke:currentColor;stroke-width:2"></i></button><button onclick="delInv('+item.id+')" style="background:none;border:none;cursor:pointer;padding:4px;color:#EF4444;display:inline-flex;align-items:center;justify-content:center" title="Excluir"><i data-lucide="trash-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2"></i></button></div></td></tr>';
});
h+='</tbody></table>';el.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

function renderPortfolioEvolution(){
var canvas=document.getElementById('portfolioEvolutionChart');if(!canvas||!investments||!investments.length)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=160;ctx.clearRect(0,0,W,160);
var byMonth={};
investments.forEach(function(inv){var m=inv.date?inv.date.substring(0,7):'unknown';if(!byMonth[m])byMonth[m]={investido:0,atual:0};byMonth[m].investido+=invCostBasis(inv);byMonth[m].atual+=inv.atual||inv.valor||0;});
var months=Object.keys(byMonth).sort();
if(months.length<2){ctx.fillStyle='rgba(128,128,128,.4)';ctx.font='12px Inter';ctx.textAlign='center';ctx.fillText('Adicione investimentos em meses diferentes para ver a evolucao',W/2,80);return;}
var cumInv=0,cumAtual=0;var points=[];
months.forEach(function(m){cumInv+=byMonth[m].investido;cumAtual+=byMonth[m].atual;points.push({month:m,investido:cumInv,atual:cumAtual});});
var maxV=Math.max.apply(null,points.map(function(p){return Math.max(p.investido,p.atual)}))||1;
var pad={t:15,r:10,b:25,l:10};var cW=W-pad.l-pad.r;var cH=160-pad.t-pad.b;
ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH);
points.forEach(function(p,i){var x=pad.l+(i/(points.length-1))*cW;var y=pad.t+cH-(p.investido/maxV)*cH;ctx.lineTo(x,y);});
ctx.lineTo(pad.l+cW,pad.t+cH);ctx.closePath();ctx.fillStyle='rgba(79,140,255,.1)';ctx.fill();
ctx.beginPath();points.forEach(function(p,i){var x=pad.l+(i/(points.length-1))*cW;var y=pad.t+cH-(p.investido/maxV)*cH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle='#4F8CFF';ctx.lineWidth=2;ctx.stroke();
ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH);
points.forEach(function(p,i){var x=pad.l+(i/(points.length-1))*cW;var y=pad.t+cH-(p.atual/maxV)*cH;ctx.lineTo(x,y);});
ctx.lineTo(pad.l+cW,pad.t+cH);ctx.closePath();ctx.fillStyle='rgba(34,197,94,.08)';ctx.fill();
ctx.beginPath();points.forEach(function(p,i){var x=pad.l+(i/(points.length-1))*cW;var y=pad.t+cH-(p.atual/maxV)*cH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle='#22C55E';ctx.lineWidth=2;ctx.stroke();
ctx.font='8px Inter';ctx.textAlign='center';ctx.fillStyle='rgba(128,128,128,.5)';
points.forEach(function(p,i){if(i%(Math.ceil(points.length/6))===0||i===points.length-1){var x=pad.l+(i/(points.length-1))*cW;ctx.fillText(p.month.substring(5)+'/'+p.month.substring(2,4),x,160-6);}});
ctx.font='9px Inter';ctx.fillStyle='#4F8CFF';ctx.fillRect(W-170,5,10,3);ctx.fillText('Investido',W-148,9);
ctx.fillStyle='#22C55E';ctx.fillRect(W-90,5,10,3);ctx.fillText('Atual',W-68,9);
}

function calcPrecoMedio(){
var ticker=(document.getElementById('pmTicker').value||'').trim().toUpperCase();
var qtdAtual=parseFloat(document.getElementById('pmQtdAtual').value)||0;
var pmAtual=parseFloat(document.getElementById('pmPrecoAtual').value)||0;
var qtdNova=parseFloat(document.getElementById('pmQtdNova').value)||0;
var precoNovo=parseFloat(document.getElementById('pmPrecoNovo').value)||0;
if(qtdNova<=0||precoNovo<=0){toast(typeof t==='function'?t('toast_preencha_qtd_preco'):'Preencha qtd e preco da nova compra','err');return}
var totalAtual=qtdAtual*pmAtual;var totalNovo=qtdNova*precoNovo;
var qtdTotal=qtdAtual+qtdNova;var pmNovo=qtdTotal>0?(totalAtual+totalNovo)/qtdTotal:0;
var diff=pmAtual>0?((pmNovo/pmAtual-1)*100):0;
var color=diff<0?'#22C55E':'#EF4444';
var h='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
h+='<div><span style="font-size:.72em;color:var(--t3)">PM Anterior:</span> <strong>R$ '+pmAtual.toFixed(2)+'</strong></div>';
h+='<div style="font-size:1.1em">&#10132;</div>';
h+='<div><span style="font-size:.72em;color:var(--t3)">Novo PM:</span> <strong style="color:'+color+'">R$ '+pmNovo.toFixed(2)+'</strong></div>';
h+='<div style="font-size:.75em;color:'+color+'">'+(diff>=0?'+':'')+diff.toFixed(2)+'%</div>';
h+='<div style="font-size:.72em;color:var(--t3)">Total: '+qtdTotal+' cotas | R$ '+(totalAtual+totalNovo).toFixed(2)+'</div></div>';
document.getElementById('pmResult').innerHTML=h;
}

function toggleAllocTargets(){var el=document.getElementById('allocTargets');el.style.display=el.style.display==='none'?'block':'none';
if(allocTargetsData){var map={'Ações':'allocAcoes','FIIs':'allocFIIs','Renda Fixa':'allocRF','Cripto':'allocCripto','Outros':'allocOutros'};for(var k in map){var inp=document.getElementById(map[k]);if(inp&&allocTargetsData[k]!==undefined)inp.value=allocTargetsData[k];}}}

function saveAllocTargets(){
allocTargetsData={'Ações':parseFloat(document.getElementById('allocAcoes').value)||0,'FIIs':parseFloat(document.getElementById('allocFIIs').value)||0,'Renda Fixa':parseFloat(document.getElementById('allocRF').value)||0,'Cripto':parseFloat(document.getElementById('allocCripto').value)||0,'Outros':parseFloat(document.getElementById('allocOutros').value)||0};
localStorage.setItem('vrt_allocTargets',JSON.stringify(allocTargetsData));renderAllocComparison();toast(typeof t==='function'?t('toast_metas_alocacao_salvas'):'Metas salvas!','ok');document.getElementById('allocTargets').style.display='none';
}

function renderAllocComparison(){
var el=document.getElementById('allocComparison');if(!investments||!investments.length||!allocTargetsData){if(el)el.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:8px">Registre investimentos para comparar com metas.</div>';return}
var typeMap={'Ações':['Ações','ETFs'],'FIIs':['FIIs'],'Renda Fixa':['Renda Fixa','Tesouro Direto','CDB','LCI/LCA','Poupança','Poupanca','Previdência','Previdencia'],'Cripto':['Cripto'],'Outros':['Outros']};
var totalAtual=0;investments.forEach(function(inv){totalAtual+=inv.atual||inv.valor||0});if(totalAtual<=0){if(el)el.innerHTML='';return}
var realAlloc={};for(var cat in typeMap){realAlloc[cat]=0;investments.forEach(function(inv){if(typeMap[cat].indexOf(inv.tipo)>=0)realAlloc[cat]+=(inv.atual||inv.valor||0);});realAlloc[cat]=(realAlloc[cat]/totalAtual)*100;}
var catColors={'Ações':'#4F8CFF','FIIs':'#22C55E','Renda Fixa':'#A855F7','Cripto':'#F59E0B','Outros':'#94a3b8'};
var categories=['Ações','FIIs','Renda Fixa','Cripto','Outros'];
var h='<div style="display:grid;gap:8px">';
categories.forEach(function(cat){
var target=allocTargetsData[cat]||0;var real=realAlloc[cat]||0;var diff=real-target;
var diffColor=Math.abs(diff)<3?'#22C55E':(Math.abs(diff)<10?'#EAB308':'#EF4444');
var action=diff>3?'Reduzir':(diff<-3?'Aumentar':'OK');
h+='<div style="display:flex;align-items:center;gap:10px;padding:6px 0">';
h+='<div style="width:8px;height:8px;border-radius:2px;background:'+catColors[cat]+'"></div>';
h+='<div style="width:80px;font-size:.82em;font-weight:600;color:var(--t1)">'+cat+'</div>';
h+='<div style="flex:1;position:relative;height:20px;background:var(--bg);border-radius:4px;overflow:hidden">';
h+='<div style="position:absolute;height:100%;width:'+Math.min(100,real)+'%;background:'+catColors[cat]+'40;border-radius:4px"></div>';
h+='<div style="position:absolute;height:100%;width:2px;left:'+Math.min(100,target)+'%;background:'+catColors[cat]+';border-radius:1px"></div></div>';
h+='<div style="width:50px;text-align:right;font-size:.78em;font-weight:700;color:var(--t1)">'+real.toFixed(1)+'%</div>';
h+='<div style="width:40px;text-align:right;font-size:.68em;color:var(--t3)">meta '+target+'%</div>';
h+='<div style="width:60px;text-align:right;font-size:.72em;font-weight:600;color:'+diffColor+'">'+action+'</div></div>';
});
h+='</div>';if(el)el.innerHTML=h;
}

async function refreshPortfolio(){
if(!investments||!investments.length){toast(typeof t==='function'?t('toast_nenhum_inv_atualizar'):'Nenhum investimento','err');return}
var tickers=[];investments.forEach(function(inv){var name=(inv.nome||'').toUpperCase().trim();if(/^[A-Z]{4}[0-9]{1,2}$/.test(name)&&tickers.indexOf(name)<0)tickers.push(name);});
if(!tickers.length){toast(typeof t==='function'?t('toast_nenhum_ticker_b3'):'Nenhum ticker B3 identificado','err');renderPortfolio();return}
toast('Atualizando '+tickers.length+' ativos...','ok');
try{
var priceMap={};
for(var i=0;i<tickers.length;i+=5){
var batch=tickers.slice(i,i+5);
try{
var data;
if(typeof brapiMultiFn==='function'){try{var resp=await brapiMultiFn({tickers:batch});data=resp.data;}catch(e){var token=localStorage.getItem('vrt_b3token')||'';var r2=await fetch('https://brapi.dev/api/quote/'+batch.join(',')+'?token='+token);data=await r2.json();}}
else{var token=localStorage.getItem('vrt_b3token')||'';var r2=await fetch('https://brapi.dev/api/quote/'+batch.join(',')+'?token='+token);data=await r2.json();}
if(data&&data.results)data.results.forEach(function(s){priceMap[s.symbol]=s.regularMarketPrice||0;});
}catch(e){console.warn('Batch err:',e)}
if(i+5<tickers.length)await new Promise(function(r){setTimeout(r,300)});
}
var updated=0;
investments.forEach(function(inv){var name=(inv.nome||'').toUpperCase().trim();if(priceMap[name]&&priceMap[name]>0){if(inv.qtd&&inv.qtd>0){inv.atual=Math.round(priceMap[name]*inv.qtd*100)/100;}else{var precoCompra=inv.precoCompra;if(!precoCompra){inv.precoCompra=priceMap[name];precoCompra=inv.precoCompra;}if(precoCompra>0){inv.atual=Math.round(inv.valor*(priceMap[name]/precoCompra)*100)/100;}}updated++;}});
saveData();renderPortfolio();renderAll();toast(updated+' ativos atualizados!','ok');
}catch(e){toast('Erro: '+e.message,'err');renderPortfolio();}
}

function exportPortfolioPDF(){
if(!investments||!investments.length){toast(typeof t==='function'?t('toast_nenhum_inv_atualizar'):'Nenhum investimento','err');return}
var totalInv=0,totalAtual=0;investments.forEach(function(inv){totalInv+=invCostBasis(inv);totalAtual+=inv.atual||inv.valor||0;});
var retorno=totalAtual-totalInv;var pctRet=totalInv>0?((retorno/totalInv)*100):0;
var txt='=== PORTFOLIO SIBANKI ===\n';
txt+='Data: '+new Date().toLocaleDateString('pt-BR')+'\n';
txt+='Total Investido: R$ '+totalInv.toFixed(2)+'\nValor Atual: R$ '+totalAtual.toFixed(2)+'\n';
txt+='Resultado: '+(retorno>=0?'+':'')+retorno.toFixed(2)+' ('+pctRet.toFixed(2)+'%)\n\n--- DETALHAMENTO ---\n';
investments.forEach(function(inv){var base=invCostBasis(inv);var ret=base>0?((inv.atual||inv.valor||0)-base)/base*100:0;txt+=inv.nome+' ('+inv.tipo+') | R$ '+base.toFixed(2)+' -> R$ '+(inv.atual||inv.valor||0).toFixed(2)+' | '+(ret>=0?'+':'')+ret.toFixed(2)+'%\n';});
try{navigator.clipboard.writeText(txt);toast(typeof t==='function'?t('toast_portfolio_copiado'):'Portfolio copiado!','ok');}catch(e){var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast(typeof t==='function'?t('toast_portfolio_copiado'):'Portfolio copiado!','ok');}
}

function quickB3(ticker){if(!ticker)return;if(typeof showInvSub==='function')showInvSub('invAnalise');var si=document.getElementById('b3Search');if(si){si.value=ticker.toUpperCase();if(typeof searchB3==='function')searchB3();setTimeout(function(){var re=document.getElementById('b3Result');if(re)re.scrollIntoView({behavior:'smooth',block:'start'});},400);}}


// ============================================
// SPRINT 5: FERRAMENTAS AVANCADAS
// ============================================

// --- 5.1 SIMULADOR FIRE ---
function toggleFireHelp(){var el=document.getElementById('fireHelp');el.style.display=el.style.display==='none'?'block':'none'}

function autoFillFIRE(){
// Preencher com dados do usuario
var totalInv=0;
if(investments&&investments.length){investments.forEach(function(inv){totalInv+=inv.atual||inv.valor||0})}
document.getElementById('firePatrimonio').value=Math.round(totalInv);

// Calcular gasto medio mensal
var gastoMensal=0;
var now=new Date();var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
if(entries&&entries.length){
var gastos=entries.filter(function(e){return e.type==='despesa'&&e.date&&e.date.substring(0,7)===mesAtual});
gastos.forEach(function(e){gastoMensal+=Math.abs(e.amount||0)});
if(gastoMensal===0){
// Se nao tem gastos do mes atual, pegar media dos ultimos 3 meses
var total3=0,count3=0;
entries.forEach(function(e){if(e.type==='despesa'){total3+=Math.abs(e.amount||0);count3++}});
gastoMensal=count3>0?Math.round(total3/Math.min(3,Math.ceil(count3/30))):5000;
}
}
document.getElementById('fireGasto').value=Math.round(gastoMensal)||5000;
toast(typeof t==='function'?t('toast_dados_preenchidos_auto'):'Dados preenchidos automaticamente!','ok');
}

function calcFIRE(){
var patrimônio=parseFloat(document.getElementById('firePatrimonio').value)||0;
var aporte=parseFloat(document.getElementById('fireAporte').value)||0;
var gasto=parseFloat(document.getElementById('fireGasto').value)||0;
var rentAnual=parseFloat(document.getElementById('fireRent').value)||10;
var inflacao=parseFloat(document.getElementById('fireInflacao').value)||4.5;
var idade=parseInt(document.getElementById('fireIdade').value)||30;

if(gasto<=0){toast(typeof t==='function'?t('toast_informe_gasto_mensal'):'Informe o gasto mensal','err');return}

// Patrimonio necessario (regra 4% ajustada pela inflacao)
var taxaReal=(1+rentAnual/100)/(1+inflacao/100)-1;
var taxaRetirada=taxaReal>0.04?0.04:taxaReal*0.9;
if(taxaRetirada<=0)taxaRetirada=0.03;
var patrimônioFIRE=Math.round((gasto*12)/taxaRetirada);

// Simulação mes a mes
var rentMensal=Math.pow(1+rentAnual/100,1/12)-1;
var inflacaoMensal=Math.pow(1+inflacao/100,1/12)-1;
var saldo=patrimônio;
var gastoAtual=gasto;
var meses=0;
var maxMeses=600; // 50 anos max
var pontos=[];

while(saldo<patrimônioFIRE&&meses<maxMeses){
saldo=saldo*(1+rentMensal)+aporte;
gastoAtual=gastoAtual*(1+inflacaoMensal);
patrimônioFIRE=(gastoAtual*12)/taxaRetirada;
meses++;
if(meses%12===0||meses<=6){pontos.push({mes:meses,saldo:saldo,meta:patrimônioFIRE})}
}

var anos=Math.floor(meses/12);
var mesesRestantes=meses%12;
var idadeFIRE=idade+anos;
var totalAportado=patrimônio+aporte*meses;
var totalRendimentos=saldo-totalAportado;

// Resultado
var el=document.getElementById('fireResult');
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px">';

if(meses>=maxMeses){
h+='<div class="b3-metric" style="grid-column:1/-1;border-color:#EF4444"><div class="b3-metric-label" style="color:#EF4444">Resultado</div><div class="b3-metric-value" style="color:#EF4444">Inviavel com os parametros atuais</div><div class="b3-metric-sub">Aumente o aporte ou reduza o gasto mensal</div></div>';
}else{
h+='<div class="b3-metric" style="border-color:#22C55E"><div class="b3-metric-label">Liberdade Financeira em</div><div class="b3-metric-value" style="color:#22C55E;font-size:1.5em">'+anos+' anos'+(mesesRestantes>0?' e '+mesesRestantes+' meses':'')+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Idade FIRE</div><div class="b3-metric-value" style="color:#A855F7;font-size:1.5em">'+idadeFIRE+' anos</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Patrimonio Necessario</div><div class="b3-metric-value">'+fmt(patrimônioFIRE)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Renda Passiva Mensal</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(Math.round(patrimônioFIRE*taxaRetirada/12))+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Total Aportado</div><div class="b3-metric-value">'+fmt(totalAportado)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Rendimentos</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(Math.round(totalRendimentos))+'</div><div class="b3-metric-sub">'+((totalRendimentos/saldo)*100).toFixed(1)+'% do patrimônio final</div></div>';
}
h+='</div>';

// Dica
if(meses<maxMeses){
var pctRendimentos=((totalRendimentos/saldo)*100).toFixed(0);
h+='<div style="padding:10px 14px;background:linear-gradient(135deg,rgba(34,197,94,.06),rgba(16,185,129,.03));border:1px solid rgba(34,197,94,.2);border-radius:10px;font-size:.82em;color:var(--t2);line-height:1.7">';
h+='<strong style="color:#22C55E">&#128161; Insight:</strong> ';
if(anos<=10)h+='Excelente! Voce pode alcancar a liberdade financeira em menos de uma decada. Mantenha a disciplina!';
else if(anos<=20)h+='Bom caminho! Para acelerar, tente aumentar o aporte em '+fmt(Math.round(aporte*0.2))+'/mes (20% a mais).';
else if(anos<=30)h+='Longo prazo. Considere aumentar seus aportes ou buscar investimentos com maior rentabilidade.';
else h+='Muito longo. Reavalie: aumente os aportes significativamente ou reduza o custo de vida.';
h+=' Os juros compostos representam <strong style="color:var(--t1)">'+pctRendimentos+'%</strong> do seu patrimônio final!</div>';
}

el.innerHTML=h;

// Grafico FIRE
renderFireChart(pontos,patrimônioFIRE);
}

function renderFireChart(pontos,meta){
var canvas=document.getElementById('fireChart');if(!canvas||!pontos.length)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=200;ctx.clearRect(0,0,W,200);
var maxV=Math.max.apply(null,pontos.map(function(p){return Math.max(p.saldo,p.meta)}))||1;
var pad={t:15,r:10,b:25,l:10};var cW=W-pad.l-pad.r;var cH=200-pad.t-pad.b;

// Area saldo
ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH);
pontos.forEach(function(p,i){var x=pad.l+(i/(pontos.length-1))*cW;var y=pad.t+cH-(p.saldo/maxV)*cH;ctx.lineTo(x,y)});
ctx.lineTo(pad.l+cW,pad.t+cH);ctx.closePath();ctx.fillStyle='rgba(34,197,94,.1)';ctx.fill();

// Linha saldo
ctx.beginPath();pontos.forEach(function(p,i){var x=pad.l+(i/(pontos.length-1))*cW;var y=pad.t+cH-(p.saldo/maxV)*cH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
ctx.strokeStyle='#22C55E';ctx.lineWidth=2;ctx.stroke();

// Linha meta
ctx.beginPath();pontos.forEach(function(p,i){var x=pad.l+(i/(pontos.length-1))*cW;var y=pad.t+cH-(p.meta/maxV)*cH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
ctx.strokeStyle='#EF4444';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);

// Labels
ctx.font='8px Inter';ctx.textAlign='center';ctx.fillStyle='rgba(128,128,128,.5)';
pontos.forEach(function(p,i){if(i%(Math.ceil(pontos.length/8))===0||i===pontos.length-1){var x=pad.l+(i/(pontos.length-1))*cW;ctx.fillText(Math.floor(p.mes/12)+'a',x,200-6)}});

// Legenda
ctx.font='9px Inter';ctx.fillStyle='#22C55E';ctx.fillRect(W-180,5,10,3);ctx.fillText('Patrimonio',W-154,9);
ctx.fillStyle='#EF4444';ctx.fillRect(W-90,5,10,3);ctx.fillText('Meta FIRE',W-64,9);
}

// --- 5.2 PERFIL DO INVESTIDOR ---
var investorProfileData=null; // salvo também em Firestore (saveData)
var profileQuestions=[
{q:'Qual seu objetivo principal ao investir?',opts:['Preservar capital (nao perder dinheiro)',1,'Renda passiva (receber dividendos)',2,'Crescimento moderado',3,'Maximizar retorno (aceito riscos)',4]},
{q:'Se seu investimento caisse 20% em um mes, voce:',opts:['Venderia tudo imediatamente',1,'Ficaria preocupado e venderia parte',2,'Manteria e aguardaria recuperação',3,'Compraria mais aproveitando a queda',4]},
{q:'Quando pretende usar o dinheiro investido?',opts:['Menos de 1 ano',1,'Entre 1 e 3 anos',2,'Entre 3 e 10 anos',3,'Mais de 10 anos',4]},
{q:'Qual sua experiencia com investimentos?',opts:['Nenhuma - so poupanca',1,'Basica - renda fixa',2,'Intermediária - ações e fundos',3,'Avancada - derivativos, cripto, etc.',4]},
{q:'Qual percentual da sua renda voce consegue investir?',opts:['Menos de 10%',1,'Entre 10% e 20%',2,'Entre 20% e 40%',3,'Mais de 40%',4]},
{q:'Como voce reage a noticias negativas sobre economia?',opts:['Fico muito ansioso',1,'Fico preocupado mas aguardo',2,'Analiso com calma',3,'Vejo como oportunidade',4]},
{q:'Qual investimento te atrai mais?',opts:['CDB/Tesouro Selic (seguro)',1,'Tesouro IPCA/Fundos RF (moderado)',2,'Acoes/FIIs (variavel)',3,'Cripto/Opcoes (alto risco)',4]}
];
var profileStep=0;
var profileAnswers=[];

function initProfileQuiz(){
profileStep=0;profileAnswers=[];
var saved=localStorage.getItem('vrt_investorProfile');
if(!saved&&typeof investorProfileData==='object'&&investorProfileData){
try{localStorage.setItem('vrt_investorProfile',JSON.stringify(investorProfileData));}catch(e){}
saved=localStorage.getItem('vrt_investorProfile');
}
if(saved){
try{
var data=JSON.parse(saved);
showProfileResult(data.score,data.profile,data.date);
return;
}catch(e){}
}
renderProfileStep();
}

function openInvestorProfilePopup(){
window._profileQuizInModal=true;
profileStep=0;profileAnswers=[];
var ov=document.getElementById('investorProfileModalOv');
if(ov){ov.classList.add('show');}
if(typeof lucide!=='undefined')lucide.createIcons();
renderProfileStepModal();
}

function closeInvestorProfileModal(){
window._profileQuizInModal=false;
var ov=document.getElementById('investorProfileModalOv');
if(ov){ov.classList.remove('show');}
}

function renderProfileStepModal(){
var el=document.getElementById('profileQuizContentModal');
var nav=document.getElementById('profileQuizNavModal');
if(!el||!nav)return;
if(profileStep>=profileQuestions.length){
finishProfile();return;
}
var q=profileQuestions[profileStep];
var h='<div style="margin-bottom:12px"><div style="font-size:.72em;color:var(--t3);margin-bottom:6px">Pergunta '+(profileStep+1)+' de '+profileQuestions.length+'</div>';
h+='<div style="height:4px;background:var(--brd);border-radius:2px;overflow:hidden;margin-bottom:12px"><div style="height:100%;width:'+((profileStep+1)/profileQuestions.length*100)+'%;background:linear-gradient(90deg,#4F8CFF,#7C5CFC);border-radius:2px;transition:width .3s"></div></div>';
h+='<div style="font-size:.95em;font-weight:700;color:var(--t1);margin-bottom:14px">'+q.q+'</div>';
h+='<div style="display:grid;gap:8px">';
for(var i=0;i<q.opts.length;i+=2){
var text=q.opts[i];var val=q.opts[i+1];
h+='<div class="b3-chip" onclick="selectProfileAnswerModal('+val+')" style="padding:10px 14px;font-size:.85em;cursor:pointer;text-align:left;border:1px solid var(--brd);border-radius:10px;transition:all .2s'+(profileAnswers[profileStep]===val?';border-color:var(--pri);background:rgba(79,140,255,.08)':'')+'">'+text+'</div>';
}
h+='</div></div>';
el.innerHTML=h;
var nh='';
if(profileStep>0)nh+='<button class="btn btn-r btn-sm" onclick="profileStep--;renderProfileStepModal()" style="font-size:.78em">&#9664; Anterior</button>';
else nh+='<div></div>';
nh+='<button class="btn btn-b btn-sm" onclick="nextProfileStepModal()" style="font-size:.78em">'+(profileStep===profileQuestions.length-1?'Ver Resultado &#10003;':'Próximo &#9654;')+'</button>';
nav.innerHTML=nh;
if(typeof lucide!=='undefined')lucide.createIcons();
}

function selectProfileAnswerModal(val){profileAnswers[profileStep]=val;renderProfileStepModal();}

function nextProfileStepModal(){
if(profileAnswers[profileStep]===undefined){toast(typeof t==='function'?t('toast_selecione_opcao'):'Selecione uma opção','err');return;}
profileStep++;renderProfileStepModal();
}

function renderProfileStep(){
var el=document.getElementById('profileQuizContent');
var nav=document.getElementById('profileQuizNav');
document.getElementById('profileResult').style.display='none';
document.getElementById('profileQuiz').style.display='block';

if(profileStep>=profileQuestions.length){
finishProfile();return;
}

var q=profileQuestions[profileStep];
var h='<div style="margin-bottom:12px"><div style="font-size:.72em;color:var(--t3);margin-bottom:6px">Pergunta '+(profileStep+1)+' de '+profileQuestions.length+'</div>';
h+='<div style="height:4px;background:var(--brd);border-radius:2px;overflow:hidden;margin-bottom:12px"><div style="height:100%;width:'+((profileStep+1)/profileQuestions.length*100)+'%;background:linear-gradient(90deg,#4F8CFF,#7C5CFC);border-radius:2px;transition:width .3s"></div></div>';
h+='<div style="font-size:.95em;font-weight:700;color:var(--t1);margin-bottom:14px">'+q.q+'</div>';
h+='<div style="display:grid;gap:8px">';
for(var i=0;i<q.opts.length;i+=2){
var text=q.opts[i];var val=q.opts[i+1];
var selected=profileAnswers[profileStep]===val?' style="border-color:var(--pri);background:rgba(79,140,255,.08)"':'';
h+='<div class="b3-chip" onclick="selectProfileAnswer('+val+')"'+selected+' style="padding:10px 14px;font-size:.85em;cursor:pointer;text-align:left;border:1px solid var(--brd);border-radius:10px;transition:all .2s'+(profileAnswers[profileStep]===val?';border-color:var(--pri);background:rgba(79,140,255,.08)':'')+'">'+text+'</div>';
}
h+='</div></div>';
el.innerHTML=h;

// Nav
var nh='';
if(profileStep>0)nh+='<button class="btn btn-r btn-sm" onclick="profileStep--;renderProfileStep()" style="font-size:.78em">&#9664; Anterior</button>';
else nh+='<div></div>';
nh+='<button class="btn btn-b btn-sm" onclick="nextProfileStep()" style="font-size:.78em">'+(profileStep===profileQuestions.length-1?'Ver Resultado &#10003;':'Próximo &#9654;')+'</button>';
nav.innerHTML=nh;
}

function selectProfileAnswer(val){profileAnswers[profileStep]=val;renderProfileStep()}

function nextProfileStep(){
if(profileAnswers[profileStep]===undefined){toast(typeof t==='function'?t('toast_selecione_opcao'):'Selecione uma opção','err');return}
profileStep++;renderProfileStep();
}

function finishProfile(){
var total=0;profileAnswers.forEach(function(a){total+=a||0});
var maxScore=profileQuestions.length*4;
var pct=(total/maxScore)*100;
var profile,color,icon,desc,allocation;

if(pct<=30){
profile='Conservador';color='#3B82F6';icon='&#128737;';
desc='Voce prioriza seguranca e previsibilidade. Prefere investimentos de baixo risco com retornos estaveis.';
allocation={rf:70,fiis:15,acoes:10,cripto:0,outros:5};
}else if(pct<=50){
profile='Moderado';color='#22C55E';icon='&#9878;';
desc='Voce busca equilibrio entre seguranca e rentabilidade. Aceita algum risco para obter retornos melhores.';
allocation={rf:45,fiis:20,acoes:25,cripto:5,outros:5};
}else if(pct<=75){
profile='Arrojado';color='#F59E0B';icon='&#128640;';
desc='Voce tem boa tolerancia a risco e busca retornos acima da media. Aceita volatilidade no curto prazo.';
allocation={rf:20,fiis:20,acoes:40,cripto:10,outros:10};
}else{
profile='Agressivo';color='#EF4444';icon='&#9889;';
desc='Voce busca maximizar retornos e tem alta tolerancia a risco. Aceita perdas significativas em busca de grandes ganhos.';
allocation={rf:10,fiis:10,acoes:45,cripto:25,outros:10};
}

var data={score:total,pct:pct,profile:profile,date:new Date().toLocaleDateString('pt-BR')};
localStorage.setItem('vrt_investorProfile',JSON.stringify(data));
investorProfileData=data;
if(typeof saveData==='function')saveData();
var wasModal=!!window._profileQuizInModal;
if(wasModal){
closeInvestorProfileModal();
window._profileQuizInModal=false;
if(typeof showInvSub==='function')showInvSub('invPerfil');
}
showProfileResult(total,profile,data.date);
if(wasModal&&typeof toast==='function')toast(typeof t==='function'?t('toast_perfil_investidor_salvo'):'Perfil do investidor salvo!','ok');
}

function showProfileResult(score,profile,date){
document.getElementById('profileQuiz').style.display='none';
var el=document.getElementById('profileResult');el.style.display='block';
var maxScore=profileQuestions.length*4;
var pct=(score/maxScore)*100;
var color,icon,desc,allocation;

if(pct<=30){profile='Conservador';color='#3B82F6';icon='&#128737;';desc='Voce prioriza seguranca. Foque em Renda Fixa, Tesouro Direto e FIIs de tijolo.';allocation={rf:70,fiis:15,acoes:10,cripto:0,outros:5};}
else if(pct<=50){profile='Moderado';color='#22C55E';icon='&#9878;';desc='Equilibrio entre seguranca e retorno. Mix de RF, FIIs e acoes blue chips.';allocation={rf:45,fiis:20,acoes:25,cripto:5,outros:5};}
else if(pct<=75){profile='Arrojado';color='#F59E0B';icon='&#128640;';desc='Boa tolerancia a risco. Acoes, FIIs e uma parcela em cripto fazem sentido.';allocation={rf:20,fiis:20,acoes:40,cripto:10,outros:10};}
else{profile='Agressivo';color='#EF4444';icon='&#9889;';desc='Alta tolerancia. Acoes growth, cripto e ativos alternativos no foco.';allocation={rf:10,fiis:10,acoes:45,cripto:25,outros:10};}

var h='<div style="text-align:center;padding:16px">';
h+='<div style="font-size:3em;margin-bottom:8px">'+icon+'</div>';
h+='<div style="font-size:1.5em;font-weight:900;color:'+color+';margin-bottom:4px">'+profile+'</div>';
h+='<div style="font-size:.82em;color:var(--t3);margin-bottom:12px">Pontuação: '+score+'/'+maxScore+' | Avaliado em '+date+'</div>';
h+='<div style="font-size:.88em;color:var(--t2);max-width:500px;margin:0 auto 16px;line-height:1.7">'+desc+'</div>';

// Alocação sugerida
h+='<div style="font-size:.85em;font-weight:700;color:var(--t1);margin-bottom:10px">Alocação Sugerida:</div>';
h+='<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">';
var catColors2={'rf':'#4F8CFF','fiis':'#22C55E','acoes':'#F59E0B','cripto':'#A855F7','outros':'#94a3b8'};
var catNames={'rf':'Renda Fixa','fiis':'FIIs','acoes':'Ações','cripto':'Cripto','outros':'Outros'};
for(var k in allocation){
if(allocation[k]>0){
h+='<div style="padding:6px 12px;border-radius:8px;background:'+catColors2[k]+'15;border:1px solid '+catColors2[k]+'40;font-size:.78em"><span style="color:'+catColors2[k]+';font-weight:700">'+allocation[k]+'%</span> <span style="color:var(--t2)">'+catNames[k]+'</span></div>';
}
}
h+='</div>';

// Dica elaborada: Alocação ideal para o seu perfil
h+='<div style="text-align:left;margin:18px 0;padding:18px 20px;background:linear-gradient(135deg,rgba(79,140,255,.08),rgba(124,92,252,.04));border:1px solid rgba(79,140,255,.25);border-radius:14px;border-left:5px solid '+color+'">';
h+='<div style="font-size:.9em;font-weight:800;color:var(--t1);margin-bottom:10px;display:flex;align-items:center;gap:8px">💡 Alocação ideal para o seu perfil</div>';
h+='<div style="font-size:.82em;color:var(--t2);line-height:1.7;margin-bottom:12px">A divisão acima foi sugerida para o perfil <strong style="color:'+color+'">'+profile+'</strong>. Ela equilibra <strong>risco e retorno</strong> dentro da sua tolerância, com base nas suas respostas ao questionário.</div>';
h+='<ul style="margin:0 0 12px;padding-left:18px;font-size:.8em;color:var(--t2);line-height:1.75">';
h+='<li><strong>Use como referência</strong> ao montar ou rebalancear sua carteira.</li>';
h+='<li><strong>Diversificação:</strong> não concentre tudo em um único ativo; a alocação distribui entre Renda Fixa, Ações, FIIs e outros.</li>';
h+='<li><strong>Rebalanceamento:</strong> na seção "Alocação Ideal vs Atual" (abaixo) você compara com o que tem hoje e ajusta aos poucos.</li>';
h+='</ul>';
h+='<div style="font-size:.78em;color:var(--t3);font-style:italic">Recomendação educativa. Considere consultar um profissional para decisões de investimento.</div>';
h+='</div>';

h+='<button class="btn btn-r btn-sm" onclick="profileStep=0;profileAnswers=[];investorProfileData=null;localStorage.removeItem(\'vrt_investorProfile\');renderProfileStep();if(typeof saveData===\'function\')saveData()" style="font-size:.78em">&#128260; Refazer questionário</button>';
h+='</div>';
el.innerHTML=h;

// Badge no header
var badge=document.getElementById('profileBadge');
if(badge)badge.innerHTML='<span style="padding:3px 10px;border-radius:6px;background:'+color+'20;color:'+color+';font-weight:700">'+icon+' '+profile+'</span>';
}

// --- 5.3 CALENDARIO DE PROVENTOS ---
var proventos=JSON.parse(localStorage.getItem('vrt_proventos')||'[]');
var _proventoConfirmId=null;

function openProventoModal(){
var ov=document.getElementById('proventoModalOverlay');
var tickerEl=document.getElementById('proventoModalTicker');
var tipoEl=document.getElementById('proventoModalTipo');
var valorEl=document.getElementById('proventoModalValor');
var dataEl=document.getElementById('proventoModalData');
if(!ov||!tickerEl)return;
tickerEl.value='';tipoEl.value='dividendo';valorEl.value='';dataEl.value=new Date().toISOString().substring(0,10);
ov.style.display='flex';
setTimeout(function(){if(tickerEl)tickerEl.focus();},100);
}
function closeProventoModal(){
var ov=document.getElementById('proventoModalOverlay');
if(ov)ov.style.display='none';
}
function saveProventoFromModal(){
var tickerEl=document.getElementById('proventoModalTicker');
var tipoEl=document.getElementById('proventoModalTipo');
var valorEl=document.getElementById('proventoModalValor');
var dataEl=document.getElementById('proventoModalData');
if(!tickerEl||!valorEl||!dataEl)return;
var ticker=(tickerEl.value||'').toUpperCase().trim();
if(!ticker){toast(typeof t==='function'?t('toast_valor_invalido'):'Informe o ticker','err');return}
var valor=parseFloat(String(valorEl.value).replace(',','.'));
if(!valor||valor<=0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}
var data=(dataEl.value||'').trim();
if(!data){toast(typeof t==='function'?t('toast_valor_invalido'):'Informe a data','err');return}
var tipo=(tipoEl&&tipoEl.value)?tipoEl.value:'dividendo';
proventos.push({id:Date.now(),ticker:ticker,tipo:tipo.toLowerCase(),valor:valor,data:data});
localStorage.setItem('vrt_proventos',JSON.stringify(proventos));
renderProventos();
closeProventoModal();
toast(typeof t==='function'?t('toast_provento_registrado'):'Provento registrado!','ok');
}

function addProvento(){openProventoModal();}

function closeProventoConfirm(){
var ov=document.getElementById('proventoConfirmOverlay');
if(ov)ov.style.display='none';
_proventoConfirmId=null;
}
function delProvento(id){
_proventoConfirmId=id;
var ov=document.getElementById('proventoConfirmOverlay');
var btn=document.getElementById('proventoConfirmExcluirBtn');
if(!ov||!btn)return;
btn.onclick=function(){
if(_proventoConfirmId==null)return;
proventos=proventos.filter(function(p){return p.id!==_proventoConfirmId});
localStorage.setItem('vrt_proventos',JSON.stringify(proventos));
renderProventos();
closeProventoConfirm();
toast(typeof t==='function'?t('toast_excluido'):'Excluído','err');
};
ov.style.display='flex';
}

async function loadProventosB3(){
if(!investments||!investments.length){toast(typeof t==='function'?t('toast_registre_investimentos'):'Registre investimentos primeiro','err');return}
var tickers=[];
investments.forEach(function(inv){var n=(inv.nome||'').toUpperCase().trim();if(/^[A-Z]{4}[0-9]{1,2}$/.test(n)&&tickers.indexOf(n)<0)tickers.push(n)});
if(!tickers.length){toast(typeof t==='function'?t('toast_nenhum_ticker_b3_encontrado'):'Nenhum ticker B3 encontrado','err');return}
toast('Buscando proventos de '+tickers.length+' ativos...','ok');

for(var i=0;i<tickers.length;i++){
try{
var data;
if(typeof brapiMultiFn==='function'){
try{var resp=await brapiMultiFn({tickers:[tickers[i]],dividends:true});data=resp.data;}
catch(e){var token=localStorage.getItem('vrt_b3token')||'';var r2=await fetch('https://brapi.dev/api/quote/'+tickers[i]+'?token='+token+'&dividends=true');data=await r2.json();}
}else{
var token=localStorage.getItem('vrt_b3token')||'';var r2=await fetch('https://brapi.dev/api/quote/'+tickers[i]+'?token='+token+'&dividends=true');data=await r2.json();
}
if(data&&data.results&&data.results[0]&&data.results[0].dividendsData){
var divs=data.results[0].dividendsData.cashDividends||[];
divs.forEach(function(d){
var exists=proventos.find(function(p){return p.ticker===tickers[i]&&p.data===d.paymentDate&&Math.abs(p.valor-d.rate)<0.01});
if(!exists&&d.paymentDate&&d.rate>0){
proventos.push({id:Date.now()+Math.random()*1000,ticker:tickers[i],tipo:d.label||'dividendo',valor:d.rate,data:d.paymentDate});
}
});
}
}catch(e){console.warn('Erro proventos '+tickers[i]+':',e)}
if(i<tickers.length-1)await new Promise(function(r){setTimeout(r,300)});
}

localStorage.setItem('vrt_proventos',JSON.stringify(proventos));
renderProventos();
toast(typeof t==='function'?t('toast_proventos_atualizados'):'Proventos atualizados!','ok');
}

function renderProventos(){
// KPIs
var totalProv=0,totalAno=0,totalMes=0;
var now=new Date();var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var anoAtual=String(now.getFullYear());
var byMes={};var byAtivo={};

proventos.forEach(function(p){
totalProv+=p.valor;
if(p.data&&p.data.substring(0,4)===anoAtual)totalAno+=p.valor;
if(p.data&&p.data.substring(0,7)===mesAtual)totalMes+=p.valor;
var m=p.data?p.data.substring(0,7):'unknown';
byMes[m]=(byMes[m]||0)+p.valor;
byAtivo[p.ticker]=(byAtivo[p.ticker]||0)+p.valor;
});

var mediaMensal=totalAno>0?totalAno/(now.getMonth()+1):0;

var kpi=document.getElementById('proventosKPIs');
var h='';
h+='<div class="b3-metric"><div class="b3-metric-label">Total Recebido</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(totalProv)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Este Ano</div><div class="b3-metric-value">'+fmt(totalAno)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Este Mes</div><div class="b3-metric-value">'+fmt(totalMes)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Media Mensal</div><div class="b3-metric-value">'+fmt(Math.round(mediaMensal))+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Proventos</div><div class="b3-metric-value">'+proventos.length+'</div><div class="b3-metric-sub">'+Object.keys(byAtivo).length+' ativos</div></div>';
if(kpi)kpi.innerHTML=h;

// Grafico por mes (ultimos 12 meses)
renderProventosChart(byMes);
renderProventosAtivoChart(byAtivo);

// Timeline
var timeline=document.getElementById('proventosTimeline');
var sorted=proventos.slice().sort(function(a,b){return(b.data||'').localeCompare(a.data||'')});
var th='';
if(!sorted.length){th='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:16px">Nenhum provento registrado.</div>';}
else{
th='<table class="fin-tbl"><thead><tr><th>Data</th><th>Ativo</th><th>Tipo</th><th>Valor</th><th></th></tr></thead><tbody>';
sorted.slice(0,50).forEach(function(p){
th+='<tr><td style="font-size:.82em">'+p.data+'</td><td style="font-weight:700">'+p.ticker+'</td><td><span style="font-size:.72em;padding:2px 6px;border-radius:4px;background:rgba(34,197,94,.1);color:#22C55E">'+p.tipo+'</span></td>';
th+='<td style="color:#22C55E;font-weight:600">'+fmt(p.valor)+'</td>';
th+='<td><button onclick="delProvento('+p.id+')" style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:.8em" title="Excluir">&#128465;</button></td></tr>';
});
th+='</tbody></table>';
}
if(timeline)timeline.innerHTML=th;

// Renda passiva dashboard
renderRendaPassiva();
}

function renderProventosChart(byMes){
var canvas=document.getElementById('proventosChart');if(!canvas)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=180;ctx.clearRect(0,0,W,180);
var now=new Date();var months=[];
for(var i=11;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
var vals=months.map(function(m){return byMes[m]||0});
var maxV=Math.max.apply(null,vals)||1;
var pad={t:15,r:10,b:25,l:10};var cW=W-pad.l-pad.r;var cH=180-pad.t-pad.b;
var barW=Math.min(30,cW/12-6);
months.forEach(function(m,i){
var x=pad.l+(cW/12)*i+(cW/12-barW)/2;var h=vals[i]>0?(vals[i]/maxV)*cH:0;var y=pad.t+cH-h;
var grad=ctx.createLinearGradient(0,y,0,y+h);grad.addColorStop(0,'#22C55E');grad.addColorStop(1,'#22C55E50');
ctx.fillStyle=grad;ctx.beginPath();ctx.rect(x,y,barW,h||1);ctx.fill();
if(vals[i]>0){ctx.fillStyle='#22C55E';ctx.font='bold 7px Inter';ctx.textAlign='center';ctx.fillText(fmt(vals[i]).replace('R$','').trim(),x+barW/2,y-4);}
ctx.fillStyle='rgba(128,128,128,.4)';ctx.font='7px Inter';ctx.fillText(m.substring(5)+'/'+m.substring(2,4),x+barW/2,180-6);
});
}

function renderProventosAtivoChart(byAtivo){
var canvas=document.getElementById('proventosAtivoChart');if(!canvas)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=180;ctx.clearRect(0,0,W,180);
var items=Object.keys(byAtivo).map(function(k){return{nome:k,valor:byAtivo[k]}}).sort(function(a,b){return b.valor-a.valor}).slice(0,10);
if(!items.length)return;
var total=items.reduce(function(s,i){return s+i.valor},0);
var colors=['#22C55E','#4F8CFF','#A855F7','#F59E0B','#EF4444','#06B6D4','#EC4899','#8B5CF6','#14B8A6','#F97316'];
var cx=W/2,cy=90,outerR=70,innerR=42,startAngle=-Math.PI/2;
items.forEach(function(item,i){
var pct=item.valor/total;var endAngle=startAngle+pct*2*Math.PI;
ctx.beginPath();ctx.arc(cx,cy,outerR,startAngle,endAngle);ctx.arc(cx,cy,innerR,endAngle,startAngle,true);ctx.closePath();
ctx.fillStyle=colors[i%colors.length];ctx.fill();startAngle=endAngle;
});
ctx.font='bold 11px Inter';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f1f5f9';ctx.fillText(fmt(total),cx,cy-4);
ctx.font='8px Inter';ctx.fillStyle='#94a3b8';ctx.fillText('Total',cx,cy+9);
}

// --- 5.4 CALCULADORA IR ---
function toggleIRHelp(){var el=document.getElementById('irHelp');el.style.display=el.style.display==='none'?'block':'none'}

function updateIRFields(){
var tipo=document.getElementById('irTipo').value;
var diasGroup=document.getElementById('irDiasGroup');
diasGroup.style.display=tipo==='rf'?'block':'none';
}

function calcIR(){
var tipo=document.getElementById('irTipo').value;
var compra=parseFloat(document.getElementById('irCompra').value)||0;
var venda=parseFloat(document.getElementById('irVenda').value)||0;
var totalMes=parseFloat(document.getElementById('irTotalMes').value)||0;
var dias=parseInt(document.getElementById('irDias').value)||365;
var prejuízo=parseFloat(document.getElementById('irPrejuizo').value)||0;

var lucro=venda-compra;
var lucroLiq=Math.max(0,lucro-prejuízo);
var aliquota=0;var isento=false;var irDevido=0;var obs='';

if(tipo==='acoes'){
if(totalMes<=20000){isento=true;obs='Vendas de acoes ate R$ 20.000/mes sao isentas de IR.';}
else{aliquota=15;obs='Swing trade: 15% sobre lucro liquido.';}
}else if(tipo==='acoes_dt'){
aliquota=20;obs='Day trade: 20% sobre lucro liquido. Sem isencao.';
}else if(tipo==='fiis'){
aliquota=20;obs='FIIs: 20% sobre lucro na venda. Dividendos de FIIs sao isentos.';
}else if(tipo==='rf'){
if(dias<=180)aliquota=22.5;
else if(dias<=360)aliquota=20;
else if(dias<=720)aliquota=17.5;
else aliquota=15;
obs='Tabela regressiva: '+aliquota+'% para '+dias+' dias de aplicação.';
}else if(tipo==='cripto'){
if(totalMes<=35000){isento=true;obs='Vendas de cripto ate R$ 35.000/mes sao isentas.';}
else{
if(lucroLiq<=5000000)aliquota=15;
else if(lucroLiq<=10000000)aliquota=17.5;
else if(lucroLiq<=30000000)aliquota=20;
else aliquota=22.5;
obs='Cripto acima de R$ 35k/mes: '+aliquota+'% sobre lucro.';
}
}

if(!isento&&lucroLiq>0)irDevido=lucroLiq*aliquota/100;

var el=document.getElementById('irResult');
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px">';
h+='<div class="b3-metric"><div class="b3-metric-label">Lucro Bruto</div><div class="b3-metric-value" style="color:'+(lucro>=0?'#22C55E':'#EF4444')+'">'+fmt(lucro)+'</div></div>';

if(prejuízo>0){
h+='<div class="b3-metric"><div class="b3-metric-label">Prejuízo Compensado</div><div class="b3-metric-value" style="color:#F59E0B">-'+fmt(Math.min(prejuízo,lucro))+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Lucro Líquido</div><div class="b3-metric-value">'+fmt(lucroLiq)+'</div></div>';
}

if(isento){
h+='<div class="b3-metric" style="border-color:#22C55E"><div class="b3-metric-label">Status</div><div class="b3-metric-value" style="color:#22C55E;font-size:1em">&#9989; ISENTO</div></div>';
}else{
h+='<div class="b3-metric"><div class="b3-metric-label">Aliquota</div><div class="b3-metric-value">'+aliquota+'%</div></div>';
h+='<div class="b3-metric" style="border-color:#EF4444"><div class="b3-metric-label">IR Devido</div><div class="b3-metric-value" style="color:#EF4444">'+fmt(Math.round(irDevido*100)/100)+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Lucro Apos IR</div><div class="b3-metric-value" style="color:#22C55E">'+fmt(Math.round((lucroLiq-irDevido)*100)/100)+'</div></div>';
}
h+='</div>';

h+='<div style="padding:8px 12px;background:var(--bg2);border-radius:8px;font-size:.8em;color:var(--t2);line-height:1.7"><strong style="color:var(--t1)">&#128161;</strong> '+obs+'</div>';

if(lucro<0){
h+='<div style="margin-top:8px;padding:8px 12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:.8em;color:var(--t2)"><strong style="color:#F59E0B">&#128204; Dica:</strong> Prejuízos podem ser compensados com lucros futuros do mesmo tipo de ativo. Guarde o valor de <strong>'+fmt(Math.abs(lucro))+'</strong> para compensar.</div>';
}

el.innerHTML=h;
}

// --- 5.5 DASHBOARD RENDA PASSIVA ---
function renderRendaPassiva(){
var el=document.getElementById('rendaPassivaKPIs');
var tableEl=document.getElementById('rendaPassivaTable');
if(!el)return;

// Calcular renda passiva total
var totalProv=0;var now=new Date();var anoAtual=String(now.getFullYear());
var provAno=proventos.filter(function(p){return p.data&&p.data.substring(0,4)===anoAtual});
provAno.forEach(function(p){totalProv+=p.valor});
var mediaMensal=provAno.length>0?totalProv/(now.getMonth()+1):0;

// Estimar yield
var totalInvestido=0;
if(investments&&investments.length){investments.forEach(function(inv){totalInvestido+=inv.atual||inv.valor||0})}
var yieldAnual=totalInvestido>0?((mediaMensal*12)/totalInvestido*100):0;

// Projeção 12 meses
var projecao12=mediaMensal*12;
var projecaoDiaria=mediaMensal/30;

var h='';
h+='<div class="b3-metric" style="border-color:rgba(168,85,247,.3)"><div class="b3-metric-label">Renda Passiva Mensal</div><div class="b3-metric-value" style="color:#A855F7">'+fmt(Math.round(mediaMensal))+'</div><div class="b3-metric-sub">media '+anoAtual+'</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Renda Passiva Anual</div><div class="b3-metric-value">'+fmt(Math.round(projecao12))+'</div><div class="b3-metric-sub">projecao</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Renda Diaria</div><div class="b3-metric-value">'+fmt(Math.round(projecaoDiaria*100)/100)+'</div><div class="b3-metric-sub">por dia util</div></div>';
h+='<div class="b3-metric"><div class="b3-metric-label">Yield Estimado</div><div class="b3-metric-value" style="color:'+(yieldAnual>=6?'#22C55E':'#F59E0B')+'">'+yieldAnual.toFixed(2)+'%</div><div class="b3-metric-sub">ao ano</div></div>';

// Quantos % do gasto mensal cobre
var gastoMensal=parseFloat(document.getElementById('fireGasto')?document.getElementById('fireGasto').value:0)||5000;
var coberturaGastos=gastoMensal>0?(mediaMensal/gastoMensal*100):0;
h+='<div class="b3-metric"><div class="b3-metric-label">Cobertura Gastos</div><div class="b3-metric-value" style="color:'+(coberturaGastos>=100?'#22C55E':(coberturaGastos>=50?'#F59E0B':'#EF4444'))+'">'+coberturaGastos.toFixed(1)+'%</div><div class="b3-metric-sub">do gasto mensal</div></div>';

el.innerHTML=h;

// Grafico projecao
renderRendaPassivaChart(mediaMensal);

// Tabela por ativo
if(tableEl){
var byAtivo={};
proventos.forEach(function(p){
if(!byAtivo[p.ticker])byAtivo[p.ticker]={total:0,count:0,ultimo:''};
byAtivo[p.ticker].total+=p.valor;
byAtivo[p.ticker].count++;
if(p.data>byAtivo[p.ticker].ultimo)byAtivo[p.ticker].ultimo=p.data;
});
var items=Object.keys(byAtivo).map(function(k){return{ticker:k,total:byAtivo[k].total,count:byAtivo[k].count,ultimo:byAtivo[k].ultimo}}).sort(function(a,b){return b.total-a.total});
if(!items.length){tableEl.innerHTML='';return}
var th='<table class="fin-tbl"><thead><tr><th>Ativo</th><th>Total Recebido</th><th>Pagamentos</th><th>Media/Pag.</th><th>Último</th></tr></thead><tbody>';
items.forEach(function(item){
var media=item.count>0?item.total/item.count:0;
th+='<tr><td style="font-weight:700">'+item.ticker+'</td><td style="color:#22C55E;font-weight:600">'+fmt(item.total)+'</td><td>'+item.count+'</td><td>'+fmt(Math.round(media*100)/100)+'</td><td style="font-size:.78em;color:var(--t3)">'+item.ultimo+'</td></tr>';
});
th+='</tbody></table>';
tableEl.innerHTML=th;
}
}

function renderRendaPassivaChart(mediaMensal){
var canvas=document.getElementById('rendaPassivaChart');if(!canvas)return;
var ctx=canvas.getContext('2d');var W=canvas.parentElement.clientWidth-28;canvas.width=W;canvas.height=160;ctx.clearRect(0,0,W,160);
if(mediaMensal<=0){ctx.fillStyle='rgba(128,128,128,.4)';ctx.font='12px Inter';ctx.textAlign='center';ctx.fillText('Registre proventos para ver a projecao',W/2,80);return}
var months=[];var now=new Date();
for(var i=0;i<12;i++){var d=new Date(now.getFullYear(),now.getMonth()+i,1);months.push(String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).substring(2))}
var vals=months.map(function(m,i){return mediaMensal*(1+i*0.01)});// leve crescimento
var maxV=Math.max.apply(null,vals)||1;var acum=0;
var pad={t:15,r:10,b:25,l:10};var cW=W-pad.l-pad.r;var cH=160-pad.t-pad.b;
var barW=Math.min(30,cW/12-6);
months.forEach(function(m,i){
acum+=vals[i];
var x=pad.l+(cW/12)*i+(cW/12-barW)/2;var h=vals[i]>0?(vals[i]/maxV)*cH:0;var y=pad.t+cH-h;
var grad=ctx.createLinearGradient(0,y,0,y+h);grad.addColorStop(0,'#A855F7');grad.addColorStop(1,'#A855F750');
ctx.fillStyle=grad;ctx.beginPath();ctx.rect(x,y,barW,h||1);ctx.fill();
ctx.fillStyle='rgba(128,128,128,.4)';ctx.font='7px Inter';ctx.textAlign='center';ctx.fillText(m,x+barW/2,160-6);
});
}

// --- INIT SPRINT 5 ---
function initSprint5(){
initProfileQuiz();
renderProventos();
updateIRFields();
}

function initSprint3(){
renderAlertsList();
// Checar alertas a cada 5 minutos
checkPriceAlerts();
setInterval(checkPriceAlerts,300000);
}


// Init
document.addEventListener('DOMContentLoaded',function(){
initBrapiFunctions();
initSprint3();
try{initSprint5();}catch(e){console.warn("Sprint5 init:",e)}
getB3Token();
loadWatchlist();
});

/* ── next block ── */

// ============================================
// PWA: SERVICE WORKER + INSTALL PROMPT
// ============================================

// Register SW (cache-first) - usa arquivo sw.js para evitar erro de blob: em alguns hosts
if('serviceWorker' in navigator){
var swPath='/app/sw.js';
navigator.serviceWorker.register(swPath,{scope:'/app/'}).then(function(){console.log('SW OK')}).catch(function(e){if(e&&e.message&&e.message.indexOf('blob')===-1)console.warn('SW:',e.message);});
}

// Install prompt
window.addEventListener('beforeinstallprompt',function(e){
e.preventDefault();

});

/* ── next block ── */

// ============================================
// SIMULADOR RENDA FIXA
// ============================================
function simRF(){
var valor=parseFloat(document.getElementById('rfValor').value)||10000;
var prazo=parseInt(document.getElementById('rfPrazo').value)||12;
var cdiAnual=parseFloat(document.getElementById('rfCDI').value)||13.25;
var ipcaAnual=parseFloat(document.getElementById('rfIPCA').value)||4.5;

var cdiMensal=Math.pow(1+cdiAnual/100,1/12)-1;
var ipcaMensal=Math.pow(1+ipcaAnual/100,1/12)-1;

// Calcular IR baseado no prazo
var irRate;
if(prazo<=6)irRate=0.225;
else if(prazo<=12)irRate=0.20;
else if(prazo<=24)irRate=0.175;
else irRate=0.15;

// Investimentos para comparar
var investimentos=[
{nome:'CDB 100% CDI',taxa:cdiMensal,ir:true,isento:false,emoji:'&#128179;'},
{nome:'CDB 120% CDI',taxa:cdiMensal*1.2,ir:true,isento:false,emoji:'&#128179;'},
{nome:'LCI/LCA 90% CDI',taxa:cdiMensal*0.9,ir:false,isento:true,emoji:'&#127969;'},
{nome:'Tesouro Selic',taxa:cdiMensal*0.98,ir:true,isento:false,emoji:'&#127970;'},
{nome:'Tesouro IPCA+6%',taxa:ipcaMensal+Math.pow(1.06,1/12)-1,ir:true,isento:false,emoji:'&#128200;'},
{nome:'Poupança',taxa:cdiAnual>8.5?0.005+ipcaMensal/12*0.7:cdiAnual/100*0.7/12,ir:false,isento:true,emoji:'&#128179;'}
];

var results=[];
investimentos.forEach(function(inv){
var bruto=valor*Math.pow(1+inv.taxa,prazo);
var rendBruto=bruto-valor;
var ir=inv.ir?rendBruto*irRate:0;
var líquido=bruto-ir;
var rendLiq=líquido-valor;
var rentLiq=(rendLiq/valor)*100;
results.push({
nome:inv.nome,
emoji:inv.emoji,
bruto:bruto,
rendBruto:rendBruto,
ir:ir,
líquido:líquido,
rendLiq:rendLiq,
rentLiq:rentLiq,
isento:inv.isento
});
});

// Ordenar por rendimento líquido
results.sort(function(a,b){return b.rendLiq-a.rendLiq});

// Render grid
var g='';
results.forEach(function(r,i){
var isBest=i===0;
var borderColor=isBest?'#059669':'var(--brd)';
var bg=isBest?'linear-gradient(135deg,rgba(5,150,105,.08),rgba(16,185,129,.03))':'var(--bg2)';
g+='<div style="background:'+bg+';border:1px solid '+borderColor+';border-radius:12px;padding:14px;position:relative">';
if(isBest)g+='<div style="position:absolute;top:-8px;right:8px;background:#059669;color:#fff;font-size:.6em;padding:2px 8px;border-radius:6px;font-weight:700">MELHOR</div>';
g+='<div style="font-size:.75em;color:var(--t3);margin-bottom:4px">'+r.emoji+' '+r.nome+'</div>';
g+='<div style="font-size:1.2em;font-weight:800;color:var(--green)">R$ '+r.líquido.toFixed(2)+'</div>';
g+='<div style="font-size:.75em;color:var(--t2);margin-top:4px">Rend. Liq: <b style="color:var(--green)">R$ '+r.rendLiq.toFixed(2)+'</b></div>';
g+='<div style="font-size:.7em;color:var(--t3)">Rent: '+r.rentLiq.toFixed(2)+'% | '+(r.isento?'Isento IR':'IR: R$ '+r.ir.toFixed(2))+'</div>';
g+='</div>';
});
document.getElementById('rfGrid').innerHTML=g;

// Best investment
var best=results[0];
var worst=results[results.length-1];
var diff=best.rendLiq-worst.rendLiq;
document.getElementById('rfBest').innerHTML='<div style="font-weight:800;color:#059669;font-size:1em">&#127942; '+best.emoji+' '+best.nome+' vence!</div><div style="font-size:.82em;color:var(--t2);margin-top:4px">Rende <b>R$ '+diff.toFixed(2)+' a mais</b> que '+worst.nome+' em '+prazo+' meses</div><div style="font-size:.7em;color:var(--t3);margin-top:6px">IR regressivo: '+(irRate*100).toFixed(1)+'% (prazo '+prazo+'m) | CDI: '+cdiAnual+'% a.a. | IPCA: '+ipcaAnual+'% a.a.</div>';

document.getElementById('rfResult').style.display='block';
}

/* ── next block ── */

// ============================================
// INDEXEDDB - CACHE OFFLINE
// ============================================
var idbName='SibankiDB';
var idbVer=1;

function openIDB(){
return new Promise(function(resolve,reject){
if(!window.indexedDB){reject('No IndexedDB');return}
var req=indexedDB.open(idbName,idbVer);
req.onupgradeneeded=function(e){
var db=e.target.result;
if(!db.objectStoreNames.contains('cache'))db.createObjectStore('cache',{keyPath:'key'});
if(!db.objectStoreNames.contains('entries'))db.createObjectStore('entries',{keyPath:'id'});
};
req.onsuccess=function(e){resolve(e.target.result)};
req.onerror=function(e){reject(e)};
});
}

async function idbSet(store,key,data){
try{
var db=await openIDB();
var tx=db.transaction(store,'readwrite');
tx.objectStore(store).put({key:key,data:data,ts:Date.now()});
}catch(e){}
}

async function idbGet(store,key){
try{
var db=await openIDB();
return new Promise(function(resolve){
var tx=db.transaction(store,'readonly');
var req=tx.objectStore(store).get(key);
req.onsuccess=function(e){resolve(e.target.result?e.target.result.data:null)};
req.onerror=function(){resolve(null)};
});
}catch(e){return null}
}

// Auto-save entries to IndexedDB when data changes
var origSaveData=typeof saveData==='function'?saveData:null;
if(origSaveData){
var _origSave=saveData;
saveData=function(){
_origSave.apply(this,arguments);
// Also save to IndexedDB
try{
idbSet('cache','entries',entries);
idbSet('cache','investments',investments);
idbSet('cache','goals',goals);
idbSet('cache','budgets',budgets);
idbSet('cache','cards',cards);
}catch(e){}
};
}

// Load from IndexedDB if Firebase is slow
async function loadFromIDB(){
try{
if(typeof entries==='undefined')return;
var e=await idbGet('cache','entries');
if(e&&(!entries||entries.length===0)){
entries=e;
var inv=await idbGet('cache','investments');
if(inv)investments=inv;
var g=await idbGet('cache','goals');
if(g)goals=g;
var b=await idbGet('cache','budgets');
if(b)budgets=b;
var c=await idbGet('cache','cards');
if(c)cards=c;
if(typeof renderAll==='function')renderAll();
console.log('Loaded from IndexedDB cache');
}
}catch(e){}
}

// If no data after 3s, try IndexedDB
setTimeout(function(){
try{if(typeof entries!=='undefined'&&(!entries||entries.length===0)&&U)loadFromIDB();}catch(z){}
},3000);

/* ── next block ── */

// ============================================
// IN-APP PUSH NOTIFICATIONS
// ============================================
var notifQueue=[];
var notifShowing=false;

function pushNotif(lucideIcon,title,body,duration){
notifQueue.push({icon:lucideIcon,title:title,body:body,dur:duration||4000});
if(!notifShowing)showNextNotif();
}

function showNextNotif(){
if(!notifQueue.length){notifShowing=false;return}
notifShowing=true;
var n=notifQueue.shift();
var ic=(typeof n.icon==='string'&&n.icon.length>0&&!n.icon.startsWith('&#')&&n.icon.length<30)?n.icon:'bell';
var el=document.createElement('div');
el.className='push-notif';
el.innerHTML='<div style="font-size:1.5em;display:flex;align-items:center;justify-content:center;width:36px;height:36px"><i data-lucide="'+ic+'" style="width:28px;height:28px"></i></div><div style="flex:1"><div style="font-weight:700;font-size:.88em">'+n.title+'</div><div style="font-size:.78em;color:rgba(255,255,255,.7);margin-top:2px">'+n.body+'</div></div><button onclick="this.parentElement.remove();showNextNotif()" style="background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;padding:0 4px;display:flex;align-items:center"><i data-lucide="x" style="width:18px;height:18px"></i></button>';
document.body.appendChild(el);
if(typeof lucide!=='undefined')lucide.createIcons();
setTimeout(function(){el.classList.add('push-notif-show')},50);
setTimeout(function(){
el.classList.remove('push-notif-show');
setTimeout(function(){el.remove();showNextNotif()},400);
},n.dur);
}

// Smart notifications based on user data
function smartNotifs(){
if(!U||!entries||!entries.length)return;
var uName=U&&U.name?U.name:'';
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var gastoMes=entries.filter(function(e){return e.type==='desp'&&e.date&&e.date.startsWith(mesAtual)}).reduce(function(s,e){return s+(e.val||0)},0);
var recMes=entries.filter(function(e){return e.type==='rec'&&e.date&&e.date.startsWith(mesAtual)}).reduce(function(s,e){return s+(e.val||0)},0);

// Notif 1: Bom dia
var hora=now.getHours();
var saudacao=hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';
setTimeout(function(){
if(!U)return;
pushNotif('hand',saudacao+', '+(U.name||uName||'')+'!','Seu saldo este mês: R$ '+(recMes-gastoMes).toFixed(2));
},2000);

// Notif 2: Se gastou mais de 80% da receita
if(recMes>0&&gastoMes/recMes>0.8){
setTimeout(function(){
pushNotif('alert-triangle','Alerta de gastos!','Você já usou '+(gastoMes/recMes*100).toFixed(0)+'% da receita do mês');
},6000);
}

// Notif 3: Se tem metas próximas
if(typeof goals!=='undefined'&&goals.length>0){
goals.forEach(function(g,i){
if(!g)return;
var pct=g.target>0?g.current/g.target*100:0;
if(pct>=90&&pct<100){
var gName=g.name;
setTimeout(function(){
if(!U)return;
pushNotif('target','Meta quase lá!',(gName||'Meta')+' está em '+pct.toFixed(0)+'%!');
},8000+i*3000);
}
});
}

// Notif 4: Cartões próximos do vencimento
if(typeof cards!=='undefined'&&cards.length>0){
var dia=now.getDate();
cards.forEach(function(c){
if(!c)return;
var diasPraFecha=c.close-dia;
var cName=c.name;
if(diasPraFecha>0&&diasPraFecha<=3){
setTimeout(function(){
if(!U)return;
pushNotif('credit-card','Fatura fechando!',(cName||'Cartão')+' fecha em '+diasPraFecha+' dia(s)');
},10000);
}
});
}
}

// Trigger smart notifs after data loads
var _origRenderAll=typeof renderAll==='function'?renderAll:null;
if(_origRenderAll){
var __origRA=renderAll;
var _smartSent=false;
renderAll=function(){
__origRA.apply(this,arguments);
if(!_smartSent){_smartSent=true;setTimeout(smartNotifs,1500)}
};
}

/* ── next block ── */

function openKpiModal(type){
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var mesNome=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
var content='';

if(type==='receitas'){
var recMes=0,topRec=[];
entries.forEach(function(e){
if(e.type==='receita'&&e.date&&e.date.startsWith(mesAtual)){recMes+=e.value;topRec.push(e)}
});
topRec.sort(function(a,b){return b.value-a.value});
var recFixa=0;
if(typeof recurrents!=='undefined'){recurrents.forEach(function(r){if(r.active&&r.type==='receita')recFixa+=r.value})}
content='<h3><i data-lucide="wallet" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Receitas do Mês</h3>';
content+='<div class="kpi-modal-value" style="color:var(--green)">'+fmt(recMes)+'</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="clipboard-list" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Composição ('+mesNome+')</h4>';
if(topRec.length===0)content+='<div class="kpi-detail-item"><span class="di-label">Nenhuma receita registrada</span></div>';
topRec.slice(0,10).forEach(function(e){
content+='<div class="kpi-detail-item"><span class="di-label">'+escapeHtml(e.desc||'')+'</span><span class="di-value" style="color:var(--green)">'+fmt(e.value)+'</span></div>';
});
content+='</div>';
// Dicas
content+='<div class="kpi-detail-section"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas Inteligentes</h4>';
if(recFixa>0&&recMes>recFixa){
content+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Boa diversificação!</div><div class="kpi-tip-text">Você tem receitas além das fixas ('+fmt(recFixa)+' fixa). Receitas extras de '+fmt(recMes-recFixa)+' este mês. Continue buscando fontes variadas!</div></div>';
}else if(recMes<=recFixa||recFixa===0){
content+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Diversifique suas fontes</div><div class="kpi-tip-text">Suas receitas dependem muito de poucas fontes. Considere freelances, investimentos com dividendos ou renda extra para maior segurança.</div></div>';
}
content+='</div>';

}else if(type==='despesas'){
var despMes=0,pendMes=0,topDesp=[],cats={};
entries.forEach(function(e){
if(e.type==='despesa'&&e.date&&e.date.startsWith(mesAtual)){
despMes+=e.value;topDesp.push(e);
var cat=e.category||'Outros';
cats[cat]=(cats[cat]||0)+e.value;
if(e.status==='pendente'||e.status==='agendado')pendMes+=e.value;
}
});
topDesp.sort(function(a,b){return b.value-a.value});
var catArr=Object.keys(cats).map(function(k){return{cat:k,val:cats[k]}}).sort(function(a,b){return b.val-a.val});
content='<h3>Despesas do Mês</h3>';
content+='<div class="kpi-modal-value" style="color:var(--vr)">'+fmt(despMes)+'</div>';
if(pendMes>0)content+='<div style="color:var(--yellow);font-size:.9rem;margin-bottom:12px">Pendente: '+fmt(pendMes)+'</div>';
content+='<div class="kpi-detail-section"><h4>Por Categoria</h4>';
catArr.slice(0,8).forEach(function(c){
var pct=despMes>0?Math.round(c.val/despMes*100):0;
content+='<div class="kpi-detail-item"><span class="di-label">'+escapeHtml(c.cat)+' ('+pct+'%)</span><span class="di-value" style="color:var(--vr)">'+fmt(c.val)+'</span></div>';
});
content+='</div>';
content+='<div class="kpi-detail-section"><h4>Maiores Gastos</h4>';
topDesp.slice(0,5).forEach(function(e){
content+='<div class="kpi-detail-item"><span class="di-label">'+escapeHtml(e.desc||'')+'</span><span class="di-value" style="color:var(--vr)">'+fmt(e.value)+'</span></div>';
});
content+='</div>';
// Dicas
content+='<div class="kpi-detail-section"><h4>Dicas Inteligentes</h4>';
if(catArr.length>0&&catArr[0].val/despMes>0.4){
content+='<div class="kpi-tip danger"><div class="kpi-tip-title">Concentração de gastos</div><div class="kpi-tip-text">A categoria "'+escapeHtml(catArr[0].cat)+'" representa '+Math.round(catArr[0].val/despMes*100)+'% dos seus gastos. Tente redistribuir ou reduzir nessa área.</div></div>';
}
if(pendMes>despMes*0.3){
content+='<div class="kpi-tip warn"><div class="kpi-tip-title">Muitas despesas pendentes</div><div class="kpi-tip-text">Você tem '+fmt(pendMes)+' pendente ('+Math.round(pendMes/despMes*100)+'%). Organize os pagamentos para evitar juros e multas.</div></div>';
}
content+='<div class="kpi-tip"><div class="kpi-tip-title">Regra 50-30-20</div><div class="kpi-tip-text">Tente manter: 50% necessidades, 30% desejos, 20% poupança/investimentos. Analise suas categorias acima e ajuste.</div></div>';
content+='</div>';

}else if(type==='saldo'){
var recMes=0,despMes=0,recPago=0,recPend=0,despPago=0,despPend=0;
var listaPagar=[],listaReceber=[];
var cash=typeof getCashMode==='function'?getCashMode():true;
entries.forEach(function(e){
var isMes=e.date&&e.date.startsWith(mesAtual);
if(!isMes)return;
var st=(e.status||'pago').toLowerCase();
var isPago=(st==='pago'||st==='recebido');
if(e.type==='receita'){
recMes+=e.value;
if(isPago)recPago+=e.value;
else{recPend+=e.value;listaReceber.push(e)}
}else{
despMes+=e.value;
if(isPago)despPago+=e.value;
else{despPend+=e.value;listaPagar.push(e)}
}
});
listaPagar.sort(function(a,b){return(a.date>b.date?1:-1)});
listaReceber.sort(function(a,b){return(a.date>b.date?1:-1)});
var saldoReal=recPago-despPago;
var saldoPrev=recMes-despMes;
var disponivel=recPago-despPago-despPend;
var pctGasto=recMes>0?Math.round(despMes/recMes*100):0;
var pctPago=despMes>0?Math.round(despPago/despMes*100):0;

content='<div style="text-align:center;padding:8px 0 16px">';
content+='<div style="font-size:.85em;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">'+mesNome+'</div>';

// Saldo grande
content+='<div style="font-size:2.4em;font-weight:800;color:'+(saldoReal>=0?'var(--green)':'var(--vr)')+'">'+fmt(saldoReal)+'</div>';
content+='<div style="font-size:.82em;color:var(--t3);margin-top:2px">saldo realizado</div>';

// Barra de progresso (% gasto)
content+='<div style="margin:16px auto;max-width:280px">';
content+='<div style="display:flex;justify-content:space-between;font-size:.75em;color:var(--t3);margin-bottom:4px"><span>0%</span><span>'+pctGasto+'% gasto</span><span>100%</span></div>';
content+='<div style="height:8px;background:rgba(255,255,255,.08);border-radius:8px;overflow:hidden">';
content+='<div style="height:100%;width:'+Math.min(pctGasto,100)+'%;background:'+(pctGasto>80?'var(--vr)':pctGasto>60?'var(--yellow)':'var(--green)')+';border-radius:8px;transition:width .5s"></div>';
content+='</div></div>';

// Receitas e Despesas (2 linhas)
content+='<div style="display:flex;justify-content:center;gap:32px;margin-top:12px">';
content+='<div style="text-align:center"><div style="font-size:.75em;color:var(--t3)">↑ Receitas</div><div style="font-size:1.2em;font-weight:700;color:var(--green)">'+fmt(recMes)+'</div></div>';
content+='<div style="text-align:center"><div style="font-size:.75em;color:var(--t3)">↓ Despesas</div><div style="font-size:1.2em;font-weight:700;color:var(--vr)">'+fmt(despMes)+'</div></div>';
content+='</div>';
content+='</div>';

// Separador
content+='<div style="border-top:1px solid var(--brd);margin:16px 0"></div>';

// Seção: Progresso de pagamentos
content+='<div style="padding:0 4px">';
content+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
content+='<div style="font-weight:700;font-size:.95em">Despesas do Mês</div>';
content+='<div style="font-size:.8em;color:var(--t3)">'+pctPago+'% pago</div>';
content+='</div>';

// Mini barra pago vs total
content+='<div style="height:6px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;margin-bottom:14px">';
content+='<div style="height:100%;width:'+pctPago+'%;background:var(--green);border-radius:6px;transition:width .5s"></div>';
content+='</div>';

// Cards pago e pendente
content+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
content+='<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;text-align:center">';
content+='<div style="font-size:.72em;color:var(--t3)">Pago</div>';
content+='<div style="font-size:1.1em;font-weight:700;color:var(--green)">'+fmt(despPago)+'</div></div>';
content+='<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;text-align:center">';
content+='<div style="font-size:.72em;color:var(--t3)">A pagar</div>';
content+='<div style="font-size:1.1em;font-weight:700;color:var(--vr)">'+fmt(despPend)+'</div></div>';
content+='</div>';

// Lista A PAGAR (expandível)
if(listaPagar.length>0){
content+='<div id="saldoApagar" style="margin-bottom:14px">';
content+='<div onclick="document.getElementById(\'listaApagar\').style.display=document.getElementById(\'listaApagar\').style.display===\'none\'?\'block\':\'none\'" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:8px 12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:8px">';
content+='<span style="font-size:.85em;font-weight:600;color:var(--vr)">A pagar ('+listaPagar.length+')</span>';
content+='<span style="font-size:.75em;color:var(--t3)">toque para expandir ▾</span></div>';
content+='<div id="listaApagar" style="display:none;margin-top:8px">';
listaPagar.forEach(function(e,idx){
var dia=e.date?e.date.substring(8,10):'--';
content+='<div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.04)">';
content+='<input type="checkbox" onchange="markPaidFromModal('+idx+',\'despesa\')" style="width:20px;height:20px;accent-color:var(--green);cursor:pointer;flex-shrink:0">';
content+='<div style="flex:1;min-width:0"><div style="font-size:.85em;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+e.desc+'</div>';
content+='<div style="font-size:.72em;color:var(--t3)">dia '+dia+(e.category?' · '+e.category:'')+'</div></div>';
content+='<div style="font-size:.9em;font-weight:600;color:var(--vr);white-space:nowrap">'+fmt(e.value)+'</div>';
content+='</div>';
});
content+='</div></div>';
}

// Separador
content+='<div style="border-top:1px solid var(--brd);margin:14px 0"></div>';

// Seção Receitas
content+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
content+='<div style="font-weight:700;font-size:.95em">Receitas do Mês</div>';
var pctRec=recMes>0?Math.round(recPago/recMes*100):0;
content+='<div style="font-size:.8em;color:var(--t3)">'+pctRec+'% recebido</div>';
content+='</div>';

// Cards recebido e pendente
content+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
content+='<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;text-align:center">';
content+='<div style="font-size:.72em;color:var(--t3)">Recebido</div>';
content+='<div style="font-size:1.1em;font-weight:700;color:var(--green)">'+fmt(recPago)+'</div></div>';
content+='<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:10px;padding:12px;text-align:center">';
content+='<div style="font-size:.72em;color:var(--t3)">A receber</div>';
content+='<div style="font-size:1.1em;font-weight:700;color:var(--blue)">'+fmt(recPend)+'</div></div>';
content+='</div>';

// Lista A RECEBER (expandível)
if(listaReceber.length>0){
content+='<div id="saldoAreceber" style="margin-bottom:14px">';
content+='<div onclick="document.getElementById(\'listaAreceber\').style.display=document.getElementById(\'listaAreceber\').style.display===\'none\'?\'block\':\'none\'" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:8px 12px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px">';
content+='<span style="font-size:.85em;font-weight:600;color:var(--blue)">A receber ('+listaReceber.length+')</span>';
content+='<span style="font-size:.75em;color:var(--t3)">toque para expandir ▾</span></div>';
content+='<div id="listaAreceber" style="display:none;margin-top:8px">';
listaReceber.forEach(function(e,idx){
var dia=e.date?e.date.substring(8,10):'--';
content+='<div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.04)">';
content+='<input type="checkbox" onchange="markPaidFromModal('+idx+',\'receita\')" style="width:20px;height:20px;accent-color:var(--green);cursor:pointer;flex-shrink:0">';
content+='<div style="flex:1;min-width:0"><div style="font-size:.85em;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+e.desc+'</div>';
content+='<div style="font-size:.72em;color:var(--t3)">dia '+dia+(e.account?' · '+e.account:'')+'</div></div>';
content+='<div style="font-size:.9em;font-weight:600;color:var(--blue);white-space:nowrap">'+fmt(e.value)+'</div>';
content+='</div>';
});
content+='</div></div>';
}

// Separador final
content+='<div style="border-top:1px solid var(--brd);margin:14px 0"></div>';

// Resumo final limpo
content+='<div style="background:var(--c2);border:1px solid var(--brd);border-radius:12px;padding:14px;margin-bottom:8px">';
content+='<div style="font-size:.82em;font-weight:600;margin-bottom:10px">Projeção do Mês</div>';
content+='<div style="display:flex;justify-content:space-between;font-size:.85em;padding:4px 0"><span style="color:var(--t3)">Saldo previsto</span><span style="font-weight:600;color:'+(saldoPrev>=0?'var(--green)':'var(--vr)')+'">'+fmt(saldoPrev)+'</span></div>';
content+='<div style="display:flex;justify-content:space-between;font-size:.85em;padding:4px 0"><span style="color:var(--t3)">Disponível hoje</span><span style="font-weight:600;color:'+(disponivel>=0?'var(--green)':'var(--vr)')+'">'+fmt(disponivel)+'</span></div>';
content+='<div style="font-size:.72em;color:var(--t3);margin-top:6px">Disponível = Recebido - Pago - A pagar</div>';
content+='</div>';

content+='</div>';

}else if(type==='custos'){
var custoFixo=0,recFixa=0,fixos=[];
if(typeof recurrents!=='undefined'){recurrents.forEach(function(r){
if(r.active){
if(r.type==='despesa'){custoFixo+=r.value;fixos.push(r)}
else recFixa+=r.value;
}
})}
fixos.sort(function(a,b){return b.value-a.value});
var recMes=0;
entries.forEach(function(e){if(e.type==='receita'&&e.date&&e.date.startsWith(mesAtual))recMes+=e.value});
var pctFixo=recMes>0?Math.round(custoFixo/recMes*100):0;
content='<h3><i data-lucide="pin" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Custos Fixos</h3>';
content+='<div class="kpi-modal-value" style="color:#F97316">'+fmt(custoFixo)+'</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="clipboard-list" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Despesas Fixas Ativas</h4>';
fixos.forEach(function(r){
content+='<div class="kpi-detail-item"><span class="di-label">'+r.desc+' (dia '+r.day+')</span><span class="di-value" style="color:#F97316">'+fmt(r.value)+'</span></div>';
});
if(fixos.length===0)content+='<div class="kpi-detail-item"><span class="di-label">Nenhum custo fixo cadastrado</span></div>';
content+='</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Análise</h4>';
content+='<div class="kpi-detail-item"><span class="di-label">Receita fixa</span><span class="di-value" style="color:var(--green)">'+fmt(recFixa)+'</span></div>';
content+='<div class="kpi-detail-item"><span class="di-label">Sobra fixa</span><span class="di-value" style="color:'+(recFixa-custoFixo>=0?'var(--green)':'var(--vr)')+'">'+fmt(recFixa-custoFixo)+'</span></div>';
content+='<div class="kpi-detail-item"><span class="di-label">% da renda em fixos</span><span class="di-value" style="color:'+(pctFixo>50?'var(--vr)':'var(--green)')+'">'+pctFixo+'%</span></div>';
content+='</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas Inteligentes</h4>';
if(pctFixo>50){
content+='<div class="kpi-tip danger"><div class="kpi-tip-title"><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Custos fixos altos!</div><div class="kpi-tip-text">'+pctFixo+'% da sua renda vai para custos fixos. O ideal é manter abaixo de 50%. Renegocie contratos, busque planos mais baratos ou elimine serviços pouco usados.</div></div>';
}else{
content+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Custos fixos controlados</div><div class="kpi-tip-text">Seus custos fixos representam '+pctFixo+'% da renda. Boa gestão! Revise anualmente para manter assim.</div></div>';
}
if(fixos.length>0){
content+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="pencil" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Maior custo fixo</div><div class="kpi-tip-text">"'+fixos[0].desc+'" é seu maior gasto fixo ('+fmt(fixos[0].value)+'). Já tentou negociar um desconto ou buscar alternativas?</div></div>';
}
content+='</div>';

}else if(type==='investido'){
var totalInv=0,totalAtual=0,invList=[];
investments.forEach(function(i){totalInv+=invCostBasis(i);var at=i.atual||i.valor;totalAtual+=at;invList.push(i)});
invList.sort(function(a,b){return(b.atual||b.valor)-(a.atual||a.valor)});
var rendimento=totalAtual-totalInv;
var pctRend=totalInv>0?((totalAtual/totalInv-1)*100).toFixed(1):0;
content='<h3>Investimentos</h3>';
content+='<div class="kpi-modal-value" style="color:var(--cyan)">'+fmt(totalAtual)+'</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="clipboard-list" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Carteira</h4>';
invList.forEach(function(i){
var base=invCostBasis(i);var rend=base>0?((i.atual||i.valor)/base-1)*100:0;
content+='<div class="kpi-detail-item"><span class="di-label">'+i.nome+' ('+rend.toFixed(1)+'%)</span><span class="di-value" style="color:var(--cyan)">'+fmt(i.atual||i.valor)+'</span></div>';
});
if(invList.length===0)content+='<div class="kpi-detail-item"><span class="di-label">Nenhum investimento cadastrado</span></div>';
content+='</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Performance</h4>';
content+='<div class="kpi-detail-item"><span class="di-label">Investido total</span><span class="di-value">'+fmt(totalInv)+'</span></div>';
content+='<div class="kpi-detail-item"><span class="di-label">Valor atual</span><span class="di-value" style="color:var(--cyan)">'+fmt(totalAtual)+'</span></div>';
content+='<div class="kpi-detail-item"><span class="di-label">Rendimento</span><span class="di-value" style="color:'+(rendimento>=0?'var(--green)':'var(--vr)')+'">'+fmt(rendimento)+' ('+pctRend+'%)</span></div>';
content+='</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas Inteligentes</h4>';
if(invList.length<3){
content+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Diversifique!</div><div class="kpi-tip-text">Você tem apenas '+invList.length+' investimento(s). Diversifique entre renda fixa, ações, FIIs e cripto para reduzir riscos.</div></div>';
}
content+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="target" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Meta: Reserva de emergência</div><div class="kpi-tip-text">O ideal é ter 6-12 meses de despesas em reserva. Depois disso, invista o excedente com mais risco para maior retorno.</div></div>';
content+='</div>';

}else if(type==='media'){
var td=0,meses={};
entries.forEach(function(e){
if(e.type==='despesa'){td+=e.value;var m=e.date.substring(0,7);meses[m]=(meses[m]||0)+e.value}
});
var nm=Object.keys(meses).length||1;
var media=td/nm;
var mArr=Object.keys(meses).map(function(k){return{mes:k,val:meses[k]}}).sort(function(a,b){return b.mes.localeCompare(a.mes)});
content='<h3>Média Mensal de Gastos</h3>';
content+='<div class="kpi-modal-value" style="color:var(--purple)">'+fmt(media)+'</div>';
content+='<div class="kpi-detail-section"><h4>Histórico por Mês</h4>';
mArr.slice(0,12).forEach(function(m){
var diff=m.val-media;
var arrow=diff>0?'+ ':'- ';
content+='<div class="kpi-detail-item"><span class="di-label">'+m.mes+'</span><span class="di-value" style="color:'+(diff>0?'var(--vr)':'var(--green)')+'">'+fmt(m.val)+' ('+arrow+fmt(Math.abs(diff))+')</span></div>';
});
content+='</div>';
content+='<div class="kpi-detail-section"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas Inteligentes</h4>';
var mesAtualVal=meses[new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')]||0;
if(mesAtualVal>media*1.2){
content+='<div class="kpi-tip danger"><div class="kpi-tip-title"><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Mês acima da média!</div><div class="kpi-tip-text">Este mês você já gastou '+fmt(mesAtualVal)+', que é '+(Math.round((mesAtualVal/media-1)*100))+'% acima da sua média. Revise os gastos restantes.</div></div>';
}else{
content+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Mês dentro da média</div><div class="kpi-tip-text">Seus gastos este mês ('+fmt(mesAtualVal)+') estão dentro da média histórica. Continue assim!</div></div>';
}
content+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="trending-down" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Meta de redução</div><div class="kpi-tip-text">Tente reduzir 10% por mês: sua nova meta seria '+fmt(media*0.9)+'. Pequenas economias fazem grande diferença ao longo do ano.</div></div>';
content+='</div>';
}
else if(type==='patrimônio'){content='<p>Carregando...</p>';}

document.getElementById('kpiModalContent').innerHTML=content;
document.getElementById('kpiModalOverlay').classList.add('active');
if(typeof lucide!=='undefined')lucide.createIcons();
}




function closeKpiModal(){
document.getElementById('kpiModalOverlay').classList.remove('active');
var km=document.getElementById('kmOv');if(km)km.classList.remove('on');
}

/* ── next block ── */

// ============================================================
// MODULO: CARDS KPI CLICÁVEIS (openKpiModal)
// Os cards JÁ chamam openKpiModal() no rKPI original
// ============================================================
function openKpiModal(tipo){
var now=new Date(),mk=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'),mn=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
var h='';

if(tipo==='receitas'){
var r=0,top=[];entries.forEach(function(e){if(e.type==='receita'&&e.date&&e.date.startsWith(mk)){r+=e.value;top.push(e)}});
top.sort(function(a,b){return b.value-a.value});
var rf=0;if(typeof recurrents!=='undefined')recurrents.forEach(function(x){if(x.active&&x.type==='receita')rf+=x.value});
h='<h3><i data-lucide="wallet" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Receitas do Mês</h3><div class="km-val" style="color:var(--green)">'+fmt(r)+'</div>';
h+='<div class="km-sec"><h4><i data-lucide="clipboard-list" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Composição</h4>';
if(!top.length)h+='<div class="km-it"><span class="il">Nenhuma receita</span></div>';
top.slice(0,10).forEach(function(e){h+='<div class="km-it"><span class="il">'+e.desc+'</span><span class="iv" style="color:var(--green)">'+fmt(e.value)+'</span></div>'});
h+='</div><div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
if(rf>0&&r>rf)h+='<div class="km-tip ok"><b><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Boa diversificação!</b><p>Receita fixa: '+fmt(rf)+'. Extra: '+fmt(r-rf)+'. Continue buscando fontes variadas!</p></div>';
else h+='<div class="km-tip warn"><b><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Diversifique suas fontes</b><p>Considere freelances, investimentos com dividendos ou renda extra para maior segurança.</p></div>';
h+='</div>';

}else if(tipo==='despesas'){
var d=0,top2=[],cats={},pd=0;
entries.forEach(function(e){if(e.type==='despesa'&&e.date&&e.date.startsWith(mk)){d+=e.value;top2.push(e);var c=e.category||'Outros';cats[c]=(cats[c]||0)+e.value;if(e.status==='pendente'||e.status==='agendado')pd+=e.value}});
top2.sort(function(a,b){return b.value-a.value});
var ca=Object.keys(cats).map(function(k){return{c:k,v:cats[k]}}).sort(function(a,b){return b.v-a.v});
h='<h3><i data-lucide="receipt" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Despesas do Mês</h3><div class="km-val" style="color:var(--vr)">'+fmt(d)+'</div>';
if(pd>0)h+='<div style="color:var(--yellow);font-size:.9rem;margin-bottom:12px">Pendente: '+fmt(pd)+'</div>';
h+='<div class="km-sec"><h4>Por Categoria</h4>';
ca.slice(0,8).forEach(function(c){var p=d>0?Math.round(c.v/d*100):0;h+='<div class="km-it"><span class="il">'+c.c+' ('+p+'%)</span><span class="iv" style="color:var(--vr)">'+fmt(c.v)+'</span></div>'});
h+='</div><div class="km-sec"><h4>Maiores Gastos</h4>';
top2.slice(0,5).forEach(function(e){h+='<div class="km-it"><span class="il">'+e.desc+'</span><span class="iv" style="color:var(--vr)">'+fmt(e.value)+'</span></div>'});
h+='</div><div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
if(ca.length&&ca[0].v/d>.4)h+='<div class="km-tip bad"><b>Concentração de gastos</b><p>"'+ca[0].c+'" = '+Math.round(ca[0].v/d*100)+'% dos gastos. Tente redistribuir.</p></div>';
h+='<div class="km-tip ok"><b>Regra 50-30-20</b><p>50% necessidades, 30% desejos, 20% poupança. Analise suas categorias!</p></div></div>';

}else if(tipo==='saldo'){
var rm=0,dm=0,tr=0,td=0;
entries.forEach(function(e){var im=e.date&&e.date.startsWith(mk);if(e.type==='receita'){tr+=e.value;if(im)rm+=e.value}else{td+=e.value;if(im)dm+=e.value}});
var sm=rm-dm,pg=rm>0?Math.round(dm/rm*100):0;
h='<h3><i data-lucide="wallet" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Saldo do Mês</h3><div class="km-val" style="color:'+(sm>=0?'var(--blue)':'var(--vr)')+'">'+fmt(sm)+'</div>';
h+='<div class="km-sec"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Resumo</h4>';
h+='<div class="km-it"><span class="il">Receitas</span><span class="iv" style="color:var(--green)">'+fmt(rm)+'</span></div>';
h+='<div class="km-it"><span class="il">Despesas</span><span class="iv" style="color:var(--vr)">'+fmt(dm)+'</span></div>';
h+='<div class="km-it"><span class="il">% gasto</span><span class="iv" style="color:'+(pg>80?'var(--vr)':'var(--green)')+'">'+pg+'%</span></div>';
h+='<div class="km-it"><span class="il">Saldo acumulado</span><span class="iv" style="color:'+(tr-td>=0?'var(--blue)':'var(--vr)')+'">'+fmt(tr-td)+'</span></div></div>';
h+='<div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
if(sm<0)h+='<div class="km-tip bad"><b><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Saldo negativo!</b><p>Gastou '+fmt(Math.abs(sm))+' a mais. Revise urgente!</p></div>';
else if(pg>80)h+='<div class="km-tip warn"><b><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Margem apertada</b><p>Usando '+pg+'% da renda. Ideal: abaixo de 80%.</p></div>';
else h+='<div class="km-tip ok"><b><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Saldo saudável!</b><p>Usando '+pg+'%. Invista o excedente de '+fmt(sm)+'!</p></div>';
h+='</div>';

}else if(tipo==='custos'){
var cf=0,rf2=0,fx=[];
if(typeof recurrents!=='undefined')recurrents.forEach(function(r){if(r.active){if(r.type==='despesa'){cf+=r.value;fx.push(r)}else rf2+=r.value}});
fx.sort(function(a,b){return b.value-a.value});
var rm2=0;entries.forEach(function(e){if(e.type==='receita'&&e.date&&e.date.startsWith(mk))rm2+=e.value});
var pf=rm2>0?Math.round(cf/rm2*100):0;
h='<h3><i data-lucide="pin" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Custos Fixos</h3><div class="km-val" style="color:#F97316">'+fmt(cf)+'</div>';
h+='<div class="km-sec"><h4><i data-lucide="list" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Despesas Fixas</h4>';
fx.forEach(function(r){h+='<div class="km-it"><span class="il">'+r.desc+' (dia '+r.day+')</span><span class="iv" style="color:#F97316">'+fmt(r.value)+'</span></div>'});
if(!fx.length)h+='<div class="km-it"><span class="il">Nenhum custo fixo cadastrado</span></div>';
h+='</div><div class="km-sec"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Análise</h4>';
h+='<div class="km-it"><span class="il">Receita fixa</span><span class="iv" style="color:var(--green)">'+fmt(rf2)+'</span></div>';
h+='<div class="km-it"><span class="il">Sobra fixa</span><span class="iv" style="color:'+(rf2-cf>=0?'var(--green)':'var(--vr)')+'">'+fmt(rf2-cf)+'</span></div>';
h+='<div class="km-it"><span class="il">% renda em fixos</span><span class="iv" style="color:'+(pf>50?'var(--vr)':'var(--green)')+'">'+pf+'%</span></div></div>';
h+='<div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
if(pf>50)h+='<div class="km-tip bad"><b><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Custos fixos altos!</b><p>'+pf+'% da renda. Ideal: abaixo de 50%.</p></div>';
else h+='<div class="km-tip ok"><b><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Bem controlados!</b><p>'+pf+'% da renda comprometida com fixos.</p></div>';
h+='</div>';

}else if(tipo==='investido'){
var ti=0,ta=0,il=[];
investments.forEach(function(i){ti+=i.valor;var a=i.atual||i.valor;ta+=a;il.push(i)});
il.sort(function(a,b){return(b.atual||b.valor)-(a.atual||a.valor)});
var rd=ta-ti,pr=ti>0?((ta/ti-1)*100).toFixed(1):0;
h='<h3><i data-lucide="trending-up" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Investimentos</h3><div class="km-val" style="color:var(--cyan)">'+fmt(ta)+'</div>';
h+='<div class="km-sec"><h4><i data-lucide="wallet" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Carteira</h4>';
il.forEach(function(i){var r2=((i.atual||i.valor)/i.valor-1)*100;h+='<div class="km-it"><span class="il">'+i.nome+' ('+r2.toFixed(1)+'%)</span><span class="iv" style="color:var(--cyan)">'+fmt(i.atual||i.valor)+'</span></div>'});
if(!il.length)h+='<div class="km-it"><span class="il">Nenhum investimento</span></div>';
h+='</div><div class="km-sec"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Performance</h4>';
h+='<div class="km-it"><span class="il">Investido</span><span class="iv">'+fmt(ti)+'</span></div>';
h+='<div class="km-it"><span class="il">Atual</span><span class="iv" style="color:var(--cyan)">'+fmt(ta)+'</span></div>';
h+='<div class="km-it"><span class="il">Rendimento</span><span class="iv" style="color:'+(rd>=0?'var(--green)':'var(--vr)')+'">'+fmt(rd)+' ('+pr+'%)</span></div></div>';
h+='<div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
if(il.length<3)h+='<div class="km-tip warn"><b><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Diversifique!</b><p>Apenas '+il.length+' investimento(s). Diversifique entre renda fixa, ações e FIIs.</p></div>';
h+='<div class="km-tip ok"><b><i data-lucide="shield" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Reserva de emergência</b><p>Tenha 6-12 meses de despesas em reserva antes de arriscar mais.</p></div></div>';

}else if(tipo==='media'){
var td2=0,ms={};
entries.forEach(function(e){if(e.type==='despesa'){td2+=e.value;var m=e.date.substring(0,7);ms[m]=(ms[m]||0)+e.value}});
var nm2=Object.keys(ms).length||1,med=td2/nm2;
var ma=Object.keys(ms).map(function(k){return{m:k,v:ms[k]}}).sort(function(a,b){return b.m.localeCompare(a.m)});
h='<h3><i data-lucide="bar-chart-2" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Média Mensal de Gastos</h3><div class="km-val" style="color:var(--purple)">'+fmt(med)+'</div>';
h+='<div class="km-sec"><h4>Histórico</h4>';
ma.slice(0,12).forEach(function(m){var df=m.v-med;h+='<div class="km-it"><span class="il">'+m.m+'</span><span class="iv" style="color:'+(df>0?'var(--vr)':'var(--green)')+'">'+fmt(m.v)+' ('+(df>0?'+':'')+fmt(df)+')</span></div>'});
h+='</div><div class="km-sec"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas</h4>';
var mav=ms[mk]||0;
if(mav>med*1.2)h+='<div class="km-tip bad"><b><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Acima da média!</b><p>Gastou '+fmt(mav)+' ('+Math.round((mav/med-1)*100)+'% acima). Revise!</p></div>';
else h+='<div class="km-tip ok"><b><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dentro da média</b><p>Gastos de '+fmt(mav)+' estão sob controle.</p></div>';
h+='<div class="km-tip warn"><b><i data-lucide="trending-down" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Meta: -10%</b><p>Nova meta: '+fmt(med*.9)+'/mês. Pequenas economias fazem diferença!</p></div></div>';
}

document.getElementById('kmC').innerHTML=h;
document.getElementById('kmOv').classList.add('on');
if(typeof lucide!=='undefined')lucide.createIcons();
}

// ============================================================
// MODULO: CALENDARIO FINANCEIRO
// ============================================================
var cM=new Date().getMonth(),cY=new Date().getFullYear();
function calNv(d){cM+=d;if(cM>11){cM=0;cY++}if(cM<0){cM=11;cY--}rCal()}
function rCal(){
var ms=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
document.getElementById('calLbl').textContent=ms[cM]+' '+cY;
var mk=cY+'-'+String(cM+1).padStart(2,'0'),p1=new Date(cY,cM,1).getDay(),ud=new Date(cY,cM+1,0).getDate(),hj=new Date();
var dd={};
entries.forEach(function(e){if(e.date&&e.date.startsWith(mk)){var d=parseInt(e.date.substring(8,10));if(!dd[d])dd[d]=[];dd[d].push(e)}});
if(typeof recurrents!=='undefined')recurrents.forEach(function(r){if(!r.active)return;if(r.day<=ud){if(!dd[r.day])dd[r.day]=[];dd[r.day].push({desc:r.desc,value:r.value,type:r.type,isR:1})}});
var rm=0,dm=0,nt=0;
entries.forEach(function(e){if(e.date&&e.date.startsWith(mk)){nt++;if(e.type==='receita')rm+=e.value;else dm+=e.value}});
document.getElementById('calSum').innerHTML='<div class="cal-sc"><div class="csl">Receitas</div><div class="csv" style="color:var(--green)">'+fmt(rm)+'</div></div><div class="cal-sc"><div class="csl">Despesas</div><div class="csv" style="color:var(--vr)">'+fmt(dm)+'</div></div><div class="cal-sc"><div class="csl">Saldo</div><div class="csv" style="color:'+(rm-dm>=0?'var(--blue)':'var(--vr)')+'">'+fmt(rm-dm)+'</div></div><div class="cal-sc"><div class="csl">Transações</div><div class="csv" style="color:var(--purple)">'+nt+'</div></div>';
var h='';['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].forEach(function(d){h+='<div class="cal-dh">'+d+'</div>'});
for(var i=0;i<p1;i++)h+='<div class="cal-d om"></div>';
for(var d=1;d<=ud;d++){
var it=(d===hj.getDate()&&cM===hj.getMonth()&&cY===hj.getFullYear());
h+='<div class="cal-d'+(it?' today':'')+'" onclick="oCD('+d+','+cM+','+cY+')">';
h+='<div class="cdn">'+d+'</div>';
if(dd[d]){var s=0;dd[d].forEach(function(e){if(s<2){var c=e.isR?'rec':(e.type==='receita'?'inc':'exp');h+='<span class="cdr '+c+'">'+e.desc.substring(0,8)+'</span>';s++}});if(dd[d].length>2)h+='<div class="cdm">+'+(dd[d].length-2)+'</div>'}
h+='</div>';
}
document.getElementById('calG').innerHTML=h;
}
function oCD(d,m,a){
var mk=a+'-'+String(m+1).padStart(2,'0'),dk=mk+'-'+String(d).padStart(2,'0'),it=[];
entries.forEach(function(e){if(e.date===dk)it.push(e)});
if(typeof recurrents!=='undefined')recurrents.forEach(function(r){if(r.active&&r.day===d)it.push({desc:r.desc+' (Fixo)',value:r.value,type:r.type})});
var ms=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var h='<h3>'+d+' de '+ms[m]+' '+a+'</h3>';
if(!it.length)h+='<div style="text-align:center;padding:20px;color:var(--t3)"><i data-lucide="inbox" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Nenhuma movimentação</div>';
else{var tr2=0,td2=0;it.forEach(function(e){if(e.type==='receita')tr2+=e.value;else td2+=e.value;h+='<div class="km-it"><span class="il"><i data-lucide="'+(e.type==='receita'?'wallet':'receipt')+'" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> '+e.desc+'</span><span class="iv" style="color:'+(e.type==='receita'?'var(--green)':'var(--vr)')+'">'+fmt(e.value)+'</span></div>'});
if(tr2||td2){h+='<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--brd);display:flex;justify-content:space-between">';if(tr2)h+='<span style="color:var(--green);font-weight:700">+'+fmt(tr2)+'</span>';if(td2)h+='<span style="color:var(--vr);font-weight:700">-'+fmt(td2)+'</span>';h+='</div>'}}
h+='<button onclick="cCD()" style="width:100%;margin-top:16px;padding:10px;background:var(--vr);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Fechar</button>';
document.getElementById('cdmC').innerHTML=h;
document.getElementById('cdmOv').classList.add('on');
document.getElementById('cdmBox').classList.add('on');
if(typeof lucide!=='undefined')lucide.createIcons();
}
function cCD(){document.getElementById('cdmOv').classList.remove('on');document.getElementById('cdmBox').classList.remove('on')}

// Hook: renderizar calendario ao navegar para a tab (FIX: sem wrapper recursivo)
// Calendar hook agora é chamado via observer dentro de go()

/* ── next block ── */

window.addEventListener('load',function(){setTimeout(function(){var s=document.getElementById('virtSplash');if(s){s.classList.add('gone');setTimeout(function(){s.remove()},500)}},1400)})

/* ── next block ── */

window._fabConsultorHistory=[];
function addFabConsultorMsg(role,content){
window._fabConsultorHistory.push({role:role,content:content,time:Date.now()});
var h=document.getElementById('fabConsultorHistory');
if(!h)return;
var div=document.createElement('div');
div.className='fab-consultor-msg '+role;
var icon=role==='ai'?'&#129302;':'&#128100;';
var timeStr=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
div.innerHTML=(role==='user'?content:content.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'))+'<div class="fab-msg-time">'+icon+' '+timeStr+'</div>';
h.appendChild(div);
h.scrollTop=h.scrollHeight;
}
function openModalConsultorFAB(){
try{
if(!document.getElementById('modalContent')){if(typeof toast==='function')toast(typeof t==='function'?t('toast_erro_abrir'):'Erro ao abrir. Recarregue a página.','err');return;}
var welcome='';
if(window._fabConsultorHistory.length===0){
var welcomeText='**Consultor Financeiro Sibanki**\n\nSeu assistente para controle financeiro. Você pode:\n• **Lançar** receitas e despesas (ex: "almoço 45", "recebi 3000 salário")\n• **Adicionar, editar ou excluir** contas e cartões\n• **Criar metas** e **definir orçamentos** por categoria\n• **Tirar dúvidas** sobre finanças e sobre o uso do app\n\nDigite ou use o microfone para falar.';
window._fabConsultorHistory.push({role:'ai',content:welcomeText,time:Date.now()});
}
var historyHtml=window._fabConsultorHistory.map(function(m){
var c=m.role==='user'?m.content:(m.content.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'));
return '<div class="fab-consultor-msg '+m.role+'">'+c+'<div class="fab-msg-time">'+(m.role==='ai'?'&#129302;':'&#128100;')+' '+new Date(m.time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</div></div>';
}).join('');
var html='<div class="fab-consultor-modal"><div class="fab-consultor-header"><div style="display:flex;align-items:center;gap:10px"><i data-lucide="message-circle" style="width:22px;height:22px;color:#4C7BF4;flex-shrink:0"></i><div><div class="fab-consultor-title">Consultor Financeiro Sibanki</div><div class="fab-consultor-sub">Assistente completo: lançamentos, contas, cartões, metas e dúvidas</div></div></div><button type="button" class="fab-consultor-close" onclick="closeModal()" aria-label="Fechar"><i data-lucide="x" style="width:20px;height:20px"></i></button></div><div class="fab-consultor-pills"><span class="fab-consultor-pill" onclick="var i=document.getElementById(\'fabConsultorInput\');if(i){i.value=\'almoço 45\';i.focus()}">almoço 45</span><span class="fab-consultor-pill" onclick="var i=document.getElementById(\'fabConsultorInput\');if(i){i.value=\'quanto gastei no mês?\';i.focus()}">quanto gastei?</span><span class="fab-consultor-pill" onclick="var i=document.getElementById(\'fabConsultorInput\');if(i){i.value=\'como funciona metas?\';i.focus()}">como funciona metas?</span></div><div class="fab-consultor-history" id="fabConsultorHistory">'+historyHtml+'</div><div class="fab-consultor-input-wrap"><textarea id="fabConsultorInput" placeholder="Digite ou fale..." rows="1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();fabConsultorSend();}"></textarea><button type="button" class="fab-consultor-mic" id="fabConsultorMicBtn" onclick="fabConsultorStartVoice()" aria-label="Falar"><i data-lucide="mic" style="width:20px;height:20px"></i></button><button type="button" class="fab-consultor-send" onclick="fabConsultorSend()" aria-label="Enviar"><i data-lucide="arrow-up" style="width:20px;height:20px"></i></button></div></div>';
openModal(html);
var ov=document.getElementById('modalOverlay');var box=document.getElementById('modalBox');
if(ov)ov.classList.add('modal-ia-lanc');if(box)box.classList.add('modal-ia-lanc');
setTimeout(function(){var el=document.getElementById('fabConsultorInput');if(el)el.focus();if(typeof window.refreshLucide==='function')lucide.createIcons();},150);
}catch(e){console.error('openModalConsultorFAB error:',e);if(typeof toast==='function')toast(typeof t==='function'?t('toast_erro_abrir_consultor'):'Erro ao abrir consultor.','err');}
}
var _fabConsultorRecognition=null;
function fabConsultorStartVoice(){
var inp=document.getElementById('fabConsultorInput');
var btn=document.getElementById('fabConsultorMicBtn');
if(!inp)return;
var SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SpeechRecognition){if(typeof toast==='function')toast(typeof t==='function'?t('toast_voz_nao_suportada'):'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.','err');return;}
if(_fabConsultorRecognition&&_fabConsultorRecognition.abort)_fabConsultorRecognition.abort();
_fabConsultorRecognition=new SpeechRecognition();
_fabConsultorRecognition.lang='pt-BR';
_fabConsultorRecognition.continuous=false;
_fabConsultorRecognition.interimResults=false;
_fabConsultorRecognition.onstart=function(){if(btn){btn.classList.add('listening');btn.setAttribute('aria-label','Ouvindo...');}if(typeof toast==='function')toast(typeof t==='function'?t('toast_fale_agora'):'Fale agora...','ok');};
_fabConsultorRecognition.onend=function(){if(btn){btn.classList.remove('listening');btn.setAttribute('aria-label','Falar');}if(typeof window.refreshLucide==='function')lucide.createIcons();};
_fabConsultorRecognition.onerror=function(e){if(btn)btn.classList.remove('listening');if(e.error!=='aborted'&&typeof toast==='function')toast(typeof t==='function'?t('toast_nao_consegui_ouvir'):'Não consegui ouvir. Tente de novo.','err');};
_fabConsultorRecognition.onresult=function(e){var t=e.results[0][0].transcript||'';if(t.trim()){inp.value=(inp.value?inp.value+' ':'')+t;inp.focus();}if(btn)btn.classList.remove('listening');};
_fabConsultorRecognition.start();
}
function fabConsultorSend(){
var inp=document.getElementById('fabConsultorInput');
var hist=document.getElementById('fabConsultorHistory');
if(!inp||!hist)return;
var txt=(inp.value||'').trim();
if(!txt){if(typeof toast==='function')toast(typeof t==='function'?t('toast_pergunta_vazia'):'Digite uma mensagem','err');return;}
addFabConsultorMsg('user',txt);
inp.value='';
var loadingEl=document.createElement('div');
loadingEl.className='fab-consultor-loading';
loadingEl.id='fabConsultorLoading';
loadingEl.textContent=typeof t==='function'?t('lbl_analisando'):'Analisando...';
hist.appendChild(loadingEl);
hist.scrollTop=hist.scrollHeight;
var user=typeof firebase!=='undefined'&&firebase.auth&&firebase.auth().currentUser;
if(!user){var ld=document.getElementById('fabConsultorLoading');if(ld)ld.remove();addFabConsultorMsg('ai','&#9888;&#65039; Faça login para usar o consultor.');return;}
tryExecuteFabAction(txt,function(done,msg){
var ld=document.getElementById('fabConsultorLoading');
if(ld)ld.remove();
if(done){addFabConsultorMsg('ai',msg);if(typeof toast==='function')toast(typeof t==='function'?t('toast_pronto'):'Pronto!','ok');return;}
var ctx=typeof getFinancialContext==='function'?getFinancialContext():{};
var contextStr='Receita mensal: R$'+(ctx.receita_mes||0).toFixed(2)+'\nDespesa mensal: R$'+(ctx.despesa_mes||0).toFixed(2)+'\nSaldo: R$'+((ctx.receita_mes||0)-(ctx.despesa_mes||0)).toFixed(2)+'\n';
if(ctx.top_categorias)contextStr+='Categorias: '+ctx.top_categorias+'\n';
if(ctx.metas)contextStr+='Metas: '+ctx.metas+'\n';
if(ctx.contas)contextStr+='Contas: '+ctx.contas+'\n';
try{
var fn=firebase.functions().httpsCallable('chatApi');
fn({message:txt,context:contextStr}).then(function(res){
var data=res&&res.data?res.data:{};var reply=(data.reply||'').trim().replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
addFabConsultorMsg('ai',reply);
}).catch(function(err){
var code=(err&&err.code)||'';var msg=(err&&err.message)||'Erro ao conectar. Tente novamente.';
if(code==='functions/resource-exhausted'||/quota|limite|rate limit/i.test(msg))msg='Limite de uso do consultor por hoje atingido. Tente em alguns minutos ou amanhã.';
addFabConsultorMsg('ai','&#9888;&#65039; '+msg);
});
}catch(e){addFabConsultorMsg('ai','&#9888;&#65039; Erro: '+e.message);}
});
}
function runFabAction(o,txt){
if(!o)return null;
if(o.needMore&&o.message)return o.message;
if(o.action==='delete_account'&&o.bank){
var name=String(o.bank).trim();
var acc=typeof userAccs!=='undefined'?userAccs.find(function(a){return (a||'').toLowerCase()===name.toLowerCase();}):null;
if(!acc)return 'Conta "'+name+'" não encontrada.';
if(userAccs.length<=1)return 'Não é possível remover a última conta. Adicione outra antes.';
userAccs=userAccs.filter(function(c){return c!==acc});
if(typeof accountBalances==='object'&&accountBalances[acc]!==undefined)delete accountBalances[acc];
if(typeof accountMeta==='object'&&accountMeta[acc]!==undefined)delete accountMeta[acc];
saveData();
if(typeof renderAccTags==='function')renderAccTags();if(typeof renderCarteira==='function')renderCarteira();if(typeof popTfSels==='function')popTfSels();if(typeof popRcSels==='function')popRcSels();if(typeof renderAll==='function')renderAll();
return 'Conta "'+acc+'" removida.';
}
if(o.action==='add_account'&&o.bank){
var bankName=String(o.bank).trim();
var bal=parseFloat(o.balance);if(isNaN(bal))bal=0;
if(typeof userAccs==='undefined')userAccs=[];
if(userAccs.indexOf(bankName)>=0)return 'Conta "'+bankName+'" já existe.';
userAccs.push(bankName);
if(bal!==0){if(typeof accountBalances==='undefined')accountBalances={};accountBalances[bankName]=bal;}
saveData();
if(typeof renderAccTags==='function')renderAccTags();if(typeof renderCarteira==='function')renderCarteira();if(typeof popTfSels==='function')popTfSels();if(typeof popRcSels==='function')popRcSels();if(typeof popFilCat==='function')popFilCat();if(typeof renderAll==='function')renderAll();
return 'Conta "'+bankName+'" adicionada.'+(bal!==0?' Saldo inicial R$ '+bal.toFixed(2):'');
}
if(o.action==='delete_card'&&o.name){
var nomeCard=String(o.name||'').trim().toLowerCase();
var card=typeof cards!=='undefined'?cards.find(function(c){return (c.name||'').toLowerCase().indexOf(nomeCard)>=0||nomeCard.indexOf((c.name||'').toLowerCase())>=0;}):null;
if(!card)return 'Cartão "'+nomeCard+'" não encontrado.';
var id=card.id;
var pIds={};
if(card.purchases)card.purchases.forEach(function(p){if(p.purchaseId)pIds[p.purchaseId]=true;});
if(typeof entries!=='undefined')entries=entries.filter(function(e){return !e.cardPurchaseId||!pIds[e.cardPurchaseId];});
cards=cards.filter(function(c){return c.id!==id});
saveData();
if(typeof renderAll==='function')renderAll();if(typeof renderCards==='function')renderCards();if(typeof renderCarteira==='function')renderCarteira();
return 'Cartão "'+(card.name||'')+'" removido.';
}
if(o.action==='add_card'&&o.name&&o.limit){
var cName=String(o.name||'').trim();
var cLimit=parseFloat(o.limit);
var cFlag=String(o.flag||'Visa').trim();
var validFlags=['Visa','Mastercard','Elo','Amex','Hipercard','Outra'];
if(validFlags.indexOf(cFlag)===-1)cFlag='Visa';
var cClose=parseInt(o.closeDay,10);if(isNaN(cClose)||cClose<1||cClose>31)cClose=25;
var cDue=parseInt(o.dueDay,10);if(isNaN(cDue)||cDue<1||cDue>31)cDue=5;
var bankKey=(o.bank||'').toString().toLowerCase().trim();
if(typeof _nomeToBankKey!=='undefined'&&_nomeToBankKey[bankKey])bankKey=_nomeToBankKey[bankKey];
if(typeof LOGOS_BANCOS!=='undefined'&&!LOGOS_BANCOS[bankKey])bankKey='outro';
var cColor=(typeof LOGOS_BANCOS!=='undefined'&&LOGOS_BANCOS[bankKey]&&LOGOS_BANCOS[bankKey].cor)?LOGOS_BANCOS[bankKey].cor:'#1e3a5f';
if(typeof cards==='undefined')cards=[];
cards.push({id:Date.now(),name:cName,flag:cFlag,limit:cLimit,closeDay:cClose,dueDay:cDue,color:cColor,bank:bankKey,temAnuidade:!!o.temAnuidade,anuidade:null,purchases:[],active:true});
saveData();
if(typeof renderCards==='function')renderCards();if(typeof renderCarteira==='function')renderCarteira();
return 'Cartão "'+cName+'" adicionado. Limite R$ '+cLimit.toFixed(2);
}
if(o.action==='delete_entry'&&o.entryId){
var eid=Number(o.entryId);
var ent=typeof entries!=='undefined'?entries.find(function(e){return e.id===eid;}):null;
if(!ent)return 'Lançamento não encontrado.';
entries=entries.filter(function(e){return e.id!==eid;});
saveData();
if(typeof renderAll==='function')renderAll();
return 'Lançamento "'+(ent.desc||'')+'" (R$ '+parseFloat(ent.value).toFixed(2)+') excluído.';
}
if(o.action==='edit_entry'&&o.entryId){
var eid=Number(o.entryId);
var ent=typeof entries!=='undefined'?entries.find(function(e){return e.id===eid;}):null;
if(!ent)return 'Lançamento não encontrado.';
if(o.value!=null&&!isNaN(parseFloat(o.value)))ent.value=Math.round(parseFloat(o.value)*100)/100;
if(typeof o.desc==='string'&&o.desc.trim())ent.desc=o.desc.trim().substring(0,80);
if(typeof o.category==='string'&&o.category.trim())ent.category=o.category.trim();
if(typeof o.date==='string'&&o.date.trim())ent.date=o.date.trim();
saveData();
if(typeof renderAll==='function')renderAll();
return 'Lançamento atualizado: '+(ent.desc||'')+' R$ '+parseFloat(ent.value).toFixed(2);
}
if(o.action==='edit_account'&&o.bank){
var oldName=String(o.bank).trim();
var acc=typeof userAccs!=='undefined'?userAccs.find(function(a){return (a||'').toLowerCase()===oldName.toLowerCase();}):null;
if(!acc)return 'Conta "'+oldName+'" não encontrada.';
var newName=typeof o.newName==='string'?o.newName.trim():'';
var newBal=o.balance!=null&&!isNaN(parseFloat(o.balance))?parseFloat(o.balance):null;
if(newName){
var idx=userAccs.indexOf(acc);
userAccs[idx]=newName;
if(typeof accountBalances==='object'&&accountBalances[acc]!==undefined){accountBalances[newName]=accountBalances[acc];delete accountBalances[acc];}
if(typeof accountMeta==='object'&&accountMeta[acc]!==undefined){accountMeta[newName]=accountMeta[acc];delete accountMeta[acc];}
if(typeof entries==='undefined')entries=[];
entries.forEach(function(e){if(e.account===acc)e.account=newName;});
saveData();
if(typeof renderAccTags==='function')renderAccTags();if(typeof renderCarteira==='function')renderCarteira();if(typeof renderAll==='function')renderAll();
return 'Conta renomeada para "'+newName+'".';
}
if(newBal!==null){if(typeof accountBalances==='undefined')accountBalances={};accountBalances[acc]=newBal;saveData();if(typeof renderCarteira==='function')renderCarteira();if(typeof renderAll==='function')renderAll();return 'Saldo da conta "'+acc+'" atualizado para R$ '+newBal.toFixed(2)+'.';}
return 'Informe newName ou balance para editar a conta.';
}
if(o.action==='edit_card'&&o.name){
var nomeCard=String(o.name||'').trim().toLowerCase();
var card=typeof cards!=='undefined'?cards.find(function(c){return (c.name||'').toLowerCase().indexOf(nomeCard)>=0||nomeCard.indexOf((c.name||'').toLowerCase())>=0;}):null;
if(!card)return 'Cartão não encontrado.';
if(o.limit!=null&&!isNaN(parseFloat(o.limit)))card.limit=parseFloat(o.limit);
if(typeof o.newName==='string'&&o.newName.trim())card.name=o.newName.trim();
if(o.closeDay!=null){var c=parseInt(o.closeDay,10);if(c>=1&&c<=31)card.closeDay=c;}
if(o.dueDay!=null){var d=parseInt(o.dueDay,10);if(d>=1&&d<=31)card.dueDay=d;}
saveData();
if(typeof renderCards==='function')renderCards();if(typeof renderCarteira==='function')renderCarteira();if(typeof renderAll==='function')renderAll();
return 'Cartão "'+(card.name||'')+'" atualizado.';
}
if(o.action==='add_goal'&&o.name&&o.target){
var gName=String(o.name||'').trim();
var gTarget=parseFloat(o.target);
var gCurrent=parseFloat(o.current);if(isNaN(gCurrent)||gCurrent<0)gCurrent=0;
var gCor=String(o.cor||'green').toLowerCase();
var validCors=['green','blue','purple','yellow','red','cyan'];
if(validCors.indexOf(gCor)===-1)gCor='green';
if(typeof goals==='undefined')goals=[];
goals.push({id:Date.now(),nome:gName,alvo:gTarget,atual:gCurrent,prazo:typeof o.prazo==='string'?o.prazo.trim():'',cor:gCor});
saveData();
if(typeof renderAll==='function')renderAll();
return 'Meta "'+gName+'" criada! Alvo R$ '+gTarget.toFixed(2);
}
if(o.action==='edit_goal'&&o.name){
var gNome=String(o.name||'').trim().toLowerCase();
var g=typeof goals!=='undefined'?goals.find(function(x){return (x.nome||x.name||'').toLowerCase().indexOf(gNome)>=0||gNome.indexOf((x.nome||x.name||'').toLowerCase())>=0;}):null;
if(!g)return 'Meta não encontrada.';
if(o.target!=null&&!isNaN(parseFloat(o.target)))g.alvo=parseFloat(o.target);
if(typeof o.newName==='string'&&o.newName.trim())g.nome=o.newName.trim();
if(o.current!=null&&!isNaN(parseFloat(o.current)))g.atual=Math.max(0,parseFloat(o.current));
saveData();
if(typeof renderAll==='function')renderAll();
return 'Meta "'+(g.nome||g.name)+'" atualizada.';
}
if(o.action==='delete_goal'&&o.name){
var gNome=String(o.name||'').trim().toLowerCase();
var g=typeof goals!=='undefined'?goals.find(function(x){return (x.nome||x.name||'').toLowerCase().indexOf(gNome)>=0||gNome.indexOf((x.nome||x.name||'').toLowerCase())>=0;}):null;
if(!g){return 'Meta não encontrada.';}
var nomeRemovido=g.nome||g.name;
goals=goals.filter(function(x){return x.id!==g.id;});
saveData();
if(typeof renderAll==='function')renderAll();
return 'Meta "'+nomeRemovido+'" removida.';
}
if(o.action==='set_budget'&&o.category&&o.value){
var bCat=String(o.category||'').trim();
var bVal=parseFloat(o.value);
if(typeof userCats!=='undefined'&&userCats.indexOf(bCat)===-1)userCats.push(bCat);
if(typeof budgets==='undefined')budgets={};
budgets[bCat]=bVal;
var mk=typeof getOrcamentoMonthKey==='function'?getOrcamentoMonthKey():new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
if(typeof orcamentosByMonth==='undefined')orcamentosByMonth={};
if(!orcamentosByMonth[mk])orcamentosByMonth[mk]={categorias:{}};
if(!orcamentosByMonth[mk].categorias)orcamentosByMonth[mk].categorias={};
orcamentosByMonth[mk].categorias[bCat]=bVal;
saveData();
if(typeof renderAll==='function')renderAll();
return 'Orçamento de '+bCat+': R$ '+bVal.toFixed(2)+'/mês';
}
if(o.action==='delete_budget'&&o.category){
var bCat=String(o.category||'').trim();
if(typeof budgets==='object'&&budgets[bCat]!==undefined){delete budgets[bCat];}
var mk=typeof getOrcamentoMonthKey==='function'?getOrcamentoMonthKey():new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
if(typeof orcamentosByMonth==='object'&&orcamentosByMonth[mk]&&orcamentosByMonth[mk].categorias&&orcamentosByMonth[mk].categorias[bCat]!==undefined){delete orcamentosByMonth[mk].categorias[bCat];}
saveData();
if(typeof renderAll==='function')renderAll();
return 'Orçamento da categoria "'+bCat+'" removido.';
}
if((o.type==='despesa'||o.type==='receita')&&o.value>0){
var hoje=new Date().toISOString().split('T')[0];
var acc=(typeof userAccs!=='undefined'&&userAccs.length)?userAccs[0]:'';
if(typeof entries==='undefined')entries=[];
var newEntry={id:Date.now(),date:hoje,type:o.type,desc:(o.desc||txt||'').substring(0,80),category:o.category||'Outros',value:Math.round(parseFloat(o.value)*100)/100,account:acc,tags:'',status:'pago',formaPgto:'',isTransfer:false};
entries.push(newEntry);
saveData();
if(typeof renderAll==='function')renderAll();
setTimeout(function(){checkProactiveConsultor(newEntry);},500);
return 'Lançamento registrado: '+(o.type==='receita'?'Receita':'Despesa')+' '+(o.category||'')+' R$ '+parseFloat(o.value).toFixed(2);
}
return null;
}
function tryExecuteFabAction(txt,cb){
var recentList='';
if(typeof entries!=='undefined'&&entries.length>0){
var sorted=entries.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).slice(0,20);
recentList='ÚLTIMOS LANÇAMENTOS (use entryId para excluir ou editar): '+sorted.map(function(e){return 'id '+e.id+' | '+e.date+' | '+(e.desc||'').substring(0,30)+' | '+e.type+' R$ '+parseFloat(e.value).toFixed(2);}).join('; ')+'.\n\n';
}
var prompt='Você é o assistente do Sibanki, um app de controle financeiro. O usu��rio escreveu: "'+txt.replace(/"/g,'\\"')+'".\n\n'+
recentList+
'O sistema permite: Lançar, editar e excluir lançamentos; adicionar/editar/excluir conta; adicionar/editar/excluir cartão; adicionar/editar/excluir meta; definir ou remover orçamento por categoria.\n\n'+
'Regras: Se for UM lançamento (só adicionar), responda: {"type":"despesa" ou "receita", "value": número, "desc": "descrição", "category": "categoria"}. Categorias: Alimentação, Transporte, Salário, Lazer, Saúde, Mercado, Moradia, Educação, Imprevisto, Outros. Valor sempre positivo.\n'+
'Se FALTAR informação essencial: {"needMore": true, "message": "Pergunta em pt-BR"}.\n'+
'EXCLUIR LANÇAMENTO: use o entryId da lista acima. {"action": "delete_entry", "entryId": número}.\n'+
'EDITAR LANÇAMENTO: use entryId; opcionais value, desc, category, date. {"action": "edit_entry", "entryId": número, "value": número, "desc": "...", "category": "...", "date": "YYYY-MM-DD"}.\n'+
'ADICIONAR CONTA: {"action": "add_account", "bank": "nome", "balance": número}.\n'+
'EXCLUIR CONTA: {"action": "delete_account", "bank": "nome exato da conta"}.\n'+
'EDITAR CONTA: renomear ou saldo. {"action": "edit_account", "bank": "nome atual", "newName": "novo nome"} ou {"action": "edit_account", "bank": "nome", "balance": número}.\n'+
'ADICIONAR CARTÃO: {"action": "add_card", "name": "nome", "flag": "Visa"|"Mastercard"|"Elo", "limit": número, "closeDay": 1-31, "dueDay": 1-31}.\n'+
'EXCLUIR CARTÃO: {"action": "delete_card", "name": "nome ou parte do nome do cartão"}.\n'+
'EDITAR CARTÃO: {"action": "edit_card", "name": "nome do cartão", "limit": número, "newName": "...", "closeDay": 1-31, "dueDay": 1-31}.\n'+
'ADICIONAR META: {"action": "add_goal", "name": "nome", "target": número, "current": 0, "cor": "green"}.\n'+
'EDITAR META: {"action": "edit_goal", "name": "nome da meta", "target": número, "newName": "...", "current": número}.\n'+
'EXCLUIR META: {"action": "delete_goal", "name": "nome da meta"}.\n'+
'ORÇAMENTO: {"action": "set_budget", "category": "categoria", "value": número}. REMOVER ORÇAMENTO: {"action": "delete_budget", "category": "categoria"}.\nResposta: só um JSON, sem markdown.';
try{
firebase.functions().httpsCallable('chatApi')({message:prompt,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
var raw=(data.reply||'').trim();
var m=raw.match(/\{[\s\S]*\}/);
var o=null;
try{o=m?JSON.parse(m[0]):null;}catch(e){}
var fallback=typeof parseLancamentoSimples==='function'?parseLancamentoSimples(txt):null;
if(!o&&fallback)o=fallback;
var msg=typeof runFabAction==='function'?runFabAction(o,txt):null;
if(msg){cb(true,msg);return;}
cb(false);
}).catch(function(){cb(false);});
}catch(e){cb(false);}
}
function parseLancamentoSimples(txt){
var t=txt.trim();
var numMatch=t.match(/\s+(\d+([.,]\d+)?)\s*$/);
if(!numMatch){return null;}
var valorStr=numMatch[1].replace(',','.');
var valor=parseFloat(valorStr);
if(isNaN(valor)||valor<=0){return null;}
var desc=(t.substring(0,numMatch.index)||t).trim()||'Lançamento';
return {type:'despesa',value:valor,desc:desc,category:'Alimentação'};
}

/* ── next block ── */

/* === TOP 5 GASTOS (bloco unificado em #topGastos via renderDashPremium) === */
function renderTopGastos(){}

/* ── next block ── */

/* === CASAL SIBANKI === */
var coupleData=null;
var coupleId=null;

/* Corrige erros comuns de digitação em domínios de e-mail */
function fixEmailDomainTypos(email){
var lower=email.trim().toLowerCase();
var typos={'gamil.com':'gmail.com','gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.com.br':'gmail.com','gmal.com':'gmail.com','yahooo.com':'yahoo.com','yaho.com':'yahoo.com','hotmal.com':'hotmail.com','hotmai.com':'hotmail.com','outlok.com':'outlook.com'};
var at=lower.indexOf('@');
if(at===-1)return lower;
var domain=lower.substring(at+1);
var fixed=typos[domain];
if(fixed){return lower.substring(0,at+1)+fixed;}
return lower;
}
/* --- ENVIAR CONVITE --- */
function sendCoupleInvite(){
var emailInput=document.getElementById('coupleEmail');
var statusEl=document.getElementById('coupleInviteStatus');
if(!emailInput||!statusEl)return;
var emailRaw=emailInput.value.trim().toLowerCase();
if(!emailRaw){statusEl.innerHTML='<span style="color:var(--vr)">Digite o email do parceiro(a)</span>';return}
var email=fixEmailDomainTypos(emailRaw);
if(email!==emailRaw){emailInput.value=email;toast('Domínio corrigido: '+emailRaw.split('@')[1]+' → '+email.split('@')[1],'ok');}
if(email===U.email.toLowerCase()){statusEl.innerHTML='<span style="color:var(--vr)">Voc\u00ea n\u00e3o pode convidar a si mesmo \u{1F605}</span>';return}
statusEl.innerHTML='<span style="color:var(--yellow)">Enviando convite...</span>';

/* Verificar se ja tem convite pendente */
db.collection('invites').where('fromEmail','==',U.email.toLowerCase()).where('status','==','pending').get().then(function(snap){
if(!snap.empty){
statusEl.innerHTML='<span style="color:var(--yellow)">Voc\u00ea j\u00e1 tem um convite pendente. Aguarde a resposta.</span>';
return;
}
/* Criar convite */
var invite={
from:U.uid,
fromName:U.name||'Usu\u00e1rio',
fromEmail:U.email.toLowerCase(),
toEmail:email,
status:'pending',
created:new Date().toISOString()
};
db.collection('invites').add(invite).then(function(docRef){
emailInput.value='';
var path=window.location.pathname||'/app/';
var baseUrl=window.location.origin+(path.indexOf('/app')>=0?path.replace(/\/+$/,'')||'/app':'/app');
var link=baseUrl+'#invite='+docRef.id;
var fromName=(U.name||'Usuário').replace(/'/g,"\\'");
statusEl.innerHTML='<span style="color:var(--green)">\u2705 Convite enviado!</span> Envie o link ou o e-mail para <b>'+escapeHtml(email)+'</b>: <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="text" readonly value="'+String(link).replace(/"/g,'&quot;')+'" style="flex:1;min-width:0;padding:6px 10px;font-size:.75em;background:var(--bg2);border:1px solid var(--brd);border-radius:6px;color:var(--t1)" id="coupleInviteLinkInput"><button type="button" class="btn btn-sm" style="font-size:.75em;padding:6px 12px" onclick="var i=document.getElementById(\'coupleInviteLinkInput\');if(i)navigator.clipboard.writeText(i.value).then(function(){toast(\'Link copiado!\',\'ok\')});">Copiar link</button><button type="button" class="btn btn-sm" style="font-size:.75em;padding:6px 12px;background:var(--green)" id="btnSendInviteEmail" onclick="sendInviteByEmail(\''+docRef.id+'\',\''+String(email).replace(/'/g,"\\'")+'\',\''+fromName+'\')">Enviar por e-mail</button></div>';
toast(typeof t==='function'?t('toast_convite_enviado'):'Convite enviado! Envie o link ou use "Enviar por e-mail".','ok');
loadCoupleStatus();
}).catch(function(err){
statusEl.innerHTML='<span style="color:var(--vr)">Erro: '+err.message+'</span>';
});
});
}

function sendInviteByEmail(inviteId,toEmail,fromName){
var btn=document.getElementById('btnSendInviteEmail');
if(btn){btn.disabled=true;btn.textContent=typeof t==='function'?t('btn_enviando_email'):'Enviando...';}
var fn=firebase.functions().httpsCallable('sendFamilyInviteEmail');
fn({inviteId:inviteId,toEmail:toEmail,fromName:fromName||'Usuário'}).then(function(r){
if(btn){btn.disabled=false;btn.textContent=typeof t==='function'?t('btn_enviar_por_email'):'Enviar por e-mail';}
if(r.data&&r.data.ok){toast(typeof t==='function'?t('toast_email_enviado_familia'):'E-mail enviado! O convidado receberá uma mensagem com o link e apresentação do Sibanki.','ok');}
else if(r.data&&r.data.error==='EMAIL_NOT_CONFIGURED'){toast(typeof t==='function'?t('toast_email_nao_configurado'):'Envio por e-mail não configurado. Copie o link e envie por WhatsApp ou e-mail.','info');}
else{toast((r.data&&r.data.message)||'Erro ao enviar e-mail.','err');}
}).catch(function(err){
if(btn){btn.disabled=false;btn.textContent=typeof t==='function'?t('btn_enviar_por_email'):'Enviar por e-mail';}
toast('Erro: '+(err.message||'tente novamente'),'err');
});
}

/* --- VERIFICAR STATUS DO CASAL --- */
function loadCoupleStatus(){
if(!U||!U.uid)return;

/* Verificar se ja esta vinculado */
db.collection('couples').where('members','array-contains',U.uid).get().then(function(snap){
if(!snap.empty){
var doc=snap.docs[0];
coupleId=doc.id;
coupleData=doc.data();
db.collection('users').doc(U.uid).set({coupleId:coupleId},{merge:true}).catch(function(){});
showCoupleLinked();
return;
}

/* Verificar convites RECEBIDOS pendentes */
db.collection('invites').where('toEmail','==',U.email.toLowerCase()).where('status','==','pending').get().then(function(invSnap){
if(!invSnap.empty){
showCoupleInviteReceived(invSnap.docs[0]);
}
});

/* Verificar convites ENVIADOS pendentes */
db.collection('invites').where('from','==',U.uid).where('status','==','pending').get().then(function(sentSnap){
if(!sentSnap.empty){
showCouplePendingSent(sentSnap.docs[0]);
}
});
});
}

/* --- MOSTRAR CONVITE RECEBIDO --- */
function showCoupleInviteReceived(invDoc){
var inv=invDoc.data();
var alertBar=document.getElementById('alertBar');
if(alertBar){
alertBar.style.display='block';
alertBar.innerHTML='<div class="invite-notification"><div style="font-size:1.2em;margin-bottom:8px;display:inline-flex;align-items:center;gap:8px"><i data-lucide="mail-plus" style="width:22px;height:22px;color:var(--pink)"></i> Convite para Família Sibanki!</div><div style="font-size:.85em;margin-bottom:12px"><b>'+inv.fromName+'</b> ('+inv.fromEmail+') quer vincular as finan\u00e7as com voc\u00ea!</div><div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-r" onclick="acceptCoupleInvite(\''+invDoc.id+'\')"><i data-lucide="check" style="width:16px;height:16px;vertical-align:middle;margin-right:4px"></i> Aceitar</button><button class="btn" style="background:rgba(255,255,255,.06);color:var(--t2)" onclick="rejectCoupleInvite(\''+invDoc.id+'\')"><i data-lucide="x" style="width:16px;height:16px;vertical-align:middle;margin-right:4px"></i> Recusar</button></div></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}

/* --- CONVITE ENVIADO PENDENTE --- */
function showCouplePendingSent(invDoc){
var inv=invDoc.data();
var box=document.getElementById('couplePendingSent');
var list=document.getElementById('couplePendingSentList');
if(box&&list){
box.style.display='block';
var path=window.location.pathname||'/app/';
var baseUrl=window.location.origin+(path.indexOf('/app')>=0?path.replace(/\/+$/,'')||'/app':'/app');
var link=baseUrl+'#invite='+invDoc.id;
list.innerHTML='<div style="font-size:.85em"><span style="display:inline-flex;align-items:center;gap:4px;color:var(--yellow)"><i data-lucide="clock" style="width:14px;height:14px"></i></span> Aguardando aceite de <b>'+inv.toEmail+'</b><br><span style="font-size:.8em;color:var(--t2)">Envie este link para aceitar:</span><div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="text" readonly id="couplePendingLinkInput" value="'+String(link).replace(/"/g,'&quot;')+'" style="flex:1;min-width:0;padding:6px 8px;font-size:.72em;background:var(--bg2);border:1px solid var(--brd);border-radius:6px;color:var(--t1)"><button type="button" class="btn btn-sm" style="font-size:.72em;padding:4px 10px" onclick="var i=document.getElementById(\'couplePendingLinkInput\');if(i)navigator.clipboard.writeText(i.value).then(function(){toast(\'Link copiado!\',\'ok\')});">Copiar</button></div><button class="btn btn-sm" style="margin-top:10px;background:rgba(255,255,255,.06);color:var(--t2);font-size:.75em" onclick="cancelCoupleInvite(\''+invDoc.id+'\')">Cancelar convite</button></div>';
if(typeof lucide!=='undefined')lucide.createIcons();
}
}

/* --- ACEITAR CONVITE --- */
function acceptCoupleInvite(invId){
if(!confirm('Aceitar o v\u00ednculo familiar? As finan\u00e7as ser\u00e3o compartilhadas!'))return;
db.collection('invites').doc(invId).get().then(function(invDoc){
var inv=invDoc.data();
/* Criar documento do casal */
var coupleDoc={
members:[inv.from,U.uid],
names:{},
emails:{},
entries:[],
goals:[],
created:new Date().toISOString()
};
coupleDoc.names[inv.from]=inv.fromName;
coupleDoc.names[U.uid]=U.name||'Parceiro(a)';
coupleDoc.emails[inv.from]=inv.fromEmail;
coupleDoc.emails[U.uid]=U.email;

db.collection('couples').add(coupleDoc).then(function(coupleRef){
/* Atualizar convite para aceito */
db.collection('invites').doc(invId).update({status:'accepted',coupleId:coupleRef.id});
/* Atualizar usuário atual com coupleId (o convidante será atualizado via listener) */
db.collection('users').doc(U.uid).set({coupleId:coupleRef.id},{merge:true}).catch(function(){});
/* Limpar alerta */
var alertBar=document.getElementById('alertBar');
if(alertBar){alertBar.style.display='none';alertBar.innerHTML=''}
toast(typeof t==='function'?t('toast_familia_vinculada'):'💏 Família vinculada com sucesso! Dashboard disponível.','ok');
loadCoupleStatus();
if(typeof go==='function')go('casal',null);
});
});
}

/* --- REJEITAR CONVITE --- */
function rejectCoupleInvite(invId){
if(!confirm('Recusar o convite familiar?'))return;
db.collection('invites').doc(invId).update({status:'rejected'});
var alertBar=document.getElementById('alertBar');
if(alertBar){alertBar.style.display='none';alertBar.innerHTML=''}
toast(typeof t==='function'?t('toast_convite_recusado'):'Convite recusado','ok');
}

/* --- CANCELAR CONVITE ENVIADO --- */
function cancelCoupleInvite(invId){
if(!confirm('Cancelar o convite?'))return;
db.collection('invites').doc(invId).delete().then(function(){
toast(typeof t==='function'?t('toast_convite_cancelado'):'Convite cancelado','ok');
loadCoupleStatus();
var box=document.getElementById('couplePendingSent');
if(box)box.style.display='none';
});
}

/* --- ABAS DO MODO FAMÍLIA (Membros / Metas / Atividade) --- */
function switchFamContentTab(tabId, btn){
var tabs=document.querySelectorAll('.fam-tab');
var panels=document.querySelectorAll('.fam-tab-panel');
tabs.forEach(function(t){t.classList.remove('on');if(t.getAttribute('data-fam-tab')===tabId)t.classList.add('on');});
panels.forEach(function(p){p.classList.remove('on');if((p.id==='famTabMembers'&&tabId==='members')||(p.id==='famTabGoals'&&tabId==='goals')||(p.id==='famTabActivity'&&tabId==='activity'))p.classList.add('on');});
if(typeof lucide!=='undefined')lucide.createIcons();
}

/* --- ALTERNAR PARCEIRO / FILHOS --- */
function switchFamTab(which){
var wrap=document.getElementById('famMainWrap');
var childSec=document.getElementById('familyChildSection');
var tabCouple=document.getElementById('famTabCouple');
var tabChild=document.getElementById('famTabChild');
if(!wrap||!childSec)return;
if(which==='child'){
wrap.style.display='none';
childSec.style.display='block';
if(tabCouple)tabCouple.classList.remove('on');
if(tabChild)tabChild.classList.add('on');
if(typeof loadFamilyChildren==='function')loadFamilyChildren();
}else{
wrap.style.display='block';
childSec.style.display='none';
if(tabCouple)tabCouple.classList.add('on');
if(tabChild)tabChild.classList.remove('on');
}
if(typeof lucide!=='undefined')lucide.createIcons();
}

/* --- MOSTRAR DASHBOARD DO CASAL --- */
function showCoupleLinked(){
if(!coupleData)return;
document.getElementById('coupleNotLinked').style.display='none';
document.getElementById('coupleLinked').style.display='block';

var partnerUid=coupleData.members.find(function(m){return m!==U.uid});
if(typeof loadFamilyChildren==='function')loadFamilyChildren();
var myName=coupleData.names[U.uid]||'Eu';
var partnerName=coupleData.names[partnerUid]||'Parceiro(a)';

/* Avatares */
document.getElementById('coupleAv1').textContent=myName.charAt(0).toUpperCase();
document.getElementById('coupleAv2').textContent=partnerName.charAt(0).toUpperCase();
document.getElementById('coupleTitle').textContent=myName.split(' ')[0]+' & '+partnerName.split(' ')[0];

/* Carregar dados do parceiro */
db.collection('users').doc(partnerUid).get().then(function(pDoc){
var pd=pDoc.exists?pDoc.data():{};
var partnerEntries=pd.entries||[];
var partnerInvest=pd.investments||[];

renderCoupleKPIs(entries,partnerEntries,investments,partnerInvest,myName,partnerName);
renderCoupleCompare(entries,partnerEntries,myName,partnerName);
renderCoupleEntries(entries,partnerEntries,myName,partnerName);
renderCoupleGoals();
if(typeof lucide!=='undefined')lucide.createIcons();
});
}

/* --- KPIs DA FAMÍLIA --- */
function renderCoupleKPIs(myE,partE,myInv,partInv,myName,partName){
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var allE=myE.concat(partE);
var recJ=0,despJ=0;
allE.forEach(function(e){
if(e.date&&e.date.startsWith(mesAtual)){
var v=e.value||e.valor||0;
if(e.type==='receita')recJ+=v;
else despJ+=v;
}
});
var saldoJ=recJ-despJ;
var invJ=0;
myInv.concat(partInv).forEach(function(i){invJ+=(i.atual||i.currentValue||i.valor||i.value||0)});

var fmt=function(v){return'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2})};
var elDesp=document.getElementById('ckDespJ');if(elDesp)elDesp.textContent=fmt(despJ);
var elSaldo=document.getElementById('ckSaldoJ');if(elSaldo){elSaldo.textContent=fmt(saldoJ);elSaldo.style.color=saldoJ>=0?'var(--green)':'var(--vr)';}
var elMetas=document.getElementById('famStatMetas');if(elMetas&&coupleData&&coupleData.goals)elMetas.textContent=coupleData.goals.length;
}

/* --- COMPARATIVO --- */
function renderCoupleCompare(myE,partE,myName,partName){
var el=document.getElementById('coupleCompare');
if(!el)return;
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var myDesp=0,partDesp=0,myRec=0,partRec=0;
myE.forEach(function(e){if(e.date&&e.date.startsWith(mesAtual)){var v=e.value||e.valor||0;if(e.type==='despesa')myDesp+=v;else myRec+=v}});
partE.forEach(function(e){if(e.date&&e.date.startsWith(mesAtual)){var v=e.value||e.valor||0;if(e.type==='despesa')partDesp+=v;else partRec+=v}});
var maxD=Math.max(myDesp,partDesp,1);
var maxR=Math.max(myRec,partRec,1);
var fmt=function(v){return'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2})};

var h='<div style="margin-bottom:14px">';
h+='<div style="font-size:.78em;color:var(--t2);margin-bottom:6px;display:flex;align-items:center;gap:6px"><i data-lucide="trending-down" style="width:14px;height:14px"></i> Despesas</div>';
h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:.75em;width:70px">'+myName.split(' ')[0]+'</span><div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:50px;overflow:hidden"><div style="height:100%;width:'+Math.round(myDesp/maxD*100)+'%;background:var(--vr);border-radius:50px"></div></div><span style="font-size:.75em;font-weight:700;color:var(--vr)">'+fmt(myDesp)+'</span></div>';
h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:.75em;width:70px">'+partName.split(' ')[0]+'</span><div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:50px;overflow:hidden"><div style="height:100%;width:'+Math.round(partDesp/maxD*100)+'%;background:var(--pink);border-radius:50px"></div></div><span style="font-size:.75em;font-weight:700;color:var(--pink)">'+fmt(partDesp)+'</span></div>';
h+='</div>';

h+='<div>';
h+='<div style="font-size:.78em;color:var(--t2);margin-bottom:6px;display:flex;align-items:center;gap:6px"><i data-lucide="trending-up" style="width:14px;height:14px"></i> Receitas</div>';
h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:.75em;width:70px">'+myName.split(' ')[0]+'</span><div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:50px;overflow:hidden"><div style="height:100%;width:'+Math.round(myRec/maxR*100)+'%;background:var(--green);border-radius:50px"></div></div><span style="font-size:.75em;font-weight:700;color:var(--green)">'+fmt(myRec)+'</span></div>';
h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:.75em;width:70px">'+partName.split(' ')[0]+'</span><div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:50px;overflow:hidden"><div style="height:100%;width:'+Math.round(partRec/maxR*100)+'%;background:var(--cyan);border-radius:50px"></div></div><span style="font-size:.75em;font-weight:700;color:var(--cyan)">'+fmt(partRec)+'</span></div>';
h+='</div>';

el.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

/* --- LANÇAMENTOS RECENTES DO CASAL --- */
function renderCoupleEntries(myE,partE,myName,partName){
var el=document.getElementById('coupleEntries');
if(!el)return;
var now=new Date();
var mesAtual=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var all=[];
myE.forEach(function(e){if(e.date&&e.date.startsWith(mesAtual))all.push(Object.assign({},e,{owner:myName.split(' ')[0]}))});
partE.forEach(function(e){if(e.date&&e.date.startsWith(mesAtual))all.push(Object.assign({},e,{owner:partName.split(' ')[0]}))});
all.sort(function(a,b){return b.date.localeCompare(a.date)});
all=all.slice(0,20);

if(all.length===0){el.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:16px">Nenhum lan\u00e7amento este m\u00eas</div>';return}

var h='';
all.forEach(function(e){
var ic=typeof _gCILucide==='function'?_gCILucide(e.category):'package';
var cor=e.type==='receita'?'var(--green)':'var(--vr)';
var sinal=e.type==='receita'?'+':'-';
h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--brd)">';
h+='<div style="font-size:1.1em;display:flex;align-items:center;justify-content:center;width:28px;height:28px"><i data-lucide="'+ic+'" style="width:18px;height:18px"></i></div>';
h+='<div style="flex:1"><div style="font-size:.82em;font-weight:600">'+(e.desc||e.category||'-')+'</div><div style="font-size:.7em;color:var(--t3)">'+e.owner+' \u2022 '+new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR')+'</div></div>';
h+='<div style="font-size:.85em;font-weight:700;color:'+cor+'">'+sinal+' R$ '+((e.value||e.valor||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div>';
h+='</div>';
});
el.innerHTML=h;
}

/* --- METAS DO CASAL --- */
function renderCoupleGoals(){
var el=document.getElementById('coupleGoals');
if(!el||!coupleData)return;
var goals=coupleData.goals||[];
if(goals.length===0){el.innerHTML='<div style="text-align:center;color:var(--t3);font-size:.82em;padding:12px">Nenhuma meta da família ainda</div>';return}
var h='';
goals.forEach(function(g,i){
var pct=g.target>0?Math.min(100,Math.round((g.current||0)/g.target*100)):0;
h+='<div style="margin-bottom:12px">';
h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:.82em;font-weight:600;display:inline-flex;align-items:center;gap:6px"><i data-lucide="target" style="width:14px;height:14px;color:var(--pink)"></i> '+g.name+'</span><span style="font-size:.75em;color:var(--t2)">'+pct+'%</span></div>';
h+='<div style="height:8px;background:rgba(255,255,255,.06);border-radius:50px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--vr),var(--pink));border-radius:50px;transition:width .5s"></div></div>';
h+='<div style="display:flex;justify-content:space-between;font-size:.7em;color:var(--t3);margin-top:2px"><span>R$ '+(g.current||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span><span>R$ '+g.target.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span></div>';
h+='</div>';
});
el.innerHTML=h;
if(typeof lucide!=='undefined')lucide.createIcons();
}

/* --- ADICIONAR META DO CASAL --- */
function addCoupleGoal(){
if(!coupleId)return;
var name=document.getElementById('coupleGoalName').value.trim();
var value=parseFloat(document.getElementById('coupleGoalValue').value);
if(!name||!value||value<=0){toast(typeof t==='function'?t('toast_preencha_todos_campos'):'Preencha nome e valor da meta','err');return}
var goals=coupleData.goals||[];
goals.push({name:name,target:value,current:0,created:new Date().toISOString()});
db.collection('couples').doc(coupleId).update({goals:goals}).then(function(){
coupleData.goals=goals;
document.getElementById('coupleGoalName').value='';
document.getElementById('coupleGoalValue').value='';
toast(typeof t==='function'?t('toast_meta_familia_adicionada'):'Meta da família adicionada! 🎯','ok');
renderCoupleGoals();
});
}

/* --- DESVINCULAR CASAL --- */
function unlinkCouple(){
if(!coupleId)return;
if(!confirm('Tem certeza? O v\u00ednculo ser\u00e1 desfeito e os dados compartilhados ser\u00e3o perdidos.'))return;
if(!confirm('CONFIRMAR: Desvincular a família?'))return;
db.collection('couples').doc(coupleId).delete().then(function(){
coupleId=null;coupleData=null;
document.getElementById('coupleNotLinked').style.display='block';
document.getElementById('coupleLinked').style.display='none';
toast(typeof t==='function'?t('toast_familia_desvinculada'):'Família desvinculada','ok');
});
}

/* --- INICIALIZAR CASAL (chamar no loadData) --- */
var _inviteListenerUnsub=null;
var _invitePollInterval=null;
function initCouple(){
if(!U||!U.uid)return;
setTimeout(function(){loadCoupleStatus()},800);
/* Listener + polling: quando o convidado aceita, atualizar em tempo real para quem enviou */
if(_inviteListenerUnsub){_inviteListenerUnsub();_inviteListenerUnsub=null;}
if(_invitePollInterval){clearInterval(_invitePollInterval);_invitePollInterval=null;}
db.collection('invites').where('from','==',U.uid).where('status','==','pending').get().then(function(snap){
if(snap.empty)return;
var invDoc=snap.docs[0];
function onInviteAccepted(){
if(_inviteListenerUnsub){_inviteListenerUnsub();_inviteListenerUnsub=null;}
if(_invitePollInterval){clearInterval(_invitePollInterval);_invitePollInterval=null;}
loadCoupleStatus();
if(typeof go==='function')go('casal',null);
toast(typeof t==='function'?t('toast_convite_aceito'):'🎉 Convite aceito! Dashboard familiar disponível.','ok');
setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},300);
}
_inviteListenerUnsub=db.collection('invites').doc(invDoc.id).onSnapshot(function(doc){
if(!doc.exists)return;
var d=doc.data();
if(d.status==='accepted')onInviteAccepted();
});
/* Polling de fallback a cada 4s quando na aba casal com convite pendente */
_invitePollInterval=setInterval(function(){
var tb=document.querySelector('.tab.on');
if(!tb||tb.id!=='casal')return;
db.collection('couples').where('members','array-contains',U.uid).get().then(function(cSnap){
if(!cSnap.empty){
onInviteAccepted();
}
});
},4000);
});
}

/* ── next block ── */

/* ============================================ */
/* === GEMINI FEATURES: AUTO-CLASSIFY + RESUMO + ALERTAS === */
/* ============================================ */

/* 1) AUTO-CLASSIFICAÇÃO POR IA */
function autoClassify(){
try{
var descEl=document.getElementById('fDe');
if(!descEl)return;
var desc=descEl.value.trim();
if(!desc||desc.length<2)return;

var catSelect=document.getElementById('fC');
if(!catSelect)return;

/* Fallback local primeiro (instantâneo) */
var localCat=classifyLocal(desc);
if(localCat){
setCatValue(catSelect,localCat);
}

/* Se tem Firebase Auth, refina com IA via backend */
var user=firebase.auth().currentUser;
if(user&&desc.length>=3){
try{
firebase.functions().httpsCallable('chatApi')({message:'Classifique esta despesa em UMA das categorias: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Compras, Assinaturas, Investimentos, Outros. Responda APENAS o nome da categoria.\nDescrição: '+desc,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
if(data.reply){
var cat=data.reply.trim().split('\n')[0].replace(/[^a-zA-ZÀ-ú ]/g,'').trim();
if(cat){setCatValue(catSelect,cat);}
}
}).catch(function(e){console.log('autoClassify backend err:',e);});
}catch(e){console.log('autoClassify err:',e);}
}
}catch(e){console.log('autoClassify err:',e);}
}

function classifyLocal(desc){
var d=desc.toLowerCase();
var rules={
'Alimentação':['mercado','supermercado','ifood','rappi','restaurante','lanchonete','padaria','açougue','hortifruti','pizza','burger','sushi','almoço','jantar','café','delivery','uber eats','mc donald','subway','starbucks','feira'],
'Transporte':['uber','99','cabify','combustível','gasolina','etanol','estacionamento','pedágio','ônibus','metrô','posto','shell','ipiranga','br distribuidora','sem parar','zona azul','diesel'],
'Moradia':['aluguel','condomínio','iptu','luz','energia','água','gás','internet','telefone','manutenção','reforma','celpe','enel','sabesp','copasa','cemig','neoenergia','vivo','claro','tim','oi'],
'Saúde':['farmácia','médico','consulta','exame','plano de saúde','hospital','dentista','psicólogo','academia','drogasil','droga raia','ultrafarma','unimed','amil','hapvida','notredame','sulamerica'],
'Educação':['escola','faculdade','curso','livro','material','mensalidade','udemy','coursera','alura','descomplica','inglês','espanhol'],
'Lazer':['cinema','teatro','show','viagem','hotel','netflix','spotify','disney','hbo','amazon prime','youtube','steam','playstation','xbox','ingresso','parque','praia','bar','balada','festa','game'],
'Assinaturas':['assinatura','mensalidade','plano','premium','pro','plus'],
'Cartões':['cartão','fatura','anuidade','tarifa'],
'Salário':['salário','pagamento','férias','13o','décimo','holerite','pro-labore'],
'Freela':['freela','freelance','projeto','consultoria','serviço prestado'],
'Investimentos':['investimento','ação','fundo','cdb','tesouro','poupança','cripto','bitcoin','etf','renda fixa'],
'Transferencia':['transferência','pix','ted','doc','depósito'],
'Bem-estar':['salão','barbearia','estética','spa','massagem','manicure','cabelereiro'],
'Empréstimo':['empréstimo','financiamento','parcela','prestação','crediário']
};
for(var cat in rules){
for(var i=0;i<rules[cat].length;i++){
if(d.indexOf(rules[cat][i])>=0)return cat;
}
}
return null;
}

function findBestCatMatch(aiResponse,options){
var r=aiResponse.toLowerCase().trim();
/* Exact match */
for(var i=0;i<options.length;i++){
if(options[i].toLowerCase()===r)return options[i];
}
/* Partial match */
for(var i=0;i<options.length;i++){
if(r.indexOf(options[i].toLowerCase())>=0||options[i].toLowerCase().indexOf(r)>=0)return options[i];
}
return null;
}

function setCatValue(sel,val){
for(var i=0;i<sel.options.length;i++){
if(sel.options[i].value===val){
sel.selectedIndex=i;
sel.style.transition='background .3s';
sel.style.background='rgba(34,197,94,.15)';
setTimeout(function(){sel.style.background=''},1500);
return;
}
}
}

/* 2) RESUMO IA DO MÊS (Relatórios) */
function generateIASummary(){
try{
var ov=document.getElementById('iaSummaryOverlay');
var ct=document.getElementById('iaSummaryContent');
if(!ov||!ct)return;
ov.style.display='flex';
ct.innerHTML='<div style="text-align:center;padding:30px"><div class="ldg"></div><br>Analisando seus dados com IA...</div>';

var ctx=getFinancialContext();
var mesAtual=new Date().toISOString().substring(0,7);

/* Montar dados do mês */
var recMes=0,desMes=0,catGastos={},qtdLanc=0,pendentes=0;
entries.forEach(function(e){
if(!e.date||!e.date.startsWith(mesAtual))return;
if(e.type==='receita')recMes+=e.value;else desMes+=e.value;
if(e.type==='despesa'){catGastos[e.category]=(catGastos[e.category]||0)+e.value;}
qtdLanc++;
if(e.status==='pendente')pendentes++;
});
var topCats=Object.entries(catGastos).sort(function(a,b){return b[1]-a[1]}).slice(0,5);

var investTotal=0;
investments.forEach(function(inv){investTotal+=(inv.value||0);});

var metasAtivas=goals.filter(function(g){return !g.completed;}).length;

var prompt='Gere um RESUMO FINANCEIRO MENSAL completo e profissional.\n\n';
prompt+='Dados do mês atual ('+mesAtual+'):\n';
prompt+='- Receitas: R$ '+recMes.toFixed(2)+'\n';
prompt+='- Despesas: R$ '+desMes.toFixed(2)+'\n';
prompt+='- Saldo: R$ '+(recMes-desMes).toFixed(2)+'\n';
prompt+='- Total de lançamentos: '+qtdLanc+'\n';
prompt+='- Pendentes: '+pendentes+'\n';
prompt+='- Investimentos: R$ '+investTotal.toFixed(2)+'\n';
prompt+='- Metas ativas: '+metasAtivas+'\n';
if(topCats.length>0){
prompt+='- Top categorias gastos: ';
topCats.forEach(function(c){prompt+=c[0]+': R$'+c[1].toFixed(2)+', ';});
prompt+='\n';
}
prompt+='\nFormate com emojis, seções claras (Resumo, Destaques, Alertas, Recomendações). Máximo 250 palavras.';

/* Tentar backend IA */
var user=firebase.auth().currentUser;
if(user){
try{
firebase.functions().httpsCallable('chatApi')({message:prompt,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
if(data.reply){
var text=data.reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
ct.innerHTML='<div style="font-size:.9em;line-height:1.6">'+text+'</div>';
}else{
ct.innerHTML=buildLocalSummary(recMes,desMes,catGastos,topCats,qtdLanc,pendentes,investTotal,metasAtivas);
}
}).catch(function(err){
console.log('Resumo IA error:',err);
ct.innerHTML=buildLocalSummary(recMes,desMes,catGastos,topCats,qtdLanc,pendentes,investTotal,metasAtivas);
});
}catch(e){ct.innerHTML=buildLocalSummary(recMes,desMes,catGastos,topCats,qtdLanc,pendentes,investTotal,metasAtivas);}
}else{
ct.innerHTML=buildLocalSummary(recMes,desMes,catGastos,topCats,qtdLanc,pendentes,investTotal,metasAtivas);
}
}catch(e){
console.error('generateIASummary error:',e);
}
}

function buildLocalSummary(rec,des,catG,topC,qtd,pend,inv,metas){
var saldo=rec-des;
var pct=rec>0?((des/rec)*100).toFixed(1):'0';
var nota=10;
if(pct>100)nota-=4;else if(pct>80)nota-=2;else if(pct>60)nota-=1;
nota=Math.max(1,Math.min(10,nota));
var emoji=nota>=8?'&#128994;':nota>=5?'&#128993;':'&#128308;';

var h='<div style="line-height:1.7">';
h+='<h4 style="margin:0 0 12px">&#128202; Resumo do Mês</h4>';
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">';
h+='<div style="padding:10px;background:rgba(34,197,94,.08);border-radius:8px;text-align:center"><div style="font-size:.7em;color:var(--t2)">Receitas</div><div style="font-weight:800;color:var(--green)">R$ '+rec.toFixed(2)+'</div></div>';
h+='<div style="padding:10px;background:rgba(239,68,68,.08);border-radius:8px;text-align:center"><div style="font-size:.7em;color:var(--t2)">Despesas</div><div style="font-weight:800;color:var(--red)">R$ '+des.toFixed(2)+'</div></div>';
h+='</div>';

h+='<p>&#128176; <b>Saldo:</b> <span style="color:'+(saldo>=0?'var(--green)':'var(--red)')+'">R$ '+saldo.toFixed(2)+'</span></p>';
h+='<p>&#128200; <b>Comprometimento:</b> '+pct+'% da receita gasta</p>';
h+='<p>&#128203; <b>Lançamentos:</b> '+qtd+' ('+pend+' pendentes)</p>';
h+='<p>&#128176; <b>Investimentos:</b> R$ '+inv.toFixed(2)+'</p>';
h+='<p>&#127919; <b>Metas ativas:</b> '+metas+'</p>';

if(topC.length>0){
h+='<h4 style="margin:16px 0 8px">&#127991; Top Gastos</h4>';
topC.forEach(function(c){
var v=catG[c];
var p=des>0?((v/des)*100).toFixed(1):'0';
h+='<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--brd)">';
h+='<span>'+c+'</span><span style="font-weight:700">R$ '+v.toFixed(2)+' ('+p+'%)</span></div>';
});
}

h+='<div style="text-align:center;margin-top:16px;padding:12px;background:var(--bg2);border-radius:8px">';
h+='<div style="font-size:1.8em">'+emoji+'</div>';
h+='<div style="font-weight:800;font-size:1.2em">Nota: '+nota+'/10</div>';
h+='<div style="font-size:.8em;color:var(--t2)">'+(nota>=8?'Excelente! Continue assim!':nota>=5?'Bom, mas pode melhorar.':'Atenção! Revise seus gastos.')+'</div></div>';
h+='<p style="text-align:center;font-size:.75em;color:var(--t3);margin-top:12px">&#128161; Configure sua chave Gemini nas Configurações para um resumo mais detalhado com IA!</p>';
h+='</div>';
return h;
}

/* 3) ALERTAS IA (Notificações) */
function generateIAAlerts(){
try{
var resultEl=document.getElementById('iaAlertResult');
if(!resultEl)return;
resultEl.style.display='block';
resultEl.innerHTML='<div style="text-align:center;padding:10px"><div class="ldg"></div> Analisando...</div>';

var mesAtual=new Date().toISOString().substring(0,7);
var recMes=0,desMes=0,pendMes=0,catGastos={};
entries.forEach(function(e){
if(!e.date||!e.date.startsWith(mesAtual))return;
if(e.type==='receita')recMes+=e.value;else{desMes+=e.value;catGastos[e.category]=(catGastos[e.category]||0)+e.value;}
if(e.status==='pendente')pendMes++;
});

var desPrev=0;
var now=new Date(),diaAtual=now.getDate(),diasMes=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
if(diaAtual>0)desPrev=(desMes/diaAtual)*diasMes;

var orcEstourados=[];
Object.keys(budgets).forEach(function(cat){
if(budgets[cat]>0&&catGastos[cat]){
var pct=(catGastos[cat]/budgets[cat])*100;
if(pct>80)orcEstourados.push({cat:cat,pct:pct.toFixed(0),gasto:catGastos[cat],orc:budgets[cat]});
}
});

var prompt='Gere ALERTAS FINANCEIROS personalizados baseados nestes dados:\n';
prompt+='- Receita mês: R$'+recMes.toFixed(2)+'\n';
prompt+='- Despesa mês: R$'+desMes.toFixed(2)+'\n';
prompt+='- Previsão despesa fim do mês: R$'+desPrev.toFixed(2)+'\n';
prompt+='- Pendentes: '+pendMes+'\n';
if(orcEstourados.length>0){
prompt+='- Orçamentos estourados: ';
orcEstourados.forEach(function(o){prompt+=o.cat+' ('+o.pct+'%), ';});
prompt+='\n';
}
prompt+='\nGere 3-5 alertas com nível (🔴 crítico, 🟡 atenção, 🟢 positivo). Seja direto e prático. Máximo 150 palavras.';

var user=firebase.auth().currentUser;
if(user){
try{
firebase.functions().httpsCallable('chatApi')({message:prompt,context:''}).then(function(res){
var data=res&&res.data?res.data:{};
if(data.reply){
var text=data.reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
resultEl.innerHTML='<div style="font-size:.88em;line-height:1.6">'+text+'</div>';
}else{
resultEl.innerHTML=buildLocalAlerts(recMes,desMes,pendMes,desPrev,orcEstourados,catGastos);
}
}).catch(function(err){
resultEl.innerHTML=buildLocalAlerts(recMes,desMes,pendMes,desPrev,orcEstourados,catGastos);
});
}catch(e){resultEl.innerHTML=buildLocalAlerts(recMes,desMes,pendMes,desPrev,orcEstourados,catGastos);}
}else{
resultEl.innerHTML=buildLocalAlerts(recMes,desMes,pendMes,desPrev,orcEstourados,catGastos);
}
}catch(e){console.error('generateIAAlerts error:',e)}
}

function daysInMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}

function buildLocalAlerts(rec,des,pend,desPrev,orcEst,catG){
var h='<div style="line-height:1.6">';
var alerts=[];
var pct=rec>0?((des/rec)*100):0;

if(pct>90)alerts.push('&#128308; <b>Alerta Crítico:</b> Você já gastou '+pct.toFixed(0)+'% da receita!');
else if(pct>70)alerts.push('&#128993; <b>Atenção:</b> '+pct.toFixed(0)+'% da receita já foi gasta.');
else alerts.push('&#128994; <b>Bom ritmo:</b> Apenas '+pct.toFixed(0)+'% da receita gasta até agora.');

if(pend>0)alerts.push('<b>Pendentes:</b> R$ '+pend.toFixed(2)+' em contas a pagar/receber.');

if(desPrev>0){
var diff=((des-desPrev)/desPrev*100).toFixed(0);
if(diff>15)alerts.push('&#128200; <b>Gastos subindo:</b> +'+diff+'% comparado ao mês anterior.');
else if(diff<-10)alerts.push('&#128201; <b>Economia:</b> Gastos '+Math.abs(diff)+'% menores que o mês anterior!');
}

orcEst.forEach(function(o){
alerts.push((o.pct>=100?'&#128308;':'&#128993;')+' <b>'+o.cat+':</b> '+o.pct+'% do orçamento (R$ '+o.gasto.toFixed(2)+' de R$ '+o.limite.toFixed(2)+')');
});

if(alerts.length===0)alerts.push('&#128994; Tudo tranquilo! Sem alertas no momento.');

h+=alerts.join('<br><br>');
h+='<p style="font-size:.75em;color:var(--t3);margin-top:8px">&#128161; Configure Gemini para alertas mais inteligentes!</p>';
h+='</div>';
return h;
}

/* ── next block ── */

/* ============================================ */
/* === MODO FAMÍLIA: SISTEMA DE FILHOS ========= */
/* ============================================ */

var familyChildren = [];
var activeChildIdx = -1;
var childSelectedAvatar = '&#128118;';

/* Missões disponíveis */
var allMissions = [
/* 6-9 */
{id:'m1',title:'Primeiro Registro',desc:'Registre seu primeiro gasto no cofrinho',xp:10,type:'6-9',check:function(c){return (c.history||[]).length>=1}},
{id:'m2',title:'Poupador Iniciante',desc:'Guarde R$ 5 no cofrinho Guardar',xp:15,type:'6-9',check:function(c){return (c.cofrinhos||{}).guardar>=5}},
{id:'m3',title:'3 Registros',desc:'Registre 3 movimentações',xp:20,type:'6-9',check:function(c){return (c.history||[]).length>=3}},
{id:'m4',title:'Coração Generoso',desc:'Doe qualquer valor para o cofrinho Doar',xp:15,type:'6-9',check:function(c){return (c.cofrinhos||{}).doar>0}},
{id:'m5',title:'Guardião da Semana',desc:'Guarde R$ 20 na semana',xp:30,type:'6-9',check:function(c){return (c.cofrinhos||{}).guardar>=20}},
/* 10-13 */
{id:'m6',title:'Orçamento Mestre',desc:'Não estoure nenhum orçamento no mês',xp:50,type:'10-13',check:function(c){var b=c.budgetUsed||{};var l=c.budgetLimits||{};for(var k in l){if((b[k]||0)>l[k])return false}return Object.keys(l).length>0}},
{id:'m7',title:'10 Registros',desc:'Registre 10 movimentações',xp:40,type:'10-13',check:function(c){return (c.history||[]).length>=10}},
{id:'m8',title:'Poupador Pro',desc:'Guarde R$ 50 no cofrinho',xp:60,type:'10-13',check:function(c){return (c.cofrinhos||{}).guardar>=50}},
{id:'m9',title:'Desafiante',desc:'Complete 3 desafios',xp:50,type:'10-13',check:function(c){return (c.challengesDone||0)>=3}},
{id:'m10',title:'Investidor Mirim',desc:'Guarde R$ 100',xp:80,type:'10-13',check:function(c){return (c.cofrinhos||{}).guardar>=100}}
];

/* Badges */
var allBadges = [
{id:'b1',icon:'\u2B50',name:'Estrela',desc:'Nível 2',req:function(c){return getChildLevel(c)>=2}},
{id:'b2',icon:'\u{1F3C6}',name:'Troféu',desc:'Nível 5',req:function(c){return getChildLevel(c)>=5}},
{id:'b3',icon:'\u{1F48E}',name:'Diamante',desc:'Nível 10',req:function(c){return getChildLevel(c)>=10}},
{id:'b4',icon:'\u{1F4B0}',name:'Poupador',desc:'R$50 guardados',req:function(c){return (c.cofrinhos||{}).guardar>=50}},
{id:'b5',icon:'\u{1F9E0}',name:'Sábio',desc:'5 missões',req:function(c){return (c.missionsCompleted||[]).length>=5}},
{id:'b6',icon:'\u2764\uFE0F',name:'Generoso',desc:'R$10 doados',req:function(c){return (c.cofrinhos||{}).doar>=10}},
{id:'b7',icon:'\u{1F525}',name:'Fogo',desc:'7 dias seguidos',req:function(c){return (c.streak||0)>=7}},
{id:'b8',icon:'\u{1F680}',name:'Foguete',desc:'Nível 15',req:function(c){return getChildLevel(c)>=15}}
];

/* Mini-lições financeiras */
var miniLessons = [
'\u{1F4A1} <b>Dica:</b> Antes de comprar algo, espere 24 horas. Se ainda quiser, compre!',
'\u{1F4A1} <b>Dica:</b> Separe sempre um pouquinho para guardar. Mesmo R$ 1 conta!',
'\u{1F4A1} <b>Dica:</b> A diferença entre "querer" e "precisar" é a chave da economia.',
'\u{1F4A1} <b>Dica:</b> Quem poupa desde cedo tem mais liberdade quando crescer!',
'\u{1F4A1} <b>Dica:</b> Doar faz bem para quem recebe e para quem dá. \u2764\uFE0F',
'\u{1F4A1} <b>Dica:</b> Juros compostos são como uma bola de neve: pequenos valores viram grandes!',
'\u{1F4A1} <b>Dica:</b> Compare preços antes de comprar. Pesquisar economiza!',
'\u{1F4A1} <b>Dica:</b> Anote tudo que gastar. Conhecimento é poder financeiro!',
'\u{1F4A1} <b>Dica:</b> Investir é fazer o dinheiro trabalhar para você.',
'\u{1F4A1} <b>Dica:</b> Defina metas! Saber para que guardar motiva mais.',
'\u{1F4A1} <b>Dica:</b> Evite comprar por impulso. Respire fundo e pense!',
'\u{1F4A1} <b>Dica:</b> O melhor investimento é em conhecimento!',
'\u{1F4A1} <b>Dica:</b> Ter paciência é a maior habilidade financeira.',
'\u{1F4A1} <b>Dica:</b> Sempre gaste menos do que ganha. Essa é a regra de ouro!'
];

/* Desafios semanais (10-13) */
var weekChallenges = [
{title:'7 dias sem gasto por impulso',desc:'Só compre o planejado',days:7,xp:30},
{title:'Registre todos os gastos',desc:'Não esqueça de nenhum!',days:7,xp:25},
{title:'Guarde 30% da mesada',desc:'Coloque no cofrinho Guardar',days:30,xp:50},
{title:'Doe R$5 para alguém',desc:'Doe para o cofrinho Doar',days:30,xp:20},
{title:'Pesquise preços',desc:'Compare 3 preços antes de comprar',days:7,xp:15}
];

function getChildLevel(c){
var xp=c.xp||0;
return Math.floor(xp/50)+1;
}

function getXPForNextLevel(c){
var lvl=getChildLevel(c);
return lvl*50;
}

function getLevelTitle(lvl){
if(lvl<=2)return '\u{1F476} Aprendiz do Dinheiro';
if(lvl<=5)return '\u{1F9D1} Guardião das Finanças';
if(lvl<=10)return '\u{1F4BC} Investidor Iniciante';
if(lvl<=15)return '\u{1F451} Mestre Financeiro';
return '\u{1F680} Lenda Financeira';
}

/* ADICIONAR FILHO */
function addChild(){
if(!coupleId&&!U){toast(typeof t==='function'?t('toast_faca_login'):'Faça login primeiro','err');return}

var nameEl=document.getElementById('childName');
var ageEl=document.getElementById('childAge');
if(!nameEl||!ageEl)return;

var name=nameEl.value.trim();
var ageRange=ageEl.value;
if(!name){toast(typeof t==='function'?t('toast_dig_descricao_curto'):'Digite o nome do filho(a)','err');return}
if(familyChildren.length>=5){toast(typeof t==='function'?t('toast_max_filhos'):'Máximo 5 filhos','err');return}

var child={
name:name,
ageRange:ageRange,
avatar:childSelectedAvatar||'&#128118;',
xp:0,
cofrinhos:{gastar:0,guardar:0,doar:0},
mesada:{value:0,freq:'mensal',lastPaid:''},
limite:0,
history:[],
missionsCompleted:[],
challengesDone:0,
streak:0,
budgetLimits:{},
budgetUsed:{},
createdAt:new Date().toISOString()
};

familyChildren.push(child);
saveFamilyChildren();
nameEl.value='';
renderChildrenList();
toast('Filho(a) '+name+' adicionado(a)! \u{1F389}','ok');
}

/* SALVAR FILHOS NO FIRESTORE */
function saveFamilyChildren(){
if(!U||!U.uid)return;
var docRef=coupleId?'couples/'+coupleId:'users/'+U.uid;
var col=coupleId?'couples':'users';
var docId=coupleId||U.uid;
db.collection(col).doc(docId).update({
familyChildren:familyChildren
}).catch(function(err){
/* Se o doc não tem o campo, use set com merge */
db.collection(col).doc(docId).set({familyChildren:familyChildren},{merge:true});
});
}

/* CARREGAR FILHOS */
function loadFamilyChildren(){
if(!U||!U.uid)return;

/* Tenta carregar da família/casal */
if(coupleId){
db.collection('couples').doc(coupleId).get().then(function(doc){
if(doc.exists&&doc.data().familyChildren){
familyChildren=doc.data().familyChildren;
renderChildrenList();
showChildSection();
}
});
}else{
/* Carrega do próprio user */
db.collection('users').doc(U.uid).get().then(function(doc){
if(doc.exists&&doc.data()&&doc.data().familyChildren){
familyChildren=doc.data().familyChildren;
renderChildrenList();
showChildSection();
}
});
}
}

/* MOSTRAR/ESCONDER SEÇÃO FILHOS */
function showChildSection(){
var sec=document.getElementById('familyChildSection');
if(sec)sec.style.display=familyChildren.length>0?'block':'none';

var profSel=document.getElementById('childProfileSelector');
if(profSel)profSel.style.display=familyChildren.length>0?'block':'none';

if(familyChildren.length>0&&activeChildIdx<0){
activeChildIdx=0;
}
populateChildSelect();
if(activeChildIdx>=0)renderChildDash();
}

/* POPULAR SELECT DE FILHOS */
function populateChildSelect(){
var sel=document.getElementById('activeChildSelect');
if(!sel)return;
sel.innerHTML='';
familyChildren.forEach(function(c,i){
var opt=document.createElement('option');
opt.value=i;
opt.textContent=c.avatar+' '+c.name+' ('+c.ageRange+')';
if(i===activeChildIdx)opt.selected=true;
sel.appendChild(opt);
});
}

/* TROCAR PERFIL ATIVO */
function switchChildProfile(){
var sel=document.getElementById('activeChildSelect');
if(!sel)return;
activeChildIdx=parseInt(sel.value);
renderChildDash();
}

/* RENDERIZAR LISTA DE FILHOS (ADMIN) */
function renderChildrenList(){
var el=document.getElementById('childrenList');
if(!el)return;
if(familyChildren.length===0){
el.innerHTML='<div style="text-align:center;color:var(--t3);padding:12px;font-size:.85em">Nenhum filho adicionado</div>';
return;
}
var h='';
familyChildren.forEach(function(c,i){
var lvl=getChildLevel(c);
h+='<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--brd)">';
h+='<span style="font-size:1.5em">'+c.avatar+'</span>';
h+='<div style="flex:1"><div style="font-weight:700;font-size:.9em">'+c.name+'</div>';
h+='<div style="font-size:.72em;color:var(--t2)">'+c.ageRange+' anos | Nível '+lvl+' | '+c.xp+' XP</div></div>';
h+='<button onclick="configChild('+i+')" style="background:none;border:none;font-size:1em;cursor:pointer" title="Configurar">\u2699\uFE0F</button>';
h+='<button onclick="removeChild('+i+')" style="background:none;border:none;font-size:1em;cursor:pointer;color:var(--red)" title="Remover">\u2716</button>';
h+='</div>';
});
el.innerHTML=h;
showChildSection();
}

/* REMOVER FILHO */
function removeChild(idx){
if(!confirm('Remover '+familyChildren[idx].name+'? Os dados serão perdidos.'))return;
familyChildren.splice(idx,1);
if(activeChildIdx>=familyChildren.length)activeChildIdx=familyChildren.length-1;
saveFamilyChildren();
renderChildrenList();
toast(typeof t==='function'?t('toast_perfil_removido'):'Perfil removido','ok');
}

/* CONFIGURAR FILHO */
function configChild(idx){
activeChildIdx=idx;
var c=familyChildren[idx];
var panel=document.getElementById('childConfigPanel');
if(!panel)return;
panel.style.display=panel.style.display==='none'?'block':'none';

document.getElementById('childMesadaValue').value=c.mesada?c.mesada.value:'';
document.getElementById('childMesadaFreq').value=c.mesada?c.mesada.freq:'mensal';
document.getElementById('childLimite').value=c.limite||'';

/* Highlight avatar */
var picks=document.querySelectorAll('.av-pick');
picks.forEach(function(p){p.style.borderColor='transparent'});
}

/* SALVAR CONFIG FILHO */
function saveChildConfig(){
if(activeChildIdx<0)return;
var c=familyChildren[activeChildIdx];
c.mesada={
value:parseFloat(document.getElementById('childMesadaValue').value)||0,
freq:document.getElementById('childMesadaFreq').value,
lastPaid:c.mesada?c.mesada.lastPaid:''
};
c.limite=parseFloat(document.getElementById('childLimite').value)||0;
saveFamilyChildren();
toast(typeof t==='function'?t('toast_config_salvas'):'Configurações salvas! ✅','ok');
document.getElementById('childConfigPanel').style.display='none';
renderChildDash();
}

/* SELECIONAR AVATAR */
function pickChildAvatar(el){
document.querySelectorAll('.av-pick').forEach(function(p){p.style.borderColor='transparent'});
el.style.borderColor='var(--vr)';
childSelectedAvatar=el.innerHTML;
if(activeChildIdx>=0){
familyChildren[activeChildIdx].avatar=childSelectedAvatar;
saveFamilyChildren();
renderChildDash();
}
}

/* RENDERIZAR DASHBOARD DO FILHO */
function renderChildDash(){
if(activeChildIdx<0||!familyChildren[activeChildIdx])return;
var c=familyChildren[activeChildIdx];
var is69=c.ageRange==='6-9';

/* Show correct dashboard */
var d69=document.getElementById('childDash69');
var d1013=document.getElementById('childDash1013');
if(d69)d69.style.display=is69?'block':'none';
if(d1013)d1013.style.display=is69?'none':'block';

/* Avatar & Greeting */
var prefix=is69?'':'2';
var avEl=document.getElementById('childAvatar'+prefix);
if(avEl)avEl.innerHTML=c.avatar||'<i data-lucide="baby" style="width:48px;height:48px;color:var(--cyan)"></i>';

var greetEl=document.getElementById('childGreeting'+prefix);
if(greetEl)greetEl.textContent='Olá, '+c.name+'! \u{1F44B}';

/* Level */
var lvl=getChildLevel(c);
var lvlEl=document.getElementById('childLevel'+prefix);
if(lvlEl)lvlEl.textContent='Nível '+lvl+' - '+getLevelTitle(lvl);

/* XP Bar */
var xpNeeded=getXPForNextLevel(c);
var xpCurrent=c.xp||0;
var xpInLevel=xpCurrent%50;
var pct=Math.min(100,(xpInLevel/50)*100);
var fillEl=document.getElementById('childXPFill'+prefix);
if(fillEl)fillEl.style.width=pct+'%';
var xpTextEl=document.getElementById('childXPText'+prefix);
if(xpTextEl)xpTextEl.textContent=xpCurrent+' XP | Próximo nível: '+xpNeeded+' XP';

/* Cofrinhos */
var cof=c.cofrinhos||{gastar:0,guardar:0,doar:0};
var suffix=is69?'':'2';
var gEl=document.getElementById('cofGastar'+suffix);
if(gEl)gEl.textContent='R$ '+cof.gastar.toFixed(2);
var guEl=document.getElementById('cofGuardar'+suffix);
if(guEl)guEl.textContent='R$ '+cof.guardar.toFixed(2);
var doEl=document.getElementById('cofDoar'+suffix);
if(doEl)doEl.textContent='R$ '+cof.doar.toFixed(2);

/* Mesada */
if(is69){
var mesEl=document.getElementById('childMesada');
if(mesEl)mesEl.textContent='R$ '+(c.mesada?c.mesada.value.toFixed(2):'0.00');
var proxEl=document.getElementById('childProxMesada');
if(proxEl)proxEl.textContent=c.mesada&&c.mesada.freq?c.mesada.freq:'Não definida';
}

/* Missions */
renderChildMissions(c,is69);

/* Badges */
renderChildBadges(c,is69?'childBadges':'childBadges');

/* History */
renderChildHistory(c,is69?'childHistory':'childHistory2');

/* 10-13 extras */
if(!is69){
renderChildBudget(c);
renderChildChallenges(c);
renderChildLesson();
renderFamilyRanking();
}

/* Auto-check missions */
checkMissions(c);
checkBadges(c);
if(typeof lucide!=='undefined')lucide.createIcons();
}

/* ADICIONAR AO COFRINHO */
function addToCofrinho(tipo){
if(activeChildIdx<0)return;
var c=familyChildren[activeChildIdx];
var label=tipo==='gastar'?'Gastar':tipo==='guardar'?'Guardar':'Doar';

var valorStr=prompt('Quanto adicionar ao cofrinho '+label+'? (R$)');
if(!valorStr)return;
var valor=parseFloat(valorStr.replace(',','.'));
if(isNaN(valor)||valor<=0){toast(typeof t==='function'?t('toast_valor_invalido'):'Valor inválido','err');return}

/* Checar limite */
if(tipo==='gastar'&&c.limite>0){
var totalGasto=(c.cofrinhos?c.cofrinhos.gastar:0)+valor;
if(totalGasto>c.limite){
toast('Limite de gasto atingido! Máx: R$ '+c.limite.toFixed(2),'err');
return;
}
}

if(!c.cofrinhos)c.cofrinhos={gastar:0,guardar:0,doar:0};
c.cofrinhos[tipo]=(c.cofrinhos[tipo]||0)+valor;

/* Histórico */
if(!c.history)c.history=[];
c.history.unshift({
date:new Date().toISOString(),
type:tipo,
value:valor,
desc:label+': R$ '+valor.toFixed(2)
});

/* XP */
var xpGain=tipo==='guardar'?5:tipo==='doar'?8:2;
c.xp=(c.xp||0)+xpGain;

/* Update budget used (10-13) */
if(tipo==='gastar'){
if(!c.budgetUsed)c.budgetUsed={};
c.budgetUsed['Geral']=(c.budgetUsed['Geral']||0)+valor;
}

saveFamilyChildren();
renderChildDash();
toast(label+': +R$ '+valor.toFixed(2)+' (+'+xpGain+' XP) \u2728','ok');
}

/* RENDERIZAR MISSÕES */
function renderChildMissions(c,is69){
var elId=is69?'childMissions':'childMissions';
var el=document.getElementById(elId);
if(!el)return;

var filtered=allMissions.filter(function(m){
return is69?(m.type==='6-9'):(m.type==='10-13'||m.type==='6-9');
});

var h='';
filtered.forEach(function(m){
var done=(c.missionsCompleted||[]).indexOf(m.id)>=0;
var canComplete=!done&&m.check(c);
h+='<div class="child-mission'+(done?' done':'')+'">';
h+='<div class="cm-icon">'+(done?'\u2705':'\u{1F3AF}')+'</div>';
h+='<div class="cm-info"><div class="cm-title">'+m.title+'</div>';
h+='<div class="cm-desc">'+m.desc+'</div>';
h+='<div class="cm-xp">'+(done?'\u2705 Completa':canComplete?'\u{1F389} Pronta para coletar!':'+'+m.xp+' XP')+'</div></div>';
if(canComplete)h+='<button onclick="completeMission(\''+m.id+'\')" class="btn btn-r btn-sm" style="font-size:.72em">Coletar!</button>';
h+='</div>';
});
el.innerHTML=h||'<div style="text-align:center;color:var(--t3);padding:12px;font-size:.85em">Nenhuma missão disponível</div>';
}

/* COMPLETAR MISSÃO */
function completeMission(missionId){
if(activeChildIdx<0)return;
var c=familyChildren[activeChildIdx];
if(!c.missionsCompleted)c.missionsCompleted=[];
if(c.missionsCompleted.indexOf(missionId)>=0)return;

var mission=allMissions.find(function(m){return m.id===missionId});
if(!mission)return;

c.missionsCompleted.push(missionId);
c.xp=(c.xp||0)+mission.xp;
saveFamilyChildren();
renderChildDash();
toast('Missão completa! +'+mission.xp+' XP \u{1F389}','ok');
pushNotif('target','Missão Completa!',c.name+' completou: '+mission.title,5000);
}

/* CHECK MISSIONS AUTO */
function checkMissions(c){
allMissions.forEach(function(m){
if((c.missionsCompleted||[]).indexOf(m.id)<0&&m.check(c)){
/* Mission ready to collect - visual feedback */
}
});
}

/* RENDERIZAR BADGES */
function renderChildBadges(c,elId){
var el=document.getElementById(elId);
if(!el)return;
var h='';
allBadges.forEach(function(b){
var unlocked=b.req(c);
h+='<div class="child-badge'+(unlocked?'':' locked')+'">';
h+='<div class="cb-icon">'+b.icon+'</div>';
h+='<div>'+b.name+'</div>';
h+='</div>';
});
el.innerHTML=h;
}

/* CHECK BADGES */
function checkBadges(c){
if(!c.badges)c.badges=[];
allBadges.forEach(function(b){
if(c.badges.indexOf(b.id)<0&&b.req(c)){
c.badges.push(b.id);
saveFamilyChildren();
pushNotif('trophy','Nova Conquista!',c.name+' desbloqueou: '+b.name,5000);
}
});
}

/* RENDERIZAR HISTÓRICO */
function renderChildHistory(c,elId){
var el=document.getElementById(elId);
if(!el)return;
var hist=c.history||[];
if(hist.length===0){
el.innerHTML='<div style="text-align:center;color:var(--t3);padding:12px;font-size:.85em">Nenhum registro ainda</div>';
return;
}
var h='';
hist.slice(0,20).forEach(function(item){
var d=new Date(item.date);
var dateStr=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
var color=item.type==='guardar'?'var(--green)':item.type==='doar'?'#A855F7':'var(--red)';
h+='<div class="child-hist-item">';
h+='<span>'+dateStr+' - '+item.desc+'</span>';
h+='<span style="color:'+color+';font-weight:700">R$ '+item.value.toFixed(2)+'</span>';
h+='</div>';
});
el.innerHTML=h;
}

/* RENDERIZAR ORÇAMENTO (10-13) */
function renderChildBudget(c){
var el=document.getElementById('childBudget');
if(!el)return;
var cats=['Lanche','Jogos','Roupas','Lazer','Outros'];
var limits=c.budgetLimits||{};
var used=c.budgetUsed||{};

var h='';
cats.forEach(function(cat){
var lim=limits[cat]||0;
var us=used[cat]||0;
var pct=lim>0?Math.min(100,(us/lim)*100):0;
var color=pct>=100?'var(--red)':pct>=80?'var(--yellow)':'var(--green)';

h+='<div class="child-budget-item">';
h+='<div class="cb-cat">'+cat+'</div>';
h+='<div class="cb-bar"><div class="cb-fill" style="width:'+pct+'%;background:'+color+'"></div></div>';
h+='<div style="font-size:.75em;min-width:80px;text-align:right">R$ '+us.toFixed(0)+' / R$ '+(lim||'--')+'</div>';
h+='</div>';
});
h+='<button onclick="setChildBudgets()" class="btn btn-r btn-sm" style="margin-top:8px;font-size:.75em">Definir Limites</button>';
el.innerHTML=h;
}

function setChildBudgets(){
if(activeChildIdx<0)return;
var c=familyChildren[activeChildIdx];
if(!c.budgetLimits)c.budgetLimits={};
var cats=['Lanche','Jogos','Roupas','Lazer','Outros'];
cats.forEach(function(cat){
var v=prompt('Limite mensal para '+cat+' (R$):',c.budgetLimits[cat]||'');
if(v!==null&&v!==''){
c.budgetLimits[cat]=parseFloat(v)||0;
}
});
saveFamilyChildren();
renderChildDash();
toast(typeof t==='function'?t('toast_orcamentos_definidos'):'Orçamentos definidos! ✅','ok');
}

/* RENDERIZAR DESAFIOS (10-13) */
function renderChildChallenges(c){
var el=document.getElementById('childChallenges');
if(!el)return;
var h='';
weekChallenges.forEach(function(ch,i){
var active=c.activeChallenges&&c.activeChallenges.indexOf(i)>=0;
h+='<div class="child-challenge">';
h+='<div class="cc-title">'+(active?'\u{1F525} ':'')+''+ch.title+' <span style="font-size:.75em;color:var(--t2)">(+'+ch.xp+' XP)</span></div>';
h+='<div style="font-size:.75em;color:var(--t2)">'+ch.desc+'</div>';
if(!active)h+='<button onclick="activateChallenge('+i+')" class="btn btn-r btn-sm" style="font-size:.7em;margin-top:6px">Aceitar Desafio</button>';
else h+='<div class="cc-progress"><div class="cc-fill" style="width:50%"></div></div>';
h+='</div>';
});
el.innerHTML=h;
}

function activateChallenge(idx){
if(activeChildIdx<0)return;
var c=familyChildren[activeChildIdx];
if(!c.activeChallenges)c.activeChallenges=[];
if(c.activeChallenges.indexOf(idx)<0){
c.activeChallenges.push(idx);
saveFamilyChildren();
renderChildDash();
toast((typeof t==='function'?t('toast_desafio_aceito'):'Desafio aceito! Boa sorte.')+' \u{1F525}','ok');
}
}

/* MINI LIÇÃO DO DIA */
function renderChildLesson(){
var el=document.getElementById('childLesson');
if(!el)return;
var today=new Date().getDate();
var idx=today%miniLessons.length;
el.innerHTML=miniLessons[idx];
}

/* RANKING FAMILIAR */
function renderFamilyRanking(){
var el=document.getElementById('childRanking');
if(!el)return;
if(familyChildren.length<=1){
el.innerHTML='<div style="text-align:center;color:var(--t3);padding:8px;font-size:.85em">Adicione mais membros para o ranking!</div>';
return;
}
var sorted=familyChildren.slice().sort(function(a,b){return (b.xp||0)-(a.xp||0)});
var medals=['\u{1F947}','\u{1F948}','\u{1F949}','4°','5°'];
var h='';
sorted.forEach(function(c,i){
h+='<div class="child-rank-item">';
h+='<div class="cr-pos">'+medals[i]+'</div>';
h+='<div style="font-size:1.3em">'+c.avatar+'</div>';
h+='<div class="cr-name">'+c.name+'</div>';
h+='<div class="cr-xp">'+(c.xp||0)+' XP</div>';
h+='</div>';
});
el.innerHTML=h;
}

/* HOOK: Carregar filhos quando a aba família é aberta */
/* Chamamos loadFamilyChildren sempre que entrar na aba família */
(function(){
var origInitUI=typeof initUI==='function'?initUI:null;
var hookDone=false;
function hookFamily(){
if(hookDone)return;hookDone=true;
/* Monitorar quando coupleLinked fica visível */
setInterval(function(){
var cl=document.getElementById('coupleLinked');
var cs=document.getElementById('familyChildSection');
if(cl&&cl.style.display!=='none'&&cs){
cs.style.display='block';
var ap=document.getElementById('childAdminPanel');
if(ap)ap.style.display='block';
}
},2000);
}
setTimeout(hookFamily,3000);
})();

/* ���─ next block ── */

function wBankChg(){
var s=document.getElementById('wBankSel');
var d=document.getElementById('wCustDiv');
d.style.display=s.value==='__custom__'?'block':'none';
}
function wAddBank(){
var s=document.getElementById('wBankSel');
var nm='';
if(s.value==='__custom__'){
nm=document.getElementById('wCustName').value.trim();
if(!nm){toast(typeof t==='function'?t('toast_dig_descricao_curto'):'Digite o nome da conta','err');return;}
}else if(s.value){
nm=s.value;
}else{
toast(typeof t==='function'?t('toast_selecione_banco'):'Selecione um banco','err');return;
}
if(userAccs.indexOf(nm)>=0){
toast('Conta '+nm+' j\u00e1 existe!','err');return;
}
var bl=parseFloat(document.getElementById('wNewBal').value)||0;
userAccs.push(nm);
if(bl!==0){accountBalances[nm]=bl;}
var cestaCheck=document.getElementById('wCestaCheck');
var cestaVal=document.getElementById('wCestaVal');
var cestaDay=document.getElementById('wCestaDay');
if(cestaCheck&&cestaCheck.checked&&cestaVal){
var cv=parseFloat(cestaVal.value)||0;
var cd=Math.min(28,Math.max(1,parseInt(cestaDay.value,10)||1));
if(cv>0){
if(!accountCesta)accountCesta={};
accountCesta[nm]={value:cv,day:cd};
if(typeof recurrents==='undefined')recurrents=[];
recurrents.push({id:Date.now(),type:'despesa',desc:'Cesta de serviços - '+nm,category:'Contas',value:Math.round(cv*100)/100,account:nm,day:cd,freq:'mensal',active:true});
if(typeof rnRc==='function')rnRc();
}
}
saveData();
renderAccTags();
renderCarteira();
popTfSels();
popRcSels();
popFilCat();
s.value='';
document.getElementById('wCustDiv').style.display='none';
document.getElementById('wBalDiv').style.display='none';
document.getElementById('wCestaDiv').style.display='none';
document.getElementById('wCustName').value='';
document.getElementById('wNewBal').value='';
if(cestaCheck)cestaCheck.checked=false;
if(cestaVal)cestaVal.value='';
if(cestaDay)cestaDay.value='';
toggleWltCesta();
var msg='\u2705 Conta <b>'+nm+'</b> adicionada!';
if(bl!==0){msg+=' Saldo: R$ '+bl.toFixed(2);}
if(accountCesta[nm]){msg+=' Cesta: R$ '+accountCesta[nm].value.toFixed(2)+'/m\u00eas (dia '+accountCesta[nm].day+')';}
document.getElementById('wAddMsg').innerHTML='<span style="color:#22C55E">'+msg+'</span>';
setTimeout(function(){document.getElementById('wAddMsg').innerHTML='';},4000);
toast('Conta '+nm+' adicionada!','ok');
renderAll();
}

/* ── next block ── */

function showPatrimonio(){
var ct=document.getElementById('kpiModalContent');
var ov=document.getElementById('kpiModalOverlay');
if(!ct||!ov)return;
var c='';
try{
var now=new Date();
var mesAt=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var mesNm=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
var ent=(typeof entries!=='undefined'&&Array.isArray(entries))?entries:[];
var inv=(typeof investments!=='undefined'&&Array.isArray(investments))?investments:[];
var accB=(typeof accountBalances!=='undefined'&&accountBalances)?accountBalances:{};
var ua=(typeof userAccs!=='undefined'&&Array.isArray(userAccs))?userAccs:Object.keys(accB);
var recu=(typeof recurrents!=='undefined'&&Array.isArray(recurrents))?recurrents:[];
var tIni=0,nC=0;
for(var k in accB){if(accB.hasOwnProperty(k)){tIni+=Number(accB[k])||0;nC++}}
var tR=0,tD=0,rM=0,dM=0;
ent.forEach(function(e){var im=e.date&&e.date.startsWith(mesAt);if(e.type==='receita'){tR+=e.value;if(im)rM+=e.value}else{tD+=e.value;if(im)dM+=e.value}});
var sC=tIni+tR-tD;
var tIA=0,tIC=0;
inv.forEach(function(i){tIA+=(i.atual||i.valor);tIC+=i.valor});
var pT=sC+tIA;
var rI=tIC>0?((tIA-tIC)/tIC*100):0;
var tP=rM>0?((rM-dM)/rM*100):0;
var cF=0;
recu.forEach(function(r){if(r.active&&r.type==='despesa')cF+=r.value});
var cmF=rM>0?(cF/rM*100):0;

c='<h3><i data-lucide="landmark" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Patrim\u00f4nio Total</h3>';
c+='<div class="kpi-modal-value" style="color:var(--pri)">'+fmt(pT)+'</div>';

// ── Gráfico de evolução de saldo (últimos 7 meses) ──
var evLabels=[],evSaldo=[],evInv=[];
for(var mi=6;mi>=0;mi--){
var d2=new Date(now.getFullYear(),now.getMonth()-mi,1);
var ym=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0');
var label=d2.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
var sAcc=tIni,sInv=tIA;
if(mi>0){
// Recalcula saldo acumulado até o fim deste mês
var sAcc2=tIni,rAcc=0,dAcc=0;
ent.forEach(function(e){if(e.date&&e.date<=ym+'-31'){if(e.type==='receita')rAcc+=e.value;else dAcc+=e.value;}});
sAcc=tIni+rAcc-dAcc;
// Investimentos: usa valor atual (simplificado — não temos histórico de cotas)
sInv=tIA;
}
evLabels.push(label);evSaldo.push(parseFloat(sAcc.toFixed(2)));evInv.push(parseFloat(sInv.toFixed(2)));
}
c+='<div class="kpi-detail-section" style="padding-bottom:4px"><h4 style="margin-bottom:8px"><i data-lucide="trending-up" style="width:16px;height:16px;vertical-align:middle"></i> Evolução do Saldo (7 meses)</h4>';
c+='<canvas id="patrimonioEvoChart" height="130" style="width:100%;max-height:130px"></canvas></div>';

c+='<div class="kpi-detail-section"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Composi\u00e7\u00e3o do Patrim\u00f4nio</h4>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="landmark" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Saldos Iniciais</span><span class="di-value">'+fmt(tIni)+'</span></div>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Receitas</span><span class="di-value" style="color:var(--green)">'+fmt(tR)+'</span></div>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="x" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Despesas</span><span class="di-value" style="color:#EF4444">'+fmt(tD)+'</span></div>';
c+='<div class="kpi-detail-item" style="border:2px solid var(--pri);border-radius:8px;padding:8px"><span class="di-label"><b>= Saldo em Contas</b></span><span class="di-value"><b>'+fmt(sC)+'</b></span></div>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="trending-up" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Investimentos (atual)</span><span class="di-value" style="color:#3B82F6">'+fmt(tIA)+'</span></div>';
if(tIC>0){c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="wallet" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Investido (custo)</span><span class="di-value">'+fmt(tIC)+'</span></div>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="trending-down" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Rentabilidade</span><span class="di-value" style="color:'+(rI>=0?'var(--green)':'#EF4444')+'">'+rI.toFixed(1)+'%</span></div>';}
c+='</div>';

c+='<div class="kpi-detail-section"><h4><i data-lucide="landmark" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Saldo por Conta</h4>';
if(ua.length===0)c+='<div class="kpi-detail-item"><span class="di-label">Nenhuma conta cadastrada</span></div>';
var aS=[];
for(var i=0;i<ua.length;i++){try{var ab=getAccBal(ua[i]);aS.push({n:ua[i],b:ab.atual,ini:ab.ini,r:ab.rec,d:ab.desp})}catch(e2){aS.push({n:ua[i],b:0,ini:0,r:0,d:0})}}
aS.sort(function(a,b){return b.b-a.b});
for(var i=0;i<aS.length;i++){
var pc=pT>0?(aS[i].b/pT*100):0;
c+='<div class="kpi-detail-item"><span class="di-label">'+aS[i].n+'<br><small style="color:var(--t3)">Ini:'+fmt(aS[i].ini)+' +'+fmt(aS[i].r)+' -'+fmt(aS[i].d)+'</small></span><span class="di-value" style="color:'+(aS[i].b>=0?'var(--pri)':'#EF4444')+'">'+fmt(aS[i].b)+'<br><small>'+pc.toFixed(1)+'%</small></span></div>';
}
c+='</div>';

c+='<div class="kpi-detail-section"><h4><i data-lucide="bar-chart-2" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Sa\u00fade Financeira ('+mesNm+')</h4>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="piggy-bank" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Taxa de Poupan\u00e7a</span><span class="di-value" style="color:'+(tP>=20?'var(--green)':tP>=10?'#F59E0B':'#EF4444')+'">'+tP.toFixed(1)+'%</span></div>';
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="pin" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Comprometimento Fixos</span><span class="di-value" style="color:'+(cmF<=50?'var(--green)':cmF<=70?'#F59E0B':'#EF4444')+'">'+cmF.toFixed(1)+'%</span></div>';
var mR2=dM>0?(sC/dM):999;
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="credit-card" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Meses de Reserva</span><span class="di-value" style="color:'+(mR2>=6?'var(--green)':mR2>=3?'#F59E0B':'#EF4444')+'">'+(dM>0?mR2.toFixed(1):'\u221e')+' meses</span></div>';
var dI=pT>0?(tIA/pT*100):0;
c+='<div class="kpi-detail-item"><span class="di-label"><i data-lucide="target" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> % Investido</span><span class="di-value">'+dI.toFixed(1)+'%</span></div>';
c+='</div>';

c+='<div class="kpi-detail-section"><h4><i data-lucide="lightbulb" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Dicas Inteligentes</h4>';
if(rM<=0){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Sem receitas no m\u00eas</div><div class="kpi-tip-text">Registre suas receitas para indicadores mais precisos.</div></div>';
}else if(tP>=20){
c+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="trophy" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Excelente poupan\u00e7a!</div><div class="kpi-tip-text">Voc\u00ea poupa '+tP.toFixed(0)+'% da receita. Continue assim e invista o excedente!</div></div>';
}else if(tP>=10){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Poupan\u00e7a razo\u00e1vel</div><div class="kpi-tip-text">'+tP.toFixed(0)+'% poupado. O ideal \u00e9 20%. Revise gastos vari\u00e1veis.</div></div>';
}else{
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Poupan\u00e7a baixa!</div><div class="kpi-tip-text">Apenas '+tP.toFixed(0)+'%. Corte gastos n\u00e3o essenciais urgente.</div></div>';
}

if(dM>0&&mR2>=6){
c+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="shield" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Reserva s\u00f3lida!</div><div class="kpi-tip-text">'+mR2.toFixed(1)+' meses de reserva. Invista o excedente!</div></div>';
}else if(dM>0&&mR2>=3){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Reserva em constru\u00e7\u00e3o</div><div class="kpi-tip-text">'+mR2.toFixed(1)+' meses. Priorize chegar a 6.</div></div>';
}else if(dM>0){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Reserva insuficiente!</div><div class="kpi-tip-text">Apenas '+mR2.toFixed(1)+' meses. Foque em pelo menos 3.</div></div>';
}

if(cmF>70&&rM>0){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-circle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Fixos muito altos!</div><div class="kpi-tip-text">'+cmF.toFixed(0)+'% da receita em fixos. Renegocie contratos.</div></div>';
}else if(cmF<=50&&rM>0){
c+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="check" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Fixos sob controle</div><div class="kpi-tip-text">'+cmF.toFixed(0)+'% em fixos. Boa margem para investir!</div></div>';
}

if(dI<10&&pT>0){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="trending-up" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Comece a investir</div><div class="kpi-tip-text">S\u00f3 '+dI.toFixed(0)+'% investido. Tesouro Selic \u00e9 um bom come\u00e7o.</div></div>';
}else if(dI>=30){
c+='<div class="kpi-tip"><div class="kpi-tip-title"><i data-lucide="target" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Boa diversifica\u00e7\u00e3o!</div><div class="kpi-tip-text">'+dI.toFixed(0)+'% investido. Diversifique entre RF e RV.</div></div>';
}

if(nC<=1){
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="landmark" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Organize por contas</div><div class="kpi-tip-text">Ter 2-3 contas ajuda a separar objetivos.</div></div>';
}
c+='</div>';

}catch(err){
c='<h3><i data-lucide="landmark" style="width:22px;height:22px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Patrim\u00f4nio Total</h3>';
c+='<div class="kpi-tip warn"><div class="kpi-tip-title"><i data-lucide="alert-triangle" style="width:16px;height:16px;stroke:currentColor;stroke-width:2;vertical-align:middle"></i> Erro ao carregar</div><div class="kpi-tip-text">'+String(err)+'</div></div>';
}
ct.innerHTML=c;
ov.classList.add('active');
if(typeof lucide!=='undefined')lucide.createIcons();
// Renderiza o gráfico de evolução
setTimeout(function(){
var canvas=document.getElementById('patrimonioEvoChart');
if(!canvas||typeof Chart==='undefined')return;
var isLight=document.body.classList.contains('theme-light');
var gridColor=isLight?'rgba(0,0,0,.08)':'rgba(255,255,255,.08)';
var txtColor=isLight?'#64748b':'#94a3b8';
var zero=evSaldo.every(function(v){return v===0;});
if(zero){canvas.style.display='none';return;}
new Chart(canvas,{
type:'line',
data:{
labels:evLabels,
datasets:[{
label:'Saldo em Contas',
data:evSaldo,
borderColor:'#4C7BF4',
backgroundColor:'rgba(76,123,244,.12)',
fill:true,
tension:0.4,
pointRadius:4,
pointBackgroundColor:'#4C7BF4',
borderWidth:2
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return'R$ '+ctx.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2});}}}},
scales:{
x:{grid:{color:gridColor},ticks:{color:txtColor,font:{size:11}}},
y:{grid:{color:gridColor},ticks:{color:txtColor,font:{size:11},callback:function(v){return'R$'+(Math.abs(v)>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0));}}}
}
}
});
},120);
}

function delAccount(acc){
if(!confirm('Excluir a conta "'+acc+'"? O saldo será zerado.')){return;}
var idx=userAccs.indexOf(acc);
if(idx>=0){userAccs.splice(idx,1);delete accountBalances[acc];saveData();renderCarteira();toast('Conta "'+acc+'" excluída','ok');}
}

// Salvar tokens de APIs
function saveBrapiToken(){
var token=document.getElementById('brapiToken').value.trim();
if(!token){toast(typeof t==='function'?t('toast_token_brapi_salvo'):'Cole o token da brapi.dev','err');return;}
localStorage.setItem('vrt_b3token',token);
var b3El=document.getElementById('b3Token');
if(b3El)b3El.value=token;
toast(typeof t==='function'?t('toast_token_brapi_salvo'):'Token brapi.dev salvo! ✅','ok');
}

function loadBrapiToken(){
var token=localStorage.getItem('vrt_b3token');
if(token){
var el=document.getElementById('brapiToken');
if(el)el.value=token;
}
var b3=localStorage.getItem('vrt_b3token');
if(!b3&&token){
localStorage.setItem('vrt_b3token',token);
}
}


function saveBinanceKeys(){
var key=document.getElementById('binanceKey').value.trim();
var secret=document.getElementById('binanceSecret').value.trim();
if(!key||!secret){toast(typeof t==='function'?t('toast_preencha_api_key'):'Preencha API Key e Secret','err');return;}
localStorage.setItem('binanceKey',key);
localStorage.setItem('binanceSecret',secret);
toast(typeof t==='function'?t('toast_chaves_binance_salvas'):'Chaves Binance salvas! ✅','ok');
}

// Carregar tokens salvos ao abrir config
function loadApiTokens(){
var brapiTok=localStorage.getItem('vrt_b3token');
var binanceKey=localStorage.getItem('binanceKey');
var binanceSec=localStorage.getItem('binanceSecret');
if(brapiTok){
var el=document.getElementById('brapiToken');if(el)el.value=brapiTok;
var b3El=document.getElementById('b3Token');if(b3El)b3El.value=brapiTok;
}
if(binanceKey){var el2=document.getElementById('binanceKey');if(el2)el2.value=binanceKey;}
if(binanceSec){var el3=document.getElementById('binanceSecret');if(el3)el3.value=binanceSec;}
}


// Cotações agora via Cloud Function (ver módulo B3 acima)


function markPaidFromModal(idx,tipo){
var mesAtual=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
var pendentes=[];
entries.forEach(function(e,i){
var isMes=e.date&&e.date.startsWith(mesAtual);
var st=(e.status||'pago').toLowerCase();
var isPend=(st==='pendente'||st==='agendado');
if(isMes&&isPend&&e.type===tipo)pendentes.push(i);
});
if(idx>=0&&idx<pendentes.length){
var realIdx=pendentes[idx];
entries[realIdx].status='pago';
saveEntries();
toast('Marcado como pago: '+entries[realIdx].desc,'ok');
// Refresh modal
setTimeout(function(){openKpiModal('saldo')},300);
// Refresh dashboard
try{rKPI()}catch(x){}
try{renderCarteira()}catch(x){}
}
}

/* ── next block ── */

function enableSoloFamily(){
document.getElementById('coupleNotLinked').style.display='none';
document.getElementById('coupleLinked').style.display='block';
/* Hide couple-specific content, show only child tab */
var ct=document.getElementById('coupleMainContent');
if(ct)ct.style.display='none';
var famTabCouple=document.getElementById('famTabCouple');
if(famTabCouple)famTabCouple.style.display='none';
var famTabChild=document.getElementById('famTabChild');
if(famTabChild){famTabChild.classList.add('on');famTabChild.click();}
var cs=document.getElementById('familyChildSection');
if(cs)cs.style.display='block';
var ap=document.getElementById('childAdminPanel');
if(ap)ap.style.display='block';
toast(typeof t==='function'?t('toast_modo_filhos_ativado'):'Modo Filhos ativado! Adicione os perfis dos filhos.','ok');
}

/* ── next block ── */

var commCurrentTab="feed",commCurrentCat="all",commSelectedCat="dica";
var NICK_P1=["Investidor","Trader","Econom","Financeir","Criat","Estrat","Poupad","Gerenci","Analyst","Capital","Smart","Eagle","Sav"];
var NICK_P2=["Pro","X","Master","Alpha","Beta","Plus","Max","Zen","Top","Gold","Fox","ista","ador","eiro","Wise"];
var AV_COLORS=["#4F8CFF","#22C55E","#A855F7","#F59E0B","#EF4444","#06B6D4","#EC4899","#8B5CF6","#14B8A6","#F97316"];
var commListener=null;


var commBookmarks=[];
var commSearchTimeout=null;
var commAuthorStats={};

function searchCommPosts(){
clearTimeout(commSearchTimeout);
commSearchTimeout=setTimeout(function(){renderCommPosts();},300);
}

function getCommAuthorLevel(nickname){
if(!commAuthorStats[nickname]){
var stats={posts:0,likes:0};
commPosts.forEach(function(p){
if(p.nickname===nickname){stats.posts++;stats.likes+=(p.likes?p.likes.length:0);}
});
commAuthorStats[nickname]=stats;
}
var s=commAuthorStats[nickname];
var pts=s.posts*2+s.likes;
if(pts>=100)return 25;if(pts>=60)return 20;if(pts>=40)return 15;if(pts>=25)return 10;if(pts>=15)return 7;if(pts>=8)return 5;if(pts>=3)return 3;return 1;
}

function isCommFounder(nickname){
var founders=[];
commPosts.forEach(function(p){
if(founders.indexOf(p.nickname)<0)founders.push(p.nickname);
});
return founders.indexOf(nickname)<10;
}

function isCommTopContributor(nickname){
var stats={};
commPosts.forEach(function(p){
if(!stats[p.nickname])stats[p.nickname]={posts:0,likes:0};
stats[p.nickname].posts++;
stats[p.nickname].likes+=(p.likes?p.likes.length:0);
});
var arr=Object.keys(stats).map(function(k){return{n:k,pts:stats[k].posts*2+stats[k].likes};});
arr.sort(function(a,b){return b.pts-a.pts;});
for(var i=0;i<Math.min(3,arr.length);i++){if(arr[i].n===nickname)return true;}
return false;
}

function updateCommTrending(){
var section=document.getElementById("commTrendingSection");
var list=document.getElementById("commTrendingList");
if(!section||!list)return;
var trending=commPosts.filter(function(p){
var lc=p.likes?p.likes.length:0;var cc=p.comments?p.comments.length:0;
return lc>=2||cc>=2;
}).slice(0,5);
if(!trending.length){section.style.display="none";return;}
section.style.display="block";
var h="";
trending.forEach(function(p,i){
var lc=p.likes?p.likes.length:0;var cc=p.comments?p.comments.length:0;
h+='<div class="comm-trending-item" onclick="scrollToCommPost('+i+')">';
h+='<div class="nick">'+escH(p.nickname||"Anonimo")+'</div>';
h+='<div class="preview">'+escH((p.text||"").substring(0,80))+'</div>';
h+='<div class="stats"><span>&#10084; '+lc+'</span><span>&#128172; '+cc+'</span></div></div>';
});
list.innerHTML=h;
}

function scrollToCommPost(idx){
var posts=document.querySelectorAll(".comm-post-card");
if(posts[idx]){posts[idx].scrollIntoView({behavior:"smooth",block:"center"});posts[idx].style.boxShadow="0 0 0 2px var(--pri)";setTimeout(function(){posts[idx].style.boxShadow="";},2000);}
}

function updateCommProfileCard(){
var card=document.getElementById("commProfileCard");
if(!card||!commProfile)return;
card.style.display="flex";
var av=document.getElementById("commProfileAv");
if(av){av.style.background=commProfile.color;av.textContent=commProfile.nickname.substring(0,2).toUpperCase();}
var name=document.getElementById("commProfileName");
if(name){
var lvl=getCommAuthorLevel(commProfile.nickname);
name.innerHTML=escH(commProfile.nickname)+' <span class="comm-badge-inline badge-lvl" style="font-size:.7em">Lv.'+lvl+'</span>';
}
var joined=document.getElementById("commProfileJoined");
if(joined&&commProfile.joinedAt){
var d=new Date(commProfile.joinedAt);
joined.textContent="Membro desde "+d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"});
}
var stats=document.getElementById("commProfileStats");
if(stats){
var myPosts=0,myLikes=0;
commPosts.forEach(function(p){if(p.nickname===commProfile.nickname){myPosts++;myLikes+=(p.likes?p.likes.length:0);}});
stats.innerHTML='<div class="comm-profile-stat"><div class="num">'+myPosts+'</div><div class="lbl">Posts</div></div><div class="comm-profile-stat"><div class="num">'+myLikes+'</div><div class="lbl">Curtidas</div></div><div class="comm-profile-stat"><div class="num">'+getCommAuthorLevel(commProfile.nickname)+'</div><div class="lbl">Nivel</div></div>';
}
}

function toggleCommBookmark(idx){
if(!commPosts[idx])return;
var postId=commPosts[idx].id;
if(!postId)return;
var li=commBookmarks.indexOf(postId);
if(li>=0){commBookmarks.splice(li,1);toast("Removido dos salvos","info");}
else{commBookmarks.push(postId);toast("Salvo!","ok");}
if(U&&U.uid){db.collection("users").doc(U.uid).update({commBookmarks:commBookmarks}).catch(function(e){console.error("Bookmark save error:",e);});}
renderCommPosts();
}

function reportCommPost(idx){
if(!commPosts[idx])return;
if(!confirm("Deseja reportar esta publicacao como inadequada?"))return;
var post=commPosts[idx];
var reportData={postId:post.id,reportedBy:U.uid,nickname:commProfile?commProfile.nickname:"",reason:"inappropriate",createdAt:firebase.firestore.FieldValue.serverTimestamp()};
db.collection("community_reports").add(reportData).then(function(){
toast("Reportado! Vamos analisar.","ok");
}).catch(function(e){
console.error("Report error:",e);
toast("Erro ao reportar","err");
});
}

function renderCommProfileTab(){
if(!commProfile)return;
var av=document.getElementById("commProfBigAv");
if(av){av.style.background=commProfile.color;av.textContent=commProfile.nickname.substring(0,2).toUpperCase();}
var name=document.getElementById("commProfBigName");
if(name){
var lvl=getCommAuthorLevel(commProfile.nickname);
name.textContent=commProfile.nickname;
}
var date=document.getElementById("commProfBigDate");
if(date&&commProfile.joinedAt){
var d=new Date(commProfile.joinedAt);
date.textContent="Membro desde "+d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
}
var badges=document.getElementById("commProfBigBadges");
if(badges){
var h="";
var lvl=getCommAuthorLevel(commProfile.nickname);
h+='<span class="comm-badge-inline badge-lvl" style="font-size:.8em;padding:3px 10px">&#11088; Nivel '+lvl+'</span>';
if(isCommFounder(commProfile.nickname))h+='<span class="comm-badge-inline badge-founder" style="font-size:.8em;padding:3px 10px">&#128142; Fundador</span>';
if(isCommTopContributor(commProfile.nickname))h+='<span class="comm-badge-inline badge-top" style="font-size:.8em;padding:3px 10px">&#127942; Top Contribuidor</span>';
badges.innerHTML=h;
}
var stats=document.getElementById("commProfBigStats");
if(stats){
var myPosts=0,myLikes=0,myComments=0;
commPosts.forEach(function(p){
if(p.nickname===commProfile.nickname){myPosts++;myLikes+=(p.likes?p.likes.length:0);}
if(p.comments){p.comments.forEach(function(c){if(c.nickname===commProfile.nickname)myComments++;});}
});
stats.innerHTML='<div class="comm-profile-stat"><div class="num" style="font-size:1.4em">'+myPosts+'</div><div class="lbl">Publicacoes</div></div><div class="comm-profile-stat"><div class="num" style="font-size:1.4em">'+myLikes+'</div><div class="lbl">Curtidas</div></div><div class="comm-profile-stat"><div class="num" style="font-size:1.4em">'+myComments+'</div><div class="lbl">Comentarios</div></div><div class="comm-profile-stat"><div class="num" style="font-size:1.4em">'+getCommAuthorLevel(commProfile.nickname)+'</div><div class="lbl">Nivel</div></div>';
}
var cnt=document.getElementById("commProfPostCount");
var myPostsList=commPosts.filter(function(p){return p.nickname===commProfile.nickname;});
if(cnt)cnt.textContent="("+myPostsList.length+")";
var postsDiv=document.getElementById("commProfPosts");
if(postsDiv){
if(!myPostsList.length){postsDiv.innerHTML='<div style="text-align:center;padding:30px;color:var(--t3)">Voce ainda nao publicou nada.</div>';return;}
var h="";
myPostsList.forEach(function(p){
var lc=p.likes?p.likes.length:0;var cc=p.comments?p.comments.length:0;
var ta=p.createdAt?getTA(p.createdAt):"";
h+='<div style="background:var(--card);border:1px solid var(--brd);border-radius:14px;padding:16px;margin-bottom:10px">';
h+='<div style="font-size:.82em;color:var(--t2);line-height:1.6;margin-bottom:8px">'+escH(p.text)+'</div>';
h+='<div style="display:flex;gap:12px;font-size:.75em;color:var(--t3)"><span>&#10084; '+lc+'</span><span>&#128172; '+cc+'</span><span>'+ta+'</span></div></div>';
});
postsDiv.innerHTML=h;
}
var editNick=document.getElementById("commEditNick");
if(editNick)editNick.value=commProfile.nickname;
var editColors=document.getElementById("commEditColors");
if(editColors){
var h="";
AV_COLORS.forEach(function(c){
var sel=c===commProfile.color?" border:3px solid #fff;":" border:3px solid transparent;";
h+='<div onclick="pickEditCommColor(this,\''+c+'\' )" style="width:30px;height:30px;border-radius:50%;background:'+c+';cursor:pointer;'+sel+'transition:all .2s" data-color="'+c+'"></div>';
});
editColors.innerHTML=h;
}
}

function pickEditCommColor(el,color){
document.querySelectorAll("#commEditColors div").forEach(function(d){d.style.borderColor="transparent";});
el.style.borderColor="#fff";
el.setAttribute("data-selected",color);
}

function updateCommProfile(){
var nick=document.getElementById("commEditNick").value.trim();
if(!nick||nick.length<3){toast("Apelido precisa ter pelo menos 3 caracteres","err");return;}
var colorEl=document.querySelector("#commEditColors div[data-selected]");
var color=colorEl?colorEl.getAttribute("data-selected"):commProfile.color;
commProfile.nickname=nick;
commProfile.color=color;
saveData();
updateCommAvatar();
updateCommProfileCard();
renderCommProfileTab();
toast("Perfil atualizado!","ok");
}


var commNotifs=[];
var commNotifOpen=false;

function toggleCommNotifs(){
commNotifOpen=!commNotifOpen;
var dd=document.getElementById("commNotifDropdown");
if(dd)dd.style.display=commNotifOpen?"block":"none";
if(commNotifOpen)renderCommNotifs();
}

function addCommNotif(type,data){
commNotifs.unshift({type:type,data:data,time:new Date().toISOString(),read:false});
if(commNotifs.length>50)commNotifs=commNotifs.slice(0,50);
updateCommNotifBadge();
}

function updateCommNotifBadge(){
var badge=document.getElementById("commNotifBadge");
if(!badge)return;
var unread=commNotifs.filter(function(n){return!n.read;}).length;
if(unread>0){badge.style.display="flex";badge.textContent=unread>9?"9+":unread;}
else{badge.style.display="none";}
}

function renderCommNotifs(){
var list=document.getElementById("commNotifList");
if(!list)return;
commNotifs.forEach(function(n){n.read=true;});
updateCommNotifBadge();
if(!commNotifs.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:.85em">Nenhuma notificacao</div>';return;}
var h="";
commNotifs.forEach(function(n){
var icon="&#128276;";var text="";
if(n.type==="like"){icon="&#10084;&#65039;";text="<strong>"+escH(n.data.who)+"</strong> curtiu sua publicacao";}
else if(n.type==="comment"){icon="&#128172;";text="<strong>"+escH(n.data.who)+"</strong> comentou na sua publicacao";}
else if(n.type==="mention"){icon="&#128227;";text="<strong>"+escH(n.data.who)+"</strong> mencionou voce";}
else if(n.type==="rank"){icon="&#127942;";text="Voce subiu para <strong>#"+n.data.position+"</strong> no ranking!";}
else if(n.type==="badge"){icon="&#127941;";text="Nova conquista: <strong>"+escH(n.data.badge)+"</strong>";}
var ta=n.time?getTA(n.time):"";
h+='<div style="display:flex;gap:10px;padding:10px 12px;border-radius:10px;transition:background .2s;cursor:default" onmouseover="this.style.background=\'rgba(79,140,255,.04)\'" onmouseout="this.style.background=\'transparent\'">';
h+='<div style="font-size:1.2em;flex-shrink:0">'+icon+'</div>';
h+='<div style="flex:1"><div style="font-size:.82em;color:var(--t2);line-height:1.5">'+text+'</div>';
h+='<div style="font-size:.68em;color:var(--t3);margin-top:2px">'+ta+'</div></div></div>';
});
list.innerHTML=h;
}

function clearCommNotifs(){
commNotifs=[];
updateCommNotifBadge();
renderCommNotifs();
}

function checkCommMentions(text,postNick){
if(!commProfile)return;
if(text.indexOf("@"+commProfile.nickname)>=0&&postNick!==commProfile.nickname){
addCommNotif("mention",{who:postNick});
}
}


var commSortMode="recent";

function sortCommFeed(mode,el){
commSortMode=mode;
document.querySelectorAll(".comm-sort-btn").forEach(function(b){b.classList.remove("active");});
if(el)el.classList.add("active");
renderCommPosts();
}

function scrollToTopComm(){
var feed=document.getElementById("commPosts");
if(feed)feed.scrollIntoView({behavior:"smooth"});
var banner=document.getElementById("commNewPostsBanner");
if(banner)banner.style.display="none";
}

function updateCommCharCounter(){
var ta=document.getElementById("commPostText");
var counter=document.getElementById("commCharCounter");
if(!ta||!counter)return;
var len=ta.value.length;
counter.textContent=len+"/500";
counter.className="comm-char-counter";
if(len>=450)counter.classList.add("danger");
else if(len>=350)counter.classList.add("warn");
}

function getCommPostScore(p){
var lc=p.likes?p.likes.length:0;
var cc=p.comments?p.comments.length:0;
var ageHours=p.createdAt?(Date.now()-new Date(p.createdAt).getTime())/3600000:999;
return (lc*3+cc*2)/(Math.pow(ageHours+2,0.5));
}

function initCommunity(){
if(!U||!U.uid){console.warn("initCommunity: no user");return;}
var setup=document.getElementById("commSetup");
var main=document.getElementById("commMain");
if(!setup||!main){console.warn("initCommunity: elements not found");return;}
if(commProfile&&commProfile.nickname){
setup.style.display="none";
main.style.display="block";
updateCommAvatar();
loadCommPosts();
if(typeof loadCommRanking==="function")loadCommRanking();
}else{
setup.style.display="block";
main.style.display="none";
}
if(typeof window.refreshLucide==='function')setTimeout(window.refreshLucide,80);
}

function acceptCommAndEnter(){
if(!U||!U.uid)return;
var nick=(U.name&&U.name.trim())?U.name.trim().substring(0,20):(U.email?U.email.split("@")[0].substring(0,20):"Anônimo");
if(nick.length<2)nick="Anônimo";
var color=AV_COLORS[Math.floor(Math.random()*AV_COLORS.length)];
commProfile={nickname:nick,color:color,joinedAt:new Date().toISOString()};
saveData();
var setup=document.getElementById("commSetup");
var main=document.getElementById("commMain");
if(setup)setup.style.display="none";
if(main)main.style.display="block";
updateCommAvatar();
loadCommPosts();
toast("Bem-vindo à Comunidade!","ok");
if(typeof window.refreshLucide==='function')lucide.createIcons();
}

function renderColorPicker(){
var cp=document.getElementById("commColorPicker");if(!cp)return;
var h="";
AV_COLORS.forEach(function(c){
h+='<div onclick="pickCommColor(this,\''+c+'\')" style="width:36px;height:36px;border-radius:50%;background:'+c+';cursor:pointer;border:3px solid transparent;transition:all .2s" data-color="'+c+'"></div>';
});
cp.innerHTML=h;
}

function pickCommColor(el,color){
document.querySelectorAll("#commColorPicker div").forEach(function(d){d.style.borderColor="transparent";});
el.style.borderColor="#fff";
var preview=document.getElementById("commAvatarPreview");
if(preview){preview.style.background=color;preview.setAttribute("data-color",color);}
var nick=document.getElementById("commNickInput").value.trim();
if(nick&&preview)preview.textContent=nick.substring(0,2).toUpperCase();
}

function generateRandomNick(){
var n1=NICK_P1[Math.floor(Math.random()*NICK_P1.length)];
var n2=NICK_P2[Math.floor(Math.random()*NICK_P2.length)];
var num=Math.floor(Math.random()*99)+1;
var nick=n1+n2+num;
document.getElementById("commNickInput").value=nick;
var preview=document.getElementById("commAvatarPreview");
if(preview)preview.textContent=nick.substring(0,2).toUpperCase();
}

function saveCommProfile(){
var nick=document.getElementById("commNickInput").value.trim();
if(!nick||nick.length<3){toast("Apelido precisa ter pelo menos 3 caracteres","err");return;}
var preview=document.getElementById("commAvatarPreview");
var color=(preview&&preview.getAttribute("data-color"))||AV_COLORS[Math.floor(Math.random()*AV_COLORS.length)];
commProfile={nickname:nick,color:color,joinedAt:new Date().toISOString()};
saveData();
document.getElementById("commSetup").style.display="none";
document.getElementById("commMain").style.display="block";
updateCommAvatar();
loadCommPosts();
toast("Bem-vindo, "+nick+"!","ok");
}

function updateCommAvatar(){
if(!commProfile)return;
var av=document.getElementById("commMyAvatar");
if(av){av.style.background=commProfile.color;av.textContent=commProfile.nickname.substring(0,2).toUpperCase();}
var nick=document.getElementById("commMyNick");
if(nick)nick.textContent=commProfile.nickname;
}

function switchCommTab(tab,el){
commCurrentTab=tab;
document.querySelectorAll(".comm-tab").forEach(function(t){t.classList.remove("on");});
if(el)el.classList.add("on");
["commFeed","commNews","commRanking","commGrupos","commPrizes","commProfile"].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display="none";});
var map={feed:"commFeed",news:"commNews",ranking:"commRanking",grupos:"commGrupos",prizes:"commPrizes",profile:"commProfile"};
var target=document.getElementById(map[tab]);
if(target)target.style.display="block";
if(tab==="news")loadCommNews();
if(tab==="ranking")loadCommRanking();
if(tab==="profile")renderCommProfileTab();
if(typeof lucide!="undefined"&&lucide.createIcons)lucide.createIcons();
}

function toggleCommCat(el){
document.querySelectorAll(".comm-compose .comm-tag").forEach(function(t){t.classList.remove("on");});
if(el)el.classList.add("on");
commSelectedCat=el.getAttribute("data-cat");
}

function publishCommPost(){
if(!commProfile){toast("Configure seu perfil primeiro","err");return;}
var ta=document.getElementById("commPostText");
if(!ta)return;
var text=ta.value.trim();
if(!text){toast("Escreva algo para publicar","err");return;}
if(text.length<10){toast("Minimo 10 caracteres","err");return;}
var today=new Date().toISOString().split("T")[0];
var todayPosts=commPosts.filter(function(p){return p.uid===U.uid&&p.createdAt&&p.createdAt.substring(0,10)===today;}).length;
if(todayPosts>=10){toast("Limite de 10 publicacoes por dia atingido","err");return;}
var post={
uid:U.uid,
nickname:commProfile.nickname,
color:commProfile.color,
text:text,
cat:commSelectedCat,
likes:[],
comments:[],
createdAt:firebase.firestore.FieldValue.serverTimestamp()
};
db.collection("community").add(post).then(function(){
ta.value="";
toast("Publicado!","ok");
}).catch(function(e){
console.error("Publish error:",e);
toast("Erro ao publicar: "+e.message,"err");
});
}

function loadCommPosts(){
if(commListener)commListener();
var q=db.collection("community").orderBy("createdAt","desc").limit(50);
commListener=q.onSnapshot(function(snapshot){
commPosts=[];commAuthorStats={};
snapshot.forEach(function(doc){
var d=doc.data();
d.id=doc.id;
if(d.createdAt&&d.createdAt.toDate)d.createdAt=d.createdAt.toDate().toISOString();
commPosts.push(d);
});
renderCommPosts();
updateCommStats();
},function(err){
console.error("Community listen error:",err);
});
}

function updateCommStats(){
var today=new Date().toISOString().split("T")[0];
var postsHoje=(commPosts||[]).filter(function(p){return p.createdAt&&p.createdAt.substring(0,10)===today;}).length;
var el=document.getElementById("commStatPostsHoje");if(el)el.textContent=String(postsHoje);
el=document.getElementById("commStatMembros");if(el)el.textContent="—";
var myPos=-1;var myStreak=0;
if(commRankData&&commRankData.length&&commProfile){
for(var i=0;i<commRankData.length;i++){if(commRankData[i].nickname===commProfile.nickname){myPos=i;myStreak=commRankData[i].streak||0;break;}}
}
el=document.getElementById("commStatRanking");if(el)el.textContent=myPos>=0?"#"+String(myPos+1):"—";
el=document.getElementById("commStatStreak");if(el)el.textContent=(myStreak||0)+" dia"+(myStreak!==1?"s":"");
}

function escH(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

function getTA(ds){
var now=new Date();var d=new Date(ds);var diff=Math.floor((now-d)/1000);
if(diff<60)return "agora";
if(diff<3600)return Math.floor(diff/60)+"min";
if(diff<86400)return Math.floor(diff/3600)+"h";
if(diff<604800)return Math.floor(diff/86400)+"d";
return d.toLocaleDateString("pt-BR");
}

function renderCommPosts(){
var ct=document.getElementById("commPosts");if(!ct)return;
var posts=commPosts||[];
var searchTerm=(document.getElementById("commSearchInputTop")||{}).value||"";
searchTerm=searchTerm.toLowerCase().trim();
if(searchTerm){posts=posts.filter(function(p){return(p.text||"").toLowerCase().indexOf(searchTerm)>=0||(p.nickname||"").toLowerCase().indexOf(searchTerm)>=0;});}
if(commCurrentCat!=="all"){posts=posts.filter(function(p){return p.cat===commCurrentCat;});}
if(commSortMode==="popular"){posts=posts.slice().sort(function(a,b){var sa=getCommPostScore(a);var sb=getCommPostScore(b);return sb-sa;});}
else if(commSortMode==="discussed"){posts=posts.slice().sort(function(a,b){return(b.comments?b.comments.length:0)-(a.comments?a.comments.length:0);});}
updateCommTrending();
updateFilterCounts();
updateCommProfileCard();
if(!posts.length){ct.innerHTML='<div class="comm-empty"><div class="comm-empty-icon">'+(!searchTerm?"&#128172;":"&#128270;")+'</div><p>'+(searchTerm?"Nenhum resultado para \""+escH(searchTerm)+"\"":"Nenhuma publicacao ainda. Seja o primeiro!")+'</p></div>';return;}
var h="";
posts.forEach(function(p,idx){
var ta=p.createdAt?getTA(p.createdAt):"";
var catNames={dica:"Dica",analise:"Analise",duvida:"Duvida",conquista:"Conquista",discussao:"Discussao"};
var cn=catNames[p.cat]||"Dica";
var isLiked=p.likes&&commProfile&&p.likes.indexOf(commProfile.nickname)>=0;
var lc=p.likes?p.likes.length:0;
var cc=p.comments?p.comments.length:0;
var isMine=p.uid===U.uid;
var isBookmarked=commBookmarks&&commBookmarks.indexOf(p.id)>=0;
var isTrending=lc>=3||(cc>=2&&lc>=1);
var authorLevel=getCommAuthorLevel(p.nickname);
h+='<div class="comm-post-card'+(isTrending?" trending":"")+'" style="animation-delay:'+(idx*0.05)+'s">';
h+='<div class="comm-post-head">';
h+='<div class="comm-post-av" style="background:'+p.color+'">'+(p.nickname||"?").substring(0,2).toUpperCase();
if(authorLevel>=10)h+='<div class="comm-lvl-ring"></div>';
h+='</div>';
h+='<div class="comm-post-meta"><div class="comm-post-nick">'+escH(p.nickname||"Anonimo");
if(authorLevel>=5)h+=' <span class="comm-badge-inline badge-lvl">Lv.'+authorLevel+'</span>';
if(isCommFounder(p.nickname))h+=' <span class="comm-badge-inline badge-founder">&#128142; Fundador</span>';
if(isCommTopContributor(p.nickname))h+=' <span class="comm-badge-inline badge-top">&#11088; Top</span>';
h+='</div>';
h+='<div class="comm-post-time">'+ta+'</div></div>';
h+='<div class="comm-post-catbadge cat-'+p.cat+'">'+cn+'</div></div>';
var text=escH(p.text);
text=text.replace(/(#\w+)/g,'<span style="color:var(--pri);font-weight:600">$1</span>');
text=text.replace(/(@\w+)/g,'<span style="color:var(--pri2);font-weight:600">$1</span>');
h+='<div class="comm-post-body">'+text+'</div>';
h+='<div class="comm-post-footer">';
h+='<button data-action="like" data-idx="'+idx+'" class="comm-action-btn'+(isLiked?" liked":"")+'">'+( isLiked?"&#10084;&#65039;":"&#129293;")+" <span class=\"count\">"+lc+"</span></button>";
h+='<button data-action="toggle-comments" data-idx="'+idx+'" class="comm-action-btn">&#128172; <span class="count">'+cc+'</span></button>';
h+='<button data-action="bookmark" data-idx="'+idx+'" class="comm-action-btn'+(isBookmarked?" bookmarked":"")+'">'+( isBookmarked?"&#128278;":"&#128278;")+'</button>';
if(isMine)h+='<button data-action="delete" data-idx="'+idx+'" class="comm-report-btn">&#128465; Excluir</button>';
if(!isMine)h+='<button data-action="report" data-idx="'+idx+'" class="comm-report-btn">&#9888;&#65039;</button>';
h+='</div>';
h+='<div id="commC'+idx+'" class="comm-comments-box" style="display:none">';
if(p.comments&&p.comments.length){
p.comments.forEach(function(c){
var cta=c.createdAt?getTA(c.createdAt):"";
h+='<div class="comm-comment-item"><div class="comm-comment-av" style="background:'+(c.color||"var(--pri)")+'">'+(c.nickname||"?").substring(0,2).toUpperCase()+'</div>';
h+='<div class="comm-comment-body"><div class="comm-comment-nick">'+escH(c.nickname||"Anonimo")+'</div>';
h+='<div class="comm-comment-text">'+escH(c.text)+'</div>';
h+='<div class="comm-comment-time">'+cta+'</div></div></div>';
});
}
h+='<div class="comm-comment-form"><input type="text" data-cidx="'+idx+'" class="comm-cinput" placeholder="Escreva um comentario..." maxlength="300"><button data-action="comment" data-idx="'+idx+'">Enviar</button></div>';
h+='</div></div>';
});
ct.innerHTML=h;
ct.querySelectorAll(".comm-cinput").forEach(function(inp){
inp.addEventListener("keypress",function(e){
if(e.key==="Enter"){var idx=parseInt(this.getAttribute("data-cidx"));addCC(idx);}
});
});
ct.querySelectorAll("[data-action]").forEach(function(btn){
btn.addEventListener("click",function(){
var action=this.getAttribute("data-action");
var idx=parseInt(this.getAttribute("data-idx"));
if(action==="like")toggleCommLike(idx);
else if(action==="toggle-comments")toggleCommComments(idx);
else if(action==="delete")deleteCommPost(idx);
else if(action==="comment")addCC(idx);
else if(action==="bookmark")toggleCommBookmark(idx);
else if(action==="report")reportCommPost(idx);
});
});
}


function toggleCommLike(idx){
if(!commProfile||!commPosts[idx])return;
var post=commPosts[idx];
var docId=post.id;
if(!docId)return;
var likes=post.likes||[];
var mn=commProfile.nickname;
var li=likes.indexOf(mn);
var isLiking=li<0;
if(li>=0)likes.splice(li,1);else likes.push(mn);
var btn=document.querySelector('[data-action="like"][data-idx="'+idx+'"]');
if(btn&&isLiking){
btn.style.transform="scale(1.3)";
setTimeout(function(){btn.style.transform="scale(1)";},200);
}
db.collection("community").doc(docId).update({likes:likes}).then(function(){
if(isLiking&&post.uid!==U.uid){
addCommNotif("like",{who:mn,text:(post.text||"").substring(0,40)});
}
}).catch(function(e){
console.error("Like error:",e);
});
}


function toggleCommComments(idx){
var el=document.getElementById("commC"+idx);
if(el)el.style.display=el.style.display==="none"?"block":"none";
}

function addCC(idx){
if(!commProfile||!commPosts[idx])return;
var post=commPosts[idx];
var docId=post.id;
if(!docId)return;
var inputs=document.querySelectorAll(".comm-cinput");
var inp=null;
inputs.forEach(function(i){if(parseInt(i.getAttribute("data-cidx"))===idx)inp=i;});
if(!inp)return;
var text=inp.value.trim();
if(!text)return;
var comments=post.comments||[];
comments.push({nickname:commProfile.nickname,color:commProfile.color,text:text,createdAt:new Date().toISOString()});
db.collection("community").doc(docId).update({comments:comments}).then(function(){
inp.value="";
}).catch(function(e){
console.error("Comment error:",e);
toast("Erro ao comentar","err");
});
}

function deleteCommPost(idx){
if(!commPosts[idx])return;
var post=commPosts[idx];
if(post.uid!==U.uid){toast("Voce so pode excluir seus proprios posts","err");return;}
if(!confirm("Excluir esta publicacao?"))return;
var docId=post.id;
if(!docId)return;
db.collection("community").doc(docId).delete().then(function(){
toast("Publicacao excluida","ok");
}).catch(function(e){
console.error("Delete error:",e);
toast("Erro ao excluir","err");
});
}

function updateFilterCounts(){
var counts={all:commPosts.length,dica:0,analise:0,duvida:0,conquista:0,discussao:0};
commPosts.forEach(function(p){if(counts[p.cat]!==undefined)counts[p.cat]++;});
document.querySelectorAll(".comm-tag").forEach(function(btn){
var onclick=btn.getAttribute("onclick")||"";
var match=onclick.match(/filterCommFeed\('(\w+)'/);
if(match){
var cat=match[1];
var count=counts[cat];
if(count!==undefined&&cat!=="all"){
var existing=btn.querySelector(".comm-filter-count");
if(!existing){existing=document.createElement("span");existing.className="comm-filter-count";btn.appendChild(existing);}
existing.textContent=" ("+count+")";
}
}
});
}

function filterCommFeed(cat,el){
commCurrentCat=cat;
document.querySelectorAll(".comm-filter .comm-tag").forEach(function(t){t.classList.remove("on");});
if(el)el.classList.add("on");
renderCommPosts();
}

function loadCommNews(){
loadNewsBriefing();
loadNewsArticles("all");
setTimeout(preloadNewsReactions,2000);
}

var newsArticles=[];
var newsCurrentCat="all";
var newsBriefingData=null;
var newsShareTarget=null;

function loadNewsBriefing(){
var BASE="https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net";
fetch(BASE+"/getDailyBriefing").then(function(r){return r.json();}).then(function(data){
newsBriefingData=data;
renderNewsBriefing(data);
}).catch(function(e){
console.error("Briefing error:",e);
document.getElementById("newsBriefIndices").innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);grid-column:1/-1">Erro ao carregar briefing</div>';
});
}

function renderNewsBriefing(data){
var indicesHTML="";
if(data.indices&&data.indices.length){
data.indices.forEach(function(idx){
var chgClass=idx.change>=0?"up":"down";
var arrow=idx.change>=0?"&#9650;":"&#9660;";
var name=idx.name;
if(name.length>12)name=idx.symbol.replace("^","");
indicesHTML+='<div class="news-idx"><div class="news-idx-name">'+name+'</div><div class="news-idx-val">'+formatNewsNum(idx.price)+'</div><div class="news-idx-chg '+chgClass+'">'+arrow+' '+(idx.change>=0?"+":"")+idx.change.toFixed(2)+'%</div></div>';
});
}
if(data.crypto){
var cChg=data.crypto.change||0;
var cClass=cChg>=0?"up":"down";
var cArrow=cChg>=0?"&#9650;":"&#9660;";
indicesHTML+='<div class="news-idx"><div class="news-idx-name">&#8383; Bitcoin</div><div class="news-idx-val">R$ '+formatNewsNum(data.crypto.price)+'</div><div class="news-idx-chg '+cClass+'">'+cArrow+' '+(cChg>=0?"+":"")+cChg.toFixed(2)+'%</div></div>';
}
document.getElementById("newsBriefIndices").innerHTML=indicesHTML;

var gainersHTML="";
var losersHTML="";
if(data.topGainers){
data.topGainers.forEach(function(s){
gainersHTML+='<div class="news-mover-item"><img class="news-mover-logo" src="'+s.logo+'" onerror="this.style.display=\"none\""><span class="news-mover-sym">'+s.symbol+'</span><span class="news-mover-price">R$ '+s.price.toFixed(2)+'</span><span class="news-mover-chg up">+'+s.change.toFixed(2)+'%</span></div>';
});
}
if(data.topLosers){
data.topLosers.forEach(function(s){
losersHTML+='<div class="news-mover-item"><img class="news-mover-logo" src="'+s.logo+'" onerror="this.style.display=\"none\""><span class="news-mover-sym">'+s.symbol+'</span><span class="news-mover-price">R$ '+s.price.toFixed(2)+'</span><span class="news-mover-chg down">'+s.change.toFixed(2)+'%</span></div>';
});
}
document.getElementById("newsGainers").innerHTML=gainersHTML||'<div style="color:var(--t3);font-size:.82em">Sem dados</div>';
document.getElementById("newsLosers").innerHTML=losersHTML||'<div style="color:var(--t3);font-size:.82em">Sem dados</div>';
}

function formatNewsNum(n){
if(!n)return"0";
if(n>=1000000)return(n/1000000).toFixed(0)+"M";
if(n>=1000)return n.toLocaleString("pt-BR",{maximumFractionDigits:0});
return n.toFixed(2);
}

function loadNewsArticles(cat){
newsCurrentCat=cat;
var BASE="https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net";
var url=BASE+"/getNews";
if(cat&&cat!=="all")url+="?category="+cat;
var list=document.getElementById("newsList");
list.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><div class="comm-skeleton-post"><div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><div class="comm-skeleton-circle"></div><div style="flex:1"><div class="comm-skeleton-line w60"></div><div class="comm-skeleton-line w40"></div></div></div><div class="comm-skeleton-line"></div><div class="comm-skeleton-line w80"></div></div><div class="comm-skeleton-post"><div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><div class="comm-skeleton-circle"></div><div style="flex:1"><div class="comm-skeleton-line w60"></div><div class="comm-skeleton-line w40"></div></div></div><div class="comm-skeleton-line"></div><div class="comm-skeleton-line w80"></div></div></div>';

fetch(url).then(function(r){return r.json();}).then(function(data){
newsArticles=data.articles||[];
renderNewsArticles();
updateNewsStats(data);
}).catch(function(e){
console.error("News error:",e);
list.innerHTML='<div class="comm-empty"><div class="comm-empty-icon">&#128240;</div><p>Erro ao carregar noticias.<br>Tente novamente em instantes.</p></div>';
});
}

function updateNewsStats(data){
var articles=data.articles||[];
var el1=document.getElementById("newsCount");
var el2=document.getElementById("newsSources");
var el3=document.getElementById("newsUpdated");
if(el1)el1.textContent=articles.length;
var sources=[];
articles.forEach(function(a){if(sources.indexOf(a.source)<0)sources.push(a.source);});
if(el2)el2.textContent=sources.length;
var now=new Date();
if(el3)el3.textContent=now.getHours()+":"+String(now.getMinutes()).padStart(2,"0");
}

function renderNewsArticles(){
var list=document.getElementById("newsList");
if(!newsArticles.length){
list.innerHTML='<div class="comm-empty"><div class="comm-empty-icon">&#128240;</div><p>Nenhuma noticia encontrada para esta categoria.</p></div>';
return;
}
var html="";
newsArticles.forEach(function(article,idx){
var isFeatured=idx===0;
var cardClass="news-card"+(isFeatured?" news-card-featured":"");
var imgHTML="";
if(article.image){
imgHTML='<img class="news-card-img" src="'+article.image+'" onerror="this.style.display=&quot;none&quot;" loading="lazy" onclick="openNewsArticle('+idx+')">';
}
var descHTML="";
if(article.description){
var safeDesc=article.description.replace(/'/g,"&#39;").replace(/"/g,"&quot;");
descHTML='<p class="news-card-desc" onclick="openNewsArticle('+idx+')">'+safeDesc+'</p>';
}
var safeTitle=article.title?article.title.replace(/'/g,"&#39;").replace(/"/g,"&quot;"):""
var timeStr=formatNewsTime(article.publishedAt);
var catLabel=article.category||"geral";
var articleId=btoa(article.url||"").replace(/[^a-zA-Z0-9]/g,"").substring(0,20);

var storedLikes=getNewsReactions(articleId,"likes");
var storedComments=getNewsComments(articleId);
var isLiked=newsUserReacted(articleId,"like");
var isBookmarked=newsIsBookmarked(articleId);
var userReaction=getNewsUserReaction(articleId);

var cardId="news-card-"+idx+"-"+articleId.replace(/[^a-zA-Z0-9]/g,"").substring(0,12);
html+='<div class="'+cardClass+'" id="'+cardId+'" data-article-id="'+articleId.replace(/"/g,'&quot;')+'" data-article-idx="'+idx+'">';
html+=imgHTML;
html+='<div class="news-card-body" onclick="openNewsArticle('+idx+')">';
html+='<div class="news-card-source"><span class="dot"></span>'+article.source+' &middot; '+catLabel.charAt(0).toUpperCase()+catLabel.slice(1)+'</div>';
html+='<h3 class="news-card-title">'+safeTitle+'</h3>';
html+=descHTML;
html+='<div class="news-card-footer">';
html+='<span class="news-card-time">&#128337; '+timeStr+'</span>';
html+='<div class="news-views-count">&#128065; '+getNewsViews(articleId)+'</div>';
html+='</div></div>';

html+='<div class="news-card-interact" onclick="event.stopPropagation()">';
html+='<div class="news-react-bar">';

html+='<div style="position:relative;display:inline-flex">';
html+='<button class="news-react-btn'+(isLiked?" active liked":"")+'" onclick="toggleNewsLike(&quot;'+articleId+'&quot;,'+idx+')" onmouseenter="showNewsReactions('+idx+')" onmouseleave="hideNewsReactions('+idx+')" title="Curtir">';
html+=(userReaction||"&#10084;&#65039;")+" <span class=\"count\">"+storedLikes+"</span></button>";
html+='<div class="news-reactions-popup" id="newsReact-'+idx+'" onmouseleave="hideNewsReactions('+idx+')">';
html+='<button class="news-reaction-opt" onclick="reactToNews(&quot;'+articleId+'&quot;,&quot;&#10084;&#65039;&quot;,'+idx+')">&#10084;&#65039;</button>';
html+='<button class="news-reaction-opt" onclick="reactToNews(&quot;'+articleId+'&quot;,&quot;&#128293;&quot;,'+idx+')">&#128293;</button>';
html+='<button class="news-reaction-opt" onclick="reactToNews(&quot;'+articleId+'&quot;,&quot;&#128562;&quot;,'+idx+')">&#128562;</button>';
html+='<button class="news-reaction-opt" onclick="reactToNews(&quot;'+articleId+'&quot;,&quot;&#128077;&quot;,'+idx+')">&#128077;</button>';
html+='<button class="news-reaction-opt" onclick="reactToNews(&quot;'+articleId+'&quot;,&quot;&#128640;&quot;,'+idx+')">&#128640;</button>';
html+='</div></div>';

html+='<button type="button" class="news-react-btn" data-news-idx="'+idx+'" onclick="event.stopPropagation();toggleNewsCommentsFromBtn(this)" title="Comentar">&#128172; <span class="count">'+storedComments.length+'</span></button>';
html+='<button class="news-react-btn" onclick="shareNewsComm('+idx+')" title="Compartilhar">&#128228;</button>';
html+='<button class="news-react-btn" onclick="copyNewsLink('+idx+')" title="Copiar link">&#128279;</button>';

html+='</div>';
html+='<button class="news-bookmark-btn'+(isBookmarked?" saved":"")+'" onclick="toggleNewsBookmark(&quot;'+articleId+'&quot;,'+idx+')" title="Salvar">'+(isBookmarked?"&#128278;":"&#128277;")+'</button>';
html+='</div>';

html+='<div class="news-comments-section" id="newsComm-'+idx+'" onclick="event.stopPropagation()">';
html+='<div class="news-comment-list" id="newsCommList-'+idx+'">';
storedComments.forEach(function(c){
html+='<div class="news-comment-item"><div class="news-comment-av" style="background:'+c.color+'">'+c.nickname.charAt(0).toUpperCase()+'</div><div class="news-comment-body"><div class="news-comment-nick">'+c.nickname+' <span class="time">'+formatNewsTime(c.time)+'</span></div><div class="news-comment-text">'+c.text+'</div></div></div>';
});
html+='</div>';
html+='<div class="news-comment-form"><input id="newsCommInput-'+idx+'" data-news-idx="'+idx+'" placeholder="Escreva um comentario..." maxlength="300" onkeydown="if(event.key===&quot;Enter&quot;)event.preventDefault();submitNewsCommentFromInput(this)"><button type="button" data-news-idx="'+idx+'" onclick="submitNewsCommentFromBtn(this)">Enviar</button></div>';
html+='</div>';

html+='</div>';
});
list.innerHTML=html;
}


function formatNewsTime(dateStr){
if(!dateStr)return"";
var d=new Date(dateStr);
var now=new Date();
var diff=Math.floor((now-d)/60000);
if(diff<1)return"Agora";
if(diff<60)return diff+" min atras";
if(diff<1440)return Math.floor(diff/60)+"h atras";
return Math.floor(diff/1440)+"d atras";
}

function filterNews(cat,el){
document.querySelectorAll(".news-cat-btn").forEach(function(b){b.classList.remove("active");});
if(el)el.classList.add("active");
loadNewsArticles(cat);
}

function openNewsArticle(idx){
var article=newsArticles[idx];
if(article&&article.url)window.open(article.url,"_blank");
}

function copyNewsLink(idx){
var article=newsArticles[idx];
if(!article)return;
navigator.clipboard.writeText(article.url).then(function(){
toast("Link copiado!","ok");
});
}

function shareNewsComm(idx){
if(!U){toast("Faça login para compartilhar","err");return;}
var article=newsArticles[idx];
if(!article)return;
if(!commProfile){toast("Entre na comunidade (aba Perfil) para compartilhar no feed","err");return;}
newsShareTarget=article;
var preview=document.getElementById("newsSharePreview");
if(preview){
var imgHTML=article.image?'<img src="'+article.image+'" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px" onerror="this.style.display=\"none\"">':'';
preview.innerHTML=imgHTML+'<div style="font-size:.75em;color:var(--pri);font-weight:600;text-transform:uppercase">'+article.source+'</div><div style="font-weight:700;font-size:.92em;margin-top:4px;line-height:1.4">'+article.title+'</div>';
}
document.getElementById("newsShareModal").style.display="flex";
}

function closeNewsShareModal(){
document.getElementById("newsShareModal").style.display="none";
newsShareTarget=null;
}

function submitNewsShare(){
if(!newsShareTarget||!commProfile)return;
var text=document.getElementById("newsShareText").value.trim();
var cat=document.getElementById("newsShareCat").value;
var shareText="&#128240; **"+newsShareTarget.title+"**\n"+newsShareTarget.source;
if(text)shareText+="\n\n"+text;
shareText+="\n\n&#128279; "+newsShareTarget.url;

db.collection("community").add({
uid:U.uid,
nickname:commProfile.nickname,
color:commProfile.color,
text:shareText,
cat:cat,
likes:[],
comments:[],
createdAt:new Date().toISOString(),
newsShare:{title:newsShareTarget.title,source:newsShareTarget.source,url:newsShareTarget.url,image:newsShareTarget.image||""}
}).then(function(){
toast("Noticia compartilhada na comunidade!","ok");
closeNewsShareModal();
document.getElementById("newsShareText").value="";
}).catch(function(e){
toast("Erro ao compartilhar","err");
console.error(e);
});
}



// ============================================================
// NEWS INTERACTIONS SYSTEM
// ============================================================
var newsReactionsCache={};
var newsBookmarks=JSON.parse(localStorage.getItem("sibanki_news_bookmarks")||"{}");
var newsViewsCache=JSON.parse(localStorage.getItem("sibanki_news_views")||"{}");

function getNewsArticleId(idx){
var a=newsArticles[idx];
if(!a)return"";
return btoa(a.url||"").replace(/[^a-zA-Z0-9]/g,"").substring(0,20);
}

function getNewsReactions(articleId,type){
if(!newsReactionsCache[articleId])loadNewsReactionsFromDB(articleId);
var data=newsReactionsCache[articleId];
if(!data)return 0;
if(type==="likes")return data.likes?data.likes.length:0;
return 0;
}

function getNewsComments(articleId){
if(!newsReactionsCache[articleId])return[];
return newsReactionsCache[articleId].comments||[];
}

function getNewsReactionCounts(articleId){
if(!newsReactionsCache[articleId])return{};
return newsReactionsCache[articleId].reactionCounts||{};
}

function getNewsUserReaction(articleId){
if(!U||!newsReactionsCache[articleId])return"";
var reactions=newsReactionsCache[articleId].reactions||{};
return reactions[U.uid]||"";
}

function newsUserReacted(articleId){
if(!U||!newsReactionsCache[articleId])return false;
var likes=newsReactionsCache[articleId].likes||[];
return likes.indexOf(U.uid)>=0;
}

function newsIsBookmarked(articleId){
return!!newsBookmarks[articleId];
}

function getNewsViews(articleId){
return newsViewsCache[articleId]||0;
}

function trackNewsView(articleId){
if(!newsViewsCache[articleId])newsViewsCache[articleId]=0;
newsViewsCache[articleId]++;
localStorage.setItem("sibanki_news_views",JSON.stringify(newsViewsCache));
// Also update Firestore
if(U){
db.collection("newsInteractions").doc(articleId).set({views:firebase.firestore.FieldValue.increment(1)},{merge:true}).catch(function(){});
}
}

function loadNewsReactionsFromDB(articleId){
if(!articleId)return;
newsReactionsCache[articleId]=newsReactionsCache[articleId]||{likes:[],comments:[],reactions:{},reactionCounts:{}};
db.collection("newsInteractions").doc(articleId).get().then(function(doc){
if(doc.exists){
newsReactionsCache[articleId]=doc.data();
newsReactionsCache[articleId].comments=newsReactionsCache[articleId].comments||[];
newsReactionsCache[articleId].likes=newsReactionsCache[articleId].likes||[];
newsReactionsCache[articleId].reactions=newsReactionsCache[articleId].reactions||{};
}
}).catch(function(){});
}

function toggleNewsLike(articleId,idx){
if(!U){toast("Faça login para curtir","err");return;}
var ref=db.collection("newsInteractions").doc(articleId);
var isLiked=newsUserReacted(articleId);
if(isLiked){
ref.update({likes:firebase.firestore.FieldValue.arrayRemove(U.uid)}).then(function(){
if(newsReactionsCache[articleId]){
var l=newsReactionsCache[articleId].likes||[];
var i=l.indexOf(U.uid);
if(i>=0)l.splice(i,1);
}
renderNewsArticles();
toast("Curtida removida","ok");
}).catch(function(e){console.error(e);});
}else{
ref.set({likes:firebase.firestore.FieldValue.arrayUnion(U.uid)},{merge:true}).then(function(){
if(!newsReactionsCache[articleId])newsReactionsCache[articleId]={likes:[],comments:[],reactions:{}};
newsReactionsCache[articleId].likes.push(U.uid);
renderNewsArticles();
toast("Voce curtiu esta noticia!","ok");
if(commProfile&&typeof addCommXP==="function")addCommXP(2,"curtiu noticia");
}).catch(function(e){console.error(e);});
}
}

function reactToNews(articleId,emoji,idx){
if(!U){toast("Faça login para reagir","err");return;}
if(idx!==undefined)hideNewsReactions(idx);
var ref=db.collection("newsInteractions").doc(articleId);
var updates={};
updates["reactions."+U.uid]=emoji;
updates["likes"]=firebase.firestore.FieldValue.arrayUnion(U.uid);
ref.set(updates,{merge:true}).then(function(){
if(!newsReactionsCache[articleId])newsReactionsCache[articleId]={likes:[],comments:[],reactions:{}};
newsReactionsCache[articleId].reactions[U.uid]=emoji;
if(newsReactionsCache[articleId].likes.indexOf(U.uid)<0)newsReactionsCache[articleId].likes.push(U.uid);
renderNewsArticles();
toast("Reagiu com "+emoji,"ok");
}).catch(function(e){console.error(e);});
}

function getNewsArticleIdByIdx(idx){
if(idx===undefined||idx===null||idx<0||!Array.isArray(newsArticles)||idx>=newsArticles.length)return "";
var a=newsArticles[idx];
return a&&a.url?btoa(a.url).replace(/[^a-zA-Z0-9]/g,"").substring(0,20):"";
}

function showNewsReactions(idx){
var el=document.getElementById("newsReact-"+idx);
if(el)el.classList.add("show");
}

function hideNewsReactions(idx){
var el=document.getElementById("newsReact-"+idx);
if(el)el.classList.remove("show");
}

function toggleNewsCommentsFromBtn(btn){
var card=btn.closest("[id^=\"news-card-\"]");
if(!card){var idx=btn.getAttribute("data-news-idx");if(idx!==null&&idx!==""){idx=parseInt(idx,10);if(!isNaN(idx)&&idx>=0)toggleNewsComments(idx);}return;}
var idxStr=card.getAttribute("data-article-idx");
if(idxStr===null||idxStr==="")return;
var idx=parseInt(idxStr,10);
if(isNaN(idx)||idx<0)return;
toggleNewsComments(idx);
}
function toggleNewsComments(idx){
if(!U){toast("Faça login para comentar","err");return;}
if(idx===undefined||idx<0)return;
document.querySelectorAll(".news-comments-section.open").forEach(function(s){s.classList.remove("open");});
var articleId=getNewsArticleIdByIdx(idx);
if(!articleId){console.warn('toggleNewsComments: articleId vazio para idx',idx);return;}
var card=document.querySelector(".news-card[data-article-idx=\""+idx+"\"]");
if(!card)return;
var section=card.querySelector(".news-comments-section");
if(!section)return;
section.classList.add("open");
loadNewsCommentsFromDB(articleId,idx);
var input=section.querySelector(".news-comment-form input");
if(input)setTimeout(function(){input.focus();},200);
}

function loadNewsCommentsFromDB(articleId,idx){
if(idx===undefined||idx<0)return;
db.collection("newsInteractions").doc(articleId).get().then(function(doc){
if(doc.exists){
var data=doc.data();
newsReactionsCache[articleId]=data;
var comments=data.comments||[];
var card=document.querySelector(".news-card[data-article-idx=\""+idx+"\"]");
var listEl=card?card.querySelector(".news-comment-list"):null;
if(!listEl)return;
if(!comments.length){
listEl.innerHTML='<div style="text-align:center;padding:16px;color:var(--t3);font-size:.82em">Nenhum comentario ainda. Seja o primeiro!</div>';
return;
}
var html="";
comments.forEach(function(c){
html+='<div class="news-comment-item"><div class="news-comment-av" style="background:'+(c.color||"var(--pri)")+'">'+((c.nickname||"?").charAt(0).toUpperCase())+'</div><div class="news-comment-body"><div class="news-comment-nick">'+(c.nickname||"Anonimo")+' <span class="time">'+formatNewsTime(c.time)+'</span></div><div class="news-comment-text">'+(c.text||"")+'</div></div></div>';
});
listEl.innerHTML=html;
}
}).catch(function(e){console.error("Load comments error:",e);});
}

function submitNewsCommentFromBtn(btn){
var card=btn.closest("[id^=\"news-card-\"]");
if(card){var idxStr=card.getAttribute("data-article-idx");if(idxStr!=null){var idx=parseInt(idxStr,10);if(!isNaN(idx)&&idx>=0)submitNewsComment(idx);return;}}
var idx=btn.getAttribute("data-news-idx");if(idx!=null){idx=parseInt(idx,10);if(!isNaN(idx))submitNewsComment(idx);}
}
function submitNewsCommentFromInput(inputEl){
var card=inputEl.closest("[id^=\"news-card-\"]");
if(card){var idxStr=card.getAttribute("data-article-idx");if(idxStr!=null){var idx=parseInt(idxStr,10);if(!isNaN(idx)&&idx>=0)submitNewsComment(idx);return;}}
var idx=inputEl.getAttribute("data-news-idx");if(idx!=null){idx=parseInt(idx,10);if(!isNaN(idx))submitNewsComment(idx);}
}
function submitNewsComment(idx){
if(!U){toast("Faça login para comentar","err");return;}
if(idx===undefined||idx<0)return;
var articleId=getNewsArticleIdByIdx(idx);
if(!articleId){console.warn('submitNewsComment: articleId vazio para idx',idx);return;}
var card=document.querySelector(".news-card[data-article-idx=\""+idx+"\"]");
var input=card?card.querySelector(".news-comment-form input"):null;
if(!input)return;
var text=input.value.trim();
if(!text){toast("Escreva um comentario","err");return;}
if(text.length>300){toast("Maximo 300 caracteres","err");return;}

var nickname=(commProfile&&commProfile.nickname)||(U.name)||(U.email&&U.email.split("@")[0])||"Anônimo";
var color=(commProfile&&commProfile.color)||"#4F8CFF";
var comment={
uid:U.uid,
nickname:nickname,
color:color,
text:text,
time:new Date().toISOString()
};

var ref=db.collection("newsInteractions").doc(articleId);
ref.set({comments:firebase.firestore.FieldValue.arrayUnion(comment)},{merge:true}).then(function(){
input.value="";
if(!newsReactionsCache[articleId])newsReactionsCache[articleId]={likes:[],comments:[],reactions:{}};
newsReactionsCache[articleId].comments.push(comment);
loadNewsCommentsFromDB(articleId,idx);
renderNewsArticles();
toast("Comentario enviado!","ok");
if(commProfile&&typeof addCommXP==="function")addCommXP(3,"comentou noticia");
}).catch(function(e){
toast("Erro ao comentar","err");
console.error(e);
});
}

function toggleNewsBookmark(articleId,idx){
if(newsBookmarks[articleId]){
delete newsBookmarks[articleId];
toast("Removido dos salvos","ok");
}else{
var article=newsArticles[idx];
newsBookmarks[articleId]={
title:article?article.title:"",
url:article?article.url:"",
source:article?article.source:"",
savedAt:new Date().toISOString()
};
toast("Noticia salva! &#128278;","ok");
}
localStorage.setItem("sibanki_news_bookmarks",JSON.stringify(newsBookmarks));
renderNewsArticles();
}

function openNewsArticle(idx){
var article=newsArticles[idx];
if(!article)return;
var articleId=btoa(article.url||"").replace(/[^a-zA-Z0-9]/g,"").substring(0,20);
trackNewsView(articleId);
window.open(article.url,"_blank");
}

// Pre-load reactions for visible articles
function preloadNewsReactions(){
if(!newsArticles.length)return;
newsArticles.slice(0,10).forEach(function(article){
var articleId=btoa(article.url||"").replace(/[^a-zA-Z0-9]/g,"").substring(0,20);
loadNewsReactionsFromDB(articleId);
});
// Re-render after 1.5s when data arrives
setTimeout(function(){renderNewsArticles();},1500);
}

function loadCommRanking(){
var pe=document.getElementById("commRankPeriod");
if(pe)pe.textContent=new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
var ct=document.getElementById("commRankingList");
var podium=document.getElementById("commPodium");
if(!ct)return;
ct.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><p>Carregando ranking...</p></div>';
var now=new Date();var month=now.getMonth()+1;var year=now.getFullYear();
db.collection("community_ranking").doc(year+"-"+String(month).padStart(2,"0")).get().then(function(doc){
var rankings=doc.exists?doc.data().users||[]:[];
if(!rankings.length)rankings=buildLocalRanking();
commRankData=rankings;
commRankCurrentTab="geral";
renderRankingView(rankings,podium,ct);
updateCommStats();
}).catch(function(e){
console.error("Ranking error:",e);
var rankings=buildLocalRanking();
commRankData=rankings;
renderRankingView(rankings,podium,ct);
updateCommStats();
});
}

var commRankData=[];
var commRankCurrentTab="geral";

function buildLocalRanking(){
var stats={};
(commPosts||[]).forEach(function(p){
var n=p.nickname||"Anonimo";
if(!stats[n])stats[n]={nickname:n,color:p.color||"var(--pri)",posts:0,likes:0,comments:0,pts:0};
stats[n].posts++;
stats[n].likes+=(p.likes?p.likes.length:0);
if(p.comments){p.comments.forEach(function(c){
var cn=c.nickname||"Anonimo";
if(!stats[cn])stats[cn]={nickname:cn,color:c.color||"var(--pri)",posts:0,likes:0,comments:0,pts:0};
stats[cn].comments++;
});}
});
return Object.values(stats).map(function(s){
s.pts=s.posts*3+s.likes*2+s.comments;
return s;
}).sort(function(a,b){return b.pts-a.pts;});
}

function switchRankTab(tab,el){
document.querySelectorAll(".comm-rank-tab").forEach(function(t){t.classList.remove("active");});
if(el)el.classList.add("active");
commRankCurrentTab=tab;
var rankings=commRankData.slice();
if(tab==="posts")rankings.sort(function(a,b){return b.posts-a.posts;});
else if(tab==="likes")rankings.sort(function(a,b){return b.likes-a.likes;});
else if(tab==="streak")rankings.sort(function(a,b){return(b.streak||0)-(a.streak||0);});
else rankings.sort(function(a,b){return b.pts-a.pts;});
var podium=document.getElementById("commPodium");
var ct=document.getElementById("commRankingList");
renderRankingView(rankings,podium,ct);
}

function renderRankingView(rankings,podium,ct){
if(!rankings.length){
if(podium)podium.innerHTML="";
ct.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:3em;margin-bottom:12px"><i data-lucide="trophy" style="width:48px;height:48px;stroke:currentColor;stroke-width:2"></i></div><p>Nenhuma atividade ainda. Publique na comunidade!</p></div>';
return;
}
var sortKey=commRankCurrentTab==="posts"?"posts":commRankCurrentTab==="likes"?"likes":commRankCurrentTab==="streak"?"streak":"pts";
var sortLabel=commRankCurrentTab==="posts"?"posts":commRankCurrentTab==="likes"?"curtidas":commRankCurrentTab==="streak"?"dias":"pts";
if(podium&&rankings.length>=3){
var medals=['<i data-lucide="trophy" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#FFD700"></i>','<i data-lucide="medal" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#C0C0C0"></i>','<i data-lucide="award" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;color:#CD7F32"></i>'];
var heights=["180px","140px","110px"];
var classes=["gold","silver","bronze"];
var order=[1,0,2];
var ph="";
order.forEach(function(oi){
var r=rankings[oi];
var val=r[sortKey]||0;
ph+='<div class="comm-podium-item">';
ph+='<div class="comm-podium-bar '+classes[oi]+'" style="height:'+heights[oi]+'">';
ph+='<div class="comm-podium-av" style="background:'+(r.color||"var(--pri)")+'">'+r.nickname.substring(0,2).toUpperCase()+'<span class="medal">'+medals[oi]+'</span></div>';
ph+='<div class="comm-podium-name">'+escH(r.nickname)+'</div>';
ph+='<div class="comm-podium-pts">'+val+' '+sortLabel+'</div>';
ph+='</div></div>';
});
podium.innerHTML=ph;
}else if(podium){podium.innerHTML="";}
var myPos=-1;
if(commProfile){for(var i=0;i<rankings.length;i++){if(rankings[i].nickname===commProfile.nickname){myPos=i;break;}}}
var myPosDiv=document.getElementById("commRankMyPos");
if(myPosDiv&&myPos>=0){
myPosDiv.style.display="flex";
document.getElementById("commRankMyPosNum").textContent="#"+(myPos+1);
document.getElementById("commRankMyPosName").textContent=commProfile.nickname;
document.getElementById("commRankMyPosMeta").textContent=rankings[myPos].posts+" posts, "+rankings[myPos].likes+" curtidas";
document.getElementById("commRankMyPosPts").textContent=rankings[myPos][sortKey]||0;
}else if(myPosDiv){myPosDiv.style.display="none";}
var h="";
var startIdx=rankings.length>=3?3:0;
for(var i=startIdx;i<rankings.length;i++){
var r=rankings[i];
var val=r[sortKey]||0;
var isMe=commProfile&&r.nickname===commProfile.nickname;
h+='<div class="comm-rank-row"'+(isMe?' style="border-color:var(--pri);background:rgba(79,140,255,.03)"':'')+'>';
h+='<div class="comm-rank-pos">'+(i+1)+'</div>';
h+='<div class="comm-rank-av" style="background:'+(r.color||"var(--pri)")+'">'+r.nickname.substring(0,2).toUpperCase()+'</div>';
h+='<div class="comm-rank-info"><div class="comm-rank-name">'+escH(r.nickname);
var lvl=getCommAuthorLevel(r.nickname);
if(lvl>=5)h+=' <span class="comm-badge-inline badge-lvl">Lv.'+lvl+'</span>';
if(isMe)h+=' <span style="font-size:.65em;color:var(--pri);font-weight:600">(voce)</span>';
h+='</div>';
h+='<div class="comm-rank-meta">'+r.posts+' posts, '+r.likes+' curtidas, '+r.comments+' comentarios</div></div>';
h+='<div class="comm-rank-pts"><div class="num">'+val+'</div><div class="lbl">'+sortLabel+'</div></div>';
h+='</div>';
}
if(!h&&startIdx>0)h='<div style="text-align:center;padding:20px;color:var(--t3);font-size:.88em">Participe para entrar no ranking!</div>';
ct.innerHTML=h;
}


function showInvSub(id){
var subs=["invOverview","invCarteira","invAnalise","invProventos","invSimuladores","invPerfil"];
subs.forEach(function(s){var el=document.getElementById(s);if(el){el.classList.remove("active");el.style.setProperty("display","none","important");}});
var target=document.getElementById(id);if(target){target.classList.add("active");target.style.setProperty("display","block","important");}
var tabs=["invTabCarteira","invTabAnalise","invTabProventos","invTabSimuladores","invTabPerfil"];
tabs.forEach(function(t){var el=document.getElementById(t);if(el)el.classList.remove("active");});
var activeTab=document.getElementById("invTab"+id.replace("inv",""));if(activeTab)activeTab.classList.add("active");
if(id==="invPerfil"&&typeof initProfileQuiz==="function")initProfileQuiz();
}

function generateTelegramCode(){
if(!U||!U.uid)return;
var chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var code="SBK-";
for(var i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];
var codeData={code:code,uid:U.uid,email:U.email||"",name:U.name||"",createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10*60*1000).toISOString()};
db.collection("telegramCodes").doc(code).set(codeData).then(function(){
document.getElementById("tgCodeDisplay").style.display="block";
document.getElementById("tgCode").textContent=code;
toast("Codigo gerado! Envie no Telegram em ate 10 min","ok");
}).catch(function(e){
console.error("TG code error:",e);
toast("Erro ao gerar codigo: "+e.message,"err");
});
}

function copyTgCode(){
var code=document.getElementById("tgCode").textContent;
if(navigator.clipboard){navigator.clipboard.writeText("/start "+code);toast("Copiado! Cole no Telegram","ok");}
else{var ta=document.createElement("textarea");ta.value="/start "+code;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast("Copiado!","ok");}
}

function checkTelegramLink(){
if(!U||!U.uid)return;
db.collection("users").doc(U.uid).get().then(function(doc){
if(doc.exists&&doc.data().telegramChatId){
document.getElementById("tgNotLinked").style.display="none";
document.getElementById("tgLinked").style.display="block";
var nick=doc.data().telegramUsername||"Conectado";
document.getElementById("tgLinkedNick").textContent="@"+nick;
}
});
}

function unlinkTelegram(){
if(!confirm("Desvincular o Telegram?"))return;
db.collection("users").doc(U.uid).update({telegramChatId:null,telegramUsername:null}).then(function(){
document.getElementById("tgNotLinked").style.display="block";
document.getElementById("tgLinked").style.display="none";
toast("Telegram desvinculado","ok");
});
}

function generateWhatsAppCode(){
if(!U||!U.uid)return;
var fn=firebase.functions().httpsCallable("generateWhatsAppCode");
fn().then(function(r){
var code=(r.data&&r.data.code)?""+r.data.code:"";
var disp=document.getElementById("waCodeDisplay"),el=document.getElementById("waCode");
if(disp&&el){disp.style.display="block";el.textContent=code;toast("Código gerado! Envie no WhatsApp em até 10 min","ok");}
}).catch(function(e){console.error("WA code error:",e);toast("Erro ao gerar código: "+(e.message||"tente de novo"),"err");});
}
function copyWaCode(){
var code=document.getElementById("waCode")?document.getElementById("waCode").textContent:"";
if(!code)return;
if(navigator.clipboard){navigator.clipboard.writeText(code);toast("Código copiado! Cole no WhatsApp","ok");}
else{var ta=document.createElement("textarea");ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast("Copiado!","ok");}
}
function checkWhatsAppLink(){
if(!U||!U.uid)return;
db.collection("users").doc(U.uid).get().then(function(doc){
var waNot=document.getElementById("waNotLinked"),waLinked=document.getElementById("waLinked"),waPhone=document.getElementById("waLinkedPhone");
if(!waNot||!waLinked)return;
if(doc.exists&&doc.data().whatsappPhone){
waNot.style.display="none";
waLinked.style.display="block";
if(waPhone)waPhone.textContent="+"+doc.data().whatsappPhone;
}else{waNot.style.display="block";waLinked.style.display="none";}
});
}
function unlinkWhatsApp(){
if(!confirm("Desvincular o WhatsApp?"))return;
db.collection("users").doc(U.uid).update({whatsappPhone:null,updated:new Date().toISOString()}).then(function(){
document.getElementById("waNotLinked").style.display="block";
document.getElementById("waLinked").style.display="none";
toast("WhatsApp desvinculado","ok");
});
}

// Init auto-preenchimento ticker
try{if(typeof setupTickerAutofill==='function')setupTickerAutofill();}catch(e){console.warn('Setup ticker:',e)}


document.addEventListener("click",function(e){
if(commNotifOpen&&!e.target.closest("#commNotifBtn")&&!e.target.closest("#commNotifDropdown")){
commNotifOpen=false;var dd=document.getElementById("commNotifDropdown");if(dd)dd.style.display="none";}
});

/* ── next block ── */

(function(){
  if(typeof lucide==='undefined')return;
  window.refreshLucide=function(){ lucide.createIcons(); };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshLucide);
  else refreshLucide();
})();

/* ── next block ── */

document.addEventListener('DOMContentLoaded',function(){
  if(typeof applyI18n==='function')applyI18n();
  var sel=document.getElementById('langSelect');if(sel&&typeof currentLang!=='undefined')sel.value=currentLang;
  if(typeof t==='function')document.title=t('app_titulo');
  if(typeof updateLangBtnFlag==='function')updateLangBtnFlag();
});

/* ═══════════════════════════════════════════════════════════
   SISTEMA 1: FLASH BANNERS CONTEXTUAIS (substitui alertBar)
   - Temporários, coloridos, clicáveis, auto-dismiss
   ═══════════════════════════════════════════════════════════ */

function showFlash(msg, type, hint, tabDestino, durMs) {
  var bar = document.getElementById('sibFlashBar');
  if (!bar) return;
  var dur = durMs || 7000;
  var item = document.createElement('div');
  item.className = 'sib-flash ' + (type || 'warn');
  var icons = { ok: '✅', warn: '⚠️', bad: '🚨' };
  var icon = icons[type] || '💡';
  item.innerHTML =
    '<div class="sib-flash-icon">' + icon + '</div>' +
    '<div class="sib-flash-body">' +
      '<div class="sib-flash-msg">' + msg + '</div>' +
      (hint ? '<div class="sib-flash-hint">' + hint + '</div>' : '') +
    '</div>' +
    (tabDestino ? '<div class="sib-flash-arrow">Ver →</div>' : '') +
    '<button class="sib-flash-close" onclick="event.stopPropagation();this.parentElement.remove()">✕</button>' +
    '<div class="sib-flash-progress" style="animation-duration:' + dur + 'ms"></div>';

  if (tabDestino) {
    item.onclick = function(e) {
      if (e.target.classList.contains('sib-flash-close')) return;
      item.classList.add('out');
      setTimeout(function() { item.remove(); }, 300);
      if (typeof go === 'function') go(tabDestino, null);
    };
  }

  bar.appendChild(item);

  setTimeout(function() {
    if (!item.parentElement) return;
    item.classList.add('out');
    setTimeout(function() { if (item.parentElement) item.remove(); }, 300);
  }, dur);
}

function renderAlertBar() {
  /* Apenas flash visual para itens urgentes (cartão fechando em ≤3 dias, metas quase lá).
     Alertas de orçamento e saldo já vão para o sino via bldN() com snooze automático. */
  var bar = document.getElementById('sibFlashBar');
  if (bar) bar.innerHTML = '';

  var flashes = [];

  // Cartões próximos → flash visual (ação imediata)
  if (typeof cards !== 'undefined' && cards.length) {
    cards.forEach(function(c) {
      var dias = typeof getDiasParaFecha === 'function' ? getDiasParaFecha(c) : 99;
      var bm = typeof getBillingMonth === 'function' ? getBillingMonth(c, new Date().toISOString().split('T')[0]) : '';
      var fat = (c.purchases || []).filter(function(p) { return p.billingMonth === bm; }).reduce(function(s, p) { return s + p.value; }, 0);
      if (dias <= 3) {
        flashes.push({ type: 'bad', msg: c.name + ': fatura fecha em ' + dias + ' dia' + (dias > 1 ? 's' : ''), hint: 'Total: R$ ' + fat.toFixed(2).replace('.', ','), tab: 'cartões', delay: 0 });
      }
    });
  }

  // Metas quase concluídas → flash positivo
  if (typeof goals !== 'undefined' && goals.length) {
    goals.forEach(function(g) {
      if (!g || !g.alvo) return;
      var pct = g.atual / g.alvo;
      if (pct >= 0.95 && pct < 1) {
        flashes.push({ type: 'ok', msg: 'Meta "' + (g.nome || g.name || 'Meta') + '" está a ' + Math.round((1 - pct) * 100) + '% de ser concluída!', hint: 'Continue assim!', tab: 'metas', delay: 1200 });
      }
    });
  }

  // Lançar com delay escalonado
  flashes.forEach(function(f) {
    setTimeout(function() {
      showFlash(f.msg, f.type, f.hint, f.tab, 8000);
    }, f.delay);
  });
}

/* ═══════════════════════════════════════════════════════════
   SISTEMA 5: IA INSIGHTS DE PRODUTO
   - Detecta momento financeiro ideal e sugere produto relevante
   - Card discreto no dashboard, 1x por semana, fácil de fechar
   ═══════════════════════════════════════════════════════════ */

function checkProdutoInsight() {
  if (typeof entries === 'undefined' || !U) return;

  // 1 por semana por produto — anti-spam
  var lastShown = {};
  try { lastShown = JSON.parse(localStorage.getItem('sib_prod_insight') || '{}'); } catch(z) {}
  var agora = Date.now();
  var SEMANA = 7 * 24 * 3600 * 1000;

  var now = new Date();
  var cm = now.getMonth(); var cy = now.getFullYear();
  var mesK = cy + '-' + String(cm + 1).padStart(2, '0');
  var mesE = entries.filter(function(e) {
    return e.date && e.date.startsWith(mesK) && !e.isTransfer && e.category !== 'Transferencia';
  });
  var rec = mesE.filter(function(e){return e.type==='receita';}).reduce(function(s,e){return s+e.value;},0);
  var desp = mesE.filter(function(e){return e.type==='despesa';}).reduce(function(s,e){return s+e.value;},0);
  var saldo = rec - desp;
  var patrimonio = (userAccs||[]).reduce(function(s,a){return s+(typeof getAccBal==='function'?getAccBal(a).atual:0);},0);
  var totalInvest = (investments||[]).reduce(function(s,i){return s+(i.currentValue||i.amount||0);},0);
  var pctGasto = rec > 0 ? Math.round(desp / rec * 100) : 0;

  // Cenários de produto
  var produto = null;

  // Cenário A: Saldo positivo + pouco investido → Tesouro Selic
  if (!produto && saldo > 500 && totalInvest < rec * 0.1 && !(lastShown.tesouro && agora - lastShown.tesouro < SEMANA)) {
    produto = {
      id: 'tesouro',
      titulo: '💡 Oportunidade: Tesouro Selic',
      corpo: 'Você fechou o mês com R$ ' + saldo.toLocaleString('pt-BR',{minimumFractionDigits:2}) + ' de saldo positivo e tem pouco investido. O Tesouro Selic rende mais que a poupança com liquidez diária.',
      cta: 'Ver como investir',
      url: 'https://www.tesourodireto.com.br',
      cor: '#22C55E'
    };
  }

  // Cenário B: Muitas despesas de cartão → oferta CDB liquidez diária
  var gastosCartao = mesE.filter(function(e){return e.type==='despesa'&&e.paymentMethod==='cartao';}).reduce(function(s,e){return s+e.value;},0);
  if (!produto && gastosCartao > 2000 && !(lastShown.cdb && agora - lastShown.cdb < SEMANA)) {
    produto = {
      id: 'cdb',
      titulo: '💡 Dica: CDB com liquidez diária',
      corpo: 'Seus gastos no cartão este mês foram de R$ ' + gastosCartao.toLocaleString('pt-BR',{minimumFractionDigits:2}) + '. Manter uma reserva em CDB rende mais que conta corrente e fica acessível a qualquer hora.',
      cta: 'Entender CDB',
      url: '#',
      cor: '#3B82F6'
    };
  }

  // Cenário C: Patrimônio alto sem diversificação → Fundos Imobiliários
  if (!produto && totalInvest > 30000 && !(lastShown.fii && agora - lastShown.fii < SEMANA)) {
    produto = {
      id: 'fii',
      titulo: '💡 Diversificação: FIIs',
      corpo: 'Seu patrimônio está em R$ ' + totalInvest.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) + '. Considerar Fundos Imobiliários pode gerar renda passiva mensal via dividendos.',
      cta: 'Conhecer FIIs',
      url: '#',
      cor: '#8B5CF6'
    };
  }

  // Cenário D: Gasto alto sem orçamento → Seguro de vida
  if (!produto && pctGasto > 90 && patrimonio < 5000 && !(lastShown.seguro && agora - lastShown.seguro < SEMANA)) {
    produto = {
      id: 'seguro',
      titulo: '🛡️ Proteção: Seguro de vida acessível',
      corpo: 'Com ' + pctGasto + '% da receita comprometida, um seguro de vida pode proteger sua família por menos de R$ 50/mês em caso de imprevistos.',
      cta: 'Ver opções',
      url: '#',
      cor: '#F59E0B'
    };
  }

  if (!produto) return;

  // Renderiza card no dashboard
  var el = document.getElementById('dashProdutoInsightCard');
  if (!el) return;

  lastShown[produto.id] = agora;
  try { localStorage.setItem('sib_prod_insight', JSON.stringify(lastShown)); } catch(z) {}

  el.innerHTML =
    '<div style="border-left:3px solid ' + produto.cor + ';padding:12px 14px;background:rgba(0,0,0,.15);border-radius:0 10px 10px 0">' +
    '<div style="font-size:.88rem;font-weight:600;color:var(--t1);margin-bottom:4px">' + produto.titulo + '</div>' +
    '<div style="font-size:.82rem;color:var(--t2);line-height:1.5;margin-bottom:10px">' + produto.corpo + '</div>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
    '<a href="' + produto.url + '" target="_blank" rel="noopener" style="padding:6px 14px;background:' + produto.cor + ';color:#fff;border-radius:50px;font-size:.75rem;font-weight:700;text-decoration:none">' + produto.cta + '</a>' +
    '<button onclick="document.getElementById(\'dashProdutoInsightCard\').style.display=\'none\'" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:.78rem">Não tenho interesse</button>' +
    '</div></div>';
  el.style.display = 'block';
}

/* ═════════════════════════════════════════════════════════��═
   SISTEMA 2: BRIEFING MODAL DE LOGIN
   - Aparece 1x por sessão após login
   - Resumo financeiro inteligente e objetivo
   ═══════════════════════════════════════════════════════════ */

function showBriefingModal() {
  // ── 1x por dia para todos os planos ──
  try {
    var hoje = new Date().toISOString().split('T')[0]; // "2026-03-10"
    var chave = 'sib_briefing_' + hoje;
    if (localStorage.getItem(chave)) return;
    // Limpa chaves de dias anteriores (máx 7 dias guardados)
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('sib_briefing_') && k !== chave) localStorage.removeItem(k);
    });
  } catch(z) {}

  var modal = document.getElementById('sibBriefingModal');
  if (!modal || !U) return;

  var now = new Date();
  var mesK = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var h = now.getHours();
  var saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var nome = (U.name || 'você').split(' ')[0];

  var entradasMes = entries.filter(function(e) {
    return e.date && e.date.startsWith(mesK) && !e.isTransfer && e.category !== 'Transferencia' && e.status !== 'pendente' && e.status !== 'agendado';
  });
  var rec = entradasMes.filter(function(e) { return e.type === 'receita'; }).reduce(function(s, e) { return s + e.value; }, 0);
  var desp = entradasMes.filter(function(e) { return e.type === 'despesa'; }).reduce(function(s, e) { return s + e.value; }, 0);
  var saldo = rec - desp;
  var patrimonio = (typeof userAccs !== 'undefined' ? userAccs : []).reduce(function(s, a) {
    return s + (typeof getAccBal === 'function' ? getAccBal(a).atual : 0);
  }, 0);
  var pctGasto = rec > 0 ? Math.round(desp / rec * 100) : 0;

  // Título e data
  var diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  document.getElementById('sibBriefTitle').textContent = saudacao + ', ' + nome + '!';
  document.getElementById('sibBriefData').textContent = diasSemana[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()];

  // KPIs
  var saldoClass = saldo >= 0 ? 'ok' : 'bad';
  var pctClass = pctGasto <= 60 ? 'ok' : pctGasto <= 85 ? 'warn' : 'bad';
  var patClass = patrimonio > 0 ? 'ok' : 'warn';
  document.getElementById('sibBriefKpis').innerHTML =
    '<div class="sib-bf-kpi"><div class="sib-bf-kpi-label">Saldo do mês</div><div class="sib-bf-kpi-val ' + saldoClass + '">' + (saldo < 0 ? '-' : '') + 'R$ ' + Math.abs(saldo).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</div></div>' +
    '<div class="sib-bf-kpi"><div class="sib-bf-kpi-label">Gasto</div><div class="sib-bf-kpi-val ' + pctClass + '">' + pctGasto + '%</div></div>' +
    '<div class="sib-bf-kpi"><div class="sib-bf-kpi-label">Patrimônio</div><div class="sib-bf-kpi-val ' + patClass + '">R$ ' + patrimonio.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</div></div>';

  // Itens de insight
  var items = [];
  if (saldo < 0) {
    items.push({ type: 'bad', msg: 'Despesas superam receitas em R$ ' + Math.abs(saldo).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}), tab: 'lanc' });
  } else if (pctGasto > 85) {
    items.push({ type: 'warn', msg: 'Você já usou ' + pctGasto + '% da receita do mês', tab: 'orçamento' });
  } else {
    items.push({ type: 'ok', msg: 'Finanças equilibradas — ' + pctGasto + '% da receita usada', tab: 'dash' });
  }
  if (goals && goals.length) {
    var metaProxima = goals.find(function(g) { return g.alvo && g.atual / g.alvo >= 0.9 && g.atual / g.alvo < 1; });
    if (metaProxima) {
      items.push({ type: 'ok', msg: 'Meta "' + (metaProxima.nome || 'Meta') + '" quase concluída!', tab: 'metas' });
    }
  }
  if (typeof budgets === 'object' && Object.keys(budgets).length) {
    var catEstourada = null;
    Object.keys(budgets).forEach(function(cat) {
      if (catEstourada) return;
      var lim = budgets[cat];
      if (!lim) return;
      var gasto = entradasMes.filter(function(e) { return e.type === 'despesa' && e.category === cat; }).reduce(function(s, e) { return s + e.value; }, 0);
      if (gasto >= lim) catEstourada = cat;
    });
    if (catEstourada) items.push({ type: 'bad', msg: 'Orçamento de ' + catEstourada + ' estourado', tab: 'orçamento' });
  }
  if (!items.length) {
    items.push({ type: 'ok', msg: 'Tudo certo por aqui. Bom controle!', tab: 'dash' });
  }

  // Render itens
  document.getElementById('sibBriefItems').innerHTML = items.map(function(it) {
    return '<div class="sib-bf-item ' + it.type + '" onclick="closeBriefing();go(\'' + it.tab + '\',null)">' +
      '<div class="sib-bf-item-dot"></div>' +
      '<div class="sib-bf-item-text">' + it.msg + '</div>' +
      '<div class="sib-bf-item-arrow">→</div>' +
    '</div>';
  }).join('');

  // Botão "Ver detalhes" — vai para o item mais crítico
  var mainTab = items[0] ? items[0].tab : 'dash';
  var saiba = document.getElementById('sibBriefSaiba');
  if (saiba) saiba.onclick = function() { closeBriefing(); go(mainTab, null); };

  modal.style.display = 'flex';
  try {
    var hoje = new Date().toISOString().split('T')[0];
    localStorage.setItem('sib_briefing_' + hoje, '1');
  } catch(z) {}
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── Insight IA: chama briefingIa Cloud Function ──
  (function() {
    var iaWrap = document.getElementById('sibBriefIaWrap');
    var iaText = document.getElementById('sibBriefIaText');
    if (!iaWrap || !iaText) return;
    iaWrap.style.display = 'block';
    // Coleta meta próxima e cat estourada
    var metaNome = null;
    if (goals && goals.length) {
      var gm = goals.find(function(g){return g.alvo&&g.atual/g.alvo>=0.9&&g.atual/g.alvo<1;});
      if (gm) metaNome = gm.nome || null;
    }
    var catEst = null;
    if (typeof budgets==='object') {
      Object.keys(budgets).forEach(function(cat){
        if(catEst)return;var lim=budgets[cat];if(!lim)return;
        var g=entradasMes.filter(function(e){return e.type==='despesa'&&e.category===cat;}).reduce(function(s,e){return s+e.value;},0);
        if(g>=lim)catEst=cat;
      });
    }
    if (typeof firebase !== 'undefined' && firebase.functions) {
      var fn = firebase.functions().httpsCallable('briefingIa');
      fn({ rec: rec, desp: desp, saldo: saldo, pctGasto: pctGasto, patrimonio: patrimonio,
           metaNome: metaNome, catEstourada: catEst, qtdEntradas: entradasMes.length })
        .then(function(res) {
          if (res && res.data && res.data.insight) {
            iaText.textContent = res.data.insight;
          }
        })
        .catch(function() {
          iaWrap.style.display = 'none';
        });
    } else {
      iaWrap.style.display = 'none';
    }
  })();
}

function closeBriefing() {
  var modal = document.getElementById('sibBriefingModal');
  if (!modal) return;
  modal.style.animation = 'none';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity .2s';
  setTimeout(function() { modal.style.display = 'none'; modal.style.opacity = ''; modal.style.transition = ''; }, 200);
}


/* ════════════════════════════════════════════════════════════════
   SIBANKI — SISTEMA DE FEATURE FLAGS
   Controla o que está ativo, para qual plano, e permite ligar/
   desligar funcionalidades remotamente via Firestore.
   ════════════════════════════════════════════════════════════════

   COMO USAR:
     hasFeature('briefing_ia')         → true/false (verifica flag + plano)
     requireFeature('briefing_ia', fn) → executa fn() se tiver acesso,
                                         mostra upsell se não tiver

   COMO ADICIONAR UMA NOVA FEATURE:
     1. Adicionar entrada em SIBANKI_FEATURES abaixo
     2. Fazer deploy
     3. Para liberar para todos: alterar enabled para true
     4. Para restringir ao Pro: colocar plan: ['pro','familia']

   CONTROLE REMOTO (Firestore):
     Documento: /config/featureFlags
     Campo:     { briefing_ia: true, flash_banners: false, ... }
     Sobrescreve os defaults sem precisar de deploy.
   ════════════════════════════════════════════════════════════════ */

var SIBANKI_FEATURES = {

  /* ── ANÁLISE & IA ─────────────────────────────────────────── */
  briefing_ia: {
    enabled:     true,                     // ← ATIVO para Pro/Família
    plan:        ['pro','familia'],         // só planos pagos — 1x por dia
    label:       'Briefing Inteligente com IA',
    desc:        'Resumo financeiro gerado por IA ao fazer login',
    upsell:      'Tenha um briefing financeiro personalizado toda vez que abrir o Sibanki.',
    badge:       'PRO',
    tab:         null
  },

  flash_banners: {
    enabled:     true,                     // ativo para todos
    plan:        ['free','pro','familia'],
    label:       'Alertas Contextuais',
    desc:        'Banners temporários com alertas de orçamento e cartões',
    upsell:      null,
    badge:       null,
    tab:         null
  },

  ia_consultor: {
    enabled:     true,
    plan:        ['free','pro','familia'],  // free tem limite, pro ilimitado
    label:       'Consultor IA',
    desc:        'Chat com a Siba para análise financeira',
    upsell:      'Upgrade para Pro e tenha consultas ilimitadas com a Siba.',
    badge:       null,
    tab:         'ia'
  },

  ia_insights_produto: {
    enabled:     true,                     // ← ATIVO — insights contextuais de produto
    plan:        ['free','pro','familia'],  // todos os planos
    label:       'Insights de Produtos Financeiros',
    desc:        'IA identifica momentos ideais para oferecer empréstimos, seguros, investimentos',
    upsell:      'Com o plano Pro, a Siba analisa seu perfil e sugere produtos financeiros no momento certo.',
    badge:       'PRO',
    tab:         'ia'
  },

  relatorio_pdf: {
    enabled:     false,                    // ← INATIVO — a implementar
    plan:        ['pro','familia'],
    label:       'Relatório Mensal em PDF',
    desc:        'Exportar resumo financeiro mensal em PDF',
    upsell:      'Exporte seus relatórios financeiros em PDF com o plano Pro.',
    badge:       'PRO',
    tab:         'rel'
  },

  open_finance: {
    enabled:     false,                    // ← INATIVO — a implementar
    plan:        ['pro','familia'],
    label:       'Open Finance',
    desc:        'Sincronização automática com bancos via Open Finance',
    upsell:      'Conecte seus bancos automaticamente com Open Finance no plano Pro.',
    badge:       'PRO',
    tab:         'contas'
  },

  whatsapp_bot: {
    enabled:     true,
    plan:        ['pro','familia'],
    label:       'Bot WhatsApp',
    desc:        'Lançar despesas e receber insights pelo WhatsApp',
    upsell:      'Lance gastos pelo WhatsApp e receba alertas no plano Pro.',
    badge:       'PRO',
    tab:         'config'
  },

  dashboard_customizavel: {
    enabled:     true,
    plan:        ['free','pro','familia'],
    label:       'Dashboard Personalizável',
    desc:        'Reorganizar widgets do dashboard',
    upsell:      null,
    badge:       null,
    tab:         'dash'
  },

  familia_compartilhado: {
    enabled:     true,
    plan:        ['familia'],
    label:       'Finanças em Família',
    desc:        'Dashboard compartilhado com cônjuge/filhos',
    upsell:      'Gerencie as finanças da família junto com o plano Família.',
    badge:       'FAMÍLIA',
    tab:         'casal'
  }
};

/* Flags remotas carregadas do Firestore — sobrescrevem os defaults */
var _sibRemoteFlags = {};

/* Carrega flags remotas uma vez por sessão */
function loadRemoteFeatureFlags() {
  if (!db) return;
  db.collection('config').doc('featureFlags').get().then(function(doc) {
    if (doc && doc.exists) {
      _sibRemoteFlags = doc.data() || {};
      console.log('[FeatureFlags] Flags remotas carregadas:', Object.keys(_sibRemoteFlags));
    }
  }).catch(function() {
    // silencioso — usa defaults locais
  });
}

/* Verifica se o usuário tem acesso a uma feature */
function hasFeature(key) {
  var feat = SIBANKI_FEATURES[key];
  if (!feat) return false;

  // Flag remota do Firestore sobrescreve o default local
  var enabled = (key in _sibRemoteFlags) ? _sibRemoteFlags[key] : feat.enabled;
  if (!enabled) return false;

  // Verificar plano
  var plan = (typeof userPlan !== 'undefined' ? userPlan : 'free') || 'free';
  return feat.plan.indexOf(plan) >= 0;
}

/* Executa fn se tiver acesso, mostra upsell se não */
function requireFeature(key, fn) {
  var feat = SIBANKI_FEATURES[key];
  if (!feat) return;

  var enabled = (key in _sibRemoteFlags) ? _sibRemoteFlags[key] : feat.enabled;

  // Feature desativada globalmente — sem upsell, silencioso
  if (!enabled) {
    console.log('[Feature] ' + key + ' está desativada globalmente.');
    return;
  }

  // Tem acesso — executa
  if (hasFeature(key)) { fn(); return; }

  // Não tem acesso — mostra upsell
  showFeatureUpsell(key);
}

/* Persiste "Agora não" e remove o overlay de upsell */
function dismissUpsellAndClose(key) {
  try { localStorage.setItem('sibanki_upsell_dismissed_' + key, '1'); } catch (e) {}
  var el = document.getElementById('sibUpsellModal');
  if (el) el.remove();
}
function closeUpsellAndGoConfig() {
  var el = document.getElementById('sibUpsellModal');
  if (el) el.remove();
  if (typeof go === 'function') go('config', null);
}

/* Modal de upsell para features PRO */
function showFeatureUpsell(key) {
  var feat = SIBANKI_FEATURES[key];
  if (!feat || !feat.upsell) return;
  /* Usuário já escolheu "Agora não" — não mostrar de novo */
  if (localStorage.getItem('sibanki_upsell_dismissed_' + key)) return;

  var modal = document.createElement('div');
  modal.id = 'sibUpsellModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,5,16,.75);backdrop-filter:blur(8px)';
  modal.innerHTML =
    '<div style="width:100%;max-width:380px;background:var(--card);border:1px solid var(--brd);border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.6)">' +
      '<div style="font-size:2.5rem;margin-bottom:12px">' + (feat.badge === 'FAMÍLIA' ? '👨‍👩‍👧‍👦' : '⭐') + '</div>' +
      '<div style="font-size:1.1rem;font-weight:800;color:var(--t1);margin-bottom:8px">' + feat.label + '</div>' +
      '<div style="font-size:.88rem;color:var(--t2);line-height:1.6;margin-bottom:20px">' + feat.upsell + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:center">' +
        '<button type="button" onclick="dismissUpsellAndClose(\'' + key.replace(/'/g, '\\\'') + '\')" style="padding:10px 20px;border-radius:10px;border:1px solid var(--brd);background:none;color:var(--t2);font-size:.88rem;cursor:pointer">Agora não</button>' +
        '<button type="button" onclick="closeUpsellAndGoConfig()" style="padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#4F8CFF,#6366f1);color:#fff;font-weight:700;font-size:.88rem;cursor:pointer">Ver planos</button>' +
      '</div>' +
    '</div>';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}
