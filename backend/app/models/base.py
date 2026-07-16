from pydantic import BaseModel, ConfigDict, model_validator

MAX_GENERIC_STRING_LENGTH = 20_000
MAX_GENERIC_COLLECTION_ITEMS = 100
MAX_GENERIC_MAPPING_KEYS = 100
MAX_INPUT_NESTING_DEPTH = 10


def _validate_input_bounds(value, depth=0):
    if depth > MAX_INPUT_NESTING_DEPTH:
        raise ValueError("Input nesting is too deep")

    if isinstance(value, str):
        if len(value) > MAX_GENERIC_STRING_LENGTH:
            raise ValueError(
                f"Text fields cannot exceed {MAX_GENERIC_STRING_LENGTH} characters"
            )
        return

    if isinstance(value, dict):
        if len(value) > MAX_GENERIC_MAPPING_KEYS:
            raise ValueError(
                f"Objects cannot contain more than {MAX_GENERIC_MAPPING_KEYS} fields"
            )
        for key, item in value.items():
            _validate_input_bounds(key, depth + 1)
            _validate_input_bounds(item, depth + 1)
        return

    if isinstance(value, (list, tuple, set)):
        if len(value) > MAX_GENERIC_COLLECTION_ITEMS:
            raise ValueError(
                f"Lists cannot contain more than {MAX_GENERIC_COLLECTION_ITEMS} items"
            )
        for item in value:
            _validate_input_bounds(item, depth + 1)


class SecureBaseModel(BaseModel):
    model_config = ConfigDict(
        str_max_length=MAX_GENERIC_STRING_LENGTH,
        allow_inf_nan=False,
    )

    @model_validator(mode="before")
    @classmethod
    def validate_input_bounds(cls, value):
        _validate_input_bounds(value)
        return value
