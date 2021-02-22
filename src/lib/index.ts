import { Context } from './context';

export * from './version';
export * from './axis';
export * from './comparison';
export * from './regular-metric';
export * from './composite-metric';
export * from './context';
export * from './cube';
export * from './ganglia-web';
export * from './graphite';
export * from './horizon';
export * from './key-down';
export * from './librato';
export * from './metric';
export * from './option';
export * from './rule';
export * from './shared-types';

export function context(): Context {
  return new Context();
}

export const cubism = {
  context(): Context {
    return new Context();
  },
};
