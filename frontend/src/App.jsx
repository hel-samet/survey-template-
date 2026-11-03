import { Route, Routes } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import SuccessPage from './pages/SuccessPage.jsx';
import SurveyPage from './pages/SurveyPage.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Login from './pages/admin/Login.jsx';
import Questions from './pages/admin/Questions.jsx';
import Reports from './pages/admin/Reports.jsx';
import Responses from './pages/admin/Responses.jsx';
import SurveyBuilder from './pages/admin/SurveyBuilder.jsx';
import SurveyList from './pages/admin/SurveyList.jsx';
import TelegramSettings from './pages/admin/TelegramSettings.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="survey/:id" element={<SurveyPage />} />
        <Route path="success" element={<SuccessPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="admin/login" element={<Login />} />

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="surveys" element={<SurveyList />} />
        <Route path="surveys/new" element={<SurveyBuilder />} />
        <Route path="surveys/:id/edit" element={<SurveyBuilder />} />
        <Route path="surveys/:id/questions" element={<Questions />} />
        <Route path="surveys/:id/responses" element={<Responses />} />
        <Route path="surveys/:id/reports" element={<Reports />} />
        <Route path="telegram" element={<TelegramSettings />} />
      </Route>
    </Routes>
  );
}
