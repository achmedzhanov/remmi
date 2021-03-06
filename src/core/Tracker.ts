import {
    merge,
    Lens,
    Merge,
    _shallowEqual,
    noop,
    Disposer,
    createStore
} from "../internal"

let readListener: undefined | ((lens: Lens) => void)

export function notifyRead(lens: Lens) {
    if (readListener) readListener(lens) // optimize
}

export class Tracker {
    merge: Lens<any> = new Merge([])
    disposeMerge: Disposer = this.merge.subscribe(noop)

    constructor(private onInvalidate: () => void) {}

    public track<T>(fn: () => T): T {
        const dependencies = new Set<Lens>()
        const prevListener = readListener
        readListener = dependencies.add.bind(dependencies)
        try {
            return fn()
        } finally {
            const newDeps = Array.from(dependencies)
            if (!_shallowEqual(newDeps, this.getDependencies())) {
                // don't create merge if only one dep
                const nextMerge: Lens<any> =
                    newDeps.length === 0
                        ? (console.warn(
                              "[immer] The Tracker did not use any lenses"
                          ),
                          createStore(undefined))
                        : newDeps.length === 1 ? newDeps[0] : merge(...newDeps)
                if (nextMerge !== this.merge) {
                    const {disposeMerge} = this
                    this.merge = nextMerge
                    this.disposeMerge = this.merge.subscribe(this.onInvalidate)
                    disposeMerge()
                }
            }
            readListener = prevListener
        }
    }

    public dispose() {
        this.disposeMerge()
    }

    public getDependencies(): Lens[] {
        return this.merge instanceof Merge ? this.merge.bases : [this.merge]
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
