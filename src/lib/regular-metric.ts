import { CompositeMetric } from './composite-metric';
import { Metric, MetricRequestCallback } from './metric';

export class RegularMetric extends Metric {
  shift(offset: number): Metric {
    return new RegularMetric(
      this.context,
      (
        start: Date,
        stop: Date,
        step: number,
        callback: MetricRequestCallback
      ): void => {
        this.request(
          new Date(+start + offset),
          new Date(+stop + offset),
          step,
          callback
        );
      },
      this.name
    );
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
