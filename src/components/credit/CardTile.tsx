import { useState } from 'react';
import { Pencil, Trash2, ShieldCheck, Plus, FileText, MoreHorizontal } from 'lucide-react';
import type { Card } from '../../types/userData';
import { cn } from '../../utils/cn';

/**
 * CardTile — cartão compacto do domínio Crédito (redesenho da tela-monstro).
 *
 * Presentational: recebe os valores já calculados (used/pctUsado/diasFecha) e
 * callbacks. A hierarquia é por PRESSÃO — utilização >= 80% acende borda e
 * barra em `risk`; as 5 ações recolhem para o menu `…` (44px de toque, aria).
 *
 * Faixa da bandeira (6px) = exceção de marca formalizada (auditoria §4).
 */

const FLAG_COLORS: Record<string, string> = {
  Visa: '#1a1f71',
  Mastercard: '#eb001b',
  Elo: '#00a4e0',
  Amex: '#2e77bc',
  Hipercard: '#b3131b',
};

export interface CardTileProps {
  card: Card;
  bank: string;
  used: number;
  pctUsado: number;
  diasFecha: number;
  onBenefits: () => void;
  onLancar: () => void;
  onFatura: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

type Tier = 'positive' | 'warning' | 'risk';

function tierOf(pct: number): Tier {
  if (pct >= 80) return 'risk';
  if (pct >= 50) return 'warning';
  return 'positive';
}

const TIER_LABEL: Record<Tier, string> = {
  positive: 'Saudável',
  warning: 'Atenção',
  risk: 'Pressão alta',
};
const TIER_PILL: Record<Tier, string> = {
  positive: 'text-si-positive-text bg-si-positive-bg',
  warning: 'text-si-warning-text bg-si-warning-bg',
  risk: 'text-si-risk-text bg-si-risk-bg',
};
const TIER_BAR: Record<Tier, string> = {
  positive: 'bg-si-3',
  warning: 'bg-si-warning-text',
  risk: 'bg-si-risk-text',
};

function brl(v: number): string {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

const LABEL = 'text-[10px] font-bold tracking-[0.16em] uppercase text-si-4';

export function CardTile({
  card, bank, used, pctUsado, diasFecha,
  onBenefits, onLancar, onFatura, onEdit, onDelete,
}: CardTileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tier = tierOf(pctUsado);
  const stripColor = card.color || FLAG_COLORS[card.flag ?? 'Visa'] || '#3a3a3a';
  const fechaUrgent = diasFecha <= 3;
  const name = card.name || 'Cartão';

  const act = (fn: () => void) => () => { setMenuOpen(false); fn(); };

  const menuItem = 'flex items-center gap-2.5 w-full px-3 py-2 text-xs text-si-3 hover:bg-si-over-2 hover:text-si-1 transition-colors';

  return (
    <article className={cn(
      'relative bg-si-card rounded-xl overflow-hidden border',
      tier === 'risk' ? 'border-rose-500/30' : 'border-si-border',
    )}>
      <div className="h-1.5 w-full" style={{ backgroundColor: stripColor }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-si-1 leading-tight truncate">{name}</p>
            <p className={cn(LABEL, 'mt-1 truncate')}>{card.flag ?? 'Cartão'} · {bank}</p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={`Ações do cartão ${name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-si-3 hover:text-si-1 transition-colors min-touch-target active-press"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
                <div role="menu" className="absolute right-0 top-full mt-1 w-40 py-1 bg-si-card border border-si-border-md rounded-xl shadow-xl z-50">
                  <button type="button" role="menuitem" onClick={act(onFatura)} className={menuItem}>
                    <FileText className="w-3.5 h-3.5" /> Ver fatura
                  </button>
                  <button type="button" role="menuitem" onClick={act(onLancar)} className={menuItem}>
                    <Plus className="w-3.5 h-3.5" /> Lançar compra
                  </button>
                  <button type="button" role="menuitem" onClick={act(onBenefits)} className={menuItem}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Benefícios
                  </button>
                  <button type="button" role="menuitem" onClick={act(onEdit)} className={menuItem}>
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <div className="my-1 h-px bg-si-border mx-2" />
                  <button type="button" role="menuitem" onClick={act(onDelete)} className={cn(menuItem, 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10')}>
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <div className={LABEL}>Devo</div>
            <div className="text-sm font-semibold text-si-1 mt-1">{brl(used)}</div>
          </div>
          <div>
            <div className={LABEL}>Fecha</div>
            <div className={cn('text-sm font-semibold mt-1', fechaUrgent ? 'text-si-risk-text' : 'text-si-2')}>
              {diasFecha}&nbsp;{diasFecha === 1 ? 'dia' : 'dias'}
            </div>
          </div>
          <div>
            <div className={LABEL}>Vence</div>
            <div className="text-sm font-semibold text-si-2 mt-1">dia {card.dueDay}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span className={LABEL}>Limite usado · {pctUsado}%</span>
          <span className={cn('text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-md', TIER_PILL[tier])}>
            {TIER_LABEL[tier]}
          </span>
        </div>
        <div className="h-1.5 bg-si-over-2 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', TIER_BAR[tier])}
            style={{ width: `${Math.min(100, Math.max(0, pctUsado))}%` }}
          />
        </div>
      </div>
    </article>
  );
}
