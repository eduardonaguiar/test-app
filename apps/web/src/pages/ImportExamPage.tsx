import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <main className="page stack-md">
      <Link className="ui-button ui-button--ghost ui-button--sm" to="/">
        ← Voltar para provas
      </Link>

      <header className="page-header">
        <h1>Importar prova</h1>
        <p className="subtitle">
          Faça upload de um arquivo JSON compatível com o schema oficial de provas. Em caso de erro, o sistema
          exibirá detalhes de validação para facilitar correção.
        </p>
      </header>

      <FilePicker
        selectedFile={selectedFile}
        fileError={fileError}
        isSubmitting={isSubmitting}
        onFileSelected={handleFileSelected}
      />

      <section>
        <Button disabled={!selectedFile || isSubmitting} onClick={handleImport}>
          {isSubmitting ? 'Importando...' : 'Importar prova'}
        </Button>
      </section>

      <ImportStatusPanel
        isSubmitting={isSubmitting}
        successResult={successResult}
        failure={failure}
        onReset={handleResetAll}
      />
    </main>
  );
}
