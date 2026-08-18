import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positivo" | "negativo" | "alerta";

const toneRing: Record<Tone, string> = {
  neutral: "before:bg-[linear-gradient(135deg,oklch(1_0_0/22%),oklch(1_0_0/4%))]",
  positivo: "before:bg-[var(--gradient-brand)]",
  negativo: "before:bg-[var(--gradient-danger)]",
  alerta: "before:bg-[var(--gradient-warning)]",
};

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  positivo: "text-success",
  negativo: "text-destructive",
  alerta: "text-warning",
};

export function KpiCard({
  titulo,
  valor,
  detalhe,
  icone,
  tom = "neutral",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone?: ReactNode;
  tom?: Tone;
}) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5",
        "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-['']",
        toneRing[tom],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
        {icone && <span className="icon3d size-9 text-muted-foreground">{icone}</span>}
      </div>
      <p className={cn("num mt-3 text-2xl font-semibold md:text-[1.7rem]", toneText[tom])}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}
