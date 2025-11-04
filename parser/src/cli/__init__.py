"""CLI entry point for Goodreads Explorer.

Per Constitution Principle II: CLI as thin wrapper over library API.
"""

from src.cli.commands import cli

# Main entry point for console script
main = cli

__all__ = ["main", "cli"]
