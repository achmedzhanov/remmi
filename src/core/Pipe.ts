import {BaseLens, Lens, noop, normalizeUpdater, Updater, Producer} from "../internal"

export interface TransformConfig<T, R> {
    description: string
    cacheKey: any
    onNext(newBaseValue: T, currentValue: R | undefined, self: Lens<R>): R
    onUpdate(
        updater: Producer<R>,
        next: (updater: Producer<T>) => void,
        self: Lens<R>
    ): void
    onSuspend(): void
    onResume(): void
}

export class Pipe<T, R> extends BaseLens<R> {
    config: TransformConfig<T, R>

    constructor(private base: Lens<T>, config: Partial<TransformConfig<T, R>>) {
        super()
        const {
            cacheKey = undefined,
            onNext = defaultRecompute,
            onUpdate = defaultUpdate,
            description = "(unknown pipe)",
            onSuspend = noop,
            onResume = noop
        } = config
        this.config = {
            cacheKey,
            onNext,
            onUpdate: onUpdate as any, // Typing error seems TS bug?
            description,
            onSuspend,
            onResume
        }
    }

    recompute(): any {
        return this.config.onNext(this.base.value(), this.state, this)
    }

    update(updater: ((draft: any) => void)) {
        this.config.onUpdate(normalizeUpdater(updater), this.nextUpdate, this)
    }

    nextUpdate = (updater: Updater<T>) => {
        this.base.update(updater)
    }

    getCacheKey() {
        return this.config.cacheKey
    }

    resume() {
        ;(this.base as BaseLens).registerDerivation(this)
        this.config.onResume()
    }

    suspend() {
        ;(this.base as BaseLens).removeDerivation(this)
        this.config.onSuspend()
    }

    describe() {
        return (
            (this.base as BaseLens).describe() +
            "\n\t.do(" +
            this.config.description +
            ")"
        )
    }
}

function defaultRecompute(nextValue: any) {
    return nextValue
}

function defaultUpdate<T = any>(
    updater: Updater<T>,
    next: (updater: Updater<T>) => void
) {
    next(updater) // note: eliminate some function in Pipe.update to make stack friendlier?
}
