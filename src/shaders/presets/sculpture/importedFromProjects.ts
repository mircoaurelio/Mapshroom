import type { ShaderPresetDefinition } from '../types';

/**
 * Mondadori Profile 1 Statue timeline shaders that were not already present
 * in the default preset catalogs. Exposed as sculpture presets.
 */
export const importedSculpturePresetList: ShaderPresetDefinition[] = [
  {
    id: "timeline-5e36b310-7cf4-44a8-9cce-64af2b398f32",
    name: "1dxCustomizable Multiverse Aliens (Random Saccade Edition)",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 1dxCustomizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdSphere(vec3 p, float s) {\nreturn length(p) - s;\n}\nfloat hash11(float p) {\np = fract(p * 0.1031);\np *= p + 33.33;\np *= p + p;\nreturn fract(p);\n}\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\nfloat dartRate = max(1.0, speed * 0.08);\nfloat seedTime = floor(t * dartRate);\nfloat smoothT = smoothstep(0.0, 0.2, fract(t * dartRate));\nfloat prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\nfloat nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\nfloat curX = mix(prevX, nextX, smoothT);\nfloat prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\nfloat nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\nfloat curY = mix(prevY, nextY, smoothT);\nfloat jX = sin(t * speed) * cos(t * speed * 0.61);\nfloat jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\nfloat finalX = (curX * sideAmt) + (jX * twitch);\nfloat finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch);\nreturn vec2(finalX, finalY);\n}\nvec2 singleAlien(vec3 p, float time, float idOffset) {\np /= alienSize;\np.y = -p.y;\nfloat t = time + idOffset;\np.xy *= rot(sin(t * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\np.xz *= rot(eyeRot.x);\np.yz *= rot(eyeRot.y);\nfloat d = sdSphere(p, 1.0);\nfloat mat = 0.0;\nvec3 normP = normalize(p);\nif (normP.z > 0.0) {\nfloat r = length(normP.xy);\nfloat pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\nif (r < pSize) {\nmat = 2.0;\n} else if (r < irisSize) {\nmat = 1.0;\n}\n}\nreturn vec2(d * alienSize, mat);\n}\nvec2 map(vec3 p, float time) {\nvec2 res = vec2(1e10, 0.0);\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nvec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\nif (d.x < res.x) res = d;\n}\nreturn res;\n}\nvec3 getNormal(vec3 p, float t) {\nvec2 e = vec2(0.001, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, t).x - map(p - e.xyy, t).x,\nmap(p + e.yxy, t).x - map(p - e.yxy, t).x,\nmap(p + e.yyx, t).x - map(p - e.yyx, t).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\nif (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 4.0);\nvec3 rd = normalize(vec3(p, -3.5));\nfloat tDist = 0.0;\nvec2 res;\nfor(int i = 0; i < 64; i++) {\nres = map(ro + rd * tDist, time);\nif(res.x < 0.001 || tDist > 10.0) break;\ntDist += res.x;\n}\nif(res.x < 0.001) {\nvec3 pos = ro + rd * tDist;\nvec3 normal = getNormal(pos, time);\nvec3 viewDir = -rd;\nvec3 localPos = pos;\nfloat closestI = 0.0;\nfloat minDist = 100.0;\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nfloat d = length(pos - objectPos);\nif (d < minDist) { minDist = d; closestI = float(i); }\n}\nfloat xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\nlocalPos -= vec3(xOff + moveX, moveY, 0.0);\nlocalPos /= alienSize;\nlocalPos.y = -localPos.y;\nfloat t_loc = time + closestI * 4.0;\nlocalPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\nlocalPos.xz *= rot(eyeRot.x);\nlocalPos.yz *= rot(eyeRot.y);\nvec3 localNorm = normalize(localPos);\nfloat r = length(localNorm.xy);\nfloat angle = atan(localNorm.y, localNorm.x);\nvec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\nvec3 lDir = normalize(lp - pos);\nvec3 col = vec3(0.92, 0.88, 0.88);\nif (res.y == 0.0) {\nfloat warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\nfloat warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\nfloat mainVeins = sin((angle + warp1) * 12.0);\nmainVeins = smoothstep(0.95, 1.0, mainVeins);\nfloat secVeins = sin((angle + warp2) * 26.0);\nsecVeins = smoothstep(0.98, 1.0, secVeins);\nfloat veinMask = max(mainVeins, secVeins * 0.6);\nfloat breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\nveinMask *= mix(0.4, 1.0, breakup);\nfloat veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\nvec3 bloodCol = vec3(0.7, 0.05, 0.05);\ncol = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n} else if (res.y == 1.0) {\nfloat f = abs(sin(angle * 20.0 + detail));\nvec3 irisCol = vec3(0.2, 0.4, 0.8);\nirisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\ncol = mix(irisCol * 0.5, irisCol, f);\ncol *= smoothstep(irisSize, irisSize - 0.05, r);\n} else if (res.y == 2.0) {\ncol = vec3(0.02);\n}\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\nfloat glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\nvec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\nfinalCol += (spec + glint) * lightIntensity * 0.3;\nreturn vec4(finalCol * isNotBlack, base.a);\n}\nreturn vec4(0.0, 0.0, 0.0, base.a);\n}",
    uniformValues: {
          "lightHeight": 0.5,
          "lightIntensity": 4.5,
          "ambient": 0.56,
          "shininess": 120,
          "detail": 5,
          "blackThreshold": 0.05,
          "colorSpeed": 0.8,
          "alienCount": 1,
          "alienSpread": 1.41,
          "alienSize": 0.912,
          "moveX": 1.4,
          "moveY": -0.1,
          "irisSize": 0.584,
          "pupilSize": 0.372,
          "eyeDilation": 1.31,
          "veinIntensity": 0.57,
          "lookDownAmount": 0.225,
          "lookSideAmount": 0.405,
          "freneticSpeed": 4.8,
          "twitchIntensity": 0.08
    }
  },
  {
    id: "timeline-7b504049-02fd-49bb-8ac7-117d484a12a7",
    name: "3D Bump Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Bump Automata\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 0.2 @default 0.05\nuniform float bumpStrength; // @min 0.0 @max 50.0 @default 15.0\nuniform vec3 lightColor; // @default 1.0,0.9,0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nvec3 lumWeights = vec3(0.299, 0.587, 0.114);\nfloat origLum = dot(origSource.rgb, lumWeights);\nfloat mask = smoothstep(blackThreshold, blackThreshold + 0.02, origLum);\nif (mask <= 0.0) {\nreturn vec4(0.0, 0.0, 0.0, origSource.a);\n}\nvec2 eps = 1.0 / resolution;\nfloat hx = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumWeights);\nfloat hy = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumWeights);\nvec3 normal = normalize(vec3((origLum - hx) * bumpStrength, (origLum - hy) * bumpStrength, 1.0));\nvec3 lightDir = normalize(vec3(sin(time), cos(time), 1.5));\nfloat diffuse = max(dot(normal, lightDir), 0.2);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nfloat specular = pow(max(dot(normal, halfVector), 0.0), 32.0);\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat morphNx = node_noise(p - t * 0.3);\nfloat morphNy = node_noise(p + vec2(13.37) + t * 0.3);\nvec2 morphOffset = (vec2(morphNx, morphNy) - 0.5) * 2.0 * morphAmount;\nvec2 morphedUV = uv + morphOffset;\nvec4 source = texture2D(tex, morphedUV);\nfloat lum = dot(source.rgb, lumWeights);\nvec2 mp = morphedUV * scale;\nfloat n = node_noise(mp + lum * 2.0 - t * 0.5);\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topoX = sin((mp.x + lum * 1.5 + n) * lineDensity - t);\nfloat topoY = sin((mp.y + lum * 1.5 + n) * lineDensity - t);\nfloat lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * (lum + 0.3);\nvec3 finalCol = mix(source.rgb, effectCol, branch * 0.7 + lines * 0.6);\nfinalCol = finalCol * diffuse * lightColor + specular * lightColor;\nreturn vec4(finalCol, origSource.a);\n}",
    uniformValues: {
          "scale": 4.34,
          "lineDensity": 5,
          "blobColor": [
                0.27450980392156865,
                0.047058823529411764,
                0.1607843137254902
          ],
          "branchColor": [
                0.28627450980392155,
                0.16862745098039217,
                0.3137254901960784
          ],
          "blackThreshold": 0.07,
          "speed": 1.1,
          "morphAmount": 0.012,
          "bumpStrength": 14.5,
          "lightColor": [
                1,
                0.9,
                0.8
          ]
    }
  },
  {
    id: "timeline-43e55825-075d-4d13-9ab7-2a69a573d204",
    name: "3D Contrasted Radial Strobe Edge",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Contrasted Radial Strobe Edge\nuniform float speed; // @min 0.0 @max 5.0 @default 1.5\nuniform float warp; // @min 0.0 @max 0.2 @default 0.05\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.85\nuniform float trippy; // @min 0.0 @max 5.0 @default 2.0\nuniform float radialSpeed; // @min 0.0 @max 10.0 @default 4.0\nuniform float radialDensity; // @min 1.0 @max 50.0 @default 15.0\nuniform float strobeSpeed; // @min 0.0 @max 100.0 @default 40.0\n#define TAU 6.28318530718\nfloat luma(vec3 c) {\nreturn dot(c, vec3(0.2126, 0.7152, 0.0722));\n}\nvec3 palette(float t) {\nvec3 a = vec3(0.5);\nvec3 b = vec3(0.5);\nvec3 c = vec3(1.0, 1.2, 1.5) * trippy;\nvec3 d = vec3(0.00, 0.33, 0.67);\nreturn a + b * cos(TAU * (c * t + d));\n}\nfloat inkAt(sampler2D tex, vec2 uv) {\nuv = clamp(uv, 0.0, 1.0);\nfloat lum = luma(texture2D(tex, uv).rgb);\nreturn 1.0 - smoothstep(threshold - 0.15, threshold + 0.15, lum);\n}\nfloat blurInk(sampler2D tex, vec2 uv, vec2 px, float radiusPx) {\nvec2 r = px * radiusPx;\nfloat s = inkAt(tex, uv + vec2(1.0, 0.0)*r) + inkAt(tex, uv + vec2(-1.0, 0.0)*r) +\ninkAt(tex, uv + vec2(0.0, 1.0)*r) + inkAt(tex, uv + vec2(0.0, -1.0)*r);\nreturn s * 0.25;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origColor = texture2D(tex, uv);\nfloat origLum = luma(origColor.rgb);\nvec2 px = 1.0 / resolution.xy;\nfloat t = time * speed * 0.62;\nfloat symX = abs(uv.x - 0.5);\nfloat signX = sign(uv.x - 0.5);\nvec2 warpedUv = uv + vec2(sin(uv.y * 15.0 + t * 3.0) * signX, cos(symX * 30.0 - t * 2.5)) * warp;\nvec2 p = warpedUv - 0.5;\np.x *= resolution.x / resolution.y;\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat ink = inkAt(tex, warpedUv);\nfloat inkNear = blurInk(tex, warpedUv, px, 3.0);\nfloat inkFar = blurInk(tex, warpedUv, px, 9.0);\nfloat halo = clamp(inkFar - ink * 0.5, 0.0, 1.0);\nfloat filigree = clamp((inkNear - ink) * 2.0, 0.0, 1.0);\nvec2 drift = vec2(sin(9.0 * p.y + t * 2.7), cos(11.0 * p.x - t * 2.5));\nvec2 q = p + drift * 0.2;\nfloat rq = length(q);\nfloat aq = atan(q.y, q.x);\nfloat field = 0.5 + 0.5 * sin(20.0 * aq - 12.0 * rq - t * 5.2);\nfloat auraWave = 0.5 + 0.5 * sin(40.0 * r - 20.0 * a - t * 8.0);\nvec3 psyA = palette(t * 0.2 + field * 1.5 + auraWave * 0.5);\nvec3 psyB = palette(t * 0.3 - field * 1.2 + sin(8.0 * a - t * 2.0));\nvec3 psyC = palette(rq * 5.0 - t * 0.5 + aq * 2.0);\nvec3 sourceColor = texture2D(tex, warpedUv).rgb;\nvec3 color = sourceColor * mix(vec3(1.0), psyC * 2.0, 0.5 + 0.5 * sin(t + r * 10.0));\ncolor += psyA * (0.3 + 0.7 * field) * (1.0 - ink);\ncolor += psyB * pow(halo, 0.9) * (0.8 + 1.2 * auraWave);\ncolor += psyC * pow(filigree, 1.1) * 1.5;\ncolor *= 1.0 - ink;\nfloat perfectR = length((uv - 0.5) * vec2(resolution.x / resolution.y, 1.0));\nfloat radialWave = pow(sin(perfectR * radialDensity + time * radialSpeed) * 0.5 + 0.5, 2.0);\nfloat strobe = step(0.5, sin(time * strobeSpeed));\ncolor += radialWave * strobe * psyA * origLum;\nreturn vec4(clamp(color, 0.0, 1.0), origColor.a);\n}",
    uniformValues: {
          "speed": 4.65,
          "warp": 0.012,
          "threshold": 0.73,
          "trippy": 1.95,
          "radialSpeed": 7.6,
          "radialDensity": 46.08,
          "strobeSpeed": 78
    }
  },
  {
    id: "timeline-86a55801-270a-4b66-be23-482d895ae43c",
    name: "3D Falling Cubes Morphed",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Falling Cubes Morphed\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float pixelSize; // @min 8.0 @max 64.0 @default 24.0\nuniform float speed; // @min 0.1 @max 3.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 orig = texture2D(tex, uv);\nfloat brightness = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = step(threshold, brightness) * orig.a;\nvec2 distortedUV = uv;\ndistortedUV.y -= brightness * morphAmount;\ndistortedUV.x += (uv.x - 0.5) * 2.0 * brightness * morphAmount * 0.2;\nvec2 gridUv = distortedUV * resolution / pixelSize;\nvec2 cell = floor(gridUv);\nvec2 local = fract(gridUv);\nfloat colRand = node_rand(vec2(cell.x, 1.0));\nfloat fallOffset = time * speed * (0.5 + colRand * 1.5);\nfloat row = floor(gridUv.y - fallOffset);\nfloat blockRand = node_rand(vec2(cell.x, row));\nfloat activeBlock = step(0.4, blockRand) * mask;\nfloat edgeX = smoothstep(0.0, 0.15, local.x) * smoothstep(1.0, 0.85, local.x);\nfloat edgeY = smoothstep(0.0, 0.15, local.y) * smoothstep(1.0, 0.85, local.y);\nfloat shading = edgeX * edgeY * (0.6 + 0.4 * blockRand);\nvec3 finalColor = orig.rgb * shading;\nreturn vec4(finalColor * activeBlock, orig.a * activeBlock);\n}",
    uniformValues: {
          "threshold": 0.33,
          "pixelSize": 12.48,
          "speed": 2.855,
          "morphAmount": 0.09
    }
  },
  {
    id: "timeline-d86c2b79-874c-47cd-921a-a67394781b18",
    name: "3D Fractal Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Fractal Automata\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nvec3 JuliaFractal(vec2 c, vec2 c2, float animparam, float anim2) {\nvec2 z = c;\nfloat mean = 0.0;\nfor(int i = 0; i < 32; i++) {\nvec2 a = vec2(z.x, abs(z.y));\nfloat b = atan(a.y * (0.99 + animparam * 9.0), a.x + 0.110765 + animparam);\nif(b > 0.0) {\nb -= 6.3034 + (animparam * 3.1513);\n}\nz = vec2(log(length(a * (0.98899 - (animparam * 2.70 * anim2)))), b) + c2;\nif (i > 0) {\nmean += length(z / a * b);\n}\nmean += a.x - (b * 77.0 / length(a * b));\n}\nmean = clamp(mean, 111.0, 99999.0) / 131.21;\nfloat ci = 1.0 - fract(log2(0.5 * log2(mean / (0.5789 - abs(animparam * 141.0)))));\nreturn vec3(\n0.5 + 0.5 * cos(6.0 * ci),\n0.5 + 0.75 * cos(6.0 * ci + 0.14),\n0.5 + 0.5 * cos(6.0 * ci + 0.7)\n);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec2 p = uv * scale;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nfloat noiseVal = node_noise(q + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity);\nfloat lines = smoothstep(0.8, 0.95, topo);\nfloat t = time * speed;\nfloat animWings = 0.004 * cos(t * 0.5);\nfloat animFlap = 0.011 * sin(t * 1.0);\nvec2 displacedUV = uv + (n - 0.5) * 0.1 * lum;\nvec2 f_uv = (displacedUV - 0.5) / (1.5113 * abs(sin(36.3199)));\nf_uv.y -= animWings * 5.0;\nvec2 tuv = f_uv * 125.0;\nf_uv = vec2(-tuv.y, 1.05 * tuv.x);\nfloat yCoord = max(displacedUV.y * resolution.y, 1.0);\nfloat juliax = tan(36.3199) * 0.011 + 0.02 / (yCoord * 0.19531 * (1.0 - animFlap));\nfloat juliay = cos(36.3199 * 0.213) * (0.022 + animFlap) + 5.66752 - (juliax * 1.5101);\nvec3 fractalColor = JuliaFractal(f_uv, vec2(juliax, juliay), animWings, animFlap);\nfractalColor = vec3(1.0) - fractalColor.zyx;\nvec3 effectCol = mix(source.rgb, fractalColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 finalCol = mix(source.rgb, effectCol, mask);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "threshold": 0.445,
          "speed": 1,
          "scale": 10,
          "lineDensity": 20
    }
  },
  {
    id: "timeline-1308b45d-6ac1-4d1a-928e-d2c932f7101f",
    name: "3D Lit Ripple Masked",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Lit Ripple Masked\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float rippleStrength; // @min 0.0 @max 0.1 @default 0.02\nuniform float shadowStrength; // @min 0.0 @max 1.0 @default 0.6\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.2\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\nuniform vec3 lightDir; // @default 0.5,0.5,0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origColor = texture2D(tex, uv);\nfloat origLuma = dot(origColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = step(blackThreshold, origLuma);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 p = (uv - 0.5) * aspect;\nfloat t = time * speed;\nvec2 move = vec2(\nabs(fract(t * 0.3) * 2.0 - 1.0) - 0.5,\nabs(fract(t * 0.43) * 2.0 - 1.0) - 0.5\n) * aspect * 0.8;\nfloat dist = length(p - move);\nvec2 dir = dist > 0.0 ? (p - move) / dist : vec2(0.0);\nfloat rippleEnvelope = exp(-dist * 4.0);\nfloat phase = dist * 30.0 - time * 10.0;\nfloat ripple = sin(phase) * rippleEnvelope;\nfloat rippleSlope = cos(phase) * rippleEnvelope;\nvec2 displacedUV = uv + dir * ripple * rippleStrength;\nvec4 texColor = texture2D(tex, displacedUV);\nvec3 N = normalize(vec3(-dir * rippleSlope * 100.0 * rippleStrength, 1.0));\nvec3 L = normalize(lightDir);\nfloat diff = max(dot(N, L), 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(L + viewDir);\nfloat spec = pow(max(dot(N, halfDir), 0.0), 32.0) * rippleEnvelope;\nfloat ambient = 1.0 - shadowStrength;\ntexColor.rgb = texColor.rgb * (diff * shadowStrength + ambient);\ntexColor.rgb += spec * 0.6;\ntexColor.rgb = (texColor.rgb - 0.5) * contrast + 0.5 + luminosity;\nvec3 highlight = vec3(\n0.5 + 0.5 * sin(time * 2.0),\n0.5 + 0.5 * cos(time * 1.3),\n0.5 + 0.5 * sin(time * 0.7 + 2.0)\n);\nfloat glow = smoothstep(0.15, 0.0, dist);\nfloat currentLuma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));\ntexColor.rgb += highlight * glow * currentLuma * 1.5;\ntexColor.rgb *= mask;\ntexColor.a = origColor.a;\nreturn texColor;\n}",
    uniformValues: {
          "speed": 0.1,
          "rippleStrength": 0.014,
          "shadowStrength": 1,
          "blackThreshold": 0.21,
          "contrast": 2.85,
          "luminosity": 0.22,
          "lightDir": [
                0.9411764705882353,
                0.9372549019607843,
                0.9372549019607843
          ]
    }
  },
  {
    id: "timeline-96067366-b7cc-494f-8d83-ffbec38729d1",
    name: "3D Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Luma Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nfloat getLuma(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\nvec2 q = uv * scale;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(float(i)), cos(float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity));\nvec3 effectCol = mix(blobColor, branchColor, branch) + vec3(1.0) * lines * lum * 1.5;\nvec3 segColor = mix(bgCol, effectCol, mask * branch);\nvec2 eps = 1.0 / resolution;\nfloat l = getLuma(tex, uv - vec2(eps.x, 0.0));\nfloat r = getLuma(tex, uv + vec2(eps.x, 0.0));\nfloat d = getLuma(tex, uv - vec2(0.0, eps.y));\nfloat u = getLuma(tex, uv + vec2(0.0, eps.y));\nvec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\nvec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\nvec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat diff = max(dot(normal, lightDir), 0.0);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\nvec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\nvec3 finalColor = segColor * finalLight;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "depth": 10,
          "lightIntensity": 3.6,
          "lightColor": [
                0.23921568627450981,
                0,
                0.4
          ],
          "ambientLight": 0.32,
          "lightZ": 0.0498,
          "specularStrength": 2.25,
          "lightSpeed": 3.5,
          "scale": 10,
          "threshold": 0.28,
          "lineDensity": 20,
          "blobColor": [
                0.2,
                0.9,
                0.6
          ],
          "branchColor": [
                0.8,
                0.3,
                0.7
          ],
          "blackout": 1
    }
  },
  {
    id: "timeline-1fefae82-d782-4c0b-8136-71ba5a590554",
    name: "3D Luma Automata Lights",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Luma Automata Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(sampler2D tex, vec2 uv) {\nvec3 col = texture2D(tex, uv).rgb;\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = getLum(tex, uv);\nvec2 p = uv * s;\nfloat t = time * spd;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 3; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nreturn n / sumAmp;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.01;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 surfacePos = vec3(uv, h0 * bump * 0.05);\nvec3 totalLight = vec3(0.0);\nfor(int i = 0; i < 15; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 1.3),\n0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 8.0);\ntotalLight += lCol * diff * atten * 0.5;\n}\nvec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 0.216,
          "scale": 4.88,
          "bump": 4.902,
          "threshold": 0.035
    }
  },
  {
    id: "timeline-40ed00c5-94d9-4f43-8cb3-7eaf55bfe2aa",
    name: "3D Luma Automata Lights",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Luma Automata Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(sampler2D tex, vec2 uv) {\nvec3 col = texture2D(tex, uv).rgb;\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = getLum(tex, uv);\nvec2 p = uv * s;\nfloat t = time * spd;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 3; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nreturn n / sumAmp;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.01;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 surfacePos = vec3(uv, h0 * bump * 0.05);\nvec3 totalLight = vec3(0.0);\nfor(int i = 0; i < 15; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 1.3),\n0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 8.0);\ntotalLight += lCol * diff * atten * 0.5;\n}\nvec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 2.942,
          "scale": 2,
          "bump": 5,
          "threshold": 0.05
    }
  },
  {
    id: "timeline-8f3ff811-3b4d-47f7-bdf2-7ccd9b497f9f",
    name: "3D Matrix Letters Reversed",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Matrix Letters Reversed\nuniform float morphAmount; // @min 0.0 @max 1.0 @default 0.3\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 matrixColor; // @default 0.0,1.0,0.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float scale; // @min 0.1 @max 5.0 @default 1.0\nuniform float brightness; // @min 0.0 @max 5.0 @default 1.8\nuniform float trailLength; // @min 1.0 @max 10.0 @default 4.0\nfloat fallerSpeed(float col) {\nreturn node_rand(vec2(col, 0.0)) * 0.8 + 0.2;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec2 distortedUV = uv;\ndistortedUV.y -= lum * morphAmount;\ndistortedUV.x += (uv.x - 0.5) * 2.0 * lum * morphAmount * 0.2;\nvec2 cells = vec2(64.0, 30.0) * scale;\nvec2 pix = mod(distortedUV, 1.0 / cells);\nvec2 cell = floor(distortedUV * cells);\nvec2 localUV = pix * cells;\nvec2 subGrid = floor(localUV * vec2(3.0, 5.0));\nfloat bitIndex = subGrid.y * 3.0 + subGrid.x;\nfloat charSeed = node_rand(cell + floor(time * speed * 4.0));\nfloat charId = floor(charSeed * 32768.0);\nfloat isGlyphPixel = mod(floor(charId / exp2(bitIndex)), 2.0);\nfloat margin = step(0.15, localUV.x) * step(localUV.x, 0.85) * step(0.1, localUV.y) * step(localUV.y, 0.9);\nfloat c = isGlyphPixel * margin;\nfloat drop = fract(cell.y / cells.y - time * speed * fallerSpeed(cell.x));\nfloat b = pow(1.0 - drop, trailLength);\nif (drop < 0.05) {\nb += 1.5;\n}\nvec3 matrixEffect = matrixColor * c * b * (lum + 0.4) * brightness;\nfloat mask = smoothstep(threshold, threshold + 0.05, lum);\nvec3 finalColor = mix(source.rgb, matrixEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "morphAmount": 0.38,
          "speed": 2.305,
          "matrixColor": [
                0,
                1,
                0
          ],
          "threshold": 0.07,
          "scale": 1.129,
          "brightness": 1.9,
          "trailLength": 2.98
    }
  },
  {
    id: "timeline-3775f31c-e235-4108-8ea0-c9809c9e6949",
    name: "3D Spotlight Tracer",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Spotlight Tracer\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float contrast; // @min 1.0 @max 5.0 @default 1.5\nuniform float depth; // @min 0.1 @max 5.0 @default 1.5\nvec3 hsv2rgb(vec3 c) {\nvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\nvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\nreturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec3 calcLight(vec3 lightPos, vec3 lightCol, vec3 normal, vec3 fragPos, vec3 viewDir) {\nvec3 lightDir = normalize(lightPos - fragPos);\nfloat diff = max(dot(normal, lightDir), 0.0);\nvec3 reflectDir = reflect(-lightDir, normal);\nfloat spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);\nfloat dist = length(lightPos - fragPos);\nfloat attenuation = 1.0 / (1.0 + 2.0 * dist * dist);\nreturn lightCol * (diff * 0.8 + spec * 1.2) * attenuation;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nvec2 off = 1.0 / resolution;\nfloat t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\nfloat t10 = texture2D(tex, uv + vec2( 0.0, -off.y)).r;\nfloat t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2( off.x, 0.0)).r;\nfloat t02 = texture2D(tex, uv + vec2(-off.x, off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2( 0.0, off.y)).r;\nfloat t22 = texture2D(tex, uv + vec2( off.x, off.y)).r;\nfloat gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\nfloat gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\nvec3 normal = normalize(vec3(gx, gy, 1.0 / depth));\nvec3 fragPos = vec3(uv * 2.0 - 1.0, 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lPos1 = vec3(sin(time * speed * 0.3) * 0.8, cos(time * speed * 0.3) * 0.8, 0.3);\nvec3 lPos2 = vec3(cos(time * speed * 0.24) * 0.8, sin(time * speed * 0.24) * 0.8, 0.3);\nvec3 lPos3 = vec3(sin(time * speed * 0.18 + 2.0) * 0.8, cos(time * speed * 0.18 + 2.0) * 0.8, 0.3);\nvec3 lCol1 = hsv2rgb(vec3(time * 0.1, 1.0, 1.0));\nvec3 lCol2 = hsv2rgb(vec3(time * 0.1 + 0.33, 1.0, 1.0));\nvec3 lCol3 = hsv2rgb(vec3(time * 0.1 + 0.66, 1.0, 1.0));\nvec3 lighting = calcLight(lPos1, lCol1, normal, fragPos, viewDir) +\ncalcLight(lPos2, lCol2, normal, fragPos, viewDir) +\ncalcLight(lPos3, lCol3, normal, fragPos, viewDir);\nvec3 finalColor = baseColor.rgb * lighting * contrast;\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": 10,
          "contrast": 1,
          "depth": 5
    }
  },
  {
    id: "timeline-1d7e1953-8d5f-4267-bddb-c21d3a4573c3",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 5.41,
          "speed": -9.8,
          "arms": 2.44,
          "posX": 0.01,
          "posY": -0.19,
          "spiralDist": 0.13,
          "colorShift": 3.454,
          "colorFreq": 5.941,
          "spiralColor": [
                0.27058823529411763,
                0.24313725490196078,
                0.27450980392156865
          ],
          "morphDepth": 8.7,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-324e3e70-3088-4eee-926f-39c55a6fbafe",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 7.37,
          "speed": 1.6,
          "arms": 1.63,
          "posX": 0,
          "posY": -0.05,
          "spiralDist": 0.07,
          "colorShift": 0.2512,
          "colorFreq": 10,
          "spiralColor": [
                0.23921568627450981,
                0.11372549019607843,
                0.24313725490196078
          ],
          "morphDepth": 5.9,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-3dadcd1d-0015-4398-acec-77c550ea7de9",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 2.96,
          "speed": -8.8,
          "arms": 1.72,
          "posX": 0,
          "posY": -0.15,
          "spiralDist": 0.13,
          "colorShift": 3.454,
          "colorFreq": 5.941,
          "spiralColor": [
                0.2196078431372549,
                0.13333333333333333,
                0.058823529411764705
          ],
          "morphDepth": 0.4,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-9e308c31-b4e9-44c2-9a3d-13d727bfea23",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 42.16,
          "speed": -9.8,
          "arms": 2.44,
          "posX": -0.42,
          "posY": 0.04,
          "spiralDist": 0.06,
          "colorShift": 5.4636,
          "colorFreq": 0.397,
          "spiralColor": [
                0.32941176470588235,
                0.011764705882352941,
                0.011764705882352941
          ],
          "morphDepth": 10,
          "blackThreshold": 0.1211
    }
  },
  {
    id: "timeline-a5885cdc-8851-4407-9905-4c03ae8aa1d6",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 42.16,
          "speed": -9.8,
          "arms": 2.44,
          "posX": 0.45,
          "posY": 0.04,
          "spiralDist": 0.06,
          "colorShift": 0.5024,
          "colorFreq": 0.397,
          "spiralColor": [
                0.32941176470588235,
                0.011764705882352941,
                0.011764705882352941
          ],
          "morphDepth": 10,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-a9cefb2d-7232-4542-a899-480aaeff89a3",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 24.52,
          "speed": 7.6,
          "arms": 1.63,
          "posX": 0.36,
          "posY": 0.5,
          "spiralDist": 0.65,
          "colorShift": 5.2752,
          "colorFreq": 0.991,
          "spiralColor": [
                0.09019607843137255,
                0.07450980392156863,
                0.047058823529411764
          ],
          "morphDepth": 4.2,
          "blackThreshold": 0.1903
    }
  },
  {
    id: "timeline-c66e0916-d8f3-4355-8970-56ba50729b1c",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 4.43,
          "speed": -8.4,
          "arms": 1.63,
          "posX": 0,
          "posY": -0.05,
          "spiralDist": 0.07,
          "colorShift": 0.3768,
          "colorFreq": 9.01,
          "spiralColor": [
                0.09019607843137255,
                0.054901960784313725,
                0.011764705882352941
          ],
          "morphDepth": 1.4,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-ca5bada9-08c4-4bc8-b345-49c5a25fa90c",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 5.41,
          "speed": -9.2,
          "arms": 2.44,
          "posX": 0.41,
          "posY": -0.19,
          "spiralDist": 0.13,
          "colorShift": 3.454,
          "colorFreq": 5.941,
          "spiralColor": [
                0.10588235294117647,
                0.15294117647058825,
                0.12156862745098039
          ],
          "morphDepth": 8.7,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-d78e5564-d7ba-436a-9bba-b1d41178be40",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mirrorX = abs(uv.x - 0.5 - posX) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * 3.0 - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 22.56,
          "speed": -8.2,
          "arms": 1.63,
          "posX": 0,
          "posY": -0.05,
          "spiralDist": 0.07,
          "colorShift": 6.2172,
          "morphDepth": 3,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-e704beaf-2f7f-499a-ae66-fb68d8f201af",
    name: "3D Surface Morph Spirals",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Surface Morph Spirals\nuniform float twists; // @min 1.0 @max 50.0 @default 15.0\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float arms; // @min 1.0 @max 10.0 @default 4.0\nuniform float posX; // @min -0.5 @max 0.5 @default 0.0\nuniform float posY; // @min -0.5 @max 0.5 @default 0.0\nuniform float spiralDist; // @min 0.0 @max 1.0 @default 0.25\nuniform float colorShift; // @min 0.0 @max 6.28 @default 0.0\nuniform float colorFreq; // @min 0.1 @max 10.0 @default 3.0\nuniform vec3 spiralColor; // @default 1.0,1.0,1.0\nuniform float morphDepth; // @min 0.0 @max 10.0 @default 3.0\nuniform float blackThreshold; // @min 0.0 @max 1.73 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) > blackThreshold) {\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat dx = uv.x - 0.5 - posX;\nfloat mirrorX = sqrt(dx * dx + 0.02) - spiralDist;\nvec2 delta = vec2(mirrorX, uv.y - 0.5 - posY);\nfloat r = length(delta);\nfloat a = atan(delta.y, delta.x);\nfloat z = 0.2 / (r + 0.02) + lum * morphDepth;\nfloat spiral = sin(a * arms + z * twists - time * speed);\nvec3 psyColor = 0.5 + 0.5 * cos(time * 2.0 + z * colorFreq - a * 2.0 + vec3(0.0, 0.33, 0.67) * 6.28318 + colorShift);\npsyColor *= spiralColor;\nfloat glow = exp(-r * 4.0) * 2.0;\nvec3 fx = psyColor * (spiral * 0.5 + 0.5) * (1.0 + glow);\nsource.rgb = mix(source.rgb, fx + source.rgb * psyColor, 0.85);\n}\nreturn source;\n}",
    uniformValues: {
          "twists": 4.43,
          "speed": 6,
          "arms": 8.38,
          "posX": 0,
          "posY": -0.25,
          "spiralDist": 0.13,
          "colorShift": 3.454,
          "colorFreq": 9.01,
          "spiralColor": [
                0.3686274509803922,
                0.2784313725490196,
                0.14901960784313725
          ],
          "morphDepth": 0.7,
          "blackThreshold": 0.1038
    }
  },
  {
    id: "timeline-8cd13d99-c0a0-4c78-af53-a0ad97e4a283",
    name: "3D Topo Glass",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Topo Glass\nuniform float speed; // @min 0.0 @max 3.0 @default 0.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float specularity; // @min 0.0 @max 2.0 @default 1.2\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getHeight(sampler2D tex, vec2 uv, float t, float scale, float lineDensity) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 p = uv * scale;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 3; i++) {\nfloat noiseVal = node_noise(q + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 2.0);\nreturn topo * 0.1;\n}\nvec3 getNormal(sampler2D tex, vec2 uv, float t, float scale, float lineDensity) {\nvec2 e = vec2(0.002, 0.0);\nfloat h = getHeight(tex, uv, t, scale, lineDensity);\nfloat hx = getHeight(tex, uv + e.xy, t, scale, lineDensity);\nfloat hy = getHeight(tex, uv + e.yx, t, scale, lineDensity);\nreturn normalize(vec3(hx - h, hy - h, 0.01));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 originalColor = texture2D(tex, uv);\nfloat luma = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold - 0.05, threshold + 0.05, luma);\nfloat t = time * speed;\nvec3 n = getNormal(tex, uv, t, scale, lineDensity);\nvec2 refractedUV = uv - n.xy * distortion;\nvec4 effectColor = texture2D(tex, refractedUV);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfVector), 0.0), 64.0) * specularity;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0) * 0.4;\nvec3 finalEffectColor = effectColor.rgb + vec3(spec) + vec3(fresnel);\nvec3 finalColor = mix(originalColor.rgb, finalEffectColor, mask);\nreturn vec4(finalColor, originalColor.a);\n}",
    uniformValues: {
          "speed": 2.13,
          "scale": 10,
          "distortion": 0.028,
          "specularity": 0.28,
          "lineDensity": 20,
          "threshold": 0.15
    }
  },
  {
    id: "timeline-17f48c94-4678-40a5-b950-c22993b24dc2",
    name: "3D Tunnel Inside Image",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 3D Tunnel Inside Image\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.01\nuniform float speed; // @min 0.0 @max 10.0 @default 4.0\nuniform float tunnelRadius; // @min 1.0 @max 10.0 @default 4.0\nuniform float orbSize; // @min 0.0 @max 2.0 @default 0.01\nuniform float colorIntensity; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 gradientStart; // @default 1.0,0.2,0.5\nuniform vec3 gradientEnd; // @default 0.2,0.6,1.0\nvec3 getPathPosition(float z) {\nreturn vec3(12.0 * cos(z * vec2(0.1, 0.12)), z);\n}\nvec3 safe_tanh(vec3 x) {\nvec3 e2x = exp(-2.0 * x);\nreturn (1.0 - e2x) / (1.0 + e2x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = (uv - 0.5) * resolution / resolution.y;\nfloat animTime = time * speed + 5.0 + 5.0 * sin(time * 0.3);\nvec3 rayOrigin = getPathPosition(animTime);\nvec3 lookTarget = getPathPosition(animTime + 4.0);\nvec3 forward = normalize(lookTarget - rayOrigin);\nvec3 right = normalize(vec3(-forward.z, 0.0, forward.x));\nvec3 up = cross(forward, right);\nvec3 rayDir = normalize(p.x * right + p.y * up + forward);\nfloat stepDist = 1.0;\nfloat totalDist = 0.0;\nfloat orbDist = 1.0;\nvec3 accumulatedColor = vec3(0.0);\nvec3 rayPos = rayOrigin;\nfor (int i = 1; i <= 28; i++) {\nif (totalDist >= 30.0) break;\nfloat fi = float(i);\nrayPos += rayDir * stepDist;\nvec3 pathCenter = getPathPosition(rayPos.z);\nfloat sineTime = sin(time);\nvec3 orbCenter = vec3(\npathCenter.x + sineTime,\npathCenter.y + sineTime * 2.0,\n6.0 + animTime + sineTime * 2.0\n);\norbDist = length(rayPos - orbCenter) - orbSize;\nfloat baseRadius = cos(rayPos.z * 0.6) * 2.0 + tunnelRadius;\nfloat tunnelStructure = min(\nlength(rayPos.xy - pathCenter.x - 6.0),\nlength((rayPos - pathCenter).xy)\n);\nfloat largeScoops = abs(dot(sin(0.4 * rayPos), vec3(0.25))) / 0.1;\nfloat detailTexture = abs(dot(sin(animTime + 16.0 * rayPos), vec3(0.22))) / 2.0;\nfloat carvedDist = baseRadius - tunnelStructure + largeScoops + detailTexture;\nvec3 fluidPos = rayPos;\nfor (int j = 1; j <= 5; j++) {\nfloat fj = float(j);\nfluidPos += sin(fluidPos.yzx * fj + time + 0.5 * fi) / fj;\n}\nfloat fluidTunnelDist = 0.4 * length(vec4(0.3 * cos(fluidPos) - 0.3, carvedDist));\nstepDist = min(orbDist, fluidTunnelDist);\ntotalDist += stepDist;\nvec3 palette = 1.0 + cos(fluidPos.y + fi * 0.4 + vec3(6.0, 1.0, 2.0));\naccumulatedColor += (2.5 * palette / stepDist + 10.0 * palette / max(orbDist, 0.6)) / fi;\n}\nvec3 tunnelColor = safe_tanh(accumulatedColor * accumulatedColor * colorIntensity / 1500.0);\nvec3 grad = mix(gradientStart, gradientEnd, uv.y);\nfloat shadow = smoothstep(1.2, 0.2, length(uv - 0.5) * 1.5);\nvec3 insideEffect = source.rgb * tunnelColor * grad * shadow * 3.0;\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(blackThreshold, blackThreshold + 0.1, lum) * source.a;\nvec3 finalColor = mix(source.rgb, insideEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "blackThreshold": 0,
          "speed": 2.8,
          "tunnelRadius": 8.74,
          "orbSize": 0.01,
          "colorIntensity": 1.619,
          "gradientStart": [
                0.7215686274509804,
                1,
                0.2
          ],
          "gradientEnd": [
                0.6509803921568628,
                0.12549019607843137,
                0.09019607843137255
          ]
    }
  },
  {
    id: "timeline-1232f80d-bbb7-40cb-bb19-0447ad7f5628",
    name: "4Customizable Multiverse Aliens (Random Saccade Edition)",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: 4Customizable Multiverse Aliens (Random Saccade Edition)\nuniform float lightHeight; // @min 0.01 @max 1.0 @default 0.5\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.5\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.1\nuniform float shininess; // @min 1.0 @max 200.0 @default 120.0\nuniform float detail; // @min 0.1 @max 10.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float colorSpeed; // @min 0.0 @max 5.0 @default 0.8\nuniform float alienCount; // @min 1.0 @max 5.0 @default 1.0\nuniform float alienSpread; // @min 0.5 @max 4.0 @default 2.0\nuniform float alienSize; // @min 0.1 @max 3.0 @default 1.2\nuniform float moveX; // @min -5.0 @max 5.0 @default 0.0\nuniform float moveY; // @min -5.0 @max 5.0 @default 0.0\nuniform float irisSize; // @min 0.2 @max 0.8 @default 0.45\nuniform float pupilSize; // @min 0.1 @max 0.5 @default 0.2\nuniform float eyeDilation; // @min 0.5 @max 1.5 @default 1.0\nuniform float veinIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float lookDownAmount; // @min 0.0 @max 1.5 @default 0.6\nuniform float lookSideAmount; // @min 0.0 @max 1.5 @default 0.8\nuniform float freneticSpeed; // @min 0.0 @max 60.0 @default 35.0\nuniform float twitchIntensity; // @min 0.0 @max 0.5 @default 0.15\nmat2 rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat sdSphere(vec3 p, float s) {\nreturn length(p) - s;\n}\nfloat hash11(float p) {\np = fract(p * 0.1031);\np *= p + 33.33;\np *= p + p;\nreturn fract(p);\n}\nvec2 getEyeRotation(float t, float speed, float sideAmt, float downAmt, float twitch) {\nfloat dartRate = max(1.0, speed * 0.08);\nfloat seedTime = floor(t * dartRate);\nfloat smoothT = smoothstep(0.0, 0.2, fract(t * dartRate));\nfloat prevX = (hash11(seedTime * 12.34) - 0.5) * 2.0;\nfloat nextX = (hash11((seedTime + 1.0) * 12.34) - 0.5) * 2.0;\nfloat curX = mix(prevX, nextX, smoothT);\nfloat prevY = (hash11(seedTime * 45.67) - 0.5) * 2.0;\nfloat nextY = (hash11((seedTime + 1.0) * 45.67) - 0.5) * 2.0;\nfloat curY = mix(prevY, nextY, smoothT);\nfloat jX = sin(t * speed) * cos(t * speed * 0.61);\nfloat jY = cos(t * speed * 0.83) * sin(t * speed * 1.27);\nfloat finalX = (curX * sideAmt) + (jX * twitch);\nfloat finalY = (curY * downAmt) - (downAmt * 0.3) + (jY * twitch);\nreturn vec2(finalX, finalY);\n}\nvec2 singleAlien(vec3 p, float time, float idOffset) {\np /= alienSize;\np.y = -p.y;\nfloat t = time + idOffset;\np.xy *= rot(sin(t * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\np.xz *= rot(eyeRot.x);\np.yz *= rot(eyeRot.y);\nfloat d = sdSphere(p, 1.0);\nfloat mat = 0.0;\nvec3 normP = normalize(p);\nif (normP.z > 0.0) {\nfloat r = length(normP.xy);\nfloat pSize = pupilSize * (1.0 + sin(time * 2.0) * 0.05 * eyeDilation);\nif (r < pSize) {\nmat = 2.0;\n} else if (r < irisSize) {\nmat = 1.0;\n}\n}\nreturn vec2(d * alienSize, mat);\n}\nvec2 map(vec3 p, float time) {\nvec2 res = vec2(1e10, 0.0);\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nvec2 d = singleAlien(p - objectPos, time, float(i) * 4.0);\nif (d.x < res.x) res = d;\n}\nreturn res;\n}\nvec3 getNormal(vec3 p, float t) {\nvec2 e = vec2(0.001, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, t).x - map(p - e.xyy, t).x,\nmap(p + e.yxy, t).x - map(p - e.yxy, t).x,\nmap(p + e.yyx, t).x - map(p - e.yyx, t).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat isNotBlack = smoothstep(blackThreshold, blackThreshold + 0.05, max(max(base.r, base.g), base.b));\nif (isNotBlack < 0.01) return vec4(0.0, 0.0, 0.0, base.a);\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\nvec3 ro = vec3(0.0, 0.0, 4.0);\nvec3 rd = normalize(vec3(p, -3.5));\nfloat tDist = 0.0;\nvec2 res;\nfor(int i = 0; i < 64; i++) {\nres = map(ro + rd * tDist, time);\nif(res.x < 0.001 || tDist > 10.0) break;\ntDist += res.x;\n}\nif(res.x < 0.001) {\nvec3 pos = ro + rd * tDist;\nvec3 normal = getNormal(pos, time);\nvec3 viewDir = -rd;\nvec3 localPos = pos;\nfloat closestI = 0.0;\nfloat minDist = 100.0;\nfloat count = floor(alienCount);\nfor(int i = 0; i < 5; i++) {\nif (float(i) >= count) break;\nfloat xOffset = (float(i) - (count - 1.0) * 0.5) * alienSpread;\nvec3 objectPos = vec3(xOffset + moveX, moveY, 0.0);\nfloat d = length(pos - objectPos);\nif (d < minDist) { minDist = d; closestI = float(i); }\n}\nfloat xOff = (closestI - (count - 1.0) * 0.5) * alienSpread;\nlocalPos -= vec3(xOff + moveX, moveY, 0.0);\nlocalPos /= alienSize;\nlocalPos.y = -localPos.y;\nfloat t_loc = time + closestI * 4.0;\nlocalPos.xy *= rot(sin(t_loc * 0.5) * 0.05);\nvec2 eyeRot = getEyeRotation(t_loc, freneticSpeed, lookSideAmount, lookDownAmount, twitchIntensity);\nlocalPos.xz *= rot(eyeRot.x);\nlocalPos.yz *= rot(eyeRot.y);\nvec3 localNorm = normalize(localPos);\nfloat r = length(localNorm.xy);\nfloat angle = atan(localNorm.y, localNorm.x);\nvec3 lp = vec3(2.0 * sin(time), 3.0, 5.0 * lightHeight);\nvec3 lDir = normalize(lp - pos);\nvec3 col = vec3(0.92, 0.88, 0.88);\nif (res.y == 0.0) {\nfloat warp1 = sin(localNorm.z * 15.0) * 0.15 + cos(localNorm.z * 25.0) * 0.05;\nfloat warp2 = cos(localNorm.z * 20.0) * 0.25 - sin(localNorm.z * 40.0) * 0.1;\nfloat mainVeins = sin((angle + warp1) * 12.0);\nmainVeins = smoothstep(0.95, 1.0, mainVeins);\nfloat secVeins = sin((angle + warp2) * 26.0);\nsecVeins = smoothstep(0.98, 1.0, secVeins);\nfloat veinMask = max(mainVeins, secVeins * 0.6);\nfloat breakup = smoothstep(0.0, 0.5, sin(localNorm.z * 50.0 + angle * 5.0) * 0.5 + 0.5);\nveinMask *= mix(0.4, 1.0, breakup);\nfloat veinFade = smoothstep(irisSize - 0.02, irisSize + 0.5, r);\nvec3 bloodCol = vec3(0.7, 0.05, 0.05);\ncol = mix(col, bloodCol, veinMask * veinFade * veinIntensity);\n} else if (res.y == 1.0) {\nfloat f = abs(sin(angle * 20.0 + detail));\nvec3 irisCol = vec3(0.2, 0.4, 0.8);\nirisCol += 0.5 * sin(vec3(0.0, 1.0, 2.0) + time * colorSpeed);\ncol = mix(irisCol * 0.5, irisCol, f);\ncol *= smoothstep(irisSize, irisSize - 0.05, r);\n} else if (res.y == 2.0) {\ncol = vec3(0.02);\n}\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat spec = pow(max(dot(normal, normalize(lDir + viewDir)), 0.0), shininess);\nfloat glint = pow(max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0), 300.0) * 2.0;\nvec3 finalCol = col * (ambient + diff * lightIntensity * 0.5);\nfinalCol += (spec + glint) * lightIntensity * 0.3;\nreturn vec4(finalCol * isNotBlack, base.a);\n}\nreturn vec4(0.0, 0.0, 0.0, base.a);\n}",
    uniformValues: {
          "lightHeight": 0.5,
          "lightIntensity": 4.5,
          "ambient": 0.56,
          "shininess": 120,
          "detail": 5,
          "blackThreshold": 0.05,
          "colorSpeed": 0.8,
          "alienCount": 3.28,
          "alienSpread": 1.725,
          "alienSize": 0.39,
          "moveX": 0,
          "moveY": 0,
          "irisSize": 0.584,
          "pupilSize": 0.372,
          "eyeDilation": 1.31,
          "veinIntensity": 0.57,
          "lookDownAmount": 0.225,
          "lookSideAmount": 0.405,
          "freneticSpeed": 4.8,
          "twitchIntensity": 0.08
    }
  },
  {
    id: "timeline-24b4b70b-b8f8-4cad-9f91-9bd51b8da4f2",
    name: "Alien Noise Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Alien Noise Automata\nuniform float intensity; // @min 0.0 @max 0.2 @default 0.05\nuniform float waveSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.01\nuniform float autoSpeed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 orig = texture2D(tex, uv);\nfloat origLuma = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask1 = smoothstep(threshold * 0.5, threshold + 0.01, origLuma);\nfloat nx = node_noise(uv * scale + time * waveSpeed);\nfloat ny = node_noise(uv * scale - time * waveSpeed + vec2(12.34));\nvec2 morphOffset = (vec2(nx, ny) - 0.5) * 2.0 * intensity;\nmorphOffset *= mask1;\nvec2 distortedUv = uv + morphOffset;\nfloat r = texture2D(tex, distortedUv + vec2(chromatic * morphOffset.x, chromatic * morphOffset.y)).r;\nfloat g = texture2D(tex, distortedUv).g;\nfloat b = texture2D(tex, distortedUv - vec2(chromatic * morphOffset.x, chromatic * morphOffset.y)).b;\nvec4 waterColor = mix(orig, vec4(r, g, b, orig.a), mask1);\nfloat lum = dot(waterColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask2 = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask2 <= 0.0) {\nreturn waterColor;\n}\nvec2 p = distortedUv * scale;\nfloat t = time * autoSpeed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines;\nvec3 finalColor = mix(waterColor.rgb, effectCol, mask2 * 0.5);\nreturn vec4(finalColor, waterColor.a);\n}",
    uniformValues: {
          "intensity": 0.012,
          "waveSpeed": 3.15,
          "chromatic": 0.0465,
          "autoSpeed": 1.202,
          "scale": 2.9,
          "threshold": 0.11,
          "lineDensity": 27.5,
          "blobColor": [
                0.027450980392156862,
                0.3176470588235294,
                0.6901960784313725
          ],
          "branchColor": [
                0.4,
                0.9411764705882353,
                0.9058823529411765
          ]
    }
  },
  {
    id: "timeline-89887183-5939-4ac9-882b-e0157117766f",
    name: "Animated HURA Hex Grid",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * scale);\nvec3 col = vec3(URA(h.xy));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D);\nif (dot(col, vec3(1.0)) > 1.0) {\ncol *= bevel;\n} else {\ncol = 1.0 - (1.0 - col) * bevel;\n}\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\ncenterP.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat sweep = threshold + (abs(fract(time * animSpeed * 0.2) * 2.0 - 1.0) - 0.5) * 0.8;\nfloat activeHex = step(sweep, hexLuma);\nvec3 finalColor = mix(vec3(0.0), col * source.rgb * 1.5, activeHex);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 42.8,
          "threshold": 0.51,
          "morph3D": 0.29,
          "animSpeed": 0.2
    }
  },
  {
    id: "timeline-bc2dbad2-a444-404d-8ae0-05659f25141e",
    name: "Animated HURA Hex Grid",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * scale);\nvec3 col = vec3(URA(h.xy));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D);\nif (dot(col, vec3(1.0)) > 1.0) {\ncol *= bevel;\n} else {\ncol = 1.0 - (1.0 - col) * bevel;\n}\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\ncenterP.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat sweep = threshold + sin(time * animSpeed) * 0.4;\nfloat activeHex = step(sweep, hexLuma);\nvec3 finalColor = mix(vec3(0.0), col * source.rgb * 1.5, activeHex);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 47.75,
          "threshold": 0.63,
          "morph3D": 1,
          "animSpeed": 0.85
    }
  },
  {
    id: "timeline-0767f777-b318-4034-95de-e4f11c21702d",
    name: "Animated Luma Grid with Source Adjust",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Animated Luma Grid with Source Adjust\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float origContrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float origLuminosity; // @min -1.0 @max 1.0 @default 0.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 adjSource = (source.rgb - 0.5) * origContrast + 0.5 + origLuminosity;\nadjSource = clamp(adjSource, 0.0, 1.0);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(blackThreshold, blackThreshold + 0.05, lum);\nif (mask <= 0.0) {\nreturn vec4(0.0);\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = node_noise(p + lum * 2.0 - t * 0.5);\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topoX = sin((lum * 2.5 + n + uv.x * 5.0 - t) * lineDensity);\nfloat topoY = sin((lum * 2.5 + n + uv.y * 5.0 - t) * lineDensity);\nfloat lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * (lum + 0.3);\nvec3 finalCol = mix(adjSource, effectCol, branch * 0.7 + lines * 0.6);\nfloat finalAlpha = source.a * mask;\nreturn vec4(finalCol * finalAlpha, finalAlpha);\n}",
    uniformValues: {
          "scale": 3.98,
          "lineDensity": 9.05,
          "blobColor": [
                0.8549019607843137,
                0.4470588235294118,
                0.06274509803921569
          ],
          "branchColor": [
                0.2823529411764706,
                0.1568627450980392,
                0.0392156862745098
          ],
          "blackThreshold": 0.18,
          "speed": 0.3,
          "origContrast": 0.09,
          "origLuminosity": -0.98
    }
  },
  {
    id: "timeline-c7702eee-0b9b-48a8-8b58-95a92d5b29b0",
    name: "Animated Luma Grid with Source Adjust",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Animated Luma Grid with Source Adjust\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float origContrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float origLuminosity; // @min -1.0 @max 1.0 @default 0.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 adjSource = (source.rgb - 0.5) * origContrast + 0.5 + origLuminosity;\nadjSource = clamp(adjSource, 0.0, 1.0);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(blackThreshold, blackThreshold + 0.05, lum);\nif (mask <= 0.0) {\nreturn vec4(0.0);\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = node_noise(p + lum * 2.0 - t * 0.5);\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topoX = sin((lum * 2.5 + n + uv.x * 5.0 - t) * lineDensity);\nfloat topoY = sin((lum * 2.5 + n + uv.y * 5.0 - t) * lineDensity);\nfloat lines = clamp(smoothstep(0.8, 0.95, topoX) + smoothstep(0.8, 0.95, topoY), 0.0, 1.0);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * (lum + 0.3);\nvec3 finalCol = mix(adjSource, effectCol, branch * 0.7 + lines * 0.6);\nfloat finalAlpha = source.a * mask;\nreturn vec4(finalCol * finalAlpha, finalAlpha);\n}",
    uniformValues: {
          "scale": 3.98,
          "lineDensity": 9.05,
          "blobColor": [
                0.03529411764705882,
                0.054901960784313725,
                0.3254901960784314
          ],
          "branchColor": [
                0.023529411764705882,
                0.29411764705882354,
                0.2784313725490196
          ],
          "blackThreshold": 0.18,
          "speed": 0.3,
          "origContrast": 1.8,
          "origLuminosity": -0.42
    }
  },
  {
    id: "timeline-41edc862-febf-4231-bd9d-dfa0f2b49000",
    name: "Automata Halftone",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Automata Halftone\nuniform float gridSize; // @min 10.0 @max 60.0 @default 60.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float lightFocus; // @min 1.0 @max 10.0 @default 3.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 scaledUV = uv * aspect * gridSize;\nvec2 cellCenter = floor(scaledUV) + 0.5;\nvec2 sampleUV = cellCenter / (aspect * gridSize);\nsampleUV = clamp(sampleUV, 0.001, 0.999);\nvec4 imgColor = texture2D(tex, sampleUV);\nfloat luminance = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat lumAdjusted = smoothstep(blackThreshold, blackThreshold + 0.2, luminance);\nvec3 lightPos = vec3(\n0.5 + 0.4 * sin(time * lightSpeed),\n0.5 + 0.4 * cos(time * lightSpeed * 0.73),\n0.3 + 0.2 * sin(time * lightSpeed * 1.1)\n);\nvec3 surfacePos = vec3(sampleUV, 0.0);\nfloat dist3D = length(lightPos - surfacePos);\nfloat lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.5), lightFocus * 2.0);\nfloat dist = length(scaledUV - cellCenter);\nfloat radius = min(0.5, lumAdjusted * 0.5 * lightIntensity);\nfloat edge = 0.05;\nfloat mask = 1.0 - smoothstep(max(0.0, radius - edge), radius + edge, dist);\nmask *= step(0.001, radius);\nfloat t = floor(time * 4.0);\nfloat cx = floor(cellCenter.x);\nfloat cy = floor(cellCenter.y);\nfloat state = mod(cx * cy + cx + cy + t + floor(node_noise(vec2(cx, cy) * 0.15) * 3.0), 4.0);\nvec3 dotColor;\nif (state < 1.0) {\ndotColor = vec3(1.0, 0.2, 0.3);\n} else if (state < 2.0) {\ndotColor = vec3(0.2, 0.8, 0.4);\n} else if (state < 3.0) {\ndotColor = vec3(0.1, 0.6, 1.0);\n} else {\ndotColor = vec3(0.9, 0.8, 0.1);\n}\nvec3 finalColor = mix(vec3(0.0), dotColor, mask);\nreturn vec4(finalColor, 1.0);\n}",
    uniformValues: {
          "gridSize": 60,
          "blackThreshold": 0.3,
          "lightSpeed": 2,
          "lightFocus": 3
    }
  },
  {
    id: "timeline-169bf921-3562-46c1-8210-b7f07bf727c0",
    name: "Concentric 3D Lights Mirrored X",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Concentric 3D Lights Mirrored X\nuniform float scale; // @min 10.0 @max 100.0 @default 40.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.5\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform bool mirror; // @default false\nuniform float mirrorX; // @min 0.0 @max 1.0 @default 0.5\nfloat getH(vec2 p, vec2 c, vec2 aspect, float t, float s, bool m, float mX) {\nfloat d = length((p - c) * aspect);\nif (m) {\nvec2 c2 = vec2(2.0 * mX - c.x, c.y);\nfloat d2 = length((p - c2) * aspect);\nd = min(d, d2);\n}\nreturn sin(d * s - t);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat eps = 0.01;\nfloat t = time * 4.0;\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 center = vec2(centerX, centerY);\nfloat h0 = getH(uv, center, aspect, t, scale, mirror, mirrorX);\nfloat hx = getH(uv + vec2(eps, 0.0), center, aspect, t, scale, mirror, mirrorX);\nfloat hy = getH(uv + vec2(0.0, eps), center, aspect, t, scale, mirror, mirrorX);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 surfacePos = vec3(uv, h0 * bump * 0.05);\nvec3 totalLight = vec3(0.0);\nfor(int i = 0; i < 20; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 1.3),\n0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 8.0);\ntotalLight += lCol * diff * atten * 0.4;\n}\nfloat mask = clamp(dot(source.rgb, vec3(1.0)) * 10.0, 0.0, 1.0);\nvec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 100,
          "bump": 5,
          "centerX": 0.43,
          "centerY": 0.45,
          "mirror": true,
          "mirrorX": 0.51
    }
  },
  {
    id: "timeline-393fc5cd-1b95-4ce0-b587-39ab207fcdbc",
    name: "Concentric 3D Lights Mirrored X",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Concentric 3D Lights Mirrored X\nuniform float scale; // @min 10.0 @max 100.0 @default 40.0\nuniform float bump; // @min 0.1 @max 5.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.5\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform bool mirror; // @default false\nuniform float mirrorX; // @min 0.0 @max 1.0 @default 0.5\nfloat getH(vec2 p, vec2 c, vec2 aspect, float t, float s, bool m, float mX) {\nfloat d = length((p - c) * aspect);\nif (m) {\nvec2 c2 = vec2(2.0 * mX - c.x, c.y);\nfloat d2 = length((p - c2) * aspect);\nd = min(d, d2);\n}\nreturn sin(d * s - t);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat eps = 0.01;\nfloat t = time * 4.0;\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 center = vec2(centerX, centerY);\nfloat h0 = getH(uv, center, aspect, t, scale, mirror, mirrorX);\nfloat hx = getH(uv + vec2(eps, 0.0), center, aspect, t, scale, mirror, mirrorX);\nfloat hy = getH(uv + vec2(0.0, eps), center, aspect, t, scale, mirror, mirrorX);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 surfacePos = vec3(uv, h0 * bump * 0.05);\nvec3 totalLight = vec3(0.0);\nfor(int i = 0; i < 20; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n0.3 + 0.4 * sin(time * 0.5 + fi * 0.8)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 1.3),\n0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 8.0);\ntotalLight += lCol * diff * atten * 0.4;\n}\nfloat mask = clamp(dot(source.rgb, vec3(1.0)) * 10.0, 0.0, 1.0);\nvec3 finalColor = mix(source.rgb, source.rgb * totalLight * 2.0, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 100,
          "bump": 0.541,
          "centerX": 0.5,
          "centerY": 0.25,
          "mirror": true,
          "mirrorX": 0.5
    }
  },
  {
    id: "timeline-9a7773ce-3de6-43a9-9a04-e2bd71a0c018",
    name: "Dark Masked Spiral Eye",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Dark Masked Spiral Eye\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform vec3 waveColor1; // @default 1.0,0.2,0.5\nuniform vec3 waveColor2; // @default 0.2,0.8,1.0\nuniform vec3 waveColor3; // @default 0.5,1.0,0.2\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float eyeRange; // @min 0.0 @max 0.4 @default 0.15\nuniform float eyeSize; // @min 0.05 @max 0.4 @default 0.2\nuniform vec3 secondLightColor; // @default 0.8,0.9,1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nfloat originalLum = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkMask = smoothstep(0.05, 0.25, originalLum);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat dist = length(centeredUv);\nfloat angle = atan(centeredUv.y, centeredUv.x);\nvec2 off = 1.0 / resolution;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2(off.x, 0.0)).r;\nfloat t10 = texture2D(tex, uv + vec2(0.0, -off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2(0.0, off.y)).r;\nfloat edge = sqrt(pow(t01 - t21, 2.0) + pow(t10 - t12, 2.0)) * 5.0;\nfloat dir = (uv.x > 0.5) ? -1.0 : 1.0;\nfloat seg1 = smoothstep(0.7, 0.95, sin(angle * lineLength + time * speed * dir - dist * distOffset));\nfloat seg2 = smoothstep(0.2, 0.8, sin(angle * lineLength - time * speed2 * dir - dist * distOffset * 0.7));\nvec3 lineColor1 = mix(waveColor1, waveColor2, sin(dist * waveFreq - time * speed) * 0.5 + 0.5);\nvec3 lineColor2 = mix(waveColor2, waveColor3, sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5);\nvec3 spiralLines = (lineColor1 * edge * seg1 * 2.0) + (lineColor2 * edge * seg2 * 1.5);\nvec3 finalColor = baseColor.rgb * 0.4 + (spiralLines * darkMask);\nfloat mathBlob = sin(angle * 5.0 + dist * spiralScale - time * spiralSpeed) + cos(dist * 3.0 + angle * 11.0);\nfloat sizeMask = smoothstep(spiralSize, 0.05, dist) * smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);\nfinalColor += (lineColor1 * smoothstep(0.8, 0.0, abs(mathBlob - 0.3)) * sizeMask) * darkMask;\nvec2 lPos1 = (vec2(0.5) + vec2(sin(time * 1.1), cos(time * 1.3)) * 0.4) * aspect;\nvec2 lPos2 = (vec2(0.5) + vec2(sin(time * 0.8), cos(time * 0.6)) * 0.4) * aspect;\nfloat illu1 = pow(smoothstep(1.2, 0.0, distance(uv * aspect, lPos1)), 1.5);\nfloat illu2 = pow(smoothstep(0.8, 0.0, distance(uv * aspect, lPos2)), 2.0);\nfloat secondLightMask = illu2 * 0.5 * darkMask;\nfinalColor *= illu1 * (1.0 + vec3(1.0, 0.9, 0.7) * 2.5);\nfinalColor = mix(finalColor, (1.0 - baseColor.rgb) * secondLightColor * 2.5, secondLightMask);\nvec2 eyePos = (vec2(0.5) + vec2(sin(time * 0.7), cos(time * 0.9)) * eyeRange) * aspect;\nfloat eyeDist = length(uv * aspect - eyePos);\nfloat eyeMask = smoothstep(eyeSize, eyeSize - 0.02, eyeDist);\nfloat pupilMask = smoothstep(eyeSize * 0.35, eyeSize * 0.35 - 0.02, eyeDist);\nvec3 eyeRender = mix(baseColor.rgb * 2.5, vec3(0.02), pupilMask);\nfinalColor = mix(finalColor, eyeRender, eyeMask * clamp(illu1 + illu2, 0.0, 1.0));\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": -10,
          "speed2": 10,
          "lineLength": 1,
          "distOffset": 0,
          "waveColor1": [
                0.6549019607843137,
                0.5725490196078431,
                0.16470588235294117
          ],
          "waveColor2": [
                0.7803921568627451,
                0.9254901960784314,
                0.054901960784313725
          ],
          "waveColor3": [
                0.7294117647058823,
                0.30980392156862746,
                0.03137254901960784
          ],
          "waveFreq": 50,
          "spiralScale": 46.8,
          "spiralSpeed": -16,
          "spiralSize": 0.4965,
          "eyeRange": 0,
          "eyeSize": 0.05,
          "secondLightColor": [
                0.5333333333333333,
                0.0784313725490196,
                0.027450980392156862
          ]
    }
  },
  {
    id: "timeline-902506bd-be78-4068-9b44-bf3c0e976abb",
    name: "Dark Metallic Waves",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Dark Metallic Waves\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nfloat getLum(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = getLum(tex, uv);\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\nfor(int i = 0; i < 3; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * movement_form);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nreturn n / sumAmp;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 darkSource = source.rgb * 0.15;\nif (mask <= 0.0) {\nreturn vec4(darkSource, source.a);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.05);\nvec3 totalDiffuse = vec3(ambient);\nvec3 totalSpecular = vec3(0.0);\nfloat specPower = 1.0 / max(roughness * 0.05, 0.001);\nfor(int i = 0; i < 20; i++) {\nfloat fi = float(i);\nfloat r1 = fract(sin(fi * 12.9898) * 43758.5453);\nfloat r2 = fract(sin(fi * 78.233) * 43758.5453);\nfloat r3 = fract(sin(fi * 39.346) * 43758.5453);\nvec3 lPos = vec3(\n0.5 + 0.9 * sin(time * (0.2 + r1 * 0.8) + r2 * 6.28),\n0.5 + 0.9 * cos(time * (0.2 + r2 * 0.8) + r3 * 6.28),\n0.1 + 0.4 * r3\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 0.61),\n0.5 + 0.5 * sin(fi * 0.73 + 2.0),\n0.5 + 0.5 * sin(fi * 0.89 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 0.15 / (1.0 + dist * dist * 8.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ntotalDiffuse += diff * lCol * atten;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.5);\ntotalSpecular += spec * lCol * atten * 10.0 * metallicTint;\n}\nvec3 finalColor = mix(darkSource, darkSource * totalDiffuse + totalSpecular, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 1.55,
          "scale": 2.36,
          "depth": 0.1,
          "movement_form": 1.65,
          "threshold": 0.18,
          "roughness": 0.5,
          "ambient": 0.08
    }
  },
  {
    id: "timeline-8c43cd0a-f0ae-4552-a894-03538bed98ab",
    name: "Distorted Chromy Hue Scanner",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Distorted Chromy Hue Scanner\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.2\nuniform float speed; // @min -2.0 @max 2.0 @default 0.5\nuniform float p; // @min 0.0 @max 10.0 @default 5.0\nuniform float dotGrid; // @min 1.0 @max 100.0 @default 10.0\nuniform float dotSize; // @min 0.0 @max 2.0 @default 1.0\nuniform float gridGrowth; // @min 0.0 @max 5.0 @default 1.0\nuniform float dotspeed; // @min 0.0 @max 1.0 @default 0.2\nuniform float distortion; // @min 0.0 @max 5.0 @default 1.5\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p_vec = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p_vec.xyw, c.r), vec4(c.r, p_vec.yzx), step(p_vec.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 hsv = rgb2hsv(source.rgb);\nfloat targetHue = fract(time * speed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = step(dist, rangeWidth * 0.5);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat distFromCenter = length(centeredUv);\nfloat angle = distFromCenter * distortion * 3.0 - time;\nfloat s = sin(angle);\nfloat c = cos(angle);\nvec2 distortedUv = centeredUv * mat2(c, s, -s, c);\ndistortedUv += normalize(centeredUv + 0.0001) * sin(distFromCenter * 15.0 - time * 4.0) * (distFromCenter * distFromCenter) * distortion * 0.5;\nfloat scale = exp(fract(time * gridGrowth) * 3.0);\nvec2 gridUv = distortedUv * dotGrid * scale;\nvec2 dotUv = fract(gridUv + time * dotspeed * 0.1) - 0.5;\nfloat currentDotSize = dotSize * distFromCenter * 3.0 + (1.0 - 1.0 / scale) * 0.5 + 0.2;\nfloat dots = 1.0 - smoothstep(0.0, currentDotSize * 2.0 + 0.1, length(dotUv));\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat isNotBlack = smoothstep(0.05, 0.25, brightness);\ndots *= isNotBlack;\nvec3 invertedColor = 1.0 - source.rgb;\nfloat invLum = dot(invertedColor, vec3(0.299, 0.587, 0.114));\nvec3 chromyColor = 0.5 + 0.5 * sin(invLum * 12.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = (chromyColor * dots) * mask;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "rangeWidth": 0.03,
          "speed": -1.72,
          "p": 9.5,
          "dotGrid": 100,
          "dotSize": 1.96,
          "gridGrowth": 1.35,
          "dotspeed": 0.06,
          "distortion": 0
    }
  },
  {
    id: "timeline-ac43730a-ce14-4ba4-9d8e-6152cae6eb36",
    name: "Dual Center Trippy",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Dual Center Trippy\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 finalColor = source.rgb * effectColor * intensity;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 2.67,
          "centerX": 0.08,
          "centerY": -0.06
    }
  },
  {
    id: "timeline-df7a88bf-385a-4175-9264-f3259a78d7fe",
    name: "Dual Center Trippy",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Dual Center Trippy\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 finalColor = source.rgb * effectColor * intensity;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 0.33,
          "centerX": 0.31,
          "centerY": 0.28
    }
  },
  {
    id: "timeline-c362b988-cf7a-496c-8708-a72d39c15d4a",
    name: "Dual Light Spiral Eye",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Dual Light Spiral Eye\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float speed2; // @min -10.0 @max 10.0 @default 3.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nuniform vec3 waveColor1; // @default 1.0,0.2,0.5\nuniform vec3 waveColor2; // @default 0.2,0.8,1.0\nuniform vec3 waveColor3; // @default 0.5,1.0,0.2\nuniform float waveFreq; // @min 1.0 @max 50.0 @default 20.0\nuniform float spiralScale; // @min 5.0 @max 100.0 @default 40.0\nuniform float spiralSpeed; // @min -20.0 @max 20.0 @default 7.0\nuniform float spiralSize; // @min 0.05 @max 1.0 @default 0.3\nuniform float eyeRange; // @min 0.0 @max 0.4 @default 0.15\nuniform float eyeSize; // @min 0.05 @max 0.4 @default 0.2\nuniform vec3 secondLightColor; // @default 0.8,0.9,1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 centeredUv = (uv - 0.5) * aspect;\nfloat dist = length(centeredUv);\nfloat angle = atan(centeredUv.y, centeredUv.x);\nvec2 off = 1.0 / resolution;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2(off.x, 0.0)).r;\nfloat t10 = texture2D(tex, uv + vec2(0.0, -off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2(0.0, off.y)).r;\nfloat edge = sqrt(pow(t01 - t21, 2.0) + pow(t10 - t12, 2.0)) * 5.0;\nfloat dir = (uv.x > 0.5) ? -1.0 : 1.0;\nfloat seg1 = smoothstep(0.7, 0.95, sin(angle * lineLength + time * speed * dir - dist * distOffset));\nfloat seg2 = smoothstep(0.2, 0.8, sin(angle * lineLength - time * speed2 * dir - dist * distOffset * 0.7));\nvec3 lineColor1 = mix(waveColor1, waveColor2, sin(dist * waveFreq - time * speed) * 0.5 + 0.5);\nvec3 lineColor2 = mix(waveColor2, waveColor3, sin(dist * waveFreq * 0.6 + time * speed2) * 0.5 + 0.5);\nvec3 finalColor = baseColor.rgb * 0.4 + (lineColor1 * edge * seg1 * 2.0) + (lineColor2 * edge * seg2 * 1.5);\nfloat mathBlob = sin(angle * 5.0 + dist * spiralScale - time * spiralSpeed) + cos(dist * 3.0 + angle * 11.0);\nfloat sizeMask = smoothstep(spiralSize, 0.05, dist) * smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);\nfinalColor += lineColor1 * smoothstep(0.8, 0.0, abs(mathBlob - 0.3)) * sizeMask;\nvec2 lPos1 = (vec2(0.5) + vec2(sin(time * 1.1), cos(time * 1.3)) * 0.4) * aspect;\nvec2 lPos2 = (vec2(0.5) + vec2(sin(time * 0.8), cos(time * 0.6)) * 0.4) * aspect;\nfloat illu1 = pow(smoothstep(1.2, 0.0, distance(uv * aspect, lPos1)), 1.5);\nfloat illu2 = pow(smoothstep(0.8, 0.0, distance(uv * aspect, lPos2)), 2.0);\nfinalColor *= illu1 * (1.0 + vec3(1.0, 0.9, 0.7) * 2.5);\nfinalColor = mix(finalColor, (1.0 - baseColor.rgb) * secondLightColor * 2.5, illu2 * 0.5);\nvec2 eyePos = (vec2(0.5) + vec2(sin(time * 0.7), cos(time * 0.9)) * eyeRange) * aspect;\nfloat eyeDist = length(uv * aspect - eyePos);\nfloat eyeMask = smoothstep(eyeSize, eyeSize - 0.02, eyeDist);\nfloat pupilMask = smoothstep(eyeSize * 0.35, eyeSize * 0.35 - 0.02, eyeDist);\nvec3 eyeRender = mix(baseColor.rgb * 2.5, vec3(0.02), pupilMask);\nfinalColor = mix(finalColor, eyeRender, eyeMask * clamp(illu1 + illu2, 0.0, 1.0));\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": 10,
          "speed2": 10,
          "lineLength": 1,
          "distOffset": 1,
          "waveColor1": [
                0.14901960784313725,
                0.5019607843137255,
                0
          ],
          "waveColor2": [
                0.16470588235294117,
                0.3176470588235294,
                0.2
          ],
          "waveColor3": [
                0.03529411764705882,
                0.39215686274509803,
                0.027450980392156862
          ],
          "waveFreq": 50,
          "spiralScale": 100,
          "spiralSpeed": 20,
          "spiralSize": 0.3,
          "eyeRange": 0.4,
          "eyeSize": 0.05,
          "secondLightColor": [
                0,
                0,
                0
          ]
    }
  },
  {
    id: "timeline-6fd2b35c-8ffe-4548-b7d0-9e608dda317c",
    name: "Emboss Light Pro",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Emboss Light Pro\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.0\nuniform float dispStrength; // @min 0.0 @max 20.0 @default 8.0\nuniform vec3 lightColor; // @default 1.0,0.75,0.25\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (luma <= threshold) {\nreturn source;\n}\nvec2 pixelSize = 1.0 / resolution;\nvec2 aspect = vec2(1.0, resolution.y / resolution.x);\nvec2 lightSize = vec2(4.0);\nvec2 d = pixelSize * 2.0;\nvec4 dx = (texture2D(tex, uv + vec2(1.0, 0.0) * d) - texture2D(tex, uv - vec2(1.0, 0.0) * d)) * 0.5;\nvec4 dy = (texture2D(tex, uv + vec2(0.0, 1.0) * d) - texture2D(tex, uv - vec2(0.0, 1.0) * d)) * 0.5;\nd = pixelSize * 1.0;\ndx += texture2D(tex, uv + vec2(1.0, 0.0) * d) - texture2D(tex, uv - vec2(1.0, 0.0) * d);\ndy += texture2D(tex, uv + vec2(0.0, 1.0) * d) - texture2D(tex, uv - vec2(0.0, 1.0) * d);\nvec2 displacement = vec2(dx.x, dy.x) * lightSize;\nvec2 lightPos = vec2(0.5) + vec2(sin(time * lightSpeed), cos(time * lightSpeed)) * 0.3;\nfloat dist = distance(0.5 + (uv - 0.5) * aspect * lightSize + displacement,\n0.5 + (lightPos - 0.5) * aspect * lightSize);\nfloat light = pow(max(1.0 - dist, 0.0), 4.0) * lightIntensity;\nvec2 dispUv = uv + vec2(dx.x, dy.x) * pixelSize * dispStrength;\nfloat dispR = texture2D(tex, dispUv).x;\nvec4 rd = vec4(dispR) * vec4(0.7, 1.5, 2.0, 1.0) - vec4(0.3, 1.0, 1.0, 1.0);\nvec4 finalColor = mix(rd, vec4(lightColor * 8.0, 1.0), light * 0.75 * (1.0 - dispR));\nreturn vec4(clamp(finalColor.rgb, 0.0, 1.0), source.a);\n}",
    uniformValues: {
          "threshold": 0.12,
          "lightIntensity": 5,
          "lightSpeed": 1,
          "dispStrength": 8,
          "lightColor": [
                0.4392156862745098,
                0.39215686274509803,
                0.2980392156862745
          ]
    }
  },
  {
    id: "timeline-47c6bea9-0914-4f00-9fb5-afe23db49c4d",
    name: "Entrapped in Glass",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(vec3 col) {\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getGlassHeight(vec2 uv, float time, float lum) {\nvec2 p = uv * scale;\nfloat t = time * speed;\nvec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\nfloat n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\nfloat n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\nfloat n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\nfloat h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\nreturn h * h * (0.5 + lum * 0.5);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = getLum(source.rgb);\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getGlassHeight(uv, time, lum);\nfloat hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\nfloat hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\nvec3 halfDir = normalize(lightDir + viewDir);\nvec3 halfDir2 = normalize(lightDir2 + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\nspec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\nfloat fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\nvec2 distUv = uv - normal.xy * refraction;\nfloat r = texture2D(tex, distUv + normal.xy * chromatic).r;\nfloat g = texture2D(tex, distUv).g;\nfloat b = texture2D(tex, distUv - normal.xy * chromatic).b;\nvec3 distSource = vec3(r, g, b);\nvec3 glassTint = vec3(0.85, 0.95, 1.0);\nvec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\nreturn vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    uniformValues: {
          "speed": 0.46,
          "scale": 1.14,
          "bump": 1.57,
          "refraction": 0.0708,
          "chromatic": 0.005,
          "threshold": 0.105
    }
  },
  {
    id: "timeline-a925ad8a-d4e0-41b2-8104-8a400305ab4e",
    name: "Entrapped in Glass",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(vec3 col) {\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getGlassHeight(vec2 uv, float time, float lum) {\nvec2 p = uv * scale;\nfloat t = time * speed;\nvec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\nfloat n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\nfloat n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\nfloat n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\nfloat h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\nreturn h * h * (0.5 + lum * 0.5);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = getLum(source.rgb);\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getGlassHeight(uv, time, lum);\nfloat hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\nfloat hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\nvec3 halfDir = normalize(lightDir + viewDir);\nvec3 halfDir2 = normalize(lightDir2 + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\nspec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\nfloat fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\nvec2 distUv = uv - normal.xy * refraction;\nfloat r = texture2D(tex, distUv + normal.xy * chromatic).r;\nfloat g = texture2D(tex, distUv).g;\nfloat b = texture2D(tex, distUv - normal.xy * chromatic).b;\nvec3 distSource = vec3(r, g, b);\nvec3 glassTint = vec3(0.85, 0.95, 1.0);\nvec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\nreturn vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    uniformValues: {
          "speed": 0.46,
          "scale": 2.12,
          "bump": 5,
          "refraction": 0.0119,
          "chromatic": 0.05,
          "threshold": 0.105
    }
  },
  {
    id: "timeline-be0f64b2-e62d-4a9e-8564-b6b2dec63686",
    name: "Entrapped in Glass",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Entrapped in Glass\nuniform float speed; // @min 0.0 @max 2.0 @default 0.2\nuniform float scale; // @min 1.0 @max 15.0 @default 5.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.0\nuniform float refraction; // @min 0.01 @max 0.2 @default 0.08\nuniform float chromatic; // @min 0.0 @max 0.05 @default 0.015\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(vec3 col) {\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getGlassHeight(vec2 uv, float time, float lum) {\nvec2 p = uv * scale;\nfloat t = time * speed;\nvec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 2.0;\nfloat n1 = 1.0 - abs(node_noise(p + warp) * 2.0 - 1.0);\nfloat n2 = 1.0 - abs(node_noise(p * 1.5 - warp * 0.8 + t * 0.2) * 2.0 - 1.0);\nfloat n3 = 1.0 - abs(node_noise(p * 2.5 + warp * 1.2 - t * 0.1) * 2.0 - 1.0);\nfloat h = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);\nreturn h * h * (0.5 + lum * 0.5);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = getLum(source.rgb);\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getGlassHeight(uv, time, lum);\nfloat hx = getGlassHeight(uv + vec2(eps, 0.0), time, lum);\nfloat hy = getGlassHeight(uv + vec2(0.0, eps), time, lum);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 lightDir2 = normalize(vec3(-0.5, -0.2, 0.8));\nvec3 halfDir = normalize(lightDir + viewDir);\nvec3 halfDir2 = normalize(lightDir2 + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.0;\nspec += pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.8;\nfloat fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\nvec2 distUv = uv - normal.xy * refraction;\nfloat r = texture2D(tex, distUv + normal.xy * chromatic).r;\nfloat g = texture2D(tex, distUv).g;\nfloat b = texture2D(tex, distUv - normal.xy * chromatic).b;\nvec3 distSource = vec3(r, g, b);\nvec3 glassTint = vec3(0.85, 0.95, 1.0);\nvec3 finalColor = distSource * (1.0 - fresnel * 0.3) + spec + glassTint * fresnel * 0.8;\nreturn vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    uniformValues: {
          "speed": 0.46,
          "scale": 1,
          "bump": 0.492,
          "refraction": 0.2,
          "chromatic": 0.015,
          "threshold": 0.105
    }
  },
  {
    id: "timeline-69fe5e13-61dd-4e4f-b168-673cdb2e02dd",
    name: "Festival Fluid Relief V2",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Festival Fluid Relief V2\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float distFreq; // @min 1.0 @max 20.0 @default 6.28\nuniform float distSpeed; // @min 0.0 @max 10.0 @default 2.5\nuniform float heightScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 0.8\nuniform float imageWeight; // @min 0.0 @max 1.0 @default 0.6\nfloat getHeight(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\nvec2 e = vec2(1.0 / res.x, 1.0 / res.y);\nfloat hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\nfloat hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\nreturn normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (getHeight(tex, uv) < 0.05) {\nreturn source;\n}\nvec3 nor = getNormal(tex, uv, resolution);\nvec2 distUv = uv + nor.xy * distortion * sin(time * distSpeed + uv.y * distFreq);\nvec4 distColor = texture2D(tex, distUv);\nvec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\nvec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\nfloat t = time * 2.5;\nvec3 col1 = vec3(0.6 + 0.4 * sin(t), 0.1, 0.7 + 0.3 * cos(t * 1.3));\nvec3 col2 = vec3(0.1, 0.6 + 0.4 * sin(t * 1.1), 0.8 + 0.2 * cos(t * 0.8));\nvec3 lp1 = vec3(sin(t * 0.7) * 0.8, cos(t * 0.5) * 0.8, lightDepth);\nvec3 ld1 = normalize(lp1 - pos);\nfloat dist1 = length(lp1 - pos);\nfloat att1 = 1.0 / (1.0 + dist1 * dist1 * 2.0);\nfloat diff1 = max(dot(nor, ld1), 0.0);\nfloat spec1 = pow(max(dot(nor, normalize(ld1 + camRd)), 0.0), 32.0);\nvec3 lp2 = vec3(cos(t * 0.6) * 0.8, sin(t * 0.9) * 0.8, lightDepth);\nvec3 ld2 = normalize(lp2 - pos);\nfloat dist2 = length(lp2 - pos);\nfloat att2 = 1.0 / (1.0 + dist2 * dist2 * 2.0);\nfloat diff2 = max(dot(nor, ld2), 0.0);\nfloat spec2 = pow(max(dot(nor, normalize(ld2 + camRd)), 0.0), 32.0);\nvec3 illum = (col1 * (diff1 + spec1) * att1) + (col2 * (diff2 + spec2) * att2);\nvec3 finalColor = mix(illum * distColor.rgb * 2.0, distColor.rgb, imageWeight);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "distortion": 0.2,
          "distFreq": 5.56,
          "distSpeed": 1.6,
          "heightScale": 5.94,
          "lightDepth": 0.786,
          "imageWeight": 0.07
    }
  },
  {
    id: "timeline-ceefaa6f-a2dd-4ad8-b42a-0f1c36fe031f",
    name: "Festival Fluid Relief V2",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Festival Fluid Relief V2\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float distFreq; // @min 1.0 @max 20.0 @default 6.28\nuniform float distSpeed; // @min 0.0 @max 10.0 @default 2.5\nuniform float heightScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 0.8\nuniform float imageWeight; // @min 0.0 @max 1.0 @default 0.6\nfloat getHeight(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\nvec2 e = vec2(1.0 / res.x, 1.0 / res.y);\nfloat hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\nfloat hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\nreturn normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (getHeight(tex, uv) < 0.05) {\nreturn source;\n}\nvec3 nor = getNormal(tex, uv, resolution);\nvec2 distUv = uv + nor.xy * distortion * sin(time * distSpeed + uv.y * distFreq);\nvec4 distColor = texture2D(tex, distUv);\nvec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\nvec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\nfloat t = time * 2.5;\nvec3 col1 = vec3(0.6 + 0.4 * sin(t), 0.1, 0.7 + 0.3 * cos(t * 1.3));\nvec3 col2 = vec3(0.1, 0.6 + 0.4 * sin(t * 1.1), 0.8 + 0.2 * cos(t * 0.8));\nvec3 lp1 = vec3(sin(t * 0.7) * 0.8, cos(t * 0.5) * 0.8, lightDepth);\nvec3 ld1 = normalize(lp1 - pos);\nfloat dist1 = length(lp1 - pos);\nfloat att1 = 1.0 / (1.0 + dist1 * dist1 * 2.0);\nfloat diff1 = max(dot(nor, ld1), 0.0);\nfloat spec1 = pow(max(dot(nor, normalize(ld1 + camRd)), 0.0), 32.0);\nvec3 lp2 = vec3(cos(t * 0.6) * 0.8, sin(t * 0.9) * 0.8, lightDepth);\nvec3 ld2 = normalize(lp2 - pos);\nfloat dist2 = length(lp2 - pos);\nfloat att2 = 1.0 / (1.0 + dist2 * dist2 * 2.0);\nfloat diff2 = max(dot(nor, ld2), 0.0);\nfloat spec2 = pow(max(dot(nor, normalize(ld2 + camRd)), 0.0), 32.0);\nvec3 illum = (col1 * (diff1 + spec1) * att1) + (col2 * (diff2 + spec2) * att2);\nvec3 finalColor = mix(illum * distColor.rgb * 2.0, distColor.rgb, imageWeight);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "distortion": 0.1,
          "distFreq": 6.28,
          "distSpeed": 2.5,
          "heightScale": 20,
          "lightDepth": 0.1,
          "imageWeight": 0.96
    }
  },
  {
    id: "timeline-e162f45a-cb0e-492a-a56a-f9a98a372eb0",
    name: "Flip & Rotate Hexagons 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec4 hexGrid(vec2 p) {\nvec2 r = vec2(1.0, 1.7320508);\nvec2 h = r * 0.5;\nvec2 a = mod(p, r) - h;\nvec2 b = mod(p - h, r) - h;\nreturn dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\nvec2 map(vec3 p, float time) {\nvec4 hg = hexGrid(p.xz);\nvec2 id = hg.zw;\nvec3 q = vec3(hg.x, p.y, hg.y);\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flip = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flip) * 3.14159;\nfloat activeFlip = sin(flip * 3.14159);\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nq.xz = rot(angle * dir * 2.0) * q.xz;\nvec3 absq = abs(q);\nfloat d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\nfloat d2 = absq.y - 0.15;\nfloat tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0, maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec4 hg = hexGrid(pos.xz);\nvec2 id = hg.zw;\nvec2 finalUV = (id + hg.xy) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nvec2 localNorXY = rot(angle * dir) * nor.xy;\ncol = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n}\ncol *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.541,
          "waveFreq": 0.1,
          "waveSpread": 0.3,
          "jumpHeight": 0,
          "zoom": 1,
          "gridSize": 25.01,
          "planeColor": [
                0.00784313725490196,
                0.00784313725490196,
                0.011764705882352941
          ]
    }
  },
  {
    id: "timeline-c5a7d912-d516-4fc9-a50a-d0c874d873f1",
    name: "Flipping Hexagons",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Flipping Hexagons\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec4 hexGrid(vec2 p) {\nvec2 r = vec2(1.0, 1.7320508);\nvec2 h = r * 0.5;\nvec2 a = mod(p, r) - h;\nvec2 b = mod(p - h, r) - h;\nif (dot(a, a) < dot(b, b)) return vec4(a, p - a);\nreturn vec4(b, p - b);\n}\nvec2 map(vec3 p, float time) {\nvec4 hg = hexGrid(p.xz);\nvec2 id = hg.zw;\nvec3 q = p;\nq.x = hg.x;\nq.z = hg.y;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flipProgress = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\nfloat activeFlip = sin(flipProgress * 3.14159);\nfloat dir = (id.x > -0.25) ? -1.0 : 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nvec3 absq = abs(q);\nfloat d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2);\nfloat d2 = absq.y - 0.15;\nfloat tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0));\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0, maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec4 hg = hexGrid(pos.xz);\nvec2 id = hg.zw;\nvec2 finalUV = (id + hg.xy) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\ntexCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\nfloat dir = (id.x > -0.25) ? -1.0 : 1.0;\nfloat flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\nvec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\nvec2 localNorXY = rot(angle * dir) * nor.xy;\ncol = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n}\ncol *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.835,
          "waveFreq": 1.183,
          "waveSpread": 1.069,
          "jumpHeight": 0.03,
          "zoom": 1,
          "gridSize": 25.01,
          "planeColor": [
                0.0392156862745098,
                0.0392156862745098,
                0.0392156862745098
          ],
          "contrast": 1,
          "luminosity": 0
    }
  },
  {
    id: "timeline-4576ac76-bc57-40fb-a7a0-ef31989a214f",
    name: "Follow Light B&W Threshold",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Follow Light B&W Threshold\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float speed; // @min 0.0 @max 10.0 @default 4.0\nuniform float tunnelRadius; // @min 1.0 @max 10.0 @default 4.0\nuniform float orbSize; // @min 0.0 @max 2.0 @default 0.01\nuniform float colorIntensity; // @min 0.1 @max 5.0 @default 1.0\nuniform float bwBlend; // @min 0.0 @max 1.0 @default 0.8\nvec3 getPathPosition(float z) {\nreturn vec3(12.0 * cos(z * vec2(0.1, 0.12)), z);\n}\nvec3 safe_tanh(vec3 x) {\nvec3 e2x = exp(-2.0 * x);\nreturn (1.0 - e2x) / (1.0 + e2x);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nif (length(source.rgb) <= blackThreshold) {\nreturn source;\n}\nvec2 p = (uv - 0.5) * resolution / resolution.y;\nfloat animTime = time * speed + 5.0 + 5.0 * sin(time * 0.3);\nvec3 rayOrigin = getPathPosition(animTime);\nvec3 lookTarget = getPathPosition(animTime + 4.0);\nvec3 forward = normalize(lookTarget - rayOrigin);\nvec3 right = normalize(vec3(-forward.z, 0.0, forward.x));\nvec3 up = cross(forward, right);\nvec3 rayDir = normalize(p.x * right + p.y * up + forward);\nfloat stepDist = 1.0;\nfloat totalDist = 0.0;\nfloat orbDist = 1.0;\nvec3 accumulatedColor = vec3(0.0);\nvec3 rayPos = rayOrigin;\nfor (int i = 1; i <= 28; i++) {\nif (totalDist >= 30.0) break;\nfloat fi = float(i);\nrayPos += rayDir * stepDist;\nvec3 pathCenter = getPathPosition(rayPos.z);\nfloat sineTime = sin(time);\nvec3 orbCenter = vec3(\npathCenter.x + sineTime,\npathCenter.y + sineTime * 2.0,\n6.0 + animTime + sineTime * 2.0\n);\norbDist = length(rayPos - orbCenter) - orbSize;\nfloat baseRadius = cos(rayPos.z * 0.6) * 2.0 + tunnelRadius;\nfloat tunnelStructure = min(\nlength(rayPos.xy - pathCenter.x - 6.0),\nlength((rayPos - pathCenter).xy)\n);\nfloat largeScoops = abs(dot(sin(0.4 * rayPos), vec3(0.25))) / 0.1;\nfloat detailTexture = abs(dot(sin(animTime + 16.0 * rayPos), vec3(0.22))) / 2.0;\nfloat tunnelDist = baseRadius - tunnelStructure + largeScoops + detailTexture;\nstepDist = min(orbDist, 0.01 + 0.3 * abs(tunnelDist));\ntotalDist += stepDist;\nvec3 palette = 1.0 + cos(fi * 0.7 + vec3(6.0, 1.0, 2.0));\naccumulatedColor += (palette / stepDist + 10.0 * palette / max(orbDist, 0.6)) / fi;\n}\nvec3 finalColor = safe_tanh(accumulatedColor * accumulatedColor * colorIntensity / 2000.0);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec3 bw = vec3(lum);\nvec3 overlay = mix(2.0 * finalColor * bw, 1.0 - 2.0 * (1.0 - finalColor) * (1.0 - bw), step(0.5, finalColor));\nfinalColor = mix(finalColor, overlay, source.a * bwBlend);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "blackThreshold": 0.12,
          "speed": 1.1,
          "tunnelRadius": 10,
          "orbSize": 0,
          "colorIntensity": 0.296,
          "bwBlend": 0.8
    }
  },
  {
    id: "timeline-51edd1fa-eacf-4c0d-ba63-660ab202cf21",
    name: "Glossy Complementary Lights",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Glossy Complementary Lights\nuniform float bump; // @min 0.1 @max 10.0 @default 3.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 4.0\nuniform float shininess; // @min 1.0 @max 100.0 @default 32.0\nuniform float glossIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.05\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec3 lumaWeights = vec3(0.299, 0.587, 0.114);\nfloat luma = dot(source.rgb, lumaWeights);\nvec2 eps = 1.0 / resolution;\nfloat lumaL = dot(texture2D(tex, uv - vec2(eps.x, 0.0)).rgb, lumaWeights);\nfloat lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumaWeights);\nfloat lumaD = dot(texture2D(tex, uv - vec2(0.0, eps.y)).rgb, lumaWeights);\nfloat lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumaWeights);\nvec3 normal = normalize(vec3((lumaL - lumaR) * bump, (lumaD - lumaU) * bump, 0.15));\nvec3 surfacePos = vec3(uv, luma * 0.05);\nvec3 viewDir = normalize(vec3(0.5, 0.5, 1.5) - surfacePos);\nvec3 totalDiffuse = vec3(ambient);\nvec3 totalSpecular = vec3(0.0);\nfloat localShininess = shininess * (0.2 + luma * 1.8);\nfloat localGloss = glossIntensity * smoothstep(0.1, 0.9, luma);\nfor(int i = 0; i < 4; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.7 * sin(time * 2.5 + fi * 2.1),\n0.5 + 0.7 * cos(time * 3.2 + fi * 1.7),\n0.2 + 0.3 * sin(time * 4.0 + fi * 1.3)\n);\nvec3 lCol = vec3(0.0);\nif (i == 0) lCol = vec3(1.0, 0.3, 0.1);\nelse if (i == 1) lCol = vec3(0.1, 0.7, 1.0);\nelse if (i == 2) lCol = vec3(0.8, 0.1, 1.0);\nelse if (i == 3) lCol = vec3(0.2, 0.9, 0.0);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nvec3 halfDir = normalize(lDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), localShininess) * diff * localGloss;\nfloat atten = 1.0 / (1.0 + dist * dist * 5.0);\ntotalDiffuse += lCol * diff * atten;\ntotalSpecular += lCol * spec * atten;\n}\nvec3 finalColor = (source.rgb * totalDiffuse + totalSpecular) * lightIntensity;\nfinalColor = finalColor / (finalColor + vec3(1.0));\nfinalColor = pow(finalColor, vec3(1.0 / 2.2));\nfloat mask = smoothstep(max(0.0, threshold - 0.02), min(1.0, threshold + 0.02), luma);\nfinalColor = mix(source.rgb, finalColor, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "bump": 3.268,
          "lightIntensity": 4,
          "shininess": 97.03,
          "glossIntensity": 5,
          "ambient": 0.05,
          "threshold": 0.24
    }
  },
  {
    id: "timeline-703f4cb1-b1bc-4111-8f9e-8c06b958d9d5",
    name: "Gold Wandering Light Relief",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Gold Wandering Light Relief\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform vec3 lightColor; // @default 0.85,0.80,0.70\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float lightDepth; // @min 0.1 @max 5.0 @default 1.0\nfloat getHeight(sampler2D tex, vec2 uv) {\nvec4 c = texture2D(tex, uv);\nreturn dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res) {\nvec2 e = vec2(1.0 / res.x, 1.0 / res.y);\nfloat hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\nfloat hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\nreturn normalize(vec3(-hx * heightScale, -hy * heightScale, 1.0));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (luma < 0.05) {\nreturn source;\n}\nvec3 nor = getNormal(tex, uv, resolution);\nvec2 distUv = uv + nor.xy * distortion * sin(time * animSpeed);\nvec4 distColor = texture2D(tex, distUv);\nvec3 LP = vec3(-0.6, 0.7, -0.3);\nvec3 LC = lightColor;\nvec3 HC1 = vec3(0.5, 0.4, 0.3);\nvec3 HC2 = vec3(0.05, 0.05, 0.3);\nvec3 HLD = vec3(0.0, 1.0, 0.0);\nvec3 pos = vec3(uv * 2.0 - 1.0, 0.0);\nvec3 l = normalize(LP - pos);\nvec3 camRd = normalize(vec3(0.0, 0.0, -1.0));\nfloat d = clamp(dot(nor, l), 0.0, 1.0);\nfloat f = pow(clamp(1.0 + dot(nor, camRd), 0.0, 1.0), 2.0) * 0.3;\nvec3 c = vec3(0.0);\nc += d * LC;\nc += mix(HC1, HC2, dot(nor, HLD)) * 0.5;\nc += f * vec3(1.3, 1.2, 1.0);\nvec3 goldLightPos = vec3(sin(time * 1.3) * 0.8, cos(time * 0.9) * 0.8, lightDepth);\nvec3 goldLightDir = normalize(goldLightPos - pos);\nfloat goldDist = length(goldLightPos - pos);\nfloat goldAtten = 1.0 / (1.0 + goldDist * goldDist * 1.5);\nfloat goldDiff = clamp(dot(nor, goldLightDir), 0.0, 1.0);\nvec3 halfVector = normalize(goldLightDir + camRd);\nfloat goldSpec = pow(clamp(dot(nor, halfVector), 0.0, 1.0), 16.0);\nvec3 goldIllum = vec3(1.0, 0.8, 0.2) * (goldDiff + goldSpec) * goldAtten * 2.5;\nvec3 finalColor = distColor.rgb * c * 1.5 + goldIllum * distColor.rgb;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "distortion": 0.1,
          "heightScale": 20,
          "lightColor": [
                0.6392156862745098,
                0.3254901960784314,
                0.7568627450980392
          ],
          "animSpeed": 8.4,
          "lightDepth": 0.247
    }
  },
  {
    id: "timeline-aecde05a-5cad-4e3c-bed9-e91fb727dd41",
    name: "Grid Traveling Glow Noise",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Grid Traveling Glow Noise\nuniform float bump; // @min 0.1 @max 10.0 @default 2.0\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float scanSpeed; // @min 0.1 @max 3.0 @default 0.5\nuniform float gridScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float scanIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float scanDirection; // @min 0.0 @max 360.0 @default 0.0\nuniform float glowSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float glowSize; // @min 0.1 @max 10.0 @default 2.0\nuniform float glowIntensity; // @min 0.0 @max 10.0 @default 5.0\nuniform vec3 glowColor; // @default 1.0,0.8,0.2\nuniform vec3 color1; // @default 1.0,0.2,0.2\nuniform vec3 color2; // @default 0.2,1.0,0.2\nuniform vec3 color3; // @default 0.2,0.2,1.0\nuniform vec3 color4; // @default 0.0,1.0,0.8\nuniform vec3 color5; // @default 0.1,0.1,0.1\nuniform vec3 color6; // @default 1.0,1.0,1.0\nuniform vec3 color7; // @default 0.8,0.2,1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 baseUV = vec2(uv.x < 0.5 ? uv.x : 1.0 - uv.x, uv.y);\nvec4 source = texture2D(tex, baseUV);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec2 eps = vec2(1.0 / resolution.x, 1.0 / resolution.y);\nfloat lumaX = dot(texture2D(tex, baseUV + vec2(eps.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\nfloat lumaY = dot(texture2D(tex, baseUV + vec2(0.0, eps.y)).rgb, vec3(0.299, 0.587, 0.114));\nvec3 normal = normalize(vec3((luma - lumaX) * bump, (luma - lumaY) * bump, 0.05));\nvec3 surfacePos = vec3(uv, luma * 0.15);\nvec3 totalLight = color5;\nfor(int i = 0; i < 3; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.6 * sin(time * 0.5 + fi * 2.1),\n0.5 + 0.6 * cos(time * 0.6 + fi * 1.7),\n0.2 + 0.2 * sin(time * 0.7 + fi)\n);\nvec3 lCol = color1;\nif(i == 1) lCol = color2;\nif(i == 2) lCol = color3;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 5.0);\nvec3 viewDir = normalize(vec3(0.5, 0.5, 1.0) - surfacePos);\nvec3 halfDir = normalize(lDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 16.0);\ntotalLight += lCol * (diff + spec * color6 * 0.5) * atten;\n}\nfloat rad = scanDirection * 3.14159265 / 180.0;\nvec2 dir = vec2(cos(rad), sin(rad));\nfloat pulseDist = dot(uv, dir) * (10.0 / glowSize) - time * glowSpeed;\nfloat pulse = max(0.0, sin(pulseDist));\npulse = pow(pulse, 8.0);\nvec2 gridUV = fract(uv * gridScale - dir * time * scanSpeed + luma * 0.3);\nvec2 gridDist = abs(gridUV - 0.5);\nfloat lineDist = min(gridDist.x, gridDist.y);\nfloat lineWidth = 0.02 + pulse * 0.06;\nfloat scanCore = smoothstep(lineWidth, lineWidth * 0.2, lineDist);\nfloat scanGlow = (0.002 + pulse * 0.008) / (lineDist + 0.001);\nfloat nMap = node_noise(uv * 10.0 + time * 0.5);\nfloat noiseIllum = 0.5 + max(0.0, nMap) * 2.5;\nvec3 currentScanColor = mix(color4, color7, sin(uv.x * 10.0 + time * 2.0) * 0.5 + 0.5);\nvec3 baseGrid = currentScanColor * scanIntensity * noiseIllum;\nvec3 travelingGlow = glowColor * pulse * glowIntensity * noiseIllum;\nvec3 scanEffect = (baseGrid + travelingGlow) * (scanCore + scanGlow) * smoothstep(0.05, 0.2, luma);\nvec3 finalColor = source.rgb * totalLight * lightIntensity + scanEffect;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "bump": 0.595,
          "lightIntensity": 2,
          "scanSpeed": 0.274,
          "gridScale": 13.92,
          "scanIntensity": 3.25,
          "scanDirection": 216,
          "glowSpeed": 0.3,
          "glowSize": 9.604,
          "glowIntensity": 10,
          "glowColor": [
                1,
                0.8,
                0.2
          ],
          "color1": [
                0.09019607843137255,
                0.011764705882352941,
                0.011764705882352941
          ],
          "color2": [
                0.7176470588235294,
                0.5725490196078431,
                0.5215686274509804
          ],
          "color3": [
                1,
                0.5607843137254902,
                0.2
          ],
          "color4": [
                0.0784313725490196,
                0.06666666666666667,
                0.043137254901960784
          ],
          "color5": [
                0.03137254901960784,
                0.011764705882352941,
                0.011764705882352941
          ],
          "color6": [
                1,
                1,
                1
          ],
          "color7": [
                0.34901960784313724,
                0.17254901960784313,
                0.40784313725490196
          ]
    }
  },
  {
    id: "timeline-a49fa85b-9600-48bf-88e6-18bfdcea46d2",
    name: "Halftone Tribadelica",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Halftone Tribadelica\nuniform float gridSize; // @min 20.0 @max 250.0 @default 80.0\nuniform float zoom; // @min 0.5 @max 5.0 @default 1.0\nuniform float breathIntensity; // @min 0.0 @max 2.0 @default 0.60\nuniform float breathChaos; // @min 0.0 @max 20.0 @default 6.0\nvec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }\nfloat snoise(vec2 v){\nconst vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\nvec2 i = floor(v + dot(v, C.yy) );\nvec2 x0 = v - i + dot(i, C.xx);\nvec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\nvec4 x12 = x0.xyxy + C.xxzz;\nx12.xy -= i1;\ni = mod(i, 289.0);\nvec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));\nvec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\nm = m*m; m = m*m;\nvec3 x = 2.0 * fract(p * C.www) - 1.0;\nvec3 h = abs(x) - 0.5;\nvec3 ox = floor(x + 0.5);\nvec3 a0 = x - ox;\nm *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\nvec3 g;\ng.x = a0.x * x0.x + h.x * x0.y;\ng.yz = a0.yz * x12.xz + h.yz * x12.yw;\nreturn 130.0 * dot(m, g);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 scaledUV = uv * aspect * gridSize;\nvec2 cellCenter = floor(scaledUV) + 0.5;\nvec2 sampleUV = cellCenter / (aspect * gridSize);\nvec2 zoomedSampleUV = (sampleUV - 0.5) * zoom + 0.5;\nvec4 texColor = texture2D(tex, zoomedSampleUV);\nfloat b = (texColor.r + texColor.g + texColor.b) / 3.0;\nfloat n1 = snoise(sampleUV * 8.0 + time * 0.2);\nfloat breath = sin(time * 3.5 + n1 * breathChaos) * 0.5 + 0.5;\nfloat height = b + (b * breath * breathIntensity);\nvec3 lightPos = vec3(\n0.5 + 0.4 * sin(time * 1.5),\n0.5 + 0.4 * cos(time * 1.1),\n0.2 + 0.2 * sin(time * 2.0)\n);\nvec3 surfacePos = vec3(sampleUV, height * 0.1);\nfloat dist3D = length(lightPos - surfacePos);\nfloat lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.8), 6.0);\nfloat dist = length(scaledUV - cellCenter);\nfloat radius = smoothstep(0.05, 0.25, b) * 0.8 * lightIntensity;\nfloat mask = 1.0 - smoothstep(radius - 0.05, radius + 0.05, dist);\nmask *= step(0.005, radius);\nvec3 timeColor = 0.5 + 0.5 * cos(time * 1.2 + b * 2.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = mix(vec3(0.0), timeColor, mask);\nreturn vec4(finalColor, 1.0);\n}",
    uniformValues: {
          "gridSize": 164.9,
          "zoom": 1.13,
          "breathIntensity": 1.9,
          "breathChaos": 1
    }
  },
  {
    id: "timeline-d35d9984-16b5-4e70-adf3-2f0da56bfd9f",
    name: "Hex Automata Morph",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Hex Automata Morph\nuniform float hexScale; // @min 5.0 @max 50.0 @default 21.0\nuniform float autoScale; // @min 2.0 @max 20.0 @default 10.0\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * hexScale);\nvec3 hexCol = vec3(URA(h.xy));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D);\nif (dot(hexCol, vec3(1.0)) > 1.0) {\nhexCol *= bevel;\n} else {\nhexCol = 1.0 - (1.0 - hexCol) * bevel;\n}\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / hexScale;\ncenterP.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat t = time * speed;\nfloat waveNoise = node_noise(centerUV * 4.0 + vec2(t * 0.5, t * 0.3));\nfloat sweep = threshold + (waveNoise - 0.5) * 1.5;\nfloat activeHex = step(sweep, hexLuma);\nvec2 pAuto = uv * autoScale;\nfloat n = 0.0;\nvec2 q = pAuto;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 morphedEffect = effectCol * hexCol * 1.5;\nvec3 finalCol = mix(source.rgb, morphedEffect, activeHex * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "hexScale": 46.4,
          "autoScale": 2,
          "speed": 2.971,
          "threshold": 1,
          "morph3D": 0.93,
          "lineDensity": 50,
          "blobColor": [
                0.2901960784313726,
                0.19607843137254902,
                0.5058823529411764
          ],
          "branchColor": [
                0.15294117647058825,
                0.00784313725490196,
                0.1411764705882353
          ]
    }
  },
  {
    id: "timeline-3ee01e09-580e-446b-bb3e-1f832e9d26e3",
    name: "Hexagon Gray-Scott Waves",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Hexagon Gray-Scott Waves\nuniform float scale; // @min 1.0 @max 20.0 @default 8.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float blend; // @min 0.0 @max 1.0 @default 0.8\nuniform float bump; // @min 0.0 @max 20.0 @default 5.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float smoothing; // @min 0.0 @max 0.2 @default 0.02\nuniform float rdScale; // @min 1.0 @max 20.0 @default 5.0\nuniform vec3 color1; // @default 0.1,0.8,0.6\nuniform vec3 color2; // @default 0.9,0.2,0.3\nfloat hash1(vec2 p) {\nfloat n = dot(p, vec2(127.1, 311.7));\nreturn fract(sin(n) * 43758.5453);\n}\nfloat noise3(vec3 x) {\nvec3 p = floor(x);\nvec3 f = fract(x);\nf = f * f * (3.0 - 2.0 * f);\nfloat n = p.x + p.y * 157.0 + 113.0 * p.z;\nvec4 v1 = fract(sin(vec4(n, n + 1.0, n + 157.0, n + 158.0)) * 43758.5453);\nvec4 v2 = fract(sin(vec4(n + 113.0, n + 114.0, n + 270.0, n + 271.0)) * 43758.5453);\nvec4 res = mix(v1, v2, f.z);\nvec2 res2 = mix(res.xz, res.yw, f.x);\nreturn mix(res2.x, res2.y, f.y);\n}\nfloat grayScott(vec2 p, float t) {\nvec2 q = p;\nfloat v = 0.0;\nfloat amp = 1.0;\nfor(int i = 0; i < 4; i++) {\nq += 0.3 * vec2(sin(t + q.y * 3.0), cos(t + q.x * 3.0));\nv += amp * abs(sin(q.x * 4.0) * cos(q.y * 4.0));\nq *= 1.6;\namp *= 0.6;\n}\nreturn smoothstep(0.3, 0.5, v);\n}\nvec4 hexagon(vec2 p) {\nvec2 q = vec2(p.x * 1.1547005, p.y + p.x * 0.5773503);\nvec2 pi = floor(q);\nvec2 pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v);\nfloat cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.8660254));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(blackThreshold - smoothing, blackThreshold + smoothing + 0.001, lum);\nvec2 eps = vec2(2.0 / resolution.x, 0.0);\nfloat lumX = dot(texture2D(tex, uv + eps.xy).rgb, vec3(0.299, 0.587, 0.114));\nfloat lumY = dot(texture2D(tex, uv + eps.yx).rgb, vec3(0.299, 0.587, 0.114));\nvec2 grad = vec2(lumX - lum, lumY - lum);\nvec2 pos = (-resolution.xy + 2.0 * (uv * resolution.xy)) / resolution.y;\npos += grad * bump;\npos *= 1.2 + 0.15 * length(pos);\nfloat aa = max(smoothing, 1.5 / resolution.y * scale);\nvec4 h = hexagon(scale * pos + speed * time);\nfloat gs = grayScott(pos * rdScale + h.xy * 0.05, time * speed);\nvec3 gsColor = mix(color1, color2, gs);\nvec3 col = source.rgb * gsColor * (0.5 + 0.5 * hash1(h.xy + 1.2));\ncol *= smoothstep(0.10 - aa, 0.10 + aa, h.z);\ncol *= smoothstep(0.10 - aa, 0.10 + aa, h.w);\ncol *= 1.0 + 0.15 * sin(40.0 * h.z);\nh = hexagon((scale * 0.75) * (pos + 0.1 * vec2(-1.3, 1.0)) + (speed * 1.2) * time);\ncol *= 1.0 - 0.8 * smoothstep(0.45 - aa, 0.45 + aa, noise3(vec3(0.3 * h.xy + time * 0.1, 0.5 * time)));\nh = hexagon((scale * 0.75) * pos + (speed * 1.2) * time);\nfloat n = noise3(vec3(0.3 * h.xy + time * 0.1, 0.5 * time));\nfloat gs2 = grayScott(pos * rdScale * 1.5 + h.xy * 0.05, time * speed * 1.2);\nvec3 colb = source.rgb * mix(color2, color1, gs2);\ncolb *= smoothstep(0.10 - aa, 0.10 + aa, h.z);\ncolb *= 1.0 + 0.15 * sin(40.0 * h.z);\ncol = mix(col, colb, smoothstep(0.45 - aa, 0.45 + aa, n));\ncol *= 2.5 / (2.0 + col);\ncol -= (grad.x + grad.y) * bump * 0.5;\ncol = clamp(col, 0.0, 1.0);\nvec4 finalColor = mix(source, vec4(col, source.a), blend);\nreturn mix(source, finalColor, mask);\n}",
    uniformValues: {
          "scale": 8.22,
          "speed": 0.48,
          "blend": 1,
          "bump": 1,
          "blackThreshold": 0.03,
          "smoothing": 0.034,
          "rdScale": 7.46,
          "color1": [
                0.8392156862745098,
                0.803921568627451,
                0.6235294117647059
          ],
          "color2": [
                0.6352941176470588,
                0.5215686274509804,
                0.6588235294117647
          ]
    }
  },
  {
    id: "timeline-49dd647c-7725-42f2-9c19-ac56bc12924f",
    name: "Horizontal Symmetrical Hexagon",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Horizontal Symmetrical Hexagon\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 1.5 @default 0.5\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float effectAmount; // @min 0.0 @max 1.0 @default 1.0\nuniform float blackLineScale; // @min 0.01 @max 1.0 @default 0.15\nuniform float blackLineThickness; // @min 0.01 @max 2.0 @default 0.1\nuniform float blackLineSpeed; // @min -5.0 @max 5.0 @default -1.0\nuniform float blackLineBlur; // @min 0.0 @max 2.0 @default 0.5\n#define R3 1.732051\nvec4 HexCoords(vec2 uv) {\nvec2 s = vec2(1.0, R3);\nvec2 h = 0.5 * s;\nvec2 gv = s * uv;\nvec2 a = mod(gv, s) - h;\nvec2 b = mod(gv + h, s) - h;\nvec2 ab = dot(a, a) < dot(b, b) ? a : b;\nreturn vec4(ab, gv - ab);\n}\nfloat GetSize(vec2 id, float seed, float time) {\nfloat d = length(id);\nfloat t = time * 0.5;\nreturn (sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0)) / 2.0 + 0.5;\n}\nmat2 Rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat Hexagon(vec2 uv, float r, float time, float thickness, float blur) {\nuv *= Rot(mix(0.0, 3.1415, r));\nr /= 0.7071;\nuv = vec2(-uv.y, uv.x);\nuv.x *= R3;\nuv = abs(uv);\nfloat d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\nd = max(d, uv.y - r * 0.707);\nfloat edge = smoothstep(0.06 * thickness + blur, 0.02 * thickness, abs(d));\nfloat glow = smoothstep(0.25 * thickness + blur, 0.0, abs(d)) * 2.5;\nreturn edge + glow + smoothstep(0.1 * thickness + blur, 0.09 * thickness, abs(r - 0.5)) * sin(time);\n}\nfloat Layer(vec2 uv, float s, float time, float thickness, float blur) {\nvec4 hu = HexCoords(uv * 2.0);\nfloat d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time, thickness, blur);\nvec2 offs = vec2(1.0, 0.0);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(-0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\nreturn d;\n}\nfloat N(float p) {\nreturn fract(sin(p * 123.34) * 345.456);\n}\nvec3 Col(float p, float offs) {\nfloat n = N(p) * 1234.34;\nreturn sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\nvec3 GetAnimColor(vec2 UV, float time, float duv, float thickness, float blur, float timeMult) {\nfloat t = time * speed * timeMult * 0.5 + 5.0;\nvec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\np_uv *= Rot(t);\np_uv.x *= R3;\nvec3 col = vec3(0.0);\nfor(float i = 0.0; i < 1.0; i += 0.3333) {\nfloat id = floor(i + t);\nfloat ft = fract(i + t);\nfloat z = mix(5.0, 0.1, ft);\nfloat fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\ncol += fade * ft * Layer(p_uv * z, N(i + id), time, thickness, blur) * Col(id, duv);\n}\nreturn col;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 UV = uv - 0.5;\nUV.x *= resolution.x / resolution.y;\nfloat duv = dot(UV, UV);\nUV.x = abs(UV.x);\nvec3 col1 = GetAnimColor(UV, time, duv, 1.0, 0.0, 1.0);\nvec3 illuminatedColor = source.rgb * col1 * 2.0 * intensity;\nfloat illumFactor = clamp(length(col1 * intensity), 0.0, 1.0);\nvec3 invertedSource = 1.0 - source.rgb;\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\ninvertedSource *= smoothstep(0.05, 0.2, brightness);\nvec3 effectColor = mix(invertedSource, illuminatedColor, illumFactor);\nvec3 finalColor = mix(source.rgb, effectColor, effectAmount);\nfloat whiteness = min(finalColor.r, min(finalColor.g, finalColor.b));\nfloat mask = smoothstep(0.8, 1.0, whiteness);\nif (mask > 0.0) {\nvec3 col2 = GetAnimColor(UV, time, duv, 1.0, 0.0, -1.0);\nvec3 reverseIlluminated = source.rgb * col2 * 2.0 * intensity;\nfinalColor = mix(finalColor, reverseIlluminated, mask);\n}\nvec3 col3 = GetAnimColor(UV * blackLineScale, time, duv, blackLineThickness, blackLineBlur, blackLineSpeed);\nfloat blackMask = smoothstep(0.2, 0.8, length(col3));\nfinalColor = mix(finalColor, vec3(0.0), blackMask * effectAmount * 0.85);\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    uniformValues: {
          "speed": 3.15,
          "intensity": 0.855,
          "scale": 0.1,
          "effectAmount": 1,
          "blackLineScale": 0.6832,
          "blackLineThickness": 0.1493,
          "blackLineSpeed": -0.1,
          "blackLineBlur": 1.98
    }
  },
  {
    id: "timeline-6b03e9bc-4f4c-4e4b-9754-f5b6d5696dd7",
    name: "Horizontal Symmetrical Hexagon",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Horizontal Symmetrical Hexagon\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float intensity; // @min 0.0 @max 1.5 @default 0.5\nuniform float scale; // @min 0.1 @max 5.0 @default 0.3\nuniform float effectAmount; // @min 0.0 @max 1.0 @default 1.0\nuniform float blackLineScale; // @min 0.01 @max 1.0 @default 0.15\nuniform float blackLineThickness; // @min 0.01 @max 2.0 @default 0.1\nuniform float blackLineSpeed; // @min -5.0 @max 5.0 @default -1.0\nuniform float blackLineBlur; // @min 0.0 @max 2.0 @default 0.5\n#define R3 1.732051\nvec4 HexCoords(vec2 uv) {\nvec2 s = vec2(1.0, R3);\nvec2 h = 0.5 * s;\nvec2 gv = s * uv;\nvec2 a = mod(gv, s) - h;\nvec2 b = mod(gv + h, s) - h;\nvec2 ab = dot(a, a) < dot(b, b) ? a : b;\nreturn vec4(ab, gv - ab);\n}\nfloat GetSize(vec2 id, float seed, float time) {\nfloat d = length(id);\nfloat t = time * 0.5;\nreturn (sin(d * seed + t) + sin(d * seed * seed * 10.0 + t * 2.0)) / 2.0 + 0.5;\n}\nmat2 Rot(float a) {\nfloat s = sin(a), c = cos(a);\nreturn mat2(c, -s, s, c);\n}\nfloat Hexagon(vec2 uv, float r, float time, float thickness, float blur) {\nuv *= Rot(mix(0.0, 3.1415, r));\nr /= 0.7071;\nuv = vec2(-uv.y, uv.x);\nuv.x *= R3;\nuv = abs(uv);\nfloat d = dot(uv, normalize(vec2(1.0, 1.0))) - r;\nd = max(d, uv.y - r * 0.707);\nfloat edge = smoothstep(0.06 * thickness + blur, 0.02 * thickness, abs(d));\nfloat glow = smoothstep(0.25 * thickness + blur, 0.0, abs(d)) * 2.5;\nreturn edge + glow + smoothstep(0.1 * thickness + blur, 0.09 * thickness, abs(r - 0.5)) * sin(time);\n}\nfloat Layer(vec2 uv, float s, float time, float thickness, float blur) {\nvec4 hu = HexCoords(uv * 2.0);\nfloat d = Hexagon(hu.xy, GetSize(hu.zw, s, time), time, thickness, blur);\nvec2 offs = vec2(1.0, 0.0);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\noffs = vec2(-0.5, 0.8725);\nd += Hexagon(hu.xy - offs, GetSize(hu.zw + offs, s, time), time, thickness, blur);\nd += Hexagon(hu.xy + offs, GetSize(hu.zw - offs, s, time), time, thickness, blur);\nreturn d;\n}\nfloat N(float p) {\nreturn fract(sin(p * 123.34) * 345.456);\n}\nvec3 Col(float p, float offs) {\nfloat n = N(p) * 1234.34;\nreturn sin(n * vec3(12.23, 45.23, 56.2) + offs * 3.0) * 0.5 + 0.5;\n}\nvec3 GetAnimColor(vec2 UV, float time, float duv, float thickness, float blur, float timeMult) {\nfloat t = time * speed * timeMult * 0.5 + 5.0;\nvec2 p_uv = UV * mix(1.0, 5.0, sin(t * 0.5) * 0.5 + 0.5) * scale;\np_uv *= Rot(t);\np_uv.x *= R3;\nvec3 col = vec3(0.0);\nfor(float i = 0.0; i < 1.0; i += 0.3333) {\nfloat id = floor(i + t);\nfloat ft = fract(i + t);\nfloat z = mix(5.0, 0.1, ft);\nfloat fade = smoothstep(0.0, 0.3, ft) * smoothstep(1.0, 0.7, ft);\ncol += fade * ft * Layer(p_uv * z, N(i + id), time, thickness, blur) * Col(id, duv);\n}\nreturn col;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 UV = uv - 0.5;\nUV.x *= resolution.x / resolution.y;\nfloat duv = dot(UV, UV);\nUV.x = abs(UV.x);\nvec3 col1 = GetAnimColor(UV, time, duv, 1.0, 0.0, 1.0);\nvec3 illuminatedColor = source.rgb * col1 * 2.0 * intensity;\nfloat illumFactor = clamp(length(col1 * intensity), 0.0, 1.0);\nvec3 invertedSource = 1.0 - source.rgb;\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\ninvertedSource *= smoothstep(0.05, 0.2, brightness);\nvec3 effectColor = mix(invertedSource, illuminatedColor, illumFactor);\nvec3 finalColor = mix(source.rgb, effectColor, effectAmount);\nfloat whiteness = min(finalColor.r, min(finalColor.g, finalColor.b));\nfloat mask = smoothstep(0.8, 1.0, whiteness);\nif (mask > 0.0) {\nvec3 col2 = GetAnimColor(UV, time, duv, 1.0, 0.0, -1.0);\nvec3 reverseIlluminated = source.rgb * col2 * 2.0 * intensity;\nfinalColor = mix(finalColor, reverseIlluminated, mask);\n}\nvec3 col3 = GetAnimColor(UV * blackLineScale, time, duv, blackLineThickness, blackLineBlur, blackLineSpeed);\nfloat blackMask = smoothstep(0.2, 0.8, length(col3));\nfinalColor = mix(finalColor, vec3(0.0), blackMask * effectAmount * 0.85);\nreturn vec4(clamp(finalColor, 0.0, 1.0), source.a);\n}",
    uniformValues: {
          "speed": 5,
          "intensity": 1.32,
          "scale": 4.412,
          "effectAmount": 1,
          "blackLineScale": 0.0595,
          "blackLineThickness": 0.1493,
          "blackLineSpeed": -0.1,
          "blackLineBlur": 1.98
    }
  },
  {
    id: "timeline-69c4bbcb-2f7e-412f-8445-16b4eb13aa7c",
    name: "Inverted Psy Spirals 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Inverted Psy Spirals 3D\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 2.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 5.0\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * scale);\nvec3 col = vec3(URA(h.xy));\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\nvec2 centerP_aspect = centerP;\ncenterP_aspect.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP_aspect * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D * hexLuma * 1.5);\nif (dot(col, vec3(1.0)) > 1.0) {\ncol *= bevel;\n} else {\ncol = 1.0 - (1.0 - col) * bevel;\n}\nfloat angle = atan(centerP.y, centerP.x);\nfloat radius = length(centerP);\nvec2 offset1 = vec2(0.5, 0.3);\nvec2 offset2 = vec2(-0.4, -0.6);\nfloat a1 = atan(centerP.y - offset1.y, centerP.x - offset1.x);\nfloat r1 = length(centerP - offset1);\nfloat a2 = atan(centerP.y - offset2.y, centerP.x - offset2.x);\nfloat r2 = length(centerP - offset2);\nfloat sp1 = a1 * 3.0 - r1 * 15.0 - time * animSpeed;\nfloat sp2 = a2 * -5.0 - r2 * 22.0 + time * animSpeed * 1.3;\nfloat sp3 = angle * 8.0 + radius * 8.0 - time * animSpeed * 0.7;\nfloat interference = sin(sp1) * cos(sp2) + sin(sp3) * 0.5;\nfloat sweep = threshold + interference * 0.6;\nfloat activeHex = step(sweep, hexLuma) * step(0.02, hexLuma);\nvec3 invertedPalette = 1.0 - hexSource.rgb;\nvec3 finalColor = mix(vec3(0.0), col * invertedPalette * 1.8, activeHex);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 46.85,
          "threshold": 1,
          "morph3D": 2,
          "animSpeed": 0.2
    }
  },
  {
    id: "timeline-5aa3c029-a19e-4cbb-a95a-bf9bb43fa8b5",
    name: "Light Trip Masked",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Light Trip Masked\nuniform float warpAmount; // @min 0.0 @max 0.1 @default 0.02\nuniform float colorShift; // @min 0.0 @max 5.0 @default 1.0\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 orig = texture2D(tex, uv);\nif (length(orig.rgb) < 0.01) {\nreturn vec4(0.0, 0.0, 0.0, orig.a);\n}\nvec2 center = vec2(0.5);\nvec2 delta = uv - center;\nfloat dist = length(delta);\nfloat t = time * speed;\nfloat breath = sin(t - dist * 6.0) * warpAmount;\nfloat wave = sin(uv.y * 10.0 + t) * cos(uv.x * 10.0 - t) * warpAmount * 0.5;\nvec2 warpedUV = uv + delta * breath + vec2(wave, -wave);\nfloat shift = colorShift * 0.005;\nvec2 rUV = warpedUV + vec2(shift * sin(t), shift * cos(t));\nvec2 gUV = warpedUV;\nvec2 bUV = warpedUV - vec2(shift * sin(t * 1.2), shift * cos(t * 1.2));\nfloat r = texture2D(tex, rUV).r;\nfloat g = texture2D(tex, gUV).g;\nfloat b = texture2D(tex, bUV).b;\nfloat a = texture2D(tex, warpedUV).a;\nvec3 col = vec3(r, g, b);\nfloat sampleMask = step(0.01, length(col));\nvec3 colorWave = vec3(\nsin(t + dist * 10.0),\ncos(t * 1.1 + dist * 8.0),\nsin(t * 0.9 + dist * 12.0)\n) * 0.05 * colorShift;\ncol += colorWave * sampleMask;\ncol = smoothstep(0.05, 0.95, col);\nreturn vec4(col, a);\n}",
    uniformValues: {
          "warpAmount": 0.004,
          "colorShift": 1.3,
          "speed": 5
    }
  },
  {
    id: "timeline-849de127-1c38-496c-bf40-8ec3d78b35d2",
    name: "Liquid Metal Flow",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Liquid Metal Flow\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 1.0 @max 15.0 @default 4.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float metalness; // @min 0.0 @max 1.0 @default 0.9\nfloat getLum(vec3 col) {\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getFluidHeight(vec2 uv, float time, float lum) {\nvec2 p = uv * scale;\nfloat t = time * speed;\nvec2 q = p + vec2(t * 0.2, t * 0.3);\nfloat n1 = node_noise(q);\nq += vec2(node_noise(q + t * 0.5), node_noise(q - t * 0.4)) * 2.0;\nfloat n2 = node_noise(q * 1.5 - t * 0.3);\nreturn (n1 * 0.6 + n2 * 0.4) * (0.5 + lum * 0.5);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = getLum(source.rgb);\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getFluidHeight(uv, time, lum);\nfloat hx = getFluidHeight(uv + vec2(eps, 0.0), time, lum);\nfloat hy = getFluidHeight(uv + vec2(0.0, eps), time, lum);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightDir = normalize(vec3(0.8, 0.6, 1.0));\nvec3 ref = reflect(-viewDir, normal);\nfloat sky = smoothstep(-0.2, 0.5, ref.y);\nfloat ground = smoothstep(0.2, -0.5, ref.y);\nvec3 envColor = mix(vec3(0.15, 0.15, 0.2), vec3(0.85, 0.9, 1.0), sky);\nenvColor += vec3(0.2, 0.15, 0.1) * ground;\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 2.5;\nfloat fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);\nvec3 baseColor = mix(source.rgb, vec3(0.95), metalness);\nvec3 finalColor = baseColor * envColor + spec + fresnel * 0.6;\nvec2 distUv = uv - normal.xy * 0.05 * (1.0 - metalness);\nvec3 distSource = texture2D(tex, distUv).rgb;\nfinalColor = mix(distSource, finalColor, metalness * 0.8 + 0.2);\nreturn vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    uniformValues: {
          "speed": 2.072,
          "scale": 1.42,
          "bump": 2.158,
          "threshold": 0.08,
          "metalness": 0
    }
  },
  {
    id: "timeline-40c6e4e9-b0e3-48e2-a06e-5784f113ed4a",
    name: "LSD Trip Continuous",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: LSD Trip Continuous\nuniform float spread; // @min 1.0 @max 10.0 @default 4.0\nuniform float sharpness; // @min 0.0 @max 10.0 @default 3.0\nuniform float repulsion; // @min 0.0 @max 5.0 @default 1.5\nuniform float tripSpeed; // @min 0.1 @max 5.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 px = 1.0 / resolution;\nvec4 finalColor = vec4(0.0);\nvec4 original = texture2D(tex, uv);\nvec2 off[8];\noff[0] = vec2(1.0, 0.0);\noff[1] = vec2(-1.0, 0.0);\noff[2] = vec2(0.0, 1.0);\noff[3] = vec2(0.0, -1.0);\noff[4] = vec2(0.707, 0.707);\noff[5] = vec2(-0.707, 0.707);\noff[6] = vec2(0.707, -0.707);\noff[7] = vec2(-0.707, -0.707);\nfloat t = time * tripSpeed;\nfloat totalWeight = 0.0;\nfor(int j = 0; j < 3; j++) {\nfloat fj = float(j);\nfloat phase = fract(t * 0.3 + fj / 3.0);\nfloat weight = sin(phase * 3.14159265);\nfloat currentSpread = spread + phase * (spread * 0.5);\nvec2 currentUv = uv + (uv - 0.5) * (phase * 0.15);\nvec4 centerIter = texture2D(tex, currentUv);\nvec4 near = vec4(0.0);\nvec4 far = vec4(0.0);\nfor(int i = 0; i < 8; i++) {\nnear += texture2D(tex, currentUv + off[i] * px);\nfar += texture2D(tex, currentUv + off[i] * px * currentSpread);\n}\nnear /= 8.0;\nfar /= 8.0;\nvec4 diff = near - far;\nvec4 iterColor = centerIter + (diff * sharpness) - ((centerIter - near) * repulsion);\nvec3 tint = 0.5 + 0.5 * cos(phase * 6.28318 + vec3(0.0, 2.0, 4.0));\nfinalColor += vec4(iterColor.rgb * tint, centerIter.a) * weight;\ntotalWeight += weight;\n}\nfinalColor /= totalWeight + 0.0001;\nfloat lum = dot(original.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(0.05, 0.3, lum);\nvec3 blendedColor = mix(original.rgb, finalColor.rgb, mask);\nreturn vec4(clamp(blendedColor, 0.0, 1.0), original.a);\n}",
    uniformValues: {
          "spread": 10,
          "sharpness": 10,
          "repulsion": 5,
          "tripSpeed": 5
    }
  },
  {
    id: "timeline-4e1cc927-2d8e-4110-bcaa-5af5e4e7e96d",
    name: "Luma Noise Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Noise Automata\nuniform float scale; // @min 1.0 @max 30.0 @default 6.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float warp_amount; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_glow; // @min 0.0 @max 5.0 @default 2.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 tentacle_color; // @default 0.1,0.8,0.6\nuniform vec3 glow_color; // @default 0.9,1.0,1.0\nuniform vec3 bg_color; // @default 0.05,0.05,0.1\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(black_threshold * 0.5, black_threshold + 0.001, lum) * base.a;\nif (mask <= 0.0) {\nreturn base;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\np += warp_amount * vec2(sin(p.y + t + lum), cos(p.x + t - lum));\np += (warp_amount * 0.5) * vec2(sin(p.y * 2.0 - t), cos(p.x * 2.0 - t));\nfloat f = node_noise(p);\nfloat val = sin(f * 15.0 - t * 3.0) * 0.5 + 0.5;\nfloat pattern = smoothstep(0.45, 0.55, val);\nfloat edge = smoothstep(0.35, 0.5, val) - smoothstep(0.5, 0.65, val);\nfloat topo = sin((lum * 2.0 + f) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nfloat grain = node_rand(uv * 1000.0);\nvec3 granular_bg = bg_color * (0.6 + 0.5 * grain);\nvec3 col = mix(granular_bg, tentacle_color, pattern);\ncol += glow_color * (edge * edge_glow);\ncol += vec3(1.0) * lines * lum * 1.5;\nvec3 shaded_col = col * (lum * shading_strength + 0.1);\nreturn vec4(mix(base.rgb, shaded_col, mask), base.a);\n}",
    uniformValues: {
          "scale": 2.45,
          "speed": 0.1,
          "warp_amount": 0.7,
          "edge_glow": 3.65,
          "black_threshold": 0.26,
          "lineDensity": 11.3,
          "tentacle_color": [
                0.24313725490196078,
                0.1843137254901961,
                0.054901960784313725
          ],
          "glow_color": [
                0.7372549019607844,
                0.7215686274509804,
                0.20392156862745098
          ],
          "bg_color": [
                0.2549019607843137,
                0.21568627450980393,
                0.023529411764705882
          ],
          "shading_strength": 2.4
    }
  },
  {
    id: "timeline-660c5838-9a06-4890-857a-eb53303e453f",
    name: "Luma Noise Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Noise Automata\nuniform float scale; // @min 1.0 @max 30.0 @default 6.0\nuniform float speed; // @min 0.0 @max 5.0 @default 0.5\nuniform float warp_amount; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_glow; // @min 0.0 @max 5.0 @default 2.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 tentacle_color; // @default 0.1,0.8,0.6\nuniform vec3 glow_color; // @default 0.9,1.0,1.0\nuniform vec3 bg_color; // @default 0.05,0.05,0.1\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nfloat lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(black_threshold * 0.5, black_threshold + 0.001, lum) * base.a;\nif (mask <= 0.0) {\nreturn base;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\np += warp_amount * vec2(sin(p.y + t + lum), cos(p.x + t - lum));\np += (warp_amount * 0.5) * vec2(sin(p.y * 2.0 - t), cos(p.x * 2.0 - t));\nfloat f = node_noise(p);\nfloat val = sin(f * 15.0 - t * 3.0) * 0.5 + 0.5;\nfloat pattern = smoothstep(0.45, 0.55, val);\nfloat edge = smoothstep(0.35, 0.5, val) - smoothstep(0.5, 0.65, val);\nfloat topo = sin((lum * 2.0 + f) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nfloat grain = node_rand(uv * 1000.0);\nvec3 granular_bg = bg_color * (0.6 + 0.5 * grain);\nvec3 col = mix(granular_bg, tentacle_color, pattern);\ncol += glow_color * (edge * edge_glow);\ncol += vec3(1.0) * lines * lum * 1.5;\nvec3 shaded_col = col * (lum * shading_strength + 0.1);\nreturn vec4(mix(base.rgb, shaded_col, mask), base.a);\n}",
    uniformValues: {
          "scale": 1,
          "speed": 0.7,
          "warp_amount": 2.25,
          "edge_glow": 3.65,
          "black_threshold": 0.26,
          "lineDensity": 11.3,
          "tentacle_color": [
                0.2823529411764706,
                0.058823529411764705,
                0.058823529411764705
          ],
          "glow_color": [
                0.5607843137254902,
                0.2235294117647059,
                0.0392156862745098
          ],
          "bg_color": [
                0.9137254901960784,
                0.9294117647058824,
                0.9294117647058824
          ],
          "shading_strength": 2.4
    }
  },
  {
    id: "timeline-1713064c-159d-439d-bb82-688383284719",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.08;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 0.39,
          "centerX": 0.11,
          "centerY": 0,
          "threshold": 0,
          "speed": 2.507
    }
  },
  {
    id: "timeline-19b303a0-cd36-4556-9fa7-c46b38c34a14",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 2.85,
          "centerX": 0.34,
          "centerY": 0.2,
          "threshold": 0.06,
          "speed": 1.898
    }
  },
  {
    id: "timeline-71a1df62-599c-46a6-b27a-87397d162cdf",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 0.42,
          "centerX": 0.16,
          "centerY": 0.2,
          "threshold": 0.06,
          "speed": 1.898
    }
  },
  {
    id: "timeline-814b7d19-5ffe-4da5-971c-555da77ec977",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.17;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 3,
          "centerX": 0,
          "centerY": 0.8,
          "threshold": 0,
          "speed": 0.216
    }
  },
  {
    id: "timeline-829d4574-7fc9-4004-9618-f5dce950596f",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 1.74,
          "centerX": 0.06,
          "centerY": -0.02,
          "threshold": 0,
          "speed": 0.274
    }
  },
  {
    id: "timeline-a3740bd1-563b-4407-a63e-04c40f5dde72",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 1.44,
          "centerX": 0.41,
          "centerY": -0.26,
          "threshold": 0.1,
          "speed": 0.8
    }
  },
  {
    id: "timeline-e2d8bdac-7061-4dd9-a4fe-741cab075e47",
    name: "Luma Trippy Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Luma Trippy Automata\nuniform float intensity; // @min 0.0 @max 3.0 @default 1.5\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min -1.0 @max 1.0 @default 0.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 c = vec3(0.0);\nfloat l = 0.0;\nfloat z = time * speed;\nfor(int i = 0; i < 3; i++) {\nvec2 p = uv;\np -= 0.5;\np.x = abs(p.x) - centerX;\np.y -= centerY;\np.x *= resolution.x / resolution.y;\nfloat noiseVal = node_noise(p * 5.0 + z + lum * 2.0);\np += vec2(cos(noiseVal * 6.2831), sin(noiseVal * 6.2831)) * lum * 0.15;\nvec2 uv_effect = p;\nz += 0.07;\nl = length(p);\nfloat lenP = max(l, 0.0001);\nuv_effect += p / lenP * (sin(z) + 1.0) * abs(sin(lenP * 9.0 - z - z));\nfloat val = 0.01 / max(length(mod(uv_effect, 1.0) - 0.5), 0.0001);\nif (i == 0) c.r = val;\nelse if (i == 1) c.g = val;\nelse c.b = val;\n}\nvec3 effectColor = c / max(l, 0.0001);\nvec3 mappedEffect = source.rgb * effectColor * intensity;\nvec3 finalColor = mix(source.rgb, mappedEffect, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "intensity": 3,
          "centerX": 0,
          "centerY": -0.16,
          "threshold": 0,
          "speed": 0.1
    }
  },
  {
    id: "timeline-0acf1595-225d-4aee-8fa7-b3b357a9c7ea",
    name: "Metallic 3D Fluid Shadows",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\nvec2 p = uv * patternScale;\np *= (0.8 + 0.4 * lum);\nvec2 p_inv = p;\nfloat rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\nmat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\np = rot * p;\nfor(int i = 0; i < 6; i++) {\nfloat t = time * speed;\np = vec2(\np.x + 0.65 * sin(p.y * 1.3 + t),\np.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n);\np_inv = vec2(\np_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\np_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n);\n}\nfloat val = sin(p.x) * cos(p.y);\nfloat dx = cos(p.x) * cos(p.y);\nfloat dy = -sin(p.x) * sin(p.y);\nfloat pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\nvec3 psychColor = vec3(\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n);\nvec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\nvec2 dotGrid = fract(dotGridUv) - 0.5;\nfloat dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\nfloat randomIntensity = node_rand(floor(dotGridUv));\ndots *= 0.3 + 0.7 * randomIntensity;\nvec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\nvec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nvec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\nvec2 lightOffset = lightDir.xy * 0.8;\nfloat shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\nfloat shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\nfloat diffuse = max(dot(normal, lightDir), 0.0) * shadow;\nfloat specPower = mix(5.0, 100.0, glossiness);\nfloat specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\nfloat envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\nvec3 reflection = vec3(envRefl) * metallic * 0.4;\nvec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\nvec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "patternScale": 13.55,
          "speed": 1.96,
          "colorIntensity": 0.38,
          "bgThreshold": 0.165,
          "edgeWidth": 0.016,
          "dotSize": 2,
          "noiseIntensity": 0,
          "metallic": 0.32,
          "glossiness": 0
    }
  },
  {
    id: "timeline-74dc73b9-e19d-4434-b259-0f5c9531b3d1",
    name: "Metallic 3D Fluid Shadows",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\nvec2 p = uv * patternScale;\np *= (0.8 + 0.4 * lum);\nvec2 p_inv = p;\nfloat rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\nmat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\np = rot * p;\nfor(int i = 0; i < 6; i++) {\nfloat t = time * speed;\np = vec2(\np.x + 0.65 * sin(p.y * 1.3 + t),\np.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n);\np_inv = vec2(\np_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\np_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n);\n}\nfloat val = sin(p.x) * cos(p.y);\nfloat dx = cos(p.x) * cos(p.y);\nfloat dy = -sin(p.x) * sin(p.y);\nfloat pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\nvec3 psychColor = vec3(\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n);\nvec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\nvec2 dotGrid = fract(dotGridUv) - 0.5;\nfloat dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\nfloat randomIntensity = node_rand(floor(dotGridUv));\ndots *= 0.3 + 0.7 * randomIntensity;\nvec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\nvec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nvec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\nvec2 lightOffset = lightDir.xy * 0.8;\nfloat shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\nfloat shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\nfloat diffuse = max(dot(normal, lightDir), 0.0) * shadow;\nfloat specPower = mix(5.0, 100.0, glossiness);\nfloat specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\nfloat envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\nvec3 reflection = vec3(envRefl) * metallic * 0.4;\nvec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\nvec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "patternScale": 5,
          "speed": 0.3,
          "colorIntensity": 0.29,
          "bgThreshold": 0.02,
          "edgeWidth": 0.368,
          "dotSize": 30,
          "noiseIntensity": 0.96,
          "metallic": 0,
          "glossiness": 1
    }
  },
  {
    id: "timeline-ba116dd2-6d26-4f67-a314-f615410053b4",
    name: "Metallic 3D Fluid Shadows",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 5.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\nvec2 p = uv * patternScale;\np *= (0.8 + 0.4 * lum);\nvec2 p_inv = p;\nfloat rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\nmat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\np = rot * p;\nfor(int i = 0; i < 6; i++) {\nfloat t = time * speed;\np = vec2(\np.x + 0.65 * sin(p.y * 1.3 + t),\np.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n);\np_inv = vec2(\np_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\np_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n);\n}\nfloat val = sin(p.x) * cos(p.y);\nfloat dx = cos(p.x) * cos(p.y);\nfloat dy = -sin(p.x) * sin(p.y);\nfloat pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\nvec3 psychColor = vec3(\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n);\nvec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\nvec2 dotGrid = fract(dotGridUv) - 0.5;\nfloat dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\nfloat randomIntensity = node_rand(floor(dotGridUv));\ndots *= 0.3 + 0.7 * randomIntensity;\nvec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\nvec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nvec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\nvec2 lightOffset = lightDir.xy * 0.8;\nfloat shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\nfloat shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\nfloat diffuse = max(dot(normal, lightDir), 0.0) * shadow;\nfloat specPower = mix(5.0, 100.0, glossiness);\nfloat specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\nfloat envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\nvec3 reflection = vec3(envRefl) * metallic * 0.4;\nvec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\nvec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "patternScale": 13.55,
          "speed": 0,
          "colorIntensity": 0.45,
          "bgThreshold": 0.045,
          "edgeWidth": 0.656,
          "dotSize": 30,
          "noiseIntensity": 1.34,
          "metallic": 1.92,
          "glossiness": 0.72
    }
  },
  {
    id: "timeline-fe5514ca-071f-40c1-854b-dcf365b3d367",
    name: "Metallic 3D Fluid Shadows",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Metallic 3D Fluid Shadows\nuniform float patternScale; // @min 1.0 @max 50.0 @default 25.0\nuniform float speed; // @min 0.0 @max 2.0 @default 0.4\nuniform float colorIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float edgeWidth; // @min -0.8 @max 0.8 @default 0.0\nuniform float dotSize; // @min 2.0 @max 30.0 @default 6.0\nuniform float noiseIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float metallic; // @min 0.0 @max 2.0 @default 1.2\nuniform float glossiness; // @min 0.0 @max 1.0 @default 0.8\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat statueMask = smoothstep(bgThreshold, bgThreshold + 0.02, lum) * source.a;\nvec2 p = uv * patternScale;\np *= (0.8 + 0.4 * lum);\nvec2 p_inv = p;\nfloat rotAngle = time * 0.1 + node_noise(vec2(time * 0.05, 0.0)) * 4.0;\nmat2 rot = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));\np = rot * p;\nfor(int i = 0; i < 6; i++) {\nfloat t = time * speed;\np = vec2(\np.x + 0.65 * sin(p.y * 1.3 + t),\np.y + 0.65 * cos(p.x * 1.3 - t * 0.8)\n);\np_inv = vec2(\np_inv.x - 0.65 * sin(p_inv.y * 1.3 + t),\np_inv.y - 0.65 * cos(p_inv.x * 1.3 - t * 0.8)\n);\n}\nfloat val = sin(p.x) * cos(p.y);\nfloat dx = cos(p.x) * cos(p.y);\nfloat dy = -sin(p.x) * sin(p.y);\nfloat pattern = smoothstep(edgeWidth - 0.1, edgeWidth + 0.1, val);\nvec3 psychColor = vec3(\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.5 + uv.x * 5.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.8 + uv.y * 5.0 + 2.0),\n0.5 + 0.5 * sin(pattern * 3.14 + time * 1.2 + (uv.x + uv.y) * 5.0 + 4.0)\n);\nvec2 dotGridUv = (p_inv / patternScale) * (resolution.xy / dotSize);\nvec2 dotGrid = fract(dotGridUv) - 0.5;\nfloat dots = 1.0 - smoothstep(0.2, 0.35, length(dotGrid));\nfloat randomIntensity = node_rand(floor(dotGridUv));\ndots *= 0.3 + 0.7 * randomIntensity;\nvec3 darkDotNoiseEffect = source.rgb * dots * noiseIntensity;\nvec3 baseColor = mix(darkDotNoiseEffect, source.rgb * psychColor * 2.5, pattern * colorIntensity);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfVector = normalize(lightDir + viewDir);\nvec3 normal = normalize(vec3(dx, dy, 1.5 - min(metallic, 1.4)));\nvec2 lightOffset = lightDir.xy * 0.8;\nfloat shadowVal = sin(p.x + lightOffset.x) * cos(p.y + lightOffset.y);\nfloat shadow = smoothstep(-0.3, 0.7, val - shadowVal + 0.4);\nfloat diffuse = max(dot(normal, lightDir), 0.0) * shadow;\nfloat specPower = mix(5.0, 100.0, glossiness);\nfloat specular = pow(max(dot(normal, halfVector), 0.0), specPower) * metallic * 1.5 * shadow;\nfloat envRefl = node_noise(normal.xy * 4.0 + time * 0.2);\nvec3 reflection = vec3(envRefl) * metallic * 0.4;\nvec3 statueEffect = baseColor * (0.2 + 0.8 * diffuse) + specular + (reflection * baseColor);\nvec3 finalColor = mix(vec3(0.0), statueEffect, statueMask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "patternScale": 1.98,
          "speed": 0.3,
          "colorIntensity": 1,
          "bgThreshold": 0.065,
          "edgeWidth": 0.368,
          "dotSize": 27.76,
          "noiseIntensity": 2,
          "metallic": 1.62,
          "glossiness": 0.92
    }
  },
  {
    id: "timeline-febc5b14-145a-43b8-a16e-2a09b25ead67",
    name: "Mirrored 3D Scanline Grid with Chroma",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Mirrored 3D Scanline Grid with Chroma\nuniform float bump; // @min 0.1 @max 10.0 @default 2.0\nuniform float lightIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform vec3 scanColor; // @default 0.0,1.0,0.8\nuniform float scanSpeed; // @min 0.1 @max 3.0 @default 0.5\nuniform float gridScale; // @min 1.0 @max 20.0 @default 8.0\nuniform float scanIntensity; // @min 0.0 @max 5.0 @default 1.0\nuniform float chromaDiff; // @min 0.0 @max 0.1 @default 0.02\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 offset = (uv - 0.5) * chromaDiff;\nfloat r = texture2D(tex, uv + offset).r;\nfloat g = texture2D(tex, uv - offset).g;\nfloat b = texture2D(tex, uv - offset).b;\nvec4 source = vec4(r, g, b, texture2D(tex, uv).a);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nvec2 eps = vec2(1.0 / resolution.x, 1.0 / resolution.y);\nfloat lumaX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\nfloat lumaY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, vec3(0.299, 0.587, 0.114));\nvec3 normal = normalize(vec3((luma - lumaX) * bump, (luma - lumaY) * bump, 0.05));\nvec3 surfacePos = vec3(uv, luma * 0.15);\nvec3 totalLight = vec3(0.0);\nfor(int i = 0; i < 3; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.6 * sin(time * 0.5 + fi * 2.1),\n0.5 + 0.6 * cos(time * 0.6 + fi * 1.7),\n0.2 + 0.2 * sin(time * 0.7 + fi)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 2.0),\n0.5 + 0.5 * sin(fi * 3.0 + 2.0),\n0.5 + 0.5 * sin(fi * 4.0 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 5.0);\nvec3 viewDir = normalize(vec3(0.5, 0.5, 1.0) - surfacePos);\nvec3 halfDir = normalize(lDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 16.0);\ntotalLight += lCol * (diff + spec * 0.5) * atten;\n}\nvec2 mirroredUV = vec2(abs(uv.x - 0.5) * 2.0, uv.y);\nvec2 gridUV = fract(mirroredUV * gridScale - time * scanSpeed + luma * 0.3);\nvec2 gridDist = abs(gridUV - 0.5);\nfloat lineDist = min(gridDist.x, gridDist.y);\nfloat scanCore = smoothstep(0.02, 0.0, lineDist);\nfloat scanGlow = 0.002 / (lineDist + 0.001);\nvec3 scanEffect = scanColor * (scanCore + scanGlow) * smoothstep(0.05, 0.2, luma) * scanIntensity;\nvec3 finalColor = source.rgb * totalLight * lightIntensity + scanEffect;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "bump": 1.585,
          "lightIntensity": 3.9,
          "scanColor": [
                0.7686274509803922,
                0.3843137254901961,
                0.12941176470588237
          ],
          "scanSpeed": 2.217,
          "gridScale": 8.41,
          "scanIntensity": 0.5,
          "chromaDiff": 0.02
    }
  },
  {
    id: "timeline-89ca6d14-53be-47ba-b486-31697c70d7fd",
    name: "Morphed Automata Grid",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Morphed Automata Grid\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nuniform float morphAmount; // @min 0.0 @max 0.2 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nfloat origLum = dot(origSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(blackThreshold, blackThreshold + 0.02, origLum);\nif (mask <= 0.0) {\nreturn vec4(0.0, 0.0, 0.0, origSource.a);\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat morphNx = node_noise(p - t * 0.3);\nfloat morphNy = node_noise(p + vec2(13.37) + t * 0.3);\nvec2 morphOffset = (vec2(morphNx, morphNy) - 0.5) * 2.0 * morphAmount;\nvec2 morphedUV = uv + morphOffset;\nvec4 source = texture2D(tex, morphedUV);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat morphedMask = smoothstep(blackThreshold, blackThreshold + 0.02, lum);\nvec2 dir = vec2(1.0, 1.0);\nvec2 mp = morphedUV * scale;\nfloat n = node_noise(mp + lum * 2.0 * dir - t * 0.5);\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topoX = sin((mp.x + lum * 1.5 * dir.x + n) * lineDensity - t);\nfloat topoY = sin((mp.y + lum * 1.5 * dir.y + n) * lineDensity - t);\nfloat lineX = smoothstep(0.8, 0.95, topoX);\nfloat lineY = smoothstep(0.8, 0.95, topoY);\nfloat lines = clamp(lineX + lineY, 0.0, 1.0);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * (lum + 0.3);\nvec3 finalCol = mix(source.rgb, effectCol, branch * 0.7 + lines * 0.6);\nfinalCol *= morphedMask;\nfinalCol *= mask;\nreturn vec4(finalCol, origSource.a);\n}",
    uniformValues: {
          "scale": 4.34,
          "lineDensity": 50,
          "blobColor": [
                0.3607843137254902,
                0.11764705882352941,
                0.24705882352941178
          ],
          "branchColor": [
                0.21568627450980393,
                0.06666666666666667,
                0.1843137254901961
          ],
          "blackThreshold": 0.16,
          "speed": 2.35,
          "morphAmount": 0.024
    }
  },
  {
    id: "timeline-af542a9f-1712-481a-8145-ad13158cd53b",
    name: "Moving 3D Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Moving 3D Luma Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float moveSpeed; // @min 0.0 @max 5.0 @default 1.0\nfloat getLuma(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\nvec2 q = uv * scale;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(float(i) + time * moveSpeed), cos(float(i) + time * moveSpeed));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5 - time * moveSpeed * 0.2);\nfloat angle = noiseVal * 6.2831 + time * moveSpeed * 0.5;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * moveSpeed * 2.0));\nvec3 effectCol = mix(blobColor, branchColor, branch) + vec3(1.0) * lines * lum * 1.5;\nvec3 segColor = mix(bgCol, effectCol, mask * branch);\nvec2 eps = 1.0 / resolution;\nfloat l = getLuma(tex, uv - vec2(eps.x, 0.0));\nfloat r = getLuma(tex, uv + vec2(eps.x, 0.0));\nfloat d = getLuma(tex, uv - vec2(0.0, eps.y));\nfloat u = getLuma(tex, uv + vec2(0.0, eps.y));\nvec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\nvec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\nvec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat diff = max(dot(normal, lightDir), 0.0);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\nvec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\nvec3 finalColor = segColor * finalLight;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "depth": 9.703,
          "lightIntensity": 2,
          "lightColor": [
                0.23921568627450981,
                0,
                0.4
          ],
          "ambientLight": 0.98,
          "lightZ": 1.9403,
          "specularStrength": 4,
          "lightSpeed": 0.4,
          "scale": 5.6,
          "threshold": 0.345,
          "lineDensity": 26.15,
          "blobColor": [
                0.6980392156862745,
                0.5882352941176471,
                0.1803921568627451
          ],
          "branchColor": [
                0.8941176470588236,
                0.22745098039215686,
                0.6705882352941176
          ],
          "blackout": 1,
          "moveSpeed": 1
    }
  },
  {
    id: "timeline-f9fe6bcb-51a5-402a-ba95-db03ce029201",
    name: "Moving 3D Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Moving 3D Luma Automata\nuniform float depth; // @min 0.1 @max 10.0 @default 5.0\nuniform float lightIntensity; // @min 0.0 @max 10.0 @default 3.0\nuniform vec3 lightColor; // @default 1.0,1.0,1.0\nuniform float ambientLight; // @min 0.0 @max 1.0 @default 0.05\nuniform float lightZ; // @min 0.01 @max 2.0 @default 0.15\nuniform float specularStrength; // @min 0.0 @max 5.0 @default 1.5\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nuniform float moveSpeed; // @min 0.0 @max 5.0 @default 1.0\nfloat getLuma(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 bgCol = mix(source.rgb, vec3(0.0), blackout);\nvec2 q = uv * scale;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(float(i) + time * moveSpeed), cos(float(i) + time * moveSpeed));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5 - time * moveSpeed * 0.2);\nfloat angle = noiseVal * 6.2831 + time * moveSpeed * 0.5;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat lines = smoothstep(0.8, 0.95, sin((lum * 2.0 + n) * lineDensity - time * moveSpeed * 2.0));\nvec3 effectCol = mix(blobColor, branchColor, branch) + vec3(1.0) * lines * lum * 1.5;\nvec3 segColor = mix(bgCol, effectCol, mask * branch);\nvec2 eps = 1.0 / resolution;\nfloat l = getLuma(tex, uv - vec2(eps.x, 0.0));\nfloat r = getLuma(tex, uv + vec2(eps.x, 0.0));\nfloat d = getLuma(tex, uv - vec2(0.0, eps.y));\nfloat u = getLuma(tex, uv + vec2(0.0, eps.y));\nvec3 normal = normalize(vec3((r - l) * depth, (u - d) * depth, 1.0));\nvec3 lightPos = vec3(0.5 + sin(time * lightSpeed) * 0.5, 0.5 + cos(time * lightSpeed) * 0.5, lightZ);\nvec3 lightDir = normalize(lightPos - vec3(uv, 0.0));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat diff = max(dot(normal, lightDir), 0.0);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * specularStrength;\nvec3 finalLight = vec3(ambientLight) + lightColor * lightIntensity * (diff + spec);\nvec3 finalColor = segColor * finalLight;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "depth": 9.703,
          "lightIntensity": 2,
          "lightColor": [
                0.23921568627450981,
                0,
                0.4
          ],
          "ambientLight": 0.98,
          "lightZ": 1.9403,
          "specularStrength": 4,
          "lightSpeed": 0.4,
          "scale": 5.6,
          "threshold": 0.345,
          "lineDensity": 26.15,
          "blobColor": [
                0.6980392156862745,
                0.5882352941176471,
                0.1803921568627451
          ],
          "branchColor": [
                0.8941176470588236,
                0.22745098039215686,
                0.6705882352941176
          ],
          "blackout": 1,
          "moveSpeed": 1
    }
  },
  {
    id: "timeline-3f118a43-a58b-403a-81c9-16fcef26ed98",
    name: "Moving Mold Tentacles",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Moving Mold Tentacles\nuniform float scale; // @min 1.0 @max 30.0 @default 3.0\nuniform float black_threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform vec3 mold_color; // @default 0.2,0.6,0.3\nuniform vec3 tip_color; // @default 0.8,0.9,0.4\nuniform float shading_strength; // @min 0.0 @max 3.0 @default 2.0\nuniform float growth_spread; // @min 0.0 @max 1.0 @default 0.5\nuniform float speed; // @min 0.0 @max 5.0 @default 1.0\nfloat getMold(vec2 p, float t) {\nfloat n1 = node_noise(p + t * 0.1);\nfloat n2 = node_noise(p + vec2(5.2, 1.3) - t * 0.15);\nvec2 q = vec2(n1, n2);\nfloat n3 = node_noise(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.2);\nfloat n4 = node_noise(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.2);\nvec2 r = vec2(n3, n4);\nfloat f = node_noise(p + 4.0 * r + t * 0.3);\nreturn abs(f * 2.0 - 1.0);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 base = texture2D(tex, uv);\nvec2 p = (gl_FragCoord.xy / resolution.xy) * scale;\np.x *= resolution.x / resolution.y;\nfloat t = time * speed;\nfloat h = getMold(p, t);\nfloat eps = 0.02;\nfloat hx = getMold(p + vec2(eps, 0.0), t);\nfloat hy = getMold(p + vec2(0.0, eps), t);\nvec3 normal = normalize(vec3(hx - h, hy - h, 0.1));\nvec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));\nfloat diff = max(dot(normal, lightDir), 0.0);\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.3;\nvec3 col = mix(mold_color, tip_color, smoothstep(0.2, 0.8, h));\ncol = col * (diff * 0.8 + 0.2) + spec;\nfloat lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));\nvec3 shaded_col = col * (lum * shading_strength + 0.1);\nfloat current_spread = clamp(growth_spread + sin(t * 0.5) * 0.15, 0.0, 1.0);\nfloat mask = smoothstep(1.0 - current_spread, 1.0 - current_spread + 0.2, 1.0 - h);\nfloat intensity = length(base.rgb);\nfloat uv_edge = smoothstep(0.0, 0.02, uv.x) * smoothstep(1.0, 0.98, uv.x) *\nsmoothstep(0.0, 0.02, uv.y) * smoothstep(1.0, 0.98, uv.y);\nfloat edge_blend = smoothstep(black_threshold, black_threshold + 0.1, intensity) * base.a * uv_edge * mask;\nreturn vec4(mix(base.rgb, shaded_col, edge_blend), base.a);\n}",
    uniformValues: {
          "scale": 14.92,
          "black_threshold": 0.08,
          "mold_color": [
                0.3686274509803922,
                0.32941176470588235,
                0.12941176470588237
          ],
          "tip_color": [
                0.7803921568627451,
                0.6980392156862745,
                0.1607843137254902
          ],
          "shading_strength": 0.27,
          "growth_spread": 1,
          "speed": 1
    }
  },
  {
    id: "timeline-1cab9f8c-921c-47ca-afea-98cbebcb984d",
    name: "Multi-Wave Psytrance",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = r - l;\nfloat dy = d - u;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nvec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 4.95,
          "edge_boost": 2.8,
          "color_speed": 2.7,
          "loop_speed": 0.1,
          "pulse_amount": 0,
          "hue_shift": 0.9,
          "num_waves": 1.57,
          "black_tolerance": 0.07,
          "black_spread": 2.3
    }
  },
  {
    id: "timeline-bc907b8e-f19c-47c5-89d1-03cd415c9868",
    name: "Multi-Wave Psytrance",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = r - l;\nfloat dy = d - u;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nvec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 2.65,
          "edge_boost": 3.1,
          "color_speed": 5,
          "loop_speed": 0.688,
          "pulse_amount": 0.16,
          "hue_shift": 5.9,
          "num_waves": 2.52,
          "black_tolerance": 0.095,
          "black_spread": 4.2
    }
  },
  {
    id: "timeline-ee9698b3-8529-4dea-8f2d-2f62fd7730e9",
    name: "Multi-Wave Psytrance",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = r - l;\nfloat dy = d - u;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nvec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 3.35,
          "edge_boost": 10,
          "color_speed": 4.65,
          "loop_speed": 2.991,
          "pulse_amount": 0.08,
          "hue_shift": 10,
          "num_waves": 4.42,
          "black_tolerance": 0.07,
          "black_spread": 1.3
    }
  },
  {
    id: "timeline-f40cd631-6806-43db-b7f5-9ff0273cbefd",
    name: "Multi-Wave Psytrance",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Multi-Wave Psytrance\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = r - l;\nfloat dy = d - u;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nvec3 finalColor = psyColor * edge * current_edge_boost * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 5,
          "edge_boost": 0.4,
          "color_speed": 4.95,
          "loop_speed": 0.884,
          "pulse_amount": 2,
          "hue_shift": 10,
          "num_waves": 2.14,
          "black_tolerance": 0.1,
          "black_spread": 6.4
    }
  },
  {
    id: "timeline-582581f5-f5dc-427d-9111-6341e51a73fe",
    name: "Neon Liquid Metal",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Neon Liquid Metal\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * 1.5;\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 3.04,
          "scale": 3.26,
          "depth": 3.3,
          "roughness": 0.1472,
          "tintColor": [
                0.396078431372549,
                0.2823529411764706,
                0.2823529411764706
          ],
          "threshold": 0.08
    }
  },
  {
    id: "timeline-5fa1a59c-2e0a-4669-bdf7-298ec79365ad",
    name: "Neon Liquid Metal",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Neon Liquid Metal\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * 1.5;\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 3.628,
          "scale": 3.26,
          "depth": 3.3,
          "roughness": 0.1472,
          "tintColor": [
                0.396078431372549,
                0.2823529411764706,
                0.2823529411764706
          ],
          "threshold": 0.08
    }
  },
  {
    id: "timeline-5dd65d0c-e711-4248-abdd-14ab8dec8b5e",
    name: "New Shader",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: New Shader\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nreturn source;\n}",
    uniformValues: {}
  },
  {
    id: "timeline-42a47a9a-f4e3-4a97-b974-93b24bb920cd",
    name: "Pastel Child Drawing",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Pastel Child Drawing\nuniform float wobbleAmount; // @min 0.0 @max 0.02 @default 0.005\nuniform float wobbleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform bool radialWobble; // @default false\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float pixelation; // @min 1.0 @max 10.0 @default 2.0\nuniform float contrast; // @min 0.0 @max 5.0 @default 1.5\nuniform float darkWobbleThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float bgBlackThreshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getLuma(vec3 color) {\nreturn dot(color, vec3(0.299, 0.587, 0.114));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origColor = texture2D(tex, uv);\nfloat luma = getLuma(origColor.rgb);\nfloat contrastedLuma = clamp((luma - 0.5) * contrast + 0.5, 0.0, 1.0);\nvec2 wobbleUv = uv;\nif (contrastedLuma < darkWobbleThreshold) {\nif (radialWobble) {\nvec2 toCenter = uv - 0.5;\nfloat dist = length(toCenter);\nvec2 dir = dist > 0.0001 ? toCenter / dist : vec2(0.0);\nwobbleUv += dir * sin(dist * 30.0 - time * wobbleSpeed) * wobbleAmount;\n} else {\nwobbleUv += vec2(\nsin(uv.y * 30.0 + time * wobbleSpeed),\ncos(uv.x * 30.0 + time * wobbleSpeed)\n) * wobbleAmount;\n}\n}\nvec2 resPix = resolution / pixelation;\nvec2 sampleUv = floor(wobbleUv * resPix) / resPix;\nvec2 texel = 1.0 / resolution;\nfloat hx = getLuma(texture2D(tex, sampleUv + vec2(texel.x, 0.0)).rgb) - getLuma(texture2D(tex, sampleUv - vec2(texel.x, 0.0)).rgb);\nfloat hy = getLuma(texture2D(tex, sampleUv + vec2(0.0, texel.y)).rgb) - getLuma(texture2D(tex, sampleUv - vec2(0.0, texel.y)).rgb);\nfloat edge = length(vec2(hx, hy)) * edgeIntensity;\nfloat grain = fract(sin(dot(sampleUv, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;\nvec4 finalColor = texture2D(tex, sampleUv);\nfinalColor.rgb = clamp((finalColor.rgb - 0.5) * contrast + 0.5, 0.0, 1.0);\nfinalColor.rgb -= edge;\nfinalColor.rgb -= grain;\nfloat bgMask = step(luma, bgBlackThreshold);\nfinalColor.rgb = mix(finalColor.rgb, origColor.rgb, bgMask);\nreturn vec4(finalColor.rgb, origColor.a);\n}",
    uniformValues: {
          "wobbleAmount": 0.0154,
          "wobbleSpeed": 2.2,
          "radialWobble": true,
          "edgeIntensity": 5,
          "pixelation": 10,
          "contrast": 1.45,
          "darkWobbleThreshold": 0.66,
          "bgBlackThreshold": 0
    }
  },
  {
    id: "timeline-76e605f9-8103-468f-9cfe-1012e1e9fae8",
    name: "Priority Flipping Cubes",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Priority Flipping Cubes\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = uv * 10.0 * zoom;\nvec2 id = floor(p);\nvec2 f = fract(p) - 0.5;\nfloat localTime = time * speed - length(id - vec2(5.0 * zoom)) * 0.3;\nfloat phase = fract(localTime * waveFreq);\nfloat flipProgress = smoothstep(0.0, 0.5, phase);\nfloat angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159265;\nfloat s = sin(angle), c = cos(angle);\nmat2 rot = mat2(c, -s, s, c);\nvec2 rotatedF = rot * f;\nif (abs(rotatedF.x) < 0.45 && abs(rotatedF.y) < 0.45) {\nvec2 sampleUV = (id + rotatedF + 0.5) / (10.0 * zoom);\nvec4 col = texture2D(tex, fract(sampleUV));\ncol.rgb *= 0.7 + 0.3 * cos(angle);\nreturn col;\n}\nreturn vec4(planeColor, 1.0);\n}",
    uniformValues: {
          "speed": 1.668,
          "waveFreq": 0.176,
          "zoom": 4.02,
          "planeColor": [
                0.0392156862745098,
                0.0392156862745098,
                0.043137254901960784
          ]
    }
  },
  {
    id: "timeline-0aa3d150-0f06-48dc-99a4-4ea4c7da8067",
    name: "Psych Wave Halo",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psych Wave Halo\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float waveSpacing; // @min 10.0 @max 150.0 @default 60.0\nuniform float waveSpeed; // @min 0.0 @max 100.0 @default 30.0\nuniform float invertThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float verticalWave; // @min 0.0 @max 1.0 @default 0.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float i) {\nreturn 0.5 + 0.5 * cos(6.28318 * (vec3(3.0, 2.0, 5.0) * i + vec3(0.0, 0.33, 0.67)));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 origSource = texture2D(tex, uv);\nfloat origMax = max(max(origSource.r, origSource.g), origSource.b);\nfloat origMin = min(min(origSource.r, origSource.g), origSource.b);\nfloat origChroma = origMax - origMin;\nfloat origHue = 0.0;\nif (origChroma > 0.0) {\nif (origMax == origSource.r) origHue = (origSource.g - origSource.b) / origChroma;\nelse if (origMax == origSource.g) origHue = 2.0 + (origSource.b - origSource.r) / origChroma;\nelse origHue = 4.0 + (origSource.r - origSource.g) / origChroma;\norigHue *= 60.0;\nif (origHue < 0.0) origHue += 360.0;\n}\nbool isBlueOrViolet = origChroma > 0.05 && origHue >= 200.0 && origHue <= 330.0;\nfloat localTime = isBlueOrViolet ? -time : time;\nvec2 centerUv = uv - 0.5;\nvec2 aspectUv = centerUv * vec2(resolution.x / resolution.y, 1.0);\nfloat dist = length(aspectUv);\nfloat waveDist = mix(dist, aspectUv.y, verticalWave);\nfloat phase = waveDist * waveSpacing - localTime * waveSpeed;\nfloat wave = sin(phase);\nvec2 warpDir = mix(centerUv, vec2(0.0, 1.0), verticalWave);\nvec2 warp = uv + warpDir * wave * 0.04 * intensity;\nvec4 source = texture2D(tex, warp);\nvec2 uv_c = centerUv * 2.0;\nuv_c.x *= resolution.x / resolution.y;\nfor(int i = 0; i < 5; i++) {\nuv_c = abs(uv_c) - 0.4;\nfloat a = localTime * 3.0 + length(uv_c) * 8.0;\nmat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\nuv_c *= rot;\nuv_c *= 1.6;\n}\nvec3 psychColor = palette(length(uv_c) - localTime * 5.0);\npsychColor = fract(psychColor * 2.5);\nfloat flash = abs(sin(localTime * 10.0));\npsychColor += vec3(flash, 0.0, 1.0 - flash) * step(0.95, fract(uv_c.x * 10.0));\nvec4 finalColor = mix(source, vec4(psychColor, 1.0), intensity);\nfloat waveIndex = floor(phase / 3.14159);\nif (mod(waveIndex, 2.0) != 0.0 && node_rand(uv + localTime) > invertThreshold) {\nfinalColor.rgb = 1.0 - finalColor.rgb;\n}\nfloat blackMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.001, origMax);\nreturn mix(origSource, finalColor, blackMask);\n}",
    uniformValues: {
          "intensity": 0.03,
          "waveSpacing": 38,
          "waveSpeed": 4,
          "invertThreshold": 0,
          "verticalWave": 1,
          "darkThreshold": 0.49
    }
  },
  {
    id: "timeline-3a1338dd-7a28-42de-91e0-c4f504c193d1",
    name: "Psychedelic 5-Color Pixels",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic 5-Color Pixels\nuniform float speed; // @min 0.1 @max 5.0 @default 2.0\nuniform float pixelSize; // @min 4.0 @max 64.0 @default 24.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 orig = texture2D(tex, uv);\nfloat lum = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\nvec2 gridUv = uv * resolution / pixelSize;\nvec2 cell = floor(gridUv);\nvec2 local = fract(gridUv);\nvec3 c1 = vec3(1.0, 0.1, 0.6);\nvec3 c2 = vec3(0.1, 0.9, 1.0);\nvec3 c3 = vec3(1.0, 0.9, 0.0);\nvec3 c4 = vec3(0.2, 1.0, 0.3);\nvec3 c5 = vec3(1.0, 0.4, 0.0);\nfloat t = time * speed + node_noise(cell * 0.2) * 10.0;\nfloat cycle = mod(t, 5.0);\nvec3 col = c1;\ncol = mix(col, c2, clamp(cycle, 0.0, 1.0));\ncol = mix(col, c3, clamp(cycle - 1.0, 0.0, 1.0));\ncol = mix(col, c4, clamp(cycle - 2.0, 0.0, 1.0));\ncol = mix(col, c5, clamp(cycle - 3.0, 0.0, 1.0));\ncol = mix(col, c1, clamp(cycle - 4.0, 0.0, 1.0));\nfloat noiseVal = node_noise(uv * 5.0 + time);\nfloat psych = sin(local.x * 20.0 + time * 5.0 + noiseVal * 6.28) * cos(local.y * 20.0 - time * 3.0);\nfloat whiteMask = smoothstep(0.5, 0.8, psych);\ncol = mix(col, vec3(1.0), whiteMask);\nfloat dist = length(local - 0.5);\nfloat circle = smoothstep(0.5, 0.4, dist);\nfloat activePixel = smoothstep(0.05, 0.15, lum);\nvec3 bgCol = orig.rgb * 0.15;\nvec3 finalCol = mix(bgCol, col, circle * activePixel);\nreturn vec4(finalCol, orig.a);\n}",
    uniformValues: {
          "speed": 4.51,
          "pixelSize": 18.4
    }
  },
  {
    id: "timeline-0f77abc0-5637-4f71-955a-94408586ece5",
    name: "Psychedelic Dual Center Edges Clean",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Dual Center Edges Clean\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float scale; // @min 1.0 @max 10.0 @default 3.0\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform float radialFreq; // @min 1.0 @max 30.0 @default 15.0\nuniform float symmFreq; // @min 1.0 @max 20.0 @default 6.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform bool mirrorX; // @default true\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float edgeThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform vec3 edgeColor; // @default 1.0,1.0,1.0\nuniform vec3 colorHigh; // @default 1.0,0.8,0.4\nuniform vec3 colorMid; // @default 0.2,0.6,0.8\nuniform vec3 colorLow; // @default 0.1,0.1,0.3\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 workUV = uv;\nfloat flip = 1.0;\nif (mirrorX && workUV.x > 0.5) {\nworkUV.x = 1.0 - workUV.x;\nflip = -1.0;\n}\nvec2 p = workUV * (scale * 5.0);\nfloat t = time * speed;\nvec2 q = vec2(0.0);\nq.x = sin(p.x + t) + cos(p.y * 1.2 - t);\nq.y = cos(p.x * 1.1 - t) + sin(p.y + t);\nvec2 r = vec2(0.0);\nr.x = sin(p.x + q.x * 2.0 + t * 1.5) + cos(p.y + q.y * 1.5 - t);\nr.y = cos(p.x + q.x * 1.5 - t * 1.2) + sin(p.y + q.y * 2.0 + t);\nr = r * 0.25 + 0.5;\nvec2 centerPos = vec2(centerX, centerY);\nvec2 center = workUV - centerPos;\nfloat dist = length(center);\nfloat angle = atan(center.y, center.x);\nfloat radial = sin(dist * scale * radialFreq - t * 4.0);\nvec2 radialOffset = center * radial * distortion * 1.5;\nfloat symm = cos(angle * symmFreq + dist * scale * 5.0 + t * 3.0);\nvec2 symmOffset = vec2(cos(angle), sin(angle)) * symm * distortion * 0.8;\nvec2 psychP = vec2(angle * 4.0, dist * scale * 8.0);\nfloat psychNoise = sin(psychP.x + t * 2.0) * cos(psychP.y - t * 1.5);\nvec2 psychOffset = vec2(cos(psychNoise * 6.28318), sin(psychNoise * 6.28318)) * distortion * psychIntensity;\nvec2 finalOffset = (r - 0.5) * distortion + radialOffset + symmOffset + psychOffset;\nfinalOffset.x *= flip;\nvec2 offsetUV = uv + finalOffset;\nvec4 color = texture2D(tex, offsetUV);\nvec2 texel = 1.0 / resolution;\nfloat l0 = dot(color.rgb, vec3(0.299, 0.587, 0.114));\nfloat l1 = dot(texture2D(tex, offsetUV + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\nfloat l2 = dot(texture2D(tex, offsetUV + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));\nfloat edgeRaw = length(vec2(l1 - l0, l2 - l0));\nfloat edge = smoothstep(edgeThreshold * 0.2, edgeThreshold * 0.2 + 0.05, edgeRaw) * edgeIntensity;\nfloat notDark = smoothstep(0.15, 0.25, l0);\nedge *= notDark;\nfloat shade = (r.x - r.y) * 0.5 + 0.5;\nvec3 grad = mix(colorLow, colorMid, smoothstep(0.0, 0.5, shade));\ngrad = mix(grad, colorHigh, smoothstep(0.5, 1.0, shade));\nvec3 psychColor = vec3(\nsin(psychNoise * 3.14159 + t) * 0.5 + 0.5,\ncos(psychNoise * 3.14159 + t * 1.2) * 0.5 + 0.5,\nsin(psychNoise * 3.14159 - t * 0.8) * 0.5 + 0.5\n);\ngrad = mix(grad, psychColor, (0.3 + 0.2 * radial) * psychIntensity);\ngrad += vec3(symm * 0.15);\ncolor.rgb = mix(color.rgb, color.rgb * grad * 2.0, 0.85);\ncolor.rgb = mix(color.rgb, edgeColor, clamp(edge, 0.0, 1.0));\nreturn color;\n}",
    uniformValues: {
          "speed": 0.36,
          "distortion": 0.002,
          "scale": 1.81,
          "centerX": 0.42,
          "centerY": 0.44,
          "radialFreq": 15,
          "symmFreq": 18.29,
          "psychIntensity": 0.8,
          "mirrorX": true,
          "edgeIntensity": 4.5,
          "edgeThreshold": 0.07,
          "edgeColor": [
                0.30196078431372547,
                0.29411764705882354,
                0.0784313725490196
          ],
          "colorHigh": [
                0.9529411764705882,
                0.5058823529411764,
                0.6627450980392157
          ],
          "colorMid": [
                0.13333333333333333,
                0.0784313725490196,
                0.2627450980392157
          ],
          "colorLow": [
                0.9568627450980393,
                0.9568627450980393,
                0.9803921568627451
          ]
    }
  },
  {
    id: "timeline-a2b37be4-859c-457d-918c-abeeb94bb7bc",
    name: "Psychedelic Dual Center Edges Clean",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Dual Center Edges Clean\nuniform float speed; // @min 0.0 @max 2.0 @default 0.5\nuniform float distortion; // @min 0.0 @max 0.2 @default 0.05\nuniform float scale; // @min 1.0 @max 10.0 @default 3.0\nuniform float centerX; // @min 0.0 @max 1.0 @default 0.25\nuniform float centerY; // @min 0.0 @max 1.0 @default 0.5\nuniform float radialFreq; // @min 1.0 @max 30.0 @default 15.0\nuniform float symmFreq; // @min 1.0 @max 20.0 @default 6.0\nuniform float psychIntensity; // @min 0.0 @max 1.0 @default 0.8\nuniform bool mirrorX; // @default true\nuniform float edgeIntensity; // @min 0.0 @max 5.0 @default 2.0\nuniform float edgeThreshold; // @min 0.0 @max 1.0 @default 0.1\nuniform vec3 edgeColor; // @default 1.0,1.0,1.0\nuniform vec3 colorHigh; // @default 1.0,0.8,0.4\nuniform vec3 colorMid; // @default 0.2,0.6,0.8\nuniform vec3 colorLow; // @default 0.1,0.1,0.3\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 workUV = uv;\nfloat flip = 1.0;\nif (mirrorX && workUV.x > 0.5) {\nworkUV.x = 1.0 - workUV.x;\nflip = -1.0;\n}\nvec2 p = workUV * (scale * 5.0);\nfloat t = time * speed;\nvec2 q = vec2(0.0);\nq.x = sin(p.x + t) + cos(p.y * 1.2 - t);\nq.y = cos(p.x * 1.1 - t) + sin(p.y + t);\nvec2 r = vec2(0.0);\nr.x = sin(p.x + q.x * 2.0 + t * 1.5) + cos(p.y + q.y * 1.5 - t);\nr.y = cos(p.x + q.x * 1.5 - t * 1.2) + sin(p.y + q.y * 2.0 + t);\nr = r * 0.25 + 0.5;\nvec2 centerPos = vec2(centerX, centerY);\nvec2 center = workUV - centerPos;\nfloat dist = length(center);\nfloat angle = atan(center.y, center.x);\nfloat radial = sin(dist * scale * radialFreq - t * 4.0);\nvec2 radialOffset = center * radial * distortion * 1.5;\nfloat symm = cos(angle * symmFreq + dist * scale * 5.0 + t * 3.0);\nvec2 symmOffset = vec2(cos(angle), sin(angle)) * symm * distortion * 0.8;\nvec2 psychP = vec2(angle * 4.0, dist * scale * 8.0);\nfloat psychNoise = sin(psychP.x + t * 2.0) * cos(psychP.y - t * 1.5);\nvec2 psychOffset = vec2(cos(psychNoise * 6.28318), sin(psychNoise * 6.28318)) * distortion * psychIntensity;\nvec2 finalOffset = (r - 0.5) * distortion + radialOffset + symmOffset + psychOffset;\nfinalOffset.x *= flip;\nvec2 offsetUV = uv + finalOffset;\nvec4 color = texture2D(tex, offsetUV);\nvec2 texel = 1.0 / resolution;\nfloat l0 = dot(color.rgb, vec3(0.299, 0.587, 0.114));\nfloat l1 = dot(texture2D(tex, offsetUV + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));\nfloat l2 = dot(texture2D(tex, offsetUV + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));\nfloat edgeRaw = length(vec2(l1 - l0, l2 - l0));\nfloat edge = smoothstep(edgeThreshold * 0.2, edgeThreshold * 0.2 + 0.05, edgeRaw) * edgeIntensity;\nfloat notDark = smoothstep(0.15, 0.25, l0);\nedge *= notDark;\nfloat shade = (r.x - r.y) * 0.5 + 0.5;\nvec3 grad = mix(colorLow, colorMid, smoothstep(0.0, 0.5, shade));\ngrad = mix(grad, colorHigh, smoothstep(0.5, 1.0, shade));\nvec3 psychColor = vec3(\nsin(psychNoise * 3.14159 + t) * 0.5 + 0.5,\ncos(psychNoise * 3.14159 + t * 1.2) * 0.5 + 0.5,\nsin(psychNoise * 3.14159 - t * 0.8) * 0.5 + 0.5\n);\ngrad = mix(grad, psychColor, (0.3 + 0.2 * radial) * psychIntensity);\ngrad += vec3(symm * 0.15);\ncolor.rgb = mix(color.rgb, color.rgb * grad * 2.0, 0.85);\ncolor.rgb = mix(color.rgb, edgeColor, clamp(edge, 0.0, 1.0));\nreturn color;\n}",
    uniformValues: {
          "speed": 0.36,
          "distortion": 0.002,
          "scale": 1.81,
          "centerX": 0.42,
          "centerY": 0.44,
          "radialFreq": 15,
          "symmFreq": 18.29,
          "psychIntensity": 0.8,
          "mirrorX": true,
          "edgeIntensity": 4.5,
          "edgeThreshold": 0.46,
          "edgeColor": [
                0.1568627450980392,
                0.03529411764705882,
                0.00392156862745098
          ],
          "colorHigh": [
                0.1450980392156863,
                0.07450980392156863,
                0.09803921568627451
          ],
          "colorMid": [
                0.2823529411764706,
                0.27058823529411763,
                0.40784313725490196
          ],
          "colorLow": [
                0.9568627450980393,
                0.9568627450980393,
                0.9803921568627451
          ]
    }
  },
  {
    id: "timeline-dde8823e-5cc2-46a2-ba26-1e55c3b88e08",
    name: "Psychedelic Edge Drive",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Edge Drive\nuniform float dark_distance; // @min 0.0 @max 10.0 @default 2.0\nuniform float colorrangeeffect; // @min 0.0 @max 1.0 @default 0.5\nuniform float fold_symmetry; // @min 3.0 @max 12.0 @default 8.0\nuniform float distortion_4d; // @min 0.0 @max 5.0 @default 1.5\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float psych_intensity; // @min 0.0 @max 5.0 @default 2.0\n#define PI 3.141592654\nmat2 rot(float x) {\nreturn mat2(cos(x), sin(x), -sin(x), cos(x));\n}\nvec2 foldRotate(in vec2 p, in float s) {\nfloat a = PI / s - atan(p.x, p.y);\nfloat n = PI * 2.0 / s;\nreturn p * rot(floor(a / n) * n);\n}\nfloat tex_func(vec2 p, float z, float t, float sym, float dist) {\np = foldRotate(p, sym);\np *= rot(length(p) * dist * 0.05 + t * 0.3);\nvec2 q = (fract(p / 10.0) - 0.5) * 10.0;\nfor (int i = 0; i < 2; ++i) {\nq = abs(q) - 0.25;\nq *= rot(PI * 0.25 + dist * 0.15 * sin(t * 0.8 + length(q)));\nq = abs(q) - vec2(1.0, 1.5);\nq *= rot(PI * 0.25 * z);\nq = foldRotate(q, 3.0);\n}\nvec2 d = abs(q) - vec2(1.0);\nfloat sd = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\nreturn smoothstep(0.9, 1.0, 1.0 / (1.0 + abs(sd)));\n}\nvec3 hueShift(vec3 color, float hue) {\nconst vec3 k = vec3(0.57735, 0.57735, 0.57735);\nfloat cosAngle = cos(hue);\nreturn vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 texel = dark_distance / resolution;\nfloat color_diff = 0.0;\nfloat min_lum = 1.0;\nfor(int x = -1; x <= 1; x+=2) {\nfor(int y = -1; y <= 1; y+=2) {\nvec4 s = texture2D(tex, uv + vec2(float(x), float(y)) * texel);\ncolor_diff += length(s.rgb - source.rgb);\nfloat lum = dot(s.rgb, vec3(0.299, 0.587, 0.114)) * s.a;\nmin_lum = min(min_lum, lum);\n}\n}\ncolor_diff /= 4.0;\nfloat mask = smoothstep(0.1, 0.9, min_lum);\nvec2 p_uv = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0) * 2.0;\np_uv += vec2(sin(time * 2.0 + p_uv.y * 5.0), cos(time * 2.0 + p_uv.x * 5.0)) * color_diff * psych_intensity * 0.5;\nfloat INTERVAL = 3.0;\nfloat t_scaled = time * speed;\nvec3 c1 = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.3, 0.3), colorrangeeffect);\nvec3 c2 = mix(vec3(0.7, 0.5, 1.0), vec3(0.3, 1.0, 0.3), colorrangeeffect);\nvec3 col = vec3(0.0);\nif (mask > 0.0) {\nfor(int i = 0; i < 4; i++) {\nfloat ii = float(4 - i);\nfloat t2 = ii * INTERVAL - mod(t_scaled + INTERVAL * 0.5, INTERVAL);\ncol = mix(col, vec3((12.0 - t2) / 12.0) * c1 * 1.3, tex_func(p_uv * max(0.0, t2), 4.45, t_scaled, fold_symmetry, distortion_4d));\nfloat t4 = ii * INTERVAL - mod(t_scaled, INTERVAL);\ncol = mix(col, vec3((12.0 - t4) / 12.0) * c2 * 1.3, tex_func(p_uv * max(0.0, t4), 4.45, t_scaled, fold_symmetry, distortion_4d));\n}\n}\nvec4 final_col = mix(vec4(0.0, 0.0, 0.0, source.a), vec4(col, source.a), mask);\nvec3 psych_edge = hueShift(source.rgb, time * 5.0 + color_diff * 15.0);\nfinal_col.rgb = mix(final_col.rgb, psych_edge, smoothstep(0.05, 0.4, color_diff) * clamp(psych_intensity, 0.0, 1.0));\nreturn final_col;\n}",
    uniformValues: {
          "dark_distance": 2,
          "colorrangeeffect": 0.5,
          "fold_symmetry": 8,
          "distortion_4d": 1.5,
          "speed": 1,
          "psych_intensity": 2
    }
  },
  {
    id: "timeline-1067a459-168f-4b1b-8b52-6fd73a440d9a",
    name: "Psychedelic Snakes with Blob",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(texture2D(tex, uv).rgb, lw);\nvec2 eps = vec2(3.0) / res;\nfloat lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat iso = fract(lum * lc - t * ls);\nfloat soft = lt * ps * 1.5;\nfloat line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\nline *= smoothstep(0.001, 0.02, length(grad));\nfloat snake = sin(angle * st * 2.0 + t * ss);\nreturn line * smoothstep(-1.2 * ps, 1.2, snake);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\nfloat m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec2 eps = vec2(4.0) / resolution;\nfloat mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nfloat my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\nvec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\nfloat diff = max(dot(n, lightDir), 0.0);\nfloat diffSoft = diff * 0.6 + 0.4;\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\nvec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\nvec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(source.rgb, lw);\nvec2 epsGrad = vec2(3.0) / resolution;\nfloat lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\nfloat n1 = node_noise(uv * psychedelicScale + time);\nfloat n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\nfloat r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\nvec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\nvec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\nvec3 mixedColor = mix(bg, finalColor, m0);\nvec2 centered = uv - 0.5;\nvec2 symUv = abs(centered);\nfloat blobNoise = node_noise(symUv * 5.0 - time * 0.3);\nfloat dist = length(centered) + blobNoise * 0.4;\nfloat blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\nmixedColor = mix(mixedColor, vec3(0.0), blobMask);\nfloat affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\nmixedColor = mix(source.rgb, mixedColor, affectMask);\nreturn vec4(mixedColor, source.a);\n}",
    uniformValues: {
          "linesCount": 28.93,
          "snakeSpeed": 10,
          "snakeTiling": 1,
          "lineThickness": 0.2305,
          "zoneThreshold": 0.95,
          "minZoneThreshold": 0.64,
          "loopSpeed": 4.1,
          "pixelSoftness": 1.6844,
          "colorSpeed": 8.3,
          "psychedelicScale": 4.23,
          "showBackground": true,
          "blobSize": 0.1,
          "blobBlur": 0.708,
          "darkThreshold": 0.28
    }
  },
  {
    id: "timeline-31fca10c-9c6b-448d-8047-39be703dbe6a",
    name: "Psychedelic Snakes with Blob",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(texture2D(tex, uv).rgb, lw);\nvec2 eps = vec2(3.0) / res;\nfloat lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat iso = fract(lum * lc - t * ls);\nfloat soft = lt * ps * 1.5;\nfloat line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\nline *= smoothstep(0.001, 0.02, length(grad));\nfloat snake = sin(angle * st * 2.0 + t * ss);\nreturn line * smoothstep(-1.2 * ps, 1.2, snake);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\nfloat m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec2 eps = vec2(4.0) / resolution;\nfloat mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nfloat my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\nvec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\nfloat diff = max(dot(n, lightDir), 0.0);\nfloat diffSoft = diff * 0.6 + 0.4;\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\nvec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\nvec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(source.rgb, lw);\nvec2 epsGrad = vec2(3.0) / resolution;\nfloat lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\nfloat n1 = node_noise(uv * psychedelicScale + time);\nfloat n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\nfloat r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\nvec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\nvec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\nvec3 mixedColor = mix(bg, finalColor, m0);\nvec2 centered = uv - 0.5;\nvec2 symUv = abs(centered);\nfloat blobNoise = node_noise(symUv * 5.0 - time * 0.3);\nfloat dist = length(centered) + blobNoise * 0.4;\nfloat blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\nmixedColor = mix(mixedColor, vec3(0.0), blobMask);\nfloat affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\nmixedColor = mix(source.rgb, mixedColor, affectMask);\nreturn vec4(mixedColor, source.a);\n}",
    uniformValues: {
          "linesCount": 4.43,
          "snakeSpeed": -5.8,
          "snakeTiling": 9.55,
          "lineThickness": 0.0492,
          "zoneThreshold": 0.24,
          "minZoneThreshold": 0.29,
          "loopSpeed": -0.5,
          "pixelSoftness": 1.6844,
          "colorSpeed": 3.8,
          "psychedelicScale": 4.23,
          "showBackground": false,
          "blobSize": 0.1,
          "blobBlur": 0.708,
          "darkThreshold": 0.28
    }
  },
  {
    id: "timeline-4742f4ce-1a77-4add-812c-759484511985",
    name: "Psychedelic Snakes with Blob",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(texture2D(tex, uv).rgb, lw);\nvec2 eps = vec2(3.0) / res;\nfloat lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat iso = fract(lum * lc - t * ls);\nfloat soft = lt * ps * 1.5;\nfloat line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\nline *= smoothstep(0.001, 0.02, length(grad));\nfloat snake = sin(angle * st * 2.0 + t * ss);\nreturn line * smoothstep(-1.2 * ps, 1.2, snake);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\nfloat m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec2 eps = vec2(4.0) / resolution;\nfloat mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nfloat my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\nvec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\nfloat diff = max(dot(n, lightDir), 0.0);\nfloat diffSoft = diff * 0.6 + 0.4;\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\nvec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\nvec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(source.rgb, lw);\nvec2 epsGrad = vec2(3.0) / resolution;\nfloat lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\nfloat n1 = node_noise(uv * psychedelicScale + time);\nfloat n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\nfloat r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\nvec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\nvec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\nvec3 mixedColor = mix(bg, finalColor, m0);\nvec2 centered = uv - 0.5;\nvec2 symUv = abs(centered);\nfloat blobNoise = node_noise(symUv * 5.0 - time * 0.3);\nfloat dist = length(centered) + blobNoise * 0.4;\nfloat blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\nmixedColor = mix(mixedColor, vec3(0.0), blobMask);\nfloat affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\nmixedColor = mix(source.rgb, mixedColor, affectMask);\nreturn vec4(mixedColor, source.a);\n}",
    uniformValues: {
          "linesCount": 2.47,
          "snakeSpeed": -7.2,
          "snakeTiling": 1,
          "lineThickness": 0.2648,
          "zoneThreshold": 0.06,
          "minZoneThreshold": 0.28,
          "loopSpeed": -0.5,
          "pixelSoftness": 1.0266,
          "colorSpeed": 3.8,
          "psychedelicScale": 1.76,
          "showBackground": true,
          "blobSize": 0.1,
          "blobBlur": 2,
          "darkThreshold": 0.2
    }
  },
  {
    id: "timeline-f8a9f14f-b323-43e4-ba64-adc5945df6d3",
    name: "Psychedelic Snakes with Blob",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psychedelic Snakes with Blob\nuniform float linesCount; // @min 1.0 @max 50.0 @default 15.0\nuniform float snakeSpeed; // @min -10.0 @max 10.0 @default 5.0\nuniform float snakeTiling; // @min 1.0 @max 20.0 @default 3.0\nuniform float lineThickness; // @min 0.01 @max 0.5 @default 0.15\nuniform float zoneThreshold; // @min 0.0 @max 1.0 @default 0.8\nuniform float minZoneThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float loopSpeed; // @min -5.0 @max 5.0 @default 1.0\nuniform float pixelSoftness; // @min 0.01 @max 3.0 @default 1.8\nuniform float colorSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform float psychedelicScale; // @min 1.0 @max 20.0 @default 5.0\nuniform bool showBackground; // @default true\nuniform float blobSize; // @min 0.1 @max 2.0 @default 0.6\nuniform float blobBlur; // @min 0.1 @max 2.0 @default 0.8\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nfloat getMask(sampler2D tex, vec2 uv, vec2 res, float t, float lc, float lt, float ps, float zt, float st, float ss, float ls) {\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(texture2D(tex, uv).rgb, lw);\nvec2 eps = vec2(3.0) / res;\nfloat lumX = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat iso = fract(lum * lc - t * ls);\nfloat soft = lt * ps * 1.5;\nfloat line = smoothstep(zt - soft, zt, iso) - smoothstep(zt, zt + soft, iso);\nline *= smoothstep(0.001, 0.02, length(grad));\nfloat snake = sin(angle * st * 2.0 + t * ss);\nreturn line * smoothstep(-1.2 * ps, 1.2, snake);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat currentZT = mix(minZoneThreshold, zoneThreshold, sin(time * loopSpeed) * 0.5 + 0.5);\nfloat m0 = getMask(tex, uv, resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec2 eps = vec2(4.0) / resolution;\nfloat mx = getMask(tex, uv + vec2(eps.x, 0.0), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nfloat my = getMask(tex, uv + vec2(0.0, eps.y), resolution, time, linesCount, lineThickness, pixelSoftness, currentZT, snakeTiling, snakeSpeed, loopSpeed);\nvec3 n = normalize(vec3(m0 - mx, m0 - my, 0.25));\nvec3 lightDir = normalize(vec3(0.8, 0.8, 1.0));\nfloat diff = max(dot(n, lightDir), 0.0);\nfloat diffSoft = diff * 0.6 + 0.4;\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(n, halfDir), 0.0), 12.0) * m0 * 0.6;\nfloat fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5) * m0;\nvec3 darkGradient = vec3(0.02, 0.04, 0.08) * (1.5 - length(uv - 0.5) * 1.5);\nvec3 bg = showBackground ? mix(source.rgb * 0.3, darkGradient, 0.5) : darkGradient;\nvec3 lw = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(source.rgb, lw);\nvec2 epsGrad = vec2(3.0) / resolution;\nfloat lumX = dot(texture2D(tex, uv + vec2(epsGrad.x, 0.0)).rgb, lw);\nfloat lumY = dot(texture2D(tex, uv + vec2(0.0, epsGrad.y)).rgb, lw);\nvec2 grad = vec2(lumX - lum, lumY - lum);\nfloat angle = atan(grad.y, grad.x + 0.0001);\nfloat phase = angle * snakeTiling * 2.0 + time * snakeSpeed;\nfloat n1 = node_noise(uv * psychedelicScale + time);\nfloat n2 = node_noise(uv * psychedelicScale * 2.0 - time * 0.5 + n1 * 3.0);\nfloat r1 = node_rand(floor(uv * psychedelicScale * 5.0) + time * 0.1);\nvec3 trailColor = 0.5 + 0.5 * cos(phase * 0.5 - time * colorSpeed + n2 * 6.28 + vec3(0.0, 2.1, 4.2) + r1 * 1.5);\nvec3 finalColor = trailColor * diffSoft + spec + fresnel * vec3(0.8, 0.9, 1.0);\nvec3 mixedColor = mix(bg, finalColor, m0);\nvec2 centered = uv - 0.5;\nvec2 symUv = abs(centered);\nfloat blobNoise = node_noise(symUv * 5.0 - time * 0.3);\nfloat dist = length(centered) + blobNoise * 0.4;\nfloat blobMask = smoothstep(blobSize, blobSize - blobBlur, dist);\nmixedColor = mix(mixedColor, vec3(0.0), blobMask);\nfloat affectMask = smoothstep(max(0.0, darkThreshold - 0.05), darkThreshold + 0.05, lum);\nmixedColor = mix(source.rgb, mixedColor, affectMask);\nreturn vec4(mixedColor, source.a);\n}",
    uniformValues: {
          "linesCount": 21.58,
          "snakeSpeed": 6.2,
          "snakeTiling": 1,
          "lineThickness": 0.5,
          "zoneThreshold": 0.13,
          "minZoneThreshold": 0.02,
          "loopSpeed": -4.9,
          "pixelSoftness": 0.8771,
          "colorSpeed": 7.7,
          "psychedelicScale": 19.05,
          "showBackground": false,
          "blobSize": 0.1,
          "blobBlur": 2,
          "darkThreshold": 0.08
    }
  },
  {
    id: "timeline-2fa29048-9151-432e-92bc-9a2e7700228f",
    name: "Psytrance Border Snake 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psytrance Border Snake 3D\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nuniform float snake_speed; // @min 0.0 @max 20.0 @default 8.0\nuniform float snake_brightness; // @min 0.0 @max 10.0 @default 4.0\nuniform bool symmetrical; // @default false\nuniform float depth_level; // @min 0.0 @max 10.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = (r - l) * depth_level;\nfloat dy = (d - u) * depth_level;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nfloat angle = atan(dy, dx);\nfloat snake_val = sin(angle + lum * 20.0 - time * snake_speed);\nif (symmetrical) {\nfloat snake_val2 = sin(-angle + lum * 20.0 - time * snake_speed);\nsnake_val = max(snake_val, snake_val2);\n}\nfloat snake_mask = smoothstep(0.7, 0.95, snake_val);\nvec3 snakeColor = vec3(1.0) * edge * snake_mask * snake_brightness;\nvec3 finalColor = (psyColor * edge * current_edge_boost + snakeColor) * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 0.25,
          "edge_boost": 0.7,
          "color_speed": 0.5,
          "loop_speed": 1.913,
          "pulse_amount": 0.1,
          "hue_shift": 2.1,
          "num_waves": 17.15,
          "black_tolerance": 0.05,
          "black_spread": 9.9,
          "snake_speed": 19.2,
          "snake_brightness": 7.5,
          "symmetrical": true,
          "depth_level": 6.9
    }
  },
  {
    id: "timeline-4265ae1b-795d-48d9-a18f-266b1925bc32",
    name: "Psytrance Border Snake 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Psytrance Border Snake 3D\nuniform float intensity; // @min 0.0 @max 5.0 @default 1.5\nuniform float edge_boost; // @min 0.0 @max 10.0 @default 4.0\nuniform float color_speed; // @min 0.0 @max 5.0 @default 2.0\nuniform float loop_speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float pulse_amount; // @min 0.0 @max 2.0 @default 0.5\nuniform float hue_shift; // @min 0.0 @max 10.0 @default 3.0\nuniform float num_waves; // @min 1.0 @max 20.0 @default 3.0\nuniform float black_tolerance; // @min 0.0 @max 0.5 @default 0.05\nuniform float black_spread; // @min 0.0 @max 10.0 @default 2.0\nuniform float snake_speed; // @min 0.0 @max 20.0 @default 8.0\nuniform float snake_brightness; // @min 0.0 @max 10.0 @default 4.0\nuniform bool symmetrical; // @default false\nuniform float depth_level; // @min 0.0 @max 10.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = 1.0 / resolution;\nfloat loop_var = sin(time * loop_speed * 3.14159265);\nfloat loop_norm = loop_var * 0.5 + 0.5;\nfloat current_edge_boost = edge_boost * (1.0 + loop_norm * pulse_amount);\nvec4 center = texture2D(tex, uv);\nvec3 luma_weights = vec3(0.299, 0.587, 0.114);\nfloat lum = dot(center.rgb, luma_weights);\nfloat l = dot(texture2D(tex, uv - vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat r = dot(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb, vec3(0.333));\nfloat u = dot(texture2D(tex, uv - vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat d = dot(texture2D(tex, uv + vec2(0.0, texel.y)).rgb, vec3(0.333));\nfloat dx = (r - l) * depth_level;\nfloat dy = (d - u) * depth_level;\nfloat edge = length(vec2(dx, dy));\nfloat lum_l = dot(texture2D(tex, uv - vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_r = dot(texture2D(tex, uv + vec2(texel.x * black_spread, 0.0)).rgb, luma_weights);\nfloat lum_u = dot(texture2D(tex, uv - vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat lum_d = dot(texture2D(tex, uv + vec2(0.0, texel.y * black_spread)).rgb, luma_weights);\nfloat min_lum = min(lum, min(min(lum_l, lum_r), min(lum_u, lum_d)));\nvec3 phase = num_waves * (lum * 10.0 + uv.xyx * hue_shift);\nvec3 psyColor = 0.5 + 0.5 * cos(phase + time * color_speed + vec3(0.0, 2.0, 4.0) + loop_var);\nfloat mask = smoothstep(black_tolerance, black_tolerance + 0.05, min_lum);\nfloat angle = atan(dy, dx);\nfloat snake_val = sin(angle + lum * 20.0 - time * snake_speed);\nif (symmetrical) {\nfloat snake_val2 = sin(-angle + lum * 20.0 - time * snake_speed);\nsnake_val = max(snake_val, snake_val2);\n}\nfloat snake_mask = smoothstep(0.7, 0.95, snake_val);\nvec3 snakeColor = vec3(1.0) * edge * snake_mask * snake_brightness;\nvec3 finalColor = (psyColor * edge * current_edge_boost + snakeColor) * mask * intensity;\nreturn vec4(finalColor, center.a * mask);\n}",
    uniformValues: {
          "intensity": 0.8,
          "edge_boost": 0,
          "color_speed": 0,
          "loop_speed": 0.1,
          "pulse_amount": 0,
          "hue_shift": 0.2,
          "num_waves": 1.95,
          "black_tolerance": 0.085,
          "black_spread": 1.4,
          "snake_speed": 5.8,
          "snake_brightness": 10,
          "symmetrical": false,
          "depth_level": 1
    }
  },
  {
    id: "timeline-84d79e70-d838-435c-85ed-2928ed034b6b",
    name: "Radial Delayed Soft Edge Blur",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Radial Delayed Soft Edge Blur\nuniform float speed; // @min -10.0 @max 10.0 @default 5.0\nuniform float lineLength; // @min 1.0 @max 10.0 @default 1.0\nuniform float delay; // @min 0.0 @max 5.0 @default 2.0\nuniform float distOffset; // @min 0.0 @max 20.0 @default 10.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nfloat blob = node_noise(uv * 5.0);\nfloat localTime = time;\nif (blob > 0.0) {\nlocalTime = time - delay;\n}\nvec2 off = 1.0 / resolution;\nfloat t00 = texture2D(tex, uv + vec2(-off.x, -off.y)).r;\nfloat t10 = texture2D(tex, uv + vec2( 0.0, -off.y)).r;\nfloat t20 = texture2D(tex, uv + vec2( off.x, -off.y)).r;\nfloat t01 = texture2D(tex, uv + vec2(-off.x, 0.0)).r;\nfloat t21 = texture2D(tex, uv + vec2( off.x, 0.0)).r;\nfloat t02 = texture2D(tex, uv + vec2(-off.x, off.y)).r;\nfloat t12 = texture2D(tex, uv + vec2( 0.0, off.y)).r;\nfloat t22 = texture2D(tex, uv + vec2( off.x, off.y)).r;\nfloat gx = (t00 + 2.0 * t01 + t02) - (t20 + 2.0 * t21 + t22);\nfloat gy = (t00 + 2.0 * t10 + t20) - (t02 + 2.0 * t12 + t22);\nfloat edge = sqrt(gx * gx + gy * gy);\nfloat angle = atan(gy, gx);\nfloat dist = distance(uv, vec2(0.5));\nfloat segment = sin(angle * lineLength + localTime * speed - dist * distOffset);\nsegment = smoothstep(0.7, 0.95, segment);\nvec3 softLight = baseColor.rgb * 0.4;\nvec3 highlight = baseColor.rgb * edge * segment * 2.0;\nvec3 finalColor = softLight + highlight;\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": -3.6,
          "lineLength": 4.78,
          "delay": 1.7,
          "distOffset": 19.8
    }
  },
  {
    id: "timeline-3c19df3f-b9af-42bd-bdbf-05ddfb8c0bdc",
    name: "Realistic 3D Luma Lights",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Realistic 3D Luma Lights\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nfloat getLum(sampler2D tex, vec2 uv) {\nreturn dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = getLum(tex, uv);\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\nfor(int i = 0; i < 3; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * movement_form);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nreturn n / sumAmp;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.05);\nvec3 totalDiffuse = vec3(ambient);\nvec3 totalSpecular = vec3(0.0);\nfor(int i = 0; i < 3; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 0.3 + fi * 2.1),\n0.5 + 0.8 * cos(time * 0.4 + fi * 1.7),\n0.2 + 0.3 * sin(time * 0.5 + fi * 0.8)\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 1.3),\n0.5 + 0.5 * sin(fi * 2.4 + 2.0),\n0.5 + 0.5 * sin(fi * 3.1 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 5.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), 1.0 / roughness);\ntotalDiffuse += diff * lCol * atten;\ntotalSpecular += spec * lCol * atten;\n}\nvec3 finalColor = mix(source.rgb, source.rgb * totalDiffuse + totalSpecular, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 1.144,
          "scale": 2.54,
          "depth": -1.2,
          "movement_form": 4.7,
          "threshold": 0.135,
          "roughness": 0.3187,
          "ambient": 0.07
    }
  },
  {
    id: "timeline-61ec0631-02ec-4ddc-9ea5-7125b7507b9d",
    name: "Relief Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Relief Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float distortion; // @min 0.0 @max 0.1 @default 0.02\nuniform float heightScale; // @min 1.0 @max 20.0 @default 10.0\nuniform vec3 lightColor; // @default 0.85,0.80,0.70\nuniform float animSpeed; // @min 0.0 @max 10.0 @default 2.0\nfloat getHeight(sampler2D tex, vec2 uv) {\nvec4 c = texture2D(tex, uv);\nreturn dot(c.rgb, vec3(0.299, 0.587, 0.114));\n}\nvec3 getNormal(sampler2D tex, vec2 uv, vec2 res, float hScale) {\nvec2 e = vec2(1.0 / res.x, 1.0 / res.y);\nfloat hx = getHeight(tex, uv + vec2(e.x, 0.0)) - getHeight(tex, uv - vec2(e.x, 0.0));\nfloat hy = getHeight(tex, uv + vec2(0.0, e.y)) - getHeight(tex, uv - vec2(0.0, e.y));\nreturn normalize(vec3(-hx * hScale, -hy * hScale, 1.0));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec3 nor = getNormal(tex, uv, resolution, heightScale);\nvec2 distUv = uv + nor.xy * distortion * sin(time * animSpeed);\nvec2 p = distUv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity) * 0.5 + 0.5;\nvec3 color = mix(blobColor, branchColor, branch) * topo;\nvec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));\nfloat diff = max(dot(nor, lightDir), 0.0);\ncolor += lightColor * diff * 0.5;\nreturn mix(source, vec4(color, source.a), mask);\n}",
    uniformValues: {
          "speed": 0.8,
          "scale": 6.14,
          "threshold": 0.15,
          "lineDensity": 20,
          "blobColor": [
                0.803921568627451,
                0.8352941176470589,
                0.8196078431372549
          ],
          "branchColor": [
                0.403921568627451,
                0.3607843137254902,
                0.23529411764705882
          ],
          "distortion": 0.016,
          "heightScale": 20,
          "lightColor": [
                0.85,
                0.8,
                0.7
          ],
          "animSpeed": 10
    }
  },
  {
    id: "timeline-a324ce5d-f56c-4587-9a08-8d2b85db68fd",
    name: "Round Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Round Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float pixelSize; // @min 8.0 @max 64.0 @default 24.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 orig = texture2D(tex, uv);\nfloat lum = dot(orig.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum) * orig.a;\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nvec2 gridUv = (uv + branch * 0.05) * resolution / pixelSize;\nvec2 cell = floor(gridUv);\nvec2 local = fract(gridUv);\nfloat colRand = node_rand(vec2(cell.x, 1.0));\nfloat fallOffset = time * speed * 2.0 * (0.5 + colRand * 1.5) + branch * 5.0;\nfloat row = floor(gridUv.y - fallOffset);\nfloat blockRand = node_rand(vec2(cell.x, row));\nfloat activeBlock = step(0.4, blockRand) * mask;\nfloat dist = length(local - 0.5);\nfloat circle = smoothstep(0.5, 0.4, dist);\nfloat colorMix = sin(time * 2.0 + branch * 6.28) * 0.5 + 0.5;\nvec3 timeColor = mix(blobColor, branchColor, colorMix);\nvec3 effectCol = timeColor * (0.7 + 0.3 * blockRand);\nvec3 bgCol = orig.rgb * 0.15;\nfloat shapeMask = activeBlock * circle;\nvec3 finalCol = mix(bgCol, effectCol, shapeMask);\nreturn vec4(finalCol, orig.a);\n}",
    uniformValues: {
          "speed": 2.855,
          "scale": 3.08,
          "threshold": 0.33,
          "pixelSize": 8,
          "blobColor": [
                0.10588235294117647,
                0.21176470588235294,
                0.10980392156862745
          ],
          "branchColor": [
                0.796078431372549,
                0.5411764705882353,
                0.30196078431372547
          ]
    }
  },
  {
    id: "timeline-9f5c563a-82c0-4e68-9964-08e154a6fb6e",
    name: "Rounded Pixel Swirl",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Rounded Pixel Swirl\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\nvec3 palette(float t){\nreturn vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat w = sin(speed * time + freq * r);\na += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\nreturn (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time, float b) {\nfloat r = length(p);\nvec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\nfloat m = smoothstep(0.8 + b, 0.8 - b, r);\nfloat stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\nreturn vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 grid = resolution / max(1.0, pixelSize);\nvec2 puv = (floor(uv * grid) + 0.5) / grid;\nvec2 local = (fract(uv * grid) - 0.5) * 2.0;\nfloat r_limit = 1.0 - spacing;\nvec2 d = abs(local) - (r_limit - roundness);\nfloat dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\nfloat mask = smoothstep(roundness, roundness - 0.05, dist);\nvec4 source = texture2D(tex, puv);\nvec2 p = (puv * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat t_r = time + source.r * colorShift;\nfloat t_g = time + source.g * colorShift;\nfloat t_b = time + source.b * colorShift;\np = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\np /= 8.0;\nfloat r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\nfor (int i = 0; i < 2; i++) {\nfloat fi = float(i);\nvec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\nfinalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, dot(source.rgb, vec3(0.299, 0.587, 0.114))));\nreturn vec4(blended * mask, source.a * mask);\n}",
    uniformValues: {
          "colorShift": 0.7,
          "intensity": 0.73,
          "blur": 0.04,
          "pixelSize": 11.78,
          "roundness": 0.22,
          "spacing": 0.08
    }
  },
  {
    id: "timeline-b64db472-5476-4824-80c6-8a6aaf12b775",
    name: "Rounded Pixel Swirl",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Rounded Pixel Swirl\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float t){\nreturn vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat w = sin(speed * time + freq * r);\na += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\nreturn (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time, float b) {\nfloat r = length(p);\nvec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\nfloat m = smoothstep(0.8 + b, 0.8 - b, r);\nfloat stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\nreturn vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 grid = resolution / max(1.0, pixelSize);\nvec2 puv = (floor(uv * grid) + 0.5) / grid;\nvec2 local = (fract(uv * grid) - 0.5) * 2.0;\nfloat r_limit = 1.0 - spacing;\nvec2 d = abs(local) - (r_limit - roundness);\nfloat dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\nfloat mask = smoothstep(roundness, roundness - 0.05, dist);\nvec4 source = texture2D(tex, puv);\nfloat brightness = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkMask = smoothstep(darkThreshold - 0.01, darkThreshold + 0.01, brightness);\nvec2 p = (puv * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat t_r = time + source.r * colorShift;\nfloat t_g = time + source.g * colorShift;\nfloat t_b = time + source.b * colorShift;\np = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\np /= 8.0;\nfloat r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\nfor (int i = 0; i < 2; i++) {\nfloat fi = float(i);\nvec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\nfinalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, brightness));\nreturn vec4(blended * mask * darkMask, source.a * mask * darkMask);\n}",
    uniformValues: {
          "colorShift": 2.2,
          "intensity": 0.99,
          "blur": 0.05,
          "pixelSize": 10.31,
          "roundness": 1,
          "spacing": 0.06,
          "darkThreshold": 0.13
    }
  },
  {
    id: "timeline-f21913b3-4831-4324-926a-76d3cc56aa77",
    name: "Rounded Pixel Swirl",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Rounded Pixel Swirl\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.9\nuniform float blur; // @min 0.0 @max 1.0 @default 0.5\nuniform float pixelSize; // @min 1.0 @max 50.0 @default 15.0\nuniform float roundness; // @min 0.0 @max 1.0 @default 0.4\nuniform float spacing; // @min 0.0 @max 0.5 @default 0.1\nvec3 palette(float t){\nreturn vec3(0.84, 0.49, 0.85) + vec3(0.52, 0.56, 0.88) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x);\nfloat w = sin(speed * time + freq * r);\na += strength * r * w + strength * r * sin(speed * time + freq * r + 3.0 * a);\nreturn (r + 0.06 * w) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time, float b) {\nfloat r = length(p);\nvec2 cuv = vec2(atan(p.y, p.x) / 6.28318 + 0.5, r / 0.8);\nfloat m = smoothstep(0.8 + b, 0.8 - b, r);\nfloat stripe = 0.05 / (pow(0.5 + 0.5 * sin(6.28318 * (cuv.x * 8.0 + time)), 2.0) + b * 0.5 + 0.05);\nreturn vec3(stripe) * palette(cuv.y * sin(time * 0.25) * 3.0 + level) * smoothstep(1.0, 0.4 - b * 0.2, cuv.y) * smoothstep(0.0, 0.4 + b * 0.2, cuv.y) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 grid = resolution / max(1.0, pixelSize);\nvec2 puv = (floor(uv * grid) + 0.5) / grid;\nvec2 local = (fract(uv * grid) - 0.5) * 2.0;\nfloat r_limit = 1.0 - spacing;\nvec2 d = abs(local) - (r_limit - roundness);\nfloat dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\nfloat mask = smoothstep(roundness, roundness - 0.05, dist);\nvec4 source = texture2D(tex, puv);\nvec2 p = (puv * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat t_r = time + source.r * colorShift;\nfloat t_g = time + source.g * colorShift;\nfloat t_b = time + source.b * colorShift;\np = swirl(p * (sin(time * 0.25) + 1.15), 0.15, 0.15, 0.1 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, t_g, blur);\np /= 8.0;\nfloat r_len = length(mat2(1.0, 0.3, -0.2, 1.0) * p);\nfor (int i = 0; i < 2; i++) {\nfloat fi = float(i);\nvec2 p_loop = abs(fract(p * 2.0) - 0.5) * 2.0;\nfinalCol += makeFlower(p_loop * exp(-r_len), fi + source.r * colorShift, t_b, blur) / (fi + 0.5);\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.05, 0.4, dot(source.rgb, vec3(0.299, 0.587, 0.114))));\nreturn vec4(blended * mask, source.a * mask);\n}",
    uniformValues: {
          "colorShift": 6.7,
          "intensity": 0.61,
          "blur": 0.11,
          "pixelSize": 14.72,
          "roundness": 0.22,
          "spacing": 0.08
    }
  },
  {
    id: "timeline-2c09491a-a584-41a1-af79-63f37c3d1918",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(source.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 0.738,
          "scale": 2.36,
          "threshold": 0.4,
          "lineDensity": 19.85,
          "blobColor": [
                0.9137254901960784,
                0.7372549019607844,
                0.10980392156862745
          ],
          "branchColor": [
                0.5568627450980392,
                0.3686274509803922,
                0.043137254901960784
          ]
    }
  },
  {
    id: "timeline-3bd1713a-4a65-4573-b692-049423ee5923",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(source.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 0.506,
          "scale": 2.36,
          "threshold": 0.4,
          "lineDensity": 5,
          "blobColor": [
                0.2235294117647059,
                0.12156862745098039,
                0.4196078431372549
          ],
          "branchColor": [
                0.24705882352941178,
                0.30196078431372547,
                0.37254901960784315
          ]
    }
  },
  {
    id: "timeline-5f5dcfa8-8054-44d4-b2d1-43c035172743",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(source.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 2.536,
          "scale": 2.36,
          "threshold": 0.4,
          "lineDensity": 35.6,
          "blobColor": [
                0,
                0,
                0
          ],
          "branchColor": [
                0.40784313725490196,
                0.30196078431372547,
                0.796078431372549
          ]
    }
  },
  {
    id: "timeline-91a5d9d8-cc19-4cb1-9753-2800de72f380",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec4 bgCol = mix(source, vec4(0.0, 0.0, 0.0, source.a), blackout);\nif (mask <= 0.0) {\nreturn bgCol;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(bgCol.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 0.506,
          "scale": 2.36,
          "threshold": 0.4,
          "lineDensity": 19.85,
          "blobColor": [
                0.40784313725490196,
                0.22745098039215686,
                0.13333333333333333
          ],
          "branchColor": [
                0.5568627450980392,
                0.3686274509803922,
                0.043137254901960784
          ],
          "blackout": 1
    }
  },
  {
    id: "timeline-9cfdae90-6a09-4e2a-9a0c-3c52ffdee7fe",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(source.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 0.8,
          "scale": 10,
          "threshold": 0.305,
          "lineDensity": 20,
          "blobColor": [
                0.2,
                0.9,
                0.6
          ],
          "branchColor": [
                0.8,
                0.3,
                0.7
          ]
    }
  },
  {
    id: "timeline-a80f8f55-994d-4a20-8872-69d41a6342b2",
    name: "Seamless Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Seamless Luma Automata\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nuniform float blackout; // @min 0.0 @max 1.0 @default 1.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec4 bgCol = mix(source, vec4(0.0, 0.0, 0.0, source.a), blackout);\nif (mask <= 0.0) {\nreturn bgCol;\n}\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 effectCol = mix(blobColor, branchColor, branch);\neffectCol += vec3(1.0) * lines * lum * 1.5;\nvec3 finalCol = mix(bgCol.rgb, effectCol, mask * branch);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 2.594,
          "scale": 5.6,
          "threshold": 0.4,
          "lineDensity": 44.6,
          "blobColor": [
                0.42745098039215684,
                0.403921568627451,
                0.39215686274509803
          ],
          "branchColor": [
                0.4470588235294118,
                0.42745098039215684,
                0.396078431372549
          ],
          "blackout": 1
    }
  },
  {
    id: "timeline-a8c4c6c7-e951-4da2-b718-78f871a40dc5",
    name: "Shaken Mercury",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * 0.5;\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * 1.5;\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 3.04,
          "scale": 3.26,
          "depth": 3.3,
          "roughness": 0.0639,
          "tintColor": [
                0.3568627450980392,
                0.3411764705882353,
                0.1607843137254902
          ],
          "threshold": 0.08
    }
  },
  {
    id: "timeline-94797026-2480-45fb-b342-2ac958345afd",
    name: "Sharp Neon Grid Mapping",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Sharp Neon Grid Mapping\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridScale; // @min 5.0 @max 50.0 @default 30.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float wrapStrength; // @min 0.0 @max 2.0 @default 1.0\nuniform float coreThickness; // @min 0.01 @max 0.2 @default 0.03\nuniform float glowThickness; // @min 0.01 @max 0.5 @default 0.1\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nvec3 lumCoeff = vec3(0.299, 0.587, 0.114);\nfloat luma = dot(baseColor.rgb, lumCoeff);\nfloat bgMask = smoothstep(bgThreshold, bgThreshold + 0.02, luma);\nvec2 eps = vec2(2.0) / resolution;\nfloat lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumCoeff);\nfloat lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumCoeff);\nvec2 normalXY = vec2(lumaR - luma, lumaU - luma) * 15.0;\nvec3 phase = vec3(0.0, 2.09, 4.18);\nvec3 psychColor = 0.5 + 0.5 * cos(time * speed + luma * 8.0 + phase);\nvec2 centeredUv = uv - 0.5;\nvec2 wrappedUv = uv + centeredUv * (1.0 - luma) * wrapStrength * 0.5;\nwrappedUv += normalXY * wrapStrength * 0.15;\nvec2 gridUv = wrappedUv * gridScale;\ngridUv.y -= time * speed * 0.5;\nvec2 gridDist = abs(fract(gridUv + 0.5) - 0.5);\nfloat dist = min(gridDist.x, gridDist.y);\nfloat aa = (gridScale / resolution.y) * 1.5;\nfloat core = 1.0 - smoothstep(max(0.0, coreThickness - aa), coreThickness + aa, dist);\nfloat glow = 1.0 - smoothstep(max(0.0, coreThickness + glowThickness - aa * 2.0), coreThickness + glowThickness + aa * 2.0, dist);\nfloat border = clamp(glow - core, 0.0, 1.0);\nvec3 mappedColor = mix(baseColor.rgb, psychColor * luma * 2.0, intensity * 0.7);\nmappedColor = mix(mappedColor, psychColor * 2.5, border * intensity);\nmappedColor = mix(mappedColor, vec3(0.0), core * intensity);\nvec3 finalColor = mix(baseColor.rgb, mappedColor, bgMask);\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": 4.853,
          "gridScale": 14.9,
          "intensity": 0.34,
          "wrapStrength": 0.48,
          "coreThickness": 0.181,
          "glowThickness": 0.0149,
          "bgThreshold": 0.09
    }
  },
  {
    id: "timeline-de42593d-1a19-48c5-86f2-dff5e77d44f2",
    name: "Sharp Neon Grid Mapping",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Sharp Neon Grid Mapping\nuniform float speed; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridScale; // @min 5.0 @max 50.0 @default 30.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float wrapStrength; // @min 0.0 @max 2.0 @default 1.0\nuniform float coreThickness; // @min 0.01 @max 0.2 @default 0.03\nuniform float glowThickness; // @min 0.01 @max 0.5 @default 0.1\nuniform float bgThreshold; // @min 0.0 @max 0.5 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 baseColor = texture2D(tex, uv);\nvec3 lumCoeff = vec3(0.299, 0.587, 0.114);\nfloat luma = dot(baseColor.rgb, lumCoeff);\nfloat bgMask = smoothstep(bgThreshold, bgThreshold + 0.02, luma);\nvec2 eps = vec2(2.0) / resolution;\nfloat lumaR = dot(texture2D(tex, uv + vec2(eps.x, 0.0)).rgb, lumCoeff);\nfloat lumaU = dot(texture2D(tex, uv + vec2(0.0, eps.y)).rgb, lumCoeff);\nvec2 normalXY = vec2(lumaR - luma, lumaU - luma) * 15.0;\nvec3 phase = vec3(0.0, 2.09, 4.18);\nvec3 psychColor = 0.5 + 0.5 * cos(time * speed + luma * 8.0 + phase);\nvec2 centeredUv = uv - 0.5;\nvec2 wrappedUv = uv + centeredUv * (1.0 - luma) * wrapStrength * 0.5;\nwrappedUv += normalXY * wrapStrength * 0.15;\nvec2 gridUv = wrappedUv * gridScale;\ngridUv.y -= time * speed * 0.5;\nvec2 gridDist = abs(fract(gridUv + 0.5) - 0.5);\nfloat dist = min(gridDist.x, gridDist.y);\nfloat aa = (gridScale / resolution.y) * 1.5;\nfloat core = 1.0 - smoothstep(max(0.0, coreThickness - aa), coreThickness + aa, dist);\nfloat glow = 1.0 - smoothstep(max(0.0, coreThickness + glowThickness - aa * 2.0), coreThickness + glowThickness + aa * 2.0, dist);\nfloat border = clamp(glow - core, 0.0, 1.0);\nvec3 mappedColor = mix(baseColor.rgb, psychColor * luma * 2.0, intensity * 0.7);\nmappedColor = mix(mappedColor, psychColor * 2.5, border * intensity);\nmappedColor = mix(mappedColor, vec3(0.0), core * intensity);\nvec3 finalColor = mix(baseColor.rgb, mappedColor, bgMask);\nreturn vec4(finalColor, baseColor.a);\n}",
    uniformValues: {
          "speed": 1.423,
          "gridScale": 6.8,
          "intensity": 0.96,
          "wrapStrength": 1.68,
          "coreThickness": 0.2,
          "glowThickness": 0.5,
          "bgThreshold": 0.105
    }
  },
  {
    id: "timeline-9cd946ac-8937-4c4c-8bdd-82b85ecae9ce",
    name: "Smooth Dark Metallic Waves",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Smooth Dark Metallic Waves\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 2.0 @max 20.0 @default 10.0\nuniform float depth; // @min -5.0 @max 5.0 @default 1.5\nuniform float movement_form; // @min 0.0 @max 5.0 @default 1.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.1\nuniform float ambient; // @min 0.0 @max 1.0 @default 0.15\nvec4 sampleSmooth(sampler2D tex, vec2 uv, vec2 res) {\nvec2 e = 1.0 / res;\nvec4 c = texture2D(tex, uv);\nc += texture2D(tex, uv + vec2(e.x, 0.0));\nc += texture2D(tex, uv + vec2(0.0, e.y));\nc += texture2D(tex, uv - vec2(e.x, 0.0));\nc += texture2D(tex, uv - vec2(0.0, e.y));\nreturn c * 0.2;\n}\nfloat getLum(sampler2D tex, vec2 uv, vec2 res) {\nvec3 c = sampleSmooth(tex, uv, res).rgb;\nreturn dot(c, vec3(0.299, 0.587, 0.114));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd, vec2 res) {\nfloat lum = getLum(tex, uv, res);\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sumAmp = 0.0;\nmat2 rot = mat2(0.737, -0.675, 0.675, 0.737);\nfor(int i = 0; i < 3; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * movement_form);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nreturn n / sumAmp;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = sampleSmooth(tex, uv, resolution);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.001, lum);\nvec3 darkSource = source.rgb * 0.15;\nif (mask <= 0.0) {\nreturn vec4(darkSource, source.a);\n}\nvec2 eps = max(1.0 / resolution, vec2(0.002));\nfloat h0 = getHeight(tex, uv, time, scale, speed, resolution);\nfloat hx = getHeight(tex, uv + vec2(eps.x, 0.0), time, scale, speed, resolution);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps.y), time, scale, speed, resolution);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 100.0, (h0 - hy) * depth * 100.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.05);\nvec3 totalDiffuse = vec3(ambient);\nvec3 totalSpecular = vec3(0.0);\nfloat specPower = 1.0 / max(roughness * 0.05, 0.001);\nfor(int i = 0; i < 20; i++) {\nfloat fi = float(i);\nfloat r1 = fract(sin(fi * 12.9898) * 43758.5453);\nfloat r2 = fract(sin(fi * 78.233) * 43758.5453);\nfloat r3 = fract(sin(fi * 39.346) * 43758.5453);\nvec3 lPos = vec3(\n0.5 + 0.9 * sin(time * (0.2 + r1 * 0.8) + r2 * 6.28),\n0.5 + 0.9 * cos(time * (0.2 + r2 * 0.8) + r3 * 6.28),\n0.1 + 0.4 * r3\n);\nvec3 lCol = vec3(\n0.5 + 0.5 * sin(fi * 0.61),\n0.5 + 0.5 * sin(fi * 0.73 + 2.0),\n0.5 + 0.5 * sin(fi * 0.89 + 4.0)\n);\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 0.15 / (1.0 + dist * dist * 8.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ntotalDiffuse += diff * lCol * atten;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.5);\ntotalSpecular += spec * lCol * atten * 10.0 * metallicTint;\n}\nvec3 finalColor = mix(darkSource, darkSource * totalDiffuse + totalSpecular, mask);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 2.42,
          "scale": 3.98,
          "depth": 0.4,
          "movement_form": 3.85,
          "threshold": 0.16,
          "roughness": 0.2991,
          "ambient": 0.07
    }
  },
  {
    id: "timeline-43e35479-e42c-4329-ba4f-af4e9c848932",
    name: "Smooth Flip & Rotate Hexagons 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Smooth Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform float roundness; // @min 0.0 @max 0.2 @default 0.08\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec4 hexGrid(vec2 p) {\nvec2 r = vec2(1.0, 1.7320508);\nvec2 h = r * 0.5;\nvec2 a = mod(p, r) - h;\nvec2 b = mod(p - h, r) - h;\nreturn dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\nvec2 map(vec3 p, float time) {\nvec4 hg = hexGrid(p.xz);\nvec2 id = hg.zw;\nvec3 q = vec3(hg.x, p.y, hg.y);\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flip = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flip) * 3.14159;\nfloat activeFlip = sin(flip * 3.14159);\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nq.xz = rot(angle * dir * 2.0) * q.xz;\nvec3 absq = abs(q);\nfloat r = roundness;\nfloat d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2) + r;\nfloat d2 = absq.y - 0.15 + r;\nfloat tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0)) - r;\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0, maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec4 hg = hexGrid(pos.xz);\nvec2 id = hg.zw;\nvec2 finalUV = (id + hg.xy) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nvec2 localNorXY = rot(angle * dir) * nor.xy;\ncol = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n}\ncol *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.149,
          "waveFreq": 1.943,
          "waveSpread": 1.278,
          "jumpHeight": 0.03,
          "zoom": 1,
          "gridSize": 17.66,
          "roundness": 0.186,
          "planeColor": [
                0.011764705882352941,
                0.011764705882352941,
                0.011764705882352941
          ]
    }
  },
  {
    id: "timeline-f9abab5a-10eb-45f1-9024-753401ce3fe8",
    name: "Smooth Flip & Rotate Hexagons 3D",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Smooth Flip & Rotate Hexagons 3D\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform float roundness; // @min 0.0 @max 0.2 @default 0.08\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec4 hexGrid(vec2 p) {\nvec2 r = vec2(1.0, 1.7320508);\nvec2 h = r * 0.5;\nvec2 a = mod(p, r) - h;\nvec2 b = mod(p - h, r) - h;\nreturn dot(a, a) < dot(b, b) ? vec4(a, p - a) : vec4(b, p - b);\n}\nvec2 map(vec3 p, float time) {\nvec4 hg = hexGrid(p.xz);\nvec2 id = hg.zw;\nvec3 q = vec3(hg.x, p.y, hg.y);\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flip = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flip) * 3.14159;\nfloat activeFlip = sin(flip * 3.14159);\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nq.xz = rot(angle * dir * 2.0) * q.xz;\nvec3 absq = abs(q);\nfloat r = roundness;\nfloat d1 = max(absq.z * 0.866025 + absq.x * 0.5, absq.x) - (0.48 - activeFlip * 0.2) + r;\nfloat d2 = absq.y - 0.15 + r;\nfloat tiles = min(max(d1, d2), 0.0) + length(max(vec2(d1, d2), 0.0)) - r;\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0, maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec4 hg = hexGrid(pos.xz);\nvec2 id = hg.zw;\nvec2 finalUV = (id + hg.xy) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\nfloat dir = sign(id.x + 0.0001);\nif (dir == 0.0) dir = 1.0;\nvec2 localNorXY = rot(angle * dir) * nor.xy;\ncol = mix(texCol * 0.4, texCol, smoothstep(0.5, 0.9, localNorXY.y));\n}\ncol *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.296,
          "waveFreq": 1.905,
          "waveSpread": 1.069,
          "jumpHeight": 0,
          "zoom": 1,
          "gridSize": 17.66,
          "roundness": 0.186,
          "planeColor": [
                0.011764705882352941,
                0.011764705882352941,
                0.011764705882352941
          ]
    }
  },
  {
    id: "timeline-5e93ac76-637f-4612-9fd8-db73b5701c3d",
    name: "Still Water Flow",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Still Water Flow\nuniform float speed; // @min 0.1 @max 3.0 @default 0.8\nuniform float scale; // @min 1.0 @max 15.0 @default 4.0\nuniform float bump; // @min 0.1 @max 5.0 @default 2.5\nuniform float threshold; // @min 0.0 @max 0.5 @default 0.05\nfloat getLum(vec3 col) {\nreturn dot(col, vec3(0.299, 0.587, 0.114));\n}\nfloat getFluidHeight(vec2 uv, float time, float lum) {\nvec2 p = uv * scale;\nfloat t = time * speed;\nvec2 warp = vec2(node_noise(p + t * 0.4), node_noise(p - t * 0.3)) * 1.5;\nfloat n1 = node_noise(p + warp);\nfloat n2 = node_noise(p * 1.5 - warp * 0.8 + t * 0.2);\nreturn (n1 * 0.6 + n2 * 0.4) * (0.5 + lum * 0.5);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = getLum(source.rgb);\nfloat mask = smoothstep(threshold * 0.5, threshold + 0.01, lum);\nif (mask <= 0.0) {\nreturn source;\n}\nfloat eps = 0.005;\nfloat h0 = getFluidHeight(uv, time, lum);\nfloat hx = getFluidHeight(uv + vec2(eps, 0.0), time, lum);\nfloat hy = getFluidHeight(uv + vec2(0.0, eps), time, lum);\nvec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps * 2.0 / bump));\nvec3 viewDir = vec3(0.0, 0.0, 1.0);\nvec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));\nvec3 halfDir = normalize(lightDir + viewDir);\nfloat spec = pow(max(dot(normal, halfDir), 0.0), 48.0) * 1.5;\nfloat fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);\nvec2 distUv = uv - normal.xy * 0.05;\nvec3 distSource = texture2D(tex, distUv).rgb;\nvec3 finalColor = distSource + spec + vec3(0.8, 0.9, 1.0) * fresnel * 0.4;\nreturn vec4(mix(source.rgb, finalColor, mask), source.a);\n}",
    uniformValues: {
          "speed": 2.072,
          "scale": 1.42,
          "bump": 1.178,
          "threshold": 0.105
    }
  },
  {
    id: "timeline-5baef16e-4655-4eb4-b20d-35435497ab14",
    name: "Symmetrical Halo Swirl Masked",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Symmetrical Halo Swirl Masked\nuniform float seed; // @min 0.0 @max 100.0 @default 0.0\nuniform float colorShift; // @min 0.0 @max 10.0 @default 3.0\nuniform float intensity; // @min 0.0 @max 1.0 @default 0.8\nuniform float shine; // @min 0.0 @max 5.0 @default 1.5\nuniform float haloSize; // @min 0.0 @max 0.05 @default 0.01\nuniform float haloIntensity; // @min 0.0 @max 2.0 @default 0.6\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.05\nvec3 palette(float t) {\nreturn vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(0.18, 0.40, 0.07) * t + vec3(0.28, 0.68, 0.30)));\n}\nvec2 swirl(vec2 p, float strength, float freq, float speed, float time) {\nfloat r = length(p);\nfloat a = atan(p.y, p.x) + strength * r * sin(speed * time + freq * r);\nreturn (r + 0.03 * sin(speed * time + freq * r)) * vec2(cos(a), sin(a));\n}\nvec3 makeFlower(vec2 p, float level, float time) {\nfloat d = length(p);\nfloat a = atan(p.y, p.x) / 6.28318 + 0.5;\nfloat m = smoothstep(0.8, 0.7, d);\nfloat stripe = 0.5 + 0.5 * sin(6.28318 * (a * 8.0 + time));\nvec3 col = vec3(pow(stripe, 3.0) * 5.0) * palette(d * sin(time * 0.2) * 2.0 + level);\nreturn col * (smoothstep(1.0, 0.3, d / 0.75) * smoothstep(0.0, 0.4, d / 0.75)) * m;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 trueSource = texture2D(tex, uv);\nfloat trueLum = dot(trueSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkMask = smoothstep(darkThreshold * 0.5, darkThreshold + 0.0001, trueLum);\nfloat stime = time + seed * 23.45;\nvec2 uv_sym = vec2(0.5 + abs(uv.x - 0.5), uv.y);\nvec4 source = texture2D(tex, uv_sym);\nvec2 p = (uv_sym * 2.0 - 1.0);\np.x *= resolution.x / resolution.y;\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nfloat t_r = stime + source.r * colorShift;\np = swirl(p * (sin(stime * 0.4) * 0.1 + 1.1), 0.12, 0.2, 0.2 + source.b * 0.3, t_r);\nvec3 finalCol = makeFlower(p, 4.0 + source.g * colorShift, stime + source.g * colorShift);\nvec2 p_iter = p * 0.25;\nfor (int i = 0; i < 2; i++) {\np_iter = abs(fract(p_iter * 2.1) - 0.5) * 2.0;\nfloat fade = smoothstep(1.0, 0.7, p_iter.x) * smoothstep(1.0, 0.7, p_iter.y);\nfinalCol += (makeFlower(p_iter * exp(-length(p * 0.25)), float(i) + source.r * colorShift, stime + source.b * colorShift) * fade / (float(i) + 1.5));\n}\nvec3 blended = mix(source.rgb, finalCol, intensity * smoothstep(0.0, 0.4, lum));\nblended += blended * (pow(lum, 3.0) * shine * 0.5 * (0.5 + 0.5 * sin(stime * 2.0)));\nvec3 halo = vec3(0.0);\nhalo += texture2D(tex, uv + vec2(haloSize, haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(-haloSize, haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(haloSize, -haloSize)).rgb;\nhalo += texture2D(tex, uv + vec2(-haloSize, -haloSize)).rgb;\nblended += (halo * 0.25) * haloIntensity * (0.5 + 0.5 * sin(stime + lum * 10.0));\nblended = mix(trueSource.rgb, blended, darkMask);\nreturn vec4(blended, trueSource.a);\n}",
    uniformValues: {
          "seed": 79,
          "colorShift": 4.9,
          "intensity": 1,
          "shine": 3.15,
          "haloSize": 0.047,
          "haloIntensity": 0.48,
          "darkThreshold": 0.6
    }
  },
  {
    id: "timeline-0066d2f6-a6bd-40ae-8435-d8a5abb63839",
    name: "Time Colored Halftone",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Time Colored Halftone\nuniform float gridSize; // @min 10.0 @max 200.0 @default 60.0\nuniform float blackThreshold; // @min 0.0 @max 1.0 @default 0.3\nuniform float lightSpeed; // @min 0.0 @max 5.0 @default 2.0\nuniform float lightFocus; // @min 1.0 @max 10.0 @default 3.0\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 aspect = vec2(resolution.x / resolution.y, 1.0);\nvec2 scaledUV = uv * aspect * gridSize;\nvec2 cellCenter = floor(scaledUV) + 0.5;\nvec2 sampleUV = cellCenter / (aspect * gridSize);\nsampleUV = clamp(sampleUV, 0.001, 0.999);\nvec4 imgColor = texture2D(tex, sampleUV);\nfloat luminance = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));\nfloat lumAdjusted = smoothstep(blackThreshold, blackThreshold + 0.2, luminance);\nvec3 lightPos = vec3(\n0.5 + 0.4 * sin(time * lightSpeed),\n0.5 + 0.4 * cos(time * lightSpeed * 0.73),\n0.3 + 0.2 * sin(time * lightSpeed * 1.1)\n);\nvec3 surfacePos = vec3(sampleUV, 0.0);\nfloat dist3D = length(lightPos - surfacePos);\nfloat lightIntensity = pow(max(0.0, 1.2 - dist3D * 1.5), lightFocus * 2.0);\nfloat dist = length(scaledUV - cellCenter);\nfloat radius = lumAdjusted * 0.9 * lightIntensity;\nfloat edge = 0.05;\nfloat mask = 1.0 - smoothstep(max(0.0, radius - edge), radius + edge, dist);\nmask *= step(0.001, radius);\nvec3 timeColor = 0.5 + 0.5 * cos(time * 2.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = mix(vec3(0.0), timeColor, mask);\nreturn vec4(finalColor, 1.0);\n}",
    uniformValues: {
          "gridSize": 48,
          "blackThreshold": 0.36,
          "lightSpeed": 4.2,
          "lightFocus": 4.15
    }
  },
  {
    id: "timeline-a442302e-be1e-4f95-8c59-58e6e08c5c95",
    name: "Time-Lit Animated HURA Hex Grid",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Time-Lit Animated HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * scale);\nvec3 col = vec3(URA(h.xy));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D);\nif (dot(col, vec3(1.0)) > 1.0) {\ncol *= bevel;\n} else {\ncol = 1.0 - (1.0 - col) * bevel;\n}\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\ncenterP.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat sweep = threshold + (abs(fract(time * animSpeed * 0.2) * 2.0 - 1.0) - 0.5) * 0.8;\nfloat activeHex = step(sweep, hexLuma);\nfloat litDepth = max(0.0, hexLuma - sweep);\nvec3 timeColor = 0.5 + 0.5 * cos(litDepth * 15.0 - time * 3.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = mix(vec3(0.0), col * timeColor * 1.5, activeHex);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 47.75,
          "threshold": 0.63,
          "morph3D": 1,
          "animSpeed": 0.85
    }
  },
  {
    id: "timeline-4c303084-1609-4be2-bb1f-c286953e2133",
    name: "Tinted Arc Flipping Cubes",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Tinted Arc Flipping Cubes\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec2 map(vec3 p, float time) {\nvec2 id = floor(p.xz + 0.5);\nvec3 q = p;\nq.x = fract(p.x + 0.5) - 0.5;\nq.z = fract(p.z + 0.5) - 0.5;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flipProgress = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\nfloat activeFlip = sin(flipProgress * 3.14159);\nfloat dir = (id.x >= 0.0) ? -1.0 : 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nvec3 d = abs(q) - vec3(0.48 - activeFlip * 0.2, 0.15, 0.48 - activeFlip * 0.2);\nfloat tiles = min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3(0.0)));\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0;\nfloat maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec2 id = floor(pos.xz + 0.5);\nvec2 finalUV = (id + (pos.xz - id)) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flipIndex = floor(localTime * waveFreq) - (phase < 0.25 ? 1.0 : 0.0);\nvec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\ncol = mix(texCol * (tint * 1.5 + 0.2), texCol, smoothstep(0.5, 0.9, nor.y));\n}\ncol *= (dif * 0.7 + max(dot(nor, rd), 0.0) * 0.6 + 0.3);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.59,
          "waveFreq": 0.176,
          "waveSpread": 0.195,
          "jumpHeight": 0,
          "zoom": 0.933,
          "gridSize": 22.07,
          "planeColor": [
                0.0392156862745098,
                0.0392156862745098,
                0.043137254901960784
          ]
    }
  },
  {
    id: "timeline-a0b3ee90-a0f9-480a-8092-eb79d0273de0",
    name: "Tinted Arc Flipping Cubes",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Tinted Arc Flipping Cubes\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float waveFreq; // @min 0.1 @max 2.0 @default 0.4\nuniform float waveSpread; // @min 0.1 @max 2.0 @default 0.3\nuniform float jumpHeight; // @min 0.0 @max 3.0 @default 1.2\nuniform float zoom; // @min 0.1 @max 5.0 @default 1.0\nuniform float gridSize; // @min 1.0 @max 50.0 @default 13.0\nuniform vec3 planeColor; // @default 0.1,0.1,0.15\nuniform float contrast; // @min 0.0 @max 3.0 @default 1.0\nuniform float luminosity; // @min -1.0 @max 1.0 @default 0.0\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}\nvec2 map(vec3 p, float time) {\nvec2 id = floor(p.xz + 0.5);\nvec3 q = p;\nq.x = fract(p.x + 0.5) - 0.5;\nq.z = fract(p.z + 0.5) - 0.5;\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat flipProgress = smoothstep(0.0, 0.25, phase);\nfloat angle = (floor(localTime * waveFreq) + flipProgress) * 3.14159;\nfloat activeFlip = sin(flipProgress * 3.14159);\nfloat dir = (id.x >= 0.0) ? -1.0 : 1.0;\nq.x -= activeFlip * jumpHeight * 1.5 * dir;\nq.y -= activeFlip * jumpHeight;\nq.xy = rot(angle * dir) * q.xy;\nvec3 d = abs(q) - vec3(0.48 - activeFlip * 0.2, 0.15, 0.48 - activeFlip * 0.2);\nfloat tiles = min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3(0.0)));\nreturn (tiles < p.y + 0.6) ? vec2(tiles, 1.0) : vec2(p.y + 0.6, 0.0);\n}\nvec3 getNormal(vec3 p, float time) {\nvec2 e = vec2(0.01, 0.0);\nreturn normalize(vec3(\nmap(p + e.xyy, time).x - map(p - e.xyy, time).x,\nmap(p + e.yxy, time).x - map(p - e.yxy, time).x,\nmap(p + e.yyx, time).x - map(p - e.yyx, time).x\n));\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 p = (uv - 0.5) * 2.0;\np.x *= resolution.x / resolution.y;\np /= zoom;\nvec3 ro = vec3(0.0, gridSize, 0.001);\nvec3 rd = normalize(vec3(p.x, -2.2, p.y));\nfloat t = 0.0, maxDist = gridSize * 3.0;\nvec2 res = vec2(0.0);\nfor(int i = 0; i < 40; i++) {\nres = map(ro + rd * t, time);\nif(res.x < 0.005 || t > maxDist) break;\nt += res.x * 0.8;\n}\nif(t >= maxDist) return vec4(0.0, 0.0, 0.0, 1.0);\nvec3 pos = ro + rd * t;\nvec3 nor = getNormal(pos, time);\nfloat dif = max(dot(nor, normalize(vec3(0.6, 1.0, -0.4))), 0.0);\nvec3 col = planeColor;\nif (res.y > 0.5) {\nvec2 id = floor(pos.xz + 0.5);\nvec2 finalUV = (id + (pos.xz - id)) / gridSize;\nfinalUV.x /= (resolution.x / resolution.y);\nvec3 texCol = texture2D(tex, finalUV + 0.5).rgb;\ntexCol = clamp((texCol - 0.5) * contrast + 0.5 + luminosity, 0.0, 1.0);\nfloat localTime = time * speed - length(id) * waveSpread;\nfloat phase = fract(localTime * waveFreq);\nfloat angle = (floor(localTime * waveFreq) + smoothstep(0.0, 0.25, phase)) * 3.14159;\nfloat dir = (id.x >= 0.0) ? -1.0 : 1.0;\nfloat flipIndex = floor((localTime * waveFreq + 0.5) * 0.5);\nvec3 tint = vec3(node_rand(vec2(flipIndex, 1.1)), node_rand(vec2(flipIndex, 2.2)), node_rand(vec2(flipIndex, 3.3)));\nvec2 localNorXY = rot(angle * dir) * nor.xy;\ncol = mix(texCol * (tint * 0.8 + 0.1), texCol, smoothstep(0.5, 0.9, localNorXY.y));\n}\ncol *= (dif * 0.5 + max(dot(nor, rd), 0.0) * 0.4 + 0.2);\nreturn vec4(mix(col, vec3(0.0), smoothstep(maxDist * 0.5, maxDist, t)), 1.0);\n}",
    uniformValues: {
          "speed": 0.443,
          "waveFreq": 0.271,
          "waveSpread": 0.157,
          "jumpHeight": 0.03,
          "zoom": 0.884,
          "gridSize": 9.33,
          "planeColor": [
                0.027450980392156862,
                0.027450980392156862,
                0.03137254901960784
          ],
          "contrast": 1.98,
          "luminosity": 0.06
    }
  },
  {
    id: "timeline-ae26c48a-100e-4de3-80d7-5fda335ee997",
    name: "Violent Luma Automata",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Violent Luma Automata\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nuniform float lineDensity; // @min 5.0 @max 50.0 @default 20.0\nuniform vec3 blobColor; // @default 0.2,0.9,0.6\nuniform vec3 branchColor; // @default 0.8,0.3,0.7\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * (1.5 + violence * 0.05);\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat lum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (lum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 8; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 mercuryCol = baseColor + colorAcc * metallicTint;\nmercuryCol += colorAcc * 0.2;\nvec2 p = uv * scale;\nfloat t = time * speed;\nfloat n = 0.0;\nvec2 q = p;\nmat2 rot = mat2(0.73736, -0.67549, 0.67549, 0.73736);\nfloat amp = 1.0;\nfloat sumAmp = 0.0;\nfor(int i = 0; i < 4; i++) {\nvec2 tOffset = vec2(sin(t * 0.3 + float(i)), cos(t * 0.3 + float(i)));\nfloat noiseVal = node_noise(q + tOffset + lum * 1.5);\nfloat angle = noiseVal * 6.2831;\nq += vec2(cos(angle), sin(angle)) * (0.6 + lum * 0.4);\nq = rot * q * 1.3;\nn += noiseVal * amp;\nsumAmp += amp;\namp *= 0.5;\n}\nn /= sumAmp;\nfloat branch = smoothstep(0.3, 0.7, n);\nfloat topo = sin((lum * 2.0 + n) * lineDensity - t * 4.0);\nfloat lines = smoothstep(0.8, 0.95, topo);\nvec3 automataCol = mix(blobColor, branchColor, branch);\nvec3 finalCol = mix(mercuryCol, automataCol, lines * lum);\nreturn vec4(finalCol, source.a);\n}",
    uniformValues: {
          "speed": 0.296,
          "scale": 3.08,
          "depth": 2.991,
          "roughness": 0.2354,
          "tintColor": [
                0.396078431372549,
                0.3843137254901961,
                0.3803921568627451
          ],
          "threshold": 0.11,
          "violence": 0.394,
          "lineDensity": 11.3,
          "blobColor": [
                0.2980392156862745,
                0.20392156862745098,
                0.20392156862745098
          ],
          "branchColor": [
                0.9098039215686274,
                0.8901960784313725,
                0.9058823529411765
          ]
    }
  },
  {
    id: "timeline-1584ecb1-c347-4ba0-bfee-b5be88e326c7",
    name: "Violent Shaken Mercury",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * (1.5 + violence * 0.05);\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 2.697,
          "scale": 2.72,
          "depth": 2.648,
          "roughness": 0.1619,
          "tintColor": [
                0.2196078431372549,
                0.2196078431372549,
                0.2196078431372549
          ],
          "threshold": 0.1,
          "violence": 2.207
    }
  },
  {
    id: "timeline-784e3954-79aa-499f-b582-57387e44592d",
    name: "Violent Shaken Mercury",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * (1.5 + violence * 0.05);\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 0.296,
          "scale": 2,
          "depth": 2.991,
          "roughness": 0.05,
          "tintColor": [
                0.396078431372549,
                0.2823529411764706,
                0.2823529411764706
          ],
          "threshold": 0.09,
          "violence": 0.1
    }
  },
  {
    id: "timeline-8b2d0a70-0eeb-4d40-a136-80262726d646",
    name: "Violent Shaken Mercury",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * (1.5 + violence * 0.05);\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 4.951,
          "scale": 2.36,
          "depth": 2.991,
          "roughness": 0.451,
          "tintColor": [
                0.28627450980392155,
                0.23921568627450981,
                0.23529411764705882
          ],
          "threshold": 0.09,
          "violence": 0.345
    }
  },
  {
    id: "timeline-c38dab8a-46cd-4a4a-ae65-f24adf97c99c",
    name: "Violent Shaken Mercury",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Violent Shaken Mercury\nuniform float speed; // @min 0.1 @max 5.0 @default 1.5\nuniform float scale; // @min 2.0 @max 20.0 @default 8.0\nuniform float depth; // @min 0.1 @max 5.0 @default 2.0\nuniform float roughness; // @min 0.01 @max 0.5 @default 0.05\nuniform vec3 tintColor; // @default 1.0,1.0,1.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float violence; // @min 0.1 @max 5.0 @default 2.0\nvec3 palette(float t) {\nvec3 a = vec3(0.5, 0.5, 0.5);\nvec3 b = vec3(0.5, 0.5, 0.5);\nvec3 c = vec3(1.0, 1.0, 1.0);\nvec3 d = vec3(0.263, 0.416, 0.557);\nreturn a + b * cos(6.28318 * (c * t + d));\n}\nfloat getHeight(sampler2D tex, vec2 uv, float time, float s, float spd) {\nfloat lum = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));\nvec2 q = uv * s;\nfloat t = time * spd;\nfloat n = 0.0, amp = 1.0, sum = 0.0;\nmat2 rot = mat2(0.8, -0.6, 0.6, 0.8);\nfor(int i = 0; i < 4; i++) {\nq += vec2(sin(t + q.y), cos(t + q.x)) * (0.5 * violence);\nfloat noise = node_noise(q + lum * 2.0);\nn += noise * amp;\nsum += amp;\namp *= 0.5;\nq = rot * q * (1.5 + violence * 0.05);\n}\nreturn n / sum;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat sourceLum = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (sourceLum < threshold) {\nreturn vec4(0.0);\n}\nfloat eps = 0.005;\nfloat h0 = getHeight(tex, uv, time, scale, speed);\nfloat hx = getHeight(tex, uv + vec2(eps, 0.0), time, scale, speed);\nfloat hy = getHeight(tex, uv + vec2(0.0, eps), time, scale, speed);\nvec3 normal = normalize(vec3((h0 - hx) * depth * 50.0, (h0 - hy) * depth * 50.0, 1.0));\nvec3 surfacePos = vec3(uv, h0 * depth * 0.1);\nvec3 colorAcc = vec3(0.0);\nfloat specPower = 1.0 / max(roughness, 0.001);\nfor(int i = 0; i < 12; i++) {\nfloat fi = float(i);\nvec3 lPos = vec3(\n0.5 + 0.8 * sin(time * 2.0 + fi * 2.14),\n0.5 + 0.8 * cos(time * 2.3 + fi * 3.72),\n0.1 + 0.3 * sin(time * 1.5 + fi)\n);\nlPos.xy -= normal.xy * 0.25;\nvec3 lCol = palette(fi * 0.15 + time * 0.5) * tintColor;\nvec3 lDir = lPos - surfacePos;\nfloat dist = length(lDir);\nlDir = normalize(lDir);\nfloat diff = max(dot(normal, lDir), 0.0);\nfloat atten = 1.0 / (1.0 + dist * dist * 20.0);\nvec3 halfVector = normalize(lDir + vec3(0.0, 0.0, 1.0));\nfloat spec = pow(max(dot(normal, halfVector), 0.0), specPower);\ncolorAcc += (diff * 0.4 + spec * 8.0) * lCol * atten;\n}\nvec3 baseColor = source.rgb * 0.05;\nvec3 metallicTint = mix(vec3(1.0), source.rgb, 0.4);\nvec3 finalColor = baseColor + colorAcc * metallicTint;\nfinalColor += colorAcc * 0.2;\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "speed": 4.902,
          "scale": 2,
          "depth": 2.991,
          "roughness": 0.451,
          "tintColor": [
                0.396078431372549,
                0.2823529411764706,
                0.2823529411764706
          ],
          "threshold": 0.09,
          "violence": 0.345
    }
  },
  {
    id: "timeline-09f0f894-d2d5-4426-9b59-0d34f0d57c5f",
    name: "Voronoi Distances",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Voronoi Distances\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.05\nuniform float scale; // @min 1.0 @max 20.0 @default 8.0\nvec2 hash2(vec2 p) {\nreturn fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);\n}\nvec3 voronoi(in vec2 x, float time) {\nvec2 ip = floor(x);\nvec2 fp = fract(x);\nvec2 mg, mr;\nfloat md = 8.0;\nfor(int j = -1; j <= 1; j++) {\nfor(int i = -1; i <= 1; i++) {\nvec2 g = vec2(float(i), float(j));\nvec2 o = hash2(ip + g);\no = 0.5 + 0.5 * sin(time + 6.2831 * o);\nvec2 r = g + o - fp;\nfloat d = dot(r, r);\nif(d < md) {\nmd = d;\nmr = r;\nmg = g;\n}\n}\n}\nmd = 8.0;\nfor(int j = -2; j <= 2; j++) {\nfor(int i = -2; i <= 2; i++) {\nvec2 g = mg + vec2(float(i), float(j));\nvec2 o = hash2(ip + g);\no = 0.5 + 0.5 * sin(time + 6.2831 * o);\nvec2 r = g + o - fp;\nif(dot(mr - r, mr - r) > 0.00001) {\nmd = min(md, dot(0.5 * (mr + r), normalize(r - mr)));\n}\n}\n}\nreturn vec3(md, mr);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nfloat luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));\nif (luma > threshold) {\nvec2 p = uv * vec2(resolution.x / resolution.y, 1.0);\nvec3 c = voronoi(scale * p, time);\nvec3 col = c.x * (0.5 + 0.5 * sin(64.0 * c.x)) * vec3(1.0);\ncol = mix(source.rgb, col, smoothstep(0.04, 0.07, c.x));\nfloat dd = length(c.yz);\ncol = mix(source.rgb, col, smoothstep(0.0, 0.12, dd));\ncol += source.rgb * (1.0 - smoothstep(0.0, 0.04, dd));\ncol *= luma;\nreturn vec4(col, source.a);\n}\nreturn source;\n}",
    uniformValues: {
          "threshold": 0.06,
          "scale": 11.07
    }
  },
  {
    id: "timeline-8de56499-5d2f-4f83-8025-ce57a1146166",
    name: "Wavy Noise HURA Hex Grid",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Wavy Noise HURA Hex Grid\nuniform float scale; // @min 5.0 @max 50.0 @default 21.0\nuniform float threshold; // @min 0.0 @max 1.0 @default 0.5\nuniform float morph3D; // @min 0.0 @max 1.0 @default 1.0\nuniform float animSpeed; // @min 0.0 @max 5.0 @default 2.0\nvec4 hexagon(in vec2 p) {\nvec2 q = vec2(p.x * 1.1547006, p.y + p.x * 0.5773503);\nvec2 pi = floor(q), pf = fract(q);\nfloat v = mod(pi.x + pi.y, 3.0);\nfloat ca = step(1.0, v), cb = step(2.0, v);\nvec2 ma = step(pf.xy, pf.yx);\nfloat e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));\np = vec2(q.x + floor(0.5 + p.y / 1.5), 4.0 * p.y / 3.0) * 0.5 + 0.5;\nfloat f = length((fract(p) - 0.5) * vec2(1.0, 0.85));\nreturn vec4(pi + ca - cb * ma, e, f);\n}\nfloat URA(in vec2 p) {\nfloat v = 151.0;\nfloat r = 32.0;\nfloat l = mod(p.y + r * p.x, v);\nfloat rz = 1.0;\nfor(int i = 1; i < 76; i++) {\nif (mod(float(i) * float(i), v) == l) rz = 0.0;\n}\nreturn rz;\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 source = texture2D(tex, uv);\nvec2 p = uv * 2.0 - 1.0;\np.x *= resolution.x / resolution.y;\nvec4 h = hexagon(p * scale);\nvec3 col = vec3(URA(h.xy));\nfloat edge = smoothstep(-0.2, 0.13, h.z);\nfloat bevel = mix(1.0, edge, morph3D);\nif (dot(col, vec3(1.0)) > 1.0) {\ncol *= bevel;\n} else {\ncol = 1.0 - (1.0 - col) * bevel;\n}\nvec2 centerP = vec2(h.x * 0.8660254, h.y - h.x * 0.5) / scale;\ncenterP.x *= resolution.y / resolution.x;\nvec2 centerUV = centerP * 0.5 + 0.5;\nvec4 hexSource = texture2D(tex, centerUV);\nfloat hexLuma = dot(hexSource.rgb, vec3(0.299, 0.587, 0.114));\nfloat waveNoise = node_noise(centerUV * 4.0 + vec2(time * animSpeed * 0.5, time * animSpeed * 0.3));\nfloat sweep = threshold + (waveNoise - 0.5) * 1.5;\nfloat activeHex = step(sweep, hexLuma);\nfloat litDepth = max(0.0, hexLuma - sweep);\nvec3 timeColor = 0.5 + 0.5 * cos(litDepth * 15.0 - time * 3.0 + vec3(0.0, 2.0, 4.0));\nvec3 finalColor = mix(vec3(0.0), col * timeColor * 1.5, activeHex);\nreturn vec4(finalColor, source.a);\n}",
    uniformValues: {
          "scale": 47.75,
          "threshold": 0.82,
          "morph3D": 1,
          "animSpeed": 0.85
    }
  },
  {
    id: "timeline-8e55de83-7749-42a4-a7f6-ae9687f75bea",
    name: "Zone Fractal + Hue Scanner",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Zone Fractal + Hue Scanner\nuniform float zoneWidth; // @min 1.0 @max 80.0 @default 15.0\nuniform float edgeWidth; // @min 0.0 @max 10.0 @default 1.5\nuniform float maxDepth; // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6 @default 0.18\nuniform float whiteThreshold; // @min 0.4 @max 0.99 @default 0.85\nuniform float trailSpeed; // @min 0.0 @max 200.0 @default 50.0\nuniform float trailLength; // @min 0.01 @max 0.99 @default 0.65\nuniform float trailDistance; // @min 1.0 @max 80.0 @default 15.0\nuniform float scanSpeed; // @min -2.0 @max 2.0 @default 0.4\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.25\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.15\nuniform float borderBright; // @min 0.0 @max 2.0 @default 1.2\nuniform float symmetrical; // @min 0.0 @max 1.0 @default 1.0\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\nreturn sp.a < 0.3\n|| (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n|| (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\nfloat minD, float blackT, float whiteT,\ninout vec2 nearVec) {\nfor (int j = 11; j <= 100; j++) {\nfloat fj = float(j);\nif (fj >= minD) break;\nvec2 s = uv + dir * px * fj;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\nif (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\n}\nreturn minD;\n}\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\nvec2 nearVec, vec2 px,\nfloat minD, float zoneW, float maxD,\nfloat blackT, float whiteT) {\nfloat zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\nvec2 anchorUV = uv + nearVec * px * (minD - zoneCenter);\nvec3 accum = vec3(0.0);\nfloat weight = 0.0;\nfor (int dy = -1; dy <= 1; dy++) {\nfor (int dx = -1; dx <= 1; dx++) {\nvec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\nvec4 sc = texture2D(tex, s);\nif (isEdgePixel(sc, blackT, whiteT)) continue;\nif (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\naccum += sc.rgb;\nweight += 1.0;\n}\n}\nvec3 col = (weight > 0.0) ? accum / weight : vec3(0.3);\nfloat depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\ncol *= depthFade * 0.65;\nreturn col;\n}\nvec2 hueScanMask(sampler2D tex, vec2 uv, float time) {\nvec2 maskUV = uv;\nif (symmetrical > 0.5)\nmaskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\nvec4 src = texture2D(tex, maskUV);\nvec3 hsv = rgb2hsv(src.rgb);\nfloat targetHue = fract(time * scanSpeed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nreturn vec2(mask, border);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nbool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\nbool srcIsBg = src.r > whiteThreshold && src.g > whiteThreshold && src.b > whiteThreshold;\nbool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\nif (srcIsBlack) return vec4(0.0, 0.0, 0.0, 1.0);\nif (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\nvec2 mb = hueScanMask(tex, uv, time);\nfloat mask = mb.x;\nfloat border = mb.y;\nif (mask <= 0.0 && border <= 0.0) return vec4(0.0, 0.0, 0.0, 0.0);\nfloat aspect = resolution.x / resolution.y;\nvec2 px = vec2(0.001, 0.001 * aspect);\nfloat minD = maxDepth;\nvec2 nearVec = vec2(1.0, 0.0);\nfor (int dy = -10; dy <= 10; dy++) {\nfor (int dx = -10; dx <= 10; dx++) {\nfloat fdx = float(dx), fdy = float(dy);\nfloat d2 = fdx*fdx + fdy*fdy;\nif (d2 < 0.5 || d2 > 100.5) continue;\nvec2 s = uv + vec2(fdx, fdy) * px;\nfloat nd = sqrt(d2);\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\ncontinue;\n}\nif (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n}\n}\nif (minD > 10.0) {\nminD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n}\nfloat depFrac = mod(minD, zoneWidth);\nif (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\nreturn vec4(0.0, 0.0, 0.0, mask);\nfloat snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\nvec2 tangent = vec2(-sin(snapAngle), cos(snapAngle));\nvec3 col = sampleZoneColor(tex, uv, nearVec, px,\nminD, zoneWidth, maxDepth,\nblackThreshold, whiteThreshold);\nfloat zoneNum = floor(minD / zoneWidth);\nfloat isEven = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\nfloat zoneIdx = mod(zoneNum, 4.0);\nfloat speedMul;\nif (zoneIdx < 0.5) speedMul = 1.0;\nelse if (zoneIdx < 1.5) speedMul = -1.4;\nelse if (zoneIdx < 2.5) speedMul = 1.2;\nelse speedMul = -0.9;\nspeedMul *= isEven > 0.5 ? -1.0 : 1.0;\nvec2 uvPx = uv * vec2(1000.0, 1000.0 / aspect);\nfloat along = dot(uvPx, tangent);\nfloat phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\nfloat headSize = 0.04;\nif (phase < headSize) {\ncol = mix(col, vec3(1.0), 0.95);\n} else if (phase < headSize + trailLength) {\nfloat t = (phase - headSize) / trailLength;\ncol = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n}\nvec3 finalColor = col * mask + vec3(1.0) * border * borderBright;\nreturn vec4(clamp(finalColor, 0.0, 1.0), clamp(mask + border, 0.0, 1.0));\n}",
    uniformValues: {
          "zoneWidth": 6.53,
          "edgeWidth": 2.9,
          "maxDepth": 200,
          "blackThreshold": 0.2523,
          "whiteThreshold": 0.99,
          "trailSpeed": 200,
          "trailLength": 0.794,
          "trailDistance": 80,
          "scanSpeed": 0.88,
          "rangeWidth": 0.99,
          "edgeSoftness": 0.39022,
          "borderSoftness": 0.62038,
          "borderBright": 0,
          "symmetrical": 0.97
    }
  },
  {
    id: "timeline-c4abbedd-0e5c-44e1-8ac8-428e1cf7a1ff",
    name: "Zone Fractal + Hue Scanner",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Zone Fractal + Hue Scanner\nuniform float zoneWidth; // @min 1.0 @max 80.0 @default 15.0\nuniform float edgeWidth; // @min 0.0 @max 10.0 @default 1.5\nuniform float maxDepth; // @min 10.0 @max 200.0 @default 100.0\nuniform float blackThreshold; // @min 0.03 @max 0.6 @default 0.18\nuniform float whiteThreshold; // @min 0.4 @max 0.99 @default 0.85\nuniform float trailSpeed; // @min 0.0 @max 200.0 @default 50.0\nuniform float trailLength; // @min 0.01 @max 0.99 @default 0.65\nuniform float trailDistance; // @min 1.0 @max 80.0 @default 15.0\nuniform float scanSpeed; // @min -2.0 @max 2.0 @default 0.4\nuniform float rangeWidth; // @min 0.0 @max 1.0 @default 0.25\nuniform float edgeSoftness; // @min 0.001 @max 0.5 @default 0.06\nuniform float borderSoftness; // @min 0.001 @max 1.0 @default 0.15\nuniform float borderBright; // @min 0.0 @max 2.0 @default 1.2\nuniform float symmetrical; // @min 0.0 @max 1.0 @default 1.0\nvec3 rgb2hsv(vec3 c) {\nvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\nvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\nvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\nfloat d = q.x - min(q.w, q.y);\nfloat e = 1.0e-10;\nreturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\nbool isEdgePixel(vec4 sp, float blackT, float whiteT) {\nreturn sp.a < 0.3\n|| (sp.r < blackT && sp.g < blackT && sp.b < blackT)\n|| (sp.r > whiteT && sp.g > whiteT && sp.b > whiteT);\n}\nfloat marchRay(sampler2D tex, vec2 uv, vec2 dir, vec2 px,\nfloat minD, float blackT, float whiteT,\ninout vec2 nearVec) {\nfor (int j = 11; j <= 100; j++) {\nfloat fj = float(j);\nif (fj >= minD) break;\nvec2 s = uv + dir * px * fj;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\nif (isEdgePixel(texture2D(tex, s), blackT, whiteT)) {\nif (fj < minD) { minD = fj; nearVec = dir; }\nbreak;\n}\n}\nreturn minD;\n}\nvec3 sampleZoneColor(sampler2D tex, vec2 uv,\nvec2 nearVec, vec2 px,\nfloat minD, float zoneW, float maxD,\nfloat blackT, float whiteT) {\nfloat zoneCenter = (floor(minD / zoneW) + 0.5) * zoneW;\nvec2 anchorUV = uv + nearVec * px * (minD - zoneCenter);\nvec3 accum = vec3(0.0);\nfloat weight = 0.0;\nfor (int dy = -1; dy <= 1; dy++) {\nfor (int dx = -1; dx <= 1; dx++) {\nvec2 s = anchorUV + vec2(float(dx), float(dy)) * px * 1.5;\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) continue;\nvec4 sc = texture2D(tex, s);\nif (isEdgePixel(sc, blackT, whiteT)) continue;\nif (sc.r < blackT && sc.g < blackT && sc.b < blackT && sc.a > 0.3) continue;\naccum += sc.rgb;\nweight += 1.0;\n}\n}\nvec3 col = (weight > 0.0) ? accum / weight : vec3(0.3);\nfloat depthFade = 1.0 - (zoneCenter / maxD) * 0.6;\ncol *= depthFade * 0.65;\nreturn col;\n}\nvec2 hueScanMask(sampler2D tex, vec2 uv, float time) {\nvec2 maskUV = uv;\nif (symmetrical > 0.5)\nmaskUV.x = uv.x > 0.5 ? 1.0 - uv.x : uv.x;\nvec4 src = texture2D(tex, maskUV);\nvec3 hsv = rgb2hsv(src.rgb);\nfloat targetHue = fract(time * scanSpeed);\nfloat dist = abs(fract(hsv.x - targetHue + 0.5) - 0.5);\nfloat mask = smoothstep(rangeWidth * 0.5 + edgeSoftness, rangeWidth * 0.5, dist);\nfloat border = smoothstep(borderSoftness, 0.0, abs(dist - rangeWidth * 0.5));\nreturn vec2(mask, border);\n}\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec4 src = texture2D(tex, uv);\nbool srcIsBlack = src.r < blackThreshold && src.g < blackThreshold && src.b < blackThreshold && src.a > 0.3;\nbool srcIsBg = src.r > whiteThreshold && src.g > whiteThreshold && src.b > whiteThreshold;\nbool srcIsShape = src.a > 0.3 && !srcIsBlack && !srcIsBg;\nif (srcIsBlack) return vec4(0.0, 0.0, 0.0, 1.0);\nif (srcIsBg || !srcIsShape) return vec4(0.0, 0.0, 0.0, 0.0);\nvec2 mb = hueScanMask(tex, uv, time);\nfloat mask = mb.x;\nfloat border = mb.y;\nif (mask <= 0.0 && border <= 0.0) return vec4(0.0, 0.0, 0.0, 0.0);\nfloat aspect = resolution.x / resolution.y;\nvec2 px = vec2(0.001, 0.001 * aspect);\nfloat minD = maxDepth;\nvec2 nearVec = vec2(1.0, 0.0);\nfor (int dy = -10; dy <= 10; dy++) {\nfor (int dx = -10; dx <= 10; dx++) {\nfloat fdx = float(dx), fdy = float(dy);\nfloat d2 = fdx*fdx + fdy*fdy;\nif (d2 < 0.5 || d2 > 100.5) continue;\nvec2 s = uv + vec2(fdx, fdy) * px;\nfloat nd = sqrt(d2);\nif (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) {\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\ncontinue;\n}\nif (isEdgePixel(texture2D(tex, s), blackThreshold, whiteThreshold))\nif (nd < minD) { minD = nd; nearVec = normalize(vec2(fdx, fdy)); }\n}\n}\nif (minD > 10.0) {\nminD = marchRay(tex, uv, vec2( 1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000, 1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951, 0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827, 0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556, 0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071, 0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315, 0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239, 0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808, 0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-1.0000, 0.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2(-0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.0000,-1.0000), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.1951,-0.9808), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.3827,-0.9239), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.5556,-0.8315), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.7071,-0.7071), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.8315,-0.5556), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9239,-0.3827), px, minD, blackThreshold, whiteThreshold, nearVec);\nminD = marchRay(tex, uv, vec2( 0.9808,-0.1951), px, minD, blackThreshold, whiteThreshold, nearVec);\n}\nfloat depFrac = mod(minD, zoneWidth);\nif (depFrac < edgeWidth || depFrac > zoneWidth - edgeWidth)\nreturn vec4(0.0, 0.0, 0.0, mask);\nfloat snapAngle = floor(atan(nearVec.y, nearVec.x) / 0.7854 + 0.5) * 0.7854;\nvec2 tangent = vec2(-sin(snapAngle), cos(snapAngle));\nvec3 col = sampleZoneColor(tex, uv, nearVec, px,\nminD, zoneWidth, maxDepth,\nblackThreshold, whiteThreshold);\nfloat zoneNum = floor(minD / zoneWidth);\nfloat isEven = mod(zoneNum, 2.0) < 0.5 ? 1.0 : 0.0;\nfloat zoneIdx = mod(zoneNum, 4.0);\nfloat speedMul;\nif (zoneIdx < 0.5) speedMul = 1.0;\nelse if (zoneIdx < 1.5) speedMul = -1.4;\nelse if (zoneIdx < 2.5) speedMul = 1.2;\nelse speedMul = -0.9;\nspeedMul *= isEven > 0.5 ? -1.0 : 1.0;\nvec2 uvPx = uv * vec2(1000.0, 1000.0 / aspect);\nfloat along = dot(uvPx, tangent);\nfloat phase = fract((along + time * trailSpeed * speedMul) / trailDistance);\nfloat headSize = 0.04;\nif (phase < headSize) {\ncol = mix(col, vec3(1.0), 0.95);\n} else if (phase < headSize + trailLength) {\nfloat t = (phase - headSize) / trailLength;\ncol = mix(col, vec3(1.0), 0.88 * (1.0 - t * t));\n}\nvec3 finalColor = col * mask + vec3(1.0) * border * borderBright;\nreturn vec4(clamp(finalColor, 0.0, 1.0), clamp(mask + border, 0.0, 1.0));\n}",
    uniformValues: {
          "zoneWidth": 17.59,
          "edgeWidth": 3,
          "maxDepth": 200,
          "blackThreshold": 0.2523,
          "whiteThreshold": 0.8897,
          "trailSpeed": 44,
          "trailLength": 0.794,
          "trailDistance": 80,
          "scanSpeed": 0.88,
          "rangeWidth": 0.99,
          "edgeSoftness": 0.39022,
          "borderSoftness": 0.62038,
          "borderBright": 0,
          "symmetrical": 0.01
    }
  },
  {
    id: "timeline-ef3d8260-b816-45d9-a448-0ae7fe0d8f70",
    name: "Zooming Grid Blob Wiggle",
    template: "sculpture",
    group: "Imported",
    description: "Imported from Mondadori Profile 1 Statue project.",
    code: "// NAME: Zooming Grid Blob Wiggle\nuniform float edgeThreshold; // @min 0.0 @max 2.0 @default 0.2\nuniform float edgeSoftness; // @min 0.01 @max 1.0 @default 0.3\nuniform float tintAmount; // @min 0.0 @max 1.0 @default 0.85\nuniform float edgeWidth; // @min 0.5 @max 5.0 @default 1.0\nuniform float darkThreshold; // @min 0.0 @max 1.0 @default 0.2\nuniform float wiggleAmp; // @min 0.0 @max 0.1 @default 0.01\nuniform float wiggleFreq; // @min 1.0 @max 50.0 @default 15.0\nuniform float wiggleSpeed; // @min 0.0 @max 10.0 @default 3.0\nuniform float blobRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobSoftness; // @min 0.01 @max 1.0 @default 0.2\nuniform float blobMoveRadius; // @min 0.0 @max 1.0 @default 0.2\nuniform float blobMoveSpeed; // @min 0.0 @max 10.0 @default 2.0\nuniform vec3 blobColor; // @default 0.0,0.0,0.0\nuniform float gridScale; // @min 10.0 @max 500.0 @default 200.0\nuniform float gridIntensity; // @min 0.0 @max 1.0 @default 0.6\nuniform float gridSpeed; // @min 0.0 @max 5.0 @default 0.5\nuniform float gridDistortion; // @min 0.0 @max 0.5 @default 0.05\nvec4 processColor(sampler2D tex, vec2 uv, float time, vec2 resolution) {\nvec2 texel = edgeWidth / resolution;\nvec4 c = texture2D(tex, uv);\nvec2 symUv = vec2(abs(uv.x - 0.5), uv.y - 0.5);\nvec2 wiggleOffset = vec2(\nsin(symUv.y * wiggleFreq + time * wiggleSpeed),\ncos(symUv.x * wiggleFreq + time * wiggleSpeed)\n) * wiggleAmp;\nif (uv.x > 0.5) wiggleOffset.x = -wiggleOffset.x;\nvec2 wUv = uv + wiggleOffset;\nvec4 wc = texture2D(tex, wUv);\nvec4 n = texture2D(tex, wUv + vec2(0.0, texel.y));\nvec4 s = texture2D(tex, wUv - vec2(0.0, texel.y));\nvec4 e = texture2D(tex, wUv + vec2(texel.x, 0.0));\nvec4 w = texture2D(tex, wUv - vec2(texel.x, 0.0));\nvec4 diff = abs(wc - n) + abs(wc - s) + abs(wc - e) + abs(wc - w);\nfloat edge = length(diff.rgb) + diff.a;\nfloat isEdge = smoothstep(edgeThreshold, edgeThreshold + edgeSoftness, edge);\nfloat lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\nfloat darkFactor = smoothstep(0.0, darkThreshold, lum);\nfloat strobo = step(0.5, fract(time * 15.0));\nvec3 psychColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.7, 0.0, 1.0), strobo);\nfloat swirl = sin(uv.x * 15.0 + time * 5.0) * cos(uv.y * 15.0 - time * 4.0);\npsychColor = clamp(psychColor + swirl * 0.3, 0.0, 1.0);\nvec4 tinted = mix(c, vec4(psychColor, c.a), tintAmount * darkFactor);\nvec2 aspectUv = symUv * vec2(resolution.x / resolution.y, 1.0);\nvec2 blobCenter = vec2(0.25 * (resolution.x / resolution.y), 0.0) + vec2(cos(time * blobMoveSpeed), sin(time * blobMoveSpeed)) * blobMoveRadius;\nfloat dist = distance(aspectUv, blobCenter);\nfloat blob = smoothstep(blobRadius, blobRadius + blobSoftness, dist);\ntinted.rgb = mix(blobColor, tinted.rgb, blob);\nvec4 finalColor = mix(tinted, wc, isEdge);\nfloat zoom = 1.0 + 0.6 * sin(time * 1.5);\nvec2 gridUv = vec2(abs(uv.x - 0.5), uv.y);\ngridUv = (gridUv - vec2(0.25, 0.5)) * zoom + vec2(0.25, 0.5);\ngridUv.y -= time * gridSpeed;\ngridUv += vec2(sin(gridUv.y * 15.0 + time), cos(gridUv.x * 15.0 + time)) * gridDistortion;\nfloat gridX = sin(gridUv.x * gridScale);\nfloat gridY = sin(gridUv.y * gridScale);\nfloat dots = (gridX * gridY) * 0.5 + 0.5;\nfloat dotSize = 0.5 + 0.45 * sin(time * 3.0);\nfloat moire = smoothstep(1.0 - dotSize, 1.0 - dotSize + 0.1, dots);\nfloat mask = mix(1.0 - gridIntensity, 1.0 + gridIntensity, moire);\nfinalColor.rgb *= mask;\nreturn finalColor;\n}",
    uniformValues: {
          "edgeThreshold": 2,
          "edgeSoftness": 0.01,
          "tintAmount": 0.64,
          "edgeWidth": 0.95,
          "darkThreshold": 1,
          "wiggleAmp": 0,
          "wiggleFreq": 1,
          "wiggleSpeed": 0,
          "blobRadius": 0.63,
          "blobSoftness": 0.5743,
          "blobMoveRadius": 0.86,
          "blobMoveSpeed": 6.8,
          "blobColor": [
                0,
                0,
                0
          ],
          "gridScale": 200,
          "gridIntensity": 0.6,
          "gridSpeed": 0.5,
          "gridDistortion": 0.05
    }
  }
];
