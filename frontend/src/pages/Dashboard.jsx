import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, subjectColor } from "@/lib/subjects";
import {
  CalendarCheck, RotateCcw, PenLine, Trophy, Target, Flame, ArrowRight,
  Calendar as CalendarIcon, BookMarked, Brain, AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)); }, []);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const metaQ = data.questoes_semana?.meta || 200;
  const totalQ = data.questoes_semana?.total || 0;
  const pctQ = Math.min(100, Math.round((totalQ / metaQ) * 100));

  return (
    <div className="space-y-6" data-testid="dashboard-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Olá, {user?.name?.split(" ")[0]} 👋</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight mt-1">O que estudar hoje?</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(data.flashcards_due || 0) > 0 && (
            <Link to="/flashcards/estudar">
              <Button className="h-12 px-5 nb-border nb-shadow nb-press bg-accent text-accent-foreground hover:bg-accent font-heading font-black" data-testid="cta-flashcards">
                <Brain className="w-4 h-4 mr-2" /> {data.flashcards_due} flashcards
              </Button>
            </Link>
          )}
          <Link to="/revisoes">
            <Button className="h-12 px-5 nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading font-black" data-testid="cta-revisoes">
              Revisões <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard tone="bg-primary/40" icon={Target} label="Prova principal" value={data.dias_restantes != null ? `${data.dias_restantes}d` : "—"} sub={data.prova_data ? `${data.vestibular_alvo || ""} · ${formatDate(data.prova_data)}` : "Configure no onboarding"} testid="stat-dias" />
        <StatCard tone="bg-accent/60" icon={Brain} label="Flashcards hoje" value={data.flashcards_due || 0} sub={data.flashcards_atrasados ? `${data.flashcards_atrasados} atrasados` : "Em dia"} testid="stat-fc" />
        <StatCard tone="bg-secondary/70" icon={Flame} label="Conjuntos de revisão" value={(data.conjuntos_progress || []).length} sub={(data.conjuntos_progress || []).length ? "Em andamento" : "Nenhum ativo"} testid="stat-conj" />
        <StatCard tone="bg-pink-200" icon={CalendarIcon} label="Eventos próximos" value={(data.eventos_proximos || []).length} sub={data.eventos_proximos?.[0]?.titulo || "—"} testid="stat-ev" />
      </div>

      {/* Grid 1: Meta semanal + Vestibulares próximos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card nb-border nb-shadow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-2xl font-black">Vestibulares próximos</h2>
            <Link to="/vestibulares" className="text-sm font-bold underline">Ver todos</Link>
          </div>
          {(data.vestibulares_proximos || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nenhum vestibular com data definida. <Link className="font-bold underline" to="/vestibulares">Adicione datas</Link>.</div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2">
              {data.vestibulares_proximos.map((v) => (
                <li key={v.id} className="bg-primary/30 nb-border rounded-xl p-3 flex items-center gap-3" data-testid={`dash-vest-${v.id}`}>
                  <div className="bg-white nb-border rounded-xl px-3 py-1.5 text-center shrink-0">
                    <div className="font-heading text-xl font-black leading-none">{v.dias_restantes}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">dias</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{v.nome}</div>
                    <div className="text-xs font-bold text-muted-foreground flex items-center gap-1"><BookMarked className="w-3 h-3" /> {formatDate(v.data_prova)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card nb-border nb-shadow rounded-2xl p-5">
          <h2 className="font-heading text-xl font-black mb-2">Meta semanal</h2>
          <div className="text-4xl font-heading font-black">{totalQ}<span className="text-lg text-muted-foreground">/{metaQ}</span></div>
          <div className="text-xs font-bold text-muted-foreground mb-2">questões resolvidas</div>
          <Progress value={pctQ} className="h-3 nb-border" />
          <div className="text-xs mt-2 font-bold">{pctQ}% da meta</div>
        </div>
      </div>

      {/* Grid 2: Conjuntos + Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card nb-border nb-shadow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl font-black flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Progresso das revisões</h2>
            <Link to="/revisoes" className="text-sm font-bold underline">Abrir</Link>
          </div>
          {(data.conjuntos_progress || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Nenhum conjunto criado. <Link className="font-bold underline" to="/revisoes">Criar agora</Link>.</div>
          ) : (
            <ul className="space-y-2">
              {data.conjuntos_progress.slice(0, 4).map((c) => (
                <li key={c.id} className="p-3 nb-border rounded-xl bg-background" data-testid={`dash-conj-${c.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(c.data_inicio)} → {formatDate(c.data_fim)}</div>
                    </div>
                    <div className="font-heading font-black text-2xl">{c.pct}%</div>
                  </div>
                  <div className="mt-1 h-2 nb-border rounded-full overflow-hidden bg-muted">
                    <div className="h-full bg-emerald-300" style={{ width: `${c.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card nb-border nb-shadow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl font-black flex items-center gap-2"><CalendarIcon className="w-5 h-5" /> Eventos próximos</h2>
            <Link to="/calendario" className="text-sm font-bold underline">Abrir</Link>
          </div>
          {(data.eventos_proximos || []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Nenhum evento. <Link className="font-bold underline" to="/calendario">Adicione um</Link>.</div>
          ) : (
            <ul className="space-y-2">
              {data.eventos_proximos.slice(0, 5).map((e) => {
                const tone = e.tipo === "prova" ? "bg-red-300" : e.tipo === "simulado" ? "bg-accent" : e.tipo === "lembrete" ? "bg-secondary" : e.tipo === "tarefa" ? "bg-emerald-300" : "bg-primary/40";
                return (
                <li key={e.id} className="p-3 nb-border rounded-xl bg-background flex items-center gap-3" data-testid={`dash-ev-${e.id}`}>
                  <div className={`${tone} nb-border rounded-xl px-2 py-1 text-center shrink-0`}>
                    <div className="text-[9px] font-bold uppercase text-zinc-800">{new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" })}</div>
                    <div className="font-heading text-lg font-black leading-none text-zinc-900">{e.data.slice(8, 10)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {e.tipo && <span className="text-[9px] font-black uppercase tracking-wider bg-white/70 px-1.5 py-0.5 rounded nb-border text-zinc-800">{e.tipo}</span>}
                      {e.prioridade === "alta" && <span className="text-[9px] font-black uppercase text-red-700 bg-white/70 px-1.5 py-0.5 rounded nb-border">Alta</span>}
                    </div>
                    <div className={`font-bold truncate ${e.concluido ? "line-through opacity-70" : ""}`}>{e.titulo}</div>
                    {e.hora && <div className="text-xs text-muted-foreground">{e.hora}</div>}
                  </div>
                </li>
              );})}
            </ul>
          )}
        </div>
      </div>

      {/* Grid 3: Ultima redacao + Ultimo simulado */}
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
  <div className={`${tone} nb-border nb-shadow rounded-2xl p-4`} data-testid={testid}>
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
      <Icon className="w-4 h-4" /> {label}
    </div>
    <div className="font-heading text-4xl font-black mt-1 leading-none">{value}</div>
    <div className="text-xs mt-2 font-bold text-zinc-700 line-clamp-1">{sub}</div>
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
