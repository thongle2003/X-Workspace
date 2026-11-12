from __future__ import annotations

import io
import json
import re
import zipfile
from pathlib import PurePath
from typing import Any

from .config import (
    ALLOWED_EXTENSIONS, MAX_FILE_BYTES, MAX_IMAGE_PIXELS, MAX_OFFICE_ENTRIES,
    MAX_OFFICE_EXPANDED_BYTES, MAX_PDF_PAGES, OCR_LANGUAGES, OCR_TIMEOUT_SECONDS,
)
from .injection import decision_for, sanitize_for_model, scan_text
from .models import GuardrailError, ScanResult


class _UnreadableFile(GuardrailError):
    pass


def _signature(data: bytes) -> str:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if data.startswith((b"II*\x00", b"MM\x00*")):
        return "tiff"
    if data.startswith(b"BM"):
        return "bmp"
    if len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"PK\x03\x04"):
        return "zip"
    if b"\x00" not in data[:8192]:
        return "text"
    return "unknown"


def _check_size(name: str, data: bytes) -> str:
    extension = PurePath(name).suffix.casefold()
    if extension not in ALLOWED_EXTENSIONS:
        raise GuardrailError("FILE_TYPE", "Định dạng tệp chưa được quét an toàn; không gửi tệp này tới AI.")
    if not data or len(data) > MAX_FILE_BYTES:
        raise GuardrailError("FILE_SIZE", "Tệp rỗng hoặc vượt giới hạn 5 MB.")
    signature = _signature(data)
    expected = {
        ".pdf": {"pdf"}, ".png": {"png"}, ".jpg": {"jpeg"}, ".jpeg": {"jpeg"},
        ".webp": {"webp"}, ".tif": {"tiff"}, ".tiff": {"tiff"}, ".bmp": {"bmp"},
        ".docx": {"zip"}, ".xlsx": {"zip"}, ".pptx": {"zip"},
        ".txt": {"text"}, ".md": {"text"}, ".csv": {"text"}, ".json": {"text"},
    }[extension]
    if signature not in expected:
        raise GuardrailError("FILE_MISMATCH", "Phần mở rộng không khớp chữ ký nội dung của tệp.")
    return extension


def _ocr(image: Any) -> str:
    try:
        from PIL import Image, ImageOps, ImageEnhance
        import pytesseract
    except ImportError as error:
        raise GuardrailError("OCR_UNAVAILABLE", "Thiếu bộ quét OCR; ảnh chưa được gửi tới AI.") from error
    if not isinstance(image, Image.Image):
        raise GuardrailError("OCR_IMAGE", "Không đọc được ảnh để quét OCR.")
    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise GuardrailError("IMAGE_PIXELS", "Ảnh vượt giới hạn 20 megapixel.")
    gray = ImageOps.grayscale(image)
    candidates = [ImageOps.autocontrast(gray), ImageOps.invert(ImageOps.autocontrast(gray))]
    # OCR two contrast polarities to catch pale text and white-on-dark/white-on-white attempts.
    extracted: list[str] = []
    for candidate in candidates:
        try:
            text = pytesseract.image_to_string(candidate, lang=OCR_LANGUAGES, config="--psm 6", timeout=OCR_TIMEOUT_SECONDS)
        except Exception as error:
            raise GuardrailError("OCR_UNAVAILABLE", "Không chạy được OCR tiếng Việt/Anh; ảnh chưa được gửi tới AI.") from error
        if text and text.strip():
            extracted.append(text.strip())
    # Keep a third, sharpened/contrasted pass for low-contrast scans.
    sharpened = ImageEnhance.Contrast(gray).enhance(2.5)
    try:
        extra = pytesseract.image_to_string(sharpened, lang=OCR_LANGUAGES, config="--psm 11", timeout=OCR_TIMEOUT_SECONDS)
    except Exception as error:
        raise GuardrailError("OCR_UNAVAILABLE", "Không chạy được OCR; ảnh chưa được gửi tới AI.") from error
    if extra and extra.strip():
        extracted.append(extra.strip())
    return "\n".join(dict.fromkeys(extracted))


def _extract_image(data: bytes) -> str:
    try:
        from PIL import Image, ImageSequence
        image = Image.open(io.BytesIO(data))
        image.verify()
        image = Image.open(io.BytesIO(data))
    except Exception as error:
        raise GuardrailError("IMAGE_DECODE", "Ảnh lỗi hoặc không giải mã được; không gửi ảnh gốc tới AI.") from error
    pieces: list[str] = []
    # Only scan a bounded number of animation frames; the raw image is never passed to the model.
    for index, frame in enumerate(ImageSequence.Iterator(image)):
        if index >= 4:
            break
        pieces.append(_ocr(frame.copy()))
    text = "\n".join(piece for piece in pieces if piece.strip())
    if not text.strip():
        raise GuardrailError("OCR_EMPTY", "Ảnh không có văn bản đọc được; cần mô tả bằng chữ trước khi dùng với AI.")
    return text


def _extract_pdf(data: bytes) -> tuple[str, int, bool]:
    try:
        from pypdf import PdfReader
        from pypdfium2 import PdfDocument
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise GuardrailError("PDF_ENCRYPTED", "PDF có mật khẩu; không thể quét an toàn.")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise GuardrailError("PDF_PAGES", "PDF vượt giới hạn 30 trang.")
        pdf = PdfDocument(data)
    except GuardrailError:
        raise
    except Exception as error:
        raise GuardrailError("PDF_PARSE", "Không giải mã được PDF; tệp không được gửi tới AI.") from error
    pages: list[str] = []
    did_ocr = False
    for index, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as error:
            raise GuardrailError("PDF_PARSE", f"Không trích được trang PDF {index + 1}; tệp bị chặn.") from error
        pages.append(f"[Page {index + 1}]\n{text}" if text.strip() else "")
        # Scan rendered pixels too, so text overlaid as an image cannot bypass extraction.
        try:
            bitmap = pdf[index].render(scale=1.5)
            image = bitmap.to_pil()
            scanned = _ocr(image)
        except GuardrailError as error:
            raise GuardrailError("PDF_OCR", f"Không quét OCR được trang PDF {index + 1}; tệp bị chặn.") from error
        except Exception as error:
            raise GuardrailError("PDF_OCR", f"Không quét OCR được trang PDF {index + 1}; tệp bị chặn.") from error
        if scanned.strip():
            did_ocr = True
            pages.append(f"[Page {index + 1} OCR]\n{scanned}")
    text = "\n".join(part for part in pages if part.strip())
    if not text.strip():
        raise GuardrailError("PDF_EMPTY", "PDF không có nội dung đọc được; tệp bị chặn.")
    metadata = reader.metadata
    if metadata:
        text += "\n" + "\n".join(str(value) for value in metadata.values() if value)
    return text, len(reader.pages), did_ocr


def _zip_text(data: bytes, extension: str) -> tuple[str, int, bool]:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
        entries = archive.infolist()
    except Exception as error:
        raise GuardrailError("OFFICE_ZIP", "Không mở được tài liệu Office; tệp bị chặn.") from error
    if len(entries) > MAX_OFFICE_ENTRIES or sum(item.file_size for item in entries) > MAX_OFFICE_EXPANDED_BYTES:
        raise GuardrailError("OFFICE_SIZE", "Tài liệu Office có cấu trúc nén vượt giới hạn an toàn.")
    if any(item.file_size > 0 and item.file_size / max(1, item.compress_size) > 100 for item in entries):
        raise GuardrailError("OFFICE_RATIO", "Tài liệu có tỷ lệ nén bất thường; tệp bị cách ly.")
    names = {item.filename for item in entries}
    expected = {
        ".docx": "word/document.xml", ".xlsx": "xl/workbook.xml", ".pptx": "ppt/presentation.xml",
    }[extension]
    if expected not in names or "[Content_Types].xml" not in names:
        raise GuardrailError("OFFICE_MISMATCH", "Tệp ZIP không phải tài liệu Office hợp lệ.")
    try:
        from defusedxml import ElementTree as SafeET
    except ImportError as error:
        raise GuardrailError("XML_PARSER", "Thiếu XML parser an toàn; tài liệu Office chưa được gửi tới AI.") from error
    chunks: list[str] = []
    matched_files = 0
    ocr_used = False
    for item in entries:
        name = item.filename.casefold()
        if "/embeddings/" in f"/{name}" and not name.endswith("/"):
            raise GuardrailError("OFFICE_EMBEDDED_OBJECT", "Tài liệu Office chứa đối tượng nhúng chưa được hỗ trợ quét; tệp bị chặn.")
        if "/media/" in f"/{name}" and not name.endswith("/"):
            if item.file_size > 2_000_000:
                raise GuardrailError("OFFICE_MEDIA_SIZE", "Ảnh nhúng trong Office vượt giới hạn; tệp bị chặn.")
            media = archive.read(item)
            media_type = _signature(media)
            if media_type in {"png", "jpeg", "gif", "tiff", "bmp", "webp"}:
                ocr_text = _extract_image(media)
                chunks.append(f"[OCR ảnh nhúng {item.filename}]\n{ocr_text}")
                ocr_used = True
            elif name.endswith(".svg"):
                try:
                    from defusedxml import ElementTree as SafeET
                    root = SafeET.fromstring(media)
                    if any(node.tag.rsplit("}", 1)[-1].casefold() == "image" for node in root.iter()):
                        raise GuardrailError("OFFICE_SVG_IMAGE", "SVG có ảnh nhúng chưa thể quét; tài liệu bị chặn.")
                    for node in root.iter():
                        if node.text and node.text.strip():
                            chunks.append(node.text.strip())
                        chunks.extend(value for key, value in node.attrib.items() if key.casefold() in {"aria-label", "title", "alt"} and value.strip())
                except GuardrailError:
                    raise
                except Exception as error:
                    raise GuardrailError("OFFICE_SVG", "Không quét được SVG trong tài liệu Office; tệp bị chặn.") from error
            else:
                raise GuardrailError("OFFICE_MEDIA_TYPE", f"Ảnh nhúng không hỗ trợ quét: {item.filename}; tệp bị chặn.")
            continue
        if not name.endswith(".xml") or item.file_size > 2_000_000:
            continue
        if not (name.startswith(("word/", "xl/", "ppt/", "docprops/")) or name == "[content_types].xml"):
            continue
        try:
            root = SafeET.fromstring(archive.read(item))
        except Exception as error:
            raise GuardrailError("OFFICE_XML", f"Không đọc được XML trong {item.filename}; tệp bị chặn.") from error
        if any(key.casefold().endswith("targetmode") and value.casefold() == "external" for node in root.iter() for key, value in node.attrib.items()):
            raise GuardrailError("OFFICE_EXTERNAL", "Tài liệu có liên kết ngoài chưa thể kiểm tra; tệp bị chặn.")
        matched_files += 1
        slide_match = re.search(r"ppt/slides/slide(\d+)\.xml$", name)
        sheet_match = re.search(r"xl/worksheets/sheet(\d+)\.xml$", name)
        if slide_match:
            chunks.append(f"[Slide {slide_match.group(1)}]")
        elif sheet_match:
            chunks.append(f"[Sheet {sheet_match.group(1)}]")
        for node in root.iter():
            if node.text and node.text.strip():
                chunks.append(node.text.strip())
            for key, value in node.attrib.items():
                if key.casefold().endswith(("descr", "title", "alttext")) and value.strip():
                    chunks.append(value.strip())
            if sum(map(len, chunks)) > 250_000:
                raise GuardrailError("OFFICE_TEXT", "Văn bản trích từ Office vượt giới hạn.")
    if not chunks:
        raise GuardrailError("OFFICE_EMPTY", "Không trích được nội dung văn bản từ tài liệu Office.")
    return "\n".join(chunks), matched_files, ocr_used


def _extract_text(data: bytes, extension: str) -> str:
    try:
        text = data.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError as error:
        raise GuardrailError("TEXT_ENCODING", "Tệp văn bản phải dùng UTF-8; tệp bị chặn.") from error
    if "\x00" in text:
        raise GuardrailError("TEXT_BINARY", "Tệp có byte nhị phân; không gửi tới AI.")
    if len(text) > 250_000:
        raise GuardrailError("TEXT_LENGTH", "Văn bản trích vượt giới hạn quét 250.000 ký tự.")
    if extension == ".json":
        try:
            json.loads(text)
        except json.JSONDecodeError as error:
            raise GuardrailError("JSON_PARSE", "JSON không hợp lệ; tệp bị chặn.") from error
    return text


def inspect_upload(filename: str, data: bytes) -> ScanResult:
    """Sniff, safely extract/OCR, then scan before any text reaches an LLM."""
    extension = _check_size(filename, data)
    display_name = sanitize_for_model(PurePath(filename).name)[:200]
    signature = _signature(data)
    pages_or_sheets = 1
    ocr_used = False
    if signature in {"png", "jpeg", "gif", "tiff", "bmp", "webp"}:
        text = _extract_image(data)
        ocr_used = True
    elif signature == "pdf":
        text, pages_or_sheets, ocr_used = _extract_pdf(data)
    elif signature == "zip":
        text, pages_or_sheets, ocr_used = _zip_text(data, extension)
    else:
        text = _extract_text(data, extension)
    text = sanitize_for_model(text)
    if not text.strip():
        raise GuardrailError("EMPTY_EXTRACT", "Không trích được nội dung văn bản; tệp không được gửi tới AI.")
    findings = scan_text(text, source=f"file:{display_name}")
    findings.extend(scan_text(display_name, source="filename"))
    media_type = {
        "pdf": "application/pdf", "png": "image/png", "jpeg": "image/jpeg", "gif": "image/gif",
        "tiff": "image/tiff", "bmp": "image/bmp", "webp": "image/webp", "zip": "application/vnd.openxmlformats-officedocument",
        "text": "text/plain; charset=utf-8",
    }[signature]
    return ScanResult(
        filename=display_name,
        media_type=media_type,
        extracted_text=text,
        decision=decision_for(findings),
        findings=findings,
        pages_or_sheets=pages_or_sheets,
        ocr_used=ocr_used,
    )
