// Catalogo de matérias e frentes do AprovaMed Planner
export const SUBJECTS = [
  { name: "Matemática", frentes: ["Frente A", "Frente B", "Frente C"], color: "bg-sky-200" },
  { name: "Física", frentes: ["Frente A", "Frente B", "Frente C"], color: "bg-violet-200" },
  { name: "Química", frentes: ["Frente A", "Frente B", "Frente C"], color: "bg-orange-200" },
  { name: "Biologia", frentes: ["Frente A", "Frente B", "Frente C"], color: "bg-emerald-200" },
  { name: "Linguagens", frentes: ["Frente A", "Frente B"], color: "bg-pink-200" },
  { name: "História", frentes: ["Frente A", "Frente B"], color: "bg-amber-200" },
  { name: "Geografia", frentes: ["Frente A", "Frente B"], color: "bg-lime-200" },
  { name: "Filosofia", frentes: [], color: "bg-rose-200" },
  { name: "Sociologia", frentes: [], color: "bg-fuchsia-200" },
  { name: "Redação", frentes: [], color: "bg-yellow-200" },
];

export const SUBJECT_NAMES = SUBJECTS.map((s) => s.name);

export const subjectColor = (name) => {
  const s = SUBJECTS.find((x) => x.name === name);
  return s?.color || "bg-zinc-200";
};

export const frentesFor = (name) => {
  const s = SUBJECTS.find((x) => x.name === name);
  return s?.frentes || [];
};

export const TASK_TYPES = [
  { value: "teoria", label: "Teoria" },
  { value: "revisao", label: "Revisão" },
  { value: "questoes", label: "Questões" },
  { value: "redacao", label: "Redação" },
];

export const TASK_TYPES_EXT = [...TASK_TYPES, { value: "outro", label: "Outro" }];

export const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
];

export const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
