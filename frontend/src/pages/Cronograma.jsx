import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SUBJECT_NAMES, TASK_TYPES_EXT, frentesFor, subjectColor } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const BLOCKS = [
  { id: "manha", label: "Manhã", range: "06:00 – 12:00" },
  { id: "tarde", label: "Tarde", range: "12:00 – 18:00" },
  { id: "noite", label: "Noite", range: "18:00 – 23:59" },
];

const emptyForm = (dia_semana = 0, bloco = "manha") => ({
  dia_semana, bloco, hora_inicio: "", hora_fim: "",
  materia: "Biologia", frente: "Frente A", tipo: "teoria",
  observacoes: "", concluido: false,
});

export default function Cronograma() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/cronograma-fixo");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = (dia, bloco) => {
    const defaultHours = { manha: ["08:00", "09:00"], tarde: ["14:00", "15:00"], noite: ["19:00", "20:00"] }[bloco];
    setForm({ ...emptyForm(dia, bloco), hora_inicio: defaultHours[0], hora_fim: defaultHours[1] });
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (it) => { setForm({ ...it }); setEditing(it.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, dia_semana: parseInt(form.dia_semana), frente: form.frente || null };
      if (editing) await api.put(`/cronograma-fixo/${editing}`, payload);
      else await api.post("/cronograma-fixo", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro ao salvar"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este bloco?")) return;
    await api.delete(`/cronograma-fixo/${id}`); load();
  };
  const toggleDone = async (it) => {
    await api.put(`/cronograma-fixo/${it.id}`, { ...it, concluido: !it.concluido });
    load();
  };

  const grid = useMemo(() => {
    const g = {};
    for (const it of items) {
      g[it.dia_semana] = g[it.dia_semana] || {};
      g[it.dia_semana][it.bloco] = g[it.dia_semana][it.bloco] || [];
      g[it.dia_semana][it.bloco].push(it);
    }
    for (const d in g) for (const b in g[d]) g[d][b].sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));
    return g;
  }, [items]);

  return (
    <div className="space-y-5" data-testid="cronograma-root">
      <div>
        <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Rotina semanal fixa</div>
        <h1 className="font-heading text-4xl font-black mt-1">Cronograma</h1>
        <p className="text-sm text-muted-foreground">Sua grade semanal padrão. Vale toda semana.</p>
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
        <div className="grid grid-cols-8 border-b-2 border-foreground">
          <div className="p-3 font-heading font-black text-sm bg-muted">Horário</div>
          {DAYS.map((d) => <div key={d} className="p-3 font-heading font-black text-sm bg-muted border-l-2 border-foreground text-center">{d}</div>)}
        </div>
        {BLOCKS.map((blk) => (
          <div key={blk.id} className="grid grid-cols-8 border-b-2 border-foreground last:border-b-0">
            <div className="p-3 bg-muted/50">
              <div className="font-heading font-black">{blk.label}</div>
              <div className="text-[10px] font-bold text-muted-foreground">{blk.range}</div>
            </div>
            {DAYS.map((_, d) => {
              const cell = grid[d]?.[blk.id] || [];
              return (
                <div key={d + blk.id} className="p-2 border-l-2 border-foreground min-h-[110px] space-y-1">
                  {cell.map((s) => <Chip key={s.id} s={s} onEdit={openEdit} onDelete={remove} onToggle={toggleDone} />)}
                  <button onClick={() => openCreate(d, blk.id)} data-testid={`add-${d}-${blk.id}`} className="w-full h-7 rounded-lg border-2 border-dashed border-foreground/40 text-[11px] font-bold text-muted-foreground hover:bg-secondary/30">
                    <Plus className="w-3 h-3 inline mr-0.5" /> Adicionar
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-4">
        {DAYS.map((dayName, d) => (
          <div key={d} className="bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
            <div className="p-3 bg-muted border-b-2 border-foreground">
              <div className="font-heading font-black">{dayName}</div>
            </div>
            {BLOCKS.map((blk) => {
              const cell = grid[d]?.[blk.id] || [];
              return (
                <div key={blk.id} className="p-3 border-b-2 border-foreground last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black uppercase tracking-wider">{blk.label}</div>
                    <button onClick={() => openCreate(d, blk.id)} data-testid={`m-add-${d}-${blk.id}`} className="text-xs font-bold px-2 py-1 rounded-lg nb-border bg-secondary/60"><Plus className="w-3 h-3 inline" /> Add</button>
                  </div>
                  <div className="space-y-1">
                    {cell.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                    {cell.map((s) => <Chip key={s.id} s={s} onEdit={openEdit} onDelete={remove} onToggle={toggleDone} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar bloco" : "Novo bloco"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-bold">Dia da semana</Label>
              <Select value={String(form.dia_semana)} onValueChange={(v) => setForm({ ...form, dia_semana: parseInt(v) })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cf-form-dia"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Bloco</Label>
              <Select value={form.bloco} onValueChange={(v) => setForm({ ...form, bloco: v })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cf-form-bloco"><SelectValue /></SelectTrigger>
                <SelectContent>{BLOCKS.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Início (opcional)</Label>
              <Input type="time" className="nb-border h-11 mt-1" value={form.hora_inicio || ""} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} data-testid="cf-form-ini" />
            </div>
            <div>
              <Label className="font-bold">Término (opcional)</Label>
              <Input type="time" className="nb-border h-11 mt-1" value={form.hora_fim || ""} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} data-testid="cf-form-fim" />
            </div>
            <div>
              <Label className="font-bold">Matéria</Label>
              <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v, frente: frentesFor(v)[0] || null })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cf-form-materia"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Frente</Label>
              <Select value={form.frente || "none"} onValueChange={(v) => setForm({ ...form, frente: v === "none" ? null : v })} disabled={!frentesFor(form.materia).length}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cf-form-frente"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {frentesFor(form.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="font-bold">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cf-form-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES_EXT.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="cf-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="cf-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Chip = ({ s, onEdit, onDelete, onToggle }) => (
  <div className={`${subjectColor(s.materia)} nb-border rounded-lg p-1.5 text-[11px] group ${s.concluido ? "opacity-60" : ""}`} data-testid={`cfx-${s.id}`}>
    <div className="flex items-center justify-between gap-1">
      <div className={`font-bold text-zinc-900 truncate ${s.concluido ? "line-through" : ""}`}>
        {s.hora_inicio && `${s.hora_inicio} `}{s.materia}{s.frente ? ` · ${s.frente}` : ""}
      </div>
      <button onClick={() => onToggle(s)} data-testid={`cfx-toggle-${s.id}`} className={`shrink-0 w-5 h-5 nb-border rounded grid place-items-center bg-white ${s.concluido ? "bg-emerald-200" : ""}`}>
        {s.concluido && <Check className="w-3 h-3" strokeWidth={3} />}
      </button>
    </div>
    {s.observacoes && <div className="text-[10px] text-zinc-700 truncate">{s.observacoes}</div>}
    <div className="flex gap-1 mt-1">
      <button onClick={() => onEdit(s)} data-testid={`cfx-edit-${s.id}`} className="text-[10px] bg-white nb-border rounded px-1 font-bold">Editar</button>
      <button onClick={() => onDelete(s.id)} data-testid={`cfx-delete-${s.id}`} className="text-[10px] bg-white nb-border rounded px-1 font-bold">Excluir</button>
    </div>
  </div>
);
