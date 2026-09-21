import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET || "change-me");

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Λάθος κωδικός." }, { status: 401 });
  }
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);

  return Response.json({ token });
}
