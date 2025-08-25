import { useEffect, useRef, useState } from "react";
import type { Household, Assumptions, EarliestForPlanResult } from "dwz-core";

export function usePlanFirstSolver(
  h: Household, 
  a: Assumptions, 
  planSpend: number | null,
  enabled: boolean = true
) {
  const [data, setData] = useState<EarliestForPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!workerRef.current || !enabled || !planSpend || planSpend <= 0) {
      setData(null);
      return;
    }
    
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
      type: 'EARLIEST_AGE_FOR_PLAN', 
      household: h, 
      assumptions: a, 
      plan: planSpend 
    });
    return () => workerRef.current?.removeEventListener("message", onMsg);
  }, [JSON.stringify(h), JSON.stringify(a), planSpend, enabled]);

  return { data, loading };
}