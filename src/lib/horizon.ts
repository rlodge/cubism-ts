import {ScaleLinear, scaleLinear} from 'd3-scale';
import {
  BaseType,
  ContainerElement,
  mouse,
  select,
  Selection
} from 'd3-selection';
import {format} from 'd3-format';
import {interpolateRound} from 'd3-interpolate';
import {Context, ContextId} from './context';
import {Metric} from './metric';
import {
  ColorFinder,
  Extent,
  Formatter,
  MetricFinder,
  TitleGenerator,
} from './shared-types';

export enum HorizonMode {
  Offset = 'offset',
}

interface HorizonDatum {
  id: ContextId;
  metric: Metric;
  changeId: string;
  focusId: string;
  mouseMoveId: string;
  mouseOutId: string;
}

export class Horizon {

  private get _width(): number {
    return this.context.size();
  }

  private get _height(): number {
    return this._buffer.height;
  }
  private _mode: HorizonMode = HorizonMode.Offset;
  private _buffer: HTMLCanvasElement;
  private _scale: ScaleLinear<number, number> = scaleLinear().interpolate(
    interpolateRound
  );
  private _extent: Extent = null;
  private _format: Formatter = format('.2s');
  private _colors: ColorFinder = [
    '#08519c',
    '#3182bd',
    '#6baed6',
    '#bdd7e7',
    '#bae4b3',
    '#74c476',
    '#31a354',
    '#006d2c',
  ];
  //private readonly changeId: string;
  //private readonly focusId: string;
  //private readonly mouseMoveId: string;
  //private readonly mouseOutId: string;

  constructor(private context: Context) {
    this._buffer = document.createElement('canvas');
    this._buffer.width = context.size();
    this._buffer.height = 30;
    //const id = context.generateId();
    //this.changeId = `change.comparison-${id}`;
    //this.focusId = `focus.comparison-${id}`;
    //this.mouseMoveId = `mousemove.comparison-${id}`;
    //this.mouseOutId = `mouseout.comparison-${id}`;
  }

  render<
    GElement extends ContainerElement,
    Datum,
    PElement extends BaseType,
    PDatum
  >(selection: Selection<GElement, Datum, PElement, PDatum>): void {
    selection.append('div').attr('a', 'b');
    const context = this.context;
    const horizon = this;

    selection
      .append('canvas')
      .attr('width', this._width)
      .attr('height', this._height);

    selection.append('span').attr('class', 'title').text(this._title);

    selection.append('span').attr('class', 'value');

    selection.each(function (d, i) {

      const id = context.generateId();

      const metric_ =
        horizon._metric instanceof Metric
          ? horizon._metric
          : horizon._metric.call(this, d, i);
      const colors_ = Array.isArray(horizon._colors)
        ? horizon._colors
        : horizon._colors.call(this, d, i);
      const extent_ =
        typeof horizon._extent === 'function'
          ? horizon._extent.call(this, d, i)
          : horizon._extent;
      const step = context.step();
      const canvas = select(this).select<HTMLCanvasElement>('canvas');
      const span = select(this).select('.value');
      const m = colors_.length >> 1;

      const horizonDatum: HorizonDatum = {
        id,
        metric: metric_,
        changeId: `change.horizon-${id}`,
        focusId: `focus.horizon-${id}`,
        mouseMoveId: `mousemove.horizon-${id}`,
        mouseOutId: `mouseout.horizon-${id}`,
      }

      select(this)
        .on(horizonDatum.mouseMoveId, function () {
          context.focus(Math.round(mouse(this)[0]));
        })
        .on(horizonDatum.mouseOutId, () => context.focus(null));

      let start = -Infinity;
      let max_: number;
      let ready = false;

      canvas.datum<HorizonDatum>(horizonDatum);

      const canvasNode = canvas.node();
      if (canvasNode) {
        const maybeCanvasContext = canvasNode.getContext('2d');
        if (maybeCanvasContext) {

          const canvasContext = maybeCanvasContext;

          const change = function(start1In: Date | number) {
            const start1 = +start1In;
            canvasContext.save();

            // compute the new extent and ready flag
            let extent = metric_.extent();
            ready = extent.every(isFinite);
            if (extent_ != null) extent = extent_;

            // if this is an update (with no extent change), copy old values!
            let i0 = 0;
            const max = Math.max(-extent[0], extent[1]);
            if (this === context) {
              if (max === max_) {
                i0 = horizon._width - 6;
                const dx = (start1 - start) / step;
                if (dx < horizon._width) {
                  const canvas0 = horizon._buffer.getContext('2d');
                  if (canvas0) {
                    canvas0.clearRect(0, 0, horizon._width, horizon._height);
                    canvas0.drawImage(
                      canvasContext.canvas,
                      dx,
                      0,
                      horizon._width - dx,
                      horizon._height,
                      0,
                      0,
                      horizon._width - dx,
                      horizon._height
                    );
                    canvasContext.clearRect(0, 0, horizon._width, horizon._height);
                    canvasContext.drawImage(canvas0.canvas, 0, 0);
                  }
                }
              }
              start = start1;
            }

            // update the domain
            horizon._scale.domain([0, (max_ = max)]);

            // clear for the new data
            canvasContext.clearRect(i0, 0, horizon._width - i0, horizon._height);

            // record whether there are negative values to display
            let negative;

            // positive bands
            for (let j = 0; j < m; ++j) {
              canvasContext.fillStyle = colors_[m + j];

              // Adjust the range based on the current band index.
              let y0: number | undefined = (j - m + 1) * horizon._height;
              horizon._scale.range([m * horizon._height + y0, y0]);
              y0 = horizon._scale(0);

              for (let i = i0, n = horizon._width, y1; i < n; ++i) {
                y1 = metric_.valueAt(i);
                if (y1 <= 0) {
                  negative = true;
                  continue;
                }
                if (y1 !== undefined) {
                  y1 = horizon._scale(y1);
                  if (y1 !== undefined && y0 !== undefined) {
                    canvasContext.fillRect(i, y1, 1, y0 - y1);
                  }
                }
              }
            }

            if (negative) {
              // enable offset mode
              if (horizon._mode === 'offset') {
                canvasContext.translate(0, horizon._height);
                canvasContext.scale(1, -1);
              }

              // negative bands
              for (let j = 0; j < m; ++j) {
                canvasContext.fillStyle = colors_[m - 1 - j];

                // Adjust the range based on the current band index.
                let y0: number | undefined = (j - m + 1) * horizon._height;
                horizon._scale.range([m * horizon._height + y0, y0]);
                y0 = horizon._scale(0);

                for (let i = i0, n = horizon._width, y1; i < n; ++i) {
                  y1 = metric_.valueAt(i);
                  if (y1 >= 0) {
                    continue;
                  }
                  const r1 = horizon._scale(-y1);
                  const r2 = horizon._scale(-y1);
                  if (
                    r1 !== undefined &&
                    r2 !== undefined &&
                    y0 !== undefined
                  ) {
                    canvasContext.fillRect(i, r1, 1, y0 - r2);
                  }
                }
              }
            }

            canvasContext.restore();
          }

          const focus = (i: number | null) => {
            if (i == null) {
              i = horizon._width - 1;
            }
            const value = metric_.valueAt(i);
            if (isNaN(value)) {
              span.datum(value).text(null);
            } else {
              span.datum(value).text(horizon._format);
            }
          };

          // Update the chart when the context changes.
          context.on(horizonDatum.changeId, change);
          context.on(horizonDatum.focusId, focus);

          // Display the first metric change immediately,
          // but defer subsequent updates to the canvas change.
          // Note that someone still needs to listen to the metric,
          // so that it continues to update automatically.
          metric_.on(horizonDatum.changeId, function (start) {
            change(start);
            focus(null);
            if (ready) {
              metric_.on(horizonDatum.changeId, (d) => d);
            }
          });
        }
      }
    });
  }

  remove<
    GElement extends BaseType,
    Datum,
    PElement extends BaseType,
    PDatum
  >(selection: Selection<GElement, Datum, PElement, PDatum>): void {
    const context = this.context;

    selection.selectAll<GElement, HorizonDatum>('canvas')
      .each(function (d) {
        d.metric.on(d.changeId);
        context.on(d.changeId).on(d.focusId);
        select(this)
          .on(d.mouseMoveId, null)
          .on(d.mouseOutId, null)
      })
      .remove();

    selection.selectAll('.title,.value').remove();
  }

  mode(): HorizonMode;
  mode(mode: HorizonMode): Horizon;
  mode(maybeMode?: HorizonMode): HorizonMode | Horizon {
    if (!maybeMode) {
      return this._mode;
    }
    this._mode = maybeMode;

    return this;
  }

  height(): number;
  height(height: number): Horizon;
  height(maybeHeight?: number): number | Horizon {
    if (!maybeHeight) {
      return this._height;
    }
    this._buffer.height = maybeHeight;

    return this;
  }

  metric(): MetricFinder;
  metric(metric: MetricFinder): Horizon;
  metric(maybeMetric?: MetricFinder): MetricFinder | Horizon {
    if (!maybeMetric) {
      return this._metric;
    }
    this._metric = maybeMetric;

    return this;
  }

  scale(): ScaleLinear<number, number>;
  scale(scale: ScaleLinear<number, number>): Horizon;
  scale(
    maybeScale?: ScaleLinear<number, number>
  ): ScaleLinear<number, number> | Horizon {
    if (!maybeScale) {
      return this._scale;
    }
    this._scale = maybeScale;

    return this;
  }

  extent(): Extent;
  extent(extent: Extent): Horizon;
  extent(maybeExtent?: Extent): Extent | Horizon {
    if (maybeExtent === undefined) {
      return this._extent;
    }
    this._extent = maybeExtent;

    return this;
  }

  title(): TitleGenerator;
  title(title: TitleGenerator): Horizon;
  title(maybeTitle?: TitleGenerator): TitleGenerator | Horizon {
    if (!maybeTitle) {
      return this._title;
    }
    this._title = maybeTitle;

    return this;
  }

  format(): Formatter;
  format(format: Formatter): Horizon;
  format(maybeFormat?: Formatter): Formatter | Horizon {
    if (!maybeFormat) {
      return this._format;
    }
    this._format = maybeFormat;

    return this;
  }

  colors(): ColorFinder;
  colors(colors: ColorFinder): Horizon;
  colors(maybeColors?: ColorFinder): ColorFinder | Horizon {
    if (!maybeColors) {
      return this._colors;
    }
    this._colors = maybeColors;

    return this;
  }
  private _metric: MetricFinder = (d) => d;
  private _title: TitleGenerator = (d) => d;
}
