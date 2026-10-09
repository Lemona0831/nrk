# next/(개발판)을 지인 주소(루트)로 내보낸다: index.html, data/, audio/를 복사하고 ../ 경로를 루트 기준으로 고친다.
# 실행: python tools/release.py   (그 뒤 루트에서 사이트 흐름을 확인하고 커밋)
import os, shutil, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
NEXT = os.path.join(ROOT, 'next')
s = open(os.path.join(NEXT, 'index.html'), encoding='utf-8').read()
s = s.replace('src="../config.js"', 'src="config.js"').replace('href="../privacy.html"', 'href="privacy.html"')
assert '../' not in re.sub(r'//[^\n]*', '', s.split('<script>')[0]) , '머리말에 ../ 경로가 남았습니다'
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8', newline='').write(s)
for d in ['data', 'audio', 'js', 'css']:
    if not os.path.isdir(os.path.join(NEXT, d)): continue  # js/ · css/는 index.html을 나눈 뒤에만 있다
    dst = os.path.join(ROOT, d)
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(NEXT, d), dst)
print('루트로 내보냈습니다: index.html, data/, audio/')
