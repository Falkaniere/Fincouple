import Link from 'next/link';

import { H2, LEGAL_CONTACT, LegalPage, UL } from '@/components/legal';

export const metadata = { title: 'Política de Privacidade · Pairly' };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updated="16 de outubro de 2026">
      <p>
        Aqui está, em linguagem simples, quais dados o Pairly guarda, para quê, com quem ficam e
        como você exerce seus direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <H2>1. Quem é o responsável</H2>
      <p>
        O Pairly é mantido por uma pessoa física, que é a controladora dos dados. Contato para
        qualquer assunto de dados:{' '}
        <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT}`}>
          {LEGAL_CONTACT}
        </a>
        .
      </p>

      <H2>2. Quais dados são guardados</H2>
      <UL>
        <li>
          <strong>Seu email</strong>, para criar sua conta e enviar o link de acesso.
        </li>
        <li>
          <strong>Dados do controle do casal</strong>: nome do controle, limite mensal, código do
          convite e quem são os membros (inclui o nome de exibição, se você informar um).
        </li>
        <li>
          <strong>O que você lança</strong>: gastos, receitas, categorias, parcelas e contas a
          pagar, com valores, datas e descrições.
        </li>
      </UL>
      <p>
        O Pairly não pede CPF, endereço, dados de cartão nem senha do banco, e não se conecta a
        instituições financeiras. Evite escrever dados sensíveis nas descrições dos lançamentos.
      </p>

      <H2>3. Para que usamos</H2>
      <p>
        Somente para o app funcionar: entrar na sua conta, mostrar os lançamentos para você e seu
        parceiro(a) nos dois aparelhos e gerar as exportações que você pedir. A base legal é a
        execução do serviço que você solicitou ao usar o app. Não há anúncios, não há perfil de
        consumo e não vendemos nem cedemos seus dados.
      </p>

      <H2>4. Quem enxerga seus dados</H2>
      <UL>
        <li>
          <strong>Você e quem está no seu controle.</strong> Cada casal só enxerga os próprios
          dados: isso é imposto no próprio banco de dados, e não só na tela do app.
        </li>
        <li>
          <strong>O responsável pelo app.</strong> Por ser quem administra o banco, ele tem acesso
          técnico aos dados guardados. O compromisso é usar esse acesso apenas para manutenção,
          segurança, suporte pedido por você ou obrigação legal, e nunca para olhar sua vida
          financeira por curiosidade.
        </li>
        <li>
          <strong>Prestadores de infraestrutura</strong>, que só processam os dados para o app
          funcionar: Supabase (banco de dados e envio do email de acesso, na região de São Paulo) e
          Vercel (hospedagem do site).
        </li>
      </UL>

      <H2>5. Segurança</H2>
      <p>
        A conexão com o app é criptografada (HTTPS) e o banco de dados guarda os dados em
        armazenamento criptografado pelo provedor. O acesso é por link no email, sem senha, e
        tentativas repetidas de adivinhar um código de convite são bloqueadas. Nenhum sistema é
        100% à prova de falhas; se houver um incidente que ponha seus dados em risco, você será
        avisado(a).
      </p>

      <H2>6. O que fica no seu aparelho</H2>
      <p>
        O app guarda no navegador apenas o necessário para funcionar: o login (cookies de sessão)
        e preferências de tela, como ter dispensado o convite de instalação ou ter visto o tour.
        Nenhum lançamento financeiro fica salvo no aparelho. O app não usa cookies de publicidade
        nem de rastreamento.
      </p>

      <H2>7. Por quanto tempo guardamos</H2>
      <p>
        Enquanto seu controle existir. Se você pedir a exclusão, os dados são apagados, salvo o que
        a lei obrigar a manter.
      </p>

      <H2>8. Seus direitos</H2>
      <p>Pela LGPD, você pode pedir a qualquer momento:</p>
      <UL>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incorretos;</li>
        <li>exclusão dos dados e da sua conta;</li>
        <li>portabilidade (uma cópia dos seus dados);</li>
        <li>informação sobre com quem os dados são compartilhados;</li>
        <li>revogação do consentimento, quando for essa a base legal.</li>
      </UL>
      <p>
        Você mesmo(a) pode baixar seus lançamentos em Ajustes → Exportar (planilha ou PDF). Para os
        demais pedidos, escreva para{' '}
        <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT}`}>
          {LEGAL_CONTACT}
        </a>
        . Respondo em até 15 dias. Hoje a exclusão da conta é feita por esse pedido, ainda não
        existe um botão no app. Sair do controle em Ajustes remove só o seu acesso; os dados
        continuam com a outra pessoa do casal.
      </p>

      <H2>9. Mudanças nesta política</H2>
      <p>
        Se algo mudar de forma relevante, aviso no app e a data no topo desta página é atualizada.
        As regras de uso estão nos{' '}
        <Link className="font-medium text-brand underline" href="/termos">
          Termos de Uso
        </Link>
        .
      </p>
    </LegalPage>
  );
}
