import { useMemo, useState, type CSSProperties } from 'react'
import { type Board as BoardT, type Player, colorOf, isKing, movesFromSquare } from '../lib/checkers'
import type { SkinStyle } from '../lib/skins'
import '../styles/board.css'

interface Props {
  board: BoardT
  currentPlayer: Player
  mustContinueFrom: [number, number] | null
  myColor: 'white' | 'black' | null
  skin: SkinStyle
  onMove: (from: [number, number], to: [number, number]) => void
  disabled?: boolean
}

export function CheckersBoard({ board, currentPlayer, mustContinueFrom, myColor, skin, onMove, disabled }: Props) {
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const myTurn = !disabled && myColor === currentPlayer

  const targets = useMemo(() => {
    if (!selected || !myTurn) return new Set<string>()
    const moves = movesFromSquare(board, currentPlayer, selected, mustContinueFrom)
    return new Set(moves.map(m => `${m.to[0]},${m.to[1]}`))
  }, [board, selected, currentPlayer, mustContinueFrom, myTurn])

  const handleClick = (r: number, c: number) => {
    if (!myTurn) return
    const piece = board[r][c]
    const pieceColor = colorOf(piece)
    if (selected) {
      if (targets.has(`${r},${c}`)) { onMove(selected, [r, c]); setSelected(null); return }
      if (mustContinueFrom) return
      if (pieceColor === currentPlayer) { setSelected([r, c]); return }
      setSelected(null)
      return
    }
    if (pieceColor === currentPlayer) {
      if (mustContinueFrom && (mustContinueFrom[0] !== r || mustContinueFrom[1] !== c)) return
      setSelected([r, c])
    }
  }

  const boardVars: CSSProperties = {
    '--light': skin.lightSquare,
    '--dark': skin.darkSquare,
    '--white-fill': skin.whiteFill,
    '--black-fill': skin.blackFill,
    '--ring': skin.ring,
  } as CSSProperties

  return (
    <div className="board-wrap" style={boardVars}>
      <div className="board">
        {board.map((row, r) =>
          row.map((p, c) => {
            const dark = (r + c) % 2 === 1
            const isSel = !!(selected && selected[0] === r && selected[1] === c)
            const isTarget = targets.has(`${r},${c}`)
            const mustHere = !!(mustContinueFrom && mustContinueFrom[0] === r && mustContinueFrom[1] === c)
            const pieceColor = colorOf(p)
            return (
              <button key={`${r}-${c}`} onClick={() => handleClick(r, c)}
                className={`board-square ${dark ? 'board-dark' : 'board-light'} ${isSel ? 'board-selected' : ''} ${isTarget ? 'board-target' : ''} ${mustHere ? 'board-must-continue' : ''}`}
                type="button">
                {p && (
                  <span className={`board-piece ${pieceColor === 'white' ? 'board-white' : 'board-black'} ${isKing(p) ? 'board-king' : ''}`}>
                    {isKing(p) ? '♛' : ''}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
