import horizon from './assets/fences/horizon.jpg';
import horizonPro from './assets/fences/horizon-pro.jpg';
import haven from './assets/fences/haven.jpg';
import charleston from './assets/fences/charleston.jpg';
import charlestonPro from './assets/fences/charleston-pro.jpg';
import vanguard from './assets/fences/vanguard.jpg';
import savannah from './assets/fences/savannah.jpg';
import solace from './assets/fences/solace.jpg';

const FENCE_IMAGES = {
  uaf_200: horizon,
  uaf_201: horizonPro,
  uab_200: haven,
  uas_100: charleston,
  uas_101: charlestonPro,
  uaf_250: vanguard,
  uas_150: savannah,
  uap_100: solace,
};

export default FENCE_IMAGES;

export function getFenceImage(systemId) {
  return FENCE_IMAGES[systemId] || horizon; // fallback to Horizon
}
