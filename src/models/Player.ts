import Position from "./position.ts";

export default class Player {
    id: string;
    position: Position;

    constructor(id: string, position: Position) {
        this.id = id;
        this.position = position;
    }
}
