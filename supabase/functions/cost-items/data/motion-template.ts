// Template para producao de Motion Graphics / Animacao
// Usado em jobs de animacao 2D/3D, motion design, infografico animado

import type { TemplateItem, TemplateCategory } from './gg-template.ts';

export type { TemplateItem, TemplateCategory };

export const MOTION_TEMPLATE_NAME = 'Motion Graphics / Animacao';

export const MOTION_TEMPLATE: TemplateCategory[] = [
  {
    item_number: 1,
    name: 'DESEMBOLSOS',
    items: [
      { item_number: 1, sub_item_number: 1, service_description: 'Uber/Transporte', sort_order: 101 },
      { item_number: 1, sub_item_number: 2, service_description: 'Verba de Producao', sort_order: 102 },
    ],
  },
  {
    item_number: 2,
    name: 'CRIACAO / DIRECAO DE ARTE',
    items: [
      { item_number: 2, sub_item_number: 1, service_description: 'Diretor de Arte', sort_order: 201 },
      { item_number: 2, sub_item_number: 2, service_description: 'Ilustrador', sort_order: 202 },
      { item_number: 2, sub_item_number: 3, service_description: 'Designer de Personagem', sort_order: 203 },
      { item_number: 2, sub_item_number: 4, service_description: 'Storyboard Artist', sort_order: 204 },
    ],
  },
  {
    item_number: 3,
    name: 'ANIMACAO 2D',
    items: [
      { item_number: 3, sub_item_number: 1, service_description: 'Animador 2D', sort_order: 301 },
      { item_number: 3, sub_item_number: 2, service_description: 'Assistente de Animacao', sort_order: 302 },
      { item_number: 3, sub_item_number: 3, service_description: 'Rig de Personagem', sort_order: 303 },
    ],
  },
  {
    item_number: 4,
    name: 'ANIMACAO 3D',
    items: [
      { item_number: 4, sub_item_number: 1, service_description: 'Modelador 3D', sort_order: 401 },
      { item_number: 4, sub_item_number: 2, service_description: 'Animador 3D', sort_order: 402 },
      { item_number: 4, sub_item_number: 3, service_description: 'Texturizador', sort_order: 403 },
      { item_number: 4, sub_item_number: 4, service_description: 'Iluminacao/Render', sort_order: 404 },
      { item_number: 4, sub_item_number: 5, service_description: 'Composicao', sort_order: 405 },
    ],
  },
  {
    item_number: 5,
    name: 'MOTION DESIGN',
    items: [
      { item_number: 5, sub_item_number: 1, service_description: 'Motion Designer Senior', sort_order: 501 },
      { item_number: 5, sub_item_number: 2, service_description: 'Motion Designer Jr', sort_order: 502 },
      { item_number: 5, sub_item_number: 3, service_description: 'Infografista', sort_order: 503 },
    ],
  },
  {
    item_number: 6,
    name: 'AUDIO / TRILHA',
    items: [
      { item_number: 6, sub_item_number: 1, service_description: 'Compositor Musical', sort_order: 601 },
      { item_number: 6, sub_item_number: 2, service_description: 'Sound Design', sort_order: 602 },
      { item_number: 6, sub_item_number: 3, service_description: 'Locutor(a)', sort_order: 603 },
      { item_number: 6, sub_item_number: 4, service_description: 'Mixagem Final', sort_order: 604 },
    ],
  },
  {
    item_number: 7,
    name: 'PRODUCAO',
    items: [
      { item_number: 7, sub_item_number: 1, service_description: 'Produtor Executivo', sort_order: 701 },
      { item_number: 7, sub_item_number: 2, service_description: 'Coordenador de Producao', sort_order: 702 },
    ],
  },
  {
    item_number: 8,
    name: 'LICENCAS / SOFTWARE',
    items: [
      { item_number: 8, sub_item_number: 1, service_description: 'Licenca Render Farm', sort_order: 801 },
      { item_number: 8, sub_item_number: 2, service_description: 'Plugins Especiais', sort_order: 802 },
      { item_number: 8, sub_item_number: 3, service_description: 'Stock Assets', sort_order: 803 },
    ],
  },
  {
    item_number: 9,
    name: 'POS-PRODUCAO',
    items: [
      { item_number: 9, sub_item_number: 1, service_description: 'Color Grading', sort_order: 901 },
      { item_number: 9, sub_item_number: 2, service_description: 'Finalizacao', sort_order: 902 },
      { item_number: 9, sub_item_number: 3, service_description: 'Entrega de Arquivos', sort_order: 903 },
    ],
  },
  {
    item_number: 10,
    name: 'ADMINISTRATIVO',
    items: [
      { item_number: 10, sub_item_number: 1, service_description: 'Atendimento', sort_order: 1001 },
      { item_number: 10, sub_item_number: 2, service_description: 'Verba Administrativa', sort_order: 1002 },
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
export function flattenMotionTemplate(): TemplateItem[] {
  const result: TemplateItem[] = [];
  for (const cat of MOTION_TEMPLATE) {
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
