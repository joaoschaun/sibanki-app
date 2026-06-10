import { Smartphone, List, Pencil, Trash2, AlertTriangle, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Zap } from 'lucide-react';
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
import { BankLogo } from '../banks/BankLogo';
import type { BankData } from '../banks/bankData';

/** Compatibilidade legada — use BankData de bankData.ts para código novo */
export interface BankTheme {
  name: string;
  keywords: string[];
  bg: string;
  text: string;
  logoText: string;
  ispb?: string;
}

interface AccountCardProps {
  name: string;
  balance: number;
  corHex: string | null;
  bank: BankTheme | BankData | null;
  isEmpty: boolean;
  /** Variação líquida do mês corrente (receitas - despesas) */
  monthlyDelta?: number;
  /** Tipo da conta (Conta corrente, Poupança, etc.) */
  tipo?: string;
  /** Status Open Finance vinculado a esta conta */
  ofStatus?: 'nao-conectado' | 'ativo' | 'erro' | 'expirado';
  /** Moeda da conta */
  currency?: string;
  onOpenApp?: () => void;
  onOpenDetails?: () => void;
  onEdit?: () => void;
  onAdjust?: () => void;
  onDelete?: () => void;
}

function formatCurrency(value: number, currency = 'BRL') {
  if (currency === 'BRL') {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
}


export function AccountCard({
  name,
  balance,
  corHex,
  bank,
  isEmpty,
  monthlyDelta,
  tipo,
  ofStatus,
  currency = 'BRL',
  onOpenApp,
  onOpenDetails,
  onEdit,
  onAdjust,
  onDelete,
}: AccountCardProps) {
  const colorClass = corHex ? '' : 'bg-blue-500/20 text-blue-400';
  const isOverdraft = !isEmpty && balance < 0;

  const bankPrimary = bank ? ((bank as any).primary ?? (bank as any).bg) : null;
  const bankSecondary = bank ? ((bank as any).secondary ?? (bank as any).bg) : null;
  const bankText = bank ? ((bank as any).text) : null;

  const bankStyle = bank
    ? {
        background: `linear-gradient(135deg, ${bankPrimary}E6 0%, ${bankSecondary} 100%)`,
        color: bankText,
        borderColor: isOverdraft ? '#ef4444' : `${bankText}20`,
        boxShadow: isOverdraft
          ? '0 0 20px rgba(239, 68, 68, 0.3)'
          : `0 10px 30px -10px ${bankPrimary}80`,
      }
    : {};

  const defaultStyle = !bank && corHex
    ? {
        borderColor: isOverdraft ? '#ef4444' : `${corHex}40`,
        boxShadow: isOverdraft
          ? '0 0 20px rgba(239, 68, 68, 0.3)'
          : `0 10px 30px -10px ${corHex}20`,
      }
    : {
        borderColor: isOverdraft ? '#ef4444' : undefined,
        boxShadow: isOverdraft ? '0 0 20px rgba(239, 68, 68, 0.3)' : undefined,
      };

  // Indicador de variação mensal
  const hasDelta = monthlyDelta !== undefined;
  const deltaPositive = hasDelta && monthlyDelta! > 0;
  const deltaNeutral = hasDelta && monthlyDelta === 0;
  const DeltaIcon = deltaNeutral ? Minus : deltaPositive ? TrendingUp : TrendingDown;

  // Badge Open Finance
  const ofBadge = ofStatus === 'ativo'
    ? { icon: Wifi, label: 'OF', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : ofStatus === 'erro' || ofStatus === 'expirado'
    ? { icon: WifiOff, label: 'OF', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
    : null;


  return (
    <div
      className={cn(
        "rounded-[24px] border p-6 flex flex-col gap-4 group transition-all duration-500 relative overflow-hidden backdrop-blur-xl",
        !bank ? "bg-si-card/80 border-si-border hover:bg-si-over-2 hover:-translate-y-1" : "hover:scale-[1.03]"
      )}
      style={bank ? bankStyle : defaultStyle}
    >
      {/* Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      {bank && (
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
          <Smartphone className="w-40 h-40" />
        </div>
      )}
      {isOverdraft && <div className="absolute top-0 inset-x-0 h-1 bg-red-500 animate-pulse" />}

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Logo do banco — preenchimento colorido ou ícone do banco */}
          <div
            className={cn(
              'p-2.5 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0 flex items-center justify-center',
              bank ? 'bg-black/25 backdrop-blur-md border border-white/10' : colorClass
            )}
            style={!bank && corHex ? { backgroundColor: `${corHex}20`, border: `1px solid ${corHex}40` } : undefined}
          >
            {bank ? (
              <BankLogo
                bank={bank as unknown as BankData}
                size={28}
                backgroundHex={bankPrimary ?? undefined}
              />
            ) : (
              /* Sem banco reconhecido: inicial estilizada */
              <span
                className="font-black text-lg leading-none"
                style={corHex ? { color: corHex } : undefined}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-bold truncate tracking-tight text-base", bank ? "text-current" : "text-si-1")}>
              {name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {tipo && <p className="text-[11px] opacity-60 font-semibold uppercase tracking-wider">{tipo}</p>}
              {currency !== 'BRL' && (
                <span className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{currency}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ofBadge && (
            <span className={cn("flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase", ofBadge.cls)}>
              <ofBadge.icon className="w-3 h-3" />{ofBadge.label}
            </span>
          )}
          {isOverdraft && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">
              <AlertTriangle className="w-3 h-3" /> Juros
            </div>
          )}
        </div>
      </div>


      {/* Balance */}
      <div className="relative z-10">
        <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", bank ? "opacity-60" : "text-si-5")}>
          Saldo disponível
        </p>
        <p className={cn(
          "text-3xl font-black tracking-tighter truncate",
          bank ? "text-current" : (balance >= 0 ? "text-emerald-400" : "text-rose-400")
        )}>
          {!isEmpty ? formatCurrency(balance, currency) : '—'}
        </p>

        {/* Delta mensal */}
        {hasDelta && !isEmpty && (
          <div className={cn(
            "flex items-center gap-1.5 mt-2 text-xs font-bold",
            bank ? "opacity-80" : (deltaPositive ? "text-emerald-400" : deltaNeutral ? "text-si-5" : "text-rose-400")
          )}>
            <DeltaIcon className="w-3.5 h-3.5" />
            <span>
              {deltaPositive ? '+' : ''}{formatCurrency(monthlyDelta!, currency)} este mês
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEmpty && (
        <div className={cn(
          "flex items-center gap-1.5 pt-4 mt-auto border-t relative z-10",
          bank ? "border-white/10" : "border-si-border"
        )}>
          {bank && (
            <button
              type="button"
              onClick={onOpenApp}
              className="flex-1 py-2.5 px-3 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/5 text-sm font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Smartphone className="w-4 h-4" /> Extrato
            </button>
          )}

          {/* Action icons — sempre visíveis no mobile, hover no desktop */}
          <div className={cn(
            "flex items-center gap-0.5 transition-all duration-300 sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0",
            bank ? "ml-auto" : "w-full justify-end"
          )}>
            <button type="button" onClick={onOpenDetails}
              className={cn("p-2 rounded-xl transition-colors", bank ? "text-current hover:bg-black/20" : "text-si-4 hover:text-si-2 hover:bg-si-over-3")}
              title="Detalhes">
              <List className="w-4 h-4" />
            </button>
            {!bank && (
              <button type="button" onClick={onOpenApp}
                className="p-2 rounded-xl transition-colors text-si-4 hover:text-si-2 hover:bg-si-over-3"
                title="Extrato">
                <Smartphone className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={onEdit}
              className={cn("p-2 rounded-xl transition-colors", bank ? "text-current hover:bg-black/20" : "text-si-4 hover:text-si-2 hover:bg-si-over-3")}
              title="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" onClick={onAdjust}
              className={cn("p-2 rounded-xl transition-colors", bank ? "text-current hover:bg-black/20" : "text-si-4 hover:text-si-2 hover:bg-si-over-3")}
              title="Ajustar saldo">
              <Zap className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDelete}
              className={cn("p-2 rounded-xl transition-colors", bank ? "text-current hover:bg-black/20" : "text-si-4 hover:text-rose-400 hover:bg-rose-500/10")}
              title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
