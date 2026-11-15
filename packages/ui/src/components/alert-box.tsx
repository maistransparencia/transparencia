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
    warning: <AlertTriangle className="text-warn-text h-4 w-4 shrink-0" />,
    danger: <AlertCircle className="text-danger-text h-4 w-4 shrink-0" />,
    info: <Info className="text-brand-text h-4 w-4 shrink-0" />,
    success: <CheckCircle className="text-ok-text h-4 w-4 shrink-0" />,
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
        "text-ink flex gap-3 border-l-[3px] px-4 py-3 text-sm leading-relaxed",
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
