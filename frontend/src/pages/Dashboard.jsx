import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, subjectColor } from "@/lib/subjects";
import { CalendarCheck, RotateCcw, ListChecks, PenLine, Trophy, Target, Flame, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const metaQ = data.questoes_semana?.meta || 200;
  const totalQ = data.questoes_semana?.total || 0;
  const pctQ = Math.min(100, Math.round((totalQ / metaQ) * 100));

  const totalTasks = data.tasks_today?.length || 0;
  const doneTasks = (data.tasks_today || []).filter((t) => t.status === "concluido").length;

  return (
    <div className="space-y-6" data-testid="dashboard-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
            Olá, {user?.name?.split(" ")[0]} 👋
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight mt-1">
            O que estudar hoje?
          </h1>
        </div>
        <Link to="/estudar-hoje">
          <Button className="h-12 px-6 nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading font-black" data-testid="cta-estudar-hoje">
            Estudar agora <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          tone="bg-primary/40"
          icon={Target}
          label="Dias até a prova"
          value={data.dias_restantes != null ? data.dias_restantes : "—"}
          sub={data.prova_data ? `${data.vestibular_alvo} · ${formatDate(data.prova_data)}` : "Configure no onboarding"}
          testid="stat-dias"
        />
        <StatCard
          tone="bg-accent/60"
          icon={CalendarCheck}
          label="Tarefas de hoje"
          value={`${doneTasks}/${totalTasks}`}
          sub={totalTasks ? `${Math.round((doneTasks / totalTasks) * 100)}% concluído` : "Nada por hoje"}
          testid="stat-tasks"
        />
        <StatCard
          tone="bg-secondary/70"
          icon={Flame}
          label="Revisões pendentes"
          value={data.revisoes_pendentes?.length || 0}
          sub="Spaced repetition"
          testid="stat-revisoes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card nb-border nb-shadow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-2xl font-black">Tarefas de hoje</h2>
            <Link to="/estudar-hoje" className="text-sm font-bold underline">Ver todas</Link>
          </div>
          {totalTasks === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma tarefa para hoje. Crie tarefas em <Link className="font-bold underline" to="/estudar-hoje">Estudar Hoje</Link>.
            </div>
          ) : (
            <ul className="space-y-2">
              {(data.tasks_today || []).slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between p-3 nb-border rounded-xl bg-background">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full nb-border text-[10px] font-black uppercase tracking-wider ${subjectColor(t.materia)} text-zinc-900`}>
                      {t.materia}
                    </span>
                    <span className={`truncate font-semibold ${t.status === "concluido" ? "line-through text-muted-foreground" : ""}`}>
                      {t.titulo}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{t.tempo_min}min</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card nb-border nb-shadow rounded-2xl p-5">
          <h2 className="font-heading text-2xl font-black mb-3">Meta semanal</h2>
          <div className="text-4xl font-heading font-black">{totalQ}<span className="text-lg text-muted-foreground">/{metaQ}</span></div>
          <div className="text-xs font-bold text-muted-foreground mb-2">questões resolvidas</div>
          <Progress value={pctQ} className="h-3 nb-border" />
          <div className="text-xs mt-2 font-bold">{pctQ}% da meta</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniCard title="Última redação" icon={PenLine} testid="mini-redacao" link="/redacao" tone="bg-secondary/40">
          {data.ultima_redacao ? (
            <>
              <div className="font-bold text-lg leading-tight">{data.ultima_redacao.tema}</div>
              <div className="text-sm text-muted-foreground">{formatDate(data.ultima_redacao.data)}</div>
              <div className="mt-2 text-2xl font-heading font-black">Nota {data.ultima_redacao.nota_total}</div>
            </>
          ) : <div className="text-sm text-muted-foreground">Nenhuma redação registrada.</div>}
        </MiniCard>

        <MiniCard title="Último simulado" icon={Trophy} testid="mini-simulado" link="/simulados" tone="bg-accent/40">
          {data.ultimo_simulado ? (
            <>
              <div className="font-bold text-lg leading-tight">{data.ultimo_simulado.nome}</div>
              <div className="text-sm text-muted-foreground">{formatDate(data.ultimo_simulado.data)}</div>
              <div className="mt-2 text-2xl font-heading font-black">{data.ultimo_simulado.percentual}%</div>
            </>
          ) : <div className="text-sm text-muted-foreground">Nenhum simulado registrado.</div>}
        </MiniCard>
      </div>
    </div>
  );
}

const StatCard = ({ tone, icon: Icon, label, value, sub, testid }) => (
  <div className={`${tone} nb-border nb-shadow rounded-2xl p-5`} data-testid={testid}>
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <div className="font-heading text-5xl font-black mt-2 leading-none">{value}</div>
    <div className="text-xs mt-2 font-bold text-zinc-700">{sub}</div>
  </div>
);

const MiniCard = ({ title, icon: Icon, children, link, tone, testid }) => (
  <Link to={link} data-testid={testid} className={`${tone} block nb-border nb-shadow rounded-2xl p-5 hover:nb-shadow-lg transition-shadow`}>
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider mb-2">
      <Icon className="w-4 h-4" /> {title}
    </div>
    {children}
  </Link>
);
