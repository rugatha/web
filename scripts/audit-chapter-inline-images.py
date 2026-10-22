#!/usr/bin/env python3
"""Compare pre-migration chapter-body images with the current rendered JSON content."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


class Images(HTMLParser):
    def __init__(self, body_only=False):
        super().__init__(convert_charrefs=True)
        self.body_only = body_only
        self.stack = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        context = dict(self.stack[-1][1]) if self.stack else {'body': False, 'media': False, 'language': 'default'}
        classes = attrs.get('class', '').split()
        if tag == 'article' and 'campaign-detail' in classes:
            context['body'] = 'arc-detail' not in classes
        if 'campaign-detail__media' in classes:
            context['media'] = True
        for language in ('zh', 'en'):
            if 'campaign-detail__content_' + language in classes:
                context['language'] = language
        if tag == 'img' and (not self.body_only or (context['body'] and not context['media'])):
            self.images.append({'src': attrs.get('src', ''), 'alt': attrs.get('alt', ''),
                                'language': context['language']})
        if tag not in VOID:
            self.stack.append((tag, context))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True)


def html_fragments(content):
    """Follow the renderer's sections/paragraphs/html/quote shapes, ignoring unused fields."""
    if isinstance(content, str):
        yield content
    elif isinstance(content, list):
        for section in content:
            for item in section.get('paragraphs', []):
                if isinstance(item, str):
                    yield item
                elif isinstance(item, dict):
                    if isinstance(item.get('html'), str):
                        yield item['html']
                    elif isinstance(item.get('quote'), str):
                        yield item['quote']
                        if item.get('cite'):
                            yield item['cite']


def current_images(entry):
    result = {}
    for language, content in entry['content'].items():
        result[language] = []
        for fragment in html_fragments(content):
            parser = Images()
            parser.feed(fragment)
            result[language].extend(parser.images)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', default='9184320^')
    parser.add_argument('--migration', default='9184320')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    data = json.loads((ROOT / 'campaigns/data/chapter-content.json').read_text())
    migrated = json.loads(git('show', args.migration + ':campaigns/data/chapter-content.json'))
    manifest = json.loads((ROOT / 'docs/image-migration/pilot-manifest.json').read_text())
    aliases = {variant['url']: image['source'] for image in manifest['images']
               for variant in image['variants'].values()}

    def source(src, page):
        if src in aliases:
            return aliases[src]
        url = urlsplit(src)
        if url.netloc and url.hostname not in ('rugatha.com', 'www.rugatha.com'):
            return src
        path = unquote(url.path)
        return posixpath.normpath(path.lstrip('/') if path.startswith('/')
                                  else posixpath.join(posixpath.dirname(page), path))

    def compare(old, entry, page):
        images = current_images(entry)
        # A previously unlabelled Chinese article may now have explicit zh/en blocks.
        languages = ['zh' if item['language'] == 'default' and 'zh' in images
                     else item['language'] for item in old]
        missing = []
        for language in sorted(set(languages)):
            available = Counter(source(i['src'], page) for i in images.get(language, images.get('default', [])))
            for image, target in zip(old, languages):
                if target != language:
                    continue
                path = source(image['src'], page)
                if available[path]:
                    available[path] -= 1
                else:
                    missing.append({**image, 'targetLanguage': target, 'source': path})
        return missing

    baseline_files = git('ls-tree', '-r', '--name-only', args.baseline, 'campaigns/pages').splitlines()
    old_pages = {}
    for page in baseline_files:
        if page.endswith('.html'):
            images = Images(body_only=True)
            images.feed(git('show', args.baseline + ':' + page))
            old_pages[page] = images.images
    pages, unresolved, missing_files, missing_at_migration = [], [], [], []
    for key, entry in data.items():
        page = entry['source']
        images = current_images(entry)
        old = old_pages.get(page, [])
        missing = compare(old, entry, page)
        unresolved.extend({'chapter': key, **item} for item in missing)
        if key in migrated:
            missing_at_migration.extend({'chapter': key, **item}
                                        for item in compare(old, migrated[key], page))
        current = {lang: [{**image, 'source': source(image['src'], page)} for image in items]
                   for lang, items in images.items()}
        for language, items in current.items():
            for image in items:
                path = image['source']
                if not urlsplit(path).scheme and not (ROOT / path).is_file():
                    missing_files.append({'chapter': key, 'language': language, 'source': path})
        pages.append({'chapter': key, 'page': page, 'hasBaseline': page in old_pages,
                      'historicalImages': old, 'currentImages': current, 'unresolved': missing})
    mapped = {entry['source'] for entry in data.values()}
    unmapped = [{'page': page, 'images': images} for page, images in old_pages.items()
                if images and page not in mapped]
    current_html = list((ROOT / 'campaigns/pages').rglob('*.html'))
    unmapped_current = []
    for file in current_html:
        page = file.relative_to(ROOT).as_posix()
        if page not in mapped:
            images = Images(body_only=True)
            images.feed(file.read_text())
            if images.images:
                unmapped_current.append({'page': page, 'images': images.images})
    report = {
        'checkedAt': datetime.now(timezone.utc).isoformat(), 'head': git('rev-parse', 'HEAD').strip(),
        'baseline': git('rev-parse', args.baseline).strip(), 'migration': git('rev-parse', args.migration).strip(),
        'summary': {'chapters': len(pages), 'baselineHtmlPages': len(old_pages), 'currentHtmlPages': len(current_html),
                    'chaptersWithBaseline': sum(p['hasBaseline'] for p in pages),
                    'historicalOccurrences': sum(len(p['historicalImages']) for p in pages),
                    'currentOccurrences': sum(len(v) for p in pages for v in p['currentImages'].values()),
                    'chaptersWithInlineImages': sum(any(p['currentImages'].values()) for p in pages)},
        'missingAtMigration': missing_at_migration, 'unresolved': unresolved,
        'missingLocalFiles': missing_files, 'unmappedHistoricalBodyImages': unmapped,
        'unmappedCurrentBodyImages': unmapped_current, 'pages': pages,
        'limitations': 'Checks img src in chapter body HTML and renderer-supported JSON content; excludes hero banners, navigation, CSS backgrounds, srcset, external availability and image quality. No HTML baseline is claimed for chapters added after the migration. Browser verification is separate.'
    }
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({**report['summary'], 'missingAtMigration': len(missing_at_migration),
                      'unresolved': len(unresolved), 'missingLocalFiles': len(missing_files),
                      'unmappedHistoricalBodyImages': len(unmapped),
                      'unmappedCurrentBodyImages': len(unmapped_current)}, ensure_ascii=False))
    return int(bool(unresolved or missing_files or unmapped or unmapped_current))


if __name__ == '__main__':
    raise SystemExit(main())
