/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupSimulator } from '../group-simulator'
import type { JogoComTimes, ClassificacaoGrupo, ClassificacaoTime } from '@/lib/services/bracket/types'

const makeJogo = (id: string, overrides: Partial<JogoComTimes> = {}): JogoComTimes => ({
  id, fase: 'grupos', grupo: 'A', timeA: 'México', timeB: 'África do Sul',
  resultadoA: null, resultadoB: null, status: 'agendado',
  placarPenaltisA: null, placarPenaltisB: null, vencedor: null,
  sofascoreId: id, dataHora: new Date(),
  ...overrides,
})

// Workaround: o tipo `ClassificacaoGrupo.terceiro` exige `ClassificacaoTime` não-null,
// mas o componente não usa esse campo — só `grupo.grupo`. Construímos um valor mínimo
// válido para satisfazer o tipo sem usar `any`/cast duvidoso.
const makeTerceiro = (): ClassificacaoTime => ({
  time: 'placeholder',
  jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
  golsPro: 0, golsContra: 0, saldo: 0, pontos: 0,
  posicao: null,
  jogosDetalhe: [],
})

const makeGrupo = (): ClassificacaoGrupo => ({
  grupo: 'A',
  times: [],
  classificados: [],
  terceiro: makeTerceiro(),
})

describe('GroupSimulator', () => {
  it('renderiza header com nome do grupo', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
  })

  it('renderiza um row por jogo futuro', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1'), makeJogo('j2'), makeJogo('j3')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getAllByLabelText(/Placar/)).toHaveLength(6) // 2 inputs por row
  })

  it('mostra mensagem quando não há jogos futuros', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />
    )
    expect(screen.getByText(/nenhum jogo futuro/i)).toBeInTheDocument()
  })

  it('chama onPlacarChange ao editar', () => {
    const onPlacarChange = jest.fn()
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={onPlacarChange}
      />
    )
    fireEvent.change(screen.getByLabelText('Placar México'), { target: { value: '3' } })
    expect(onPlacarChange).toHaveBeenCalledWith('j1', 3, 0)
  })
})
