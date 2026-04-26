/**
 * bankData.ts — Mapa centralizado de dados visuais dos bancos brasileiros.
 * Logos em /public/banks/{slug}.svg (repositório Tgentil/Bancos-em-SVG).
 * logoColor: cor dominante da logo para cálculo de contraste automático.
 */

export interface BankData {
  name: string;
  keywords: string[];
  domain: string;
  slug: string;
  /** Cor de fundo do card/conta */
  primary: string;
  secondary: string;
  /** Cor do texto sobre o card */
  text: string;
  /** Cor dominante da logo (usada para contraste automático) */
  logoColor: string;
  abbr: string;
  ispb?: string;
}

export const BANKS: BankData[] = [
  // ── Grandes bancos ───────────────────────────────────────────────────────────
  { name: 'Nubank',        keywords: ['nu', 'nubank'],
    domain: 'nubank.com.br',         slug: 'nubank',      primary: '#8A05BE', secondary: '#6500A0', text: '#fff', logoColor: '#8A05BE', abbr: 'nu',       ispb: '18236120' },
  { name: 'Itaú',          keywords: ['itau', 'itaú', 'personnalité', 'personalite'],
    domain: 'itau.com.br',           slug: 'itau',        primary: '#EC7000', secondary: '#C06000', text: '#fff', logoColor: '#EC7000', abbr: 'itaú',     ispb: '60701190' },
  { name: 'Bradesco',      keywords: ['bradesco'],
    domain: 'bradesco.com.br',       slug: 'bradesco',    primary: '#CC092F', secondary: '#A00020', text: '#fff', logoColor: '#CC092F', abbr: 'B',        ispb: '60746948' },
  { name: 'Santander',     keywords: ['santander'],
    domain: 'santander.com.br',      slug: 'santander',   primary: '#EC0000', secondary: '#C20000', text: '#fff', logoColor: '#EC0000', abbr: 'S',        ispb: '90400888' },
  { name: 'Banco do Brasil', keywords: ['bb', 'banco do brasil', 'bancodobrasil'],
    domain: 'bb.com.br',             slug: 'bb',          primary: '#F9DD16', secondary: '#E8C800', text: '#002B5B', logoColor: '#003882', abbr: 'BB',   ispb: '00000000' },
  { name: 'Caixa',         keywords: ['caixa', 'cef', 'caixa econômica', 'caixa economica'],
    domain: 'caixa.gov.br',          slug: 'caixa',       primary: '#005CA9', secondary: '#003D73', text: '#fff', logoColor: '#005CA9', abbr: 'CAIXA',    ispb: '36122828' },
  // ── Fintechs e digitais ──────────────────────────────────────────────────────
  { name: 'Inter',         keywords: ['inter', 'banco inter', 'bancointer'],
    domain: 'bancointer.com.br',     slug: 'inter',       primary: '#FF7A00', secondary: '#E06000', text: '#fff', logoColor: '#FF7A00', abbr: 'inter',    ispb: '00416968' },
  { name: 'C6 Bank',       keywords: ['c6', 'c6bank', 'c6 bank'],
    domain: 'c6bank.com.br',         slug: 'c6',          primary: '#2D2D2D', secondary: '#1A1A1A', text: '#fff', logoColor: '#D4A843', abbr: 'C6',       ispb: '31872495' },
  { name: 'PicPay',        keywords: ['picpay'],
    domain: 'picpay.com',            slug: 'picpay',      primary: '#11C76F', secondary: '#009A55', text: '#fff', logoColor: '#11C76F', abbr: 'PP',       ispb: '22896431' },
  { name: 'PagBank',       keywords: ['pagbank', 'pagseguro'],
    domain: 'pagbank.com.br',        slug: 'pagbank',     primary: '#05AA4D', secondary: '#038A3D', text: '#fff', logoColor: '#05AA4D', abbr: 'Pag',      ispb: '08561701' },
  { name: 'Neon',          keywords: ['neon', 'banco neon'],
    domain: 'neon.com.br',           slug: 'neon',        primary: '#3250F8', secondary: '#1A38E0', text: '#fff', logoColor: '#3250F8', abbr: 'neon',     ispb: '20855875' },
  { name: 'Mercado Pago',  keywords: ['mercado pago', 'mercadopago'],
    domain: 'mercadopago.com.br',    slug: 'mercadopago', primary: '#009EE3', secondary: '#007EB3', text: '#fff', logoColor: '#009EE3', abbr: 'MP',       ispb: '10264663' },
  { name: 'Next',          keywords: ['next'],
    domain: 'next.me',               slug: 'next',        primary: '#00DC87', secondary: '#00B86F', text: '#002E35', logoColor: '#00DC87', abbr: 'next',  ispb: '' },
  { name: 'Agi',           keywords: ['agi', 'agibank'],
    domain: 'agibank.com.br',        slug: 'agi',         primary: '#6F00EF', secondary: '#5500CC', text: '#fff', logoColor: '#6F00EF', abbr: 'agi',      ispb: '' },
  { name: 'BTG',           keywords: ['btg', 'btg pactual'],
    domain: 'btgpactual.com',        slug: 'btg',         primary: '#1A1A2E', secondary: '#0D0D1F', text: '#fff', logoColor: '#1A1A2E', abbr: 'BTG',      ispb: '30306294' },
  { name: 'XP',            keywords: ['xp', 'xp investimentos'],
    domain: 'xpi.com.br',            slug: 'xp',          primary: '#111111', secondary: '#000000', text: '#fff', logoColor: '#111111', abbr: 'XP',       ispb: '02332886' },
  { name: 'Stone',         keywords: ['stone'],
    domain: 'stone.com.br',          slug: 'stone',       primary: '#00A868', secondary: '#007A4C', text: '#fff', logoColor: '#00A868', abbr: 'Stone',    ispb: '16501555' },
  // ── Cooperativas ─────────────────────────────────────────────────────────────
  { name: 'Sicoob',        keywords: ['sicoob'],
    domain: 'sicoob.com.br',         slug: 'sicoob',      primary: '#007E3A', secondary: '#005A28', text: '#fff', logoColor: '#007E3A', abbr: 'Sicoob',   ispb: '' },
  { name: 'Sicredi',       keywords: ['sicredi'],
    domain: 'sicredi.com.br',        slug: 'sicredi',     primary: '#008C3A', secondary: '#006A2A', text: '#fff', logoColor: '#008C3A', abbr: 'Sicredi',  ispb: '01181521' },
  { name: 'Unicred',       keywords: ['unicred'],
    domain: 'unicred.com.br',        slug: 'unicred',     primary: '#009A44', secondary: '#007530', text: '#fff', logoColor: '#009A44', abbr: 'Unicred',  ispb: '' },
  { name: 'Uniprime',      keywords: ['uniprime'],
    domain: 'uniprime.com.br',       slug: 'uniprime',    primary: '#00843D', secondary: '#006B32', text: '#fff', logoColor: '#00843D', abbr: 'Uniprime', ispb: '' },
  { name: 'Cresol',        keywords: ['cresol'],
    domain: 'cresol.com.br',         slug: 'cresol',      primary: '#009A3E', secondary: '#007530', text: '#fff', logoColor: '#009A3E', abbr: 'Cresol',   ispb: '' },
  { name: 'Ailos',         keywords: ['ailos'],
    domain: 'ailos.coop.br',         slug: 'ailos',       primary: '#005CA9', secondary: '#003D73', text: '#fff', logoColor: '#005CA9', abbr: 'Ailos',    ispb: '' },
  // ── Bancos tradicionais ───────────────────────────────────────────────────────
  { name: 'Banrisul',      keywords: ['banrisul'],
    domain: 'banrisul.com.br',       slug: 'banrisul',    primary: '#003087', secondary: '#001F5E', text: '#fff', logoColor: '#003087', abbr: 'Banrisul', ispb: '92702067' },
  { name: 'Banco Original', keywords: ['original', 'banco original'],
    domain: 'original.com.br',       slug: 'original',    primary: '#004B2E', secondary: '#003020', text: '#fff', logoColor: '#004B2E', abbr: 'Original', ispb: '92894922' },
  { name: 'Safra',         keywords: ['safra', 'banco safra'],
    domain: 'safra.com.br',          slug: 'safra',       primary: '#1A3A5C', secondary: '#0D2440', text: '#fff', logoColor: '#1A3A5C', abbr: 'Safra',    ispb: '58160789' },
  { name: 'Sofisa',        keywords: ['sofisa'],
    domain: 'sofisa.com.br',         slug: 'sofisa',      primary: '#FF6600', secondary: '#CC5200', text: '#fff', logoColor: '#FF6600', abbr: 'Sofisa',   ispb: '62099457' },
  { name: 'BMG',           keywords: ['bmg', 'banco bmg'],
    domain: 'bancobmg.com.br',       slug: 'bmg',         primary: '#FF0000', secondary: '#CC0000', text: '#fff', logoColor: '#FF0000', abbr: 'BMG',      ispb: '61186680' },
  { name: 'BRB',           keywords: ['brb', 'banco de brasilia'],
    domain: 'brb.com.br',            slug: 'brb',         primary: '#005AA0', secondary: '#003D73', text: '#fff', logoColor: '#005AA0', abbr: 'BRB',      ispb: '00204963' },
  { name: 'BS2',           keywords: ['bs2', 'banco bs2'],
    domain: 'bs2.com',               slug: 'bs2',         primary: '#0033A0', secondary: '#002278', text: '#fff', logoColor: '#0033A0', abbr: 'BS2',      ispb: '71027866' },
  { name: 'BNB',           keywords: ['bnb', 'banco do nordeste'],
    domain: 'bnb.gov.br',            slug: 'bnb',         primary: '#006B3F', secondary: '#004D2D', text: '#fff', logoColor: '#006B3F', abbr: 'BNB',      ispb: '07237373' },
  { name: 'Banestes',      keywords: ['banestes'],
    domain: 'banestes.com.br',       slug: 'banestes',    primary: '#003B8E', secondary: '#002A6A', text: '#fff', logoColor: '#003B8E', abbr: 'Banestes', ispb: '28127603' },
  { name: 'Credisis',      keywords: ['credisis'],
    domain: 'credisis.com.br',       slug: 'credisis',    primary: '#00529C', secondary: '#003D73', text: '#fff', logoColor: '#00529C', abbr: 'Credisis', ispb: '' },
  { name: 'Will Bank',     keywords: ['will', 'will bank'],
    domain: 'willbank.com.br',       slug: 'will',        primary: '#F5A623', secondary: '#D88A0D', text: '#1A1A1A', logoColor: '#F5A623', abbr: 'will',  ispb: '' },
  { name: 'Carteira',      keywords: ['carteira', 'dinheiro', 'especie', 'espécie', 'cash'],
    domain: '',                       slug: '',            primary: '#374151', secondary: '#1F2937', text: '#fff', logoColor: '#374151', abbr: '💵',        ispb: '' },
];

export function identifyBank(name: string): BankData | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const bank of BANKS) {
    if (bank.keywords.some((k) => lower.includes(k))) return bank;
  }
  return null;
}
