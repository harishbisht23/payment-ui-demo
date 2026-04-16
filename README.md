# Payment Card Component

A responsive, accessible, framework-agnostic payment-card form with a live 3-D card preview.  
Works out-of-the-box with **vanilla HTML**, **React**, and any other JS framework.

---

## File structure

```
payment-card-component/
├── css/
│   ├── payment-card.scss   ← source (Sass) — edit this
│   └── payment-card.css    ← compiled CSS — use this if you have no Sass
├── html/
│   └── index.html          ← standalone vanilla demo page
├── vanilla/
│   └── payment-card.js     ← framework-agnostic controller
├── react/
│   └── PaymentCardForm.jsx ← drop-in React component
└── README.md               ← you are here
```

---

## Quick start

### Vanilla HTML

1. Copy `css/payment-card.css` next to your HTML file.
2. Copy the markup from `html/index.html` (`<div class="pc-wrap">…</div>`).
3. Copy `vanilla/payment-card.js` and add before `</body>`:

```html
<link rel="stylesheet" href="payment-card.css" />
<!-- your pc-wrap markup here -->
<script src="payment-card.js"></script>
```

The script auto-initialises on `DOMContentLoaded`.

---

### React

```jsx
import PaymentCardForm from './react/PaymentCardForm';
import './css/payment-card.css';

function Checkout() {
  return (
    <PaymentCardForm
      onSuccess={(data) => {
        // data = { name, number, expiry, cvv, cardType }
        processPayment(data);
      }}
      onError={(errors) => console.warn(errors)}
    />
  );
}
```

---

### Other frameworks (Vue, Svelte, Angular…)

Use `vanilla/payment-card.js` with `initPaymentCard()` inside the framework's
mount lifecycle:

**Vue 3 example**
```js
import { onMounted, onUnmounted } from 'vue';
import { initPaymentCard } from './payment-card.js';

let instance;
onMounted(() => { instance = initPaymentCard(); });
onUnmounted(() => instance?.destroy());
```

**Svelte**
```js
import { onMount } from 'svelte';
import { initPaymentCard } from './payment-card.js';

let destroy;
onMount(() => { ({ destroy } = initPaymentCard()); return destroy; });
```

---

## CSS variables reference

All design tokens are CSS custom properties on `:root`.  
Override any of them on `:root` or a parent element to white-label the component.

| Variable | Default | Description |
|---|---|---|
| `--pc-accent` | `#3b7be0` | Focus ring, submit button gradient start |
| `--pc-accent-dark` | `#2c60d4` | Submit button gradient end |
| `--pc-success` | `#3da86a` | Valid-field border + ring |
| `--pc-error` | `#e24b4a` | Invalid-field border + ring |
| `--pc-card-bg-from` | `#1a2a4a` | Card gradient top-left |
| `--pc-card-bg-to` | `#2c3e70` | Card gradient mid |
| `--pc-card-bg-end` | `#1a3060` | Card gradient bottom-right |
| `--pc-card-text` | `#ffffff` | Text on the card face |
| `--pc-card-chip-from/mid/end` | gold ramp | EMV chip colour stops |
| `--pc-card-radius` | `14px` | Card corner radius |
| `--pc-card-shadow` | dark box-shadow | Card lift shadow |
| `--pc-bg` | `#ffffff` | Input background |
| `--pc-border` | `#e0e0e0` | Default input border |
| `--pc-border-hover` | `#c0c0c0` | Input border on hover |
| `--pc-text` | `#111111` | Input text |
| `--pc-placeholder` | `#bbbbbb` | Input placeholder |
| `--pc-label` | `#888888` | Field label colour |
| `--pc-focus-ring` | `rgba(59,123,224,0.13)` | Focus glow colour |
| `--pc-success-ring` | `rgba(61,168,106,0.11)` | Success glow |
| `--pc-error-ring` | `rgba(226,75,74,0.11)` | Error glow |
| `--pc-radius-input` | `10px` | Input corner radius |
| `--pc-radius-btn` | `12px` | Button corner radius |
| `--pc-input-height` | `44px` | Input height |
| `--pc-gap` | `14px` | Vertical gap between fields |
| `--pc-font` | system-ui stack | Font family |

### Brand colour override example

```css
:root {
  --pc-accent:       #7c3aed;   /* purple */
  --pc-accent-dark:  #6d28d9;
  --pc-card-bg-from: #1e1b4b;
  --pc-card-bg-to:   #312e81;
  --pc-card-bg-end:  #1e1b4b;
  --pc-font:         'Inter', sans-serif;
}
```

### Font swap

```css
:root {
  --pc-font: 'Poppins', 'Helvetica Neue', sans-serif;
}
```

---

## Dark mode

The component supports **two dark-mode strategies**. Pick one.

### Strategy A — OS preference (automatic)

Already included in `payment-card.css`.  
No code changes needed; it responds to `prefers-color-scheme: dark` automatically.

### Strategy B — class-based (manual toggle)

Add `class="dark"` (or `data-theme="dark"`) to any ancestor element:

```html
<body class="dark">          <!-- whole page -->
<section class="dark">      <!-- scoped to a section -->
```

The `.dark .pc-wrap` rule in the CSS picks this up.

### Dark-mode token overrides

When dark mode is active, only the **form surface** tokens change.  
The **card face** stays dark by design (it already uses a dark navy gradient).

| Token overridden | Dark value |
|---|---|
| `--pc-bg` | `#1e1e2e` |
| `--pc-border` | `#3a3a54` |
| `--pc-border-hover` | `#555570` |
| `--pc-text` | `#e8e8f0` |
| `--pc-placeholder` | `#55556a` |
| `--pc-label` | `#8888aa` |

---

## Input state classes

Apply these classes to any `<input>` to trigger the matching visual state.
The vanilla JS and React component manage these automatically.

| Class | Visual |
|---|---|
| *(none)* | Default — grey border |
| `focus` | Applied automatically via CSS `:focus` |
| `success` | Green border + success ring |
| `error` | Red border + error ring |

---

## Class names reference

| Class | Element | Purpose |
|---|---|---|
| `.pc-wrap` | Root `<div>` | Flex column container |
| `.pc-card` | `<div>` | 3-D card preview face |
| `.pc-card-logo` | `<svg>` or `<img>` | Watermark logo (centred, low opacity) |
| `.pc-card-chip` | `<div>` | EMV chip visual |
| `.pc-card-number` | `<div>` | PAN display |
| `.pc-card-bottom` | `<div>` | Flex row: name / expiry / network |
| `.pc-card-label` | `<div>` | Tiny uppercase label |
| `.pc-card-value` | `<div>` | Value text below label |
| `.pc-card-type` | `<div>` | Network badge slot (top-right) |
| `.pc-form` | `<form>` | Form column |
| `.pc-field` | `<div>` | Label + input + hint group |
| `.pc-input-wrap` | `<div>` | Positions input + icon |
| `.pc-input-wrap.has-icon` | modifier | Adds right padding for icon |
| `.pc-icon` | `<span>` | Trailing icon (invisible by default) |
| `.pc-icon.visible` | modifier | Makes icon visible (`opacity: 1`) |
| `.pc-hint` | `<span>` | Field-level message (invisible when empty) |
| `.pc-hint.error` | modifier | Red error message |
| `.pc-hint.success` | modifier | Green success message |
| `.pc-row` | `<div>` | Two-column grid (Expiry + CVV) |
| `.pc-btn` | `<button>` | Submit button |
| `.pc-btn.state-success` | modifier | Green success state |
| `.pc-btn.state-error` | modifier | Red error state |
| `.pc-sr-only` | any | Visually hidden (screen readers only) |

---

## JavaScript API (`vanilla/payment-card.js`)

```js
import { initPaymentCard } from './vanilla/payment-card.js';

const { destroy } = initPaymentCard({
  nameId:    'pcName',     // default
  numId:     'pcNum',      // default
  expId:     'pcExp',      // default
  cvvId:     'pcCvv',      // default
  formId:    'pcForm',     // default
  onSuccess: (data) => { /* charge the card */ },
  onError:   (errors) => { /* show a toast */ },
});

// Teardown (e.g. when navigating away in a SPA)
destroy();
```

### Custom events

The `<form>` element also dispatches DOM custom events:

```js
document.getElementById('pcForm').addEventListener('pc:valid', (e) => {
  console.log(e.detail); // { name, number, expiry, cvv, cardType }
});

document.getElementById('pcForm').addEventListener('pc:invalid', (e) => {
  console.log(e.detail.errors); // string[]
});
```

---

## React props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSuccess` | `(data) => void` | — | Called on successful submit |
| `onError` | `(errors: string[]) => void` | — | Called on failed submit |
| `accentColor` | `string` | `#3b7be0` | Overrides `--pc-accent` |
| `cardBgFrom` | `string` | — | Overrides card gradient start |
| `cardBgTo` | `string` | — | Overrides card gradient mid |
| `cardBgEnd` | `string` | — | Overrides card gradient end |
| `logoElement` | `ReactNode` | house SVG | Custom watermark element |

---

## Accessibility

- All inputs have `aria-required`, `aria-describedby` linking to hint elements.
- Hint `<span>`s use `role="alert"` and `aria-live="polite"` for screen-reader announcements.
- The card preview has `aria-hidden="true"` — it is decorative.
- Colour contrast meets **WCAG AA** for all text on both light and dark backgrounds.
- Supports `prefers-reduced-motion` — all transitions are disabled when the user has this preference set.

---

## Browser support

Chrome 88+, Safari 14+, Firefox 85+, Edge 88+  
(Uses `aspect-ratio` — all evergreen browsers since 2021.)

---

## Customising the watermark logo

**HTML:**
```html
<!-- Replace the <svg class="pc-card-logo"> with your image -->
<img class="pc-card-logo" src="/your-logo.svg" alt="" />
```

**React:**
```jsx
<PaymentCardForm
  logoElement={<img src="/your-logo.svg" alt="" />}
/>
```

The `.pc-card-logo` CSS rule handles positioning and opacity automatically.  
To change the opacity, override in your own CSS:
```css
.pc-card-logo { opacity: 0.08; }  /* lighter */
.pc-card-logo { opacity: 0.15; }  /* heavier */
```

---

## Integrating with a payment gateway

The component handles **only UI and client-side validation**.  
Never send raw card data to your own server — tokenise it via your gateway's SDK
before submitting.

**Example with Stripe.js:**
```js
initPaymentCard({
  onSuccess: async ({ name, number, expiry, cvv }) => {
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement('card'),
      billing_details: { name },
    });
    if (error) { showError(error.message); return; }
    await fetch('/charge', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
    });
  },
});
```

---

*Component version 1.0.0 — MIT licence*
