"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  nome:             z.string().min(2, "Nome muito curto"),
  telefone:         z.string().min(8, "Telefone inválido"),
  email:            z.string().email("E-mail inválido").optional().or(z.literal("")),
  canalOrigemId:    z.string().min(1, "Selecione o canal"),
  observacoes:      z.string().optional(),
  produtoInteresse: z.enum(["CONSORCIO", "FINANCIAMENTO", "AMBOS"]),
  urgencia:         z.enum(["IMEDIATA", "CURTO_PRAZO", "MEDIO_PRAZO", "INDEFINIDA"]),
});

type FormValues = z.infer<typeof schema>;

type Canal = { id: string; nome: string };

interface NovoLeadFormProps {
  canais: Canal[];
}

function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-white text-slate-900 placeholder:text-slate-400 ${
    err
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
      : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
  }`;

export function NovoLeadForm({ canais }: NovoLeadFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      produtoInteresse: "CONSORCIO",
      urgencia:         "INDEFINIDA",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);

    const res = await fetch("/api/leads", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Erro ao criar lead.");
      return;
    }

    router.push("/dashboard/leads");
    router.refresh();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/leads"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Lead</h1>
          <p className="text-sm text-slate-500">Preencha os dados do lead para cadastrá-lo</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        {serverError && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome + Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo" error={errors.nome?.message} required>
              <input
                {...register("nome")}
                placeholder="Ex: João da Silva"
                className={inputCls(errors.nome?.message)}
              />
            </Field>
            <Field label="Telefone / WhatsApp" error={errors.telefone?.message} required>
              <input
                {...register("telefone")}
                placeholder="(11) 99999-9999"
                className={inputCls(errors.telefone?.message)}
              />
            </Field>
          </div>

          {/* E-mail */}
          <Field label="E-mail" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              placeholder="joao@email.com (opcional)"
              className={inputCls(errors.email?.message)}
            />
          </Field>

          {/* Canal + Produto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Canal de origem" error={errors.canalOrigemId?.message} required>
              <select {...register("canalOrigemId")} className={inputCls(errors.canalOrigemId?.message)}>
                <option value="">Selecione o canal</option>
                {canais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Produto de interesse" error={errors.produtoInteresse?.message} required>
              <select {...register("produtoInteresse")} className={inputCls(errors.produtoInteresse?.message)}>
                <option value="CONSORCIO">Consórcio</option>
                <option value="FINANCIAMENTO">Financiamento</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </Field>
          </div>

          {/* Urgência */}
          <Field label="Urgência percebida" error={errors.urgencia?.message}>
            <select {...register("urgencia")} className={inputCls(errors.urgencia?.message)}>
              <option value="INDEFINIDA">Indefinida</option>
              <option value="IMEDIATA">Imediata — quer fechar em dias</option>
              <option value="CURTO_PRAZO">Curto prazo — até 30 dias</option>
              <option value="MEDIO_PRAZO">Médio prazo — 1 a 3 meses</option>
            </select>
          </Field>

          {/* Observações */}
          <Field label="Observações" error={errors.observacoes?.message}>
            <textarea
              {...register("observacoes")}
              rows={3}
              placeholder="Contexto relevante sobre o lead..."
              className={`${inputCls(errors.observacoes?.message)} resize-none`}
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <Link
              href="/dashboard/leads"
              className="flex-1 text-center py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Cadastrar Lead"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
