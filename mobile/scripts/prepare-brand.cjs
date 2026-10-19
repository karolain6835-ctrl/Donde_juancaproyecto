const fs = require('node:fs');
const { generateImageAsync } = require('@expo/image-utils');
(async()=>{
 for (const [name,padding,backgroundColor] of [['icon',90,'#FFFFFF'],['adaptive-foreground',190,'transparent'],['splash',120,'transparent']]) {
  const image = await generateImageAsync({projectRoot:process.cwd(),cacheType:'dondejuanca-brand'},{src:'./src/assets/brand/logo.png',width:1024,height:1024,padding,resizeMode:'contain',backgroundColor});
  fs.writeFileSync(`assets/android/${name}.png`,image.source);
 }
})();
