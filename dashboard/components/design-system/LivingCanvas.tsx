'use client';

import { useEffect, useRef, useState } from 'react';

export function LivingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const buffersRef = useRef<{ position: WebGLBuffer; index: WebGLBuffer } | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation>>({});
  const startTimeRef = useRef<number>(performance.now());
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const resolutionRef = useRef({ width: 0, height: 0, dpr: 1 });
  const scrollRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  // Chapter keyframes - each chapter has its own palette and parameters
  const chapters = [
    {
      id: 'hero',
      progressStart: 0.00,
      progressEnd: 0.15,
      palette: 'hero',
      cameraStart: 8.0, cameraEnd: 7.5,
      densityStart: 0.35, densityEnd: 0.40,
      connectivityStart: 0.25, connectivityEnd: 0.30,
      flowSpeedStart: 0.02, flowSpeedEnd: 0.022,
    },
    {
      id: 'features',
      progressStart: 0.15,
      progressEnd: 0.30,
      palette: 'features',
      cameraStart: 6.5, cameraEnd: 5.5,
      densityStart: 0.55, densityEnd: 0.65,
      connectivityStart: 0.45, connectivityEnd: 0.55,
      flowSpeedStart: 0.025, flowSpeedEnd: 0.03,
    },
    {
      id: 'howitworks',
      progressStart: 0.30,
      progressEnd: 0.45,
      palette: 'howitworks',
      cameraStart: 5.5, cameraEnd: 5.0,
      densityStart: 0.65, densityEnd: 0.70,
      connectivityStart: 0.55, connectivityEnd: 0.60,
      flowSpeedStart: 0.03, flowSpeedEnd: 0.035,
    },
    {
      id: 'whitelabel',
      progressStart: 0.45,
      progressEnd: 0.60,
      palette: 'whitelabel',
      cameraStart: 5.0, cameraEnd: 5.5,
      densityStart: 0.70, densityEnd: 0.60,
      connectivityStart: 0.60, connectivityEnd: 0.50,
      flowSpeedStart: 0.035, flowSpeedEnd: 0.03,
    },
    {
      id: 'pricing',
      progressStart: 0.60,
      progressEnd: 0.75,
      palette: 'pricing',
      cameraStart: 5.5, cameraEnd: 6.0,
      densityStart: 0.60, densityEnd: 0.50,
      connectivityStart: 0.50, connectivityEnd: 0.40,
      flowSpeedStart: 0.03, flowSpeedEnd: 0.025,
    },
    {
      id: 'testimonials',
      progressStart: 0.75,
      progressEnd: 0.90,
      palette: 'testimonials',
      cameraStart: 6.0, cameraEnd: 7.0,
      densityStart: 0.50, densityEnd: 0.40,
      connectivityStart: 0.40, connectivityEnd: 0.30,
      flowSpeedStart: 0.025, flowSpeedEnd: 0.02,
    },
    {
      id: 'cta',
      progressStart: 0.90,
      progressEnd: 1.00,
      palette: 'cta',
      cameraStart: 7.0, cameraEnd: 8.0,
      densityStart: 0.40, densityEnd: 0.35,
      connectivityStart: 0.30, connectivityEnd: 0.25,
      flowSpeedStart: 0.02, flowSpeedEnd: 0.02,
    },
    {
      id: 'network',
      progressStart: 1.00,
      progressEnd: 1.00,
      palette: 'network',
      cameraStart: 4.0, cameraEnd: 4.0,
      densityStart: 0.85, densityEnd: 0.85,
      connectivityStart: 0.70, connectivityEnd: 0.70,
      flowSpeedStart: 0.015, flowSpeedEnd: 0.015,
    },
    {
      id: 'digital',
      progressStart: 1.00,
      progressEnd: 1.00,
      palette: 'digital',
      cameraStart: 4.5, cameraEnd: 4.5,
      densityStart: 0.80, densityEnd: 0.80,
      connectivityStart: 0.85, connectivityEnd: 0.85,
      flowSpeedStart: 0.02, flowSpeedEnd: 0.02,
    },
    {
      id: 'agents',
      progressStart: 1.00,
      progressEnd: 1.00,
      palette: 'agents',
      cameraStart: 4.0, cameraEnd: 4.0,
      densityStart: 0.75, densityEnd: 0.75,
      connectivityStart: 0.65, connectivityEnd: 0.65,
      flowSpeedStart: 0.018, flowSpeedEnd: 0.018,
    },
    {
      id: 'partnership',
      progressStart: 1.00,
      progressEnd: 1.00,
      palette: 'partnership',
      cameraStart: 4.5, cameraEnd: 4.5,
      densityStart: 0.70, densityEnd: 0.70,
      connectivityStart: 0.60, connectivityEnd: 0.60,
      flowSpeedStart: 0.015, flowSpeedEnd: 0.015,
    },
    {
      id: 'cycle',
      progressStart: 1.00,
      progressEnd: 1.00,
      palette: 'cycle',
      cameraStart: 4.0, cameraEnd: 4.0,
      densityStart: 0.85, densityEnd: 0.85,
      connectivityStart: 0.50, connectivityEnd: 0.50,
      flowSpeedStart: 0.025, flowSpeedEnd: 0.025,
    },
  ];

  // Palette definitions
  const palettes = {
    hero: {
      bgBase: [0.02, 0.012, 0.043],
      accent1: [0.357, 0.294, 0.541],
      accent2: [0.831, 0.659, 0.263],
      particleA: [0.482, 0.42, 0.722],
      particleB: [0.91, 0.773, 0.427],
      connection: [0.831, 0.659, 0.263],
    },
    features: {
      bgBase: [0.025, 0.015, 0.05],
      accent1: [0.25, 0.2, 0.45],
      accent2: [0.75, 0.55, 0.2],
      particleA: [0.4, 0.35, 0.65],
      particleB: [0.85, 0.65, 0.3],
      connection: [0.75, 0.55, 0.2],
    },
    howitworks: {
      bgBase: [0.03, 0.02, 0.06],
      accent1: [0.2, 0.15, 0.4],
      accent2: [0.7, 0.5, 0.15],
      particleA: [0.35, 0.3, 0.6],
      particleB: [0.8, 0.6, 0.25],
      connection: [0.7, 0.5, 0.15],
    },
    whitelabel: {
      bgBase: [0.02, 0.025, 0.04],
      accent1: [0.15, 0.25, 0.35],
      accent2: [0.65, 0.6, 0.2],
      particleA: [0.3, 0.45, 0.55],
      particleB: [0.75, 0.7, 0.3],
      connection: [0.65, 0.6, 0.2],
    },
    pricing: {
      bgBase: [0.025, 0.02, 0.05],
      accent1: [0.25, 0.2, 0.4],
      accent2: [0.78, 0.58, 0.18],
      particleA: [0.4, 0.35, 0.55],
      particleB: [0.88, 0.68, 0.28],
      connection: [0.78, 0.58, 0.18],
    },
    testimonials: {
      bgBase: [0.03, 0.015, 0.055],
      accent1: [0.28, 0.18, 0.42],
      accent2: [0.72, 0.52, 0.18],
      particleA: [0.38, 0.32, 0.58],
      particleB: [0.82, 0.62, 0.26],
      connection: [0.72, 0.52, 0.18],
    },
    cta: {
      bgBase: [0.02, 0.012, 0.043],
      accent1: [0.357, 0.294, 0.541],
      accent2: [0.831, 0.659, 0.263],
      particleA: [0.482, 0.42, 0.722],
      particleB: [0.91, 0.773, 0.427],
      connection: [0.831, 0.659, 0.263],
    },
    network: {
      bgBase: [14/255, 9/255, 32/255],
      accent1: [36/255, 21/255, 52/255],
      accent2: [185/255, 163/255, 234/255],
      particleA: [185/255, 163/255, 234/255],
      particleB: [185/255, 163/255, 234/255],
      connection: [36/255, 21/255, 52/255],
    },
    digital: {
      bgBase: [231/255, 225/255, 251/255],
      accent1: [238/255, 244/255, 255/255],
      accent2: [143/255, 127/255, 196/255],
      particleA: [143/255, 127/255, 196/255],
      particleB: [143/255, 127/255, 196/255],
      connection: [143/255, 127/255, 196/255],
    },
    agents: {
      bgBase: [251/255, 238/255, 247/255],
      accent1: [234/255, 246/255, 242/255],
      accent2: [201/255, 139/255, 196/255],
      particleA: [201/255, 139/255, 196/255],
      particleB: [201/255, 139/255, 196/255],
      connection: [234/255, 246/255, 242/255],
    },
    partnership: {
      bgBase: [238/255, 241/255, 253/255],
      accent1: [253/255, 238/255, 244/255],
      accent2: [166/255, 139/255, 214/255],
      particleA: [166/255, 139/255, 214/255],
      particleB: [166/255, 139/255, 214/255],
      connection: [253/255, 238/255, 244/255],
    },
    cycle: {
      bgBase: [253/255, 243/255, 231/255],
      accent1: [231/255, 242/255, 251/255],
      accent2: [0, 0, 0],
      particleA: [0, 0, 0],
      particleB: [0, 0, 0],
      connection: [231/255, 242/255, 251/255],
    },
    core: {
      bgBase: [253/255, 243/255, 231/255],
      accent1: [231/255, 242/255, 251/255],
      accent2: [0, 0, 0],
      particleA: [0, 0, 0],
      particleB: [0, 0, 0],
      connection: [231/255, 242/255, 251/255],
    },
    calm: {
      bgBase: [246/255, 242/255, 253/255],
      accent1: [251/255, 248/255, 255/255],
      accent2: [233/255, 222/255, 247/255],
      particleA: [233/255, 222/255, 247/255],
      particleB: [233/255, 222/255, 247/255],
      connection: [251/255, 248/255, 255/255],
    },
    future: {
      bgBase: [238/255, 240/255, 251/255],
      accent1: [251/255, 238/255, 244/255],
      accent2: [207/255, 214/255, 244/255],
      particleA: [207/255, 214/255, 244/255],
      particleB: [207/255, 214/255, 244/255],
      connection: [251/255, 238/255, 244/255],
    },
  };

  // Find current chapter and local progress within it
  const getChapterState = (progress: number) => {
    progress = Math.max(0, Math.min(1, progress));
    
    let chapter = chapters[0];
    for (const ch of chapters) {
      if (progress >= ch.progressStart && progress <= ch.progressEnd) {
        chapter = ch;
        break;
      }
    }
    
    if (progress > chapters[chapters.length - 1].progressEnd) {
      chapter = chapters[chapters.length - 1];
    }
    
    const chapterDuration = chapter.progressEnd - chapter.progressStart;
    const localProgress = chapterDuration > 0 
      ? (progress - chapter.progressStart) / chapterDuration 
      : 0;
    
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    
    return {
      chapterId: chapter.id,
      palette: palettes[chapter.palette as keyof typeof palettes],
      localProgress,
      camera: lerp(chapter.cameraStart, chapter.cameraEnd, localProgress),
      density: lerp(chapter.densityStart, chapter.densityEnd, localProgress),
      connectivity: lerp(chapter.connectivityStart, chapter.connectivityEnd, localProgress),
      flowSpeed: lerp(chapter.flowSpeedStart, chapter.flowSpeedEnd, localProgress),
      isAtBoundary: localProgress <= 0.001 || localProgress >= 0.999,
    };
  };

  // Vertex Shader - Full screen quad
  const VERT_SRC = `#version 300 es
    precision highp float;
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment Shader - Continuous particle field with chapter-driven params
  const FRAG_SRC = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 fragColor;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_dpr;
    // Chapter uniforms
    uniform vec3 u_palette_bgBase;
    uniform vec3 u_palette_accent1;
    uniform vec3 u_palette_accent2;
    uniform vec3 u_palette_particleA;
    uniform vec3 u_palette_particleB;
    uniform vec3 u_palette_connection;
    uniform float u_camera;
    uniform float u_density;
    uniform float u_connectivity;
    uniform float u_flowSpeed;
    // Noise functions
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p, int octaves) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    vec2 curlNoise(vec2 p, float t) {
      float eps = 0.001;
      float n1 = fbm(p + vec2(eps, 0.0) + t, 4);
      float n2 = fbm(p - vec2(eps, 0.0) + t, 4);
      float n3 = fbm(p + vec2(0.0, eps) + t, 4);
      float n4 = fbm(p - vec2(0.0, eps) + t, 4);
      return vec2(n3 - n4, n2 - n1) / (2.0 * eps);
    }
    float particleField(vec2 uv, float t, vec2 mouse, float density, float connectivity) {
      vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * u_camera;
      // Flow field
      vec2 flow = curlNoise(p * 0.5 + t * u_flowSpeed, t * 0.02);
      p += flow * 0.3;
      // Mouse influence
      vec2 toMouse = mouse - uv;
      float mouseDist = length(toMouse);
      float mouseInfluence = smoothstep(0.5, 0.0, mouseDist);
      float localDensity = density + mouseInfluence * 0.4;
      float localConnectivity = connectivity + mouseInfluence * 0.3;
      // Continuous particle field
      float field = 0.0;
      float acc = 0.0;
      for (int i = 0; i < 5; i++) {
        float freq = pow(2.0, float(i)) * localDensity * 4.0;
        float phase = t * (0.1 + float(i) * 0.02) + hash(vec2(float(i), 0.0)) * 6.28;
        vec2 sampleUV = p * freq;
        float wave = sin(sampleUV.x + phase) * sin(sampleUV.y + phase * 1.3);
        wave = pow(abs(wave), 1.5 + localConnectivity * 2.0);
        field += wave * (1.0 / freq) * localDensity;
        acc += 1.0 / freq;
      }
      field /= acc;
      field = smoothstep(0.3, 0.6, field) * localDensity;
      return field;
    }
    float connectionField(vec2 uv, float t, vec2 mouse, float density, float connectivity) {
      vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * u_camera * 0.8;
      vec2 flow = curlNoise(p * 0.3 + t * 0.05, t * 0.015);
      p += flow * 0.2;
      float connections = 0.0;
      for (int i = 0; i < 8; i++) {
        float angle = float(i) * 0.785398;
        vec2 offset = vec2(cos(angle), sin(angle)) * 0.02;
        float d1 = particleField(uv, t, mouse, density, connectivity);
        float d2 = particleField(uv + offset, t, mouse, density, connectivity);
        float conn = min(d1, d2) * connectivity;
        connections += conn * exp(-length(offset * 100.0) * 0.5);
      }
      return connections * 0.15;
    }
    void main() {
      vec2 uv = v_uv;
      float t = u_time * 0.001;
      vec2 mouse = u_mouse;
      // Base gradient background
      vec3 bg = u_palette_bgBase;
      bg += u_palette_accent1 * 0.08 * (1.0 - uv.y) * (1.0 - abs(uv.x - 0.5) * 2.0);
      bg += u_palette_accent2 * 0.04 * uv.y * (1.0 - abs(uv.x - 0.5) * 2.0);
      // Mouse glow
      vec2 toMouse = mouse - uv;
      float mouseDist = length(toMouse * vec2(u_resolution.x / u_resolution.y, 1.0));
      bg += u_palette_accent2 * 0.06 * exp(-mouseDist * 4.0);
      bg += u_palette_accent1 * 0.04 * exp(-mouseDist * 3.0);
      // Particle field
      float particles = particleField(uv, t, mouse, u_density, u_connectivity);
      // Connection field
      float connections = connectionField(uv, t, mouse, u_density, u_connectivity);
      // Color
      vec3 particleColor = mix(u_palette_particleA, u_palette_particleB, uv.y + particles * 0.5);
      vec3 connectionColor = mix(u_palette_accent2, u_palette_accent1, uv.x);
      vec3 color = bg;
      color += particleColor * particles * 0.8;
      color += connectionColor * connections * 0.6;
      // Grain
      float grain = hash(gl_FragCoord.xy + t * 100.0) * 0.02 - 0.01;
      color += vec3(grain);
      // Vignette
      float vignette = 1.0 - length(uv - 0.5) * 0.6;
      color *= vignette;
      // Gamma
      color = pow(color, vec3(1.0 / 2.2));
      fragColor = vec4(color, 1.0);
    }
  `;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    glRef.current = gl;

    const compileShader = (src: string, type: number) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(VERT_SRC, gl.VERTEX_SHADER);
    const fragShader = compileShader(FRAG_SRC, gl.FRAGMENT_SHADER);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Buffers
    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    buffersRef.current = { position: positionBuffer, index: null as any };

    // Cache uniform locations
    const uniformNames = [
      'u_time', 'u_resolution', 'u_mouse', 'u_dpr',
      'u_palette_bgBase', 'u_palette_accent1', 'u_palette_accent2',
      'u_palette_particleA', 'u_palette_particleB', 'u_palette_connection',
      'u_camera', 'u_density', 'u_connectivity', 'u_flowSpeed'
    ];
    uniformNames.forEach(name => {
      uniformsRef.current[name] = gl.getUniformLocation(program, name)!;
    });

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const gl = glRef.current;
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      resolutionRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr,
      };
      canvasEl.width = resolutionRef.current.width * dpr;
      canvasEl.height = resolutionRef.current.height * dpr;
      canvasEl.style.width = `${resolutionRef.current.width}px`;
      canvasEl.style.height = `${resolutionRef.current.height}px`;
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    }

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current.targetX = e.clientX / window.innerWidth;
      mouseRef.current.targetY = 1 - e.clientY / window.innerHeight;
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        mouseRef.current.targetX = e.touches[0].clientX / window.innerWidth;
        mouseRef.current.targetY = 1 - e.touches[0].clientY / window.innerHeight;
      }
    }

    function handleScroll() {
      scrollRef.current = window.scrollY;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    resize();
    setIsReady(true);

    let animationId: number;
    function animate(currentTime: number) {
      const gl = glRef.current;
      if (!gl || !programRef.current) return;

      gl.useProgram(programRef.current);

      const elapsed = currentTime - startTimeRef.current;
      
      // Smooth mouse following
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Calculate scroll progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? Math.max(0, Math.min(1, scrollRef.current / docHeight)) : 0;

      const chapterState = getChapterState(scrollProgress);

      // Update uniforms
      const u = uniformsRef.current;
      gl.uniform1f(u.u_time, elapsed);
      gl.uniform2f(u.u_resolution, resolutionRef.current.width, resolutionRef.current.height);
      gl.uniform2f(u.u_mouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(u.u_dpr, resolutionRef.current.dpr);
      
      const p = chapterState.palette;
      gl.uniform3fv(u.u_palette_bgBase, p.bgBase);
      gl.uniform3fv(u.u_palette_accent1, p.accent1);
      gl.uniform3fv(u.u_palette_accent2, p.accent2);
      gl.uniform3fv(u.u_palette_particleA, p.particleA);
      gl.uniform3fv(u.u_palette_particleB, p.particleB);
      gl.uniform3fv(u.u_palette_connection, p.connection);
      gl.uniform1f(u.u_camera, chapterState.camera);
      gl.uniform1f(u.u_density, chapterState.density);
      gl.uniform1f(u.u_connectivity, chapterState.connectivity);
      gl.uniform1f(u.u_flowSpeed, chapterState.flowSpeed);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', handleScroll);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  if (!isReady) {
    return (
      <canvas
        ref={canvasRef}
        id="atheer-canvas"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          display: 'block',
          width: '100%',
          height: '100%',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      id="atheer-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        display: 'block',
        width: '100%',
        height: '100%',
      }}
      aria-hidden="true"
    />
  );
}