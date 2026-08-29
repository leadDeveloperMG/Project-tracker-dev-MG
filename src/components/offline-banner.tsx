"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <Alert tone="warning" title="You are offline" className="mb-4">
      You can keep reading saved pages. Actions that need the server will wait until you reconnect.
    </Alert>
  );
}
