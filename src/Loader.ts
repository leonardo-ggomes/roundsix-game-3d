import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

class Loader
{
    dracoLoader: DRACOLoader
    gltfLoad: GLTFLoader

    constructor()
    {
        this.dracoLoader = new DRACOLoader()
        this.dracoLoader.setDecoderPath("/draco")
        
        this.gltfLoad = new GLTFLoader();
        this.gltfLoad.setDRACOLoader(this.dracoLoader)

    }
}

export default Loader