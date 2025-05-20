import {
    CapsuleGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    AnimationMixer,
    AnimationClip,
    AnimationAction
} from "three";
import Loader from "./Loader";

class Player extends Object3D {
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

    constructor(loader: Loader) {
        super();
        this.loader = loader;

        const capsule = new Mesh(
            new CapsuleGeometry(this.radius, this.height, this.capSegments, this.radialSegments),
            new MeshBasicMaterial({ color: this.color, wireframe: true })
        );
        capsule.scale.set(0.5, 0.5, 0.5);
        this.add(capsule);

        this.loader.gltfLoad.load("/models/glTF/character$animated.glb", (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.7, 0.7, 0.7);
            model.position.y = -this.height / 2 // alinhado com a cápsula
            this.add(model);
            
            // Inicia mixer e animações
            this.mixer = new AnimationMixer(model);

            // Salva todas animações por nome
            gltf.animations.forEach( (clip: AnimationClip) => {
                this.clips[clip.name] = clip;
            });

            // Inicia com Idle se existir
            if (this.clips["CharacterArmature|Idle"]) {
                this.setState("CharacterArmature|Idle", 1.0);
            }
        });
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
    setState(name: string, speed: number) {
        if (this.currentState === name || !this.clips[name]) return;

        const clip = this.clips[name];
        const newAction = this.mixer.clipAction(clip);
        newAction.timeScale = speed;
        if (this.currentAction) {
            this.currentAction.fadeOut(0.3);
        }

        newAction.reset().fadeIn(0.3).play();

        this.currentAction = newAction;
        this.currentState = name;
    }
}

export default Player;
