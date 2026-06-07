
import { Modal } from '../ui/Modal';
import { BankTheme } from './AccountCard';
import { ShieldAlert } from 'lucide-react';

interface BankSimulatorProps {
  open: boolean;
  onClose: () => void;
  accountName: string | null;
  balance: number;
  entries: any[];
  userName: string | null;
  bank: BankTheme | null;
}

export function BankSimulator({ open, onClose, accountName }: BankSimulatorProps) {
  return (
    <Modal open={open} onClose={onClose} title="Simulador Open Finance">
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-si-1">Simulador Bancário</h3>
          <p className="text-sm text-si-4 mt-2 max-w-[280px] mx-auto">
            A conexão em tempo real com {accountName || 'este banco'} estará disponível em breve através do Open Finance.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 bg-si-over-2 hover:bg-si-over-3 rounded-xl text-si-1 font-bold text-sm transition-colors"
        >
          Voltar
        </button>
      </div>
    </Modal>
  );
}
