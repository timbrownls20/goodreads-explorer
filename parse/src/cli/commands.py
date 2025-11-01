"""CLI commands for Goodreads Explorer.

Per Constitution Principle II: CLI as thin wrapper over library API.
Uses Click framework for command-line interface with rich progress display.
"""

from datetime import datetime
from pathlib import Path
from typing import Callable

import click
from rich.console import Console
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TaskProgressColumn,
    TimeRemainingColumn,
)

from src.lib.api import scrape_library, scrape_and_export
from src.logging_config import get_logger
from src.exceptions import (
    InvalidURLError,
    PrivateProfileError,
    RateLimitError,
    ScrapingError,
)

logger = get_logger(__name__)
console = Console()


def map_cli_sort_to_goodreads_sort(sort_by: str) -> str | None:
    """Map CLI sort option to Goodreads sort parameter.

    Args:
        sort_by: CLI sort option (date-read, date-added, title, author, rating, read-count, random, none)

    Returns:
        Goodreads sort parameter or None ('random' returns None as it's handled client-side)
    """
    sort_map = {
        "date-read": "date_read",
        "date-added": "date_added",
        "title": "title",
        "author": "author",
        "rating": "rating",
        "read-count": "read_count",
        "random": None,  # Random is handled after scraping
        "none": None,
    }
    return sort_map.get(sort_by)


@click.group()
@click.version_option(version="1.0.0", prog_name="goodreads-explorer")
def cli():
    """Goodreads Explorer - Scrape and export Goodreads library data.

    A command-line tool for scraping Goodreads user libraries and exporting
    to JSON or CSV formats.

    Example:
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username

        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username \\
            --format csv --output library.csv
    """
    pass


@cli.command()
@click.argument("profile_url", type=str)
@click.option(
    "--format",
    "-f",
    type=click.Choice(["json", "csv"], case_sensitive=False),
    default="json",
    help="Export format (default: json)",
)
@click.option(
    "--output",
    "-o",
    type=click.Path(dir_okay=False, writable=True, path_type=Path),
    default=None,
    help="Output file path (default: <username>_library.<format>)",
)
@click.option(
    "--rate-limit",
    type=float,
    default=1.0,
    help="Delay between requests in seconds (default: 1.0)",
)
@click.option(
    "--max-retries",
    type=int,
    default=3,
    help="Maximum retry attempts for failed requests (default: 3)",
)
@click.option(
    "--timeout",
    type=int,
    default=30,
    help="HTTP request timeout in seconds (default: 30)",
)
@click.option(
    "--no-progress",
    is_flag=True,
    help="Disable progress bar display",
)
@click.option(
    "--limit",
    type=int,
    default=None,
    help="Limit scraping to top N books from each shelf (default: scrape all books)",
)
@click.option(
    "--sort-by",
    type=click.Choice(["date-read", "date-added", "title", "author", "rating", "read-count", "random", "none"], case_sensitive=False),
    default="none",
    help="Sort order for books. Applies server-side to all results except 'random' which shuffles after scraping (default: none). Options: date-read, date-added, title, author, rating, read-count, random, none",
)
@click.option(
    "--per-book-files/--single-file",
    default=True,
    help="Save each book as a separate JSON file in a directory (default: True, only for JSON format)",
)
def scrape(
    profile_url: str,
    format: str,
    output: Path | None,
    rate_limit: float,
    max_retries: int,
    timeout: int,
    no_progress: bool,
    limit: int | None,
    sort_by: str,
    per_book_files: bool,
):
    """Scrape a Goodreads user's library and export to JSON or CSV.

    PROFILE_URL should be a Goodreads profile URL like:
    https://www.goodreads.com/user/show/12345-username

    Examples:

        \b
        # Scrape and export to JSON (default)
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username

        \b
        # Export to CSV with custom output path
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username \\
            --format csv --output my_library.csv

        \b
        # Scrape only the first 50 books from each shelf (for testing)
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username \\
            --limit 50

        \b
        # Use slower rate limiting (2 seconds between requests)
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username \\
            --rate-limit 2.0
    """
    try:
        # Validate per-book-files option
        if per_book_files and format.lower() != "json":
            console.print("[red]Error:[/red] --per-book-files can only be used with JSON format")
            raise click.Abort()

        # Map CLI sort option to Goodreads sort parameter
        goodreads_sort = map_cli_sort_to_goodreads_sort(sort_by)

        # Determine output directory for per-book files
        output_dir = None
        if per_book_files:
            # When using per-book files, output is a directory name
            # Extract username from URL first to use as default
            import re
            username_match = re.search(r'/user/show/\d+-([^/?]+)', profile_url)
            default_username = username_match.group(1) if username_match else "library"
            output_dir = output or Path(f"{default_username}_library")

        # Create progress bar unless disabled
        if no_progress:
            # No progress bar - just scrape
            library = scrape_library(
                profile_url=profile_url,
                rate_limit_delay=rate_limit,
                max_retries=max_retries,
                timeout=timeout,
                limit=limit,
                sort=goodreads_sort,
                sort_by=sort_by,
                save_individual_books=per_book_files,
                output_dir=output_dir,
            )

            # Export (if not using per-book files which saves during scraping)
            if not per_book_files:
                final_output = output or Path(f"{library.username}_library.{format}")
                if format.lower() == "json":
                    from src.exporters import export_to_json
                    export_to_json(library, final_output)
                elif format.lower() == "csv":
                    from src.exporters import export_to_csv
                    export_to_csv(library, final_output)
                console.print(f"[green]✓[/green] Exported to: {final_output}")
            else:
                console.print(f"[green]✓[/green] Saved {library.total_books} books to directory: {output_dir}")

            console.print(f"[green]✓[/green] Scraped {library.total_books} books")

        else:
            # Show progress bar
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                TimeRemainingColumn(),
                console=console,
            ) as progress:
                # Create progress task
                task_id = progress.add_task(
                    "[cyan]Scraping library...", total=None  # Indeterminate initially
                )

                # Progress callback
                current_books = [0]  # Use list for closure mutability
                pages_scraped = [0]

                def on_progress(current: int, total: int, message: str) -> None:
                    """Progress callback matching scraper signature (current, total, message)."""
                    current_books[0] = current
                    # Extract page number from message like "Scraped page 2: 40 books so far"
                    if "page" in message:
                        try:
                            page_num = int(message.split("page ")[1].split(":")[0])
                            pages_scraped[0] = page_num
                        except (IndexError, ValueError):
                            pass
                    progress.update(
                        task_id,
                        description=f"[cyan]{message}",
                        completed=current,
                    )

                # Determine output path
                if output is None:
                    # Will be set after scraping when we know username
                    temp_output = None
                else:
                    temp_output = output

                # Scrape library with progress
                library = scrape_library(
                    profile_url=profile_url,
                    progress_callback=on_progress,
                    rate_limit_delay=rate_limit,
                    max_retries=max_retries,
                    timeout=timeout,
                    limit=limit,
                    sort=goodreads_sort,
                    sort_by=sort_by,
                    save_individual_books=per_book_files,
                    output_dir=output_dir,
                )

                # Update progress - scraping complete
                progress.update(
                    task_id,
                    description=f"[green]Scraped {library.total_books} books from {pages_scraped[0]} pages",
                    completed=True,
                )

                # Export (if not using per-book files which saves during scraping)
                if not per_book_files:
                    # Determine final output path
                    if temp_output is None:
                        final_output = Path(f"{library.username}_library.{format}")
                    else:
                        final_output = temp_output

                    # Export
                    export_task = progress.add_task(
                        f"[cyan]Exporting to {format.upper()}...", total=None
                    )

                    if format.lower() == "json":
                        from src.exporters import export_to_json
                        export_to_json(library, final_output)
                    elif format.lower() == "csv":
                        from src.exporters import export_to_csv
                        export_to_csv(library, final_output)

                    progress.update(
                        export_task,
                        description=f"[green]Exported to {final_output}",
                        completed=True,
                    )

            # Final success message
            console.print()
            console.print(f"[bold green]Success![/bold green]")
            console.print(f"  User: {library.username}")
            console.print(f"  Books: {library.total_books}")
            if per_book_files:
                console.print(f"  Output: {output_dir}/ ({library.total_books} files)")
                console.print(f"  Format: JSON (per-book files)")
            else:
                console.print(f"  Output: {final_output}")
                console.print(f"  Format: {format.upper()}")

    except InvalidURLError as e:
        console.print(f"[bold red]Error:[/bold red] Invalid URL - {e}")
        logger.error("Invalid URL provided", profile_url=profile_url, error=str(e))
        raise click.Abort()

    except PrivateProfileError as e:
        console.print(f"[bold red]Error:[/bold red] Private profile - {e}")
        console.print("\n[yellow]Tip:[/yellow] This profile is private. You cannot scrape private profiles.")
        logger.error("Private profile detected", profile_url=profile_url, error=str(e))
        raise click.Abort()

    except RateLimitError as e:
        console.print(f"[bold red]Error:[/bold red] Rate limit exceeded - {e}")
        console.print("\n[yellow]Tip:[/yellow] Try increasing the rate limit delay with --rate-limit 2.0")
        logger.error("Rate limit error", profile_url=profile_url, error=str(e))
        raise click.Abort()

    except ScrapingError as e:
        console.print(f"[bold red]Error:[/bold red] Scraping failed - {e}")
        logger.error("Scraping error", profile_url=profile_url, error=str(e))
        raise click.Abort()

    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/bold red] {e}")
        logger.exception("Unexpected error during scraping", profile_url=profile_url)
        raise click.Abort()


if __name__ == "__main__":
    cli()
