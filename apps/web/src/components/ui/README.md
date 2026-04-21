# UI Primitives (shadcn-inspired)

Esta pasta concentra as primitives reutilizáveis do frontend.

## Convenções

- Use `variant` para intenção semântica (`default`, `destructive`, etc.).
- Use `size` para densidade no `Button`.
- Evite classes arbitrárias nas páginas quando já existir primitive/variant equivalente.
- Se um padrão visual se repetir em 3+ pontos, promova para variant/componente.

## Organização

- `ui/*`: primitives base (Button, Input, Card, Badge, Alert, Dialog, Tabs).
- `components/import/*`: componentes compostos do fluxo de importação.

## Tokens

Tokens semânticos vivem em `src/styles.css` (`--primary`, `--muted`, `--border`, `--radius-*`, `--shadow-*`).
