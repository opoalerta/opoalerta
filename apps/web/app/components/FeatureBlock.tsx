import type { ReactNode } from "react";

export function FeatureBlock({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      {number && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-base font-bold text-navy">
          {number}
        </div>
      )}
      <div>
        <h3 className="mb-1 text-lg font-semibold text-navy">{title}</h3>
        <p className="text-slate">{children}</p>
      </div>
    </div>
  );
}
