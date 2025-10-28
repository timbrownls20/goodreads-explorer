"""JSON export functionality for Goodreads library data.

Exports Library objects to JSON format with schema versioning per FR-010.
Per Constitution Principle IV: Contract testing for export formats.
"""

import json
from pathlib import Path
from typing import Any

from src.models import Library
from src.logging_config import get_logger

logger = get_logger(__name__)


def export_to_json(library: Library, output_path: Path | str) -> None:
    """Export library to JSON file.

    Args:
        library: Library object to export
        output_path: Path to output JSON file

    Raises:
        IOError: If file cannot be written

    Example:
        >>> library = Library(...)
        >>> export_to_json(library, "library_export.json")
    """
    output_path = Path(output_path)

    # Convert library to JSON using Pydantic
    json_data = library_to_json_dict(library)

    # Write to file with proper formatting
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False, default=str)

    logger.info(
        "JSON export complete",
        output_path=str(output_path),
        file_size_bytes=output_path.stat().st_size,
        total_books=library.total_books
    )


def library_to_json_dict(library: Library) -> dict[str, Any]:
    """Convert Library to JSON-serializable dictionary.

    Args:
        library: Library object

    Returns:
        Dictionary conforming to JSON export schema

    Example:
        >>> library = Library(...)
        >>> json_dict = library_to_json_dict(library)
        >>> assert "schema_version" in json_dict
    """
    # Use Pydantic's model_dump with mode='json' for proper serialization
    data = library.model_dump(mode='json')

    # Add total_books as top-level field for convenience
    data['total_books'] = library.total_books

    return data


def library_to_json_string(library: Library, indent: int = 2) -> str:
    """Convert Library to JSON string.

    Args:
        library: Library object
        indent: JSON indentation level (default 2)

    Returns:
        JSON string

    Example:
        >>> library = Library(...)
        >>> json_str = library_to_json_string(library)
        >>> print(json_str)
    """
    json_data = library_to_json_dict(library)
    return json.dumps(json_data, indent=indent, ensure_ascii=False, default=str)
