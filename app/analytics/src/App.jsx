import { useEffect, useState, useRef, useCallback } from 'react'

// Palette: categorical slots 1–3 (blue / orange / aqua), light + dark
// Validated all-pairs scatter, passes CVD ΔE ≥ 9.2. Aqua is sub-3:1 → relief via label + ring.
const PALETTE = {
  light: { H: '#2a78d6', M: '#eb6834', L: '#1baf7a' },
  dark:  { H: '#3987e5', M: '#d95926', L: '#199e70' },
}
const STATUS_LABELS = { N: 'New', A: 'Assigned', I: 'In Process', H: 'On Hold', R: 'Resolved', C: 'Closed' }
const URGENCY_LABELS = { H: 'High', M: 'Medium', L: 'Low' }

function isDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

// map array to [0,1]
function normalize(arr) {
  const min = Math.min(...arr), max = Math.max(...arr)
  const range = max - min || 1
  return arr.map(v => (v - min) / range)
}

const MARGIN = { top: 36, right: 24, bottom: 48, left: 48 }
const DOT_R = 8

export default function App() {
  const [points, setPoints] = useState(null)
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(new Set()) // IDs of clicked dots
  const [filterUrgency, setFilterUrgency] = useState(null)
  const [dark, setDark] = useState(isDark)
  const svgRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 560 })

  // track dark mode changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = e => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // responsive container
  useEffect(() => {
    const container = svgRef.current?.parentElement
    if (!container) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setSize({ w, h: Math.max(420, Math.round(w * 0.62)) })
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    fetch('/odata/v4/analytics/getEmbeddingProjection()')
      .then(r => r.json())
      .then(r => {
        const raw = r.value ?? r
        if (!Array.isArray(raw)) throw new Error(JSON.stringify(raw))
        setPoints(raw)
      })
      .catch(e => setError(e.message))
  }, [])

  const palette = dark ? PALETTE.dark : PALETTE.light

  const plotW = size.w - MARGIN.left - MARGIN.right
  const plotH = size.h - MARGIN.top - MARGIN.bottom

  const projected = (() => {
    if (!points?.length) return []
    const xs = normalize(points.map(p => p.x))
    const ys = normalize(points.map(p => p.y))
    return points.map((p, i) => ({
      ...p,
      px: MARGIN.left + xs[i] * plotW,
      py: MARGIN.top  + (1 - ys[i]) * plotH,
    }))
  })()

  const visible = filterUrgency
    ? projected.filter(p => p.urgency === filterUrgency)
    : projected

  // axis ticks (5 per axis, in original PCA space)
  const axisTicks = 5
  const gridXs = Array.from({ length: axisTicks + 1 }, (_, i) => MARGIN.left + (i / axisTicks) * plotW)
  const gridYs = Array.from({ length: axisTicks + 1 }, (_, i) => MARGIN.top  + (i / axisTicks) * plotH)

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Scale CSS pixels → viewBox units (SVG is scaled via width:100%/height:auto)
    const scaleX = size.w / rect.width
    const scaleY = size.h / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top)  * scaleY
    let nearest = null, bestDist = 20 * 20
    for (const p of projected) {
      const d = (p.px - mx) ** 2 + (p.py - my) ** 2
      if (d < bestDist) { bestDist = d; nearest = p }
    }
    setHovered(nearest ?? null)
  }, [projected, size])

  const handleClick = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = size.w / rect.width
    const scaleY = size.h / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top)  * scaleY
    let nearest = null, bestDist = 20 * 20
    for (const p of projected) {
      const d = (p.px - mx) ** 2 + (p.py - my) ** 2
      if (d < bestDist) { bestDist = d; nearest = p }
    }
    if (!nearest) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(nearest.ID)) next.delete(nearest.ID)
      else next.add(nearest.ID)
      return next
    })
  }, [projected, size])

  // chromatic surface values
  const surface   = dark ? '#1a1a19' : '#fcfcfb'
  const gridLine  = dark ? '#2c2c2a' : '#e1e0d9'
  const textPri   = dark ? '#ffffff' : '#0b0b0b'
  const textSec   = dark ? '#c3c2b7' : '#52514e'
  const textMuted = '#898781'
  const axisLine  = dark ? '#383835' : '#c3c2b7'

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      background: dark ? '#0d0d0d' : '#f9f9f7',
      minHeight: '100vh',
      padding: '24px 24px 48px',
      color: textPri,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: textPri }}>
          Incident Embedding Clusters
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: textSec }}>
          PCA projection of semantic embeddings — proximity indicates similar incidents
        </p>
      </header>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: textMuted, marginRight: 4 }}>Urgency:</span>
        {[null, 'H', 'M', 'L'].map(u => (
          <button
            key={u ?? 'all'}
            onClick={() => setFilterUrgency(u)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: `1px solid ${filterUrgency === u ? palette[u ?? 'H'] ?? axisLine : gridLine}`,
              background: filterUrgency === u
                ? (u ? palette[u] + '22' : (dark ? '#2c2c2a' : '#e1e0d9'))
                : 'transparent',
              color: u ? palette[u] : textPri,
              fontWeight: filterUrgency === u ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {u ? URGENCY_LABELS[u] : 'All'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: textMuted }}>
          {visible.length} incident{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Chart */}
      <div style={{
        background: surface,
        borderRadius: 8,
        border: `1px solid ${gridLine}`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {error && (
          <div style={{ padding: 24, color: '#e34948' }}>Error: {error}</div>
        )}
        {!error && !points && (
          <div style={{ padding: 24, color: textMuted }}>Loading…</div>
        )}
        {!error && points && (
          <svg
            ref={svgRef}
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
            style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
            onClick={handleClick}
          >
            {/* grid */}
            {gridXs.map((x, i) => (
              <line key={`gx${i}`} x1={x} y1={MARGIN.top} x2={x} y2={MARGIN.top + plotH}
                stroke={gridLine} strokeWidth={1} />
            ))}
            {gridYs.map((y, i) => (
              <line key={`gy${i}`} x1={MARGIN.left} y1={y} x2={MARGIN.left + plotW} y2={y}
                stroke={gridLine} strokeWidth={1} />
            ))}

            {/* axes */}
            <line x1={MARGIN.left} y1={MARGIN.top + plotH} x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
              stroke={axisLine} strokeWidth={1} />
            <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + plotH}
              stroke={axisLine} strokeWidth={1} />

            {/* axis labels */}
            <text x={MARGIN.left + plotW / 2} y={size.h - 10}
              textAnchor="middle" fontSize={11} fill={textMuted}>
              PC 1
            </text>
            <text x={14} y={MARGIN.top + plotH / 2}
              textAnchor="middle" fontSize={11} fill={textMuted}
              transform={`rotate(-90, 14, ${MARGIN.top + plotH / 2})`}>
              PC 2
            </text>

            {/* dots — dimmed when filtering */}
            {projected.map(p => {
              const isVisible = !filterUrgency || p.urgency === filterUrgency
              const isHov = hovered?.ID === p.ID
              const isSel = selected.has(p.ID)
              const color = palette[p.urgency] ?? palette.M
              return (
                <g key={p.ID}>
                  {/* selection ring */}
                  {isSel && (
                    <circle
                      cx={p.px} cy={p.py}
                      r={DOT_R + 5}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={isVisible ? 0.7 : 0.15}
                    />
                  )}
                  {/* 2px surface ring (relief for low-contrast aqua, plus layering aid) */}
                  <circle
                    cx={p.px} cy={p.py}
                    r={isHov ? DOT_R + 3 : DOT_R + 1}
                    fill={surface}
                    opacity={isVisible ? 1 : 0.2}
                  />
                  <circle
                    cx={p.px} cy={p.py}
                    r={isHov ? DOT_R + 1 : DOT_R}
                    fill={color}
                    opacity={isVisible ? (isHov || isSel ? 1 : 0.88) : 0.18}
                  />
                </g>
              )
            })}

            {/* crosshair on hover */}
            {hovered && (
              <>
                <line x1={hovered.px} y1={MARGIN.top} x2={hovered.px} y2={MARGIN.top + plotH}
                  stroke={palette[hovered.urgency]} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
                <line x1={MARGIN.left} y1={hovered.py} x2={MARGIN.left + plotW} y2={hovered.py}
                  stroke={palette[hovered.urgency]} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
              </>
            )}
          </svg>
        )}

        {/* Tooltip */}
        {hovered && (() => {
          const GAP = 12
          const TW = 260, TH_EST = 100
          let left = hovered.px + GAP
          let top  = hovered.py - TH_EST / 2
          if (left + TW > size.w - 8)  left = hovered.px - TW - GAP
          if (top < 8) top = 8
          return (
            <div style={{
              position: 'absolute',
              left, top,
              width: TW,
              background: dark ? '#232321' : '#ffffff',
              border: `1px solid ${gridLine}`,
              borderRadius: 6,
              padding: '10px 12px',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: textPri, marginBottom: 4, lineHeight: 1.3 }}>
                {hovered.title}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: hovered.summary ? 6 : 0 }}>
                <span style={{
                  background: palette[hovered.urgency] + '25',
                  color: palette[hovered.urgency],
                  border: `1px solid ${palette[hovered.urgency]}50`,
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontWeight: 500,
                }}>
                  {URGENCY_LABELS[hovered.urgency]} urgency
                </span>
                <span style={{ color: textSec }}>
                  {STATUS_LABELS[hovered.status] ?? hovered.status}
                </span>
              </div>
              {hovered.summary && (
                <div style={{ color: textSec, lineHeight: 1.5, marginTop: 4 }}>
                  {hovered.summary.length > 120
                    ? hovered.summary.slice(0, 117) + '…'
                    : hovered.summary}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Legend — always present for 3 series */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {(['H', 'M', 'L']).map(u => (
          <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <svg width={16} height={16} style={{ flexShrink: 0 }}>
              {/* surface ring */}
              <circle cx={8} cy={8} r={7} fill={surface} />
              <circle cx={8} cy={8} r={6} fill={palette[u]} />
            </svg>
            <span style={{ color: textSec }}>{URGENCY_LABELS[u]} urgency</span>
          </div>
        ))}
        <div style={{ color: textMuted, fontSize: 12, alignSelf: 'center', marginLeft: 'auto' }}>
          Click dots to select · hover for details
        </div>
      </div>

      {/* Table view — shows selected rows when any are selected, otherwise all visible */}
      {(() => {
        const tableRows = selected.size > 0
          ? projected.filter(p => selected.has(p.ID))
          : visible
        const label = selected.size > 0
          ? `${selected.size} selected`
          : `${visible.length} incidents`
        return (
          <details style={{ marginTop: 32 }} open={selected.size > 0 || undefined}>
            <summary style={{ fontSize: 13, color: textSec, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Table view ({label})</span>
              {selected.size > 0 && (
                <button
                  onClick={e => { e.preventDefault(); setSelected(new Set()) }}
                  style={{
                    fontSize: 11, padding: '1px 8px', borderRadius: 3,
                    border: `1px solid ${gridLine}`, background: 'transparent',
                    color: textMuted, cursor: 'pointer',
                  }}
                >
                  Clear selection
                </button>
              )}
            </summary>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', fontSize: 12, color: textPri,
              }}>
                <thead>
                  <tr>
                    {['Title', 'Urgency', 'Status', 'Summary'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 10px',
                        borderBottom: `1px solid ${gridLine}`,
                        color: textMuted, fontWeight: 500,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(p => (
                    <tr key={p.ID} style={{
                      background: selected.has(p.ID) || hovered?.ID === p.ID
                        ? (dark ? '#2c2c2a' : '#f0efec')
                        : 'transparent',
                    }}>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${gridLine}` }}>{p.title}</td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${gridLine}`, color: palette[p.urgency] }}>
                        {URGENCY_LABELS[p.urgency]}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${gridLine}`, color: textSec }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: `1px solid ${gridLine}`, color: textSec }}>
                        {p.summary || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )
      })()}
      </div>
    </div>
  )
}
