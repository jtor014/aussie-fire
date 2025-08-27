import { useEffect, useRef, useState } from "react";
import type { DecisionDwz, Household, Assumptions } from "dwz-core";

export function useDecision(h: Household, a: Assumptions, forceRetireAge?: number, enabled: boolean = true) {
  const [data, setData] = useState<DecisionDwz | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!workerRef.current || !enabled) {
      // If disabled, clear data and loading state
      if (!enabled) {
        setData(null);
        setLoading(false);
      }
      return;
    }
    
    // Early exit when forceRetireAge is not finite (plan not achievable)
    if (!Number.isFinite(forceRetireAge as number)) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const id = ++counter.current;
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      setLoading(false);
      if (e.data.ok) {
        setData(e.data.result);
      } else {
        // Benign: not achievable or other handled error - no logging needed
        setData(null);
      }
    };
    workerRef.current.addEventListener("message", onMsg);
    workerRef.current.postMessage({ 
      id, 
      type: 'COMPUTE_DECISION', 
      household: h, 
      assumptions: a,
      forceRetireAge 
    });
    return () => workerRef.current?.removeEventListener("message", onMsg);
  }, [JSON.stringify(h), JSON.stringify(a), forceRetireAge, enabled]); // simple, stable

  return { data, loading };
}