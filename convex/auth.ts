import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

// Private browser sessions let judges explore without disclosing an email.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [Anonymous] });
