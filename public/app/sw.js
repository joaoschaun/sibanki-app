self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r||fetch(e.request).then(function(res){
        if(res.status===200&&e.request.method==='GET'){
          var c=res.clone();
          caches.open('sibanki-v6').then(function(cache){cache.put(e.request,c)});
        }
        return res;
      }).catch(function(){
        return new Response('<h1>Offline</h1><p>Verifique sua conexao</p>',{headers:{'Content-Type':'text/html'}});
      });
    })
  );
});
