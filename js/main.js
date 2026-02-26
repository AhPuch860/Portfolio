// =============================================
//  PORTFOLIO — main.js
//  Toggle PT/EN + Scroll reveal
// =============================================

// ── LANG TOGGLE ──
const html       = document.documentElement;
const langBtn    = document.getElementById('langToggle');
let   currentLang = 'pt';

langBtn.addEventListener('click', () => {
  currentLang = currentLang === 'pt' ? 'en' : 'pt';
  html.setAttribute('data-lang', currentLang);
  langBtn.textContent = currentLang === 'pt' ? 'EN' : 'PT';
  applyLang(currentLang);
});

function applyLang(lang) {
  document.querySelectorAll('[data-pt]').forEach(el => {
    el.textContent = lang === 'pt' ? el.dataset.pt : el.dataset.en;
  });
}

// ── SCROLL REVEAL ──
const observerOpts = {
  threshold: 0.12,
  rootMargin: '0px 0px -60px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOpts);

// Elementos que recebem reveal
document.querySelectorAll('.case, .about__left, .about__right, .contact__inner').forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// ── NAV — ativa link conforme seção ──
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks  = document.querySelectorAll('.nav__links a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav__links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => navObserver.observe(s));

// ── HALFTONE MOUSE REPULSION ──
(function () {
  const SPRING   = 0.055;
  const DAMPING  = 0.74;
  const R_RADIUS = 80;
  const R_FORCE  = 5;

  // Cada canvas tem seu próprio estado de visibilidade
  function build(section, halftoneEl, spacing, dotR, dotA, vignette, clipOrFn, excludeSelectors = []) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    halftoneEl.parentNode.insertBefore(canvas, halftoneEl);
    halftoneEl.remove();

    const ctx = canvas.getContext('2d');

    let dots = [];
    let mx = -9999, my = -9999;
    let visible = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // limita DPR a 2x

    function resize() {
      const W_css = section.offsetWidth;
      const H_css = section.offsetHeight;

      const clip = typeof clipOrFn === 'function'
        ? clipOrFn(W_css, H_css, section)
        : clipOrFn;
      canvas.style.clipPath = clip || '';

      canvas.width  = W_css * dpr;
      canvas.height = H_css * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const W = W_css, H = H_css;
      const cols = Math.ceil(W / spacing) + 1;
      const rows = Math.ceil(H / spacing) + 1;
      const cx = W / 2, cy = H / 2;
      const rx = W * 0.4, ry = H * 0.4;

      // Calcula zonas de exclusão a partir dos seletores fornecidos
      const pad = spacing * 0.6;
      const sRect = section.getBoundingClientRect();
      const exclusions = excludeSelectors
        .flatMap(sel => [...section.querySelectorAll(sel)])
        .filter(Boolean)
        .map(el => {
          // X: Range mede o texto real (não afetado por translateY)
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()];
          if (!rects.length) return null;
          const x0 = Math.min(...rects.map(r => r.left))  - sRect.left - pad;
          const x1 = Math.max(...rects.map(r => r.right)) - sRect.left + pad;
          // Y: offsetTop traversal ignora transforms CSS (ex: reveal translateY)
          let oy = 0, cur = el;
          while (cur && cur !== section) { oy += cur.offsetTop; cur = cur.offsetParent; }
          return { x0, y0: oy - pad, x1, y1: oy + el.offsetHeight + pad };
        })
        .filter(Boolean);

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const ox = c * spacing, oy = r * spacing;
          let a = dotA;
          if (vignette) {
            const nx = (ox - cx) / rx, ny = (oy - cy) / ry;
            const d  = Math.sqrt(nx * nx + ny * ny);
            a = dotA * Math.max(0, Math.min(1, 1 - (d - 0.4) / 0.6));
          }
          const blocked = exclusions.some(z => ox >= z.x0 && ox <= z.x1 && oy >= z.y0 && oy <= z.y1);
          if (!blocked && a > 0.004) dots.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0, a });
        }
      }
    }

    function tick() {
      if (!visible) return;

      const W = canvas.width  / dpr;
      const H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);

      const RR = R_RADIUS * R_RADIUS;

      // Batch por alpha: agrupa pontos com mesmo alpha para reduzir estado de contexto
      // (só há poucos valores de alpha distintos, normalmente 1)
      ctx.fillStyle = 'rgb(242,242,242)';
      ctx.beginPath();
      let lastAlpha = -1;

      for (const d of dots) {
        const ddx = d.x - mx, ddy = d.y - my;
        const dist2 = ddx * ddx + ddy * ddy;
        if (dist2 < RR) {
          const dist = Math.sqrt(dist2) || 0.01;
          const f = (1 - dist / R_RADIUS) * R_FORCE;
          d.vx += (ddx / dist) * f;
          d.vy += (ddy / dist) * f;
        }
        d.vx += (d.ox - d.x) * SPRING;
        d.vy += (d.oy - d.y) * SPRING;
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x  += d.vx;
        d.y  += d.vy;

        if (d.a !== lastAlpha) {
          // Fecha o path anterior e abre novo com novo alpha
          ctx.fill();
          ctx.beginPath();
          ctx.globalAlpha = d.a;
          lastAlpha = d.a;
        }
        ctx.moveTo(d.x + dotR, d.y);
        ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Pausa animação quando seção sai da viewport
    const visObs = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    visObs.observe(section);

    section.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    });
    section.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
    window.addEventListener('resize', resize);
    resize();
    return tick;
  }

  function HERO_CLIP(W, H, section) {
    const defaultTop = 60.4;
    const defaultBot = 55.0;
    const content = section.querySelector('.hero__content');
    if (content) {
      const sLeft   = section.getBoundingClientRect().left;
      const cRight  = content.getBoundingClientRect().right - sLeft;
      const pct     = (cRight / W) * 100;
      const topLeft = Math.max(defaultTop, pct);
      const botLeft = Math.max(defaultBot, pct);
      return `polygon(${topLeft.toFixed(1)}% 0%,100% 0%,100% 100%,${botLeft.toFixed(1)}% 100%)`;
    }
    return `polygon(${defaultTop}% 0%,100% 0%,100% 100%,${defaultBot}% 100%)`;
  }

  const defs = [
    ['.hero',    '.hero__halftone',    18, 1.5, 0.38, false, '', ['.hero__label', '.hero__sub', '.hero__scroll']],
    ['.about',   '.about__halftone',   14, 2,   0.12, false, ''],
    ['.contact', '.contact__halftone', 14, 2,   0.12, false, '', ['.contact__email', '.contact__social a', '.contact__copy']],
  ];

  const ticks = [];
  for (const [sel, hSel, sp, r, a, vig, clip, excl = []] of defs) {
    const sec = document.querySelector(sel);
    const ht  = document.querySelector(hSel);
    if (sec && ht) ticks.push(build(sec, ht, sp, r, a, vig, clip, excl));
  }

  if (ticks.length) {
    (function loop() {
      ticks.forEach(fn => fn());
      requestAnimationFrame(loop);
    })();
  }
})();
