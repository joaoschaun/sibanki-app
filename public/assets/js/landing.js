(function(){
  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn);
      return;
    }
    fn();
  }

  var selectedPlan = null;
  var planInfo = {
    free: {
      info: 'Plano gratuito, sem cobrança e sem cartão.',
      note: ''
    },
    pro: {
      info: '30 dias grátis de Pro. Depois, você escolhe se quer continuar.',
      note: 'Sem cobrança agora. No fim do trial, você pode manter o Pro, mudar para Família ou voltar ao gratuito.'
    },
    familia: {
      info: '30 dias grátis de Família. Ideal para compartilhar a gestão financeira.',
      note: 'Sem cobrança agora. No fim do trial, você escolhe se quer continuar, migrar para Pro ou voltar ao gratuito.'
    }
  };

  function setupNav(){
    var nav = document.getElementById('nav');
    if(!nav) return;
    window.addEventListener('scroll', function(){
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  function setupReveal(){
    var revealEls = document.querySelectorAll('.fade-up');
    revealEls.forEach(function(el, index){
      el.style.setProperty('--reveal-delay', Math.min(index * 45, 320) + 'ms');
    });

    if(!('IntersectionObserver' in window)){
      revealEls.forEach(function(el){ el.classList.add('show'); });
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(function(el){ observer.observe(el); });

    window.setTimeout(function(){
      revealEls.forEach(function(el){
        if(!el.classList.contains('show')){
          el.classList.add('show');
          observer.unobserve(el);
        }
      });
    }, 2000);
  }

  function setupSmoothScroll(){
    document.querySelectorAll('a[href^="#"]').forEach(function(link){
      link.addEventListener('click', function(event){
        var targetSelector = this.getAttribute('href');
        if(!targetSelector || targetSelector === '#') return;
        var target = document.querySelector(targetSelector);
        if(target){
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function setupParallax(){
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReducedMotion) return;

    var hero = document.querySelector('.hero');
    var heroCopy = document.querySelector('.hero-copy');
    var heroDevice = document.querySelector('.hero-device');

    if(!hero || !heroCopy || !heroDevice) return;

    hero.addEventListener('mousemove', function(event){
      var rect = hero.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width) - 0.5;
      var y = ((event.clientY - rect.top) / rect.height) - 0.5;

      heroCopy.style.transform = 'translate3d(' + (x * 10) + 'px,' + (y * 8) + 'px,0)';
      heroDevice.style.transform = 'translate3d(' + (x * 18) + 'px,' + (-y * 12) + 'px,0) rotateX(' + (-y * 8) + 'deg) rotateY(' + (x * 10) + 'deg)';
    });

    hero.addEventListener('mouseleave', function(){
      heroCopy.style.transform = '';
      heroDevice.style.transform = '';
    });
  }

  function setupTiltCards(){
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReducedMotion) return;
    if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    var selectors = '.feat-card,.outcome-card,.showcase-main,.showcase-stack-card,.price-card,.sec-card,.testimonial-card';
    document.querySelectorAll(selectors).forEach(function(card){
      card.classList.add('tilt-ready');
      card.addEventListener('mousemove', function(event){
        var rect = card.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) - 0.5;
        var y = ((event.clientY - rect.top) / rect.height) - 0.5;
        card.style.transform = 'perspective(1200px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function(){
        card.style.transform = '';
      });
    });
  }

  function persistSelectedPlan(plan){
    try {
      localStorage.setItem('sib_selected_plan', plan);
    } catch (error) {
      return;
    }
  }

  function selectPlan(plan){
    selectedPlan = plan;
    document.querySelectorAll('.plan-sel-card').forEach(function(card){
      card.classList.toggle('selected', card.dataset.plan === plan);
    });

    var info = document.getElementById('planSelInfo');
    var button = document.getElementById('planSelBtn');
    var note = document.getElementById('planSelNote');
    var meta = planInfo[plan];
    if(!meta) return;

    if(info) info.textContent = meta.info;
    if(button){
      button.hidden = false;
      button.textContent = plan === 'free' ? 'Criar conta gratuita' : 'Começar degustação gratuita';
    }
    if(note){
      note.hidden = !meta.note;
      note.textContent = meta.note;
    }
  }

  function goToPlan(event){
    event.preventDefault();
    var url = selectedPlan && selectedPlan !== 'free'
      ? '/app?plan=' + selectedPlan + '&trial=30'
      : '/app';
    window.location.href = url;
  }

  function captureReferral(){
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if(ref && ref.trim().length >= 5){
      try {
        localStorage.setItem('sib_ref_code', ref.trim().toUpperCase());
      } catch (error) {
        return;
      }
      var cleanUrl = window.location.pathname + (window.location.hash || '');
      history.replaceState({}, '', cleanUrl);
    }
  }

  function getABVariant(){
    var params = new URLSearchParams(window.location.search);
    var fromQuery = (params.get('ab') || '').toLowerCase();
    if(fromQuery === 'a' || fromQuery === 'b'){
      try { localStorage.setItem('sib_landing_ab', fromQuery); } catch (error) {}
      return fromQuery;
    }
    try {
      var fromStorage = (localStorage.getItem('sib_landing_ab') || '').toLowerCase();
      if(fromStorage === 'a' || fromStorage === 'b') return fromStorage;
    } catch (error) {}
    return 'a';
  }

  function trackABEvent(eventName, variant){
    try {
      var key = 'sib_landing_ab_metrics';
      var raw = localStorage.getItem(key);
      var metrics = raw ? JSON.parse(raw) : {};
      if(!metrics[variant]) metrics[variant] = {};
      metrics[variant][eventName] = (metrics[variant][eventName] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(metrics));
    } catch (error) {
      return;
    }
  }

  function readABMetrics(){
    try {
      var raw = localStorage.getItem('sib_landing_ab_metrics');
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function renderABDebugPanel(variant){
    var params = new URLSearchParams(window.location.search);
    if(params.get('abdebug') !== '1') return;

    var metrics = readABMetrics();
    var va = metrics.a || {};
    var vb = metrics.b || {};
    var panel = document.createElement('aside');
    panel.setAttribute('aria-label', 'AB Debug');
    panel.style.position = 'fixed';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.zIndex = '9999';
    panel.style.width = '280px';
    panel.style.padding = '12px';
    panel.style.borderRadius = '12px';
    panel.style.border = '1px solid rgba(255,255,255,0.2)';
    panel.style.background = 'rgba(5,8,13,0.92)';
    panel.style.color = '#e5e7eb';
    panel.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.4';
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<strong>AB Debug</strong>' +
      '<button type="button" id="abDebugClose" style="background:transparent;border:0;color:#9ca3af;cursor:pointer;font-size:14px;">x</button>' +
      '</div>' +
      '<div style="margin-bottom:8px;">Variante ativa: <strong>' + variant.toUpperCase() + '</strong></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
      '<div style="padding:8px;border:1px solid rgba(255,255,255,0.14);border-radius:8px;">' +
      '<div style="font-weight:600;margin-bottom:4px;">A</div>' +
      '<div>Exposicoes: ' + (va.exposure || 0) + '</div>' +
      '<div>CTA clicks: ' + (va.cta_click || 0) + '</div>' +
      '</div>' +
      '<div style="padding:8px;border:1px solid rgba(255,255,255,0.14);border-radius:8px;">' +
      '<div style="font-weight:600;margin-bottom:4px;">B</div>' +
      '<div>Exposicoes: ' + (vb.exposure || 0) + '</div>' +
      '<div>CTA clicks: ' + (vb.cta_click || 0) + '</div>' +
      '</div>' +
      '</div>' +
      '<div style="margin-top:8px;color:#9ca3af;">Dica: limpe com localStorage.removeItem(\"sib_landing_ab_metrics\")</div>';

    document.body.appendChild(panel);
    var close = document.getElementById('abDebugClose');
    if(close){
      close.addEventListener('click', function(){
        panel.remove();
      });
    }
  }

  function propagateABToAppLinks(variant){
    var links = document.querySelectorAll('a[href^="/app"]');
    links.forEach(function(link){
      var href = link.getAttribute('href');
      if(!href) return;
      try {
        var url = new URL(href, window.location.origin);
        if(!url.searchParams.get('ab')){
          url.searchParams.set('ab', variant);
          link.setAttribute('href', url.pathname + url.search + url.hash);
        }
      } catch (error) {
        return;
      }
    });
  }

  function wireABClickTracking(variant){
    var selectors = [
      '.hero-btns a',
      '.nav-links a[href="/app"]',
      '.price-btn',
      '#planSelBtn',
      '.cta-actions a[href="/app"]'
    ].join(',');
    document.querySelectorAll(selectors).forEach(function(el){
      el.addEventListener('click', function(){
        trackABEvent('cta_click', variant);
      });
    });
  }

  function applyHeroAB(){
    var variant = getABVariant();
    document.body.setAttribute('data-ab', variant);
    trackABEvent('exposure', variant);
    propagateABToAppLinks(variant);
    wireABClickTracking(variant);
    renderABDebugPanel(variant);
    if(variant !== 'b') return;

    var hook = document.querySelector('.hero-hook');
    var h1 = document.querySelector('.hero-copy h1');
    var oneliner = document.querySelector('.hero-oneliner');
    var desc = document.querySelector('.hero-desc');

    if(hook){
      hook.textContent = 'Pare de adivinhar. Comece a decidir melhor todo mes.';
    }
    if(h1){
      h1.innerHTML = '<span class="hero-eyebrow">Menos planilha. Mais direcao.</span>Sua vida financeira <span class="hero-title-accent">organizada com prioridade</span>.';
    }
    if(oneliner){
      oneliner.textContent = 'O Sibanki cruza contas, cartoes, orcamento e credito para mostrar sua proxima melhor acao. Registre no app, WhatsApp ou Telegram.';
    }
    if(desc){
      desc.textContent = 'Comece gratis, sem cartao, e receba clareza pratica para melhorar caixa, rotina e tranquilidade financeira em minutos.';
    }
  }

  window.selectPlan = selectPlan;
  window.goToPlan = goToPlan;
  window.setSelectedPlan = persistSelectedPlan;

  onReady(function(){
    setupNav();
    setupReveal();
    setupSmoothScroll();
    setupParallax();
    setupTiltCards();
    captureReferral();
    applyHeroAB();
  });
})();
