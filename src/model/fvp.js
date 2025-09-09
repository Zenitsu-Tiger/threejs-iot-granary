import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RESOURCES } from '../config/resources.js';
function fvpAnimation(scene) {
  const loader = new GLTFLoader();
  const R = 150;
  const H = 60;

  loader.load(
    RESOURCES.models.drone,
    gltf => {
      const plane = new THREE.Group();
      const fvp = gltf.scene.clone();

      // 检查 fvp 是否成功加载
      if (!fvp) {
        console.error('FVP 模型加载失败');
        return;
      }

      fvp.scale.set(5, 5, 5);
      plane.add(fvp);
      plane.rotation.y = -Math.PI / 2;
      plane.position.y = H;
      plane.position.x = R;

      // 重要：将无人机组添加到场景中
      scene.add(plane);

      // 无人机加载进来默认方向
      const defaultDirection = new THREE.Vector3(-1, 0, 0);

      // 旋转中心坐标
      const target = new THREE.Vector3(0, H, 0);
      // 姿态角度初始值
      const q0 = plane.quaternion.clone();
      let angle = 0;

      function loop() {
        requestAnimationFrame(loop);
        angle += 0.01;
        const x = R * Math.cos(angle);
        const z = R * Math.sin(angle);

        plane.position.x = x;
        plane.position.z = z;

        // 无人机指向方向
        const b = target.clone().sub(plane.position).normalize();
        // 生成一个四元数，使无人机的角度在旋转过程中始终指向b
        const q = new THREE.Quaternion().setFromUnitVectors(
          defaultDirection,
          b
        );

        // 创建向下侧偏45度的四元数
        const rollQuaternion = new THREE.Quaternion();
        // 绕飞机自身前进方向轴旋转45度实现侧偏
        rollQuaternion.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 6
        );
        // 在z轴实现侧偏，同理
        rollQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          Math.PI / 10
        );

        // 组合旋转，先朝向target(q),然后再实现侧偏
        const newQ = q0.clone().multiply(q).multiply(rollQuaternion);

        // 修复：应用新的四元数到无人机
        plane.quaternion.copy(newQ);
      }
      loop();
    },
    // 加载进度回调
    progress => {},
    // 错误处理
    error => {
      console.error('FVP 模型加载失败:', error);
    }
  );
}

export default fvpAnimation;
