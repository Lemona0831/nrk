# 가독성 전 / 후 표: python tools/readability_table.py 전.json 후.json [폭]  (tools/readability.py 결과를 마크다운 표로)
import json, sys, statistics
b = json.load(open(sys.argv[1], encoding='utf-8')); a = json.load(open(sys.argv[2], encoding='utf-8')); W = sys.argv[3] if len(sys.argv) > 3 else '390'
keys = [k for k in b if k.endswith('@' + W) and k in a]
def col(d, f): return [d[k][f] for k in keys]
rows = [('글자 크기 최소 px (화면별 최소의 최소)', 'fsMin', min), ('13px 아래 글자 비율 % (화면 평균)', 'pct_lt13', statistics.mean), ('14px 아래 글자 비율 % (화면 평균)', 'pct_lt14', statistics.mean),
 ('글자 크기 중앙값 px (글자 수 가중, 화면 중앙)', 'fsMed', statistics.median), ('줄 간격 중앙 (배)', 'lhMed', statistics.median), ('줄 간격 최소 (배)', 'lhMin', min),
 ('대비비 최소', 'crMin', min), ('대비비 하위 10% (화면 중앙)', 'crP10', statistics.median), ('대비 4.5 아래 글자 % (평균)', 'pct_cr45', statistics.mean), ('대비 7 아래 글자 % (평균)', 'pct_cr7', statistics.mean),
 ('화면당 글자 크기 종류 (평균)', 'nSizes', statistics.mean), ('화면당 굵기 종류 (평균)', 'nWeights', statistics.mean), ('화면당 글자색 종류 (평균)', 'nColors', statistics.mean),
 ('터치 대상 높이 44 아래 개수 (합)', 'tgLt44', sum), ('터치 대상 24 아래 개수 (합)', 'tgLt24', sum), ('한 줄 글자 수 최대', 'lineMax', max), ('한 줄 44자 넘는 글 덩이 (합)', 'lineGt44', sum),
 ('화면당 글자 수 (평균)', 'chars', statistics.mean), ('가로 스크롤 px (최대)', 'hScroll', max)]
print(f'| 항목 ({W}px, 화면 {len(keys)}개) | 전 | 후 |\n| --- | --- | --- |')
for name, f, fn in rows:
    x, y = fn(col(b, f)), fn(col(a, f)); r = lambda v: round(v, 2) if isinstance(v, float) else v
    print(f'| {name} | {r(x)} | {r(y)} |')
