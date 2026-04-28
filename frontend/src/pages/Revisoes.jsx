import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

const SHORT_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ROWS = [
  { key: "materia1", label: "Matéria 1", checkable: true },
  { key: "materia2", label: "Matéria 2", checkable: true },
  { key: "exercicios", label: "Exercícios", checkable: false },
];

const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  nome: "", data_inicio: todayISO(), data_fim: addDaysISO(todayISO(), 13),
  observacoes: "", semanas: [],
});

export default function Revisoes() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editCell, setEditCell] = useState(null); // {semanaIdx, rowKey, cellIdx}
  const [cellForm, setCellForm] = useState({ label: "", observacoes: "", concluido: false });

  const load = async () => {
    const { data } = await api.get("/conjuntos");
    setItems(data);
    if (data.length && !selectedId) setSelectedId(data[0].id);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const selected = items.find((x) => x.id === selectedId);

  const create = async () => {
    if (!form.nome.trim()) { toast.error("Informe um nome"); return; }
    try {
      const { data } = await api.post("/conjuntos", { ...form, semanas: [] });
      toast.success("Conjunto criado"); setOpenNew(false); setForm(emptyForm());
      await load(); setSelectedId(data.id);
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir este conjunto?")) return;
    await api.delete(`/conjuntos/${id}`);
    setSelectedId(null); load();
  };

  const saveSemanas = async (novasSemanas) => {
    const payload = { nome: selected.nome, data_inicio: selected.data_inicio, data_fim: selected.data_fim, observacoes: selected.observacoes || "", semanas: novasSemanas };
    const { data } = await api.put(`/conjuntos/${selected.id}`, payload);
    setItems((xs) => xs.map((x) => x.id === data.id ? data : x));
  };

  const toggleCell = async (semanaIdx, rowKey, cellIdx) => {
    const sem = JSON.parse(JSON.stringify(selected.semanas));
    sem[semanaIdx][rowKey][cellIdx].concluido = !sem[semanaIdx][rowKey][cellIdx].concluido;
    await saveSemanas(sem);
  };

  const openCellEditor = (semanaIdx, rowKey, cellIdx) => {
    const c = selected.semanas[semanaIdx][rowKey][cellIdx];
    setCellForm({ label: c.label || "", observacoes: c.observacoes || "", concluido: !!c.concluido });
    setEditCell({ semanaIdx, rowKey, cellIdx });
  };
  const saveCell = async () => {
    const sem = JSON.parse(JSON.stringify(selected.semanas));
    sem[editCell.semanaIdx][editCell.rowKey][editCell.cellIdx] = { ...cellForm };
    await saveSemanas(sem);
    setEditCell(null);
  };

  const progress = useMemo(() => {
    if (!selected) return { total: 0, done: 0 };
    let total = 0, done = 0;
    for (const s of selected.semanas || []) {
      for (const k of ["materia1", "materia2"]) {
        for (const c of s[k] || []) {
          if (c.label) { total++; if (c.concluido) done++; }
        }
      }
    }
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  }, [selected]);

  return (
    <div className="space-y-5" data-testid="revisoes-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Conjuntos de Revisão</div>
          <h1 className="font-heading text-4xl font-black mt-1">Ciclo de 2 semanas</h1>
          <p className="text-sm text-muted-foreground">2 frentes por semana, 2 semanas por conjunto</p>
        </div>
        <Button onClick={() => setOpenNew(true)} data-testid="new-conjunto-btn" className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11">
          <Plus className="w-4 h-4 mr-1" /> Novo conjunto
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center">
          <div className="text-muted-foreground mb-4">Você ainda não tem conjuntos de revisão.</div>
          <Button onClick={() => setOpenNew(true)} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold">Criar primeiro conjunto</Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                data-testid={`conjunto-tab-${c.id}`}
                className={`px-4 py-2 rounded-xl nb-border font-bold text-sm ${selectedId === c.id ? "bg-secondary nb-shadow-sm" : "bg-card"}`}
              >
                {c.nome}
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-5">
              <div className="bg-card nb-border nb-shadow rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-heading text-2xl font-black">{selected.nome}</h2>
                    <div className="text-xs font-bold text-muted-foreground mt-1">{formatDate(selected.data_inicio)} → {formatDate(selected.data_fim)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-3xl font-black">{progress.pct}%</div>
                    <div className="text-xs font-bold text-muted-foreground">{progress.done}/{progress.total} células</div>
                  </div>
                </div>
                <div className="mt-3 h-3 nb-border rounded-full overflow-hidden bg-muted">
                  <div className="h-full bg-emerald-300" style={{ width: `${progress.pct}%` }} />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="nb-border" onClick={() => remove(selected.id)} data-testid="conjunto-delete"><Trash2 className="w-3 h-3 mr-1" /> Excluir conjunto</Button>
                </div>
              </div>

              {(selected.semanas || []).map((sem, sIdx) => (
                <div key={sIdx} className="bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
                  <div className="p-4 bg-primary/30 border-b-2 border-foreground">
                    <div className="font-heading text-xl font-black">Semana {sem.num}</div>
                    <div className="text-xs font-bold text-muted-foreground">Sáb = SIMULADO · Dom = COMPLETAR/DESCANSO</div>
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="grid grid-cols-8 border-b-2 border-foreground bg-muted">
                        <div className="p-2 font-heading font-black text-sm">Linha</div>
                        {SHORT_DAYS.map((d) => <div key={d} className="p-2 font-heading font-black text-sm border-l-2 border-foreground text-center">{d}</div>)}
                      </div>
                      {ROWS.map((row) => (
                        <div key={row.key} className="grid grid-cols-8 border-b-2 border-foreground last:border-b-0">
                          <div className="p-2 font-bold text-sm bg-muted/50">{row.label}</div>
                          {(sem[row.key] || []).map((cell, cIdx) => (
                            <CellBox key={cIdx} cell={cell} checkable={row.checkable} onToggle={() => toggleCell(sIdx, row.key, cIdx)} onEdit={() => openCellEditor(sIdx, row.key, cIdx)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Mobile: per-day */}
                  <div className="md:hidden">
                    {SHORT_DAYS.map((d, cIdx) => (
                      <div key={d} className="border-b-2 border-foreground last:border-b-0 p-3">
                        <div className="font-heading font-black text-sm mb-2">{d}</div>
                        <div className="space-y-1">
                          {ROWS.map((row) => {
                            const cell = sem[row.key]?.[cIdx];
                            if (!cell) return null;
                            return (
                              <div key={row.key} className="flex items-center gap-2">
                                <div className="text-[10px] font-black uppercase w-14 shrink-0 text-muted-foreground">{row.label}</div>
                                <div className="flex-1">
                                  <CellBox cell={cell} checkable={row.checkable} onToggle={() => toggleCell(sIdx, row.key, cIdx)} onEdit={() => openCellEditor(sIdx, row.key, cIdx)} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* New conjunto dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">Novo conjunto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Nome</Label>
              <Input className="nb-border h-11 mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Conjunto 1 - Abril" data-testid="conj-form-nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Início</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value, data_fim: addDaysISO(e.target.value, 13) })} data-testid="conj-form-inicio" />
              </div>
              <div>
                <Label className="font-bold">Término (2 semanas)</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} data-testid="conj-form-fim" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="conj-form-obs" />
            </div>
            <div className="text-xs text-muted-foreground">As tabelas da Semana 1 e Semana 2 serão geradas automaticamente com o preenchimento padrão. Você pode editar cada célula depois.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={create} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="conj-save">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cell editor */}
      <Dialog open={!!editCell} onOpenChange={(o) => !o && setEditCell(null)}>
        <DialogContent className="nb-border max-w-md">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">Editar célula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Conteúdo</Label>
              <Input className="nb-border h-11 mt-1" value={cellForm.label} onChange={(e) => setCellForm({ ...cellForm, label: e.target.value })} placeholder="Ex: Matemática A" data-testid="cell-label" />
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={cellForm.observacoes} onChange={(e) => setCellForm({ ...cellForm, observacoes: e.target.value })} data-testid="cell-obs" />
            </div>
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={cellForm.concluido} onChange={(e) => setCellForm({ ...cellForm, concluido: e.target.checked })} data-testid="cell-done" />
              Concluído
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setEditCell(null)}>Cancelar</Button>
            <Button onClick={saveCell} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="cell-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CellBox = ({ cell, onToggle, onEdit, checkable = true }) => {
  const empty = !cell.label;
  const special = cell.label === "SIMULADO" || cell.label === "COMPLETAR";
  const bg = cell.concluido ? "bg-emerald-200"
    : special ? "bg-secondary/60"
    : empty ? "bg-background"
    : "bg-primary/30";
  return (
    <div className={`${bg} p-2 border-l-2 border-foreground min-h-[60px] flex items-start gap-1 group`}>
      {checkable ? (
        <button onClick={onToggle} className={`shrink-0 w-5 h-5 nb-border rounded grid place-items-center bg-white ${cell.concluido ? "bg-emerald-300" : ""}`}>
          {cell.concluido && <Check className="w-3 h-3" strokeWidth={3} />}
        </button>
      ) : (
        <div className="shrink-0 w-5 h-5" />
      )}
      <button onClick={onEdit} className="flex-1 text-left min-w-0">
        <div className={`text-xs font-bold leading-tight ${cell.concluido && checkable ? "line-through" : ""} ${empty ? "text-muted-foreground italic" : ""}`}>
          {cell.label || (checkable ? "Adicionar" : "Anotar...")}
        </div>
        {cell.observacoes && <div className="text-[10px] text-muted-foreground truncate">{cell.observacoes}</div>}
      </button>
    </div>
  );
};
