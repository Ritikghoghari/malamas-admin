import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || "change-me");

async function verifyAdmin(req) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

function wcUrl(path) {
  const base = process.env.WORDPRESS_URL;
  const q = `consumer_key=${process.env.WC_CONSUMER_KEY}&consumer_secret=${process.env.WC_CONSUMER_SECRET}`;
  return `${base}/wp-json/wc/v3/${path}&${q}`;
}

async function wcGet(path) {
  const res = await fetch(wcUrl(path), { cache: "no-store" });
  return res.ok ? res.json() : [];
}

export async function GET(req) {
  if (!(await verifyAdmin(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") || "overview";

  if (section === "overview") {
    const [orders, products, customers] = await Promise.all([
      wcGet("orders?per_page=50&orderby=date&order=desc&_fields=id,number,status,total,date_created,billing,line_items"),
      wcGet("products?per_page=100&status=publish&orderby=popularity&order=desc&_fields=id,name,total_sales,stock_status,stock_quantity,price"),
      wcGet("customers?per_page=10&orderby=registered_date&order=desc&_fields=id,first_name,last_name,email,orders_count,total_spent"),
    ]);

    const activeOrders = orders.filter((o) => ["processing", "completed"].includes(o.status));
    const revenue = activeOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => (o.date_created || "").startsWith(todayStr));
    const todayRevenue = todayOrders.filter((o) => ["processing", "completed"].includes(o.status))
      .reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const outOfStock = products.filter((p) => p.stock_status !== "instock").length;
    const lowStock = products.filter((p) => p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_status === "instock").length;

    return Response.json({
      stats: {
        totalRevenue: revenue.toFixed(2),
        todayRevenue: todayRevenue.toFixed(2),
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === "pending").length,
        processingOrders: orders.filter((o) => o.status === "processing").length,
        todayOrders: todayOrders.length,
        outOfStock,
        lowStock,
        totalProducts: products.length,
        totalCustomers: customers.length,
      },
      recentOrders: orders.slice(0, 20),
      topProducts: products.slice(0, 10),
      recentCustomers: customers,
      outOfStockProducts: products.filter((p) => p.stock_status !== "instock").slice(0, 10),
    });
  }

  if (section === "orders") {
    const page = searchParams.get("page") || "1";
    const status = searchParams.get("status") || "";
    let path = `orders?per_page=20&page=${page}&orderby=date&order=desc&_fields=id,number,status,total,date_created,billing,line_items,payment_method_title`;
    if (status) path += `&status=${status}`;
    const orders = await wcGet(path);
    return Response.json({ orders });
  }

  if (section === "products") {
    const products = await wcGet("products?per_page=50&status=publish&orderby=date&order=desc&_fields=id,name,price,stock_status,stock_quantity,total_sales,categories,images");
    return Response.json({ products });
  }

  return Response.json({ error: "Unknown section" }, { status: 400 });
}
