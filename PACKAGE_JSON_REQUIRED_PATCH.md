# Required package.json patch

Do not overwrite your existing package.json blindly.
Keep every existing script and dependency, but make sure these entries exist.

## scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test"
  }
}
```

## dependencies

```json
{
  "dependencies": {
    "next": "^16.2.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

If npm installed a different compatible React version, keep the installed version from your package-lock.json.
