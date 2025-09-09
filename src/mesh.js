// 导入Three.js核心库
import * as THREE from 'three';
// 引入GLTF加载器，用于加载3D模型文件
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tag } from './utils/tag.js';
import { choose, chooseMesh } from './utils/choose.js';
import { getTag } from './utils/messageTag.js';
import messageData from './mocks/messageData.js';
import { createFlame, stopFlame } from './model/flame.js';
import TruckAnimation from './model/truckAnimation.js';
import fvpAnimation from './model/fvp.js';
import { RESOURCES } from './config/resources.js';

const group = new THREE.Group();

const loader = new GLTFLoader();
// 创建纹理加载器
const textureLoader = new THREE.TextureLoader();
// 所有粮仓模型的集合
let granaryArr = [];
// 内容需要改变的HTML元素对应的id
let idArr = [
  'granaryName',
  'temperature',
  'grain',
  'grainImg',
  'weight',
  'granaryHeight',
  'grainHeight',
];
// 获取标签
const messageTag = getTag('messageTag');
// http://static.lyoko.cc/model.glb
// 使用配置中的CDN资源
loader.load(RESOURCES.models.main, gltf => {
  // 先加载您的地面纹理
  const groundTexture = textureLoader.load(RESOURCES.textures.ground);
  groundTexture.wrapS = THREE.MirroredRepeatWrapping;
  groundTexture.wrapT = THREE.MirroredRepeatWrapping;
  groundTexture.repeat.set(4, 4);

  const model = gltf.scene;

  // getObjectByName能够穿透子对象找到对应的目标模型
  const targetModel = model.getObjectByName('平原');
  if (targetModel) {
    const targetMesh = targetModel;
    // 如果是Mesh，直接替换材质
    if (targetMesh.type === 'Mesh') {
      targetMesh.material = new THREE.MeshStandardMaterial({
        map: groundTexture,
      });
    }
  }
  // 获取马路坐标，为汽车动画提供对应坐标
  const roadModel = model.getObjectByName('马路');

  const roadPos = new THREE.Vector3();
  roadModel.getWorldPosition(roadPos);

  // 创建卡车动画
  const truckAnimation = new TruckAnimation(group, roadPos, roadModel);

  // 将动画更新函数导出，以便在主渲染循环中调用
  window.truckAnimation = truckAnimation;
  // 获取父对象 粮仓，里面有各个类型不一的子对象粮仓
  const farmGroup = gltf.scene.getObjectByName('粮仓');
  farmGroup.traverse(obj => {
    if (obj.type === 'Mesh') {
      // 为每个网格克隆独立的材质
      obj.material = obj.material.clone();

      // 收集网格模型
      granaryArr.push(obj);
      const label = tag(obj.name);
      const pos = new THREE.Vector3();

      // 利用pos来获取obj的实际位置
      obj.getWorldPosition(pos);

      if (obj.parent.name === '立筒仓') {
        pos.y += 36;
      } else if (obj.parent.name === '浅圆仓') {
        pos.y += 20;
      } else if (obj.parent.name === '立筒仓') {
        pos.y += 36;
      } else if (obj.parent.name === '平房仓') {
        pos.y += 17;
      }
      // 把粮仓标签添加到粮仓上
      label.position.copy(pos);
      group.add(label);
    }
  });
  group.add(model);

  function granaryFlame(name) {
    const granary = gltf.scene.getObjectByName(name);
    if (!granary) {
      return null;
    }

    const pos = new THREE.Vector3();
    // 获取粮仓granary世界坐标设置火焰位置
    granary.getWorldPosition(pos);
    const flame = createFlame();
    flame.position.copy(pos);
    if (granary.parent.name === '立筒仓') {
      flame.position.y += 36;
    } else if (granary.parent.name === '浅圆仓') {
      flame.position.y += 20;
    } else if (granary.parent.name === '平房仓') {
      flame.position.y += 17;
    }
    flame.position.y += -4;

    // 火焰警示标签
    const fireMessageTag = tag('警告⚠️：粮仓' + name + '失火');
    flame.add(fireMessageTag);
    fireMessageTag.position.y += 40;
    flame.tag = fireMessageTag;
    return flame;
  }

  // 存储当前活跃的火焰，避免重复在同一个粮仓创建火焰
  let activeFlames = new Map();
  let flameSystemRunning = false;

  // 随机生成火焰效果
  function createRandomFlames() {
    // 从 granaryArr 中随机选择粮仓
    if (granaryArr.length > 0) {
      // 随机选择1-2个粮仓（减少同时出现的火焰数量）
      const flameCount = Math.floor(Math.random() * 2) + 1;
      const selectedGranaries = [];
      const flames = [];

      // 过滤掉已经有火焰的粮仓
      const availableGranaries = granaryArr.filter(
        granary => !activeFlames.has(granary.name)
      );

      if (availableGranaries.length === 0) {
        return; // 如果所有粮仓都有火焰，跳过本次创建
      }

      // 随机选择粮仓（避免重复）
      const shuffledGranaries = [...availableGranaries].sort(
        () => Math.random() - 0.5
      );
      for (let i = 0; i < Math.min(flameCount, shuffledGranaries.length); i++) {
        selectedGranaries.push(shuffledGranaries[i]);
      }

      // 为选中的粮仓创建火焰
      selectedGranaries.forEach(granary => {
        const flame = granaryFlame(granary.name);
        if (flame) {
          model.add(flame);
          flames.push(flame);
          // 记录活跃的火焰
          activeFlames.set(granary.name, flame);
        }
      });

      // 修改持续时间：8-15秒之间的随机时长
      const duration = Math.random() * 7000 + 8000; // 8-15秒

      setTimeout(() => {
        stopFlame();
        flames.forEach(flame => {
          // 从活跃火焰列表中移除
          const granaryName = selectedGranaries.find(
            g => activeFlames.get(g.name) === flame
          )?.name;
          if (granaryName) {
            activeFlames.delete(granaryName);
          }

          // 如果火焰有关联的标签，先移除标签
          if (flame.tag) {
            flame.remove(flame.tag);
          }
          // 移除火焰本身
          model.remove(flame);
        });
      }, duration);
    }
  }

  // 持续的火焰管理系统
  function startFlameSystem() {
    if (flameSystemRunning) return;
    flameSystemRunning = true;

    function scheduleNextFlame() {
      if (!flameSystemRunning) return;

      // 调整随机间隔：5-12秒之间（给火焰更长的展示时间）
      const nextInterval = Math.random() * 7000 + 1000;

      setTimeout(() => {
        createRandomFlames();
        scheduleNextFlame(); // 递归调度下一次火焰
      }, nextInterval);
    }

    // 启动第一次火焰
    scheduleNextFlame();
  }

  // 停止火焰系统的函数（可选，用于调试或特殊情况）
  function stopFlameSystem() {
    flameSystemRunning = false;
    // 清理所有活跃的火焰
    activeFlames.forEach((flame, granaryName) => {
      if (flame.tag) {
        flame.remove(flame.tag);
      }
      model.remove(flame);
    });
    activeFlames.clear();
  }

  // 将停止函数暴露到全局，方便调试
  window.stopFlameSystem = stopFlameSystem;

  setTimeout(() => {
    // 启动持续的火焰系统
    startFlameSystem();
  }, 3000);

  addEventListener('click', function (e) {
    if (chooseMesh) {
      messageTag.element.style.visibility = 'hidden';
    }
    choose(e, messageTag);

    if (chooseMesh) {
      idArr.forEach(function (id) {
        const dom = document.getElementById(id);
        dom.innerHTML = messageData[chooseMesh.name][id];
      });
    }

    messageTag.element.style.visibility = 'visible';
    if (chooseMesh) {
      messageTag.element.style.visibility = 'visible';

      // 使用射线交点的世界坐标
      if (chooseMesh.point) {
        const labelPos = chooseMesh.point.clone();
        labelPos.y += 20; // 在交点上方显示标签
        messageTag.position.copy(labelPos);
        // 关键：确保标签在场景中
        if (!group.children.includes(messageTag)) {
          group.add(messageTag);
        }
      } else {
        // 备用方案：获取模型的世界坐标
        const worldPos = new THREE.Vector3();
        chooseMesh.getWorldPosition(worldPos);
        worldPos.y += 20;
        messageTag.position.copy(worldPos);
      }

      // 数字滚动动画
      const weightDOM = document.getElementById('weight');
      weightDOM.innerHTML = 0;
      const weightMax = messageData[chooseMesh.name]['weight']; //粮仓重量
      let weight = 0; //粮仓初始重量
      const interval = setInterval(function () {
        if (weight < weightMax) {
          weight += Math.floor(weightMax / 50); //重量累加
          document.getElementById('weight').innerHTML = weight;
        } else {
          clearInterval(interval); //一旦达到粮食重量，取消周期性函数interval
        }
      }, 5);
    } else {
      messageTag.element.style.visibility = 'hidden';
    }
  });
  fvpAnimation(group);
});
export { granaryArr };
export default group;
