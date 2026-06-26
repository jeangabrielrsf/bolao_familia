/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { JogoSimulatorRow } from '../jogo-simulator-row'
import type { JogoComTimes } from '@/lib/services/bracket/types'

const makeJogo = (overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id: 'j1', fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: 'j1', dataHora: new Date(),
  ...overrides,
})

describe('JogoSimulatorRow', () => {
  it('renderiza nomes dos times', () => {
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={() => {}} />)
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('África do Sul')).toBeInTheDocument()
  })

  it('renderiza inputs com placares iniciais', () => {
    render(<JogoSimulatorRow jogo={makeJogo({ resultadoA: 2, resultadoB: 1 })} onPlacarChange={() => {}} />)
    const inputA = screen.getByLabelText('Placar México') as HTMLInputElement
    const inputB = screen.getByLabelText('Placar África do Sul') as HTMLInputElement
    expect(inputA.value).toBe('2')
    expect(inputB.value).toBe('1')
  })

  it('inputs começam vazios quando placar é null', () => {
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={() => {}} />)
    const inputA = screen.getByLabelText('Placar México') as HTMLInputElement
    expect(inputA.value).toBe('')
  })

  it('chama onPlacarChange ao digitar', () => {
    const onPlacarChange = jest.fn()
    render(<JogoSimulatorRow jogo={makeJogo()} onPlacarChange={onPlacarChange} />)
    const inputA = screen.getByLabelText('Placar México')
    fireEvent.change(inputA, { target: { value: '3' } })
    expect(onPlacarChange).toHaveBeenCalledWith(3, 0)
  })

  it('renderiza placares como texto quando jogo finalizado', () => {
    render(
      <JogoSimulatorRow
        jogo={makeJogo({ status: 'finalizado', resultadoA: 2, resultadoB: 1 })}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.queryByLabelText('Placar México')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
