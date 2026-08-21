import * as THREE from 'three'

/**
 * AAA Dual-Material Road Surface Shader (Standard-Asphalt vs. GRAUZIT 50/50)
 * - Beide Materialsysteme in EINEM Shader, getrennt durch mittige Trennlinie (x = 0)
 * - CIE 144 Klasse A Photometrie mit kristalliner Quarz-Retroreflexion
 * - Ausgewogene HDR-Luminanz: Reiche Texturdetails in beiden Spuren bei Tag & Nacht
 * - Wärmebild-Modus (uThermal) mit Ironbow-Palette
 */

export const RoadShader = {
  uniforms: {
    // Standard-Asphalt Textursatz
    uAlbedoStd: { value: null as THREE.Texture | null },
    uNormalStd: { value: null as THREE.Texture | null },
    uRoughStd: { value: null as THREE.Texture | null },
    // GRAUZIT Textursatz
    uAlbedoGz: { value: null as THREE.Texture | null },
    uNormalGz: { value: null as THREE.Texture | null },
    uRoughGz: { value: null as THREE.Texture | null },

    uSplitX: { value: 0.0 },
    uThermal: { value: 0.0 },
    uTiling: { value: new THREE.Vector2(3.2, 6.8) },

    uRain: { value: 0.0 },
    uDaylight: { value: 1.0 },
    uFog: { value: 0.0 },
    uFogColor: { value: new THREE.Color('#08080c') },
    uTime: { value: 0.0 },
    uHeadlightPos1: { value: new THREE.Vector3(-0.675, 0.65, 3.3) },
    uHeadlightPos2: { value: new THREE.Vector3(0.675, 0.65, 3.3) },
    uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffffff') },
    uSunIntensity: { value: 1.0 },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewDirection = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: `
    uniform sampler2D uAlbedoStd;
    uniform sampler2D uNormalStd;
    uniform sampler2D uRoughStd; // R=Roughness, G=Makro-Höhe
    uniform sampler2D uAlbedoGz;
    uniform sampler2D uNormalGz;
    uniform sampler2D uRoughGz;

    uniform float uSplitX;
    uniform float uThermal;
    uniform vec2 uTiling;

    uniform float uRain;
    uniform float uDaylight;
    uniform float uFog;
    uniform vec3 uFogColor;
    uniform float uTime;
    uniform vec3 uHeadlightPos1;
    uniform vec3 uHeadlightPos2;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    #define PI 3.14159265359

    // Anti-Aliased Regen-Ripples in Weltkoordinaten
    vec3 getRainRipples(vec2 wp, float time, float intensity) {
      if (intensity < 0.005) return vec3(0.0, 1.0, 0.0);

      vec2 p = wp * 4.5;
      float t = time * 3.5;

      float w1 = sin(p.x + t) * cos(p.y + t * 0.8);
      float w2 = sin(p.x * 1.5 - t * 1.2) * cos(p.y * 1.4 + t);

      vec2 bump = vec2(
        (w1 * 0.035 + w2 * 0.02) * intensity,
        (w1 * 0.03 - w2 * 0.02) * intensity
      );

      return normalize(vec3(bump.x, 1.0, bump.y));
    }

    // PBR: GGX Normal Distribution Function
    float D_GGX(float NoH, float roughness) {
      float a = NoH * roughness;
      float k = roughness / (1.0 - NoH * NoH + a * a);
      return k * k * (1.0 / PI);
    }

    // PBR: Smith Joint GGX Visibility
    float V_SmithGGXCorrelated(float NoV, float NoL, float roughness) {
      float a2 = roughness * roughness;
      float GGXV = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
      float GGXL = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
      return 0.5 / (GGXV + GGXL + 0.0001);
    }

    // PBR: Schlick Fresnel
    vec3 F_Schlick(float cosTheta, vec3 F0) {
      return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
    }

    // Studio-Umgebung: Overhead-Softbox & Bühnenreflexion für Pfützenspiegelung
    vec3 getStudioReflection(vec3 reflDir) {
      float upFactor = max(0.0, reflDir.y);
      vec3 studioBase = mix(vec3(0.03, 0.035, 0.045), vec3(0.18, 0.22, 0.28), pow(upFactor, 2.2));

      float mainSoftbox = smoothstep(0.62, 0.98, reflDir.y) * smoothstep(0.72, 0.0, abs(reflDir.x));
      float fillSoftbox = smoothstep(0.38, 0.85, reflDir.y) * smoothstep(0.85, 0.2, abs(reflDir.z));

      vec3 softboxGlow = vec3(1.1, 1.15, 1.2) * (mainSoftbox * 2.2 + fillSoftbox * 0.8);
      return (studioBase + softboxGlow) * mix(0.20, 1.0, uDaylight);
    }

    // Standard-PBR-Lichtberechnung
    vec3 calcPBR(vec3 lightDir, vec3 lightColor, vec3 normal, vec3 viewDir, vec3 albedo, float roughness, vec3 F0) {
      vec3 halfVec = normalize(viewDir + lightDir);
      float NoL = clamp(dot(normal, lightDir), 0.0, 1.0);
      float NoV = clamp(dot(normal, viewDir), 0.0, 1.0);
      float NoH = clamp(dot(normal, halfVec), 0.0, 1.0);
      float VoH = clamp(dot(viewDir, halfVec), 0.0, 1.0);

      if (NoL <= 0.0) return vec3(0.0);

      float D = D_GGX(NoH, roughness);
      float V = V_SmithGGXCorrelated(NoV, NoL, roughness);
      vec3 F = F_Schlick(VoH, F0);
      vec3 specular = (D * V) * F;
      vec3 diffuse = albedo * (1.0 / PI) * (vec3(1.0) - F);

      return (diffuse + specular) * lightColor * NoL;
    }

    // Photometrischer Abblendlicht-Beam (ECE R149) mit CIE-144-Retroreflexion
    vec3 calcHeadlightPBR(vec3 hPos, vec3 pNormal, vec3 viewDir, vec3 albedo, float roughness, vec3 F0, float isPuddle, float isGz) {
      vec3 lightVec = hPos - vWorldPosition;
      float dist = length(lightVec);
      vec3 lightDir = lightVec / dist; // Vom Punkt zur Lampe

      // Scheinwerfer-Hauptachse: Strahlung nach vorne (-Z) und leicht nach unten
      vec3 beamAim = normalize(vec3(0.0, -0.12, -1.0));
      vec3 rayFromLamp = -lightDir;
      float cosAngle = dot(rayFromLamp, beamAim);

      // Weicher ECE-R149-Kegelabfall
      float spotFactor = smoothstep(0.40, 0.96, cosAngle);
      float atten = (1.0 / (1.0 + 0.08 * dist + 0.015 * dist * dist)) * spotFactor;

      vec3 brdf = calcPBR(lightDir, vec3(1.0), pNormal, viewDir, albedo, roughness, F0);

      // Diffuse Retroreflexion (CIE 144):
      // GRAUZIT streut ~45% mehr Licht diffus zum Fahrer zurück (q0 = 0.113 vs 0.082).
      // Bei Nässe bleibt GRAUZIT erhalten (1.25), während Standard-Asphalt zum dunklen Spiegel wird (0.38).
      float retroScatter = mix(
        mix(1.0, 0.38, isPuddle),
        mix(1.48, 1.25, isPuddle),
        isGz
      );

      // Subtiles kristallines Glitzern der Quarzit-Kanten
      vec3 halfVec = normalize(viewDir + lightDir);
      float glint = isGz * pow(max(0.0, dot(pNormal, halfVec)), 28.0) * (1.0 - isPuddle * 0.4) * 0.20;

      return (brdf * retroScatter + glint * vec3(1.0, 0.98, 0.95)) * atten * 18.0 * vec3(1.0, 0.98, 0.95);
    }

    // Thermografie-Palette (Turbo-Stil)
    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 col = mix(vec3(0.05, 0.04, 0.35), vec3(0.02, 0.55, 0.85), smoothstep(0.0, 0.30, t));
      col = mix(col, vec3(0.15, 0.75, 0.25), smoothstep(0.30, 0.50, t));
      col = mix(col, vec3(0.95, 0.85, 0.10), smoothstep(0.50, 0.72, t));
      col = mix(col, vec3(0.95, 0.30, 0.05), smoothstep(0.72, 0.90, t));
      col = mix(col, vec3(0.55, 0.05, 0.05), smoothstep(0.90, 1.0, t));
      return col;
    }

    void main() {
      // 0. MATERIALZONE: rechts der Trennlinie (x > 0) liegt GRAUZIT
      float isGz = smoothstep(uSplitX - 0.012, uSplitX + 0.012, vWorldPosition.x);

      // 1. ANISOTROPES UV-MAPPING mit Welt-Warp
      vec2 uvWarp = vec2(
        sin(vWorldPosition.z * 0.8 + vWorldPosition.x * 1.3),
        cos(vWorldPosition.x * 1.1 - vWorldPosition.z * 0.7)
      ) * 0.004;
      vec2 tileUv = (vUv + uvWarp) * uTiling;

      vec4 albedoTex = mix(texture2D(uAlbedoStd, tileUv), texture2D(uAlbedoGz, tileUv), isGz);
      vec3 stoneNormal = mix(texture2D(uNormalStd, tileUv).rgb, texture2D(uNormalGz, tileUv).rgb, isGz) * 2.0 - 1.0;
      vec4 roughHeightTex = mix(texture2D(uRoughStd, tileUv), texture2D(uRoughGz, tileUv), isGz);

      // DETAIL-LAYER (Dual-Scale für Makro-Schärfe)
      vec2 detailUv = tileUv * 3.73;
      vec4 albedoDet = mix(texture2D(uAlbedoStd, detailUv), texture2D(uAlbedoGz, detailUv), isGz);
      vec3 normalDet = mix(texture2D(uNormalStd, detailUv).rgb, texture2D(uNormalGz, detailUv).rgb, isGz) * 2.0 - 1.0;
      albedoTex.rgb = albedoTex.rgb * 0.65 + albedoDet.rgb * 0.35;
      stoneNormal = normalize(stoneNormal + normalDet * 0.60);

      float stoneRoughness = roughHeightTex.r;
      float macroHeight = roughHeightTex.g;

      // 2. ROLLSPUREN-PATINA
      float laneTrackLeft = exp(-pow((vUv.x - 0.24) / 0.10, 2.0));
      float laneTrackRight = exp(-pow((vUv.x - 0.76) / 0.10, 2.0));
      float rollspuren = (laneTrackLeft + laneTrackRight) * 0.04;
      float wearModulation = 1.0 - rollspuren;

      // 3. MAKRO-VARIATION
      float macroClustering = sin(vWorldPosition.x * 1.4 + sin(vWorldPosition.z * 0.9) * 1.4) * cos(vWorldPosition.z * 1.1);
      float macroLuminance = (1.0 + macroClustering * 0.05) * wearModulation;

      // 4. PROGRESSIVE MIKRO-HYDROLOGIE (Wasser in Zwischenräumen)
      float waterDepth = uRain * 1.35;
      float isPuddle = clamp((waterDepth - macroHeight * 0.75) / 0.9, 0.0, 1.0);

      vec3 waterNormal = getRainRipples(vWorldPosition.xz, uTime, uRain);
      vec3 stoneWorldNormal = normalize(vWorldNormal + vec3(stoneNormal.x, 0.0, stoneNormal.y) * (1.0 - isPuddle * 0.85));
      vec3 finalNormal = normalize(mix(stoneWorldNormal, waterNormal, isPuddle * uRain * 0.9));

      // 5. OPTISCHE WASSER-VERDUNKELUNG (CIE 144)
      float stdDarkening = 1.0 - uRain * 0.46;
      float gzDarkening = 1.0 - uRain * 0.10;
      float wetAlbedoFactor = mix(stdDarkening, gzDarkening, isGz);

      vec3 finalAlbedo = albedoTex.rgb * wetAlbedoFactor * macroLuminance;

      // 6. KONTINUIERLICHE ROUGHNESS & FRESNEL
      float dryRoughness = stoneRoughness * stoneRoughness;
      float finalRoughness = mix(dryRoughness, 0.02, clamp(uRain * 0.65 + isPuddle * 0.35, 0.0, 0.98));

      vec3 F0_stone = vec3(0.04);
      vec3 F0_water = vec3(0.02);
      vec3 finalF0 = mix(F0_stone, F0_water, isPuddle);

      // 7. SONNE & STUDIO-LICHT (GGX PBR)
      vec3 sunBRDF = calcPBR(uSunDirection, uSunColor * uSunIntensity, finalNormal, vViewDirection, finalAlbedo, finalRoughness, finalF0);

      // Ausgewogenes Ambiente bei Tag und Nacht
      float ambientFactor = mix(0.14, 0.45, uDaylight);
      vec3 ambientDiffuse = finalAlbedo * ambientFactor * (1.0 / PI);

      // 8. AUTOMATISCHES ABBLENDLICHT (linearer Fade unter Daylight 0.55)
      float autoHeadlight = clamp((0.55 - uDaylight) / 0.55, 0.0, 1.0);
      vec3 headlightTotal = vec3(0.0);

      if (autoHeadlight > 0.001) {
        vec3 h1 = calcHeadlightPBR(uHeadlightPos1, finalNormal, vViewDirection, finalAlbedo, finalRoughness, finalF0, isPuddle, isGz);
        vec3 h2 = calcHeadlightPBR(uHeadlightPos2, finalNormal, vViewDirection, finalAlbedo, finalRoughness, finalF0, isPuddle, isGz);
        headlightTotal = (h1 + h2) * autoHeadlight;
      }

      // 9. UMGEBUNGS- & PFÜTZENREFLEXION
      vec3 reflVec = reflect(-vViewDirection, finalNormal);
      vec3 envReflection = getStudioReflection(reflVec);
      float NoV = clamp(dot(finalNormal, vViewDirection), 0.0, 1.0);
      vec3 fresnelEnv = F_Schlick(NoV, finalF0);
      vec3 puddleReflection = envReflection * fresnelEnv * isPuddle * (1.0 - finalRoughness);

      // Splitt-Zwischenraum-Selbstverschattung
      float creviceAO = mix(0.75 + 0.25 * macroHeight, 1.0, isPuddle);

      vec3 finalColor = (ambientDiffuse * creviceAO) + sunBRDF + headlightTotal + puddleReflection;

      // 10. ATMOSPHÄRISCHER NEBEL & STREUUNG
      if (uFog > 0.005) {
        float distToCam = length(cameraPosition - vWorldPosition);
        float fogFactor = 1.0 - exp(-pow(distToCam * uFog * 0.18, 1.6));
        finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 0.96));
      }

      // 11. WÄRMEBILD-MODUS (Ironbow)
      if (uThermal > 0.001) {
        float tempC = mix(mix(48.0, 34.2, isGz), 15.5, 1.0 - uDaylight);
        tempC -= uRain * 6.0;
        tempC += macroClustering * 0.8 + (macroHeight - 0.5) * 1.5;
        float tn = clamp((tempC - 8.0) / 48.0, 0.0, 1.0);
        vec3 thermalCol = ironbow(tn);
        finalColor = mix(finalColor, thermalCol, uThermal);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

/**
 * Authentischer Thermoplastik-Markierungsshader (DIN EN 1436 / ZTV M 13)
 * - Weisse, mikroporöse Fahrbahnmarkierung
 * - Kristalline Reflexperlen-Retroreflexion (DIN EN 1436 RL-Klasse)
 * - Reflektiert und strahlt bei Tageslicht, Scheinwerfern und aus allen Blickwinkeln
 */
export const RoadMarkingShader = {
  uniforms: {
    uColor: { value: new THREE.Color('#e8edf2') },
    uDaylight: { value: 1.0 },
    uRain: { value: 0.0 },
    uFog: { value: 0.0 },
    uFogColor: { value: new THREE.Color('#08080c') },
    uThermal: { value: 0.0 },
    uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffffff') },
    uSunIntensity: { value: 1.0 },
    uHeadlightPos1: { value: new THREE.Vector3(-0.675, 0.65, 3.3) },
    uHeadlightPos2: { value: new THREE.Vector3(0.675, 0.65, 3.3) },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewDirection = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: `
    uniform vec3 uColor;
    uniform float uDaylight;
    uniform float uRain;
    uniform float uFog;
    uniform vec3 uFogColor;
    uniform float uThermal;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;
    uniform vec3 uHeadlightPos1;
    uniform vec3 uHeadlightPos2;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    #define PI 3.14159265359

    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 col = mix(vec3(0.05, 0.04, 0.35), vec3(0.02, 0.55, 0.85), smoothstep(0.0, 0.30, t));
      col = mix(col, vec3(0.15, 0.75, 0.25), smoothstep(0.30, 0.50, t));
      col = mix(col, vec3(0.95, 0.85, 0.10), smoothstep(0.50, 0.72, t));
      col = mix(col, vec3(0.95, 0.30, 0.05), smoothstep(0.72, 0.90, t));
      col = mix(col, vec3(0.55, 0.05, 0.05), smoothstep(0.90, 1.0, t));
      return col;
    }

    void main() {
      // 1. KREIDIG-PORÖSE MIKROTEXTUR (Heißplastik mit Reflexperlen nach DIN EN 1436)
      float grain = sin(vWorldPosition.x * 220.0) * cos(vWorldPosition.z * 220.0) * 0.025;
      vec3 paintBase = clamp(uColor + vec3(grain), 0.0, 1.0);

      // 2. DIFFUSE SONNENSTREUUNG AM TAG
      float NoL_sun = clamp(dot(vWorldNormal, uSunDirection), 0.0, 1.0);
      vec3 sunDiffuse = paintBase * (uSunColor * uSunIntensity) * NoL_sun * (1.0 / PI);

      // 3. AMBIENTE STREUUNG (garantiert Grundsichtbarkeit in jeder Lichtphase)
      float ambientFactor = mix(0.18, 0.48, uDaylight);
      vec3 ambientDiffuse = paintBase * ambientFactor * (1.0 / PI);

      // 4. RETROREFLEKTIERENDE GLASPERLEN (DIN EN 1436 / ECE R149)
      float autoHeadlight = clamp((0.55 - uDaylight) / 0.55, 0.0, 1.0);
      vec3 headlightTotal = vec3(0.0);

      if (autoHeadlight > 0.001) {
        vec3 beamAim = normalize(vec3(0.0, -0.12, -1.0));

        // Scheinwerfer 1
        vec3 lVec1 = uHeadlightPos1 - vWorldPosition;
        float d1 = length(lVec1);
        vec3 lDir1 = lVec1 / d1; // Vom Punkt zur Lampe
        float spot1 = smoothstep(0.38, 0.96, dot(-lDir1, beamAim));
        float atten1 = (1.0 / (1.0 + 0.08 * d1 + 0.015 * d1 * d1)) * spot1;
        float NoL1 = clamp(dot(vWorldNormal, lDir1), 0.0, 1.0);
        float retro1 = clamp(dot(vViewDirection, lDir1), 0.0, 1.0);
        vec3 h1 = paintBase * (atten1 * 20.0) * (NoL1 * (1.0 / PI) + pow(retro1, 4.0) * 3.4 + 0.25);

        // Scheinwerfer 2
        vec3 lVec2 = uHeadlightPos2 - vWorldPosition;
        float d2 = length(lVec2);
        vec3 lDir2 = lVec2 / d2;
        float spot2 = smoothstep(0.38, 0.96, dot(-lDir2, beamAim));
        float atten2 = (1.0 / (1.0 + 0.08 * d2 + 0.015 * d2 * d2)) * spot2;
        float NoL2 = clamp(dot(vWorldNormal, lDir2), 0.0, 1.0);
        float retro2 = clamp(dot(vViewDirection, lDir2), 0.0, 1.0);
        vec3 h2 = paintBase * (atten2 * 20.0) * (NoL2 * (1.0 / PI) + pow(retro2, 4.0) * 3.4 + 0.25);

        headlightTotal = (h1 + h2) * autoHeadlight;
      }

      float wetRetention = 1.0 - uRain * 0.18;
      vec3 finalColor = (ambientDiffuse + sunDiffuse + headlightTotal) * wetRetention;

      if (uFog > 0.005) {
        float distToCam = length(cameraPosition - vWorldPosition);
        float fogFactor = 1.0 - exp(-pow(distToCam * uFog * 0.18, 1.6));
        finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 0.96));
      }

      // Wärmebild-Modus
      if (uThermal > 0.001) {
        float tempC = mix(32.0, 15.0, 1.0 - uDaylight) - uRain * 6.0;
        float tn = clamp((tempC - 8.0) / 48.0, 0.0, 1.0);
        finalColor = mix(finalColor, ironbow(tn), uThermal);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}
