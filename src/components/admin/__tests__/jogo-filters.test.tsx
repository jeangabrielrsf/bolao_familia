/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { JogoFilters, FiltrosJogos } from '../jogo-filters'

const initial: FiltrosJogos = { fases: [], statuses: [], grupos: [], time: '', de: '', ate: '' }

describe('JogoFilters', () => {
  it('renderiza botões de fase', () => {
    render(<JogoFilters value={initial} onChange={() => {}} />)
    expect(screen.getByText('grupos')).toBeInTheDocument()
    expect(screen.getByText('oitavas')).toBeInTheDocument()
  })

  it('chama onChange ao clicar numa fase', () => {
    const onChange = jest.fn()
    render(<JogoFilters value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByText('grupos'))
    expect(onChange).toHaveBeenCalledWith({ ...initial, fases: ['grupos'] })
  })

  it('chama onChange ao digitar no input de time', () => {
    const onChange = jest.fn()
    render(<JogoFilters value={initial} onChange={onChange} />)
    const input = screen.getByPlaceholderText(/buscar time/i)
    fireEvent.change(input, { target: { value: 'Brasil' } })
    expect(onChange).toHaveBeenCalledWith({ ...initial, time: 'Brasil' })
  })
})
