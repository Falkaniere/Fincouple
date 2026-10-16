import Link from 'next/link';

import { H2, LEGAL_CONTACT, LegalPage, UL } from '@/components/legal';

export const metadata = { title: 'Termos de Uso · Pairly' };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updated="16 de outubro de 2026">
      <p>
        Estes termos explicam as regras para usar o Pairly. Ao entrar no app, você concorda com
        eles. Se não concordar, é só não usar.
      </p>

      <H2>1. O que é o Pairly e quem o mantém</H2>
      <p>
        O Pairly é um aplicativo web para um casal acompanhar os gastos, as contas a pagar e o
        limite do mês num só lugar. Ele é feito e mantido por uma pessoa física, não por uma
        empresa. Para qualquer assunto, escreva para{' '}
        <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT}`}>
          {LEGAL_CONTACT}
        </a>
        .
      </p>

      <H2>2. Quem pode usar</H2>
      <UL>
        <li>Você precisa ter 18 anos ou mais.</li>
        <li>
          O acesso é por um link enviado ao seu email, sem senha. Quem controla seu email controla
          seu acesso, então proteja-o.
        </li>
        <li>
          Cada controle é pensado para duas pessoas. Quem tem o código do convite e um email
          consegue entrar no controle, então compartilhe o código só com quem você quer lá dentro.
        </li>
      </UL>

      <H2>3. O que o app faz — e o que não faz</H2>
      <UL>
        <li>
          Você lança os valores à mão (ou importa de um extrato). O Pairly não se conecta ao seu
          banco, não movimenta dinheiro e não faz pagamentos.
        </li>
        <li>
          O app não dá conselho financeiro, de investimento ou jurídico. Os números são os que
          você e seu parceiro(a) informam.
        </li>
        <li>
          Cada casal é responsável pelo que lança. O app não confere se os valores estão certos.
        </li>
      </UL>

      <H2>4. Regras de uso</H2>
      <p>É proibido:</p>
      <UL>
        <li>tentar entrar num controle que não é seu, inclusive adivinhando códigos de convite;</li>
        <li>tentar burlar a segurança do app ou acessar dados de outros casais;</li>
        <li>usar o app para fraude, golpe ou qualquer atividade ilegal;</li>
        <li>sobrecarregar o serviço de propósito.</li>
      </UL>
      <p>
        Quem descumprir essas regras pode ter o acesso bloqueado, sem aviso prévio quando houver
        risco para outras pessoas.
      </p>

      <H2>5. Seus dados</H2>
      <p>
        Os dados que você lança continuam sendo seus. Como eles são tratados está na{' '}
        <Link className="font-medium text-brand underline" href="/privacidade">
          Política de Privacidade
        </Link>
        . Você pode baixar seus lançamentos a qualquer momento em Ajustes → Exportar.
      </p>

      <H2>6. Disponibilidade e mudanças no app</H2>
      <p>
        O Pairly é um projeto pessoal e funciona em regime de melhor esforço: pode ficar fora do
        ar, mudar, ganhar ou perder funções, ou até ser encerrado. Não há garantia de
        disponibilidade contínua. Se o serviço for encerrado, vou avisar dentro do app com
        antecedência razoável para você exportar seus dados.
      </p>

      <H2>7. Responsabilidade</H2>
      <p>
        Faço o possível para manter o app seguro e correto, mas ele é oferecido como está. Na
        medida permitida pela lei, não me responsabilizo por perdas decorrentes de erros de
        lançamento, indisponibilidade, perda de acesso ao seu email ou uso indevido do código do
        convite por quem você mesmo(a) o compartilhou. Isso não afasta direitos que a lei
        brasileira, incluindo o Código de Defesa do Consumidor, garante a você.
      </p>

      <H2>8. Mudanças nestes termos</H2>
      <p>
        Posso atualizar estes termos. Quando a mudança for relevante, aviso dentro do app, e a data
        no topo desta página muda. Continuar usando o app depois do aviso significa que você
        aceita a nova versão.
      </p>

      <H2>9. Lei aplicável</H2>
      <p>
        Estes termos seguem as leis do Brasil. Em caso de conflito, fica eleito o foro do seu
        domicílio, como a lei garante ao consumidor.
      </p>

      <H2>10. Contato</H2>
      <p>
        Dúvidas, reclamações ou pedidos:{' '}
        <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT}`}>
          {LEGAL_CONTACT}
        </a>
        .
      </p>
    </LegalPage>
  );
}
