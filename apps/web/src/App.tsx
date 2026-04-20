import { Route, Routes } from 'react-router-dom';
import { AttemptExecutionPage } from './pages/AttemptExecutionPage';
import { ExamDetailsPage } from './pages/ExamDetailsPage';
import { HomePage } from './pages/HomePage';
import { AttemptResultPage } from './pages/AttemptResultPage';
import { HistoryPage } from './pages/HistoryPage';

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
      <Route path="/attempts/:attemptId" element={<AttemptExecutionPage />} />
      <Route path="/attempts/:attemptId/result" element={<AttemptResultPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Routes>
  );
}
