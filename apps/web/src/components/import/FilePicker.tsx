import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type FilePickerProps = {
  selectedFile: File | null;
  fileError: string | null;
  isSubmitting: boolean;
  onFileSelected: (file: File | null) => void;
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

export function FilePicker({ selectedFile, fileError, isSubmitting, onFileSelected }: FilePickerProps) {
  return (
    <Card aria-label="Seleção do arquivo JSON">
      <CardHeader>
        <CardTitle>Arquivo da prova</CardTitle>
        <CardDescription>Selecione um arquivo local no formato .json.</CardDescription>
      </CardHeader>
      <CardContent className="field-grid">
        <div>
          <Label htmlFor="exam-json">Arquivo JSON</Label>
          <Input
            id="exam-json"
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              onFileSelected(file);
            }}
            disabled={isSubmitting}
          />
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
              <dd>Pronto para importação</dd>
            </div>
          </dl>
        ) : (
          <p className="subtitle">Nenhum arquivo selecionado.</p>
        )}

        {fileError ? (
          <Alert variant="destructive">
            <AlertTitle>Falha na leitura do arquivo</AlertTitle>
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
