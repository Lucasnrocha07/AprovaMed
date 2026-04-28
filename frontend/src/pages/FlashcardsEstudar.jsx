import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subjectColor } from "@/lib/subjects";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";

const ACTIONS = [
  { action: "errei", label: "Errei", tone: "bg-red-300", desc: "Voltar logo" },
  { action: "dificil", label: "Difícil", tone: "bg-orange-300", desc: "+ pouco" },
  { action: "bom", label: "Bom", tone: "bg-emerald-300", desc: "Normal" },
  { action: "facil", label: "Fácil", tone: "bg-sky-300", desc: "+ forte" },
];

export default function FlashcardsEstudar() {
  const [sp] = useSearchParams();
  const initialDeck = sp.get("deck") || "all";
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState(initialDeck);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startedAt] = useState(Date.now());
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);

  useEffect(() => { api.get("/decks-stats").then(({ data }) => setDecks(data)); }, []);

  const loadDue = async () => {
    const params = {};
    if (deckId && deckId !== "all") params.deck_id = deckId;
    const { data } = await api.get("/flashcards/due", { params });
    // shuffle
    const q = [...data].sort(() => Math.random() - 0.5);
    setQueue(q);
    setIdx(0);
    setShowAnswer(false);
  };
  useEffect(() => { loadDue(); /* eslint-disable-next-line */ }, [deckId]);

  const current = queue[idx];

  const review = async (action) => {
    if (!current) return;
    try {
      await api.post(`/flashcards/${current.id}/review`, { action });
      if (action === "errei") setErros((v) => v + 1);
      else setAcertos((v) => v + 1);
      setShowAnswer(false);
      setIdx((i) => i + 1);
    } catch { toast.error("Erro"); }
  };

  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  const restantes = queue.length - idx;
  const done = idx >= queue.length;

  return (
    <div className="space-y-4" data-testid="study-root">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/flashcards" data-testid="back-to-decks"><Button variant="outline" className="nb-border font-bold"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button></Link>
        <div className="flex gap-2">
          <Select value={deckId} onValueChange={setDeckId}>
            <SelectTrigger className="nb-border h-10 w-56 font-bold" data-testid="study-deck-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os baralhos</SelectItem>
              {decks.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDue} className="nb-border font-bold" data-testid="reload-queue">Reembaralhar</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Tile tone="bg-primary/40" icon={Clock} label="Restam" value={restantes} />
        <Tile tone="bg-emerald-200" icon={CheckCircle2} label="Acertos" value={acertos} />
        <Tile tone="bg-red-200" icon={XCircle} label="Erros" value={erros} />
        <Tile tone="bg-secondary/70" icon={Clock} label="Minutos" value={elapsedMin} />
      </div>

      {queue.length === 0 || done ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center" data-testid="study-empty">
          <Sparkles className="w-10 h-10 mx-auto mb-3" />
          <div className="font-heading text-2xl font-black mb-1">{done ? "Sessão concluída!" : "Nada pendente 🎉"}</div>
          <div className="text-sm text-muted-foreground mb-4">
            {done ? `Revisou ${idx} cartões · ${acertos} acertos · ${erros} erros` : "Você não tem cartões para revisar agora."}
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadDue} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold">Recarregar fila</Button>
            <Link to="/flashcards"><Button variant="outline" className="nb-border">Voltar aos baralhos</Button></Link>
          </div>
        </div>
      ) : (
        <div className="bg-card nb-border nb-shadow-lg rounded-2xl p-6 md:p-10 min-h-[50vh] flex flex-col" data-testid="study-card">
          <div className="flex flex-wrap gap-2 mb-4">
            {current.materia && <span className={`px-2 py-0.5 rounded-full nb-border text-[10px] font-black uppercase tracking-wider ${subjectColor(current.materia)} text-zinc-900`}>{current.materia}{current.frente ? ` · ${current.frente}` : ""}</span>}
            <span className="px-2 py-0.5 rounded-full nb-border bg-muted text-[10px] font-black uppercase">{current.status}</span>
            {(current.tags || []).map((t) => <span key={t} className="px-2 py-0.5 rounded-full nb-border text-[10px] font-bold bg-accent/40">#{t}</span>)}
          </div>

          <div className="flex-1 flex items-center justify-center text-center py-6">
            <div className="w-full">
              <div className="font-heading font-black text-2xl md:text-4xl leading-tight">{current.pergunta}</div>
              {showAnswer && (
                <>
                  <div className="my-6 h-0.5 bg-foreground/20 max-w-md mx-auto" />
                  <div className="font-figtree text-lg md:text-xl whitespace-pre-wrap" data-testid="study-answer">{current.resposta}</div>
                </>
              )}
            </div>
          </div>

          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              data-testid="show-answer-btn"
              className="w-full h-14 nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading text-lg font-black"
            >
              Mostrar resposta
            </Button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.action}
                  onClick={() => review(a.action)}
                  data-testid={`review-${a.action}`}
                  className={`${a.tone} nb-border nb-shadow nb-press rounded-xl p-3 text-zinc-900 text-left`}
                >
                  <div className="font-heading font-black text-lg">{a.label}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider">{a.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Tile = ({ tone, icon: Icon, label, value }) => (
  <div className={`${tone} nb-border nb-shadow-sm rounded-xl p-3`}>
    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-800"><Icon className="w-3 h-3" />{label}</div>
    <div className="font-heading text-2xl font-black text-zinc-900">{value}</div>
  </div>
);
