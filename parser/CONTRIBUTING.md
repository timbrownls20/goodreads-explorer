# Contributing to Goodreads Parser (TypeScript)

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- Git

### Getting Started

1. **Fork and clone the repository**

```bash
git clone https://github.com/your-username/goodreads-parser-ts.git
cd goodreads-parser-ts
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build the project**

```bash
pnpm run build
```

4. **Run tests**

```bash
pnpm test
```

## Development Workflow

### Making Changes

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

- Write code following the existing style
- Add tests for new functionality
- Update documentation as needed

3. **Run linting and formatting**

```bash
pnpm run lint
pnpm run format
```

4. **Run tests**

```bash
pnpm test
```

5. **Build the project**

```bash
pnpm run build
```

### Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Follow these guidelines:
- Use TypeScript for all new code
- Add JSDoc comments for public APIs
- Use descriptive variable and function names
- Keep functions small and focused
- Follow SOLID principles

### Testing

- Write unit tests for all new functionality
- Aim for high test coverage (>80%)
- Use descriptive test names
- Test edge cases and error conditions

Test file naming: `*.spec.ts`

Example:
```typescript
describe('UrlValidator', () => {
  describe('validateGoodreadsProfileUrl', () => {
    it('should validate valid Goodreads profile URL', () => {
      // Test implementation
    });

    it('should reject invalid URLs', () => {
      // Test implementation
    });
  });
});
```

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(scraper): add support for custom user agents

Added ability to specify custom user agent string for HTTP requests.
This allows users to customize the scraper behavior.

Closes #123
```

## Pull Request Process

1. **Update documentation**
   - Update README.md if adding features
   - Update CHANGELOG.md
   - Add JSDoc comments to new code

2. **Ensure all tests pass**
   ```bash
   pnpm test
   pnpm run build
   ```

3. **Create pull request**
   - Use a descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots if relevant

4. **Code review**
   - Address reviewer feedback
   - Keep discussions focused and respectful
   - Update PR as needed

5. **Merge**
   - Maintainers will merge once approved
   - Delete your feature branch after merge

## Project Structure

```
parser-ts/
├── src/
│   ├── models/           # Data models
│   ├── scrapers/         # Web scraping logic
│   ├── parsers/          # HTML parsing
│   ├── validators/       # Data validation
│   ├── exporters/        # Export functionality
│   ├── exceptions/       # Custom errors
│   ├── utils/            # Utilities
│   ├── cli/              # CLI interface
│   └── __tests__/        # Unit tests
├── examples/             # Usage examples
├── dist/                 # Build output
└── package.json
```

## Adding New Features

### Adding a New Parser

1. Create parser file in `src/parsers/`
2. Export parser class/functions
3. Add tests in `src/__tests__/`
4. Update exports in `src/index.ts`
5. Document in README.md

### Adding a New Model

1. Create model file in `src/models/`
2. Add class-validator decorators
3. Export from model file
4. Add tests for validation
5. Update exports in `src/index.ts`

### Adding a New Exporter

1. Create exporter in `src/exporters/`
2. Implement export interface
3. Add tests for export functionality
4. Update API to support new format
5. Document in README.md

## Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Use descriptive test names
- Cover edge cases

```typescript
describe('DataValidator', () => {
  it('should validate ISBN-10 format', () => {
    expect(DataValidator.validateIsbn('0123456789')).toBe(true);
  });

  it('should reject invalid ISBN', () => {
    expect(DataValidator.validateIsbn('abc')).toBe(false);
  });
});
```

### Integration Tests

- Test interactions between components
- Use real (but minimal) data
- Test error scenarios

## Documentation

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Scrape a Goodreads user library
 * @param profileUrl - Goodreads profile URL
 * @param options - Scraper options
 * @returns Promise resolving to Library object
 * @throws {InvalidURLError} If URL is invalid
 * @throws {PrivateProfileError} If profile is private
 */
export async function scrapeLibrary(
  profileUrl: string,
  options?: ScraperOptions
): Promise<Library> {
  // Implementation
}
```

### README Updates

When adding features:
- Update features list
- Add usage examples
- Update API reference
- Add to changelog

## Release Process

Maintainers will handle releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Build and publish to npm (if applicable)
5. Create GitHub release

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Open an issue with reproduction steps
- **Features**: Open an issue to discuss before implementing

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

## Thank You!

Your contributions help make this project better for everyone. Thank you for taking the time to contribute!
