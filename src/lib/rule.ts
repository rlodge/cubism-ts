import { BaseType, Selection } from 'd3-selection';
import { Context, ContextId } from './context';
import { Metric } from './metric';

type MetricRetriever = (d: any, i: number) => Metric;

export class Rule {
  private _metric: Metric | MetricRetriever | null = null;
  private id: ContextId;

  constructor(private context: Context) {
    this.id = context.generateId();
  }

  metric(): MetricRetriever | Metric | null;
  metric(f: MetricRetriever | Metric): Rule;
  metric(
    maybeF?: MetricRetriever | Metric
  ): MetricRetriever | Metric | Rule | null {
    if (!maybeF) {
      return this._metric;
    }
    this._metric = maybeF;

    return this;
  }

  render<GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(
    selection: Selection<GElement, Datum, PElement, PDatum>
  ): void {
    const line = selection
      .append('div')
      .datum({ id: this.id })
      .attr('class', 'line')
      .style('position', 'absolute')
      .style('top', 0)
      .style('bottom', 0)
      .style('width', '1px')
      .style('pointer-events', 'none');

    selection.each((d, i) => {
      if (!this._metric) {
        return;
      }
      let metric: Metric;
      if (this._metric instanceof Metric) {
        metric = this._metric;
      } else {
        metric = this._metric(d, i);
      }

      const change = () => {
        const values = [];

        for (let i = 0, n = this.context.size(); i < n; ++i) {
          if (metric.valueAt(i)) {
            values.push(i);
          }
        }

        const lines = selection.selectAll('.metric').data(values);
        lines.exit().remove();
        lines
          .enter()
          .append('div')
          .attr('class', 'metric line')
          .style('position', 'absolute')
          .style('top', 0)
          .style('bottom', 0)
          .style('width', '1px')
          .style('pointer-events', 'none');

        lines.style('left', (i) => i + 'px');
      };

      const changeRuleId = `change.rule-${this.id}`;
      this.context.on(changeRuleId, change);
      metric.on(changeRuleId, change);
    });

    const focusRuleId = `focus.rule-${this.id}`;
    this.context.on(focusRuleId, (i) => {
      if (i == null) {
        line
          // .datum(i)
          .style('display', 'none')
          .style('left', null);
      } else {
        line
          // .datum(i)
          .style('display', null)
          .style('left', `${i}px`);
      }
    });
  }

  remove<GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(
    selection: Selection<GElement, Datum, PElement, PDatum>
  ): void {
    selection
      .selectAll('.line')
      .each(() => this.context.on('focus.rule-' + this.id))
      .remove();
  }
}
