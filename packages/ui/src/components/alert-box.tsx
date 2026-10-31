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
    warning: <AlertTriangle className="h-4 w-4 shrink-0 text-warn-text" />,
    danger: <AlertCircle className="h-4 w-4 shrink-0 text-danger-text" />,
    info: <Info className="h-4 w-4 shrink-0 text-brand-text" />,
    success: <CheckCircle className="h-4 w-4 shrink-0 text-ok-text" />,
  };

  const styles = {
    warning: "border-warn-fill bg-warn-fill/15",
    danger: "border-danger-fill bg-danger-fill/15",
    info: "border-brand-fill bg-brand-fill/15",
    success: "border-ok-fill bg-ok-fill/15",
  };

  return (
    <div
      className={cn(
        "flex gap-3 border-l-[3px] px-4 py-3 text-ink text-sm leading-relaxed",
        styles[type],
        className,
      )}
    >
      {icons[type]}
      <div>
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
