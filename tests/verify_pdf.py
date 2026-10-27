from pathlib import Path
from pypdf import PdfReader
import unicodedata

root = Path(__file__).parent / 'output'
for filename, count in [('single.pdf', 1), ('three.pdf', 3), ('supplement.pdf', 3), ('print-fallback.pdf', 3)]:
    reader = PdfReader(root / filename)
    assert len(reader.pages) == count, filename
    for i, page in enumerate(reader.pages):
        assert abs(float(page.mediabox.width) - 595.28) < 1
        assert abs(float(page.mediabox.height) - 841.89) < 1
        text = unicodedata.normalize('NFKC', page.extract_text())
        compact = ''.join(text.split())
        if i < (1 if filename == 'single.pdf' else 3):
            for phrase in ['任務績效報告', '總經理評定', '完成評級', '完成時限', 'C 延遲', 'D 延誤']:
                assert unicodedata.normalize('NFKC', phrase) in text, (filename, i, phrase, text)
            expected_supplement = filename in ('supplement.pdf', 'print-fallback.pdf') and i == 2
            assert (unicodedata.normalize('NFKC', '自我檢討：加強進度回報。') in compact) == expected_supplement
        else:
            assert unicodedata.normalize('NFKC', '自我檢討：加強進度回報。') in compact
    first = unicodedata.normalize('NFKC', reader.pages[0].extract_text())
    for phrase in ['測試同事', 'Alpha 123', '完成第一版流程驗證。', 'English text 123', '<script>安全測試</script>']:
        assert phrase in first, (filename, phrase)
    print(f'PASS {filename}: {count} A4 pages, searchable Chinese/English, task review and supplement separation')
print('PASS all PDF text extraction checks')
