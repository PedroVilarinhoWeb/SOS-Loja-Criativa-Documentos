(() => {
  const container = document.querySelector("[data-logo-particles]");
  if (!(container instanceof HTMLElement)) return;

  const canvas = container.querySelector(".spiral-brand-particles");
  const fallback = container.querySelector(".spiral-brand-fallback");
  const source = container.dataset.logoSrc;
  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(fallback instanceof HTMLImageElement) ||
    !source
  ) {
    return;
  }

  const staticPreview = new URLSearchParams(window.location.search).has("static");
  if (staticPreview) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const image = new Image();
  image.decoding = "async";

  const pointer = {
    x: -10000,
    y: -10000,
    previousX: -10000,
    previousY: -10000,
    speed: 0,
    active: false,
  };

  let width = 0;
  let height = 0;
  let deviceScale = 1;
  let particles = [];
  let imageData = null;
  let animationFrame = 0;
  let introStart = 0;
  let introPlayed = false;
  let isVisible = true;

  const introDuration = 1250;
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);

  const schedule = () => {
    if (!animationFrame && isVisible && !document.hidden) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const drawParticle = (buffer, particle, opacity) => {
    const centerX = Math.round(particle.x * deviceScale);
    const centerY = Math.round(particle.y * deviceScale);
    const size = Math.max(2, Math.round(1.45 * deviceScale));
    const half = size / 2;
    const startX = centerX - (size >> 1);
    const startY = centerY - (size >> 1);
    const pixelWidth = canvas.width;
    const pixelHeight = canvas.height;
    const alpha = Math.round(particle.a * opacity);

    for (let offsetY = 0; offsetY < size; offsetY += 1) {
      const y = startY + offsetY;
      if (y < 0 || y >= pixelHeight) continue;

      for (let offsetX = 0; offsetX < size; offsetX += 1) {
        const deltaX = offsetX - half + 0.5;
        const deltaY = offsetY - half + 0.5;
        if (deltaX * deltaX + deltaY * deltaY > half * half) continue;

        const x = startX + offsetX;
        if (x < 0 || x >= pixelWidth) continue;

        const index = (y * pixelWidth + x) * 4;
        buffer[index] = particle.r;
        buffer[index + 1] = particle.g;
        buffer[index + 2] = particle.b;
        buffer[index + 3] = Math.max(buffer[index + 3], alpha);
      }
    }
  };

  const render = (time) => {
    animationFrame = 0;
    if (!imageData || !particles.length || !isVisible || document.hidden) return;

    imageData.data.fill(0);
    pointer.speed *= 0.86;

    const introProgress = introStart
      ? Math.min(1, Math.max(0, (time - introStart) / introDuration))
      : 1;
    const introEase = easeOut(introProgress);
    const pointerRadius = Math.max(42, Math.min(58, width * 0.18));
    const pointerRadiusSquared = pointerRadius * pointerRadius;
    let moving = introProgress < 1;

    particles.forEach((particle) => {
      if (introProgress < 1) {
        particle.x = particle.startX + (particle.homeX - particle.startX) * introEase;
        particle.y = particle.startY + (particle.homeY - particle.startY) * introEase;
      } else {
        if (pointer.active) {
          const deltaX = particle.x - pointer.x;
          const deltaY = particle.y - pointer.y;
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;

          if (distanceSquared > 0 && distanceSquared < pointerRadiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const force =
              (1 - distance / pointerRadius) *
              (0.8 + Math.min(2.4, pointer.speed * 0.055));
            particle.velocityX += (deltaX / distance) * force;
            particle.velocityY += (deltaY / distance) * force;
          }
        }

        particle.velocityX += (particle.homeX - particle.x) * 0.052;
        particle.velocityY += (particle.homeY - particle.y) * 0.052;
        particle.velocityX *= 0.82;
        particle.velocityY *= 0.82;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        if (
          Math.abs(particle.homeX - particle.x) > 0.025 ||
          Math.abs(particle.homeY - particle.y) > 0.025 ||
          Math.abs(particle.velocityX) > 0.025 ||
          Math.abs(particle.velocityY) > 0.025
        ) {
          moving = true;
        }
      }

      const opacity = introProgress < 1 ? 0.18 + introEase * 0.82 : 1;
      drawParticle(imageData.data, particle, opacity);
    });

    context.putImageData(imageData, 0, 0);
    if (!container.classList.contains("logo-particles-ready")) {
      container.classList.add("logo-particles-ready");
    }

    if (moving || pointer.active) schedule();
  };

  const buildParticles = () => {
    const nextWidth = Math.round(container.clientWidth);
    const nextHeight = Math.round(container.clientHeight);
    if (!nextWidth || !nextHeight || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    const dimensionsChanged = nextWidth !== width || nextHeight !== height;
    if (!dimensionsChanged && particles.length) return;

    width = nextWidth;
    height = nextHeight;
    deviceScale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * deviceScale);
    canvas.height = Math.round(height * deviceScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    imageData = context.createImageData(canvas.width, canvas.height);

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return;

    const imageRatio = image.naturalWidth / image.naturalHeight;
    const containerRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    if (imageRatio > containerRatio) {
      drawHeight = width / imageRatio;
    } else {
      drawWidth = height * imageRatio;
    }
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;
    sampleContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    let sourcePixels;
    try {
      sourcePixels = sampleContext.getImageData(0, 0, width, height).data;
    } catch (error) {
      console.warn("[SOS Logo] Não foi possível preparar o efeito de partículas.", error);
      return;
    }

    const gap = 2;
    const nextParticles = [];
    const spread = Math.min(width, height) * 0.46;

    for (let y = 0; y < height; y += gap) {
      for (let x = 0; x < width; x += gap) {
        const index = (y * width + x) * 4;
        const alpha = sourcePixels[index + 3];
        if (alpha < 24) continue;

        const angle = Math.random() * Math.PI * 2;
        const distance = spread * (0.18 + Math.sqrt(Math.random()) * 0.82);
        nextParticles.push({
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          startX: x + Math.cos(angle) * distance,
          startY: y + Math.sin(angle) * distance,
          homeX: x,
          homeY: y,
          velocityX: 0,
          velocityY: 0,
          r: sourcePixels[index],
          g: sourcePixels[index + 1],
          b: sourcePixels[index + 2],
          a: alpha,
        });
      }
    }

    particles = nextParticles;
    if (!introPlayed) {
      introPlayed = true;
      introStart = performance.now();
    } else {
      introStart = 0;
      particles.forEach((particle) => {
        particle.x = particle.homeX;
        particle.y = particle.homeY;
      });
    }
    schedule();
  };

  const updatePointer = (event) => {
    const bounds = container.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (pointer.previousX > -9000) {
      pointer.speed = Math.hypot(x - pointer.previousX, y - pointer.previousY);
    }
    pointer.previousX = x;
    pointer.previousY = y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    schedule();
  };

  const releasePointer = () => {
    pointer.active = false;
    pointer.previousX = -10000;
    pointer.previousY = -10000;
    schedule();
  };

  container.addEventListener("pointermove", updatePointer, { passive: true });
  container.addEventListener("pointerdown", updatePointer, { passive: true });
  container.addEventListener("pointerleave", releasePointer, { passive: true });
  container.addEventListener("pointercancel", releasePointer, { passive: true });
  window.addEventListener("pointerup", releasePointer, { passive: true });

  const resizeObserver = new ResizeObserver(buildParticles);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) schedule();
      else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    },
    { threshold: 0.04 },
  );
  visibilityObserver.observe(container);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      schedule();
    }
  });

  image.addEventListener("load", buildParticles, { once: true });
  image.addEventListener("error", () => {
    container.classList.remove("logo-particles-ready");
  });
  image.src = source;
})();
