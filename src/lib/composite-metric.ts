import { Context } from './context';
import { Metric } from './metric';

export class CompositeMetric extends Metric {
  constructor(
    context: Context,
    private left: Metric,
    private right: Metric,
    private operatorSymbol: string,
    private operator: (a: number, b: number) => number
  ) {
    super(context, (): void => {}, `${left} ${operatorSymbol} ${right}`);
  }

  shift(offset: number): Metric {
    return new CompositeMetric(
      this.context,
      this.left.shift(offset),
      this.right.shift(offset),
      this.operatorSymbol,
      this.operator
    );
  }

  on(type: string, listener: null): (...args: any[]) => void | undefined;
  on(type: string): Metric;
  on(type: string, listener: (...args: any[]) => void): Metric;
  on(
    type: string,
    listener?: ((...args: any[]) => void) | null
  ): Metric | ((...args: any[]) => void) | undefined {
    if (listener === null) {
      return this.left.on(type, null);
    }
    if (listener == null) {
      this.left.on(type);
      this.right.on(type);
    } else {
      this.left.on(type, listener);
      this.right.on(type, listener);
    }

    return this;
  }

  prepare(start1In: number | Date, stopIn: number | Date) {
    this.left.prepare(start1In, stopIn);
    this.right.prepare(start1In, stopIn);
  }

  valueAt(i: number): number {
    return this.operator(this.left.valueAt(i), this.right.valueAt(i));
  }

  extent(): number[] {
    return this.left.extent();
  }

  add(other: Metric): Metric {
    return new CompositeMetric(this.context, this, other, '+', (a, b) => a + b);
  }

  subtract(other: Metric): Metric {
    return new CompositeMetric(this.context, this, other, '-', (a, b) => a - b);
  }

  multiply(other: Metric): Metric {
    return new CompositeMetric(this.context, this, other, '*', (a, b) => a * b);
  }

  divide(other: Metric): Metric {
    return new CompositeMetric(this.context, this, other, '/', (a, b) => a / b);
  }
}
