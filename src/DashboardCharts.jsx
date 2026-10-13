const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });

function ChartTitle({ eyebrow, title, note }) {
  return <div className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2>{note && <p>{note}</p>}</div></div>;
}

export default function DashboardCharts({
  clientCode,
  clientLabel,
  currentMonthLabel,
  monthlyTrend,
  onMonthSelect,
  selectedMonth,
  selectedSplit,
}) {
  const maxMagnitude = Math.max(1, ...monthlyTrend.map((entry) => Math.abs(entry.value)));
  let splitCursor = 0;
  const splitGradient = selectedSplit.values.map((entry) => {
    const start = splitCursor;
    splitCursor += Math.max(0, entry.share * 100);
    return `${entry.color} ${start}% ${splitCursor}%`;
  }).join(', ');

  return <section className="dashboard-grid">
    <article className="panel trend-panel">
      <ChartTitle eyebrow="EVOLUCIÓN MENSUAL" title={clientCode === 'all' ? 'Total a pagar por mes' : `Resultado mensual · ${clientLabel}`} note="Selecciona una barra para filtrar ese mes." />
      <div className="light-bar-chart" role="group" aria-label="Gráfica de evolución mensual">
        {monthlyTrend.map((entry) => <button key={entry.code} type="button" className={`${entry.value < 0 ? 'loss' : ''} ${entry.code === selectedMonth ? 'active' : ''}`} onClick={() => onMonthSelect(entry.code)} aria-label={`${entry.name}: ${currency.format(entry.value)}`} title={currency.format(entry.value)}>
          <small>{compact.format(entry.value)}</small>
          <span className="bar-track"><i style={{ height: `${Math.max(3, Math.abs(entry.value) / maxMagnitude * 100)}%` }}></i></span>
          <strong>{entry.short}</strong>
        </button>)}
      </div>
    </article>

    <article className="panel split-panel">
      <ChartTitle eyebrow="REPARTO DE VENTA" title="Espiral / Helix / Clientes" note={`${currentMonthLabel} · suma 100%`} />
      <div className="split-content">
        <div className="donut-wrap">
          <div className="light-donut" style={{ background: `conic-gradient(${splitGradient})` }} role="img" aria-label="Distribución porcentual de venta"><div><strong>100%</strong><span>reparto</span></div></div>
        </div>
        <div className="split-legend">{selectedSplit.values.map((entry) => <div key={entry.name}><span style={{ background: entry.color }}></span><p><small>{entry.name}</small><strong>{percent.format(entry.share)}</strong><em>{currency.format(entry.value)}</em></p></div>)}</div>
      </div>
      <footer>Comisión cobrada: <strong>{currency.format(selectedSplit.charged)}</strong> · venta: <strong>{currency.format(selectedSplit.sold)}</strong></footer>
    </article>
  </section>;
}
