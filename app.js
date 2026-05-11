/* ═══ ELECTRONICS PROJECT - MAIN APP ═══ */
document.addEventListener('DOMContentLoaded', () => {
  initCircuitBackground();
  initNavigation();
  initSearch();
  initSimulations();
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ], throwOnError: false
    });
  }
  initImageModal();
});

/* ═══ CIRCUIT BACKGROUND CANVAS ═══ */
function initCircuitBackground() {
  const c = document.getElementById('circuitCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, traces = [], particles = [], nodes = [], chips = [];

  function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
    generateCircuit();
  }

  function generateCircuit() {
    traces = []; nodes = []; particles = []; chips = [];
    const spacing = 30;
    const cols = Math.floor(W / spacing) + 1;
    const rows = Math.floor(H / spacing) + 1;

    // Generate chips (IC footprints)
    for (let i = 0; i < 12; i++) {
      const cx = Math.floor(Math.random() * (cols - 6)) * spacing + spacing * 2;
      const cy = Math.floor(Math.random() * (rows - 6)) * spacing + spacing * 2;
      const cw = (2 + Math.floor(Math.random() * 4)) * spacing;
      const ch = (2 + Math.floor(Math.random() * 4)) * spacing;
      chips.push({ x: cx, y: cy, w: cw, h: ch });
    }

    // Generate PCB traces
    for (let i = 0; i < 80; i++) {
      let x = Math.floor(Math.random() * cols) * spacing;
      let y = Math.floor(Math.random() * rows) * spacing;
      
      let path = [{x, y}];
      let numSegments = 2 + Math.floor(Math.random() * 5);
      
      let currentDir = Math.floor(Math.random() * 8);
      const dirs = [
        {dx: 1, dy: 0}, {dx: 1, dy: 1}, {dx: 0, dy: 1}, {dx: -1, dy: 1},
        {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}
      ];

      for (let s = 0; s < numSegments; s++) {
         let len = (1 + Math.floor(Math.random() * 6)) * spacing;
         let nx = x + dirs[currentDir].dx * len;
         let ny = y + dirs[currentDir].dy * len;
         nx = Math.max(0, Math.min(W, nx));
         ny = Math.max(0, Math.min(H, ny));
         
         path.push({x: nx, y: ny});
         x = nx; y = ny;
         
         let turn = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 1 : 2);
         currentDir = (currentDir + turn + 8) % 8;
      }
      
      traces.push(path);
      
      nodes.push({x: path[0].x, y: path[0].y, type: 'via'});
      nodes.push({x: path[path.length-1].x, y: path[path.length-1].y, type: 'pad'});
    }

    // Data particles moving along traces
    for (let i = 0; i < 40; i++) {
      const t = traces[Math.floor(Math.random() * traces.length)];
      particles.push({
        path: t,
        segment: 0,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.015,
        size: 1 + Math.random() * 1.5
      });
    }
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    
    // Draw Chips
    ctx.lineWidth = 1;
    chips.forEach(c => {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.8)';
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      
      ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
      const pinSize = 6;
      const pinSpacing = 15;
      for (let px = c.x + 10; px < c.x + c.w - 10; px += pinSpacing) {
         ctx.fillRect(px, c.y - pinSize, 4, pinSize);
         ctx.fillRect(px, c.y + c.h, 4, pinSize);
      }
      for (let py = c.y + 10; py < c.y + c.h - 10; py += pinSpacing) {
         ctx.fillRect(c.x - pinSize, py, pinSize, 4);
         ctx.fillRect(c.x + c.w, py, pinSize, 4);
      }
      
      // Chip inner detail
      ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.beginPath(); ctx.arc(c.x + 12, c.y + 12, 3, 0, Math.PI*2); ctx.fill();
    });

    // Draw Traces
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    traces.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for(let i = 1; i < path.length; i++) {
         ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });

    // Draw Nodes (vias and pads)
    nodes.forEach(n => {
      if (n.type === 'via') {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(10, 14, 26, 1)';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.fillRect(n.x - 3, n.y - 3, 6, 6);
      }
    });

    // Draw Particles
    particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress >= 1) {
        p.progress = 0;
        p.segment++;
        if (p.segment >= p.path.length - 1) {
          p.segment = 0;
        }
      }
      let p1 = p.path[p.segment];
      let p2 = p.path[p.segment + 1];
      let x = p1.x + (p2.x - p1.x) * p.progress;
      let y = p1.y + (p2.y - p1.y) * p.progress;
      
      const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 6);
      grad.addColorStop(0, 'rgba(0, 255, 136, 0.9)');
      grad.addColorStop(0.4, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, p.size * 6, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, p.size * 0.8, 0, Math.PI*2); ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

/* ═══ NAVIGATION ═══ */
function initNavigation() {
  const hamburger = document.getElementById('hamburger');
  const navSidebar = document.getElementById('navSidebar');
  const navOverlay = document.getElementById('navOverlay');

  function toggleNav() {
    hamburger.classList.toggle('active');
    navSidebar.classList.toggle('active');
    navOverlay.classList.toggle('active');
  }
  if (hamburger) hamburger.addEventListener('click', toggleNav);
  if (navOverlay) navOverlay.addEventListener('click', toggleNav);

  // Section navigation
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.getAttribute('data-nav');
      showSection(target);
      if (navSidebar.classList.contains('active')) toggleNav();
    });
  });

  // Logo click -> home
  const logo = document.querySelector('.header-logo');
  if (logo) logo.addEventListener('click', () => showSection('inicio'));

  // Show initial section
  showSection('inicio');
}

let currentScrollSpy = null;

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Pause all playing videos
  document.querySelectorAll('video').forEach(v => {
    if (!v.paused) v.pause();
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  // Update active nav link
  document.querySelectorAll('[data-nav]').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-nav') === id);
  });
  // Init project sidebar scroll spy
  if (target && target.querySelector('.project-sidebar')) {
    initScrollSpy(target);
  }
}

function initScrollSpy(section) {
  if (section.dataset.spyInit === 'true') {
    if (currentScrollSpy) currentScrollSpy();
    return;
  }
  section.dataset.spyInit = 'true';

  const links = section.querySelectorAll('.project-sidebar a');
  const headings = [];
  links.forEach(l => {
    const href = l.getAttribute('href');
    if (href && href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      if (el) headings.push({el, link: l});
    }
  });

  let isClickScrolling = false;
  let clickScrollTimeout;

  function onScroll() {
    if (!section.classList.contains('active')) return;
    if (headings.length === 0) return;
    if (isClickScrolling) return; // Pausar actualizacion si se hizo clic en un enlace
    
    let current = headings[0];
    const triggerPoint = window.innerHeight * 0.4; // 40% de la pantalla
    
    headings.forEach(h => {
      if (h.el.getBoundingClientRect().top <= triggerPoint) {
        current = h;
      }
    });

    const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.body.offsetHeight - 20;
    if (isAtBottom) {
      const lastHeading = headings[headings.length - 1];
      // Solo seleccionar el ultimo si realmente esta visible en pantalla
      if (lastHeading.el.getBoundingClientRect().top < window.innerHeight) {
        current = lastHeading;
      }
    }

    links.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');
  }

  if (currentScrollSpy) {
    window.removeEventListener('scroll', currentScrollSpy);
  }
  currentScrollSpy = onScroll;
  window.addEventListener('scroll', onScroll);
  
  // Smooth scroll for sidebar links
  links.forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      const id = l.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        isClickScrolling = true;
        
        // Actualizar visualmente de inmediato
        links.forEach(link => link.classList.remove('active'));
        l.classList.add('active');
        
        el.scrollIntoView({behavior:'smooth', block:'start'});
        
        clearTimeout(clickScrollTimeout);
        clickScrollTimeout = setTimeout(() => {
          isClickScrolling = false;
        }, 800); // Esperar a que termine el smooth scroll
      }
    });
  });

  onScroll();
}

/* ═══ SEARCH ═══ */
function initSearch() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  const projects = [];
  document.querySelectorAll('.section[data-project-name]').forEach(s => {
    projects.push({
      id: s.id,
      name: s.getAttribute('data-project-name'),
      text: s.textContent.toLowerCase()
    });
  });

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    results.innerHTML = '';
    if (q.length < 2) { results.classList.remove('active'); return; }
    const matches = projects.filter(p => p.name.toLowerCase().includes(q) || p.text.includes(q));
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">Sin resultados</div>';
    } else {
      matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = m.name;
        div.addEventListener('click', () => {
          showSection(m.id);
          results.classList.remove('active');
          input.value = '';
        });
        results.appendChild(div);
      });
    }
    results.classList.add('active');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.classList.remove('active');
  });
}

/* ═══ SIMULATIONS ═══ */
function initSimulations() {
  initHeroDemoSim();
  initLedBlinkSim();
  initLedKeyboardSim();
  initPotSim();
  initMHSSim();
  initThermometerSim();
}

/* Hero demo: voltage divider */
function initHeroDemoSim() {
  const canvas = document.getElementById('heroDemoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const r1Slider = document.getElementById('heroR1');
  const r2Slider = document.getElementById('heroR2');
  const voutDisplay = document.getElementById('heroVout');

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    const r1 = parseFloat(r1Slider?.value || 5);
    const r2 = parseFloat(r2Slider?.value || 5);
    const vin = 3.3;
    const vout = vin * r2 / (r1 + r2);
    if (voutDisplay) voutDisplay.textContent = vout.toFixed(2) + ' V';

    ctx.clearRect(0,0,W,H);
    // Draw simple circuit
    const cx = W/2, cy = H/2;
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
    // Vin line
    ctx.beginPath(); ctx.moveTo(cx-120,cy-60); ctx.lineTo(cx-120,cy+60); ctx.stroke();
    // R1
    drawResistor(ctx, cx-120, cy-60, cx, cy-60, r1);
    // Junction
    ctx.beginPath(); ctx.moveTo(cx,cy-60); ctx.lineTo(cx,cy+60); ctx.stroke();
    // R2
    drawResistor(ctx, cx, cy+60, cx+120, cy+60, r2);
    // GND
    ctx.beginPath(); ctx.moveTo(cx+120,cy+60); ctx.lineTo(cx+120,cy-60); ctx.stroke();
    // Labels
    ctx.fillStyle = '#00ff88'; ctx.font = '13px Inter';
    ctx.fillText('Vin = 3.3V', cx-180, cy-65);
    ctx.fillText('Vout = ' + vout.toFixed(2) + 'V', cx-20, cy+10);
    ctx.fillStyle = '#ffd700'; ctx.font = '11px JetBrains Mono';
    ctx.fillText('R1='+r1+'kΩ', cx-90, cy-68);
    ctx.fillText('R2='+r2+'kΩ', cx+30, cy+78);
    // Vout indicator bar
    const barW = 140, barH = 12, barX = cx-70, barY = cy+30;
    ctx.fillStyle = '#1a1f33';
    ctx.fillRect(barX,barY,barW,barH);
    ctx.fillStyle = `hsl(${120*vout/3.3},80%,50%)`;
    ctx.fillRect(barX,barY,barW*vout/3.3,barH);
  }

  function drawResistor(ctx, x1,y1,x2,y2, val) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.fillRect(mx-20,my-6,40,12);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
    ctx.strokeRect(mx-20,my-6,40,12);
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
  }

  if (r1Slider) r1Slider.addEventListener('input', draw);
  if (r2Slider) r2Slider.addEventListener('input', draw);
  draw();
  window.addEventListener('resize', draw);
}

/* LED Blink simulation */
function initLedBlinkSim() {
  const el = document.getElementById('simLedBlink');
  if (!el) return;
  const canvas = el.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let on = false, interval;

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0,0,W,H);
    // LED shape
    const cx = W/2, cy = H/2;
    if (on) {
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,50);
      g.addColorStop(0,'rgba(255,50,50,0.6)'); g.addColorStop(1,'rgba(255,50,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,50,0,Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2);
    ctx.fillStyle = on ? '#ff3333' : '#331111'; ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();
    // Label
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText(on ? 'LED ENCENDIDO' : 'LED APAGADO', cx, cy+45);
  }

  interval = setInterval(() => { on = !on; draw(); }, 1000);
  draw();
}

/* LED Keyboard simulation */
function initLedKeyboardSim() {
  const el = document.getElementById('simLedKeyboard');
  if (!el) return;
  const canvas = el.querySelector('canvas');
  const btnA = el.querySelector('.btn-a');
  const btnB = el.querySelector('.btn-b');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let on = false;

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2;
    if (on) {
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,50);
      g.addColorStop(0,'rgba(255,50,50,0.6)'); g.addColorStop(1,'rgba(255,50,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,50,0,Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2);
    ctx.fillStyle = on ? '#ff3333' : '#331111'; ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText(on ? 'LED ENCENDIDO' : 'LED APAGADO', cx, cy+45);
  }

  if (btnA) btnA.addEventListener('click', () => { on = true; draw(); });
  if (btnB) btnB.addEventListener('click', () => { on = false; draw(); });
  draw();
}

/* Potentiometer simulation */
function initPotSim() {
  const el = document.getElementById('simPot');
  if (!el) return;
  const canvas = el.querySelector('canvas');
  const slider = el.querySelector('.pot-slider');
  if (!canvas || !slider) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    const val = parseInt(slider.value);
    const voltage = val * 3.3 / 4095;
    const brightness = Math.round(val * 255 / 4095);

    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2;
    // LED with variable brightness
    const alpha = brightness / 255;
    if (alpha > 0.05) {
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,40+alpha*20);
      g.addColorStop(0,`rgba(255,50,50,${alpha*0.7})`); g.addColorStop(1,'rgba(255,50,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,60,0,Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2);
    ctx.fillStyle = `rgb(${Math.round(51+204*alpha)},${Math.round(17*alpha)},${Math.round(17*alpha)})`;
    ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#e2e8f0'; ctx.font = '12px JetBrains Mono'; ctx.textAlign = 'center';
    ctx.fillText(`ADC: ${val}  |  V: ${voltage.toFixed(2)}V  |  PWM: ${brightness}`, cx, cy+50);
  }

  slider.addEventListener('input', draw);
  draw();
}

/* MHS Simulation */
function initMHSSim() {
  const el = document.getElementById('simMHS');
  if (!el) return;
  const canvas = el.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const ampSlider = el.querySelector('.mhs-amp');
  const freqSlider = el.querySelector('.mhs-freq');
  const phaseSlider = el.querySelector('.mhs-phase');
  const dampSlider = el.querySelector('.mhs-damp');
  let time = 0;

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    const A = parseFloat(ampSlider?.value || 25);
    const f = parseFloat(freqSlider?.value || 1);
    const phi = parseFloat(phaseSlider?.value || 0);
    const beta = parseFloat(dampSlider?.value || 0);

    ctx.clearRect(0,0,W,H);
    const cy = H/2, margin = 30;
    // Axis
    ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(margin,cy); ctx.lineTo(W-10,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin,10); ctx.lineTo(margin,H-10); ctx.stroke();

    // Wave
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    const scaleY = (H-40)/60;
    for (let px = 0; px < W-margin-10; px++) {
      const t = (px/(W-margin-10)) * (2/f) + time;
      const decay = Math.exp(-beta * t);
      const y = A * decay * Math.sin(2*Math.PI*f*t + phi);
      const sy = cy - y * scaleY;
      if (px === 0) ctx.moveTo(margin+px, sy);
      else ctx.lineTo(margin+px, sy);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter';
    ctx.fillText(`A=${A}  f=${f}Hz  φ=${phi.toFixed(1)}rad  β=${beta.toFixed(1)}`, margin+10, 18);
    time += 0.02;
    requestAnimationFrame(draw);
  }

  [ampSlider, freqSlider, phaseSlider, dampSlider].forEach(s => {
    if (s) s.addEventListener('input', () => {
      const display = s.parentElement.querySelector('.sim-val');
      if (display) display.textContent = s.value;
    });
  });
  draw();
}

/* Thermometer simulation */
function initThermometerSim() {
  const el = document.getElementById('simThermo');
  if (!el) return;
  const canvas = el.querySelector('canvas');
  const slider = el.querySelector('.thermo-slider');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    const W = canvas.width = canvas.parentElement.clientWidth;
    const H = canvas.height = canvas.parentElement.clientHeight;
    const temp = parseFloat(slider?.value || 25);
    ctx.clearRect(0,0,W,H);

    const cx = W/2-60, tubeX = cx-8, tubeY = 20, tubeW = 16, tubeH = H-70;
    const bulbR = 14, bulbCY = tubeY+tubeH+bulbR-2;
    const prop = Math.max(0,Math.min(1,(temp-0)/40));
    const level = Math.round(prop*tubeH);

    // Tube outline
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(tubeX, tubeY, tubeW, tubeH);
    // Bulb outline
    ctx.beginPath(); ctx.arc(cx, bulbCY, bulbR, 0, Math.PI*2); ctx.stroke();
    // Fill bulb
    ctx.fillStyle = `hsl(${(1-prop)*240},80%,50%)`;
    ctx.beginPath(); ctx.arc(cx, bulbCY, bulbR-2, 0, Math.PI*2); ctx.fill();
    // Fill tube (mercury)
    ctx.fillRect(tubeX+2, tubeY+tubeH-level, tubeW-4, level);
    // Scale marks
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px JetBrains Mono';
    ctx.fillText('40°', tubeX+tubeW+6, tubeY+10);
    ctx.fillText('20°', tubeX+tubeW+6, tubeY+tubeH/2+4);
    ctx.fillText(' 0°', tubeX+tubeW+6, tubeY+tubeH+4);

    // Values
    const vx = cx + 60;
    ctx.fillStyle = '#e2e8f0'; ctx.font = '14px Inter';
    ctx.fillText('Temperatura:', vx, H/2-20);
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 22px JetBrains Mono';
    ctx.fillText(temp.toFixed(1) + '°C', vx, H/2+10);
  }

  if (slider) slider.addEventListener('input', draw);
  draw();
}

/* ═══ IMAGE MODAL ═══ */
function initImageModal() {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('imageModalImg');
  const captionText = document.getElementById('imageModalCaption');
  const closeBtn = document.getElementById('imageModalClose');
  if (!modal) return;

  const images = document.querySelectorAll('.figure img');
  images.forEach(img => {
    img.addEventListener('click', function() {
      modal.classList.add('active');
      modalImg.src = this.src;
      const caption = this.nextElementSibling;
      if (caption && caption.classList.contains('figure-caption')) {
        captionText.innerHTML = caption.innerHTML;
      } else {
        captionText.innerHTML = this.alt || '';
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}
