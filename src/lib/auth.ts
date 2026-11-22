import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "./db";
import { User } from "@/models";
import { loginSchema } from "./validation";
import { rateLimit } from "./security";
// Valid bcrypt hash ensures unknown emails still pay the password-comparison cost.
const dummyHash =
  "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        await rateLimit("login:global", 1000);
        await rateLimit(`login:${parsed.data.email}`);
        const user = await User.findOne({ email: parsed.data.email }).select(
          "+passwordHash",
        );
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash || dummyHash,
        );
        if (!user || !valid) return null;
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          version: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.version = (user as typeof user & { version: number }).version;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.version = Number(token.version);
      }
      return session;
    },
  },
};
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await connectDB();
  return User.findOne({
    _id: session.user.id,
    sessionVersion: session.user.version,
  });
}
