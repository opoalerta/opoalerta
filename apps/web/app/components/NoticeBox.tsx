import type { ReactNode } from "react";

type NoticeVariant = "info" | "warning" | "success";

const variantStyles: Record<NoticeVariant, string> = {
  info: "border-l-gold bg-cream",
  warning: "border-l-danger bg-danger-bg",
  success: "border-l-success bg-success-bg",
};

export function NoticeBox({
  children,
  variant = "info",
  title,
}: {
  children: ReactNode;
  variant?: NoticeVariant;
  title?: string;
}) {
  return (
    <div
      className={`rounded-r border-l-4 p-5 ${variantStyles[variant]}`}
      role={variant === "warning" ? "alert" : undefined}
    >
      {title && (
        <h3 className="mb-1 text-base font-semibold text-ink">{title}</h3>
      )}
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}
