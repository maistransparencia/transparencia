import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type React from "react";
import { cn } from "../utils/cn";

export interface AlertBoxProps {
  type?: "warning" | "danger" | "info" | "success";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AlertBox({
  type = "warning",
  title,
  children,
  className,
}: AlertBoxProps) {
  const icons = {
    warning: <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />,
    danger: <AlertCircle className="h-5 w-5 shrink-0 text-danger" />,
    info: <Info className="h-5 w-5 shrink-0 text-brand" />,
    success: <CheckCircle className="h-5 w-5 shrink-0 text-ok" />,
  };

  const styles = {
    warning: "border-warn/40 bg-warn/10 text-ink",
    danger: "border-danger/40 bg-danger/10 text-ink",
    info: "border-brand/40 bg-brand/10 text-ink",
    success: "border-ok/40 bg-ok/10 text-ink",
  };

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
        styles[type],
        className,
      )}
    >
      {icons[type]}
      <div>
        {title && <h4 className="mb-1 font-semibold">{title}</h4>}
        <div>{children}</div>
      </div>
    </div>
  );
}
