"""Build the anonymous, optional source download without including runtime data."""
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parent.parent
destination = root / 'public' / 'source' / 'jiahao-source.zip'
destination.parent.mkdir(parents=True, exist_ok=True)
excluded = {'node_modules', '.git', '.openai', 'dist', 'test-results', 'work', '.work', '.sites-runtime', '.sites-checkout'}
entries = []
for base, directories, names in os.walk(root):
    directories[:] = [name for name in directories if name not in excluded]
    for name in sorted(names):
        file = Path(base) / name
        relative = file.relative_to(root)
        if relative.parts[:2] == ('public', 'source') or name.endswith('.tsbuildinfo'):
            continue
        if name in {'.env', '.env.local', 'qa-export.json'}:
            continue
        entries.append((file, 'jiahao-card-table/' + relative.as_posix()))
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
    for file, name in entries:
        archive.write(file, name)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert 'jiahao-card-table/LICENSE' in archive.namelist()
    assert 'jiahao-card-table/src/main.tsx' in archive.namelist()
    assert 'jiahao-card-table/src/data/knowledge.json' in archive.namelist()
print(f'Open source download: {len(entries)} files, {destination.stat().st_size} bytes')
