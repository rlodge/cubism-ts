import { Axis as D3Axis, axisBottom, axisTop } from 'd3-axis';
import { BaseType, select, Selection } from 'd3-selection';
import { timeFormat } from 'd3-time-format';
import { Context, ContextId } from './context';
import { oneDayInMillis, oneMinuteInMillis } from './shared-constants';

const formatSeconds = timeFormat('%I:%M:%S %p');
const formatMinutes = timeFormat('%I:%M %p');
const formatDays = timeFormat('%B %d');

export type FormatterFn = (date: Date) => string;

export enum AxisOrientation {
  Top = 'top',
  Bottom = 'bottom',
}

export class Axis {
  private static readonly axisDefaultHeight = 28;
  private static readonly axisDefaultOffset = 4;
  private static readonly axisTopOffset = 27;
  private static readonly axisTextMargin = 6;

  private _axis: D3Axis<Date>;
  private _format: FormatterFn;
  private _id: ContextId;
  private _translateY = Axis.axisDefaultOffset;
  private _changeEvent?: string;
  private _focusEvent?: string;

  constructor(private context: Context) {
    this._axis = axisBottom<Date>(this.context.scale());
    this._format = this.formatDefault();
    this._id = context.generateId();
  }

  remove(selection: Selection<Element, any, Element, any>): void {
    selection
      .selectAll('svg')
      .each(() => {
        if (this._changeEvent) {
          this.context.on(this._changeEvent);
        }
        if (this._focusEvent) {
          this.context.on(this._focusEvent);
        }
      })
      .remove();
  }

  focusFormat(): FormatterFn;
  focusFormat(fn: FormatterFn): Axis;
  focusFormat(fn?: FormatterFn): FormatterFn | Axis {
    if (fn === undefined) {
      return this._format;
    }
    this._format = fn;

    return this;
  }

  render<GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(
    selection: Selection<GElement, Datum, PElement, PDatum>
  ): void {
    let tick: Selection<Element, unknown, null, undefined> | null = null;

    const g = selection
      .append('svg')
      .datum({ id: this._id })
      .attr('width', this.context.size())
      .attr('height', Math.max(Axis.axisDefaultHeight, -this._axis.tickSize()))
      .append('g')
      .attr('transform', `translate(0,${this._translateY})`)
      .call(this._axis);

    this._changeEvent = `change.axis-${this._id}`;
    this.context.on(this._changeEvent, () => {
      g.call(this._axis);
      if (!tick) {
        const n = g.node();
        if (n) {
          const t = g.selectAll<SVGElement, any>('text').node();
          if (t) {
            tick = select(n.appendChild(t.cloneNode(true)) as Element)
              .style('display', 'none')
              .text(null);
          }
        }
      }
    });

    this._focusEvent = `focus.axis-${this._id}`;
    this.context.on(this._focusEvent, (i?: number | null) => {
      if (tick) {
        if (i == null) {
          tick.style('display', 'none');
          g.selectAll('text').style('fill-opacity', null);
        } else {
          tick
            .style('display', null)
            .attr('x', i)
            .text(this._format(this.context.scale().invert(i)));
          const node = tick.node() as SVGTextContentElement;
          if (node) {
            const dx = node.getComputedTextLength() + Axis.axisTextMargin;
            g.selectAll('text').style('fill-opacity', (d: any) => {
              if (typeof d === 'number' || d instanceof Date) {
                const n = this.context.scale()(+d);
                if (n === undefined) {
                  return 1;
                }

                return Math.abs(n - i) < dx ? 0 : 1;
              }

              return 1;
            });
          }
        }
      }
    });
  }

  ticks(...args: any[]): Axis {
    this._axis.ticks(args);

    return this;
  }

  orient(orient: AxisOrientation): Axis {
    switch (orient) {
      case AxisOrientation.Top:
        this._axis = axisTop<Date>(this.context.scale());
        this._translateY = Axis.axisTopOffset;
        break;
      case AxisOrientation.Bottom:
        this._axis = axisBottom<Date>(this.context.scale());
        this._translateY = Axis.axisDefaultOffset;
        break;
      default:
        console.warn('orient shall be one of bottom|top|left|right');
        break;
    }

    return this;
  }

  private formatDefault(): FormatterFn {
    return this.context.step() < oneMinuteInMillis
      ? formatSeconds
      : this.context.step() < oneDayInMillis
      ? formatMinutes
      : formatDays;
  }
}
