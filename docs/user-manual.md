# Compio User Manual

Compio is a notebook-style editor for everyday math. Each line is either a calculation or a variable assignment; results appear at the end of the line as you type.

---

## Table of contents

- [How documents work](#how-documents-work)
- [Quick reference](#quick-reference)
- [Numbers](#numbers)
- [Variables](#variables)
- [Operators](#operators)
- [Functions](#functions)
- [Units and conversions](#units-and-conversions)
- [Comments and headings](#comments-and-headings)
- [Limitations](#limitations)

---

## How documents work

- **One expression per line.** Each line is evaluated independently.
- **Results on the right.** A line like `2 + 2` shows `= 4` at the end.
- **Variables.** Use `name = expression` (or `name: expression`) to store a result and reuse it on later lines.
- **Order matters.** Variables are available only on lines *below* the line where they are defined.

```text
monthly = 4200 EUR
rent = 1450 EUR
left = monthly - rent
```

Lines without `=` or `:` are plain expressions — they calculate but do not create a variable:

```text
2 + 2          → 4
10 km in mi    → 6.21 mi
```

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

// Scientific notation
6.02214076e23 = 6.02214076e+23
1.5e3 km // 1500 km = 1 500 km

// Functions (see Functions menu for the full list)
sqrt(16) = 4
round(3.7) = 4
num(12 EUR) = 12

// Aggregation — sum lines above within a group
rent = 100
food = 50
sum() = 150

// Units — attach to numbers, mix compatible ones, convert with in / to / as
100 USD = 100 USD
10 cm + 1 m = 1.1 m
//will convert to euros
10 USD in EUR
100 cm in m in km = 0.001 km
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

Underscores work the same way:

```text
1_233_232
34_500_000
```

### Scientific notation

Write very large or very small numbers with `e` or `E`:

```text
6.02214076e23
1.23e-7
2e10
1E+10
```

You can attach units to the mantissa:

```text
1.5e3 km    → 1500 km
```

Results may also display in scientific notation when a plain decimal string would be unwieldy.

### Negative numbers

Unary minus works on numbers and expressions:

```text
-2
-40 / 2
2 + -3
(-4)^2
```

---

## Variables

Assign a name with `=` or `:`:

```text
tax_rate = 0.21
net: 100
gross = net + net * tax_rate
```

**Naming rules:** names start with a letter (including non-Latin letters) and may contain letters, digits, underscores, dots, and spaces. Spaces join words into a single name — `monthly net` is one variable, not two:

```text
pi_approx = 3.141592653589793
debt_per_capita = total / population
monthly net = 4_200 EUR
π = 3.141592653589793
```

Use variables in later expressions:

```text
x = 9
sqrt(x)
2 + x
```

Variables can carry units:

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

From highest to lowest precedence:

1. Parentheses `( … )`
2. Exponentiation `^` (right-associative: `2^3^2` = `2^(3^2)` = 512)
3. Multiplication, division, remainder `*`, `/`, `%`
4. Addition and subtraction `+`, `-`

Unary minus has lower precedence than exponentiation:

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

Functions are called by name with parentheses. Arguments are separated by commas. Open the **Functions** menu in the editor toolbar to browse every built-in function with short descriptions.

### Everyday functions

These cover most day-to-day math:

| Function                                      | What it does                                 |
| --------------------------------------------- | -------------------------------------------- |
| `sqrt(x)`                                     | Square root                                  |
| `abs(x)`                                      | Distance from zero, or simpler — drop a sign |
| `floor(x)`, `ceil(x)`, `round(x)`, `trunc(x)` | Round down, up, to nearest, or drop decimals |
| `num(x)`                                      | Drop the unit from a value (keep the number) |
| `pow(base, exponent)`                         | Raise to a power (`pow(2, 8)` = 256)         |

```text
sqrt(16)              → 4
abs(-7)               → 7
round(3.7)            → 4
num(12 EUR)           → 12
pow(2, 10)            → 1024
```

### `root(x, n)`

The *n*-th root of *x*. The degree *n* is the second argument. Unlike `^`, `root` handles odd integer roots of negative bases correctly.

```text
root(16, 2)     → 4      (square root)
root(27, 3)     → 3      (cube root)
root(-8, 3)     → -2     (odd root of negative base)
root(-4, 2)     → NaN    (even root of negative base)
```

For other roots and powers, see **More roots** and **Exponents & logs** in the Functions menu (`cbrt`, `exp`, `ln`, `log`, and more).

### More functions

The Functions menu groups the rest by topic: **Totals**, **Compare & limit**, **Trigonometry**, **Exponents & logs**, and **Advanced**. Use autocomplete while typing a function name to see argument hints.

Functions preserve units from their input when the operation allows it:

```text
x = 9 mm
sqrt(x)    → 3 mm
```

### Aggregation functions

`sum()`, `average()` (alias `avg()`), and `median()` summarize the **preceding lines in the current group**. They take **no arguments**. Blank lines separate groups — aggregation stops at the group boundary.

```text
rent = 1_450 EUR
utilities = 185 EUR
groceries = 520 EUR
sum()   → 2155 EUR

10
20
sum()   → 30

10

20
sum()   → 20   (only lines after the blank line)
```

Aliases: `total()` is the same as `sum()`.

Use aggregation inside larger expressions:

```text
10
20
2 + sum()   → 32
```

All aggregated lines must use compatible units (or plain numbers). `sum()` on the first line of a group returns `0`; `average()` and `median()` need at least one preceding line.

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

Convert a variable:

```text
length = 20 cm
length in m    → 0.2 m
```

### Mixing units in expressions

When you add or subtract compatible units, Compio converts automatically to a common unit (the rightmost unit with a value wins):

```text
10 cm + 1 m    → 1.1 m
10 USD + 1 EUR → 9.65 EUR //combines in EUR (with live rate)
```

Multiplication and division work on the numeric parts; incompatible unit combinations produce `NaN` (not a number):

```text
10 cm * 2       → 20 cm
10 cm * 2 EUR   → NaN
20 cm + 10 EUR  → NaN
10 kg + 5 m     → NaN
```

### Ambiguous unit names

Some spellings match more than one unit. For example, `MS` can mean megaseconds (`Ms`) or milliseconds (`ms`). Compio reports an ambiguity error and suggests the possible units — pick the exact spelling you mean:

```text
100 Ms     → megaseconds
100 ms     → milliseconds
```

---

## Comments and headings

**Comments** start with `//` and are ignored by the calculator. Use them for notes, chapter titles, or to disable a line temporarily:

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

## Limitations

**No sync between devices.** Compio has no accounts and does not upload your notebooks anywhere. Everything is saved on the device and in the browser you are using.

What that means in practice:

- Notebooks on your laptop are not available on your phone, tablet, or another device.
- Different browsers keep separate copies, even on the same machine.
- Installing Compio as an app (PWA) still uses the same browser storage; installation does not back up documents elsewhere.
- Clearing site data, uninstalling the browser, or using private browsing can remove or isolate stored documents.

**Currency signs are not supported.** Use ISO 4217 codes instead of symbols:

| Not supported | Use instead |
|---------------|-------------|
| `$100`        | `100 USD`   |
| `€50`         | `50 EUR`    |
| `£20`         | `20 GBP`    |

Currency conversion between codes (e.g. `10 USD in EUR`) requires a network connection; rates come from the [Frankfurter](https://www.frankfurter.app/) API. But once used exchange rates are cached, it can work offline, though the rates will be outdated.
