"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";

const schema = z.object({
  nome:      z.string().min(2, "Nome muito curto"),
  email:     z.string().email("E-mail inválido"),
  senha:     z.string().min(6, "Mínimo 6 caracteres"),
  perfil:    z.enum(["VENDEDOR", "SDR", "GERENTE", "ADMIN", "GESTOR"]),
  unidadeId: z.string().min(1, "Selecione a unidade"),
});

type FormValues = z.infer<typeof schema>;

type Unidade = { id: string; nome: string };

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-white text-slate-900 placeholder:text-slate-400 ${
    err
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
      : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
  }`;

function Field({ label, error, children, required }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function NovoUsuarioForm({ unidades }: { unidades: Unidade[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { perfil: "VENDEDOR" },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/usuarios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.error ?? "Erro ao criar usuário."); return; }
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setServerError("Erro inesperado. Tente novamente.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Novo Usuário
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Novo Usuário</h2>
              <button onClick={() => { setOpen(false); reset(); setServerError(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {serverError}
                </div>
              )}

              <Field label="Nome completo" error={errors.nome?.message} required>
                <input {...register("nome")} placeholder="Ex: João da Silva" className={inputCls(errors.nome?.message)} />
              </Field>

              <Field label="E-mail" error={errors.email?.message} required>
                <input {...register("email")} type="email" placeholder="joao@empresa.com" className={inputCls(errors.email?.message)} />
              </Field>

              <Field label="Senha inicial" error={errors.senha?.message} required>
                <input {...register("senha")} type="password" placeholder="Mínimo 6 caracteres" className={inputCls(errors.senha?.message)} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Perfil" error={errors.perfil?.message} required>
                  <select {...register("perfil")} className={inputCls(errors.perfil?.message)}>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="SDR">SDR</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="GESTOR">Gestor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>

                <Field label="Unidade" error={errors.unidadeId?.message} required>
                  <select {...register("unidadeId")} className={inputCls(errors.unidadeId?.message)}>
                    <option value="">Selecione</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset(); setServerError(null); }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
