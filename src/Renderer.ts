import { PCFShadowMap, WebGLRenderer } from "three";
import Camera from "./Camera";
import MainScene from "./MainScene";

class Renderer 
{

    renderer: WebGLRenderer
    camera: Camera
    mainScene: MainScene

    constructor(camera: Camera, mainScene: MainScene)
    {        
        this.camera = camera
        this.mainScene = mainScene
        this.renderer = new WebGLRenderer({antialias: true})
        this.renderer.setPixelRatio(devicePixelRatio)
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = PCFShadowMap
        document.body.prepend(this.renderer.domElement)   
        
        window.addEventListener("resize", this.onResize)
    }

    private onResize = () =>
    {
        this.camera.perspectiveCamera.aspect = window.innerWidth / window.innerHeight
        this.camera.perspectiveCamera.updateProjectionMatrix()
        
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    update()
    {
        this.renderer.render(this.mainScene.scene, this.camera.perspectiveCamera)
    }
}

export default Renderer