type ProjectionPoint = {
  month: number;
  expected: number;
  optimistic: number;
  pessimistic: number;
};

declare global {
  interface Window {
    Chart?: any;
  }
}

export class SimulatorChart {
  private chart: any;

  init(canvasId: string): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas || !window.Chart) return;

    if (this.chart && this.chart.canvas === canvas) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: '#cbd5e1'
            }
          },
          tooltip: {
            callbacks: {
              label(context: any) {
                const value = Number(context.parsed.y || 0);
                const label = context.dataset?.label || 'Series';
                return `${label}: ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
            grid: { color: 'rgba(148,163,184,0.12)' }
          },
          y: {
            ticks: {
              color: '#94a3b8',
              callback(value: any) {
                return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
              }
            },
            grid: { color: 'rgba(148,163,184,0.12)' }
          }
        }
      }
    });
  }

  update(monthlyProjection: ProjectionPoint[], totalInvested: number, horizonMonths: number): void {
    if (!this.chart) return;

    const labels = monthlyProjection.map(point => {
      if (point.month === 1 || point.month % 12 === 0 || point.month === horizonMonths) {
        return `Year ${Math.ceil(point.month / 12)}`;
      }
      return '';
    });

    this.chart.data.labels = labels;
    this.chart.data.datasets = [
      {
        label: 'Pessimistic',
        data: monthlyProjection.map(point => point.pessimistic),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0.2
      },
      {
        label: 'Optimistic',
        data: monthlyProjection.map(point => point.optimistic),
        borderColor: '#22c55e',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(34,197,94,0.15)',
        tension: 0.2
      },
      {
        label: 'Expected',
        data: monthlyProjection.map(point => point.expected),
        borderColor: '#3b82f6',
        borderDash: [],
        pointRadius: 0,
        fill: false,
        tension: 0.2
      },
      {
        label: 'Total invested',
        data: monthlyProjection.map(() => totalInvested),
        borderColor: '#9ca3af',
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    this.chart.update('none');
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
