/**
 * Envelope.tsx — Redireciona para /orcamento (modo Envelope integrado ao Budget)
 * O sistema de envelopes foi unificado com o Orçamento.
 */
import { Navigate } from 'react-router-dom';
export default function Envelope() {
  return <Navigate to="/orcamento" replace />;
}
