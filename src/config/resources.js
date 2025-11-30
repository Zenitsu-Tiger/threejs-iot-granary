// 资源配置文件
console.log('🔧 当前环境:', import.meta.env.MODE);
console.log('🔧 是否开发环境:', import.meta.env.DEV);
console.log('🔧 使用代理:', import.meta.env.VITE_USE_PROXY);

// 判断是否使用代理
const useProxy =
  import.meta.env.DEV && import.meta.env.VITE_USE_PROXY === 'true';
const cdnBaseUrl =
  import.meta.env.VITE_CDN_BASE_URL || 'https://static.lyoko.cc';
const proxyPrefix = import.meta.env.VITE_PROXY_PREFIX || '/api/static';

// 资源URL生成函数
function getResourceUrl(path) {
  if (useProxy) {
    console.log(`🔄 使用代理: ${proxyPrefix}${path}`);
    return `${proxyPrefix}${path}`;
  } else {
    console.log(`🌐 使用CDN: ${cdnBaseUrl}${path}`);
    return `${cdnBaseUrl}${path}`;
  }
}

export const RESOURCES = {
  // 模型资源
  models: {
    main: getResourceUrl('/model.glb'),
    truck: getResourceUrl('/truck.glb'),
    tesla: getResourceUrl('/tesla_model_x.glb'),
    aston: getResourceUrl('/aston_martin_v8_vantage_v600.glb'),
    drone: getResourceUrl('/dji_fvp.glb'),
  },

  // 纹理资源
  textures: {
    ground: getResourceUrl('/wispy-grass-meadow_albedo.png'),
    flame: getResourceUrl('/farm-pic/火焰.png'),
    temperature: getResourceUrl('/farm-pic/温度.png'),
    infoBg: getResourceUrl('/farm-pic/信息背景.png'),
  },

  // HDR环境贴图
  hdri: {
    sky: getResourceUrl('/qwantani_moonrise_puresky_2k.hdr'),
  },

  // 豆子贴图
  beans: {
    red: getResourceUrl('/beans/红豆.png'),
    green: getResourceUrl('/beans/绿豆.png'),
    yellow: getResourceUrl('/beans/黄豆.png'),
    black: getResourceUrl('/beans/黑豆.png'),
  },
};

// 导出工具函数
export { getResourceUrl };
