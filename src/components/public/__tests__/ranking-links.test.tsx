/**
 * @jest-environment jsdom
 */
/* eslint-disable @next/next/no-img-element */
import { render, screen } from '@testing-library/react'
import type React from 'react'
import { RankingTable } from '../RankingTable'
import { RankingPodium } from '../ranking-podium'
import type { RankingEntry } from '@/lib/utils/types'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    const imageProps = { ...props }
    delete imageProps.fill
    delete imageProps.unoptimized
    return <img {...imageProps} alt={imageProps.alt ?? ''} />
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function makeEntry(overrides: Partial<RankingEntry> = {}): RankingEntry {
  return {
    palpiteGrupoId: 'grupo-1',
    participanteId: 'participante-1',
    nomeParticipante: 'João',
    nomeGrupo: 'João 1',
    apelido: 'joao',
    fotoUrl: 'https://example.com/foto.jpg',
    pontos: 120,
    placaresExatos: 10,
    vencedoresCorretos: 8,
    ...overrides,
  }
}

describe('links de participante no ranking público', () => {
  it('renderiza links de foto e nome no RankingTable', () => {
    render(<RankingTable ranking={[makeEntry()]} />)

    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/participantes/participante-1')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: /joão 1/i })).toHaveAttribute('href', '/participantes/participante-1')
    expect(screen.getByRole('img', { name: /foto de joão/i })).toBeInTheDocument()
  })

  it('mantém links no RankingTable quando fotoUrl é nulo', () => {
    render(<RankingTable ranking={[makeEntry({ fotoUrl: null })]} />)

    expect(screen.getByRole('link', { name: /ver perfil de joão/i })).toHaveAttribute('href', '/participantes/participante-1')
    expect(screen.getByRole('link', { name: /joão 1/i })).toHaveAttribute('href', '/participantes/participante-1')
  })

  it('renderiza links de foto e nome no RankingPodium', () => {
    render(<RankingPodium ranking={[makeEntry()]} />)

    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/participantes/participante-1')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: /joão 1/i })).toHaveAttribute('href', '/participantes/participante-1')
    expect(screen.getByRole('img', { name: /foto de joão/i })).toBeInTheDocument()
  })
})
