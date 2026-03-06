// ========================================================
// numberToWordsBR — Conversor de numero para extenso em PT-BR
// Suporta valores ate 999.999.999,99 (centavos inclusos)
// Exemplos:
//   5000     → "cinco mil reais"
//   1500     → "mil e quinhentos reais"
//   2350.40  → "dois mil e trezentos e cinquenta reais e quarenta centavos"
//   0        → "zero reais"
// ========================================================

const UNIDADES = [
  '', 'um', 'dois', 'tres', 'quatro', 'cinco',
  'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze',
  'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
  'sessenta', 'setenta', 'oitenta', 'noventa',
];

const CENTENAS = [
  '', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

// Converte numero inteiro de 0 a 999 em texto
function centenasToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  const parteCentena = centena > 0
    ? (centena === 1 && resto > 0 ? 'cento' : CENTENAS[centena])
    : '';

  let parteResto = '';
  if (resto > 0) {
    if (resto < 20) {
      parteResto = UNIDADES[resto];
    } else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      parteResto = unidade > 0
        ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`
        : DEZENAS[dezena];
    }
  }

  if (parteCentena && parteResto) return `${parteCentena} e ${parteResto}`;
  return parteCentena || parteResto;
}

// Converte inteiro >= 0 em texto sem unidade monetaria
export function intToWords(n: number): string {
  if (n === 0) return 'zero';

  const milhoes = Math.floor(n / 1_000_000);
  const resto1 = n % 1_000_000;
  const milhares = Math.floor(resto1 / 1000);
  const unidades = resto1 % 1000;

  const partes: string[] = [];

  // Milhoes
  if (milhoes > 0) {
    const textoMilhoes = centenasToWords(milhoes);
    partes.push(`${textoMilhoes} ${milhoes === 1 ? 'milhao' : 'milhoes'}`);
  }

  // Milhares
  if (milhares > 0) {
    if (milhares === 1) {
      partes.push('mil');
    } else {
      partes.push(`${centenasToWords(milhares)} mil`);
    }
  }

  // Centenas/dezenas/unidades
  if (unidades > 0) {
    partes.push(centenasToWords(unidades));
  }

  // Regra de "e": inserir "e" antes da ultima parte quando os anteriores
  // sao multiplos redondos (ex: "mil e duzentos", mas "dois mil trezentos")
  if (partes.length >= 2) {
    const ultimo = partes.pop()!;
    // "e" somente quando a parte final nao passa de 99
    // ou quando o grupo anterior e exatamente multiplo redondo
    const penultimo = partes[partes.length - 1];
    const precisaE =
      unidades > 0 && unidades < 100 ||
      (unidades === 0 && milhares > 0 && milhares < 100 && milhoes > 0);
    partes.push(precisaE || (!penultimo.endsWith('mil') && !penultimo.includes('milhao') && !penultimo.includes('milhoes'))
      ? `e ${ultimo}`
      : ultimo);
  }

  return partes.join(' ');
}

/**
 * Converte um valor monetario numerico em texto por extenso em PT-BR.
 *
 * @param value - Valor em reais (pode ter centavos)
 * @returns Texto por extenso, ex: "dois mil e trezentos e cinquenta reais e quarenta centavos"
 */
export function numberToWordsBR(value: number): string {
  if (!isFinite(value) || isNaN(value)) return 'valor invalido';
  if (value < 0) return `menos ${numberToWordsBR(-value)}`;

  // Separar reais e centavos (arredondar para evitar floats como 2350.4000000001)
  const totalCentavos = Math.round(value * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  if (reais === 0 && centavos === 0) return 'zero reais';

  const partes: string[] = [];

  if (reais > 0) {
    const textoReais = intToWords(reais);
    partes.push(`${textoReais} ${reais === 1 ? 'real' : 'reais'}`);
  }

  if (centavos > 0) {
    const textoCentavos = intToWords(centavos);
    partes.push(`${textoCentavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }

  return partes.join(' e ');
}

/**
 * Formata um valor monetario como string brasileira: "R$ 1.500,00"
 */
export function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata valor monetario como string sem simbolo: "1.500,00"
 */
export function formatValueBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
