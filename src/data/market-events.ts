export const MARKET_EVENTS = [
  {
    name: 'COVID-19 Crash',
    start_date: '2020-02-20',
    end_date: '2020-03-23',
    description: 'Venta masiva global por el inicio de la pandemia.'
  },
  {
    name: 'Recovery Rally 2020',
    start_date: '2020-03-24',
    end_date: '2020-08-31',
    description: 'Recuperación impulsada por estímulos monetarios y fiscales.'
  },
  {
    name: 'Inflation Shock 2022',
    start_date: '2022-01-03',
    end_date: '2022-10-14',
    description: 'Caída de activos de riesgo por inflación persistente y subidas de tipos.'
  },
  {
    name: 'SVB Banking Stress',
    start_date: '2023-03-08',
    end_date: '2023-03-31',
    description: 'Tensión bancaria en EE.UU. tras la quiebra de SVB.'
  },
  {
    name: 'AI Momentum 2023',
    start_date: '2023-05-15',
    end_date: '2023-12-29',
    description: 'Rally tecnológico impulsado por expectativas de IA.'
  }
];

export const filterMarketEvents = (
  startDate: string | null | undefined,
  endDate: string | null | undefined
): typeof MARKET_EVENTS => {
  if (!startDate || !endDate) return MARKET_EVENTS;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('Invalid date range provided to filterMarketEvents');
    return [];
  }

  return MARKET_EVENTS.filter(event => {
    const eventStart = new Date(event.start_date);
    const eventEnd = new Date(event.end_date);
    return eventEnd >= start && eventStart <= end;
  });
};