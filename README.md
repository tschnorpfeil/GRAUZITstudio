# GRAUZIT® Experience

Interaktive 3D-Demo für potenzielle Kunden: **Standard-Asphalt gegen GRAUZIT® 50/50
Edelsplitt** im direkten Vergleich auf einer 40-Meter-Fahrbahn — bei Tag, Nacht,
Starkregen und im Wärmebild.

## Features

- **Geführte Demo (6 Kapitel)** — cinematische Kamerafahrten mit den zentralen
  Nutzenargumenten: Leuchtdichte (+38 %), Urban-Heat-Island (−13,8 °C), Material
  (PSV ≥ 58, −2,0 dB(A)), Nacht-Rückstreuung (+340 %) und das Sicherheits-Finale
  bei Nacht & Regen.
- **Frei ziehbare Vergleichslinie** — die goldene Linie lässt sich direkt im 3D
  (oder per Regler) über die Fahrbahn ziehen: der Kunde „streicht" die Straße
  selbst mit GRAUZIT ein.
- **Fußgänger-Szenario** — identische Personen auf beiden Fahrstreifen; bei
  Nacht/Regen hebt sich die Silhouette nur auf GRAUZIT vom hellen Belag ab.
- **Wärmebild-Modus** — simulierte Thermografie (Turbo-Palette) zeigt den
  Klimavorteil des hellen Belags.
- **Live-Vergleichspanel** — Leuchtdichte q₀, Erkennbarkeitsdistanz und
  Oberflächentemperatur reagieren in Echtzeit auf das Szenario.
- **Kontinuierlicher Szenario-Regler** — Tag → Dämmerung → Nacht → Starkregen,
  plus vier Kamera-Presets (Fahrersicht, Orbit, Vogel, Makro).

## Technik

- React 19 + TypeScript + Vite, Three.js via @react-three/fiber
- Ein gemergter Dual-Material-PBR-Shader (GGX) für die gesamte Fahrbahn —
  Vergleichs-Wipe, Mikro-Hydrologie, Retroreflexion und Wärmebild in einem
  Draw Call, kein Postprocessing
- Prozedural generierte, gecachte PBR-Texturen (Albedo/Normal/Roughness) mit
  Dual-Scale-Detail-Layer
- GPU-Regenpartikel als LineSegments, Sternenhimmel als Points —
  konstant 60+ FPS auch auf integrierten GPUs (dpr-Limit 1.5)

## Entwicklung

```bash
npm ci
npm run dev      # Dev-Server
npm run build    # Typecheck + Produktions-Build
npm run lint     # oxlint
npm run preview  # Build lokal serven
```
