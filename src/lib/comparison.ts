import {
  BaseType,
  ContainerElement,
  mouse,
  select,
  Selection
} from 'd3-selection';
import {ScaleLinear, scaleLinear} from 'd3-scale';
import {format} from 'd3-format';
import {interpolateRound} from 'd3-interpolate';
import {Context, ContextId} from './context';
import {Metric} from './metric';
import {Extent, Formatter, MetricFinder, TitleGenerator} from './shared-types';

interface ComparisonDatum {
  id: ContextId;
  primary: Metric;
  secondary: Metric;
  changeId: string;
  focusId: string;
  mouseMoveId: string;
  mouseOutId: string;
}

export class Comparison {

  private static readonly expectedNumberOfColors = 4;

  private _height = 120;
  private _scale: ScaleLinear<number, number> = scaleLinear().interpolate(
    interpolateRound
  );
  private _extent: Extent = null;
  private _formatPrimary: Formatter = format('.2s');
  private _formatChange: Formatter = format('+.0%');
  private _colors: string[] = ['#9ecae1', '#225b84', '#a1d99b', '#22723a'];
  private _strokeWidth = 1.5;

  constructor(private context: Context) {
  }

  render<
    GElement extends ContainerElement,
    Datum,
    PElement extends BaseType,
    PDatum
  >(selection: Selection<GElement, Datum, PElement, PDatum>): void {
    const context = this.context;
    const comparison = this;

    selection
      .append('canvas')
      .attr('width', this.width())
      .attr('height', this.height());

    selection.append('span').attr('class', 'title').text(this._title);

    selection.append('span').attr('class', 'value primary');
    selection.append('span').attr('class', 'value change');

    selection.each(function (d, i): void {
      const id = context.generateId();
      const primaryMetric =
        comparison._primary instanceof Metric
          ? comparison._primary
          // tslint:disable-next-line: no-invalid-this
          : comparison._primary.call(this, d, i);
      const secondaryMetric =
        comparison._secondary instanceof Metric
          ? comparison._secondary
          // tslint:disable-next-line: no-invalid-this
          : comparison._secondary.call(this, d, i);
      const metricExtent =
        typeof comparison._extent === 'function'
          // tslint:disable-next-line: no-invalid-this
          ? comparison._extent.call(this, d, i)
          : comparison._extent;
      // tslint:disable-next-line: no-invalid-this
      const div = select(this);
      const canvas = div.select<HTMLCanvasElement>('canvas');
      const spanPrimary = div.select('.value.primary');
      const spanChange = div.select('.value.change');

      let ready = false;

      const comparisonDatum: ComparisonDatum = {
        id,
        primary: primaryMetric,
        secondary: secondaryMetric,
        changeId: `change.comparison-${id}`,
        focusId: `focus.comparison-${id}`,
        mouseMoveId: `mousemove.comparison-${id}`,
        mouseOutId: `mouseout.comparison-${id}`,
      };

      div
        .on(comparisonDatum.mouseMoveId, function () {
          // tslint:disable-next-line: no-invalid-this
          context.focus(Math.round(mouse(this)[0]));
        })
        .on(comparisonDatum.mouseOutId, () => context.focus(null));

      canvas.datum<ComparisonDatum>(comparisonDatum);
      const canvasNode = canvas.node();
      if (canvasNode) {
        const canvasContext = canvasNode.getContext('2d');

        if (canvasContext) {
          const change = (/*start: number*/) => {
            canvasContext.save();
            const comparisonWidth = comparison.width();
            canvasContext.clearRect(
              0,
              0,
              comparisonWidth,
              comparison._height
            );

            // update the scale
            const primaryExtent = primaryMetric.extent();
            const secondaryExtent = secondaryMetric.extent();
            const extent = metricExtent === null ? primaryExtent : metricExtent;
            comparison._scale.domain(extent).range([comparison._height, 0]);
            ready = primaryExtent.concat(secondaryExtent).every(isFinite);

            // consistent overplotting
            const round = Math.floor;

            // positive changes
            const lowPositiveIndex = 2;
            const highNegativeIndex = 0;
            const highPositiveIndex = 3;
            const lowNegativeIndex = 1;

            canvasContext.fillStyle = comparison._colors[lowPositiveIndex];
            for (let pixelIndex = 0; pixelIndex < comparisonWidth; ++pixelIndex) {
              const y0 = comparison._scale(primaryMetric.valueAt(pixelIndex));
              const y1 = comparison._scale(secondaryMetric.valueAt(pixelIndex));
              if (y0 !== undefined && y1 !== undefined && y0 < y1) {
                canvasContext.fillRect(round(pixelIndex), y0, 1, y1 - y0);
              }
            }

            // negative changes
            canvasContext.fillStyle = comparison._colors[highNegativeIndex];
            for (let pixelIndex = 0; pixelIndex < comparisonWidth; ++pixelIndex) {
              const y0 = comparison._scale(primaryMetric.valueAt(pixelIndex));
              const y1 = comparison._scale(secondaryMetric.valueAt(pixelIndex));
              if (y0 !== undefined && y1 !== undefined && y0 > y1) {
                canvasContext.fillRect(round(pixelIndex), y1, 1, y0 - y1);
              }
            }

            // positive values
            canvasContext.fillStyle = comparison._colors[highPositiveIndex];
            for (let pixelIndex = 0; pixelIndex < comparisonWidth; ++pixelIndex) {
              const y0 = comparison._scale(primaryMetric.valueAt(pixelIndex));
              const y1 = comparison._scale(secondaryMetric.valueAt(pixelIndex));
              if (y0 !== undefined && y1 !== undefined && y0 <= y1) {
                canvasContext.fillRect(round(pixelIndex), y0, 1, comparison._strokeWidth);
              }
            }

            // negative values
            canvasContext.fillStyle = comparison._colors[lowNegativeIndex];
            for (let pixelIndex = 0; pixelIndex < comparisonWidth; ++pixelIndex) {
              const y0 = comparison._scale(primaryMetric.valueAt(pixelIndex));
              const y1 = comparison._scale(secondaryMetric.valueAt(pixelIndex));
              if (y0 !== undefined && y1 !== undefined && y0 > y1) {
                canvasContext.fillRect(
                  round(pixelIndex),
                  y0 - comparison._strokeWidth,
                  1,
                  comparison._strokeWidth
                );
              }
            }

            canvasContext.restore();
          };

          const focus = (focusIndex = comparison.width() - 1) => {
            const valuePrimary = primaryMetric.valueAt(focusIndex);
            const valueSecondary = secondaryMetric.valueAt(focusIndex);
            const valueChange = (
              valuePrimary - valueSecondary
            ) / valueSecondary;

            if (isNaN(valuePrimary)) {
              spanPrimary.datum(valuePrimary).text(null);
            } else {
              spanPrimary.datum(valuePrimary).text(comparison._formatPrimary);
            }

            const classes =
              `value change ${valueChange > 0 ? 'positive' : valueChange < 0
                                                             ? 'negative'
                                                             : ''}`;
            if (isNaN(valueChange)) {
              spanChange.datum(valueChange).text(null).attr('class', classes);
            } else {
              spanChange
                .datum(valueChange)
                .text(comparison._formatChange)
                .attr('class', classes);
            }
          };

          const firstChange = (/*start: number*/) => {
            change(/*start*/);
            focus();
            if (ready) {
              primaryMetric.on(comparisonDatum.changeId, () => {/*empty function*/});
              secondaryMetric.on(comparisonDatum.changeId, () => {/*empty function*/});
            }
          };

          // Display the first primary change immediately,
          // but defer subsequent updates to the context change.
          // Note this someone still needs to listen to the metric,
          // so this it continues to update automatically.
          primaryMetric.on(comparisonDatum.changeId, firstChange);
          secondaryMetric.on(comparisonDatum.changeId, firstChange);

          // Update the chart when the context changes.
          context.on(comparisonDatum.changeId, change);
          context.on(comparisonDatum.focusId, focus);
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

    selection.selectAll<GElement, ComparisonDatum>('canvas')
      .each(function (d) {
        d.primary.on(d.changeId);
        d.secondary.on(d.changeId);
        context.on(d.changeId).on(d.focusId);
        select(this)
          .on(d.mouseMoveId, null)
          .on(d.mouseOutId, null)
      })
      .remove();

    selection.selectAll('.title,.value').remove();
  }

  height(): number;
  height(height: number): Comparison;
  height(maybeHeight?: number): number | Comparison {
    if (!maybeHeight) {
      return this._height;
    }
    this._height = maybeHeight;

    return this;
  }

  primary(): MetricFinder | null;
  primary(primary: MetricFinder): Comparison;
  primary(maybePrimary?: MetricFinder): null | MetricFinder | Comparison {
    if (!maybePrimary) {
      return this._primary;
    }
    this._primary = maybePrimary;

    return this;
  }

  secondary(): MetricFinder | null;
  secondary(secondary: MetricFinder): Comparison;
  secondary(maybeSecondary?: MetricFinder): null | MetricFinder | Comparison {
    if (!maybeSecondary) {
      return this._secondary;
    }
    this._secondary = maybeSecondary;

    return this;
  }

  extent(): Extent | null;
  extent(extent: Extent): Comparison;
  extent(maybeExtent?: Extent): null | Extent | Comparison {
    if (!maybeExtent) {
      return this._extent;
    }
    this._extent = maybeExtent;

    return this;
  }

  scale(): ScaleLinear<number, number> | null;
  scale(scale: ScaleLinear<number, number>): Comparison;
  scale(
    maybeScale?: ScaleLinear<number, number>
  ): null | ScaleLinear<number, number> | Comparison {
    if (!maybeScale) {
      return this._scale;
    }
    this._scale = maybeScale;

    return this;
  }

  title(): TitleGenerator | null;
  title(title: TitleGenerator): Comparison;
  title(maybeTitle?: TitleGenerator): null | TitleGenerator | Comparison {
    if (!maybeTitle) {
      return this._title;
    }
    this._title = maybeTitle;

    return this;
  }

  formatPrimary(): Formatter | null;
  formatPrimary(formatPrimary: Formatter): Comparison;
  formatPrimary(maybeFormatPrimary?: Formatter): null | Formatter | Comparison {
    if (!maybeFormatPrimary) {
      return this._formatPrimary;
    }
    this._formatPrimary = maybeFormatPrimary;

    return this;
  }

  formatChange(): Formatter | null;
  formatChange(formatChange: Formatter): Comparison;
  formatChange(maybeFormatChange?: Formatter): null | Formatter | Comparison {
    if (!maybeFormatChange) {
      return this._formatChange;
    }
    this._formatChange = maybeFormatChange;

    return this;
  }

  colors(): string[];
  colors(colors: string[]): Comparison;
  colors(maybeColors?: string[]): string[] | Comparison {
    if (!maybeColors) {
      return this._colors;
    }
    if (maybeColors.length !== Comparison.expectedNumberOfColors) {
      throw new Error(
        'Colors array may only have four colors, no more or less.'
      );
    }
    this._colors = maybeColors;

    return this;
  }

  strokeWidth(): number | null;
  strokeWidth(strokeWidth: number): Comparison;
  strokeWidth(maybeStrokeWidth?: number): null | number | Comparison {
    if (!maybeStrokeWidth) {
      return this._strokeWidth;
    }
    this._strokeWidth = maybeStrokeWidth;

    return this;
  }
  private _primary: MetricFinder = (d: Metric[]) => d[0];
  private _secondary: MetricFinder = (d: Metric[]) => d[1];
  private _title: TitleGenerator = (d: string) => d.toString();

  private width(): number {
    return this.context.size();
  }
}
