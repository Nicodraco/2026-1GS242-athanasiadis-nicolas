import { describe, expect, test } from 'bun:test'
import {
  initialBoard, legalMoves, applyMove, winner, opponent,
  pieceCaptures, canContinueCapture, findLegalMove, isKing, colorOf
} from './checkers'

describe('checkers engine', () => {
  test('initial board setup', () => {
    const board = initialBoard()
    expect(board.length).toBe(8)
    expect(board[0][1]).toBe('b')
    expect(board[2][7]).toBe('b')
    expect(board[5][0]).toBe('w')
    expect(board[7][6]).toBe('w')
    expect(board[3][2]).toBe('')
    expect(board[4][3]).toBe('')
  })

  test('white has first move', () => {
    const board = initialBoard()
    const moves = legalMoves(board, 'white')
    expect(moves.length).toBeGreaterThan(0)
    moves.forEach(m => {
      expect(m.from[0]).toBeGreaterThan(4)
      expect(m.to[0]).toBeLessThan(m.from[0])
      expect(m.captures).toBeNull()
    })
  })

  test('mandatory capture', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[4][1] = 'w'; board[4][3] = '';
    board[3][2] = 'b'; board[2][3] = '';
    const moves = legalMoves(board, 'white')
    const hasCapture = moves.some(m => m.captures !== null)
    expect(hasCapture).toBe(true)
    moves.forEach(m => {
      expect(m.captures).not.toBeNull()
    })
  })

  test('mandatory capture excludes simple moves', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][2] = 'w'; board[4][1] = '';
    board[4][3] = 'b'; board[3][4] = '';
    board[6][1] = 'w'; board[6][5] = 'w';
    const moves = legalMoves(board, 'white')
    const hasCapture = moves.some(m => m.captures !== null)
    expect(hasCapture).toBe(true)
    const hasSimple = moves.some(m => m.captures === null)
    expect(hasSimple).toBe(false)
  })

  test('crowning', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[1][0] = 'w'; board[2][1] = ''; board[0][1] = '';
    const moves = legalMoves(board, 'white')
    const crowningMoves = moves.filter(m => m.to[0] === 0)
    expect(crowningMoves.length).toBeGreaterThan(0)
    const newBoard = applyMove(board, crowningMoves[0])
    expect(newBoard[0][1]).toBe('W')
  })

  test('black crowning at row 7', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[6][1] = 'b'; board[5][0] = ''; board[5][2] = '';
    const moves = legalMoves(board, 'black')
    const crowningMoves = moves.filter(m => m.to[0] === 7)
    expect(crowningMoves.length).toBeGreaterThan(0)
    const newBoard = applyMove(board, crowningMoves[0])
    expect(newBoard[7][0]).toBe('B')
  })

  test('crowning during capture ends turn', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[2][3] = 'w'
    board[1][2] = 'b'; board[0][1] = ''
    const moves = legalMoves(board, 'white')
    const captureCrowning = moves.find(m => m.captures !== null && m.to[0] === 0)
    expect(captureCrowning).toBeDefined()
    const after = applyMove(board, captureCrowning!)
    expect(isKing(after[0][1])).toBe(true)
    expect(canContinueCapture(after, 0, 1)).toBe(false)
  })

  test('king moves in all 4 diagonals', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[3][2] = 'W'; board[4][1] = ''; board[4][3] = ''; board[2][1] = ''; board[2][3] = '';
    const moves = legalMoves(board, 'white')
    const kingMove = moves.find(m => m.from[0] === 3 && m.from[1] === 2)
    expect(kingMove).toBeDefined()
    const kingMoves = moves.filter(m => m.from[0] === 3 && m.from[1] === 2)
    expect(kingMoves.length).toBe(4)
  })

  test('king captures', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[3][2] = 'W'; board[4][1] = '';
    board[4][3] = 'b'; board[2][5] = '';
    const caps = pieceCaptures(board, 3, 2)
    expect(caps.length).toBeGreaterThan(0)
    expect(caps[0].captures).toEqual([4, 3])
  })

  test('king multi-capture continues', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[3][2] = 'W'
    board[4][3] = 'b'; board[6][5] = 'b'
    board[5][4] = ''; board[7][6] = ''
    const firstCapture = pieceCaptures(board, 3, 2)
    expect(firstCapture.length).toBeGreaterThan(0)
    const captureTo54 = firstCapture.find(m => m.to[0] === 5 && m.to[1] === 4)
    expect(captureTo54).toBeDefined()
    const afterFirst = applyMove(board, captureTo54!)
    expect(canContinueCapture(afterFirst, 5, 4)).toBe(true)
  })

  test('multi-capture chain', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][2] = 'w'
    board[4][3] = 'b'; board[2][3] = 'b'
    board[3][4] = ''; board[1][2] = ''
    const firstCapture = pieceCaptures(board, 5, 2)
    expect(firstCapture.length).toBe(1)
    const afterFirst = applyMove(board, firstCapture[0])
    expect(canContinueCapture(afterFirst, 3, 4)).toBe(true)
  })

  test('black king moves', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[4][3] = 'B'; board[5][2] = ''; board[5][4] = ''; board[3][2] = ''; board[3][4] = '';
    const moves = legalMoves(board, 'black')
    const kingMoves = moves.filter(m => m.from[0] === 4 && m.from[1] === 3)
    expect(kingMoves.length).toBe(4)
  })

  test('winner detection - no pieces', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[0][1] = 'w'
    expect(winner(board, 'black')).toBe('white')
  })

  test('winner detection - black wins', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[7][0] = 'b'
    expect(winner(board, 'white')).toBe('black')
  })

  test('winner detection - no moves', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[0][1] = 'b'
    board[1][0] = 'w'
    board[1][2] = 'w'
    board[2][3] = 'w'
    const w = winner(board, 'black')
    expect(w).toBe('white')
  })

  test('no winner in active game', () => {
    const board = initialBoard()
    expect(winner(board, 'white')).toBeNull()
  })

  test('canContinueCapture returns false for non-capturing piece', () => {
    const board = initialBoard()
    expect(canContinueCapture(board, 5, 0)).toBe(false)
  })

  test('canContinueCapture returns true after capture with more available', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][2] = 'w'
    board[4][3] = 'b'; board[2][3] = 'b'
    board[3][4] = ''; board[1][2] = ''
    const move = pieceCaptures(board, 5, 2)[0]
    const after = applyMove(board, move)
    expect(canContinueCapture(after, 3, 4)).toBe(true)
  })

  test('findLegalMove finds correct move', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[4][1] = 'w'; board[3][2] = 'b'; board[2][3] = '';
    const move = findLegalMove(board, 'white', [4, 1], [2, 3], null)
    expect(move).not.toBeNull()
    expect(move!.captures).toEqual([3, 2])
  })

  test('findLegalMove with restrictFrom returns only matching captures', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[5][2] = 'w'
    board[4][3] = 'b'; board[3][4] = ''
    board[5][6] = 'w'
    const move = findLegalMove(board, 'white', [5, 2], [3, 4], [5, 2])
    expect(move).not.toBeNull()
    expect(move!.captures).toEqual([4, 3])
  })

  test('findLegalMove returns null for illegal move', () => {
    const board = initialBoard()
    const move = findLegalMove(board, 'white', [5, 0], [6, 1], null)
    expect(move).toBeNull()
  })

  test('opponent function', () => {
    expect(opponent('white')).toBe('black')
    expect(opponent('black')).toBe('white')
  })

  test('colorOf function', () => {
    expect(colorOf('w')).toBe('white')
    expect(colorOf('W')).toBe('white')
    expect(colorOf('b')).toBe('black')
    expect(colorOf('B')).toBe('black')
    expect(colorOf('')).toBeNull()
  })

  test('isKing function', () => {
    expect(isKing('W')).toBe(true)
    expect(isKing('B')).toBe(true)
    expect(isKing('w')).toBe(false)
    expect(isKing('b')).toBe(false)
    expect(isKing('')).toBe(false)
  })

  test('applyMove with capture', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[4][1] = 'w'; board[3][2] = 'b'
    const newBoard = applyMove(board, { from: [4, 1], to: [2, 3], captures: [3, 2] })
    expect(newBoard[2][3]).toBe('w')
    expect(newBoard[3][2]).toBe('')
    expect(newBoard[4][1]).toBe('')
  })

  test('applyMove simple move moves piece', () => {
    const board = initialBoard()
    const newBoard = applyMove(board, { from: [5, 0], to: [4, 1], captures: null })
    expect(newBoard[4][1]).toBe('w')
    expect(newBoard[5][0]).toBe('')
  })

  test('pieceCaptures returns empty for piece with no captures', () => {
    const board = initialBoard()
    expect(pieceCaptures(board, 5, 0)).toEqual([])
  })

  test('pieceCaptures returns moves for piece with capture', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[4][1] = 'w'; board[3][2] = 'b'; board[2][3] = '';
    const captures = pieceCaptures(board, 4, 1)
    expect(captures.length).toBe(1)
    expect(captures[0].to).toEqual([2, 3])
    expect(captures[0].captures).toEqual([3, 2])
  })

  test('initial board black pieces positions', () => {
    const board = initialBoard()
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) expect(board[r][c]).toBe('b')
      }
    }
  })

  test('legalMoves empty when no moves exist', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''))
    board[0][1] = 'b'
    board[1][0] = 'w'; board[1][2] = 'w'
    board[2][3] = 'w'
    const moves = legalMoves(board, 'black')
    expect(moves.length).toBe(0)
  })
})
