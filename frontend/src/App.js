import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Revisoes from "@/pages/Revisoes";
import Cronograma from "@/pages/Cronograma";
import Calendario from "@/pages/Calendario";
import Questoes from "@/pages/Questoes";
import Redacao from "@/pages/Redacao";
import Simulados from "@/pages/Simulados";
import Vestibulares from "@/pages/Vestibulares";
import Notas from "@/pages/Notas";
import Flashcards from "@/pages/Flashcards";
import FlashcardsEstudar from "@/pages/FlashcardsEstudar";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />

      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="revisoes" element={<Revisoes />} />
        <Route path="cronograma" element={<Cronograma />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="flashcards/estudar" element={<FlashcardsEstudar />} />
        <Route path="questoes" element={<Questoes />} />
        <Route path="redacao" element={<Redacao />} />
        <Route path="simulados" element={<Simulados />} />
        <Route path="notas" element={<Notas />} />
        <Route path="vestibulares" element={<Vestibulares />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
