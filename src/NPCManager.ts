import NPC from "./NPC";
import Loader from "./Loader";
import { Group, Mesh } from "three";

class NPCManager {
    npcs: NPC[] = [];
    group: Group = new Group(); // para organizar visualmente na cena
    loader: Loader;

    constructor(loader: Loader) {
        this.loader = loader;
    }

    spawn(position: { x: number, y: number, z: number }) {
        const npc = new NPC(this.loader);
        npc.position.set(position.x, position.y, position.z);
        this.npcs.push(npc);
        this.group.add(npc);
    }

    update(delta: number) {
        for (const npc of this.npcs) {
            npc.update(delta);
        }
    }

    getAll(): NPC[] {
        return this.npcs;
    }

    collectNpcMeshes(npcs: NPC[]): Mesh[] {
        const meshes: Mesh[] = [];
        npcs.forEach(npc => {
            npc.traverse((child) => {
                if (child instanceof Mesh && child.userData.type === "npc") {
                    meshes.push(child);
                }
            });
        });
        return meshes;
    }
}

export default NPCManager;
