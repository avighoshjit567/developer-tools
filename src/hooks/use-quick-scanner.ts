"use client";

import { useCallback, useRef } from "react";
import { useScanner } from "./use-scanner";
import { useWpScanner } from "./use-wp-scanner";
import { useEmailScanner } from "./use-email-scanner";

export function useQuickScanner() {
  const domain = useScanner();
  const wp = useWpScanner();
  const email = useEmailScanner();
  const abortRef = useRef(false);

  const startScan = useCallback(
    (domainName: string) => {
      abortRef.current = false;
      domain.startScan(domainName);
      wp.startScan(domainName, false);
      email.startScan(domainName);
    },
    [domain.startScan, wp.startScan, email.startScan]
  );

  const scanning = domain.scanning || wp.scanning || email.scanning;

  return { domain, wp, email, scanning, startScan };
}
