// Template para producao de Conteudo Digital / Redes Sociais
// Usado em jobs de social media, reels, stories, campanha digital

import type { TemplateItem, TemplateCategory } from './gg-template.ts';

export type { TemplateItem, TemplateCategory };

export const DIGITAL_TEMPLATE_NAME = 'Conteudo Digital / Redes Sociais';

export const DIGITAL_TEMPLATE: TemplateCategory[] = [
  {
    item_number: 1,
    name: 'DESEMBOLSOS',
    items: [
      { item_number: 1, sub_item_number: 1, service_description: 'Uber/Transporte', sort_order: 101 },
      { item_number: 1, sub_item_number: 2, service_description: 'Verba de Producao', sort_order: 102 },
      { item_number: 1, sub_item_number: 3, service_description: 'Compras Emergenciais', sort_order: 103 },
    ],
  },
  {
    item_number: 2,
    name: 'CRIACAO DE CONTEUDO',
    items: [
      { item_number: 2, sub_item_number: 1, service_description: 'Roteirista/Criativo', sort_order: 201 },
      { item_number: 2, sub_item_number: 2, service_description: 'Social Media Strategist', sort_order: 202 },
      { item_number: 2, sub_item_number: 3, service_description: 'Redator/Copywriter', sort_order: 203 },
    ],
  },
  {
    item_number: 3,
    name: 'LOCACAO',
    items: [
      { item_number: 3, sub_item_number: 1, service_description: 'Locacao', sort_order: 301 },
    ],
  },
  {
    item_number: 4,
    name: 'DIRECAO / FOTOGRAFIA / SOM',
    items: [
      { item_number: 4, sub_item_number: 1, service_description: 'Diretor de Cena', sort_order: 401 },
      { item_number: 4, sub_item_number: 2, service_description: 'Diretor de Fotografia', sort_order: 402 },
      { item_number: 4, sub_item_number: 3, service_description: 'Operador de Camera', sort_order: 403 },
      { item_number: 4, sub_item_number: 4, service_description: 'Assistente de Camera', sort_order: 404 },
      { item_number: 4, sub_item_number: 5, service_description: 'Tecnico de Som', sort_order: 405 },
    ],
  },
  {
    item_number: 5,
    name: 'PRODUCAO',
    items: [
      { item_number: 5, sub_item_number: 1, service_description: 'Produtor Executivo', sort_order: 501 },
      { item_number: 5, sub_item_number: 2, service_description: 'Produtor de Set', sort_order: 502 },
      { item_number: 5, sub_item_number: 3, service_description: 'Assistente de Producao', sort_order: 503 },
    ],
  },
  {
    item_number: 6,
    name: 'INFLUENCIADORES / TALENTOS',
    items: [
      { item_number: 6, sub_item_number: 1, service_description: 'Influenciador', sort_order: 601 },
      { item_number: 6, sub_item_number: 2, service_description: 'Cache Talento', sort_order: 602 },
      { item_number: 6, sub_item_number: 3, service_description: 'Direito de Imagem', sort_order: 603 },
    ],
  },
  {
    item_number: 7,
    name: 'ALIMENTACAO / TRANSPORTE',
    items: [
      { item_number: 7, sub_item_number: 1, service_description: 'Alimentacao Equipe', sort_order: 701 },
      { item_number: 7, sub_item_number: 2, service_description: 'Transporte Equipe', sort_order: 702 },
    ],
  },
  {
    item_number: 8,
    name: 'CAMERA / LUZ / INFRA',
    items: [
      { item_number: 8, sub_item_number: 1, service_description: 'Camera + Lente', sort_order: 801 },
      { item_number: 8, sub_item_number: 2, service_description: 'Kit Iluminacao', sort_order: 802 },
      { item_number: 8, sub_item_number: 3, service_description: 'HD/Midia', sort_order: 803 },
    ],
  },
  {
    item_number: 9,
    name: 'POS-PRODUCAO',
    items: [
      { item_number: 9, sub_item_number: 1, service_description: 'Editor/Montador', sort_order: 901 },
      { item_number: 9, sub_item_number: 2, service_description: 'Motion Designer', sort_order: 902 },
      { item_number: 9, sub_item_number: 3, service_description: 'Designer Grafico', sort_order: 903 },
      { item_number: 9, sub_item_number: 4, service_description: 'Finalizacao de Audio', sort_order: 904 },
    ],
  },
  {
    item_number: 10,
    name: 'ADMINISTRATIVO',
    items: [
      { item_number: 10, sub_item_number: 1, service_description: 'Atendimento', sort_order: 1001 },
    ],
  },
  {
    item_number: 99,
    name: 'MAO DE OBRA INTERNA',
    items: [
      { item_number: 99, sub_item_number: 1, service_description: 'Equipe Interna', sort_order: 9901 },
    ],
  },
];

// Gera array flat para insercao no banco
export function flattenDigitalTemplate(): TemplateItem[] {
  const result: TemplateItem[] = [];
  for (const cat of DIGITAL_TEMPLATE) {
    result.push({
      item_number: cat.item_number,
      sub_item_number: 0,
      service_description: cat.name,
      sort_order: cat.item_number * 100,
    });
    for (const item of cat.items) {
      result.push(item);
    }
  }
  return result;
}
