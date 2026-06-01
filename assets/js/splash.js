/* ================================================================
   INFRADESK REMOTE – SPLASH SCREEN
   Animated network canvas + loading sequence
   Version: 2.4.1
================================================================ */

(function () {
  'use strict';

  /* ── Network Canvas Animation ─────────────────────────────── */
  const canvas  = document.getElementById('network-canvas');
  const ctx     = canvas.getContext('2d');
  let W, H, nodes, animFrame;

  const NODE_COUNT   = 60;
  const MAX_DIST     = 140;
  const NODE_COLORS  = ['#2563EB', '#1D4ED8', '#06B6D4', '#10B981', '#8B5CF6'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x:   Math.random() * W,
        y:   Math.random() * H,
        vx:  (Math.random() - 0.5) * 0.5,
        vy:  (Math.random() - 0.5) * 0.5,
        r:   Math.random() * 2.5 + 1,
        color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02
      });
    }
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.25;
          ctx.beginPath();
          ctx.strokeStyle = hexToRgba(nodes[i].color, alpha);
          ctx.lineWidth   = 0.8;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      n.pulse += n.pulseSpeed;
      const pr = n.r + Math.sin(n.pulse) * 1.2;

      // Glow
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 5);
      grd.addColorStop(0, hexToRgba(n.color, 0.4));
      grd.addColorStop(1, hexToRgba(n.color, 0));
      ctx.beginPath();
      ctx.arc(n.x, n.y, pr * 5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(n.color, 0.9);
      ctx.fill();

      // Move
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    animFrame = requestAnimationFrame(drawFrame);
  }

  /* ── Loading Messages ─────────────────────────────────────── */
  const MESSAGES = [
    'Initializing secure connection...',
    'Loading device agents...',
    'Establishing encrypted tunnel...',
    'Syncing organization data...',
    'Loading monitoring modules...',
    'Preparing dashboard...'
  ];

  const PROGRESS_STEPS = [0, 15, 35, 55, 72, 88, 100];

  function runLoadingSequence() {
    const bar   = document.getElementById('splash-loader-bar');
    const label = document.getElementById('splash-loader-label');
    let step    = 0;

    function nextStep() {
      if (step >= MESSAGES.length) {
        bar.style.width = '100%';
        setTimeout(hideSplash, 600);
        return;
      }
      bar.style.width   = PROGRESS_STEPS[step + 1] + '%';
      label.textContent = MESSAGES[step];
      step++;
      const delay = 300 + Math.random() * 400;
      setTimeout(nextStep, delay);
    }
    nextStep();
  }

  /* ── Hide Splash + Reveal App ─────────────────────────────── */
  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    const app    = document.getElementById('app-shell');

    splash.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    splash.style.opacity    = '0';
    splash.style.transform  = 'scale(1.03)';

    setTimeout(() => {
      splash.style.display = 'none';
      cancelAnimationFrame(animFrame);
      app.classList.remove('hidden');
      // Signal app.js to boot
      document.dispatchEvent(new CustomEvent('infradesk:ready'));
    }, 620);
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    resize();
    createNodes();
    drawFrame();
    window.addEventListener('resize', () => { resize(); createNodes(); });
    // Small delay so splash renders first
    setTimeout(runLoadingSequence, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
