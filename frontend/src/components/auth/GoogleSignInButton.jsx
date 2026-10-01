import { useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({
  onCredential,
  disabled = false,
}) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const [error, setError] = useState("");

  useEffect(() => {
    callback.current = onCredential;
    disabledRef.current = disabled;
  }, [onCredential, disabled]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) return;

    let active = true;
    let ready = false;
    let previousWidth = 0;
    let frame;
    let script;

    function renderButton() {
      if (!active || !ready || !container.current) return;

      const width = Math.floor(
        container.current.clientWidth,
      );

      if (width <= 0 || width === previousWidth) return;

      previousWidth = width;
      container.current.replaceChildren();

      window.google.accounts.id.renderButton(container.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: String(width),
      });
    }

    function initialise() {
      if (!active || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (
            active &&
            !disabledRef.current &&
            response.credential
          ) {
            callback.current(response.credential);
          }
        },
      });

      ready = true;
      setError("");
      renderButton();
    }

    function handleScriptError() {
      if (active) {
        setError("Google sign-in is unavailable right now.");
      }
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(renderButton);
    });

    if (container.current) {
      observer.observe(container.current);
    }

    if (window.google?.accounts?.id) {
      initialise();
    } else {
      script = document.querySelector(
        `script[src="${SCRIPT_URL}"]`,
      );

      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;

        script.addEventListener("load", initialise);
        script.addEventListener("error", handleScriptError);

        document.head.appendChild(script);
      } else {
        script.addEventListener("load", initialise);
        script.addEventListener("error", handleScriptError);
      }
    }

    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      script?.removeEventListener("load", initialise);
      script?.removeEventListener("error", handleScriptError);
    };
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-sign-in" aria-busy={disabled}>
      <div
        ref={container}
        className="google-sign-in__button"
        inert={disabled}
      />

      {error && (
        <p className="google-sign-in__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}