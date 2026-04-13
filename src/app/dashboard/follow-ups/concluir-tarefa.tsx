"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export function ConcluirTarefa({ tarefaId }: { tarefaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  async function concluir() {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tarefas/${tarefaId}`, { method: "PATCH" });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={concluir}
      disabled={loading || done}
      title="Marcar como realizada"
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        done
          ? "bg-green-100 text-green-600 cursor-default"
          : "bg-slate-100 hover:bg-green-100 text-slate-400 hover:text-green-600"
      }`}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <CheckCircle className="w-3.5 h-3.5" />
      }
    </button>
  );
}
