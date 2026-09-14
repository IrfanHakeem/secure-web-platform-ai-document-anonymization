# Secura PII Pilot Evaluation

This is the clean evaluation package for Objective 1. The **single source-of-truth dataset** is:

```text
Secura_Evaluation_Dataset.xlsx
```

There is no companion CSV dataset.

## Folder placement

Copy the whole `evaluation` folder into:

```text
C:\FYP\backend\evaluation
```

Final structure:

```text
C:\FYP\backend\
├── app\
└── evaluation\
    ├── Secura_Evaluation_Dataset.xlsx
    ├── evaluate_pii.py
    ├── run_evaluation.bat
    ├── README.md
    └── presentation_result_template.txt
```

## Dataset format

The workbook follows the labelled PII style used in your sample testing set:

```text
Name | Email | Phone | Malaysian IC | Text | True Predictions
```

`True Predictions` stores ground-truth entity spans in this form:

```text
[(start, end, 'name'), (start, end, 'email'), ...]
```

The evaluator uses `Text` and `True Predictions` as the authoritative ground truth.

## Run

From CMD:

```cmd
cd /d C:\FYP\backend
python evaluation\evaluate_pii.py
```

Or double-click:

```text
evaluation\run_evaluation.bat
```

The evaluator imports Secura's real functions:

```python
from app.services.pii_detector import detect_pii
from app.services.anonymization_service import anonymize_text
```

## Generated outputs

After running, these files are generated automatically:

```text
evaluation\Secura_Evaluation_Results.xlsx
evaluation\evaluation_summary.txt
```

`Secura_Evaluation_Results.xlsx` contains:

- `Summary` sheet: per-category TP, FP, FN, Precision, Recall and F1-score
- `Details` sheet: row-by-row ground truth versus Secura predictions

The script also calculates end-to-end anonymization coverage.

## Evaluation rule

Detection is scored using **exact entity span + entity type matching**, which is a standard strict way to evaluate entity detection.

The four current Secura labels are:

- NAME
- EMAIL
- PHONE
- MALAYSIAN_IC

## Presentation wording

> We evaluated Secura using a manually labelled pilot dataset. Each test record contains source text and ground-truth PII entity spans. Secura's predicted entities are compared with these labels using exact entity-span and entity-type matching to calculate Precision, Recall and F1-score. We also measure end-to-end anonymization coverage by checking whether the expected sensitive values are removed from the anonymized output.

## Limitation

For Progress Presentation 1, describe the result as a **pilot evaluation**. For the final FYP, expand the dataset, add more realistic document samples and formats, and have the ground-truth labels independently reviewed.
