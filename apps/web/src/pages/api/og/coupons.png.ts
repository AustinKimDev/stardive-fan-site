import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../../lib/og';

export const prerender = false;

export const GET: APIRoute = async () => {
  const active = (await getCollection('coupons')).filter(e => e.data.status === 'active').length;
  const png = await renderOg('쿠폰 코드', `${active}개 사용 가능 — 실시간 검증`);
  return new Response(png as unknown as BodyInit, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=600',
    },
  });
};
