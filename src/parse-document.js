const MONTHS = [
  ['01', 'ENERO'], ['02', 'FEBRERO'], ['03', 'MARZO'], ['04', 'ABRIL'],
  ['05', 'MAYO'], ['06', 'JUNIO'], ['07', 'JULIO'], ['08', 'AGOSTO'],
  ['09', 'SEPTIEMBRE'], ['10', 'OCTUBRE'], ['11', 'NOVIEMBRE'], ['12', 'DICIEMBRE'],
];

const MONTH_ALIASES = [
  ['01', 'Enero', 'ENE'], ['02', 'Febrero', 'FEB'], ['03', 'Marzo', 'MAR'], ['04', 'Abril', 'ABR'],
  ['05', 'Mayo', 'MAY'], ['06', 'Junio', 'JUN'], ['07', 'Julio', 'JUL'], ['08', 'Agosto', 'AGO'],
  ['09', 'Septiembre', 'SEP'], ['10', 'Octubre', 'OCT'], ['11', 'Noviembre', 'NOV'], ['12', 'Diciembre', 'DIC'],
];

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const MONEY_PATTERN = /(?:\(\s*\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})\s*\)|(?:-\s*)?\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})|(?:-\s*)?\$?\s*\d+\.\d{2})/g;
const COLUMN_TOKEN_PATTERN = /(?:\(\s*[\d,]+\.\d{2}\s*\)|[\d,]+\.\d{2}|-)/g;
const PRODUCT_NAMES = ['ECOMM', 'MPOS', 'STEE', 'Tarjetas', 'Link Pago', 'CASHIN'];

export const parseMoney = (value) => {
  if (!value) return null;
  const negative = /^\s*-/.test(value) || /^\s*\(/.test(value);
  const number = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? (negative ? -number : number) : null;
};

const amountsIn = (value) => (String(value).match(MONEY_PATTERN) || [])
  .map(parseMoney)
  .filter((amount) => amount !== null);

const findLabeledAmount = (lines, labels) => {
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = normalize(lines[index]);
    const label = labels.find((candidate) => normalized.includes(candidate));
    if (!label) continue;
    const sameLine = amountsIn(lines[index]);
    if (sameLine.length) return sameLine.at(-1);
    for (let offset = 1; offset <= 2; offset += 1) {
      const nextLine = lines[index + offset];
      if (!nextLine) break;
      const nextAmounts = amountsIn(nextLine);
      if (nextAmounts.length) return nextAmounts[0];
    }
  }
  return null;
};

const extractClients = (lines, clientNames = {}) => {
  const found = new Map();
  for (const line of lines) {
    for (const [code, name] of Object.entries(clientNames)) {
      if (found.has(code) || !new RegExp(`(^|\\s)${code}(?=\\s|$)`).test(line)) continue;
      const normalizedLine = normalize(line);
      const normalizedName = normalize(name);
      const nameAnchor = normalizedName.split(' ').filter((part) => part.length > 3).slice(0, 2);
      if (nameAnchor.length && !nameAnchor.some((part) => normalizedLine.includes(part))) continue;
      const amounts = amountsIn(line);
      if (!amounts.length) continue;
      found.set(code, { code, name, amount: amounts.at(-1) });
    }
  }
  return [...found.values()].sort((a, b) => a.code.localeCompare(b.code));
};

const parseColumns = (line) => {
  const firstAmount = String(line).search(/(?:\(|\b)\d{1,3}(?:,\d{3})*\.\d{2}/);
  if (firstAmount < 0) return null;
  const tokens = String(line).slice(firstAmount).match(COLUMN_TOKEN_PATTERN) || [];
  if (tokens.length < 5) return null;
  return tokens.slice(0, 5).map((token) => token === '-' ? 0 : parseMoney(token));
};

const cleanMerchant = (value) => String(value || '')
  .replace(/[.…]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const statementMonth = (text) => {
  const normalized = normalize(text);
  for (const [code, name, short] of MONTH_ALIASES) {
    if (new RegExp(`(?:^|[^A-Z])(?:${normalize(name)}|${short})(?:[- /]|$)`).test(normalized)) return { code, name };
  }
  return null;
};

export function parseClientStatementText(text, { pageCount = 0 } = {}) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const distributorLine = lines.find((line) => normalize(line).startsWith('DISTRIBUIDOR:')) || '';
  const distributorMatch = distributorLine.match(/DISTRIBUIDOR:\s*(.+?)\s*\((\d{1,3})\)/i);
  const tableStart = lines.findIndex((line) => normalize(line).includes('PRODUCTO | SD | NOMBRE COMERCIAL'));
  if (!distributorMatch || tableStart < 0) return null;

  const client = { code: distributorMatch[2].padStart(3, '0'), name: distributorMatch[1].trim() };
  const period = statementMonth(text);
  const year = distributorLine.match(/\b(20\d{2})\b/)?.[1]
    || lines.find((line) => normalize(line).includes('CARATULA DE MOVIMIENTOS'))?.match(/\b(20\d{2})\b/)?.[1]
    || [...normalize(text).matchAll(/\b(20\d{2})\b/g)].at(-1)?.[1]
    || '';
  const totalPayable = findLabeledAmount(lines, ['TOTAL GENERAL: (COMISIONES MENOS DESCUENTOS)', 'COMISIONES DE PRODUCTOS', 'MONTO TOTAL A PAGAR']);
  const productMap = new Map();
  const operations = [];
  let currentProduct = 'ECOMM';
  const clientNumber = String(Number(client.code));

  for (const line of lines.slice(tableStart + 1)) {
    const normalizedLine = normalize(line);
    const productHeader = PRODUCT_NAMES.find((product) => normalizedLine === normalize(product) || normalizedLine === `${normalize(product)} -`);
    if (productHeader) {
      currentProduct = productHeader;
      continue;
    }

    const isOperation = line.startsWith(`${client.code}-->`);
    const isProductTotal = !isOperation && new RegExp(`^(?:${client.code}|${clientNumber})\\s+`).test(line);
    if (!isOperation && !isProductTotal) continue;
    const columns = parseColumns(line);
    if (!columns) continue;
    const [transactionAmount, commissionCharged, floorPercent, floorFixed, commissionDistributed] = columns;

    if (isProductTotal) {
      productMap.set(currentProduct, {
        product: currentProduct,
        transactionAmount,
        commissionCharged,
        floorPercent,
        floorFixed,
        commissionDistributed,
      });
      continue;
    }

    const firstAmount = line.search(/(?:\(|\b)\d{1,3}(?:,\d{3})*\.\d{2}/);
    const identity = cleanMerchant(line.slice(0, firstAmount).replace(`${client.code}-->`, ''));
    const parts = identity.split('->').map((part) => part.trim()).filter(Boolean);
    const merchantIdFirst = /^\d{4}$/.test(parts[0] || '');
    const merchantId = merchantIdFirst ? parts[0] : (parts.slice(1).join('->') || '');
    const merchant = merchantIdFirst ? parts.slice(1).join('->') : (parts[0] || 'Sin nombre');
    operations.push({
      month_code: period?.code || '',
      month: period?.name || '',
      product: currentProduct,
      client: client.code,
      merchant_id: merchantId,
      merchant,
      transaction_amount: transactionAmount,
      commission_charged: commissionCharged,
      floor_percent: floorPercent,
      floor_fixed: floorFixed,
      commission_distributed: commissionDistributed,
    });
  }

  const products = [...productMap.values()];
  const productReconciliation = products.map((product) => {
    const detail = operations.filter((row) => row.product === product.product).reduce((totals, row) => ({
      transactionAmount: totals.transactionAmount + row.transaction_amount,
      commissionDistributed: totals.commissionDistributed + row.commission_distributed,
    }), { transactionAmount: 0, commissionDistributed: 0 });
    return {
      product: product.product,
      saleDifference: detail.transactionAmount - product.transactionAmount,
      commissionDifference: detail.commissionDistributed - product.commissionDistributed,
    };
  });
  const transacted = products.reduce((total, product) => total + product.transactionAmount, 0);
  const productCommission = products.reduce((total, product) => total + product.commissionDistributed, 0);
  const negativeOperations = operations.filter((row) => row.commission_distributed < 0);
  const materialDifferences = productReconciliation.filter((row) => Math.abs(row.saleDifference) > 0.05 || Math.abs(row.commissionDifference) > 0.05);
  const totalDifference = totalPayable === null ? null : productCommission - totalPayable;
  const evidence = [Boolean(distributorMatch), Boolean(period), totalPayable !== null, products.length > 0, operations.length > 0];
  const score = evidence.filter(Boolean).length * 20;
  const warnings = [];
  if (!period) warnings.push('No se detectó el mes del estado de cuenta.');
  if (totalPayable === null) warnings.push('No se detectó el total a pagar.');
  if (!products.length) warnings.push('No se detectaron totales por producto.');
  if (!operations.length) warnings.push('No se detectaron operaciones por comercio.');
  if (materialDifferences.length) warnings.push(`${materialDifferences.length} productos no concilian entre resumen y operaciones.`);
  if (totalDifference !== null && Math.abs(totalDifference) > 0.05) warnings.push('El total por productos no coincide con el total a pagar.');

  return {
    kind: 'client_statement',
    pageCount,
    textCharacters: String(text || '').length,
    year,
    months: period ? [period] : [],
    selectedMonth: period?.code || '',
    client,
    clients: [{ code: client.code, name: client.name, amount: totalPayable }],
    summary: { totalPayable, transacted, discounts: 0, productCommission, totalDifference },
    products,
    operations,
    negativeSummary: {
      count: negativeOperations.length,
      impact: negativeOperations.reduce((total, row) => total + row.commission_distributed, 0),
    },
    productReconciliation,
    confidence: score >= 80 && !materialDifferences.length ? 'alta' : score >= 60 ? 'media' : 'baja',
    confidenceScore: score,
    warnings,
  };
}

export function parseHelixText(text, { clientNames = {}, pageCount = 0 } = {}) {
  const clientStatement = parseClientStatementText(text, { pageCount });
  if (clientStatement) return clientStatement;
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedText = normalize(text);
  const detectedMonths = MONTHS
    .filter(([, name]) => new RegExp(`(^|[^A-Z])${name}([^A-Z]|$)`).test(normalizedText))
    .map(([code, name]) => ({ code, name: name[0] + name.slice(1).toLowerCase() }));
  const years = [...normalizedText.matchAll(/\b(20\d{2})\b/g)].map((match) => match[1]);
  const clients = extractClients(lines, clientNames);
  const totalPayable = findLabeledAmount(lines, ['TOTAL A PAGAR', 'TOTAL PAGAR', 'TOTAL DISTRIBUIDO']);
  const transacted = findLabeledAmount(lines, ['MONTO TRANSACCIONADO', 'TOTAL TRANSACCIONADO', 'VENTA TOTAL']);
  const discounts = findLabeledAmount(lines, ['DESCUENTOS Y COMPLEMENTOS', 'DESCUENTOS APLICADOS', 'DESCUENTOS']);
  const isHelix = normalizedText.includes('HELIX') || normalizedText.includes('DISTRIBUIDOR 12');
  const evidence = [isHelix, detectedMonths.length > 0, totalPayable !== null, transacted !== null, clients.length > 0];
  const score = evidence.filter(Boolean).length * 20;
  const warnings = [];
  if (!isHelix) warnings.push('No se encontró el encabezado Helix.');
  if (!detectedMonths.length) warnings.push('No se detectó el mes del reporte.');
  if (detectedMonths.length > 1) warnings.push('El archivo contiene varios meses; revisa los totales antes de guardar.');
  if (totalPayable === null) warnings.push('No se detectó el total a pagar.');
  if (transacted === null) warnings.push('No se detectó el monto transaccionado.');
  if (!clients.length) warnings.push('No se detectaron filas de clientes con suficiente certeza.');

  return {
    kind: 'helix_report',
    pageCount,
    textCharacters: String(text || '').length,
    year: years.at(-1) || '',
    months: detectedMonths,
    summary: { totalPayable, transacted, discounts },
    clients,
    confidence: score >= 80 ? 'alta' : score >= 50 ? 'media' : 'baja',
    confidenceScore: score,
    warnings,
  };
}
