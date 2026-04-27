import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 4) {
      toast.error("Senha muito curta (mín. 4 caracteres).");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Conta criada! Vamos configurar seu plano.");
      navigate("/onboarding");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card nb-border nb-shadow-lg rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 grid place-items-center rounded-xl bg-accent nb-border">
              <GraduationCap className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl leading-none">AprovaMed</h1>
              <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Planner</div>
            </div>
          </div>

          <h2 className="font-heading text-3xl font-black mb-1">Criar conta</h2>
          <p className="text-sm text-muted-foreground mb-6">Em 30 segundos você está estudando.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-bold">Nome</Label>
              <Input
                id="name" value={name} onChange={(e) => setName(e.target.value)} required
                data-testid="register-name"
                className="nb-border h-12 text-base focus:bg-yellow-50 dark:focus:bg-yellow-950"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                data-testid="register-email"
                className="nb-border h-12 text-base focus:bg-yellow-50 dark:focus:bg-yellow-950"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold">Senha</Label>
              <Input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                data-testid="register-password"
                className="nb-border h-12 text-base focus:bg-yellow-50 dark:focus:bg-yellow-950"
              />
            </div>
            <Button
              type="submit" disabled={loading} data-testid="register-submit"
              className="w-full h-12 nb-border nb-shadow nb-press bg-accent text-accent-foreground hover:bg-accent font-heading text-base font-black"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar minha conta"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            Já tem conta?{" "}
            <Link to="/login" className="font-bold underline underline-offset-4" data-testid="goto-login">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
