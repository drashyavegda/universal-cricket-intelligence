import { ImageResponse } from 'next/og';
import { getStore } from '@/lib/core/db/store';
import { SITE } from '@/lib/site';

/**
 * Dynamic 1200×630 share card for a player profile.
 *
 * Privacy: only the name, role, team and format are drawn — no statistics, no
 * contact details, no dataset identifiers. When PUBLIC_PLAYER_PREVIEWS is set to
 * "false" (recommended once the workspace holds real, non-consented player data)
 * the route falls back to a generic branded card instead of naming anybody.
 */
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Player intelligence share card';

export default async function Image({ params }: { params: { id: string } }) {
  const previewsAllowed = (process.env.PUBLIC_PLAYER_PREVIEWS ?? 'true') !== 'false';
  const player = previewsAllowed ? getStore().players.find((p) => p.id === params.id) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #06070D 0%, #0A1020 45%, #0C2033 100%)', padding: 64, color: '#E6EDF7',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 14, height: 56, borderRadius: 8, background: '#10B981' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 26, letterSpacing: 6, color: '#10B981', textTransform: 'uppercase' }}>{SITE.legalName}</div>
            <div style={{ fontSize: 20, color: '#7C8DA6' }}>Player intelligence profile · private workspace</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: player ? 86 : 68, fontWeight: 700, lineHeight: 1.05 }}>{player ? player.name : SITE.tagline}</div>
          <div style={{ fontSize: 34, color: '#9FB3C8' }}>
            {player ? `${player.role} · ${player.team} · ${player.format}` : 'Deterministic cricket analytics, scouting and auction strategy'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 22, color: '#7C8DA6' }}>
          <div style={{ padding: '10px 18px', border: '1px solid #1E2C4A', borderRadius: 999 }}>{player ? (player.capped ? 'Capped' : 'Uncapped') : 'Evidence-backed'}</div>
          <div style={{ padding: '10px 18px', border: '1px solid #1E2C4A', borderRadius: 999 }}>{player ? (player.synthetic ? 'DEMO DATA' : 'UPLOADED DATA') : 'Explainable metrics'}</div>
          <div style={{ padding: '10px 18px', border: '1px solid #1E2C4A', borderRadius: 999, color: '#D4A72C' }}>ucip · analytics</div>
        </div>
      </div>
    ),
    size,
  );
}
