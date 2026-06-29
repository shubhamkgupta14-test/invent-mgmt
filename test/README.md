# Test Suite

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
