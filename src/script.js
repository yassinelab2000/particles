import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import GUI from "lil-gui";
import gsap from "gsap";
import galaxyVertexShader from "./shaders/galaxy/vertex.glsl";
import galaxyFragmentShader from "./shaders/galaxy/fragment.glsl";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import gpgpuParticlesShader from "./shaders/gpgpu/particles.glsl";
import morphingParticlesVertexShader from "./shaders/morphing/vertex.glsl";
import morphingParticlesFragmentShader from "./shaders/morphing/fragment.glsl";

/**
 * Debug
 */

const gui = new GUI({
  width: 300,
  title: "Debug Bar :",
});
gui.hide();
window.addEventListener("keydown", (event) => {
  if (event.key == "y") gui.show(gui._hidden);
});

const parameters2 = {
  materialColor: "#0047AB",
};

gui.addColor(parameters2, "materialColor").onChange(() => {
  material.color.set(parameters2.materialColor);
  particlesMaterial.color.set(parameters2.materialColor);
});

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  fragments.material.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio
  );

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Textures for particles around
 */
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load("/textures/particles/8.png");

/**
 * Generate galaxy
 */

/**
 * objects
 */
/**
 * galaxy
 */
const parameters = {};
parameters.count = 200000;
parameters.size = 0.005;
parameters.radius = 10;
parameters.branches = 4;
parameters.spin = 3;
parameters.randomness = 0.08;
parameters.randomnessPower = 5.5;
parameters.insideColor = "#ff6030";
parameters.outsideColor = "#1b3984";

let geometry = null;
let material = null;
let points = null;

const generateGalaxy = () => {
  /**
   * Destroy old galaxy
   */
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  }
  /**
   * Geometry
   */
  geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const scales = new Float32Array(parameters.count * 1);
  const randomness = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    //position
    const radius = Math.random() * parameters.radius;
    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

    // const spineAngle = radius * parameters.spin;

    positions[i3] = Math.cos(branchAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle) * radius;

    // randomness
    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    randomness[i3 + 0] = randomX;
    randomness[i3 + 1] = randomY;
    randomness[i3 + 2] = randomZ;

    // color
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3 + 0] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    //Scale
    scales[i] = Math.random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute(
    "aRandomness",
    new THREE.BufferAttribute(randomness, 3)
  );
  /**
   * Material
   */
  material = new THREE.ShaderMaterial({
    //size: parameters.size,
    //sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 30 * renderer.getPixelRatio() },
    },
  });
  /**
   * Points
   */
  points = new THREE.Points(geometry, material);
  scene.add(points);
};

//galaxy debug
gui
  .add(parameters, "count")
  .min(100)
  .max(1000000)
  .step(100)
  .onFinishChange(generateGalaxy);
gui
  .add(parameters, "size")
  .min(0.001)
  .max(0.1)
  .step(0.001)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "radius")
  .min(0.01)
  .max(20)
  .step(0.01)
  .onFinishChange(generateGalaxy);
gui
  .add(parameters, "branches")
  .min(2)
  .max(20)
  .step(1)
  .onFinishChange(generateGalaxy);
gui
  .add(parameters, "spin")
  .min(-5)
  .max(5)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui
  .add(parameters, "randomness")
  .min(0)
  .max(2)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui
  .add(parameters, "randomnessPower")
  .min(1)
  .max(10)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui.addColor(parameters, "insideColor").onFinishChange(generateGalaxy);
gui.addColor(parameters, "outsideColor").onFinishChange(generateGalaxy);

/**
 * light
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.position.set(1, 1, 0);
scene.add(directionalLight);

/**
 * Camera
 */
//Group
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.z = 6;

cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Part 2
 */
/**
 * load model
 */
const gltf = await gltfLoader.loadAsync("/model/exo1.glb");
console.log(gltf);

/**
 * Base Geometry
 */
const baseGeometry = {};
baseGeometry.instance = gltf.scene.children[0].geometry;
console.log(gltf.scene.children[0].geometry);
baseGeometry.count = baseGeometry.instance.attributes.position.count;
//console.log(baseGeometry.count);
/**
 * GPU Compute
 */
// Setup
const gpgpu = {};
gpgpu.size = Math.ceil(Math.sqrt(baseGeometry.count));
gpgpu.computation = new GPUComputationRenderer(
  gpgpu.size,
  gpgpu.size,
  renderer
);
// base particles
const baseParticlestextures = gpgpu.computation.createTexture();

console.log(baseParticlestextures.image.data);

for (let i = 0; i < baseGeometry.count; i++) {
  const i3 = i * 3;
  const i4 = i * 4;

  //Position xyz based on geometry
  baseParticlestextures.image.data[i4 + 0] =
    baseGeometry.instance.attributes.position.array[i3 + 0];
  baseParticlestextures.image.data[i4 + 1] =
    baseGeometry.instance.attributes.position.array[i3 + 1];
  baseParticlestextures.image.data[i4 + 2] =
    baseGeometry.instance.attributes.position.array[i3 + 2];
  baseParticlestextures.image.data[i4 + 3] = Math.random();
}
//console.log(baseParticlestextures.image.data);
//console.log(baseGeometry.instance.attributes.position.array);
// Particles variable
gpgpu.particlesVariable = gpgpu.computation.addVariable(
  "uParticles",
  gpgpuParticlesShader,
  baseParticlestextures
);
//loop
gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [
  gpgpu.particlesVariable,
]);
// uniforms GPGPU and Flow Field
gpgpu.particlesVariable.material.uniforms.uTimeFF = new THREE.Uniform(0);
gpgpu.particlesVariable.material.uniforms.uBasePosition = new THREE.Uniform(
  baseParticlestextures
);
gpgpu.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0);
gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
  new THREE.Uniform(0.5);
gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
  new THREE.Uniform(2);
gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
  new THREE.Uniform(0.5);
//Init
gpgpu.computation.init();

//Debug Plane
gpgpu.debug = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 1.5),
  new THREE.MeshBasicMaterial({
    map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable)
      .texture,
  })
);

//object distance
const objectDistance = 4;
//
gpgpu.debug.visible = false;
gpgpu.debug.position.x = 2;
gpgpu.debug.position.y = -objectDistance * 1;
scene.add(gpgpu.debug);

/**
 * Fragments
 */
const fragments = {};

//Geometry
const particlesUvArray = new Float32Array(baseGeometry.count * 2);
const sizesArray = new Float32Array(baseGeometry.count);

for (let y = 0; y < gpgpu.size; y++) {
  for (let x = 0; x < gpgpu.size; x++) {
    const i = y * gpgpu.size + x;
    const i2 = i * 2;

    // Particles UV
    const uvX = (x + 0.5) / gpgpu.size;
    const uvY = (y + 0.5) / gpgpu.size;

    particlesUvArray[i2 + 0] = uvX;
    particlesUvArray[i2 + 1] = uvY;

    sizesArray[i] = Math.random();
  }
}

fragments.geometry = new THREE.BufferGeometry();
fragments.geometry.setDrawRange(0, baseGeometry.count);
fragments.geometry.setAttribute(
  "aParticlesUv",
  new THREE.BufferAttribute(particlesUvArray, 2)
);
fragments.geometry.setAttribute(
  "aColor",
  baseGeometry.instance.attributes.color
);
fragments.geometry.setAttribute(
  "aSize",
  new THREE.BufferAttribute(sizesArray, 1)
);

// Material
fragments.material = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uSize: new THREE.Uniform(0.1),
    uResolution: new THREE.Uniform(
      new THREE.Vector2(
        sizes.width * sizes.pixelRatio,
        sizes.height * sizes.pixelRatio
      )
    ),
    uParticlesTexture: new THREE.Uniform(),
  },
});

// Points
fragments.points = new THREE.Points(fragments.geometry, fragments.material);
scene.add(fragments.points);
fragments.points.frustumCulled = false;

//
fragments.points.position.y = -objectDistance * 1;
fragments.points.position.x = -0.5;

fragments.points.scale.set(1.2, 1.2, 1.2);
//fragments.points.rotation.x = Math.PI * 0.5;
fragments.points.rotation.y = Math.PI * 0.25;
//fragments.points.rotation.z = Math.PI * 0.2;

/**
 * Tweaks
 */
gui
  .add(fragments.material.uniforms.uSize, "value")
  .min(0)
  .max(1)
  .step(0.001)
  .name("uSize fragment model");
gui
  .add(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, "value")
  .min(0)
  .max(1)
  .step(0.001)
  .name("uFlowFieldInfluence");
gui
  .add(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, "value")
  .min(0)
  .max(10)
  .step(0.001)
  .name("uFlowFieldStrength");
gui
  .add(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, "value")
  .min(0)
  .max(1)
  .step(0.001)
  .name("uFlowFieldFrequency");
// end of part 2

/**
 * Morphing Part 3
 */

let morphingParticles = null;
let clickCount = 0;

gltfLoader.load("./models3.glb", (gltf2) => {
  console.log(gltf2);
  morphingParticles = {};
  morphingParticles.index = 0;
  //Positions
  const positions = gltf2.scene.children.map((child) => {
    return child.geometry.attributes.position;
  });
  morphingParticles.maxCount = 0;
  for (const position of positions) {
    if (position.count > morphingParticles.maxCount)
      morphingParticles.maxCount = position.count;
  }
  morphingParticles.positions = [];
  for (const position of positions) {
    const originalArray = position.array;
    const newArray = new Float32Array(morphingParticles.maxCount * 3);
    for (let i = 0; i < morphingParticles.maxCount; i++) {
      const i3 = i * 3;
      if (i3 < originalArray.length) {
        newArray[i3 + 0] = originalArray[i3 + 0];
        newArray[i3 + 1] = originalArray[i3 + 1];
        newArray[i3 + 2] = originalArray[i3 + 2];
      } else {
        const randomIndex = Math.floor(position.count * Math.random()) * 3;
        newArray[i3 + 0] = originalArray[randomIndex + 0];
        newArray[i3 + 1] = originalArray[randomIndex + 1];
        newArray[i3 + 2] = originalArray[randomIndex + 2];
      }
    }
    morphingParticles.positions.push(
      new THREE.Float32BufferAttribute(newArray, 3)
    );
  }

  // Geometry
  const sizesArray = new Float32Array(morphingParticles.maxCount);
  for (let i = 0; i < morphingParticles.maxCount; i++) {
    sizesArray[i] = Math.random();
  }
  morphingParticles.geometry = new THREE.BufferGeometry();
  morphingParticles.geometry.setAttribute(
    "position",
    morphingParticles.positions[morphingParticles.index]
  );
  morphingParticles.geometry.setAttribute(
    "aPositionTarget",
    morphingParticles.positions[3]
  );
  morphingParticles.geometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(sizesArray, 1)
  );

  // Material
  morphingParticles.colorA = "#ff7300";
  morphingParticles.colorB = "#0091ff";

  morphingParticles.material = new THREE.ShaderMaterial({
    vertexShader: morphingParticlesVertexShader,
    fragmentShader: morphingParticlesFragmentShader,
    uniforms: {
      uSize: new THREE.Uniform(0.1),
      uResolution: new THREE.Uniform(
        new THREE.Vector2(
          sizes.width * sizes.pixelRatio,
          sizes.height * sizes.pixelRatio
        )
      ),
      uProgress: new THREE.Uniform(0),
      uColorA: new THREE.Uniform(new THREE.Color(morphingParticles.colorA)),
      uColorB: new THREE.Uniform(new THREE.Color(morphingParticles.colorB)),
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Points
  morphingParticles.points = new THREE.Points(
    morphingParticles.geometry,
    morphingParticles.material
  );

  scene.add(morphingParticles.points);
  //section 3 parameters

  morphingParticles.points.position.y = -objectDistance * 2;

  morphingParticles.points.position.x = 1.5;
  morphingParticles.points.scale.set(0.36, 0.36, 0.36);
  //Methodes
  morphingParticles.morph = (index) => {
    //update attributes
    morphingParticles.geometry.attributes.position =
      morphingParticles.positions[morphingParticles.index];
    morphingParticles.geometry.attributes.aPositionTarget =
      morphingParticles.positions[index];
    // Animate uProgress
    gsap.fromTo(
      morphingParticles.material.uniforms.uProgress,
      { value: 0 },
      { value: 1, duration: 3, ease: "linear" }
    );
    // Save index
    morphingParticles.index = index;
  };
  //
  morphingParticles.morph0 = () => {
    morphingParticles.morph(0);
  };
  morphingParticles.morph1 = () => {
    morphingParticles.morph(1);
  };
  morphingParticles.morph2 = () => {
    morphingParticles.morph(2);
  };
  morphingParticles.morph3 = () => {
    morphingParticles.morph(3);
  };

  // Tweaks
  gui.addColor(morphingParticles, "colorA").onChange(() => {
    morphingParticles.material.uniforms.uColorA.value.set(
      morphingParticles.colorA
    );
  });
  gui.addColor(morphingParticles, "colorB").onChange(() => {
    morphingParticles.material.uniforms.uColorB.value.set(
      morphingParticles.colorB
    );
  });
  //
  gui
    .add(morphingParticles.material.uniforms.uProgress, "value")
    .min(0)
    .max(1)
    .step(0.001)
    .name("Progress")
    .listen();

  gui.add(morphingParticles, "morph0");
  gui.add(morphingParticles, "morph1");
  gui.add(morphingParticles, "morph2");
  gui.add(morphingParticles, "morph3");
  //
  const handleClick = () => {
    clickCount++;
    if (clickCount % 4 === 1) {
      morphingParticles.morph(0);
    } else if (clickCount % 4 === 2) {
      morphingParticles.morph(1);
    } else if (clickCount % 4 === 3) {
      morphingParticles.morph(2);
    } else if (clickCount % 4 === 0) {
      morphingParticles.morph(3);
    }
  };

  document.getElementById("skip").addEventListener("click", () => {
    handleClick();
  });
});

//load models

/**
 * end of part 3
 */
/**
 * random particles
 */
//Geometry
const particlesCount = 2000;
const positions2 = new Float32Array(particlesCount * 3);
for (let i = 0; i < particlesCount; i++) {
  positions2[i * 3 + 0] = (Math.random() - 0.5) * 10;
  positions2[i * 3 + 1] =
    objectDistance * 0.5 - Math.random() * objectDistance * 2 * 4;
  positions2[i * 3 + 2] = (Math.random() - 0.5) * 10;
}
const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions2, 3)
);
// material
const particlesMaterial = new THREE.PointsMaterial({
  color: parameters2.materialColor,
  sizeAttenuation: true,
  size: 0.1,
  map: particleTexture,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
// points
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);
/**
 * scroll
 */
let scrollY = window.scrollY;
window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});
/**
 * cursor
 */
const cursor = {};
cursor.x = 0;
cursor.y = 0;

window.addEventListener("mousemove", (event) => {
  cursor.x = event.clientX / sizes.width - 0.5;
  cursor.y = event.clientY / sizes.height - 0.5;
});
// Call the galaxy
generateGalaxy();
/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // animate camera
  camera.position.y = (-scrollY / sizes.height) * objectDistance;

  const parallaxX = cursor.x;
  const parallaxY = -cursor.y;
  cameraGroup.position.x +=
    (parallaxX - cameraGroup.position.x) * 2 * deltaTime;
  cameraGroup.position.y +=
    (parallaxY - cameraGroup.position.y) * 2 * deltaTime;

  //Update glaxy material
  material.uniforms.uTime.value = elapsedTime;

  // GPGPU Update
  gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
  gpgpu.particlesVariable.material.uniforms.uTimeFF.value = elapsedTime;
  gpgpu.computation.compute();
  fragments.material.uniforms.uParticlesTexture.value =
    gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture;

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
