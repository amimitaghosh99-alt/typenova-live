import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

    // Larger, thicker key geometry with higher visibility
    const keyGeo = new THREE.BoxGeometry(1.0, 0.25, 1.0);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00e5ff,
        emissive: 0x00dbe9,
        emissiveIntensity: 0.75,
        shininess: 120,
        transparent: true,
        opacity: 0.85
    });

    const rows = 6;
    const cols = 16;
    const keys: THREE.Mesh[] = [];

    for(let i = 0; i < rows; i++) {
        for(let j = 0; j < cols; j++) {
            const key = new THREE.Mesh(keyGeo, material.clone());
            key.position.x = (j - cols / 2) * 1.3;
            key.position.z = (i - rows / 2) * 1.3;
            group.add(key);
            keys.push(key);
        }
    }

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

    let animationFrameId: number;
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        
        keys.forEach((key) => {
            const d = Math.sqrt(key.position.x * key.position.x + key.position.z * key.position.z);
            key.position.y = Math.sin(d * 0.45 - time * 2) * 0.7;
            (key.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5 + (key.position.y * 0.6);
        });

        group.rotation.y = Math.sin(time * 0.2) * 0.1;
        
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
        cancelAnimationFrame(animationFrameId);
        
        // Dispose Three.js resources to prevent memory leaks
        keyGeo.dispose();
        material.dispose();
        keys.forEach(key => {
            if (key.material) {
               (key.material as THREE.Material).dispose();
            }
        });
        
        renderer.dispose();
        
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    };
  }, []);

  return (
    <div 
        id="hero-3d-container" 
        ref={containerRef} 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] z-0 pointer-events-none opacity-90"
        aria-hidden="true"
    />
  );
}
