import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || "change-me");

async function verifyAdmin(req) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "admin";
  } catch { return false; }
}

const WC_BASE = () => process.env.WORDPRESS_URL;
const WC_AUTH = () => `consumer_key=${process.env.WC_CONSUMER_KEY}&consumer_secret=${process.env.WC_CONSUMER_SECRET}`;

function wcUrl(path) {
  const sep = path.includes("?") ? "&" : "?";
  return `${WC_BASE()}/wp-json/wc/v3/${path}${sep}${WC_AUTH()}`;
}

async function wcGet(path) {
  const res = await fetch(wcUrl(path), { cache: "no-store" });
  return res.ok ? res.json() : [];
}

export async function GET(req) {
  if (!(await verifyAdmin(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") || "overview";

  if (section === "overview") {
    const after30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [orders, products, customers, chart30] = await Promise.all([
      wcGet("orders?per_page=50&orderby=date&order=desc&_fields=id,number,status,total,date_created,billing,line_items,payment_method_title"),
      wcGet("products?per_page=100&status=publish&orderby=popularity&order=desc&_fields=id,name,total_sales,stock_status,stock_quantity,price,categories"),
      wcGet("customers?per_page=10&orderby=registered_date&order=desc&_fields=id,first_name,last_name,email,orders_count,total_spent,date_created"),
      wcGet(`orders?per_page=100&after=${after30}&orderby=date&order=desc&_fields=id,status,total,date_created`),
    ]);

    // Build 30-day revenue chart data
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }
    const chartData = days.map((day) => {
      const dayOrders = chart30.filter((o) => (o.date_created || "").startsWith(day) && ["processing", "completed"].includes(o.status));
      return { day, revenue: dayOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0), count: dayOrders.length };
    });

    const revenue = orders.filter((o) => ["processing", "completed"].includes(o.status)).reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => (o.date_created || "").startsWith(todayStr));
    const todayRevenue = todayOrders.filter((o) => ["processing", "completed"].includes(o.status)).reduce((s, o) => s + parseFloat(o.total || 0), 0);

    return Response.json({
      stats: {
        totalRevenue: revenue.toFixed(2),
        todayRevenue: todayRevenue.toFixed(2),
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === "pending").length,
        processingOrders: orders.filter((o) => o.status === "processing").length,
        todayOrders: todayOrders.length,
        outOfStock: products.filter((p) => p.stock_status !== "instock").length,
        lowStock: products.filter((p) => p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_status === "instock").length,
        totalProducts: products.length,
        totalCustomers: customers.length,
      },
      chartData,
      recentOrders: orders.slice(0, 20),
      topProducts: products.slice(0, 10),
      recentCustomers: customers,
      outOfStockProducts: products.filter((p) => p.stock_status !== "instock").slice(0, 10),
    });
  }

  if (section === "orders") {
    const page = searchParams.get("page") || "1";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    let path = `orders?per_page=20&page=${page}&orderby=date&order=desc&_fields=id,number,status,total,date_created,billing,line_items,payment_method_title,customer_note`;
    if (status) path += `&status=${status}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) path += `&after=${new Date(dateFrom).toISOString()}`;
    if (dateTo) path += `&before=${new Date(dateTo + "T23:59:59").toISOString()}`;
    const orders = await wcGet(path);
    return Response.json({ orders });
  }

  if (section === "order") {
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
    const order = await fetch(wcUrl(`orders/${id}`), { cache: "no-store" }).then((r) => r.ok ? r.json() : null);
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ order });
  }

  if (section === "products") {
    const products = await wcGet("products?per_page=100&status=publish&orderby=date&order=desc&_fields=id,name,price,regular_price,stock_status,stock_quantity,total_sales,categories,images");
    return Response.json({ products });
  }

  if (section === "customers") {
    const search = (searchParams.get("search") || "").toLowerCase();
    // Fetch from orders so guests are included
    const [p1, p2, p3] = await Promise.all([
      wcGet("orders?per_page=100&page=1&orderby=date&order=desc&status=processing,completed,on-hold,pending&_fields=id,billing,total,status,date_created"),
      wcGet("orders?per_page=100&page=2&orderby=date&order=desc&status=processing,completed,on-hold,pending&_fields=id,billing,total,status,date_created"),
      wcGet("orders?per_page=100&page=3&orderby=date&order=desc&status=processing,completed,on-hold,pending&_fields=id,billing,total,status,date_created"),
    ]);
    const allOrders = [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : []), ...(Array.isArray(p3) ? p3 : [])];

    const map = new Map();
    for (const o of allOrders) {
      const email = o.billing?.email?.toLowerCase();
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, { email, first_name: o.billing.first_name, last_name: o.billing.last_name, phone: o.billing.phone, city: o.billing.city, orders: 0, total_spent: 0, last_order: o.date_created });
      }
      const c = map.get(email);
      c.orders += 1;
      c.total_spent += parseFloat(o.total || 0);
      if (o.date_created > c.last_order) c.last_order = o.date_created;
    }

    let customers = Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
    if (search) customers = customers.filter((c) => c.email.includes(search) || `${c.first_name} ${c.last_name}`.toLowerCase().includes(search));

    const topBySpend = customers.slice(0, 10).map((c) => ({ name: `${c.first_name} ${c.last_name}`.trim() || c.email, total: c.total_spent, orders: c.orders }));
    return Response.json({ customers: customers.slice(0, 100), topBySpend });
  }

  if (section === "export") {
    const status = searchParams.get("status") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    let path = `orders?per_page=100&orderby=date&order=desc&_fields=id,number,status,total,date_created,billing,line_items,payment_method_title`;
    if (status) path += `&status=${status}`;
    if (dateFrom) path += `&after=${new Date(dateFrom).toISOString()}`;
    if (dateTo) path += `&before=${new Date(dateTo + "T23:59:59").toISOString()}`;
    const orders = await wcGet(path);

    const rows = [["#", "Ημερομηνία", "Πελάτης", "Email", "Τηλέφωνο", "Κατάσταση", "Σύνολο", "Τρόπος Πληρωμής", "Προϊόντα"]];
    for (const o of orders) {
      const items = (o.line_items || []).map((li) => `${li.name} x${li.quantity}`).join("; ");
      rows.push([
        o.number, (o.date_created || "").slice(0, 10),
        `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim(),
        o.billing?.email || "", o.billing?.phone || "",
        o.status, o.total, o.payment_method_title || "", items,
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new Response("﻿" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"` },
    });
  }

  return Response.json({ error: "Unknown section" }, { status: 400 });
}

export async function PATCH(req) {
  if (!(await verifyAdmin(req))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { type, id, value } = await req.json();

  if (type === "order_status") {
    const res = await fetch(wcUrl(`orders/${id}`), {
      method: "PUT", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || "Failed" }, { status: res.status });
    return Response.json({ ok: true, status: data.status });
  }

  if (type === "stock") {
    const res = await fetch(wcUrl(`products/${id}`), {
      method: "PUT", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_quantity: Number(value), manage_stock: true }),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || "Failed" }, { status: res.status });
    return Response.json({ ok: true, stock_quantity: data.stock_quantity, stock_status: data.stock_status });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
