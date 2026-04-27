import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SUBJECT_NAMES, frentesFor, subjectColor, formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = () => ({ materia: "Biologia", frente: "Frente A", quantidade: 30, acertos: 22, data: todayISO(), observacoes: "" });

export default function Questoes() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/questoes");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (q) => { setForm({ ...q }); setEditing(q.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, quantidade: parseInt(form.quantidade), acertos: parseInt(form.acertos) };
      if (payload.acertos > payload.quantidade) { toast.error("Acertos > total"); return; }
      if (editing) await api.put(`/questoes/${editing}`, payload);
      else await api.post("/questoes2", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/questoes/${id}`); load();
  };

  const totalQ = items.reduce((s, q) => s + (q.quantidade || 0), 0);
  const totalA = items.reduce((s, q) => s + (q.acertos || 0), 0);
  const pct = totalQ ? Math.round((totalA / totalQ) * 100) : 0;

  return (
    <div className="space-y-5" data-testid="questoes-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Banco de Questões</div>
          <h1 className="font-heading text-4xl font-black mt-1">Questões resolvidas</h1>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-questao-btn">
          <Plus className="w-4 h-4 mr-1" /> Registrar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat tone="bg-primary/40" label="Total" value={totalQ} />
        <Stat tone="bg-accent/60" label="Acertos" value={totalA} />
        <Stat tone="bg-secondary/70" label="% acerto" value={`${pct}%`} />
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Nenhum registro ainda.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((q) => (
            <li key={q.id} className="bg-card nb-border nb-shadow rounded-2xl p-4" data-testid={`questao-${q.id}`}>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full nb-border text-[10px] font-black uppercase tracking-wider ${subjectColor(q.materia)} text-zinc-900`}>{q.materia}{q.frente ? ` · ${q.frente}` : ""}</span>
                <span className="text-xs font-bold text-muted-foreground">{formatDate(q.data)}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="font-heading text-3xl font-black">{q.acertos}/{q.quantidade}</div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{q.percentual}%</div>
              </div>
              {q.observacoes && <div className="text-xs text-muted-foreground mt-1">{q.observacoes}</div>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => openEdit(q)} data-testid={`q-edit-${q.id}`}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => remove(q.id)} data-testid={`q-delete-${q.id}`}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-bold">Matéria</Label>
              <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v, frente: frentesFor(v)[0] || null })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="q-form-materia"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Frente</Label>
              <Select value={form.frente || ""} onValueChange={(v) => setForm({ ...form, frente: v || null })} disabled={!frentesFor(form.materia).length}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="q-form-frente"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{frentesFor(form.materia).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Total de questões</Label>
              <Input type="number" min="1" className="nb-border h-11 mt-1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} data-testid="q-form-qtd" />
            </div>
            <div>
              <Label className="font-bold">Acertos</Label>
              <Input type="number" min="0" className="nb-border h-11 mt-1" value={form.acertos} onChange={(e) => setForm({ ...form, acertos: e.target.value })} data-testid="q-form-acertos" />
            </div>
            <div className="col-span-2">
              <Label className="font-bold">Data</Label>
              <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="q-form-data" />
            </div>
            <div className="col-span-2">
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="q-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="q-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Stat = ({ tone, label, value }) => (
  <div className={`${tone} nb-border nb-shadow rounded-2xl p-4`}>
    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-800">{label}</div>
    <div className="font-heading text-3xl font-black text-zinc-900 mt-1">{value}</div>
  </div>
);
