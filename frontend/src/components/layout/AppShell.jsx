import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  RotateCcw,
  CalendarDays,
  ListChecks,
  PenLine,
  Trophy,
  BookMarked,
  Calendar as CalendarIcon,
  FileText,
  Brain,
  Sun,
  Moon,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/revisoes", label: "Revisões", icon: RotateCcw, testid: "nav-revisoes" },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays, testid: "nav-cronograma" },
  { to: "/calendario", label: "Calendário", icon: CalendarIcon, testid: "nav-calendario" },
  { to: "/flashcards", label: "Flashcards", icon: Brain, testid: "nav-flashcards" },
  { to: "/questoes", label: "Questões", icon: ListChecks, testid: "nav-questoes" },
  { to: "/redacao", label: "Redação", icon: PenLine, testid: "nav-redacao" },
  { to: "/simulados", label: "Simulados", icon: Trophy, testid: "nav-simulados" },
  { to: "/notas", label: "Anotações", icon: FileText, testid: "nav-notas" },
  { to: "/vestibulares", label: "Vestibulares", icon: BookMarked, testid: "nav-vestibulares" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r-2 border-foreground p-5 gap-4 bg-card">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")} data-testid="brand-logo">
          <div className="w-11 h-11 grid place-items-center rounded-xl bg-secondary nb-border nb-shadow-sm">
            <GraduationCap className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading font-black text-xl leading-none">AprovaMed</div>
            <div className="text-xs text-muted-foreground font-semibold tracking-wide">PLANNER</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 mt-2 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive ? "bg-secondary nb-border nb-shadow-sm text-secondary-foreground" : "hover:bg-muted"
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" strokeWidth={2.25} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="rounded-xl nb-border bg-muted px-3 py-2 text-xs">
            <div className="font-bold truncate">{user?.name}</div>
            <div className="text-muted-foreground truncate">{user?.email}</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={toggle} data-testid="theme-toggle" className="flex-1 nb-border nb-shadow-sm font-bold">
              {theme === "dark" ? <Sun className="w-4 h-4 mr-1" /> : <Moon className="w-4 h-4 mr-1" />}
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
            <Button type="button" variant="outline" onClick={logout} data-testid="logout-btn" className="nb-border nb-shadow-sm font-bold">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b-2 border-foreground bg-card sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 grid place-items-center rounded-lg bg-secondary nb-border">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="font-heading font-black text-lg">AprovaMed</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={toggle} className="nb-border" data-testid="theme-toggle-mobile">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={logout} className="nb-border" data-testid="logout-mobile">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-24 md:pb-6">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t-2 border-foreground">
        <div className="flex overflow-x-auto no-scrollbar gap-1 px-2 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`${item.testid}-mobile`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[70px] px-2 py-2 rounded-lg text-[11px] font-bold ${
                  isActive ? "bg-secondary nb-border" : ""
                }`
              }
            >
              <item.icon className="w-5 h-5 mb-0.5" strokeWidth={2.25} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
