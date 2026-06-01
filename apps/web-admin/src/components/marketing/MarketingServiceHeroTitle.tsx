type Props = {
  title: string;
  accent: string | null;
};

/** Ana sayfa hero H1 ile aynı vurgu: accent ilk eşleşmede emerald tonunda. */
export function MarketingServiceHeroTitle({ title, accent }: Props) {
  const phrase = accent?.trim();
  if (!phrase) {
    return (
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
        {title}
      </h1>
    );
  }

  const idx = title.indexOf(phrase);
  if (idx < 0) {
    return (
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
        {title}
      </h1>
    );
  }

  const before = title.slice(0, idx);
  const after = title.slice(idx + phrase.length);

  return (
    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
      {before}
      <span className="text-emerald-100">{phrase}</span>
      {after}
    </h1>
  );
}
