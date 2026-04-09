"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";

export function MarcarLidasButton({ usuarioId }: { usuarioId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function marcarTodas() {
    setLoading(true);
    await fetch(`/api/notificacoes/marcar-lidas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={marcarTodas}
      disabled={loading}
      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CheckCheck className="w-3.5 h-3.5" />
      )}
      Marcar todas como lidas
    </button>
  );
}
