import { useEffect, useState } from "react";
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

const empty = (data) => ({ data: data || todayISO(), hora_inicio: "08:00", hora_fim: "09:00", materia: "Biologia", frente: "Frente A", tipo: "teoria", observacoes: "", concluido: false });

export default function Cronograma() {
  const [items, setItems] = useState([]);
  const [data, setData] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data: items } = await api.get("/schedule", { params: { data } });
    items.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    setItems(items);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [data]);

  const openCreate = () => { setForm(empty(data)); setEditing(null); setOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id); setOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.put(`/schedule/${editing}`, form);
      else await api.post("/schedule", form);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir este bloco?")) return;
    await api.delete(`/schedule/${id}`); load();
  };

  const toggleDone = async (s) => {
    await api.put(`/schedule/${s.id}`, { ...s, concluido: !s.concluido });
    load();
  };

  return (
    <div className="space-y-5" data-testid="cronograma-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Cronograma diário</div>
          <h1 className="font-heading text-4xl font-black mt-1">{formatDate(data)}</h1>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="nb-border h-11 w-44 font-bold" data-testid="cron-date" />
          <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-cron-btn">
            <Plus className="w-4 h-4 mr-1" /> Bloco
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Sem blocos para este dia. Adicione um!</div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className={`${subjectColor(s.materia)} nb-border nb-shadow rounded-2xl p-4 flex items-center gap-3`} data-testid={`schedule-${s.id}`}>
              <div className="text-zinc-900 font-heading font-black text-lg w-20 shrink-0">
                {s.hora_inicio}<span className="text-zinc-700 text-xs"> → {s.hora_fim}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-700">{TASK_TYPES_EXT.find((x) => x.value === s.tipo)?.label}</div>
                <div className={`font-bold text-zinc-900 ${s.concluido ? "line-through opacity-70" : ""}`}>{s.materia}{s.frente ? ` · ${s.frente}` : ""}</div>
                {s.observacoes && <div className="text-xs text-zinc-700 mt-0.5">{s.observacoes}</div>}
              </div>
              <button onClick={() => toggleDone(s)} data-testid={`cron-toggle-${s.id}`} className={`w-9 h-9 shrink-0 nb-border rounded-xl grid place-items-center bg-white ${s.concluido ? "bg-emerald-200" : ""}`}>
                {s.concluido && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
              <Button size="icon" variant="outline" onClick={() => openEdit(s)} className="nb-border h-9 w-9 bg-white" data-testid={`cron-edit-${s.id}`}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => remove(s.id)} className="nb-border h-9 w-9 bg-white" data-testid={`cron-delete-${s.id}`}><Trash2 className="w-4 h-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar bloco" : "Novo bloco"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
            </div>
            <div>
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
