import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@aprovamed.com");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo de volta!");
      navigate("/");
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
            <div className="w-12 h-12 grid place-items-center rounded-xl bg-secondary nb-border">
              <GraduationCap className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl leading-none">AprovaMed</h1>
              <div className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Planner</div>
            </div>
          </div>

          <h2 className="font-heading text-3xl font-black mb-1">Entrar</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Acesse sua rotina de estudos e foque na <span className="font-bold text-foreground">aprovação</span>.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
                className="nb-border h-12 text-base focus:bg-yellow-50 dark:focus:bg-yellow-950"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
                className="nb-border h-12 text-base focus:bg-yellow-50 dark:focus:bg-yellow-950"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full h-12 nb-border nb-shadow nb-press bg-secondary text-secondary-foreground hover:bg-secondary font-heading text-base font-black"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            Não tem conta?{" "}
            <Link to="/register" className="font-bold underline underline-offset-4" data-testid="goto-register">
              Cadastre-se
            </Link>
          </div>

          <div className="mt-6 rounded-xl bg-primary/40 nb-border p-3 text-xs">
            <div className="font-bold mb-1">Conta demo (já preenchida):</div>
            <div>demo@aprovamed.com · demo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
