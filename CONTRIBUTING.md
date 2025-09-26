# Contributing to AI Assistant

Thank you for your interest in contributing to the AI Assistant project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- macOS (recommended for full functionality)
- Basic knowledge of TypeScript, React, and Node.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/ai-assistant.git
   cd ai-assistant
   ```

2. **Install Dependencies**
   ```bash
   npm run full-install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   cp backend/env.example backend/.env
   # Edit with your API keys
   ```

4. **Start Development**
   ```bash
   npm run electron:dev
   ```

## 📝 Code Style & Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Executes a tool with the given parameters
 * @param toolName - Name of the tool to execute
 * @param parameters - Tool-specific parameters
 * @returns Promise resolving to execution result
 */
async function executeTool(toolName: string, parameters: any): Promise<ToolResult> {
  // Implementation
}
```

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow the existing CSS module pattern
- Use TypeScript for all props

```typescript
interface ComponentProps {
  title: string;
  onAction: (result: string) => void;
  isLoading?: boolean;
}

export default function MyComponent({ title, onAction, isLoading = false }: ComponentProps) {
  // Component implementation
}
```

### Backend Code
- Use async/await over Promises
- Implement proper error handling
- Add input validation for all endpoints
- Follow RESTful API conventions

## 🛠️ Adding New Features

### Adding a New Tool

1. **Create Tool Implementation**
   ```typescript
   // lib/tools/my_new_tool.ts
   export async function myNewTool(param1: string, param2?: number): Promise<ToolResult> {
     try {
       // Tool implementation
       return {
         success: true,
         result: "Tool executed successfully",
         data: { /* tool-specific data */ }
       };
     } catch (error) {
       return {
         success: false,
         error: error.message
       };
     }
   }
   ```

2. **Register the Tool**
   ```typescript
   // lib/tool_registry.ts
   export const TOOL_REGISTRY = {
     // ... existing tools
     'my_new_tool': {
       description: 'Brief description of what the tool does',
       parameters: {
         param1: { 
           type: 'string', 
           required: true, 
           description: 'Description of parameter' 
         },
         param2: { 
           type: 'number', 
           required: false, 
           default: 10,
           description: 'Optional parameter with default'
         }
       },
       category: 'system', // or 'communication', 'productivity', etc.
       requiresAuth: false, // true if needs authentication
       platform: 'all' // 'macos', 'windows', 'linux', or 'all'
     }
   };
   ```

3. **Add to API Router**
   ```typescript
   // pages/api/tools.ts
   import { myNewTool } from '../../lib/tools/my_new_tool';
   
   // Add to tool execution switch
   case 'my_new_tool':
     result = await myNewTool(variables.param1, variables.param2);
     break;
   ```

4. **Add Tests**
   ```typescript
   // tests/tools/my_new_tool.test.ts
   import { myNewTool } from '../../lib/tools/my_new_tool';
   
   describe('myNewTool', () => {
     it('should execute successfully with valid parameters', async () => {
       const result = await myNewTool('test');
       expect(result.success).toBe(true);
     });
   });
   ```

### Adding a New Route

1. **Create Route File**
   ```typescript
   // backend/routes/my_route.js
   const express = require('express');
   const router = express.Router();
   
   router.get('/endpoint', async (req, res) => {
     try {
       // Route implementation
       res.json({ success: true, data: {} });
     } catch (error) {
       res.status(500).json({ success: false, error: error.message });
     }
   });
   
   module.exports = router;
   ```

2. **Register Route**
   ```javascript
   // backend/server.js
   const myRoute = require('./routes/my_route');
   app.use('/api/my-route', myRoute);
   ```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- my_tool.test.ts

# Run with coverage
npm run test:coverage
```

### Writing Tests
- Write unit tests for all new tools
- Add integration tests for complex workflows
- Test error conditions and edge cases
- Mock external APIs and services

```typescript
// Example test structure
describe('Tool Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle valid input correctly', async () => {
    // Test implementation
  });

  it('should handle invalid input gracefully', async () => {
    // Error case testing
  });
});
```

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Try the latest version
3. Test in a clean environment

### Issue Template
```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS 12.0]
- Node.js version: [e.g., 18.0.0]
- App version: [e.g., 1.0.0]

**Additional Context**
Any other context about the problem.
```

## 🔧 Pull Request Process

### Before Submitting
1. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update Documentation**
   - Update README if needed
   - Add JSDoc comments
   - Update CHANGELOG.md

3. **Follow Commit Convention**
   ```bash
   feat: add new calendar integration tool
   fix: resolve voice input timeout issue
   docs: update API documentation
   refactor: simplify tool execution logic
   test: add unit tests for email tool
   ```

### PR Template
```markdown
**Description**
Brief description of changes.

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

**Screenshots**
If applicable, add screenshots of UI changes.

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. Automated checks must pass
2. Code review by maintainer
3. Testing in development environment
4. Final approval and merge

## 🏗️ Architecture Guidelines

### Directory Structure
```
├── components/          # React components
├── electron/           # Electron main process
├── backend/            # Express.js backend
│   ├── routes/        # API endpoints
│   ├── lib/           # Core logic
│   └── data/          # Configuration
├── lib/               # Shared utilities
│   └── tools/         # Tool implementations
├── pages/             # Next.js pages
├── styles/            # CSS modules
└── types/             # TypeScript definitions
```

### Design Patterns
- **Modular Architecture**: Each tool is self-contained
- **Error Handling**: Consistent error handling across all components
- **Type Safety**: Full TypeScript coverage
- **Security First**: Input validation and sanitization
- **Performance**: Lazy loading and efficient rendering

## 📚 Documentation

### Code Documentation
- Use JSDoc for all public functions
- Include parameter types and descriptions
- Document complex algorithms
- Add usage examples

### User Documentation
- Update README for new features
- Add troubleshooting guides
- Include configuration examples
- Maintain changelog

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help others learn and contribute
- Focus on constructive feedback
- Maintain professional communication

### Getting Help
- Check existing documentation
- Search closed issues
- Ask questions in discussions
- Join community chat (if available)

## 🎯 Contribution Ideas

### Good First Issues
- Fix typos in documentation
- Add new simple tools (e.g., system utilities)
- Improve error messages
- Add unit tests for existing tools

### Advanced Contributions
- New AI model integrations
- Cross-platform compatibility improvements
- Performance optimizations
- Security enhancements

### Feature Requests
- Multi-language support
- Plugin architecture
- Cloud synchronization
- Advanced workflow automation

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-assistant/discussions)
- **Email**: your-email@domain.com

Thank you for contributing to AI Assistant! 🚀
