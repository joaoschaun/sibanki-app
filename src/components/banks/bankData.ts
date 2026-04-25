/**
 * bankData.ts — Mapa centralizado de dados visuais dos bancos brasileiros.
 * Logos ficam em /public/banks/{slug}.svg — gerenciadas como arquivos independentes.
 */

export interface BankData {
  name: string;
  keywords: string[];
  domain: string;
  /** Slug do arquivo em /public/banks/{slug}.svg */
  slug: string;
  primary: string;
  secondary: string;
  text: string;
  abbr: string;
  ispb?: string;
}

export const BANKS: BankData[] = [
  { name: 'Nubank',         keywords: ['nu', 'nubank'],
    domain: 'nubank.com.br',         slug: 'nubank',      primary: '#8A05BE', secondary: '#6500A0', text: '#fff',    abbr: 'nu',       ispb: '18236120' },
  { name: 'Itaú',           keywords: ['itau', 'itaú', 'personnalité', 'personalite'],
    domain: 'itau.com.br',           slug: 'itau',        primary: '#EC7000', secondary: '#C06000', text: '#fff',    abbr: 'itaú',     ispb: '60701190' },
  { name: 'Bradesco',       keywords: ['bradesco'],
    domain: 'bradesco.com.br',       slug: 'bradesco',    primary: '#CC092F', secondary: '#A00020', text: '#fff',    abbr: 'B',        ispb: '60746948' },
  { name: 'Santander',      keywords: ['santander'],
    domain: 'santander.com.br',      slug: 'santander',   primary: '#EC0000', secondary: '#C20000', text: '#fff',    abbr: 'S',        ispb: '90400888' },
  { name: 'Banco do Brasil', keywords: ['bb', 'banco do brasil', 'bancodobrasil'],
    domain: 'bb.com.br',             slug: 'bb',          primary: '#F9DD16', secondary: '#E8C800', text: '#002B5B', abbr: 'BB',       ispb: '00000000' },
  { name: 'Caixa',          keywords: ['caixa', 'cef', 'caixa econômica', 'caixa economica'],
    domain: 'caixa.gov.br',          slug: 'caixa',       primary: '#005CA9', secondary: '#003D73', text: '#fff',    abbr: 'CAIXA',    ispb: '36122828' },
  { name: 'Inter',          keywords: ['inter', 'banco inter', 'bancointer'],
    domain: 'bancointer.com.br',     slug: 'inter',       primary: '#FF7A00', secondary: '#E06000', text: '#fff',    abbr: 'inter',    ispb: '00416968' },
  { name: 'C6 Bank',        keywords: ['c6', 'c6bank', 'c6 bank'],
    domain: 'c6bank.com.br',         slug: 'c6',          primary: '#2D2D2D', secondary: '#1A1A1A', text: '#fff',    abbr: 'C6',       ispb: '31872495' },
  { name: 'PicPay',         keywords: ['picpay'],
    domain: 'picpay.com',            slug: 'picpay',      primary: '#11C76F', secondary: '#009A55', text: '#fff',    abbr: 'PP',       ispb: '22896431' },
  { name: 'PagBank',        keywords: ['pagbank', 'pagseguro'],
    domain: 'pagbank.com.br',        slug: 'pagbank',     primary: '#05AA4D', secondary: '#038A3D', text: '#fff',    abbr: 'Pag',      ispb: '08561701' },
  { name: 'Neon',           keywords: ['neon', 'banco neon'],
    domain: 'neon.com.br',           slug: 'neon',        primary: '#3250F8', secondary: '#1A38E0', text: '#fff',    abbr: 'neon',     ispb: '20855875' },
  { name: 'Mercado Pago',   keywords: ['mercado pago', 'mercadopago'],
    domain: 'mercadopago.com.br',    slug: 'mercadopago', primary: '#009EE3', secondary: '#007EB3', text: '#fff',    abbr: 'MP',       ispb: '10264663' },
  { name: 'Next',           keywords: ['next'],
    domain: 'next.me',               slug: 'next',        primary: '#00DC87', secondary: '#00B86F', text: '#002E35', abbr: 'next',     ispb: '' },
  { name: 'Agi',            keywords: ['agi', 'agibank'],
    domain: 'agibank.com.br',        slug: 'agi',         primary: '#6F00EF', secondary: '#5500CC', text: '#fff',    abbr: 'agi',      ispb: '' },
  { name: 'BTG',            keywords: ['btg', 'btg pactual'],
    domain: 'btgpactual.com',        slug: 'btg',         primary: '#1A1A2E', secondary: '#0D0D1F', text: '#fff',    abbr: 'BTG',      ispb: '30306294' },
  { name: 'XP',             keywords: ['xp', 'xp investimentos'],
    domain: 'xpi.com.br',            slug: 'xp',          primary: '#111111', secondary: '#000000', text: '#fff',    abbr: 'XP',       ispb: '02332886' },
  { name: 'Sicoob',         keywords: ['sicoob'],
    domain: 'sicoob.com.br',         slug: 'sicoob',      primary: '#007E3A', secondary: '#005A28', text: '#fff',    abbr: 'Sicoob',   ispb: '' },
  { name: 'Sicredi',        keywords: ['sicredi'],
    domain: 'sicredi.com.br',        slug: 'sicredi',     primary: '#008C3A', secondary: '#006A2A', text: '#fff',    abbr: 'Sicredi',  ispb: '01181521' },
  { name: 'Banrisul',       keywords: ['banrisul'],
    domain: 'banrisul.com.br',       slug: 'banrisul',    primary: '#003087', secondary: '#001F5E', text: '#fff',    abbr: 'Banrisul', ispb: '92702067' },
  { name: 'Banco Original', keywords: ['original', 'banco original'],
    domain: 'original.com.br',       slug: 'original',    primary: '#004B2E', secondary: '#003020', text: '#fff',    abbr: 'Original', ispb: '92894922' },
  { name: 'Will Bank',      keywords: ['will', 'will bank'],
    domain: 'willbank.com.br',       slug: 'will',        primary: '#F5A623', secondary: '#D88A0D', text: '#1A1A1A', abbr: 'will',     ispb: '' },
  { name: 'Carteira',       keywords: ['carteira', 'dinheiro', 'especie', 'espécie', 'cash'],
    domain: '',                       slug: '',            primary: '#374151', secondary: '#1F2937', text: '#fff',    abbr: '💵',        ispb: '' },
];

export function identifyBank(name: string): BankData | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const bank of BANKS) {
    if (bank.keywords.some((k) => lower.includes(k))) return bank;
  }
  return null;
}
