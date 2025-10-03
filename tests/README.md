# Testing Authentication

## Security Note

The `auth.json` file is automatically generated during test setup and should never contain hardcoded JWT tokens. This file is:

- Generated dynamically by `auth.setup.ts` through actual login flow
- Excluded from version control via `.gitignore`
- Refreshed before each test run to ensure valid authentication

## Running Tests

```bash
# Run all tests (includes authentication setup)
npm run test:e2e

# Run specific test file
npx playwright test tests/staff-patched.spec.ts
```

The authentication setup will automatically:
1. Navigate to the login page
2. Use credentials from environment variables (or defaults)
3. Complete the login flow
4. Save the authentication state to `auth.json`
5. Use this state for all subsequent tests

This approach eliminates hardcoded credentials and ensures tests use fresh, valid authentication tokens.