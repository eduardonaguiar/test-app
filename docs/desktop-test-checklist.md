# Checklist de Validação Manual — Executável Windows

Este checklist serve para validar uma release local do aplicativo desktop Windows (empacotado com frontend + backend).

## Pré-requisitos

- [ ] Ter o instalador da release (`.exe`/`.msi`) disponível localmente.
- [ ] Ter um arquivo de prova JSON válido para teste (ex.: em `contracts/exam-schema/examples`).
- [ ] Estar com permissão de instalação no Windows (usuário com privilégios adequados).
- [ ] Fechar versões antigas do app antes de iniciar o checklist.

---

## 1) Instalação

- [ ] Executar o instalador do app.
- [ ] Confirmar que o assistente de instalação conclui sem erro.
- [ ] Validar que o atalho foi criado (menu Iniciar e/ou área de trabalho, conforme esperado).
- [ ] Validar que a pasta de instalação foi criada.
- [ ] Confirmar versão exibida no instalador (se aplicável) corresponde à release testada.

**Resultado esperado:** instalação concluída com sucesso e app pronto para abrir.

---

## 2) Primeira abertura

- [ ] Abrir o aplicativo pelo atalho instalado.
- [ ] Confirmar que a janela principal abre sem travar/fechar sozinha.
- [ ] Confirmar ausência de erro crítico visível na primeira renderização.
- [ ] Validar que a UI carrega com dados iniciais esperados (estado vazio quando não há provas importadas).

**Resultado esperado:** app inicia corretamente na primeira execução.

---

## 3) Inicialização do backend

- [ ] Após abrir o app, confirmar que o backend local sobe automaticamente.
- [ ] Validar que funcionalidades dependentes de API respondem (ex.: listagem de provas sem erro de conexão).
- [ ] Confirmar que não há mensagem de falha de conexão frontend-backend.
- [ ] (Opcional) Verificar endpoint de saúde (`/health`) via mecanismo disponível no app/logs.

**Resultado esperado:** backend inicializado e acessível pelo frontend.

---

## 4) Criação do banco SQLite

- [ ] Na primeira execução, validar que o arquivo de banco SQLite é criado automaticamente.
- [ ] Confirmar que o banco está em diretório persistente de dados do usuário (não temporário).
- [ ] Validar que não há erro de migração/criação de schema nos logs.

**Resultado esperado:** banco criado com schema válido e sem falhas.

---

## 5) Importação de JSON

- [ ] Usar a funcionalidade de importação para selecionar um JSON de prova válido.
- [ ] Confirmar mensagem de sucesso ao importar.
- [ ] Validar que a prova importada aparece na listagem.
- [ ] Abrir detalhes da prova importada e validar metadados principais (nome, duração, seções/perguntas).
- [ ] (Negativo opcional) Tentar importar JSON inválido e confirmar erro de validação claro.

**Resultado esperado:** importação válida persiste dados e importação inválida exibe erro amigável.

---

## 6) Realização de prova

- [ ] Iniciar uma tentativa de prova.
- [ ] Confirmar início do timer com contagem regressiva visível.
- [ ] Navegar entre questões e marcar respostas.
- [ ] Confirmar que respostas ficam salvas durante a tentativa (inclusive ao trocar de questão).
- [ ] Finalizar/submeter a prova manualmente.

**Resultado esperado:** fluxo de prova executa do início ao envio sem inconsistências.

---

## 7) Revisão do resultado

- [ ] Abrir a tela de resultado após submissão.
- [ ] Validar exibição de nota/percentual final.
- [ ] Validar indicação de acertos/erros por questão.
- [ ] Validar exibição de resposta correta e explicações.
- [ ] Validar presença no histórico de tentativas.

**Resultado esperado:** revisão completa e coerente com respostas enviadas.

---

## 8) Fechamento do app

- [ ] Fechar o aplicativo pela ação padrão de sair/fechar janela.
- [ ] Confirmar que o processo encerra sem ficar “preso” em segundo plano.
- [ ] Confirmar ausência de erro fatal no fechamento (popup/crash report inesperado).

**Resultado esperado:** encerramento limpo do frontend e backend embarcado.

---

## 9) Reabertura preservando dados

- [ ] Reabrir o aplicativo após fechamento completo.
- [ ] Confirmar que provas importadas continuam listadas.
- [ ] Confirmar que histórico de tentativas permanece disponível.
- [ ] Abrir resultado anterior e validar dados íntegros.

**Resultado esperado:** persistência local funcionando entre sessões.

---

## 10) Localização de logs

- [ ] Identificar o caminho de logs do app (frontend e backend, se separados).
- [ ] Validar que arquivos de log são gerados após uso normal.
- [ ] Validar presença de registros mínimos úteis: inicialização, importação, início/submissão de tentativa e erros.
- [ ] Registrar no relatório final os caminhos encontrados para suporte.

**Resultado esperado:** logs acessíveis para diagnóstico de problemas.

---

## 11) Desinstalação básica

- [ ] Desinstalar o app via “Aplicativos Instalados”/desinstalador oficial.
- [ ] Confirmar que binários/atalhos principais foram removidos.
- [ ] Validar comportamento esperado dos dados locais após desinstalação (removidos ou preservados conforme política do produto).
- [ ] Confirmar que não há processo residual do app após desinstalação.

**Resultado esperado:** desinstalação concluída sem erros e estado final consistente.

---

## Evidências recomendadas da validação

- [ ] Versão testada (tag/commit/build).
- [ ] Sistema operacional Windows (versão/edição).
- [ ] Capturas de tela dos principais marcos (instalação, importação, prova, resultado).
- [ ] Caminhos reais de banco/log identificados.
- [ ] Lista de defeitos encontrados (se houver), com severidade.
