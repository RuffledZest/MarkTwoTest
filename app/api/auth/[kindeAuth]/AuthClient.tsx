"use client";

import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthClient({ kindeAuth }: { kindeAuth: string }) {
  const { isLoading, isAuthenticated } = useKindeBrowserClient();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (kindeAuth === "login" && !isAuthenticated) {
        window.location.href = `https://${process.env.NEXT_PUBLIC_KINDE_ISSUER_URL}/login?post_login_redirect_url=${window.location.origin}/dashboard`;
      } else if (kindeAuth === "register" && !isAuthenticated) {
        window.location.href = `https://${process.env.NEXT_PUBLIC_KINDE_ISSUER_URL}/register?post_login_redirect_url=${window.location.origin}/dashboard`;
      } else if (kindeAuth === "logout") {
        window.location.href = `https://${process.env.NEXT_PUBLIC_KINDE_ISSUER_URL}/logout?post_logout_redirect_url=${window.location.origin}`;
      } else if (kindeAuth === "callback") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, kindeAuth, router]);

  return null;
} 