(() => {
  const bands = Array.from(document.querySelectorAll("[data-rising-lines]"));
  if (!bands.length) return;

  const TAU = Math.PI * 2;
  const gold = [226, 184, 88];
  const ivory = [255, 241, 202];

  const makeRng = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  const mountBand = (band, bandIndex) => {
    const canvas = document.createElement("canvas");
    canvas.className = "rising-lines-canvas";
    canvas.setAttribute("aria-hidden", "true");
    band.prepend(canvas);

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const rng = makeRng(0xc0ffee + bandIndex * 7919);
    let width = 0;
    let height = 0;
    let deviceScale = 1;
    let particles = [];
    let blobs = [];
    let frame = 0;
    let previousTime = 0;
    let visible = false;

    const sampleX = () => {
      if (rng() < 0.52) return rng() * width;
      return ((rng() + rng() + rng()) / 3) * width;
    };

    const resetParticle = (particle, initial = false) => {
      particle.x = sampleX();
      particle.y = initial ? rng() * height : height + rng() * 10;
      particle.speed = 14 + rng() * 34;
      particle.length = 16 + Math.pow(rng(), 0.62) * 52;
      particle.width = rng() < 0.82 ? 1 : 1.5;
    };

    const resetBlob = (blob, initial = false) => {
      blob.x = sampleX();
      blob.y = initial ? rng() * height : height + rng() * 12;
      blob.speed = 9 + rng() * 22;
      blob.radius = 1.2 + Math.pow(rng(), 1.7) * 3.8;
    };

    const resize = () => {
      const bounds = band.getBoundingClientRect();
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      deviceScale = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.floor(width * deviceScale);
      canvas.height = Math.floor(height * deviceScale);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

      const mobile = width <= 760;
      const target = Math.max(
        mobile ? 150 : 260,
        Math.floor((width * height) / (mobile ? 1180 : 860)),
      );
      const particleCount = Math.min(target, mobile ? 430 : 1450);
      const blobCount = Math.min(
        Math.floor(particleCount * 0.22),
        mobile ? 90 : 280,
      );

      particles = Array.from({ length: particleCount }, () => {
        const particle = {};
        resetParticle(particle, true);
        return particle;
      });
      blobs = Array.from({ length: blobCount }, () => {
        const blob = {};
        resetBlob(blob, true);
        return blob;
      });
    };

    const drawHorizon = () => {
      const radius = Math.max(34, Math.min(64, height * 0.2));
      context.save();
      context.translate(width / 2, height - 1);
      context.scale(Math.max(1, width / (radius * 1.75)), 1);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, "rgba(226,184,88,0.3)");
      gradient.addColorStop(0.38, "rgba(226,184,88,0.16)");
      gradient.addColorStop(0.76, "rgba(226,184,88,0.045)");
      gradient.addColorStop(1, "rgba(226,184,88,0)");
      context.fillStyle = gradient;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.restore();
    };

    const draw = (delta) => {
      if (!width || !height) return;
      const elapsed = Math.max(0.001, Math.min(0.05, delta));
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      drawHorizon();

      for (const blob of blobs) {
        blob.y -= blob.speed * elapsed;
        if (blob.y < -blob.radius * 2) resetBlob(blob);
        const progress = Math.max(0, Math.min(1, (height - blob.y) / height));
        const fade = Math.sin(progress * Math.PI) * 0.34;
        if (fade <= 0.006) continue;
        const gradient = context.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius,
        );
        gradient.addColorStop(0, `rgba(${ivory.join(",")},${fade})`);
        gradient.addColorStop(0.42, `rgba(${gold.join(",")},${fade * 0.42})`);
        gradient.addColorStop(1, `rgba(${gold.join(",")},0)`);
        context.fillStyle = gradient;
        context.fillRect(
          blob.x - blob.radius,
          blob.y - blob.radius,
          blob.radius * 2,
          blob.radius * 2,
        );
      }

      for (const particle of particles) {
        particle.y -= particle.speed * elapsed;
        if (particle.y < -particle.length) resetParticle(particle);
        const progress = Math.max(
          0,
          Math.min(1, (height - particle.y) / height),
        );
        const fade = Math.sin(progress * Math.PI) * 0.36;
        if (fade <= 0.006) continue;

        const gradient = context.createLinearGradient(
          0,
          particle.y,
          0,
          particle.y + particle.length,
        );
        gradient.addColorStop(0, `rgba(${gold.join(",")},0)`);
        gradient.addColorStop(0.68, `rgba(${gold.join(",")},${fade * 0.68})`);
        gradient.addColorStop(1, `rgba(${ivory.join(",")},${fade})`);
        context.fillStyle = gradient;
        context.fillRect(
          Math.floor(particle.x),
          Math.floor(particle.y),
          particle.width,
          particle.length,
        );
      }

      context.globalCompositeOperation = "source-over";
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };

    const loop = (time) => {
      if (!visible || document.hidden) {
        stop();
        return;
      }
      const delta = previousTime ? (time - previousTime) / 1000 : 1 / 60;
      previousTime = time;
      draw(delta);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!frame && visible && !document.hidden) {
        frame = requestAnimationFrame(loop);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(band);
    window.addEventListener("resize", resize, { passive: true });
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.02 },
    );
    visibilityObserver.observe(band);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    resize();
    draw(1 / 60);
  };

  bands.forEach(mountBand);
})();
