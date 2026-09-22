import { ImageResponse } from 'next/og';

export const alt = 'Siemens WinCC Log & Storage Architect';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#070D18',
          padding: '60px 70px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background glow accents */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 163, 181, 0.22) 0%, rgba(7, 13, 24, 0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '550px',
            height: '550px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 100, 110, 0.3) 0%, rgba(7, 13, 24, 0) 70%)',
            display: 'flex',
          }}
        />

        {/* Top bar: Brand & Version */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo Badge */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00646E 0%, #00A3B5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0, 100, 110, 0.4)',
              }}
            >
              {/* Microchip icon in SVG */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Siemens SIMATIC
              </span>
              <span style={{ fontSize: '14px', color: '#00A3B5', fontWeight: 600 }}>
                TIA Portal V14 – V21+ & WinCC V7/V8 Hub
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '6px 16px',
                borderRadius: '999px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'flex',
                }}
              />
              <span style={{ color: '#34D399', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>
                v2.17.1
              </span>
            </div>
          </div>
        </div>

        {/* Center content: Main Title and Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1
            style={{
              fontSize: '52px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>WinCC Log & Storage</span>
            <span
              style={{
                background: 'linear-gradient(90deg, #00A3B5 0%, #38BDF8 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Architect
            </span>
          </h1>
          <p
            style={{
              fontSize: '20px',
              color: '#94A3B8',
              lineHeight: 1.45,
              maxWidth: '920px',
              margin: 0,
            }}
          >
            Инженерный расчет и валидация хранилищ архивов TIA Portal: SQLite WAL, RDB/CSV, MS SQL,
            ресурс Flash-памяти (TBW) и сигнализация по ISA-18.2 / EEMUA 191.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '10px 18px',
              borderRadius: '12px',
              color: '#E2E8F0',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            WinCC Unified (SQLite WAL)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '10px 18px',
              borderRadius: '12px',
              color: '#E2E8F0',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Comfort / Advanced (500k Limit)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '10px 18px',
              borderRadius: '12px',
              color: '#E2E8F0',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Professional (Fast / Slow Logging)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 163, 181, 0.15)',
              border: '1px solid rgba(0, 163, 181, 0.3)',
              padding: '10px 18px',
              borderRadius: '12px',
              color: '#38BDF8',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            30-Col TIA Portal XLSX Export
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
