import { AmbientLight, Color, Fog, Scene } from "three"

class MainScene
{

    scene: Scene

    constructor()
    {
        this.scene = new Scene()
        this.scene.background = new Color(0x0a0f1a);
        this.scene.fog = new Fog(0x102233, 10, 100);
        this.setAmbientLight()
    }

    setAmbientLight()
    {
        const ambientLight = new AmbientLight(0xffffff, .5)
        this.scene.add(ambientLight)
    }

}

export default MainScene