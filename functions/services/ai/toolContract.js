/**
 * toolContract.js — Contrato de capacidade plugável (tool) do Sibanki.
 *
 * Passo 0 da "Arquitetura de Inteligência Modular"
 * (ver Projects/sibanki/ANALISE-ARQUITETURA-INTELIGENCIA-SIBANKI.md).
 *
 * Define o formato uniforme de uma "tool": uma capacidade com schema de entrada
 * e saída, descrição (para o roteador / futuro function-calling) e uma função
 * `run` por trás. A validação de I/O é o guarda-rail que generaliza o que
 * `extractEntry` já faz hoje pontualmente.
 *
 * SEM dependências externas (não há zod em functions/, e §9 do AGENTS.md proíbe
 * `npm install` solto). O validador abaixo é mínimo e proposital — cobre os tipos
 * que as tools determinísticas do Sibanki usam, nada além.
 *
 * REGRA DE OURO (AGENTS.md §0 e §4): uma tool com `deterministic: true` NUNCA pode
 * chamar LLM nem produzir número não-auditável. Cálculo de dinheiro é código.
 */

"use strict";

/** Erro de validação do INPUT de uma tool. */
class ToolInputError extends Error {
  constructor(toolName, details) {
    super(`Input inválido para tool "${toolName}": ${details}`);
    this.name = "ToolInputError";
    this.code = "invalid-argument";
    this.toolName = toolName;
  }
}

/** Erro de validação do OUTPUT de uma tool (guarda-rail de saída). */
class ToolOutputError extends Error {
  constructor(toolName, details) {
    super(`Output inválido da tool "${toolName}": ${details}`);
    this.name = "ToolOutputError";
    this.code = "internal";
    this.toolName = toolName;
  }
}

/**
 * Spec de campo aceita pelo validador:
 *   { type: 'number'|'string'|'boolean'|'object'|'array',
 *     optional?: boolean,   // ausência permitida
 *     nullable?: boolean,   // null permitido
 *     min?: number,         // number: valor mínimo | string/array: comprimento mínimo
 *     max?: number,         // number: valor máximo | string/array: comprimento máximo
 *     enum?: any[],         // valor deve estar na lista
 *     fields?: Schema,      // type === 'object': validação aninhada (opcional)
 *     items?: FieldSpec }   // type === 'array': spec de cada item (opcional)
 *
 * @typedef {Object.<string, object>} Schema
 */

const VALID_TYPES = new Set(["number", "string", "boolean", "object", "array"]);

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

/**
 * Valida `value` contra `spec`. Lança Error com mensagem legível em caso de falha.
 * @param {string} path  caminho do campo (para mensagem de erro)
 * @param {object} spec  FieldSpec
 * @param {*} value
 */
function validateField(path, spec, value) {
  if (value === undefined) {
    if (spec.optional) return;
    throw new Error(`campo obrigatório "${path}" ausente`);
  }
  if (value === null) {
    if (spec.nullable || spec.optional) return;
    throw new Error(`campo "${path}" não pode ser null`);
  }

  const actual = typeOf(value);
  if (actual !== spec.type) {
    throw new Error(`campo "${path}" esperava ${spec.type}, recebeu ${actual}`);
  }

  if (spec.type === "number") {
    if (!Number.isFinite(value)) throw new Error(`campo "${path}" deve ser número finito`);
    if (spec.min != null && value < spec.min) throw new Error(`campo "${path}" < min ${spec.min}`);
    if (spec.max != null && value > spec.max) throw new Error(`campo "${path}" > max ${spec.max}`);
  } else if (spec.type === "string") {
    if (spec.min != null && value.length < spec.min) throw new Error(`campo "${path}" curto demais`);
    if (spec.max != null && value.length > spec.max) throw new Error(`campo "${path}" longo demais`);
  } else if (spec.type === "array") {
    if (spec.min != null && value.length < spec.min) throw new Error(`array "${path}" curto demais`);
    if (spec.max != null && value.length > spec.max) throw new Error(`array "${path}" longo demais`);
    if (spec.items) value.forEach((item, i) => validateField(`${path}[${i}]`, spec.items, item));
  } else if (spec.type === "object" && spec.fields) {
    validateSchema(path, spec.fields, value);
  }

  if (spec.enum && !spec.enum.includes(value)) {
    throw new Error(`campo "${path}" fora do enum permitido`);
  }
}

/**
 * Valida um objeto inteiro contra um Schema (mapa campo → FieldSpec).
 * @param {string} path  prefixo do caminho ('' no topo)
 * @param {Schema} schema
 * @param {object} obj
 */
function validateSchema(path, schema, obj) {
  if (typeOf(obj) !== "object") {
    throw new Error(`${path || "input"} deve ser objeto, recebeu ${typeOf(obj)}`);
  }
  for (const key of Object.keys(schema)) {
    const fieldPath = path ? `${path}.${key}` : key;
    validateField(fieldPath, schema[key], obj[key]);
  }
}

/**
 * Define uma tool com contrato e validação automática de I/O.
 *
 * @template I, O
 * @param {{
 *   name: string,
 *   description: string,
 *   deterministic?: boolean,   // default true — cálculo auditável, sem LLM
 *   inputSchema?: Schema,      // opcional: sem schema = sem validação de input
 *   outputSchema?: Schema,     // opcional
 *   run: (input: I, ctx?: object) => Promise<O>|O
 * }} def
 * @returns {{ name, description, deterministic, inputSchema, outputSchema, run }}
 */
function defineTool(def) {
  if (!def || typeof def !== "object") throw new Error("defineTool: definição ausente");
  const { name, description, run } = def;
  if (typeof name !== "string" || !name.trim()) throw new Error("defineTool: name obrigatório");
  if (typeof description !== "string" || !description.trim()) {
    throw new Error(`defineTool(${name}): description obrigatória`);
  }
  if (typeof run !== "function") throw new Error(`defineTool(${name}): run deve ser função`);

  const inputSchema = def.inputSchema || null;
  const outputSchema = def.outputSchema || null;
  const deterministic = def.deterministic !== false; // default true

  for (const [schemaName, schema] of [["inputSchema", inputSchema], ["outputSchema", outputSchema]]) {
    if (!schema) continue;
    for (const [k, spec] of Object.entries(schema)) {
      if (!spec || !VALID_TYPES.has(spec.type)) {
        throw new Error(`defineTool(${name}): ${schemaName}.${k}.type inválido`);
      }
    }
  }

  async function guardedRun(input, ctx) {
    if (inputSchema) {
      try {
        validateSchema("", inputSchema, input);
      } catch (e) {
        throw new ToolInputError(name, e.message);
      }
    }
    const output = await run(input, ctx);
    if (outputSchema) {
      try {
        validateSchema("", outputSchema, output);
      } catch (e) {
        throw new ToolOutputError(name, e.message);
      }
    }
    return output;
  }

  return Object.freeze({
    name: name.trim(),
    description: description.trim(),
    deterministic,
    inputSchema,
    outputSchema,
    run: guardedRun,
  });
}

module.exports = {
  defineTool,
  validateSchema,
  validateField,
  ToolInputError,
  ToolOutputError,
};
