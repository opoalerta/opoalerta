import Link from "next/link";

export function PageHeader({
  title,
  lead,
  breadcrumbs,
}: {
  title: string;
  lead?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-[#595959]">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#154273]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#1a1a1a]">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-[#154273] sm:text-4xl">
        {title}
      </h1>
      {lead && <p className="mt-3 max-w-3xl text-lg text-[#595959]">{lead}</p>}
    </div>
  );
}
