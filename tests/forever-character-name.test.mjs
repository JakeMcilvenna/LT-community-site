import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidForeverCharacterName } from '../lib/recruitment-validation.ts';

test('Forever names accept two names, accented letters, and length boundaries', () => {
  for (const name of ['Asha Brightvale', 'Björn Ashvale', 'Élodie Brûme', 'Jo Li', 'Abcdefghijkl Mnopqrstuvwx', 'Aaron Fletcher', 'asha brightvale']) {
    assert.equal(isValidForeverCharacterName(name), true, name);
  }
});

test('Forever names reject missing parts, extra words, and invalid separators', () => {
  for (const name of ['', 'Asha', 'Asha Bright Vale', 'Asha  Brightvale', ' Asha Brightvale', 'Asha Brightvale ', 'Asha\tBrightvale', 'Asha\nBrightvale', 'Asha\u00a0Brightvale', 'Asha Brightvale\n']) {
    assert.equal(isValidForeverCharacterName(name), false, JSON.stringify(name));
  }
});

test('Forever names reject digits, punctuation, and parts outside 2–12 letters', () => {
  for (const name of ['Asha2 Brightvale', 'Asha Brightvale2', "O'Malley Stone", 'Asha Bright-vale', 'Asha Brightvale.', 'A Brightvale', 'Asha B', 'Abcdefghijklm Vale', 'Asha Abcdefghijklm']) {
    assert.equal(isValidForeverCharacterName(name), false, name);
  }
});

test('Forever names reject triple repeated letters regardless of case', () => {
  for (const name of ['Aaaron Fletcher', 'AaAron Fletcher', 'Aaron Fleeecher', 'ÁáÁron Fletcher']) {
    assert.equal(isValidForeverCharacterName(name), false, name);
  }
});
