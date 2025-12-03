# Tailwind CSS v4 Setup for Intellirite

## What Changed

Tailwind CSS v4 has a completely different configuration approach than v3:
- **No more `tailwind.config.js`** - Configuration is done in CSS
- **No more `postcss.config.js`** - Handled automatically
- **Import syntax** - Use `@import "tailwindcss"` instead of `@tailwind` directives

## Current Setup

### 1. Installation
```json
"tailwindcss": "^4.1.17",
"autoprefixer": "^10.4.22",
"postcss": "^8.5.6"
```

### 2. CSS Import
File: `src/renderer/styles/global.css`
```css
/* Tailwind CSS v4 Import */
@import "tailwindcss";
```

### 3. Custom Utilities
Custom utilities are added using `@layer utilities`:
```css
@layer utilities {
  .drag-region {
    -webkit-app-region: drag;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
}
```

### 4. CSS Variables
All theme variables are defined in `src/renderer/styles/theme.css` and referenced using Tailwind's arbitrary value syntax:
```tsx
className="bg-[var(--bg-secondary)] text-[var(--text-primary)]"
```

## Using Tailwind in Components

### Standard Tailwind Classes
```tsx
<div className="flex items-center justify-between h-10 px-2">
```

### Arbitrary Values with CSS Variables
```tsx
<div className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
```

### Arbitrary Numeric Values
```tsx
<div className="w-10 h-10 gap-[2px] text-[13px]">
```

### Advanced Selectors
```tsx
<div className="[&>*]:no-drag [&_svg]:pointer-events-none">
```

## Verification

To verify Tailwind is working:
1. Dev server should be running: `npm run dev`
2. Check browser console for any CSS errors
3. Inspect elements to see Tailwind classes applied
4. Look for generated CSS in the browser dev tools

## Troubleshooting

If Tailwind isn't working:
1. Ensure `@import "tailwindcss"` is at the top of your CSS file
2. Make sure there are no old config files (`tailwind.config.js`, `postcss.config.js`)
3. Restart the dev server after changes
4. Clear browser cache and reload

## Migration Notes

Migrated from:
- ❌ `@tailwind base/components/utilities` (v3 syntax)
- ❌ `tailwind.config.js` (v3 config)
- ❌ `postcss.config.js` (v3 PostCSS config)

To:
- ✅ `@import "tailwindcss"` (v4 syntax)
- ✅ CSS-based configuration (v4 approach)
- ✅ Automatic PostCSS handling (v4 feature)

