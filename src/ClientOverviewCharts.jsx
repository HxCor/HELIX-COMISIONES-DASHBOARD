const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const precisePercent = new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 3 });

function ChartHeader({ eyebrow, title, note }) {
  return <div className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2><p>{note}</p></div></div>;
}

function RankedBars({ rows, field, periodLabel, onSelectClient }) {
  const isCommission = field === 'commission';
  const maximum = Math.max(1, ...rows.map((row) => Math.abs(row[field])));
  const ordered = [...rows].sort((a, b) => b[field] - a[field]);

  return <article className="panel client-chart-panel">
    <ChartHeader eyebrow={isCommission ? 'COMISIÓN POR CLIENTE' : 'VENTA POR CLIENTE'} title={isCommission ? 'Resultado de todos los clientes' : 'Venta procesada de todos los clientes'} note={`${periodLabel} · ${rows.length} clientes Helix 12`} />
    <div className="ranked-client-bars" role="list" aria-label={isCommission ? 'Comisión de todos los clientes' : 'Venta de todos los clientes'}>
      {ordered.map((row, index) => <button type="button" role="listitem" key={row.code} onClick={() => onSelectClient(row.code)} title={`Abrir ${row.code} · ${row.name}`}>
        <span className="chart-rank">{index + 1}</span>
        <span className="chart-client"><strong>{row.code} · {row.name}</strong><small>{isCommission ? `${row.margin === null ? 'Sin venta' : `${precisePercent.format(row.margin)} ganado`}` : `${precisePercent.format(row.saleShare)} de la venta`}</small></span>
        <span className={`chart-track ${row[field] < 0 ? 'loss' : ''}`}><i style={{ width: `${Math.max(1.5, Math.abs(row[field]) / maximum * 100)}%` }} /></span>
        <strong className={row[field] < 0 ? 'negative' : ''}>{currency.format(row[field])}</strong>
      </button>)}
    </div>
  </article>;
}

function MonthlyHeatmap({ rows, months, onSelectClient }) {
  const monthlyMaximum = Object.fromEntries(months.map((month) => [month.code, Math.max(1, ...rows.map((row) => Math.abs(Number(row.months?.[month.code]) || 0)))]));
  const ordered = [...rows].sort((a, b) => b.commission - a.commission);

  return <article className="panel full-panel monthly-client-chart">
    <ChartHeader eyebrow="COMPARATIVA MENSUAL" title="Comisión de todos los clientes por mes" note="Enero–julio 2026 · el tono muestra el peso dentro de cada mes; pica una fila para abrir su Ficha 360°." />
    <div className="table-scroll client-heatmap"><table><thead><tr><th>Cliente</th><th>Total</th>{months.map((month) => <th key={month.code}>{month.short}</th>)}</tr></thead><tbody>{ordered.map((row) => <tr key={row.code} onClick={() => onSelectClient(row.code)}><td><strong>{row.code} · {row.name}</strong></td><td className={row.commission < 0 ? 'negative' : ''}><strong>{currency.format(row.commission)}</strong></td>{months.map((month) => {
      const value = Number(row.months?.[month.code]) || 0;
      const strength = Math.abs(value) / monthlyMaximum[month.code];
      const backgroundColor = value < 0
        ? `rgba(201, 50, 50, ${0.1 + strength * 0.58})`
        : `rgba(47, 111, 237, ${0.05 + strength * 0.62})`;
      return <td key={month.code} className={value < 0 ? 'negative-cell' : ''} style={{ backgroundColor }} title={`${month.name}: ${currency.format(value)}`}>{currency.format(value)}</td>;
    })}</tr>)}</tbody></table></div>
  </article>;
}

export default function ClientOverviewCharts({ rows, months, officialCommission, periodLabel, onSelectClient }) {
  const detailCommission = rows.reduce((total, row) => total + row.commission, 0);
  const totalSale = rows.reduce((total, row) => total + row.sale, 0);
  const reconciliationDifference = officialCommission - detailCommission;

  return <section className="client-charts-layout">
    <section className="client-chart-kpis">
      <article><span>Venta graficada</span><strong>{currency.format(totalSale)}</strong><small>Suma de los {rows.length} clientes</small></article>
      <article><span>Comisión por cliente</span><strong>{currency.format(detailCommission)}</strong><small>Suma del detalle de clientes</small></article>
      <article className={Math.abs(reconciliationDifference) > 0.05 ? 'attention' : ''}><span>Total oficial de portada</span><strong>{currency.format(officialCommission)}</strong><small>Diferencia: {currency.format(reconciliationDifference)}</small></article>
    </section>
    {Math.abs(reconciliationDifference) > 0.05 && <div className="chart-reconciliation"><strong>Control visible:</strong> el detalle por cliente difiere de la portada en {currency.format(reconciliationDifference)}. La gráfica conserva ambas cifras y no modifica ninguna.</div>}
    <section className="client-chart-grid">
      <RankedBars rows={rows} field="commission" periodLabel={periodLabel} onSelectClient={onSelectClient} />
      <RankedBars rows={rows} field="sale" periodLabel={periodLabel} onSelectClient={onSelectClient} />
    </section>
    <MonthlyHeatmap rows={rows} months={months} onSelectClient={onSelectClient} />
  </section>;
}
