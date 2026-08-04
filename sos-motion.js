(() => {
  const parameters = new URLSearchParams(window.location.search);
  const staticMode = parameters.has("static") || parameters.has("reduce-motion");
  let motionPaused = document.documentElement.classList.contains("motion-paused");
  const canAnimate = () => !staticMode && !motionPaused;

  document.documentElement.classList.toggle("motion-enabled", canAnimate());
  window.addEventListener("sos:motion-change", (event) => {
    motionPaused = Boolean(event.detail?.paused);
    document.documentElement.classList.toggle("motion-enabled", canAnimate());
  });

  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));

  const seededRandom = (seed) => {
    let state = seed || 1;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  };

  const resizeCanvas = (canvas, context, width, height, limit = 1.75) => {
    const scale = Math.min(window.devicePixelRatio || 1, limit);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    return scale;
  };

  function mountGoldenRain(host, hostIndex) {
    const canvas = document.createElement("canvas");
    canvas.className = "sos-rain-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const random = seededRandom(0x51f15e + hostIndex * 997);
    const state = {
      width: 1,
      height: 1,
      scale: 1,
      drops: [],
      frame: 0,
      frameCount: 0,
      lastTime: 0,
      visible: false,
      trailStroke: null,
    };

    const resetDrop = (drop, spreadVertically) => {
      drop.anchorX = random() * state.width;
      drop.y = spreadVertically
        ? random() * (state.height + 80) - 40
        : -30 - random() * 90;
      drop.speed = 22 + random() * 44;
      drop.length = 12 + Math.pow(random(), 0.55) * 50;
      drop.sway = 1.5 + random() * 8;
      drop.phase = random() * Math.PI * 2;
      drop.phaseSpeed = 0.3 + random() * 0.65;
      drop.alpha = 0.12 + random() * 0.32;
      drop.lineWidth = random() > 0.88 ? 1.35 : 0.72;
      drop.bright = random() > 0.82;
    };

    const rebuild = () => {
      const bounds = host.getBoundingClientRect();
      state.width = Math.max(1, Math.round(bounds.width));
      state.height = Math.max(1, Math.round(bounds.height));
      const mobile = state.width <= 760;
      state.scale = resizeCanvas(
        canvas,
        context,
        state.width,
        state.height,
        mobile ? 1 : 1.35,
      );

      const density = mobile ? 3200 : 2150;
      const count = clamp(
        Math.round((state.width * state.height) / density),
        mobile ? 60 : 110,
        mobile ? 180 : 420,
      );
      state.drops = Array.from({ length: count }, () => {
        const drop = {};
        resetDrop(drop, true);
        return drop;
      });
      state.trailStroke = context.createLinearGradient(0, 0, 0, state.height);
      state.trailStroke.addColorStop(0, "rgba(180,135,43,0.72)");
      state.trailStroke.addColorStop(0.5, "rgba(255,241,202,0.96)");
      state.trailStroke.addColorStop(1, "rgba(180,135,43,0.72)");
      drawRain(0, 0);
    };

    const drawRain = (elapsed, time) => {
      context.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      context.clearRect(0, 0, state.width, state.height);
      context.globalCompositeOperation = "lighter";

      for (const drop of state.drops) {
        if (elapsed) {
          drop.y += drop.speed * elapsed;
          drop.phase += drop.phaseSpeed * elapsed;
          if (drop.y - drop.length > state.height + 30) resetDrop(drop, false);
        }

        const headX = drop.anchorX + Math.sin(drop.phase + time * 0.00012) * drop.sway;
        const edgeFade = Math.min(
          1,
          Math.max(0, drop.y / 75),
          Math.max(0, (state.height + drop.length - drop.y) / 90),
        );
        const alpha = drop.alpha * edgeFade;
        if (alpha < 0.01) continue;

        context.globalAlpha = alpha;
        context.strokeStyle = state.trailStroke;
        context.lineWidth = drop.lineWidth;
        context.beginPath();
        context.moveTo(headX - Math.sin(drop.phase) * 1.8, drop.y - drop.length);
        context.quadraticCurveTo(
          headX + Math.cos(drop.phase) * drop.sway * 0.35,
          drop.y - drop.length * 0.45,
          headX,
          drop.y,
        );
        context.stroke();

        if (drop.bright) {
          context.fillStyle = `rgba(255,241,202,${Math.min(0.72, alpha * 1.45)})`;
          context.fillRect(headX - 0.7, drop.y - 0.7, 1.4, 1.4);
        }
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };

    const stop = () => {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.lastTime = 0;
    };

    const tick = (time) => {
      state.frame = 0;
      state.frameCount += 1;
      canvas.dataset.frame = String(state.frameCount);
      if (!state.visible || document.hidden || !canAnimate()) {
        drawRain(0, time);
        return;
      }
      const elapsed = state.lastTime
        ? clamp((time - state.lastTime) / 1000, 0.001, 0.05)
        : 1 / 60;
      state.lastTime = time;
      drawRain(elapsed, time);
      state.frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!state.frame && state.visible && !document.hidden && canAnimate()) {
        canvas.dataset.motion = "running";
        state.frame = requestAnimationFrame(tick);
      } else if (!canAnimate()) {
        canvas.dataset.motion = "paused";
        stop();
        drawRain(0, 0);
      } else {
        canvas.dataset.motion = "stopped";
      }
    };

    new ResizeObserver(rebuild).observe(host);
    new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) start();
        else {
          canvas.dataset.motion = "stopped";
          stop();
        }
      },
      { threshold: 0.02 },
    ).observe(host);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("sos:motion-change", start);
    rebuild();
  }

  function mountPlanFlow(section) {
    const canvas = document.createElement("canvas");
    canvas.className = "sos-flow-canvas";
    canvas.setAttribute("aria-hidden", "true");
    section.prepend(canvas);

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const state = {
      width: 1,
      height: 1,
      scale: 1,
      frame: 0,
      frameCount: 0,
      visible: false,
      pointerX: 0.5,
      pointerY: 0.46,
      targetX: 0.5,
      targetY: 0.46,
      mobile: false,
      lastDraw: 0,
    };

    const resize = () => {
      const bounds = section.getBoundingClientRect();
      state.width = Math.max(1, Math.round(bounds.width));
      state.height = Math.max(1, Math.round(bounds.height));
      state.mobile = state.width < 600;
      state.scale = resizeCanvas(
        canvas,
        context,
        state.width,
        state.height,
        state.mobile ? 1 : 1.4,
      );
      drawFlow(0);
    };

    const drawFlow = (time) => {
      const { width, height } = state;
      context.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      context.clearRect(0, 0, width, height);

      state.pointerX += (state.targetX - state.pointerX) * 0.055;
      state.pointerY += (state.targetY - state.pointerY) * 0.055;

      const mobile = state.mobile;
      const lineCount = mobile ? 20 : 34;
      const pointerX = state.pointerX * width;
      const pointerY = state.pointerY * height;
      const reach = Math.max(130, height * 0.28);
      const drift = canAnimate() ? time * 0.00022 : 0;

      context.lineCap = "round";
      for (let index = 0; index < lineCount; index += 1) {
        const row = (index + 0.5) / lineCount;
        const baseY = row * height;
        const distance = Math.abs(baseY - pointerY);
        const influence = Math.max(0, 1 - distance / reach);
        const wave = Math.sin(drift + index * 0.72) * (mobile ? 9 : 16);
        const attraction = (pointerY - baseY) * influence * 0.42;
        const horizontalPull = (pointerX - width / 2) * influence * 0.13;

        context.beginPath();
        context.moveTo(-24, baseY + wave * 0.35);
        context.bezierCurveTo(
          width * 0.24 + horizontalPull,
          baseY + wave + attraction * 0.35,
          width * 0.58 + horizontalPull * 0.55,
          baseY - wave * 0.45 + attraction,
          width + 24,
          baseY + wave * 0.2,
        );
        context.strokeStyle =
          index % 7 === 0
            ? `rgba(255,241,202,${0.18 + influence * 0.14})`
            : `rgba(226,184,88,${0.17 + influence * 0.25})`;
        context.lineWidth = index % 7 === 0 ? 1.05 : 0.72;
        context.stroke();
      }
    };

    const stop = () => {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.lastDraw = 0;
    };

    const tick = (time) => {
      state.frame = 0;
      state.frameCount += 1;
      canvas.dataset.frame = String(state.frameCount);
      if (state.mobile && state.lastDraw && time - state.lastDraw < 32) {
        state.frame = requestAnimationFrame(tick);
        return;
      }
      state.lastDraw = time;
      drawFlow(time);
      if (state.visible && !document.hidden && canAnimate()) {
        state.frame = requestAnimationFrame(tick);
      }
    };

    const start = () => {
      stop();
      if (state.visible && !document.hidden && canAnimate()) {
        canvas.dataset.motion = "running";
        state.frame = requestAnimationFrame(tick);
      } else {
        canvas.dataset.motion = canAnimate() ? "stopped" : "paused";
        drawFlow(0);
      }
    };

    const updatePointer = (event) => {
      const bounds = section.getBoundingClientRect();
      state.targetX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      state.targetY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    };

    section.addEventListener("pointermove", updatePointer, { passive: true });
    section.addEventListener("pointerdown", updatePointer, { passive: true });
    new ResizeObserver(resize).observe(section);
    new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) start();
        else {
          canvas.dataset.motion = "stopped";
          stop();
        }
      },
      { threshold: 0.02 },
    ).observe(section);
    document.addEventListener("visibilitychange", start);
    window.addEventListener("sos:motion-change", start);
    resize();
  }

  function mountLogoReveal(container) {
    const canvas = container.querySelector(".hero-logo-reveal");
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

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const image = new Image();
    image.decoding = "async";
    const state = {
      width: 1,
      height: 1,
      scale: 1,
      points: [],
      frame: 0,
      frameCount: 0,
      elapsed: 0,
      lastFrameTime: 0,
      visible: true,
      built: false,
      settled: false,
      replayRequested: false,
    };
    const duration = 3100;

    const easeArrival = (value) => 1 - Math.pow(1 - value, 3);

    const drawPoint = (point, progress) => {
      const local = clamp((progress - point.delay) / (1 - point.delay), 0, 1);
      if (local <= 0) return;
      const eased = easeArrival(local);
      const curve = Math.sin(local * Math.PI) * point.curve;
      const x = point.startX + (point.x - point.startX) * eased + curve;
      const y = point.startY + (point.y - point.startY) * eased - curve * 0.22;
      context.globalAlpha = point.alpha * Math.min(1, local * 2.4);
      context.fillStyle = point.gold ? "#b4872b" : "#173d34";
      context.fillRect(x, y, point.size, point.size);
    };

    const drawLogo = (time) => {
      state.frame = 0;
      state.frameCount += 1;
      container.dataset.frame = String(state.frameCount);
      if (!state.built || document.hidden) return;
      if (!state.visible) {
        state.replayRequested = true;
        return;
      }
      state.replayRequested = false;

      if (state.lastFrameTime) {
        state.elapsed += clamp(time - state.lastFrameTime, 0, 50);
      }
      state.lastFrameTime = time;
      const progress = clamp(state.elapsed / duration, 0, 1);
      context.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      context.clearRect(0, 0, state.width, state.height);
      for (const point of state.points) drawPoint(point, progress);
      context.globalAlpha = 1;
      container.classList.add("logo-reveal-active");

      if (progress < 1) {
        container.dataset.motion = "running";
        state.frame = requestAnimationFrame(drawLogo);
      } else {
        state.settled = true;
        container.dataset.motion = "settled";
        container.classList.add("logo-reveal-settled");
      }
    };

    const settle = () => {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.lastFrameTime = 0;
      state.settled = true;
      container.dataset.motion = "settled";
      container.classList.remove("logo-reveal-active");
      container.classList.add("logo-reveal-settled");
    };

    const play = () => {
      if (!state.built || !state.visible || document.hidden) return;
      if (!canAnimate()) {
        settle();
        return;
      }
      if (state.frame) cancelAnimationFrame(state.frame);
      state.settled = false;
      container.dataset.motion = "running";
      state.elapsed = 0;
      state.lastFrameTime = 0;
      container.classList.remove("logo-reveal-settled");
      container.classList.add("logo-reveal-active");
      state.frame = requestAnimationFrame(drawLogo);
    };

    const build = () => {
      const width = Math.round(container.clientWidth);
      const height = Math.round(container.clientHeight);
      if (!width || !height || !image.naturalWidth || !image.naturalHeight) return;
      if (state.built && width === state.width && height === state.height) return;

      state.width = width;
      state.height = height;
      state.scale = resizeCanvas(canvas, context, width, height, 2);

      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = width;
      sampleCanvas.height = height;
      const sampleContext = sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sampleContext) return;

      const imageRatio = image.naturalWidth / image.naturalHeight;
      const areaRatio = width / height;
      const drawWidth = imageRatio > areaRatio ? width : height * imageRatio;
      const drawHeight = imageRatio > areaRatio ? width / imageRatio : height;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      sampleContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      let pixels;
      try {
        pixels = sampleContext.getImageData(0, 0, width, height).data;
      } catch (error) {
        console.warn("[SOS] Nao foi possivel preparar o logotipo animado.", error);
        settle();
        return;
      }

      const random = seededRandom(0x50534f53 + width * 31 + height);
      const step = width < 370 ? 4 : 3;
      const points = [];
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const pixel = (y * width + x) * 4;
          const alpha = pixels[pixel + 3];
          if (alpha < 36) continue;

          const side = Math.floor(random() * 4);
          const margin = 22 + random() * 70;
          let startX = x;
          let startY = y;
          if (side === 0) {
            startX = -margin;
            startY = random() * height;
          } else if (side === 1) {
            startX = width + margin;
            startY = random() * height;
          } else if (side === 2) {
            startX = random() * width;
            startY = -margin;
          } else {
            startX = random() * width;
            startY = height + margin;
          }

          points.push({
            x,
            y,
            startX,
            startY,
            delay: random() * 0.17 + (y / height) * 0.06,
            curve: (random() - 0.5) * Math.min(width, height) * 0.12,
            alpha: alpha / 255,
            size: Math.max(1.7, step * 0.72),
            gold: pixels[pixel] > pixels[pixel + 1],
          });
        }
      }

      state.points = points;
      state.built = points.length > 0;
      if (state.settled) settle();
      else play();
    };

    const hideLens = () => container.classList.remove("logo-lens-active");

    const moveLens = (event) => {
      if (!state.settled) return;
      const bounds = container.getBoundingClientRect();
      const lensSize = lens.offsetWidth;
      const half = lensSize / 2;
      const x = clamp(event.clientX - bounds.left, half, bounds.width - half);
      const y = clamp(event.clientY - bounds.top, half, bounds.height - half);
      const zoom = 1.24;

      lens.style.left = `${x - half}px`;
      lens.style.top = `${y - half}px`;
      lensImage.style.width = `${bounds.width * zoom}px`;
      lensImage.style.height = `${bounds.height * zoom}px`;
      lensImage.style.left = `${half - x * zoom}px`;
      lensImage.style.top = `${half - y * zoom}px`;
      container.classList.add("logo-lens-active");
    };

    container.addEventListener("pointermove", moveLens, { passive: true });
    container.addEventListener("pointerdown", moveLens, { passive: true });
    container.addEventListener("pointerleave", hideLens, { passive: true });
    container.addEventListener("pointercancel", hideLens, { passive: true });
    window.addEventListener("pointerup", hideLens, { passive: true });
    window.addEventListener("sos:replay-logo", () => {
      hideLens();
      state.replayRequested = true;
      play();
    });

    new ResizeObserver(build).observe(container);
    new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (!state.visible && state.frame) {
          cancelAnimationFrame(state.frame);
          state.frame = 0;
          state.lastFrameTime = 0;
        } else if (state.visible && state.replayRequested) {
          play();
        } else if (state.visible && state.built && !state.settled && !state.frame) {
          if (canAnimate()) state.frame = requestAnimationFrame(drawLogo);
          else settle();
        }
      },
      { threshold: 0.04 },
    ).observe(container);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.frame) {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
        state.lastFrameTime = 0;
      } else if (!document.hidden && state.visible && state.replayRequested) {
        play();
      } else if (!document.hidden && state.visible && state.built && !state.settled) {
        if (canAnimate()) state.frame = requestAnimationFrame(drawLogo);
        else settle();
      }
    });
    window.addEventListener("sos:motion-change", () => {
      hideLens();
      if (!canAnimate()) {
        container.dataset.motion = "paused";
        if (state.frame) cancelAnimationFrame(state.frame);
        state.frame = 0;
        state.lastFrameTime = 0;
      } else if (state.visible && state.built && !state.settled && !state.frame) {
        container.dataset.motion = "running";
        state.frame = requestAnimationFrame(drawLogo);
      } else if (state.settled) {
        container.dataset.motion = "settled";
      }
    });
    image.addEventListener("load", build, { once: true });
    image.addEventListener("error", settle, { once: true });
    image.src = source;
  }

  function mountPlanCarousel() {
    const carousel = document.querySelector("[data-plan-carousel]");
    const badge = document.querySelector("[data-plan-carousel-badge]");
    const text = document.querySelector("[data-plan-carousel-text]");
    if (
      !(carousel instanceof HTMLElement) ||
      !(badge instanceof HTMLElement) ||
      !(text instanceof HTMLElement) ||
      !Array.isArray(window.sosPlanTitles)
    ) {
      return;
    }

    const titles = window.sosPlanTitles.map((title) =>
      title.replace(/^SOS-(\d+)\s+/, "$1 \u00b7 "),
    );
    let index = 0;
    let timer = 0;
    let visible = true;
    let changing = false;
    let activeAnimation = null;
    let changeCount = 0;

    const fitBadge = () => {
      const style = getComputedStyle(badge);
      const padding =
        Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      badge.style.width = `${Math.ceil(text.scrollWidth + padding)}px`;
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (!canAnimate() || !visible || document.hidden) {
        carousel.dataset.motion = canAnimate() ? "stopped" : "paused";
        return;
      }
      carousel.dataset.motion = "running";
      timer = window.setTimeout(changeTitle, 2700);
    };

    const animateText = async (frames, options) => {
      if (typeof text.animate !== "function") return canAnimate();
      const animation = text.animate(frames, options);
      activeAnimation = animation;
      try {
        await animation.finished;
        animation.commitStyles?.();
      } catch {
        // A preference de movimento pode cancelar a transição em curso.
      } finally {
        animation.cancel();
        if (activeAnimation === animation) activeAnimation = null;
      }
      return canAnimate();
    };

    const changeTitle = async () => {
      if (changing || !canAnimate() || !visible || document.hidden) {
        schedule();
        return;
      }
      changing = true;

      const continueAfterExit = await animateText(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-9px)" },
        ],
        { duration: 180, easing: "ease-in", fill: "forwards" },
      );
      if (!continueAfterExit) {
        changing = false;
        text.style.opacity = "1";
        text.style.transform = "translateY(0)";
        fitBadge();
        return;
      }

      const previousWidth = badge.getBoundingClientRect().width;
      index = (index + 1) % titles.length;
      changeCount += 1;
      carousel.dataset.frame = String(changeCount);
      text.textContent = titles[index];
      badge.style.width = "auto";
      const nextWidth = badge.getBoundingClientRect().width;
      badge.style.width = `${previousWidth}px`;
      void badge.offsetWidth;
      badge.style.width = `${nextWidth}px`;

      await animateText(
        [
          { opacity: 0, transform: "translateY(9px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 340,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      changing = false;
      schedule();
    };

    text.textContent = titles[0];
    requestAnimationFrame(fitBadge);
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.05 },
    ).observe(carousel);
    window.addEventListener("resize", fitBadge, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("sos:motion-change", () => {
      window.clearTimeout(timer);
      activeAnimation?.cancel();
      activeAnimation = null;
      changing = false;
      text.style.opacity = "1";
      text.style.transform = "translateY(0)";
      fitBadge();
      schedule();
    });
  }

  window.sosPlanTitles = Array.from(
    document.querySelectorAll(".visually-hidden li"),
    (item) => item.textContent.trim(),
  );

  document.querySelectorAll("[data-sos-rain]").forEach(mountGoldenRain);
  document.querySelectorAll("[data-sos-flow]").forEach(mountPlanFlow);
  document.querySelectorAll("[data-sos-logo]").forEach(mountLogoReveal);
  mountPlanCarousel();
})();
