// 超简单的主文件
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { labelRenderer } from './utils/tag.js';
import mesh from './mesh.js';
import { initComposer, composer, fxaaPass } from './utils/choose.js';
import { resourceManager } from './utils/resourceManager.js';
import { RESOURCES } from './config/resources.js';

// 全局变量
let camera = null;
let renderer = null;
let scene = null;

// 简单的进度更新
function updateProgress(progress) {
  const statusText =
    progress < 30
      ? '初始化...'
      : progress < 70
      ? '加载模型...'
      : progress < 95
      ? '准备场景...'
      : '即将完成...';

  window.updateProgress(progress, statusText);
}

// 初始化场景
function initScene() {
  console.log('🎬 初始化场景...');

  // 创建场景
  scene = new THREE.Scene();
  scene.add(mesh);

  // 设置雾效
  const fog = new THREE.FogExp2(0xb0c4de, 0.0005);
  scene.fog = fog;

  // 设置HDR环境
  const hdrTexture = resourceManager.get(RESOURCES.hdri.sky);
  if (hdrTexture) {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdrTexture;
    scene.environment = hdrTexture;
    scene.environmentIntensity = 0.5;
  }

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.set(292, 223, 185);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // 初始化后处理
  initComposer(renderer, scene);

  // 设置控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.minDistance = 10;
  controls.maxDistance = 500;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // 防止相机低于地面
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.minPolarAngle = Math.PI / 6;

  // 渲染循环
  function render() {
    controls.update();

    if (window.truckAnimation) {
      window.truckAnimation.update();
    }

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    labelRenderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  // 响应式处理
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    composer.setSize(width, height);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y =
      1 / (height * pixelRatio);
  });

  render();
  console.log('✅ 场景初始化完成');
}

// 启动应用
async function startApp() {
  try {
    console.log('🚀 启动应用...');

    // 设置进度回调
    resourceManager.setProgressCallback(updateProgress);

    // 加载所有资源
    await resourceManager.loadAllResources();

    // 初始化场景
    initScene();

    // 完成加载
    updateProgress(100);
    setTimeout(() => {
      window.hideLoading();
      console.log('🎉 应用启动完成');
    }, 500);
  } catch (error) {
    console.error('启动失败:', error);
    window.updateProgress(100, '加载失败，请刷新重试');
  }
}

// 启动
startApp();

// 导出
export { camera, renderer, scene };
