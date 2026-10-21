// Manchas de césped seco y verde, calculadas en coordenadas del mundo para que el suelo
// y las hojas de hierba coincidan. Devuelve 0 = verde, 1 = seco.
export const MANCHAS_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float manchaSeca(vec2 mundo) {
    float n = ruido(mundo * 0.045) * 0.55 + ruido(mundo * 0.18 + 3.1) * 0.3 + ruido(mundo * 0.9 + 7.7) * 0.15;
    return smoothstep(0.36, 0.62, n);
  }
`;
