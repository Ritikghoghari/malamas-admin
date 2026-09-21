"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ── auth helpers ── */
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("ma_token") : null; }
function setToken(t) { localStorage.setItem("ma_token", t); }
function clearToken() { localStorage.removeItem("ma_token"); }

/* ── format helpers ── */
function fmt(n) { return Number(n).toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s, short = false) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("el-GR", short
    ? { day: "2-digit", month: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUSES = ["pending", "on-hold", "processing", "completed", "cancelled", "refunded", "failed"];
const STATUS = {
  pending:    { label: "Αναμονή",      color: "#f97316", bg: "rgba(249,115,22,.15)" },
  "on-hold":  { label: "Αναμονή",      color: "#d97706", bg: "rgba(217,119,6,.15)" },
  processing: { label: "Επεξεργασία",  color: "#16a34a", bg: "rgba(22,163,74,.15)" },
  completed:  { label: "Ολοκλ/θηκε",  color: "#6366f1", bg: "rgba(99,102,241,.15)" },
  cancelled:  { label: "Ακυρώθηκε",   color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  refunded:   { label: "Επιστράφηκε", color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  failed:     { label: "Απέτυχε",      color: "#ef4444", bg: "rgba(239,68,68,.15)" },
};

function Badge({ status }) {
  const s = STATUS[status] || { label: status, color: "var(--text-muted)", bg: "rgba(255,255,255,.08)" };
  return <span style={{ background: s.bg, color: s.color, fontSize: ".72rem", fontWeight: 700, borderRadius: "100px", padding: "3px 10px", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Stat({ label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "22px 24px", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ color: "var(--text-muted)", fontSize: ".78rem", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: accent || "var(--text-primary)", letterSpacing: "-.02em" }}>{value}</div>
      {sub && <div style={{ color: "var(--text-muted)", fontSize: ".74rem", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

/* ── Revenue Chart (SVG) ── */
function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;
  const W = 700, H = 140, PAD = { t: 16, r: 16, b: 32, l: 50 };
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const barW = Math.floor(innerW / data.length) - 2;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
      <div style={{ fontWeight: 700, fontSize: ".9rem", marginBottom: "16px" }}>Έσοδα — Τελευταίες 30 ημέρες</div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: "400px", display: "block" }}>
          {/* y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = PAD.t + innerH * (1 - f);
            return (
              <g key={f}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{Math.round(maxRev * f)}€</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = PAD.l + i * (innerW / data.length);
            const bh = Math.max(2, (d.revenue / maxRev) * innerH);
            const by = PAD.t + innerH - bh;
            const showLabel = i % 5 === 0 || i === data.length - 1;
            return (
              <g key={d.day}>
                <rect x={x + 1} y={by} width={barW} height={bh} fill="var(--accent)" rx="3" opacity="0.85" />
                {showLabel && <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{d.day.slice(5)}</text>}
                {d.revenue > 0 && (
                  <title>{d.day}: {fmt(d.revenue)}€ ({d.count} παραγγελίες)</title>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ── Login ── */
function Login({ onLogin }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Σφάλμα."); setLoading(false); return; }
    setToken(data.token); onLogin();
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "360px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>❄️</div>
          <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>Μάλαμας Admin</div>
          <div style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: "4px" }}>Εισάγετε τον κωδικό πρόσβασης</div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Κωδικός" required autoFocus
            style={{ padding: "13px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: ".95rem", outline: "none" }} />
          {err && <div style={{ color: "var(--danger)", fontSize: ".83rem" }}>{err}</div>}
          <button type="submit" disabled={loading} style={{ padding: "13px", borderRadius: "100px", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontWeight: 700, opacity: loading ? .7 : 1 }}>
            {loading ? "…" : "Σύνδεση"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Sidebar ── */
const NAV = [
  { id: "overview",  label: "Επισκόπηση",  icon: "📊" },
  { id: "orders",    label: "Παραγγελίες", icon: "📦" },
  { id: "products",  label: "Προϊόντα",    icon: "🐟" },
  { id: "customers", label: "Πελάτες",     icon: "👥" },
];

function Sidebar({ active, setActive, onLogout }) {
  return (
    <div style={{ width: "220px", minHeight: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 10 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: "1.3rem" }}>❄️</div>
        <div style={{ fontWeight: 800, fontSize: "1rem" }}>Μάλαμας</div>
        <div style={{ color: "var(--text-muted)", fontSize: ".75rem" }}>Admin Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setActive(n.id)} style={{
            display: "flex", alignItems: "center", gap: "10px", width: "100%",
            padding: "10px 12px", borderRadius: "var(--radius)", border: "none", cursor: "pointer",
            background: active === n.id ? "var(--accent-light)" : "transparent",
            color: active === n.id ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: active === n.id ? 700 : 500, fontSize: ".9rem", marginBottom: "4px", textAlign: "left",
            borderLeft: active === n.id ? "3px solid var(--accent)" : "3px solid transparent",
          }}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
        <button onClick={onLogout} style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: ".85rem", cursor: "pointer" }}>
          Αποσύνδεση
        </button>
      </div>
    </div>
  );
}

/* ── Order Detail Modal ── */
function OrderModal({ orderId, apiGet, apiPatch, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    apiGet(`section=order&id=${orderId}`).then((d) => {
      setOrder(d.order || null);
      setNewStatus(d.order?.status || "");
      setLoading(false);
    });
  }, [orderId, apiGet]);

  async function updateStatus() {
    if (!newStatus || newStatus === order.status) return;
    setUpdatingStatus(true);
    const res = await apiPatch({ type: "order_status", id: orderId, value: newStatus });
    if (res.ok) setOrder((o) => ({ ...o, status: res.status }));
    setUpdatingStatus(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: "1rem" }}>Παραγγελία {order ? `#${order.number}` : "…"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Φόρτωση…</div>
        ) : !order ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>Δεν βρέθηκε παραγγελία.</div>
        ) : (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Status update */}
            <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: ".85rem", color: "var(--text-muted)", flexShrink: 0 }}>Κατάσταση:</span>
              <Badge status={order.status} />
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: ".85rem", cursor: "pointer" }}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]?.label || s}</option>)}
              </select>
              <button onClick={updateStatus} disabled={updatingStatus || newStatus === order.status}
                style={{ padding: "7px 18px", borderRadius: "100px", border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", opacity: updatingStatus || newStatus === order.status ? .5 : 1 }}>
                {updatingStatus ? "…" : "Αποθήκευση"}
              </button>
            </div>

            {/* Customer */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: "10px", fontSize: ".88rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Πελάτης</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: ".88rem" }}>
                {[
                  ["Όνομα", `${order.billing?.first_name} ${order.billing?.last_name}`],
                  ["Email", order.billing?.email],
                  ["Τηλέφωνο", order.billing?.phone],
                  ["Πόλη", `${order.billing?.city || ""} ${order.billing?.postcode || ""}`.trim()],
                  ["Διεύθυνση", order.billing?.address_1],
                  ["Τρόπος πληρωμής", order.payment_method_title],
                ].map(([k, v]) => v ? (
                  <div key={k}><span style={{ color: "var(--text-muted)" }}>{k}: </span><span style={{ fontWeight: 600 }}>{v}</span></div>
                ) : null)}
              </div>
              {order.customer_note && (
                <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(251,146,60,.1)", borderRadius: "var(--radius)", fontSize: ".85rem", color: "#f97316" }}>
                  💬 {order.customer_note}
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: "10px", fontSize: ".88rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Προϊόντα</div>
              {(order.line_items || []).map((li, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: ".88rem" }}>
                  <span>{li.name} <span style={{ color: "var(--text-muted)" }}>× {li.quantity}</span></span>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>{fmt(li.total)}€</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", fontWeight: 800, fontSize: "1rem" }}>
                Σύνολο: <span style={{ color: "#16a34a", marginLeft: "8px" }}>{fmt(order.total)}€</span>
              </div>
            </div>

            <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>Παραγγελία: {fmtDate(order.date_created)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Overview ── */
function Overview({ data, setActive }) {
  const { stats, chartData, recentOrders, topProducts, outOfStockProducts } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "12px" }}>
        <Stat label="Έσοδα (50 τελ.)" value={`${fmt(stats.totalRevenue)}€`} accent="var(--accent)" />
        <Stat label="Έσοδα Σήμερα" value={`${fmt(stats.todayRevenue)}€`} />
        <Stat label="Παραγγελίες Σήμερα" value={stats.todayOrders} />
        <Stat label="Σε Αναμονή" value={stats.pendingOrders} accent={stats.pendingOrders > 0 ? "#f97316" : undefined} onClick={() => setActive("orders")} />
        <Stat label="Σε Επεξεργασία" value={stats.processingOrders} onClick={() => setActive("orders")} />
        <Stat label="Εκτός Αποθέματος" value={stats.outOfStock} accent={stats.outOfStock > 0 ? "var(--danger)" : undefined} onClick={() => setActive("products")} />
        <Stat label="Χαμηλό Απόθ. (≤5)" value={stats.lowStock} accent={stats.lowStock > 0 ? "#f97316" : undefined} />
        <Stat label="Σύνολο Προϊόντων" value={stats.totalProducts} />
      </div>

      <RevenueChart data={chartData} />

      {outOfStockProducts.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
          <div style={{ color: "var(--danger)", fontWeight: 700, marginBottom: "10px", fontSize: ".88rem" }}>⚠️ Εκτός Αποθέματος</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {outOfStockProducts.map((p) => <span key={p.id} style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", fontSize: ".78rem", fontWeight: 600, padding: "4px 12px", borderRadius: "100px" }}>{p.name}</span>)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px" }}>
        <OrdersTable orders={recentOrders} title="Πρόσφατες Παραγγελίες" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: ".88rem" }}>Top 10 Προϊόντα</div>
          <div style={{ padding: "10px 16px" }}>
            {topProducts.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < topProducts.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--text-muted)", fontSize: ".78rem", fontWeight: 700, width: "22px" }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".84rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".74rem" }}>{p.total_sales} πωλ. · {fmt(p.price)}€</div>
                </div>
                <span style={{ fontSize: ".7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: p.stock_status === "instock" ? "rgba(22,163,74,.12)" : "rgba(239,68,68,.12)", color: p.stock_status === "instock" ? "var(--success)" : "var(--danger)" }}>
                  {p.stock_status === "instock" ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Orders Table (shared) ── */
function OrdersTable({ orders, title, onRowClick }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {title && <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: ".88rem" }}>{title}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".83rem" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {["#", "Πελάτης", "Ημ/νία", "Σύνολο", "Τρόπος", "Κατάσταση"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} onClick={() => onRowClick && onRowClick(o.id)}
                style={{ borderBottom: "1px solid var(--border)", cursor: onRowClick ? "pointer" : "default", transition: "background .15s" }}
                onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => onRowClick && (e.currentTarget.style.background = "")}>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--accent)" }}>#{o.number}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{o.billing?.first_name} {o.billing?.last_name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".76rem" }}>{o.billing?.email}</div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".8rem", whiteSpace: "nowrap" }}>{fmtDate(o.date_created, true)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#16a34a" }}>{fmt(o.total)}€</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".78rem" }}>{o.payment_method_title || "—"}</td>
                <td style={{ padding: "11px 14px" }}><Badge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>Δεν βρέθηκαν παραγγελίες.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Orders Section ── */
function OrdersSection({ apiGet, apiPatch }) {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    let params = `section=orders&page=${page}&status=${status}&search=${encodeURIComponent(search)}`;
    if (dateFrom) params += `&dateFrom=${dateFrom}`;
    if (dateTo) params += `&dateTo=${dateTo}`;
    apiGet(params).then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, [page, status, search, dateFrom, dateTo, apiGet]);

  useEffect(() => { load(); }, [load]);

  async function exportCSV() {
    setExporting(true);
    const t = getToken();
    let params = `section=export&status=${status}`;
    if (dateFrom) params += `&dateFrom=${dateFrom}`;
    if (dateTo) params += `&dateTo=${dateTo}`;
    const res = await fetch(`/api/data?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {selectedOrderId && <OrderModal orderId={selectedOrderId} apiGet={apiGet} apiPatch={apiPatch} onClose={() => { setSelectedOrderId(null); load(); }} />}

      {/* Filters */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: ".76rem", color: "var(--text-muted)" }}>Αναζήτηση</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setSearch(searchInput), setPage(1))} placeholder="Όνομα, email, #" style={inputStyle} />
            <button onClick={() => { setSearch(searchInput); setPage(1); }} style={btnStyle}>🔍</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: ".76rem", color: "var(--text-muted)" }}>Από</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: ".76rem", color: "var(--text-muted)" }}>Έως</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={inputStyle} />
        </div>
        <button onClick={() => { setSearch(""); setSearchInput(""); setDateFrom(""); setDateTo(""); setStatus(""); setPage(1); }} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text-muted)" }}>Καθαρισμός</button>
        <button onClick={exportCSV} disabled={exporting} style={{ ...btnStyle, marginLeft: "auto", background: "rgba(22,163,74,.15)", color: "#16a34a", border: "1px solid rgba(22,163,74,.3)" }}>
          {exporting ? "…" : "⬇ CSV"}
        </button>
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {["", ...STATUSES].map((s) => {
          const info = s ? STATUS[s] : null;
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{
              padding: "6px 14px", borderRadius: "100px", border: "1px solid var(--border)", cursor: "pointer",
              background: status === s ? (info?.bg || "var(--accent-light)") : "var(--surface-2)",
              color: status === s ? (info?.color || "var(--accent)") : "var(--text-muted)",
              fontWeight: status === s ? 700 : 500, fontSize: ".8rem",
            }}>{s ? (STATUS[s]?.label || s) : "Όλες"}</button>
          );
        })}
      </div>

      {loading ? <div style={{ color: "var(--text-muted)", padding: "24px" }}>Φόρτωση…</div> : <OrdersTable orders={orders} onRowClick={setSelectedOrderId} />}

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnStyle, opacity: page === 1 ? .4 : 1 }}>← Προηγ.</button>
        <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Σελίδα {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={orders.length < 20} style={{ ...btnStyle, opacity: orders.length < 20 ? .4 : 1 }}>Επόμ. →</button>
      </div>
    </div>
  );
}

/* ── Products Section ── */
function ProductsSection({ apiGet, apiPatch }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editingStock, setEditingStock] = useState(null);
  const [stockVal, setStockVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet("section=products").then((d) => { setProducts(d.products || []); setLoading(false); });
  }, [apiGet]);

  const filtered = filter === "all" ? products
    : filter === "outofstock" ? products.filter((p) => p.stock_status !== "instock")
    : products.filter((p) => p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_status === "instock");

  async function saveStock(productId) {
    setSaving(true);
    const res = await apiPatch({ type: "stock", id: productId, value: stockVal });
    if (res.ok) {
      setProducts((ps) => ps.map((p) => p.id === productId ? { ...p, stock_quantity: res.stock_quantity, stock_status: res.stock_status } : p));
    }
    setEditingStock(null); setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        {[["all", "Όλα"], ["outofstock", "Εκτός Αποθ."], ["low", "Χαμηλό Απόθ."]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "6px 14px", borderRadius: "100px", border: "1px solid var(--border)", cursor: "pointer", background: filter === v ? "var(--accent-light)" : "var(--surface-2)", color: filter === v ? "var(--accent)" : "var(--text-muted)", fontWeight: filter === v ? 700 : 500, fontSize: ".8rem" }}>{l}</button>
        ))}
      </div>
      {loading ? <div style={{ color: "var(--text-muted)", padding: "24px" }}>Φόρτωση…</div> : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".83rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["", "Προϊόν", "Τιμή", "Κατηγορία", "Πωλήσεις", "Απόθεμα", ""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const catName = p.categories?.[0]?.name || "—";
                  const isLow = p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_status === "instock";
                  const isEditing = editingStock === p.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 10px", width: "44px" }}>
                        {p.images?.[0]?.src && <img src={p.images[0].src} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "8px" }} />}
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "11px 14px", color: "var(--accent)", fontWeight: 700 }}>{fmt(p.price)}€</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".8rem" }}>{catName}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{p.total_sales}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {p.stock_status !== "instock"
                          ? <span style={{ color: "var(--danger)", fontWeight: 700, fontSize: ".8rem" }}>Εξαντλήθηκε</span>
                          : isLow
                            ? <span style={{ color: "#f97316", fontWeight: 700, fontSize: ".8rem" }}>⚠ {p.stock_quantity}</span>
                            : <span style={{ color: "var(--success)", fontSize: ".8rem" }}>✓ {p.stock_quantity !== null ? p.stock_quantity : "OK"}</span>
                        }
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input type="number" value={stockVal} onChange={(e) => setStockVal(e.target.value)} style={{ ...inputStyle, width: "70px" }} autoFocus />
                            <button onClick={() => saveStock(p.id)} disabled={saving} style={{ ...btnStyle, background: "var(--accent)", color: "#fff" }}>{saving ? "…" : "✓"}</button>
                            <button onClick={() => setEditingStock(null)} style={{ ...btnStyle, background: "var(--surface-2)" }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingStock(p.id); setStockVal(p.stock_quantity ?? ""); }} style={{ ...btnStyle, fontSize: ".76rem", background: "var(--surface-2)", color: "var(--text-muted)" }}>Απόθεμα</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Customers Section ── */
function CustomersSection({ apiGet }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    apiGet(`section=customers&page=${page}&search=${encodeURIComponent(search)}`).then((d) => {
      setCustomers(d.customers || []); setLoading(false);
    });
  }, [page, search, apiGet]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setSearch(searchInput), setPage(1))} placeholder="Αναζήτηση πελάτη..." style={{ ...inputStyle, maxWidth: "280px" }} />
        <button onClick={() => { setSearch(searchInput); setPage(1); }} style={btnStyle}>🔍</button>
        {search && <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text-muted)" }}>✕</button>}
      </div>
      {loading ? <div style={{ color: "var(--text-muted)", padding: "24px" }}>Φόρτωση…</div> : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".83rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Πελάτης", "Email", "Τηλέφωνο", "Παραγγελίες", "Σύνολο Δαπάνης", "Εγγραφή"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{c.email}</td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{c.billing?.phone || "—"}</td>
                    <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700 }}>{c.orders_count}</td>
                    <td style={{ padding: "11px 14px", color: "var(--accent)", fontWeight: 700 }}>{fmt(c.total_spent)}€</td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".8rem" }}>{fmtDate(c.date_created, true)}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>Δεν βρέθηκαν πελάτες.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnStyle, opacity: page === 1 ? .4 : 1 }}>← Προηγ.</button>
        <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Σελίδα {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={customers.length < 20} style={{ ...btnStyle, opacity: customers.length < 20 ? .4 : 1 }}>Επόμ. →</button>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const inputStyle = { padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: ".85rem", outline: "none" };
const btnStyle = { padding: "8px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: ".83rem", cursor: "pointer", whiteSpace: "nowrap" };

/* ── App ── */
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState("overview");
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => { if (getToken()) setAuthed(true); setChecked(true); }, []);

  const apiGet = useCallback(async (params) => {
    const t = getToken();
    const res = await fetch(`/api/data?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) { clearToken(); setAuthed(false); return {}; }
    return res.json();
  }, []);

  const apiPatch = useCallback(async (body) => {
    const t = getToken();
    const res = await fetch("/api/data", { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 401) { clearToken(); setAuthed(false); return {}; }
    return res.json();
  }, []);

  useEffect(() => {
    if (!authed || active !== "overview" || overviewData) return;
    setOverviewLoading(true);
    apiGet("section=overview").then((d) => { setOverviewData(d); setOverviewLoading(false); });
  }, [authed, active, overviewData, apiGet]);

  if (!checked) return null;
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active={active} setActive={setActive} onLogout={() => { clearToken(); setAuthed(false); }} />
      <main style={{ marginLeft: "220px", flex: 1, padding: "32px 36px", background: "var(--bg)", minHeight: "100vh" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem" }}>
            {NAV.find((n) => n.id === active)?.icon} {NAV.find((n) => n.id === active)?.label}
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: ".82rem", marginTop: "2px" }}>
            {new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {active === "overview" && (overviewLoading ? <div style={{ color: "var(--text-muted)" }}>Φόρτωση…</div> : overviewData ? <Overview data={overviewData} setActive={setActive} /> : null)}
        {active === "orders" && <OrdersSection apiGet={apiGet} apiPatch={apiPatch} />}
        {active === "products" && <ProductsSection apiGet={apiGet} apiPatch={apiPatch} />}
        {active === "customers" && <CustomersSection apiGet={apiGet} />}
      </main>
    </div>
  );
}
