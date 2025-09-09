import * as THREE from 'three';
import { RESOURCES } from '../config/resources.js';

const textureLoader = new THREE.TextureLoader();
let stopAnimationFrame;

function createFlame() {
  /* 火焰模型 */
  const w = 20; //火焰宽度
  const h = 1.6 * w; //火焰高度

  // 正确创建平面几何体
  const fireGeometry = new THREE.PlaneGeometry(w, h);
  fireGeometry.translate(0, h / 2, 0);

  // 使用CDN火焰纹理
  const fireTexture = textureLoader.load(
    RESOURCES.textures.flame,
    texture => {
      console.log('火焰贴图加载成功');
    },
    undefined,
    error => {
      console.error('火焰贴图加载失败:', error);
    }
  );

  // 火焰贴图的帧数
  let nums = 15;
  fireTexture.repeat.set(1 / nums, 1);

  // 修改材质类型和设置
  const fireMaterial = new THREE.MeshBasicMaterial({
    map: fireTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.9, // 提高不透明度
    // 添加混合模式增强火焰效果
    blending: THREE.AdditiveBlending,
    // 确保火焰颜色正确显示
    toneMapped: false,
  });

  const model = new THREE.Mesh(fireGeometry, fireMaterial);
  const flame = new THREE.Group();

  // 创建多个角度的火焰平面
  flame.add(
    model,
    model.clone().rotateY(Math.PI / 2),
    model.clone().rotateY(Math.PI / 4),
    model.clone().rotateY((Math.PI / 4) * 3)
  );

  let t = 0;

  function updateLoop() {
    t += 0.08; // 稍微减慢动画速度，让火焰更平滑
    if (t > nums) {
      t = 0;
    }
    fireTexture.offset.x = Math.floor(t) / nums;
    stopAnimationFrame = window.requestAnimationFrame(updateLoop);
  }
  updateLoop();

  return flame;
}

// 停止火焰动画
function stopFlame() {
  if (stopAnimationFrame) {
    window.cancelAnimationFrame(stopAnimationFrame);
  }
}

export { createFlame, stopFlame };
