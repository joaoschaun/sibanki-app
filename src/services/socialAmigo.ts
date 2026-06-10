/**
 * Cliente front-end para CrediAmigo e ConsorcioAmigo.
 * Todas as chamadas passam pelas Cloud Functions (autenticadas).
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// ── Tipos compartilhados ──────────────────────────────────────────────────────
export type InstallmentStatus = 'pending' | 'paid' | 'overdue';
export type LoanStatus        = 'pending_acceptance' | 'active' | 'completed' | 'cancelled';
export type ContactType       = 'whatsapp' | 'email';
export type MemberStatus      = 'invited' | 'accepted' | 'declined';
export type GroupStatus       = 'pending' | 'active' | 'completed';

export interface LoanInstallment {
  number: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt: string | null;
}

export interface Loan {
  id: string;
  role: 'credor' | 'devedor';
  credorName: string;
  devedorName: string;
  devedorContact: string;
  devedorContactType: ContactType;
  amount: number;
  interestRate: number;
  installments: number;
  firstDueDate: string;
  notes: string;
  status: LoanStatus;
  acceptToken: string;
  installmentsList: LoanInstallment[];
  createdAt: string;
  acceptedAt: string | null;
}

export interface GroupMember {
  id: string;
  name: string;
  contact: string;
  contactType: ContactType;
  isAdmin: boolean;
  status: MemberStatus;
  receivedRound: number | null;
  inviteToken: string | null;
  payments: { round: number; paid: boolean; date: string | null }[];
}

export interface GroupRound {
  number: number;
  dueDate: string;
  winnerId: string | null;
  status: 'upcoming' | 'active' | 'completed';
}

export interface ConsorcioGroup {
  id: string;
  adminUid: string;
  adminName: string;
  name: string;
  contributionAmount: number;
  frequency: 'monthly' | 'biweekly';
  drawMethod: 'random' | 'order' | 'bid';
  startDate: string;
  status: GroupStatus;
  inviteToken: string;
  members: GroupMember[];
  rounds: GroupRound[];
  createdAt: string;
}

// ── CrediAmigo ────────────────────────────────────────────────────────────────
export async function createLoan(payload: {
  counterpartName: string;
  counterpartContact: string;
  contactType: ContactType;
  amount: number;
  interestRate: number;
  installments: number;
  firstDueDate: string;
  notes: string;
}): Promise<{ loanId: string; acceptToken: string }> {
  const fn = httpsCallable<typeof payload, { loanId: string; acceptToken: string }>(functions, 'crediAmigoCreate');
  const res = await fn(payload);
  return res.data;
}

export async function getLoans(): Promise<Loan[]> {
  const fn = httpsCallable<void, { loans: Loan[] }>(functions, 'crediAmigoGetLoans');
  const res = await fn();
  return res.data.loans;
}

export async function markInstallmentPaid(loanId: string, installmentNumber: number): Promise<{ allPaid: boolean }> {
  const fn = httpsCallable<{ loanId: string; installmentNumber: number }, { allPaid: boolean }>(functions, 'crediAmigoMarkPaid');
  const res = await fn({ loanId, installmentNumber });
  return res.data;
}

export function getLoanAcceptUrl(acceptToken: string): string {
  return `${window.location.origin}/aceitar/emprestimo/${acceptToken}`;
}

// ── ConsorcioAmigo ────────────────────────────────────────────────────────────
export async function createGroup(payload: {
  name: string;
  contributionAmount: number;
  frequency: string;
  drawMethod: string;
  startDate: string;
  members: { name: string; contact: string; contactType: ContactType }[];
}): Promise<{ groupId: string; inviteToken: string }> {
  const fn = httpsCallable<typeof payload, { groupId: string; inviteToken: string }>(functions, 'consorcioCreate');
  const res = await fn(payload);
  return res.data;
}

export async function getGroups(): Promise<ConsorcioGroup[]> {
  const fn = httpsCallable<void, { groups: ConsorcioGroup[] }>(functions, 'consorcioGetGroups');
  const res = await fn();
  return res.data.groups;
}

export async function drawWinner(groupId: string, roundNumber: number): Promise<{ winnerId: string; winnerName: string; allDone: boolean }> {
  const fn = httpsCallable<{ groupId: string; roundNumber: number }, { winnerId: string; winnerName: string; allDone: boolean }>(functions, 'consorcioDrawWinner');
  const res = await fn({ groupId, roundNumber });
  return res.data;
}

export async function markRoundPaid(groupId: string, roundNumber: number, memberId: string): Promise<{ ok: boolean }> {
  const fn = httpsCallable<{ groupId: string; roundNumber: number; memberId: string }, { ok: boolean }>(functions, 'consorcioMarkPaid');
  const res = await fn({ groupId, roundNumber, memberId });
  return res.data;
}

export function getGroupInviteUrl(inviteToken: string): string {
  return `${window.location.origin}/aceitar/grupo/${inviteToken}`;
}
