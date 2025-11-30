import * as THREE from 'three';
import { RESOURCES } from '../config/resources.js';
import { resourceManager } from '../utils/resourceManager.js';

class TruckAnimation {
  constructor(scene, roadPosition, roadModel = null) {
    this.scene = scene;
    this.roadPosition = roadPosition.clone();
    this.roadModel = roadModel;
    this.truck = null;
    this.mixer = null;
    this.isAnimating = false;
    this.clock = new THREE.Clock();

    // 动画参数
    this.animationDuration = 10; // 10秒完成一次移动
    this.waitTime = 5; // 5秒等待时间

    // 根据道路模型计算路径，如果没有模型则使用默认值
    this.calculateRoadPath();

    this.loadTruck();
  }

  calculateRoadPath() {
    if (this.roadModel) {
      // 获取道路模型的边界框
      const box = new THREE.Box3().setFromObject(this.roadModel);
      const size = box.getSize(new THREE.Vector3());

      // 根据道路的尺寸来确定路径方向
      if (size.x > size.z) {
        // 道路沿 x 轴方向延伸
        this.roadPath = [
          { x: box.min.x + size.x * 0.1, z: this.roadPosition.z }, // 起点
          { x: this.roadPosition.x, z: this.roadPosition.z }, // 中点
          { x: box.max.x - size.x * 0.1, z: this.roadPosition.z }, // 终点
        ];
      } else {
        // 道路沿 z 轴方向延伸
        this.roadPath = [
          { x: this.roadPosition.x, z: box.min.z + size.z * 0.1 }, // 起点
          { x: this.roadPosition.x, z: this.roadPosition.z }, // 中点
          { x: this.roadPosition.x, z: box.max.z - size.z * 0.1 }, // 终点
        ];
      }
    }
  }
  // 根据方向和车道偏移计算具体路径
  calculateTruckPath(direction, laneOffset) {
    if (direction === 'forward') {
      // 正向行驶：从起点到终点
      return {
        start: {
          x: this.roadPath[0].x,
          z: this.roadPath[0].z + laneOffset,
        },
        middle: {
          x: this.roadPath[1].x,
          z: this.roadPath[1].z + laneOffset,
        },
        end: {
          x: this.roadPath[2].x,
          z: this.roadPath[2].z + laneOffset,
        },
      };
    } else {
      // 反向行驶：从终点到起点
      return {
        start: {
          x: this.roadPath[2].x,
          z: this.roadPath[2].z + laneOffset,
        },
        middle: {
          x: this.roadPath[1].x,
          z: this.roadPath[1].z + laneOffset,
        },
        end: {
          x: this.roadPath[0].x,
          z: this.roadPath[0].z + laneOffset,
        },
      };
    }
  }

  loadTruck() {
    const vehicles = [
      {
        modelKey: 'truck',
        direction: 'forward',
        laneOffset: 7,
        scale: 3,
        speed: 1,
        delay: 0,
        yOffset: 7, // 卡车的 y 轴向上偏移
      },
      {
        modelKey: 'aston',
        direction: 'backward',
        laneOffset: -7,
        scale: 4,
        speed: 1.2,
        delay: 3000,
        yOffset: 0.5, // 阿斯顿马丁的 y 轴偏移
      },
      {
        modelKey: 'tesla',
        direction: 'forward',
        laneOffset: 11,
        scale: 0.004,
        speed: 1,
        delay: 6000,
        rotationY: -Math.PI * 2,
        yOffset: 0, // Tesla 的 y 轴偏移
      },
    ];

    this.vehicles = [];
    this.mixers = [];

    // 同步使用已缓存的模型
    this.loadVehiclesFromCache(vehicles);
  }

  // 新方法：从缓存加载车辆
  loadVehiclesFromCache(vehicles) {
    const loadedVehicles = [];

    vehicles.forEach((config, index) => {
      // 构建资源URL
      const resourceUrl = RESOURCES.models[config.modelKey];
      const gltf = resourceManager.get(resourceUrl);

      if (gltf) {
        const vehicleData = this.createVehicle(gltf, config, index);
        loadedVehicles.push(vehicleData);
        console.log(`✅ 车辆已加载: ${config.modelKey}`);
      } else {
        console.warn(`⚠️ 车辆模型未找到: ${config.modelKey}`);
      }
    });

    // 所有车辆同步创建完成后，按延迟启动动画
    if (loadedVehicles.length > 0) {
      this.startAllVehicleAnimations(loadedVehicles);
    }
  }

  createVehicle(gltf, config, index) {
    const vehicle = gltf.scene.clone();
    vehicle.scale.set(config.scale, config.scale, config.scale);

    // 计算路径
    const path = this.calculateTruckPath(config.direction, config.laneOffset);
    const vehicleY = this.roadPosition.y + config.yOffset;

    // 设置初始位置
    vehicle.position.set(path.start.x, vehicleY, path.start.z);

    // 设置朝向和旋转
    if (config.rotationY !== undefined) {
      vehicle.lookAt(path.end.x, vehicleY, path.end.z);
      vehicle.rotation.y += config.rotationY;
    } else {
      vehicle.lookAt(path.end.x, vehicleY, path.end.z);
    }

    this.scene.add(vehicle);

    // 保存车辆数据
    const vehicleData = {
      mesh: vehicle,
      config: config,
      path: path,
      index: index,
    };

    this.vehicles.push(vehicleData);

    // 返回车辆数据，不立即开始动画
    return vehicleData;
  }

  startAllVehicleAnimations(loadedVehicles) {
    // 按照预定的延迟时间启动动画
    loadedVehicles.forEach(vehicleData => {
      if (vehicleData.config.delay > 0) {
        setTimeout(() => {
          this.startVehicleAnimation(vehicleData);
        }, vehicleData.config.delay);
      } else {
        this.startVehicleAnimation(vehicleData);
      }
    });
  }

  startVehicleAnimation(vehicleData) {
    const { mesh, config, path, index } = vehicleData;
    const duration = this.animationDuration / config.speed;

    // 使用配置的 yOffset
    const vehicleY = this.roadPosition.y + config.yOffset;

    // 创建动画
    const positionKeyframes = new THREE.VectorKeyframeTrack(
      '.position',
      [0, duration / 2, duration],
      [
        path.start.x,
        vehicleY,
        path.start.z,
        path.middle.x,
        vehicleY,
        path.middle.z,
        path.end.x,
        vehicleY,
        path.end.z,
      ]
    );

    const clip = new THREE.AnimationClip(`vehicle_${index}`, duration, [
      positionKeyframes,
    ]);
    const mixer = new THREE.AnimationMixer(mesh);
    const action = mixer.clipAction(clip);

    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;

    // 动画完成后重新开始
    mixer.addEventListener('finished', () => {
      setTimeout(() => {
        this.resetVehicle(vehicleData);
      }, this.waitTime * 1000);
    });

    this.mixers.push(mixer);
    action.play();
  }

  resetVehicle(vehicleData) {
    const { mesh, config } = vehicleData;

    // 重新计算路径
    const path = this.calculateTruckPath(config.direction, config.laneOffset);
    vehicleData.path = path;

    // 使用配置的 yOffset
    const vehicleY = this.roadPosition.y + config.yOffset;

    // 重置位置
    mesh.position.set(path.start.x, vehicleY, path.start.z);

    // 重置朝向和旋转
    if (config.rotationY !== undefined) {
      // 首先让车辆朝向目标点
      mesh.lookAt(path.end.x, vehicleY, path.end.z);
      // 然后在Y轴上添加额外的旋转
      mesh.rotation.y += config.rotationY;
    } else {
      // 只设置朝向
      mesh.lookAt(path.end.x, vehicleY, path.end.z);
    }

    // 重新开始动画
    this.startVehicleAnimation(vehicleData);
  }

  // 更新动画（在渲染循环中调用）
  update() {
    if (this.mixers) {
      const delta = this.clock.getDelta();
      this.mixers.forEach(mixer => {
        if (mixer) {
          mixer.update(delta);
        }
      });
    }
  }

  // 停止所有动画
  stop() {
    if (this.mixers) {
      this.mixers.forEach(mixer => {
        if (mixer) {
          mixer.stopAllAction();
        }
      });
    }

    if (this.vehicles && this.scene) {
      this.vehicles.forEach(vehicleData => {
        this.scene.remove(vehicleData.mesh);
      });
    }
  }

  // 更新道路路径（如果需要自定义路径）
  setRoadPath(pathPoints) {
    this.roadPath = pathPoints;
  }
}

export default TruckAnimation;
