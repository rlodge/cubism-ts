import { dispatch } from 'd3-dispatch';
import { Context } from './context';

export type MetricRequestCallback = (
    error: any | null,
    values?: number[]
) => void;
export type MetricRequest = (
    start: Date,
    stop: Date,
    step: number,
    callback: MetricRequestCallback
) => void;

export abstract class Metric {
    protected readonly _id: string;
    protected _start?: Date;
    protected _stop?: Date;
    protected _values: number[] = [];
    protected _event = dispatch('change');
    protected _listening = 0;
    protected _fetching = false;
    protected readonly _prepareId: string;
    protected readonly _beforeChangeId: string;
    protected _steps: number | null = null;

    constructor(
        protected readonly context: Context,
        protected request: MetricRequest,
        protected name: string
    ) {
        this._id = `.metric-${this.context.generateId()}`;
        this._prepareId = `prepare${this._id}`;
        this._beforeChangeId = `beforechange${this._id}`;
    }

    alias(name: string): Metric {
        this.name = name;

        return this;
    }

    abstract shift(offset: number): Metric;

    on(
        type: string,
        listener: null
    ): (...args: any[]) => void | undefined;
    on(type: string): Metric;
    on(type: string, listener: (...args: any[]) => void): Metric;
    on(
        type: string,
        listener?: ((...args: any[]) => void) | null
    ): Metric | ((...args: any[]) => void) | undefined {
        if (listener === null) {
            return this._event.on(type);
        }

        // If there are no listeners, then stop listening to the context,
        // and avoid unnecessary fetches.
        if (listener == null) {
            if (this._event.on(type) != null && --this._listening === 0) {
                this.context.on(this._prepareId).on(this._beforeChangeId);
            }
            this._event.on(type, null);
        } else {
            if (this._event.on(type) == null && ++this._listening === 1) {
                this.context
                    .on(
                        this._prepareId,
                        (start1In: number | Date, stopIn: number | Date) => {
                            this.prepare(start1In, stopIn);
                        }
                    )
                    .on(
                        this._beforeChangeId,
                        (start1In: number | Date, stop1In: number | Date) => {
                            const start1: Date =
                                start1In instanceof Date
                                    ? start1In
                                    : new Date(start1In);
                            const stop1: Date =
                                stop1In instanceof Date
                                    ? stop1In
                                    : new Date(stop1In);
                            if (!this._start) {
                                this._start = start1;
                            }
                            this._values.splice(
                                0,
                                Math.max(
                                    0,
                                    Math.min(
                                        this._size,
                                        Math.round(
                                            (+start1 - +this._start) /
                                                this._step
                                        )
                                    )
                                )
                            );
                            this._start = start1;
                            this._stop = stop1;
                        }
                    );
            }
            this._event.on(type, listener);
        }

        // Notify the listener of the current start and stop time, as appropriate.
        // This way, charts can display synchronous metrics immediately.
        if (listener != null) {
            if (/^change(\.|$)/.test(type)) listener(this._start, this._stop);
        }

        return this;
    }

    prepare(start1In: number | Date, stopIn: number | Date): void {
        const start1: Date =
            start1In instanceof Date ? start1In : new Date(start1In);
        const stop: Date = stopIn instanceof Date ? stopIn : new Date(stopIn);
        const steps = Math.min(
            this._size,
            Math.round(
                (+start1 - (this._start ? +this._start : -Infinity)) /
                    this._step
            )
        );
        if (!steps || this._fetching) return; // already fetched, or fetching!
        this._fetching = true;
        this._steps = Math.min(this._size, steps + 6);
        const start0 = new Date(+stop - this._steps * this._step);
        this.request(start0, stop, this._step, (error: any, data) => {
            this._fetching = false;
            if (error) {
                return console.warn(error);
            }
            if (!data) {
                return console.warn('No data');
            }
            const i = this._start
                ? Math.round((+start0 - +this._start) / this._step)
                : 0;
            for (let j = 0, m = data.length; j < m; ++j) {
                this._values[j + i] = data[j];
            }
            this._event.call('change', this._start, stop);
        });
    }

    protected get _size(): number {
        return this.context.size();
    }

    protected get _step(): number {
        return this.context.step();
    }

    valueAt(i: number): number {
        return this._values[i];
    }

    extent(): number[] {
        let i = 0,
            value,
            min = Infinity,
            max = -Infinity;
        while (++i < this._size) {
            value = this._values[i];
            if (value < min) min = value;
            if (value > max) max = value;
        }

        return [min, max];
    }

    toString(): string {
        return this.name;
    }

    abstract add(other: Metric): Metric;

    abstract subtract(other: Metric): Metric;

    abstract multiply(other: Metric): Metric;

    abstract divide(other: Metric): Metric;
}
