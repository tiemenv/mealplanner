"use client";

import { useEffect } from "react";

/** Registering the worker is what makes the app installable, and only an
 *  installed app can be offered as a share target. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unregistered worker only costs installability, so it isn't worth
      // interrupting anyone over.
    });
  }, []);

  return null;
}
