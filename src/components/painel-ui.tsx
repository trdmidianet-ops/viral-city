import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, phase }: { title: string; subtitle: string; phase?: number }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-4xl leading-none tracking-[-0.01em] sm:text-5xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {phase && (
        <span className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan">
          Chega na fase {phase}
        </span>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink/30 to-purple/30">
        <Icon className="text-pink" size={26} />
      </div>
      <h2 className="mt-5 text-lg font-medium">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{text}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
