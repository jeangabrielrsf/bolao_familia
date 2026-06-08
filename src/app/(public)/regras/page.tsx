import { Card } from '@/components/ui/Card'

export default function RegrasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Regras</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Pontuação</h2>
        <Card padding="md">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Tabela de pontuação do bolão</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-semibold text-foreground">Palpite</th>
                  <th scope="col" className="py-2 font-semibold text-foreground text-right">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Placar exato</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vencedor correto (sem placar exato)</td>
                  <td className="py-2 text-right font-bold text-primary">6</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Campeão</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vice-campeão</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">3º lugar</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">4º lugar</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Artilheiro da Copa</td>
                  <td className="py-2 text-right font-bold text-primary">10</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-2 pr-4 font-bold text-foreground">Total máximo</td>
                  <td className="py-2 text-right font-bold text-primary text-lg">380</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Critérios de Desempate</h2>
        <Card padding="md">
          <ol className="list-decimal list-inside space-y-2 text-foreground">
            <li>Maior número de <strong>placares exatos</strong></li>
            <li>Maior número de <strong>vencedores corretos</strong></li>
          </ol>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Como Funciona</h2>
        <Card padding="md">
          <ul className="list-disc list-inside space-y-2 text-foreground">
            <li>Cada participante faz seus palpites para todos os jogos da Copa do Mundo 2026</li>
            <li>Os pontos são calculados automaticamente conforme os resultados reais</li>
            <li>Palpites extras (campeão, vice, 3º, 4º e artilheiro) valem pontos adicionais</li>
            <li>O ranking é atualizado em tempo real conforme os jogos são finalizados</li>
            <li>Ao final da Copa, o participante com mais pontos será o vencedor do bolão</li>
          </ul>
        </Card>
      </section>
    </div>
  )
}
