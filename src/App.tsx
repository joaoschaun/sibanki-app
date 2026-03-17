import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useFinancialData } from './hooks/useFinancialData';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Recurring from './pages/Recurring';
import Accounts from './pages/Accounts';
import Cards from './pages/Cards';
import Planning from './pages/Planning';
import Budget from './pages/Budget';
import Growth from './pages/Growth';
import Social from './pages/Social';
import Consultant from './pages/Consultant';
import Education from './pages/Education';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';

export default function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { score, data } = useFinancialData(user?.uid);
  const avatarURL = data?.avatarURL ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const rootBg =
    theme === 'light'
      ? 'bg-zinc-50 text-zinc-950'
      : 'bg-[#05080d] text-zinc-100';

  return (
    <BrowserRouter>
      <div className={`min-h-screen ${rootBg} font-sans flex overflow-hidden`}>
        <Sidebar
          userName={user.displayName || data?.name || undefined}
          userEmail={user.email || undefined}
          avatarURL={avatarURL ?? user.photoURL ?? undefined}
          score={score}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-8 space-y-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/contas" element={<Accounts />} />
              <Route path="/cartoes" element={<Cards />} />
              <Route path="/lancamentos" element={<Transactions />} />
              <Route path="/recorrentes" element={<Recurring />} />
              <Route path="/transactions" element={<Navigate to="/lancamentos" replace />} />
              <Route path="/planejamento" element={<Planning />} />
              <Route path="/orcamento" element={<Budget />} />
              <Route path="/crescimento" element={<Growth />} />
              <Route path="/social" element={<Social />} />
              <Route path="/consultor-ia" element={<Consultant />} />
              <Route path="/educacao" element={<Education />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
