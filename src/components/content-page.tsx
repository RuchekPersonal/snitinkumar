export function ContentPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-6 lg:pt-12">
      {eyebrow && <p className="eyebrow text-gold-600">{eyebrow}</p>}
      <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold lg:text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
