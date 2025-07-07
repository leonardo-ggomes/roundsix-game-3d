import {
    CapsuleGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    AnimationMixer,
    AnimationClip,
    AnimationAction,
    LoopOnce,
    LoopRepeat
} from "three";
import Loader from "./Loader";

class NPC extends Object3D {
    radius = 0.5;
    capSegments = 10;
    color = "#0000ff";
    height = 1;
    radialSegments = 30;
    loader: Loader;

    mixer!: AnimationMixer;
    clips: Record<string, AnimationClip> = {};
    currentAction: AnimationAction | null = null;
    currentState: string = "";

    health: number = 100;
    isAlive: boolean = true;

    constructor(loader: Loader) {
        super();
        this.loader = loader;

        const capsule = new Mesh(
            new CapsuleGeometry(this.radius, this.height, this.capSegments, this.radialSegments),
            new MeshBasicMaterial({ color: this.color, wireframe: true })
        );
        capsule.scale.set(0.5, 0.5, 0.5);
        this.add(capsule);

        this.loader.loader.load("/models/npc/npc_guard$rifle_idle.glb", (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.9, 1.9, 1.9);
            model.position.y = -this.height / 2 // alinhado com a cápsula

            model.traverse((child) => {
                if (child instanceof Mesh && child.geometry) {
                    child.geometry.computeBoundsTree()
                    child.material.wireframe = false

                    // Marcar como NPC
                    child.userData.type = "npc"
                    child.userData.parentNpc = this // referência para chamar takeDamage
                }
            })

            this.add(model);

            // Inicia mixer e animações
            this.mixer = new AnimationMixer(model);
   
            // Salva todas animações por nome
            gltf.animations.forEach((clip: AnimationClip) => {
                this.clips[clip.name] = clip;
            });

            // Inicia com Idle se existir
            if (this.clips["Armature|mixamo.com|Layer0"]) {
                this.setState("Armature|mixamo.com|Layer0", 1.0);
            }
        });
    }

    takeDamage(amount: number) {
        if (!this.isAlive) return;

        this.health -= amount;
        console.log(`NPC sofreu ${amount} de dano. Vida restante: ${this.health}`);

        if (this.health <= 0) {
            this.die();
        } else {
            this.setState("CharacterArmature|HitReceive_2", 1.0); // supondo que exista animação de hit
        }
    }

    die() {
        if (!this.isAlive) return;  // já evita execução múltipla
        this.isAlive = false;
        console.log("NPC morreu.");
        this.setState("CharacterArmature|Death", 1.0);

        setTimeout(() => {
            this.parent?.remove(this);
        }, 3000);
    }

    updateBehavior(delta: number) {
        if (!this.isAlive) return;

        // Futuro: patrulha, fugir, seguir jogador etc.
    }

    /**
     * Atualiza o mixer (chamar isso no loop de render)
     */
    update(delta: number) {
        if (this.mixer) {
            this.mixer.update(delta);
        }

        this.updateBehavior(delta)
    }

    /**
     * Troca o estado da máquina e executa animação
     */
    setState(name: string, speed: number) {
        if (this.currentState === name || !this.clips[name]) return;

        const clip = this.clips[name];
        const newAction = this.mixer.clipAction(clip);
        newAction.timeScale = speed;

        // Configura loop para animação de morte
        if (name === "CharacterArmature|Death") {
            newAction.setLoop(LoopOnce, 1);
            newAction.clampWhenFinished = true;  // mantém o frame final
        } else {
            newAction.setLoop(LoopRepeat, Infinity);
        }

        if (this.currentAction) {
            this.currentAction.fadeOut(0.3);
        }

        newAction.reset().fadeIn(0.3).play();

        this.currentAction = newAction;
        this.currentState = name;
    }
}

export default NPC;
