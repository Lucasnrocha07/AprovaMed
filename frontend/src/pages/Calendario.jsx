import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { formatDate, todayISO } from "@/lib/subjects";

const empty = () => ({ titulo: "", data: todayISO(), hora: "", observacoes: "" });

export default function Calendario() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/calendario");
    data.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (e) => { setForm({ ...e }); setEditing(e.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, hora: form.hora || null };
      if (editing) await api.put(`/calendario/${editing}`, payload);
      else await api.post("/calendario", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir evento?")) return;
    await api.delete(`/calendario/${id}`); load();
  };

  // group by month
  const groups = {};
  for (const e of items) {
    const key = (e.data || "").slice(0, 7);
    groups[key] = groups[key] || [];
    groups[key].push(e);
  }

  const today = todayISO();

  return (
    <div className="space-y-5" data-testid="calendario-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Calendário</div>
          <h1 className="font-heading text-4xl font-black mt-1">Seus eventos</h1>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-evento-btn">
          <Plus className="w-4 h-4 mr-1" /> Novo evento
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Nenhum evento cadastrado.</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([mes, arr]) => (
            <div key={mes}>
              <div className="font-heading text-xl font-black mb-2">{new Date(mes + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div>
              <ul className="space-y-2">
                {arr.map((e) => {
                  const past = e.data < today;
                  return (
                    <li key={e.id} className={`bg-card nb-border nb-shadow rounded-2xl p-4 flex items-center gap-3 ${past ? "opacity-60" : ""}`} data-testid={`evento-${e.id}`}>
                      <div className="w-16 shrink-0 bg-secondary/60 nb-border rounded-xl p-2 text-center">
                        <div className="text-[10px] font-bold uppercase">{new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" })}</div>
                        <div className="font-heading text-2xl font-black leading-none">{e.data.slice(8, 10)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-black text-lg">{e.titulo}</div>
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {formatDate(e.data)}{e.hora ? ` · ${e.hora}` : ""}</div>
                        {e.observacoes && <div className="text-sm text-muted-foreground mt-1">{e.observacoes}</div>}
                      </div>
                      <Button size="icon" variant="outline" onClick={() => openEdit(e)} className="nb-border h-9 w-9" data-testid={`evento-edit-${e.id}`}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => remove(e.id)} className="nb-border h-9 w-9" data-testid={`evento-delete-${e.id}`}><Trash2 className="w-4 h-4" /></Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Título</Label>
              <Input className="nb-border h-11 mt-1" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} data-testid="ev-form-titulo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Data</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="ev-form-data" />
              </div>
              <div>
                <Label className="font-bold">Hora (opcional)</Label>
                <Input type="time" className="nb-border h-11 mt-1" value={form.hora || ""} onChange={(e) => setForm({ ...form, hora: e.target.value })} data-testid="ev-form-hora" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="ev-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="ev-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
