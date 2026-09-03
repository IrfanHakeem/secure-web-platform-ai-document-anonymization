import re

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
) -> None:

    for existing in detections:
        if (
            existing["start"] == start
            and
            existing["end"] == end
        ):
            return

    detections.append(
        {
            "type": pii_type,
            "value": value,
            "start": start,
            "end": end,
            "source": source,
        }
    )


def detect_regex_pii(
    text: str,
    detections: list[dict]
) -> None:

    patterns = [
        (
            "EMAIL",
            EMAIL_PATTERN
        ),
        (
            "MALAYSIAN_IC",
            MALAYSIAN_IC_PATTERN
        ),
        (
            "PHONE",
            MALAYSIAN_PHONE_PATTERN
        ),
    ]

    for pii_type, pattern in patterns:

        for match in pattern.finditer(
            text
        ):
            add_detection(
                detections=detections,
                pii_type=pii_type,
                value=match.group(),
                start=match.start(),
                end=match.end(),
                source="regex",
            )


def detect_person_names(
    text: str,
    detections: list[dict]
) -> None:

    segments = re.finditer(
        r"[^|\r\n]+",
        text
    )

    for segment_match in segments:

        raw_segment = (
            segment_match.group()
        )

        leading_spaces = (
            len(raw_segment)
            - len(raw_segment.lstrip())
        )

        segment_text = (
            raw_segment.strip()
        )

        if not segment_text:
            continue

        segment_start = (
            segment_match.start()
            + leading_spaces
        )

        document = nlp(
            segment_text
        )

        for entity in document.ents:

            if entity.label_ != "PERSON":
                continue

            absolute_start = (
                segment_start
                + entity.start_char
            )

            absolute_end = (
                segment_start
                + entity.end_char
            )

            add_detection(
                detections=detections,
                pii_type="NAME",
                value=entity.text,
                start=absolute_start,
                end=absolute_end,
                source="spacy",
            )


def detect_pii(
    text: str
) -> list[dict]:

    if not text:
        return []

    detections: list[dict] = []

    detect_regex_pii(
        text,
        detections
    )

    detect_person_names(
        text,
        detections
    )

    detections.sort(
        key=lambda item: item["start"]
    )

    return detections