import * as THREE from "three";

const TAU = Math.PI * 2;

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const smoothStep = (value) => {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const radiusAt = (position) => {
  const waist = 0.22;
  if (position <= waist) {
    return THREE.MathUtils.lerp(
      1.15,
      0.42,
      smoothStep(position / waist),
    );
  }
  return THREE.MathUtils.lerp(
    0.42,
    5.25,
    smoothStep((position - waist) / (1 - waist)),
  );
};

const pointAt = (position, lane, rotation, target) => {
  const radius = radiusAt(position);
  const angle = lane + position * TAU * 2.1 + rotation;
  target.set(
    Math.cos(angle) * radius,
    THREE.MathUtils.lerp(-4.7, 4.7, position),
    Math.sin(angle) * radius,
  );
  return target;
};

function createStrands(count, segments) {
  const positions = new Float32Array(count * (segments - 1) * 2 * 3);
  const colours = new Float32Array(positions.length);
  const startColour = new THREE.Color("#e2b858");
  const endColour = new THREE.Color("#fff4d8");
  const first = new THREE.Vector3();
  const second = new THREE.Vector3();
  const colour = new THREE.Color();
  let cursor = 0;

  for (let strand = 0; strand < count; strand += 1) {
    const lane = (strand / count) * TAU;
    for (let segment = 0; segment < segments - 1; segment += 1) {
      const firstPosition = segment / (segments - 1);
      const secondPosition = (segment + 1) / (segments - 1);
      pointAt(firstPosition, lane, 0, first);
      pointAt(secondPosition, lane, 0, second);

      positions.set(first.toArray(), cursor);
      positions.set(second.toArray(), cursor + 3);

      colour.copy(startColour).lerp(endColour, firstPosition);
      colours.set(colour.toArray(), cursor);
      colour.copy(startColour).lerp(endColour, secondPosition);
      colours.set(colour.toArray(), cursor + 3);
      cursor += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.LineSegments(geometry, material);
}

function createParticles(count) {
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const point = new THREE.Vector3();
  const gold = new THREE.Color("#e2b858");
  const ivory = new THREE.Color("#fff4d8");
  const colour = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const position = Math.pow(Math.random(), 0.82);
    const lane = Math.random() * TAU;
    pointAt(position, lane, Math.random() * 0.08, point);
    const scatter = 0.05 + position * 0.07;
    point.x += (Math.random() - 0.5) * scatter;
    point.y += (Math.random() - 0.5) * scatter;
    point.z += (Math.random() - 0.5) * scatter;
    positions.set(point.toArray(), index * 3);

    colour.copy(gold).lerp(ivory, position * 0.68);
    colours.set(colour.toArray(), index * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createComet(offset) {
  const trailLength = 18;
  const positions = new Float32Array(trailLength * 3);
  const colours = new Float32Array(trailLength * 3);
  const gold = new THREE.Color("#f0c96d");

  for (let index = 0; index < trailLength; index += 1) {
    const strength = Math.pow(1 - index / trailLength, 2);
    colours[index * 3] = gold.r * strength;
    colours[index * 3 + 1] = gold.g * strength;
    colours[index * 3 + 2] = gold.b * strength;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.Line(geometry, material);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    new THREE.MeshBasicMaterial({
      color: "#ffe6a6",
      transparent: true,
      opacity: 0.94,
    }),
  );

  return { offset, line, head, positions };
}

function sampleRenderedPixels(renderer, canvas) {
  try {
    const context = renderer.getContext();
    const width = context.drawingBufferWidth;
    const height = context.drawingBufferHeight;
    if (!width || !height) return;

    const pixels = new Uint8Array(width * height * 4);
    context.readPixels(
      0,
      0,
      width,
      height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels,
    );

    let visibleSamples = 0;
    for (let index = 3; index < pixels.length; index += 64) {
      if (pixels[index] > 8) visibleSamples += 1;
    }
    canvas.dataset.rendered = "true";
    canvas.dataset.visibleSamples = String(visibleSamples);
  } catch {
    canvas.dataset.rendered = "unknown";
  }
}

export function mountConvergencePreview() {
  const section = document.querySelector("[data-convergence-preview]");
  const canvas = document.querySelector("[data-convergence-canvas]");
  if (
    !(section instanceof HTMLElement) ||
    !(canvas instanceof HTMLCanvasElement) ||
    canvas.dataset.mounted === "true"
  ) {
    return;
  }

  canvas.dataset.mounted = "true";
  const forceMotionForLocalReview =
    document.documentElement.classList.contains("motion-enabled");
  const reducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !forceMotionForLocalReview;
  const mobile = window.matchMedia("(max-width: 760px)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
  } catch {
    section.dataset.webgl = "unavailable";
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 0, mobile ? 21.5 : 16.5);

  const funnel = new THREE.Group();
  funnel.position.set(mobile ? 0 : 3.25, mobile ? -1.25 : 0, 0);
  if (mobile) {
    funnel.scale.set(1.16, 1.3, 1.16);
  } else {
    funnel.scale.setScalar(1.2);
  }
  scene.add(funnel);

  const strands = createStrands(mobile ? 34 : 52, mobile ? 110 : 150);
  const particles = createParticles(mobile ? 650 : 1200);
  funnel.add(strands, particles);

  const comets = [createComet(0.08), createComet(0.56)];
  comets.forEach(({ line, head }) => funnel.add(line, head));

  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let active = false;
  let sampled = false;
  let previousTime = performance.now();
  const point = new THREE.Vector3();

  const resize = () => {
    const nextWidth = section.clientWidth;
    const nextHeight = section.clientHeight;
    if (!nextWidth || !nextHeight) return;

    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const updateComets = (time) => {
    comets.forEach((comet, cometIndex) => {
      const headPosition = 1 - ((time * 0.055 + comet.offset) % 1);
      const lane = cometIndex * Math.PI + 0.35;

      for (let index = 0; index < comet.positions.length / 3; index += 1) {
        const trailPosition = clamp(headPosition + index * 0.013, 0, 1);
        pointAt(trailPosition, lane, time * 0.16, point);
        comet.positions[index * 3] = point.x;
        comet.positions[index * 3 + 1] = point.y;
        comet.positions[index * 3 + 2] = point.z;
      }

      comet.line.geometry.attributes.position.needsUpdate = true;
      comet.head.position.set(
        comet.positions[0],
        comet.positions[1],
        comet.positions[2],
      );

      const endpointFade =
        smoothStep(headPosition / 0.1) *
        smoothStep((1 - headPosition) / 0.1);
      comet.line.material.opacity = 0.82 * endpointFade;
      comet.head.material.opacity = 0.94 * endpointFade;
    });
  };

  const render = (time = 0) => {
    const seconds = time / 1000;
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    if (!reducedMotion) {
      funnel.rotation.y += delta * 0.18;
      funnel.rotation.z = Math.sin(seconds * 0.28) * 0.012;
      updateComets(seconds);
    } else {
      updateComets(2.4);
    }

    renderer.render(scene, camera);
    if (!sampled && width && height) {
      sampled = true;
      sampleRenderedPixels(renderer, canvas);
      section.dataset.ready = "true";
    }

    if (active && !reducedMotion && !document.hidden) {
      animationFrame = requestAnimationFrame(render);
    } else {
      animationFrame = 0;
    }
  };

  const start = () => {
    if (animationFrame || !active || document.hidden) return;
    previousTime = performance.now();
    animationFrame = requestAnimationFrame(render);
  };

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(section);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      if (active) start();
      else stop();
    },
    { threshold: 0.04 },
  );
  visibilityObserver.observe(section);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  active = true;
  render(performance.now());
}
