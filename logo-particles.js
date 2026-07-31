(() => {
  const container = document.querySelector("[data-logo-particles]");
  if (!(container instanceof HTMLElement)) return;

  const canvas = container.querySelector(".hero-logo-particles");
  const fallback = container.querySelector(".hero-logo-fallback");
  const lens = container.querySelector(".hero-logo-lens");
  const lensImage = container.querySelector(".hero-logo-lens-image");
  const source = container.dataset.logoSrc;
  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(fallback instanceof HTMLImageElement) ||
    !(lens instanceof HTMLElement) ||
    !(lensImage instanceof HTMLImageElement) ||
    !source
  ) {
    return;
  }

  const staticPreview = new URLSearchParams(window.location.search).has("static");
  if (staticPreview) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const sourceImage = new Image();
  sourceImage.decoding = "async";

  let width = 0;
  let height = 0;
  let deviceScale = 1;
  let particles = [];
  let imageData = null;
  let animationFrame = 0;
  let introStart = 0;
  let introPlayed = false;
  let replayPending = false;
  let isVisible = true;

  const introDuration = 2600;
  const easeInOut = (value) =>
    value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;

  const scheduleIntro = () => {
    if (!animationFrame && isVisible && !document.hidden) {
      animationFrame = requestAnimationFrame(renderIntro);
    }
  };

  const drawParticle = (buffer, particle, opacity) => {
    const centerX = Math.round(particle.x * deviceScale);
    const centerY = Math.round(particle.y * deviceScale);
    const size = Math.max(2, Math.round(1.05 * deviceScale));
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

  function renderIntro(time) {
    animationFrame = 0;
    if (!imageData || !particles.length || !isVisible || document.hidden) return;

    imageData.data.fill(0);
    const progress = introStart
      ? Math.min(1, Math.max(0, (time - introStart) / introDuration))
      : 1;
    const easedProgress = easeInOut(progress);

    particles.forEach((particle) => {
      particle.x =
        particle.startX + (particle.homeX - particle.startX) * easedProgress;
      particle.y =
        particle.startY + (particle.homeY - particle.startY) * easedProgress;
      drawParticle(
        imageData.data,
        particle,
        0.14 + easedProgress * 0.86,
      );
    });

    context.putImageData(imageData, 0, 0);
    container.classList.add("logo-particles-ready");

    if (progress < 1) {
      scheduleIntro();
    } else {
      container.classList.add("logo-particles-settled");
    }
  }

  const buildParticles = () => {
    const nextWidth = Math.round(container.clientWidth);
    const nextHeight = Math.round(container.clientHeight);
    if (
      !nextWidth ||
      !nextHeight ||
      !sourceImage.naturalWidth ||
      !sourceImage.naturalHeight
    ) {
      return;
    }

    const dimensionsChanged = nextWidth !== width || nextHeight !== height;
    if (!dimensionsChanged && particles.length) return;

    width = nextWidth;
    height = nextHeight;
    deviceScale = Math.max(
      1.5,
      Math.min(2.5, window.devicePixelRatio || 1),
    );
    canvas.width = Math.round(width * deviceScale);
    canvas.height = Math.round(height * deviceScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    imageData = context.createImageData(canvas.width, canvas.height);

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!sampleContext) return;

    const imageRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
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
    sampleContext.drawImage(
      sourceImage,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    let sourcePixels;
    try {
      sourcePixels = sampleContext.getImageData(0, 0, width, height).data;
    } catch (error) {
      console.warn("[SOS Logo] Não foi possível preparar as partículas.", error);
      return;
    }

    const nextParticles = [];
    const spread = Math.min(width, height) * 0.46;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
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
      container.classList.remove("logo-particles-settled");
      scheduleIntro();
    }
  };

  const lensState = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    frame: 0,
    visible: false,
  };

  const positionLens = () => {
    lensState.frame = 0;
    if (!lensState.visible) return;

    lensState.currentX += (lensState.targetX - lensState.currentX) * 0.28;
    lensState.currentY += (lensState.targetY - lensState.currentY) * 0.28;

    const lensSize = lens.offsetWidth;
    const half = lensSize / 2;
    const centerX = Math.min(width - half, Math.max(half, lensState.currentX));
    const centerY = Math.min(height - half, Math.max(half, lensState.currentY));
    const zoom = 1.24;

    lens.style.left = `${centerX - half}px`;
    lens.style.top = `${centerY - half}px`;
    lensImage.style.width = `${width * zoom}px`;
    lensImage.style.height = `${height * zoom}px`;
    lensImage.style.left = `${half - lensState.currentX * zoom}px`;
    lensImage.style.top = `${half - lensState.currentY * zoom}px`;

    if (
      Math.abs(lensState.targetX - lensState.currentX) > 0.1 ||
      Math.abs(lensState.targetY - lensState.currentY) > 0.1
    ) {
      lensState.frame = requestAnimationFrame(positionLens);
    }
  };

  const showLens = (event) => {
    if (!container.classList.contains("logo-particles-settled")) return;

    const bounds = container.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (!lensState.visible) {
      lensState.currentX = x;
      lensState.currentY = y;
    }
    lensState.targetX = x;
    lensState.targetY = y;
    lensState.visible = true;
    container.classList.add("logo-lens-active");
    if (!lensState.frame) lensState.frame = requestAnimationFrame(positionLens);
  };

  const hideLens = () => {
    lensState.visible = false;
    container.classList.remove("logo-lens-active");
    if (lensState.frame) cancelAnimationFrame(lensState.frame);
    lensState.frame = 0;
  };

  const replayIntro = () => {
    hideLens();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    introStart = 0;
    replayPending = true;
    container.classList.remove("logo-particles-settled");

    particles.forEach((particle) => {
      particle.x = particle.startX;
      particle.y = particle.startY;
    });

    if (isVisible && particles.length) {
      replayPending = false;
      introStart = performance.now();
      scheduleIntro();
    }
  };

  container.addEventListener("pointermove", showLens, { passive: true });
  container.addEventListener("pointerdown", showLens, { passive: true });
  container.addEventListener("pointerleave", hideLens, { passive: true });
  container.addEventListener("pointercancel", hideLens, { passive: true });
  window.addEventListener("pointerup", hideLens, { passive: true });
  window.addEventListener("sos:replay-logo", replayIntro);

  const resizeObserver = new ResizeObserver(buildParticles);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && introPlayed && !container.classList.contains("logo-particles-settled")) {
        if (replayPending || !introStart) {
          replayPending = false;
          introStart = performance.now();
        }
        scheduleIntro();
      } else if (!isVisible && animationFrame) {
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
    } else if (!document.hidden) {
      scheduleIntro();
    }
  });

  sourceImage.addEventListener("load", buildParticles, { once: true });
  sourceImage.addEventListener("error", () => {
    container.classList.remove(
      "logo-particles-ready",
      "logo-particles-settled",
    );
  });
  sourceImage.src = source;
})();
