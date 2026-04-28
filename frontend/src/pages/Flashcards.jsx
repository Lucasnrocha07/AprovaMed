import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SUBJECT_NAMES, frentesFor, subjectColor, formatDate } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Play, PauseCircle, PlayCircle, Sparkles } from "lucide-react";

const STATUS_LABELS = { novo: "Novo", aprendendo: "Aprendendo", revisao: "Revisão", suspenso: "Suspenso", concluido: "Concluído" };

// --- Simple CSV/TSV/TXT parser ---
function parseDelimited(text) {
  if (!text) return [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  // detect separator
  const sample = lines[0];
  const sep = sample.includes("\t") ? "\t" : (sample.includes(",") ? "," : (sample.includes(";") ? ";" : "\t"));
  const splitLine = (line) => {
    const out = [];
    let cur = "", inside = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inside && line[i + 1] === '"') { cur += '"'; i++; }
        else inside = !inside;
      } else if (ch === sep && !inside) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };
  const firstCols = splitLine(lines[0]).map((x) => x.toLowerCase());
  const knownHeaders = ["pergunta", "resposta", "materia", "frente", "baralho", "tags", "question", "answer"];
  const hasHeader = firstCols.some((c) => knownHeaders.includes(c));
  let headers, dataStart;
  if (hasHeader) {
    headers = firstCols.map((c) => {
      if (c === "question") return "pergunta";
      if (c === "answer") return "resposta";
      return c;
    });
    dataStart = 1;
  } else {
    headers = ["pergunta", "resposta"];
    dataStart = 0;
  }
  const rows = [];
  for (let i = dataStart; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = parts[idx] || ""; });
    if (row.pergunta && row.resposta) rows.push(row);
  }
  return rows;
}

const emptyDeck = () => ({ nome: "", materia: "", frente: "", descricao: "", tags: [] });
const emptyCard = (deckId) => ({ pergunta: "", resposta: "", materia: "", frente: "", deck_id: deckId, tags: [], dificuldade: 0, status: "novo", intervalo: 0, ease: 2.5, revisoes: 0, acertos: 0, erros: 0, historico: [], suspenso: false });

export default function Flashcards() {
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [filter, setFilter] = useState({ materia: "all", status: "all", q: "" });

  const [openDeck, setOpenDeck] = useState(false);
  const [deckForm, setDeckForm] = useState(emptyDeck());
  const [editingDeck, setEditingDeck] = useState(null);

  const [openCard, setOpenCard] = useState(false);
  const [cardForm, setCardForm] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const [openImport, setOpenImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importDeckId, setImportDeckId] = useState("");

  const loadAll = async () => {
    const [d, s] = await Promise.all([api.get("/decks-stats"), api.get("/flashcards/stats")]);
    setDecks(d.data);
    setStats(s.data);
    if (!selectedDeck && d.data.length) setSelectedDeck(d.data[0].id);
  };

  const loadCards = async () => {
    if (!selectedDeck) { setCards([]); return; }
    const { data } = await api.get("/flashcards", { params: { deck_id: selectedDeck } });
    setCards(data);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadCards(); /* eslint-disable-next-line */ }, [selectedDeck]);

  // deck CRUD
  const openCreateDeck = () => { setDeckForm(emptyDeck()); setEditingDeck(null); setOpenDeck(true); };
  const openEditDeck = (d) => { setDeckForm({ ...emptyDeck(), ...d }); setEditingDeck(d.id); setOpenDeck(true); };
  const saveDeck = async () => {
    try {
      const payload = {
        ...deckForm,
        frente: deckForm.frente || null,
        materia: deckForm.materia || null,
        tags: typeof deckForm.tags === "string" ? deckForm.tags.split(",").map((s) => s.trim()).filter(Boolean) : (deckForm.tags || []),
      };
      if (editingDeck) await api.put(`/decks/${editingDeck}`, payload);
      else {
        const { data } = await api.post("/decks", payload);
        setSelectedDeck(data.id);
      }
      setOpenDeck(false);
      toast.success("Salvo");
      loadAll();
    } catch { toast.error("Erro"); }
  };
  const removeDeck = async (id) => {
    if (!window.confirm("Excluir baralho? Os cartões não serão removidos automaticamente.")) return;
    await api.delete(`/decks/${id}`);
    if (selectedDeck === id) setSelectedDeck(null);
    loadAll();
  };

  // card CRUD
  const openCreateCard = () => { setCardForm(emptyCard(selectedDeck)); setEditingCard(null); setOpenCard(true); };
  const openEditCard = (c) => { setCardForm({ ...c, tags: (c.tags || []).join(", ") }); setEditingCard(c.id); setOpenCard(true); };
  const saveCard = async () => {
    try {
      const payload = {
        ...cardForm,
        tags: typeof cardForm.tags === "string" ? cardForm.tags.split(",").map((s) => s.trim()).filter(Boolean) : (cardForm.tags || []),
        frente: cardForm.frente || null,
        materia: cardForm.materia || null,
      };
      if (editingCard) await api.put(`/flashcards/${editingCard}`, payload);
      else await api.post("/flashcards", payload);
      setOpenCard(false);
      toast.success("Salvo");
      loadCards(); loadAll();
    } catch { toast.error("Erro"); }
  };
  const removeCard = async (id) => {
    if (!window.confirm("Excluir cartão?")) return;
    await api.delete(`/flashcards/${id}`);
    loadCards(); loadAll();
  };
  const toggleSuspend = async (c) => {
    await api.post(`/flashcards/${c.id}/suspend`);
    loadCards(); loadAll();
  };

  // import
  const openImportDialog = () => {
    setImportText("");
    setImportDeckId(selectedDeck || (decks[0]?.id ?? ""));
    setOpenImport(true);
  };
  const onFilePicked = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImportText(String(e.target?.result || ""));
    reader.readAsText(file);
  };
  const doImport = async () => {
    if (!importDeckId) { toast.error("Escolha um baralho"); return; }
    const rows = parseDelimited(importText);
    if (!rows.length) { toast.error("Nenhum cartão encontrado"); return; }
    try {
      const { data } = await api.post("/flashcards/import", {
        deck_id: importDeckId, cards: rows,
      });
      toast.success(`${data.created} cartões importados`);
      setOpenImport(false);
      setSelectedDeck(importDeckId);
      loadAll(); loadCards();
    } catch { toast.error("Erro ao importar"); }
  };

  // filtered cards
  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (filter.materia !== "all" && c.materia !== filter.materia) return false;
      if (filter.status !== "all" && c.status !== filter.status) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (!(c.pergunta || "").toLowerCase().includes(q) && !(c.resposta || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [cards, filter]);

  const currentDeck = decks.find((d) => d.id === selectedDeck);

  return (
    <div className="space-y-5" data-testid="flashcards-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Flashcards</div>
          <h1 className="font-heading text-4xl font-black mt-1">Memória de longo prazo</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateDeck} data-testid="new-deck-btn" className="nb-border nb-shadow nb-press bg-accent text-accent-foreground hover:bg-accent font-bold h-11">
            <Plus className="w-4 h-4 mr-1" /> Criar baralho
          </Button>
          <Button onClick={openImportDialog} data-testid="import-btn" className="nb-border nb-shadow nb-press bg-primary text-primary-foreground hover:bg-primary font-bold h-11">
            <Upload className="w-4 h-4 mr-1" /> Importar
          </Button>
          <Link to="/flashcards/estudar"><Button data-testid="study-now-btn" className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading font-black h-11">
            <Play className="w-4 h-4 mr-1" /> Estudar agora
          </Button></Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatTile tone="bg-primary/40" label="Para hoje" value={stats.due_hoje} />
          <StatTile tone="bg-destructive/30" label="Vencidos" value={stats.vencidos} />
          <StatTile tone="bg-secondary/60" label="Novos" value={stats.novos} />
          <StatTile tone="bg-accent/60" label="Em revisão" value={stats.revisao} />
          <StatTile tone="bg-muted" label="Taxa acerto" value={`${stats.taxa_acerto}%`} />
        </div>
      )}

      {decks.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3" />
          <div className="font-heading font-black text-xl mb-1">Crie seu primeiro baralho</div>
          <div className="text-sm text-muted-foreground mb-4">Ou importe uma planilha com pergunta/resposta para começar.</div>
          <div className="flex gap-2 justify-center">
            <Button onClick={openCreateDeck} className="nb-border nb-shadow bg-accent text-accent-foreground hover:bg-accent font-bold">Criar baralho</Button>
            <Button onClick={openImportDialog} className="nb-border nb-shadow bg-primary text-primary-foreground hover:bg-primary font-bold">Importar</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Deck cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {decks.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDeck(d.id)}
                data-testid={`deck-${d.id}`}
                className={`text-left ${selectedDeck === d.id ? "bg-secondary/70" : "bg-card"} nb-border nb-shadow rounded-2xl p-4 hover:nb-shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {d.materia && <span className={`px-2 py-0.5 rounded-full nb-border text-[10px] font-black uppercase tracking-wider ${subjectColor(d.materia)} text-zinc-900`}>{d.materia}{d.frente ? ` · ${d.frente}` : ""}</span>}
                    <div className="font-heading font-black text-xl mt-1 truncate">{d.nome}</div>
                    {d.descricao && <div className="text-xs text-muted-foreground mt-0.5">{d.descricao}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-heading text-2xl font-black">{d.total || 0}</div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">cartões</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 text-[10px] font-bold">
                  <span className="px-2 py-0.5 bg-primary/40 nb-border rounded">Novos {d.novos || 0}</span>
                  {(d.vencidos || 0) > 0 && <span className="px-2 py-0.5 bg-destructive/30 nb-border rounded">Vencidos {d.vencidos}</span>}
                  {d.ultima_revisao && <span className="px-2 py-0.5 bg-muted nb-border rounded">Último: {formatDate(d.ultima_revisao.slice(0, 10))}</span>}
                </div>
              </button>
            ))}
          </div>

          {currentDeck && (
            <div className="bg-card nb-border nb-shadow rounded-2xl p-5 space-y-3">
              <div className="flex items-end justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-heading text-2xl font-black">{currentDeck.nome}</h2>
                  <div className="text-xs text-muted-foreground font-bold">{cards.length} cartões no baralho</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="nb-border" onClick={() => openEditDeck(currentDeck)} data-testid="deck-edit"><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                  <Button size="sm" variant="outline" className="nb-border" onClick={() => removeDeck(currentDeck.id)} data-testid="deck-delete"><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
                  <Button size="sm" onClick={openCreateCard} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="add-card-btn"><Plus className="w-3 h-3 mr-1" /> Novo cartão</Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Buscar..." className="nb-border h-10 w-52" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} data-testid="fc-filter-q" />
                <Select value={filter.materia} onValueChange={(v) => setFilter({ ...filter, materia: v })}>
                  <SelectTrigger className="nb-border h-10 w-44" data-testid="fc-filter-materia"><SelectValue placeholder="Matéria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as matérias</SelectItem>
                    {SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                  <SelectTrigger className="nb-border h-10 w-44" data-testid="fc-filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="novo">Novos</SelectItem>
                    <SelectItem value="aprendendo">Aprendendo</SelectItem>
                    <SelectItem value="revisao">Em revisão</SelectItem>
                    <SelectItem value="suspenso">Suspensos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cards list */}
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">Nenhum cartão encontrado.</div>
              ) : (
                <ul className="grid md:grid-cols-2 gap-3">
                  {filtered.map((c) => (
                    <li key={c.id} className={`nb-border rounded-xl p-3 bg-background ${c.suspenso ? "opacity-60" : ""}`} data-testid={`card-${c.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {c.materia && <span className={`px-1.5 py-0.5 rounded-full nb-border text-[9px] font-black uppercase ${subjectColor(c.materia)} text-zinc-900`}>{c.materia}</span>}
                          <span className="px-1.5 py-0.5 rounded-full nb-border text-[9px] font-black uppercase bg-muted">{STATUS_LABELS[c.status] || c.status}</span>
                          {c.proxima_revisao && <span className="text-[10px] font-bold text-muted-foreground">Rev: {formatDate(c.proxima_revisao)}</span>}
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-bold line-clamp-2">{c.pergunta}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.resposta}</div>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="nb-border h-7" onClick={() => openEditCard(c)} data-testid={`card-edit-${c.id}`}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" className="nb-border h-7" onClick={() => toggleSuspend(c)} data-testid={`card-suspend-${c.id}`} title={c.suspenso ? "Reativar" : "Suspender"}>
                          {c.suspenso ? <PlayCircle className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="outline" className="nb-border h-7" onClick={() => removeCard(c.id)} data-testid={`card-delete-${c.id}`}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {/* Deck dialog */}
      <Dialog open={openDeck} onOpenChange={setOpenDeck}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editingDeck ? "Editar baralho" : "Novo baralho"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Nome</Label>
              <Input className="nb-border h-11 mt-1" value={deckForm.nome} onChange={(e) => setDeckForm({ ...deckForm, nome: e.target.value })} data-testid="deck-form-nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Matéria</Label>
                <Select value={deckForm.materia || "none"} onValueChange={(v) => setDeckForm({ ...deckForm, materia: v === "none" ? "" : v, frente: "" })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="deck-form-materia"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Frente</Label>
                <Select value={deckForm.frente || "none"} onValueChange={(v) => setDeckForm({ ...deckForm, frente: v === "none" ? "" : v })} disabled={!frentesFor(deckForm.materia).length}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="deck-form-frente"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {frentesFor(deckForm.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-bold">Descrição</Label>
              <Textarea className="nb-border mt-1" value={deckForm.descricao} onChange={(e) => setDeckForm({ ...deckForm, descricao: e.target.value })} data-testid="deck-form-desc" />
            </div>
            <div>
              <Label className="font-bold">Tags (separadas por vírgula)</Label>
              <Input className="nb-border h-11 mt-1" value={Array.isArray(deckForm.tags) ? deckForm.tags.join(", ") : deckForm.tags} onChange={(e) => setDeckForm({ ...deckForm, tags: e.target.value })} data-testid="deck-form-tags" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpenDeck(false)}>Cancelar</Button>
            <Button onClick={saveDeck} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="deck-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card dialog */}
      <Dialog open={openCard} onOpenChange={setOpenCard}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editingCard ? "Editar cartão" : "Novo cartão"}</DialogTitle></DialogHeader>
          {cardForm && (
            <div className="space-y-3">
              <div>
                <Label className="font-bold">Pergunta (frente)</Label>
                <Textarea className="nb-border mt-1" value={cardForm.pergunta} onChange={(e) => setCardForm({ ...cardForm, pergunta: e.target.value })} data-testid="card-pergunta" />
              </div>
              <div>
                <Label className="font-bold">Resposta (verso)</Label>
                <Textarea className="nb-border mt-1" value={cardForm.resposta} onChange={(e) => setCardForm({ ...cardForm, resposta: e.target.value })} data-testid="card-resposta" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold">Matéria</Label>
                  <Select value={cardForm.materia || "none"} onValueChange={(v) => setCardForm({ ...cardForm, materia: v === "none" ? "" : v, frente: "" })}>
                    <SelectTrigger className="nb-border h-11 mt-1" data-testid="card-materia"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold">Frente</Label>
                  <Select value={cardForm.frente || "none"} onValueChange={(v) => setCardForm({ ...cardForm, frente: v === "none" ? "" : v })} disabled={!frentesFor(cardForm.materia).length}>
                    <SelectTrigger className="nb-border h-11 mt-1" data-testid="card-frente"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {frentesFor(cardForm.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="font-bold">Tags (vírgula)</Label>
                <Input className="nb-border h-11 mt-1" value={Array.isArray(cardForm.tags) ? cardForm.tags.join(", ") : cardForm.tags} onChange={(e) => setCardForm({ ...cardForm, tags: e.target.value })} data-testid="card-tags" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpenCard(false)}>Cancelar</Button>
            <Button onClick={saveCard} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="card-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent className="nb-border max-w-2xl">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">Importar flashcards</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-primary/30 nb-border rounded-lg p-3 text-xs">
              <strong>Instruções:</strong> envie <b>CSV, TSV ou TXT</b> com as colunas <code>pergunta, resposta, materia, frente, baralho, tags</code>.
              Se o arquivo tiver apenas 2 colunas, usaremos coluna 1 = pergunta e coluna 2 = resposta.
              <br />XLSX e .apkg ainda não são suportados — por favor converta para CSV.
            </div>
            <div>
              <Label className="font-bold">Baralho destino</Label>
              <Select value={importDeckId} onValueChange={setImportDeckId}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="import-deck"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {decks.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Arquivo CSV/TSV/TXT</Label>
              <Input type="file" accept=".csv,.tsv,.txt" onChange={(e) => onFilePicked(e.target.files?.[0])} className="nb-border h-11 mt-1" data-testid="import-file" />
            </div>
            <div>
              <Label className="font-bold">Ou cole o conteúdo</Label>
              <Textarea className="nb-border mt-1 min-h-[160px] font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="pergunta,resposta,materia,frente,baralho,tags" data-testid="import-text" />
            </div>
            {importText && (
              <div className="text-xs font-bold text-muted-foreground">
                Preview: {parseDelimited(importText).length} cartões detectados
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpenImport(false)}>Cancelar</Button>
            <Button onClick={doImport} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="import-do">Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatTile = ({ tone, label, value }) => (
  <div className={`${tone} nb-border nb-shadow-sm rounded-2xl p-3`}>
    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-800">{label}</div>
    <div className="font-heading text-2xl font-black text-zinc-900 mt-0.5">{value}</div>
  </div>
);
