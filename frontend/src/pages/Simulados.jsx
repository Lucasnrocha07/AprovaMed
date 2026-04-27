import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const empty = () => ({ nome: "", data: todayISO(), total_questoes: 180, acertos: 100, nota: null, observacoes: "" });

export default function Simulados() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/simulados");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        total_questoes: parseInt(form.total_questoes),
        acertos: parseInt(form.acertos),
        nota: form.nota === "" || form.nota == null ? null : parseFloat(form.nota),
      };
      if (payload.acertos > payload.total_questoes) { toast.error("Acertos > total"); return; }
      if (editing) await api.put(`/simulados/${editing}`, payload);
      else await api.post("/simulados2", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/simulados/${id}`); load();
  };

  const chartData = [...items].reverse().map((s) => ({ data: formatDate(s.data), pct: s.percentual }));

  return (
    <div className="space-y-5" data-testid="simulados-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Simulados</div>
          <h1 className="font-heading text-4xl font-black mt-1">Histórico de simulados</h1>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-simulado-btn">
          <Plus className="w-4 h-4 mr-1" /> Novo simulado
        </Button>
      </div>

      {items.length > 1 && (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-4">
          <div className="font-heading text-xl font-black mb-2">Evolução do % de acerto</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" stroke="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                <Tooltip contentStyle={{ border: "2px solid hsl(var(--border))", borderRadius: 12, background: "hsl(var(--card))", fontWeight: 700 }} />
                <Line type="monotone" dataKey="pct" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--card))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Nenhum simulado registrado.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((s) => (
            <li key={s.id} className="bg-card nb-border nb-shadow rounded-2xl p-4" data-testid={`simulado-${s.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-muted-foreground">{formatDate(s.data)}</div>
                  <div className="font-heading text-xl font-black truncate">{s.nome}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-2xl font-black">{s.percentual}%</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">{s.acertos}/{s.total_questoes}</div>
                </div>
              </div>
              {s.nota != null && <div className="mt-2 text-sm font-bold">Nota: {s.nota}</div>}
              {s.observacoes && <div className="text-xs text-muted-foreground mt-1">{s.observacoes}</div>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => openEdit(s)} data-testid={`sim-edit-${s.id}`}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => remove(s.id)} data-testid={`sim-delete-${s.id}`}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar simulado" : "Novo simulado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Nome</Label>
              <Input className="nb-border h-11 mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} data-testid="sim-form-nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Data</Label>
                <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="sim-form-data" />
              </div>
              <div>
                <Label className="font-bold">Total de questões</Label>
                <Input type="number" min="1" className="nb-border h-11 mt-1" value={form.total_questoes} onChange={(e) => setForm({ ...form, total_questoes: e.target.value })} data-testid="sim-form-total" />
              </div>
              <div>
                <Label className="font-bold">Acertos</Label>
                <Input type="number" min="0" className="nb-border h-11 mt-1" value={form.acertos} onChange={(e) => setForm({ ...form, acertos: e.target.value })} data-testid="sim-form-acertos" />
              </div>
              <div>
                <Label className="font-bold">Nota (opcional)</Label>
                <Input type="number" step="0.01" className="nb-border h-11 mt-1" value={form.nota ?? ""} onChange={(e) => setForm({ ...form, nota: e.target.value })} data-testid="sim-form-nota" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="sim-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="sim-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
