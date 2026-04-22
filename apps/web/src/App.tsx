import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AttemptExecutionPage } from './pages/AttemptExecutionPage';
import { ExamDetailsPage } from './pages/ExamDetailsPage';
import { HomePage } from './pages/HomePage';
import { AttemptResultPage } from './pages/AttemptResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { ImportExamPage } from './pages/ImportExamPage';
import { PerformanceDashboardPage } from './pages/PerformanceDashboardPage';
import { AuthoringTestsPage } from './pages/AuthoringTestsPage';
import { AuthoringTestEditorPage } from './pages/AuthoringTestEditorPage';

function PlaceholderPage() {
  return (
    <section className="page-section">
      <h1>Exam Runner</h1>
      <p>This route is reserved for upcoming features.</p>
    </section>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/authoring/tests/new" element={<AuthoringTestEditorPage />} />
      <Route path="/authoring/tests/:examId/edit" element={<AuthoringTestEditorPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/exams/import" element={<ImportExamPage />} />
        <Route path="/exams/:examId" element={<ExamDetailsPage />} />
        <Route path="/attempts/:attemptId" element={<AttemptExecutionPage />} />
        <Route path="/attempts/:attemptId/result" element={<AttemptResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/dashboard" element={<PerformanceDashboardPage />} />
        <Route path="/authoring/tests" element={<AuthoringTestsPage />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
}
