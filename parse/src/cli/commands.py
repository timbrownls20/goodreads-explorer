"""CLI commands for Goodreads Explorer.

Per Constitution Principle II: CLI as thin wrapper over library API.
Uses Click framework for command-line interface with rich progress display.
"""

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

from parse.src.lib.api import scrape_library, scrape_and_export
from parse.src.logging_config import get_logger
from parse.src.exceptions import (
    InvalidURLError,
    PrivateProfileError,
    RateLimitError,
    ScrapingError,
)

logger = get_logger(__name__)
console = Console()


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
def scrape(
    profile_url: str,
    format: str,
    output: Path | None,
    rate_limit: float,
    max_retries: int,
    timeout: int,
    no_progress: bool,
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
        # Use slower rate limiting (2 seconds between requests)
        goodreads-explorer scrape https://www.goodreads.com/user/show/12345-username \\
            --rate-limit 2.0
    """
    try:
        # Create progress bar unless disabled
        if no_progress:
            # No progress bar - just scrape and export
            library = scrape_and_export(
                profile_url=profile_url,
                output_format=format,
                output_path=output or f"library.{format}",
                rate_limit_delay=rate_limit,
                max_retries=max_retries,
                timeout=timeout,
            )

            console.print(f"[green]✓[/green] Scraped {library.total_books} books")
            console.print(f"[green]✓[/green] Exported to: {output or f'library.{format}'}")

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
                current_page = [0]  # Use list for closure mutability
                total_books = [0]

                def on_progress(page: int, books_so_far: int) -> None:
                    current_page[0] = page
                    total_books[0] = books_so_far
                    progress.update(
                        task_id,
                        description=f"[cyan]Scraped page {page} ({books_so_far} books)...",
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
                )

                # Update progress - scraping complete
                progress.update(
                    task_id,
                    description=f"[green]Scraped {library.total_books} books from {current_page[0]} pages",
                    completed=True,
                )

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
                    from parse.src.exporters import export_to_json
                    export_to_json(library, final_output)
                elif format.lower() == "csv":
                    from parse.src.exporters import export_to_csv
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
