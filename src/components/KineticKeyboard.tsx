import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Realistic 60% keyboard layout map
const KEYBOARD_LAYOUT = [
  [{ id: 'Escape', w: 1 }, { id: '1', w: 1 }, { id: '2', w: 1 }, { id: '3', w: 1 }, { id: '4', w: 1 }, { id: '5', w: 1 }, { id: '6', w: 1 }, { id: '7', w: 1 }, { id: '8', w: 1 }, { id: '9', w: 1 }, { id: '0', w: 1 }, { id: '-', w: 1 }, { id: '=', w: 1 }, { id: 'Backspace', w: 2 }],
  [{ id: 'Tab', w: 1.5 }, { id: 'q', w: 1 }, { id: 'w', w: 1 }, { id: 'e', w: 1 }, { id: 'r', w: 1 }, { id: 't', w: 1 }, { id: 'y', w: 1 }, { id: 'u', w: 1 }, { id: 'i', w: 1 }, { id: 'o', w: 1 }, { id: 'p', w: 1 }, { id: '[', w: 1 }, { id: ']', w: 1 }, { id: '\\', w: 1.5 }],
  [{ id: 'CapsLock', w: 1.75 }, { id: 'a', w: 1 }, { id: 's', w: 1 }, { id: 'd', w: 1 }, { id: 'f', w: 1 }, { id: 'g', w: 1 }, { id: 'h', w: 1 }, { id: 'j', w: 1 }, { id: 'k', w: 1 }, { id: 'l', w: 1 }, { id: ';', w: 1 }, { id: "'", w: 1 }, { id: 'Enter', w: 2.25 }],
  [{ id: 'Shift', w: 2.25 }, { id: 'z', w: 1 }, { id: 'x', w: 1 }, { id: 'c', w: 1 }, { id: 'v', w: 1 }, { id: 'b', w: 1 }, { id: 'n', w: 1 }, { id: 'm', w: 1 }, { id: ',', w: 1 }, { id: '.', w: 1 }, { id: '/', w: 1 }, { id: 'Shift', w: 2.75 }],
  [{ id: 'Control', w: 1.25 }, { id: 'Meta', w: 1.25 }, { id: 'Alt', w: 1.25 }, { id: ' ', w: 6.25 }, { id: 'Alt', w: 1.25 }, { id: 'Meta', w: 1.25 }, { id: 'ContextMenu', w: 1.25 }, { id: 'Control', w: 1.25 }]
];

type KeyData = {
    mesh: THREE.Mesh;
    activeUntil: number;
    gridX: number;
    gridZ: number;
};

export function KineticKeyboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();

    const material = new THREE.MeshPhongMaterial({
        color: 0x00e5ff,
        emissive: 0x00dbe9,
        emissiveIntensity: 0.5,
        shininess: 120,
        transparent: true,
        opacity: 0.85
    });

    const keysArray: KeyData[] = [];
    const keyMap = new Map<string, KeyData[]>();

    const baseSize = 0.9;
    const keySpacing = 1.05; 
    
    // Calculate total width of Row 0 to perfectly center the keyboard
    const row0Width = KEYBOARD_LAYOUT[0].reduce((acc, k) => acc + (k.w * baseSize) + (keySpacing - baseSize), 0);
    
    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
        let currentX = -row0Width / 2;
        
        row.forEach((keyDef) => {
            const w = keyDef.w;
            const keyWidth = w * baseSize + (w - 1) * (keySpacing - baseSize);
            
            const geo = new THREE.BoxGeometry(keyWidth, 0.25, baseSize);
            const keyMesh = new THREE.Mesh(geo, material.clone());
            
            // Center the mesh on its calculated X span
            keyMesh.position.x = currentX + keyWidth / 2;
            keyMesh.position.z = (rowIndex - 2.5) * keySpacing;
            
            group.add(keyMesh);
            
            const keyData = { 
                mesh: keyMesh, 
                activeUntil: 0,
                gridX: keyMesh.position.x,
                gridZ: keyMesh.position.z
            };
            keysArray.push(keyData);
            
            const keyId = keyDef.id.toLowerCase();
            if(!keyMap.has(keyId)) keyMap.set(keyId, []);
            keyMap.get(keyId)!.push(keyData);
            
            currentX += keyWidth + (keySpacing - baseSize);
        });
    });

    group.rotation.x = -Math.PI / 3;
    group.position.y = -2.2;
    group.scale.set(1.15, 1.15, 1.15);
    scene.add(group);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00dbe9, 3.0, 60);
    pointLight.position.set(0, 10, 10);
    scene.add(pointLight);

    const purpleLight = new THREE.PointLight(0xd0bcff, 2.0, 60);
    purpleLight.position.set(-10, 5, -5);
    scene.add(purpleLight);

    camera.position.z = 9.5;
    camera.position.y = 1.8;
    camera.lookAt(0, -1.8, 0);

    // Interactive Keydown Listener
    const handleKeyDown = (e: KeyboardEvent) => {
        const keyId = e.key.toLowerCase();
        let targets = keyMap.get(keyId);
        
        // Handle spacebar mapping
        if (e.code === 'Space') {
            targets = keyMap.get(' ');
        }
        
        if(targets) {
            targets.forEach(t => {
                t.activeUntil = Date.now() + 150; // Active flash duration
            });
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    let animationFrameId: number;
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        
        keysArray.forEach((kData) => {
            const key = kData.mesh;
            const d = Math.sqrt(kData.gridX * kData.gridX + kData.gridZ * kData.gridZ);
            
            // Base ambient wave
            const waveY = Math.sin(d * 0.45 - time * 2) * 0.4;
            
            // Interaction override
            const isActive = Date.now() < kData.activeUntil;
            const targetY = isActive ? waveY - 0.5 : waveY;
            const targetEmissive = isActive ? 2.5 : 0.4 + (waveY * 0.3);
            
            // Smooth spring interpolation for Y position
            key.position.y += (targetY - key.position.y) * 0.3;
            
            // Smooth interpolation for emissive intensity
            const mat = key.material as THREE.MeshPhongMaterial;
            mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.3;
            
            // Color switch on active
            if(isActive) {
                mat.emissive.setHex(0xffffff); // Flash bright white
            } else {
                mat.emissive.setHex(0x00dbe9); // Cyan
            }
        });

        // Slow camera rotation
        group.rotation.y = Math.sin(time * 0.2) * 0.05;
        
        renderer.render(scene, camera);
    }

    function handleResize() {
        if(!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    window.addEventListener('resize', handleResize);
    animate();

    // CLEANUP
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(animationFrameId);
        container.removeChild(renderer.domElement);
        scene.clear();
        keysArray.forEach(k => {
            k.mesh.geometry.dispose();
            (k.mesh.material as THREE.Material).dispose();
        });
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen overflow-hidden" 
    />
  );
}
