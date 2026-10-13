import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  ChartBar,
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  FilePdf,
  FileText,
  Funnel,
  MagnifyingGlass,
  LockSimple,
  Money,
  NotePencil,
  PencilSimple,
  Plus,
  Printer,
  ShieldPlus,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import DashboardCharts from './DashboardCharts.jsx';
import ClientOverviewCharts from './ClientOverviewCharts.jsx';

const MONTHS = [
  { code: '01', short: 'Ene', name: 'Enero' },
  { code: '02', short: 'Feb', name: 'Febrero' },
  { code: '03', short: 'Mar', name: 'Marzo' },
  { code: '04', short: 'Abr', name: 'Abril' },
  { code: '05', short: 'May', name: 'Mayo' },
  { code: '06', short: 'Jun', name: 'Junio' },
  { code: '07', short: 'Jul', name: 'Julio' },
];

const EMPTY_HELIX = { reports: [] };
const API_ORIGIN = String(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
const ASSET_ORIGIN = String(import.meta.env.VITE_ASSET_ORIGIN || '').replace(/\/$/, '');
const SESSION_TOKEN_KEY = 'helix_session_token';
const assetPath = (path) => `${ASSET_ORIGIN || import.meta.env.BASE_URL}${ASSET_ORIGIN ? '/' : ''}${String(path).replace(/^\//, '')}`;
const apiFetch = (path, init = {}) => {
  const headers = new Headers(init.headers || {});
  const token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${API_ORIGIN}${path}`, { ...init, headers, credentials: API_ORIGIN ? 'omit' : 'same-origin' });
};

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });
const precisePercent = new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 3 });
const sum = (rows, field) => rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
const monthName = (code) => MONTHS.find((item) => item.code === code)?.name || code;
const today = () => new Date().toISOString().slice(0, 10);
const blankPayment = (month = '07', client = '001') => ({
  clientCode: client,
  periodCode: month,
  paidAt: today(),
  amount: '',
  reference: '',
  notes: '',
});
const formatBytes = (bytes) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const readApiJson = async (response, fallbackMessage) => {
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(fallbackMessage);
  try {
    return await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }
};

function KpiCard({ label, value, note, tone = 'default', icon: Icon }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-label"><span>{label}</span>{Icon && <Icon size={17} weight="bold" />}</div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function HelixMark({ large = false }) {
  return <span className={`helix-symbol${large ? ' large' : ''}`} role="img" aria-label="Helix"><img src={assetPath('brand/helix-original.jpeg')} alt="" /></span>;
}

function EspiralMark() {
  return <span className="espiral-symbol" role="img" aria-label="Espiral App" title="Espiral App"><img src={assetPath('brand/espiralapp-original.png')} alt="" /></span>;
}

function SectionTitle({ eyebrow, title, note, action }) {
  return (
    <div className="section-heading">
      <div><span>{eyebrow}</span><h2>{title}</h2>{note && <p>{note}</p>}</div>
      {action}
    </div>
  );
}

function EmptyState() {
  return <div className="empty-state">No hay datos con los filtros seleccionados.</div>;
}

function ClientTrend({ rows, selectedMonth, onMonthSelect }) {
  const peak = Math.max(...rows.map((row) => Math.abs(row.commission)), 1);
  return <div className="client-trend" aria-label="Comisión mensual del cliente">{rows.map((row) => <button type="button" key={row.code} className={`${selectedMonth === row.code ? 'active' : ''} ${row.commission < 0 ? 'loss' : ''}`} onClick={() => onMonthSelect(row.code)} title={`${row.month}: ${currency.format(row.commission)}`}><span>{currency.format(row.commission)}</span><div><i style={{ height: `${Math.max(5, Math.abs(row.commission) / peak * 100)}%` }} /></div><strong>{row.short}</strong></button>)}</div>;
}

function DocumentReview({ draft, confirmed, onConfirmed, onChange, onCancel, onSave, saving }) {
  const { extraction, file } = draft;
  return <article className="panel document-review">
    <SectionTitle eyebrow="EXTRACCIÓN LISTA PARA REVISAR" title={file.name} note={`${formatBytes(file.size)} · ${extraction.pageCount} páginas · confianza ${extraction.confidence}`} action={<button className="icon-button" onClick={onCancel} aria-label="Cancelar extracción"><X size={20} /></button>} />
    <div className={`confidence-strip ${extraction.confidence}`}>
      <FileText size={22} weight="fill" />
      <div><strong>Lectura {extraction.confidence}</strong><span>{extraction.confidenceScore}% de campos principales detectados. Revisa antes de guardar.</span></div>
    </div>
    {extraction.warnings.length > 0 && <div className="extraction-warnings">{extraction.warnings.map((warning) => <span key={warning}><WarningCircle size={16} weight="fill" /> {warning}</span>)}</div>}
    <div className="extraction-form-grid">
      <label>Mes del reporte<select value={extraction.selectedMonth} onChange={(event) => onChange('selectedMonth', event.target.value)}><option value="">Varios / revisar</option>{MONTHS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
      <label>Año<input type="number" min="2020" max="2100" value={extraction.year} onChange={(event) => onChange('year', event.target.value)} placeholder="2026" /></label>
      <label>Total a pagar<input type="number" step="0.01" value={extraction.summary.totalPayable ?? ''} onChange={(event) => onChange('totalPayable', event.target.value)} placeholder="No detectado" /></label>
      <label>Monto transaccionado<input type="number" step="0.01" value={extraction.summary.transacted ?? ''} onChange={(event) => onChange('transacted', event.target.value)} placeholder="No detectado" /></label>
      <label>Descuentos<input type="number" step="0.01" value={extraction.summary.discounts ?? ''} onChange={(event) => onChange('discounts', event.target.value)} placeholder="No detectado" /></label>
    </div>
    {extraction.kind === 'client_statement' ? <div className="extracted-clients statement-review">
      <div className="statement-client"><span className="sd-badge">{extraction.client.code}</span><div><span>PERFIL DETECTADO</span><strong>{extraction.client.name}</strong><small>{extraction.operations.length} operaciones · {extraction.negativeSummary.count} negativas por {currency.format(extraction.negativeSummary.impact)}</small></div></div>
      <div className="subsection-title"><div><span>RESUMEN POR PRODUCTO</span><strong>{extraction.products.length}</strong></div><small>Conciliado contra los renglones del PDF.</small></div>
      <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Venta</th><th>Comisión cobrada</th><th>Piso %</th><th>Piso fijo</th><th>Comisión cliente</th><th>% ganado</th></tr></thead><tbody>{extraction.products.map((row) => <tr key={row.product}><td><strong>{row.product}</strong></td><td>{currency.format(row.transactionAmount)}</td><td>{currency.format(row.commissionCharged)}</td><td>{currency.format(row.floorPercent)}</td><td>{currency.format(row.floorFixed)}</td><td className={row.commissionDistributed < 0 ? 'negative' : ''}><strong>{currency.format(row.commissionDistributed)}</strong></td><td>{row.transactionAmount ? precisePercent.format(row.commissionDistributed / row.transactionAmount) : '—'}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency.format(extraction.summary.transacted)}</td><td>{currency.format(sum(extraction.products, 'commissionCharged'))}</td><td>{currency.format(sum(extraction.products, 'floorPercent'))}</td><td>{currency.format(sum(extraction.products, 'floorFixed'))}</td><td>{currency.format(extraction.summary.productCommission)}</td><td>{extraction.summary.transacted ? precisePercent.format(extraction.summary.totalPayable / extraction.summary.transacted) : '—'}</td></tr></tfoot></table></div>
    </div> : <div className="extracted-clients">
      <div className="subsection-title"><div><span>CLIENTES DETECTADOS</span><strong>{extraction.clients.length}</strong></div><small>Se muestran únicamente filas reconocidas con suficiente certeza.</small></div>
      {extraction.clients.length ? <div className="table-scroll"><table><thead><tr><th>SD</th><th>Cliente</th><th>Importe detectado</th></tr></thead><tbody>{extraction.clients.slice(0, 25).map((row) => <tr key={row.code}><td><span className="sd-badge">{row.code}</span></td><td><strong>{row.name}</strong></td><td>{currency.format(row.amount)}</td></tr>)}</tbody></table>{extraction.clients.length > 25 && <p className="table-note">Se muestran 25 de {extraction.clients.length} clientes detectados.</p>}</div> : <div className="empty-state small-empty">No se detectaron filas de clientes.</div>}
    </div>}
    <label className="review-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirmed(event.target.checked)} /><span><strong>Ya revisé las cifras extraídas.</strong> Guardar el documento no modifica automáticamente los cálculos actuales.</span></label>
    <div className="form-actions"><button className="button ghost" onClick={onCancel}>Cancelar</button><button className="button primary" onClick={onSave} disabled={!confirmed || saving}>{saving ? 'Guardando…' : 'Guardar documento y extracción'}</button></div>
  </article>;
}

export function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [negativeDetails, setNegativeDetails] = useState(null);
  const [negativesLoading, setNegativesLoading] = useState(false);
  const [negativesError, setNegativesError] = useState('');
  const [negativeLimit, setNegativeLimit] = useState(50);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailsCache, setProductDetailsCache] = useState({});
  const [productDetailsLoading, setProductDetailsLoading] = useState(false);
  const [productDetailsError, setProductDetailsError] = useState('');
  const [productDetailsLimit, setProductDetailsLimit] = useState(50);
  const [clientProfilesCache, setClientProfilesCache] = useState({});
  const [clientProfileLoading, setClientProfileLoading] = useState(false);
  const [clientProfileError, setClientProfileError] = useState('');
  const [clientProfileOperationsLimit, setClientProfileOperationsLimit] = useState(50);
  const [month, setMonth] = useState('all');
  const [client, setClient] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('summary');
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState(blankPayment());
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [documentDraft, setDocumentDraft] = useState(null);
  const [documentExtracting, setDocumentExtracting] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentConfirmed, setDocumentConfirmed] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userError, setUserError] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', clientCode: '' });
  const [createdCredential, setCreatedCredential] = useState(null);
  const [reconciliations, setReconciliations] = useState([]);
  const [reconciliationsLoading, setReconciliationsLoading] = useState(false);
  const [reconciliationsLoaded, setReconciliationsLoaded] = useState(false);
  const [reconciliationError, setReconciliationError] = useState('');
  const [reconciliationFilter, setReconciliationFilter] = useState('all');
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [reconciliationForm, setReconciliationForm] = useState({ status: 'pending', notes: '' });
  const [reconciliationSaving, setReconciliationSaving] = useState(false);

  const helix = dashboardData?.helix || EMPTY_HELIX;
  const clientSummary = dashboardData?.clientSummary || [];
  const clientProfileCatalog = dashboardData?.clientProfileCatalog || [];
  const revenueSplit = dashboardData?.revenueSplit || [];
  const negativeSummary = dashboardData?.negativeSummary || { overall: { count: 0, impact: 0 }, byMonth: {}, byClient: {}, byMonthClient: {} };
  const clientNames = useMemo(() => {
    if (session?.role === 'admin') return Object.fromEntries([...clientSummary, ...clientProfileCatalog].map((row) => [row.code, row.name]));
    if (session?.clientCode) return { [session.clientCode]: session.fullName || `Cliente ${session.clientCode}` };
    return {};
  }, [clientProfileCatalog, clientSummary, session]);
  const clientName = (code) => clientNames[code] || `Cliente ${code}`;

  const loadPayments = async () => {
    setPaymentsLoading(true);
    setPaymentError('');
    try {
      const response = await apiFetch('/api/payments', { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El servicio de pagos no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los pagos.');
      setPayments(payload.payments || []);
      setPaymentsLoaded(true);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudieron cargar los pagos.');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    setDocumentError('');
    try {
      const response = await apiFetch('/api/documents', { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El servicio de documentos no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los documentos.');
      setDocuments(payload.documents || []);
      setDocumentsLoaded(true);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'No se pudieron cargar los documentos.');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadNegativeDetails = async () => {
    if (negativeDetails || negativesLoading) return;
    setNegativesLoading(true);
    setNegativesError('');
    try {
      const response = await apiFetch('/api/negative-details', { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El detalle de negativos no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los movimientos negativos.');
      setNegativeDetails(payload.details || []);
    } catch (error) {
      setNegativesError(error instanceof Error ? error.message : 'No se pudieron cargar los movimientos negativos.');
    } finally {
      setNegativesLoading(false);
    }
  };

  const loadClientProfile = async (code) => {
    if (!code || clientProfilesCache[code] || clientProfileLoading) return;
    setClientProfileLoading(true);
    setClientProfileError('');
    try {
      const response = await apiFetch(`/api/client-profile?client=${encodeURIComponent(code)}`, { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'La ficha del cliente no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha del cliente.');
      setClientProfilesCache((current) => ({ ...current, [code]: payload.profile }));
    } catch (error) {
      setClientProfileError(error instanceof Error ? error.message : 'No se pudo cargar la ficha del cliente.');
    } finally {
      setClientProfileLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUserError('');
    try {
      const response = await apiFetch('/api/users', { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El servicio de usuarios no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los usuarios.');
      setUsers(payload.users || []);
      setUsersLoaded(true);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadReconciliations = async () => {
    setReconciliationsLoading(true);
    setReconciliationError('');
    try {
      const response = await apiFetch('/api/reconciliations', { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El centro de conciliación no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las conciliaciones.');
      setReconciliations(payload.issues || []);
      setReconciliationsLoaded(true);
    } catch (error) {
      setReconciliationError(error instanceof Error ? error.message : 'No se pudieron cargar las conciliaciones.');
    } finally {
      setReconciliationsLoading(false);
    }
  };

  useEffect(() => {
    const start = async () => {
      setSessionLoading(true);
      try {
        const response = await apiFetch('/api/bootstrap', { headers: { accept: 'application/json' } });
        const payload = await readApiJson(response, 'No se pudo conectar con el dashboard. Intenta recargar la página.');
        if (!response.ok) {
          setSessionError({ message: payload.error || 'No se pudo validar tu acceso.', code: payload.code, email: payload.email });
          return;
        }
        setSession(payload.user);
        if (payload.user.mustChangePassword) return;
        if (payload.user.role === 'admin') {
          if (!payload.dashboard) throw new Error('No se recibió la información del dashboard.');
          setDashboardData(payload.dashboard);
          setTab('summary');
        } else {
          if (payload.user.clientCode) setClient(payload.user.clientCode);
          setTab('portal');
          void loadDocuments();
          if (payload.user.clientCode) void loadClientProfile(payload.user.clientCode);
        }
      } catch (error) {
        setSessionError({ message: error instanceof Error ? error.message : 'No se pudo validar tu acceso.' });
      } finally {
        setSessionLoading(false);
      }
    };
    start();
  }, []);

  const login = async (event) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al iniciar sesión.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo iniciar sesión.');
      if (payload.sessionToken) window.sessionStorage.setItem(SESSION_TOKEN_KEY, payload.sessionToken);
      window.location.reload();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoginBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setLoginError('');
    setResetMessage('');
    if (!loginForm.email.trim()) {
      setLoginError('Escribe primero tu correo.');
      return;
    }
    setResetBusy(true);
    try {
      const response = await apiFetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: loginForm.email }),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la solicitud.');
      setResetMessage(payload.message || 'Solicitud registrada.');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo registrar la solicitud.');
    } finally {
      setResetBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al cambiar la contraseña.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo cambiar la contraseña.');
      window.location.reload();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const logout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST', headers: { accept: 'application/json' } }); } finally {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      window.location.reload();
    }
  };

  const chooseDocument = async (file) => {
    if (!file) return;
    setDocumentError('');
    setDocumentDraft(null);
    setDocumentConfirmed(false);
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setDocumentError('Selecciona un reporte en formato PDF.');
      return;
    }
    if (!file.size || file.size > 20 * 1024 * 1024) {
      setDocumentError('El PDF debe pesar menos de 20 MB.');
      return;
    }
    setDocumentExtracting(true);
    try {
      const { extractHelixPdf } = await import('./document-extractor.js');
      const extraction = await extractHelixPdf(file, clientNames);
      setDocumentDraft({
        file,
        extraction: {
          ...extraction,
          selectedMonth: extraction.months.length === 1 ? extraction.months[0].code : '',
        },
      });
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'No se pudo extraer la información del PDF.');
    } finally {
      setDocumentExtracting(false);
    }
  };

  const updateExtraction = (path, value) => {
    setDocumentDraft((current) => {
      if (!current) return current;
      if (path === 'selectedMonth' || path === 'year') {
        return { ...current, extraction: { ...current.extraction, [path]: value } };
      }
      return {
        ...current,
        extraction: {
          ...current.extraction,
          summary: { ...current.extraction.summary, [path]: value === '' ? null : Number(value) },
        },
      };
    });
    setDocumentConfirmed(false);
  };

  const saveDocument = async () => {
    if (!documentDraft || !documentConfirmed) return;
    setDocumentSaving(true);
    setDocumentError('');
    try {
      const form = new FormData();
      form.append('file', documentDraft.file);
      form.append('extraction', JSON.stringify(documentDraft.extraction));
      const response = await apiFetch('/api/documents', { method: 'POST', body: form, headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al guardar el documento.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el documento.');
      setDocuments((current) => [payload.document, ...current]);
      if (payload.document?.extracted?.kind === 'client_statement') setClientProfileError('');
      setDocumentDraft(null);
      setDocumentConfirmed(false);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'No se pudo guardar el documento.');
    } finally {
      setDocumentSaving(false);
    }
  };

  const deleteDocument = async (document) => {
    if (!window.confirm(`¿Eliminar ${document.fileName}? Esta acción también elimina el PDF guardado.`)) return;
    setDocumentError('');
    try {
      const response = await apiFetch(`/api/documents/${encodeURIComponent(document.id)}`, { method: 'DELETE', headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al eliminar el documento.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el documento.');
      setDocuments((current) => current.filter((row) => row.id !== document.id));
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'No se pudo eliminar el documento.');
    }
  };

  const downloadDocument = async (document) => {
    setDocumentError('');
    try {
      const response = await apiFetch(`/api/documents/${encodeURIComponent(document.id)}/download`, { headers: { accept: 'application/pdf' } });
      if (!response.ok) {
        const payload = await readApiJson(response, 'No se pudo descargar el documento.');
        throw new Error(payload.error || 'No se pudo descargar el documento.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName || 'documento.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'No se pudo descargar el documento.');
    }
  };

  const reports = useMemo(() => month === 'all' ? helix.reports : helix.reports.filter((report) => report.month_code === month), [helix, month]);
  const clientRows = useMemo(() => reports.flatMap((report) => report.client_product), [reports]);
  const filteredClientRows = useMemo(() => client === 'all' ? clientRows : clientRows.filter((row) => row.client === client), [clientRows, client]);

  const clientOptions = useMemo(() => {
    const codes = [...new Set([...helix.reports.flatMap((report) => report.client_product.map((row) => row.client)), ...clientProfileCatalog.map((row) => row.code)])];
    return codes.sort((a, b) => clientName(a).localeCompare(clientName(b), 'es'));
  }, [clientNames, clientProfileCatalog, helix]);

  const monthlyTrend = useMemo(() => MONTHS.map((entry) => {
    const report = helix.reports.find((item) => item.month_code === entry.code);
    const value = client === 'all'
      ? (report?.summary?.total_payable || 0)
      : (clientSummary.find((row) => row.code === client)?.months?.[entry.code] || 0);
    return { ...entry, value };
  }), [client, clientSummary, helix]);

  const productRows = useMemo(() => {
    const map = new Map();
    const rows = client === 'all'
      ? reports.flatMap((report) => report.cover_product_totals.map((coverRow) => ({
          ...coverRow,
          transaction_amount: report.product_totals.find((productRow) => productRow.product === coverRow.product)?.transaction_amount || 0,
        })))
      : filteredClientRows;
    rows.forEach((row) => {
      const current = map.get(row.product) || { product: row.product, transacted: 0, commission: 0 };
      current.transacted += row.transaction_amount || 0;
      current.commission += row.commission_distributed || 0;
      map.set(row.product, current);
    });
    return [...map.values()].sort((a, b) => b.commission - a.commission);
  }, [client, filteredClientRows, reports]);

  const clientChartRows = useMemo(() => {
    const detailMap = new Map();
    clientRows.forEach((row) => {
      const current = detailMap.get(row.client) || { transacted: 0, negativeProducts: 0 };
      current.transacted += row.transaction_amount || 0;
      if ((row.commission_distributed || 0) < 0) current.negativeProducts += 1;
      detailMap.set(row.client, current);
    });
    const rows = clientSummary.map((row) => ({
        code: row.code,
        name: clientName(row.code),
        value: month === 'all' ? row.total : (row.months[month] || 0),
        commission: month === 'all' ? row.total : (row.months[month] || 0),
        sale: detailMap.get(row.code)?.transacted || 0,
        transacted: detailMap.get(row.code)?.transacted || 0,
        negativeProducts: detailMap.get(row.code)?.negativeProducts || 0,
        months: row.months,
      }))
      .filter((row) => Math.abs(row.commission) > 0.004 || Math.abs(row.sale) > 0.004);
    const totalSale = sum(rows, 'sale');
    return rows.map((row) => ({
      ...row,
      margin: row.sale ? row.commission / row.sale : null,
      saleShare: totalSale ? row.sale / totalSale : 0,
    }));
  }, [clientRows, month, clientSummary, clientNames]);

  const clientsTable = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return clientChartRows
      .filter((row) => !query || row.code.includes(query) || clientName(row.code).toLocaleLowerCase('es').includes(query))
      .sort((a, b) => b.value - a.value);
  }, [clientChartRows, search]);

  const profitability = useMemo(() => {
    const baseRows = clientsTable
      .filter((row) => client === 'all' || row.code === client)
      .filter((row) => Math.abs(row.value) > 0.004 || Math.abs(row.transacted) > 0.004);
    const commission = sum(baseRows, 'value');
    const transacted = sum(baseRows, 'transacted');
    const rows = baseRows
      .map((row) => ({
        ...row,
        margin: row.transacted ? row.value / row.transacted : null,
        contribution: commission ? row.value / commission : null,
      }))
      .sort((a, b) => (b.margin ?? -Infinity) - (a.margin ?? -Infinity));
    const comparableRows = rows.filter((row) => row.margin !== null);
    return {
      rows,
      commission,
      transacted,
      margin: transacted ? commission / transacted : null,
      bestMargin: comparableRows[0] || null,
      topCommission: [...rows].sort((a, b) => b.value - a.value)[0] || null,
      negativeClients: rows.filter((row) => row.value < 0).length,
    };
  }, [client, clientsTable]);

  const negativeRows = useMemo(() => (negativeDetails || [])
    .filter((row) => month === 'all' || row.month_code === month)
    .filter((row) => client === 'all' || row.client === client)
    .sort((a, b) => a.commission_distributed - b.commission_distributed), [client, month, negativeDetails]);

  const selectedNegativeSummary = useMemo(() => {
    if (month === 'all' && client === 'all') return negativeSummary.overall;
    if (month !== 'all' && client === 'all') return negativeSummary.byMonth[month];
    if (month === 'all') return negativeSummary.byClient[client];
    return negativeSummary.byMonthClient[`${month}:${client}`];
  }, [client, month, negativeSummary]);
  const negativeStats = selectedNegativeSummary || { count: 0, impact: 0 };
  const visibleNegativeRows = negativeRows.slice(0, negativeLimit);

  useEffect(() => {
    setNegativeLimit(50);
    setSelectedProduct(null);
    setProductDetailsError('');
    setProductDetailsLimit(50);
    setClientProfileOperationsLimit(50);
  }, [client, month]);

  const selectedSplit = useMemo(() => {
    const rows = month === 'all' ? revenueSplit : revenueSplit.filter((row) => row.code === month);
    const charged = sum(rows, 'charged');
    return {
      sold: sum(rows, 'sold'), charged,
      values: [
        { name: 'Espiral', value: sum(rows, 'espiral'), color: '#183B68' },
        { name: 'Helix', value: sum(rows, 'helix'), color: '#2F6FED' },
        { name: 'Clientes', value: sum(rows, 'clients'), color: '#9BB9F4' },
      ].map((entry) => ({ ...entry, share: charged ? entry.value / charged : 0 })),
    };
  }, [month, revenueSplit]);

  const selectedOfficialClient = clientSummary.find((row) => row.code === client);
  const totalPayable = client === 'all'
    ? sum(reports.map((r) => r.summary), 'total_payable')
    : (month === 'all' ? selectedOfficialClient?.total : selectedOfficialClient?.months?.[month]) || 0;
  const transacted = client === 'all'
    ? selectedSplit.sold
    : sum(filteredClientRows, 'transaction_amount');
  const discounts = sum(reports.map((r) => r.summary), 'discounts_complements');
  const productSalesTotal = sum(productRows, 'transacted');
  const productCommissionTotal = sum(productRows, 'commission');
  const productSalesDifference = productSalesTotal - transacted;
  const productResultBeforeOfficial = productCommissionTotal - (client === 'all' ? discounts : 0);
  const productResultDifference = productResultBeforeOfficial - totalPayable;
  const hasProductSummaryDifference = Math.abs(productSalesDifference) > 0.05 || Math.abs(productResultDifference) > 0.05;
  const currentMonthLabel = month === 'all' ? 'Enero – julio 2026' : MONTHS.find((item) => item.code === month)?.name;
  const currentClientLabel = client === 'all' ? 'Todos los clientes' : `${client} · ${clientName(client)}`;
  const client001Total = clientSummary.find((row) => row.code === '001')?.total || 0;
  const client001Negatives = negativeSummary.byClient['001']?.count || 0;
  const selectedProductKey = selectedProduct ? `${month}:${client}:${selectedProduct.product}` : '';
  const selectedProductDetails = selectedProductKey ? productDetailsCache[selectedProductKey] : null;
  const clientSalesTotal = client === 'all' ? 0 : sum(filteredClientRows, 'transaction_amount');
  const networkSalesTotal = sum(clientRows, 'transaction_amount');
  const productEffectiveRate = selectedProduct?.transacted ? selectedProduct.commission / selectedProduct.transacted : null;
  const productSalesShare = selectedProduct?.transacted && clientSalesTotal ? selectedProduct.transacted / clientSalesTotal : null;
  const clientSalesShare = clientSalesTotal && networkSalesTotal ? clientSalesTotal / networkSalesTotal : null;
  const detailSaleDifference = selectedProductDetails && selectedProduct
    ? selectedProductDetails.summary.transactionAmount - selectedProduct.transacted
    : 0;
  const detailCommissionDifference = selectedProductDetails && selectedProduct
    ? selectedProductDetails.summary.commissionDistributed - selectedProduct.commission
    : 0;
  const hasProductDifference = Math.abs(detailSaleDifference) > 0.05 || Math.abs(detailCommissionDifference) > 0.05;
  const visibleProductDetails = selectedProductDetails?.details.slice(0, productDetailsLimit) || [];

  const paymentHistory = useMemo(() => payments
    .filter((payment) => month === 'all' || payment.periodCode === month)
    .filter((payment) => client === 'all' || payment.clientCode === client)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.createdAt.localeCompare(a.createdAt)), [client, month, payments]);

  const paymentClients = useMemo(() => [...clientSummary, ...clientProfileCatalog.filter((profile) => !clientSummary.some((row) => row.code === profile.code))], [clientProfileCatalog, clientSummary]);
  const paymentBalances = useMemo(() => paymentClients
    .filter((row) => client === 'all' || row.code === client)
    .map((row) => {
      const generated = month === 'all' ? row.total : (row.months[month] || 0);
      const paid = payments
        .filter((payment) => payment.clientCode === row.code && (month === 'all' || payment.periodCode === month))
        .reduce((total, payment) => total + payment.amount, 0);
      return { code: row.code, generated, paid, pending: generated - paid };
    })
    .filter((row) => Math.abs(row.generated) > 0.004 || row.paid > 0)
    .sort((a, b) => b.pending - a.pending), [client, month, paymentClients, payments]);

  const paymentGenerated = sum(paymentBalances, 'generated');
  const paymentPaid = sum(paymentBalances, 'paid');
  const paymentPending = paymentGenerated - paymentPaid;
  const pendingClients = paymentBalances.filter((row) => row.pending > 0.009).length;

  const selectedImportedProfile = client === 'all' ? null : clientProfilesCache[client] || null;
  const uploadedClientStatements = useMemo(() => documents
    .map((document) => document.extracted)
    .filter((extraction) => extraction?.kind === 'client_statement' && extraction.client?.code === client), [client, documents]);
  const importedStatements = useMemo(() => {
    const byMonth = new Map();
    uploadedClientStatements.forEach((statement) => {
      if (statement.selectedMonth && !byMonth.has(statement.selectedMonth)) byMonth.set(statement.selectedMonth, statement);
    });
    const stored = selectedImportedProfile ? (selectedImportedProfile.statements || [selectedImportedProfile]) : [];
    stored.forEach((statement) => {
      if (statement.selectedMonth && !byMonth.has(statement.selectedMonth)) byMonth.set(statement.selectedMonth, statement);
    });
    return [...byMonth.values()];
  }, [selectedImportedProfile, uploadedClientStatements]);
  const hasImportedProfile = importedStatements.length > 0;
  const clientProfileMonths = useMemo(() => client === 'all' ? [] : MONTHS.map((entry) => {
    const imported = importedStatements.find((statement) => statement.selectedMonth === entry.code);
    const report = helix.reports.find((item) => item.month_code === entry.code);
    const rows = report?.client_product.filter((row) => row.client === client) || [];
    const sale = imported ? Number(imported.summary?.transacted) || 0 : sum(rows, 'transaction_amount');
    const commission = imported ? Number(imported.summary?.totalPayable) || 0 : (clientSummary.find((row) => row.code === client)?.months?.[entry.code] || 0);
    const paid = payments.filter((payment) => payment.clientCode === client && payment.periodCode === entry.code).reduce((total, payment) => total + payment.amount, 0);
    const negatives = imported?.negativeSummary || negativeSummary.byMonthClient[`${entry.code}:${client}`] || { count: 0, impact: 0 };
    return { ...entry, sale, commission, paid, pending: commission - paid, margin: sale ? commission / sale : null, negatives };
  }), [client, clientSummary, helix, importedStatements, negativeSummary, payments]);
  const clientProfileSales = sum(clientProfileMonths, 'sale');
  const clientProfileCommission = sum(clientProfileMonths, 'commission');
  const clientProfilePaid = sum(clientProfileMonths, 'paid');
  const clientProfilePending = clientProfileCommission - clientProfilePaid;
  const clientProfileMargin = clientProfileSales ? clientProfileCommission / clientProfileSales : null;
  const allClientSales = helix.reports.flatMap((report) => report.client_product).reduce((total, row) => total + (Number(row.transaction_amount) || 0), 0);
  const clientProfileShare = hasImportedProfile ? null : allClientSales ? clientProfileSales / allClientSales : null;
  const clientProfileNegatives = client === 'all' ? { count: 0, impact: 0 } : hasImportedProfile
    ? importedStatements.reduce((totals, statement) => ({ count: totals.count + (statement.negativeSummary?.count || 0), impact: totals.impact + (statement.negativeSummary?.impact || 0) }), { count: 0, impact: 0 })
    : (negativeSummary.byClient[client] || { count: 0, impact: 0 });
  const clientProfileProducts = useMemo(() => {
    if (client === 'all') return [];
    const map = new Map();
    const rows = hasImportedProfile
      ? importedStatements.flatMap((statement) => (statement.products || []).map((row) => ({ product: row.product, transaction_amount: row.transactionAmount, commission_distributed: row.commissionDistributed })))
      : helix.reports.flatMap((report) => report.client_product.filter((row) => row.client === client));
    rows.forEach((row) => {
      const current = map.get(row.product) || { product: row.product, sale: 0, commission: 0 };
      current.sale += Number(row.transaction_amount) || 0;
      current.commission += Number(row.commission_distributed) || 0;
      map.set(row.product, current);
    });
    return [...map.values()].map((row) => ({ ...row, margin: row.sale ? row.commission / row.sale : null, saleShare: clientProfileSales ? row.sale / clientProfileSales : null })).sort((a, b) => b.sale - a.sale);
  }, [client, clientProfileSales, hasImportedProfile, helix, importedStatements]);
  const clientProfileOperations = hasImportedProfile ? importedStatements.flatMap((statement) => statement.operations || []) : [];
  const visibleClientProfileOperations = clientProfileOperations.slice(0, clientProfileOperationsLimit);
  const clientProfileDisplayName = importedStatements[0]?.client?.name || clientName(client);
  const clientProfilePeriods = importedStatements
    .map((statement) => `${monthName(statement.selectedMonth)} ${statement.year}`)
    .join(' · ');

  const reconciliationCounts = useMemo(() => ({
    pending: reconciliations.filter((row) => row.status === 'pending').length,
    reviewing: reconciliations.filter((row) => row.status === 'reviewing').length,
    resolved: reconciliations.filter((row) => row.status === 'resolved').length,
  }), [reconciliations]);
  const visibleReconciliations = useMemo(() => reconciliations
    .filter((row) => reconciliationFilter === 'all' || row.status === reconciliationFilter)
    .sort((a, b) => Math.abs(b.commissionDifference) - Math.abs(a.commissionDifference)), [reconciliationFilter, reconciliations]);

  const selectClient = (code) => {
    setClient(code);
    setTab('client360');
    if (!paymentsLoaded && !paymentsLoading) void loadPayments();
    if (clientProfileCatalog.some((profile) => profile.code === code)) void loadClientProfile(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeClientFilter = (code) => {
    if (clientProfileCatalog.some((profile) => profile.code === code)) {
      selectClient(code);
      return;
    }
    setClient(code);
  };

  const openNegatives = () => {
    setTab('negatives');
    void loadNegativeDetails();
  };

  const openProductDetails = async (row) => {
    setSelectedProduct(row);
    setProductDetailsLimit(50);
    setProductDetailsError('');
    if (client === 'all') {
      setProductDetailsError('Selecciona un cliente en el filtro superior para ver sus operaciones y porcentajes.');
      return;
    }
    const key = `${month}:${client}:${row.product}`;
    if (productDetailsCache[key]) return;
    setProductDetailsLoading(true);
    try {
      const params = new URLSearchParams({ month, client, product: row.product });
      const response = await apiFetch(`/api/product-details?${params}`, { headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'El detalle del producto no respondió correctamente.');
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las operaciones.');
      setProductDetailsCache((current) => ({ ...current, [key]: payload }));
    } catch (error) {
      setProductDetailsError(error instanceof Error ? error.message : 'No se pudieron cargar las operaciones.');
    } finally {
      setProductDetailsLoading(false);
    }
  };

  const openSection = (nextTab) => {
    setTab(nextTab);
    if ((nextTab === 'payments' || nextTab === 'client360') && !paymentsLoaded && !paymentsLoading) void loadPayments();
    if (nextTab === 'documents' && !documentsLoaded && !documentsLoading) void loadDocuments();
    if (nextTab === 'users' && !usersLoaded && !usersLoading) void loadUsers();
    if (nextTab === 'checks' && !reconciliationsLoaded && !reconciliationsLoading) void loadReconciliations();
  };

  const reviewReconciliation = (issue) => {
    setSelectedReconciliation(issue);
    setReconciliationForm({ status: issue.status, notes: issue.notes || '' });
    setReconciliationError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveReconciliation = async (event) => {
    event.preventDefault();
    if (!selectedReconciliation) return;
    setReconciliationSaving(true);
    setReconciliationError('');
    try {
      const response = await apiFetch(`/api/reconciliations/${encodeURIComponent(selectedReconciliation.id)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(reconciliationForm),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al guardar la revisión.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la revisión.');
      setReconciliations((current) => current.map((row) => row.id === selectedReconciliation.id ? { ...row, ...reconciliationForm, reviewedBy: payload.review.reviewedBy, reviewedAt: payload.review.reviewedAt } : row));
      setSelectedReconciliation(null);
    } catch (error) {
      setReconciliationError(error instanceof Error ? error.message : 'No se pudo guardar la revisión.');
    } finally {
      setReconciliationSaving(false);
    }
  };

  const openNewPayment = (code) => {
    setEditingPayment(null);
    setPaymentForm(blankPayment(month === 'all' ? '07' : month, code || (client === 'all' ? '001' : client)));
    setPaymentError('');
    setPaymentOpen(true);
  };

  const openEditPayment = (payment) => {
    setEditingPayment(payment.id);
    setPaymentForm({
      clientCode: payment.clientCode,
      periodCode: payment.periodCode,
      paidAt: payment.paidAt,
      amount: String(payment.amount),
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
    setPaymentError('');
    setPaymentOpen(true);
  };

  const closePaymentForm = () => {
    if (paymentSaving) return;
    setPaymentOpen(false);
    setEditingPayment(null);
  };

  const savePayment = async (event) => {
    event.preventDefault();
    setPaymentSaving(true);
    setPaymentError('');
    try {
      const response = await apiFetch(editingPayment ? `/api/payments/${encodeURIComponent(editingPayment)}` : '/api/payments', {
        method: editingPayment ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ ...paymentForm, amount: Number(paymentForm.amount) }),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al guardar el pago.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el pago.');
      setPaymentOpen(false);
      setEditingPayment(null);
      await loadPayments();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudo guardar el pago.');
    } finally {
      setPaymentSaving(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!window.confirm(`¿Eliminar el pago de ${currency.format(payment.amount)} a ${clientName(payment.clientCode)}?`)) return;
    setPaymentError('');
    try {
      const response = await apiFetch(`/api/payments/${encodeURIComponent(payment.id)}`, { method: 'DELETE', headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al eliminar el pago.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el pago.');
      setPayments((current) => current.filter((row) => row.id !== payment.id));
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudo eliminar el pago.');
    }
  };

  const openNewUser = () => {
    setUserForm({ fullName: '', email: '', clientCode: '' });
    setUserError('');
    setCreatedCredential(null);
    setUserOpen(true);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setUserSaving(true);
    setUserError('');
    try {
      const response = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(userForm),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al crear el usuario.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear el usuario.');
      setCreatedCredential({ email: payload.user.email, password: payload.temporaryPassword });
      setUserOpen(false);
      await loadUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'No se pudo crear el usuario.');
    } finally {
      setUserSaving(false);
    }
  };

  const resetUserPassword = async (user) => {
    if (!window.confirm(`¿Generar una nueva contraseña temporal para ${user.email}? Sus sesiones abiertas se cerrarán.`)) return;
    setUserError('');
    setCreatedCredential(null);
    try {
      const response = await apiFetch(`/api/users/${encodeURIComponent(user.email)}/reset-password`, { method: 'POST', headers: { accept: 'application/json' } });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al restablecer la contraseña.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo restablecer la contraseña.');
      setCreatedCredential({ email: payload.email, password: payload.temporaryPassword });
      await loadUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.');
    }
  };

  const toggleUser = async (user) => {
    setUserError('');
    try {
      const response = await apiFetch(`/api/users/${encodeURIComponent(user.email)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      const payload = await readApiJson(response, 'No se recibió una respuesta válida al actualizar el usuario.');
      if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el usuario.');
      await loadUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'No se pudo actualizar el usuario.');
    }
  };

  const exportCsv = () => {
    const rows = tab === 'payments'
      ? paymentHistory.map((r) => [r.paidAt, r.periodCode, r.clientCode, clientName(r.clientCode), r.amount, r.reference, r.notes])
      : tab === 'negatives'
      ? negativeRows.map((r) => [r.month, r.client, clientName(r.client), r.product, r.merchant, r.transaction_amount, r.commission_distributed])
      : tab === 'profitability'
      ? profitability.rows.map((r) => [r.code, clientName(r.code), r.transacted, r.value, r.margin === null ? '' : precisePercent.format(r.margin), r.contribution === null ? '' : precisePercent.format(r.contribution)])
      : clientsTable.map((r) => [r.code, clientName(r.code), r.transacted, r.value, r.negativeProducts]);
    const headers = tab === 'payments'
      ? ['Fecha', 'Mes', 'Cliente', 'Nombre', 'Pago', 'Referencia', 'Notas']
      : tab === 'negatives'
      ? ['Mes', 'Cliente', 'Nombre', 'Producto', 'Comercio', 'Venta', 'Resultado']
      : tab === 'profitability'
      ? ['Cliente', 'Nombre', 'Venta procesada', 'Comision generada', 'Ganancia sobre venta', 'Participacion de comision total']
      : ['Cliente', 'Nombre', 'Venta', 'Comision', 'Productos negativos'];
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `helix-${tab}-${month}-${client}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const forceLoginPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'login';

  if (sessionLoading && !forceLoginPreview) {
    return <main className="access-page"><section className="access-card"><HelixMark large /><span className="access-eyebrow">HELIX · PORTAL SEGURO</span><h1>Validando acceso…</h1><p>Estamos preparando tu espacio de trabajo.</p></section></main>;
  }

  if (!session || sessionError || forceLoginPreview) {
    return <main className="access-page login-cover" style={{ '--login-cover-image': `url("${assetPath('brand/helix-comision-login.png')}")` }}>
      <span className="login-mobile-brand" aria-hidden="true" />
      <form className="access-card login-card login-glass" onSubmit={login}>
        <span className="access-eyebrow">ACCESO PRIVADO</span>
        <h1>Iniciar sesión</h1>
        {loginError && <div className="login-message" role="alert">{loginError}</div>}
        {resetMessage && <div className="login-message success" role="status">{resetMessage}</div>}
        <label><span>CORREO</span><span className="login-field"><EnvelopeSimple size={24} aria-hidden="true" /><input required type="email" autoComplete="username" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} placeholder="tu@empresa.com" /></span></label>
        <label><span>CONTRASEÑA</span><span className="login-field"><LockSimple size={24} aria-hidden="true" /><input required type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} placeholder="Tu contraseña" /><button className="password-visibility" type="button" onClick={() => setShowLoginPassword((visible) => !visible)} aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showLoginPassword ? <EyeSlash size={24} /> : <Eye size={24} />}</button></span></label>
        <button className="button primary login-submit" type="submit" disabled={loginBusy} aria-label="Entrar con mi correo"><span>{loginBusy ? 'Entrando…' : 'Entrar al cotizador'}</span><ArrowRight size={24} aria-hidden="true" /></button>
        <button className="forgot-button" type="button" onClick={requestPasswordReset} disabled={resetBusy}>{resetBusy ? 'Enviando solicitud…' : 'Activar cuenta o recuperar acceso'}</button>
        <div className="login-security" aria-hidden="true"><ShieldPlus size={34} /></div>
        <small className="sr-only">El administrador recibirá la solicitud y generará una contraseña temporal.</small>
      </form>
    </main>;
  }

  if (session.mustChangePassword) {
    return <main className="access-page"><form className="access-card login-card" onSubmit={changePassword}><HelixMark large /><span className="access-eyebrow">PRIMER ACCESO</span><h1>Crea tu contraseña</h1><p>Por seguridad, reemplaza la contraseña temporal antes de continuar.</p>{passwordError && <div className="login-message" role="alert">{passwordError}</div>}<label>Contraseña temporal<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label><label>Nueva contraseña<input required type="password" autoComplete="new-password" minLength="12" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label><label>Confirmar nueva contraseña<input required type="password" autoComplete="new-password" minLength="12" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label><p className="password-rule">Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.</p><button className="button primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Guardando…' : 'Guardar y continuar'}</button></form></main>;
  }

  const isAdmin = session.role === 'admin';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><HelixMark /><div className="brand-copy"><strong>HELIX</strong><span>{isAdmin ? 'Centro de control' : 'Portal del cliente'}</span></div><i className="brand-divider" aria-hidden="true"></i><EspiralMark /></div>
        <div className="top-actions">
          {isAdmin && <><button className="button ghost" onClick={() => window.print()}><Printer size={18} /> Imprimir</button><button className="button primary" onClick={exportCsv}><DownloadSimple size={18} /> Descargar datos</button></>}
          <div className="user-chip"><span>{session.fullName}</span><small>{isAdmin ? 'Administrador' : session.clientCode ? `Cliente ${session.clientCode}` : 'Usuario'}</small></div>
          <button className="signout-link" type="button" onClick={logout}>Salir</button>
        </div>
      </header>

      <main>
        {isAdmin ? <section className="page-intro">
          <div>
            <span className="overline">DISTRIBUIDOR HELIX (12) · CARÁTULAS DE MOVIMIENTOS</span>
            <h1>Comisiones enero–julio 2026</h1>
            <p>El reporte del PDF, ahora interactivo. Cambia el mes o el cliente y toda la vista se actualiza.</p>
          </div>
          <div className="period-pill"><span>Periodo activo</span><strong>{currentMonthLabel}</strong></div>
        </section> : <section className="page-intro portal-intro"><div><span className="overline">PORTAL PERSONAL · ACCESO PROTEGIDO</span><h1>{tab === 'portal' ? `Mi Ficha 360°${session.clientCode ? ` · ${session.clientCode}` : ''}` : 'Mis documentos'}</h1><p>{tab === 'portal' ? 'Tus ventas, comisión, porcentaje y operaciones extraídas de tus PDF revisados.' : 'Sube tus reportes, revisa la información extraída y conserva tus archivos en un solo lugar.'}</p></div><div className="period-pill"><span>Cuenta activa</span><strong>{session.email}</strong></div></section>}

        {isAdmin && <section className="filter-bar" aria-label="Filtros del dashboard">
          <div className="filter-title"><Funnel size={20} weight="fill" /><span>Filtrar reporte</span></div>
          <label>Mes<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">Enero – julio</option>{MONTHS.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
          <label>Cliente<select value={client} onChange={(event) => changeClientFilter(event.target.value)}><option value="all">Todos los clientes</option>{clientOptions.map((code) => <option value={code} key={code}>{code} · {clientName(code)}</option>)}</select></label>
          {(month !== 'all' || client !== 'all') && <button className="clear-button" onClick={() => { setMonth('all'); setClient('all'); }}>Limpiar filtros</button>}
        </section>}

        <nav className="tabs" aria-label="Secciones del reporte">
          {isAdmin && <><button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>Resumen</button><button className={tab === 'clientcharts' ? 'active' : ''} onClick={() => setTab('clientcharts')}>Gráficas clientes</button><button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clientes</button><button className={tab === 'client360' ? 'active' : ''} onClick={() => openSection('client360')}>Ficha 360 {client !== 'all' && <span className="profile-tab">{client}</span>}</button><button className={tab === 'profitability' ? 'active' : ''} onClick={() => setTab('profitability')}>Ganancia %</button><button className={tab === 'negatives' ? 'active' : ''} onClick={openNegatives}>Negativos <span>{negativeStats.count}</span></button><button className={tab === 'payments' ? 'active' : ''} onClick={() => openSection('payments')}>Pagos {paymentsLoaded && pendingClients > 0 && <span className="pending-tab">{pendingClients}</span>}</button></>}
          {!isAdmin && <button className={tab === 'portal' ? 'active' : ''} onClick={() => setTab('portal')}>Mi Ficha 360°</button>}
          <button className={tab === 'documents' ? 'active' : ''} onClick={() => openSection('documents')}>{isAdmin ? 'Documentos' : 'Mis documentos'} {documentsLoaded && documents.length > 0 && <span className="document-tab">{documents.length}</span>}</button>
          {isAdmin && <><button className={tab === 'users' ? 'active' : ''} onClick={() => openSection('users')}>Usuarios {usersLoaded && <span className="user-tab">{users.filter((user) => user.active).length}</span>}</button><button className={tab === 'checks' ? 'active' : ''} onClick={() => openSection('checks')}>Conciliación {reconciliationsLoaded && reconciliationCounts.pending > 0 && <span>{reconciliationCounts.pending}</span>}</button></>}
        </nav>

        {!isAdmin && tab === 'portal' && (clientProfileLoading && !hasImportedProfile ? <section className="panel full-panel client-picker-empty"><ChartBar size={38} weight="duotone" /><h2>Preparando tu Ficha 360°…</h2><p>Estamos cargando las cifras extraídas de tus reportes.</p></section> : hasImportedProfile ? <section className="client-portal-layout">
          {clientProfileError && !hasImportedProfile && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{clientProfileError}</span></div>}
          <article className="panel client-360-head portal-profile-head">
            <div className="client-identity"><span className="sd-badge">{client}</span><div><span>FICHA 360° PERSONAL</span><h2>{clientProfileDisplayName}</h2><p>{clientProfilePeriods} · información extraída de PDF revisado</p></div></div>
            <button className="button primary" onClick={() => openSection('documents')}><UploadSimple size={18} weight="bold" /> Subir otro PDF</button>
          </article>

          <section className="kpi-grid portal-kpis">
            <KpiCard label="Venta procesada" value={currency.format(clientProfileSales)} note="monto transaccionado" icon={ChartBar} />
            <KpiCard label="Comisión generada" value={currency.format(clientProfileCommission)} note="resultado oficial del reporte" tone={clientProfileCommission < 0 ? 'danger' : 'success'} icon={clientProfileCommission < 0 ? ArrowDownRight : ArrowUpRight} />
            <KpiCard label="Tu porcentaje de venta" value={clientProfileMargin === null ? '—' : precisePercent.format(clientProfileMargin)} note="comisión ÷ venta procesada" tone={clientProfileMargin !== null && clientProfileMargin < 0 ? 'danger' : 'default'} icon={ChartBar} />
            <KpiCard label="Operaciones negativas" value={clientProfileNegatives.count.toLocaleString('es-MX')} note={`${currency.format(clientProfileNegatives.impact)} de impacto`} tone={clientProfileNegatives.count ? 'danger' : 'success'} icon={clientProfileNegatives.count ? WarningCircle : CheckCircle} />
          </section>

          <article className="panel full-panel portal-products">
            <SectionTitle eyebrow="RESUMEN POR PRODUCTO" title="De dónde salen tu venta y comisión" note="Pica cualquier operación en la tabla inferior para ver cómo se forma el resultado." />
            <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Venta</th><th>% de tu venta</th><th>Comisión</th><th>% ganado</th></tr></thead><tbody>{clientProfileProducts.map((row) => <tr key={row.product}><td><strong>{row.product}</strong></td><td>{currency.format(row.sale)}</td><td>{row.saleShare === null ? '—' : precisePercent.format(row.saleShare)}</td><td className={row.commission < 0 ? 'negative' : ''}><strong>{currency.format(row.commission)}</strong></td><td><span className={`margin-badge ${row.margin !== null && row.margin < 0 ? 'loss' : 'gain'}`}>{row.margin === null ? '—' : precisePercent.format(row.margin)}</span></td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency.format(clientProfileSales)}</td><td>100.00%</td><td>{currency.format(clientProfileCommission)}</td><td>{clientProfileMargin === null ? '—' : precisePercent.format(clientProfileMargin)}</td></tr></tfoot></table></div>
          </article>

          <article className="panel full-panel" id="portal-operations">
            <SectionTitle eyebrow="TUS OPERACIONES" title={`${clientProfileOperations.length} movimientos`} note="La última columna muestra qué porcentaje de cada venta terminó como comisión para ti." />
            <div className="table-scroll operations-table"><table><thead><tr><th>Mes</th><th>Producto</th><th>Comercio</th><th>Venta</th><th>Comisión cobrada</th><th>Piso %</th><th>Piso fijo</th><th>Comisión cliente</th><th>% cliente</th></tr></thead><tbody>{visibleClientProfileOperations.map((row, index) => <tr className={row.commission_distributed < 0 ? 'operation-negative' : ''} key={`${row.month_code}-${row.product}-${row.merchant_id || 'sin-id'}-${index}`}><td>{row.month}</td><td><strong>{row.product}</strong></td><td className="operation-name"><strong>{row.merchant || 'Sin nombre'}</strong><small>ID {row.merchant_id || '—'}</small></td><td>{currency.format(row.transaction_amount)}</td><td>{currency.format(row.commission_charged)}</td><td>{currency.format(row.floor_percent)}</td><td>{currency.format(row.floor_fixed)}</td><td className={row.commission_distributed < 0 ? 'negative' : ''}><strong>{currency.format(row.commission_distributed)}</strong></td><td>{row.transaction_amount ? precisePercent.format(row.commission_distributed / row.transaction_amount) : '—'}</td></tr>)}</tbody></table>{clientProfileOperations.length > clientProfileOperationsLimit && <div className="table-pagination"><span>Mostrando {visibleClientProfileOperations.length} de {clientProfileOperations.length}</span><button className="button ghost" onClick={() => setClientProfileOperationsLimit((current) => current + 50)}>Mostrar 50 más</button></div>}</div>
          </article>
        </section> : <section className="panel full-panel client-picker-empty portal-empty"><FilePdf size={42} weight="duotone" /><h2>Aún no hay datos para tu ficha</h2><p>{clientProfileError || 'Sube tu primer reporte PDF de Helix. Revisarás la extracción antes de guardarla y después aparecerá aquí.'}</p><button className="button primary" onClick={() => openSection('documents')}><UploadSimple size={18} weight="bold" /> Subir primer PDF</button></section>)}

        {isAdmin && tab === 'summary' && <>
          <section className="kpi-grid">
            <KpiCard label={client === 'all' ? 'Total a pagar' : 'Resultado del cliente'} value={currency.format(totalPayable)} note={currentClientLabel} tone={totalPayable < 0 ? 'danger' : 'default'} icon={totalPayable < 0 ? ArrowDownRight : ArrowUpRight} />
            <KpiCard label="Monto transaccionado" value={`$${compact.format(transacted)}`} note={client === 'all' ? `take rate ${percent.format(totalPayable / transacted)}` : 'venta operada por el cliente'} icon={ChartBar} />
            <KpiCard label={client === 'all' ? 'Descuentos aplicados' : 'Descuentos generales'} value={currency.format(discounts)} note={client === 'all' ? 'restados después de comisiones de productos' : 'no están asignados por cliente'} />
            <KpiCard label="Movimientos negativos" value={negativeStats.count.toLocaleString('es-MX')} note={`${currency.format(negativeStats.impact)} de impacto`} tone={negativeStats.count ? 'warning' : 'success'} icon={negativeStats.count ? WarningCircle : CheckCircle} />
          </section>

          {client === '001' && <section className="client-alert">
            <div className="alert-icon"><WarningCircle size={28} weight="fill" /></div>
            <div><span>CLIENTE 001 · {clientName('001').toUpperCase()}</span><h2>{currency.format(client001Total)}</h2><p>{client001Negatives} movimientos negativos en el periodo. El deterioro se concentra de marzo a julio.</p></div>
            <button onClick={openNegatives}>Ver movimientos</button>
          </section>}

          <DashboardCharts clientCode={client} clientLabel={clientName(client)} currentMonthLabel={currentMonthLabel} monthlyTrend={monthlyTrend} onMonthSelect={setMonth} selectedMonth={month} selectedSplit={selectedSplit} />

          <section className="panel product-panel">
            <SectionTitle eyebrow="RESUMEN POR PRODUCTO" title={`Comisión por producto · ${currentClientLabel}`} note={client === 'all' ? 'La comisión de productos se concilia con descuentos y total oficial de portada.' : 'Pica cualquier producto para abrir sus operaciones y porcentajes.'} />
            {hasProductSummaryDifference && <div className="reconciliation-warning product-summary-warning"><WarningCircle size={19} weight="fill" /><div><strong>La fuente contiene diferencias entre portada y detalle.</strong><span>Venta productos − portada: {currency.format(productSalesDifference)} · resultado detalle − oficial: {currency.format(productResultDifference)}. Se conservan ambos importes sin modificar fórmulas.</span></div></div>}
            {productRows.length ? <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Monto transaccionado</th><th>{client === 'all' ? 'Comisión antes de descuentos' : 'Comisión en detalle'}</th><th>Peso del producto</th></tr></thead><tbody>{productRows.map((row) => <tr key={row.product} className={selectedProduct?.product === row.product ? 'product-row-active' : ''}><td><button className="product-detail-button" onClick={() => openProductDetails(row)} aria-expanded={selectedProduct?.product === row.product}><strong>{row.product}</strong><span>Ver operaciones ›</span></button></td><td>{currency.format(row.transacted)}</td><td className={row.commission < 0 ? 'negative' : ''}>{currency.format(row.commission)}</td><td><div className="share-cell"><div><span style={{ width: `${Math.max(2, Math.abs(row.commission / (productCommissionTotal || 1)) * 100)}%` }}></span></div><small>{percent.format(row.commission / (productCommissionTotal || 1))}</small></div></td></tr>)}</tbody><tfoot><tr><td>Subtotal de productos</td><td>{currency.format(productSalesTotal)}</td><td>{currency.format(productCommissionTotal)}</td><td>100%</td></tr>{client === 'all' && <tr className="discount-row"><td>Descuentos aplicados</td><td>—</td><td className="negative">-{currency.format(discounts)}</td><td>—</td></tr>}<tr className="official-total-row"><td>Total oficial de portada</td><td>{currency.format(transacted)}</td><td>{currency.format(totalPayable)}</td><td>—</td></tr></tfoot></table></div> : <EmptyState />}

            {selectedProduct && <section className="product-drilldown" aria-live="polite">
              <div className="drilldown-heading">
                <div><span>OPERACIONES QUE FORMAN EL MONTO</span><h3>{selectedProduct.product} · {currentClientLabel}</h3><p>{currentMonthLabel}</p></div>
                <button className="icon-button" onClick={() => setSelectedProduct(null)} aria-label="Cerrar desglose"><X size={19} /></button>
              </div>

              {productDetailsError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{productDetailsError}</span></div>}
              {productDetailsLoading && <div className="empty-state compact-detail-loading">Cargando operaciones…</div>}

              {!productDetailsLoading && selectedProductDetails && <>
                <div className="drilldown-kpis">
                  <article><span>Venta del producto</span><strong>{currency.format(selectedProduct.transacted)}</strong><small>{selectedProductDetails.count} operaciones</small></article>
                  <article><span>Comisión del cliente</span><strong className={selectedProduct.commission < 0 ? 'negative' : ''}>{currency.format(selectedProduct.commission)}</strong><small>resultado del resumen</small></article>
                  <article><span>Tasa efectiva</span><strong>{productEffectiveRate === null ? '—' : precisePercent.format(productEffectiveRate)}</strong><small>comisión ÷ venta del producto</small></article>
                  <article><span>Producto en venta cliente</span><strong>{productSalesShare === null ? '—' : precisePercent.format(productSalesShare)}</strong><small>{selectedProduct.product} ÷ venta del cliente</small></article>
                  <article><span>Cliente en venta total</span><strong>{clientSalesShare === null ? '—' : precisePercent.format(clientSalesShare)}</strong><small>venta cliente ÷ todos los clientes</small></article>
                </div>

                <div className="drilldown-formula"><strong>Cómo se calcula:</strong> comisión cobrada − piso porcentual − piso fijo + diferencia de conciliación = comisión del cliente.</div>
                {hasProductDifference && <div className="reconciliation-warning"><WarningCircle size={19} weight="fill" /><div><strong>El resumen y las operaciones del PDF no coinciden exactamente.</strong><span>Diferencia en venta: {currency.format(detailSaleDifference)} · diferencia en comisión: {currency.format(detailCommissionDifference)}. Se conservan ambos importes para revisión.</span></div></div>}

                {selectedProductDetails.details.length ? <div className="table-scroll operations-table"><table><thead><tr><th>Mes</th><th>Comercio</th><th>Venta</th><th>Comisión cobrada</th><th>Piso %</th><th>Piso fijo</th><th>Diferencia</th><th>Comisión cliente</th><th>% cliente</th></tr></thead><tbody>{visibleProductDetails.map((row, index) => <tr key={`${row.month_code}-${row.merchant_id || 'sin-id'}-${index}`}><td>{row.month}</td><td className="operation-name"><strong>{row.merchant || 'Sin nombre'}</strong><small>ID {row.merchant_id || '—'}</small></td><td>{currency.format(row.transaction_amount)}</td><td>{currency.format(row.commission_charged)}</td><td>{currency.format(row.floor_percent)}</td><td>{currency.format(row.floor_fixed)}</td><td className={row.reconciliation_adjustment < -0.005 ? 'negative' : ''}>{currency.format(row.reconciliation_adjustment)}</td><td className={row.commission_distributed < 0 ? 'negative' : ''}><strong>{currency.format(row.commission_distributed)}</strong></td><td>{row.transaction_amount ? precisePercent.format(row.commission_distributed / row.transaction_amount) : '—'}</td></tr>)}</tbody><tfoot><tr><td colSpan="2">Total de operaciones</td><td>{currency.format(selectedProductDetails.summary.transactionAmount)}</td><td>{currency.format(selectedProductDetails.summary.commissionCharged)}</td><td>{currency.format(selectedProductDetails.summary.floorPercent)}</td><td>{currency.format(selectedProductDetails.summary.floorFixed)}</td><td>{currency.format(selectedProductDetails.summary.reconciliationAdjustment)}</td><td>{currency.format(selectedProductDetails.summary.commissionDistributed)}</td><td>{selectedProductDetails.summary.transactionAmount ? precisePercent.format(selectedProductDetails.summary.commissionDistributed / selectedProductDetails.summary.transactionAmount) : '—'}</td></tr></tfoot></table>{selectedProductDetails.details.length > productDetailsLimit && <div className="table-pagination"><span>Mostrando {visibleProductDetails.length} de {selectedProductDetails.details.length}</span><button className="button ghost" onClick={() => setProductDetailsLimit((current) => current + 50)}>Mostrar 50 más</button></div>}</div> : <EmptyState />}
              </>}
            </section>}
          </section>
        </>}

        {isAdmin && tab === 'clientcharts' && <>
          <ClientOverviewCharts rows={clientChartRows} months={MONTHS} officialCommission={totalPayable} periodLabel={currentMonthLabel} onSelectClient={selectClient} />
          {clientProfileCatalog.length > 0 && <article className="panel full-panel independent-profile-chart">
            <SectionTitle eyebrow="PERFILES PDF INDEPENDIENTES" title="Clientes fuera del total Helix 12" note="Se muestran aquí para consulta, pero no se suman a la portada ni a las gráficas oficiales de Helix 12." />
            <div className="independent-profile-list">{clientProfileCatalog.map((profile) => <button key={profile.code} onClick={() => selectClient(profile.code)}><span className="sd-badge">{profile.code}</span><span><strong>{profile.name}</strong><small>{monthName(profile.latestPeriod.slice(-2))} {profile.latestPeriod.slice(0, 4)}</small></span><span><small>Venta</small><strong>{currency.format(profile.sale)}</strong></span><span><small>Comisión</small><strong>{currency.format(profile.total)}</strong></span><span><small>% ganado</small><strong>{profile.sale ? precisePercent.format(profile.total / profile.sale) : '—'}</strong></span></button>)}</div>
          </article>}
        </>}

        {isAdmin && tab === 'client360' && (client === 'all' ? <section className="panel full-panel client-picker-empty"><ChartBar size={38} weight="duotone" /><h2>Selecciona un cliente</h2><p>Elige un cliente arriba o entra desde la tabla de Clientes para abrir su ficha completa.</p><button className="button primary" onClick={() => setTab('clients')}>Ver clientes</button></section> : clientProfileLoading && clientProfileCatalog.some((profile) => profile.code === client) && !hasImportedProfile ? <section className="panel full-panel client-picker-empty"><ChartBar size={38} weight="duotone" /><h2>Cargando Ficha 360°…</h2><p>Estamos preparando el detalle del PDF revisado.</p></section> : <section className="client-360-layout">
          {clientProfileError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{clientProfileError}</span><button className="button ghost" onClick={() => loadClientProfile(client)}>Reintentar</button></div>}
          <article className="panel client-360-head">
            <div className="client-identity"><span className="sd-badge">{client}</span><div><span>FICHA 360° DEL CLIENTE</span><h2>{clientName(client)}</h2><p>{hasImportedProfile ? `${importedStatements.map((statement) => `${monthName(statement.selectedMonth)} ${statement.year}`).join(' · ')} · fuente PDF revisada` : 'Enero–julio 2026 · ventas, comisión, pagos y alertas en una sola vista.'}</p></div></div>
            <div className={`client-health ${clientProfilePending < -0.005 || clientProfileCommission < 0 ? 'danger' : clientProfileNegatives.count ? 'warning' : 'success'}`}><span>Estado</span><strong>{clientProfileCommission < 0 ? 'Resultado negativo' : clientProfilePending > 0.009 ? 'Pago pendiente' : clientProfileNegatives.count ? 'Con alertas' : 'Al corriente'}</strong></div>
          </article>

          <section className="kpi-grid client-360-kpis">
            <KpiCard label="Venta procesada" value={currency.format(clientProfileSales)} note={hasImportedProfile ? 'monto transaccionado del PDF' : clientProfileShare === null ? 'Sin participación calculable' : `${precisePercent.format(clientProfileShare)} de la venta total`} icon={ChartBar} />
            <KpiCard label="Comisión generada" value={currency.format(clientProfileCommission)} note="resultado oficial del reporte" tone={clientProfileCommission < 0 ? 'danger' : 'success'} icon={clientProfileCommission < 0 ? ArrowDownRight : ArrowUpRight} />
            <KpiCard label="Ganancia sobre venta" value={clientProfileMargin === null ? '—' : precisePercent.format(clientProfileMargin)} note="comisión ÷ venta del cliente" tone={clientProfileMargin !== null && clientProfileMargin < 0 ? 'danger' : 'default'} icon={ChartBar} />
            <KpiCard label="Pagado" value={paymentsLoading ? 'Cargando…' : currency.format(clientProfilePaid)} note={paymentsLoaded ? `${payments.filter((payment) => payment.clientCode === client).length} pagos registrados` : 'consultando pagos'} tone="success" icon={CheckCircle} />
            <KpiCard label="Saldo pendiente" value={paymentsLoading ? 'Cargando…' : currency.format(clientProfilePending)} note="comisión generada − pagos" tone={clientProfilePending > 0.009 ? 'warning' : clientProfilePending < -0.009 ? 'danger' : 'success'} icon={Money} />
            <KpiCard label="Operaciones negativas" value={clientProfileNegatives.count.toLocaleString('es-MX')} note={`${currency.format(clientProfileNegatives.impact)} de impacto`} tone={clientProfileNegatives.count ? 'danger' : 'success'} icon={clientProfileNegatives.count ? WarningCircle : CheckCircle} />
          </section>

          <section className="profile-grid">
            <article className="panel profile-trend-panel">
              <SectionTitle eyebrow="COMPORTAMIENTO MENSUAL" title="Comisión generada" note="Pica un mes para llevar el filtro general a ese periodo." />
              <ClientTrend rows={clientProfileMonths} selectedMonth={month} onMonthSelect={setMonth} />
            </article>
            <article className="panel profile-actions-panel">
              <SectionTitle eyebrow="ACCIONES RÁPIDAS" title="Qué revisar ahora" />
              <button onClick={() => hasImportedProfile ? document.getElementById('client-profile-operations')?.scrollIntoView({ behavior: 'smooth' }) : (setTab('summary'), setMonth('all'))}><ChartBar size={20} /><span><strong>Ver operaciones</strong><small>Desglose por producto y comercio</small></span></button>
              <button onClick={() => hasImportedProfile ? document.getElementById('client-profile-operations')?.scrollIntoView({ behavior: 'smooth' }) : openNegatives()}><WarningCircle size={20} /><span><strong>Revisar negativos</strong><small>{clientProfileNegatives.count} operaciones localizadas</small></span></button>
              <button onClick={() => openSection('payments')}><Money size={20} /><span><strong>Controlar pagos</strong><small>{currency.format(clientProfilePending)} pendiente</small></span></button>
            </article>
          </section>

          <article className="panel full-panel">
            <SectionTitle eyebrow="MEZCLA DE PRODUCTOS" title="De dónde sale la venta y la comisión" note="El porcentaje ganado es la comisión del cliente dividida entre su venta." />
            <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Venta</th><th>% de la venta</th><th>Comisión</th><th>% ganado</th></tr></thead><tbody>{clientProfileProducts.map((row) => <tr key={row.product}><td><strong>{row.product}</strong></td><td>{currency.format(row.sale)}</td><td>{row.saleShare === null ? '—' : precisePercent.format(row.saleShare)}</td><td className={row.commission < 0 ? 'negative' : ''}><strong>{currency.format(row.commission)}</strong></td><td><span className={`margin-badge ${row.margin !== null && row.margin < 0 ? 'loss' : 'gain'}`}>{row.margin === null ? '—' : precisePercent.format(row.margin)}</span></td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{currency.format(clientProfileSales)}</td><td>100.00%</td><td>{currency.format(clientProfileCommission)}</td><td>{clientProfileMargin === null ? '—' : precisePercent.format(clientProfileMargin)}</td></tr></tfoot></table></div>
          </article>

          {hasImportedProfile && <article className="panel full-panel" id="client-profile-operations">
            <SectionTitle eyebrow="OPERACIONES EXTRAÍDAS" title={`${clientProfileOperations.length} movimientos del PDF`} note="Cada renglón conserva venta, comisión cobrada, pisos y resultado del cliente." />
            <div className="table-scroll operations-table"><table><thead><tr><th>Mes</th><th>Producto</th><th>Comercio</th><th>Venta</th><th>Comisión cobrada</th><th>Piso %</th><th>Piso fijo</th><th>Diferencia</th><th>Comisión cliente</th><th>% cliente</th></tr></thead><tbody>{visibleClientProfileOperations.map((row, index) => {
              const reconciliation = row.commission_distributed - (row.commission_charged - row.floor_percent - row.floor_fixed);
              return <tr key={`${row.month_code}-${row.product}-${row.merchant_id || 'sin-id'}-${index}`}><td>{row.month}</td><td><strong>{row.product}</strong></td><td className="operation-name"><strong>{row.merchant || 'Sin nombre'}</strong><small>ID {row.merchant_id || '—'}</small></td><td>{currency.format(row.transaction_amount)}</td><td>{currency.format(row.commission_charged)}</td><td>{currency.format(row.floor_percent)}</td><td>{currency.format(row.floor_fixed)}</td><td className={reconciliation < -0.005 ? 'negative' : ''}>{currency.format(reconciliation)}</td><td className={row.commission_distributed < 0 ? 'negative' : ''}><strong>{currency.format(row.commission_distributed)}</strong></td><td>{row.transaction_amount ? precisePercent.format(row.commission_distributed / row.transaction_amount) : '—'}</td></tr>;
            })}</tbody></table>{clientProfileOperations.length > clientProfileOperationsLimit && <div className="table-pagination"><span>Mostrando {visibleClientProfileOperations.length} de {clientProfileOperations.length}</span><button className="button ghost" onClick={() => setClientProfileOperationsLimit((current) => current + 50)}>Mostrar 50 más</button></div>}</div>
          </article>}

          <article className="panel full-panel">
            <SectionTitle eyebrow="ESTADO DE CUENTA" title="Mes por mes" note="Comisión oficial, pagos registrados y saldo por cubrir." />
            <div className="table-scroll"><table><thead><tr><th>Mes</th><th>Venta</th><th>Comisión</th><th>% ganado</th><th>Pagado</th><th>Pendiente</th><th>Negativos</th></tr></thead><tbody>{clientProfileMonths.map((row) => <tr key={row.code}><td><button className="text-button" onClick={() => setMonth(row.code)}><strong>{row.month}</strong></button></td><td>{currency.format(row.sale)}</td><td className={row.commission < 0 ? 'negative' : ''}><strong>{currency.format(row.commission)}</strong></td><td>{row.margin === null ? '—' : precisePercent.format(row.margin)}</td><td>{paymentsLoading ? '…' : currency.format(row.paid)}</td><td className={row.pending < -0.005 ? 'negative' : ''}><strong>{paymentsLoading ? '…' : currency.format(row.pending)}</strong></td><td>{row.negatives.count ? <button className="small-action danger-action" onClick={() => hasImportedProfile ? document.getElementById('client-profile-operations')?.scrollIntoView({ behavior: 'smooth' }) : (setMonth(row.code), openNegatives())}>{row.negatives.count} · {currency.format(row.negatives.impact)}</button> : <span className="ok-label">Sin negativos</span>}</td></tr>)}</tbody></table></div>
          </article>
        </section>)}

        {isAdmin && tab === 'clients' && <section className="panel full-panel">
          <SectionTitle eyebrow="COMPARATIVA POR CLIENTE (SD)" title={`Clientes · ${currentMonthLabel}`} note="Haz clic en cualquier cliente para abrir su ficha." action={<label className="search-box"><MagnifyingGlass size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente o SD" /></label>} />
          <div className="table-scroll clients-table"><table><thead><tr><th>SD</th><th>Cliente</th><th>Monto transaccionado</th><th>Comisión</th><th>Alertas</th></tr></thead><tbody>{clientsTable.map((row) => <tr key={row.code} onClick={() => selectClient(row.code)}><td><span className="sd-badge">{row.code}</span></td><td><strong>{clientName(row.code)}</strong></td><td>{currency.format(row.transacted)}</td><td className={row.value < 0 ? 'negative' : ''}><strong>{currency.format(row.value)}</strong></td><td>{row.negativeProducts ? <span className="alert-count">{row.negativeProducts} negativos</span> : <span className="ok-label">Sin alertas</span>}</td></tr>)}</tbody></table></div>
          {clientProfileCatalog.length > 0 && <div className="imported-profiles"><div className="subsection-title"><div><span>PERFILES CREADOS DESDE PDF</span><strong>{clientProfileCatalog.length}</strong></div><small>Se muestran aparte para no alterar el total del distribuidor Helix 12.</small></div><div className="table-scroll clients-table"><table><thead><tr><th>SD</th><th>Cliente</th><th>Periodo</th><th>Venta del PDF</th><th>Comisión del PDF</th><th>Negativos</th></tr></thead><tbody>{clientProfileCatalog.map((profile) => <tr key={profile.code} onClick={() => selectClient(profile.code)}><td><span className="sd-badge">{profile.code}</span></td><td><strong>{profile.name}</strong><small className="source-label">Perfil PDF revisado</small></td><td>{monthName(profile.latestPeriod.slice(-2))} {profile.latestPeriod.slice(0, 4)}</td><td>{currency.format(profile.sale)}</td><td><strong>{currency.format(profile.total)}</strong></td><td>{profile.negativeCount ? <span className="alert-count">{profile.negativeCount} · {currency.format(profile.negativeImpact)}</span> : <span className="ok-label">Sin negativos</span>}</td></tr>)}</tbody></table></div></div>}
        </section>}

        {isAdmin && tab === 'profitability' && <section className="profitability-layout">
          <section className="kpi-grid profitability-kpis">
            <KpiCard label="Ganancia promedio" value={profitability.margin === null ? '—' : precisePercent.format(profitability.margin)} note={`${currency.format(profitability.commission)} sobre ${currency.format(profitability.transacted)} vendidos`} tone={profitability.commission < 0 ? 'danger' : 'success'} icon={ChartBar} />
            <KpiCard label="Mayor ganancia %" value={profitability.bestMargin?.margin === null || !profitability.bestMargin ? '—' : precisePercent.format(profitability.bestMargin.margin)} note={profitability.bestMargin ? `${profitability.bestMargin.code} · ${clientName(profitability.bestMargin.code)}` : 'Sin datos'} icon={ArrowUpRight} />
            <KpiCard label="Mayor comisión" value={profitability.topCommission ? currency.format(profitability.topCommission.value) : '—'} note={profitability.topCommission ? `${profitability.topCommission.code} · ${clientName(profitability.topCommission.code)}` : 'Sin datos'} icon={Money} />
            <KpiCard label="Clientes en negativo" value={profitability.negativeClients.toLocaleString('es-MX')} note={`${currentMonthLabel} · requieren revisión`} tone={profitability.negativeClients ? 'danger' : 'success'} icon={profitability.negativeClients ? WarningCircle : CheckCircle} />
          </section>

          <section className="panel full-panel profitability-panel">
            <SectionTitle eyebrow="GANANCIA POR CLIENTE" title={`Porcentaje ganado · ${currentMonthLabel}`} note="Ordenado del porcentaje más alto al más bajo." action={<div className="profitability-actions"><label className="search-box"><MagnifyingGlass size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente o SD" /></label><button className="button primary" onClick={exportCsv}><DownloadSimple size={18} /> Descargar CSV</button></div>} />
            <div className="formula-callout"><strong>Ganancia %</strong> = comisión generada ÷ venta procesada. <strong>Participación</strong> = cuánto aporta el cliente a la comisión total.</div>
            {profitability.rows.length ? <div className="table-scroll profitability-table"><table><thead><tr><th>SD</th><th>Cliente</th><th>Venta procesada</th><th>Comisión generada</th><th>Ganancia % sobre venta</th><th>Participación del total</th></tr></thead><tbody>{profitability.rows.map((row) => <tr key={row.code} onClick={() => selectClient(row.code)}><td><span className="sd-badge">{row.code}</span></td><td><strong>{clientName(row.code)}</strong></td><td>{currency.format(row.transacted)}</td><td className={row.value < 0 ? 'negative' : ''}><strong>{currency.format(row.value)}</strong></td><td><span className={`margin-badge ${row.margin < 0 ? 'loss' : 'gain'}`}>{row.margin === null ? 'Sin venta' : precisePercent.format(row.margin)}</span></td><td className={row.contribution < 0 ? 'negative' : ''}>{row.contribution === null ? '—' : precisePercent.format(row.contribution)}</td></tr>)}</tbody><tfoot><tr><td colSpan="2">Total</td><td>{currency.format(profitability.transacted)}</td><td>{currency.format(profitability.commission)}</td><td>{profitability.margin === null ? '—' : precisePercent.format(profitability.margin)}</td><td>100.00%</td></tr></tfoot></table></div> : <EmptyState />}
          </section>
        </section>}

        {isAdmin && tab === 'negatives' && <section className="panel full-panel">
          <SectionTitle eyebrow="NEGATIVOS UBICADOS" title={`${negativeStats.count.toLocaleString('es-MX')} movimientos para revisar`} note={`${currentMonthLabel} · ${currentClientLabel}`} action={<button className="button primary" onClick={exportCsv} disabled={negativesLoading || !negativeDetails}><DownloadSimple size={18} /> Descargar CSV</button>} />
          <div className="negative-summary"><span>Impacto total</span><strong>{currency.format(negativeStats.impact)}</strong><small>Ordenados del más negativo al menos negativo.</small></div>
          {negativesLoading ? <div className="empty-state">Cargando movimientos negativos…</div> : negativesError ? <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{negativesError}</span><button className="button ghost" onClick={loadNegativeDetails}>Reintentar</button></div> : negativeRows.length ? <div className="table-scroll negatives-table"><table><thead><tr><th>Mes</th><th>Cliente</th><th>Producto</th><th>Comercio</th><th>Monto transaccionado</th><th>Resultado</th></tr></thead><tbody>{visibleNegativeRows.map((row, index) => <tr key={`${row.month_code}-${row.client}-${row.merchant_id}-${index}`}><td>{row.month}</td><td><button className="text-button" onClick={() => selectClient(row.client)}><strong>{row.client}</strong><small>{clientName(row.client)}</small></button></td><td>{row.product}</td><td><strong>{row.merchant || 'Sin nombre'}</strong><small>ID {row.merchant_id || '—'}</small></td><td>{currency.format(row.transaction_amount)}</td><td className="negative"><strong>{currency.format(row.commission_distributed)}</strong></td></tr>)}</tbody></table>{negativeRows.length > negativeLimit && <div className="table-pagination"><span>Mostrando {visibleNegativeRows.length} de {negativeRows.length}</span><button className="button ghost" onClick={() => setNegativeLimit((current) => current + 50)}>Mostrar 50 más</button></div>}</div> : <EmptyState />}
        </section>}

        {isAdmin && tab === 'payments' && <section className="payments-layout">
          <section className="kpi-grid payment-kpis">
            <KpiCard label="Comisión generada" value={currency.format(paymentGenerated)} note={`${currentMonthLabel} · según reporte`} icon={Money} />
            <KpiCard label="Pagado a clientes" value={currency.format(paymentPaid)} note={`${paymentHistory.length} pagos registrados`} tone="success" icon={CheckCircle} />
            <KpiCard label="Saldo pendiente" value={currency.format(paymentPending)} note={`${pendingClients} clientes por pagar`} tone={paymentPending > 0 ? 'warning' : paymentPending < 0 ? 'danger' : 'success'} icon={paymentPending > 0 ? WarningCircle : CheckCircle} />
            <KpiCard label="Avance de pagos" value={paymentGenerated > 0 ? percent.format(paymentPaid / paymentGenerated) : '—'} note={paymentGenerated > 0 ? `${currency.format(paymentPaid)} de ${currency.format(paymentGenerated)}` : 'Sin comisiones positivas'} icon={ChartBar} />
          </section>

          {paymentError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{paymentError}</span></div>}

          {paymentOpen && <form className="panel payment-form" onSubmit={savePayment}>
            <SectionTitle eyebrow={editingPayment ? 'EDITAR MOVIMIENTO' : 'NUEVO MOVIMIENTO'} title={editingPayment ? 'Modificar pago' : 'Registrar pago a cliente'} note="El saldo se actualiza al guardar." action={<button type="button" className="icon-button" onClick={closePaymentForm} aria-label="Cerrar formulario"><X size={20} /></button>} />
            <div className="payment-form-grid">
              <label>Cliente<select required value={paymentForm.clientCode} onChange={(event) => setPaymentForm((current) => ({ ...current, clientCode: event.target.value }))}>{clientOptions.map((code) => <option value={code} key={code}>{code} · {clientName(code)}</option>)}</select></label>
              <label>Mes de comisión<select required value={paymentForm.periodCode} onChange={(event) => setPaymentForm((current) => ({ ...current, periodCode: event.target.value }))}>{MONTHS.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
              <label>Fecha de pago<input required type="date" value={paymentForm.paidAt} onChange={(event) => setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))} /></label>
              <label>Importe pagado<input required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></label>
              <label>Referencia<input maxLength="120" placeholder="Transferencia, folio o cheque" value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} /></label>
              <label className="notes-field">Notas<input maxLength="500" placeholder="Comentario opcional" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>
            <div className="form-actions"><button type="button" className="button ghost" onClick={closePaymentForm}>Cancelar</button><button type="submit" className="button primary" disabled={paymentSaving}>{paymentSaving ? 'Guardando…' : editingPayment ? 'Guardar cambios' : 'Registrar pago'}</button></div>
          </form>}

          <article className="panel full-panel payment-balance-panel">
            <SectionTitle eyebrow="CONTROL POR CLIENTE" title={`Generado, pagado y pendiente · ${currentMonthLabel}`} note="Las comisiones vienen del reporte; los pagos se capturan aquí." action={<button className="button primary" onClick={() => openNewPayment()}><Plus size={18} weight="bold" /> Nuevo pago</button>} />
            {paymentsLoading ? <div className="empty-state">Cargando pagos…</div> : paymentBalances.length ? <div className="table-scroll"><table className="payments-table"><thead><tr><th>Cliente</th><th>Comisión generada</th><th>Pagado</th><th>Pendiente</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{paymentBalances.map((row) => {
              const status = row.generated <= 0 ? 'no-payable' : row.pending < -0.009 ? 'overpaid' : row.pending <= 0.009 ? 'paid' : row.paid > 0 ? 'partial' : 'pending';
              const labels = { 'no-payable': 'No pagable', overpaid: 'Sobrepago', paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente' };
              return <tr key={row.code}><td><span className="sd-badge">{row.code}</span><strong>{clientName(row.code)}</strong></td><td className={row.generated < 0 ? 'negative' : ''}>{currency.format(row.generated)}</td><td>{currency.format(row.paid)}</td><td className={row.pending < 0 ? 'negative' : ''}><strong>{currency.format(row.pending)}</strong></td><td><span className={`payment-status ${status}`}>{labels[status]}</span></td><td><button className="small-action" onClick={() => openNewPayment(row.code)} disabled={row.generated <= 0}><Plus size={15} /> Pagar</button></td></tr>;
            })}</tbody><tfoot><tr><td>Total</td><td>{currency.format(paymentGenerated)}</td><td>{currency.format(paymentPaid)}</td><td>{currency.format(paymentPending)}</td><td colSpan="2"></td></tr></tfoot></table></div> : <EmptyState />}
          </article>

          <article className="panel full-panel payment-history-panel">
            <SectionTitle eyebrow="HISTORIAL DE PAGOS" title={`${paymentHistory.length} movimientos registrados`} note={`${currentMonthLabel} · ${currentClientLabel}`} action={paymentHistory.length > 0 ? <button className="button ghost" onClick={exportCsv}><DownloadSimple size={18} /> Descargar CSV</button> : null} />
            {paymentsLoading ? <div className="empty-state">Cargando movimientos…</div> : paymentHistory.length ? <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Mes</th><th>Cliente</th><th>Pago</th><th>Referencia / notas</th><th>Acciones</th></tr></thead><tbody>{paymentHistory.map((payment) => <tr key={payment.id}><td>{payment.paidAt}</td><td>{monthName(payment.periodCode)}</td><td><strong>{payment.clientCode} · {clientName(payment.clientCode)}</strong></td><td><strong>{currency.format(payment.amount)}</strong></td><td><strong>{payment.reference || 'Sin referencia'}</strong><small className="payment-note">{payment.notes || 'Sin notas'}</small></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEditPayment(payment)} aria-label="Editar pago"><PencilSimple size={17} /></button><button className="icon-button danger" onClick={() => deletePayment(payment)} aria-label="Eliminar pago"><Trash size={17} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state compact-empty"><NotePencil size={32} /><strong>Aún no hay pagos registrados</strong><span>Usa “Nuevo pago” para comenzar el control.</span></div>}
          </article>
        </section>}

        {tab === 'documents' && <section className="documents-layout">
          {documentError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{documentError}</span></div>}

          {!documentDraft && <article className="panel document-upload-panel">
            <SectionTitle eyebrow={isAdmin ? 'CARGA DE DOCUMENTOS' : 'MI ESPACIO PERSONAL'} title="Extraer información de un reporte" note="Usa el PDF digital original de Helix. Antes de guardar podrás revisar y corregir las cifras." />
            <label className={`upload-zone ${documentExtracting ? 'busy' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!documentExtracting) chooseDocument(event.dataTransfer.files?.[0]); }}>
              <input type="file" accept="application/pdf,.pdf" disabled={documentExtracting} onClick={(event) => { event.currentTarget.value = ''; }} onChange={(event) => chooseDocument(event.target.files?.[0])} />
              {documentExtracting ? <><FilePdf size={42} weight="duotone" /><strong>Extrayendo información…</strong><span>Puede tardar unos segundos según el tamaño del PDF.</span></> : <><UploadSimple size={42} weight="duotone" /><strong>Arrastra aquí el PDF o haz clic para buscarlo</strong><span>Formato PDF · máximo 20 MB · documentos digitales, no escaneados</span></>}
            </label>
            <div className="document-safety"><CheckCircle size={20} weight="fill" /><div><strong>Revisión obligatoria</strong><span>La extracción nunca cambia comisiones, pagos ni conciliaciones sin tu confirmación.</span></div></div>
          </article>}

          {documentDraft && <DocumentReview draft={documentDraft} confirmed={documentConfirmed} onConfirmed={setDocumentConfirmed} onChange={updateExtraction} onCancel={() => { setDocumentDraft(null); setDocumentConfirmed(false); setDocumentError(''); }} onSave={saveDocument} saving={documentSaving} />}

          <article className="panel full-panel document-history-panel">
            <SectionTitle eyebrow={isAdmin ? 'ARCHIVO DOCUMENTAL' : 'MIS DOCUMENTOS'} title={`${documents.length} documentos guardados`} note={isAdmin ? 'Cada archivo muestra quién lo cargó.' : 'Solo tú y el administrador pueden ver estos archivos.'} />
            {documentsLoading ? <div className="empty-state">Cargando documentos…</div> : documents.length ? <div className="table-scroll"><table><thead><tr><th>Documento</th>{isAdmin && <th>Usuario</th>}<th>Periodo</th><th>Total detectado</th><th>Confianza</th><th>Fecha de carga</th><th>Acciones</th></tr></thead><tbody>{documents.map((document) => {
              const extraction = document.extracted || {};
              const period = extraction.selectedMonth ? `${monthName(extraction.selectedMonth)} ${extraction.year || ''}` : extraction.months?.length ? `${extraction.months.length} meses · ${extraction.year || ''}` : 'Por revisar';
              return <tr key={document.id}><td><div className="document-name"><FilePdf size={24} weight="duotone" /><div><strong>{document.fileName}</strong><small>{formatBytes(document.sizeBytes)} · {extraction.pageCount || '—'} páginas</small></div></div></td>{isAdmin && <td><strong>{document.ownerEmail || 'Administrador / archivo anterior'}</strong></td>}<td>{period}</td><td><strong>{extraction.summary?.totalPayable == null ? '—' : currency.format(extraction.summary.totalPayable)}</strong></td><td><span className={`confidence-badge ${extraction.confidence || 'baja'}`}>{extraction.confidence || 'baja'}</span></td><td>{new Date(document.createdAt).toLocaleDateString('es-MX')}</td><td><div className="row-actions"><button type="button" className="icon-button" onClick={() => downloadDocument(document)} aria-label={`Descargar ${document.fileName}`}><DownloadSimple size={17} /></button><button className="icon-button danger" onClick={() => deleteDocument(document)} aria-label={`Eliminar ${document.fileName}`}><Trash size={17} /></button></div></td></tr>;
            })}</tbody></table></div> : <div className="empty-state compact-empty"><FilePdf size={34} /><strong>Aún no hay documentos</strong><span>Sube el primer reporte para extraer y guardar su información.</span></div>}
          </article>
        </section>}

        {isAdmin && tab === 'users' && <section className="users-layout">
          {userError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{userError}</span></div>}

          {createdCredential && <div className="credential-card" role="status"><div><strong>Acceso temporal creado</strong><span>Comparte estos datos de forma privada. La contraseña se mostrará solo aquí.</span></div><dl><div><dt>Correo</dt><dd>{createdCredential.email}</dd></div><div><dt>Contraseña temporal</dt><dd>{createdCredential.password}</dd></div></dl><button className="button ghost" type="button" onClick={() => navigator.clipboard?.writeText(`Correo: ${createdCredential.email}\nContraseña temporal: ${createdCredential.password}`)}>Copiar acceso</button><button className="icon-button" type="button" onClick={() => setCreatedCredential(null)} aria-label="Cerrar acceso temporal"><X size={18} /></button></div>}

          {userOpen && <form className="panel user-form" onSubmit={saveUser}>
            <SectionTitle eyebrow="NUEVO ACCESO" title="Crear usuario" note="El sistema generará una contraseña temporal para entrar con este correo, sin cuenta de ChatGPT." action={<button type="button" className="icon-button" onClick={() => setUserOpen(false)} aria-label="Cerrar formulario"><X size={20} /></button>} />
            <div className="user-form-grid">
              <label>Nombre<input required maxLength="100" value={userForm.fullName} onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nombre completo" /></label>
              <label>Correo de acceso<input required type="email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} placeholder="usuario@empresa.com" /></label>
              <label>Cliente relacionado<select value={userForm.clientCode} onChange={(event) => setUserForm((current) => ({ ...current, clientCode: event.target.value }))}><option value="">Sin cliente asignado</option>{clientOptions.map((code) => <option key={code} value={code}>{code} · {clientName(code)}</option>)}</select></label>
            </div>
            <div className="form-actions"><button type="button" className="button ghost" onClick={() => setUserOpen(false)}>Cancelar</button><button className="button primary" type="submit" disabled={userSaving}>{userSaving ? 'Creando…' : 'Crear usuario'}</button></div>
          </form>}

          <article className="panel full-panel">
            <SectionTitle eyebrow="CONTROL DE ACCESO" title={`${users.filter((user) => user.active).length} usuarios activos`} note="Cada usuario ve su Ficha 360° y únicamente los documentos de su cuenta." action={<button className="button primary" onClick={openNewUser}><Plus size={18} weight="bold" /> Nuevo usuario</button>} />
            <div className="callout access-callout"><strong>Acceso protegido:</strong> cada persona entra con su correo y ve únicamente el cliente y los documentos asignados. No necesita ChatGPT.</div>
            {usersLoading ? <div className="empty-state">Cargando usuarios…</div> : <div className="table-scroll"><table className="users-table"><thead><tr><th>Usuario</th><th>Correo</th><th>Cliente</th><th>Permiso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.email} className={user.resetRequestedAt ? 'reset-requested-row' : ''}><td><div className="user-name-cell"><span>{(user.fullName || user.email).slice(0, 1).toUpperCase()}</span><strong>{user.fullName || 'Sin nombre'}</strong></div></td><td>{user.email}{user.resetRequestedAt && <small className="reset-request-label">Solicitó nueva contraseña</small>}</td><td>{user.clientCode ? `${user.clientCode} · ${clientName(user.clientCode)}` : 'Sin asignar'}</td><td><span className={`role-badge ${user.role}`}>{user.role === 'admin' ? 'Administrador' : 'Portal propio'}</span></td><td><span className={`account-status ${user.active ? 'active' : 'inactive'}`}>{user.active ? user.mustChangePassword ? 'Contraseña temporal' : 'Activo' : 'Suspendido'}</span></td><td>{user.isOwner ? <span className="owner-label">Propietario</span> : <div className="user-row-actions"><button className="small-action" onClick={() => resetUserPassword(user)}>{user.resetRequestedAt ? 'Atender solicitud' : 'Restablecer clave'}</button><button className={`small-action ${user.active ? 'danger-action' : ''}`} onClick={() => toggleUser(user)}>{user.active ? 'Suspender' : 'Reactivar'}</button></div>}</td></tr>)}</tbody></table></div>}
          </article>
        </section>}

        {isAdmin && tab === 'checks' && <section className="checks-layout">
          <section className="kpi-grid reconciliation-kpis">
            <KpiCard label="Diferencias localizadas" value={reconciliationsLoading ? '…' : reconciliations.length.toLocaleString('es-MX')} note="mes · cliente · producto" tone="warning" icon={WarningCircle} />
            <KpiCard label="Pendientes" value={reconciliationCounts.pending.toLocaleString('es-MX')} note="todavía sin revisar" tone={reconciliationCounts.pending ? 'danger' : 'success'} icon={WarningCircle} />
            <KpiCard label="En revisión" value={reconciliationCounts.reviewing.toLocaleString('es-MX')} note="con seguimiento abierto" tone="warning" icon={NotePencil} />
            <KpiCard label="Revisadas" value={reconciliationCounts.resolved.toLocaleString('es-MX')} note="marcadas por el administrador" tone="success" icon={CheckCircle} />
          </section>

          {reconciliationError && <div className="payment-message error" role="alert"><WarningCircle size={20} weight="fill" /><span>{reconciliationError}</span><button className="button ghost" onClick={loadReconciliations}>Reintentar</button></div>}

          {selectedReconciliation && <form className="panel reconciliation-review" onSubmit={saveReconciliation}>
            <SectionTitle eyebrow="REVISAR DIFERENCIA" title={`${selectedReconciliation.month} · ${selectedReconciliation.clientCode} · ${clientName(selectedReconciliation.clientCode)} · ${selectedReconciliation.product}`} note="Cambiar el estado o agregar una nota no modifica ningún monto financiero." action={<button type="button" className="icon-button" onClick={() => setSelectedReconciliation(null)} aria-label="Cerrar revisión"><X size={20} /></button>} />
            <div className="reconciliation-compare">
              <article><span>Resumen · venta</span><strong>{currency.format(selectedReconciliation.summarySale)}</strong><small>Comisión {currency.format(selectedReconciliation.summaryCommission)}</small></article>
              <article><span>Operaciones · venta</span><strong>{currency.format(selectedReconciliation.detailSale)}</strong><small>Comisión {currency.format(selectedReconciliation.detailCommission)}</small></article>
              <article className="difference"><span>Diferencia operaciones − resumen</span><strong>{currency.format(selectedReconciliation.saleDifference)}</strong><small>Comisión {currency.format(selectedReconciliation.commissionDifference)}</small></article>
            </div>
            <div className="review-form-grid">
              <label>Estado<select value={reconciliationForm.status} onChange={(event) => setReconciliationForm((current) => ({ ...current, status: event.target.value }))}><option value="pending">Pendiente</option><option value="reviewing">En revisión</option><option value="resolved">Revisado</option></select></label>
              <label>Nota de revisión<textarea maxLength="1000" value={reconciliationForm.notes} onChange={(event) => setReconciliationForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Qué encontraste, quién lo validó o qué falta revisar…" /></label>
            </div>
            <div className="form-actions"><button type="button" className="button ghost" onClick={() => selectClient(selectedReconciliation.clientCode)}>Abrir ficha 360</button><button className="button primary" type="submit" disabled={reconciliationSaving}>{reconciliationSaving ? 'Guardando…' : 'Guardar revisión'}</button></div>
          </form>}

          <article className="panel full-panel">
            <SectionTitle eyebrow="CENTRO DE CONCILIACIÓN" title={`${reconciliations.length} diferencias entre resumen y operaciones`} note="Los importes oficiales y el detalle se conservan por separado. Nada se corrige automáticamente." action={<div className="status-filters" role="group" aria-label="Filtrar conciliaciones">{[['all', 'Todas'], ['pending', 'Pendientes'], ['reviewing', 'En revisión'], ['resolved', 'Revisadas']].map(([value, label]) => <button type="button" key={value} className={reconciliationFilter === value ? 'active' : ''} onClick={() => setReconciliationFilter(value)}>{label}</button>)}</div>} />
            {reconciliationsLoading ? <div className="empty-state compact-detail-loading">Cargando conciliaciones…</div> : visibleReconciliations.length ? <div className="table-scroll reconciliation-table"><table><thead><tr><th>Mes</th><th>Cliente</th><th>Producto</th><th>Venta resumen</th><th>Venta operaciones</th><th>Diferencia comisión</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{visibleReconciliations.map((issue) => <tr key={issue.id}><td><strong>{issue.month}</strong></td><td><button className="text-button" onClick={() => selectClient(issue.clientCode)}><strong>{issue.clientCode} · {clientName(issue.clientCode)}</strong></button></td><td><strong>{issue.product}</strong><small>{issue.operationCount} operaciones</small></td><td>{currency.format(issue.summarySale)}</td><td>{currency.format(issue.detailSale)}</td><td className={Math.abs(issue.commissionDifference) > 0.05 ? 'negative' : ''}><strong>{currency.format(issue.commissionDifference)}</strong></td><td><span className={`review-status ${issue.status}`}>{issue.status === 'resolved' ? 'Revisado' : issue.status === 'reviewing' ? 'En revisión' : 'Pendiente'}</span>{issue.notes && <small className="review-note">Con nota</small>}</td><td><button className="small-action" onClick={() => reviewReconciliation(issue)}>{issue.status === 'pending' ? 'Revisar' : 'Abrir'}</button></td></tr>)}</tbody></table></div> : <EmptyState />}
            <div className="callout"><strong>Regla de control:</strong> “Diferencia” = suma de operaciones − importe del resumen. El estado y las notas sirven únicamente para seguimiento; no cambian ventas ni comisiones.</div>
          </article>
        </section>}
      </main>

      <footer className="page-footer"><span>{isAdmin ? 'Helix (12) · Informe ejecutivo' : `Helix · Ficha personal ${session.clientCode || ''}`}</span><span>{isAdmin ? 'Fuente: 7 carátulas mensuales · Elaborado agosto 2026' : `Sesión: ${session.email}`}</span></footer>
    </div>
  );
}
