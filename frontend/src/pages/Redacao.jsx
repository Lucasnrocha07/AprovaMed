import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const empty = () => ({ tema: "", data: todayISO(), tipo: "enem", c1: 160, c2: 160, c3: 160, c4: 160, c5: 160, nota_livre: 0, observacoes: "" });

export default function Redacao() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/redacoes");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (r) => { setForm({ ...empty(), ...r }); setEditing(r.id); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        tema: form.tema, data: form.data, tipo: form.tipo,
        c1: parseInt(form.c1 || 0), c2: parseInt(form.c2 || 0), c3: parseInt(form.c3 || 0), c4: parseInt(form.c4 || 0), c5: parseInt(form.c5 || 0),
        nota_livre: form.nota_livre === "" || form.nota_livre == null ? null : parseFloat(form.nota_livre),
        observacoes: form.observacoes,
      };
      if (editing) await api.put(`/redacoes/${editing}`, payload);
      else await api.post("/redacoes", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/redacoes/${id}`); load();
  };

  const chartData = [...items].reverse().map((r) => ({ data: formatDate(r.data), nota: r.nota_total }));

  return (
    <div className="space-y-5" data-testid="redacao-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Redação</div>
          <h1 className="font-heading text-4xl font-black mt-1">Suas redações</h1>
        </div>
        <Button onClick={openCreate} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-redacao-btn">
          <Plus className="w-4 h-4 mr-1" /> Nova redação
        </Button>
      </div>

      {items.length > 1 && (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-4">
          <div className="font-heading text-xl font-black mb-2">Evolução da nota total</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" stroke="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                <YAxis domain={[0, 1000]} stroke="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                <Tooltip contentStyle={{ border: "2px solid hsl(var(--border))", borderRadius: 12, background: "hsl(var(--card))", fontWeight: 700 }} />
                <Line type="monotone" dataKey="nota" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--card))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card nb-border nb-shadow rounded-2xl p-10 text-center text-muted-foreground">Nenhuma redação registrada.</div>
      ) : (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li key={r.id} className="bg-card nb-border nb-shadow rounded-2xl p-4" data-testid={`redacao-${r.id}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    {formatDate(r.data)}
                    <span className="px-2 py-0.5 rounded-full nb-border bg-secondary/60 uppercase text-[9px] tracking-wider">{r.tipo || "enem"}</span>
                  </div>
                  <div className="font-heading text-xl font-black">{r.tema}</div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-3xl font-black text-emerald-700 dark:text-emerald-400">{r.nota_total}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nota total</div>
                </div>
              </div>
              {(r.tipo || "enem") === "enem" && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {["c1", "c2", "c3", "c4", "c5"].map((c) => (
                    <div key={c} className="bg-primary/30 nb-border rounded-lg p-2 text-center">
                      <div className="text-[10px] font-black uppercase">{c.toUpperCase()}</div>
                      <div className="font-heading font-black text-lg">{r[c]}</div>
                    </div>
                  ))}
                </div>
              )}
              {r.observacoes && <div className="text-xs text-muted-foreground mt-2">{r.observacoes}</div>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => openEdit(r)} data-testid={`red-edit-${r.id}`}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="outline" className="nb-border h-8" onClick={() => remove(r.id)} data-testid={`red-delete-${r.id}`}><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar redação" : "Nova redação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-bold">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="nb-border h-11 mt-1" data-testid="red-form-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enem">ENEM (C1 a C5)</SelectItem>
                  <SelectItem value="outro">Outro (nota livre)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Tema</Label>
              <Input className="nb-border h-11 mt-1" value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} data-testid="red-form-tema" />
            </div>
            <div>
              <Label className="font-bold">Data</Label>
              <Input type="date" className="nb-border h-11 mt-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} data-testid="red-form-data" />
            </div>
            {form.tipo === "enem" ? (
              <div className="grid grid-cols-5 gap-2">
                {["c1", "c2", "c3", "c4", "c5"].map((c) => (
                  <div key={c}>
                    <Label className="font-bold uppercase">{c}</Label>
                    <Input type="number" min="0" max="200" step="20" className="nb-border h-11 mt-1" value={form[c]} onChange={(e) => setForm({ ...form, [c]: e.target.value })} data-testid={`red-form-${c}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Label className="font-bold">Nota livre</Label>
                <Input type="number" step="0.01" className="nb-border h-11 mt-1" value={form.nota_livre ?? 0} onChange={(e) => setForm({ ...form, nota_livre: e.target.value })} data-testid="red-form-livre" />
              </div>
            )}
            <div>
              <Label className="font-bold">Observações</Label>
              <Textarea className="nb-border mt-1" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} data-testid="red-form-obs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="nb-border" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="red-save">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
