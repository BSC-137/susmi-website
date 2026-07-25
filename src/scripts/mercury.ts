export type MercuryIntensity = "hero" | "subtle";

export interface MercuryFieldOptions {
  intensity?: MercuryIntensity;
}

export interface MercuryFieldHandle {
  destroy: () => void;
}

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform float u_pointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float metaball(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return (r * r) / (d * d + 1e-4);
}

float sampleField(vec2 p, float t, float inten, vec2 m, float pointerAmt) {
  vec2 warp = vec2(
    fbm(p * 1.6 + vec2(t * 0.32, -t * 0.2)),
    fbm(p * 1.6 + vec2(-t * 0.16, t * 0.28) + 3.1)
  );
  vec2 q = p + (warp - 0.5) * (0.42 * inten);

  float field = 0.0;
  field += metaball(q, vec2(sin(t * 0.7) * 0.38, cos(t * 0.55) * 0.2), 0.2 * inten);
  field += metaball(q, vec2(cos(t * 0.45 + 1.2) * 0.48, sin(t * 0.62) * 0.3), 0.16 * inten);
  field += metaball(q, vec2(sin(t * 0.33 + 2.4) * 0.3, cos(t * 0.48 + 0.6) * 0.38), 0.14 * inten);
  field += metaball(q, vec2(cos(t * 0.58 + 0.4) * -0.32, sin(t * 0.41 + 1.7) * 0.18), 0.15 * inten);
  field += metaball(q, vec2(sin(t * 0.22) * 0.08, cos(t * 0.3) * -0.12), 0.22 * inten);

  float md = length(q - m);
  field += pointerAmt * 0.32 * inten / (md * md * 12.0 + 0.2);
  return field;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.12;
  float inten = clamp(u_intensity, 0.2, 1.2);
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float pointerAmt = u_pointer;

  float field = sampleField(p, t, inten, m, pointerAmt);
  // Harder edge so blobs read as liquid volumes, not fog
  float density = smoothstep(0.85, 1.55, field);
  float rim = smoothstep(0.65, 1.1, field) - density;

  float e = 0.01;
  float fx = sampleField(p + vec2(e, 0.0), t, inten, m, pointerAmt) - field;
  float fy = sampleField(p + vec2(0.0, e), t, inten, m, pointerAmt) - field;
  vec3 N = normalize(vec3(-fx * 22.0, -fy * 22.0, 1.0));
  vec3 L = normalize(vec3(-0.4, 0.65, 0.7));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  vec3 R = reflect(-V, N);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 64.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  // Studio chrome: dark metal + cool silver + hot specular
  vec3 dark = vec3(0.05, 0.055, 0.06);
  vec3 mid = vec3(0.42, 0.45, 0.49);
  vec3 hi = vec3(0.86, 0.88, 0.9);
  vec3 env = mix(vec3(0.08, 0.085, 0.09), hi, smoothstep(-0.2, 0.85, R.y));

  vec3 base = mix(dark, mid, diff * 0.65 + 0.2);
  base = mix(base, env, 0.45 + fres * 0.35);
  base += hi * spec * 1.15;
  base += hi * rim * 0.55;
  base = mix(vec3(0.015), base, density);

  float vig = smoothstep(1.25, 0.2, length(p * vec2(0.8, 1.05)));
  base *= mix(0.45, 1.0, vig);

  float alpha = (density * 0.9 + rim * 0.35) * (0.7 + 0.3 * inten) * mix(0.7, 1.0, vig);
  gl_FragColor = vec4(base, clamp(alpha, 0.0, 0.94));
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[mercury] shader compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[mercury] program link failed", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function isTouchPreferred() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const handles = new Set<MercuryFieldHandle>();

export function destroyAllMercuryFields() {
  for (const handle of [...handles]) handle.destroy();
  handles.clear();
}

function mountStaticFallback(root: HTMLElement | null): MercuryFieldHandle {
  root?.classList.add("is-static");
  if (root) root.dataset.mercuryReady = "1";
  const handle: MercuryFieldHandle = {
    destroy: () => {
      root?.classList.remove("is-static");
      if (root) delete root.dataset.mercuryReady;
      handles.delete(handle);
    },
  };
  handles.add(handle);
  return handle;
}

export function mountMercuryField(
  canvas: HTMLCanvasElement,
  options: MercuryFieldOptions = {},
): MercuryFieldHandle | null {
  const intensity = options.intensity ?? "hero";
  const root = canvas.closest<HTMLElement>("[data-mercury-root]");
  if (root?.dataset.mercuryReady === "1") return null;

  if (prefersReducedMotion()) {
    return mountStaticFallback(root);
  }

  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    }) ||
    (canvas.getContext("experimental-webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) as WebGLRenderingContext | null);

  if (!gl) {
    return mountStaticFallback(root);
  }

  const program = createProgram(gl);
  if (!program) {
    return mountStaticFallback(root);
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "a_pos");
  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uMouse = gl.getUniformLocation(program, "u_mouse");
  const uIntensity = gl.getUniformLocation(program, "u_intensity");
  const uPointer = gl.getUniformLocation(program, "u_pointer");

  gl.useProgram(program);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const isNarrow = () => window.matchMedia("(max-width: 767px)").matches;
  const heroOnMobile = intensity === "hero" && isNarrow();
  let intensityValue = intensity === "hero" ? (heroOnMobile ? 0.62 : 1) : 0.48;
  let maxDpr = intensity === "hero" ? (heroOnMobile ? 1.15 : 1.5) : 1.15;
  let frameStride = intensity === "hero" ? (heroOnMobile ? 2 : 1) : 2;
  const touch = isTouchPreferred();

  let width = 0;
  let height = 0;
  let raf = 0;
  let frame = 0;
  let running = true;
  let destroyed = false;
  let elapsedAtPause = 0;
  let runningSince = performance.now();
  let mouseX = 0.5;
  let mouseY = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;
  let pointerActive = 0;

  const host = root ?? canvas.parentElement ?? canvas;

  const applyPerfProfile = () => {
    const narrow = intensity === "hero" && isNarrow();
    intensityValue = intensity === "hero" ? (narrow ? 0.62 : 1) : 0.48;
    maxDpr = intensity === "hero" ? (narrow ? 1.15 : 1.5) : 1.15;
    frameStride = intensity === "hero" ? (narrow ? 2 : 1) : 2;
  };

  const resize = () => {
    applyPerfProfile();
    const rect = host.getBoundingClientRect();
    const nextW = Math.max(1, Math.floor(rect.width));
    const nextH = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    if (nextW === width && nextH === height && canvas.width === Math.floor(nextW * dpr)) return;
    width = nextW;
    height = nextH;
    canvas.width = Math.floor(nextW * dpr);
    canvas.height = Math.floor(nextH * dpr);
    canvas.style.width = `${nextW}px`;
    canvas.style.height = `${nextH}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (touch || event.pointerType === "touch") {
      pointerActive = 0;
      return;
    }
    const rect = host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) {
      pointerActive = 0;
      return;
    }
    targetX = x;
    targetY = 1 - y;
    pointerActive = 1;
  };

  const onPointerLeave = () => {
    pointerActive = 0;
  };

  const pause = () => {
    if (!running) return;
    elapsedAtPause += performance.now() - runningSince;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const resume = () => {
    if (destroyed || running) return;
    running = true;
    runningSince = performance.now();
    loop();
  };

  const onVisibility = () => {
    if (document.hidden) pause();
    else resume();
  };

  const draw = (now: number) => {
    mouseX += (targetX - mouseX) * 0.045;
    mouseY += (targetY - mouseY) * 0.045;

    const t = (elapsedAtPause + (now - runningSince)) / 1000;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uIntensity, intensityValue);
    gl.uniform1f(uPointer, touch ? 0 : pointerActive);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = () => {
    if (!running || destroyed) return;
    raf = requestAnimationFrame((now) => {
      frame += 1;
      if (frame % frameStride === 0) draw(now);
      loop();
    });
  };

  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  resize();

  if (!touch) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onPointerLeave);
  }
  document.addEventListener("visibilitychange", onVisibility);

  if (root) {
    root.dataset.mercuryReady = "1";
    root.classList.remove("is-static");
  }
  loop();

  const handle: MercuryFieldHandle = {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      pause();
      observer.disconnect();
      if (!touch) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("blur", onPointerLeave);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
      if (root) delete root.dataset.mercuryReady;
      handles.delete(handle);
    },
  };

  handles.add(handle);
  return handle;
}

export function scheduleMercuryFields(scope: ParentNode = document) {
  const boot = () => {
    scope.querySelectorAll<HTMLElement>("[data-mercury-root]:not([data-mercury-ready])").forEach((root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("[data-mercury-canvas]");
      if (!canvas) return;
      const intensity = (root.dataset.intensity as MercuryIntensity) || "hero";
      mountMercuryField(canvas, { intensity });
    });
  };

  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    }
  ).requestIdleCallback;

  if (typeof ric === "function") {
    ric(() => requestAnimationFrame(boot), { timeout: 900 });
  } else {
    requestAnimationFrame(() => {
      window.setTimeout(boot, 0);
    });
  }
}
