// 全屏颗粒质感。噪点用样式里的 SVG 背景图（见 index.css 的 .grain），
// 浏览器只栅格化一次再平铺；以前是页面里实时滤镜的 <svg>，滚动时每帧都要重新合成。
function NoiseOverlay() {
  return <div className="grain" aria-hidden="true" />
}

export default NoiseOverlay
