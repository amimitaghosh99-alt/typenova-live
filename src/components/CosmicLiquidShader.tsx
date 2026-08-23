import React, { useRef, useEffect, memo } from 'react';
import type { Theme } from '@/data/constants';

interface CosmicLiquidShaderProps {
  theme: Theme;
  isPaused?: boolean;
}

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texCoord;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform int u_mode;
  uniform int u_interactive;
  
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_colorC;

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
      vec2 uv = v_texCoord;
      vec3 finalColor = u_colorA;
      
      // 0: Liquid Flow
      if (u_mode == 0) {
          float time = u_time * 0.15;
          float n1 = snoise(uv * 2.0 + time);
          float n2 = snoise(uv * 4.0 - time * 0.8 + n1 * 0.5);
          float n3 = snoise(uv * 8.0 + time * 0.5 + n2 * 0.2);
          float combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
          
          finalColor = mix(u_colorA, u_colorB, smoothstep(-0.5, 1.0, combinedNoise));
          finalColor = mix(finalColor, u_colorC, smoothstep(0.2, 1.2, combinedNoise));
          
          float caustics = pow(max(0.0, 1.0 - abs(combinedNoise)), 8.0);
          finalColor += caustics * 0.15 * u_colorB;
      }
      // 1: Aurora Borealis
      else if (u_mode == 1) {
          float time = u_time * 0.25;
          float wave = sin(uv.x * 5.0 + time * 1.1) * 0.18 + sin(uv.x * 9.0 - time * 0.7) * 0.08;
          float ribbon1 = 1.0 - smoothstep(0.0, 0.45, abs(uv.y - 0.45 - wave));
          float ribbon2 = 1.0 - smoothstep(0.0, 0.35, abs(uv.y - 0.55 + wave * 0.8));
          float noiseVal = snoise(vec2(uv.x * 2.5, time * 0.3)) * 0.2;
          
          float aurora = clamp(ribbon1 * 0.8 + ribbon2 * 0.6 + noiseVal, 0.0, 1.0);
          finalColor = mix(u_colorA, u_colorB, aurora * 0.85);
          finalColor = mix(finalColor, u_colorC, ribbon2 * 0.7);
      }
      // 2: Cyber Warp Grid
      else if (u_mode == 2) {
          vec2 p = uv * 2.0 - 1.0;
          float depth = 1.0 / (abs(p.y) + 0.08);
          float time = u_time * 0.6;
          vec2 grid = fract(vec2(p.x * depth * 1.2, depth * 0.8 + time));
          float lineX = smoothstep(0.06, 0.0, abs(grid.x - 0.5));
          float lineY = smoothstep(0.06, 0.0, abs(grid.y - 0.5));
          float lines = clamp(lineX + lineY, 0.0, 1.0);
          float fade = clamp(abs(p.y) * 2.2, 0.0, 1.0);
          
          finalColor = mix(u_colorA, u_colorB, lines * fade * 0.6);
          finalColor = mix(finalColor, u_colorC, (1.0 - fade) * 0.25);
      }
      // 3: Matrix Digital Stream
      else if (u_mode == 3) {
          float col_id = floor(uv.x * 32.0);
          float speed = fract(sin(col_id * 78.233) * 43758.5453) * 1.2 + 0.6;
          float time = u_time * 0.8;
          float stream = fract(uv.y * 2.5 - time * speed + col_id * 0.37);
          float head = pow(stream, 12.0);
          float tail = stream * 0.35;
          
          float streamTotal = clamp(head + tail, 0.0, 1.0);
          finalColor = mix(u_colorA, u_colorB, streamTotal * 0.75);
          finalColor += head * 0.4 * u_colorC;
      }
      // 4: Deep Nebula
      else if (u_mode == 4) {
          float time = u_time * 0.08;
          float n1 = snoise(uv * 1.8 + time);
          float n2 = snoise(uv * 3.5 - time * 0.7 + n1 * 0.3);
          float clouds = smoothstep(-0.2, 0.8, n1 * 0.6 + n2 * 0.4);
          
          finalColor = mix(u_colorA, u_colorB * 0.7, clouds * 0.8);
          finalColor = mix(finalColor, u_colorC * 0.6, smoothstep(0.3, 0.9, n2));
      }
      // 5: Minimal Void
      else {
          float distCenter = distance(uv, vec2(0.5, 0.5));
          finalColor = mix(u_colorA + u_colorB * 0.03, u_colorA, smoothstep(0.0, 0.8, distCenter));
      }
      
      // Mouse Interaction
      if (u_interactive == 1 && u_mode != 5) {
          vec2 mouse = u_mouse / u_resolution;
          float dist = distance(uv, mouse);
          float influence = smoothstep(0.28, 0.0, dist);
          finalColor += influence * u_colorB * 0.12;
      }

      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function parseRGB(rgbStr: string): [number, number, number] {
  const parts = rgbStr.split(',').map(s => parseFloat(s.trim()));
  if (parts.length >= 3 && !isNaN(parts[0])) {
    return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
  }
  return [0, 0, 0];
}

function parseBgColor(bgClass: string): [number, number, number] {
  if (bgClass.includes('bg-black')) {
    return [0.005, 0.005, 0.01];
  }
  if (bgClass.includes('bg-[')) {
    const hex = bgClass.match(/bg-\[#([0-9a-fA-F]+)\]/);
    if (hex && hex[1]) {
      const h = hex[1];
      if (h.length === 6) {
        return [
          parseInt(h.substring(0, 2), 16) / 255,
          parseInt(h.substring(2, 4), 16) / 255,
          parseInt(h.substring(4, 6), 16) / 255
        ];
      }
    }
  }
  return [0.01, 0.01, 0.02];
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const SHADER_MODE_MAP: Record<string, number> = {
  liquid: 0,
  aurora: 1,
  grid: 2,
  matrix: 3,
  nebula: 4,
  minimal: 5,
};

const CosmicLiquidShader: React.FC<CosmicLiquidShaderProps> = ({ theme, isPaused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const isHiddenRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const shaderSettingsRef = useRef({
    mode: 0,
    speedMultiplier: 1.0,
    interactive: 1,
  });
  
  const targetColorsRef = useRef({
    a: [0, 0, 0],
    b: [0, 0, 0],
    c: [0, 0, 0]
  });
  
  const currentColorsRef = useRef({
    a: [0, 0, 0],
    b: [0, 0, 0],
    c: [0, 0, 0]
  });

  const updateShaderSettings = () => {
    const rawMode = localStorage.getItem('typenova_shader_mode') || 'liquid';
    const rawSpeed = localStorage.getItem('typenova_shader_speed') || 'normal';
    const rawInteractive = localStorage.getItem('typenova_shader_interactive') !== 'false';

    const speedMap: Record<string, number> = {
      slow: 0.5,
      normal: 1.0,
      fast: 1.8,
    };

    shaderSettingsRef.current = {
      mode: SHADER_MODE_MAP[rawMode] ?? 0,
      speedMultiplier: speedMap[rawSpeed] ?? 1.0,
      interactive: rawInteractive ? 1 : 0,
    };
  };

  useEffect(() => {
    updateShaderSettings();
    window.addEventListener('storage', updateShaderSettings);
    window.addEventListener('shader_config_changed', updateShaderSettings);
    return () => {
      window.removeEventListener('storage', updateShaderSettings);
      window.removeEventListener('shader_config_changed', updateShaderSettings);
    };
  }, []);

  useEffect(() => {
    targetColorsRef.current = {
      a: parseBgColor(theme.bg),
      b: parseRGB(theme.glowPrimary),
      c: parseRGB(theme.glowSecondary)
    };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const modeLoc = gl.getUniformLocation(program, 'u_mode');
    const interactiveLoc = gl.getUniformLocation(program, 'u_interactive');
    const colorALoc = gl.getUniformLocation(program, 'u_colorA');
    const colorBLoc = gl.getUniformLocation(program, 'u_colorB');
    const colorCLoc = gl.getUniformLocation(program, 'u_colorC');

    // Initialize current colors to target colors on first mount to avoid popping from black
    currentColorsRef.current.a = [...targetColorsRef.current.a];
    currentColorsRef.current.b = [...targetColorsRef.current.b];
    currentColorsRef.current.c = [...targetColorsRef.current.c];

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(1, 0.6 * (window.devicePixelRatio || 1));
      const targetW = Math.max(320, Math.floor(w * scale));
      const targetH = Math.max(180, Math.floor(h * scale));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    syncSize();
    window.addEventListener('resize', syncSize, { passive: true });

    const lerp = (start: number, end: number, amt: number) => {
      return (1 - amt) * start + amt * end;
    };

    let lastTime = performance.now();

    const render = (now: number) => {
      if (isHiddenRef.current || isPausedRef.current) {
        lastTime = performance.now();
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;
      timeRef.current += dt * 0.001 * shaderSettingsRef.current.speedMultiplier;

      // Lerp colors
      const lerpSpeed = 0.05;
      ['a', 'b', 'c'].forEach(key => {
        const k = key as keyof typeof currentColorsRef.current;
        for (let i = 0; i < 3; i++) {
          currentColorsRef.current[k][i] = lerp(
            currentColorsRef.current[k][i],
            targetColorsRef.current[k][i],
            lerpSpeed
          );
        }
      });

      gl.useProgram(program);
      gl.uniform1f(timeLoc, timeRef.current);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1i(modeLoc, shaderSettingsRef.current.mode);
      gl.uniform1i(interactiveLoc, shaderSettingsRef.current.interactive);
      
      // Direct mouse coords (normalized to canvas resolution)
      gl.uniform2f(
        mouseLoc,
        mouseRef.current.x * (canvas.width / window.innerWidth),
        (window.innerHeight - mouseRef.current.y) * (canvas.height / window.innerHeight)
      );

      gl.uniform3f(colorALoc, currentColorsRef.current.a[0], currentColorsRef.current.a[1], currentColorsRef.current.a[2]);
      gl.uniform3f(colorBLoc, currentColorsRef.current.b[0], currentColorsRef.current.b[1], currentColorsRef.current.b[2]);
      gl.uniform3f(colorCLoc, currentColorsRef.current.c[0], currentColorsRef.current.c[1], currentColorsRef.current.c[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleVisibilityChange = () => {
      isHiddenRef.current = document.hidden;
      if (!document.hidden) {
        lastTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default memo(CosmicLiquidShader);
