import session from "express-session";
import connectPg from "connect-pg-simple";

const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getSession() {
  const PgStore = connectPg(session);
  const store = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}
