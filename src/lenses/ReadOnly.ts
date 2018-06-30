import { fail } from "../utils"
import { Pipe } from "./Pipe";

export class ReadOnly extends Pipe {
    update(_updater: any) {
        fail("Read only lens")
    }
}