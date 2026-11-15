import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary`: ação principal da área. `secondary`: demais ações. */
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-onink hover:opacity-90",
  secondary: "border border-line bg-page text-ink hover:bg-line2",
};

/** Botão do design system (DESIGN.md > `button`). */
export function Button({
  variant = "secondary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-visible:outline-focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
