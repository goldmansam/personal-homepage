const cluster = document.getElementById('cluster');
const centerEl = document.getElementById('center');
const petals = Array.from(document.querySelectorAll('.petal'));
const centerLabel = document.getElementById('centerLabel');

// geometry based on rendered sizes
const clusterSize = cluster.getBoundingClientRect().width; // ~720
const cx = clusterSize/2, cy = clusterSize/2;
const centerR = centerEl.getBoundingClientRect().width / 2;   // ~140
const petalR  = petals[0].getBoundingClientRect().width / 2;  // ~42
const gap = 10;

const ringRadius = centerR + petalR + gap; // resting radius based on larger center

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

// varied outward distances (planet rings) — tuned for bigger center & 720px cluster
const outwardOffsets = [60, 85, 110, 75, 100, 90, 120, 70]; // px beyond ringRadius
const orbitR = outwardOffsets.map(off => ringRadius + off);

// orbit speeds (noticeably different)
const baseRPM = 0.9; // visible baseline
const baseOmega = (baseRPM * Math.PI*2) / 60; // rad/s
const speedFactors = [0.65, 0.8, 0.95, 1.15, 1.35, 0.72, 1.25, 1.0];
const omegas = speedFactors.map(f => baseOmega * f);

// glowing guide buttons — one active at a time
const buttons = petals.map(p => p.querySelector('.pulse-btn'));
let targetIndex = 0;
function setActiveButton(idx){
  buttons.forEach((b, i) => b.classList.toggle('active', i === idx));
}
setActiveButton(targetIndex); // start at the top circle

// unlock + orbit
let unlocked = false, rafId = null, startTime = null;

function startOrbit(){
  startTime = performance.now();
  function loop(now){
    const t = (now - startTime)/1000; // seconds
    for (let i=0; i<petals.length; i++){
      const a = baseAngles[i] + omegas[i]*t;
      petals[i].style.transform = petalTransform(orbitR[i], a);
    }
    rafId = requestAnimationFrame(loop);
  }
  if (!rafId) rafId = requestAnimationFrame(loop);

  // switch from title gradient to cycling section labels
  centerLabel.classList.remove('title-gradient'); // use per-section gradients next

  // center label cycle: Work → About → Contact (longer dwell)
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
  setInterval(cycle, 5000); // ~5s dwell between switches
}

function handlePetalClick(i){
  if (unlocked || i !== targetIndex) return;

  const p = petals[i];
  setPetalAt(p, orbitR[i], baseAngles[i]);
  p.dataset.expanded = 'true';

  const allExpanded = petals.every(el => el.dataset.expanded === 'true');
  if (allExpanded){
    // wait for THIS last transition to complete, then start orbit
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      p.removeEventListener('transitionend', onEnd);
      unlocked = true;
      setActiveButton(-1); // hide glow
      startOrbit();
    };
    p.addEventListener('transitionend', onEnd, { once: true });
  } else {
    // advance the glowing button clockwise
    targetIndex = (targetIndex + 1) % n;
    setActiveButton(targetIndex);
  }
}

// clicks: petal OR the glow button both work
petals.forEach((p, i) => {
  p.addEventListener('click', () => handlePetalClick(i));
  buttons[i].addEventListener('click', (ev) => { ev.stopPropagation(); handlePetalClick(i); });
});

// pause/resume animation if the tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden){
    if (rafId) cancelAnimationFrame(rafId), rafId = null;
  } else if (unlocked && !rafId){
    startOrbit();
  }
});