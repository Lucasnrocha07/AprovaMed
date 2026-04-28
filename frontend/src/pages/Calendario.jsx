import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, todayISO } from "@/lib/subjects";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const TIPOS = [
  { value: "evento", label: "Evento", color: "bg-primary/60" },
  { value: "prova", label: "Prova", color: "bg-red-300" },
  { value: "simulado", label: "Simulado", color: "bg-accent" },
  { value: "lembrete", label: "Lembrete", color: "bg-secondary" },
  { value: "tarefa", label: "Tarefa", color: "bg-emerald-300" },
  { value: "observacao", label: "Observação", color: "bg-muted" },
];
const PRIORIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const tipoColor = (t) => TIPOS.find((x) => x.value === t)?.color || "bg-muted";

const emptyForm = (data) => ({ titulo: "", data: data || todayISO(), hora: "", tipo: "evento", prioridade: "media", concluido: false, observacoes: "" });

// Build month grid starting Monday
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const dow = (first.getDay() + 6) % 7; // 0=Mon..6=Sun
  start.setDate(start.getDate() - dow);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}
const isoDate = (d) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export default function Calendario() {
  const today = new Date();
  const [ym, setYM] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [items, setItems] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/calendario");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const byDay = useMemo(() => {
    const m = {};
    for (const e of items) { m[e.data] = m[e.data] || []; m[e.data].push(e); }
    return m;
  }, [items]);

  const cells = useMemo(() => buildMonthGrid(ym.y, ym.m), [ym]);
  const todayIso = isoDate(today);

  const prev = () => {
    let m = ym.m - 1, y = ym.y; if (m < 0) { m = 11; y--; }
    setYM({ y, m });
  };
  const next = () => {
    let m = ym.m + 1, y = ym.y; if (m > 11) { m = 0; y++; }
    setYM({ y, m });
  };
  const goToday = () => setYM({ y: today.getFullYear(), m: today.getMonth() });

  const openCreate = (dayISO) => { setForm(emptyForm(dayISO)); setEditing(null); setOpen(true); };
  const openEdit = (e) => { setForm({ ...emptyForm(), ...e }); setEditing(e.id); setOpen(true); };
  const save = async () => {
    if (!form.titulo.trim()) { toast.error("Informe um título"); return; }
    try {
      const payload = { ...form, hora: form.hora || null };
      if (editing) await api.put(`/calendario/${editing}`, payload);
      else await api.post("/calendario", payload);
      setOpen(false); load(); toast.success("Salvo");
    } catch { toast.error("Erro ao salvar"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Excluir este item?")) return;
    await api.delete(`/calendario/${id}`); load();
  };
  const toggleDone = async (e) => {
    await api.put(`/calendario/${e.id}`, { ...e, concluido: !e.concluido });
    load();
  };

  const dayEvents = selectedDay ? (byDay[selectedDay] || []) : [];

  return (
    <div className="space-y-4" data-testid="calendario-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Calendário</div>
          <h1 className="font-heading text-4xl font-black mt-1">{MONTHS[ym.m]} {ym.y}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} className="nb-border h-11" data-testid="cal-prev"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={goToday} className="nb-border h-11 font-bold" data-testid="cal-today">Hoje</Button>
          <Button variant="outline" onClick={next} className="nb-border h-11" data-testid="cal-next"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr,340px] gap-4">
        {/* Month grid */}
        <div className="bg-card nb-border nb-shadow rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b-2 border-foreground">
            {WEEKDAYS.map((d) => <div key={d} className="p-2 text-center font-heading font-black text-xs bg-muted">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, idx) => {
              const iso = isoDate(d);
              const inMonth = d.getMonth() === ym.m;
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDay;
              const ev = byDay[iso] || [];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(iso)}
                  data-testid={`day-${iso}`}
                  className={`relative min-h-[84px] p-1.5 border-t-2 border-l-2 border-foreground text-left transition-colors ${
                    !inMonth ? "bg-muted/30 text-muted-foreground" :
                    isSelected ? "bg-secondary/70" :
                    isToday ? "bg-primary/40" : "bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className={`font-heading font-black text-sm ${isToday ? "inline-block px-1.5 rounded bg-secondary text-secondary-foreground nb-border" : ""}`}>
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {ev.slice(0, 3).map((e) => (
                      <div key={e.id} className={`text-[9px] font-bold px-1 py-0.5 rounded nb-border truncate text-zinc-900 ${tipoColor(e.tipo)} ${e.concluido ? "line-through opacity-70" : ""}`}>
                        {e.hora ? `${e.hora} ` : ""}{e.titulo}
                      </div>
                    ))}
                    {ev.length > 3 && <div className="text-[9px] font-bold text-muted-foreground">+{ev.length - 3}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day panel */}
        <aside className="bg-card nb-border nb-shadow rounded-2xl p-4 min-h-[400px]">
          {!selectedDay ? (
            <div className="h-full grid place-items-center text-muted-foreground text-sm text-center">Clique em um dia para adicionar eventos, provas, simulados, lembretes ou tarefas.</div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{selectedDay === todayIso ? "Hoje" : "Dia selecionado"}</div>
                  <h2 className="font-heading text-2xl font-black">{formatDate(selectedDay)}</h2>
                </div>
                <Button size="sm" onClick={() => openCreate(selectedDay)} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="day-add">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {dayEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Nenhum item. Adicione um evento, prova, simulado, lembrete ou tarefa.</div>
              ) : (
                <ul className="space-y-2">
                  {dayEvents.map((e) => (
                    <li key={e.id} className={`${tipoColor(e.tipo)} nb-border rounded-xl p-3 ${e.concluido ? "opacity-70" : ""}`} data-testid={`ev-${e.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-800 bg-white/70 px-1.5 py-0.5 rounded nb-border">{TIPOS.find(t => t.value === e.tipo)?.label || e.tipo}</span>
                            {e.prioridade === "alta" && <span className="text-[9px] font-black uppercase text-red-700 bg-white/70 px-1.5 py-0.5 rounded nb-border">Alta</span>}
                            {e.hora && <span className="text-[10px] font-bold text-zinc-800">{e.hora}</span>}
                          </div>
                          <div className={`font-bold text-zinc-900 ${e.concluido ? "line-through" : ""}`}>{e.titulo}</div>
                          {e.observacoes && <div className="text-xs text-zinc-700 mt-0.5">{e.observacoes}</div>}
                        </div>
                        <button onClick={() => toggleDone(e)} data-testid={`ev-toggle-${e.id}`} className={`shrink-0 w-7 h-7 nb-border rounded grid place-items-center bg-white ${e.concluido ? "bg-emerald-200" : ""}`}>
                          {e.concluido && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => openEdit(e)} data-testid={`ev-edit-${e.id}`} className="text-[10px] bg-white nb-border rounded px-2 py-0.5 font-bold"><Pencil className="w-3 h-3 inline mr-0.5" />Editar</button>
                        <button onClick={() => remove(e.id)} data-testid={`ev-delete-${e.id}`} className="text-[10px] bg-white nb-border rounded px-2 py-0.5 font-bold"><Trash2 className="w-3 h-3 inline mr-0.5" />Excluir</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nb-border max-w-lg">
          <DialogHeader><DialogTitle className="font-heading text-2xl font-black">{editing ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
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
              <div>
                <Label className="font-bold">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="ev-form-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger className="nb-border h-11 mt-1" data-testid="ev-form-prio"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-bold">Descrição / observações</Label>
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
