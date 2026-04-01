# Project Theme & Design System

This document defines the visual identity and design tokens for the Web-storis platform.

## 🎨 Color Palette

The project uses a sophisticated deep-green color scheme, conveying a sense of premium quality and stability.

| Color | Hex | Sample | Role |
| :--- | :--- | :---: | :--- |
| **Deep Forest** | `#091413` | ![#091413](https://via.placeholder.com/15/091413?text=+) | Background / Main Text |
| **Pines** | `#285A48` | ![#285A48](https://via.placeholder.com/15/285A48?text=+) | Secondary Background / Borders |
| **Sea Foam** | `#408A71` | ![#408A71](https://via.placeholder.com/15/408A71?text=+) | Primary Accent / Buttons |
| **Mint Frost** | `#B0E4CC` | ![#B0E4CC](https://via.placeholder.com/15/B0E4CC?text=+) | UI Highlights / Subtitles |

---

## 🛠 Frontend Tools & Libraries

To create a premium, interactive user experience, we utilize the following specialized libraries:

### 🎭 Animation: `framer-motion`
- Used for smooth page transitions.
- Story reveal animations.
- Interactive hover effects and micro-interactions.

### 📐 Icons: `lucide-react`
- A clean, consistent icon set for navigation and commerce actions.
- Highly customizable and lightweight.

---

## 📐 Implementation in CSS

Add the following variables to your root CSS file:

```css
:root {
  --color-bg-deep: #091413;
  --color-bg-forest: #285A48;
  --color-primary: #408A71;
  --color-accent: #B0E4CC;
  
  --text-primary: #B0E4CC;
  --text-secondary: #408A71;
}
```
