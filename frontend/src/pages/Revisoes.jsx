import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SUBJECT_NAMES, STATUS_OPTIONS, frentesFor, subjectColor, formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

const addDays = (iso, d) => {
  const dt = new Date(iso); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10);
};

const empty = () => ({
  materia: "Matemática", frente: "Frente A", semana: 1,
  data_inicio: todayISO(), data_fim: addDays(todayISO(), 14),
  status: "pendente", observacoes: "",
});

export default function Revisoes() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/revisoes");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, semana: parseInt(form.semana) };
      if (editing) await api.put(`/revisoes/${editing}`, payload);
      else await api.post("/revisoes", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro ao salvar"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir esta revisão?")) return;
    await api.delete(`/revisoes/${id}`); load(); toast.success("Excluída");
  };

  const toggleDone = async (r) => {
    const next = r.status === "concluido" ? "pendente" : "concluido";
    await api.put(`/revisoes/${r.id}`, { ...r, status: next });
    load();
  };

  const ativas = items.filter((r) => r.status !== "concluido");
  const historico = items.filter((r) => r.status === "concluido");

  return (
    <div className="space-y-5" data-testid="revisoes-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Revisões</div>
          <h1 className="font-heading text-4xl font-black mt-1">Ciclo de Revisão</h1>
          <p className="text-sm text-muted-foreground">2 frentes por semana · cada frente fica 2 semanas em revisão</p>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-revisao-btn">
          <Plus className="w-4 h-4 mr-1" /> Nova revisão
        </Button>
      </div>

      <section>
        <h2 className="font-heading text-2xl font-black mb-3">Em revisão</h2>
        {ativas.length === 0 ? (
          <div className="bg-card nb-border nb-shadow rounded-2xl p-8 text-center text-muted-foreground">Nenhuma revisão ativa.</div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {ativas.map((r) => (
              <RevisaoCard key={r.id} r={r} onToggle={toggleDone} onEdit={openEdit} onDelete={remove} />
            ))}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-black mb-3">Histórico</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {historico.map((r) => (
              <RevisaoCard key={r.id} r={r} onToggle={toggleDone} onEdit={openEdit} onDelete={remove} done />
            ))}
          </ul>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar revisão" : "Nova revisão"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Matéria</Label>
                <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v, frente: frentesFor(v)[0] || "" })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="rev-materia"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECT_NAMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Frente</Label>
                <Select value={form.frente} onValueChange={(v) => setForm({ ...form, frente: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="rev-frente"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(frentesFor(form.materia).length ? frentesFor(form.materia) : ["Único"]).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Semana</Label>
                <Select value={String(form.semana)} onValueChange={(v) => setForm({ ...form, semana: parseInt(v) })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="rev-semana"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Semana 1</SelectItem><SelectItem value="2">Semana 2</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="rev-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Início</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} data-testid="rev-inicio" />
              </div>
              <div>
                <Label className="font-bold">Término</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} data-testid="rev-fim" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="rev-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="rev-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const RevisaoCard = ({ r, onToggle, onEdit, onDelete, done }) => (
  <li className={`${subjectColor(r.materia)} nb-border nb-shadow rounded-2xl p-4 ${done ? "opacity-70" : ""}`} data-testid={`revisao-${r.id}`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-700">{r.materia} · {r.frente}</div>
        <div className="font-heading font-black text-xl mt-0.5 text-zinc-900">Semana {r.semana} <span className="text-xs font-bold text-zinc-700">de 2</span></div>
      </div>
      <button onClick={() => onToggle(r)} data-testid={`rev-toggle-${r.id}`} className={`w-9 h-9 nb-border rounded-xl grid place-items-center bg-white ${done ? "bg-emerald-200" : ""}`}>
        {done && <Check className="w-4 h-4" strokeWidth={3} />}
      </button>
    </div>
    <div className="text-xs font-bold text-zinc-800 mt-2">{formatDate(r.data_inicio)} → {formatDate(r.data_fim)}</div>
    {r.observacoes && <div className="text-xs text-zinc-700 mt-1">{r.observacoes}</div>}
    <div className="flex gap-2 mt-3">
      <Button size="sm" variant="outline" className="nb-border bg-white h-8" onClick={() => onEdit(r)} data-testid={`rev-edit-${r.id}`}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
      <Button size="sm" variant="outline" className="nb-border bg-white h-8" onClick={() => onDelete(r.id)} data-testid={`rev-delete-${r.id}`}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
    </div>
  </li>
);
