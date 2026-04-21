import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePicker } from '../components/import/FilePicker';
import { ImportStatusPanel } from '../components/import/ImportStatusPanel';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Button } from '../components/ui/button';
import { useExamImport } from '../hooks/useExamImport';

type ParseState = 'idle' | 'parsing' | 'parseError' | 'ready';

type ParseFeedback = {
  state: ParseState;
  message: string | null;
};

async function readJsonFile(file: File): Promise<unknown> {
  const rawText = await file.text();
  return JSON.parse(rawText) as unknown;
}

export function ImportExamPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPayload, setParsedPayload] = useState<unknown>(null);
  const [parseFeedback, setParseFeedback] = useState<ParseFeedback>({ state: 'idle', message: null });
  const { isSubmitting, successResult, failure, submitImport, reset } = useExamImport();

  async function processFile(file: File | null) {
    setSelectedFile(file);
    setParsedPayload(null);
    reset();

    if (!file) {
      setParseFeedback({ state: 'idle', message: null });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setParseFeedback({
        state: 'parseError',
        message: 'O arquivo selecionado não possui extensão .json. Escolha um arquivo JSON válido.',
      });
      return;
    }

    setParseFeedback({ state: 'parsing', message: 'Lendo arquivo e validando JSON localmente...' });

    try {
      const payload = await readJsonFile(file);
      setParsedPayload(payload);
      setParseFeedback({
        state: 'ready',
        message: 'Arquivo lido com sucesso. Pronto para validação oficial e importação.',
      });
    } catch {
      setParseFeedback({
        state: 'parseError',
        message: 'Não foi possível interpretar o arquivo como JSON válido.',
      });
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      setParseFeedback({ state: 'parseError', message: 'Selecione um arquivo JSON antes de importar.' });
      return;
    }

    if (parseFeedback.state !== 'ready' || !parsedPayload) {
      setParseFeedback({
        state: 'parseError',
        message: 'Corrija os erros locais do arquivo antes de tentar importar.',
      });
      return;
    }

    await submitImport(parsedPayload);
  }

  function handleResetAll() {
    setSelectedFile(null);
    setParsedPayload(null);
    setParseFeedback({ state: 'idle', message: null });
    reset();
  }

  return (
    <div className="stack-md">
      <PageHeader
        title="Importar prova"
        description="Faça upload de um arquivo JSON compatível com o schema oficial de simulados."
        breadcrumbs={[
          { label: 'Simulados', to: '/' },
          { label: 'Importar prova' },
        ]}
        actions={
          <Link className="ui-button ui-button--outline ui-button--default-size" to="/">
            Voltar para simulados
          </Link>
        }
      />

      <PageSection>
        <FilePicker
          selectedFile={selectedFile}
          parseFeedback={parseFeedback}
          isSubmitting={isSubmitting}
          onFileSelected={processFile}
          onRemoveFile={handleResetAll}
        />
      </PageSection>

      <PageSection>
        <div className="inline-links">
          <Button disabled={parseFeedback.state !== 'ready' || isSubmitting} onClick={handleImport}>
            {isSubmitting ? 'Importando...' : 'Validar e importar prova'}
          </Button>
          <Button variant="outline" disabled={!selectedFile || isSubmitting} onClick={handleResetAll}>
            Limpar seleção
          </Button>
        </div>
      </PageSection>

      <PageSection>
        <ImportStatusPanel
          isSubmitting={isSubmitting}
          successResult={successResult}
          failure={failure}
          onReset={handleResetAll}
        />
      </PageSection>
    </div>
  );
}
