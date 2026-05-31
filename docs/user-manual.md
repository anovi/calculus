# Calculus User Manual

Calculus is a notebook-style editor for everyday math. Each line is either a calculation or a named value; results appear at the end of the line as you type.

---

## Table of contents

- [How documents work](#how-documents-work)
- [Numbers](#numbers)
- [Variables (bindings)](#variables-bindings)
- [Operators](#operators)
- [Functions](#functions)
- [Units and conversions](#units-and-conversions)
- [Comments and headings](#comments-and-headings)
- [Common patterns](#common-patterns)
- [Errors and limitations](#errors-and-limitations)

---

## How documents work

- **One expression per line.** Each line is evaluated independently.
- **Results on the right.** A line like `2 + 2` shows `= 4` at the end.
- **Named values.** Use `name = expression` to store a result and reuse it on later lines.
- **Order matters.** Bindings are available only on lines *below* the line where they are defined.

```text
monthly = 4200 EUR
rent = 1450 EUR
left = monthly - rent
```

Lines without `=` are plain expressions — they calculate but do not create a variable:

```text
2 + 2          → 4
10 km in mi    → 6.21 mi
```

---

## Numbers

### Integers and decimals

```text
42
0.123
-2
```

### Thousands separators

Use spaces or commas in the integer part to make large numbers readable:

```text
1,233,232
1 999 232
1,233,232.232
```

Commas are allowed only in the integer part (before the decimal point).

### Negative numbers

Unary minus works on numbers and expressions:

```text
-2
-40 / 2
2 + -3
(-4)^2
```

---

## Variables (bindings)

Assign a name with `=`:

```text
tax_rate = 0.21
net = 100
gross = net + net * tax_rate
```

**Naming rules:** names start with a letter and may contain letters, digits, underscores, and dots:

```text
pi_approx = 3.141592653589793
debt_per_capita = total / population
```

Use bindings in later expressions:

```text
x = 9
sqrt(x)
2 + x
```

Bindings can carry units:

```text
width = 12 EUR
trip = width * 14
```

---

## Operators

### Arithmetic

| Operator | Meaning              | Example   | Result |
|----------|----------------------|-----------|--------|
| `+`      | Addition             | `2 + 3`   | 5      |
| `-`      | Subtraction          | `10 - 4`  | 6      |
| `*`      | Multiplication       | `3 * 7`   | 21     |
| `/`      | Division             | `12 / 3`  | 4      |
| `%`      | Remainder (modulo)   | `10 % 3`  | 1      |
| `^`      | Exponentiation       | `2^4`     | 16     |

Parentheses override precedence:

```text
(2 + 2) * 3    → 12
2 + 2 * 3      → 8
```

### Operator precedence

From highest to lowest binding strength:

1. Parentheses `( … )`
2. Exponentiation `^` (right-associative: `2^3^2` = `2^(3^2)` = 512)
3. Multiplication, division, remainder `*`, `/`, `%`
4. Addition and subtraction `+`, `-`

Unary minus binds less tightly than exponentiation:

```text
-4^2     → -16    (negates 4²)
(-4)^2   → 16     (squares -4)
```

### Powers and roots

Fractional exponents follow real-number rules. Some combinations yield `NaN` (not a real result):

```text
16^0.5       → 4
16^(1/2)     → 4
(-4)^0.5     → NaN
(-8)^(1/3)   → NaN
```

For n-th roots — especially odd roots of negative numbers — prefer the `root` function (see [Functions](#functions)).

---

## Functions

Functions are called by name with parentheses. Arguments are separated by commas.

### `sqrt(x)`

Square root.

```text
sqrt(16)        → 4
2 + sqrt(16)    → 6
```

### `root(x, n)`

The *n*-th root of *x*. The degree *n* is the second argument.

```text
root(16, 2)     → 4      (square root)
root(27, 3)     → 3      (cube root)
root(-8, 3)     → -2     (odd root of negative base)
root(-4, 2)     → NaN    (even root of negative base)
```

Unlike `^`, `root` handles odd integer roots of negative bases correctly.

Functions preserve units from their input:

```text
x = 9 mm
sqrt(x) = 3 mm  → 3 mm
```

---

## Units and conversions

### Writing values with units

Attach a unit directly to a number, or separate them with a space:

```text
100USD
100 usd
12 EUR
3.5 km
250 g
```

Unit names are **case-insensitive** for matching (`usd`, `USD`, `Usd` all work). The canonical spelling is kept in results when possible.

### Supported units

**Currencies** — ISO 4217 codes (e.g. `USD`, `EUR`, `GBP`, `JPY`, `RUB`). Exchange rates are fetched live from the [Frankfurter](https://www.frankfurter.app/) API when you convert between currencies.

**Measurement units** — length, mass, volume, time, area, temperature, and more. Examples:

| Category   | Examples                          |
|------------|-----------------------------------|
| Length     | `m`, `cm`, `km`, `mi`, `ft`, `in` |
| Mass       | `g`, `kg`, `lb`, `oz`             |
| Volume     | `l`, `ml`, `gal`                  |
| Time       | `s`, `ms`, `min`, `h`, `Ms`       |
| Area       | `m2`, `ft2`                       |

Use the spelling your document needs; autocomplete in the editor can help find valid unit names.

### Converting units

Use `in`, `into`, `as`, or `to` (case-insensitive) to convert:

```text
10 USD in EUR
10 km in mi
123123 ms in min
100 cm in m in km
```

Conversions chain left to right:

```text
100 cm in m in km    → 0.001 km
```

Convert a plain number by assigning the target unit:

```text
10 in EUR    → 10 EUR
```

Convert a named value:

```text
length = 20 cm
length in m    → 0.2 m
```

### Mixing units in expressions

When you add or subtract compatible units, Calculus converts automatically to a common unit (the rightmost unit with a value wins):

```text
10 cm + 1 m    → 1.1 m
10 USD + 1 EUR → combines in EUR (with live rate)
```

Multiplication and division work on the numeric parts; incompatible unit combinations produce `NaN`:

```text
10 cm * 2       → 20 cm
10 cm * 2 EUR   → NaN
20 cm + 10 EUR  → NaN
10 kg + 5 m     → NaN
```

You cannot convert between unrelated kinds (e.g. length to currency):

```text
222 m in USD    → NaN
```

### Ambiguous unit names

Some spellings match more than one unit. For example, `MS` can mean megaseconds (`Ms`) or milliseconds (`ms`). Calculus reports an ambiguity error and suggests the possible units — pick the exact spelling you mean:

```text
100 Ms     → megaseconds
100 ms     → milliseconds
```

---

## Comments and headings

**Comments** start with `//` and are ignored by the calculator. Use them for notes, chapter titles, or to temporarily disable a line:

```text
// Monthly budget
rent = 1450 EUR
// utilities = 200 EUR
```

**Headings** start with `#` and are also non-calculating markers for structure:

```text
# Trip planning
flight = 642 USD
```

Toggle comments from the editor toolbar or with the standard comment shortcut (`ctrl+/` or `cmd+/` for Mac OS).

---

## Common patterns

### Budgets and percentages

```text
net = 100
tax_rate = 0.21
gross = net + net * tax_rate
savings_rate = 0.15
monthly_savings = net * savings_rate
```

### Multi-currency workflows

```text
freelance_usd = 800 USD
freelance_eur = freelance_usd in EUR
annual_eur = monthly_net_eur * 12 + freelance_eur * 6
```

### Unit-aware geometry (future)

```text
room_length = 4.2 m
room_width = 3.6 m
room_area = room_length * room_width
room_area_ft2 = room_area in ft2
```

TODO: currently, these type of convertsions are not supported.

### Recipe scaling

```text
scale = 18 / 4
flour = 250 g
flour_scaled = flour * scale
flour_kg = flour_scaled in kg
```

---

## Errors and limitations

| Situation                                          | What you see              |
|----------------------------------------------------|---------------------------|
| Incompatible units in `+` / `-`                    | `NaN` or an error message |
| Invalid conversion (e.g. meters → dollars)         | `NaN`                     |
| Ambiguous unit spelling                            | Error with unit choices   |
| Square root of a negative number                   | `NaN`                     |
| Missing exchange rate (offline / unsupported pair) | `NaN` until rates load    |
| Incomplete expression on a line                    | Error; following lines may still calculate |
| Empty binding (`name =` with no value)             | Error on that line        |

**Not evaluated:** string literals (`"hello"`) and date literals (`2026-05-30`) are recognized by the parser but do not produce numeric results.

**One binding per line.** Each line supports a single `name = expression` or a single bare expression — not multiple comma-separated expressions.

**Precision:** Calculus uses decimal arithmetic internally. Very large or very precise results may be rounded for display; hover a result widget to see higher precision and the full unit name.

---

## Quick reference

Copy the block below into the editor as-is:

```text
// Variable — result is stored under the name
width = 12

// One-off calculation — no variable
2 + 2 = 4

// Comment lines and headings are ignored by the calculator
# Example header

// Precedence: ^ before * / %, then + -
2 + 2 * 3 = 8
2 * 2 ^ 3 = 16
2 ^ 3 ^ 2 = 512

// Grouping — parentheses override precedence
(2 + 2) * 3 = 12
(3 + 2) * 10 = 50

// Unary minus binds after exponentiation
- 4 ^ 2 = -16
(- 4) ^ 2 = 16

// Functions
sqrt(16) = 4
root(27, 3) = 3

// Units — attach to numbers, mix compatible ones, convert with in / to / as
100 USD = 100 USD
10 cm + 1 m = 1.1 m
10 USD in EUR = 8.58 EUR
100 cm in m in km = 0.001 km
```
