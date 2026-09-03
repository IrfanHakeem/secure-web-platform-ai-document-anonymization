import random
import re

from faker import Faker

from app.services.pii_detector import detect_pii


fake = Faker()


def generate_fake_ic(
    original_value: str
) -> str:

    digits = "".join(
        character
        for character in original_value
        if character.isdigit()
    )

    if len(digits) != 12:
        return "000000-00-0000"

    year = random.randint(
        70,
        99
    )

    month = random.randint(
        1,
        12
    )

    day = random.randint(
        1,
        28
    )

    state_code = random.randint(
        1,
        16
    )

    serial_number = random.randint(
        1,
        9999
    )

    replacement = (
        f"{year:02d}"
        f"{month:02d}"
        f"{day:02d}"
        f"{state_code:02d}"
        f"{serial_number:04d}"
    )

    if "-" in original_value:
        return (
            f"{replacement[:6]}-"
            f"{replacement[6:8]}-"
            f"{replacement[8:]}"
        )

    return replacement


def generate_fake_phone(
    original_value: str
) -> str:

    replacement_digits = (
        f"01"
        f"{random.randint(0, 9)}"
        f"{random.randint(1000000, 9999999)}"
    )

    if original_value.startswith("+60"):

        local_number = (
            replacement_digits[1:]
        )

        return (
            f"+60"
            f"{local_number}"
        )

    if "-" in original_value:

        return (
            f"{replacement_digits[:3]}-"
            f"{replacement_digits[3:]}"
        )

    if " " in original_value:

        return (
            f"{replacement_digits[:3]} "
            f"{replacement_digits[3:]}"
        )

    return replacement_digits


def generate_replacement(
    pii_type: str,
    original_value: str
) -> str:

    if pii_type == "NAME":
        return fake.name()

    if pii_type == "EMAIL":
        return fake.email()

    if pii_type == "PHONE":
        return generate_fake_phone(
            original_value
        )

    if pii_type == "MALAYSIAN_IC":
        return generate_fake_ic(
            original_value
        )

    return "[REDACTED]"


def build_replacement_map(
    detections: list[dict]
) -> dict[tuple[str, str], str]:

    replacement_map: dict[
        tuple[str, str],
        str
    ] = {}

    for detection in detections:

        key = (
            detection["type"],
            detection["value"],
        )

        if key not in replacement_map:

            replacement_map[key] = (
                generate_replacement(
                    pii_type=detection["type"],
                    original_value=(
                        detection["value"]
                    ),
                )
            )

    return replacement_map


def remove_overlapping_detections(
    detections: list[dict]
) -> list[dict]:

    ordered = sorted(
        detections,
        key=lambda item: (
            item["start"],
            -(
                item["end"]
                - item["start"]
            ),
        )
    )

    filtered: list[dict] = []

    last_end = -1

    for detection in ordered:

        if detection["start"] < last_end:
            continue

        filtered.append(
            detection
        )

        last_end = detection["end"]

    return filtered


def anonymize_text(
    text: str
) -> dict:

    if not text:

        return {
            "original_text":
                text,

            "anonymized_text":
                text,

            "pii_count":
                0,

            "replacements":
                [],
        }

    detections = detect_pii(
        text
    )

    detections = (
        remove_overlapping_detections(
            detections
        )
    )

    replacement_map = (
        build_replacement_map(
            detections
        )
    )

    anonymized_text = text

    replacement_records: list[dict] = []

    for detection in reversed(
        detections
    ):

        key = (
            detection["type"],
            detection["value"],
        )

        replacement = (
            replacement_map[key]
        )

        anonymized_text = (
            anonymized_text[
                :detection["start"]
            ]
            +
            replacement
            +
            anonymized_text[
                detection["end"]:
            ]
        )

        replacement_records.append(
            {
                "type":
                    detection["type"],

                "original":
                    detection["value"],

                "replacement":
                    replacement,
            }
        )

    replacement_records.reverse()

    return {
        "original_text":
            text,

        "anonymized_text":
            anonymized_text,

        "pii_count":
            len(detections),

        "replacements":
            replacement_records,
    }