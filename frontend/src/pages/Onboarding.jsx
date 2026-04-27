import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECT_NAMES } from "@/lib/subjects";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vestibular_alvo: "ENEM + UFU",
    prova_data: "",
    horas_dia: 4,
    materias_fortes: [],
    materias_fracas: [],
    conteudos_atrasados: [],
    meta_questoes_semana: 200,
    meta_redacoes_mes: 4,
    onboarded: true,
    theme: "light",
  });

  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      setForm((f) => ({ ...f, ...data, onboarded: true }));
    }).catch(() => {});
  }, []);

  const toggle = (key, val) => {
    setForm((f) => {
      const set = new Set(f[key]);
      if (set.has(val)) set.delete(val); else set.add(val);
      return { ...f, [key]: Array.from(set) };
    });
  };

  const submit = async () => {
    setLoading(true);
    try {
      await api.put("/profile", form);
      toast.success("Plano configurado!");
      navigate("/");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Configuração inicial</div>
          <h1 className="font-heading text-4xl font-black mt-1">Vamos planejar sua aprovação</h1>
          <p className="text-muted-foreground mt-1">Tudo é editável depois nas configurações.</p>
        </div>

        <div className="bg-card nb-border nb-shadow-lg rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-bold">Vestibular-alvo</Label>
              <Input
                value={form.vestibular_alvo}
                onChange={(e) => setForm({ ...form, vestibular_alvo: e.target.value })}
                className="nb-border h-11 mt-1.5"
                data-testid="onb-vestibular"
                placeholder="Ex: ENEM, UFU, UFMG"
              />
            </div>
            <div>
              <Label className="font-bold">Data da prova</Label>
              <Input
                type="date"
                value={form.prova_data || ""}
                onChange={(e) => setForm({ ...form, prova_data: e.target.value })}
                className="nb-border h-11 mt-1.5"
                data-testid="onb-prova-data"
              />
            </div>
            <div>
              <Label className="font-bold">Horas disponíveis por dia</Label>
              <Input
                type="number" min="1" max="16" step="0.5"
                value={form.horas_dia}
                onChange={(e) => setForm({ ...form, horas_dia: parseFloat(e.target.value || 0) })}
                className="nb-border h-11 mt-1.5"
                data-testid="onb-horas"
              />
            </div>
            <div>
              <Label className="font-bold">Meta semanal de questões</Label>
              <Input
                type="number" min="0"
                value={form.meta_questoes_semana}
                onChange={(e) => setForm({ ...form, meta_questoes_semana: parseInt(e.target.value || 0) })}
                className="nb-border h-11 mt-1.5"
                data-testid="onb-meta-questoes"
              />
            </div>
            <div>
              <Label className="font-bold">Meta mensal de redações</Label>
              <Input
                type="number" min="0"
                value={form.meta_redacoes_mes}
                onChange={(e) => setForm({ ...form, meta_redacoes_mes: parseInt(e.target.value || 0) })}
                className="nb-border h-11 mt-1.5"
                data-testid="onb-meta-redacoes"
              />
            </div>
          </div>

          <PillGroup
            title="Matérias fortes (toque para selecionar)"
            options={SUBJECT_NAMES}
            selected={form.materias_fortes}
            onToggle={(v) => toggle("materias_fortes", v)}
            color="bg-emerald-200"
            testidPrefix="strong"
          />
          <PillGroup
            title="Matérias fracas"
            options={SUBJECT_NAMES}
            selected={form.materias_fracas}
            onToggle={(v) => toggle("materias_fracas", v)}
            color="bg-rose-200"
            testidPrefix="weak"
          />

          <div>
            <Label className="font-bold">Conteúdos atrasados (separe por vírgula)</Label>
            <Textarea
              value={form.conteudos_atrasados.join(", ")}
              onChange={(e) =>
                setForm({ ...form, conteudos_atrasados: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              className="nb-border mt-1.5 min-h-[80px]"
              placeholder="Termodinâmica, Geometria Analítica, Cinética Química..."
              data-testid="onb-atrasados"
            />
          </div>

          <Button
            onClick={submit}
            disabled={loading}
            data-testid="onb-submit"
            className="w-full h-12 nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading text-base font-black"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Começar a estudar <ArrowRight className="w-5 h-5 ml-2" /></>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

const PillGroup = ({ title, options, selected, onToggle, color, testidPrefix }) => (
  <div>
    <Label className="font-bold">{title}</Label>
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => onToggle(o)}
            data-testid={`${testidPrefix}-${o}`}
            className={`px-3 py-1.5 rounded-full nb-border text-sm font-bold transition-all ${
              on ? `${color} nb-shadow-sm` : "bg-card hover:bg-muted"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  </div>
);
