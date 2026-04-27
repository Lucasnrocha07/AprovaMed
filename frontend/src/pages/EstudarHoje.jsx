import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { SUBJECTS, SUBJECT_NAMES, TASK_TYPES, STATUS_OPTIONS, frentesFor, subjectColor, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, Clock } from "lucide-react";

const empty = { titulo: "", materia: "Biologia", frente: "Frente A", tipo: "teoria", tempo_min: 30, status: "pendente", data: todayISO(), observacoes: "" };

export default function EstudarHoje() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("today");

  const load = async () => {
    const params = filter === "today" ? { data: todayISO() } : {};
    const { data } = await api.get("/tasks", { params });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openCreate = () => {
    setForm({ ...empty, data: todayISO() });
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (t) => {
    setForm({ ...t });
    setEditing(t.id);
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/tasks/${editing}`, form);
        toast.success("Tarefa atualizada");
      } else {
        await api.post("/tasks", form);
        toast.success("Tarefa criada");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir esta tarefa?")) return;
    await api.delete(`/tasks/${id}`);
    toast.success("Excluída");
    load();
  };

  const toggleDone = async (t) => {
    const next = t.status === "concluido" ? "pendente" : "concluido";
    await api.put(`/tasks/${t.id}`, { ...t, status: next });
    load();
  };

  return (
    <div className="space-y-5" data-testid="estudar-hoje-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Estudar Hoje</div>
          <h1 className="font-heading text-4xl font-black mt-1">Sua rotina de hoje</h1>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="nb-border h-11 w-40 font-bold" data-testid="filter-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Apenas hoje</SelectItem>
              <SelectItem value="all">Todas as tarefas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-task-btn">
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">
          Nenhuma tarefa. Clique em <span className="font-bold">Nova</span> para começar.
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((t) => (
            <li key={t.id} className={`bg-card nb-border nb-shadow rounded-2xl p-4 flex items-center gap-3 ${t.status === "concluido" ? "opacity-70" : ""}`} data-testid={`task-${t.id}`}>
              <button
                onClick={() => toggleDone(t)}
                data-testid={`task-toggle-${t.id}`}
                className={`w-10 h-10 shrink-0 nb-border rounded-xl grid place-items-center transition-all ${t.status === "concluido" ? "bg-emerald-300 nb-shadow-sm" : "bg-background"}`}
              >
                {t.status === "concluido" && <Check className="w-5 h-5" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full nb-border text-[10px] font-black uppercase tracking-wider ${subjectColor(t.materia)} text-zinc-900`}>
                    {t.materia}{t.frente ? ` · ${t.frente}` : ""}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{TASK_TYPES.find((x) => x.value === t.tipo)?.label || t.tipo}</span>
                </div>
                <div className={`font-bold leading-tight ${t.status === "concluido" ? "line-through" : ""}`}>{t.titulo}</div>
                {t.observacoes && <div className="text-xs text-muted-foreground mt-1">{t.observacoes}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><Clock className="w-3 h-3" />{t.tempo_min}min</span>
                <Button size="icon" variant="outline" onClick={() => openEdit(t)} data-testid={`task-edit-${t.id}`} className="nb-border h-9 w-9"><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => remove(t.id)} data-testid={`task-delete-${t.id}`} className="nb-border h-9 w-9"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Título</Label>
              <Input className="nb-border h-11 mt-1" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} data-testid="task-titulo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Matéria</Label>
                <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v, frente: frentesFor(v)[0] || null })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="task-materia"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Frente</Label>
                <Select value={form.frente || ""} onValueChange={(v) => setForm({ ...form, frente: v || null })} disabled={!frentesFor(form.materia).length}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="task-frente"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {frentesFor(form.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="task-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="task-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Tempo (min)</Label>
                <Input type="number" className="nb-border h-11 mt-1" value={form.tempo_min} onChange={(e) => setForm({ ...form, tempo_min: parseInt(e.target.value || 0) })} data-testid="task-tempo" />
              </div>
              <div>
                <Label className="font-bold">Data</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="task-data" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="task-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="task-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
