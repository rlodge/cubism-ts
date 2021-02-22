import { json } from 'd3-fetch';
import { isoFormat } from 'd3-time-format';
import { Context } from './context';
import { Metric, MetricRequestCallback } from './metric';

interface CubeMetric {
  time: string;
  value: number;
}

export class Cube {
  constructor(private context: Context, private host: string) {}

  toString(): string {
    return `cube:${this.host}`;
  }

  metric(expression: string): Metric {
    return this.context.metric(
      (
        start: Date,
        stop: Date,
        step: number,
        callback: MetricRequestCallback
      ) => {
        json<CubeMetric[]>(
          `${this.host}/1.0/metric?expression=${encodeURIComponent(expression)}&start=${isoFormat(
            start)}&stop=${isoFormat(stop)}&step=${step}`
        ).then(
          (data?: CubeMetric[]) => {
            if (data && data.length > 0) {
              callback(
                null,
                data.map((d) => d.value)
              );
            }
            callback(new Error('unable to load data'));
          },
          (er) => {
            callback(new Error(`unable to load data: ${er}`));
          }
        );
      },
      expression
    );
  }
}
