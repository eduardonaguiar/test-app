import { Route, Routes, useParams } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

function ExamDetailsPlaceholderPage() {
  const { examId } = useParams();

  return (
    <main className="page">
      <h1>Detalhes da prova</h1>
      <p>Esta rota foi reservada para a tela de detalhes da prova.</p>
      <p>Exam ID: {examId}</p>
    </main>
  );
}

function PlaceholderPage() {
  return (
    <main className="page">
      <h1>Exam Runner</h1>
      <p>This route is reserved for upcoming features.</p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exams/:examId" element={<ExamDetailsPlaceholderPage />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Routes>
  );
}
