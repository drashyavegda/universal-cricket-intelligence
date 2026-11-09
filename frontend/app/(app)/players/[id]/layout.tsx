import type { Metadata } from 'next';
import { getStore } from '@/lib/core/db/store';
import { SITE, SITE as site, absoluteUrl } from '@/lib/site';

interface Props { params: { id: string }; children: React.ReactNode }

/**
 * Dynamic per-player metadata: every profile gets a distinct title, description
 * and canonical URL. The description is derived from the record itself (role,
 * team, format, sample size) rather than being a template with a swapped name.
 * Private pages stay noindex — the meta exists for internal sharing and link
 * previews, never for search indexing.
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const player = getStore().players.find((p) => p.id === params.id);
  if (!player) {
    return { title: 'Player Not Found', description: 'This player record does not exist in the workspace.', robots: { index: false } };
  }
  const appearances = player.batting.matches || player.bowling.matches;
  const sample = appearances >= 8 ? `${appearances} tracked appearances` : `${appearances} appearances (limited sample)`;
  const title = `${player.name} — ${player.role} Analytics Profile`;
  const description = `${player.name}, ${player.role} for ${player.team} (${player.format}): ${sample}, ${player.capped ? 'capped' : 'uncapped'} ${player.overseas ? 'overseas' : 'domestic'} record with provenance, risk, valuation and forecast evidence.`;
  return {
    title,
    description: description.slice(0, 158),
    alternates: { canonical: `/players/${player.id}` },
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title: `${player.name} · ${SITE.name}`,
      description: description.slice(0, 158),
      type: 'profile',
      url: `/players/${player.id}`,
      siteName: site.legalName,
      // The dynamic card lives beside this route; declare it explicitly so the
      // page-level openGraph object does not drop the image.
      images: [{ url: `/players/${player.id}/opengraph-image`, width: 1200, height: 630, alt: `${player.name} player intelligence card` }],
    },
    twitter: { card: 'summary_large_image', title: `${player.name} · ${SITE.name}`, description: description.slice(0, 158) },
  };
}

export default function Layout({ children }: Props) {
  return children;
}
