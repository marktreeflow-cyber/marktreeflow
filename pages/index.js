// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // redirect otomatis ke /dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="p-6">
      <p>🔄 Redirecting to Dashboard...</p>
    </div>
  );
}
