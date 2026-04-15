import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Satori uses its own VNode type (not React's)
type SatoriChild = string | number | null | undefined | SatoriVNode;
interface SatoriVNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: SatoriChild | SatoriChild[];
    [key: string]: unknown;
  };
}

let fontCache: Buffer | null = null;

function font(): Buffer {
  if (!fontCache) {
    // noto-sans-kr Korean subset, 700 weight — covers all Korean characters
    const fontPath = resolve(
      process.cwd(),
      'node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff',
    );
    fontCache = readFileSync(fontPath);
  }
  return fontCache;
}

export async function renderOg(title: string, subtitle?: string): Promise<Uint8Array> {
  const children: SatoriChild[] = [
    {
      type: 'div',
      props: {
        style: {
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.1,
          color: 'rgb(248, 244, 255)',
        },
        children: title,
      },
    },
  ];

  if (subtitle) {
    children.push({
      type: 'div',
      props: {
        style: { fontSize: 32, marginTop: 24, color: 'rgb(217, 213, 255)' },
        children: subtitle,
      },
    });
  }

  children.push({
    type: 'div',
    props: {
      style: { marginTop: 'auto', fontSize: 24, color: 'rgb(217, 213, 255)', opacity: 0.7 },
      children: 'stardive-fan-site.kr',
    },
  });

  const root: SatoriVNode = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, rgb(9,12,25) 0%, rgb(18,22,48) 100%)',
        color: 'rgb(248, 244, 255)',
        fontFamily: 'Noto',
      },
      children,
    },
  };

  const fontData = font();
  const options: SatoriOptions = {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Noto', data: fontData, weight: 700, style: 'normal' }],
  };

  // satori accepts any VNode-like object at runtime even if types are strict
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(root as any, options);
  return new Resvg(svg).render().asPng();
}
