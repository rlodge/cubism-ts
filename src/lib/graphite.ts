import { json, text } from 'd3-fetch';
import { Context } from './context';
import { oneSecondInMillis } from './shared-constants';
import { Metric } from './metric';

interface GraphiteMetric {
  path: string;
}

interface GraphiteMetrics {
  metrics: GraphiteMetric[];
}

export class Graphite {
  private static parseGraphite(metricText: string) {
    const i = metricText.indexOf('|');

    return metricText
      .substring(i + 1)
      .split(',')
      .slice(1) // the first value is always None?
      .map((d) => +d);
  }

  constructor(private context: Context, private host: string) {}

  toString(): string {
    return this.host;
  }

  find(pattern: string, callback: (er: any, metrics?: string[]) => void): any {
    json<GraphiteMetrics>(
      `${this.host}/metrics/find?format=completer&query=${encodeURIComponent(
        pattern
      )}`
    )
      .then((result) => {
        if (!result) {
          return callback(new Error('unable to find metrics'));
        }

        return callback(
          null,
          result.metrics.map((d) => {
            return d.path;
          })
        );
      })
      .catch((er) => {
        callback(new Error(`Unable to load graphite metrics ${er}`));
      });
  }

  metric(expression: string): Metric {
    const sum = 'sum';

    return this.context.metric((start, stop, step, callback) => {
      let target = expression;

      // Apply the summarize, if necessary.
      if (step !== oneSecondInMillis) {
        target = `summarize(${target},'${
          !(step % 36e5)
            ? `${step / 36e5}hour`
            : !(step % 6e4)
            ? `${step / 6e4}min`
            : `${step / 1e3}sec`
        }','${sum}')`;
      }

      text(
        `${this.host}/render?format=raw&target=${encodeURIComponent(
          `alias(${target},'')`
        )}&from=${
          this.dateFormatter(+start - 2 * step) // off-by-two?
        }&until=${this.dateFormatter(+stop - 1000)}`
      ).then((text) => {
        if (!text) return callback(new Error('unable to load data'));
        callback(null, Graphite.parseGraphite(text));
      });
    }, (expression += ''));
  }
  private dateFormatter = (time: number) => Math.floor(time / 1000);
}
