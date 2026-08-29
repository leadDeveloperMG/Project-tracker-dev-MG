# Design system

Visual and interaction rules live here so screens do not invent one-off styling.

## Language

| Action | Label |
|---|---|
| New record | Create |
| Persist edits | Save |
| Soft-delete | Archive |
| Undo archive | Restore |
| Auth | Sign in / Sign out |
| List narrowing | Apply filters |

Do not mix Add/New/Create for the same kind of object.

## Tokens

Defined in `src/app/globals.css`:

- Color: background, foreground, primary, muted, destructive, success, warning, info, sidebar
- Radius: `--radius` and derived `sm`–`4xl`
- Spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48 px (`--space-1` … `--space-7`)
- Type: `.text-page-title`, `.text-section-title`, `.text-body`, `.text-label`, `.text-caption`
- Motion: `--duration-fast` / `--duration-normal`; `prefers-reduced-motion` disables animation

## Components

Reuse `src/components/ui/*` and `src/components/app-shell.tsx` instead of copying class strings.

- Button: `default` (primary), `outline` (secondary), `ghost`, `destructive`; sizes include `lg` for page CTAs (`h-11` touch target)
- Field: label, hint, field-level error, `aria-invalid`
- EmptyState, Alert, Skeleton, Table, ConfirmForm, ActionForm

## Layout

- Desktop: persistent sidebar
- Narrow: header + drawer, `min-h-11` controls
- Data tables: horizontal scroll from `md` down (`min-w-[40rem]`)
- Forms: two columns from `md`, single column on small screens

## States every primary screen should include

First use (empty + one CTA), loading (route `loading.tsx` skeleton), success (inline Alert), validation (field errors), server failure (generic copy + reference ID), no permission (`/forbidden`), offline banner.
