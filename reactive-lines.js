(() => {
  const sections = Array.from(document.querySelectorAll("[data-reactive-lines]"));
  if (!sections.length) return;

  const vector = (x, y) => ({ x, y });
  const add = (a, b) => vector(a.x + b.x, a.y + b.y);
  const subtract = (a, b) => vector(a.x - b.x, a.y - b.y);
  const multiply = (a, amount) => vector(a.x * amount, a.y * amount);
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const vectorLerp = (start, end, amount) =>
    vector(lerp(start.x, end.x, amount), lerp(start.y, end.y, amount));
  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));
  const map = (value, startA, endA, startB, endB) =>
    ((value - startA) / (endA - startA)) * (endB - startB) + startB;

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forceMotion = new URLSearchParams(window.location.search).has("force-motion");

  const mount = (section) => {
    if (!(section instanceof HTMLElement) || section.dataset.reactiveLinesMounted) return;
    section.dataset.reactiveLinesMounted = "true";

    const canvas = document.createElement("canvas");
    canvas.className = "reactive-lines-canvas";
    canvas.setAttribute("aria-hidden", "true");
    section.prepend(canvas);

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const state = {
      width: 0,
      height: 0,
      deviceScale: 1,
      visible: false,
      frame: 0,
      pageVisible: !document.hidden,
    };
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const configuration = { lineCount: 34, bias: 0.5 };
    let resizeTimer = 0;

    const reducedMotion = () => motionPreference.matches && !forceMotion;

    const resize = () => {
      const bounds = section.getBoundingClientRect();
      state.width = Math.max(1, bounds.width);
      state.height = Math.max(1, bounds.height);
      state.deviceScale = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas.width = Math.round(state.width * state.deviceScale);
      canvas.height = Math.round(state.height * state.deviceScale);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      context.setTransform(state.deviceScale, 0, 0, state.deviceScale, 0, 0);

      if (!pointer.targetX && !pointer.targetY) {
        pointer.x = state.width / 2;
        pointer.y = state.height / 2;
        pointer.targetX = pointer.x;
        pointer.targetY = pointer.y;
      }
    };

    const drawCurve = (start, end, displacementTarget, bias, intensity) => {
      const midpoint = vectorLerp(start, end, 0.5);
      const displacement = subtract(displacementTarget, midpoint);
      context.beginPath();

      for (let step = 0; step <= 50; step += 1) {
        const progress = step / 50;
        const point = vectorLerp(start, end, progress);
        const strength =
          2 *
          Math.pow(progress, intensity * (1 - bias) * 2) *
          Math.pow(1 - progress, intensity * bias * 2);
        const curvedPoint = add(point, multiply(displacement, strength));
        if (step === 0) context.moveTo(curvedPoint.x, curvedPoint.y);
        else context.lineTo(curvedPoint.x, curvedPoint.y);
      }
      context.stroke();
    };

    const draw = () => {
      const width = state.width;
      const height = state.height;
      if (!width || !height) return;

      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.1;

      context.setTransform(state.deviceScale, 0, 0, state.deviceScale, 0, 0);
      context.fillStyle = "rgb(16, 63, 52)";
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);

      const mobile = width < 500;
      const verticalOffset = mobile ? height * 0.8 : 0;
      const intensity = mobile ? 1.5 : 0.7;
      const lineStart = vector(width, -(height * 1.1) + verticalOffset);
      const firstEnd = vector(0, height * 2);
      const lastEnd = vector(-width, -height + verticalOffset);

      const minimumLines = mobile ? 18 : 24;
      const maximumLines = mobile ? 42 : 62;
      const requestedLines = clamp(
        map(pointer.y, 0, height, minimumLines, maximumLines),
        minimumLines,
        maximumLines,
      );
      configuration.lineCount = lerp(configuration.lineCount, requestedLines, 0.1);
      const requestedBias = clamp(map(pointer.x, 0, width, 0.6, 0.4), 0.4, 0.6);
      configuration.bias = lerp(configuration.bias, requestedBias, 0.05);

      const lineCount = Math.max(2, Math.round(configuration.lineCount));
      context.lineWidth = mobile ? 0.58 : 0.72;

      for (let index = 0; index < lineCount; index += 1) {
        const progress = index / (lineCount - 1);
        const lineEnd = vector(
          lerp(firstEnd.x, lastEnd.x, 1 - progress * progress),
          lerp(firstEnd.y, lastEnd.y, 1 - progress * progress),
        );
        const midpoint = multiply(add(lineStart, lineEnd), 0.5);
        const displacementTarget = multiply(add(firstEnd, midpoint), 0.5);
        context.strokeStyle =
          index % 8 === 0
            ? "rgba(255, 241, 202, 0.28)"
            : "rgba(226, 184, 88, 0.42)";
        drawCurve(
          lineStart,
          lineEnd,
          displacementTarget,
          configuration.bias,
          intensity,
        );
      }
      context.restore();

      const radius = Math.max(width, height) / 2;
      context.save();
      context.translate(width / 2, height / 2);
      context.scale(width / (radius * 2), height / (radius * 2));
      const edgeFade = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      edgeFade.addColorStop(0, "rgba(16, 63, 52, 0)");
      edgeFade.addColorStop(0.68, "rgba(16, 63, 52, 0)");
      edgeFade.addColorStop(0.86, "rgba(16, 63, 52, 0.34)");
      edgeFade.addColorStop(1, "rgba(16, 63, 52, 0.78)");
      context.fillStyle = edgeFade;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.restore();
    };

    const stop = () => {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
    };

    const loop = () => {
      if (!state.visible || !state.pageVisible || reducedMotion()) {
        stop();
        draw();
        return;
      }
      draw();
      state.frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!state.frame && state.visible && state.pageVisible && !reducedMotion()) {
        state.frame = requestAnimationFrame(loop);
      } else if (reducedMotion()) {
        draw();
      }
    };

    const updatePointer = (event) => {
      const bounds = section.getBoundingClientRect();
      pointer.targetX = clamp(event.clientX - bounds.left, 0, bounds.width);
      pointer.targetY = clamp(event.clientY - bounds.top, 0, bounds.height);
      start();
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        stop();
        resize();
        draw();
        start();
      }, 100);
    };

    resize();
    draw();
    section.addEventListener("pointermove", updatePointer, { passive: true });
    section.addEventListener("pointerdown", updatePointer, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) start();
        else stop();
      },
      { threshold: 0.02 },
    );
    visibilityObserver.observe(section);

    document.addEventListener("visibilitychange", () => {
      state.pageVisible = !document.hidden;
      if (state.pageVisible) start();
      else stop();
    });

    motionPreference.addEventListener?.("change", () => {
      stop();
      draw();
      start();
    });
  };

  sections.forEach(mount);
})();
