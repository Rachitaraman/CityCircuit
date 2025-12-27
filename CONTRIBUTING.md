# Contributing to CityCircuit

Thank you for your interest in contributing to CityCircuit! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Basic knowledge of TypeScript, React, and Next.js

### Development Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/city-circuit.git
   cd city-circuit
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
5. Start development servers:
   ```bash
   npm run start:all
   ```

## 📋 Development Guidelines

### Code Style
- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Code formatting is handled by Prettier
- **Naming**: Use descriptive names for variables, functions, and components

### Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Include JSDoc comments for complex functions
- Use TailwindCSS for styling
- Ensure components are responsive

### Testing Requirements
- Write unit tests for new components and utilities
- Use property-based tests for complex logic
- Maintain test coverage above 80%
- Test both happy path and error scenarios

## 🔄 Contribution Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Follow the coding standards
- Write tests for new functionality
- Update documentation if needed
- Ensure all tests pass

### 3. Test Your Changes
```bash
# Run all tests
npm test

# Check TypeScript
npm run type-check

# Run linting
npm run lint

# Test the application manually
npm run start:all
```

### 4. Commit Your Changes
Use conventional commit messages:
```bash
git commit -m "feat: add route optimization algorithm"
git commit -m "fix: resolve bus stop search issue"
git commit -m "docs: update API documentation"
```

### Commit Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference any related issues
- Include screenshots for UI changes
- List any breaking changes

## 🧪 Testing Guidelines

### Unit Tests
- Location: `src/**/__tests__/`
- Framework: Jest + React Testing Library
- Coverage: Aim for >80% code coverage

### Property-Based Tests
- Use Fast-Check for property testing
- Test universal properties and invariants
- Include edge cases and error conditions

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });

  it('should handle user interactions', () => {
    // Test implementation
  });
});
```

## 📁 Project Structure

### Frontend (`src/`)
```
src/
├── components/     # Reusable UI components
├── pages/         # Next.js pages
├── hooks/         # Custom React hooks
├── services/      # API and external services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── __tests__/     # Test files
```

### Key Directories
- `components/ui/`: Basic UI components (buttons, inputs, etc.)
- `components/routes/`: Route-specific components
- `components/layout/`: Layout and navigation components
- `services/`: API clients and WebSocket services
- `types/`: Shared TypeScript interfaces

## 🐛 Bug Reports

When reporting bugs, please include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, browser, Node.js version
- **Screenshots**: If applicable

## 💡 Feature Requests

For new features, please:
- Check existing issues to avoid duplicates
- Provide clear use case and rationale
- Include mockups or examples if applicable
- Consider implementation complexity
- Discuss with maintainers before starting work

## 🔍 Code Review Process

### For Contributors
- Ensure all tests pass
- Keep PRs focused and reasonably sized
- Respond to feedback promptly
- Update documentation as needed

### Review Criteria
- Code quality and style
- Test coverage and quality
- Performance implications
- Security considerations
- Documentation completeness

## 📚 Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Project-Specific
- [SETUP.md](SETUP.md): Detailed setup instructions
- [README.md](README.md): Project overview and quick start
- `.kiro/specs/`: Feature specifications and requirements

## 🤝 Community Guidelines

### Be Respectful
- Use inclusive language
- Be constructive in feedback
- Help newcomers get started
- Respect different perspectives

### Communication
- Use GitHub Issues for bug reports and feature requests
- Use GitHub Discussions for general questions
- Be clear and concise in communications
- Provide context and examples

## 📞 Getting Help

If you need help:
1. Check existing documentation
2. Search existing issues
3. Ask in GitHub Discussions
4. Contact maintainers

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for contributing to CityCircuit! 🚌✨