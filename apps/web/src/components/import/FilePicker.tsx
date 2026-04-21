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
    <section className="exam-card" aria-label="Seleção do arquivo JSON">
      <h2>Arquivo da prova</h2>
      <p>Selecione um arquivo local no formato .json.</p>

      <input
        type="file"
        accept=".json,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onFileSelected(file);
        }}
        disabled={isSubmitting}
      />

      {selectedFile ? (
        <div className="file-info">
          <p>
            <strong>Nome:</strong> {selectedFile.name}
          </p>
          <p>
            <strong>Tamanho:</strong> {formatFileSize(selectedFile.size)}
          </p>
          <p>
            <strong>Status:</strong> pronto para importação
          </p>
        </div>
      ) : (
        <p className="file-hint">Nenhum arquivo selecionado.</p>
      )}

      {fileError ? <p className="feedback-error">{fileError}</p> : null}
    </section>
  );
}
