import {
    CapsuleGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    AnimationMixer,
    AnimationClip,
    AnimationAction,
    Raycaster,
    Vector3,
    LoopOnce
} from "three";
import Loader from "./Loader";
import NPC from "./NPC";

class Player extends Object3D {
    radius = 0.5;
    capSegments = 10;
    color = "#0000ff";
    height = 2;
    radialSegments = 30;
    loader: Loader;

    mixer!: AnimationMixer;
    clips: { [key: string]: AnimationAction } = {}
    currentAction: AnimationAction | null = null;
    currentState: string = "";

    collisionMeshes: Mesh[] = []
    raycaster = new Raycaster()
    down = new Vector3(0, 0, -1)
    intersects: any[] = []

    isAttacking = false;
    attackCooldown = 0.8; // segundos, duração do ataque
    attackTimer = 0;

    lastAction = "Idle"

    constructor(loader: Loader) {
        super();
        this.loader = loader;

        const capsule = new Mesh(
            new CapsuleGeometry(this.radius, this.height, this.capSegments, this.radialSegments),
            new MeshBasicMaterial({ color: this.color, wireframe: true })
        );
        capsule.scale.set(1, 1, 1);
        this.add(capsule);

        this.loader.loader.load("/models/456$animated.glb", async (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.8, 1.8, 1.8);
            capsule.position.y = (this.height + .3 * this.radius) / 2;
            model.position.y = - (this.height * this.radius) / 2;


            model.traverse((child) => {
                if (child instanceof Mesh && child.geometry) {
                    child.geometry.computeBoundsTree()
                    child.material.wireframe = false
                    this.collisionMeshes.push(child)
                }
            })

            this.add(model);

            // Inicia mixer e animações
            this.mixer = new AnimationMixer(model);

             for (let animationKey in this.loader.globalAnimations) {
                this.clips[animationKey] = this.mixer.clipAction(this.loader.globalAnimations[animationKey])
            }

            // Salva todas animações por nome
            if (gltf.animations.length > 0) {
                this.clips["Idle"] = this.mixer.clipAction(gltf.animations[0])              
            }

            // Inicia com Idle se existir
            if (this.clips["Idle"]) {
                this.setState("Idle", 1.0);
            }
        });
    }  

     attack(npcs: Mesh[], cameraDirection: Vector3) {
        if (this.isAttacking) return;

        this.isAttacking = true;

        const kindOfPuching = "FireRifle" //Math.round(Math.random() * 2) % 2 == 0 ? "Punching" : "PunchingRight"

        const action = this.setState(kindOfPuching, 1.0); // velocidade opcional
        if (!action) return;

        action.setLoop(LoopOnce, 0);
        action.clampWhenFinished = true; // trava na última pose


        const onFinish = (event: any) => {
            if (event.action === action) {
                console.log("⚡ Animação de ataque terminou");
                this.mixer.removeEventListener("finished", onFinish);
                this.isAttacking = false;
                this.setState("IdleRifle", 1.0);
            }
        };
        this.mixer.addEventListener("finished", onFinish);


        const origin = this.position.clone();
        origin.y += 0.5;

        const direction = cameraDirection.clone().normalize();

        this.raycaster.set(origin, direction);
        const maxDistance = 4;

        const hits = this.raycaster.intersectObjects(npcs, true);

        if (hits.length > 0 && hits[0].distance <= maxDistance) {
            const hit = hits[0];
            console.log("🎯 NPC atingido:", hit.object.name, "Distância:", hit.distance);

            if (hit.object.userData.type === "npc") {
                const npc = hit.object.userData.parentNpc as NPC;
                npc.takeDamage(50);
            }
        } else {
            console.log("❌ Nenhum NPC atingido.");
        }
    }

    /**
     * Atualiza o mixer (chamar isso no loop de render)
     */
    update(delta: number) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    /**
     * Troca o estado da máquina e executa animação
     */
    setState(name: string, speed: number): AnimationAction | null {
        if (this.currentState === name || !this.clips[name]) return null;

        const clip = this.clips[name];
        const newAction = clip;
        newAction.timeScale = speed;

        if (this.currentAction) {
            this.currentAction.fadeOut(0.3);
        }

        newAction.reset().fadeIn(0.3).play();

        this.currentAction = newAction;
        this.currentState = name;

        return newAction;
    }
}

export default Player;
