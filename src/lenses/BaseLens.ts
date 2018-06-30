import { fail } from "../utils"
import { Lens, Handler, Disposer, Selector } from "./Lens";

export abstract class BaseLens<T = any> implements Lens<T> {
    readonly selectorCache = new Map<string, BaseLens>() // TODO: this creates a memory leak, how to fix?

    // optimization: initialize fields as empty
    // optimization: no forEach
    readonly subscriptions: Handler<T>[] = []
    readonly derivations: BaseLens[] = []
    readonly parents: BaseLens[] = []

    dirty = 0
    changedParents = 0
    state: T

    propagateChanged() {
        if (++this.dirty === 1)
            this.derivations.forEach(d => d.propagateChanged())
    }

    propagateReady(changed: boolean) {
        if (changed) this.changedParents++
        if (--this.dirty === 0) {
            if (this.changedParents) {
                this.changedParents = 0
                const old = this.state
                this.state = this.recompute()
                if (this.state !== old) {
                    notify(this.subscriptions, this.state)
                    this.derivations.forEach(d => d.propagateReady(true))
                    return
                }
            }
            this.derivations.forEach(d => d.propagateReady(false))
        }
    }

    private get hot() {
        return this.subscriptions.length || this.derivations.length
    }

    value() {
        if (this.hot) return this.state
        return this.recompute()
    }

    subscribe(handler: Handler<T>) {
        if (!this.hot) this.resume()
        const disposer = subscribe(this.subscriptions, handler)
        return () => { // optimize: shouldn't need additional closure
            disposer()
            if (!this.hot) {
                this.state = undefined // prevent leaking mem
                this.suspend()
            }
        }
    }

    registerDerivation(lens: BaseLens) {
        if (!this.hot) this.resume()
        this.derivations.push(lens)
    }

    removeDerivation(lens: BaseLens) {
        const idx = this.derivations.indexOf(lens)
        if (idx === -1) fail("Illegal state") // todo fail
        this.derivations.splice(idx, 1)
        if (!this.hot) {
            this.state = undefined // prevent leaking mem
            this.suspend()
        }
    }

    abstract recompute(): T;

    abstract resume();

    abstract suspend();

    abstract update(producer: ((draft: T) => void)): void

    select<R = any>(selector: Selector<T, R>|string|number): Lens<R> {
        if (typeof selector === "number")
            selector = ""  +selector // normalize to string
        if (typeof selector === "string") {
            const existing = this.selectorCache.get(selector)
            // if we created a lens for the very same selector before, find it!
            if (existing) return existing as any
            const s = new SelectField(this, selector)
            this.selectorCache.set(selector, s)
            return s
        }
        return new Select<T, R>(this, selector)
    }
}

function notify(subscriptions: Handler[], value: any) {
    subscriptions.forEach(f => f(value)) // optimize
}

function subscribe(subscriptions: Handler[], handler: Handler): Disposer {
    subscriptions.push(handler)
    return () => {
        const idx = subscriptions.indexOf(handler)
        if (idx !== -1) subscriptions.splice(idx, 1)
    }
}

import { Select } from "./Select"
import { SelectField } from "./SelectField"

