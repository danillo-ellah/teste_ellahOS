# ADR-012: Recharts como biblioteca de graficos

**Data:** 20/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 7 -- Dashboard e Relatorios com graficos interativos

---

## Contexto

O dashboard e os relatorios da Fase 7 precisam de graficos interativos:
- Area chart (faturamento mensal)
- Bar chart (jobs por status, performance por diretor)
- Donut/Pie chart (distribuicao por tipo de projeto, categoria financeira)
- Stacked bar chart (receita vs despesa mensal)

O frontend usa React 19, Next.js 16, TypeScript strict e Tailwind v4 com dark mode.

Opcoes avaliadas:
1. **Recharts** -- Componentes React nativos, baseado em SVG, popular (23k+ stars)
2. **Chart.js (react-chartjs-2)** -- Canvas-based, wrapper React, popular (6k+ stars)
3. **Tremor** -- Componentes de alto nivel para dashboards, baseado em Recharts internamente
4. **Nivo** -- React + D3, declarativo, ampla variedade de tipos
5. **Visx** -- Primitivas D3 de baixo nivel da Airbnb

---

## Decisao

Usar **Recharts** como biblioteca de graficos.

Instalacao: `npm install recharts`

Os graficos serao componentes React wrapper que encapsulam Recharts com os tokens do design system (cores do tema, dark mode, responsive).

---

## Consequencias

### Positivas
- **React nativo:** Componentes JSX declarativos, sem imperativo (alinhado com o projeto)
- **SVG:** Renderiza em SVG (sharp em qualquer resolucao, acessivel, inspecionavel)
- **Responsive:** ResponsiveContainer nativo (adapta ao container pai)
- **Dark mode:** Cores podem ser CSS vars ou props condicionais (useTheme)
- **TypeScript:** Tipos incluidos (@types/recharts nao e necessario, tipos builtin)
- **Tamanho:** ~150KB gzipped (aceitavel para dashboard)
- **Ecosistema:** Extenso, documentacao madura, muitos exemplos
- **Tooltips e Legends:** Nativos e customizaveis
- **Animacoes:** Suaves por padrao, desligaveis para performance

### Negativas
- Bundle size maior que Canvas-based (Chart.js ~60KB vs Recharts ~150KB)
- Performance pode degradar com > 10.000 data points em SVG (irrelevante para nossos graficos)
- Customizacao muito avancada (ex: annotations) requer acesso direto ao SVG
- Algumas inconsistencias de API entre versoes (mitigado: pinned version)

---

## Alternativas Consideradas

### A1: Chart.js (react-chartjs-2)
**Rejeitada.** Canvas-based tem melhor performance para datasets grandes, mas:
- Canvas nao e inspecionavel (debugging mais dificil)
- Dark mode requer destruir e recriar o canvas (nao e reativo)
- Wrapper React (react-chartjs-2) adiciona camada de abstraction com peculiaridades proprias
- Tipagem TypeScript menos natural que Recharts

### A2: Tremor
**Rejeitada.** Tremor e baseado em Recharts internamente e adiciona uma camada de UI pre-estilizada. Conflita com nosso design system custom (shadcn/ui + Tailwind). Teriamos que lutar contra os estilos padrao do Tremor ou aceitar visual inconsistente.

### A3: Nivo
**Considerada seriamente.** Nivo tem variedade impressionante de tipos de grafico e suporte a server-side rendering. Rejeitada porque:
- API mais complexa (muitas props obrigatorias)
- Documentacao menos intuitiva que Recharts
- Bundle size maior (~200KB para os modulos necessarios)
- Menor adocao no ecosistema React que Recharts

### A4: Visx (Airbnb)
**Rejeitada.** Primitivas de baixo nivel requerem muito codigo para graficos basicos. Ideal para graficos altamente customizados, mas over-engineering para bar charts e area charts simples. Curva de aprendizado desproporcional ao beneficio.

### A5: D3.js puro
**Rejeitada.** D3 e imperativo e nao se integra naturalmente com React (manipula DOM diretamente). Requer refs, useEffect e gerenciamento manual de lifecycle. Nao faz sentido em um projeto React.

---

## Implementacao

### Wrapper de tema

Criar componente `ChartContainer` que aplica cores do design system:

```typescript
// frontend/src/components/charts/ChartContainer.tsx
const CHART_COLORS = {
  light: {
    primary: 'hsl(347, 77%, 50%)',  // rose-600
    secondary: 'hsl(38, 92%, 50%)',  // amber-500
    grid: 'hsl(240, 5%, 90%)',       // zinc-200
    text: 'hsl(240, 6%, 25%)',       // zinc-700
  },
  dark: {
    primary: 'hsl(347, 77%, 70%)',  // rose-400
    secondary: 'hsl(38, 92%, 60%)', // amber-400
    grid: 'hsl(240, 4%, 30%)',      // zinc-700
    text: 'hsl(240, 5%, 65%)',      // zinc-400
  },
}
```

### Tipos de grafico necessarios

| Tipo | Componente Recharts | Uso |
|------|-------------------|-----|
| Area | `<AreaChart>` | Faturamento mensal (dashboard) |
| Bar | `<BarChart>` | Jobs por status, performance |
| Donut | `<PieChart>` com innerRadius | Distribuicao por tipo |
| Stacked Bar | `<BarChart>` stacked | Receita vs despesa |
| Horizontal Bar | `<BarChart>` layout="vertical" | Top 10 diretores |

---

## Referencias

- docs/architecture/fase-7-architecture.md (secao 5.3)
- docs/design/design-system.md (paleta de cores)
- https://recharts.org/en-US/
