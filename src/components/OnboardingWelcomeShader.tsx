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
uniform vec2 u_pointer;
uniform float u_pointer_strength;
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

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  p.x *= aspect;

  vec2 pointer = u_pointer - 0.5;
  pointer.x *= aspect;
  float pointerDistance = length(p - pointer);
  float pointerAura = exp(-pointerDistance * 1.7) * u_pointer_strength;
  vec2 pointerFlow = (pointer - p) / max(pointerDistance, 0.2);
  pointerFlow *= pointerAura * 0.075;

  float time = u_time;
  float field = fbm((p + pointerFlow) * 2.25 + vec2(time * 0.035, -time * 0.025));
  vec2 warp = vec2(
    sin(p.y * 5.0 + field * 5.5 + time * 0.42),
    cos(p.x * 4.2 - field * 4.8 - time * 0.34)
  ) * 0.055 + pointerFlow;

  vec2 mapped = p + warp;
  float filamentA = abs(sin(
    field * 29.0 + mapped.x * 3.8 + mapped.y * 2.2 - time * 0.68
  ));
  filamentA = 1.0 - smoothstep(0.025, 0.14, filamentA);

  float secondaryField = fbm(
    mapped * 3.1 + vec2(-time * 0.022, time * 0.028) + pointerFlow * 2.0
  );
  float filamentB = abs(sin(
    secondaryField * 27.0 + (mapped.x - mapped.y) * 2.6 + time * 0.48
  ));
  filamentB = 1.0 - smoothstep(0.03, 0.15, filamentB);

  float contours = abs(sin((field + length(mapped) * 0.22) * 31.0 - time * 0.7));
  contours = 1.0 - smoothstep(0.035, 0.16, contours);

  vec2 pulseOrigin = mix(vec2(-0.12, 0.04), pointer, u_pointer_strength * 0.9);
  float pulseDistance = length(mapped - pulseOrigin);
  float radialPhase = pulseDistance * 17.0 - time * 1.15;
  float projectionPulse = 1.0 - smoothstep(0.03, 0.18, abs(sin(radialPhase)));
  projectionPulse *= 0.18 + 0.82 * exp(-pulseDistance * 1.25);

  float coralTrace = 1.0 - smoothstep(
    0.018,
    0.09,
    abs(sin((mapped.x - mapped.y) * 8.0 + field * 8.0 - time * 0.5))
  );
  coralTrace *= smoothstep(0.58, 0.84, field) * 0.32;

  float pointerRing = 1.0 - smoothstep(
    0.025,
    0.13,
    abs(sin(pointerDistance * 18.0 - time * 1.45))
  );
  pointerRing *= pointerAura;

  float topGlow = smoothstep(0.85, 0.05, distance(uv, vec2(0.5, -0.12)));

  vec3 background = mix(
    vec3(0.016, 0.024, 0.023),
    vec3(0.018, 0.040, 0.034),
    1.0 - uv.y
  );
  vec3 emerald = vec3(0.20, 0.82, 0.58);
  vec3 coral = vec3(1.0, 0.38, 0.41);
  vec3 color = background;
  color += emerald * (
    filamentA * 0.2 +
    filamentB * 0.12 +
    contours * 0.23 +
    projectionPulse * 0.15
  ) * (0.42 + field * 0.58);
  color += emerald * pointerAura * 0.085;
  color += coral * (coralTrace + pointerRing * 0.16);
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
    const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
    const pointerStrengthLocation = gl.getUniformLocation(program, 'u_pointer_strength');
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

    let pointerTargetX = 0.5;
    let pointerTargetY = 0.5;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerStrengthTarget = 0;
    let pointerStrength = 0;

    const draw = (timeSeconds: number, pointerSmoothing = 0.085) => {
      pointerX += (pointerTargetX - pointerX) * pointerSmoothing;
      pointerY += (pointerTargetY - pointerY) * pointerSmoothing;
      pointerStrength +=
        (pointerStrengthTarget - pointerStrength) * Math.min(1, pointerSmoothing * 1.5);
      resize();
      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }
      if (timeLocation) {
        gl.uniform1f(timeLocation, timeSeconds);
      }
      if (pointerLocation) {
        gl.uniform2f(pointerLocation, pointerX, pointerY);
      }
      if (pointerStrengthLocation) {
        gl.uniform1f(pointerStrengthLocation, pointerStrength);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerSurface = canvas.parentElement;
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = pointerSurface?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      pointerTargetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      pointerTargetY = 1 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      pointerStrengthTarget = event.pointerType === 'touch' ? 0.55 : 1;
      if (reducedMotion) {
        draw(1.8, 1);
      }
    };
    const handlePointerLeave = () => {
      pointerStrengthTarget = 0;
      if (reducedMotion) {
        draw(1.8, 1);
      }
    };
    pointerSurface?.addEventListener('pointermove', handlePointerMove, { passive: true });
    pointerSurface?.addEventListener('pointerleave', handlePointerLeave);

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
      pointerSurface?.removeEventListener('pointermove', handlePointerMove);
      pointerSurface?.removeEventListener('pointerleave', handlePointerLeave);
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
