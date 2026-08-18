import sys
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: python scripts/prepare-masked-depth-input.py "
            "<rgba-image> <masked-rgb.png> <binary-alpha.png>"
        )

    rgba_path, rgb_output_path, alpha_output_path = map(Path, sys.argv[1:])
    rgba = np.asarray(Image.open(rgba_path).convert("RGBA"), dtype=np.uint8)
    alpha = rgba[..., 3] >= 128
    masked = np.where(alpha[..., None], rgba[..., :3], 0).astype(np.uint8)
    rgb_output_path.parent.mkdir(parents=True, exist_ok=True)
    alpha_output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(masked, mode="RGB").save(rgb_output_path)
    Image.fromarray((alpha.astype(np.uint8) * 255), mode="L").save(alpha_output_path)
    print(f"kept {alpha.mean() * 100:.2f}%")
    print(f"saved {rgb_output_path}")
    print(f"saved {alpha_output_path}")


if __name__ == "__main__":
    main()
