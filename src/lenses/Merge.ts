import { BaseLens } from "./BaseLens";

export class Merge<X=any, T extends ReadonlyArray<X> = any[]> extends BaseLens<T> {
    constructor(private bases: BaseLens[]) {
        super()
        // TODO: check args
    }

    recompute() {
        return this.bases.map(b => b.value()) as any // optimize extract fn // TODO: fix type
    }

    update(updater: ((draft: T) => T | void)) {
        // TODO: fix typings
        const drafts: any[] = []
        const grabNextDraft = () => {
            // probably optimizable
            this.bases[drafts.length].update(draft => {
                drafts.push(draft)
                if (drafts.length < this.bases.length) grabNextDraft()
                else
                    // we are now in the context of all producers of all bases
                    // let's call the updater function with those drafts!
                    updater(drafts as any) // TODO: type
            })
        }
        grabNextDraft()
    }

    resume() {
        this.bases.forEach(b => b.registerDerivation(this))
    }

    suspend() {
        this.bases.forEach(b => b.removeDerivation(this))
    }
}