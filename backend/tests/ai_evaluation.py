from collections import defaultdict
from statistics import mean
from time import perf_counter

from app.services.pii_detector import detect_pii


TEST_CASES = [
    {
        "text": (
            "Nur Aisyah can be contacted at "
            "aisyah@example.com or 012-3456789. "
            "Her IC is 010203-10-1234."
        ),
        "expected": {
            ("NAME", "Nur Aisyah"),
            ("EMAIL", "aisyah@example.com"),
            ("PHONE", "012-3456789"),
            ("MALAYSIAN_IC", "010203-10-1234"),
        },
    },
    {
        "text": (
            "Ahmad Hakim submitted the report. "
            "His email is ahmad.hakim@gmail.com "
            "and his mobile number is +60123456789."
        ),
        "expected": {
            ("NAME", "Ahmad Hakim"),
            ("EMAIL", "ahmad.hakim@gmail.com"),
            ("PHONE", "+60123456789"),
        },
    },
    {
        "text": (
            "Muhammad Irfan has identification "
            "number 991212145678 and phone "
            "013-7654321."
        ),
        "expected": {
            ("NAME", "Muhammad Irfan"),
            ("MALAYSIAN_IC", "991212145678"),
            ("PHONE", "013-7654321"),
        },
    },
    {
        "text": (
            "Sarah Johnson sent the document "
            "to sarah.johnson@example.org."
        ),
        "expected": {
            ("NAME", "Sarah Johnson"),
            ("EMAIL", "sarah.johnson@example.org"),
        },
    },
    {
        "text": (
            "The monthly project report contains "
            "general information about system "
            "development and testing."
        ),
        "expected": set(),
    },
]


PII_TYPES = [
    "NAME",
    "EMAIL",
    "PHONE",
    "MALAYSIAN_IC",
]


def safe_divide(
    numerator: int,
    denominator: int
) -> float:

    if denominator == 0:
        return 0.0

    return numerator / denominator


def calculate_metrics(
    true_positive: int,
    false_positive: int,
    false_negative: int
) -> dict:

    precision = safe_divide(
        true_positive,
        true_positive + false_positive
    )

    recall = safe_divide(
        true_positive,
        true_positive + false_negative
    )

    if precision + recall == 0:
        f1_score = 0.0

    else:
        f1_score = (
            2
            * precision
            * recall
            / (
                precision
                + recall
            )
        )

    return {
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
    }


def run_accuracy_test():

    totals = defaultdict(
        lambda: {
            "tp": 0,
            "fp": 0,
            "fn": 0,
        }
    )

    overall_tp = 0
    overall_fp = 0
    overall_fn = 0

    print()
    print(
        "AI PII DETECTION EVALUATION"
    )
    print(
        "=" * 60
    )

    for index, test_case in enumerate(
        TEST_CASES,
        start=1
    ):

        detections = detect_pii(
            test_case["text"]
        )

        predicted = {
            (
                detection["type"],
                detection["value"],
            )
            for detection in detections
        }

        expected = test_case[
            "expected"
        ]

        true_positives = (
            predicted
            & expected
        )

        false_positives = (
            predicted
            - expected
        )

        false_negatives = (
            expected
            - predicted
        )

        print()
        print(
            f"TEST CASE {index}"
        )

        print(
            f"Expected: {expected}"
        )

        print(
            f"Predicted: {predicted}"
        )

        print(
            f"TP: {len(true_positives)}"
        )

        print(
            f"FP: {len(false_positives)}"
        )

        print(
            f"FN: {len(false_negatives)}"
        )

        for pii_type in PII_TYPES:

            expected_type = {
                item
                for item in expected
                if item[0] == pii_type
            }

            predicted_type = {
                item
                for item in predicted
                if item[0] == pii_type
            }

            totals[pii_type]["tp"] += len(
                expected_type
                & predicted_type
            )

            totals[pii_type]["fp"] += len(
                predicted_type
                - expected_type
            )

            totals[pii_type]["fn"] += len(
                expected_type
                - predicted_type
            )

        overall_tp += len(
            true_positives
        )

        overall_fp += len(
            false_positives
        )

        overall_fn += len(
            false_negatives
        )

    print()
    print(
        "=" * 60
    )

    print(
        "PER-TYPE RESULTS"
    )

    for pii_type in PII_TYPES:

        result = totals[
            pii_type
        ]

        metrics = calculate_metrics(
            result["tp"],
            result["fp"],
            result["fn"],
        )

        print()
        print(
            f"{pii_type}:"
        )

        print(
            f"  TP: {result['tp']}"
        )

        print(
            f"  FP: {result['fp']}"
        )

        print(
            f"  FN: {result['fn']}"
        )

        print(
            "  Precision: "
            f"{metrics['precision']:.2%}"
        )

        print(
            "  Recall: "
            f"{metrics['recall']:.2%}"
        )

        print(
            "  F1-score: "
            f"{metrics['f1_score']:.2%}"
        )

    overall_metrics = calculate_metrics(
        overall_tp,
        overall_fp,
        overall_fn,
    )

    print()
    print(
        "=" * 60
    )

    print(
        "OVERALL RESULTS"
    )

    print(
        f"True Positives: "
        f"{overall_tp}"
    )

    print(
        f"False Positives: "
        f"{overall_fp}"
    )

    print(
        f"False Negatives: "
        f"{overall_fn}"
    )

    print(
        "Precision: "
        f"{overall_metrics['precision']:.2%}"
    )

    print(
        "Recall: "
        f"{overall_metrics['recall']:.2%}"
    )

    print(
        "F1-score: "
        f"{overall_metrics['f1_score']:.2%}"
    )


def run_performance_test():

    test_text = (
        "Nur Aisyah works in the IT department. "
        "Her IC is 010203-10-1234. "
        "Her email address is "
        "aisyah@example.com and her phone "
        "number is 012-3456789. "
    )

    short_text = test_text

    medium_text = (
        test_text * 10
    )

    large_text = (
        test_text * 50
    )

    performance_cases = {
        "SHORT": short_text,
        "MEDIUM": medium_text,
        "LARGE": large_text,
    }

    iterations = 10

    print()
    print(
        "AI PROCESSING PERFORMANCE TEST"
    )

    print(
        "=" * 60
    )

    for name, text in (
        performance_cases.items()
    ):

        times = []

        for _ in range(
            iterations
        ):

            start = perf_counter()

            detect_pii(
                text
            )

            elapsed_ms = (
                perf_counter()
                - start
            ) * 1000

            times.append(
                elapsed_ms
            )

        print()
        print(
            f"{name}"
        )

        print(
            f"Characters: "
            f"{len(text)}"
        )

        print(
            f"Iterations: "
            f"{iterations}"
        )

        print(
            "Average processing time: "
            f"{mean(times):.2f} ms"
        )

        print(
            "Fastest: "
            f"{min(times):.2f} ms"
        )

        print(
            "Slowest: "
            f"{max(times):.2f} ms"
        )


def main():

    run_accuracy_test()

    run_performance_test()


if __name__ == "__main__":
    main()