# 06a2를 "루트처럼 배치한" 사이트 사본을 저장소 밖 임시 폴더에 만들고 점검한다. 루트(index.html, data/, audio/, config.js)에는 쓰지 않는 리허설이다.
# 실행: python tools/release062.py [출력폴더]   (기본 $TEMP/nrk-release062/)
#   --no-build  이미 만든 사본만 점검한다
# 사본 배치: 06a2/index.html -> index.html, 06a2/data|js|css -> data|js|css, 루트 audio/ + 06a2/audio/ -> audio/,
#            privacy.html(저장소 루트)은 그대로 복사, config.js는 빈 파일(시험이 진짜 Supabase에 기록을 보내지 않게).
# 경로 치환: ../config.js -> config.js, ../audio/ -> audio/, ../privacy.html -> privacy.html (index.html, js/, css/, data/ 안의 글자)
# 저장 키와 저장소 경로는 바꾸지 않는다(nrk_062_v1, runs62 · scen62 · survey62 · best62 · rank62). 이관 여부는 만든 사람 결정이다.
import os, re, shutil, sys, tempfile

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = os.path.abspath(args[0]) if args else os.path.join(tempfile.gettempdir(), 'nrk-release062')
BUILD = '--no-build' not in sys.argv
SUBS = [(b'../config.js', b'config.js'), (b'../audio/', b'audio/'), (b'../privacy.html', b'privacy.html')]
TEXT_EXT = ('.html', '.js', '.css')
problems = []


def fail(msg):
    problems.append(msg)
    print('문제:', msg)


def build():
    # 안전장치: 출력 폴더는 저장소 안이면 안 된다(루트 오염 방지)
    try:
        if os.path.commonpath([OUT, REPO]) == REPO:
            sys.exit('출력 폴더가 저장소 안입니다: ' + OUT)
    except ValueError:
        pass  # 다른 드라이브면 저장소 밖
    a = set(os.listdir(os.path.join(REPO, 'audio')))
    b = set(os.listdir(os.path.join(REPO, '06a2', 'audio')))
    both = sorted(a & b)
    if both:
        sys.exit('루트 audio/와 06a2/audio/에 같은 이름이 있어 중단합니다: ' + ', '.join(both))
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copy2(os.path.join(REPO, '06a2', 'index.html'), os.path.join(OUT, 'index.html'))
    for d in ['data', 'js', 'css']:
        shutil.copytree(os.path.join(REPO, '06a2', d), os.path.join(OUT, d))
    os.makedirs(os.path.join(OUT, 'audio'))
    for src in [os.path.join(REPO, 'audio'), os.path.join(REPO, '06a2', 'audio')]:
        for f in os.listdir(src):
            shutil.copy2(os.path.join(src, f), os.path.join(OUT, 'audio', f))
    shutil.copy2(os.path.join(REPO, 'privacy.html'), os.path.join(OUT, 'privacy.html'))
    open(os.path.join(OUT, 'config.js'), 'wb').close()  # 빈 파일
    n = 0
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            if not f.endswith(TEXT_EXT) or f == 'privacy.html':
                continue
            p = os.path.join(dp, f)
            s = open(p, 'rb').read()
            t = s
            for x, y in SUBS:
                t = t.replace(x, y)
            if t != s:
                open(p, 'wb').write(t)
                n += 1
    print('사본을 만들었습니다:', OUT, '| 경로를 고친 파일', n, '개')


def readall(p):
    return open(p, encoding='utf-8').read()


def check():
    if not os.path.isdir(OUT):
        sys.exit('사본이 없습니다: ' + OUT)
    # 1) 남은 ../
    left = []
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            if not f.endswith(TEXT_EXT) or f == 'privacy.html':
                continue
            p = os.path.join(dp, f)
            for i, ln in enumerate(readall(p).split('\n'), 1):
                if '../' in ln:
                    left.append('%s:%d %s' % (os.path.relpath(p, OUT), i, ln.strip()[:100]))
    for l in left:
        fail('남은 ../ ' + l)
    if not left:
        print('남은 ../ : 0')
    # 2) index.html의 script src · link href
    html = readall(os.path.join(OUT, 'index.html'))
    refs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', html) + re.findall(r'<link[^>]*\shref="([^"]+)"', html)
    miss = [r for r in refs if not re.match(r'https?:', r) and not os.path.isfile(os.path.join(OUT, r))]
    print('index.html 참조', len(refs), '개 | 없는 파일', len(miss))
    for m in miss:
        fail('없는 파일 ' + m)
    # 3) 음악 · 효과음 src
    srcs = re.findall(r"src:\s*'([^']+)'", readall(os.path.join(OUT, 'data', 'audio.js')))
    amiss = [s for s in srcs if not os.path.isfile(os.path.join(OUT, s))]
    print('MUSIC · SFX 파일', len(srcs), '개 | 없는 파일', len(amiss))
    for m in amiss:
        fail('없는 곡 ' + m)
    # 4) js 글자 안의 href="…" 상대 링크(개인정보처리방침 등)
    for f in os.listdir(os.path.join(OUT, 'js')):
        for h in re.findall(r'href="([^"#]+)"', readall(os.path.join(OUT, 'js', f))):
            if not re.match(r'(https?:|mailto:|data:|javascript:)', h) and '${' not in h and not os.path.isfile(os.path.join(OUT, h)):
                fail('js 안의 링크 대상이 없음 %s (%s)' % (h, f))
    # 5) 저장 키와 경로
    allt = ''
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            if f.endswith(TEXT_EXT):
                allt += readall(os.path.join(dp, f))
    for k in ['nrk_062_v1', 'runs62', 'scen62', 'survey62', 'best62', 'rank62']:
        print('  저장 키 · 경로', k, ':', allt.count(k), '곳')
        if k not in allt:
            fail('저장 키가 사라짐 ' + k)
    # 6) 크기
    files = []
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            files.append((os.path.getsize(os.path.join(dp, f)), os.path.relpath(os.path.join(dp, f), OUT)))
    tot = sum(s for s, _ in files)
    big = max(files)
    print('사본 파일 %d개, 총 %.1f MB, 가장 큰 파일 %s (%.1f MB)' % (len(files), tot / 1048576, big[1].replace(os.sep, '/'), big[0] / 1048576))
    over = big[0] >= 100 * 1048576 or tot >= 1024 ** 3
    if over:
        fail('Pages 한도 초과(파일 100MB 미만, 사이트 1GB 미만)')
    print('Pages 한도(파일 100MB 미만, 사이트 1GB 미만):', '초과' if over else '통과')
    print('참고: 실제 사이트에는 b05/ · next/ · 06a2/도 함께 올라가므로 저장소 전체 크기로 다시 센다.')


if BUILD:
    build()
check()
print('결과:', '문제 %d건' % len(problems) if problems else '문제 없음')
sys.exit(1 if problems else 0)
