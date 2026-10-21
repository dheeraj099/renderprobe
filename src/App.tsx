import { useRef } from 'react'
import { useScene } from './hooks/useScene'
import type { ScenePreset } from './hooks/useScene'
import { Activity, Grid3x3, Sun, RotateCcw } from 'lucide-react'

const PRESETS: { id: ScenePreset; label: string; desc: string }[] = [
  { id: 'minimal',  label: 'Minimal',  desc: '10 objects' },
  { id: 'moderate', label: 'Moderate', desc: '100 objects' },
  { id: 'heavy',    label: 'Heavy',    desc: '500 objects' },
  { id: 'stress',   label: 'Stress',   desc: '2,000 objects' },
]

function StatCard({ label, value, unit, color = 'text-[#e4e4f0]' }: {
  label: string; value: number | string; unit?: string; color?: string
}) {
  return (
    <div className="bg-[#1c1c26] border border-[#2a2a38] rounded-lg p-3">
      <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums ${color}`}>
        {value}
        {unit && <span className="text-sm font-normal text-zinc-600 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

function FpsGraph({ history }: { history: number[] }) {
  const max = 120
  const w = 240, h = 48
  const pts = history.map((v, i) => `${(i / (history.length - 1)) * w},${h - (v / max) * h}`)
  return (
    <div className="bg-[#1c1c26] border border-[#2a2a38] rounded-lg p-3">
      <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">FPS History</p>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="fpsg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {history.length > 1 && (
          <>
            <polyline
              points={pts.join(' ')}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <polygon
              points={`0,${h} ${pts.join(' ')} ${w},${h}`}
              fill="url(#fpsg)"
            />
          </>
        )}
        {[0, 30, 60, 90, 120].map((v) => (
          <line key={v} x1={0} y1={h - (v / max) * h} x2={w} y2={h - (v / max) * h}
            stroke="#2a2a38" strokeWidth="0.5" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
        <span>0</span><span>60</span><span>120 fps</span>
      </div>
    </div>
  )
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { stats, preset, wireframe, shadows, autoRotate, changePreset, toggleWireframe, toggleShadows, toggleAutoRotate } = useScene(canvasRef)

  const fpsColor = stats.fps >= 55 ? 'text-emerald-400' : stats.fps >= 30 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="h-screen bg-[#0c0c10] text-[#e4e4f0] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-5 h-12 bg-[#111118] border-b border-[#1f1f2e] shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-violet-400" />
          <span className="font-semibold text-sm">renderprobe</span>
        </div>
        <span className="text-xs text-zinc-600">WebGL scene performance profiler</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => changePreset(p.id)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${preset === p.id ? 'text-violet-300 bg-violet-500/10 border-violet-500/30' : 'text-zinc-500 border-[#2a2a38] hover:text-zinc-300'}`}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-[#2a2a38]" />
        <button onClick={toggleWireframe} title="Wireframe"
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${wireframe ? 'text-violet-300 border-violet-500/30 bg-violet-500/10' : 'text-zinc-500 border-[#2a2a38] hover:text-zinc-300'}`}>
          <Grid3x3 size={12} /> Wire
        </button>
        <button onClick={toggleShadows} title="Shadows"
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${shadows ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-zinc-500 border-[#2a2a38]'}`}>
          <Sun size={12} /> Shadows
        </button>
        <button onClick={toggleAutoRotate} title="Auto Rotate"
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${autoRotate ? 'text-blue-300 border-blue-500/30 bg-blue-500/10' : 'text-zinc-500 border-[#2a2a38]'}`}>
          <RotateCcw size={12} /> Rotate
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <canvas ref={canvasRef} className="flex-1 block" style={{ touchAction: 'none' }} />

        {/* Stats sidebar */}
        <aside className="w-64 shrink-0 bg-[#111118] border-l border-[#1f1f2e] overflow-y-auto p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-3">Performance</p>

          <StatCard label="FPS" value={stats.fps} color={fpsColor} />
          <StatCard label="Frame Time" value={stats.frameTime} unit="ms"
            color={stats.frameTime < 16.6 ? 'text-emerald-400' : stats.frameTime < 33 ? 'text-amber-400' : 'text-red-400'} />
          <FpsGraph history={stats.fpsHistory} />

          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 pt-2">Renderer</p>
          <StatCard label="Draw Calls" value={stats.drawCalls} />
          <StatCard label="Triangles" value={stats.triangles.toLocaleString()} />
          <StatCard label="Geometries" value={stats.geometries} />
          <StatCard label="Textures" value={stats.textures} />
          <StatCard label="Programs" value={stats.programs} />
          <StatCard label="Scene Objects" value={stats.objectCount} />

          <div className="pt-2 text-[11px] text-zinc-700 leading-relaxed border-t border-[#1f1f2e]">
            Stats from <code className="text-zinc-600">renderer.info</code> — updates every frame. Toggle presets to observe the impact on draw calls and frame time.
          </div>
        </aside>
      </div>
    </div>
  )
}
