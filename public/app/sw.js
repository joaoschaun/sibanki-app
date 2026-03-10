self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var u=e.request.url;
  var stagingHtml=u.indexOf('staging-13a0b')!==-1&&(u.indexOf('index.html')!==-1||/\/app\/?$/.test(u)||/\/app\?/.test(u));
  if(stagingHtml){e.respondWith(fetch(e.request));return;}
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
