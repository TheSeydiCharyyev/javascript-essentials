import { Environment, useGLTF } from "@react-three/drei"
import { Canvas } from "@react-three/fiber";

const TechIcon = ({ model }) => {
    const scene = useGLTF(model.modelPath);

    return (
        <div>
            <Canvas>
                <ambientLight intensity={0.3} />
                <Environment preset="city" />
            </Canvas>
        </div>
    )
}

export default TechIcon