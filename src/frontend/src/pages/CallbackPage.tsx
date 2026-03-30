/**
 * CallbackPage — Discord OAuth callback is no longer used.
 * Redirect to the root URL.
 */
import { useEffect } from "react";

export function CallbackPage() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return null;
}
