// Template para producao de Monstro / Animatic
// Usado em jobs de pre-producao conceitual, validacao de ideia e animatics

import type { TemplateItem, TemplateCategory } from './gg-template.ts';

export type { TemplateItem, TemplateCategory };

export const MONSTRO_TEMPLATE_NAME = 'Monstro / Animatic';

export const MONSTRO_TEMPLATE: TemplateCategory[] = [
  {
    item_number: 1,
    name: 'PESQUISA E REFERENCIAS',
    items: [
      { item_number: 1, sub_item_number: 1, service_description: 'Pesquisa de Referencias Visuais', sort_order: 101 },
      { item_number: 1, sub_item_number: 2, service_description: 'Banco de Imagens/Stock Footage', sort_order: 102 },
      { item_number: 1, sub_item_number: 3, service_description: 'Licenciamento de Imagens', sort_order: 103 },
    ],
  },
  {
    item_number: 2,
    name: 'CRIACAO E ROTEIRO',
    items: [
      { item_number: 2, sub_item_number: 1, service_description: 'Roteirista/Criativo', sort_order: 201 },
      { item_number: 2, sub_item_number: 2, service_description: 'Storyboard Artist', sort_order: 202 },
      { item_number: 2, sub_item_number: 3, service_description: 'Diretor de Cena (Referencias)', sort_order: 203 },
    ],
  },
  {
    item_number: 3,
    name: 'PRODUCAO',
    items: [
      { item_number: 3, sub_item_number: 1, service_description: 'Produtor Executivo', sort_order: 301 },
      { item_number: 3, sub_item_number: 2, service_description: 'Coordenador de Producao', sort_order: 302 },
    ],
  },
  {
    item_number: 4,
    name: 'CAPTACAO (SE HOUVER)',
    items: [
      { item_number: 4, sub_item_number: 1, service_description: 'Operador de Camera', sort_order: 401 },
      { item_number: 4, sub_item_number: 2, service_description: 'Equipamento Camera/Luz', sort_order: 402 },
      { item_number: 4, sub_item_number: 3, service_description: 'Locacao Teste', sort_order: 403 },
    ],
  },
  {
    item_number: 5,
    name: 'POS-PRODUCAO',
    items: [
      { item_number: 5, sub_item_number: 1, service_description: 'Editor/Montador', sort_order: 501 },
      { item_number: 5, sub_item_number: 2, service_description: 'Motion Designer', sort_order: 502 },
      { item_number: 5, sub_item_number: 3, service_description: 'Locutor(a) Temporario(a)', sort_order: 503 },
      { item_number: 5, sub_item_number: 4, service_description: 'Trilha Temporaria (Licenciamento)', sort_order: 504 },
      { item_number: 5, sub_item_number: 5, service_description: 'Mixagem/Finalizacao Audio', sort_order: 505 },
    ],
  },
  {
    item_number: 6,
    name: 'ADMINISTRATIVO',
    items: [
      { item_number: 6, sub_item_number: 1, service_description: 'Atendimento', sort_order: 601 },
      { item_number: 6, sub_item_number: 2, service_description: 'Verba de Producao', sort_order: 602 },
    ],
  },
];

// Gera array flat para insercao no banco
export function flattenMonstroTemplate(): TemplateItem[] {
  const result: TemplateItem[] = [];
  for (const cat of MONSTRO_TEMPLATE) {
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
