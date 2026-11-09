import { PublicFooter, PublicHeader } from '@/components/public-chrome';

/** Public, indexable shell: navigation, skip link and footer. No session required. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-turf-500 focus:px-3 focus:py-2 focus:text-sm focus:text-ink-950">Skip to content</a>
      <PublicHeader />
      <main id="main" className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
