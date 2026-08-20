import { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ArrowUpRight } from 'lucide-react'
import { useSimulationStore, type SimulationState } from '../store'
import { GrauzitLogo } from './GrauzitLogo'

export function HUD() {
  const [dataSheetOpen, setDataSheetOpen] = useState(false)

  const condition = useSimulationStore((s) => s.condition)
  const cameraMode = useSimulationStore((s) => s.cameraMode)
  const setCondition = useSimulationStore((s) => s.setCondition)
  const setCameraMode = useSimulationStore((s) => s.setCameraMode)

  const isNightWet = condition > 0.5

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden flex flex-col justify-between p-6 md:p-10 font-sans">
      {/* 1. TOP HEADER: BRANDING & ENGINEERING COMPARISON */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        {/* TOP-LEFT: OFFICIAL BRAND & STANDARD SPECIFICATION */}
        <div className="pointer-events-auto flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <GrauzitLogo className="h-12 md:h-14" />
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
            <span>DIN EN 13108-6</span>
            <span className="text-zinc-700">/</span>
            <span>CIE 144 (KLASSE A)</span>
            <span className="text-zinc-700">/</span>
            <span>ECE R149</span>
          </div>

          {/* Precision Comparison Swatches */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2.5 bg-black/70 border border-zinc-800/80 px-3 py-1.5 rounded-none">
              <span className="h-2 w-2 bg-zinc-600 block" />
              <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-300">
                Standard Asphalt (Links)
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-[#0d284f]/60 border border-[#25589e]/80 px-3 py-1.5 rounded-none">
              <span className="h-2 w-2 bg-[#3875cc] block" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-white">
                GRAUZIT® 50/50 (Rechts)
              </span>
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: LABORATORY TELEMETRY (PURE DATA, ZERO FLUFF) */}
        <div className="pointer-events-auto flex flex-col items-end">
          <div className="bg-[#090b10]/90 border border-zinc-800 p-4 shadow-xl flex flex-col gap-3 min-w-[300px]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
                // PRÜF- & VERGLEICHSWERTE
              </span>
              <button
                onClick={() => setDataSheetOpen(true)}
                className="text-[10px] font-mono uppercase tracking-wider text-[#60a5fa] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>DATENBLATT</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Technical Metric Table */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-zinc-400 text-[11px]">Leuchtdichte q₀</span>
                <span className="font-bold text-white">
                  0.113 <span className="text-zinc-400 font-normal">cd/(m²·lx)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-zinc-800/40">
                <span className="text-zinc-400 text-[11px]">
                  {isNightWet ? 'Nacht-Rückstreuung' : 'Tages-Helligkeit'}
                </span>
                <span className="font-bold text-emerald-400">
                  {isNightWet ? '+340 % (Kristall-Reflex)' : '+38 % Leuchtdichte'}
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-zinc-800/40">
                <span className="text-zinc-400 text-[11px]">Oberflächentemp.</span>
                <span className="font-bold text-white">
                  {isNightWet ? '16.0 °C (Nass)' : '34.2 °C (-13.8 °C)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-zinc-800/40">
                <span className="text-zinc-400 text-[11px]">Lärmminderung (RLS-19)</span>
                <span className="font-bold text-white">-2.0 dB(A)</span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-zinc-800/40">
                <span className="text-zinc-400 text-[11px]">Polierresistenz (PSV)</span>
                <span className="font-bold text-white">PSV ≥ 58</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM INDUSTRIAL MASTER CONTROLLER */}
      <div className="pointer-events-auto flex flex-col items-center gap-3 w-full max-w-xl mx-auto">
        {/* MAIN CONTROL DECK */}
        <div className="w-full bg-[#090b10]/95 border border-zinc-800 p-4 md:p-5 shadow-2xl flex flex-col gap-4">
          {/* Segmented Condition Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-black/60 p-1 border border-zinc-800/80">
            <button
              onClick={() => setCondition(0.0)}
              className={`py-2 px-3 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                condition < 0.25
                  ? 'bg-[#0d284f] text-white border border-[#25589e] font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              [ 01 · TAG / TROCKEN ]
            </button>

            <button
              onClick={() => setCondition(1.0)}
              className={`py-2 px-3 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                condition > 0.75
                  ? 'bg-[#0d284f] text-white border border-[#25589e] font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              [ 02 · NACHT / NASS ]
            </button>
          </div>

          {/* Calibrated Continuous Laboratory Slider */}
          <div className="space-y-1.5 px-1">
            <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              <span>0.00 TAG</span>
              <span className="text-white font-bold">
                UMGEBUNG: {condition.toFixed(2)}
              </span>
              <span>1.00 NACHTREGEN</span>
            </div>

            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
              value={[condition]}
              max={1}
              min={0}
              step={0.01}
              onValueChange={(vals) => setCondition(vals[0])}
            >
              <Slider.Track className="bg-zinc-800 relative grow h-1">
                <Slider.Range className="absolute bg-[#3875cc] h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-white border border-[#3875cc] rounded-none hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors cursor-grab active:cursor-grabbing"
                aria-label="Szenario-Regler"
              />
            </Slider.Root>

            {/* Precision Tick Markers */}
            <div className="flex justify-between text-[9px] font-mono text-zinc-400 pt-0.5">
              <span>| 0%</span>
              <span>| 25%</span>
              <span>| 50%</span>
              <span>| 75%</span>
              <span>| 100%</span>
            </div>
          </div>
        </div>

        {/* CAMERA PERSPECTIVE SELECTOR */}
        <div className="flex items-center gap-1 bg-[#090b10]/90 border border-zinc-800 p-1">
          {[
            { id: 'driver', label: 'FAHRER-AUGENHÖHE' },
            { id: 'orbit', label: '3D-ORBIT' },
            { id: 'macro', label: 'MAKRO-SPLITT' },
          ].map((item) => {
            const active = cameraMode === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCameraMode(item.id as SimulationState['cameraMode'])}
                className={`py-1.5 px-4 text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0d284f] text-white border border-[#25589e] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. TECHNICAL SPECIFICATION MODAL (ENGINEERING DATA SHEET) */}
      <Dialog.Root open={dataSheetOpen} onOpenChange={setDataSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-[#090b10] p-6 shadow-2xl rounded-none text-zinc-300 outline-none font-sans">
            <div className="flex flex-col space-y-1.5 text-left border-b border-zinc-800 pb-4">
              <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#60a5fa]">
                // TECHNISCHES PRODUKTDATENBLATT
              </div>
              <Dialog.Title className="text-base font-bold tracking-wide uppercase text-white">
                GRAUZIT® 50/50 Edelsplitt-Gemisch
              </Dialog.Title>
              <Dialog.Description className="text-xs text-zinc-400">
                Geprüfte Spezifikationen und bauphysikalische Vergleichswerte nach FGSV, DIN und CIE.
              </Dialog.Description>
            </div>

            <div className="space-y-4 text-xs leading-relaxed py-2">
              <div>
                <h4 className="font-mono text-[11px] font-bold text-white mb-1 uppercase tracking-wider">
                  Materialzusammensetzung & Wirkungsweise
                </h4>
                <p className="text-zinc-400">
                  Gezielt zusammengesetzter Edelsplitt aus <b>50 M.-% quarzitischer Grauwacke</b> (Treis-Karden) und <b>50 M.-% hellem Quarzit</b> (Henau). Erreicht die höchste <b>Helligkeitsklasse A</b> nach CIE 144 mit einem Leuchtdichtekoeffizienten von <b>q₀ = 0.113 cd/(m²·lx)</b>.
                </p>
              </div>

              {/* Data Table */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-3 bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Regelwerke
                  </div>
                  <div className="font-medium text-white">TL Gestein-StB / ZTV Asphalt-StB</div>
                </div>

                <div className="p-3 bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Polierresistenz (PSV)
                  </div>
                  <div className="font-medium text-white">PSV ≥ 58 (Dauerhaft griffig)</div>
                </div>

                <div className="p-3 bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Leuchtdichte (CIE)
                  </div>
                  <div className="font-bold text-emerald-400">q₀ = 0.113 cd/(m²·lx)</div>
                </div>

                <div className="p-3 bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Lärmschutz (RLS-19)
                  </div>
                  <div className="font-medium text-white">-2.0 dB(A) Pegelminderung</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <Dialog.Close asChild>
                <button className="bg-[#0d284f] hover:bg-[#16396e] border border-[#25589e] px-5 py-2 text-xs font-mono uppercase tracking-wider text-white transition-colors cursor-pointer">
                  Schließen
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Close asChild>
              <button className="absolute right-4 top-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
