import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { FilePicker } from '../components/import/FilePicker';
import { ImportStatusPanel } from '../components/import/ImportStatusPanel';
import { Button } from '../components/ui/button';
import { useExamImport } from '../hooks/useExamImport';

async function readJsonFile(file: File): Promise<unknown> {
  const rawText = await file.text();
  return JSON.parse(rawText) as unknown;
}

export function ImportExamPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { isSubmitting, successResult, failure, submitImport, reset } = useExamImport();

  function handleFileSelected(file: File | null) {
    setSelectedFile(file);
    setFileError(null);
    reset();
  }

  async function handleImport() {
    if (!selectedFile) {
      setFileError('Selecione um arquivo JSON antes de importar.');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.json')) {
      setFileError('O arquivo selecionado não possui extensão .json.');
      return;
    }

    setFileError(null);

    let payload: unknown;

    try {
      payload = await readJsonFile(selectedFile);
    } catch {
      setFileError('O arquivo não contém JSON válido. Corrija e tente novamente.');
      return;
    }

    await submitImport(payload);
  }

  function handleResetAll() {
    setSelectedFile(null);
    setFileError(null);
    reset();
  }

  return (
    <div className="stack-md">
      <PageHeader
        title="Importar prova"
        description="Faça upload de um arquivo JSON compatível com o schema oficial de provas."
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
          fileError={fileError}
          isSubmitting={isSubmitting}
          onFileSelected={handleFileSelected}
        />
      </PageSection>

      <PageSection>
        <Button disabled={!selectedFile || isSubmitting} onClick={handleImport}>
          {isSubmitting ? 'Importando...' : 'Importar prova'}
        </Button>
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
