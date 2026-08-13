import { useEffect, useRef } from 'react';

export function CosmicShaderBackground() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false }) || 
               (canvas.getContext('experimental-webgl', { alpha: false }) as WebGLRenderingContext | null);
    if (!gl) return;

    let animationFrameId: number;
    let program: WebGLProgram | null = null;
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let positionBuffer: WebGLBuffer | null = null;

    function resizeCanvas() {
        if (!canvas || !gl) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const vertexShaderSource = `
        attribute vec2 position;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            v_texCoord = position * 0.5 + 0.5;
        }
    `;

    const fragmentShaderSource = `
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        varying vec2 v_texCoord;

        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = v_texCoord;
            vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            
            // Pure dark background matching #080809
            vec3 color = vec3(0.031, 0.031, 0.035);
            
            float t = u_time * 0.15;
            for(float i = 1.0; i < 4.0; i++) {
                p.x += 0.2 / i * sin(i * 2.0 * p.y + t + noise(uv * 0.5) * 0.5);
                p.y += 0.2 / i * cos(i * 2.0 * p.x + t);
            }
            
            float dist = length(p);
            float glow1 = 0.02 / (dist * 2.0 + 0.6);
            float glow2 = 0.015 / (length(p + vec2(sin(t), cos(t)) * 0.4) * 2.5 + 0.6);
            
            vec3 cyanNebula = vec3(0.0, 0.85, 0.91) * glow1;
            vec3 purpleNebula = vec3(0.55, 0.25, 0.95) * glow2;
            
            color += (cyanNebula + purpleNebula) * 0.4;
            
            float vignette = 1.0 - smoothstep(0.4, 1.5, length(uv - 0.5));
            color *= vignette;
            
            color = clamp(color, 0.0, 0.4);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function compileShader(gl: WebGLRenderingContext, source: string, type: number) {
        const shader = gl.createShader(type);
        if(!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    let startTime = Date.now();

    function render() {
        if(!gl || !program || !canvas) return;
        gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000.0);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
    }
    render();

    // CLEANUP
    return () => {
        window.removeEventListener('resize', resizeCanvas);
        cancelAnimationFrame(animationFrameId);
        
        if (gl) {
            if (program) gl.deleteProgram(program);
            if (vertexShader) gl.deleteShader(vertexShader);
            if (fragmentShader) gl.deleteShader(fragmentShader);
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
        }
    };
  }, []);

  return (
    <div id="webgl-bg-container" className="fixed inset-0 w-screen h-screen z-0 pointer-events-none bg-[#080809]" style={{ backgroundColor: '#080809' }} aria-hidden="true">
      <canvas id="bg-shader-canvas" ref={bgCanvasRef} className="w-full h-full block bg-[#080809]" style={{ backgroundColor: '#080809' }}></canvas>
    </div>
  );
}
