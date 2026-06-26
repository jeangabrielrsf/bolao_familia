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

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

describe('GroupSimulator mobile drawer', () => {
  beforeEach(() => {
    mockMatchMedia(false) // mobile
    document.body.style.overflow = ''
  })

  it('renderiza drag handle visual (h-1 w-8 rounded-full)', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    const handle = document.body.querySelector('.h-1.w-8.rounded-full')
    expect(handle).toBeInTheDocument()
  })

  it('renderiza botão Fechar full-width no rodapé', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    const closeButton = screen.getByText('Fechar')
    expect(closeButton).toBeInTheDocument()
    expect(closeButton.className).toMatch(/w-full/)
  })

  it('Fechar no rodapé chama onOpenChange(false)', () => {
    const onOpenChange = jest.fn()
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={onOpenChange}
        onPlacarChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Fechar'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('trava body scroll quando abre (mobile)', () => {
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaura body scroll quando fecha (mobile)', () => {
    const { rerender } = render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open={false}
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('NÃO trava body scroll em desktop', () => {
    mockMatchMedia(true) // desktop
    render(
      <GroupSimulator
        grupo={makeGrupo()}
        jogos={[makeJogo('j1')]}
        open
        onOpenChange={() => {}}
        onPlacarChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
