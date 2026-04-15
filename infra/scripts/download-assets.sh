#!/usr/bin/env bash
# 공식 STAR DIVE 자산 일괄 다운로드 (2026-04-15 수집)
# 출처: stardive.netmarble.com (© Netmarble) — 팬사이트 attribution 준수 필수
set -euo pipefail
cd "$(dirname "$0")/../../apps/web/public/assets"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
REF="https://stardive.netmarble.com/ko"
fetch() { curl -sLA "$UA" -e "$REF" -o "$2" "$1"; }

mkdir -p characters/full characters/portrait backgrounds brand

# ── 캐릭터 풀 일러스트 (2560×1440 [region] name)
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260203/er0c1770102439916.png" characters/full/mina.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260203/1t2g1770102462915.png" characters/full/berna.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260206/rnbr1770366918158.png" characters/full/cloud.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260203/krjn1770102505500.png" characters/full/ophelia.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260206/lu661770367090407.png" characters/full/francis.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260414/swxz1776160553773.png" characters/full/esde.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260212/pljf1770892989594.png" characters/full/plea.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260414/gtdi1776160534030.png" characters/full/reina.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/fkc21774840662908.png" characters/full/daisy.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/ybvb1774858222583.png" characters/full/penny.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260414/e9jj1776160621801.png" characters/full/jiwon.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260414/1r6g1776160580902.png" characters/full/gabi.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/pnhu1774863560483.png" characters/full/yeonhwa.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/chv21774864419332.png" characters/full/iho.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/wvag1774865976192.png" characters/full/sangun.png

# ── 캐릭터 썸네일 (174–210 portrait)
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260116/ivuh1768557647858.png" characters/portrait/mina.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260116/0hnp1768557717529.png" characters/portrait/berna.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260116/nitl1768557830724.png" characters/portrait/cloud.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260116/ieh31768557892174.png" characters/portrait/ophelia.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260116/if7h1768558065484.png" characters/portrait/francis.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260212/rgah1770886552544.png" characters/portrait/esde.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260212/zwdd1770887937357.png" characters/portrait/plea.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260212/hlkh1770893350342.png" characters/portrait/reina.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/yypl1774840581163.png" characters/portrait/daisy.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/gphk1774848382961.png" characters/portrait/penny.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/jkso1774859157409.png" characters/portrait/jiwon.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/negq1774862181649.png" characters/portrait/gabi.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/qi0p1774863488270.png" characters/portrait/yeonhwa.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/ljph1774864247861.png" characters/portrait/iho.png
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260330/xpue1774865924116.png" characters/portrait/sangun.png

# ── 시네마틱 배경 (region 배경 11종, 2560×1440)
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260205/htfy1770256629322.jpg" backgrounds/bg-01.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/9qpv1772075009987.jpg" backgrounds/bg-02.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260223/gzld1771821507334.jpg" backgrounds/bg-03.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260223/ec3v1771821480209.jpg" backgrounds/bg-04.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260203/copx1770087182475.jpg" backgrounds/bg-05.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/a0is1772073879012.jpg" backgrounds/bg-06.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/ipkl1772073983673.jpg" backgrounds/bg-07.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/glwc1772074074861.jpg" backgrounds/bg-08.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/hyzl1772074131276.jpg" backgrounds/bg-09.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/zkc01772074203639.jpg" backgrounds/bg-10.jpg
fetch "https://sgimage.netmarble.com/images/netmarble/monster2/20260226/vkgx1772073267316.jpg" backgrounds/bg-11.jpg

# ── 브랜드
fetch "https://sgimage.netmarble.com/mobile/game/monster2/brand/v1/img/ad6b1696437b.png" brand/logo.png
fetch "https://sgimage.netmarble.com/mobile/game/monster2/brand/v1/img/d5eba99138fc.png" brand/guide-badge.png

echo "✓ 자산 다운로드 완료"
ls -la characters/full characters/portrait backgrounds brand | tail -60
