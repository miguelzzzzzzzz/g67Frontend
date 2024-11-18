import React, { useRef } from "react";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PanResponder, Button, View, StyleSheet, Alert } from "react-native";

export default function App() {
    const rotation = useRef({ y: 0 }); // Store rotation state for Y-axis only
    const modelRef = useRef(null); // Reference to the 3D model
    const sceneRef = useRef(null); // Reference to the THREE.js scene
    const rendererRef = useRef(null); // Reference to the THREE.js renderer
    const cameraRef = useRef(null); // Reference to the THREE.js camera

    const loadModel = async (scene, url) => {
        const objLoader = new OBJLoader();
        objLoader.load(
            url,
            (object) => {
                // Remove existing model if it exists
                if (modelRef.current) {
                    scene.remove(modelRef.current);
                }

                // Compute bounding box and center the model
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());

                // Create a pivot point at the center
                const pivot = new THREE.Object3D();
                pivot.add(object); // Add the model to the pivot
                object.position.sub(center); // Center the model relative to the pivot

                // Add the pivot to the scene
                modelRef.current = pivot; // Store reference to the pivot
                scene.add(pivot);
            },
            undefined,
            (error) => {
                console.error("Error loading .obj file:", error);
            }
        );
    };

    const onContextCreate = async (gl) => {
        // Create renderer
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        rendererRef.current = renderer;

        // Create scene and camera
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 3); // Move the camera closer along the Z-axis
        cameraRef.current = camera;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        // Load initial model
        const flaskServerURL = "http://192.168.0.117:5000/model"; // Flask server URL
        await loadModel(scene, flaskServerURL);

        // Render loop
        const render = () => {
            requestAnimationFrame(render);

            // Apply rotation to the model if it exists
            if (modelRef.current) {
                modelRef.current.rotation.y = rotation.current.y;
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };

        render();
    };

    // PanResponder for rotation gestures
    const panResponder = PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            // Adjust rotation sensitivity
            const sensitivity = 0.001; // Reduced sensitivity for slower rotation
            const { dx } = gestureState;
            rotation.current.y += dx * sensitivity; // Rotate around Y-axis only
        },
    });

    // Handle Generate Button Press
    const handleGenerate = async () => {
        const flaskServerGenerateURL = "http://192.168.0.117:5000/generate";
        try {
            const response = await fetch(flaskServerGenerateURL, { method: "POST" });
            if (!response.ok) throw new Error("Failed to generate model");
            const data = await response.json();
            Alert.alert("Success", data.message);
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    // Handle Reload Model Button Press
    const handleReloadModel = async () => {
        if (sceneRef.current) {
            const flaskServerURL = "http://192.168.0.117:5000/model";
            await loadModel(sceneRef.current, flaskServerURL);
            Alert.alert("Success", "Model reloaded successfully");
        }
    };

    return (
        <View style={styles.container}>
            <GLView
                style={styles.glView}
                onContextCreate={onContextCreate}
                {...panResponder.panHandlers} // Attach pan gesture handlers
            />
            <Button title="Generate" onPress={handleGenerate} />
            <Button title="Reload Model" onPress={handleReloadModel} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    glView: {
        flex: 1,
        width: "100%",
    },
});
