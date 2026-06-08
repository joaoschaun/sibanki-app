/**
 * PageSkeleton — skeletons reutilizáveis para carregamento de páginas.
 *
 * Substituem o spinner genérico (PageLoader) em páginas pesadas,
 * dando feedback visual contextualizado enquanto o chunk JS carrega.
 *
 * Uso: importar o skeleton específico da página e usar como fallback do Suspense
 * ou como estado de loading inicial dentro da página.
 *
 *   if (loading) return <CardsSkeleton />;
 */

/** Bloco shimmer base — anima suavemente de escuro para menos escuro. */
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-si-over-2 animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

// ── Cards (Crédito · Cartões) ────────────────────────────────────────────────

export function CardsSkeleton() {
  return (
    <div className="space-y-8" aria-label="Carregando cartões…">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-10 w-32" />
          <Shimmer className="h-10 w-32" />
        </div>
      </div>

      {/* Cartões grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            {/* Cartão visual */}
            <Shimmer className="h-44 w-full rounded-2xl" />
            {/* Info card */}
            <div className="bg-si-card rounded-2xl border border-si-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Shimmer className="h-4 w-40" />
                <Shimmer className="h-4 w-24" />
              </div>
              <Shimmer className="h-2 w-full rounded-full" />
              <div className="flex gap-2">
                <Shimmer className="h-8 w-24" />
                <Shimmer className="h-8 w-20" />
                <Shimmer className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Growth (Crescimento / Investimentos) ─────────────────────────────────────

export function GrowthSkeleton() {
  return (
    <div className="space-y-8" aria-label="Carregando investimentos…">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Shimmer className="h-8 w-44" />
        <Shimmer className="h-10 w-36" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-si-card rounded-2xl border border-si-border p-4 space-y-2">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-28" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <Shimmer className="h-4 w-32 mb-4" />
        <Shimmer className="h-40 w-full rounded-xl" />
      </div>

      {/* Lista de ativos */}
      <div className="bg-si-card rounded-2xl border border-si-border divide-y divide-si-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-3 w-16" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <Shimmer className="h-4 w-20 ml-auto" />
              <Shimmer className="h-3 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Social (Feed comunitário) ─────────────────────────────────────────────────

export function SocialSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando feed…">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Shimmer className="h-8 w-32" />
        <Shimmer className="h-10 w-36" />
      </div>

      {/* Composer */}
      <Shimmer className="h-24 w-full rounded-2xl" />

      {/* Posts */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-si-card rounded-2xl border border-si-border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-3 w-20" />
            </div>
          </div>
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="h-4 w-4/6" />
          <div className="flex gap-4 pt-1">
            <Shimmer className="h-6 w-16" />
            <Shimmer className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-label="Carregando painel…">
      {/* Hero Sovereignty */}
      <Shimmer className="h-40 w-full rounded-2xl" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-si-card rounded-2xl border border-si-border p-4 space-y-2">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-si-card rounded-2xl border border-si-border p-5 space-y-3">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-48 w-full rounded-xl" />
        </div>
        <div className="bg-si-card rounded-2xl border border-si-border p-5 space-y-3">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-48 w-full rounded-xl" />
        </div>
      </div>

      {/* Transactions preview */}
      <div className="bg-si-card rounded-2xl border border-si-border divide-y divide-si-border">
        <div className="flex items-center justify-between p-4">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-4 w-16" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-36" />
                <Shimmer className="h-3 w-20" />
              </div>
            </div>
            <Shimmer className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic — para páginas de lista/CRUD sem skeleton dedicado ───────────────

export function GenericPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-label="Carregando…">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-40" />
          <Shimmer className="h-4 w-56" />
        </div>
        <Shimmer className="h-10 w-32" />
      </div>
      <div className="bg-si-card rounded-2xl border border-si-border divide-y divide-si-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-40" />
                <Shimmer className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-20" />
              <Shimmer className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Transactions (Lançamentos) ───────────────────────────────────────────────

export function TransactionsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando lançamentos…">
      <div className="flex items-center justify-between gap-4">
        <Shimmer className="h-8 w-40" />
        <Shimmer className="h-10 w-36" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Lista */}
      <div className="bg-si-card rounded-2xl border border-si-border divide-y divide-si-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-44" />
                <Shimmer className="h-3 w-24" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <Shimmer className="h-4 w-20 ml-auto" />
              <Shimmer className="h-3 w-14 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
