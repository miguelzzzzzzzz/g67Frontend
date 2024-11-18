import React, { useRef, useState } from "react";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import {
    PanResponder,
    Button,
    View,
    StyleSheet,
    Modal,
    ActivityIndicator,
    Text,
} from "react-native";

export default function App() {
    const [isLoading, setIsLoading] = useState(false); // Loading state
    const rotation = useRef({ y: 0 }); // Store rotation for Y-axis
    const modelRef = useRef(null); // Reference to the 3D model
    const sceneRef = useRef(null); // Reference to the THREE.js scene
    const rendererRef = useRef(null); // Reference to the THREE.js renderer
    const cameraRef = useRef(null); // Reference to the THREE.js camera

    const loadModel = async (scene, url) => {
        setIsLoading(true); // Show loading indicator
        const objLoader = new OBJLoader();

        return new Promise((resolve, reject) => {
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

                    setIsLoading(false); // Hide loading indicator
                    resolve(); // Resolve the promise
                },
                undefined,
                (error) => {
                    console.error("Error loading .obj file:", error);
                    setIsLoading(false); // Hide loading indicator
                    reject(error); // Reject the promise
                }
            );
        });
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
        camera.position.set(0, 0, 3); // Adjust camera position
        cameraRef.current = camera;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        // Load the initial model
        const flaskServerURL = "http://192.168.100.31:5000/model";
        await loadModel(scene, flaskServerURL);

        // Render loop
        const render = () => {
            requestAnimationFrame(render);

            // Apply rotation to the model
            if (modelRef.current) {
                modelRef.current.rotation.y = rotation.current.y;
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };

        render();
    };

    // PanResponder for handling rotation gestures
    const panResponder = PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            const sensitivity = 0.001; // Adjust rotation sensitivity
            rotation.current.y += gestureState.dx * sensitivity;
        },
    });

    // Generate button handler
    const handleGenerate = async () => {
        setIsLoading(true); // Show loading indicator
        const flaskServerGenerateURL = "http://192.168.100.31:5000/generate";
        try {
            const response = await fetch(flaskServerGenerateURL, { method: "POST" });
            if (!response.ok) throw new Error("Failed to generate model");
            const data = await response.json();
            alert("Success: " + data.message);
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false); // Hide loading indicator
        }
    };

    // Reload model button handler
    const handleReloadModel = async () => {
        if (sceneRef.current) {
            setIsLoading(true); // Show loading indicator
            const flaskServerURL = "http://192.168.100.31:5000/model";
            try {
                await loadModel(sceneRef.current, flaskServerURL);
                alert("Success: Model reloaded successfully");
            } catch (error) {
                alert("Error: Could not reload model");
            } finally {
                setIsLoading(false); // Hide loading indicator
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Loading Modal */}
            <Modal visible={isLoading} transparent={true}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </Modal>

            {/* GLView for 3D rendering */}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#fff",
    },
});
