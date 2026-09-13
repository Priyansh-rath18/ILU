"use client";
import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button className="google-btn" onClick={() => signIn("google")}>
      Continue with Google
    </button>
  );
}
