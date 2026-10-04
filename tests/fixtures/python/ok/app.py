import os


def home() -> str:
    return os.environ.get("HOME", "")