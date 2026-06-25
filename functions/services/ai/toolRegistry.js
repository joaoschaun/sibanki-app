/**
 * toolRegistry.js — Catálogo declarativo de capacidades (tools) do Sibanki.
 *
 * Passo 0 da "Arquitetura de Inteligência Modular".
 *
 * Substitui, no longo prazo, o `if/else` por intenção do assistantOrchestrator:
 * em vez de `if (intent === 'quote') {...}`, o orquestrador faz
 * `registry.run(name, input)`. Adicionar capacidade = registrar uma tool.
 *
 * Esta é uma classe instanciável (não um singleton global) para permitir
 * registries isolados em teste. O bootstrap em `ai/index.js` cria a instância
 * padrão e registra as tools do app.
 */

"use strict";

class ToolRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this._tools = new Map();
  }

  /**
   * Registra uma tool (produto de defineTool). Nome duplicado lança erro —
   * registrar duas vezes é quase sempre bug de import.
   * @param {{ name: string, run: Function }} tool
   * @returns {ToolRegistry} this (encadeável)
   */
  register(tool) {
    if (!tool || typeof tool.name !== "string" || typeof tool.run !== "function") {
      throw new Error("registry.register: tool inválida (use defineTool)");
    }
    if (this._tools.has(tool.name)) {
      throw new Error(`registry.register: tool "${tool.name}" já registrada`);
    }
    this._tools.set(tool.name, tool);
    return this;
  }

  /** @param {string} name @returns {boolean} */
  has(name) {
    return this._tools.has(name);
  }

  /** @param {string} name @returns {object} a tool @throws se não existir */
  get(name) {
    const tool = this._tools.get(name);
    if (!tool) throw new Error(`registry.get: tool "${name}" não encontrada`);
    return tool;
  }

  /**
   * Catálogo leve — o que a IA "sabe fazer". É exatamente o que um dia
   * alimentaria o function-calling nativo (lista de tools + descrições).
   * @returns {Array<{name: string, description: string, deterministic: boolean}>}
   */
  list() {
    return [...this._tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      deterministic: t.deterministic,
    }));
  }

  /**
   * Invoca uma tool pelo nome (com validação de I/O do contrato).
   * @param {string} name
   * @param {*} input
   * @param {object} [ctx]
   * @returns {Promise<*>}
   */
  run(name, input, ctx) {
    return this.get(name).run(input, ctx);
  }

  /** Remove todas as tools — uso em teste. */
  clear() {
    this._tools.clear();
  }
}

module.exports = { ToolRegistry };
