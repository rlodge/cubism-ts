import { VERSION } from '.';

import test from 'ava';

test('version exists', (t) => {
  t.truthy(VERSION.version);
});
