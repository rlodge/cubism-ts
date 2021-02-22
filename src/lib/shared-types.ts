import { BaseType, ValueFn } from 'd3-selection';
import { Metric } from './metric';

export type Formatter = (n: number | { valueOf(): number }) => string;
export type MetricFinder = ((d: any, i: number) => Metric) | Metric;
export type ColorFinder = ((d: any, i: number) => string[]) | string[];
export type TitleGenerator = ValueFn<
  BaseType,
  any,
  string | number | boolean | null
>;
export type Extent = number[] | ((d: any, i: number) => number[]) | null;
