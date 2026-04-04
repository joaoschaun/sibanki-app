/**
 * Sentinela GPS — Geofencing Financeiro
 * Detecta tipo de local via OpenStreetMap Overpass API (gratuita, sem key)
 * e gera alerta personalizado do Arquiteto Soberano via WhatsApp.
 */

const fetch = require("node-fetch");

// ─── Overpass API ───────────────────────────────────────────────────────────

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_METERS = 100;

/**
 * Monta query Overpass QL para buscar amenidades num raio ao redor de lat/lng.
 */
function buildOverpassQuery(lat, lng, radius = RADIUS_METERS) {
  return `
[out:json][timeout:10];
(
  node["shop"](around:${radius},${lat},${lng});
  node["amenity"](around:${radius},${lat},${lng});
  node["leisure"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  way["amenity"](around:${radius},${lat},${lng});
  way["building"="commercial"](around:${radius},${lat},${lng});
);
out center tags 10;
  `.trim();
}

/**
 * Chama Overpass e retorna lista de tags dos elementos encontrados.
 */
async function queryOverpass(lat, lng) {
  const query = buildOverpassQuery(lat, lng);
  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.elements || []).map((el) => el.tags || {});
}


// ─── Mapeamento amenidade → cenário financeiro ───────────────────────────────

/**
 * Retorna o cenário financeiro a partir das tags OSM encontradas.
 * Prioridade: mais específico → mais genérico.
 */
function detectScenario(tagsList) {
  // Consolida todos os valores relevantes numa string pesquisável
  const blob = tagsList
    .map((t) =>
      [t.shop, t.amenity, t.leisure, t.name, t.building, t["name:pt"]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    )
    .join(" ");

  if (/concession|car_dealer|automovel|carro|veiculo|vehicle/.test(blob))
    return "car_dealer";
  if (/shopping|mall|center|galeria|shoppingcenter/.test(blob))
    return "shopping_mall";
  if (/electronics|celular|smartphone|informatica|eletronico|phoneshop/.test(blob))
    return "electronics_store";
  if (/jewelry|joalher|relogio|joia|bijuteria/.test(blob))
    return "jewelry_store";
  if (/supermarket|mercado|supermercado|hypermarket|grocery/.test(blob))
    return "supermarket";
  if (/bank|banco|caixa|bradesco|itau|santander|nubank|inter|sicoob/.test(blob))
    return "bank";
  if (/pharmacy|farmacia|drogaria/.test(blob))
    return "pharmacy";
  if (/restaurant|restaurante|fastfood|bar|cafe|lanchonete/.test(blob))
    return "food_venue";
  if (/clothes|vestuario|roupa|fashion|moda/.test(blob))
    return "clothing_store";
  if (/furniture|moveis|movelaria|casa_construcao/.test(blob))
    return "furniture_store";

  return null; // sem cenário relevante
}


// ─── Templates de mensagem por cenário ──────────────────────────────────────

/**
 * Gera mensagem do Arquiteto Soberano para o cenário detectado.
 * @param {string} scenario
 * @param {object} snapshot — saída de buildSovereigntySnapshot (pode ser parcial)
 * @param {string} placeName — nome do local (opcional, do OSM)
 */
function buildGeoAlert(scenario, snapshot = {}, placeName = "") {
  const {
    daysOfFreedom = null,
    spreadGap = null,
    monthlyBurn = null,
    categoryBudgets = {},
  } = snapshot;

  const ld = daysOfFreedom != null ? `*${Math.round(daysOfFreedom)} dias de liberdade*` : null;
  const sg = spreadGap != null
    ? (spreadGap >= 0
        ? `Spread Gap positivo de *+${spreadGap.toFixed(2)}%/mês*`
        : `Spread Gap negativo de *${spreadGap.toFixed(2)}%/mês* — suas dívidas custam mais do que seus investimentos rendem`)
    : null;

  const local = placeName ? `📍 *${placeName}*` : "📍 Local detectado";

  switch (scenario) {
    case "car_dealer":
      return [
        `🚗 ${local} — *Concessionária*`,
        ``,
        `Arquiteto Soberano ativado antes de você entrar nessa negociação.`,
        ``,
        ld ? `⏱ Hoje você tem ${ld}. Um financiamento de R$ 60.000 em 60x a 1,5%/mês custaria aproximadamente *340 dias de liberdade* ao longo do contrato.` : ``,
        sg ? `📊 ${sg}.` : ``,
        ``,
        `⚖️ *Antes de assinar qualquer coisa:*`,
        `• Peça o CET (Custo Efetivo Total) — não a prestação`,
        `• Compare com CDC bancário: costuma ser 30–40% mais barato que financiamento da montadora`,
        `• Carro financiado é passivo disfarçado de ativo`,
        ``,
        `_O Arquiteto está com você. Negocie com frieza._`,
      ].filter((l) => l !== undefined).join("\n");

    case "shopping_mall":
      return [
        `🛍 ${local} — *Shopping Center*`,
        ``,
        ld ? `Seus ${ld} são o único número que importa hoje.` : `Atenção: modo compra ativado.`,
        ``,
        `🧠 *Protocolo anti-impulso:*`,
        `• Espere 72h antes de qualquer compra acima de R$ 200`,
        `• Pergunte: "Isso me dá mais dias de liberdade ou tira?"`,
        `• Marketing de vitrine é projetado para criar urgência falsa`,
        ``,
        `_Entrar não é obrigação de comprar. Saia com soberania intacta._`,
      ].filter(Boolean).join("\n");

    case "electronics_store":
      return [
        `📱 ${local} — *Loja de Eletrônicos*`,
        ``,
        `Antes de decidir, simule rápido:`,
        `• Digite no chat: "à vista ou parcelado?" com o valor do produto`,
        `• CDI atual: ~1,07%/mês. Parcelar sem juros e investir o valor pode ser melhor — *ou não*.`,
        ``,
        ld ? `⏱ Você tem ${ld}. Cada R$ 1.000 gasto hoje = ${monthlyBurn ? Math.round(1000 / (monthlyBurn / 30)) : "N"} dias a menos.` : ``,
        ``,
        `_Eletrônico novo não é urgência. Soberania sim._`,
      ].filter(Boolean).join("\n");

    case "jewelry_store":
      return [
        `💍 ${local} — *Joalheria / Relojoaria*`,
        ``,
        `Joia é reserva de valor — *se paga à vista e com desconto*.`,
        ``,
        `⚠️ Parcelado em joalheria: juros embutidos na etiqueta são a regra, não exceção.`,
        ld ? `⏱ ${ld} disponíveis. Avalie se faz sentido agora.` : ``,
        ``,
        `_Luxo consciente é permitido. Luxo no limite do cartão, não._`,
      ].filter(Boolean).join("\n");

    case "supermarket": {
      const foodBudget = categoryBudgets["Alimentação"] || categoryBudgets["alimentacao"] || null;
      const foodStatus = foodBudget
        ? `\n🛒 Orçamento Alimentação: R$ ${foodBudget.spent?.toFixed(0) || "?"} / R$ ${foodBudget.limit?.toFixed(0) || "?"} (${foodBudget.pct?.toFixed(0) || "?"}% usado)`
        : "";
      return [
        `🛒 ${local} — *Supermercado*`,
        foodStatus,
        ``,
        `💡 *Táticas de soberania no mercado:*`,
        `• Lista fechada > carrinho aberto`,
        `• Marcas próprias têm 20–40% de desconto com qualidade similar`,
        `• Proteína mais barata: ovos, sardinha, frango (nessa ordem)`,
        ``,
        `_Compra consciente é ato de soberania diária._`,
      ].filter(Boolean).join("\n");
    }

    case "bank":
      return [
        `🏦 ${local} — *Banco / Agência*`,
        ``,
        sg ? `📊 ${sg}.` : ``,
        ``,
        `🔍 *Perguntas que o gerente não vai te fazer:*`,
        `• Qual o CET do produto que estão oferecendo?`,
        `• Existe portabilidade para reduzir minha taxa atual?`,
        `• Meu perfil já permite Selic direta ou CDB acima de 110% CDI?`,
        ``,
        `⚠️ Gerente de banco vende produto do banco. O Arquiteto vende soberania.`,
        ``,
        `_Ouça, anote, decida em casa — nunca no balcão._`,
      ].filter(Boolean).join("\n");

    case "pharmacy":
      return [
        `💊 ${local} — *Farmácia*`,
        ``,
        `💡 *Dicas de soberania:*`,
        `• Genérico tem a mesma fórmula — até 70% mais barato`,
        `• Programa Farmácia Popular: remédios de uso contínuo gratuitos ou R$ 2–5`,
        `• Farmácias de manipulação: até 40% mais barato para contínuos`,
        ``,
        `_Saúde é investimento. Mas eficiência no gasto é soberania._`,
      ].filter(Boolean).join("\n");

    case "food_venue":
      return [
        `🍽 ${local} — *Restaurante / Lanchonete*`,
        ``,
        `Alimentação fora de casa costuma representar 15–25% do orçamento familiar brasileiro.`,
        ``,
        categoryBudgets["Alimentação"]
          ? `🛒 Orçamento Alimentação: ${JSON.stringify(categoryBudgets["Alimentação"])}`
          : ``,
        ``,
        `_Aproveite — prazer consciente faz parte da soberania._`,
      ].filter(Boolean).join("\n");

    case "clothing_store":
      return [
        `👕 ${local} — *Loja de Roupas*`,
        ``,
        `Moda rápida é o passivo que não aparece no balanço.`,
        ``,
        `⚖️ Regra do Arquiteto: *só compra roupa nova quem doou a última velha*.`,
        ld ? `⏱ ${ld} disponíveis. Vale a troca?` : ``,
        ``,
        `_Guarda-roupa enxuto = mente enxuta = decisões melhores._`,
      ].filter(Boolean).join("\n");

    case "furniture_store":
      return [
        `🛋 ${local} — *Loja de Móveis*`,
        ``,
        `Móvel parcelado em 24x tem custo real muito acima do preço de etiqueta.`,
        ``,
        `💡 Negocie: lojas de móveis têm até 30% de margem para desconto à vista.`,
        ld ? `⏱ Com ${ld}, avalie se o momento financeiro suporta essa compra.` : ``,
        ``,
        `_Lar organizado não precisa ser novo. Precisa ser intencional._`,
      ].filter(Boolean).join("\n");

    default:
      return null;
  }
}


// ─── Extração de nome do local ───────────────────────────────────────────────

/**
 * Tenta extrair um nome legível do local a partir das tags OSM.
 */
function extractPlaceName(tagsList) {
  for (const tags of tagsList) {
    const name = tags["name:pt"] || tags.name || tags.brand;
    if (name) return name;
  }
  return "";
}

// ─── Entrada principal ───────────────────────────────────────────────────────

/**
 * Detecta o cenário financeiro a partir de coordenadas GPS.
 * @param {number} lat
 * @param {number} lng
 * @returns {{ scenario: string|null, placeName: string, tagsList: object[] }}
 */
async function detectFinancialScenario(lat, lng) {
  const tagsList = await queryOverpass(lat, lng);
  const scenario = detectScenario(tagsList);
  const placeName = extractPlaceName(tagsList);
  return { scenario, placeName, tagsList };
}

/**
 * Pipeline completo: coordenadas → mensagem WhatsApp.
 * @param {number} lat
 * @param {number} lng
 * @param {object} snapshot — buildSovereigntySnapshot (opcional)
 * @param {Function} sendFn — função (message: string) => Promise<void>
 * @returns {{ scenario: string|null, placeName: string, message: string|null, sent: boolean }}
 */
async function runSentinelaGeo(lat, lng, snapshot = {}, sendFn = null) {
  const { scenario, placeName } = await detectFinancialScenario(lat, lng);

  if (!scenario) {
    return { scenario: null, placeName, message: null, sent: false };
  }

  const message = buildGeoAlert(scenario, snapshot, placeName);

  if (message && sendFn) {
    await sendFn(message);
    return { scenario, placeName, message, sent: true };
  }

  return { scenario, placeName, message, sent: false };
}

module.exports = {
  detectFinancialScenario,
  buildGeoAlert,
  runSentinelaGeo,
  detectScenario,
  RADIUS_METERS,
};
