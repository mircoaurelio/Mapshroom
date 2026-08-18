import json
import sys
import urllib.request
from pathlib import Path
from urllib.parse import quote


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response, path.open("wb") as output:
        output.write(response.read())


def main() -> None:
    if len(sys.argv) < 5:
        raise SystemExit(
            "Usage: python scripts/download-hf-image-mask-subset.py "
            "<dataset-id> <split> <output-directory> <limit>"
        )

    dataset_id = sys.argv[1]
    split = sys.argv[2]
    output_directory = Path(sys.argv[3])
    limit = int(sys.argv[4])
    endpoint = (
        "https://datasets-server.huggingface.co/first-rows"
        f"?dataset={quote(dataset_id, safe='')}&config=default&split={quote(split, safe='')}"
    )
    with urllib.request.urlopen(endpoint) as response:
        payload = json.load(response)

    samples = []
    for item in payload["rows"][:limit]:
        sample_id = f"{item['row_idx']:05d}"
        row = item["row"]
        image_path = output_directory / "rgb" / f"{sample_id}.jpg"
        mask_path = output_directory / "mask" / f"{sample_id}.jpg"
        download(row["image"]["src"], image_path)
        download(row["mask"]["src"], mask_path)
        samples.append(
            {
                "id": sample_id,
                "rowIndex": item["row_idx"],
                "rgb": str(image_path.relative_to(output_directory)).replace("\\", "/"),
                "mask": str(mask_path.relative_to(output_directory)).replace("\\", "/"),
                "width": row["image"]["width"],
                "height": row["image"]["height"],
            }
        )
        print(f"downloaded {sample_id} {row['image']['width']}x{row['image']['height']}")

    manifest = {
        "dataset": dataset_id,
        "split": split,
        "sampleCount": len(samples),
        "samples": samples,
    }
    output_directory.mkdir(parents=True, exist_ok=True)
    (output_directory / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
