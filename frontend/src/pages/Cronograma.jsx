import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SUBJECT_NAMES, TASK_TYPES_EXT, frentesFor, subjectColor, todayISO, formatDate } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const SHORT_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const BLOCKS = [
  { id: "manha", label: "Manhã", range: "06:00 – 12:00", from: 6, to: 12 },
  { id: "tarde", label: "Tarde", range: "12:00 – 18:00", from: 12, to: 18 },
  { id: "noite", label: "Noite", range: "18:00 – 23:59", from: 18, to: 24 },
];

// Monday of the week containing isoDate (YYYY-MM-DD)
const getMonday = (isoDate) => {
  const d = new Date(isoDate + "T00:00:00");
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};
const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const blockOf = (hhmm) => {
  const h = parseInt((hhmm || "08:00").split(":")[0]);
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
};

const emptyForm = (data) => ({ data: data || todayISO(), hora_inicio: "08:00", hora_fim: "09:00", materia: "Biologia", frente: "Frente A", tipo: "teoria", observacoes: "", concluido: false });

export default function Cronograma() {
  const [weekStart, setWeekStart] = useState(getMonday(todayISO()));
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);

  const weekDays = useMemo(() => DAYS.map((_, i) => addDaysISO(weekStart, i)), [weekStart]);

  const load = async () => {
    const all = [];
    for (const d of weekDays) {
      const { data } = await api.get("/schedule", { params: { data: d } });
      all.push(...data);
    }
    setItems(all);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [weekStart]);

  const openCreate = (dayISO, blockId) => {
    const defaultHour = { manha: "08:00", tarde: "14:00", noite: "19:00" }[blockId];
    const endHour = { manha: "09:00", tarde: "15:00", noite: "20:00" }[blockId];
    setForm({ ...emptyForm(dayISO), hora_inicio: defaultHour, hora_fim: endHour });
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id); setOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.put(`/schedule/${editing}`, form);
      else await api.post("/schedule", form);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro ao salvar"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este bloco?")) return;
    await api.delete(`/schedule/${id}`); load();
  };
  const toggleDone = async (s) => {
    await api.put(`/schedule/${s.id}`, { ...s, concluido: !s.concluido });
    load();
  };

  const moveBlock = async (s, deltaDays) => {
    const novaData = addDaysISO(s.data, deltaDays);
    await api.put(`/schedule/${s.id}`, { ...s, data: novaData });
    load();
  };

  // Group items by [day][block]
  const grid = useMemo(() => {
    const g = {};
    for (const it of items) {
      const d = it.data;
      const b = blockOf(it.hora_inicio);
      g[d] = g[d] || {};
      g[d][b] = g[d][b] || [];
      g[d][b].push(it);
    }
    // sort each cell by hora_inicio
    for (const d in g) for (const b in g[d]) g[d][b].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    return g;
  }, [items]);

  return (
    <div className="space-y-5" data-testid="cronograma-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Cronograma semanal</div>
          <h1 className="font-heading text-4xl font-black mt-1">{formatDate(weekStart)} → {formatDate(weekDays[6])}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="nb-border h-11 font-bold" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} data-testid="week-prev">← Semana anterior</Button>
          <Button variant="outline" className="nb-border h-11 font-bold" onClick={() => setWeekStart(getMonday(todayISO()))} data-testid="week-today">Hoje</Button>
          <Button variant="outline" className="nb-border h-11 font-bold" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} data-testid="week-next">Próxima →</Button>
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
        <div className="grid grid-cols-8 border-b-2 border-foreground">
          <div className="p-3 font-heading font-black text-sm bg-muted">Horário</div>
          {DAYS.map((d, i) => (
            <div key={d} className="p-3 font-heading font-black text-sm bg-muted border-l-2 border-foreground text-center">
              <div>{d}</div>
              <div className="text-[10px] font-bold text-muted-foreground">{formatDate(weekDays[i])}</div>
            </div>
          ))}
        </div>
        {BLOCKS.map((blk) => (
          <div key={blk.id} className="grid grid-cols-8 border-b-2 border-foreground last:border-b-0">
            <div className="p-3 bg-muted/50">
              <div className="font-heading font-black">{blk.label}</div>
              <div className="text-[10px] font-bold text-muted-foreground">{blk.range}</div>
            </div>
            {weekDays.map((dayISO) => {
              const cell = grid[dayISO]?.[blk.id] || [];
              return (
                <div key={dayISO + blk.id} className="p-2 border-l-2 border-foreground min-h-[110px] space-y-1">
                  {cell.map((s) => (
                    <ScheduleChip key={s.id} s={s} onEdit={openEdit} onDelete={remove} onToggle={toggleDone} onMove={moveBlock} />
                  ))}
                  <button onClick={() => openCreate(dayISO, blk.id)} data-testid={`add-${dayISO}-${blk.id}`} className="w-full h-7 rounded-lg border-2 border-dashed border-foreground/40 text-[11px] font-bold text-muted-foreground hover:bg-secondary/30 transition-colors">
                    <Plus className="w-3 h-3 inline mr-0.5" /> Adicionar
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile: per-day stacked */}
      <div className="md:hidden space-y-4">
        {weekDays.map((dayISO, i) => (
          <div key={dayISO} className="bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
            <div className="p-3 bg-muted border-b-2 border-foreground flex items-center justify-between">
              <div>
                <div className="font-heading font-black">{DAYS[i]}</div>
                <div className="text-xs font-bold text-muted-foreground">{formatDate(dayISO)}</div>
              </div>
            </div>
            {BLOCKS.map((blk) => {
              const cell = grid[dayISO]?.[blk.id] || [];
              return (
                <div key={blk.id} className="p-3 border-b-2 border-foreground last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black uppercase tracking-wider">{blk.label}</div>
                    <button onClick={() => openCreate(dayISO, blk.id)} data-testid={`m-add-${dayISO}-${blk.id}`} className="text-xs font-bold px-2 py-1 rounded-lg nb-border bg-secondary/60">
                      <Plus className="w-3 h-3 inline" /> Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {cell.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                    {cell.map((s) => (
                      <ScheduleChip key={s.id} s={s} onEdit={openEdit} onDelete={remove} onToggle={toggleDone} onMove={moveBlock} />
                    ))}
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
              <Label className="font-bold">Data</Label>
              <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="cron-form-data" />
            </div>
            <div>
              <Label className="font-bold">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cron-form-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES_EXT.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Início</Label>
              <Input type="time" className="nb-border h-11 mt-1" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} data-testid="cron-form-ini" />
            </div>
            <div>
              <Label className="font-bold">Término</Label>
              <Input type="time" className="nb-border h-11 mt-1" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} data-testid="cron-form-fim" />
            </div>
            <div>
              <Label className="font-bold">Matéria</Label>
              <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v, frente: frentesFor(v)[0] || null })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cron-form-materia"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Frente</Label>
              <Select value={form.frente || ""} onValueChange={(v) => setForm({ ...form, frente: v || null })} disabled={!frentesFor(form.materia).length}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="cron-form-frente"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{frentesFor(form.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="cron-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="cron-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ScheduleChip = ({ s, onEdit, onDelete, onToggle, onMove }) => (
  <div className={`${subjectColor(s.materia)} nb-border rounded-lg p-1.5 text-[11px] group ${s.concluido ? "opacity-60" : ""}`} data-testid={`schedule-${s.id}`}>
    <div className="flex items-center justify-between gap-1">
      <div className={`font-bold text-zinc-900 truncate ${s.concluido ? "line-through" : ""}`}>
        {s.hora_inicio} {s.materia}{s.frente ? ` · ${s.frente}` : ""}
      </div>
      <button onClick={() => onToggle(s)} data-testid={`sch-toggle-${s.id}`} className={`shrink-0 w-5 h-5 nb-border rounded grid place-items-center bg-white ${s.concluido ? "bg-emerald-200" : ""}`}>
        {s.concluido && <Check className="w-3 h-3" strokeWidth={3} />}
      </button>
    </div>
    {s.observacoes && <div className="text-[10px] text-zinc-700 truncate">{s.observacoes}</div>}
    <div className="hidden group-hover:flex gap-1 mt-1">
      <button onClick={() => onMove(s, -1)} className="text-[10px] bg-white nb-border rounded px-1 font-bold" title="Mover ← 1 dia">←</button>
      <button onClick={() => onMove(s, 1)} className="text-[10px] bg-white nb-border rounded px-1 font-bold" title="Mover → 1 dia">→</button>
      <button onClick={() => onEdit(s)} data-testid={`sch-edit-${s.id}`} className="text-[10px] bg-white nb-border rounded px-1"><Pencil className="w-3 h-3" /></button>
      <button onClick={() => onDelete(s.id)} data-testid={`sch-delete-${s.id}`} className="text-[10px] bg-white nb-border rounded px-1"><Trash2 className="w-3 h-3" /></button>
    </div>
    <div className="flex md:hidden gap-1 mt-1">
      <button onClick={() => onEdit(s)} className="text-[10px] bg-white nb-border rounded px-1 font-bold">Editar</button>
      <button onClick={() => onDelete(s.id)} className="text-[10px] bg-white nb-border rounded px-1 font-bold">Excluir</button>
    </div>
  </div>
);
