import { Lens, Selector, BaseLens, validateUpdater, runUpdater, Builder, updaterNeedsReassignment, fail } from "../internal";

export function select<T, R>(selector: Selector<T, R>): Builder<T, Lens<R>>
export function select<T, K extends keyof T>(selector: K): Builder<T, Lens<T[K]>>
export function select(selector: any): any {
    return function (lens: BaseLens): Lens {
        if (typeof selector === "number")
            selector = "" + selector // normalize to string

        let s: BaseLens | undefined = lens.selectorCache.get(selector) // TODO: different place

        if (s) return s
        if (typeof selector === "function")
            s = selectFn(lens, selector)
        else if (typeof selector === "string")
            s = selectProp(lens, selector)
        else return fail("Invalid selector, expected number, string or function. Got: " + (typeof selector))
        lens.selectorCache.set(selector, s)
        return s
}

function selectFn<T, R>(lens: Lens<T>, selector: Selector<T, R>): Lens<R> {
    return lens.pipe({
        cacheKey: selector,
        recompute(_base, newBaseValue) {
            return selector(newBaseValue)
        },
        update(base, updater) {
            base.update(draft => {
                const baseState = selector(draft)
                validateUpdater(baseState, updater, false)
                runUpdater(baseState, updater)
            })
        },
        describe(base) {
            return `${base.describe()}.{${selector.toString()}}` // TODO: improve
        }
    })
}

function selectProp<T, K extends keyof T>(lens: Lens<T>, key: K): Lens<T[K]> {
    return lens.pipe({
        cacheKey: key,
        recompute(_base, newBaseValue) {
            if (newBaseValue === null || newBaseValue === undefined)
                return undefined as any
            if (typeof newBaseValue === "object")
                return newBaseValue[key]
            return fail(`Unexpected value for field selector '${key}': '${newBaseValue}' (${typeof newBaseValue})`)
        },
        update(base, updater) {
            base.update(draft => {
                const baseState = draft[key]
                validateUpdater(baseState, updater, true)
                if (updaterNeedsReassignment(baseState, updater))
                    draft[key] = updater as any
                else
                    runUpdater(baseState, updater)
            })
        },
        describe(base) {
            return `${base.describe()}.${key}` // TODO: improve
        }
    })
}