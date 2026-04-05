# Skapa Design System Skill

## Overview

This skill covers the **Skapa Design System** — IKEA's internal design system — and how to apply it to the Agentic Helper project. It provides design principles, component selection guidance, token references, accessibility patterns, and implementation workflows using the Skapa MCP tools.

---

## Skapa Design System Fundamentals

### What is Skapa?

Skapa is IKEA's unified design system that provides components, tokens, guidelines, and tools for building consistent, accessible digital experiences across the IKEA ecosystem. It supports React, Web Components, Vue, Android, and iOS.

- **Main site**: https://skapa.ikea.net
- **React Storybook**: https://react.skapa.ikea.net/
- **Web Components Storybook**: https://webc.skapa.ikea.net/
- **Design Tokens**: https://react.skapa.ikea.net/?path=/docs/foundation-design-tokens--documentation
- **NPM Registry**: https://npm.m2.blue.cdtapps.com/

### IKEA Democratic Design Principles

Every design must embody these five principles:

1. **Form** — Beautiful, purposeful aesthetics that reflect IKEA's Scandinavian heritage
2. **Function** — Every element must serve a clear purpose and user need
3. **Quality** — Robust, tested, accessible — works reliably for every user
4. **Sustainability** — Efficient code, minimal bundle size, performant rendering
5. **Affordability** — Simple, reusable patterns that reduce development cost

---

## MCP Tools Reference

The Skapa MCP server provides 7 tools. **Always call `skapa_help` first.**

### `skapa_help`

The foundational tool. Returns comprehensive design system documentation including:
- Design principles and validation protocols
- Component categories and usage guidance
- Accessibility standards (WCAG 2.2, WAI-ARIA APG)
- Framework-specific documentation links

**When to use**: Start of every design task. Before selecting any component.

### `react_dev_help`

React-specific component guidance from the build-time knowledge base (128+ components).

**Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeComponentDocs` | boolean | `true` | Include component docs from knowledge base |
| `component` | string | — | Focus on specific component (e.g., "button", "card") |
| `topic` | string | — | Focus on topic (e.g., "accessibility", "theming", "props") |
| `showExamples` | boolean | `true` | Show usage examples |
| `limit` | number (1-20) | `5` | Max component docs to return |

**When to use**: When designing React components, selecting component variants, checking props.

### `styles_dev_help`

SCSS/CSS guidance including design tokens, mixins, responsive patterns, and accessibility styles.

**When to use**: When specifying styles, tokens, typography, spacing, colors for implementation.

### `get_component`

Detailed docs for a specific Skapa component. Searches React, Web Components, and Shared.

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `component` | string (required) | Package name: `@ingka/button`, `button`, `card`, `button-webc` |
| `includeExamples` | boolean | Include usage examples and props tables |

**When to use**: When you've selected a component and need full API reference.

### `list_components`

Lists all available Skapa components organized by category.

**When to use**: When exploring what's available, finding the right component for a use case.

### `list_webc_components`

Lists all Web Components specifically.

### `webc_dev_help`

Web Components developer guide — setup, usage patterns, best practices.

---

## Design Token System

### Color Tokens

```scss
@use '@ingka/variables' as tokens;

// Text & Icons
tokens.$colour-text-and-icon-1     // Primary text
tokens.$colour-text-and-icon-2     // Secondary text
tokens.$colour-text-and-icon-3     // Tertiary/disabled text

// Backgrounds
tokens.$colour-neutral-1           // Primary background
tokens.$colour-neutral-2           // Secondary background
tokens.$colour-neutral-3           // Tertiary background

// Brand
tokens.$colour-static-ikea-brand-blue    // IKEA brand blue
tokens.$colour-static-ikea-brand-yellow  // IKEA brand yellow

// Semantic
tokens.$colour-semantic-positive   // Success
tokens.$colour-semantic-negative   // Error
tokens.$colour-semantic-caution    // Warning
tokens.$colour-semantic-informative // Info
```

### Spacing Tokens

```scss
// Use these exclusively — never hardcode px
tokens.$space-25    // 4px  — Tight internal gaps
tokens.$space-50    // 8px  — Component internal padding
tokens.$space-75    // 12px — Small gaps
tokens.$space-100   // 16px — Standard padding/gap
tokens.$space-125   // 20px — Comfortable padding
tokens.$space-150   // 24px — Section spacing
tokens.$space-200   // 32px — Large section spacing
tokens.$space-300   // 48px — Page-level spacing
```

### Typography Mixins

```scss
@use '@ingka/typography-shared/_mixins.scss' as typography;

// Headings
@include typography.heading-xl;   // Page titles
@include typography.heading-l;    // Section titles
@include typography.heading-m;    // Subsection titles
@include typography.heading-s;    // Card titles

// Body
@include typography.body-l;       // Large body text
@include typography.body-m;       // Standard body text
@include typography.body-s;       // Small/secondary text

// Labels
@include typography.label-l;      // Large labels
@include typography.label-m;      // Standard labels (buttons)
@include typography.label-s;      // Small labels (badges)
```

### Border Radius

```scss
tokens.$radius-s     // Small — tags, badges
tokens.$radius-m     // Medium — cards, inputs
tokens.$radius-l     // Large — modals, panels
tokens.$radius-cap   // Capsule — pills, rounded buttons
```

### Breakpoints

```scss
tokens.$breakpoint-m     // Medium (tablet)
tokens.$breakpoint-l     // Large (desktop)
tokens.$breakpoint-xl    // Extra large (wide desktop)
```

### Transitions

```scss
tokens.$duration-quick-web      // Fast micro-interactions
tokens.$duration-standard-web   // Standard transitions
tokens.$duration-slow-web       // Slow, deliberate animations
tokens.$ease-easy               // Standard easing curve
```

### Z-Index Layers

```scss
tokens.$layer-1    // Dropdowns, tooltips
tokens.$layer-2    // Sticky headers, floating actions
tokens.$layer-3    // Modals, overlays
tokens.$layer-4    // Toast notifications
```

---

## Component Selection Guide

### When the User Needs to Take an Action

| Use Case | Skapa Component | Package |
|----------|----------------|---------|
| Primary action | Button `variant="primary"` | `@ingka/button` |
| Secondary action | Button `variant="secondary"` | `@ingka/button` |
| Icon-only action | IconButton | `@ingka/button` |
| Destructive action | Button `variant="danger"` | `@ingka/button` |
| Toggle option | Pill | `@ingka/pill` |
| Expandable action | ExpandingButton | `@ingka/button` |

### When Displaying Content

| Use Case | Skapa Component | Package |
|----------|----------------|---------|
| Card layout | Card + CardHeader + CardBody | `@ingka/card` |
| Collapsible sections | Accordion + AccordionItem | `@ingka/accordion` |
| Data list | List + ListItem | `@ingka/list` |
| Tab navigation | Tabs + TabPanel | `@ingka/tabs` |
| Image display | Image | `@ingka/image` |
| Scrolling content | Carousel | `@ingka/carousel` |

### When Collecting Input

| Use Case | Skapa Component | Package |
|----------|----------------|---------|
| Text input | InputField | `@ingka/input-field` |
| Dropdown | Select | `@ingka/select` |
| Checkbox | Checkbox | `@ingka/checkbox` |
| Radio group | RadioButton | `@ingka/radio-button` |
| Toggle switch | Switch | `@ingka/switch` |
| Search | Search | `@ingka/search` |
| Autocomplete | Combobox | `@ingka/combobox` |
| Number | QuantityStepper | `@ingka/quantity-stepper` |

### When Showing Status

| Use Case | Skapa Component | Package |
|----------|----------------|---------|
| Count/notification | Badge | `@ingka/badge` |
| Loading state | Loading / Skeleton | `@ingka/loading` / `@ingka/skeleton` |
| Status indicator | Status | `@ingka/status` |
| Success/error message | InlineMessage | `@ingka/inline-message` |
| Toast notification | Toast | `@ingka/toast` |
| Banner alert | Banner | `@ingka/banner` |
| Form help text | HelperText | `@ingka/helper-text` |

### When Building Overlays

| Use Case | Skapa Component | Package |
|----------|----------------|---------|
| Dialog/modal | Modal | `@ingka/modal` |
| Tooltip | Tooltip | `@ingka/tooltip` |
| Expandable panel | Expander / Collapsible | `@ingka/expander` |

---

## Accessibility Checklist (WCAG 2.1 AA)

Every design must pass:

### Perceivable
- [ ] Color contrast ratio ≥ 4.5:1 for text (3:1 for large text)
- [ ] Information not conveyed by color alone
- [ ] All images have alt text
- [ ] Text is resizable to 200% without loss

### Operable
- [ ] All functions keyboard accessible
- [ ] Tab order follows visual order
- [ ] Focus indicator visible (Skapa handles this for native components)
- [ ] No keyboard traps
- [ ] Skip navigation link for page-level layouts

### Understandable
- [ ] Labels visible and descriptive
- [ ] Error messages specific and helpful
- [ ] Form instructions provided before inputs
- [ ] Consistent navigation pattern

### Robust
- [ ] Valid ARIA attributes
- [ ] `aria-label` on all icon-only buttons
- [ ] `aria-expanded` on toggleable elements
- [ ] `role` attributes where semantic HTML isn't sufficient
- [ ] Live regions (`aria-live`) for dynamic content updates

---

## Design Patterns for Agentic Helper

### Work Item Card (Skapa Composition)

```
┌─────────────────────────────────────┐  ← Card (@ingka/card)
│ ┌─────┐  Item Title          ★ 4/5 │  ← heading-s + Badge
│ │ 📋  │  Short description...       │  ← body-s
│ └─────┘  [security] [api]          │  ← Pill tags
│                                     │
│  Acceptance Criteria:               │  ← label-s
│  ✓ Criterion 1                      │  ← List (@ingka/list)
│  ✓ Criterion 2                      │
│                                     │
│  [Edit] [Approve] [Push →]         │  ← Button group
└─────────────────────────────────────┘
```

### Empty State Pattern

```
┌─────────────────────────────────────┐
│                                     │
│         🎯 (Illustration)          │
│                                     │
│     No work items yet               │  ← heading-m
│     Run @planner /plan with your    │  ← body-m
│     meeting notes to get started    │
│                                     │
│     [Get Started]                   │  ← Button primary
│                                     │
└─────────────────────────────────────┘
```

### Loading State Pattern

```
┌─────────────────────────────────────┐
│  ████████████████████ ░░░░░░        │  ← Skeleton (@ingka/skeleton)
│  ██████████ ░░░░░░░░░░░░░░░        │
│  ████████████████ ░░░░░░░░░        │
│  [Loading] (@ingka/loading)         │
└─────────────────────────────────────┘
```

### Error State Pattern

```
┌─────────────────────────────────────┐
│ ⚠️ Something went wrong             │  ← InlineMessage type="error"
│    Could not fetch work items.      │
│    Check your connection.           │
│    [Try Again]                      │  ← Button secondary
└─────────────────────────────────────┘
```

---

## VS Code Sidebar Design Constraints

When designing for the VS Code sidebar panel:

| Constraint | Approach |
|-----------|----------|
| **Width**: 300-400px typical | Single column, vertical stacking |
| **Theme**: Must match VS Code | Use VS Code CSS variables for backgrounds, text |
| **No direct API calls** | All data flows through PostMessage → Extension → Backend |
| **Limited real estate** | Progressive disclosure — expand/collapse, tabs |
| **Dark/Light mode** | Skapa tokens + VS Code variables handle this |

### VS Code CSS Variable Mapping

```css
/* Map VS Code theme to Skapa-compatible patterns */
.container {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-panel-border);
  font-family: var(--vscode-font-family);
}

.card {
  background: var(--vscode-editorWidget-background);
  border-radius: 4px; /* $radius-s equivalent */
}

.button-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}
```

---

## Installation for Web Portal

```bash
# Set registry for @ingka packages
npm set --location project @ingka:registry="https://npm.m2.blue.cdtapps.com"

# Install core + variables + base
npm install @ingka/core@latest
npm install @ingka/variables@latest
npm install @ingka/base@latest

# Install components as needed
npm install @ingka/button@latest
npm install @ingka/card@latest
npm install @ingka/accordion@latest
# ... etc
```

### SCSS Setup

```scss
// globals.scss
@use '@ingka/base' as base;        // CSS normalization
@use '@ingka/variables' as tokens;   // Design tokens

// Component styles are auto-included with their packages
```

---

## Design Validation Protocol

Before finalizing any design:

1. **Skapa Compliance** — Every component from Skapa catalog? Every value a token?
2. **Accessibility** — WCAG 2.1 AA checklist passed? Keyboard flow mapped?
3. **Responsiveness** — Works at all breakpoints? Narrow sidebar works?
4. **State Coverage** — Loading, empty, populated, error all specified?
5. **Dark Mode** — Works in both light and dark themes?
6. **Consistency** — Matches existing Agentic Helper patterns?
