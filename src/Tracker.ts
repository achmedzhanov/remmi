import { Lens, Merge, shallowEqual, noop, Disposer } from "./internal";

// TODO: use a global
let readListener: undefined | ((lens: Lens) => void)

export function notifyRead(lens: Lens) {
    if (readListener) readListener(lens) // optimize
}

export class Tracker {
    merge: Merge = new Merge([])
    disposeMerge: Disposer = this.merge.subscribe(noop)

    constructor(private onInvalidate: () => void) {

    }

    public track<T>(fn: () => T): T {
        const dependencies = new Set<Lens>()
        const prevListener = readListener
        readListener = dependencies.add.bind(dependencies)
        try {
            return fn()
        } finally {
            const newDeps = Array.from(dependencies)
            if (!shallowEqual(newDeps, this.merge.bases)) { // TODO: still needed with merge caching?
                const { disposeMerge } = this
                // optimization; don't create merge if only one dep
                this.merge = new Merge(newDeps as any) // TODO: fix typings
                this.disposeMerge = this.merge.subscribe(this.onInvalidate)
                disposeMerge()
            }
            readListener = prevListener
        }
    }

    public dispose() {
        this.disposeMerge()
    }

    public getDependencies(): Lens[] {
        return this.merge.bases
    }
}

export function autorun(fn: () => void): Disposer {
    const t = new Tracker(() => {
        t.track(fn)
    })
    const res = t.dispose.bind(t)
    t.track(fn)
    return res
}