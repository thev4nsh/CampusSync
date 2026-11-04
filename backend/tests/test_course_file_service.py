import pytest
from fastapi import HTTPException

from app.services.course_file_service import normalize_youtube_url, validate_and_extract


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=UF8uR6Z6KLc&t=30",
        "https://youtu.be/UF8uR6Z6KLc",
        "https://youtube.com/shorts/UF8uR6Z6KLc",
    ],
)
def test_youtube_links_are_canonicalized(url):
    assert normalize_youtube_url(url) == "https://www.youtube.com/watch?v=UF8uR6Z6KLc"


def test_non_youtube_video_urls_are_rejected():
    with pytest.raises(ValueError):
        normalize_youtube_url("https://example.com/watch?v=UF8uR6Z6KLc")


@pytest.mark.parametrize(
    ("filename", "captions"),
    [
        ("lecture.srt", b"1\n00:00:01,000 --> 00:00:02,000\nHello &amp; welcome.\n"),
        ("lecture.vtt", b"WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<i>Hello &amp; welcome.</i>\n"),
    ],
)
def test_subtitle_files_extract_clean_transcript_text(filename, captions):
    safe_name, mime_type, text = validate_and_extract(filename, captions)
    assert safe_name == filename
    assert mime_type in {"application/x-subrip", "text/vtt"}
    assert text == "Hello & welcome."
