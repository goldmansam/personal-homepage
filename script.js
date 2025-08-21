/* =============================
   DOM
============================= */
const cluster       = document.getElementById('cluster');
const petalLayer    = document.getElementById('petalLayer'); // NEW top layer
const centerEl      = document.getElementById('center');
const centerLabel   = document.getElementById('centerLabel');
const petals        = Array.from(document.querySelectorAll('.petal'));
const buttons       = petals.map(p => p.querySelector('.pulse-btn'));

const overlay       = document.getElementById('overlay');
const closeBtn      = document.getElementById('closeBtn');
const sectionTitle  = document.getElementById('sectionTitle');
const sectionContent= document.getElementById('sectionContent');

/* =============================
   State
============================= */
let state = 'home'; // 'home' | 'opening' | 'section'
let currentSection = null;
let unlocked = false;

/* =============================
   Geometry helpers
============================= */
function sizes(){
  const clusterSize = cluster.getBoundingClientRect().width;
  const centerR = centerEl.getBoundingClientRect().width / 2;
  const petalR = petals[0].getBoundingClientRect().width / 2;
  return { clusterSize, centerR, petalR };
}
let { clusterSize, centerR, petalR } = sizes();

const gap = 10;
let ringRadius = centerR + petalR + gap;

function petalTransform(radius, angle){
  const x = Math.cos(angle)*radius;
  const y = Math.sin(angle)*radius;
  return `translate(-50%,-50%) translate(${x}px, ${y}px)`;
}
function setPetalAt(p, radius, angle){ p.style.transform = petalTransform(radius, angle); }

function viewportRect(){ return { w: window.innerWidth, h: window.innerHeight, m: 24 }; }

/* =============================
   Home placement & center orbit
============================= */
const n = petals.length;
const baseAngles = new Array(n);
petals.forEach((p, i) => {
  const a = -Math.PI/2 + (i/n)*Math.PI*2;
  baseAngles[i] = a;
  setPetalAt(p, ringRadius, a);
  p.style.opacity = 1;
});

const outwardOffsets = [60, 85, 110, 75, 100, 90, 120, 70];
let orbitR = outwardOffsets.map(off => ringRadius + off);

const baseRPM = 0.9;
const baseOmega = (baseRPM * Math.PI*2) / 60; // rad/s
const speedFactors = [0.65, 0.8, 0.95, 1.15, 1.35, 0.72, 1.25, 1.0];
const omegas = speedFactors.map(f => baseOmega * f);

let centerOrbitRAF = null, orbitStart = null;
function startCenterOrbit(){
  orbitStart = performance.now();
  function loop(now){
    const t = (now - orbitStart)/1000;
    for (let i=0; i<petals.length; i++){
      const a = baseAngles[i] + omegas[i]*t;
      petals[i].style.transform = petalTransform(orbitR[i], a);
    }
    centerOrbitRAF = requestAnimationFrame(loop);
  }
  if (!centerOrbitRAF) centerOrbitRAF = requestAnimationFrame(loop);
}
function stopCenterOrbit(){ if (centerOrbitRAF) cancelAnimationFrame(centerOrbitRAF); centerOrbitRAF = null; }

/* =============================
   Guided petal clicks (unlock)
============================= */
let targetIndex = 0;
function setActiveButton(idx){ buttons.forEach((b, i) => b.classList.toggle('active', i === idx)); }
setActiveButton(targetIndex);

function handlePetalClick(i){
  if (unlocked || i !== targetIndex) return;
  const p = petals[i];
  setPetalAt(p, orbitR[i], baseAngles[i]);
  p.dataset.expanded = 'true';

  const allExpanded = petals.every(el => el.dataset.expanded === 'true');
  if (allExpanded){
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      p.removeEventListener('transitionend', onEnd);
      unlocked = true;
      setActiveButton(-1);
      centerLabel.classList.remove('title-gradient');
      startCenterOrbit();
      startLabelCycle();
    };
    p.addEventListener('transitionend', onEnd, { once: true });
  } else {
    targetIndex = (targetIndex + 1) % n;
    setActiveButton(targetIndex);
  }
}
petals.forEach((p, i) => {
  p.addEventListener('click', () => handlePetalClick(i));
  buttons[i].addEventListener('click', (ev) => { ev.stopPropagation(); handlePetalClick(i); });
});

/* =============================
   Center label cycling
============================= */
const names = ['Work','About','Contact'];
const grads = [
  'linear-gradient(135deg,#ff6b6b,#ffb199)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)'
];
let labelIdx = 0, labelTimer = null;

function cycleOnce(){
  centerLabel.classList.add('gradient-text');
  centerLabel.style.filter = 'blur(6px)';
  centerLabel.style.opacity = 0;
  setTimeout(() => {
    centerLabel.textContent = names[labelIdx % names.length];
    centerLabel.style.backgroundImage = grads[labelIdx % grads.length];
    labelIdx++;
    centerLabel.style.filter = 'blur(0px)';
    centerLabel.style.opacity = 1;
  }, 420);
}
function startLabelCycle(){ if (!labelTimer){ cycleOnce(); labelTimer = setInterval(cycleOnce, 5000); } }
function stopLabelCycle(){ if (labelTimer) clearInterval(labelTimer), labelTimer = null; }

/* =============================
   Perimeter helpers
============================= */
function distanceOnRectEdge(x, y){
  const { w, h, m } = viewportRect();
  const W = w - 2*m, H = h - 2*m;
  const L = 2*(W + H);
  const eps = 1.0;
  if (Math.abs(y - m) <= eps)              return Math.max(0, Math.min(W, x - m));
  if (Math.abs(x - (w - m)) <= eps)        return W + Math.max(0, Math.min(H, y - m));
  if (Math.abs(y - (h - m)) <= eps)        return W + H + Math.max(0, Math.min(W, (W - (x - m))));
  return W + H + W + Math.max(0, Math.min(H, (H - (y - m))));
}
function rayToRectEdge(x, y, vx, vy){
  const { w, h, m } = viewportRect();
  const left = m, right = w - m, top = m, bottom = h - m;
  const cands = [];
  if (vy < 0){ const s = (top - y) / vy;    const X = x + vx*s; if (s > 0 && X >= left && X <= right) cands.push({ s, x:X, y:top }); }
  if (vy > 0){ const s = (bottom - y) / vy; const X = x + vx*s; if (s > 0 && X >= left && X <= right) cands.push({ s, x:X, y:bottom }); }
  if (vx > 0){ const s = (right - x) / vx;  const Y = y + vy*s; if (s > 0 && Y >= top && Y <= bottom) cands.push({ s, x:right, y:Y }); }
  if (vx < 0){ const s = (left - x) / vx;   const Y = y + vy*s; if (s > 0 && Y >= top && Y <= bottom) cands.push({ s, x:left,  y:Y }); }
  if (!cands.length) return { x, y };
  cands.sort((a,b) => a.s - b.s);
  return { x: cands[0].x, y: cands[0].y };
}

/* =============================
   Overlay + tangential docking
============================= */
let perimeterRAF = null;
let rectDistances = new Array(n).fill(0);
const pxSpeeds = speedFactors.map(f => 140 * f); // px/sec along edges

function setOverlayClipToCenter(){
  const c = centerEl.getBoundingClientRect();
  overlay.style.setProperty('--clipX', (c.left + c.width/2) + 'px');
  overlay.style.setProperty('--clipY', (c.top  + c.height/2) + 'px');
  overlay.style.setProperty('--clipR', (c.width/2) + 'px');
}

function showOverlay(){
  document.body.classList.add('reading');
  overlay.classList.add('visible');
  setOverlayClipToCenter();
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.setAttribute('aria-hidden', 'false');
  centerLabel.setAttribute('aria-expanded', 'true');
}
function hideOverlay(){
  overlay.classList.remove('open');
  setOverlayClipToCenter();
  centerLabel.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reading');
  }, 820);
}

/* Move petals into the top petal layer BEFORE overlay opens */
function promotePetalsBeforeOverlay(){
  const c = centerEl.getBoundingClientRect();
  const cx = c.left + c.width/2, cy = c.top + c.height/2;
  const now = performance.now();

  petals.forEach((p, i) => {
    const a = unlocked && orbitStart ? baseAngles[i] + omegas[i]*((now - orbitStart)/1000) : baseAngles[i];
    const r = unlocked ? orbitR[i] : ringRadius;
    const x = cx + Math.cos(a)*r;
    const y = cy + Math.sin(a)*r;

    if (p.parentElement !== petalLayer) petalLayer.appendChild(p);
    p.classList.add('perimeter');  // makes it absolute inside petal-layer (z:7)
    p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  // force a reflow so the browser paints this state before we open overlay
  // (prevents overlay from flashing above them)
  void petalLayer.offsetHeight;
}

/* Then shoot each along its tangent to the nearest edge */
function tangentialDockPetals(){
  const c = centerEl.getBoundingClientRect();
  const cx = c.left + c.width/2, cy = c.top + c.height/2;
  const now = performance.now();

  petals.forEach((p, i) => {
    const a = unlocked && orbitStart ? baseAngles[i] + omegas[i]*((now - orbitStart)/1000) : baseAngles[i];
    const r = unlocked ? orbitR[i] : ringRadius;

    const x = cx + Math.cos(a)*r;
    const y = cy + Math.sin(a)*r;

    const tx = -Math.sin(a), ty = Math.cos(a); // tangent direction

    const { x: ex, y: ey } = rayToRectEdge(x, y, tx, ty);

    requestAnimationFrame(() => {
      p.style.transform = `translate(${ex}px, ${ey}px) translate(-50%, -50%)`;
    });

    rectDistances[i] = distanceOnRectEdge(ex, ey);
  });
}

function startPerimeterOrbit(){
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;

    petals.forEach((p, i) => {
      rectDistances[i] += pxSpeeds[i] * dt;
      const { w, h, m } = viewportRect();
      const W = w - 2*m, H = h - 2*m, L = 2*(W + H);
      let d = ((rectDistances[i] % L) + L) % L;

      let x, y;
      if (d <= W){ x = m + d; y = m; }
      else if (d <= W + H){ x = m + W; y = m + (d - W); }
      else if (d <= W + H + W){ x = m + (W - (d - W - H)); y = m + H; }
      else { x = m; y = m + (H - (d - W - H - W)); }

      p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });

    perimeterRAF = requestAnimationFrame(loop);
  }
  if (!perimeterRAF) perimeterRAF = requestAnimationFrame(loop);
}
function stopPerimeterOrbit(){ if (perimeterRAF) cancelAnimationFrame(perimeterRAF); perimeterRAF = null; }

/* =============================
   Open/Close section
============================= */
function setSectionUI(which){
  currentSection = which;
  const ix = { work:0, about:1, contact:2 }[which] ?? 0;
  sectionTitle.textContent = names[ix];
  sectionTitle.style.backgroundImage = grads[ix];
  [...sectionContent.querySelectorAll('section')].forEach(s => {
    s.hidden = (s.dataset.section !== which);
  });
}

function openSection(which){
  if (state !== 'home') return;
  state = 'opening';

  stopCenterOrbit();
  stopLabelCycle();

  const normalized = which || (['work','about','contact'].includes(centerLabel.textContent.trim().toLowerCase()) ? centerLabel.textContent.trim().toLowerCase() : 'work');
  setSectionUI(normalized);

  // 1) Move petals to the top layer at their current positions
  promotePetalsBeforeOverlay();

  // 2) Start overlay open & tangential docking in the next frame
  showOverlay();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { // double rAF ensures proper paint order
      tangentialDockPetals();
    });
  });

  // 3) Begin perimeter orbit after docking transition finishes
  setTimeout(() => {
    startPerimeterOrbit();
    sectionContent.focus({ preventScroll: true });
    state = 'section';
  }, 900);
}

function closeSection(){
  if (state !== 'section') return;
  state = 'home';
  stopPerimeterOrbit();

  // animate petals from perimeter back to ring (screen coords)
  const c = centerEl.getBoundingClientRect();
  const cx = c.left + c.width/2, cy = c.top + c.height/2;

  petals.forEach((p, i) => {
    const a = baseAngles[i];
    const x = cx + Math.cos(a)*ringRadius;
    const y = cy + Math.sin(a)*ringRadius;
    p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  // after transition, move petals back into the cluster & resume home orbit/cycle
  setTimeout(() => {
    petals.forEach((p, i) => {
      if (p.parentElement !== cluster) cluster.appendChild(p);
      p.classList.remove('perimeter');
      setPetalAt(p, ringRadius, baseAngles[i]);
    });
    if (unlocked) startCenterOrbit();
    startLabelCycle(); // resume choices
  }, 900);

  hideOverlay();
}

/* =============================
   Events
============================= */
centerLabel.addEventListener('click', () => {
  const t = centerLabel.textContent.trim().toLowerCase();
  const which = (t === 'work' || t === 'about' || t === 'contact') ? t : 'work';
  openSection(which);
});
closeBtn.addEventListener('click', closeSection);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state === 'section') closeSection(); });

/* URL hash support */
function applyHash(){
  const h = (location.hash || '').replace('#','').toLowerCase();
  if (h === 'work' || h === 'about' || h === 'contact') openSection(h);
}
window.addEventListener('hashchange', applyHash);
window.addEventListener('load', applyHash);

/* =============================
   Background: stars + sparks
============================= */
const starHost = document.querySelector('.starry-background');
function createStars(count = 140){
  if (!starHost) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.2 + 0.8;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.top = `${Math.random()*100}%`;
    s.style.left = `${Math.random()*100}%`;
    s.style.animationDelay = `${Math.random()*3}s`;
    frag.appendChild(s);
  }
  starHost.appendChild(frag);
}
function launchSpark(){
  if (!starHost) return;
  const sp = document.createElement('div');
  sp.className = 'spark';
  const startX = Math.random()*window.innerWidth*0.3;
  const startY = window.innerHeight*(0.65 + Math.random()*0.35);
  sp.style.left = `${startX}px`;
  sp.style.top  = `${startY}px`;
  const dur = 4 + Math.random()*3; // 4–7s
  sp.style.animationDuration = `${dur}s`;
  starHost.appendChild(sp);
  setTimeout(() => sp.remove(), dur*1000 + 100);
}
createStars(140);
setInterval(launchSpark, 1400);

/* =============================
   Resize handling
============================= */
window.addEventListener('resize', () => {
  ({ clusterSize, centerR, petalR } = sizes());
  ringRadius = centerR + petalR + gap;
  orbitR = outwardOffsets.map(off => ringRadius + off);

  if (state === 'home'){
    petals.forEach((p, i) => setPetalAt(p, ringRadius, baseAngles[i]));
  } else if (state === 'section'){
    // snap petals to new perimeter positions to avoid drift
    const { w, h, m } = viewportRect();
    const W = w - 2*m, H = h - 2*m, L = 2*(W + H);
    petals.forEach((p, i) => {
      let d = ((rectDistances[i] % L) + L) % L;
      let x, y;
      if (d <= W){ x = m + d; y = m; }
      else if (d <= W + H){ x = m + W; y = m + (d - W); }
      else if (d <= W + H + W){ x = m + (W - (d - W - H)); y = m + H; }
      else { x = m; y = m + (H - (d - W - H - W)); }
      p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }
});