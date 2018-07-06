import { fail, Pipe } from "../internal"

export class ReadOnly extends Pipe {
    update(_updater: any) {
        fail("Read only lens")
    }
}
