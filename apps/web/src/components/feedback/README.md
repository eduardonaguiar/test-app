# Feedback States (UI-3)

Primitives reutilizáveis para estados transientes e informativos da interface.

## Componentes

- `PageLoading`: loading de página/bloco principal quando a estrutura final ainda não pode renderizar.
- `EmptyState`: ausência legítima de dados (não erro).
- `InlineError`: erro contextual no fluxo da tela, com retry opcional.
- `SuccessAlert`: confirmação persistente/semi-persistente no contexto da página.
- `TableSkeleton`: loading para listas/tabelas densas.
- `CardSkeleton`: loading para grids/stack de cards.

## Convenções de uso

### Quando usar `PageLoading`
Use quando a tela principal ainda não tem dados mínimos para renderização.

Não use para ações locais em UI já renderizada.

### Quando usar `EmptyState`
Use apenas quando a operação foi bem-sucedida e retornou sem conteúdo.

Não use para falhas técnicas.

### Quando usar `InlineError`
Use para erros de bloco/seção, preferencialmente com ação de retry quando viável.

Não use como validação de campo nem fallback global de rota.

### Quando usar `SuccessAlert`
Use para confirmação contextual que precisa permanecer visível por algum tempo.

Não use para sucesso efêmero (toast curto).

### Quando usar skeletons
Use quando o layout final é conhecido e ajuda a preservar estabilidade visual.

Evite para carregamentos instantâneos ou estruturas indefinidas.
