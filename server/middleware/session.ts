import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";

const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days

// Create a separate pool for sessions with SSL for AWS RDS
const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

export function getSession() {
  const PgStore = connectPg(session);
  const store = new PgStore({
    pool: sessionPool,
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
      sameSite: "strict",
      maxAge: sessionTtl,
    },
  });
}
