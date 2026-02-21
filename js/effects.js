/* effects.js — Canvas bust effect system */

var Effects = (function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var shockwaves = [];
  var bustTexts = [];
  var animId = null;
  var lastTime = 0;

  /* ---------- Canvas management ---------- */

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;width:100vw;height:100dvh';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function removeCanvas() {
    if (!canvas) return;
    window.removeEventListener('resize', resizeCanvas);
    canvas.remove();
    canvas = null;
    ctx = null;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  /* ---------- Effect creation ---------- */

  function createBustText(x, y) {
    bustTexts.push({
      x: x, y: y,
      life: 1.4,
      maxLife: 1.4,
      // phases: 0-0.15s scale in, 0.15-0.9s shake, 0.9-1.4s fade out
      scaleInEnd: 0.15,
      shakeEnd: 0.9
    });
  }

  function createShockwave(x, y) {
    shockwaves.push({
      x: x, y: y,
      radius: 5,
      maxRadius: 120,
      life: 0.5,
      maxLife: 0.5
    });
  }

  /* ---------- Animation loop ---------- */

  function startLoop() {
    if (animId) return;
    lastTime = performance.now();
    animId = requestAnimationFrame(tick);
  }

  function tick(now) {
    var dt = (now - lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    lastTime = now;

    update(dt);
    draw();

    if (shockwaves.length === 0 && bustTexts.length === 0) {
      removeCanvas();
      return;
    }

    animId = requestAnimationFrame(tick);
  }

  function update(dt) {
    // Update shockwaves
    for (var j = shockwaves.length - 1; j >= 0; j--) {
      var sw = shockwaves[j];
      sw.life -= dt;
      if (sw.life <= 0) {
        shockwaves.splice(j, 1);
        continue;
      }
      var progress = 1 - sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * progress;
    }

    // Update bust texts
    for (var k = bustTexts.length - 1; k >= 0; k--) {
      bustTexts[k].life -= dt;
      if (bustTexts[k].life <= 0) {
        bustTexts.splice(k, 1);
      }
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw shockwaves (additive blending for glow)
    ctx.globalCompositeOperation = 'lighter';
    for (var s = 0; s < shockwaves.length; s++) {
      var sw = shockwaves[s];
      var swAlpha = (sw.life / sw.maxLife) * 0.4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,50,' + swAlpha + ')';
      ctx.lineWidth = 3 * (sw.life / sw.maxLife);
      ctx.stroke();
    }

    // Draw bust texts (source-over so text is solid)
    ctx.globalCompositeOperation = 'source-over';
    for (var bt = 0; bt < bustTexts.length; bt++) {
      var txt = bustTexts[bt];
      var elapsed = txt.maxLife - txt.life;
      var alpha = 1;
      var scale = 1;
      var shakeX = 0, shakeY = 0;

      if (elapsed < txt.scaleInEnd) {
        // Scale in: 0 -> 1
        scale = elapsed / txt.scaleInEnd;
        scale = scale * (2 - scale); // ease-out
      } else if (elapsed < txt.shakeEnd) {
        // Shake phase
        var shakeIntensity = 4;
        shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
        shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
      } else {
        // Fade out
        var fadeProgress = (elapsed - txt.shakeEnd) / (txt.maxLife - txt.shakeEnd);
        alpha = 1 - fadeProgress;
        alpha = Math.max(0, alpha);
      }

      ctx.save();
      ctx.translate(txt.x + shakeX, txt.y + shakeY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Black outline
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 5;
      ctx.strokeText('Bust!', 0, 0);
      // Red fill
      ctx.fillStyle = '#e53935';
      ctx.fillText('Bust!', 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Public API ---------- */

  function explosion(x, y) {
    ensureCanvas();
    createShockwave(x, y);
    createBustText(x, y);
    startLoop();
    return new Promise(function (resolve) {
      setTimeout(resolve, 500);
    });
  }

  return {
    explosion: explosion
  };

})();
