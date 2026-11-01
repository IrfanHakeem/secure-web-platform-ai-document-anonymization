import re
from collections import OrderedDict
from itertools import islice

import spacy


NLP_MODEL = "en_core_web_md"

nlp = spacy.load(
    NLP_MODEL
)


EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+"
    r"@[A-Za-z0-9.-]+"
    r"\.[A-Za-z]{2,}\b"
)


MALAYSIAN_IC_PATTERN = re.compile(
    r"\b\d{6}-?\d{2}-?\d{4}\b"
)


MALAYSIAN_PHONE_PATTERN = re.compile(
    r"(?<!\d)"
    r"(?:\+?60|0)"
    r"1\d"
    r"[-\s]?"
    r"\d{3,4}"
    r"[-\s]?"
    r"\d{4}"
    r"(?!\d)"
)


def add_detection(
    detections: list[dict],
    pii_type: str,
    value: str,
    start: int,
    end: int,
    source: str,
    seen_positions: set[tuple[int, int]] | None = None,
) -> None:
    # Use O(1) duplicate checking in the primary detect_pii pipeline.
    position = (start, end)
    if seen_positions is not None:
        if position in seen_positions:
            return
        seen_positions.add(position)
    else:
        # Preserve compatibility with callers using the old signature.
        if any(item["start"] == start and item["end"] == end
               for item in detections):
            return

    detections.append({
        "type": pii_type,
        "value": value,
        "start": start,
        "end": end,
        "source": source,
    })


def detect_regex_pii(
    text: str,
    detections: list[dict],
    seen_positions: set[tuple[int, int]] | None = None,
) -> None:
    patterns = [
        ("EMAIL", EMAIL_PATTERN),
        ("MALAYSIAN_IC", MALAYSIAN_IC_PATTERN),
        ("PHONE", MALAYSIAN_PHONE_PATTERN),
    ]

    for pii_type, pattern in patterns:
        for match in pattern.finditer(text):
            add_detection(
                detections=detections,
                pii_type=pii_type,
                value=match.group(),
                start=match.start(),
                end=match.end(),
                source="regex",
                seen_positions=seen_positions,
            )


def _name_segments(text: str):
    # Preserve the original segmentation and absolute character offsets.
    for segment_match in re.finditer(r"[^|\r\n]+", text):
        raw_segment = segment_match.group()
        leading_spaces = len(raw_segment) - len(raw_segment.lstrip())
        segment_text = raw_segment.strip()
        if not segment_text:
            continue

        # Numeric-only segments cannot contain a PERSON entity. Emails are
        # already covered by regex and should not be passed to the NER model.
        if not any(character.isalpha() for character in segment_text):
            continue
        if EMAIL_PATTERN.fullmatch(segment_text):
            continue

        yield segment_text, segment_match.start() + leading_spaces


def detect_person_names(
    text: str,
    detections: list[dict],
    seen_positions: set[tuple[int, int]] | None = None,
) -> None:
    # Batch spaCy inference; repeated segments reuse the same NER results.
    # A bounded cache avoids retaining every unique field of a 25 MB CSV.
    cache: OrderedDict[str, tuple[tuple[int, int, str], ...]] = OrderedDict()
    segments = iter(_name_segments(text))
    while True:
        chunk = list(islice(segments, 256))
        if not chunk:
            break

        batch_results: dict[str, tuple[tuple[int, int, str], ...]] = {}
        unseen = []
        for segment_text, _offset in chunk:
            if segment_text in batch_results:
                continue
            if segment_text in cache:
                batch_results[segment_text] = cache[segment_text]
                cache.move_to_end(segment_text)
            else:
                unseen.append((segment_text, segment_text))
                # Mark within chunk: prevent repeated NLP on the same text.
                batch_results[segment_text] = ()

        for document, segment_text in nlp.pipe(
            unseen,
            as_tuples=True,
            batch_size=128,
            n_process=1,
        ):
            entities = tuple(
                (entity.start_char, entity.end_char, entity.text)
                for entity in document.ents
                if entity.label_ == "PERSON"
            )
            batch_results[segment_text] = entities
            cache[segment_text] = entities

        while len(cache) > 4096:
            cache.popitem(last=False)

        for segment_text, segment_start in chunk:
            for start_char, end_char, value in batch_results[segment_text]:
                add_detection(
                    detections=detections,
                    pii_type="NAME",
                    value=value,
                    start=segment_start + start_char,
                    end=segment_start + end_char,
                    source="spacy",
                    seen_positions=seen_positions,
                )


def detect_pii(
    text: str
) -> list[dict]:

    if not text:
        return []

    detections: list[dict] = []
    seen_positions: set[tuple[int, int]] = set()

    detect_regex_pii(
        text, detections, seen_positions
    )

    detect_person_names(
        text, detections, seen_positions
    )

    detections.sort(
        key=lambda item: item["start"]
    )

    return detections