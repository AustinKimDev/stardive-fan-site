import type { APIRoute } from 'astro';
import { renderOg } from '../../../lib/og';

export const prerender = false;

export const GET: APIRoute = async () => {
  const png = await renderOg('몬길: STAR DIVE', '팬 정보 허브');
  return new Response(png as unknown as BodyInit, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=3600',
    },
  });
};
