import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import SignInButton from "../components/SignInButton";
import Dashboard from "../components/Dashboard";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="landing">
        <div className="landing-card">
          <div className="brand">
            IRON<span>LEDGER</span>
          </div>
          <p className="tagline">Sign in to track your training and nutrition.</p>
          <SignInButton />
        </div>
      </div>
    );
  }

  // Only pass the minimal, non-sensitive fields the UI needs.
  const user = {
    name: session.user.name || "",
    email: session.user.email || "",
    image: session.user.image || "",
  };

  return <Dashboard user={user} />;
}
