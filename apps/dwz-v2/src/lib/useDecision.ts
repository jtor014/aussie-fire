import { useEffect, useRef, useState } from "react";
import type { DecisionDwz, Household, Assumptions } from "dwz-core";

export function useDecision(h: Household, a: Assumptions, forceRetireAge?: number) {
  const [data, setData] = useState<DecisionDwz | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
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
      type: 'COMPUTE_DECISION', 
      household: h, 
      assumptions: a,
      forceRetireAge 
    });
    return () => workerRef.current?.removeEventListener("message", onMsg);
  }, [JSON.stringify(h), JSON.stringify(a), forceRetireAge]); // simple, stable

  return { data, loading };
}