"""Build both browser packages. Python 3 standard library only; no compilation."""
from pathlib import Path
import json, shutil, zipfile, hashlib

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT.parent

def archive(folder, destination):
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as output:
        for path in sorted(folder.rglob('*')):
            if path.is_file() and not {'.git', '__pycache__', 'node_modules', 'artifacts'}.intersection(path.relative_to(folder).parts):
                output.write(path, path.relative_to(folder).as_posix())

manifest = json.loads((SRC / 'manifest.json').read_text(encoding='utf-8-sig'))
version = manifest['version']
artifacts = []
for browser in ('chrome', 'firefox'):
    target = ROOT / browser
    target.mkdir(exist_ok=True)
    for path in SRC.rglob('*'):
        if path.is_file():
            dest = target / path.relative_to(SRC)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, dest)
    config = json.loads(json.dumps(manifest))
    if browser == 'firefox':
        config.pop('minimum_chrome_version', None)
        config['background'] = {'scripts': ['background.js'], 'type': 'module'}
        config['browser_specific_settings'] = {'gecko': {
            'id': 'kakomi@extensions.local',
            'strict_min_version': '140.0',
            'data_collection_permissions': {'required': ['none']}
        }}
    (target / 'manifest.json').write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    # Ensure every package entry point and icon exists before writing a ZIP.
    needed = ['api.js', 'geometry.js', 'picker.js', config['options_ui']['page']]
    needed += list(config['icons'].values())
    needed += [config['background'].get('service_worker', 'background.js')]
    for name in needed:
        assert (target / name).is_file(), f'Missing {browser} asset: {name}'
    package = OUT / f'kakomi-{browser}-{version}.zip'
    archive(target, package)
    artifacts.append(package)
    if browser == 'firefox':
        xpi = OUT / f'kakomi-firefox-{version}-unsigned.xpi'
        shutil.copyfile(package, xpi)
        artifacts.append(xpi)

source_zip = OUT / f'kakomi-source-{version}.zip'
archive(ROOT, source_zip)
artifacts.append(source_zip)
(OUT / 'kakomi-checksums.txt').write_text(''.join(
    hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in artifacts), encoding='utf-8')
print('\n'.join(str(p) for p in artifacts))
