type ConnectorPath = {
  x1: number; y1: number; x2: number; y2: number; type: 'h' | 'v'
}

type Props = {
  paths: ConnectorPath[]
  highlightedPathIds?: Set<number>
  width: number
  height: number
}

/**
 * Renderiza sobreposição SVG com linhas de conexão.
 * Cada ConnectorPath define um segmento de linha horizontal ou vertical.
 * highlightedPathIds pinta linhas específicas de verde.
 */
export function BracketConnectors({ paths, highlightedPathIds, width, height }: Props) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map((p, i) => {
        const isHighlighted = highlightedPathIds?.has(i)
        return (
          <line
            key={i}
            x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
            stroke={isHighlighted ? '#10b981' : '#475569'}
            strokeWidth={isHighlighted ? 1.5 : 1}
            className="transition-all duration-300"
          />
        )
      })}
    </svg>
  )
}

/**
 * Gera os segmentos de conexão para um lado do bracket.
 * Layout: cada card tem altura fixa H, gap G entre cards.
 */
export function computeSideConnectors(
  r32Count: number,
  cardH: number,
  gap: number,
  colWidth: number,
  startX: number,
  direction: 'left' | 'right',
): ConnectorPath[] {
  const paths: ConnectorPath[] = []
  const colGap = 24 // gap entre colunas

  // R32 column X coordinate
  const r32X = direction === 'right' ? startX + colWidth : startX
  const connStartX = direction === 'right' ? r32X : r32X + colWidth

  // For each pair of R32 matches → 1 Oitavas match
  for (let i = 0; i < r32Count; i += 2) {
    const topCardCenter = i * (cardH + gap) + cardH / 2
    const bottomCardCenter = (i + 1) * (cardH + gap) + cardH / 2
    const midY = (topCardCenter + bottomCardCenter) / 2

    // Horizontal from top card to connector column
    paths.push({ x1: connStartX, y1: topCardCenter, x2: connStartX + colGap / 2, y2: topCardCenter, type: 'h' })
    // Vertical joining top and bottom
    paths.push({ x1: connStartX + colGap / 2, y1: topCardCenter, x2: connStartX + colGap / 2, y2: bottomCardCenter, type: 'v' })
    // Horizontal from bottom card to connector column
    paths.push({ x1: connStartX, y1: bottomCardCenter, x2: connStartX + colGap / 2, y2: bottomCardCenter, type: 'h' })
    // Horizontal from mid to next column
    paths.push({ x1: connStartX + colGap / 2, y1: midY, x2: connStartX + colGap, y2: midY, type: 'h' })
  }

  return paths
}
