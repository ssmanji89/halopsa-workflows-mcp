# Contributing to HaloPSA Workflows MCP Server

Thank you for considering contributing to the HaloPSA Workflows MCP Server! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug, please report it by creating an issue on the GitHub repository. When reporting a bug, please include:

1. A clear and descriptive title
2. A detailed description of the issue
3. Steps to reproduce the bug
4. What you expected to happen
5. What actually happened
6. Environment information (OS, Node.js version, etc.)

### Suggesting Enhancements

We welcome suggestions for enhancements! To suggest an enhancement:

1. Create an issue on the GitHub repository
2. Use a clear and descriptive title
3. Provide a detailed description of the enhancement
4. Explain why this enhancement would be useful

### Pull Requests

We welcome pull requests from everyone. To submit a pull request:

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Write tests for your changes if applicable
5. Ensure all tests pass
6. Submit a pull request

## Development Setup

To set up for development:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your HaloPSA API credentials
4. Build the project: `npm run build`
5. Run the development server: `npm run dev`

## Coding Standards

Please follow these coding standards:

- Use TypeScript for all new code
- Follow the existing code style
- Add comments for complex logic
- Include proper error handling
- Write unit tests for new functionality

## Testing

Before submitting a pull request, please ensure all tests pass:

- Run the build: `npm run build`
- Test your changes manually

## Documentation

If your change affects how users interact with the project, please update the relevant documentation:

- README.md for general usage
- docs/USAGE.md for detailed usage
- docs/API.md for API reference

## Versioning

We use [Semantic Versioning](https://semver.org/) for this project:

- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

## Release Process

If you are a maintainer, follow these steps to release a new version:

1. Update the version in package.json
2. Update the CHANGELOG.md
3. Commit the changes
4. Tag the commit with the version: `git tag v1.0.0`
5. Push the changes and the tag: `git push && git push --tags`
6. GitHub Actions will automatically publish the new version to npm

## Questions

If you have any questions, please create an issue on the GitHub repository.

Thank you for contributing!
