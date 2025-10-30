"""Book page HTML parser for Goodreads.

Extracts detailed book metadata from individual Goodreads book pages.
Used for extended metadata (User Stories 2 & 3). MVP uses library_parser primarily.
Per Constitution Principle I: Data-First with extensible parsing.
"""

from bs4 import BeautifulSoup
from typing import Any
import json
import re

from src.validators import sanitize_text, validate_isbn, validate_publication_year


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
        - setting: Book setting/location
        - literary_awards: List of literary awards (dicts with name, category, year)
        - average_rating: Goodreads community rating
        - ratings_count: Number of ratings
        - cover_image_url: URL to book cover image

    Note:
        For MVP (User Story 1), this is primarily a stub.
        Full implementation in User Stories 2 & 3 for extended metadata.
    """
    soup = BeautifulSoup(html, 'lxml')

    book_data = {}

    # First try to extract from Next.js __NEXT_DATA__ (most complete source, includes publisher)
    next_data = extract_from_next_data(soup)
    if next_data:
        book_data.update(next_data)

    # Then try JSON-LD schema as fallback
    schema_data = extract_from_schema(soup)
    if schema_data:
        # Only update fields not already set from __NEXT_DATA__
        for key, value in schema_data.items():
            if value and not book_data.get(key):
                book_data[key] = value

    # Extract ISBN (User Story 2) - fallback if not in schema
    if not book_data.get('isbn') and not book_data.get('isbn13'):
        isbn_data = extract_isbn(soup)
        book_data.update(isbn_data)

    # Extract publication details (User Story 2)
    pub_data = extract_publication_details(soup)
    # Only update fields that aren't already set from schema
    for key, value in pub_data.items():
        if value and not book_data.get(key):
            book_data[key] = value

    # Extract genres (User Story 2)
    if not book_data.get('genres'):
        genres = extract_genres(soup)
        book_data['genres'] = genres

    # Extract ratings (available on library page too, but more detailed here)
    if not book_data.get('average_rating'):
        rating_data = extract_rating_details(soup)
        book_data.update(rating_data)

    # Extract cover image
    if not book_data.get('cover_image_url'):
        cover_url = extract_cover_image(soup)
        book_data['cover_image_url'] = cover_url

    return book_data


def extract_from_next_data(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract book metadata from Next.js __NEXT_DATA__ Apollo state.

    This contains detailed book information including publisher, setting, and awards.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with book metadata from Apollo state
    """
    next_data = {}

    # Find __NEXT_DATA__ script tag
    script_tag = soup.find('script', id='__NEXT_DATA__')
    if script_tag and script_tag.string:
        try:
            data = json.loads(script_tag.string)
            apollo_state = data.get('props', {}).get('pageProps', {}).get('apolloState', {})

            # Find the Book object (key starts with "Book:")
            for key, value in apollo_state.items():
                if key.startswith('Book:') and isinstance(value, dict):
                    # Extract details which contains publisher, ISBN, etc.
                    details = value.get('details')
                    if details and isinstance(details, dict):
                        # Publisher
                        if 'publisher' in details:
                            next_data['publisher'] = sanitize_text(details['publisher'], max_length=200)

                        # ISBN and ISBN-13
                        if 'isbn' in details:
                            isbn_str = str(details['isbn'])
                            validated_isbn = validate_isbn(isbn_str)
                            if validated_isbn and len(validated_isbn) == 10:
                                next_data['isbn'] = validated_isbn

                        if 'isbn13' in details:
                            isbn13_str = str(details['isbn13'])
                            validated_isbn13 = validate_isbn(isbn13_str)
                            if validated_isbn13 and len(validated_isbn13) == 13:
                                next_data['isbn13'] = validated_isbn13

                        # Page count
                        if 'numPages' in details:
                            try:
                                next_data['page_count'] = int(details['numPages'])
                            except (ValueError, TypeError):
                                pass

                        # Language
                        if 'language' in details and isinstance(details['language'], dict):
                            lang_name = details['language'].get('name')
                            if lang_name:
                                next_data['language'] = sanitize_text(lang_name)

                        # Publication year from publicationTime (milliseconds timestamp)
                        if 'publicationTime' in details:
                            try:
                                timestamp_ms = int(details['publicationTime'])
                                from datetime import datetime
                                pub_date = datetime.fromtimestamp(timestamp_ms / 1000)
                                next_data['publication_year'] = validate_publication_year(pub_date.year)
                            except (ValueError, TypeError, OSError):
                                pass

                    break  # Only process first Book object

            # Find the Work object (key starts with "Work:") for setting and awards
            for key, value in apollo_state.items():
                if key.startswith('Work:') and isinstance(value, dict):
                    details = value.get('details')
                    if details and isinstance(details, dict):
                        # Setting - extract from places array
                        if 'places' in details and isinstance(details['places'], list) and len(details['places']) > 0:
                            first_place = details['places'][0]
                            if isinstance(first_place, dict) and 'name' in first_place:
                                setting_name = first_place['name']
                                if setting_name:
                                    next_data['setting'] = sanitize_text(setting_name, max_length=200)

                        # Literary Awards - extract from awardsWon array
                        if 'awardsWon' in details and isinstance(details['awardsWon'], list):
                            awards = []
                            for award_data in details['awardsWon']:
                                if isinstance(award_data, dict):
                                    award_name = award_data.get('name')
                                    if award_name:
                                        # Extract category (may be in 'category' field)
                                        category = award_data.get('category')

                                        # Extract year from awardedAt timestamp (milliseconds)
                                        year = None
                                        if 'awardedAt' in award_data:
                                            try:
                                                timestamp_ms = int(award_data['awardedAt'])
                                                from datetime import datetime
                                                award_date = datetime.fromtimestamp(timestamp_ms / 1000)
                                                year = award_date.year
                                            except (ValueError, TypeError, OSError):
                                                pass

                                        awards.append({
                                            'name': sanitize_text(award_name, max_length=200),
                                            'category': sanitize_text(category, max_length=200) if category else None,
                                            'year': year
                                        })

                            if awards:
                                next_data['literary_awards'] = awards

                    break  # Only process first Work object

        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            # If JSON parsing fails, return empty dict
            pass

    return next_data


def extract_from_schema(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract book metadata from JSON-LD schema.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with book metadata from schema
    """
    schema_data = {}

    # Find JSON-LD script tag
    script_tag = soup.find('script', type='application/ld+json')
    if script_tag and script_tag.string:
        try:
            data = json.loads(script_tag.string)

            # Extract ISBN (may be ISBN-10 or ISBN-13)
            if 'isbn' in data:
                isbn_str = str(data['isbn'])
                validated_isbn = validate_isbn(isbn_str)
                if validated_isbn:
                    if len(validated_isbn) == 13:
                        schema_data['isbn13'] = validated_isbn
                        # Try to derive ISBN-10 if it's ISBN-13
                        if validated_isbn.startswith('978'):
                            # Can't reliably convert back to ISBN-10, leave as None
                            pass
                    elif len(validated_isbn) == 10:
                        schema_data['isbn'] = validated_isbn

            # Extract page count
            if 'numberOfPages' in data:
                try:
                    schema_data['page_count'] = int(data['numberOfPages'])
                except (ValueError, TypeError):
                    pass

            # Extract language
            if 'inLanguage' in data:
                schema_data['language'] = sanitize_text(data['inLanguage'])

            # Extract cover image
            if 'image' in data:
                schema_data['cover_image_url'] = data['image']

            # Extract rating
            if 'aggregateRating' in data and isinstance(data['aggregateRating'], dict):
                rating_info = data['aggregateRating']
                if 'ratingValue' in rating_info:
                    try:
                        schema_data['average_rating'] = float(rating_info['ratingValue'])
                    except (ValueError, TypeError):
                        pass
                if 'ratingCount' in rating_info:
                    try:
                        schema_data['ratings_count'] = int(rating_info['ratingCount'])
                    except (ValueError, TypeError):
                        pass

            # Publisher is sometimes in the schema (though not common on Goodreads)
            if 'publisher' in data:
                if isinstance(data['publisher'], dict):
                    schema_data['publisher'] = sanitize_text(data['publisher'].get('name', ''))
                else:
                    schema_data['publisher'] = sanitize_text(str(data['publisher']))

        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            # If JSON parsing fails, return empty dict (will fall back to HTML parsing)
            pass

    return schema_data


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
    import re

    pub_data = {
        "publication_year": None,
        "publisher": None,
        "page_count": None,
        "language": None
    }

    # Look for publication info with data-testid
    pub_info = soup.find('p', {'data-testid': 'publicationInfo'})
    if pub_info:
        text = pub_info.get_text()

        # Extract year (4 digits)
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

    # Note: Publisher information is not consistently available on Goodreads book pages.
    # The public book view pages do not include publisher data in the HTML or JSON-LD schema.
    # Publisher data may only be available on edition-specific pages or to logged-in users.
    # As a result, publisher will remain None for most books scraped from public pages.

    # Extract page count from pagesFormat
    pages_elem = soup.find('p', {'data-testid': 'pagesFormat'})
    if pages_elem:
        text = pages_elem.get_text()
        pages_match = re.search(r'(\d+)\s*pages', text, re.IGNORECASE)
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

    # Look for genre buttons in the new Goodreads layout
    genre_elements = soup.find_all('span', class_='BookPageMetadataSection__genreButton')

    for element in genre_elements[:20]:  # Limit to 20 genres
        genre_text = sanitize_text(element.get_text())
        if genre_text:
            genres.append(genre_text)

    # Deduplicate
    return list(dict.fromkeys(genres))


def extract_rating_details(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract average rating and ratings count.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Dictionary with rating details
    """
    import re

    rating_data = {
        "average_rating": None,
        "ratings_count": None
    }

    # Look for rating in RatingStatistics div
    rating_div = soup.find('div', class_='RatingStatistics__rating')
    if rating_div:
        try:
            rating_text = rating_div.get_text(strip=True)
            rating_data['average_rating'] = float(rating_text)
        except (ValueError, AttributeError):
            pass

    # Ratings count in RatingStatistics__meta
    meta_div = soup.find('div', class_='RatingStatistics__meta')
    if meta_div:
        text = meta_div.get_text()
        # Extract numbers like "123,456 ratings"
        count_match = re.search(r'([\d,]+)\s+ratings', text)
        if count_match:
            try:
                count_text = count_match.group(1).replace(',', '')
                rating_data['ratings_count'] = int(count_text)
            except (ValueError, AttributeError):
                pass

    return rating_data


def extract_cover_image(soup: BeautifulSoup) -> str | None:
    """Extract book cover image URL.

    Args:
        soup: BeautifulSoup parsed HTML

    Returns:
        Cover image URL or None
    """
    # Look for ResponsiveImage class (book cover)
    img = soup.find('img', class_='ResponsiveImage')
    if img and img.get('src'):
        return img.get('src')

    return None
