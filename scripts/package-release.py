"""Package sources and a matching prebuilt game without Git data or dependencies."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

root=Path(__file__).resolve().parent.parent
subprocess.run(['node','scripts/build-meta.js','--check'],cwd=root,check=True)
version=json.loads((root/'package.json').read_text())['version']
out=root/'downloads'/f'AETHERWILD-v{version}.zip'
out.parent.mkdir(exist_ok=True)
selected=['.github','.gitignore','README.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','index.html','vite.config.js','play.sh','src','docs','tests','scripts','public','dist','downloads/README.md']
files=[]
for name in selected:
    path=root/name
    for file in sorted(path.rglob('*')) if path.is_dir() else [path]:
        if file.is_file() and '__pycache__' not in file.parts:
            # Keep release screenshots current; all historical captures remain in GitHub.
            if 'screenshots' in file.parts:
                prefix='v'+version.rsplit('.',1)[0]+'-'
                showcase={'archer-right','frost-sphere','staff-sweep','meteor-impact','arcane-impact','leap-aim','leap-impact','drake'}
                if not file.name.startswith(prefix) or file.stem.removeprefix(prefix) not in showcase:continue
            files.append(file)
with zipfile.ZipFile(out.with_suffix('.tmp'),'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for file in files:z.write(file,'aetherwild/'+file.relative_to(root).as_posix())
with zipfile.ZipFile(out.with_suffix('.tmp')) as z:
    assert z.testzip() is None
    assert 'aetherwild/dist/index.html' in z.namelist()
    assert 'aetherwild/dist/build-meta.json' in z.namelist()
    assert not any('/node_modules/' in n or '/.git/' in n for n in z.namelist())
assert out.with_suffix('.tmp').stat().st_size<100_000_000,'Release exceeds GitHub file size limit'
out.with_suffix('.tmp').replace(out)
sha=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.zip.sha256').write_text(f'{sha}  {out.name}\n')
print(f'Verified {out.name}: {len(files)} files, {out.stat().st_size:,} bytes, SHA-256 {sha}')
