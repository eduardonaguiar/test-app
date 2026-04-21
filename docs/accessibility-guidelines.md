# Guia interno de acessibilidade (UX-9)

Este guia define padrões mínimos de acessibilidade para o frontend (`apps/web`) e deve ser usado em novas telas e refactors.

## 1) Foco visível e consistente

- Nunca remover `outline` sem alternativa equivalente.
- Todo elemento interativo (`button`, `a`, `input`, `select`, etc.) deve responder a `:focus-visible`.
- O projeto usa um anel visual único baseado no token `--ring` em `apps/web/src/styles.css`.

## 2) Semântica primeiro

- Use **`button`** para ações (abrir modal, enviar, limpar, etc.).
- Use **`a`/`Link`** para navegação entre rotas.
- Preferir `main`, `nav`, `section`, `header`, `footer`, `fieldset` e `legend` quando aplicável.
- Evite `role` redundante quando o HTML nativo já comunica corretamente.

## 3) Formulários e labels

- Todo `input`, `textarea` e `select` precisa de label associado (`label` + `htmlFor`/`id`).
- Placeholder é complemento de UX e **não** substitui label.
- Mensagens de erro/sucesso devem ser textuais (não depender apenas de cor).

## 4) Diálogos e componentes compostos

Para diálogos:

- foco inicial dentro do conteúdo;
- `Esc` fecha;
- trap de foco com `Tab` e `Shift+Tab`;
- retorno do foco ao gatilho ao fechar;
- título/descrição vinculados por `aria-labelledby`/`aria-describedby`.

Para dropdowns/selects:

- priorizar controles nativos acessíveis (`select`) ou componentes que respeitem teclado;
- garantir abertura, navegação e fechamento por teclado.

## 5) Teclado como fluxo principal

Validar sempre:

- navegação com `Tab` e `Shift+Tab`;
- ativação de botões com `Enter`/`Space`;
- fechamento de modal com `Esc`;
- ordem de foco alinhada ao fluxo visual.

## 6) Checklist de revisão em PR

- [ ] Existe foco visível em todos os controles interativos?
- [ ] Há labels explícitos para todos os campos?
- [ ] Há uso correto de `button` vs `link`?
- [ ] Modal/dialog está com foco controlado e `Esc` funcional?
- [ ] Não há estados comunicados apenas por cor?
- [ ] Fluxo crítico da tela funciona integralmente por teclado?
