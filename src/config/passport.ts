import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { pool } from "../db";

interface User {
  id: string;
  email: string;
  name: string;
  google_id: string | null;
}

const callbackURL = process.env.NODE_ENV
  ? `${process.env.API_URL}/api/auth/google/callback`
  : "http://localhost:4000/api/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email provided by Google"));
        }

        const existingUser = await pool.query<User>(
          "SELECT * FROM users WHERE email = $1",
          [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0]!;

          if (!user.google_id) {
            const updated = await pool.query<User>(
              "UPDATE users SET google_id = $1, updated_at = now() WHERE id = $2 RETURNING *",
              [profile.id, user.id]
            );
            return done(null, updated.rows[0]!);
          }

          return done(null, user);
        }

        const newUser = await pool.query<User>(
          "INSERT INTO users (email, name, google_id, created_at, updated_at) VALUES ($1, $2, $3, now(), now()) RETURNING *",
          [
            email.toLowerCase(),
            profile.displayName || email.split("@")[0],
            profile.id,
          ]
        );

        return done(null, newUser.rows[0]!);
      } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error as Error);
      }
    }
  )
);

export default passport;
