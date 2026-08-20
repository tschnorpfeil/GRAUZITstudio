import { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ArrowUpRight } from 'lucide-react'
import * as THREE from 'three'
import { useSimulationStore, SLAB_HALF_WIDTH, type SimulationState } from '../store'
import { GrauzitLogo } from './GrauzitLogo'

const ACCENT = '#f1c302'
const GZ_BLUE = '#3875cc'

/* ------------------------------ Live-Messwerte ------------------------------ */

function MetricRow({
  label,
  stdVal,
  gzVal,
  unit,
  stdBar,
  gzBar,
  delta,
  invert,
}: {
  label: string
  stdVal: string
  gzVal: string
  unit: string
  stdBar: number // 0..1
  gzBar: number // 0..1
  delta: string
  invert?: boolean // true, wenn "weniger ist besser" (z.B. Temperatur)
}) {
  return (
    <div className="space-y-1 border-t border-zinc-800/50 pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="text-[10px] font-mono font-bold text-emerald-400">{delta}</span>
      </div>
      <div className="space-y-[3px]">
        <div className="flex items-center gap-2">
          <div className="h-[5px] flex-1 bg-zinc-800/80">
            <div
              className="h-full bg-zinc-500 transition-[width] duration-500"
              style={{ width: `${Math.round((invert ? 1 - stdBar : stdBar) * 100)}%` }}
            />
          </div>
          <span className="w-[86px] text-right font-mono text-[10px] text-zinc-400">
            {stdVal} <span className="text-zinc-600">{unit}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-[5px] flex-1 bg-zinc-800/80">
            <div
              className="h-full transition-[width] duration-500"
              style={{
                width: `${Math.round((invert ? 1 - gzBar : gzBar) * 100)}%`,
                background: GZ_BLUE,
              }}
            />
          </div>
          <span className="w-[86px] text-right font-mono text-[10px] font-bold text-white">
            {gzVal} <span className="font-normal text-zinc-500">{unit}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function MetricsPanel({ onOpenDataSheet }: { onOpenDataSheet: () => void }) {
  const daylight = useSimulationStore((s) => s.daylight)
  const rain = useSimulationStore((s) => s.rain)
  const thermal = useSimulationStore((s) => s.thermal)

  const isNight = daylight < 0.5

  // Live-Simulationswerte (gemäß Produktdatenblatt interpoliert)
  const lumStd = THREE.MathUtils.lerp(0.082, 0.082 * 0.35, rain)
  const lumGz = THREE.MathUtils.lerp(0.113, 0.113 * 0.94, rain)
  const visStd = THREE.MathUtils.lerp(28, 22, rain)
  const visGz = THREE.MathUtils.lerp(50, 42, rain)
  const tempStd = 15.5 + daylight * 32.5 - rain * 6
  const tempGz = 15.5 + daylight * 18.7 - rain * 6

  return (
    <div className="pointer-events-auto hidden min-w-[300px] flex-col border border-zinc-800 bg-[#090b10]/88 p-4 shadow-xl backdrop-blur-md md:flex">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          // Live-Vergleich
        </span>
        <button
          onClick={onOpenDataSheet}
          className="flex cursor-pointer items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#60a5fa] transition-colors hover:text-white"
        >
          <span>Datenblatt</span>
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2.5 pt-3">
        <MetricRow
          label="Leuchtdichte q₀"
          stdVal={lumStd.toFixed(3)}
          gzVal={lumGz.toFixed(3)}
          unit="cd/(m²·lx)"
          stdBar={lumStd / 0.13}
          gzBar={lumGz / 0.13}
          delta={rain > 0.4 ? '+340 % nass' : '+38 %'}
        />
        {isNight ? (
          <MetricRow
            label="Erkennbarkeit (Abblendlicht)"
            stdVal={visStd.toFixed(0)}
            gzVal={visGz.toFixed(0)}
            unit="m"
            stdBar={visStd / 55}
            gzBar={visGz / 55}
            delta={`+${Math.round(((visGz - visStd) / visStd) * 100)} %`}
          />
        ) : (
          <MetricRow
            label="Oberflächentemperatur"
            stdVal={tempStd.toFixed(1)}
            gzVal={tempGz.toFixed(1)}
            unit="°C"
            stdBar={(tempStd - 10) / 45}
            gzBar={(tempGz - 10) / 45}
            invert
            delta={`−${(tempStd - tempGz).toFixed(1)} °C`}
          />
        )}
        <div className="flex gap-2 border-t border-zinc-800/50 pt-2.5">
          <div className="flex-1 border border-zinc-800/80 bg-black/50 px-2 py-1.5 text-center">
            <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
              Griffigkeit
            </div>
            <div className="font-mono text-[11px] font-bold text-white">PSV ≥ 58</div>
          </div>
          <div className="flex-1 border border-zinc-800/80 bg-black/50 px-2 py-1.5 text-center">
            <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
              Lärm (RLS-19)
            </div>
            <div className="font-mono text-[11px] font-bold text-white">−2,0 dB(A)</div>
          </div>
        </div>
      </div>

      {/* Wärmebild-Legende */}
      {thermal && (
        <div className="anim-fade space-y-1 pt-3">
          <div
            className="h-2 w-full"
            style={{
              background:
                'linear-gradient(90deg, #0d0a59, #06a8d9, #2abf45, #f2d90f, #f24d0d, #8c0d0d)',
            }}
          />
          <div className="flex justify-between font-mono text-[9px] text-zinc-500">
            <span>8 °C</span>
            <span className="text-zinc-300">Wärmebild (simuliert)</span>
            <span>56 °C</span>
          </div>
        </div>
      )}

      <div className="pt-2.5 text-[9px] font-mono leading-snug text-zinc-600">
        Interaktive Simulation · Kennwerte gem. Produktdatenblatt (FGSV, DIN, CIE)
      </div>
    </div>
  )
}

/* ------------------------------- Kontroll-Deck ------------------------------ */

const SCENARIOS: { label: string; value: number }[] = [
  { label: 'Tag · Trocken', value: 0.0 },
  { label: 'Nacht · Trocken', value: 0.5 },
  { label: 'Nacht · Regen', value: 1.0 },
]

const CAMERAS: { id: SimulationState['cameraMode']; label: string }[] = [
  { id: 'driver', label: 'Fahrersicht' },
  { id: 'orbit', label: '3D-Orbit' },
  { id: 'top', label: 'Vogel' },
  { id: 'macro', label: 'Makro-Splitt' },
]

function ControlDeck() {
  const condition = useSimulationStore((s) => s.condition)
  const splitX = useSimulationStore((s) => s.splitX)
  const thermal = useSimulationStore((s) => s.thermal)
  const cameraMode = useSimulationStore((s) => s.cameraMode)
  const setCondition = useSimulationStore((s) => s.setCondition)
  const setSplitX = useSimulationStore((s) => s.setSplitX)
  const setThermal = useSimulationStore((s) => s.setThermal)
  const setCameraMode = useSimulationStore((s) => s.setCameraMode)
  const reset = useSimulationStore((s) => s.reset)

  const gzShare = Math.round(((SLAB_HALF_WIDTH - splitX) / (SLAB_HALF_WIDTH * 2)) * 100)

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-2">
      <div className="flex w-full flex-col gap-3.5 border border-zinc-800 bg-[#090b10]/92 p-4 shadow-2xl backdrop-blur-md md:p-5">
        {/* Szenario-Schalter */}
        <div className="grid grid-cols-3 gap-1 border border-zinc-800/80 bg-black/60 p-1">
          {SCENARIOS.map((sc, i) => {
            const active = Math.abs(condition - sc.value) < 0.12
            return (
              <button
                key={sc.label}
                onClick={() => setCondition(sc.value)}
                className={`cursor-pointer px-2 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors md:text-xs ${
                  active
                    ? 'border border-[#25589e] bg-[#0d284f] font-bold text-white'
                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                }`}
              >
                {`0${i + 1} · ${sc.label}`}
              </button>
            )
          })}
        </div>

        {/* Kontinuierlicher Umgebungs-Regler */}
        <div className="space-y-1 px-1">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            <span>Tag</span>
            <span>Dämmerung</span>
            <span>Nacht</span>
            <span>Starkregen</span>
          </div>
          <Slider.Root
            className="relative flex h-5 w-full cursor-pointer touch-none select-none items-center"
            value={[condition]}
            max={1}
            min={0}
            step={0.005}
            onValueChange={(vals) => setCondition(vals[0])}
          >
            <Slider.Track className="relative h-1 grow bg-zinc-800">
              <Slider.Range className="absolute h-full bg-[#3875cc]" />
            </Slider.Track>
            <Slider.Thumb
              className="block h-4 w-4 cursor-grab border border-[#3875cc] bg-white transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white active:cursor-grabbing"
              aria-label="Szenario-Regler"
            />
          </Slider.Root>
        </div>

        {/* GRAUZIT-Anteil (Vergleichslinie) */}
        <div className="space-y-1 px-1">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
            <span className="text-zinc-500">Vergleichslinie</span>
            <span className="font-bold text-[#f1c302]">GRAUZIT-Anteil: {gzShare} %</span>
          </div>
          <Slider.Root
            className="relative flex h-5 w-full cursor-pointer touch-none select-none items-center"
            value={[SLAB_HALF_WIDTH - splitX]}
            max={SLAB_HALF_WIDTH * 2}
            min={0}
            step={0.01}
            onValueChange={(vals) => setSplitX(SLAB_HALF_WIDTH - vals[0])}
          >
            <Slider.Track className="relative h-1 grow bg-zinc-800">
              <Slider.Range className="absolute h-full bg-[#f1c302]/80" />
            </Slider.Track>
            <Slider.Thumb
              className="block h-4 w-4 cursor-grab border border-[#f1c302] bg-white transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white active:cursor-grabbing"
              aria-label="Vergleichslinie"
            />
          </Slider.Root>
        </div>

        {/* Ansichts-Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setThermal(!thermal)}
            className={`cursor-pointer border px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              thermal
                ? 'border-orange-500/80 bg-orange-950/60 font-bold text-orange-300'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
            }`}
          >
            ◉ Wärmebild
          </button>
          <div className="grow" />
          <button
            onClick={reset}
            className="cursor-pointer border border-zinc-800 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
          >
            ↺ Zurücksetzen
          </button>
        </div>
      </div>

      {/* Kamera-Presets */}
      <div className="flex items-center gap-1 border border-zinc-800 bg-[#090b10]/90 p-1 backdrop-blur-md">
        {CAMERAS.map((item) => {
          const active = cameraMode === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCameraMode(item.id)}
              className={`cursor-pointer px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors md:px-4 ${
                active
                  ? 'border border-[#25589e] bg-[#0d284f] font-bold text-white'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------ Haupt-Overlay ------------------------------ */

export function HUD() {
  const [dataSheetOpen, setDataSheetOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute inset-0 flex select-none flex-col justify-between overflow-hidden p-4 font-sans md:p-8">
      {/* KOPFZEILE: Branding + Legende + Live-Vergleich */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="pointer-events-auto flex flex-col gap-2.5">
          <GrauzitLogo className="h-10 md:h-12" />
          <div className="hidden items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500 md:flex">
            <span>DIN EN 13108-6</span>
            <span className="text-zinc-700">/</span>
            <span>CIE 144 (Klasse A)</span>
            <span className="text-zinc-700">/</span>
            <span>ECE R149</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex items-center gap-2 border border-zinc-800/80 bg-black/70 px-2.5 py-1">
              <span className="block h-2 w-2 bg-zinc-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                Standard-Asphalt
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#f1c302]">◂▸</span>
            <div className="flex items-center gap-2 border border-[#25589e]/80 bg-[#0d284f]/70 px-2.5 py-1">
              <span className="block h-2 w-2" style={{ background: GZ_BLUE }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
                GRAUZIT® 50/50
              </span>
            </div>
          </div>
        </div>

        <MetricsPanel onOpenDataSheet={() => setDataSheetOpen(true)} />
      </div>

      {/* FUSSBEREICH */}
      <div className="flex flex-col gap-2">
        <div className="pointer-events-none mx-auto text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          <span style={{ color: ACCENT }}>◆</span>&ensp;Goldene Linie im 3D ziehen oder Regler
          nutzen&ensp;·&ensp;Maus: Orbit &amp; Zoom
        </div>
        <ControlDeck />
      </div>

      {/* TECHNISCHES DATENBLATT */}
      <Dialog.Root open={dataSheetOpen} onOpenChange={setDataSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-2rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-[#090b10] p-6 font-sans text-zinc-300 shadow-2xl outline-none">
            <div className="flex flex-col space-y-1.5 border-b border-zinc-800 pb-4 text-left">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#60a5fa]">
                // Technisches Produktdatenblatt
              </div>
              <Dialog.Title className="text-base font-bold uppercase tracking-wide text-white">
                GRAUZIT® 50/50 Edelsplitt-Gemisch
              </Dialog.Title>
              <Dialog.Description className="text-xs text-zinc-400">
                Geprüfte Spezifikationen und bauphysikalische Vergleichswerte nach FGSV, DIN und CIE.
              </Dialog.Description>
            </div>

            <div className="space-y-4 py-2 text-xs leading-relaxed">
              <div>
                <h4 className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
                  Materialzusammensetzung &amp; Wirkungsweise
                </h4>
                <p className="text-zinc-400">
                  Gezielt zusammengesetzter Edelsplitt aus <b>50 M.-% quarzitischer Grauwacke</b>{' '}
                  (Treis-Karden) und <b>50 M.-% hellem Quarzit</b> (Henau). Erreicht die höchste{' '}
                  <b>Helligkeitsklasse A</b> nach CIE 144 mit einem Leuchtdichtekoeffizienten von{' '}
                  <b>q₀ = 0,113 cd/(m²·lx)</b>. Die kristalline Quarzstruktur streut Scheinwerferlicht
                  diffus zum Fahrer zurück und reduziert die sommerliche Oberflächentemperatur um bis
                  zu <b>13,8 °C</b>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="border border-zinc-800/80 bg-black/60 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Regelwerke
                  </div>
                  <div className="font-medium text-white">TL Gestein-StB / ZTV Asphalt-StB</div>
                </div>
                <div className="border border-zinc-800/80 bg-black/60 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Polierresistenz (PSV)
                  </div>
                  <div className="font-medium text-white">PSV ≥ 58 (dauerhaft griffig)</div>
                </div>
                <div className="border border-zinc-800/80 bg-black/60 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Leuchtdichte (CIE 144)
                  </div>
                  <div className="font-bold text-emerald-400">q₀ = 0,113 cd/(m²·lx)</div>
                </div>
                <div className="border border-zinc-800/80 bg-black/60 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Lärmschutz (RLS-19)
                  </div>
                  <div className="font-medium text-white">−2,0 dB(A) Pegelminderung</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-800 pt-3">
              <Dialog.Close asChild>
                <button className="cursor-pointer border border-[#25589e] bg-[#0d284f] px-5 py-2 text-xs font-mono uppercase tracking-wider text-white transition-colors hover:bg-[#16396e]">
                  Schließen
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Close asChild>
              <button className="absolute right-4 top-4 cursor-pointer opacity-70 transition-opacity hover:opacity-100">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
