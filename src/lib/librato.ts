/* librato (http://dev.librato.com/v1/post/metrics) source
 * If you want to see an example of how to use this source, check: https://gist.github.com/drio/5792680
 */
import { json } from 'd3-fetch';
import { Context } from './context';
import { VERSION } from './version';
import { Metric, MetricRequestCallback } from './metric';

interface LibratoMetricSeries {
  measure_time: number;
  value: number;
}

interface LibratoMetric {
  series: LibratoMetricSeries[];
}

interface LibratoQuery {
  next_time: number;
}

interface LibratoMetrics {
  measurements: LibratoMetric[];
  query?: LibratoQuery;
}

export class Librato {
  private static makeUrl(
    sdate: number,
    edate: number,
    step: number,
    composite: string
  ) {
    const url_prefix = 'https://metrics-api.librato.com/v1/metrics';
    const params =
      'compose=' +
      composite +
      '&start_time=' +
      sdate +
      '&end_time=' +
      edate +
      '&resolution=' +
      Librato.findLibratoResolution(sdate, edate, step);

    return url_prefix + '?' + params;
  }

  private static findLibratoResolution(
    sdate: number,
    edate: number,
    step: number
  ) {
    const i_size = edate - sdate, // interval size
      month = 2419200,
      week = 604800,
      two_days = 172800;

    if (i_size > month) {
      return 3600;
    }

    const ideal_res = Librato.findIdealLibratoRFesolution(step);

    /*
     * Now we have the ideal resolution, but due to the retention policies at librato, maybe we have
     * to use a higher resolution.
     * http://support.metrics.librato.com/knowledgebase/articles/66838-understanding-metrics-roll-ups-retention-and-grap
     */
    if (i_size > week && ideal_res < 900) {
      return 900;
    } else if (i_size > two_days && ideal_res < 60) {
      return 60;
    } else {
      return ideal_res;
    }
  }

  /* Given a step, find the best librato resolution to use.
   *
   * Example:
   *
   * (s) : cubism step
   *
   * avail_rsts   1 --------------- 60 --------------- 900 ---------------- 3600
   *                                |    (s)            |
   *                                |                   |
   *                              [low_res             top_res]
   *
   * return: low_res (60)
   */
  private static findIdealLibratoRFesolution(step: number): number {
    const avail_rsts = [1, 60, 900, 3600];
    const highest_res: number = avail_rsts[0];
    const lowest_res: number = avail_rsts[avail_rsts.length - 1]; // high and lowest available resolution from librato

    /* If step is outside the highest or lowest librato resolution, pick them and we are done */
    if (step >= lowest_res) {
      return lowest_res;
    }

    if (step <= highest_res) {
      return highest_res;
    }

    /* If not, find in what resolution interval the step lands. */
    let iof: number;
    let top_res: number = highest_res;
    let i: number;
    for (i = step; i <= lowest_res; i++) {
      iof = avail_rsts.indexOf(i);
      if (iof > -1) {
        top_res = avail_rsts[iof];
        break;
      }
    }

    let low_res: number = lowest_res;
    for (i = step; i >= highest_res; i--) {
      iof = avail_rsts.indexOf(i);
      if (iof > -1) {
        low_res = avail_rsts[iof];
        break;
      }
    }

    /* What's the closest librato resolution given the step ? */
    return top_res - step < step - low_res ? top_res : low_res;
  }

  /*
   * We are most likely not going to get the same number of measurements
   * cubism expects for a particular context: We have to perform down/up
   * sampling
   */
  private static downUpSampling(
    isdate: number,
    iedate: number,
    step: number,
    librato_mm: LibratoMetricSeries[]
  ): number[] {
    const av: number[] = [];

    for (let i = isdate; i <= iedate; i += step) {
      const int_mes = [];
      while (librato_mm.length && librato_mm[0].measure_time <= i) {
        const a = librato_mm.shift();
        if (a) {
          int_mes.push(a.value);
        }
      }

      let v;
      if (int_mes.length) {
        /* Compute the average */
        v =
          int_mes.reduce(function (a, b) {
            return a + b;
          }) / int_mes.length;
      } else {
        /* No librato values on interval */
        v = av.length ? av[av.length - 1] : 0;
      }
      av.push(v);
    }

    return av;
  }

  constructor(
    private context: Context,
    private user: string,
    private token: string
  ) {}

  toString(): string {
    return 'librato';
  }

  metric(composite: string): Metric {
    return this.context.metric((start, stop, step, callback) => {
      this.fire(
        composite,
        this.dateFormatter(+start),
        this.dateFormatter(+stop),
        this.dateFormatter(step),
        (a_values) => callback(null, a_values)
      );
    }, composite);
  }
  private dateFormatter = (time: number) => Math.floor(time / 1000);

  private fire(
    composite: string,
    isdate: number,
    iedate: number,
    step: number,
    callback_done: MetricRequestCallback
  ) {
    const a_values: LibratoMetricSeries[] = []; /* Store partial values from librato */
    const full_url = Librato.makeUrl(isdate, iedate, step, composite);
    const auth_string = 'Basic ' + btoa(this.user + ':' + this.token);

    /*
     * Librato has a limit in the number of measurements we get back in a request (100).
     * We recursively perform requests to the API to ensure we have all the data points
     * for the interval we are working on.
     */
    json<LibratoMetrics>(full_url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: auth_string,
        'Librato-User-Agent': 'cubism/' + VERSION.version,
      },
    })
      .then((data) => {
        if (!data || data.measurements.length === 0) {
          return;
        }
        data.measurements[0].series.forEach(function (o) {
          a_values.push(o);
        });

        if (data.query && data.query.next_time) {
          this.fire(
            composite,
            data.query.next_time,
            iedate,
            step,
            callback_done
          );
        } else {
          const a_adjusted = Librato.downUpSampling(
            isdate,
            iedate,
            step,
            a_values
          );
          callback_done(a_adjusted);
        }
      })
      .catch((error) => console.error(error));
  }
}
