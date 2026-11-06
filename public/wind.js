// Gentle wind for tree crowns: the higher a vertex, the more it sways; each tree gets its own phase.
// Switched off on phones and small screens to keep them smooth.
export const WIND = { value: 0 };
export const windOn = typeof matchMedia !== 'undefined' && !matchMedia('(pointer: coarse)').matches && innerWidth >= 700;
// from: local height where swaying starts; amp: sway per unit of height; phase: scale from instance position to phase
export function addWind(material, { from = 0.02, amp = 0.05, phase = 30 } = {}) {
  if (!windOn) return material;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wp = instanceMatrix[3].xyz * ${phase.toFixed(1)};
      #else
        vec3 wp = vec3(0.0);
      #endif
      float wh = max(position.y - ${from.toFixed(4)}, 0.0) * ${amp.toFixed(4)};
      transformed.x += sin(uWind * 1.7 + wp.x + wp.z * 0.7) * wh;
      transformed.z += cos(uWind * 1.3 + wp.x * 0.6 + wp.y) * wh * 0.7;`);
  };
  material.customProgramCacheKey = () => 'wind' + from + amp + phase;
  return material;
}
