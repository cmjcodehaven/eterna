interface BrandHeaderProps {
  subtitle?: string;
}

export default function BrandHeader({
  subtitle = "FOTÓGRAFOS DO EVENTO",
}: BrandHeaderProps) {
  return (
    <header className="text-center mb-8">
      {subtitle && <p className="brand-subtitle">{subtitle}</p>}
      <h1 className="brand-title">Eterna Photos</h1>
      <div className="gold-divider mt-4" />
    </header>
  );
}
