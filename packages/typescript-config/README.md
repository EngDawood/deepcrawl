# @deepcrawl/typescript-config

**Shared TypeScript configurations** for the Deepcrawl monorepo workspace.

## Features

- ✅ **Strict TypeScript** - Maximum type safety with strict mode enabled
- ✅ **Modern target** - ES2022 target for optimal performance
- ✅ **Path mapping** - Configured for workspace path resolution
- ✅ **Multiple environments** - Shared base configuration
- ✅ **Build optimized** - Optimized for both development and production builds

## Available Configurations

### `base.json`
Core TypeScript configuration with strict settings:
```json
{
  "extends": "@deepcrawl/typescript-config/base"
}
```

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@deepcrawl/typescript-config/base",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Key Features

- **Strict mode enabled** for maximum type safety
- **ES2022 target** for modern JavaScript features
- **Module resolution** optimized for monorepo structure
- **Source maps** enabled for debugging
- **Declaration files** generated for library packages