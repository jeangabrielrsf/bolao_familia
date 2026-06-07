import { prisma } from '../client'
import { PONTUACAO_PADRAO, CONFIG_CHAVES } from '@/lib/utils/constants'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'

export async function getConfiguracao(): Promise<ConfiguracaoPontuacao> {
  const config = await prisma.configuracao.findUnique({
    where: { chave: CONFIG_CHAVES.PONTUACAO },
  })

  if (!config) return PONTUACAO_PADRAO

  return { ...PONTUACAO_PADRAO, ...JSON.parse(config.valor) }
}

export async function setConfiguracao(pontuacao: ConfiguracaoPontuacao): Promise<void> {
  await prisma.configuracao.upsert({
    where: { chave: CONFIG_CHAVES.PONTUACAO },
    update: { valor: JSON.stringify(pontuacao) },
    create: {
      chave: CONFIG_CHAVES.PONTUACAO,
      valor: JSON.stringify(pontuacao),
      descricao: 'Pontuação do bolão',
    },
  })
}
