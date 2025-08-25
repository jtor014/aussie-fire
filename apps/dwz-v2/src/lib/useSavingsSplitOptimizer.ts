import { useEffect, useRef, useState } from "react";
import type { Household, Assumptions, SavingsSplitResult } from "dwz-core";

interface OptimizePolicy {
  capPerPerson: number;
  eligiblePeople: number;
  contribTaxRate?: number;
  maxPct?: number;
}

export function useSavingsSplitOptimizer(
  h: Household, 
  a: Assumptions, 
  policy: OptimizePolicy,
  enabled: boolean = true
) {
  const [data, setData] = useState<SavingsSplitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!workerRef.current || !enabled || !h.annualSavings) return;
    
    setLoading(true);
    const id = ++counter.current;
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      setLoading(false);
      e.data.ok ? setData(e.data.result) : console.error(e.data.error);
    };
    workerRef.current.addEventListener("message", onMsg);
    workerRef.current.postMessage({ 
      id, 
      type: 'OPTIMIZE_SAVINGS_SPLIT', 
      household: h, 
      assumptions: a, 
      policy 
    });
    return () => workerRef.current?.removeEventListener("message", onMsg);
  }, [JSON.stringify(h), JSON.stringify(a), JSON.stringify(policy), enabled]);

  return { data, loading };
}