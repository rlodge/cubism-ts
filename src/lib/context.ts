import { dispatch, Dispatch } from 'd3-dispatch';
import { scaleTime, ScaleTime } from 'd3-scale';
import { v4 as uuidv4 } from 'uuid';
import { Axis } from './axis';
import { Comparison } from './comparison';
import { Cube } from './cube';
import { GangliaWeb, GangliaWebConfig } from './ganglia-web';
import { Graphite } from './graphite';
import { Horizon } from './horizon';
import { KeyDown } from './key-down';
import { Librato } from './librato';
import { Metric, MetricRequest } from './metric';
import { RegularMetric } from './regular-metric';
import { Rule } from './rule';

export type ContextId = string;

export class Context {
  private static readonly defaultTimeScale = 1440;
  private static readonly startDelayMs = 10;

  private _step = 1e4; // ten seconds; in milliseconds
  private _size = 1440; // ten seconds; in milliseconds
  private _serverDelay = 5e3;
  private _clientDelay = 5e3;
  private _event: Dispatch<any> = dispatch(
    'prepare',
    'beforechange',
    'change',
    'focus'
  );
  private _start0!: Date;
  private _stop0!: Date; // the start and stop for the previous change event
  private _start1!: Date;
  private _stop1!: Date; // the start and stop for the next prepare event
  private _timeout: number | null = null;
  private _focus: number | null = null;
  private _scale: ScaleTime<number, number> = scaleTime().range([0, Context.defaultTimeScale]);
  private _keyDown: KeyDown | null = null;

  constructor() {
    this.update();
    this._timeout = setTimeout(() => {this.start();}, Context.startDelayMs);
  }

  axis(): Axis {
    return new Axis(this);
  }

  generateId(): ContextId {
    return uuidv4();
  }

  scale(): ScaleTime<number, number> {
    return this._scale;
  }

  start(): Context {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    let delay = +this._stop1 + this._serverDelay - Date.now();

    // If we're too late for the first prepare _event, skip it.
    if (delay < this._clientDelay) {
      delay += this._step;
    }

    const prepare = () => {
      this._stop1 = new Date(
        Math.floor((Date.now() - this._serverDelay) / this._step) * this._step
      );
      this._start1 = new Date(this._stop1.getTime() - this._size * this._step);
      this._event.call('prepare', this, this._start1, this._stop1);

      setTimeout(() => {
        this._start0 = this._start1;
        this._stop0 = this._stop1;
        this._scale.domain([this._start0, this._stop0]);
        this._event.call('beforechange', this, this._start1, this._stop1);
        this._event.call('change', this, this._start1, this._stop1);
        this._event.call('focus', this, this._focus);
      }, this._clientDelay);

      this._timeout = setTimeout(prepare, this._step);
    };

    this._timeout = setTimeout(prepare, delay);

    return this;
  }

  step(): number;
  step(step: number): Context;
  step(maybeStep?: number): number | Context {
    if (maybeStep === undefined) {
      return this._step;
    }
    this._step = maybeStep;

    this.update();
    return this;
  }

  clientDelay(): number;
  clientDelay(clientDelay: number): Context;
  clientDelay(maybeClientDelay?: number): number | Context {
    if (maybeClientDelay === undefined) {
      return this._clientDelay;
    }
    this._clientDelay = maybeClientDelay;

    this.update();
    return this;
  }

  serverDelay(): number;
  serverDelay(serverDelay: number): Context;
  serverDelay(maybeServerDelay?: number): number | Context {
    if (maybeServerDelay === undefined) {
      return this._serverDelay;
    }
    this._serverDelay = maybeServerDelay;

    this.update();
    return this;
  }

  size(): number;
  size(size: number): Context;
  size(maybeSize?: number): number | Context {
    if (maybeSize === undefined) {
      return this._size;
    }
    this._size = maybeSize;
    this._scale.range([0, this._size]);
    this.update();
    return this;
  }

  stop(): Context {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    return this;
  }

  cube(host: string): Cube {
    return new Cube(this, host);
  }

  focus(): number | null;
  focus(i: number | null): Context;
  focus(maybeI?: number | null): number | null | Context {
    if (maybeI === undefined) {
      return this._focus;
    }
    this._focus = maybeI;
    this._event.call('focus', this, this._focus);

    return this;
  }

  on(type: string, listener?: (...args: any[]) => void): Context {
    if (listener === undefined) {
      this._event.on(type, null);

      return this;
    }

    this._event.on(type, listener);

    // Notify the listener of the current start and stop time, as appropriate.
    // This way, metrics can make requests for data immediately,
    // and likewise the axis can display itself synchronously.
    if (/^prepare(\.|$)/.test(type)) listener(this._start1, this._stop1);
    if (/^beforechange(\.|$)/.test(type)) listener(this._start0, this._stop0);
    if (/^change(\.|$)/.test(type)) listener(this._start0, this._stop0);
    if (/^focus(\.|$)/.test(type)) listener(this._focus);

    return this;
  }

  keyDown(): KeyDown {
    if (!this._keyDown) {
      this._keyDown = new KeyDown(this, `keydown.context-${this.generateId()}`);
    }

    return this._keyDown;
  }

  metric(request: MetricRequest, name: string): Metric {
    return new RegularMetric(this, request, name);
  }

  rule(): Rule {
    return new Rule(this);
  }

  gangliaWeb(config: GangliaWebConfig): GangliaWeb {
    return new GangliaWeb(this, config);
  }

  graphite(host: string): Graphite {
    return new Graphite(this, host);
  }

  librato(user: string, token: string): Librato {
    return new Librato(this, user, token);
  }

  comparison(): Comparison {
    return new Comparison(this);
  }

  horizon(): Horizon {
    return new Horizon(this);
  }

  private update(): void {
    const now = Date.now();
    this._stop0 = new Date(
      Math.floor((now - this._serverDelay - this._clientDelay) / this._step) *
        this._step
    );
    this._start0 = new Date(this._stop0.getTime() - this._size * this._step);
    this._stop1 = new Date(
      Math.floor((now - this._serverDelay) / this._step) * this._step
    );
    this._start1 = new Date(this._stop1.getTime() - this._size * this._step);
    this._scale.domain([this._start0, this._stop0]);
  }
}
