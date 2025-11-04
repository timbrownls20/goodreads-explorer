export interface Book {
  id: string;
  libraryId: string;
  title: string;
  author: string;
  status: 'read' | 'currently-reading' | 'to-read';
  rating: number | null;
  isbn: string | null;
  publicationYear: number | null;
  pages: number | null;
  genres: string[];
  shelves: string[];
  dateAdded: string | null;
  dateStarted: string | null;
  dateFinished: string | null;
  review: string | null;
  reviewDate: string | null;
  sourceFile: string | null;
  createdAt: string;
  updatedAt: string;
}
