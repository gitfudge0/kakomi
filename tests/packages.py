"""Validate the generated browser ZIPs and their local resource references."""
import json, re, zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
version = json.loads((root/'src/manifest.json').read_text(encoding='utf-8-sig'))['version']
for browser in ('chrome','firefox'):
    with zipfile.ZipFile(root.parent/f'kakomi-{browser}-{version}.zip') as archive:
        names=set(archive.namelist())
        config=json.loads(archive.read('manifest.json'))
        assert config['name']=='Kakomi'
        assert config['manifest_version']==3
        assert set(config['permissions'])=={'activeTab','scripting','storage','clipboardWrite'}
        assert not config.get('host_permissions')
        assert not config.get('content_scripts')
        for name in config['icons'].values():
            assert name in names
            assert archive.read(name).startswith(b'\x89PNG\r\n\x1a\n')
        if browser=='chrome':
            assert config['background']=={'service_worker':'background.js','type':'module'}
            assert 'browser_specific_settings' not in config
        else:
            assert config['background']=={'scripts':['background.js'],'type':'module'}
            assert config['browser_specific_settings']['gecko']['data_collection_permissions']=={'required':['none']}
            assert 'minimum_chrome_version' not in config
        for name in names:
            if name.endswith('.html'):
                html=archive.read(name).decode('utf-8-sig')
                for ref in re.findall(r'(?:src|href)="([^"]+)"',html):
                    assert ref.split('?')[0] in names, (name,ref)
        for name in ('preview.html','settings.html'):
            html=archive.read(name).decode('utf-8-sig')
            assert html.index('api.js') < html.index(name.replace('.html','.js'))
        print(f'PASS: {browser} manifest, resource references, permissions, script order, PNG assets, ZIP layout')
