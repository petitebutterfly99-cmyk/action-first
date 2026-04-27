import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Benchmark {
  key: string;
  value_pct: number;
  comparator_pct: number | null;
  copy_template: string;
  sample_size: number;
}

export type BenchmarkMap = Record<string, Benchmark>;

interface State {
  data: BenchmarkMap | null;
  loading: boolean;
  error: string | null;
}

let cache: BenchmarkMap | null = null;
let inflight: Promise<BenchmarkMap> | null = null;

async function load(): Promise<BenchmarkMap> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("benchmarks")
      .select("key, value_pct, comparator_pct, copy_template, sample_size");
    if (error) {
      inflight = null;
      throw error;
    }
    const map: BenchmarkMap = {};
    for (const row of data ?? []) {
      map[row.key] = {
        key: row.key,
        value_pct: Number(row.value_pct),
        comparator_pct: row.comparator_pct === null ? null : Number(row.comparator_pct),
        copy_template: row.copy_template,
        sample_size: row.sample_size,
      };
    }
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

/** Render a benchmark's `copy_template` with its values inlined. */
export function renderBenchmark(b: Benchmark | undefined): string | null {
  if (!b) return null;
  return b.copy_template
    .replace("{value}", String(b.value_pct))
    .replace("{comparator}", b.comparator_pct === null ? "" : String(b.comparator_pct));
}

export function useBenchmarks(): State {
  const [state, setState] = useState<State>({
    data: cache,
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) {
      setState({ data: cache, loading: false, error: null });
      return;
    }
    let cancelled = false;
    load()
      .then((m) => {
        if (!cancelled) setState({ data: m, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: e?.message ?? "Failed to load benchmarks" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
