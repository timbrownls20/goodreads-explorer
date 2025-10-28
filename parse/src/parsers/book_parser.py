"""Book page HTML parser for Goodreads.

Extracts detailed book metadata from individual Goodreads book pages.
Used for extended metadata (User Stories 2 & 3). MVP uses library_parser primarily.
Per Constitution Principle I: Data-First with extensible parsing.
"""

from bs4 import BeautifulSoup
from typing import Any

from parse.src.validators import sanitize_text, validate_isbn, validate_publication_year


def parse_book_page(html: str) -> dict[str, Any]:
    """Parse a Goodreads book page HTML for detailed metadata.

    This is used for extracting extended metadata (ISBN, genres, publication details)
    that may not be available on the library list page.

    Args:
        html: Raw HTML content from Goodreads book page

    Returns:
        Dictionary containing book metadata:
        - isbn: ISBN number
        - isbn13: ISBN-13 format
        - publication_year: Year published
        - publisher: Publisher name
        - page_count: Number of pages
        - genres: List of genre tags
        - language: Book language
        - average_rating: Goodreads community rating
        - ratings_count: Number of ratings

    Note:
        For MVP (User Story 1), this is primarily a stub.
        Full implementation in User Stories 2 & 3 for extended metadata.
    """
    soup = BeautifulSoup(html, 'lxml')

    book_data = {}

    # Extract ISBN (User Story 2)
    isbn_data = extract_isbn(soup)
    book_data.update(isbn_data)

    # Extract publication details (User Story 2)
    pub_data = extract_publication_details(soup)
    book_data.update(pub_data)

    # Extract genres (User Story 2)
    genres = extract_genres(soup)
    book_data['genres'] = genres

    # Extract ratings (available on library page too, but more detailed here)
    rating_data = extract_rating_details(soup)
    book_data.update(rating_data)

    return book_data


def extract_isbn(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract ISBN and ISBN-13 from book page.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with 'isbn' and 'isbn13' keys
    """
    isbn_data = {"isbn": None, "isbn13": None}

    # Look for ISBN in book details section
    # Common pattern: <span>ISBN</span> <div>number</div>
    isbn_label = soup.find(string=lambda s: s and 'isbn' in s.lower())
    if isbn_label:
        parent = isbn_label.find_parent()
        if parent:
            # Try to find ISBN value in next sibling or nearby element
            isbn_value = parent.find_next_sibling()
            if isbn_value:
                isbn_text = sanitize_text(isbn_value.get_text())
                if isbn_text:
                    validated_isbn = validate_isbn(isbn_text)
                    if validated_isbn:
                        if len(validated_isbn) == 13:
                            isbn_data['isbn13'] = validated_isbn
                        else:
                            isbn_data['isbn'] = validated_isbn

    return isbn_data


def extract_publication_details(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract publication year, publisher, page count, language.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with publication details
    """
    pub_data = {
        "publication_year": None,
        "publisher": None,
        "page_count": None,
        "language": None
    }

    # Look for publication details row
    # Pattern: "Published YEAR by PUBLISHER"
    details_row = soup.find('div', class_='row', string=lambda s: s and 'published' in s.lower())
    if details_row:
        text = details_row.get_text()

        # Extract year (4 digits)
        import re
        year_match = re.search(r'\b(1[0-9]{3}|20[0-9]{2})\b', text)
        if year_match:
            try:
                year = int(year_match.group(1))
                pub_data['publication_year'] = validate_publication_year(year)
            except (ValueError, TypeError):
                pass

        # Extract publisher (text after "by")
        if ' by ' in text:
            publisher = text.split(' by ')[-1].strip()
            pub_data['publisher'] = sanitize_text(publisher, max_length=200)

    # Extract page count
    # Pattern: "XXX pages"
    pages_element = soup.find(string=lambda s: s and 'pages' in s.lower())
    if pages_element:
        import re
        pages_match = re.search(r'(\d+)\s*pages', pages_element, re.IGNORECASE)
        if pages_match:
            try:
                pub_data['page_count'] = int(pages_match.group(1))
            except ValueError:
                pass

    return pub_data


def extract_genres(soup: BeautifulSoup) -> list[str]:
    """Extract genre tags/shelves from book page.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        List of genre strings
    """
    genres = []

    # Look for genre/shelf tags
    # Goodreads typically shows popular shelves as genres
    genre_elements = soup.find_all('a', class_='bookPageGenreLink')

    for element in genre_elements[:50]:  # Limit to 50 genres
        genre_text = sanitize_text(element.get_text())
        if genre_text:
            genres.append(genre_text.lower())

    # Deduplicate
    return list(dict.fromkeys(genres))


def extract_rating_details(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract average rating and ratings count.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with rating details
    """
    rating_data = {
        "average_rating": None,
        "ratings_count": None
    }

    # Look for rating display
    # Pattern: "<span>4.18</span> avg rating — <span>X</span> ratings"
    rating_span = soup.find('span', itemprop='ratingValue')
    if rating_span:
        try:
            rating_data['average_rating'] = float(rating_span.get_text(strip=True))
        except (ValueError, AttributeError):
            pass

    # Ratings count
    count_span = soup.find('span', itemprop='ratingCount')
    if count_span:
        try:
            count_text = count_span.get_text(strip=True).replace(',', '')
            rating_data['ratings_count'] = int(count_text)
        except (ValueError, AttributeError):
            pass

    return rating_data
