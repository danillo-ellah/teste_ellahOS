// Template padrao para producao audiovisual publicitaria
// Fonte: GG_038 (Quer Fazer? Senac!) — job real Ellah Filmes

export interface TemplateItem {
  item_number: number;
  sub_item_number: number;
  service_description: string;
  sort_order: number;
}

export interface TemplateCategory {
  item_number: number;
  name: string;
  items: TemplateItem[];
}

export const GG_TEMPLATE_NAME = 'Producao Audiovisual Publicitaria';

export const GG_TEMPLATE: TemplateCategory[] = [
  {
    item_number: 1,
    name: 'DESEMBOLSOS DE VERBAS A VISTA',
    items: [
      { item_number: 1, sub_item_number: 1, service_description: 'Uber equipe', sort_order: 101 },
      { item_number: 1, sub_item_number: 2, service_description: 'Verba de Producao', sort_order: 102 },
      { item_number: 1, sub_item_number: 3, service_description: 'Verba de Arte', sort_order: 103 },
      { item_number: 1, sub_item_number: 4, service_description: 'Verba de Figurino', sort_order: 104 },
      { item_number: 1, sub_item_number: 5, service_description: 'Reembolso Equipe', sort_order: 105 },
      { item_number: 1, sub_item_number: 6, service_description: 'Compras Emergenciais de Set', sort_order: 106 },
      { item_number: 1, sub_item_number: 7, service_description: 'Impressoes / Autorizacoes', sort_order: 107 },
      { item_number: 1, sub_item_number: 8, service_description: 'Verba de visita de locacao', sort_order: 108 },
    ],
  },
  {
    item_number: 2,
    name: 'ESTUDIO',
    items: [
      { item_number: 2, sub_item_number: 1, service_description: 'Estudio', sort_order: 201 },
    ],
  },
  {
    item_number: 3,
    name: 'LOCACAO',
    items: [
      { item_number: 3, sub_item_number: 1, service_description: 'Diretor de Locacao', sort_order: 301 },
      { item_number: 3, sub_item_number: 2, service_description: 'Locacao', sort_order: 302 },
    ],
  },
  {
    item_number: 4,
    name: 'DIRECAO DE ARTE / FIGURINO / EFEITOS',
    items: [
      { item_number: 4, sub_item_number: 1, service_description: 'Diretor(a) de arte', sort_order: 401 },
      { item_number: 4, sub_item_number: 2, service_description: 'Assistente de Arte', sort_order: 402 },
      { item_number: 4, sub_item_number: 3, service_description: 'Pesquisa e Layouts', sort_order: 403 },
      { item_number: 4, sub_item_number: 4, service_description: 'Produtor de Objetos', sort_order: 404 },
      { item_number: 4, sub_item_number: 5, service_description: 'Assistente de Objetos', sort_order: 405 },
      { item_number: 4, sub_item_number: 6, service_description: 'Contra Regra', sort_order: 406 },
      { item_number: 4, sub_item_number: 7, service_description: 'Assistente Contra Regra', sort_order: 407 },
      { item_number: 4, sub_item_number: 8, service_description: 'Ajudante Arte I', sort_order: 408 },
      { item_number: 4, sub_item_number: 9, service_description: 'Ajudante Arte II', sort_order: 409 },
      { item_number: 4, sub_item_number: 10, service_description: 'Ajudante Arte III', sort_order: 410 },
      { item_number: 4, sub_item_number: 11, service_description: 'Ajudante Arte IV', sort_order: 411 },
      { item_number: 4, sub_item_number: 12, service_description: 'Retirada de arte', sort_order: 412 },
      { item_number: 4, sub_item_number: 13, service_description: 'Devolucao de arte', sort_order: 413 },
      { item_number: 4, sub_item_number: 14, service_description: 'Produtor(a) de Figurino', sort_order: 414 },
      { item_number: 4, sub_item_number: 15, service_description: 'Assistente de figurino I', sort_order: 415 },
      { item_number: 4, sub_item_number: 16, service_description: 'Assistente de figurino II', sort_order: 416 },
      { item_number: 4, sub_item_number: 17, service_description: 'Camareira', sort_order: 417 },
      { item_number: 4, sub_item_number: 18, service_description: 'Make/hair', sort_order: 418 },
      { item_number: 4, sub_item_number: 19, service_description: 'Assistente de Make', sort_order: 419 },
    ],
  },
  {
    item_number: 5,
    name: 'DIRECAO DE CENA / FOTOGRAFIA / SOM',
    items: [
      { item_number: 5, sub_item_number: 1, service_description: 'Shooting Board', sort_order: 501 },
      { item_number: 5, sub_item_number: 2, service_description: 'Diretor de cena', sort_order: 502 },
      { item_number: 5, sub_item_number: 3, service_description: 'Assistente de Direcao I', sort_order: 503 },
      { item_number: 5, sub_item_number: 4, service_description: 'Assistente de Direcao II', sort_order: 504 },
      { item_number: 5, sub_item_number: 5, service_description: 'Logger / Script', sort_order: 505 },
      { item_number: 5, sub_item_number: 6, service_description: 'Diretor de Fotografia', sort_order: 506 },
      { item_number: 5, sub_item_number: 7, service_description: 'Operador de Camera', sort_order: 507 },
      { item_number: 5, sub_item_number: 8, service_description: 'Assistente de Camera I', sort_order: 508 },
      { item_number: 5, sub_item_number: 9, service_description: 'Assistente de Camera II', sort_order: 509 },
      { item_number: 5, sub_item_number: 10, service_description: 'DIT', sort_order: 510 },
      { item_number: 5, sub_item_number: 11, service_description: 'Video Assist / Playback', sort_order: 511 },
      { item_number: 5, sub_item_number: 12, service_description: 'Making Off', sort_order: 512 },
      { item_number: 5, sub_item_number: 13, service_description: 'Chefe de Eletrica', sort_order: 513 },
      { item_number: 5, sub_item_number: 14, service_description: 'Assistente de Eletrica I', sort_order: 514 },
      { item_number: 5, sub_item_number: 15, service_description: 'Assistente de Eletrica II', sort_order: 515 },
      { item_number: 5, sub_item_number: 16, service_description: 'Assistente de Eletrica III', sort_order: 516 },
      { item_number: 5, sub_item_number: 17, service_description: 'Assistente de Eletrica IV', sort_order: 517 },
      { item_number: 5, sub_item_number: 18, service_description: 'Chefe de Maquinaria', sort_order: 518 },
      { item_number: 5, sub_item_number: 19, service_description: 'Assistente de Maquinaria I', sort_order: 519 },
      { item_number: 5, sub_item_number: 20, service_description: 'Assistente de Maquinaria II', sort_order: 520 },
      { item_number: 5, sub_item_number: 21, service_description: 'Assistente de Maquinaria III', sort_order: 521 },
      { item_number: 5, sub_item_number: 22, service_description: 'Carga e Dev Eletrica', sort_order: 522 },
      { item_number: 5, sub_item_number: 23, service_description: 'Carga e Dev Maquinaria', sort_order: 523 },
      { item_number: 5, sub_item_number: 24, service_description: 'Operador de Drone', sort_order: 524 },
      { item_number: 5, sub_item_number: 25, service_description: 'Operador Ronin / Steadicam', sort_order: 525 },
      { item_number: 5, sub_item_number: 26, service_description: 'Tecnico de Som Direto', sort_order: 526 },
      { item_number: 5, sub_item_number: 27, service_description: 'Microfonista', sort_order: 527 },
      { item_number: 5, sub_item_number: 28, service_description: 'Assistente de Som', sort_order: 528 },
    ],
  },
  {
    item_number: 6,
    name: 'PRODUCAO',
    items: [
      { item_number: 6, sub_item_number: 1, service_description: 'Produtor Executivo', sort_order: 601 },
      { item_number: 6, sub_item_number: 2, service_description: 'Diretor de Producao', sort_order: 602 },
      { item_number: 6, sub_item_number: 3, service_description: 'Coordenador de Producao', sort_order: 603 },
      { item_number: 6, sub_item_number: 4, service_description: 'Produtor', sort_order: 604 },
      { item_number: 6, sub_item_number: 5, service_description: 'Ajudante de Producao I', sort_order: 605 },
      { item_number: 6, sub_item_number: 6, service_description: 'Ajudante de Producao II', sort_order: 606 },
      { item_number: 6, sub_item_number: 7, service_description: 'Ajudante de Producao III', sort_order: 607 },
      { item_number: 6, sub_item_number: 8, service_description: 'Ajudante de Producao IV', sort_order: 608 },
      { item_number: 6, sub_item_number: 9, service_description: 'Carga e Dev Producao', sort_order: 609 },
      { item_number: 6, sub_item_number: 10, service_description: 'Efeitista', sort_order: 610 },
      { item_number: 6, sub_item_number: 11, service_description: 'Seguranca de Set', sort_order: 611 },
      { item_number: 6, sub_item_number: 12, service_description: 'Seguro', sort_order: 612 },
      { item_number: 6, sub_item_number: 13, service_description: 'Bombeiro / Socorrista', sort_order: 613 },
      { item_number: 6, sub_item_number: 14, service_description: 'Taxa Administrativa', sort_order: 614 },
      { item_number: 6, sub_item_number: 15, service_description: 'Previsao do Tempo', sort_order: 615 },
    ],
  },
  {
    item_number: 7,
    name: 'VEICULOS',
    items: [
      { item_number: 7, sub_item_number: 1, service_description: 'Pacote veiculos', sort_order: 701 },
      { item_number: 7, sub_item_number: 2, service_description: 'Transporte Robo', sort_order: 702 },
      { item_number: 7, sub_item_number: 3, service_description: 'Transporte Cliente', sort_order: 703 },
    ],
  },
  {
    item_number: 8,
    name: 'PASSAGEM / HOSPEDAGEM / ALIMENTACAO',
    items: [
      { item_number: 8, sub_item_number: 1, service_description: 'Alimentacao equipe', sort_order: 801 },
      { item_number: 8, sub_item_number: 2, service_description: 'Transporte catering', sort_order: 802 },
      { item_number: 8, sub_item_number: 3, service_description: 'Hotel', sort_order: 803 },
      { item_number: 8, sub_item_number: 4, service_description: 'Passagens', sort_order: 804 },
    ],
  },
  {
    item_number: 9,
    name: 'CAMERA / LUZ / MAQUINARIA / GERADOR / INFRA',
    items: [
      { item_number: 9, sub_item_number: 1, service_description: 'Camera / Acessorio / Lente', sort_order: 901 },
      { item_number: 9, sub_item_number: 2, service_description: 'Luz e Maquinaria', sort_order: 902 },
      { item_number: 9, sub_item_number: 3, service_description: 'Kambo', sort_order: 903 },
      { item_number: 9, sub_item_number: 4, service_description: 'Radios', sort_order: 904 },
      { item_number: 9, sub_item_number: 5, service_description: 'Consumiveis e Rat Pack', sort_order: 905 },
      { item_number: 9, sub_item_number: 6, service_description: 'Adaptadores e Dimmer', sort_order: 906 },
      { item_number: 9, sub_item_number: 7, service_description: 'Infraestrutura de Producao', sort_order: 907 },
      { item_number: 9, sub_item_number: 8, service_description: 'HD externo', sort_order: 908 },
      { item_number: 9, sub_item_number: 9, service_description: 'Gerador', sort_order: 909 },
      { item_number: 9, sub_item_number: 10, service_description: 'SteadyCam', sort_order: 910 },
      { item_number: 9, sub_item_number: 11, service_description: 'Drone', sort_order: 911 },
    ],
  },
  {
    item_number: 10,
    name: 'PRODUCAO DE CASTING',
    items: [
      { item_number: 10, sub_item_number: 1, service_description: 'Produtor de casting', sort_order: 1001 },
      { item_number: 10, sub_item_number: 2, service_description: 'Elenco variados', sort_order: 1002 },
      { item_number: 10, sub_item_number: 3, service_description: 'Elenco agencia + Reembolso', sort_order: 1003 },
      { item_number: 10, sub_item_number: 4, service_description: 'Reembolso elenco', sort_order: 1004 },
    ],
  },
  {
    item_number: 11,
    name: 'OBJETOS DE CENA',
    items: [
      { item_number: 11, sub_item_number: 1, service_description: 'Itens Cenograficos', sort_order: 1101 },
    ],
  },
  {
    item_number: 12,
    name: 'STILL / BASTIDORES',
    items: [
      { item_number: 12, sub_item_number: 1, service_description: 'Fotografo Still', sort_order: 1201 },
      { item_number: 12, sub_item_number: 2, service_description: 'Assistente de Fotografo', sort_order: 1202 },
    ],
  },
  {
    item_number: 13,
    name: 'POS PRODUCAO / TRILHA / CONDECINE',
    items: [
      { item_number: 13, sub_item_number: 1, service_description: 'Coordenador de Pos', sort_order: 1301 },
      { item_number: 13, sub_item_number: 2, service_description: 'Montador', sort_order: 1302 },
      { item_number: 13, sub_item_number: 3, service_description: 'Finalizador / VFX', sort_order: 1303 },
      { item_number: 13, sub_item_number: 4, service_description: 'Motion Design', sort_order: 1304 },
      { item_number: 13, sub_item_number: 5, service_description: 'Designer Grafico', sort_order: 1305 },
      { item_number: 13, sub_item_number: 6, service_description: 'Tecnico de Audio', sort_order: 1306 },
      { item_number: 13, sub_item_number: 7, service_description: 'Mixador', sort_order: 1307 },
      { item_number: 13, sub_item_number: 8, service_description: 'Compositor Musical / Trilha', sort_order: 1308 },
      { item_number: 13, sub_item_number: 9, service_description: 'Roteirista', sort_order: 1309 },
      { item_number: 13, sub_item_number: 10, service_description: 'Locutor', sort_order: 1310 },
      { item_number: 13, sub_item_number: 11, service_description: 'Condecine', sort_order: 1311 },
      { item_number: 13, sub_item_number: 12, service_description: 'Responsavel por Condecine', sort_order: 1312 },
    ],
  },
  {
    item_number: 14,
    name: 'ADMINISTRATIVO / FINANCEIRO',
    items: [
      { item_number: 14, sub_item_number: 1, service_description: 'Atendimento', sort_order: 1401 },
      { item_number: 14, sub_item_number: 2, service_description: 'Assistente de Atendimento', sort_order: 1402 },
      { item_number: 14, sub_item_number: 3, service_description: 'Seguro Equipe', sort_order: 1403 },
      { item_number: 14, sub_item_number: 4, service_description: 'Advogado', sort_order: 1404 },
    ],
  },
  {
    item_number: 15,
    name: 'MONSTRO',
    items: [
      { item_number: 15, sub_item_number: 1, service_description: 'Monstro para o Job', sort_order: 1501 },
    ],
  },
  {
    item_number: 99,
    name: 'MAO DE OBRA INTERNA',
    items: [
      { item_number: 99, sub_item_number: 1, service_description: 'Equipe Fixa (produtora, escritorio, etc)', sort_order: 9901 },
    ],
  },
];

// Gera array flat para insercao no banco
export function flattenTemplate(): TemplateItem[] {
  const result: TemplateItem[] = [];
  for (const cat of GG_TEMPLATE) {
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
