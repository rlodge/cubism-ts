import { json } from 'd3-fetch';
import { Context } from './context';
import { Metric, MetricRequestCallback } from './metric';
import { oneSecondInMillis } from './shared-constants';

export interface GangliaWebConfig {
  host?: string;
  uriPathPrefix?: string;
}

export interface GangliaWebMetricInfo {
  clusterName: string;
  metricName: string;
  hostName: string;
  onChangeCallback?: (...args: any[]) => void;
  isReport?: boolean;
  titleGenerator?: (mi: GangliaWebMetricInfo) => string;
}

interface Graplot {
  name: string;
  data: number[];
}

export class GangliaWeb {

  private readonly host: string;
  private readonly uriPathPrefix: string;

  constructor(private context: Context, config: GangliaWebConfig) {
    this.host = config.host || '';
    this.uriPathPrefix = config.uriPathPrefix || '/ganglia2/';

    /* Add leading and trailing slashes, as appropriate. */
    if (this.uriPathPrefix[0] !== '/') {
      this.uriPathPrefix = `/${this.uriPathPrefix}`;
    }

    if (this.uriPathPrefix[this.uriPathPrefix.length - 1] !== '/') {
      this.uriPathPrefix += '/';
    }
  }

  toString(): string {
    return `${this.host}${this.uriPathPrefix}`;
  }

  metric(metricInfo: GangliaWebMetricInfo): Metric {
    const isReport = !!metricInfo.isReport;
    /* Reasonable (not necessarily pretty) default for titleGenerator. */
    const defaultTitleGenerator = (mi: GangliaWebMetricInfo) =>
      `clusterName:${mi.clusterName} metricName:${mi.metricName} hostName:${mi.hostName}`;
    const titleGenerator = metricInfo.titleGenerator || defaultTitleGenerator;

    /* Default to plain, simple metrics. */
    const metricKeyName = isReport ? 'g' : 'm';

    const metricFn = (
      start: Date,
      stop: Date,
      step: number,
      callback: MetricRequestCallback
    ) => {
      const constructGangliaWebRequestQueryParams = () =>
        `c=${metricInfo.clusterName}&${metricKeyName}=${metricInfo.metricName}&h=${metricInfo.hostName}&cs=${+start / oneSecondInMillis}&ce=${+stop / oneSecondInMillis}&step=${step / oneSecondInMillis}&graphlot=1`;

      json<Graplot[]>(
        `${this.host +
        this.uriPathPrefix}graph.php?${constructGangliaWebRequestQueryParams()}`
      )
        .then((result) => {
          if (result === undefined) {
            return callback(new Error('Unable to fetch GangliaWeb data'));
          }

          callback(null, result[0].data);
        })
        .catch((e) =>
          callback(new Error(`Unable to fetch GangliaWeb data: Error ${e}`))
        );
    };
    const name = titleGenerator(metricInfo);

    const gangliaWebMetric = this.context.metric(metricFn, name);

    gangliaWebMetric.toString = () => titleGenerator(metricInfo);

    /* Allow users to run their custom code each time a gangliaWebMetric changes.
     *
     * TODO Consider abstracting away the naked Cubism call, and instead exposing
     * a callback that takes in the values array (maybe alongwith the original
     * start and stop 'naked' parameters), since it's handy to have the entire
     * dataset at your disposal (and users will likely implement onChangeCallback
     * primarily to get at this dataset).
     */
    if (metricInfo.onChangeCallback) {
      gangliaWebMetric.on('change', metricInfo.onChangeCallback);
    }

    return gangliaWebMetric;
  }
}
