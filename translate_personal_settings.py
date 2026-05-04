#!/usr/bin/env python3
"""
translate_personal_settings.py

Updates translations.js so that the "personal" key is properly localized
in all 12 languages, and adds a "personalSettings" alias with the same
value (so both t.personal and t.personalSettings resolve correctly).

Edits the file in place. Uses git to keep a safety net — make sure your
working tree is clean before running, or back up first.

Usage:
    python3 translate_personal_settings.py \\
        /Users/janegil-staff/Projects/coachly/coachly-mobile/src/lib/translations.js
"""

import re
import sys
from pathlib import Path

TRANSLATIONS = {
    "en": "Personal settings",
    "no": "Personlige innstillinger",
    "nl": "Persoonlijke instellingen",
    "fr": "Paramètres personnels",
    "de": "Persönliche Einstellungen",
    "it": "Impostazioni personali",
    "sv": "Personliga inställningar",
    "da": "Personlige indstillinger",
    "fi": "Omat asetukset",
    "es": "Ajustes personales",
    "pl": "Ustawienia osobiste",
    "pt": "Definições pessoais",
}

# Mobile uses simple object literals like:
#   "en": {
#     ...keys...
#     "personal": "Personal settings",
#     ...
#   },
#
# We walk language-by-language, find the "personal" key, replace its value
# with the localized version, AND add a "personalSettings" key right after
# it (with the same value) if not already present.

LANG_HEADER_RX = re.compile(
    r'(["\']?(?P<code>en|no|nl|fr|de|it|sv|da|fi|es|pl|pt)["\']?\s*:\s*\{)',
)


def find_lang_block_end(text, start_idx):
    """Given the index right after a language's opening brace, return the
    index of the matching closing brace."""
    depth = 1
    i = start_idx
    in_str = False
    str_char = ""
    escape = False
    while i < len(text):
        c = text[i]
        if in_str:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == str_char:
                in_str = False
        else:
            if c in ('"', "'"):
                in_str = True
                str_char = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


def edit_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text

    # Walk in reverse so insertions don't shift earlier offsets.
    matches = list(LANG_HEADER_RX.finditer(text))
    edits_personal = 0
    edits_alias = 0
    seen_langs = set()

    for m in reversed(matches):
        code = m.group("code")
        if code in seen_langs:
            # If a language code appears twice (shouldn't normally),
            # only edit the first textual occurrence (which we hit last
            # when iterating reversed). Skip duplicates.
            continue
        seen_langs.add(code)

        if code not in TRANSLATIONS:
            continue
        translation = TRANSLATIONS[code]

        block_start = m.end()  # index right after the opening brace
        block_end = find_lang_block_end(text, block_start)
        if block_end < 0:
            print(f"  ! warning: could not find end of '{code}' block")
            continue

        block = text[block_start:block_end]

        # 1. Replace value of "personal"
        personal_rx = re.compile(
            r'(["\']personal["\']\s*:\s*)("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')',
        )
        new_block, n_personal = personal_rx.subn(
            lambda mm: f'{mm.group(1)}"{translation}"',
            block,
            count=1,
        )

        # 2. Add "personalSettings" if missing
        alias_already = re.search(
            r'["\']personalSettings["\']\s*:', new_block,
        )
        if not alias_already:
            # Insert right after the personal line (or at start of block if
            # personal not found, but then we couldn't replace it either)
            insert_rx = re.compile(
                r'(["\']personal["\']\s*:\s*"[^"]*"\s*,?\s*\n)',
            )
            mm = insert_rx.search(new_block)
            if mm:
                # Detect indent of the line containing "personal"
                line_start = new_block.rfind("\n", 0, mm.start()) + 1
                indent_match = re.match(r"\s*", new_block[line_start:mm.start()])
                indent = indent_match.group(0) if indent_match else "    "
                insertion = f'{indent}"personalSettings": "{translation}",\n'
                new_block = new_block[:mm.end()] + insertion + new_block[mm.end():]
                edits_alias += 1
            else:
                # No personal key in this block — skip
                pass
        edits_personal += n_personal

        text = text[:block_start] + new_block + text[block_end:]

    if text == original:
        print("No changes made.")
        return

    path.write_text(text, encoding="utf-8")
    print(f"✔ Updated 'personal' values: {edits_personal}")
    print(f"✔ Added 'personalSettings' aliases: {edits_alias}")
    print(f"✔ Wrote {path}")


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 translate_personal_settings.py <translations.js>")
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)
    edit_file(path)


if __name__ == "__main__":
    main()
