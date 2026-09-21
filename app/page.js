"use client";
import { useState, useEffect, useCallback } from "react";

/* ── helpers ── */
function token() { return typeof window !== "undefined" ? localStorage.getItem("ma_token") : null; }
function setToken(t) { localStorage.setItem("ma_token", t); }
function clearToken() { localStorage.removeItem("ma_token"); }

function fmt(n) { return Number(n).toLocaleString("el-GR", { minimumFractionDigits: 2 }); }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

const STATUS = {
  pending:    { label: "Αναμονή",       color: "#f97316", bg: "rgba(249,115,22,.12)" },
  "on-hold":  { label: "Αναμονή",       color: "#d97706", bg: "rgba(217,119,6,.12)" },
  processing: { label: "Επεξεργασία",   color: "#16a34a", bg: "rgba(22,163,74,.12)" },
  completed:  { label: "Ολοκλ/θηκε",   color: "#6366f1", bg: "rgba(99,102,241,.12)" },
  cancelled:  { label: "Ακυρώθηκε",    color: "#ef4444", bg: "rgba(239,68,68,.12)" },
  refunded:   { label: "Επιστράφηκε",  color: "#ef4444", bg: "rgba(239,68,68,.12)" },
  failed:     { label: "Απέτυχε",       color: "#ef4444", bg: "rgba(239,68,68,.12)" },
};

function Badge({ status }) {
  const s = STATUS[status] || { label: status, color: "var(--text-muted)", bg: "rgba(255,255,255,.08)" };
  return <span style={{ background: s.bg, color: s.color, fontSize: ".72rem", fontWeight: 700, borderRadius: "100px", padding: "3px 10px", whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "22px 24px" }}>
      <div style={{ color: "var(--text-muted)", fontSize: ".78rem", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: accent || "var(--text-primary)", letterSpacing: "-.02em" }}>{value}</div>
      {sub && <div style={{ color: "var(--text-muted)", fontSize: ".74rem", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

/* ── Login ── */
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Σφάλμα."); setLoading(false); return; }
    setToken(data.token);
    onLogin();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "360px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>❄️</div>
          <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-primary)" }}>Μάλαμας Admin</div>
          <div style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: "4px" }}>Εισάγετε τον κωδικό πρόσβασης</div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Κωδικός" required autoFocus
            style={{ padding: "13px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: ".95rem", outline: "none" }}
          />
          {err && <div style={{ color: "var(--danger)", fontSize: ".83rem" }}>{err}</div>}
          <button type="submit" disabled={loading} style={{ padding: "13px", borderRadius: "100px", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: ".95rem", opacity: loading ? .7 : 1 }}>
            {loading ? "…" : "Σύνδεση"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Sidebar ── */
const NAV = [
  { id: "overview", label: "Επισκόπηση", icon: "📊" },
  { id: "orders",   label: "Παραγγελίες", icon: "📦" },
  { id: "products", label: "Προϊόντα",   icon: "🐟" },
];

function Sidebar({ active, setActive, onLogout }) {
  return (
    <div style={{ width: "220px", minHeight: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 10 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: "1.3rem", marginBottom: "2px" }}>❄️</div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>Μάλαμας</div>
        <div style={{ color: "var(--text-muted)", fontSize: ".75rem" }}>Admin Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setActive(n.id)} style={{
            display: "flex", alignItems: "center", gap: "10px", width: "100%",
            padding: "10px 12px", borderRadius: "var(--radius)", border: "none", cursor: "pointer",
            background: active === n.id ? "var(--accent-light)" : "transparent",
            color: active === n.id ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: active === n.id ? 700 : 500, fontSize: ".9rem",
            marginBottom: "4px", textAlign: "left",
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

/* ── Overview ── */
function Overview({ data }) {
  const { stats, recentOrders, topProducts, outOfStockProducts } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <Stat label="Συνολικά Έσοδα (50 τελ.)" value={`${fmt(stats.totalRevenue)}€`} accent="var(--accent)" />
        <Stat label="Έσοδα Σήμερα" value={`${fmt(stats.todayRevenue)}€`} />
        <Stat label="Παραγγελίες Σήμερα" value={stats.todayOrders} />
        <Stat label="Σε Αναμονή" value={stats.pendingOrders} accent={stats.pendingOrders > 0 ? "#f97316" : undefined} />
        <Stat label="Σε Επεξεργασία" value={stats.processingOrders} />
        <Stat label="Εκτός Αποθέματος" value={stats.outOfStock} accent={stats.outOfStock > 0 ? "var(--danger)" : undefined} />
        <Stat label="Χαμηλό Απόθεμα (≤5)" value={stats.lowStock} accent={stats.lowStock > 0 ? "#f97316" : undefined} />
        <Stat label="Σύνολο Προϊόντων" value={stats.totalProducts} />
      </div>

      {outOfStockProducts.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <div style={{ color: "var(--danger)", fontWeight: 700, marginBottom: "12px", fontSize: ".9rem" }}>⚠️ Εκτός Αποθέματος</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {outOfStockProducts.map((p) => (
              <span key={p.id} style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", fontSize: ".78rem", fontWeight: 600, padding: "4px 12px", borderRadius: "100px" }}>{p.name}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
        <OrderTable orders={recentOrders} title="Πρόσφατες Παραγγελίες" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: ".9rem" }}>Top Προϊόντα</div>
          <div style={{ padding: "12px 16px" }}>
            {topProducts.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < topProducts.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--text-muted)", fontSize: ".78rem", fontWeight: 700, width: "22px" }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".75rem" }}>{p.total_sales} πωλήσεις · {fmt(p.price)}€</div>
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

/* ── Order Table ── */
function OrderTable({ orders, title }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {title && <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: ".9rem" }}>{title}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {["#", "Πελάτης", "Ημερομηνία", "Σύνολο", "Τρόπος", "Κατάσταση"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--accent)" }}>#{o.number}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{o.billing?.first_name} {o.billing?.last_name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>{o.billing?.email}</div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: ".8rem" }}>{fmtDate(o.date_created)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#16a34a" }}>{fmt(o.total)}€</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".8rem" }}>{o.payment_method_title || "—"}</td>
                <td style={{ padding: "11px 14px" }}><Badge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Δεν βρέθηκαν παραγγελίες.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Orders Section ── */
function OrdersSection({ apiGet }) {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet(`section=orders&page=${page}&status=${status}`)
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, [page, status, apiGet]);

  const statuses = ["", "pending", "on-hold", "processing", "completed", "cancelled", "refunded", "failed"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {statuses.map((s) => {
          const info = STATUS[s] || { label: "Όλες", color: "var(--text-secondary)", bg: "var(--surface-2)" };
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{
              padding: "7px 16px", borderRadius: "100px", border: "1px solid var(--border)", cursor: "pointer",
              background: status === s ? info.bg : "var(--surface-2)",
              color: status === s ? info.color : "var(--text-muted)",
              fontWeight: status === s ? 700 : 500, fontSize: ".82rem",
            }}>
              {s ? (STATUS[s]?.label || s) : "Όλες"}
            </button>
          );
        })}
      </div>
      {loading ? <div style={{ color: "var(--text-muted)", padding: "24px" }}>Φόρτωση…</div> : <OrderTable orders={orders} />}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 18px", borderRadius: "100px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? .4 : 1 }}>← Προηγ.</button>
        <span style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: ".85rem" }}>Σελίδα {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={orders.length < 20} style={{ padding: "8px 18px", borderRadius: "100px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", cursor: orders.length < 20 ? "not-allowed" : "pointer", opacity: orders.length < 20 ? .4 : 1 }}>Επόμ. →</button>
      </div>
    </div>
  );
}

/* ── Products Section ── */
function ProductsSection({ apiGet }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    apiGet("section=products").then((d) => { setProducts(d.products || []); setLoading(false); });
  }, [apiGet]);

  const filtered = filter === "all" ? products : filter === "outofstock" ? products.filter((p) => p.stock_status !== "instock") : products.filter((p) => p.stock_quantity !== null && p.stock_quantity <= 5 && p.stock_status === "instock");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        {[["all", "Όλα"], ["outofstock", "Εκτός Αποθ."], ["low", "Χαμηλό Απόθ."]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 16px", borderRadius: "100px", border: "1px solid var(--border)", cursor: "pointer", background: filter === v ? "var(--accent-light)" : "var(--surface-2)", color: filter === v ? "var(--accent)" : "var(--text-muted)", fontWeight: filter === v ? 700 : 500, fontSize: ".82rem" }}>{l}</button>
        ))}
      </div>
      {loading ? <div style={{ color: "var(--text-muted)", padding: "24px" }}>Φόρτωση…</div> : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Προϊόν", "Τιμή", "Κατηγορία", "Πωλήσεις", "Απόθεμα", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const catName = p.categories?.[0]?.name || "—";
                  const isLow = p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_status === "instock";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "11px 14px", color: "var(--accent)", fontWeight: 700 }}>{fmt(p.price)}€</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: ".8rem" }}>{catName}</td>
                      <td style={{ padding: "11px 14px", color: "var(--text-secondary)" }}>{p.total_sales}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {p.stock_status !== "instock"
                          ? <span style={{ color: "var(--danger)", fontWeight: 700, fontSize: ".8rem" }}>Εξαντλήθηκε</span>
                          : isLow
                            ? <span style={{ color: "#f97316", fontWeight: 700, fontSize: ".8rem" }}>Χαμηλό ({p.stock_quantity})</span>
                            : <span style={{ color: "var(--success)", fontSize: ".8rem" }}>✓ {p.stock_quantity !== null ? p.stock_quantity : "OK"}</span>
                        }
                      </td>
                      <td style={{ padding: "11px 14px" }}><img src={p.images?.[0]?.src} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "8px", background: "var(--surface-2)" }} /></td>
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

/* ── App ── */
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("ma_token");
    if (t) { setAuthed(true); }
    setChecked(true);
  }, []);

  const apiGet = useCallback(async (params) => {
    const t = localStorage.getItem("ma_token");
    const res = await fetch(`/api/data?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) { clearToken(); setAuthed(false); return {}; }
    return res.json();
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (active === "overview" && !data) {
      setLoading(true);
      apiGet("section=overview").then((d) => { setData(d); setLoading(false); });
    }
  }, [authed, active, data, apiGet]);

  if (!checked) return null;
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active={active} setActive={setActive} onLogout={() => { clearToken(); setAuthed(false); }} />
      <main style={{ marginLeft: "220px", flex: 1, padding: "32px 36px", background: "var(--bg)" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--text-primary)" }}>
            {NAV.find((n) => n.id === active)?.icon} {NAV.find((n) => n.id === active)?.label}
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: ".82rem", marginTop: "2px" }}>
            {new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {active === "overview" && (loading ? <div style={{ color: "var(--text-muted)" }}>Φόρτωση…</div> : data ? <Overview data={data} /> : null)}
        {active === "orders" && <OrdersSection apiGet={apiGet} />}
        {active === "products" && <ProductsSection apiGet={apiGet} />}
      </main>
    </div>
  );
}
