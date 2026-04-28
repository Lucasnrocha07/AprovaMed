import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookMarked, Calendar as CalendarIcon } from "lucide-react";
import { formatDate } from "@/lib/subjects";

const empty = () => ({ nome: "", conteudos: "", data_prova: "", estrategias: "", observacoes: "" });

const daysUntil = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

export default function Vestibulares() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/vestibulares");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (v) => { setForm({ ...empty(), ...v }); setEditing(v.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, data_prova: form.data_prova || null };
      if (editing) await api.put(`/vestibulares/${editing}`, payload);
      else await api.post("/vestibulares", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/vestibulares/${id}`); load();
  };

  return (
    <div className="space-y-5" data-testid="vestibulares-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Outros vestibulares</div>
          <h1 className="font-heading text-4xl font-black mt-1">Anotações e datas</h1>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-vest-btn">
          <Plus className="w-4 h-4 mr-1" /> Novo bloco
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Nenhum vestibular cadastrado.</div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {items.map((v, idx) => {
            const tones = ["bg-primary/40", "bg-accent/50", "bg-secondary/50", "bg-pink-200/70"];
            const dias = daysUntil(v.data_prova);
            return (
              <li key={v.id} className={`${tones[idx % tones.length]} nb-border nb-shadow rounded-2xl p-5`} data-testid={`vest-${v.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 grid place-items-center rounded-lg bg-white nb-border"><BookMarked className="w-5 h-5" /></div>
                    <h3 className="font-heading text-xl font-black text-zinc-900 truncate">{v.nome}</h3>
                  </div>
                  {dias != null && (
                    <div className="text-right bg-white nb-border nb-shadow-sm rounded-xl px-3 py-1.5 shrink-0">
                      <div className="font-heading text-2xl font-black text-zinc-900 leading-none">{dias >= 0 ? dias : "—"}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-700">{dias >= 0 ? "dias" : "passou"}</div>
                    </div>
                  )}
                </div>
                {v.data_prova && <div className="mt-2 text-xs font-bold text-zinc-800 flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Prova: {formatDate(v.data_prova)}</div>}
                <Field label="Conteúdos" value={v.conteudos} />
                <Field label="Estratégias" value={v.estrategias} />
                <Field label="Observações" value={v.observacoes} />
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="nb-border h-8 bg-white" onClick={() => openEdit(v)} data-testid={`vest-edit-${v.id}`}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                  <Button size="sm" variant="outline" className="nb-border h-8 bg-white" onClick={() => remove(v.id)} data-testid={`vest-delete-${v.id}`}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar" : "Novo bloco"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Nome do vestibular</Label>
              <Input className="nb-border h-11 mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} data-testid="vest-form-nome" />
            </div>
            <div>
              <Label className="font-bold">Data da prova</Label>
              <Input type="date" className="nb-border h-11 mt-1" value={form.data_prova || ""} onChange={(e) => setForm({ ...form, data_prova: e.target.value })} data-testid="vest-form-data-prova" />
            </div>
            <div>
              <Label className="font-bold">Conteúdos importantes</Label>
              <Textarea className="nb-border mt-1" value={form.conteudos} onChange={(e) => setForm({ ...form, conteudos: e.target.value })} data-testid="vest-form-conteudos" />
            </div>
            <div>
              <Label className="font-bold">Estratégias</Label>
              <Textarea className="nb-border mt-1" value={form.estrategias} onChange={(e) => setForm({ ...form, estrategias: e.target.value })} data-testid="vest-form-estrat" />
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="vest-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="vest-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Field = ({ label, value }) => value ? (
  <div className="mt-2">
    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-700">{label}</div>
    <div className="text-sm text-zinc-900 whitespace-pre-wrap">{value}</div>
  </div>
) : null;
