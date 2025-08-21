/* ---------- Existing interactive system ---------- */
const cluster = document.getElementById('cluster');
const centerEl = document.getElementById('center');
const petals = Array.from(document.querySelectorAll('.petal'));
const centerLabel = document.getElementById('centerLabel');

// geometry
const clusterSize = cluster.getBoundingClientRect().width; // ~720
const centerR = centerEl.getBoundingClientRect().width / 2;   // ~140
const petalR  = petals[0].getBoundingClientRect().width / 2;  // ~42
const gap = 10;
const ringRadius = centerR + petalR + gap;

// helpers
function petalTransform(radius, angle){
  const x = Math.cos(angle)*radius;
  const y = Math.sin(angle)*radius;
  return `translate(-50%,-50%) translate(${x}px, ${y}px)`;
}
function setPetalAt(p, radius, angle){ p.style.transform = petalTransform(radius, angle); }

// place evenly, start at top (-90°), clockwise
const n = petals.length;
const baseAngles = new Array(n);
petals.forEach((p, i) => {
  const a = -Math.PI/2 + (i/n)*Math.PI*2;
  baseAngles[i] = a;
  setPetalAt(p, ringRadius, a);
  p.style.opacity = 1;
});

// varied outward distances and orbit speeds
const outwardOffsets = [60, 85, 110, 75, 100, 90, 120, 70];
const orbitR = outwardOffsets.map(off => ringRadius + off);

const baseRPM = 0.9;
const baseOmega = (baseRPM * Math.PI*2) / 60; // rad/s
const speedFactors = [0.65, 0.8, 0.95, 1.15, 1.35, 0.72, 1.25, 1.0];
const omegas = speedFactors.map(f => baseOmega * f);

// glow button guidance (clockwise)
const buttons = petals.map(p => p.querySelector('.pulse-btn'));
let targetIndex = 0;
function setActiveButton(idx){ buttons.forEach((b, i) => b.classList.toggle('active', i === idx)); }
setActiveButton(targetIndex);

let unlocked = false, rafId = null, startTime = null;

function startOrbit(){
  startTime = performance.now();
  function loop(now){
    const t = (now - startTime)/1000;
    for (let i=0; i<petals.length; i++){
      const a = baseAngles[i] + omegas[i]*t;
      petals[i].style.transform = petalTransform(orbitR[i], a);
    }
    rafId = requestAnimationFrame(loop);
  }
  if (!rafId) rafId = requestAnimationFrame(loop);

  // switch from title gradient to cycling section labels
  centerLabel.classList.remove('title-gradient');

  // center label cycle: Work → About → Contact
  const names = ['Work','About','Contact'];
  const grads = [
    'linear-gradient(135deg,#ff6b6b,#ffb199)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)'
  ];
  let idx = 0;

  function cycle(){
    centerLabel.classList.add('gradient-text');
    centerLabel.style.filter = 'blur(6px)';
    centerLabel.style.opacity = 0;
    setTimeout(() => {
      centerLabel.textContent = names[idx % names.length];
      centerLabel.style.backgroundImage = grads[idx % grads.length];
      idx++;
      centerLabel.style.filter = 'blur(0px)';
      centerLabel.style.opacity = 1;
    }, 420);
  }
  cycle();
  setInterval(cycle, 5000);
}

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
      startOrbit();
    };
    p.addEventListener('transitionend', onEnd, { once: true });
  } else {
    targetIndex = (targetIndex + 1) % n;
    setActiveButton(targetIndex);
  }
}

// clicks: petal OR the glow button both work
petals.forEach((p, i) => {
  p.addEventListener('click', () => handlePetalClick(i));
  buttons[i].addEventListener('click', (ev) => { ev.stopPropagation(); handlePetalClick(i); });
});

// pause/resume orbits when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden){
    if (rafId) cancelAnimationFrame(rafId), rafId = null;
  } else if (unlocked && !rafId){
    startOrbit();
  }
});

/* ---------- NEW: starfield + spark trails ---------- */
const starHost = document.querySelector('.starry-background');

function createStars(count = 120){
  if (!starHost) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.2 + 0.8;   // 0.8px – 3px
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

  // start near bottom-left-ish with randomness
  const startX = Math.random()*window.innerWidth*0.3;  // left 0–30vw
  const startY = window.innerHeight*(0.65 + Math.random()*0.35); // lower 65–100vh
  sp.style.left = `${startX}px`;
  sp.style.top  = `${startY}px`;

  // vary duration a bit
  const dur = 4 + Math.random()*3; // 4–7s
  sp.style.animationDuration = `${dur}s`;

  starHost.appendChild(sp);
  setTimeout(() => sp.remove(), dur*1000 + 100);
}

// initialize
createStars(140);
setInterval(launchSpark, 1400);