// import './style.css'
import gsap from 'gsap'

let THREE, GLTFLoader, RGBELoader, EffectComposer, RenderPass, RGBShiftShader, ShaderPass;

async function initThree() {
  THREE = await import('three');
  const GLTFLoaderModule = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const RGBELoaderModule = await import('three/examples/jsm/loaders/RGBELoader.js');
  const EffectComposerModule = await import('three/examples/jsm/postprocessing/EffectComposer.js');
  const RenderPassModule = await import('three/examples/jsm/postprocessing/RenderPass.js');
  const RGBShiftShaderModule = await import('three/examples/jsm/shaders/RGBShiftShader.js');
  const ShaderPassModule = await import('three/examples/jsm/postprocessing/ShaderPass.js');

  GLTFLoader = GLTFLoaderModule.GLTFLoader;
  RGBELoader = RGBELoaderModule.RGBELoader;
  EffectComposer = EffectComposerModule.EffectComposer;
  RenderPass = RenderPassModule.RenderPass;
  RGBShiftShader = RGBShiftShaderModule.RGBShiftShader;
  ShaderPass = ShaderPassModule.ShaderPass;

  initScene();
}

function initScene() {
  //Scene
  const scene = new THREE.Scene()

  //Cameras
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 4

  //Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#canvas'), 
    antialias: true,
    alpha: true
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.outputEncoding = THREE.sRGBEncoding

  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()   

  //HDRI Loader
  const rgbeLoader = new RGBELoader()
  rgbeLoader.load('/basement_boxing_ring_4k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = texture
  }, undefined, function(error) {
    console.error('Error loading HDRI:', error);
  })

  //GLB Model Loader
  const loader = new GLTFLoader()

  let model;

  console.log('About to load GLB model');
  loader.load(
    '/street_fighter.glb',
    function (gltf) {
      console.log('Model loaded successfully', gltf);
      model = gltf.scene
      scene.add(model)
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    function (error) {
      console.error('Error loading model:', error)
    }
  )

  // Post-processing setup
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const rgbShiftPass = new ShaderPass(RGBShiftShader)
  rgbShiftPass.uniforms['amount'].value = 0.0015
  composer.addPass(rgbShiftPass)

  // Global variables to track interaction state
  let isInteracting = false;
  let lastPointerPosition = { x: 0, y: 0 };

  // Function to handle rotation
  function handleRotation(clientX, clientY) {
    if (model && isInteracting) {
      // Calculate rotation based on pointer movement
      const deltaX = clientX - lastPointerPosition.x;
      const deltaY = clientY - lastPointerPosition.y;
      
      // Update last position
      lastPointerPosition = { x: clientX, y: clientY };

      // Apply rotation to the model using GSAP
      gsap.to(model.rotation, {
        x: gsap.utils.clamp(-Math.PI / 4, Math.PI / 4, model.rotation.x - deltaY * 0.01),
        y: model.rotation.y + deltaX * 0.01,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  }

  // Function to check if the pointer is on the model
  function isPointerOnModel(clientX, clientY) {
    if (!model) return false;
    
    // Project a ray from the camera to the pointer position
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // Check if the ray intersects the model
    const intersects = raycaster.intersectObject(model, true);
    return intersects.length > 0;
  }

  // Handle mouse events on desktop
  window.addEventListener('mousedown', (e) => {
    if (isPointerOnModel(e.clientX, e.clientY)) {
      isInteracting = true;
      lastPointerPosition = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('mousemove', (e) => {
    handleRotation(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    isInteracting = false;
  });

  // Handle touch events on mobile
  window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    if (isPointerOnModel(touch.clientX, touch.clientY)) {
      isInteracting = true;
      lastPointerPosition = { x: touch.clientX, y: touch.clientY };
    }
  });

  window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (isInteracting) {
      e.preventDefault();
      handleRotation(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    isInteracting = false;
  });

  //For Responsive Design
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
  })

  //Animation loop
  function animate() {
    requestAnimationFrame(animate)
    if (model) {
      // You can add animations for your model here
      // model.rotation.x += 0.01
      // model.rotation.y += 0.01
    }
    composer.render()
  }
  animate()
}

initThree();
