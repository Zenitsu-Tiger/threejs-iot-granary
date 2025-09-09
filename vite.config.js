// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // 设置基础路径 - 根据你的部署环境调整
  base: process.env.VITE_BASE_URL || './',

  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: true,
    watch: {
      usePolling: true,
      interval: 2000,
    },
    // 🔥 关键：添加代理配置
    proxy: {
      '/api/static': {
        target: 'http://static.lyoko.cc',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/static/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 代理错误:', err.message);
            // 如果CDN失败，尝试HTTPS
            if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
              console.log('🔄 尝试HTTPS连接...');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // 强制添加CORS头，确保浏览器能正常使用
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] =
              'GET, POST, OPTIONS, HEAD';
            proxyRes.headers['Access-Control-Allow-Headers'] =
              'Origin, X-Requested-With, Content-Type, Accept';
            console.log(`✅ 代理成功: ${req.url} -> ${proxyRes.statusCode}`);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 添加Referer头，模拟从lyoko.cc访问
            proxyReq.setHeader('Referer', 'https://www.lyoko.cc/');
            console.log(`🔄 代理请求: ${req.url}`);
          });
        },
      },
    },
  },

  // 确保正确处理静态资源
  assetsInclude: ['**/*.glb', '**/*.hdr', '**/*.png'],

  // 构建优化配置
  build: {
    assetsDir: 'assets',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-addons': [
            'three/addons/controls/OrbitControls.js',
            'three/addons/loaders/GLTFLoader.js',
            'three/examples/jsm/loaders/RGBELoader.js',
          ],
          'three-postprocessing': [
            'three/examples/jsm/postprocessing/EffectComposer.js',
            'three/examples/jsm/postprocessing/RenderPass.js',
            'three/examples/jsm/postprocessing/OutlinePass.js',
            'three/examples/jsm/postprocessing/OutputPass.js',
            'three/examples/jsm/shaders/FXAAShader.js',
            'three/examples/jsm/postprocessing/ShaderPass.js',
          ],
        },
        assetFileNames: assetInfo => {
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(glb|hdr)$/.test(assetInfo.name)) {
            return `models/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    minify: 'esbuild', // 改为esbuild避免terser问题
  },

  optimizeDeps: {
    include: [
      'three',
      'three/addons/controls/OrbitControls.js',
      'three/addons/loaders/GLTFLoader.js',
      'three/examples/jsm/loaders/RGBELoader.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/OutlinePass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
      'three/examples/jsm/shaders/FXAAShader.js',
      'three/examples/jsm/postprocessing/ShaderPass.js',
    ],
  },

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
