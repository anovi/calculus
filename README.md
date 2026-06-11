# Calculus

A tiny notebook editor for everyday math. Type calculations line by line; results appear at the end of each line as you go.

## About

Calculus is a document-style calculator: each line is either a computed expression or a named value you can reuse below. It is meant for budgets, unit conversions, quick what-if math, and notes that stay live as you edit.

```text
monthly = 4200 EUR
rent = 1450 EUR
left = monthly - rent          → 2750 EUR

10 km in mi                    → 6.21 mi
freelance_usd = 800 USD
freelance_eur = freelance_usd in EUR
```

**What you can do**

- Write arithmetic with familiar operators (`+`, `-`, `*`, `/`, `%`, `^`) and parentheses
- Name results with `name = expression` and refer to them on later lines
- Use built-in functions (`sqrt`, `root`, `round`, `sum`, `average`, and more)
- Attach units to numbers and convert with `in`, `to`, or `as` (e.g. `10 USD in EUR`, `250 g in kg`)
- Mix compatible units in addition and subtraction (e.g. `10 cm + 1 m`)
- Add comments (`//`) and headings (`#`) that the calculator ignores
- Work with multiple documents, light/dark theme, and install as a PWA on supported browsers

For syntax details and examples, see the [user manual](docs/user-manual.md).

## Install as an app

Calculus is a [Progressive Web App](https://web.dev/explore/progressive-web-apps). You can install it on your phone or computer and open it from the home screen or app launcher — like a native app, without the browser toolbar.

**What you get**

- A standalone window focused on your documents
- Documents saved locally in the browser
- The app shell works offline; previously fetched exchange rates are cached too

**How to install**

On **desktop** (Chrome, Edge, and similar):

1. Open Calculus in the browser.
2. Click **Install as app** in the bottom-right corner, or open the app menu and choose **Install the app**.

You may also see an install icon in the address bar. The in-app link appears only when the browser offers install and the app is not already installed.

On **desktop** (Safari):

1. Open Calculus in the browser.
2. Tap the **Share** button.
3. Choose **Add to Dock**.

On **Android** (Chrome and other Chromium browsers):

1. Open Calculus in the browser.
2. Tap **Install as app** in the bottom-right corner, or open the app menu and choose **Install the app**.

On **iPhone and iPad** (Safari, Chrome, or any browser):

1. Open Calculus in the browser.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.


After installation, updates are applied automatically in the background when you use the app.

## Limitations

**Currency signs are not supported.** Use ISO 4217 codes instead of symbols:

| Not supported | Use instead |
|---------------|-------------|
| `$100`        | `100 USD`   |
| `€50`         | `50 EUR`    |
| `£20`         | `20 GBP`    |

Currency conversion between codes (e.g. `10 USD in EUR`) requires a network connection; rates come from the [Frankfurter](https://www.frankfurter.app/) API. But once used exchange rates are cached, it can work offline, though the rates will be outdated.

Other limitations:

- One expression or one binding per line
- You cannot convert between unrelated kinds (e.g. `222 m in USD` → `NaN`)
- Multiplying or dividing incompatible units (e.g. `10 cm * 2 EUR`) yields `NaN`
- String literals (`"hello"`) and date literals (`2026-05-30`) are recognized by the editor but not evaluated as numbers

## Current issues

- **Compound units from multiplication** — Multiplying two lengths does not produce area units (`4.2 m * 3.6 m` keeps `m`, not `m2`). Converting derived quantities like `room_area in ft2` is not supported yet.
- **Ambiguous unit spellings** — Some inputs match more than one unit (e.g. `MS` can mean megaseconds or milliseconds). Calculus reports an ambiguity error; use the exact spelling you mean (`Ms` vs `ms`).
- **Exchange rates when offline** — Currency conversions show `NaN` until rates are fetched. Exotic or unsupported pairs may stay unavailable depending on Frankfurter coverage.
- **Display precision** — Very large or precise values may be rounded in the result pill; hover for more detail.
