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
  });
})();
