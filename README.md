# GRAUZIT® Material Studio

Interaktive 3D-Demo für potenzielle Kunden: **Standard-Asphalt gegen GRAUZIT® 50/50
Edelsplitt** im direkten Vergleich auf einer 5-Meter-Musterplatte im Studio —
bei Tag, Nacht, Starkregen und im Wärmebild.

## Features

- **Frei ziehbare Vergleichslinie** — die goldene Linie lässt sich direkt im 3D
  (oder per Regler) über die Platte ziehen: der Kunde „streicht" die Fahrbahn
  selbst mit GRAUZIT ein.
- **Kontinuierlicher Szenario-Regler** — Tag → Dämmerung → Nacht → Starkregen,
  mit automatischem ECE-R149-Abblendlicht bei Nacht.
- **Wärmebild-Modus** — simulierte Thermografie (Turbo-Palette) zeigt den
  Klimavorteil des hellen Belags (−13,8 °C Oberflächentemperatur).
- **Live-Vergleichspanel** — Leuchtdichte q₀, Erkennbarkeitsdistanz und
  Oberflächentemperatur reagieren in Echtzeit auf das Szenario.
- **Vier Kamera-Presets** — Fahrersicht, 3D-Orbit, Vogelperspektive und
  Makro-Splitt-Nahaufnahme, jederzeit frei orbitier- und zoombar.

## Technik

- React 19 + TypeScript + Vite, Three.js via @react-three/fiber
- Ein gemergter Dual-Material-PBR-Shader (GGX) für die gesamte Platte —
  Vergleichs-Wipe, Mikro-Hydrologie, Quarz-Retroreflexion und Wärmebild in
  einem Draw Call, kein Postprocessing
- Prozedural generierte, gecachte PBR-Texturen (Albedo/Normal/Roughness) mit
  Dual-Scale-Detail-Layer für die Makro-Ansicht
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
