var CACHE_NAME='sibanki-v16';
self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});
self.addEventListener('fetch',function(e){
  var u=e.request.url;
  if(u.indexOf('staging-13a0b')!==-1){e.respondWith(fetch(e.request));return;}
  if(/\.html(\?|$)/.test(u)||/\/app\/?(\?|$)/.test(u)){e.respondWith(fetch(e.request));return;}
  // Network-first para app.js e app.css (sempre pega versão mais nova)
  if(/app\.(js|css)(\?|$)/.test(u)){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res.status===200&&e.request.method==='GET'){
          var c=res.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c);});
        }
        return res;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }
  // Cache-first para demais assets (imagens, fonts)
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r||fetch(e.request).then(function(res){
        if(res.status===200&&e.request.method==='GET'){
          var c=res.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c);});
        }
        return res;
      }).catch(function(){
        return new Response('<h1>Offline</h1><p>Verifique sua conexao</p>',{headers:{'Content-Type':'text/html'}});
      });
    })
  );
});
