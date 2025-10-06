import {
    CapsuleGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    AnimationMixer,
    AnimationAction,
    Raycaster,
    Vector3,
    LoopOnce,
    SphereGeometry,
    Scene,
    CylinderGeometry,
    LoopRepeat,
    Quaternion,
    ArrowHelper,
    MathUtils
} from "three";
import Loader from "./Loader";
import NPC from "./NPC";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

class Player extends Object3D {
    radius = 0.5;
    capSegments = 10;
    color = "#0000ff";
    height = 2;
    radialSegments = 30;
    loader: Loader;
    model?: Object3D;

    mixer!: AnimationMixer;
    clips: { [key: string]: AnimationAction } = {};
    currentAction: AnimationAction | null = null;
    currentState: string = "";

    collisionMeshes: Mesh[] = [];
    raycaster = new Raycaster();
    down = new Vector3(0, 0, -1);

    isAttacking = false;
    attackCooldown = 0.15;
    attackTimer = 0;
    isShooting = false;

    lastAction = "Idle";
    isLoadedModel: Promise<void>;
    handObject: Object3D = new Object3D();

    // Balas
    activeBullets: { mesh: Mesh, direction: Vector3, distance: number }[] = [];
    bulletSpeed = 50; // unidades por segundo
    bulletMaxDistance = 100;

    constructor(loader: Loader) {
        super();
        this.loader = loader;
        this.isLoadedModel = this.loadModel();

        this.setWeapon();
    }

    async loadModel() {
        return await new Promise<void>((resolve) => {
            this.loader.loader.load("/models/456$animated.glb", async (gltf) => {
                const capsule = new Mesh(
                    new CapsuleGeometry(this.radius, this.height, this.capSegments, this.radialSegments),
                    new MeshBasicMaterial({ color: this.color, wireframe: true, visible: false })
                );
                capsule.scale.set(1, 1, 1);
                this.add(capsule);

                this.model = gltf.scene;
                this.model.scale.set(1.8, 1.8, 1.8);
                capsule.position.y = (this.height + 0.3 * this.radius) / 2;
                this.model.position.y = -(this.height * this.radius) / 2;

                this.model.traverse((child) => {
                    if (child instanceof Mesh && child.geometry) {
                        child.geometry.computeBoundsTree();
                        child.material.wireframe = false;
                        this.collisionMeshes.push(child);
                    }
                });

                this.add(this.model);

                // Mixer de animação
                this.mixer = new AnimationMixer(this.model);

                for (let animationKey in this.loader.globalAnimations) {
                    this.clips[animationKey] = this.mixer.clipAction(this.loader.globalAnimations[animationKey]);
                }

                if (gltf.animations.length > 0) {
                    this.clips["Idle"] = this.mixer.clipAction(gltf.animations[0]);
                }

                if (this.clips["Idle"]) {
                    this.setState("Idle", 1.0);
                }

                resolve();
            });
        });
    }

    attack(scene: Scene) {
        if (this.isAttacking) return;

        this.isAttacking = true;
        const action = this.setState("FireRifle", 1.0);
        if (!action) return;

        action.timeScale = 5.0;
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = true;
        action.play();

        if(action.isRunning())
        {
         this.shoot(scene);
        this.attackTimer = 0; // começa o cooldown
        }
     
    }



    shoot(scene: Scene) {
        const bulletGeo = new CylinderGeometry(0.05, 0.05, 0.3, 8);
        const bulletMat = new MeshBasicMaterial({ color: 0xffd700 });
        const bulletMesh = new Mesh(bulletGeo, bulletMat);
        bulletMesh.rotation.x = Math.PI / 2;

        // 1️⃣ Pegamos o objeto da arma
        const rifle = this.model?.getObjectByName("rifle");


        // 2️⃣ Criar um ponto no local do cano (exemplo: ponta da arma)
        const muzzleLocal = new Vector3(0, 0, .5); // depende do modelo, ajuste até ficar no cano
        const muzzleWorld = muzzleLocal.clone();
        rifle?.localToWorld(muzzleWorld);

        // 3️⃣ Posicionar a bala na ponta do cano
        bulletMesh.position.copy(muzzleWorld);

        const weaponDir = new Vector3(0, 0, 1);
        const worldQuat = new Quaternion();
        rifle?.getWorldQuaternion(worldQuat); // ✅ retorna um Quaternion real
        weaponDir.applyQuaternion(worldQuat); // ✅ aplica rotação correta


        const correction = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(-6));
        weaponDir.applyQuaternion(correction);

        weaponDir.normalize();
        // 5️⃣ Adiciona à cena
        scene.add(bulletMesh);

        // 6️⃣ Salva com direção correta
        this.activeBullets.push({
            mesh: bulletMesh,
            direction: weaponDir,
            distance: 0
        });
    }


    update(delta: number, npcs?: Mesh[]) {

        // Atualiza cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= delta;
        }

        // Se o player estiver segurando o tiro e cooldown zerou
        if (this.isShooting && this.attackTimer <= 0) {
            this.shoot(this.parent as Scene); // ou passe a cena como parâmetro do update
            this.attackTimer = this.attackCooldown; // reseta cooldown
        }

        // Atualiza animações
        if (this.mixer) this.mixer.update(delta);

        // Atualiza balas
        if (npcs) {
            for (let i = this.activeBullets.length - 1; i >= 0; i--) {
                const bullet = this.activeBullets[i];

                // Move a bala
                const moveStep = bullet.direction.clone().multiplyScalar(this.bulletSpeed * delta);
                bullet.mesh.position.add(moveStep);
                bullet.distance += moveStep.length();

                // Checa colisão
                this.raycaster.set(bullet.mesh.position, bullet.direction);
                const hits = this.raycaster.intersectObjects(npcs, true);

                if (hits.length > 0 && hits[0].distance < 0.5) {
                    const hit = hits[0];

                    if (hit.object.userData.type === "npc") {
                        const npc = hit.object.userData.parentNpc as NPC;
                        npc.takeDamage(30);
                    }

                    bullet.mesh.removeFromParent();
                    this.activeBullets.splice(i, 1);
                    continue;
                }

                // Remove bala se ultrapassou a distância máxima
                if (bullet.distance > this.bulletMaxDistance) {
                    bullet.mesh.removeFromParent();
                    this.activeBullets.splice(i, 1);
                }
            }
        }
    }

    setWeapon() {
        this.isLoadedModel.then(async () => {
            let gltf = await this.loader.loader.loadAsync("models/rifle.glb");
            this.handObject = gltf.scene;
            this.handObject.name = "rifle";

            const handBone = this.model?.getObjectByName("mixamorigRightHand");
            if (handBone) {
                this.handObject.position.set(0, 0, 0);
                this.handObject.rotation.set(0, 0, 0);
                this.handObject.scale.set(0.06, 0.06, 0.06);

                handBone.attach(this.handObject);
                this.handObject.position.set(0.05, 0.23, 0.05);
                this.handObject.rotation.set(1.753, Math.PI, 1.521);

                const f = new GUI().addFolder("Weapon");
                f.add(this.handObject.position, "x", -50, 50, 0.1);
                f.add(this.handObject.position, "y", -50, 50, 0.1);
                f.add(this.handObject.position, "z", -50, 50, 0.1);

                f.add(this.handObject.rotation, "x", -Math.PI, Math.PI);
                f.add(this.handObject.rotation, "y", -Math.PI, Math.PI);
                f.add(this.handObject.rotation, "z", -Math.PI, Math.PI);

                this.handObject.visible = true;
            }
        });
    }

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
