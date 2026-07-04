import { motion } from "framer-motion";
import { Check, Loader } from "lucide-react";

export interface Step {
  key: string;
  label: string;
  state: "pending" | "active" | "complete";
}

export default function ProcessingTimeline({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {steps.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
              s.state === "complete"
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                : s.state === "active"
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/15 text-white/55"
            }`}
          >
            {s.state === "complete" ? (
              <Check size={12} />
            ) : s.state === "active" ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                className="flex"
              >
                <Loader size={12} />
              </motion.span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
          </span>
          <span
            className={`text-xs ${
              s.state === "pending" ? "text-white/55" : "text-white/80"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
