import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

/**
 * Branded default share image (1200×630) used by every page that does not define a
 * more specific card. Generated at build/request time — no binary asset to keep in
 * sync with the brand.
 */
export const runtime = 'nodejs';
export const alt = `${SITE.legalName} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative',
          background: 'linear-gradient(140deg, #06070D 0%, #0A1020 55%, #0B1B2B 100%)',
          padding: 68, color: '#E9F0F9', fontFamily: 'sans-serif',
        }}
      >
        {/* Satori supports a limited CSS subset: solid washes instead of radial gradients. */}
        <div style={{ position: 'absolute', top: -120, left: -80, width: 460, height: 460, borderRadius: 460, background: 'rgba(16,185,129,0.20)' }} />
        <div style={{ position: 'absolute', top: -160, right: -60, width: 380, height: 380, borderRadius: 380, background: 'rgba(212,167,44,0.16)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: 'linear-gradient(135deg,#34D399,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#04140F', fontWeight: 700 }}>U</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 27, fontWeight: 600 }}>{SITE.legalName}</div>
            <div style={{ fontSize: 20, color: '#34D399', letterSpacing: 3, textTransform: 'uppercase' }}>Analytics · Scouting · Auction</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.06, maxWidth: 980 }}>
            Cricket decisions backed by evidence, not vibes
          </div>
          <div style={{ fontSize: 30, color: '#9FB3C8', maxWidth: 940 }}>
            Deterministic analytics across 30 modules — with explainable AI narration and clearly labelled synthetic demo data.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 21, color: '#8FA5BC' }}>
          {['Player & talent intelligence', 'Auction & squad planning', 'Reports to PDF · DOCX · XLSX · PPTX'].map((label) => (
            <div key={label} style={{ padding: '10px 18px', border: '1px solid #1E2C4A', borderRadius: 999 }}>{label}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
