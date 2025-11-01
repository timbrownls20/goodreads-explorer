"""JSON export functionality for Goodreads library data.

Exports Library objects to JSON format with schema versioning per FR-010.
Per Constitution Principle IV: Contract testing for export formats.
"""

import json
from pathlib import Path
from typing import Any

from src.models import Library, UserBookRelation
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


def export_book_to_file(user_book: UserBookRelation, output_dir: Path, username: str = None) -> Path:
    """Export a single book to a JSON file in the specified directory.

    Args:
        user_book: UserBookRelation object to export
        output_dir: Directory to save the book file in
        username: Optional username for metadata

    Returns:
        Path to the created file

    Example:
        >>> book = UserBookRelation(...)
        >>> file_path = export_book_to_file(book, Path("library_name"))
    """
    # Ensure output directory exists
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create filename from publication_date and title
    # Format: YYYYmmdd_title_with_underscores.json
    from datetime import datetime
    import re

    # Parse publication date
    pub_date_str = "00000000"  # Default for missing/invalid dates
    if user_book.book.publication_date:
        try:
            # Try to parse the publication date (could be various formats)
            pub_date = user_book.book.publication_date
            # If it's already a date object
            if hasattr(pub_date, 'year'):
                pub_date_str = f"{pub_date.year:04d}{pub_date.month:02d}{pub_date.day:02d}"
            else:
                # If it's a string, try to parse it
                # Common formats: "2021-01-15", "January 15, 2021", "2021", etc.
                pub_str = str(pub_date).strip()

                # Try ISO format first
                try:
                    parsed = datetime.fromisoformat(pub_str)
                    pub_date_str = f"{parsed.year:04d}{parsed.month:02d}{parsed.day:02d}"
                except ValueError:
                    # Try to extract year at minimum
                    year_match = re.search(r'\b(19|20)\d{2}\b', pub_str)
                    if year_match:
                        pub_date_str = f"{year_match.group(0)}0000"
        except Exception as e:
            logger.debug(f"Could not parse publication date: {user_book.book.publication_date}, using default")

    # Clean title for filename
    title = user_book.book.title or "unknown_title"
    # Replace spaces with underscores and remove/replace invalid filename characters
    title_clean = re.sub(r'[^\w\s-]', '', title)  # Remove special chars except spaces, hyphens, underscores
    title_clean = re.sub(r'\s+', '_', title_clean)  # Replace spaces with underscores
    title_clean = re.sub(r'_+', '_', title_clean)  # Collapse multiple underscores
    title_clean = title_clean.strip('_')  # Remove leading/trailing underscores

    # Limit filename length (keep first 100 chars of title)
    if len(title_clean) > 100:
        title_clean = title_clean[:100]

    filename = f"{pub_date_str}_{title_clean}.json"
    output_path = output_dir / filename

    # Convert to JSON-serializable dict
    book_data = user_book.model_dump(mode='json')

    # Add metadata
    if username:
        book_data['_metadata'] = {
            'username': username,
            'exported_at': str(Path(output_path).stat().st_mtime) if output_path.exists() else None
        }

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(book_data, f, indent=2, ensure_ascii=False, default=str)

    return output_path


def export_library_to_directory(library: Library, output_dir: Path | str) -> int:
    """Export library with each book as a separate JSON file.

    Args:
        library: Library object to export
        output_dir: Directory path (will be created if doesn't exist)

    Returns:
        Number of books exported

    Example:
        >>> library = Library(...)
        >>> count = export_library_to_directory(library, "username_library")
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Export metadata file
    metadata = {
        'user_id': library.user_id,
        'username': library.username,
        'profile_url': library.profile_url,
        'total_books': library.total_books,
        'scraped_at': library.scraped_at.isoformat() if library.scraped_at else None,
        'schema_version': library.schema_version
    }

    metadata_path = output_dir / '_library_metadata.json'
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False, default=str)

    # Export each book
    exported_count = 0
    for user_book in library.user_books:
        try:
            export_book_to_file(user_book, output_dir, library.username)
            exported_count += 1
        except Exception as e:
            logger.error(
                "Failed to export book",
                goodreads_id=user_book.book.goodreads_id,
                error=str(e)
            )

    logger.info(
        "Library directory export complete",
        output_dir=str(output_dir),
        total_books=exported_count,
        metadata_file=str(metadata_path)
    )

    return exported_count
