import warnings
from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.exceptions import bad_request
from app.utils.settings import Settings

ALLOWED_FORMATS = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}


async def validate_and_reencode_image(file: UploadFile, max_bytes: int = 2 * 1024 * 1024):
    contents = await file.read(max_bytes + 1)
    if len(contents) > max_bytes:
        bad_request("Image size must be 2MB or less")
    if not contents:
        bad_request("Image file is empty")

    Image.MAX_IMAGE_PIXELS = Settings.MAX_IMAGE_PIXELS
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(contents)) as source:
                source.verify()
            with Image.open(BytesIO(contents)) as source:
                image_format = source.format
                if image_format not in ALLOWED_FORMATS:
                    bad_request("Only valid JPG, PNG, or WEBP images are allowed")

                expected_type, extension = ALLOWED_FORMATS[image_format]
                if file.content_type != expected_type:
                    bad_request("Image content does not match its declared type")

                source.load()
                output = BytesIO()
                if image_format == "JPEG":
                    if source.mode not in {"RGB", "L"}:
                        source = source.convert("RGB")
                    source.save(output, format="JPEG", quality=90, optimize=True)
                elif image_format == "PNG":
                    source.save(output, format="PNG", optimize=True)
                else:
                    source.save(output, format="WEBP", quality=90, method=6)
                return output.getvalue(), extension
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        bad_request("Invalid or unsafe image file")
