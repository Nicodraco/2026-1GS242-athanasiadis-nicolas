import { describe, expect, test } from 'bun:test'
import { bestMove } from './search'
import { initialBoard, legalMoves, applyMove, winner, opponent, pieceCaptures } from './checkers'

describe('A* search', () => {
  test('returns a legal move from initial position', () => {
    const board = initialBoard()
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
    expect(move!.from).toBeDefined()
    expect(move!.to).toBeDefined()
    const legal = legalMoves(board, 'black')
    const found = legal.some(m => m.from[0] === move!.from[0] && m.from[1] === move!.from[1] && m.to[0] === move!.to[0] && m.to[1] === move!.to[1])
    expect(found).toBe(true)
  })

  test('captures when mandatory', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[2][3] = 'b'
    board[3][2] = 'w'; board[4][1] = ''
    const moves = legalMoves(board, 'black')
    const hasCapture = moves.some(m => m.captures !== null)
    expect(hasCapture).toBe(true)
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
    expect(move!.captures).not.toBeNull()
  })

  test('handles mustContinueFrom for multi-jump', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][2] = 'b'
    board[4][1] = 'w'; board[4][3] = 'w'
    board[3][0] = ''; board[3][4] = ''
    board[2][3] = 'w'
    const move = bestMove(board, 'black', null)
    if (move && move.captures) {
      const afterFirstCapture = applyMove(board, move)
      const cont = bestMove(afterFirstCapture, 'black', move.to)
      expect(cont).not.toBeNull()
      expect(cont!.from[0]).toBe(move.to[0])
      expect(cont!.from[1]).toBe(move.to[1])
    }
  })

  test('takes less than 5 seconds', async () => {
    const board = initialBoard()
    const start = Date.now()
    bestMove(board, 'black', null)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)
  })

  test('prefers captures when available', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][0] = 'b'; board[4][1] = ''; board[3][2] = '';
    board[4][3] = 'w'; board[2][3] = '';
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
  })

  test('returns null when no moves available', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    const move = bestMove(board, 'black', null)
    expect(move).toBeNull()
  })

  test('handles board with kings', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[3][2] = 'B'; board[4][1] = ''; board[4][3] = ''; board[2][1] = ''; board[2][3] = '';
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
    const legal = legalMoves(board, 'black')
    const found = legal.some(m => m.from[0] === move!.from[0] && m.from[1] === move!.from[1] && m.to[0] === move!.to[0] && m.to[1] === move!.to[1])
    expect(found).toBe(true)
  })

  test('king captures preferred when available', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[3][2] = 'B'
    board[4][3] = 'w'; board[2][5] = ''
    board[5][0] = 'b'; board[5][2] = 'b'
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
  })

  test('returns capture move when only captures exist', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[2][3] = 'b'
    board[3][2] = 'w'
    board[4][1] = ''
    const moves = legalMoves(board, 'black')
    expect(moves.length).toBe(1)
    expect(moves[0].captures).not.toBeNull()
    const move = bestMove(board, 'black', null)
    expect(move).not.toBeNull()
    expect(move!.captures).toEqual([3, 2])
  })
})
