# Test Suite

Run the complete project check from the repository root:

```powershell
npm test
```

This runs backend tests, Python dependency checks, frontend tests, lint, and a
production frontend build. Set `PYTHON_BIN` when a specific Python interpreter
must be used; otherwise the active/system Python is used.

This folder keeps project tests outside the app source.

## Backend unit tests

Run from the repository root:

```powershell
python -m unittest discover -s test/backend -p "test_*.py"
```

These tests use Python's built-in `unittest`. Service tests mock database
collections in memory and skip automatically if backend dependencies are not
installed in the current Python environment.

## Frontend utility tests

Run from the repository root:

```powershell
node --test test/frontend/*.test.mjs
```

Or from the frontend folder:

```powershell
npm test
```

These tests use Node's built-in test runner.
