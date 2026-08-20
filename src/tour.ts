import type { CameraMode } from './store'

export interface TourStep {
  id: string
  title: string
  body: string
  metric: string
  duration: number // Sekunden
  cond: number // Ziel des Master-Szenarios (0 Tag .. 0.5 Nacht .. 1 Nachtregen)
  thermal: boolean
  obstacles: boolean
  split: number // Ziel der Vergleichslinie
  camMode: CameraMode // für nahtlosen Übergang in den Explore-Modus
  posA: [number, number, number]
  posB: [number, number, number]
  tgt: [number, number, number]
  fov: number
}

/**
 * Die geführte Demo: 6 Kapitel, jedes mit einem klaren Nutzenargument.
 * Dramaturgie: Vergleich aufbauen -> Tages-/Klimavorteil -> Material ->
 * Nacht -> Finale bei Nacht & Regen (Sicherheits-No-Brainer).
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'intro',
    title: 'Eine Straße. Zwei Welten.',
    body:
      'Links: Standard-Asphalt mit dunklem Basaltsplitt. Rechts: GRAUZIT® 50/50 – Edelsplitt aus quarzitischer Grauwacke und hellem Quarzit. Beobachten Sie, wie die goldene Linie den Unterschied freilegt.',
    metric: 'CIE 144 · Helligkeitsklasse A',
    duration: 10,
    cond: 0,
    thermal: false,
    obstacles: false,
    split: 0,
    camMode: 'orbit',
    posA: [-15, 8, 20],
    posB: [-9.5, 5.5, 13],
    tgt: [0, 0, -6],
    fov: 45,
  },
  {
    id: 'day',
    title: '+38 % Leuchtdichte am Tag',
    body:
      'Der helle Quarzit reflektiert Tageslicht diffus: q₀ = 0,113 cd/(m²·lx) statt ≈ 0,082 beim Standardbelag. Straßenräume wirken heller und freundlicher – ganz ohne Blendung.',
    metric: 'q₀ = 0,113 cd/(m²·lx) · Klasse A',
    duration: 9,
    cond: 0,
    thermal: false,
    obstacles: false,
    split: 0,
    camMode: 'top',
    posA: [14, 14, 12],
    posB: [18, 21, 4],
    tgt: [0, 0, -10],
    fov: 45,
  },
  {
    id: 'heat',
    title: '−13,8 °C Oberflächentemperatur',
    body:
      'Im Wärmebild wird der Klimavorteil sichtbar: Dunkler Asphalt heizt sich im Sommer auf bis zu 48 °C auf. GRAUZIT® reflektiert die Sonnenenergie und bleibt bei 34 °C – aktiver Schutz gegen urbane Hitzeinseln.',
    metric: '34,2 °C statt 48,0 °C Oberfläche',
    duration: 9,
    cond: 0,
    thermal: true,
    obstacles: false,
    split: 0,
    camMode: 'orbit',
    posA: [-12, 9, 7],
    posB: [-15, 13, -6],
    tgt: [0, 0, -8],
    fov: 45,
  },
  {
    id: 'macro',
    title: 'Das Gestein macht den Unterschied',
    body:
      '50 % Treis-Kardener Grauwacke, 50 % Henauer Quarzit – gebrochen als Edelsplitt 2/4 mm. Polierresistent mit PSV ≥ 58 für dauerhafte Griffigkeit, lärmmindernd mit −2,0 dB(A) nach RLS-19.',
    metric: 'PSV ≥ 58 · −2,0 dB(A)',
    duration: 9,
    cond: 0,
    thermal: false,
    obstacles: false,
    split: 0,
    camMode: 'macro',
    posA: [3.0, 1.7, 5.6],
    posB: [2.2, 1.1, 4.0],
    tgt: [1.2, 0.0, 1.2],
    fov: 35,
  },
  {
    id: 'night',
    title: '+340 % Rückstreuung bei Nacht',
    body:
      'Die Quarzkristalle wirken wie Millionen Mikro-Reflektoren: Scheinwerferlicht wird diffus zum Fahrer zurückgestreut. Kommunen können Straßenbeleuchtung reduzieren – bei besserer Sicht.',
    metric: 'Beleuchtungsklasse günstiger · Energie gespart',
    duration: 10,
    cond: 0.5,
    thermal: false,
    obstacles: false,
    split: 0,
    camMode: 'driver',
    posA: [0.6, 1.5, 9.0],
    posB: [0, 1.28, 6.5],
    tgt: [0, 0.3, -12],
    fov: 52,
  },
  {
    id: 'rain',
    title: 'Der Moment, der zählt.',
    body:
      'Nacht, Starkregen, eine Person auf der Fahrbahn: Auf nassem Standard-Asphalt verschwindet die Silhouette im Dunkel. Auf GRAUZIT® hebt sie sich deutlich vom hellen Belag ab – Sekunden mehr Reaktionszeit.',
    metric: 'Erkennbarkeit ~45 m statt ~25 m',
    duration: 13,
    cond: 1.0,
    thermal: false,
    obstacles: true,
    split: 0,
    camMode: 'driver',
    posA: [0, 1.28, 7.0],
    posB: [0, 1.22, 4.4],
    tgt: [0, 0.55, -16],
    fov: 55,
  },
]
