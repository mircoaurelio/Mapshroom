import { useEffect, useRef } from 'react';

const SHADER_RENDER_DURATION_MS = 4_200;

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += valueNoise(p) * amplitude;
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

float gridLine(float coordinate, float width) {
  float distanceToLine = abs(fract(coordinate) - 0.5);
  return 1.0 - smoothstep(width, width + 0.035, distanceToLine);
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float time = mod(u_time, 120.0);
  float field = fbm(p * 2.4 + vec2(time * 0.035, -time * 0.025));
  vec2 warp = vec2(
    sin(p.y * 5.0 + field * 5.5 + time * 0.42),
    cos(p.x * 4.2 - field * 4.8 - time * 0.34)
  ) * 0.055;

  vec2 mapped = p + warp;
  vec2 gridUv = mapped * 8.0;
  float grid = max(gridLine(gridUv.x, 0.025), gridLine(gridUv.y, 0.025));
  grid *= 0.34 + 0.66 * smoothstep(0.2, 0.82, field);

  float contours = abs(sin((field + length(mapped) * 0.22) * 31.0 - time * 0.7));
  contours = 1.0 - smoothstep(0.035, 0.16, contours);

  float radialPhase = length(mapped + vec2(0.12, -0.04)) * 17.0 - time * 1.15;
  float projectionPulse = 1.0 - smoothstep(0.03, 0.18, abs(sin(radialPhase)));
  projectionPulse *= smoothstep(0.95, 0.12, length(mapped));

  float coralTrace = 1.0 - smoothstep(
    0.018,
    0.09,
    abs(sin((mapped.x - mapped.y) * 8.0 + field * 8.0 - time * 0.5))
  );
  coralTrace *= smoothstep(0.58, 0.84, field) * 0.32;

  float vignette = smoothstep(0.95, 0.18, length(p * vec2(0.78, 1.0)));
  float topGlow = smoothstep(0.85, 0.05, distance(uv, vec2(0.5, -0.12)));

  vec3 background = vec3(0.018, 0.024, 0.024);
  vec3 emerald = vec3(0.20, 0.82, 0.58);
  vec3 coral = vec3(1.0, 0.38, 0.41);
  vec3 color = background;
  color += emerald * (grid * 0.18 + contours * 0.34 + projectionPulse * 0.16) * vignette;
  color += coral * coralTrace * vignette;
  color += emerald * topGlow * 0.035;

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export interface MapshroomShaderBackdropProps {
  active: boolean;
  className?: string;
  continuous?: boolean;
}

export function MapshroomShaderBackdrop({
  active,
  className = '',
  continuous = false,
}: MapshroomShaderBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!canvas || !gl) {
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();

    if (!vertexShader || !fragmentShader || !program || !buffer) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      return;
    }

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    if (positionLocation === -1) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const draw = (timeSeconds: number) => {
      resize();
      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }
      if (timeLocation) {
        gl.uniform1f(timeLocation, timeSeconds);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrameId = 0;
    const startedAt = performance.now();

    if (reducedMotion) {
      draw(1.8);
    } else {
      const render = (timestamp: number) => {
        const elapsedMs = timestamp - startedAt;
        draw(elapsedMs / 1_000);
        if (continuous || elapsedMs < SHADER_RENDER_DURATION_MS) {
          animationFrameId = window.requestAnimationFrame(render);
        }
      };
      animationFrameId = window.requestAnimationFrame(render);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      gl.disableVertexAttribArray(positionLocation);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
    };
  }, [active, continuous]);

  return (
    <canvas
      ref={canvasRef}
      className={[
        'mapshroom-shader-backdrop',
        className,
        active ? 'mapshroom-shader-backdrop-active' : '',
        active && continuous ? 'mapshroom-shader-backdrop-continuous-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    />
  );
}

interface OnboardingWelcomeShaderProps {
  active: boolean;
}

export function OnboardingWelcomeShader({ active }: OnboardingWelcomeShaderProps) {
  return (
    <MapshroomShaderBackdrop
      active={active}
      className={`onboarding-welcome-shader ${
        active ? 'onboarding-welcome-shader-active' : ''
      }`}
    />
  );
}
