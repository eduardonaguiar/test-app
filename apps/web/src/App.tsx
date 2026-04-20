import { Route, Routes } from 'react-router-dom';
import { ExamDetailsPage } from './pages/ExamDetailsPage';
import { HomePage } from './pages/HomePage';

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
      <Route path="/exams/:examId" element={<ExamDetailsPage />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Routes>
  );
}
