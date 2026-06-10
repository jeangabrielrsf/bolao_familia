import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function RegrasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Regras</h1>
        <p className="text-muted-foreground mt-1">Tudo sobre a pontuação e funcionamento do bolão</p>
      </div>

      <Accordion type="multiple" defaultValue={['pontuacao', 'desempate', 'como-funciona']} className="space-y-0">
        <AccordionItem value="pontuacao" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Pontuação</h2>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Placar exato</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Vencedor correto (sem placar exato)</TableCell><TableCell className="text-right font-display text-lg text-primary">6</TableCell></TableRow>
                <TableRow><TableCell>Campeão</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Vice-campeão</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>3º lugar</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>4º lugar</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Artilheiro da Copa</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total máximo</TableCell>
                  <TableCell className="text-right font-display text-xl text-primary">770</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="desempate" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Critérios de Desempate</h2>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Maior número de <strong>placares exatos</strong></li>
              <li>Maior número de <strong>vencedores corretos</strong></li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="como-funciona" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Como Funciona</h2>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Cada participante faz seus palpites para todos os jogos da Copa do Mundo 2026</li>
              <li>Os pontos são calculados automaticamente conforme os resultados reais</li>
              <li>Palpites extras (campeão, vice, 3º, 4º e artilheiro) valem pontos adicionais</li>
              <li>O ranking é atualizado em tempo real conforme os jogos são finalizados</li>
              <li>Ao final da Copa, o participante com mais pontos será o vencedor do bolão</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
