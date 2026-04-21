import { useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type ParseFeedback = {
  state: 'idle' | 'parsing' | 'parseError' | 'ready';
  message: string | null;
};

type FilePickerProps = {
  selectedFile: File | null;
  parseFeedback: ParseFeedback;
  isSubmitting: boolean;
  onFileSelected: (file: File | null) => void;
  onRemoveFile: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function parseStateBadge(parseState: ParseFeedback['state']) {
  if (parseState === 'ready') {
    return <Badge variant="success">JSON válido</Badge>;
  }

  if (parseState === 'parseError') {
    return <Badge variant="destructive">Falha no JSON</Badge>;
  }

  if (parseState === 'parsing') {
    return <Badge variant="warning">Lendo arquivo...</Badge>;
  }

  return <Badge variant="secondary">Aguardando arquivo</Badge>;
}

export function FilePicker({ selectedFile, parseFeedback, isSubmitting, onFileSelected, onRemoveFile }: FilePickerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card aria-label="Seleção do arquivo JSON">
      <CardHeader>
        <CardTitle>Arquivo da prova</CardTitle>
        <CardDescription>
          Faça upload de um arquivo JSON compatível com o schema oficial de simulados.
        </CardDescription>
      </CardHeader>

      <CardContent className="field-grid">
        <input
          ref={inputRef}
          id="exam-json"
          type="file"
          accept=".json,application/json"
          className="import-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onFileSelected(file);
          }}
          disabled={isSubmitting}
        />

        <button
          type="button"
          className={`import-dropzone ${isDragOver ? 'is-drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            const file = event.dataTransfer.files?.[0] ?? null;
            onFileSelected(file);
          }}
          disabled={isSubmitting}
        >
          <span className="import-dropzone__title">Arraste e solte o arquivo JSON aqui</span>
          <span className="import-dropzone__subtitle">ou clique para selecionar do seu computador</span>
          <span className="import-dropzone__hint">Formatos aceitos: .json</span>
        </button>

        <div className="inline-links">
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isSubmitting}>
            Selecionar arquivo
          </Button>
          {selectedFile ? (
            <Button variant="ghost" onClick={onRemoveFile} disabled={isSubmitting}>
              Remover arquivo
            </Button>
          ) : null}
        </div>

        {selectedFile ? (
          <dl className="meta-grid">
            <div>
              <dt>Nome</dt>
              <dd>{selectedFile.name}</dd>
            </div>
            <div>
              <dt>Tamanho</dt>
              <dd>{formatFileSize(selectedFile.size)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{parseStateBadge(parseFeedback.state)}</dd>
            </div>
          </dl>
        ) : (
          <p className="subtitle">Nenhum arquivo selecionado.</p>
        )}

        {parseFeedback.message ? (
          <Alert variant={parseFeedback.state === 'parseError' ? 'destructive' : 'success'}>
            <AlertTitle>
              {parseFeedback.state === 'parseError' ? 'Falha na leitura local' : 'Leitura local concluída'}
            </AlertTitle>
            <AlertDescription>{parseFeedback.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
