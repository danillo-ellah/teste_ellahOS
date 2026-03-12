export interface TemplateCategoryPreview {
  item_number: number
  name: string
  items_count: number
}

export interface TemplateOption {
  id: string
  name: string
  description: string
  total_items: number
  categories: TemplateCategoryPreview[]
}

export const GG_TEMPLATE_PREVIEW: TemplateCategoryPreview[] = [
  { item_number: 1, name: 'Desembolsos de Verbas a Vista', items_count: 8 },
  { item_number: 2, name: 'Estudio', items_count: 1 },
  { item_number: 3, name: 'Locacao', items_count: 2 },
  { item_number: 4, name: 'Direcao de Arte / Figurino / Efeitos', items_count: 19 },
  { item_number: 5, name: 'Direcao de Cena / Fotografia / Som', items_count: 28 },
  { item_number: 6, name: 'Producao', items_count: 15 },
  { item_number: 7, name: 'Veiculos', items_count: 3 },
  { item_number: 8, name: 'Passagem / Hospedagem / Alimentacao', items_count: 4 },
  { item_number: 9, name: 'Camera / Luz / Maquinaria / Gerador / Infra', items_count: 11 },
  { item_number: 10, name: 'Producao de Casting', items_count: 4 },
  { item_number: 11, name: 'Objetos de Cena', items_count: 1 },
  { item_number: 12, name: 'Still / Bastidores', items_count: 2 },
  { item_number: 13, name: 'Pos Producao / Trilha / Condecine', items_count: 12 },
  { item_number: 14, name: 'Administrativo / Financeiro', items_count: 4 },
  { item_number: 15, name: 'Monstro', items_count: 1 },
  { item_number: 99, name: 'Mao de Obra Interna', items_count: 1 },
]

export const GG_TEMPLATE_TOTAL_ITEMS = 140
export const GG_TEMPLATE_NAME = 'Producao Audiovisual Publicitaria'

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'monstro',
    name: 'Monstro / Animatic',
    description: 'Para pitch e concorrencia. Rough cut com stock, locucao temp e motion basico.',
    total_items: 18,
    categories: [
      { item_number: 1, name: 'Pesquisa e Referencias', items_count: 3 },
      { item_number: 2, name: 'Criacao e Roteiro', items_count: 3 },
      { item_number: 3, name: 'Producao', items_count: 2 },
      { item_number: 4, name: 'Captacao (se houver)', items_count: 3 },
      { item_number: 5, name: 'Pos-Producao', items_count: 5 },
      { item_number: 6, name: 'Administrativo', items_count: 2 },
    ],
  },
  {
    id: 'digital',
    name: 'Conteudo Digital / Redes Sociais',
    description: 'Para reels, TikToks, stories e videos curtos. Equipe enxuta, producao agil.',
    total_items: 32,
    categories: [
      { item_number: 1, name: 'Desembolsos', items_count: 3 },
      { item_number: 2, name: 'Criacao de Conteudo', items_count: 3 },
      { item_number: 3, name: 'Locacao', items_count: 1 },
      { item_number: 4, name: 'Direcao / Fotografia / Som', items_count: 5 },
      { item_number: 5, name: 'Producao', items_count: 3 },
      { item_number: 6, name: 'Influenciadores / Talentos', items_count: 3 },
      { item_number: 7, name: 'Alimentacao / Transporte', items_count: 2 },
      { item_number: 8, name: 'Camera / Luz / Infra', items_count: 3 },
      { item_number: 9, name: 'Pos-Producao', items_count: 4 },
      { item_number: 10, name: 'Administrativo', items_count: 1 },
      { item_number: 99, name: 'Mao de Obra Interna', items_count: 1 },
    ],
  },
  {
    id: 'motion',
    name: 'Motion Graphics / Animacao',
    description: 'Para videos 100% animados, infograficos, vinhetas, explainers. Zero filmagem.',
    total_items: 33,
    categories: [
      { item_number: 1, name: 'Desembolsos', items_count: 2 },
      { item_number: 2, name: 'Criacao / Direcao de Arte', items_count: 4 },
      { item_number: 3, name: 'Animacao 2D', items_count: 3 },
      { item_number: 4, name: 'Animacao 3D', items_count: 5 },
      { item_number: 5, name: 'Motion Design', items_count: 3 },
      { item_number: 6, name: 'Audio / Trilha', items_count: 4 },
      { item_number: 7, name: 'Producao', items_count: 2 },
      { item_number: 8, name: 'Licencas / Software', items_count: 3 },
      { item_number: 9, name: 'Pos-Producao', items_count: 3 },
      { item_number: 10, name: 'Administrativo', items_count: 2 },
      { item_number: 99, name: 'Mao de Obra Interna', items_count: 1 },
    ],
  },
  {
    id: 'gg',
    name: 'Producao Audiovisual Publicitaria',
    description: 'Template completo para filmes publicitarios, campanhas TV, etc.',
    total_items: 140,
    categories: GG_TEMPLATE_PREVIEW,
  },
]
