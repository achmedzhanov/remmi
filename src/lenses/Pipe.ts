import { BaseLens, Lens } from "../internal";

// lens that doesn't do anything particullary useful (it just returns it's parents value),
// yet is useful for subclassing
export abstract class Pipe extends BaseLens {
    protected base: BaseLens
    constructor(base: Lens) {
        super()
        // TODO: check args
        this.base = base as BaseLens
    }

    recompute(): any {
        return this.base.value()
    }

    update(updater: ((draft: any) => void)) {
        this.base.update(updater)
    }

    resume() {
        this.base.registerDerivation(this)
    }

    suspend() {
        this.base.removeDerivation(this)
    }
}
