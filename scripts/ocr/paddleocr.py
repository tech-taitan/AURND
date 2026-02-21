import json
import sys
from paddleocr import PaddleOCR


def run_ocr(image_path: str):
    ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    result = ocr.ocr(image_path, cls=True)

    lines = []
    for page in result:
        for item in page:
            text = item[1][0]
            lines.append(text)

    text = "\n".join(lines)
    return {"text": text, "lines": lines}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing file path"}))
        sys.exit(1)

    image_path = sys.argv[1]
    output = run_ocr(image_path)
    print(json.dumps(output))


if __name__ == "__main__":
    main()
