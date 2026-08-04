// Translation registry and active-translation state. The NIV84 texts in
// verses.js are the canonical key set; the other translations mirror it
// key-for-key (see translations-data.js).

import { VERSE_TEXT } from './verses.js';
import { ESV_TEXT, KJV_TEXT, NKJV_TEXT } from './translations-data.js';

export const TRANSLATIONS = [
  {
    id: 'niv84',
    short: 'NIV',
    label: 'NIV (1984)',
    texts: VERSE_TEXT,
    notice: 'Scripture taken from the Holy Bible, NEW INTERNATIONAL VERSION®, NIV® © 1973, 1978, 1984 by Biblica, Inc.® Used by permission.',
  },
  {
    id: 'esv',
    short: 'ESV',
    label: 'ESV',
    texts: ESV_TEXT,
    notice: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway. Used by permission. All rights reserved.',
  },
  {
    id: 'kjv',
    short: 'KJV',
    label: 'KJV',
    texts: KJV_TEXT,
    notice: 'Scripture quotations from the King James Version (public domain).',
  },
  {
    id: 'nkjv',
    short: 'NKJV',
    label: 'NKJV',
    texts: NKJV_TEXT,
    notice: 'Scripture taken from the New King James Version®. © 1982 by Thomas Nelson. Used by permission. All rights reserved.',
  },
];

const KEY = 'sparksArcade.translation';

export function getTranslationId() {
  try {
    const id = localStorage.getItem(KEY);
    return TRANSLATIONS.some((t) => t.id === id) ? id : 'niv84';
  } catch {
    return 'niv84';
  }
}

export function setTranslationId(id) {
  if (!TRANSLATIONS.some((t) => t.id === id)) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Private mode — the choice just won't persist.
  }
}

export function activeTranslation() {
  return TRANSLATIONS.find((t) => t.id === getTranslationId()) || TRANSLATIONS[0];
}

export function verseText(ref) {
  return activeTranslation().texts[ref];
}
