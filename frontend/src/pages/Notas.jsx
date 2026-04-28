import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";
import { formatDate } from "@/lib/subjects";

export default function Notas() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");
  const [dirty, setDirty] = useState(false);

  const selected = items.find((x) => x.id === selectedId);

  const load = async (focusId) => {
    const { data } = await api.get("/notas");
    data.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    setItems(data);
    if (focusId) setSelectedId(focusId);
    else if (!selectedId && data.length) setSelectedId(data[0].id);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (selected) {
      setEditTitulo(selected.titulo);
      setEditConteudo(selected.conteudo || "");
      setDirty(false);
    }
  }, [selectedId]); // eslint-disable-line

  const create = async () => {
    const { data } = await api.post("/notas", { titulo: "Nova página", conteudo: "" });
    toast.success("Página criada");
    await load(data.id);
  };

  const save = async () => {
    if (!selected) return;
    await api.put(`/notas/${selected.id}`, { titulo: editTitulo, conteudo: editConteudo });
    toast.success("Salvo");
    setDirty(false);
    load(selected.id);
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm("Excluir esta página?")) return;
    await api.delete(`/notas/${selected.id}`);
    setSelectedId(null);
    load();
  };

  return (
    <div className="space-y-4" data-testid="notas-root">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Anotações</div>
          <h1 className="font-heading text-4xl font-black mt-1">Suas páginas</h1>
        </div>
        <Button onClick={create} className="nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-bold h-11" data-testid="add-nota-btn">
          <Plus className="w-4 h-4 mr-1" /> Nova página
        </Button>
      </div>

      <div className="grid md:grid-cols-[260px,1fr] gap-4">
        <aside className="bg-card nb-border nb-shadow rounded-2xl p-3 max-h-[70vh] overflow-auto">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3">Nenhuma página.</div>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    data-testid={`nota-item-${n.id}`}
                    className={`w-full text-left px-3 py-2 rounded-lg border-2 ${selectedId === n.id ? "bg-secondary/60 border-foreground nb-shadow-sm" : "border-transparent hover:bg-muted"}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-sm truncate">{n.titulo || "Sem título"}</span>
                    </div>
                    {n.created_at && <div className="text-[10px] text-muted-foreground ml-6">{formatDate((n.created_at || "").slice(0, 10))}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="bg-card nb-border nb-shadow rounded-2xl p-5 min-h-[60vh]">
          {!selected ? (
            <div className="h-full grid place-items-center text-muted-foreground">Selecione ou crie uma página.</div>
          ) : (
            <div className="space-y-3 h-full flex flex-col">
              <Input
                value={editTitulo}
                onChange={(e) => { setEditTitulo(e.target.value); setDirty(true); }}
                placeholder="Título da página"
                className="nb-border h-12 font-heading text-xl font-black"
                data-testid="nota-titulo"
              />
              <Textarea
                value={editConteudo}
                onChange={(e) => { setEditConteudo(e.target.value); setDirty(true); }}
                placeholder="Escreva livremente aqui... Use - para listas, ## para títulos, etc."
                className="nb-border flex-1 min-h-[50vh] font-mono text-sm"
                data-testid="nota-conteudo"
              />
              <div className="flex items-center gap-2">
                <Button onClick={save} disabled={!dirty} className="nb-border nb-shadow bg-secondary text-secondary-foreground hover:bg-secondary font-bold" data-testid="nota-save">
                  {dirty ? "Salvar alterações" : "Salvo"}
                </Button>
                <Button variant="outline" onClick={remove} className="nb-border" data-testid="nota-delete"><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
