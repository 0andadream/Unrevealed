import { Suspense } from "react";
import { Analyze } from "@/components/Analyze";

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-mist-500">Loading analyzer…</div>}>
      <Analyze />
    </Suspense>
  );
}
