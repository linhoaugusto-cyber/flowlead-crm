"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, TrendingUp, ShieldCheck, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail obrigatório")
    .email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_REDIRECT: Record<string, string> = {
  VENDEDOR: "/dashboard/vendedor",
  SDR:      "/dashboard/vendedor",
  GERENTE:  "/dashboard/gerente",
  ADMIN:    "/dashboard/gerente",
  GESTOR:   "/dashboard/gerente",
};

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email:    data.email.toLowerCase().trim(),
        password: data.password,
        redirect: false,
      });

      if (!result) {
        setServerError("Sem resposta do servidor. Tente novamente.");
        return;
      }

      if (result.error) {
        setServerError("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      const session = await getSession();
      const perfil  = (session?.user as { perfil?: string })?.perfil ?? "VENDEDOR";
      router.push(ROLE_REDIRECT[perfil] ?? "/dashboard/vendedor");
      router.refresh();
    } catch (err) {
      console.error("Erro no login:", err);
      setServerError("Erro inesperado. Verifique sua conexão e tente novamente.");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — Branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl tracking-tight">
                FlowLead
              </span>
              <span className="text-blue-400 font-semibold text-xl"> CRM</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              O pulso da sua{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                operação comercial.
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Centralize leads, organize follow-ups e transforme cada
              oportunidade em resultado — sem deixar nada escapar.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {[
              { icon: Zap,         text: "Zero lead esquecido"          },
              { icon: ShieldCheck, text: "Visão gerencial em tempo real" },
              { icon: TrendingUp,  text: "Maior taxa de conversão"      },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} FlowLead CRM — Ademicon
          </p>
        </div>
      </div>

      {/* ── Painel direito — Formulário ────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg">
              FlowLead <span className="text-blue-500">CRM</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm mt-1">
              Entre com sua conta para acessar o painel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Erro do servidor */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {serverError}
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com.br"
                  {...register("email")}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-colors
                    bg-white text-slate-900 placeholder:text-slate-400
                    ${errors.email
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                    }`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-colors
                    bg-white text-slate-900 placeholder:text-slate-400
                    ${errors.password
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                    }`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no painel"
              )}
            </button>
          </form>

          {/* Hint para dev */}
          <div className="mt-8 p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-xs text-slate-400 font-medium mb-1">Acesso de desenvolvimento</p>
            <p className="text-xs text-slate-500">
              admin@flowlead.com.br / Admin@1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
