import { Euler, Matrix4, Object3D, PerspectiveCamera, Quaternion, Vector3 } from "three"

class Camera {
    perspectiveCamera: PerspectiveCamera

    yaw = 0           // Rotação horizontal (em torno do eixo Y)
    pitch = 0         // Rotação vertical (em torno do eixo X)
    rotationSpeed = 0.005
    mousePressed = false
    smoothFactor = 0.1

    offset = new Vector3(0, 3, 6)      // Distância da câmera atrás e acima do personagem
    lookAtOffset = new Vector3(0, 2, 0) // Para olhar para o "peito" ou cabeça do personagem

    constructor() {
        this.perspectiveCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.perspectiveCamera.position.copy(this.offset)
        this.perspectiveCamera.lookAt(this.lookAtOffset)

        document.addEventListener("mousedown", () => (this.mousePressed = true))
        document.addEventListener("mouseup", () => (this.mousePressed = false))
        document.addEventListener("mousemove", this.onMouseMove)

        // Opcional: zoom com roda do mouse
        document.addEventListener("wheel", this.onMouseWheel)
    }

    onMouseMove = (e: MouseEvent) => {
        if (this.mousePressed) {
            this.yaw -= e.movementX * this.rotationSpeed

            // Limitar pitch para ângulos entre -45 e +45 graus (em radianos)
            const pitchChange = -e.movementY * this.rotationSpeed
            const newPitch = this.pitch + pitchChange
            this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, newPitch))
        }
    }

    onMouseWheel = (e: WheelEvent) => {
        // Ajusta a distância da câmera (offset.z) com limite mínimo e máximo
        const zoomSpeed = 0.1
        let newZ = this.offset.z + e.deltaY * zoomSpeed * 0.01
        newZ = Math.min(Math.max(newZ, 3), 12) // distância entre 3 e 12
        this.offset.z = newZ
    }

    update(target: Object3D) {
        // Cria a matriz de rotação a partir de yaw e pitch
        const rotationMatrix = new Matrix4().makeRotationFromQuaternion(
            new Quaternion().setFromEuler(new Euler(this.pitch, this.yaw, 0, "YXZ"))
        )

        // Aplica a rotação ao offset (posição relativa da câmera ao personagem)
        const cameraOffset = this.offset.clone().applyMatrix4(rotationMatrix)

        // Posição desejada da câmera = posição do personagem + offset rotacionado
        const desiredPosition = target.position.clone().add(cameraOffset)

        // Suaviza o movimento da câmera
        this.perspectiveCamera.position.lerp(desiredPosition, this.smoothFactor)

        // Faz a câmera olhar para o personagem, adicionando offset para ficar na altura do tronco/cabeça
        const lookAtTarget = target.position.clone().add(this.lookAtOffset)
        this.perspectiveCamera.lookAt(lookAtTarget)
    }
}

export default Camera
