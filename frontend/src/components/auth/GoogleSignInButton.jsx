import { useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({ onCredential, disabled }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const [error, setError] = useState("");
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    let active = true;

    function render() {
      if (!active || !container.current || !window.google?.accounts?.id) return;
      container.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callback.current(response.credential),
      });
      window.google.accounts.id.renderButton(container.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: Math.min(container.current.clientWidth || 320, 400),
      });
    }

    if (window.google?.accounts?.id) {
      render();
    } else {
      let script = document.querySelector(`script[src="${SCRIPT_URL}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", () => active && setError("Google sign-in is unavailable right now."));
      return () => {
        active = false;
        script.removeEventListener("load", render);
      };
    }

    return () => { active = false; };
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  return (
    <div className="google-sign-in" aria-busy={disabled}>
      <div ref={container} style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
