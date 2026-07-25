import type { ReactNode } from "react";

type NoticeVariant = "info" | "warning" | "success";

const variantStyles: Record<NoticeVariant, string> = {
  info: "border-l-[#01689b] bg-[#f3f5f6]",
  warning: "border-l-[#d52b1e] bg-[#fff4f4]",
  success: "border-l-[#39870c] bg-[#f4f9f0]",
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
        <h3 className="mb-1 text-base font-semibold text-[#1a1a1a]">{title}</h3>
      )}
      <div className="text-sm leading-relaxed text-[#1a1a1a]">{children}</div>
    </div>
  );
}
